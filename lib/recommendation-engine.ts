/**
 * LensTrack Recommendation Engine
 * 
 * Uses weighted feature matching to recommend products based on customer answers.
 * ALL PRICING AND OFFERS ARE FETCHED FROM DATABASE - NO HARDCODING!
 */

import { prisma } from '@/lib/prisma';
import { OfferType } from '@prisma/client';

type ProductCategory = 'EYEGLASSES' | 'SUNGLASSES' | 'CONTACT_LENSES' | 'ACCESSORIES';
type OfferCondition = 'MIN_PURCHASE' | 'MATCH_SCORE' | 'FIRST_PURCHASE' | 'BRAND_SPECIFIC' | 'CATEGORY' | 'NO_CONDITION';
import { offerEngineService } from '@/services/offer-engine.service';
import { FrameInput, LensInput } from '@/types/offer-engine';

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
  generatedAt: Date;
}

/**
 * Calculate lens pricing from database feature prices
 */
function calculateLensPricing(
  features: { id: string; name: string; key: string; price: number }[],
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

  // 4. Get option IDs and question IDs from answers
  const optionIds = sessionAnswers.map((a) => a.optionId);
  const questionIds = [...new Set(sessionAnswers.map((a) => a.questionId))];

  // 5. Get options with their keys
  const options = await prisma.answerOption.findMany({
    where: { id: { in: optionIds } },
    select: { id: true, key: true, questionId: true },
  });

  // 6. Create a map of optionId to optionKey
  const optionMap = new Map(options.map((opt) => [opt.id, opt.key]));

  // 7. Get all selected option keys
  const selectedOptions = sessionAnswers.map((answer) => ({
    questionId: answer.questionId,
    optionKey: optionMap.get(answer.optionId) || '',
  })).filter((opt) => opt.optionKey !== '');

  // Check if we have any selected options
  if (selectedOptions.length === 0) {
    throw new Error('No valid answers found for this session');
  }

  // 3. Get feature mappings for selected options
  const featureMappings = await prisma.featureMapping.findMany({
    where: {
      OR: selectedOptions.map((opt) => ({
        questionId: opt.questionId,
        optionKey: opt.optionKey,
      })),
    },
    include: {
      feature: true, // Include feature with price!
    },
  });

  // 4. Calculate feature weights (aggregate by feature)
  const featureWeights: Map<string, { feature: any; totalWeight: number }> = new Map();

  featureMappings.forEach((mapping) => {
    const existing = featureWeights.get(mapping.featureId);
    if (existing) {
      existing.totalWeight += mapping.weight;
    } else {
      featureWeights.set(mapping.featureId, {
        feature: mapping.feature,
        totalWeight: mapping.weight,
      });
    }
  });

  // 5. Get all active retail products (frames) for this category
  // Map session.category to RetailProductType
  // EYEGLASSES -> FRAME, SUNGLASSES -> SUNGLASS, etc.
  const categoryMap: Record<string, 'FRAME' | 'SUNGLASS' | 'CONTACT_LENS' | 'ACCESSORY'> = {
    'EYEGLASSES': 'FRAME',
    'SUNGLASSES': 'SUNGLASS',
    'CONTACT_LENSES': 'CONTACT_LENS',
    'ACCESSORIES': 'ACCESSORY',
  };
  
  const productType = (categoryMap[session.category] || 'FRAME') as 'FRAME' | 'SUNGLASS' | 'CONTACT_LENS' | 'ACCESSORY';
  
  const products = await (prisma as any).retailProduct.findMany({
    where: {
      type: productType,
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
    throw new Error('No products found for this category');
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

    // 6. Get feature-benefit mappings for interconnected scoring
    const featureIds = Array.from(featureWeights.keys());
    // FeatureBenefit model - use type assertion if needed
    const featureBenefitMappings = featureIds.length > 0
      ? await (prisma as any).featureBenefit?.findMany({
          where: {
            featureId: { in: featureIds },
          },
          include: {
            benefit: true,
          },
        }) || []
      : [];

    // Get benefit scores from answers for interconnected scoring
    const answerIds = sessionAnswers.map((a) => a.optionId);
    // Query AnswerBenefit - MongoDB ObjectId filtering
    const answerBenefits = answerIds.length > 0
      ? await (prisma.answerBenefit.findMany as any)({
          where: {
            answerId: { in: answerIds },
          },
          include: {
            benefit: true,
          },
        })
      : [];

    // Build benefit scores map
    const benefitScoresMap = new Map<string, number>();
    answerBenefits.forEach((ab: any) => {
      if (ab.benefit && typeof ab.points === 'number') {
        const code = ab.benefit.code;
        const existing = benefitScoresMap.get(code) || 0;
        benefitScoresMap.set(code, existing + ab.points);
      }
    });

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
    const selectedAnswerIds = new Set(answerIds.map(id => String(id)));

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

      // Final Score = benefitComponent only (Answer Boosts removed)
      const finalScore = benefitComponent;

      // Feature-based score (for backward compatibility and hybrid scoring)
      let featureScore = 0;
      let maxFeatureScore = 0;

      featureWeights.forEach(({ feature, totalWeight }) => {
        maxFeatureScore += totalWeight;

        const productFeature = productFeatureList.find(
          (pf) => pf.featureId === feature.id
        );

        if (productFeature) {
          // ProductFeature is now just a join table - presence means feature is enabled (strength = 1.0)
          featureScore += totalWeight * 1.0;
        }
      });

      const normalizedFeatureScore = maxFeatureScore > 0 
        ? Math.min(100, (featureScore / maxFeatureScore) * 100) 
        : 50;

      // Interconnected score (Feature → Benefit) - Enhanced scoring
      let interconnectedScore = 0;
      let maxInterconnectedScore = 0;

      featureWeights.forEach(({ feature, totalWeight }) => {
        const featureMappings = featureBenefitMappings.filter(
          (fb: any) => String(fb.featureId) === String(feature.id)
        );

        featureMappings.forEach((mapping: any) => {
          const benefitCode = mapping.benefit.code;
          const benefitPoints = benefitScoresMap.get(benefitCode) || 0;

          if (benefitPoints > 0) {
            const productBenefit = productBenefitList.find(
              (pb: any) => pb.benefit.code === benefitCode
            );

            if (productBenefit) {
              interconnectedScore += totalWeight * mapping.weight * productBenefit.score;
            }
          }

          maxInterconnectedScore += Math.abs(totalWeight) * mapping.weight * 3; // Max strength 3
        });
      });

      const normalizedInterconnectedScore = maxInterconnectedScore > 0
        ? Math.min(100, (interconnectedScore / maxInterconnectedScore) * 100)
        : 0;

      // BACKEND SPEC: Use benefit-based scoring as primary, with feature-based as fallback
      // If benefit scores exist, use them; otherwise fall back to feature-based
      let normalizedScore: number;
      if (benefitScoresMap.size > 0 || productBenefitList.length > 0) {
        // Calculate max possible benefit score for normalization
        const maxPossibleBenefitScore = Array.from(benefitScoresMap.values()).reduce((sum, score) => sum + score, 0) * 3; // Max product benefit score is 3
        
        // Normalize to 0-100
        normalizedScore = maxPossibleBenefitScore > 0
          ? Math.min(100, (finalScore / maxPossibleBenefitScore) * 100)
          : 0;
        
        // Hybrid approach: 70% benefit-based + 20% feature + 10% interconnected
        if (normalizedFeatureScore > 0 || normalizedInterconnectedScore > 0) {
          normalizedScore = normalizedScore * 0.7 + normalizedFeatureScore * 0.2 + normalizedInterconnectedScore * 0.1;
        }
      } else {
        // Fallback to feature-based if no benefits
        normalizedScore = normalizedFeatureScore * 0.8 + normalizedInterconnectedScore * 0.2;
      }

    // Store info
    const storeProduct = productStoreProducts[0];
    const frameMrp = (product as any).mrp || 0;
    const framePrice = storeProduct?.priceOverride || frameMrp;
    const discount = storeProduct?.priceOverride && storeProduct.priceOverride < frameMrp
      ? Math.round(((frameMrp - storeProduct.priceOverride) / frameMrp) * 100)
      : undefined;

    // Calculate lens pricing from DB feature prices
    const productFeatures = productFeatureList.map((pf) => ({
      id: pf.feature.id,
      name: pf.feature.name,
      key: pf.feature.key,
      price: pf.feature.price || 0, // Price from database! (no strength multiplier)
    }));
    
    const lensPrice = calculateLensPricing(productFeatures, baseLensPrice);
    
    // Validate prices before calling offer engine
    if (framePrice <= 0) {
      console.warn(`[generateRecommendations] Invalid framePrice for product ${product.id}: ${framePrice}`);
    }
    if (lensPrice.totalLensPrice <= 0) {
      console.warn(`[generateRecommendations] Invalid lensPrice for product ${product.id}: ${lensPrice.totalLensPrice}`);
    }

    // Prepare inputs for new Offer Engine
    // RetailProduct has: brand (via relation), mrp, type, name, sku
    const frameInput: FrameInput = {
      brand: (product as any).brand?.name || 'UNKNOWN', // Get brand name from relation
      subCategory: (product as any).subBrand?.name || null, // Get subBrand name from relation
      mrp: Math.max(0, framePrice), // Ensure non-negative
      frameType: undefined, // Can be added to RetailProduct model if needed
    };

    // For lens, use default values since RetailProduct doesn't have lens-specific fields
    // These will be set when a lens is actually selected
    const lensInput: LensInput = {
      itCode: 'DEFAULT', // Default IT code - will be replaced when lens is selected
      price: Math.max(0, lensPrice.totalLensPrice), // Ensure non-negative
      brandLine: 'STANDARD', // Default brand line
      yopoEligible: false, // Default value
    };

    // Validate required fields before calling offer engine
    if (!lensInput.itCode || lensInput.itCode.trim() === '') {
      console.warn(`[generateRecommendations] Missing itCode for product ${product.id}, using SKU: ${product.sku}`);
      lensInput.itCode = String(product.sku);
    }

    // Calculate offers using new Offer Engine
    let offerResult;
    try {
      offerResult = await offerEngineService.calculateOffers({
        frame: frameInput,
        lens: lensInput,
        customerCategory: (session.customerCategory as any) || null,
        couponCode: null, // Can be added later
        organizationId,
      });
    } catch (offerError: any) {
      console.error(`[generateRecommendations] Offer engine error for product ${product.id}:`, offerError);
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

  // 9. Format answered features for display
  const answeredFeatures = Array.from(featureWeights.values()).map(({ feature, totalWeight }) => ({
    feature: feature.name,
    weight: totalWeight,
  }));

  // Ensure we have at least some recommendations
  if (topRecommendations.length === 0) {
    throw new Error('No products found matching the criteria');
  }

  return {
    sessionId,
    category: session.category as ProductCategory,
    customerName: session.customerName || null,
    recommendations: topRecommendations,
    answeredFeatures: answeredFeatures.sort((a, b) => b.weight - a.weight),
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
      key: pf.feature.key,
      price: pf.feature.price || 0, // No strength multiplier (ProductFeature is just a join table)
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

  // Get answered features for display (optional - can be empty for cached recommendations)
  const sessionAnswers = await prisma.sessionAnswer.findMany({
    where: { sessionId },
  });

  const optionIds = sessionAnswers.map((a) => a.optionId);
  const options = await prisma.answerOption.findMany({
    where: { id: { in: optionIds } },
    select: { id: true, key: true },
  });

  const optionMap = new Map(options.map((opt) => [opt.id, opt.key]));
  const selectedOptions = sessionAnswers.map((answer) => ({
    questionId: answer.questionId,
    optionKey: optionMap.get(answer.optionId) || '',
  })).filter((opt) => opt.optionKey !== '');

  const featureMappings = await prisma.featureMapping.findMany({
    where: {
      OR: selectedOptions.map((opt) => ({
        questionId: opt.questionId,
        optionKey: opt.optionKey,
      })),
    },
    include: {
      feature: true,
    },
  });

  const featureWeights: Map<string, { feature: any; totalWeight: number }> = new Map();
  featureMappings.forEach((mapping) => {
    const existing = featureWeights.get(mapping.featureId);
    if (existing) {
      existing.totalWeight += mapping.weight;
    } else {
      featureWeights.set(mapping.featureId, {
        feature: mapping.feature,
        totalWeight: mapping.weight,
      });
    }
  });

  const answeredFeatures = Array.from(featureWeights.values()).map(({ feature, totalWeight }) => ({
    feature: feature.name,
    weight: totalWeight,
  }));

  // Ensure we have valid recommendations
  if (validRecommendations.length === 0) {
    return null; // Return null to trigger regeneration
  }

  return {
    sessionId,
    category: session.category as ProductCategory,
    customerName: session.customerName || null,
    recommendations: validRecommendations,
    answeredFeatures: answeredFeatures.sort((a, b) => b.weight - a.weight),
    generatedAt: sessionRecommendations[0]?.createdAt || new Date(),
  };
}
