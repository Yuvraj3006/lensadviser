import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { offerEngineService } from '@/services/offer-engine.service';
import { OfferCalculationInput } from '@/types/offer-engine';
import { z } from 'zod';

// Validation schema
const calculateOfferSchema = z.object({
  frame: z.object({
    brand: z.string(),
    subCategory: z.string().nullable().optional(),
    mrp: z.number().positive(),
    frameType: z.enum(['FULL_RIM', 'HALF_RIM', 'RIMLESS']).optional(),
  }),
  lens: z.object({
    itCode: z.string(),
    price: z.number().positive(),
    brandLine: z.string(),
    yopoEligible: z.boolean(),
  }),
  customerCategory: z
    .enum([
      'STUDENT',
      'DOCTOR',
      'TEACHER',
      'ARMED_FORCES',
      'SENIOR_CITIZEN',
      'CORPORATE',
      'REGULAR',
    ])
    .nullable()
    .optional(),
  couponCode: z.string().nullable().optional(),
  secondPair: z
    .object({
      enabled: z.boolean(),
      firstPairTotal: z.number(),
      secondPairFrameMRP: z.number().optional(),
      secondPairLensPrice: z.number().optional(),
    })
    .nullable()
    .optional(),
  organizationId: z.string(),
});

/**
 * POST /api/offers/calculate
 * Calculate offers for a frame + lens combination
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = calculateOfferSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    const input: OfferCalculationInput = validationResult.data;

    // Calculate offers using the offer engine
    const result = await offerEngineService.calculateOffers(input);

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

