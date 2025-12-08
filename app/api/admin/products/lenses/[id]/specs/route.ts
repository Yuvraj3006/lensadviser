import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const updateSpecsSchema = z.object({
  specs: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      group: z.enum(['OPTICAL_DESIGN', 'MATERIAL', 'COATING', 'INDEX_USAGE', 'LIFESTYLE_TAG']),
    })
  ),
});

// PUT /api/admin/products/lenses/:id/specs - Set product specifications
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateSpecsSchema.parse(body);

    // Verify product exists and belongs to organization
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

    // Delete existing specs
    await prisma.productSpecification.deleteMany({
      where: { productId: id },
    });

    // Create new specs
    const specs = await Promise.all(
      validated.specs.map((spec) =>
        prisma.productSpecification.create({
          data: {
            productId: id,
            key: spec.key,
            value: spec.value,
            group: spec.group,
          },
        })
      )
    );

    // Serialize Date objects
    const serialized = specs.map((spec) => ({
      ...spec,
      createdAt: spec.createdAt.toISOString(),
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

