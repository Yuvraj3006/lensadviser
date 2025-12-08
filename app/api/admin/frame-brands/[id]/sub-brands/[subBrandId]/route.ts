import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const updateSubBrandSchema = z.object({
  subBrandName: z.string().min(1, 'Sub-brand name is required').optional(),
  offerRuleIds: z.array(z.string()).optional(),
});

// PUT /api/admin/frame-brands/[id]/sub-brands/[subBrandId] - Update sub-brand
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subBrandId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id, subBrandId } = await params;
    const body = await request.json();
    const validatedData = updateSubBrandSchema.parse(body);

    // Verify brand exists and belongs to organization
    const brand = await prisma.frameBrand.findUnique({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!brand) {
      throw new NotFoundError('Frame brand');
    }

    // Verify sub-brand exists
    const subBrand = await prisma.frameSubBrand.findUnique({
      where: {
        id: subBrandId,
        brandId: id,
      },
    });

    if (!subBrand) {
      throw new NotFoundError('Frame sub-brand');
    }

    const updated = await prisma.frameSubBrand.update({
      where: { id: subBrandId },
      data: validatedData,
    });

    return Response.json({
      success: true,
      data: updated,
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

// DELETE /api/admin/frame-brands/[id]/sub-brands/[subBrandId] - Delete sub-brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subBrandId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id, subBrandId } = await params;

    // Verify brand exists and belongs to organization
    const brand = await prisma.frameBrand.findUnique({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!brand) {
      throw new NotFoundError('Frame brand');
    }

    // Verify sub-brand exists
    const subBrand = await prisma.frameSubBrand.findUnique({
      where: {
        id: subBrandId,
        brandId: id,
      },
    });

    if (!subBrand) {
      throw new NotFoundError('Frame sub-brand');
    }

    await prisma.frameSubBrand.delete({
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

