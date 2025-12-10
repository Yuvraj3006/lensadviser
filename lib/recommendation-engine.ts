/**
 * LensTrack Recommendation Engine
 * 
 * Uses weighted feature matching to recommend products based on customer answers.
 * ALL PRICING AND OFFERS ARE FETCHED FROM DATABASE - NO HARDCODING!
 */

import { prisma } from '@/lib/prisma';

// OfferType is a string field, not an enum in Prisma
const OfferType = {
  PERCENT_OFF: 'PERCENT_OFF',
  FLAT_OFF: 'FLAT_OFF',
  FREE_LENS: 'FREE_LENS',
  BONUS_FREE_PRODUCT: 'BONUS_FREE_PRODUCT',
} as const;

type ProductCategory = 'EYEGLASSES' | 'SUNGLASSES' | 'CONTACT_LENSES' | 'ACCESSORIES';
type OfferCondition = 'MIN_PURCHASE' | 'MATCH_SCORE' | 'FIRST_PURCHASE' | 'BRAND_SPECIFIC' | 'CATEGORY' | 'NO_CONDITION';
import { offerEngineService } from '@/services/offer-engine.service';
import { FrameInput, LensInput } from '@/types/offer-engine';
import { IndexRecommendationService } from '@/services/index-recommendation.service';
import { RxInput } from '@/services/rx-validation.service';

interface LensPricing {
  baseLensPrice: number;
  featureAddons: { name: string; price: number; featureId: string }[];
  totalLensPrice: number;
}

interface PricingBreakdown {
  framePrice: number;
  lensPrice: LensPricing;
  subtotal: number;
  appliedOffer?: {
    name: string;
    code: string;
    discountAmount: number;
    discountPercent: number;
  };
  finalPrice: number;
  savings: number;
}

interface Offer {
  id: string;
  type: string;
  code: string;
  title: string;
  description: string;
  discountPercent?: number;
  discountAmount?: number;
  minPurchase?: number;
  isApplicable: boolean;
  priority: number;
}

interface RecommendedProduct {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  brand?: string | null;
  basePrice: number;
  imageUrl?: string | null;
  category: ProductCategory;
  matchScore: number;
  matchPercent?: number; // BACKEND SPEC: Match percentage (0-100)
  benefitComponent?: number; // BACKEND SPEC: Benefit component score
  finalScore?: number; // BACKEND SPEC: Final score (benefitComponent only - Answer Boosts removed)
  rank: number;
  features: {
    id: string;
    name: string;
    key: string;
    price: number;
  }[];
  lensIndex?: string; // Lens index (e.g., 'INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174')
  indexRecommendation?: {
    recommendedIndex: string; // INDEX_156, INDEX_160, etc.
    indexDelta: number; // >0 thinner, 0 ideal, <0 thicker
    validationMessage?: string | null; // Warning or error message
    isInvalid?: boolean; // True if violates rules (e.g., INDEX_156 for rimless)
    isWarning?: boolean; // True if thicker than recommended
  };
  thicknessWarning?: boolean; // Show warning if index is thicker than recommended
  indexInvalid?: boolean; // True if index selection violates rules
  storeInfo?: {
    priceOverride?: number | null;
    stockQuantity: number;
    isAvailable: boolean;
    finalPrice: number;
    discount?: number;
  };
  pricing: PricingBreakdown;
  offers: Offer[];
}

interface RecommendationResult {
  sessionId: string;
  category: ProductCategory;
  customerName?: string | null;
  recommendations: RecommendedProduct[];
  answeredFeatures: {
    feature: string;
    weight: number;
  }[];
  recommendedIndex?: string; // Recommended index for the prescription
  generatedAt: Date;
}

/**
 * Calculate lens pricing from database feature prices
 */
function calculateLensPricing(
  features: { id: string; name: string; code: string; price: number }[],
  baseLensPrice: number
): LensPricing {
  const featureAddons = features.map((feature) => ({
    name: feature.name,
    price: Math.round(feature.price), // Price from feature (no strength multiplier)
    featureId: feature.id,
  }));

  const totalLensPrice = baseLensPrice + featureAddons.reduce((sum, addon) => sum + addon.price, 0);

  return {
    baseLensPrice,
    featureAddons,
    totalLensPrice,
  };
}

/**
 * Check if this is customer's first purchase by looking at order history
 */
async function checkIsFirstPurchase(customerPhone: string | null, storeId: string): Promise<boolean> {
  if (!customerPhone) {
    // If no phone number, assume first purchase
    return true;
  }

  try {
    // Check if there are any completed orders for this customer phone in this store
    const existingOrders = await prisma.order.count({
      where: {
        customerPhone: customerPhone,
        storeId: storeId,
        status: {
          not: 'DRAFT', // Exclude draft orders
        },
      },
    });

    return existingOrders === 0;
  } catch (error) {
    console.error('Error checking purchase history:', error);
    // On error, assume first purchase to be safe
    return true;
  }
}

/**
 * Fetch and evaluate offers from database
 * Note: This function is currently not used - the code uses offerEngineService instead
 * Kept for backward compatibility or future use
 */
async function getApplicableOffers(
  organizationId: string,
  subtotal: number,
  matchScore: number,
  brand: string | null,
  category: ProductCategory,
  isFirstPurchase: boolean = true
): Promise<Offer[]> {
  // Fetch all active offers from database
  const dbOffers = await prisma.offer.findMany({
    where: {
      organizationId,
      isActive: true,
      validFrom: { lte: new Date() },
    },
    orderBy: {
      priority: 'desc',
    },
  });

  const applicableOffers: Offer[] = [];

  for (const offer of dbOffers) {
    let isApplicable = true;
    let discountAmount = 0;

    // Check conditions
    switch (offer.conditionType) {
      case 'MIN_PURCHASE':
        isApplicable = subtotal >= (offer.conditionValue || 0);
        break;
      case 'MATCH_SCORE':
        isApplicable = matchScore >= (offer.conditionValue || 0);
        break;
      case 'FIRST_PURCHASE':
        isApplicable = isFirstPurchase && subtotal >= (offer.conditionValue || 0);
        break;
      case 'BRAND_SPECIFIC':
        isApplicable = brand?.toLowerCase().includes(offer.conditionBrand?.toLowerCase() || '') || false;
        break;
      case 'CATEGORY':
        isApplicable = offer.conditionCategory === category;
        break;
      case 'NO_CONDITION':
        isApplicable = true;
        break;
    }

    // Calculate discount amount
    if (isApplicable) {
      switch (offer.type) {
        case OfferType.PERCENT_OFF:
          discountAmount = Math.round(subtotal * (offer.discountValue / 100));
          // Apply max discount cap if exists
          if (offer.maxDiscount && discountAmount > offer.maxDiscount) {
            discountAmount = offer.maxDiscount;
          }
          break;
        case OfferType.FLAT_OFF:
          discountAmount = offer.discountValue;
          break;
        case OfferType.FREE_LENS:
        case OfferType.BONUS_FREE_PRODUCT:
          discountAmount = 0; // Freebies don't reduce price
          break;
        default:
          discountAmount = 0;
      }
    }

    applicableOffers.push({
      id: offer.id,
      type: offer.type,
      code: offer.code,
      title: offer.title,
      description: offer.description,
      discountPercent: offer.type === OfferType.PERCENT_OFF ? offer.discountValue : undefined,
      discountAmount: discountAmount,
      minPurchase: offer.conditionType === 'MIN_PURCHASE' ? offer.conditionValue || undefined : undefined,
      isApplicable,
      priority: Number(offer.priority),
    });
  }

  // Sort by discount amount (best first) among applicable ones
  return applicableOffers.sort((a, b) => {
    if (a.isApplicable && !b.isApplicable) return -1;
    if (!a.isApplicable && b.isApplicable) return 1;
    return (b.discountAmount || 0) - (a.discountAmount || 0);
  });
}

/**
 * Calculate complete pricing breakdown with best offer applied
 */
function calculatePricingBreakdown(
  framePrice: number,
  lensPrice: LensPricing,
  offers: Offer[]
): PricingBreakdown {
  const subtotal = framePrice + lensPrice.totalLensPrice;
  
  // Find the best applicable offer (excluding freebies for price calculation)
  const bestOffer = offers.find(o => o.isApplicable && (o.discountAmount || 0) > 0 && o.type !== 'FREEBIE');
  
  let finalPrice = subtotal;
  let appliedOffer: PricingBreakdown['appliedOffer'] = undefined;

  if (bestOffer && bestOffer.discountAmount) {
    finalPrice = subtotal - bestOffer.discountAmount;
    appliedOffer = {
      name: bestOffer.title,
      code: bestOffer.code,
      discountAmount: bestOffer.discountAmount,
      discountPercent: bestOffer.discountPercent || 0,
    };
  }

  return {
    framePrice,
    lensPrice,
    subtotal,
    appliedOffer,
    finalPrice: Math.max(0, finalPrice),
    savings: subtotal - finalPrice,
  };
}

/**
 * Generate product recommendations based on session answers
 */
export async function generateRecommendations(
  sessionId: string
): Promise<RecommendationResult> {
  // 1. Get session
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // 2. Get store and organization separately (no relations in schema)
  const store = await prisma.store.findUnique({
    where: { id: session.storeId },
  });

  if (!store) {
    throw new Error('Store not found');
  }

  const organization = await prisma.organization.findUnique({
    where: { id: store.organizationId },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  const organizationId = store.organizationId;
  const baseLensPrice = organization.baseLensPrice || 0;

  // 3. Get all answers for this session
  const sessionAnswers = await prisma.sessionAnswer.findMany({
    where: { sessionId },
  });

  // 4. Get option IDs from answers
  const optionIds = sessionAnswers.map((a) => a.optionId);

  // Check if we have any selected options
  if (optionIds.length === 0) {
    throw new Error('No valid answers found for this session');
  }

  // 5. Get benefit scores directly from AnswerBenefit (simplified - no FeatureMapping needed)
  // Clean mapping: AnswerOption → Benefit → Points
  const answerBenefits = await (prisma.answerBenefit.findMany as any)({
    where: {
      answerId: { in: optionIds },
    },
    include: {
      benefit: true,
    },
  });

  // Get benefit codes from unified BenefitFeature model
  const benefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))];
  const benefitFeatures = await (prisma as any).benefitFeature.findMany({
    where: {
      id: { in: benefitIds },
      type: 'BENEFIT',
    },
  });
  const benefitIdToCodeMap = new Map(benefitFeatures.map((bf: any) => [bf.id, bf.code]));

  // Build benefit scores map directly from AnswerBenefit
  const benefitScoresMap = new Map<string, number>();
  answerBenefits.forEach((ab: any) => {
    if (ab.benefitId && typeof ab.points === 'number') {
      const code = benefitIdToCodeMap.get(ab.benefitId) || ab.benefit?.code;
      if (code) {
        const existing = benefitScoresMap.get(code) || 0;
        benefitScoresMap.set(code, existing + ab.points);
      }
    }
  });

  // 5. Get products for recommendation
  // NOTE: FRAME and SUNGLASS are manual-entry only, not SKU products
  // For EYEGLASSES/SUNGLASSES categories, we recommend LENS products, not frames
  // For CONTACT_LENSES, we use ContactLensProduct (not RetailProduct)
  // For ACCESSORIES, we use RetailProduct with type='ACCESSORY'
  
  let products: any[] = [];
  
  if (session.category === 'EYEGLASSES' || session.category === 'SUNGLASSES') {
    // For frame-based flows, recommend LENS products (not frames)
    // Frames are manually entered, so we don't query RetailProduct for them
    products = await (prisma as any).lensProduct.findMany({
      where: {
        isActive: true,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (products.length === 0) {
      throw new Error('No lens products found for recommendation');
    }
  } else if (session.category === 'CONTACT_LENSES') {
    // For contact lenses, use ContactLensProduct (not RetailProduct)
    // ContactLensProduct has power ranges and proper CL-specific fields
    products = await (prisma as any).contactLensProduct.findMany({
      where: {
        isActive: true,
      },
    });
    
    // Map ContactLensProduct to expected format
    products = products.map((cl: any) => ({
      ...cl,
      type: 'CONTACT_LENS',
      brand: { id: '', name: cl.brand },
      subBrand: null,
    }));
    
    if (products.length === 0) {
      throw new Error('No contact lens products found');
    }
  } else if (session.category === 'ACCESSORIES') {
    // For accessories, use RetailProduct
    products = await (prisma as any).retailProduct.findMany({
      where: {
        type: 'ACCESSORY',
        isActive: true,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        subBrand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (products.length === 0) {
      throw new Error('No accessory products found');
    }
  } else {
    throw new Error(`Unsupported category: ${session.category}`);
  }

  // Get product IDs
  const productIds = products.map((p: any) => p.id);

  // Get product features separately (no relation in schema)
  const productFeatures = await prisma.productFeature.findMany({
    where: {
      productId: { in: productIds },
    },
    include: {
      feature: true,
    },
  });

  // Get store products separately (no relation in schema)
  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      productId: { in: productIds },
      storeId: session.storeId,
    },
  });

  // Create maps for easy lookup
  const featuresByProductId = new Map<string, typeof productFeatures>();
  productFeatures.forEach((pf) => {
    if (!featuresByProductId.has(pf.productId)) {
      featuresByProductId.set(pf.productId, []);
    }
    featuresByProductId.get(pf.productId)!.push(pf);
  });

  const storeProductsByProductId = new Map<string, typeof storeProducts>();
  storeProducts.forEach((sp) => {
    if (!storeProductsByProductId.has(sp.productId)) {
      storeProductsByProductId.set(sp.productId, []);
    }
    storeProductsByProductId.get(sp.productId)!.push(sp);
  });

    // 6. Benefit scores are already calculated above from AnswerBenefit
    // No need for FeatureMapping or FeatureBenefit - using direct AnswerOption → Benefit mapping

    // Get product benefits for interconnected scoring
    // Query ProductBenefit - MongoDB ObjectId filtering
    const productBenefits = productIds.length > 0
      ? await (prisma.productBenefit.findMany as any)({
          where: { productId: { in: productIds } },
          include: {
            benefit: true,
          },
        })
      : [];

    const productBenefitsByProductId = new Map<string, any[]>();
    productBenefits.forEach((pb: any) => {
      const productId = String(pb.productId);
      if (!productBenefitsByProductId.has(productId)) {
        productBenefitsByProductId.set(productId, []);
      }
      productBenefitsByProductId.get(productId)!.push(pb);
    });

    // 7. Answer Boosts removed - all scoring now via Benefits only
    const selectedAnswerIds = new Set(optionIds.map(id => String(id)));

    // 8. Calculate match scores and pricing for each product (Backend Spec Algorithm)
    const scoredProducts = await Promise.all(products.map(async (product: any) => {
      // Get features and store products for this product from maps
      const productFeatureList = featuresByProductId.get(product.id) || [];
      const productStoreProducts = storeProductsByProductId.get(product.id) || [];
      const productBenefitList = productBenefitsByProductId.get(product.id) || [];

      // BACKEND SPEC: Benefit Component Calculation (Answer Boosts removed - all via Benefits)
      let benefitComponent = 0;
      for (const pb of productBenefitList) {
        if (pb.benefit && typeof pb.score === 'number') {
          const benefitCode = pb.benefit.code;
          const userBenefitScore = benefitScoresMap.get(benefitCode) || 0;
          // Multiply user benefit score by product benefit score (0-3 scale)
          benefitComponent += userBenefitScore * pb.score;
        }
      }

      // Final Score = benefitComponent only (simplified - no FeatureMapping needed)
      // Clean mapping: AnswerOption → Benefit → Points, then match with Product → Benefit → Score
      const finalScore = benefitComponent;

      // Calculate normalized score (0-100) based on benefit matching only
      // Max possible score = sum of all user benefit points * max product benefit score (3)
      const maxPossibleBenefitScore = Array.from(benefitScoresMap.values()).reduce((sum, score) => sum + score, 0) * 3;
      
      const normalizedScore = maxPossibleBenefitScore > 0
        ? Math.min(100, (finalScore / maxPossibleBenefitScore) * 100)
        : 0;

    // Get manually entered frame data from session (stored in customerEmail field as JSON)
    // NOTE: FRAME and SUNGLASS are manual-entry only, not SKU products
    const sessionFrameData = (session.customerEmail as any)?.frame || null;
    
    // Store info - for LENS products, get store product pricing
    const storeProduct = productStoreProducts[0];
    
    // Calculate lens pricing from DB feature prices
    const productFeatures = productFeatureList.map((pf) => ({
      id: pf.feature.id,
      name: pf.feature.name,
      key: (pf.feature as any).key || (pf.feature as any).code || '',
      price: 0, // Features no longer have prices - pricing is handled via lens product baseOfferPrice
    }));
    
    // For calculateLensPricing, map to include 'code' field
    const featuresForPricing = productFeatures.map(f => ({
      id: f.id,
      name: f.name,
      code: f.key, // Use key as code for pricing calculation
      price: f.price,
    }));
    const lensPrice = calculateLensPricing(featuresForPricing, baseLensPrice);
    
    // Get lens product base price (LensProduct has baseOfferPrice)
    const lensBasePrice = (product as any).baseOfferPrice || baseLensPrice;
    const finalLensPrice = storeProduct?.priceOverride || lensBasePrice || lensPrice.totalLensPrice;
    
    // Validate prices before calling offer engine
    if (finalLensPrice <= 0) {
      console.warn(`[generateRecommendations] Invalid lensPrice for product ${product.id}: ${finalLensPrice}`);
    }

    // Prepare inputs for new Offer Engine
    // For EYEGLASSES/SUNGLASSES: Use manually entered frame data from session
    // For CONTACT_LENSES/ACCESSORIES: No frame data
    let frameInput: FrameInput | null = null;
    
    if (session.category === 'EYEGLASSES' || session.category === 'SUNGLASSES') {
      if (sessionFrameData && sessionFrameData.brand && sessionFrameData.mrp > 0) {
        frameInput = {
          brand: sessionFrameData.brand,
          subCategory: sessionFrameData.subCategory || null,
          mrp: Math.max(0, sessionFrameData.mrp),
          frameType: sessionFrameData.frameType || undefined,
        };
      } else {
        // No frame data - lens-only flow
        frameInput = null;
      }
    }

    // For lens, use LensProduct data
    const lensInput: LensInput = {
      itCode: (product as any).itCode || 'UNKNOWN',
      price: Math.max(0, finalLensPrice),
      brandLine: (product as any).brandLine || 'STANDARD',
      yopoEligible: (product as any).yopoEligible || false,
    };

    // Validate required fields before calling offer engine
    if (!lensInput.itCode || lensInput.itCode.trim() === '') {
      console.warn(`[generateRecommendations] Missing itCode for lens product ${product.id}`);
      lensInput.itCode = `LENS-${product.id}`;
    }

    // Calculate offers using new Offer Engine
    const frameMrp = frameInput?.mrp || 0;
    const framePrice = storeProduct?.priceOverride || frameMrp;
    const discount = storeProduct?.priceOverride && storeProduct.priceOverride < frameMrp
      ? Math.round(((frameMrp - storeProduct.priceOverride) / frameMrp) * 100)
      : undefined;
    const productType = session.category as ProductCategory;
    
    let offerResult;
    try {
      offerResult = await offerEngineService.calculateOffers({
        frame: frameInput,
        lens: lensInput,
        customerCategory: (session.customerCategory as any) || null,
        couponCode: null, // Can be added later
        organizationId,
        mode: frameInput ? 'FRAME_AND_LENS' : 'ONLY_LENS',
      });
    } catch (offerError: any) {
      console.error(`[generateRecommendations] Offer engine error for product ${product.id}:`, offerError);
      // Use default pricing if offer engine fails
      offerResult = {
        frameMRP: frameMrp,
        lensPrice: finalLensPrice,
        baseTotal: frameMrp + finalLensPrice,
        effectiveBase: frameMrp + finalLensPrice,
        offersApplied: [],
        priceComponents: frameMrp > 0 
          ? [
              { label: 'Frame MRP', amount: frameMrp },
              { label: 'Lens Offer Price', amount: finalLensPrice },
            ]
          : [
              { label: 'Lens Offer Price', amount: finalLensPrice },
            ],
        finalPayable: frameMrp + finalLensPrice,
      };
    }

    // Convert offer engine result to old pricing breakdown format for compatibility
    const pricing: PricingBreakdown = {
      framePrice: offerResult.frameMRP,
      lensPrice: {
        baseLensPrice: baseLensPrice,
        featureAddons: productFeatures.map(f => ({
          name: f.name,
          price: f.price, // No strength multiplier (ProductFeature is just a join table)
          featureId: f.id,
        })),
        totalLensPrice: offerResult.lensPrice,
      },
      subtotal: offerResult.baseTotal,
      appliedOffer: offerResult.offersApplied.length > 0 ? {
        name: offerResult.offersApplied[0].description,
        code: offerResult.offersApplied[0].ruleCode,
        discountAmount: offerResult.offersApplied[0].savings,
        discountPercent: 0, // Calculate if needed
      } : undefined,
      finalPrice: offerResult.finalPayable,
      savings: offerResult.baseTotal - offerResult.finalPayable,
    };

    // Convert offer engine results to old Offer format for compatibility
    const offers: Offer[] = [
      ...offerResult.offersApplied.map(oa => ({
        id: oa.ruleCode,
        type: 'PRIMARY',
        code: oa.ruleCode,
        title: oa.description,
        description: oa.description,
        discountAmount: oa.savings,
        isApplicable: true,
        priority: 0,
      })),
      ...(offerResult.categoryDiscount ? [{
        id: offerResult.categoryDiscount.ruleCode,
        type: 'CATEGORY',
        code: offerResult.categoryDiscount.ruleCode,
        title: offerResult.categoryDiscount.description,
        description: offerResult.categoryDiscount.description,
        discountAmount: offerResult.categoryDiscount.savings,
        isApplicable: true,
        priority: 0,
      }] : []),
      ...(offerResult.couponDiscount ? [{
        id: offerResult.couponDiscount.ruleCode,
        type: 'COUPON',
        code: offerResult.couponDiscount.ruleCode,
        title: offerResult.couponDiscount.description,
        description: offerResult.couponDiscount.description,
        discountAmount: offerResult.couponDiscount.savings,
        isApplicable: true,
        priority: 0,
      }] : []),
    ];

    // BACKEND SPEC: Calculate matchPercent (normalized score as percentage)
    const matchPercent = Math.round(normalizedScore);

      // Calculate index recommendation for this product
    let indexRecommendation: any = undefined;
    let thicknessWarning = false;
    let indexInvalid = false;
    
    try {
      const indexService = new IndexRecommendationService();
      // Get prescription from customerEmail (JSON field) or prescriptionId
      const prescriptionData = (session.customerEmail as any)?.prescription || 
                               (session.prescriptionId && typeof session.prescriptionId === 'object' ? session.prescriptionId : null) ||
                               null;
      
      if (prescriptionData && (product as any).lensIndex) {
        const rxInput: RxInput = {
          rSph: prescriptionData.rSph || prescriptionData.odSphere || null,
          rCyl: prescriptionData.rCyl || prescriptionData.odCylinder || null,
          add: prescriptionData.add || prescriptionData.rAdd || prescriptionData.odAdd || prescriptionData.lAdd || prescriptionData.osAdd || null,
          lSph: prescriptionData.lSph || prescriptionData.osSphere || null,
          lCyl: prescriptionData.lCyl || prescriptionData.osCylinder || null,
        };
        
        const recommendedIndex = indexService.recommendIndex(rxInput, frameInput);
        const indexDelta = indexService.calculateIndexDelta(
          (product as any).lensIndex,
          recommendedIndex
        );
        
        const indexValidation = indexService.validateIndexSelection(
          (product as any).lensIndex,
          rxInput,
          frameInput
        );
        
        indexRecommendation = {
          recommendedIndex,
          indexDelta,
          validationMessage: indexValidation.message,
          isInvalid: !indexValidation.isValid,
          isWarning: indexValidation.isWarning,
        };
        
        thicknessWarning = indexDelta < 0 || indexValidation.isWarning;
        indexInvalid = !indexValidation.isValid;
      }
    } catch (error) {
      console.warn(`[generateRecommendations] Failed to calculate index recommendation for product ${product.id}:`, error);
    }

    // Reuse frameMrp from line 600 (already declared above)
    return {
      id: product.id,
      name: (product as any).name || '',
      sku: (product as any).sku || '',
      description: null,
      brand: (product as any).brand?.name || null,
      basePrice: frameMrp, // Use frameMrp from line 600
      imageUrl: null,
      category: productType as ProductCategory,
      matchScore: Math.round(normalizedScore * 10) / 10,
      matchPercent, // BACKEND SPEC: Match percentage (0-100)
      benefitComponent: Math.round(benefitComponent * 10) / 10, // BACKEND SPEC: Benefit component score
      finalScore: Math.round(finalScore * 10) / 10, // BACKEND SPEC: Final score (benefitComponent only)
      rank: 0,
      features: productFeatures,
      lensIndex: (product as any).lensIndex || undefined, // Add lensIndex to product
      indexRecommendation, // Add index recommendation data
      thicknessWarning, // Add thickness warning flag
      indexInvalid, // Add invalid index flag
      storeInfo: storeProduct ? {
        priceOverride: storeProduct.priceOverride,
        stockQuantity: Number(storeProduct.stockQuantity), // Convert BigInt to number
        isAvailable: storeProduct.isAvailable && Number(storeProduct.stockQuantity) > 0,
        finalPrice: framePrice,
        discount,
      } : {
        priceOverride: null,
        stockQuantity: 10,
        isAvailable: true,
        finalPrice: frameMrp,
        discount: undefined,
      },
      pricing,
      offers,
    };
  }));

  // 9. Sort by final score (or match score) - BACKEND SPEC: Sort by finalScore
  scoredProducts.sort((a, b) => {
    // Use finalScore if available, otherwise use matchScore
    const scoreA = a.finalScore ?? a.matchScore;
    const scoreB = b.finalScore ?? b.matchScore;
    return scoreB - scoreA;
  });
  scoredProducts.forEach((product, index) => {
    product.rank = index + 1;
  });

  // 8. Save recommendations to database
  const topRecommendations = scoredProducts.slice(0, 5);
  
  await prisma.sessionRecommendation.deleteMany({
    where: { sessionId },
  });

  const now = new Date();
  await Promise.all(
    topRecommendations.map((rec: any) =>
      prisma.sessionRecommendation.create({
        data: {
          sessionId,
          productId: rec.id,
          matchScore: rec.matchScore,
          rank: BigInt(rec.rank),
          createdAt: now, // Required field in schema
          isSelected: false, // Default value
        },
      })
    )
  );

  // 9. Format answered benefits for display (simplified - using AnswerBenefit directly)
  const answeredFeatures = Array.from(benefitScoresMap.entries()).map(([code, points]) => ({
    feature: code, // Using benefit code as identifier
    weight: points,
  }));

  // Ensure we have at least some recommendations
  if (topRecommendations.length === 0) {
    throw new Error('No products found matching the criteria');
  }

  // Calculate recommended index for the prescription
  let recommendedIndex: string | undefined;
  try {
    const indexService = new IndexRecommendationService();
    const sessionFrameData = (session.customerEmail as any)?.frame || null;
    // Get prescription from customerEmail (JSON field) or prescriptionId
    const prescriptionData = (session.customerEmail as any)?.prescription || 
                             (session.prescriptionId && typeof session.prescriptionId === 'object' ? session.prescriptionId : null) ||
                             null;
    
      if (prescriptionData) {
        const rxInput: RxInput = {
          rSph: prescriptionData.rSph || prescriptionData.odSphere || null,
          rCyl: prescriptionData.rCyl || prescriptionData.odCylinder || null,
          add: prescriptionData.add || prescriptionData.rAdd || prescriptionData.odAdd || prescriptionData.lAdd || prescriptionData.osAdd || null,
          lSph: prescriptionData.lSph || prescriptionData.osSphere || null,
          lCyl: prescriptionData.lCyl || prescriptionData.osCylinder || null,
        };
      
      const frameInput: FrameInput | null = sessionFrameData ? {
        frameType: sessionFrameData.frameType || null,
        brand: sessionFrameData.brand || undefined,
        subCategory: sessionFrameData.subCategory || null,
        mrp: sessionFrameData.mrp || undefined,
      } : null;
      
      recommendedIndex = indexService.recommendIndex(rxInput, frameInput);
    }
  } catch (error) {
    console.warn('[generateRecommendations] Failed to calculate recommended index:', error);
  }

  return {
    sessionId,
    category: session.category as ProductCategory,
    customerName: session.customerName || null,
    recommendations: topRecommendations,
    answeredFeatures: answeredFeatures.sort((a, b) => b.weight - a.weight),
    recommendedIndex,
    generatedAt: new Date(),
  };
}

/**
 * Get existing recommendations for a session
 */
export async function getSessionRecommendations(
  sessionId: string
): Promise<RecommendationResult | null> {
  // Get session
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return null;
  }

  // Get recommendations separately
  const sessionRecommendations = await prisma.sessionRecommendation.findMany({
    where: { sessionId },
    orderBy: {
      rank: 'asc',
    },
  });

  if (sessionRecommendations.length === 0) {
    return null;
  }

  // Get store and organization separately
  const store = await prisma.store.findUnique({
    where: { id: session.storeId },
  });

  if (!store) {
    return null;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: store.organizationId },
  });

  if (!organization) {
    return null;
  }

  const organizationId = store.organizationId;
  const baseLensPrice = organization.baseLensPrice || 0;

  // Get product IDs from recommendations
  const productIds = sessionRecommendations.map((rec) => rec.productId);

  // Get products separately (no relations in schema)
  // productIds can be from RetailProduct or LensProduct, try both
  const retailProducts = await (prisma as any).retailProduct.findMany({
    where: { id: { in: productIds } },
  });
  const lensProducts = await (prisma as any).lensProduct.findMany({
    where: { id: { in: productIds } },
  });
  
  // Combine and map to common format
  const products = [
    ...retailProducts.map((p: any) => ({
      id: p.id,
      name: p.name || '',
      sku: p.sku || '',
      description: null,
      brand: null,
      basePrice: p.mrp,
      imageUrl: null,
      category: p.type as ProductCategory,
    })),
    ...lensProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.itCode,
      description: null,
      brand: null,
      basePrice: p.baseOfferPrice,
      imageUrl: null,
      category: 'EYEGLASSES' as ProductCategory, // Lenses are part of eyeglasses
    })),
  ];

  // Get product features separately
  const productFeatures = await prisma.productFeature.findMany({
    where: {
      productId: { in: productIds },
    },
    include: {
      feature: true,
    },
  });

  // Get store products separately
  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      productId: { in: productIds },
      storeId: session.storeId,
    },
  });

  // Create maps for easy lookup
  const productMap = new Map(products.map((p) => [p.id, p]));
  const featuresByProductId = new Map<string, typeof productFeatures>();
  productFeatures.forEach((pf) => {
    if (!featuresByProductId.has(pf.productId)) {
      featuresByProductId.set(pf.productId, []);
    }
    featuresByProductId.get(pf.productId)!.push(pf);
  });

  const storeProductsByProductId = new Map<string, typeof storeProducts>();
  storeProducts.forEach((sp) => {
    if (!storeProductsByProductId.has(sp.productId)) {
      storeProductsByProductId.set(sp.productId, []);
    }
    storeProductsByProductId.get(sp.productId)!.push(sp);
  });

  // Create a map of productId to recommendation
  const recMap = new Map(sessionRecommendations.map((rec) => [rec.productId, rec]));

  const recommendations = await Promise.all(sessionRecommendations.map(async (rec) => {
    const product = productMap.get(rec.productId);
    if (!product) {
      return null;
    }

    // Get features and store products from maps
    const productFeatureList = featuresByProductId.get(product.id) || [];
    const productStoreProducts = storeProductsByProductId.get(product.id) || [];

    const storeProduct = productStoreProducts[0];
    const frameMrp = (product as any).mrp || 0;
    const framePrice = storeProduct?.priceOverride || frameMrp;
    const discount = storeProduct?.priceOverride && storeProduct.priceOverride < frameMrp
      ? Math.round(((frameMrp - storeProduct.priceOverride) / frameMrp) * 100)
      : undefined;

    // Calculate lens pricing from DB
    const productFeatures = productFeatureList.map((pf) => ({
      id: pf.feature.id,
      name: pf.feature.name,
      code: (pf.feature as any).code || (pf.feature as any).key || '',
      price: 0, // Features no longer have prices - pricing is handled via lens product baseOfferPrice
    }));
    
    const lensPrice = calculateLensPricing(productFeatures, baseLensPrice);
    
    // Validate prices before calling offer engine
    if (framePrice <= 0) {
      console.warn(`[getSessionRecommendations] Invalid framePrice for product ${product.id}: ${framePrice}`);
    }
    if (lensPrice.totalLensPrice <= 0) {
      console.warn(`[getSessionRecommendations] Invalid lensPrice for product ${product.id}: ${lensPrice.totalLensPrice}`);
    }

    // Prepare inputs for new Offer Engine
    const frameInput: FrameInput = {
      brand: product.brand || 'UNKNOWN',
      subCategory: null, // Product model doesn't have subCategory field
      mrp: Math.max(0, framePrice), // Ensure non-negative
      frameType: undefined,
    };

    const itCodeValue = product.itCode || product.sku;
    
    // Convert brandLine enum to string if needed
    const brandLineValue = product.brandLine 
      ? (typeof product.brandLine === 'string' ? product.brandLine : String(product.brandLine))
      : 'STANDARD';
    
    // Ensure itCode is a string
    const itCodeValueStr = String(itCodeValue || product.sku);
    
    const lensInput: LensInput = {
      itCode: itCodeValueStr, // Use string version
      price: Math.max(0, lensPrice.totalLensPrice), // Ensure non-negative
      brandLine: brandLineValue,
      yopoEligible: product.yopoEligible || false,
    };

    // Validate required fields before calling offer engine
    if (!lensInput.itCode || lensInput.itCode.trim() === '') {
      console.warn(`[getSessionRecommendations] Missing itCode for product ${product.id}, using SKU: ${product.sku}`);
      lensInput.itCode = String(product.sku);
    }

    // Calculate offers using new Offer Engine
    let offerResult;
    try {
      offerResult = await offerEngineService.calculateOffers({
        frame: frameInput,
        lens: lensInput,
        customerCategory: (session.customerCategory as any) || null,
        couponCode: null,
        organizationId,
      });
    } catch (offerError: any) {
      console.error(`[getSessionRecommendations] Offer engine error for product ${product.id}:`, offerError);
      // Use default pricing if offer engine fails
      offerResult = {
        frameMRP: framePrice,
        lensPrice: lensPrice.totalLensPrice,
        baseTotal: framePrice + lensPrice.totalLensPrice,
        effectiveBase: framePrice + lensPrice.totalLensPrice,
        offersApplied: [],
        priceComponents: [
          { label: 'Frame MRP', amount: framePrice },
          { label: 'Lens Offer Price', amount: lensPrice.totalLensPrice },
        ],
        finalPayable: framePrice + lensPrice.totalLensPrice,
      };
    }

    // Convert to old format
    const pricing: PricingBreakdown = {
      framePrice: offerResult.frameMRP,
      lensPrice: {
        baseLensPrice: baseLensPrice,
        featureAddons: productFeatures.map(f => ({
          name: f.name,
          price: f.price, // No strength multiplier (ProductFeature is just a join table)
          featureId: f.id,
        })),
        totalLensPrice: offerResult.lensPrice,
      },
      subtotal: offerResult.baseTotal,
      appliedOffer: offerResult.offersApplied.length > 0 ? {
        name: offerResult.offersApplied[0].description,
        code: offerResult.offersApplied[0].ruleCode,
        discountAmount: offerResult.offersApplied[0].savings,
        discountPercent: 0,
      } : undefined,
      finalPrice: offerResult.finalPayable,
      savings: offerResult.baseTotal - offerResult.finalPayable,
    };

    const offers: Offer[] = [
      ...offerResult.offersApplied.map(oa => ({
        id: oa.ruleCode,
        type: 'PRIMARY',
        code: oa.ruleCode,
        title: oa.description,
        description: oa.description,
        discountAmount: oa.savings,
        isApplicable: true,
        priority: 0,
      })),
      ...(offerResult.categoryDiscount ? [{
        id: offerResult.categoryDiscount.ruleCode,
        type: 'CATEGORY',
        code: offerResult.categoryDiscount.ruleCode,
        title: offerResult.categoryDiscount.description,
        description: offerResult.categoryDiscount.description,
        discountAmount: offerResult.categoryDiscount.savings,
        isApplicable: true,
        priority: 0,
      }] : []),
      ...(offerResult.couponDiscount ? [{
        id: offerResult.couponDiscount.ruleCode,
        type: 'COUPON',
        code: offerResult.couponDiscount.ruleCode,
        title: offerResult.couponDiscount.description,
        description: offerResult.couponDiscount.description,
        discountAmount: offerResult.couponDiscount.savings,
        isApplicable: true,
        priority: 0,
      }] : []),
    ];

    // Determine category from product type (reuse frameMrp from line 957)
    const productCategory = (product as any).type || 'FRAME';
    const categoryMap: Record<string, ProductCategory> = {
      'FRAME': 'EYEGLASSES',
      'SUNGLASS': 'SUNGLASSES',
      'CONTACT_LENS': 'CONTACT_LENSES',
      'ACCESSORY': 'ACCESSORIES',
    };
    const mappedCategory = categoryMap[productCategory] || 'EYEGLASSES';
    
    return {
      id: product.id,
      name: (product as any).name || '',
      sku: (product as any).sku || '',
      description: null,
      brand: (product as any).brand?.name || null,
      basePrice: frameMrp, // Use frameMrp from line 957
      imageUrl: null,
      category: mappedCategory,
      matchScore: rec.matchScore,
      rank: Number(rec.rank),
      features: productFeatures,
      storeInfo: storeProduct ? {
        priceOverride: storeProduct.priceOverride,
        stockQuantity: Number(storeProduct.stockQuantity), // Convert BigInt to number
        isAvailable: storeProduct.isAvailable && Number(storeProduct.stockQuantity) > 0,
        finalPrice: framePrice,
        discount,
      } : {
        priceOverride: null,
        stockQuantity: 10,
        isAvailable: true,
        finalPrice: frameMrp,
        discount: undefined,
      },
      pricing,
      offers,
    };
  }));

  // Filter out null values (products that weren't found)
  const validRecommendations = recommendations.filter((rec): rec is NonNullable<typeof rec> => rec !== null);

  // Get answered benefits for display (simplified - no FeatureMapping needed)
  const sessionAnswers = await prisma.sessionAnswer.findMany({
    where: { sessionId },
  });

  const optionIds = sessionAnswers.map((a) => a.optionId);
  const answerBenefits = await (prisma.answerBenefit.findMany as any)({
    where: {
      answerId: { in: optionIds },
    },
    include: {
      benefit: true,
    },
  });

  // Build answered benefits list (for display purposes)
  const answeredBenefitsMap = new Map<string, number>();
  answerBenefits.forEach((ab: any) => {
    if (ab.benefit && typeof ab.points === 'number') {
      const code = ab.benefit.code;
      const existing = answeredBenefitsMap.get(code) || 0;
      answeredBenefitsMap.set(code, existing + ab.points);
    }
  });

  const answeredFeatures = Array.from(answeredBenefitsMap.entries()).map(([code, points]) => ({
    feature: code, // Using benefit code as identifier
    weight: points,
  }));

  // Ensure we have valid recommendations
  if (validRecommendations.length === 0) {
    return null; // Return null to trigger regeneration
  }

  return {
    sessionId,
    category: session.category as ProductCategory,
    customerName: session.customerName || null,
    recommendations: validRecommendations as any,
    answeredFeatures: answeredFeatures.sort((a, b) => b.weight - a.weight),
    generatedAt: sessionRecommendations[0]?.createdAt || new Date(),
  };
}
