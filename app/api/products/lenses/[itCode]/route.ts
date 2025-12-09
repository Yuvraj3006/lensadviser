import { NextRequest } from 'next/server';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/products/lenses/[itCode]
 * Get single lens product by IT code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itCode: string }> }
) {
  try {
    const { itCode } = await params;
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return Response.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'organizationId is required' },
      }, { status: 400 });
    }

    const product = await prisma.lensProduct.findUnique({
      where: {
        itCode: itCode,
      },
      include: {
        features: {
          include: {
            feature: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        benefits: {
          include: {
            benefit: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        specs: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Lens product');
    }

    return Response.json({
      success: true,
      data: {
        id: product.id,
        itCode: product.itCode,
        name: product.name,
        brandLine: product.brandLine,
        visionType: product.visionType,
        lensIndex: product.lensIndex,
        basePrice: product.baseOfferPrice,
        yopoEligible: product.yopoEligible,
        features: product.features.map((pf) => ({
          code: pf.feature.code || '',
          name: pf.feature.name || '',
        })),
        benefits: product.benefits.map((pb) => ({
          code: pb.benefit.code || '',
          name: pb.benefit.name || '',
        })),
        specs: product.specs.map((spec) => ({
          key: spec.key,
          value: spec.value,
          group: spec.group,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

