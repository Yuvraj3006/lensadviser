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

    const { productId, couponCode, secondPair, customerCategory, accessories } = body;
    
    // If second pair is enabled, fetch the lens IT code from lens ID
    let secondPairWithItCode = secondPair;
    if (secondPair?.enabled && secondPair.lensId) {
      try {
        const secondPairLens = await prisma.lensProduct.findUnique({
          where: { id: secondPair.lensId },
          select: { itCode: true },
        });
        
        if (secondPairLens?.itCode) {
          const itCodeValue = typeof secondPairLens.itCode === 'string' 
            ? secondPairLens.itCode 
            : String(secondPairLens.itCode);
          
          secondPairWithItCode = {
            ...secondPair,
            secondPairLensItCode: itCodeValue,
          };
        }
      } catch (error: any) {
        console.warn('[recalculate-offers] Failed to fetch second pair lens IT code:', error?.message);
        // Continue without IT code - RX add-on won't be calculated
      }
    }

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
    // Explicitly select yopoEligible to ensure it's included
    let product = await prisma.lensProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
        itCode: true,
        name: true,
        brandLine: true,
        baseOfferPrice: true,
        yopoEligible: true, // Explicitly include YOPO eligibility
        mrp: true,
        visionType: true,
        lensIndex: true,
        tintOption: true,
        category: true,
        deliveryDays: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
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

    // Extract prescription data from session
    // Prescription can be in sessionNotes.prescription or from request body
    const prescriptionData = body.prescription || sessionNotes?.prescription;
    let prescriptionInput = null;
    if (prescriptionData) {
      // Convert from odSphere/osSphere format to rSph/lSph format
      prescriptionInput = {
        rSph: prescriptionData.rSph ?? prescriptionData.odSphere ?? null,
        rCyl: prescriptionData.rCyl ?? prescriptionData.odCylinder ?? null,
        lSph: prescriptionData.lSph ?? prescriptionData.osSphere ?? null,
        lCyl: prescriptionData.lCyl ?? prescriptionData.osCylinder ?? null,
        add: prescriptionData.add ?? prescriptionData.odAdd ?? prescriptionData.osAdd ?? null,
      };
    }

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

    // Ensure yopoEligible is correctly read from product
    const yopoEligible = (product as any).yopoEligible !== undefined 
      ? (product as any).yopoEligible 
      : false;
    
    console.log('[recalculate-offers] Product YOPO eligibility:', {
      productId: product.id,
      productName: product.name,
      yopoEligible: yopoEligible,
      productData: product,
    });
    
    const lensInput: LensInput = {
      itCode: itCodeValue || (product as any).sku || '',
      price: totalLensPrice,
      brandLine: product.brandLine || 'STANDARD',
      yopoEligible: yopoEligible,
      name: product.name || undefined, // Include product name for brandLine matching
    };

    // Calculate offers using offer engine (frame is optional for lens-only flow)
    // Use customerCategory from request body if provided, otherwise from session
    const finalCustomerCategory = customerCategory || (session.customerCategory as any) || null;
    
    // Prepare otherItems with accessories if provided
    const otherItems = accessories && Array.isArray(accessories) && accessories.length > 0
      ? accessories
      : undefined;

    console.log('[recalculate-offers] Calling offer engine with:', {
      organizationId,
      frame: frameInput ? {
        brand: frameInput.brand,
        subCategory: frameInput.subCategory,
        mrp: frameInput.mrp,
        frameType: frameInput.frameType,
      } : null,
      lens: {
        itCode: lensInput.itCode,
        price: lensInput.price,
        brandLine: lensInput.brandLine,
        yopoEligible: lensInput.yopoEligible,
      },
      customerCategory: finalCustomerCategory,
      prescription: prescriptionInput,
      isOnlyLens: !frameInput || frameInput.mrp === 0,
    });

    // Get purchase context and combo code from session
    const purchaseContext = (session.purchaseContext as 'REGULAR' | 'COMBO' | 'YOPO' | null) || null;
    const selectedComboCode = session.selectedComboCode || null;

    const { selectedOfferType } = body; // Get selected offer type from request
    
    const offerResult = await offerEngineService.calculateOffers({
      frame: frameInput, // null for lens-only flow
      lens: lensInput,
      prescription: prescriptionInput,
      customerCategory: finalCustomerCategory,
      couponCode: couponCode || null,
      secondPair: secondPairWithItCode || null,
      organizationId,
      otherItems, // Include accessories in offer calculation
      purchaseContext, // Pass purchase context (REGULAR/COMBO/YOPO)
      selectedComboCode, // Pass selected combo tier code for COMBO context
      selectedOfferType: selectedOfferType || null, // Pass selected offer type
    });

    console.log('[recalculate-offers] Offer engine returned:', {
      offersAppliedCount: offerResult.offersApplied?.length || 0,
      offersApplied: offerResult.offersApplied,
      categoryDiscount: offerResult.categoryDiscount,
      baseTotal: offerResult.baseTotal,
      effectiveBase: offerResult.effectiveBase,
      finalPayable: offerResult.finalPayable,
    });
    
    // Debug: Log each offer in detail
    if (offerResult.offersApplied && offerResult.offersApplied.length > 0) {
      console.log('[recalculate-offers] 🔍 Detailed offersApplied from offer engine:');
      offerResult.offersApplied.forEach((offer: any, index: number) => {
        console.log(`[recalculate-offers]   Offer ${index + 1}:`, {
          ruleCode: offer.ruleCode,
          description: offer.description,
          savings: offer.savings,
          type: offer.type,
          isYOPO: (offer.ruleCode || '').toUpperCase().includes('YOPO') || 
                  (offer.description || '').toUpperCase().includes('YOPO'),
        });
      });
    } else {
      console.log('[recalculate-offers] ⚠️ No offers applied by offer engine!');
      console.log('[recalculate-offers] This could mean:');
      console.log('[recalculate-offers]   1. No YOPO rule exists in database');
      console.log('[recalculate-offers]   2. YOPO rule exists but conditions don\'t match');
      console.log('[recalculate-offers]   3. Lens is not YOPO eligible');
      console.log('[recalculate-offers]   4. Higher priority rule (COMBO_PRICE) is being applied instead');
    }

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

