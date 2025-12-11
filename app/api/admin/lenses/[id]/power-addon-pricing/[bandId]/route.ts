import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { serializePrismaModel } from '@/lib/serialization';
import { z } from 'zod';

const updateAddOnPricingSchema = z.object({
  sphMin: z.number().nullable().optional(),
  sphMax: z.number().nullable().optional(),
  cylMin: z.number().nullable().optional(),
  cylMax: z.number().nullable().optional(),
  addMin: z.number().nullable().optional(),
  addMax: z.number().nullable().optional(),
  extraCharge: z.number().int().min(0).optional(),
});

/**
 * PUT /api/admin/lenses/[id]/power-addon-pricing/[bandId]
 * Update an RX add-on pricing band
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
    const validated = updateAddOnPricingSchema.parse(body);

    // Verify lens exists
    const lens = await prisma.lensProduct.findUnique({
      where: { id: lensId },
    });

    if (!lens) {
      throw new ValidationError('Lens not found');
    }

    // Verify band exists and belongs to this lens
    // Use type assertion to access the model (TypeScript might not recognize it)
    const existingBand = await (prisma as any).lensPowerAddOnPricing.findUnique({
      where: { id: bandId },
    });

    if (!existingBand) {
      throw new ValidationError('Add-on pricing band not found');
    }

    if (existingBand.lensId !== lensId) {
      throw new ValidationError('Add-on pricing band does not belong to this lens');
    }

    // Validate ranges if provided
    const sphMin = validated.sphMin !== undefined ? validated.sphMin : existingBand.sphMin;
    const sphMax = validated.sphMax !== undefined ? validated.sphMax : existingBand.sphMax;
    const cylMin = validated.cylMin !== undefined ? validated.cylMin : existingBand.cylMin;
    const cylMax = validated.cylMax !== undefined ? validated.cylMax : existingBand.cylMax;
    const addMin = validated.addMin !== undefined ? validated.addMin : existingBand.addMin;
    const addMax = validated.addMax !== undefined ? validated.addMax : existingBand.addMax;

    if (sphMin !== null && sphMax !== null) {
      if (sphMin >= sphMax) {
        throw new ValidationError('SPH Min must be less than SPH Max');
      }
    }

    if (cylMin !== null && cylMax !== null) {
      if (Math.abs(cylMin) >= Math.abs(cylMax)) {
        throw new ValidationError('CYL Min must be less than CYL Max (in absolute terms)');
      }
    }

    if (addMin !== null && addMax !== null) {
      if (addMin >= addMax) {
        throw new ValidationError('ADD Min must be less than ADD Max');
      }
    }

    // At least one range must be specified
    if (
      sphMin === null && sphMax === null &&
      cylMin === null && cylMax === null &&
      addMin === null && addMax === null
    ) {
      throw new ValidationError('At least one range (SPH, CYL, or ADD) must be specified');
    }

    // Use type assertion to access the model (TypeScript might not recognize it)
    const updatedBand = await (prisma as any).lensPowerAddOnPricing.update({
      where: { id: bandId },
      data: {
        ...(validated.sphMin !== undefined && { sphMin: validated.sphMin }),
        ...(validated.sphMax !== undefined && { sphMax: validated.sphMax }),
        ...(validated.cylMin !== undefined && { cylMin: validated.cylMin }),
        ...(validated.cylMax !== undefined && { cylMax: validated.cylMax }),
        ...(validated.addMin !== undefined && { addMin: validated.addMin }),
        ...(validated.addMax !== undefined && { addMax: validated.addMax }),
        ...(validated.extraCharge !== undefined && { extraCharge: validated.extraCharge }),
      },
    });

    // Serialize Date fields for JSON response
    const serializedData = serializePrismaModel(updatedBand);

    return Response.json({
      success: true,
      data: serializedData,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/lenses/[id]/power-addon-pricing/[bandId]
 * Delete an RX add-on pricing band
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bandId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: lensId, bandId } = await params;

    // Verify lens exists
    const lens = await prisma.lensProduct.findUnique({
      where: { id: lensId },
    });

    if (!lens) {
      throw new ValidationError('Lens not found');
    }

    // Verify band exists and belongs to this lens
    // Use type assertion to access the model (TypeScript might not recognize it)
    const existingBand = await (prisma as any).lensPowerAddOnPricing.findUnique({
      where: { id: bandId },
    });

    if (!existingBand) {
      throw new ValidationError('Add-on pricing band not found');
    }

    if (existingBand.lensId !== lensId) {
      throw new ValidationError('Add-on pricing band does not belong to this lens');
    }

    // Use type assertion to access the model (TypeScript might not recognize it)
    await (prisma as any).lensPowerAddOnPricing.delete({
      where: { id: bandId },
    });

    return Response.json({
      success: true,
      message: 'Add-on pricing band deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
