import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { offerEngineService } from '@/services/offer-engine.service';
import { OfferCalculationInput } from '@/types/offer-engine';
import { z } from 'zod';

// V2: Updated validation schema matching spec
const calculateOfferSchema = z.object({
  cart: z.object({
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
  }).optional(),
  // Support both old format (frame/lens) and new format (cart)
  frame: z.object({
    brand: z.string(),
    subCategory: z.string().nullable().optional(),
    mrp: z.number().positive(),
    frameType: z.enum(['FULL_RIM', 'HALF_RIM', 'RIMLESS']).optional(),
  }).optional(),
  lens: z.object({
    itCode: z.string(),
    price: z.number().positive(),
    brandLine: z.string(),
    yopoEligible: z.boolean(),
  }).optional(),
  customer: z.object({
    category: z.enum([
      'STUDENT',
      'DOCTOR',
      'TEACHER',
      'ARMED_FORCES',
      'SENIOR_CITIZEN',
      'CORPORATE',
      'REGULAR',
    ]).nullable().optional(),
    idProof: z.string().nullable().optional(),
  }).optional(),
  // Support old format
  customerCategory: z.enum([
    'STUDENT',
    'DOCTOR',
    'TEACHER',
    'ARMED_FORCES',
    'SENIOR_CITIZEN',
    'CORPORATE',
    'REGULAR',
  ]).nullable().optional(),
  couponCode: z.string().nullable().optional(),
  secondPair: z.object({
    enabled: z.boolean(),
    firstPairTotal: z.number(),
    secondPairFrameMRP: z.number().optional(),
    secondPairLensPrice: z.number().optional(),
  }).nullable().optional(),
  organizationId: z.string(),
  // For CONTACT_LENS_ONLY mode
  mode: z.enum(['FRAME_AND_LENS', 'ONLY_LENS', 'CONTACT_LENS_ONLY']).optional(),
  otherItems: z.array(z.object({
    type: z.enum(['CONTACT_LENS', 'ACCESSORY']),
    brand: z.string(),
    mrp: z.number(),
    finalPrice: z.number(),
    quantity: z.number().optional(),
  })).optional(),
});

/**
 * POST /api/offer-engine/calculate
 * V2: Calculate offers for a frame + lens combination
 * Supports both old format (frame/lens) and new format (cart/customer)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = calculateOfferSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    // Normalize input format
    const normalizedInput: OfferCalculationInput = {
      frame: body.cart?.frame || body.frame || null,
      lens: body.cart?.lens || body.lens || null,
      customerCategory: body.customer?.category || body.customerCategory || null,
      couponCode: body.couponCode || null,
      secondPair: body.secondPair || null,
      organizationId: body.organizationId,
      mode: body.mode || (body.frame && body.lens ? 'FRAME_AND_LENS' : body.lens ? 'ONLY_LENS' : 'CONTACT_LENS_ONLY'),
      otherItems: body.otherItems || undefined,
    };

    // V2: Mandatory validations
    // For CONTACT_LENS_ONLY mode, otherItems is required
    if (normalizedInput.mode === 'CONTACT_LENS_ONLY') {
      if (!normalizedInput.otherItems || normalizedInput.otherItems.length === 0) {
        throw new ValidationError('otherItems is required for CONTACT_LENS_ONLY mode');
      }
    } else {
      // For frame+lens or lens-only, lens is required
      if (!normalizedInput.lens) {
        throw new ValidationError('Lens is required for frame+lens or lens-only modes');
      }
    }

    // Calculate offers using the offer engine
    const result = await offerEngineService.calculateOffers(normalizedInput);

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

