import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

/**
 * GET /api/admin/benefits/[id]/features
 * Get all features mapped to a benefit (reverse lookup)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    const { id } = await params;

    // Verify benefit exists
    const benefit = await prisma.benefit.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!benefit) {
      throw new NotFoundError('Benefit');
    }

    // Get benefit-feature mappings
    const featureBenefits = await prisma.featureBenefit.findMany({
      where: { benefitId: id },
      include: {
        feature: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return Response.json({
      success: true,
      data: featureBenefits.map((fb) => ({
        featureId: fb.feature.id,
        featureKey: fb.feature.code,
        featureName: fb.feature.name,
        featureCategory: fb.feature.category,
        weight: fb.weight,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

