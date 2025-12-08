import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const createSubBrandSchema = z.object({
  subBrandName: z.string().min(1, 'Sub-brand name is required'),
  offerRuleIds: z.array(z.string()).default([]),
});

// GET /api/admin/frame-brands/[id]/sub-brands - List sub-brands for a brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    const { id } = await params;

    const brand = await prisma.frameBrand.findUnique({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        subBrands: {
          orderBy: {
            subBrandName: 'asc',
          },
        },
      },
    });

    if (!brand) {
      throw new NotFoundError('Frame brand');
    }

    return Response.json({
      success: true,
      data: brand.subBrands,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/frame-brands/[id]/sub-brands - Create new sub-brand
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validatedData = createSubBrandSchema.parse(body);

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

    const subBrand = await prisma.frameSubBrand.create({
      data: {
        brandId: id,
        subBrandName: validatedData.subBrandName,
        offerRuleIds: validatedData.offerRuleIds,
      },
    });

    return Response.json({
      success: true,
      data: subBrand,
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

