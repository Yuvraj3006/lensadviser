import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/lib/constants';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const createBenefitFeatureSchema = z.object({
  type: z.enum(['BENEFIT', 'FEATURE']),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  // Benefit-specific fields
  pointWeight: z.number().min(0).max(10).optional().nullable(),
  maxScore: z.number().min(0).max(10).optional().nullable(),
  // Feature-specific fields
  category: z.enum(['DURABILITY', 'COATING', 'PROTECTION', 'LIFESTYLE', 'VISION']).optional().nullable(),
  displayOrder: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/admin/benefit-features
 * List all benefit-features (unified master)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'BENEFIT' or 'FEATURE'
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // For benefits, filter by organization
    if (type === 'BENEFIT') {
      where.organizationId = user.organizationId;
    }

    const benefitFeatures = await (prisma as any).benefitFeature.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { displayOrder: 'asc' },
        { code: 'asc' },
      ],
    });

    return Response.json({
      success: true,
      data: benefitFeatures,
    });
  } catch (error: any) {
    console.error('[benefit-features] GET Error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/benefit-features
 * Create a new benefit-feature
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createBenefitFeatureSchema.parse(body);

    // Check if code already exists
    const existing = await (prisma as any).benefitFeature.findFirst({
      where: {
        code: validated.code,
        organizationId: validated.type === 'BENEFIT' ? user.organizationId : null,
      },
    });

    if (existing) {
      throw new ValidationError(
        `A ${validated.type.toLowerCase()} with code "${validated.code}" already exists`
      );
    }

    // Create benefit-feature
    const benefitFeature = await (prisma as any).benefitFeature.create({
      data: {
        type: validated.type,
        code: validated.code,
        name: validated.name,
        description: validated.description || null,
        pointWeight: validated.type === 'BENEFIT' ? (validated.pointWeight ?? 1.0) : null,
        maxScore: validated.type === 'BENEFIT' ? (validated.maxScore ?? 3.0) : null,
        category: validated.type === 'FEATURE' ? validated.category : null,
        displayOrder: validated.type === 'FEATURE' ? validated.displayOrder : null,
        isActive: validated.isActive,
        organizationId: validated.type === 'BENEFIT' ? user.organizationId : null,
      },
    });

    return Response.json({
      success: true,
      data: benefitFeature,
    });
  } catch (error: any) {
    console.error('[benefit-features] POST Error:', error);
    return handleApiError(error);
  }
}
