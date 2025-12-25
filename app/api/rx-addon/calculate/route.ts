import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { rxAddOnPricingService } from '@/services/rx-addon-pricing.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const calculateRxAddOnSchema = z.object({
  lensItCode: z.string(),
  prescription: z.object({
    rSph: z.number().nullable().optional(),
    rCyl: z.number().nullable().optional(),
    lSph: z.number().nullable().optional(),
    lCyl: z.number().nullable().optional(),
    add: z.number().nullable().optional(),
  }),
});

/**
 * POST /api/rx-addon/calculate
 * Calculate RX add-on pricing for a lens based on prescription
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = calculateRxAddOnSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }
    
    const { lensItCode, prescription } = validationResult.data;
    
    // Find lens product by IT code
    const lensProduct = await prisma.lensProduct.findUnique({
      where: { itCode: lensItCode },
    });
    
    if (!lensProduct) {
      return Response.json({
        success: false,
        error: {
          code: 'LENS_NOT_FOUND',
          message: 'Lens product not found',
        },
      }, { status: 404 });
    }
    
    // Calculate RX add-on pricing
    const rxAddOnResult = await rxAddOnPricingService.calculateRxAddOnPricing(
      lensProduct.id,
      prescription,
      'HIGHEST_ONLY' // Business rule: Apply only highest matching band
    );
    
    return Response.json({
      success: true,
      data: rxAddOnResult,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

