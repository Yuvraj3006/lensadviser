import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateFeatureBenefitsSchema = z.object({
  benefits: z.array(
    z.object({
      benefitCode: z.string(),
      weight: z.number().min(0).max(1).default(0.5), // Connection strength 0.0-1.0
    })
  ),
});

/**
 * GET /api/admin/features/[id]/benefits
 * Get all benefits mapped to a feature
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    const { id } = await params;

    // Verify feature exists (features are global, no organizationId)
    const feature = await prisma.feature.findUnique({
      where: {
        id,
      },
    });

    if (!feature) {
      throw new NotFoundError('Feature');
    }

    // Get feature-benefit mappings
    const featureBenefits = await prisma.featureBenefit.findMany({
      where: { featureId: id },
      include: {
        benefit: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return Response.json({
      success: true,
      data: featureBenefits.map((fb) => ({
        benefitId: fb.benefit.id,
        benefitCode: fb.benefit.code,
        benefitName: fb.benefit.name,
        weight: fb.weight,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/features/[id]/benefits
 * Update feature-benefit mappings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateFeatureBenefitsSchema.parse(body);

    // Verify feature exists (features are global, no organizationId)
    const feature = await prisma.feature.findUnique({
      where: {
        id,
      },
    });

    if (!feature) {
      throw new NotFoundError('Feature');
    }

    // Get benefits by codes
    const benefitCodes = validated.benefits.map((b) => b.benefitCode);
    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
        code: { in: benefitCodes },
      },
    });

    // Create a map for quick lookup
    const benefitMap = new Map(benefits.map((b) => [b.code, b]));

    // Delete existing feature-benefit mappings
    await prisma.featureBenefit.deleteMany({
      where: { featureId: id },
    });

    // Create new feature-benefit mappings
    const featureBenefits = await Promise.all(
      validated.benefits
        .filter((benefitInput) => benefitInput.weight > 0) // Only create if weight > 0
        .map(async (benefitInput) => {
          const benefit = benefitMap.get(benefitInput.benefitCode);
          if (!benefit) {
            throw new Error(`Benefit code not found: ${benefitInput.benefitCode}`);
          }

          return prisma.featureBenefit.create({
            data: {
              featureId: id,
              benefitId: benefit.id,
              weight: Math.max(0, Math.min(1, benefitInput.weight)), // Clamp 0-1
            },
          });
        })
    );

    return Response.json({
      success: true,
      data: featureBenefits.map((fb) => ({
        id: fb.id,
        featureId: fb.featureId,
        benefitId: fb.benefitId,
        weight: fb.weight,
      })),
    });
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

