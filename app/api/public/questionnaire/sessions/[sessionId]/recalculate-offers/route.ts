import { NextRequest } from 'next/server';
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { offerEngineService } from '@/services/offer-engine.service';
import { FrameInput, LensInput } from '@/types/offer-engine';

/**
 * POST /api/public/questionnaire/sessions/[sessionId]/recalculate-offers
 * Recalculate offers for a product with coupon code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { productId, couponCode, secondPair } = body;

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    // Get session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    // Get store separately (Session model doesn't have relation defined)
    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
    });

    if (!store) {
      throw new NotFoundError('Store not found for this session');
    }

    // Get organization separately (Store model doesn't have relation defined)
    const organization = await prisma.organization.findUnique({
      where: { id: store.organizationId },
    });

    if (!organization) {
      throw new NotFoundError('Organization not found for this store');
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Fetch related data manually
    const [storeProducts, productFeatures] = await Promise.all([
      prisma.storeProduct.findMany({
        where: {
          productId: product.id,
          storeId: session.storeId,
        },
      }),
      prisma.productFeature.findMany({
        where: { productId: product.id },
      }),
    ]);

    const organizationId = store.organizationId;
    const baseLensPrice = organization.baseLensPrice || 0;
    const storeProduct = storeProducts[0];
    const framePrice = storeProduct?.priceOverride ?? product.basePrice ?? 0;

    // Fetch features and calculate lens pricing
    const featuresWithDetails = await Promise.all(
      productFeatures.map(async (pf) => {
        const feature = await prisma.feature.findUnique({
          where: { id: pf.featureId },
        });
        return {
          id: feature?.id || '',
          name: feature?.name || '',
          price: feature?.price ?? 0,
          strength: pf.strength ?? 0,
        };
      })
    );

    const totalLensPrice = baseLensPrice + featuresWithDetails.reduce(
      (sum, f) => sum + (f.price * f.strength),
      0
    );

    // Prepare inputs for Offer Engine
    const frameInput: FrameInput = {
      brand: product.brand || 'UNKNOWN',
      subCategory: null, // Product model doesn't have subCategory field
      mrp: framePrice,
      frameType: undefined,
    };

    // Handle itCode as Json? field - convert to string if needed
    const itCodeValue = product.itCode 
      ? (typeof product.itCode === 'string' ? product.itCode : String(product.itCode))
      : product.sku;

    const lensInput: LensInput = {
      itCode: itCodeValue || product.sku,
      price: totalLensPrice,
      brandLine: product.brandLine || 'STANDARD',
      yopoEligible: product.yopoEligible || false,
    };

    // Validate inputs before calling offer engine
    if (framePrice <= 0) {
      throw new ValidationError('Frame price must be greater than 0');
    }
    if (totalLensPrice <= 0) {
      throw new ValidationError('Lens price must be greater than 0');
    }
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    // Calculate offers with coupon
    let offerResult;
    try {
      offerResult = await offerEngineService.calculateOffers({
        frame: frameInput,
        lens: lensInput,
        customerCategory: (session.customerCategory as any) || null,
        couponCode: couponCode || null,
        secondPair: secondPair || null,
        organizationId,
      });
    } catch (offerError: any) {
      console.error('[recalculate-offers] Offer engine error:', offerError);
      throw new ValidationError(
        `Failed to calculate offers: ${offerError?.message || 'Unknown error'}`
      );
    }

    return Response.json({
      success: true,
      data: offerResult,
    });
  } catch (error: any) {
    console.error('[recalculate-offers] Error:', error);
    console.error('[recalculate-offers] Error type:', typeof error);
    console.error('[recalculate-offers] Error message:', error?.message);
    console.error('[recalculate-offers] Error stack:', error?.stack);
    return handleApiError(error);
  }
}

