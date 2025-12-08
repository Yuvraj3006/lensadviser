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

    const product = await prisma.product.findFirst({
      where: {
        organizationId,
        OR: [
          { itCode: itCode },
          { sku: itCode },
        ],
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Lens product');
    }

    // Fetch related data manually
    const [features, benefits, specs] = await Promise.all([
      prisma.productFeature.findMany({
        where: { productId: product.id },
      }).then(async (pfs) => {
        const features = await Promise.all(
          pfs.map(async (pf) => {
            const feature = await prisma.feature.findUnique({
              where: { id: pf.featureId },
            });
            return { ...pf, feature };
          })
        );
        return features;
      }),
      prisma.productBenefit.findMany({
        where: { productId: product.id },
      }).then(async (pbs) => {
        const benefits = await Promise.all(
          pbs.map(async (pb) => {
            const benefit = await prisma.benefit.findUnique({
              where: { id: pb.benefitId },
            });
            return { ...pb, benefit };
          })
        );
        return benefits;
      }),
      prisma.productSpecification.findMany({
        where: { productId: product.id },
      }),
    ]);

    return Response.json({
      success: true,
      data: {
        id: product.id,
        itCode: product.itCode || product.sku,
        name: product.name,
        brandLine: product.brandLine,
        visionType: product.visionType,
        lensIndex: product.lensIndex,
        basePrice: product.basePrice,
        yopoEligible: product.yopoEligible,
        features: features.map((pf) => ({
          code: pf.feature?.key || '',
          name: pf.feature?.name || '',
        })),
        benefits: benefits.map((pb) => ({
          code: pb.benefit?.code || '',
        })),
        specs: specs.map((spec) => ({
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

