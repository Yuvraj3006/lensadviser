import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createBandPricingSchema = z.object({
  minPower: z.number().min(0),
  maxPower: z.number().min(0),
  extraCharge: z.number().min(0),
});

/**
 * GET /api/admin/lenses/[id]/band-pricing
 * List all band pricing rules for a lens
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: lensId } = await params;

    // Verify lens exists
    const lens = await (prisma as any).lensProduct.findUnique({
      where: { id: lensId },
    });

    if (!lens) {
      throw new ValidationError('Lens not found');
    }

    const bandPricing = await (prisma as any).lensBandPricing.findMany({
      where: { lensId },
      orderBy: { minPower: 'asc' },
    });

    return Response.json({
      success: true,
      data: bandPricing,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/lenses/[id]/band-pricing
 * Create a new band pricing rule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: lensId } = await params;
    const body = await request.json();
    const validated = createBandPricingSchema.parse(body);

    // Verify lens exists
    const lens = await (prisma as any).lensProduct.findUnique({
      where: { id: lensId },
    });

    if (!lens) {
      throw new ValidationError('Lens not found');
    }

    // Validate power range
    if (validated.minPower >= validated.maxPower) {
      throw new ValidationError('Min power must be less than max power');
    }

    // Check for overlapping bands
    const existingBands = await (prisma as any).lensBandPricing.findMany({
      where: {
        lensId,
        isActive: true,
      },
    });

    const hasOverlap = existingBands.some((band: any) => {
      return (
        (validated.minPower >= band.minPower && validated.minPower < band.maxPower) ||
        (validated.maxPower > band.minPower && validated.maxPower <= band.maxPower) ||
        (validated.minPower <= band.minPower && validated.maxPower >= band.maxPower)
      );
    });

    if (hasOverlap) {
      throw new ValidationError('Band pricing range overlaps with existing band');
    }

    const bandPricing = await (prisma as any).lensBandPricing.create({
      data: {
        lensId,
        minPower: validated.minPower,
        maxPower: validated.maxPower,
        extraCharge: validated.extraCharge,
        isActive: true,
      },
    });

    return Response.json({
      success: true,
      data: bandPricing,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
