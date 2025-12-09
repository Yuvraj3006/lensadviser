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
    // Try lens product first, then retail product
    let product = await prisma.lensProduct.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      const retailProduct = await prisma.retailProduct.findUnique({
        where: { id: productId },
      });
      if (retailProduct) {
        // Convert retail product to expected format
        product = {
          id: retailProduct.id,
          itCode: retailProduct.sku || retailProduct.id,
          name: retailProduct.name || '',
          baseOfferPrice: retailProduct.mrp,
          brandLine: '',
        } as any;
      }
    }

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
    const framePrice = storeProduct?.priceOverride ?? (product as any).baseOfferPrice ?? 0;

    // Calculate lens pricing - use baseOfferPrice from lens product
    // Features no longer have pricing, so we use the product's baseOfferPrice
    const totalLensPrice = (product as any).baseOfferPrice ?? baseLensPrice;

    // Prepare inputs for Offer Engine
    const frameInput: FrameInput = {
      brand: (product as any).brand || (product as any).brandLine || 'UNKNOWN',
      subCategory: null, // Product model doesn't have subCategory field
      mrp: framePrice,
      frameType: undefined,
    };

    // Handle itCode as Json? field - convert to string if needed
    const itCodeValue = product.itCode 
      ? (typeof product.itCode === 'string' ? product.itCode : String(product.itCode))
      : (product as any).sku;

    const lensInput: LensInput = {
      itCode: itCodeValue || (product as any).sku || '',
      price: totalLensPrice,
      brandLine: product.brandLine || 'STANDARD',
      yopoEligible: product.yopoEligible || false,
    };

  } catch (error: any) {
    console.error('[recalculate-offers] Error:', error);
    console.error('[recalculate-offers] Error type:', typeof error);
    console.error('[recalculate-offers] Error message:', error?.message);
    console.error('[recalculate-offers] Error stack:', error?.stack);
    return handleApiError(error);
  }
}

