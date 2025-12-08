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
  rank: number;
  features: {
    id: string;
    name: string;
    key: string;
    price: number;
    strength: number;
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
  features: { id: string; name: string; key: string; price: number; strength: number }[],
  baseLensPrice: number
): LensPricing {
  const featureAddons = features.map((feature) => ({
    name: feature.name,
    price: Math.round(feature.price * feature.strength), // Price scales with strength
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

  // 5. Get all active products in this category for this organization
  const products = await prisma.product.findMany({
    where: {
      organizationId,
      category: session.category,
      isActive: true,
    },
  });

  if (products.length === 0) {
    throw new Error('No products found for this category');
  }

  // Get product IDs
  const productIds = products.map((p) => p.id);

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

  // 6. Calculate match scores and pricing for each product
  const scoredProducts = await Promise.all(products.map(async (product) => {
    // Get features and store products for this product from maps
    const productFeatureList = featuresByProductId.get(product.id) || [];
    const productStoreProducts = storeProductsByProductId.get(product.id) || [];

    let matchScore = 0;
    let maxPossibleScore = 0;

    // Calculate how well product features match customer preferences
    featureWeights.forEach(({ feature, totalWeight }) => {
      maxPossibleScore += totalWeight;

      const productFeature = productFeatureList.find(
        (pf) => pf.featureId === feature.id
      );

      if (productFeature) {
        matchScore += totalWeight * productFeature.strength;
      }
    });

    // Normalize to percentage (0-100)
    const normalizedScore = maxPossibleScore > 0 
      ? Math.min(100, (matchScore / maxPossibleScore) * 100) 
      : 50;

    // Store info
    const storeProduct = productStoreProducts[0];
    const framePrice = storeProduct?.priceOverride || product.basePrice;
    const discount = storeProduct?.priceOverride && storeProduct.priceOverride < product.basePrice
      ? Math.round(((product.basePrice - storeProduct.priceOverride) / product.basePrice) * 100)
      : undefined;

    // Calculate lens pricing from DB feature prices
    const productFeatures = productFeatureList.map((pf) => ({
      id: pf.feature.id,
      name: pf.feature.name,
      key: pf.feature.key,
      price: pf.feature.price || 0, // Price from database!
      strength: pf.strength,
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
    const frameInput: FrameInput = {
      brand: product.brand || 'UNKNOWN',
      subCategory: null, // Product model doesn't have subCategory field
      mrp: Math.max(0, framePrice), // Ensure non-negative
      frameType: undefined, // Can be added to Product model if needed
    };

    // For lens, we need to determine IT code and brand line
    // Using SKU as IT code for now, and default brand line
    const itCodeValue = product.itCode || product.sku;
    
    // Convert brandLine enum to string if needed
    const brandLineValue = product.brandLine 
      ? (typeof product.brandLine === 'string' ? product.brandLine : String(product.brandLine))
      : 'STANDARD';
    
    const lensInput: LensInput = {
      itCode: itCodeValue || product.sku, // Fallback to SKU if itCode is empty
      price: Math.max(0, lensPrice.totalLensPrice), // Ensure non-negative
      brandLine: brandLineValue,
      yopoEligible: product.yopoEligible || false,
    };

    // Validate required fields before calling offer engine
    if (!lensInput.itCode || lensInput.itCode.trim() === '') {
      console.warn(`[generateRecommendations] Missing itCode for product ${product.id}, using SKU: ${product.sku}`);
      lensInput.itCode = product.sku;
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
          price: f.price * f.strength,
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

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      brand: product.brand,
      basePrice: product.basePrice,
      imageUrl: product.imageUrl,
      category: product.category as ProductCategory,
      matchScore: Math.round(normalizedScore * 10) / 10,
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
        finalPrice: product.basePrice,
        discount: undefined,
      },
      pricing,
      offers,
    };
  }));

  // 7. Sort by match score (descending) and assign ranks
  scoredProducts.sort((a, b) => b.matchScore - a.matchScore);
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
    topRecommendations.map((rec) =>
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
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

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
    const framePrice = storeProduct?.priceOverride || product.basePrice;
    const discount = storeProduct?.priceOverride && storeProduct.priceOverride < product.basePrice
      ? Math.round(((product.basePrice - storeProduct.priceOverride) / product.basePrice) * 100)
      : undefined;

    // Calculate lens pricing from DB
    const productFeatures = productFeatureList.map((pf) => ({
      id: pf.feature.id,
      name: pf.feature.name,
      key: pf.feature.key,
      price: pf.feature.price || 0,
      strength: pf.strength,
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
    
    const lensInput: LensInput = {
      itCode: itCodeValue || product.sku, // Fallback to SKU if itCode is empty
      price: Math.max(0, lensPrice.totalLensPrice), // Ensure non-negative
      brandLine: brandLineValue,
      yopoEligible: product.yopoEligible || false,
    };

    // Validate required fields before calling offer engine
    if (!lensInput.itCode || lensInput.itCode.trim() === '') {
      console.warn(`[getSessionRecommendations] Missing itCode for product ${product.id}, using SKU: ${product.sku}`);
      lensInput.itCode = product.sku;
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
          price: f.price * f.strength,
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

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      brand: product.brand,
      basePrice: product.basePrice,
      imageUrl: product.imageUrl,
      category: product.category as ProductCategory,
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
        finalPrice: product.basePrice,
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
