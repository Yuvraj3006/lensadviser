import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const createBenefitSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

// GET /api/admin/benefits - List all benefits
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        code: 'asc',
      },
    });

    // Serialize Date objects to strings
    const serializedBenefits = benefits.map((benefit) => ({
      ...benefit,
      createdAt: benefit.createdAt.toISOString(),
      updatedAt: benefit.updatedAt.toISOString(),
    }));

    return Response.json({
      success: true,
      data: serializedBenefits,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/benefits - Create new benefit
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
        code: validated.code,
      },
    });

    if (existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_CODE',
            message: 'Benefit code already exists',
          },
        },
        { status: 400 }
      );
    }

    const benefit = await prisma.benefit.create({
      data: {
        organizationId: user.organizationId,
        code: validated.code,
        name: validated.name,
        description: validated.description,
      },
    });

    // Serialize Date objects to strings
    const serializedBenefit = {
      ...benefit,
      createdAt: benefit.createdAt.toISOString(),
      updatedAt: benefit.updatedAt.toISOString(),
    };

    return Response.json(
      {
        success: true,
        data: serializedBenefit,
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

