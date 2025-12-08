import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateSubBrandSchema = z.object({
  name: z.string().min(1, 'Sub-brand name is required').optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/brands/:id/subbrands/:subBrandId - Update sub-brand
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subBrandId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: brandId, subBrandId } = await params;
    const body = await request.json();
    const validated = updateSubBrandSchema.parse(body);

    // Verify brand exists (ProductBrand doesn't have organizationId - it's global)
    const brand = await prisma.productBrand.findUnique({
      where: {
        id: brandId,
      },
    });

    if (!brand) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Brand not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify sub-brand exists
    const subBrand = await prisma.productSubBrand.findFirst({
      where: {
        id: subBrandId,
        brandId,
      },
    });

    if (!subBrand) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Sub-brand not found',
          },
        },
        { status: 404 }
      );
    }

    // Check for duplicate name if updating name
    if (validated.name && validated.name !== subBrand.name) {
      const existing = await prisma.productSubBrand.findFirst({
        where: {
          brandId,
          name: validated.name,
          id: { not: subBrandId },
        },
      });

      if (existing) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_SUBBRAND',
              message: 'Sub-brand with this name already exists for this brand',
            },
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.productSubBrand.update({
      where: { id: subBrandId },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
    });

    return Response.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
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

// DELETE /api/admin/brands/:id/subbrands/:subBrandId - Delete sub-brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subBrandId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: brandId, subBrandId } = await params;

    // Verify brand exists (ProductBrand doesn't have organizationId - it's global)
    const brand = await prisma.productBrand.findUnique({
      where: {
        id: brandId,
      },
    });

    if (!brand) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Brand not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify sub-brand exists and check for products
    const subBrand = await prisma.productSubBrand.findFirst({
      where: {
        id: subBrandId,
        brandId,
      },
      include: {
        products: true,
      },
    });

    if (!subBrand) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Sub-brand not found',
          },
        },
        { status: 404 }
      );
    }

    // Check if sub-brand has products
    if (subBrand.products.length > 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'SUBBRAND_IN_USE',
            message: `Cannot delete sub-brand. It has ${subBrand.products.length} product(s) associated with it.`,
          },
        },
        { status: 409 }
      );
    }

    await prisma.productSubBrand.delete({
      where: { id: subBrandId },
    });

    return Response.json({
      success: true,
      message: 'Sub-brand deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

