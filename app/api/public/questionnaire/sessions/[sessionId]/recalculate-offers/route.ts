import { NextRequest } from 'next/server';
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { offerEngineService } from '@/services/offer-engine.service';
import { FrameInput, LensInput } from '@/types/offer-engine';

/**
 * Deep serialize an object to remove BigInt, Date, and other non-serializable types
 */
function deepSerialize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSerialize(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = deepSerialize(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

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

    const { productId, couponCode, secondPair, customerCategory } = body;

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
    
    // Calculate lens pricing - use baseOfferPrice from lens product
    // Features no longer have pricing, so we use the product's baseOfferPrice
    let totalLensPrice = (product as any).baseOfferPrice ?? baseLensPrice;
    
    // Add mirror coating add-on price if tint selection exists (for Power Sunglasses)
    // Tint selection is stored in request body or can be fetched from session
    const tintSelection = body.tintSelection;
    if (tintSelection?.mirrorAddOnPrice) {
      totalLensPrice += tintSelection.mirrorAddOnPrice;
    }

    // Check if this is an "Only Lens" session (no frame)
    // Frame data is stored in customerEmail field as JSON (since Session model doesn't have notes field)
    const sessionNotes = session.customerEmail as any;
    const frameData = sessionNotes?.frame;
    const isOnlyLens = !frameData || !frameData.brand || frameData.mrp === 0;

    // Prepare inputs for Offer Engine
    // For "Only Lens" flow, frame is optional/null
    let frameInput: FrameInput | null = null;
    if (!isOnlyLens && frameData && frameData.brand && frameData.mrp > 0) {
      frameInput = {
        brand: frameData.brand,
        subCategory: frameData.subCategory || null,
        mrp: frameData.mrp || 0,
        frameType: frameData.frameType || undefined,
      };
    }

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

    // Calculate offers using offer engine (frame is optional for lens-only flow)
    // Use customerCategory from request body if provided, otherwise from session
    const finalCustomerCategory = customerCategory || (session.customerCategory as any) || null;
    
    const offerResult = await offerEngineService.calculateOffers({
      frame: frameInput, // null for lens-only flow
      lens: lensInput,
      customerCategory: finalCustomerCategory,
      couponCode: couponCode || null,
      secondPair: secondPair || null,
      organizationId,
    });

    // Serialize the offer result to handle any BigInt or Date fields
    const serializedOfferResult = deepSerialize(offerResult);

    return Response.json({
      success: true,
      data: serializedOfferResult,
    });
  } catch (error: any) {
    console.error('[recalculate-offers] Error:', error);
    console.error('[recalculate-offers] Error type:', typeof error);
    console.error('[recalculate-offers] Error message:', error?.message);
    console.error('[recalculate-offers] Error stack:', error?.stack);
    return handleApiError(error);
  }
}

