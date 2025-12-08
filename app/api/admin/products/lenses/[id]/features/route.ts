import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateFeaturesSchema = z.object({
  featureCodes: z.array(z.string()),
});

// PUT /api/admin/products/lenses/:id/features - Set product features
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateFeaturesSchema.parse(body);

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!product) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
        },
        { status: 404 }
      );
    }

    // Get features by keys (codes)
    const features = await prisma.feature.findMany({
      where: {
        organizationId: user.organizationId,
        key: { in: validated.featureCodes },
        category: product.category,
      },
    });

    if (features.length !== validated.featureCodes.length) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_FEATURES',
            message: 'Some feature codes not found',
          },
        },
        { status: 400 }
      );
    }

    // Delete existing product features
    await prisma.productFeature.deleteMany({
      where: { productId: id },
    });

    // Create new product features
    const productFeatures = await Promise.all(
      features.map((feature) =>
        prisma.productFeature.create({
          data: {
            productId: id,
            featureId: feature.id,
            strength: 1.0, // Default strength
          },
        })
      )
    );

    // Serialize Date objects
    const serialized = productFeatures.map((pf) => ({
      ...pf,
      createdAt: pf.createdAt.toISOString(),
    }));

    return Response.json({
      success: true,
      data: serialized,
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

