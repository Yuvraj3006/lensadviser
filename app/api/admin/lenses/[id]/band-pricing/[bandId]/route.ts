import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateBandPricingSchema = z.object({
  minPower: z.number().min(0).optional(),
  maxPower: z.number().min(0).optional(),
  extraCharge: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/lenses/[id]/band-pricing/[bandId]
 * Update a band pricing rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bandId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: lensId, bandId } = await params;
    const body = await request.json();
    const validated = updateBandPricingSchema.parse(body);

    // Verify band exists
    const band = await (prisma as any).lensBandPricing.findUnique({
      where: { id: bandId },
    });

    if (!band || band.lensId !== lensId) {
      throw new NotFoundError('Band pricing not found');
    }

    // Validate power range if both are provided
    if (validated.minPower !== undefined && validated.maxPower !== undefined) {
      if (validated.minPower >= validated.maxPower) {
        throw new ValidationError('Min power must be less than max power');
      }
    }

    const updated = await (prisma as any).lensBandPricing.update({
      where: { id: bandId },
      data: {
        ...(validated.minPower !== undefined && { minPower: validated.minPower }),
        ...(validated.maxPower !== undefined && { maxPower: validated.maxPower }),
        ...(validated.extraCharge !== undefined && { extraCharge: validated.extraCharge }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
    });

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/lenses/[id]/band-pricing/[bandId]
 * Delete a band pricing rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bandId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: lensId, bandId } = await params;

    // Verify band exists
    const band = await (prisma as any).lensBandPricing.findUnique({
      where: { id: bandId },
    });

    if (!band || band.lensId !== lensId) {
      throw new NotFoundError('Band pricing not found');
    }

    await (prisma as any).lensBandPricing.delete({
      where: { id: bandId },
    });

    return Response.json({
      success: true,
      message: 'Band pricing deleted',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
