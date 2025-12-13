import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

/**
 * GET /api/admin/lens-products/[id]/benefits
 * Get benefit mappings for a lens product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Verify product exists
    const product = await prisma.lensProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Lens product');
    }

    // Get ProductBenefit mappings
    const productBenefits = await prisma.productBenefit.findMany({
      where: { productId: id },
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
      data: productBenefits.map((pb) => ({
        benefitId: pb.benefit.id,
        benefitCode: pb.benefit.code,
        benefitName: pb.benefit.name,
        score: pb.score,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

