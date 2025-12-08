import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createSubBrandSchema = z.object({
  name: z.string().min(1, 'Sub-brand name is required'),
});

// POST /api/admin/brands/:id/subbrands - Create sub-brand for a brand
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: brandId } = await params;
    const body = await request.json();
    const validated = createSubBrandSchema.parse(body);

    // Verify brand exists (brands are global)
    const brand = await prisma.productBrand.findUnique({
      where: { id: brandId },
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

    // Check if sub-brand already exists
    const existing = await prisma.productSubBrand.findFirst({
      where: {
        brandId,
        name: validated.name,
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

    const subBrand = await prisma.productSubBrand.create({
      data: {
        brandId,
        name: validated.name,
      },
    });

    return Response.json({
      success: true,
      data: {
        id: subBrand.id,
        name: subBrand.name,
        isActive: subBrand.isActive,
        createdAt: subBrand.createdAt,
        updatedAt: subBrand.updatedAt,
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

