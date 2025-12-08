import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').optional(),
  isActive: z.boolean().optional(),
  productTypes: z.array(z.enum(['FRAME', 'SUNGLASS', 'CONTACT_LENS', 'ACCESSORY'])).optional(),
});

// PUT /api/admin/brands/:id - Update brand
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateBrandSchema.parse(body);

    // Verify brand exists (brands are global)
    const brand = await prisma.productBrand.findUnique({
      where: { id },
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

    // Check for duplicate name if updating name
    if (validated.name && validated.name !== brand.name) {
      const existing = await prisma.productBrand.findUnique({
        where: {
          name: validated.name,
        },
      });

      if (existing) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_BRAND',
              message: 'Brand with this name already exists',
            },
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.productBrand.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
        ...(validated.productTypes && { productTypes: validated.productTypes }),
      },
      include: {
        subBrands: true,
      },
    });

    return Response.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        productTypes: updated.productTypes,
        subBrands: updated.subBrands.map((sb) => ({
          id: sb.id,
          name: sb.name,
          isActive: sb.isActive,
        })),
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

// DELETE /api/admin/brands/:id - Delete brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Verify brand exists (brands are global)
    const brand = await prisma.productBrand.findUnique({
      where: { id },
      include: {
        products: true,
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

    // Check if brand has products
    if (brand.products.length > 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'BRAND_IN_USE',
            message: `Cannot delete brand. It has ${brand.products.length} product(s) associated with it.`,
          },
        },
        { status: 409 }
      );
    }

    await prisma.productBrand.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Brand deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

