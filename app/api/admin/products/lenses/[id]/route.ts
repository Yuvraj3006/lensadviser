import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const updateLensSchema = z.object({
  itCode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  brandLine: z.enum(['DIGI360_ADVANCED', 'DIGI360_ESSENTIAL', 'DRIVEXPERT', 'DURASHIELD_NATURE', 'BLUEXPERT', 'BLUEXPERT_ADVANCED', 'CITYLIFE', 'VISIONX_ULTRA', 'VISIONX_NEO', 'PUREVIEW', 'HARDX', 'RELAX_PLUS', 'MYOCONTROL_INTRO', 'MYOCONTROL_ADVANCED', 'TINT_NEXT', 'TINT_PREMIUM', 'TINT_ESSENTIAL', 'IGNITE_BLUEBAN', 'IGNITE_NATURE', 'IGNITE_DRIVE', 'IGNITE_DIGITAL', 'IGNITE_GOLD', 'IGNITE_PLATINUM', 'PROGRESSIVE_PLUS', 'STANDARD', 'PREMIUM', 'OTHER']).optional(),
  visionType: z.enum(['SINGLE_VISION', 'PROGRESSIVE', 'BIFOCAL', 'ANTI_FATIGUE', 'MYOPIA_CONTROL']).optional(),
  lensIndex: z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']).optional(),
  tintOption: z.enum(['CLEAR', 'TINT', 'PHOTOCHROMIC']).optional(),
  mrp: z.number().positive().optional(),
  offerPrice: z.number().positive().optional(),
  addOnPrice: z.number().optional(),
  sphMin: z.number().optional(),
  sphMax: z.number().optional(),
  cylMax: z.number().optional(),
  addMin: z.number().optional().nullable(),
  addMax: z.number().optional().nullable(),
  deliveryDays: z.number().int().optional(),
  warranty: z.string().optional().nullable(),
  yopoEligible: z.boolean().optional(),
}).partial();

// PUT /api/admin/products/lenses/:id - Update lens product (matches backend spec)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateLensSchema.parse(body);

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

    // Check itCode uniqueness if being updated
    if (validated.itCode && validated.itCode !== product.itCode) {
      const existing = await prisma.product.findFirst({
        where: {
          organizationId: user.organizationId,
          OR: [
            { itCode: validated.itCode },
            { sku: validated.itCode },
          ],
          id: { not: id },
        },
      });

      if (existing) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_IT_CODE',
              message: 'IT Code already exists',
            },
          },
          { status: 400 }
        );
      }
    }

    // Update product
    const updateData: any = { ...validated };
    if (validated.offerPrice) {
      updateData.basePrice = validated.offerPrice; // Sync basePrice with offerPrice
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Serialize Date objects
    const serialized = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

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

