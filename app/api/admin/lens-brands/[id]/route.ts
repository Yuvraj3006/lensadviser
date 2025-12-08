import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateLensBrandSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/lens-brands/:id - Update lens brand
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateLensBrandSchema.parse(body);

    // Verify brand exists
    const brand = await prisma.lensBrand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundError('Lens brand');
    }

    // Check for duplicate name if updating name
    if (validated.name && validated.name !== brand.name) {
      const existing = await prisma.lensBrand.findUnique({
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
              message: 'Lens brand with this name already exists',
            },
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.lensBrand.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
    });

    return Response.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
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

// DELETE /api/admin/lens-brands/:id - Soft delete lens brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Verify brand exists
    const brand = await prisma.lensBrand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundError('Lens brand');
    }

    // Check if any products use this brand's name as brandLine
    const productCount = await prisma.lensProduct.count({
      where: {
        brandLine: brand.name,
        isActive: true,
      },
    });

    if (productCount > 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'BRAND_IN_USE',
            message: `Cannot delete lens brand. It has ${productCount} product(s) associated with it.`,
          },
        },
        { status: 409 }
      );
    }

    await prisma.lensBrand.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Lens brand deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

