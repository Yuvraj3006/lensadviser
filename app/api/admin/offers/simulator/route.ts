/**
 * Offer Simulator API
 * POST /api/admin/offers/simulator
 * Simulates offer calculation for testing
 */

import { NextRequest } from 'next/server';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/lib/constants';
import { handleApiError, ValidationError } from '@/lib/errors';
import { OfferEngineService } from '@/services/offer-engine.service';
import { z } from 'zod';

const simulatorSchema = z.object({
  frameBrand: z.string().optional(),
  frameMRP: z.number().min(0).optional(),
  frameSubCategory: z.string().optional(),
  lensSKU: z.string().optional(),
  lensBrandLine: z.string().optional(),
  lensPrice: z.number().min(0).optional(),
  customerCategory: z.string().optional(),
  couponCode: z.string().optional(),
  organizationId: z.string(),
});

const offerEngineService = new OfferEngineService();

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = simulatorSchema.parse(body);

    const { frameBrand, frameMRP, frameSubCategory, lensSKU, lensBrandLine, lensPrice, customerCategory, couponCode, organizationId } = validated;

    // Prepare inputs for offer engine
    const offerInput = {
      frame: frameBrand && frameMRP ? {
        brand: frameBrand,
        subCategory: frameSubCategory || null,
        mrp: frameMRP,
        frameType: undefined,
      } : null,
      lens: lensSKU || lensBrandLine ? {
        itCode: lensSKU || 'SIMULATED',
        brandLine: lensBrandLine || 'STANDARD',
        price: lensPrice || 0,
        yopoEligible: true,
      } : null,
      customerCategory: customerCategory || null,
      couponCode: couponCode || null,
      organizationId,
      mode: frameBrand && frameMRP ? 'FRAME_AND_LENS' : 'ONLY_LENS',
      otherItems: null,
      secondPair: null,
    };

    // Type cast customerCategory to fix TypeScript error
    const typedInput: any = {
      ...offerInput,
      customerCategory: customerCategory as any,
    };

    // Calculate offers
    const result = await offerEngineService.calculateOffers(typedInput);

    // Get all applicable offers (not just the applied one)
    const allApplicableOffers = await offerEngineService.findApplicablePrimaryRule(typedInput);

    return Response.json({
      success: true,
      data: {
        input: {
          frame: offerInput.frame,
          lens: offerInput.lens,
          customerCategory,
          couponCode,
        },
        result: {
          baseTotal: result.baseTotal,
          effectiveBase: result.effectiveBase,
          finalPayable: result.finalPayable,
          savings: result.baseTotal - result.finalPayable,
          offersApplied: result.offersApplied,
          priceComponents: result.priceComponents,
          categoryDiscount: result.categoryDiscount,
          couponDiscount: result.couponDiscount,
          upsell: result.upsell,
        },
        applicableOffers: allApplicableOffers ? [{
          code: allApplicableOffers.code,
          type: allApplicableOffers.offerType,
          title: allApplicableOffers.title,
          description: allApplicableOffers.description,
          priority: allApplicableOffers.priority,
        }] : [],
      },
    });
  } catch (error: any) {
    console.error('[offers/simulator] Error:', error);
    return handleApiError(error);
  }
}
