import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';
import { measureQuery } from '@/lib/performance';
import { parsePaginationParams, createPaginationResponse } from '@/lib/pagination';
import { getBenefitStatsMap, recomputeBenefitStats } from '@/lib/benefit-stats';

const createBenefitSchema = z.object({
  code: z.string().regex(/^B\d{2,}$/, 'Benefit code must be B followed by 2+ digits (e.g., B01)'),
  name: z.string().min(1, 'Benefit name is required'),
  description: z.string().optional(),
  pointWeight: z.number().min(0).max(10).optional().default(1.0),
  maxScore: z.number().min(0).max(10).optional().default(3.0),
});

/**
 * GET /api/admin/benefits
 * Get all active benefits for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const where = {
        organizationId: user.organizationId,
      isActive: true,
    };

    const { page, pageSize } = parsePaginationParams(new URL(request.url).searchParams);

    const [benefits, total] = await Promise.all([
      measureQuery('benefits.findMany', () =>
        prisma.benefit.findMany({
          where,
          orderBy: { code: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            pointWeight: true,
            maxScore: true,
        isActive: true,
      },
          skip: (page - 1) * pageSize,
          take: pageSize,
        })
      ),
      measureQuery('benefits.count', () => prisma.benefit.count({ where })),
    ]);

    let benefitStats = await getBenefitStatsMap(user.organizationId);
    if (benefitStats.size === 0) {
      await recomputeBenefitStats(user.organizationId);
      benefitStats = await getBenefitStatsMap(user.organizationId);
    }

    const formatted = benefits.map((b) => {
      const stat = benefitStats.get(b.id);
      return {
        id: b.id,
        code: b.code,
        name: b.name || b.code,
        description: b.description,
        pointWeight: b.pointWeight || 1.0,
        maxScore: b.maxScore || 3.0,
        isActive: b.isActive,
        questionMappingCount: stat?.questionMappingCount || 0,
        productMappingCount: stat?.productMappingCount || 0,
      };
    });

    const pagination = createPaginationResponse(formatted, total, page, pageSize);
    return Response.json({
      success: true,
      data: pagination.data,
      pagination: pagination.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/benefits
 * Create a new benefit
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createBenefitSchema.parse(body);

    // Check if code already exists
    const existing = await prisma.benefit.findFirst({
      where: {
        organizationId: user.organizationId,
        code: validated.code.toUpperCase(),
      },
    });

    if (existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_CODE',
            message: `Benefit code "${validated.code.toUpperCase()}" already exists`,
          },
        },
        { status: 400 }
      );
    }

    const benefit = await prisma.benefit.create({
      data: {
        organizationId: user.organizationId,
        code: validated.code.toUpperCase(),
        name: validated.name,
        description: validated.description || null,
        pointWeight: validated.pointWeight || 1.0,
        maxScore: validated.maxScore || 3.0,
        isActive: true,
      },
    });

    return Response.json(
      {
        success: true,
        data: {
          id: benefit.id,
          code: benefit.code,
          name: benefit.name,
          description: benefit.description,
          pointWeight: benefit.pointWeight,
          maxScore: benefit.maxScore,
          isActive: benefit.isActive,
          createdAt: benefit.createdAt.toISOString(),
          updatedAt: benefit.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
