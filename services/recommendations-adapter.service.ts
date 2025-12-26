/**
 * Recommendations Adapter Service
 * Bridges BenefitRecommendationService with frontend-expected format
 * Includes 4-lens output logic and band pricing
 */

import { BenefitRecommendationService, RecommendedProduct } from './benefit-recommendation.service';
import { bandPricingService } from './band-pricing.service';
import { offerEngineService } from './offer-engine.service';
import { prisma } from '@/lib/prisma';
import { RxInput } from './rx-validation.service';
import { FrameInput } from './index-recommendation.service';
import { cacheService, CACHE_TTL, CacheService } from '@/lib/cache.service';

type VisionType = 'SINGLE_VISION' | 'PROGRESSIVE' | 'BIFOCAL' | 'ANTI_FATIGUE' | 'MYOPIA_CONTROL';

export interface FourLensOutput {
  bestMatch: any;
  premium: any;
  value: any;
  antiWalkout: any;
}

export interface RecommendationAdapterResult {
  sessionId: string;
  category: string;
  customerName?: string | null;
  recommendations: any[];
  answeredFeatures: { feature: string; weight: number }[];
  generatedAt: Date;
  recommendedIndex?: string;
  benefitScores: Record<string, number>;
  fourLensOutput?: FourLensOutput;
}

export class RecommendationsAdapterService {
  private benefitService: BenefitRecommendationService;

  constructor() {
    this.benefitService = new BenefitRecommendationService();
  }

  /**
   * Generate recommendations using BenefitRecommendationService and format for frontend
   */
  async generateRecommendations(sessionId: string): Promise<RecommendationAdapterResult> {
    // OPTIMIZATION: Check cache first
    const cacheKey = CacheService.generateKey('recommendations', sessionId);
    const cached = cacheService.get<RecommendationAdapterResult>(cacheKey);
    if (cached) {
      console.log('[RecommendationsAdapter] Cache hit for session:', sessionId);
      return cached;
    }

    // Get session data
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    // Get session answers
    const sessionAnswers = await prisma.sessionAnswer.findMany({
      where: { sessionId },
    });

    if (sessionAnswers.length === 0) {
      throw new Error('No answers found for session');
    }

    // Convert session answers to AnswerSelection format
    const answerMap = new Map<string, string[]>();
    sessionAnswers.forEach((sa) => {
      const questionId = sa.questionId;
      if (!answerMap.has(questionId)) {
        answerMap.set(questionId, []);
      }
      answerMap.get(questionId)!.push(sa.optionId);
    });

    const answerSelections = Array.from(answerMap.entries()).map(([questionId, answerIds]) => ({
      questionId,
      answerIds,
    }));

    // Get prescription from session (stored in customerEmail field as JSON)
    const sessionData = session.customerEmail as any;
    const prescription: RxInput = {
      rSph: sessionData?.prescription?.rSph || sessionData?.prescription?.odSphere || null,
      rCyl: sessionData?.prescription?.rCyl || sessionData?.prescription?.odCylinder || null,
      lSph: sessionData?.prescription?.lSph || sessionData?.prescription?.osSphere || null,
      lCyl: sessionData?.prescription?.lCyl || sessionData?.prescription?.osCylinder || null,
      add: sessionData?.prescription?.rAdd || sessionData?.prescription?.odAdd || sessionData?.prescription?.lAdd || sessionData?.prescription?.osAdd || null,
    };

    // Get frame data
    const frameData = sessionData?.frame;
    const frame: FrameInput | null = frameData
      ? {
          brand: frameData.brand,
          subCategory: frameData.subCategory || null,
          mrp: frameData.mrp || 0,
          frameType: frameData.frameType || undefined,
        }
      : null;

    // Call BenefitRecommendationService
    // OPTIMIZATION: Removed excessive console.log statements for better performance
    
    const recommendationResult = await this.benefitService.recommend({
      prescription,
      frame,
      answers: answerSelections,
      visionTypeOverride: sessionData?.visionType || null,
      budgetFilter: sessionData?.budgetFilter || null,
      category: session.category as any,
      organizationId: store.organizationId,
    });
    
    // OPTIMIZATION: Batch fetch all products at once instead of N+1 queries
    const itCodes = recommendationResult.products.map(p => p.itCode);
    const allProducts = await (prisma as any).lensProduct.findMany({
      where: { itCode: { in: itCodes } },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
        benefits: true,
        bandPricing: {
          where: { isActive: true },
        },
        rxRanges: true,
      },
    });

    // Create a map for O(1) lookup
    const productMap = new Map(allProducts.map((p: any) => [p.itCode, p]));

    // Batch fetch all store products at once
    const productIds = allProducts.map((p: any) => p.id);
    const allStoreProducts = await prisma.storeProduct.findMany({
      where: {
        productId: { in: productIds },
        storeId: session.storeId,
      },
    });
    const storeProductMap = new Map(allStoreProducts.map(sp => [sp.productId, sp]));

    // Batch calculate band pricing for all products
    const bandPricingPromises = allProducts.map((p: any) =>
      bandPricingService.calculateBandPricing(p.id, prescription)
    );
    const bandPricingResults = await Promise.all(bandPricingPromises);
    const bandPricingMap = new Map(
      allProducts.map((p: any, idx: number) => [p.id, bandPricingResults[idx]])
    );

    // OPTIMIZATION: Batch fetch all benefits at once for all products
    const allBenefitIds = new Set<string>();
    allProducts.forEach((p: any) => {
      if (p.benefits) {
        p.benefits.forEach((pb: any) => {
          if (pb.benefitId) {
            allBenefitIds.add(String(pb.benefitId));
          }
        });
      }
    });
    
    const allBenefitsData = allBenefitIds.size > 0
      ? await (prisma as any).benefitFeature.findMany({
          where: { 
            id: { in: Array.from(allBenefitIds) },
            type: 'BENEFIT',
          },
        })
      : [];
    const benefitMap = new Map(allBenefitsData.map((b: any) => [b.id, b]));

    const enrichedRecommendations = await Promise.all(
      recommendationResult.products.map(async (product) => {
        // Get full product from map (O(1) lookup)
        const fullProduct = productMap.get(product.itCode) as any;

        if (!fullProduct) {
          console.warn(`[RecommendationsAdapter] Product not found in DB for itCode: ${product.itCode}`);
          return null;
        }

        // OPTIMIZATION: Removed debug logging for better performance

        // Get band pricing from map
        const bandPricing = (bandPricingMap.get(fullProduct.id) || { bandExtra: 0 }) as any;

        // Calculate final price with band pricing
        const basePrice = product.offerPrice || fullProduct.baseOfferPrice || 0;
        const finalLensPrice = basePrice + bandPricing.bandExtra;

        // Get store product pricing from map
        const storeProduct = storeProductMap.get(fullProduct.id);
        const finalPrice = storeProduct?.priceOverride || finalLensPrice;

        // Calculate offers (simplified - full offer calculation happens later)
        const offers: any[] = [];

        // Format features - feature is already included in the query
        const features = fullProduct.features?.map((pf: any) => {
          // Feature is already included via the query, so use pf.feature directly
          const feature = pf.feature;
          if (!feature || typeof feature !== 'object' || !('id' in feature)) {
            return null;
          }
          return {
            id: String(feature.id),
            name: feature.name || 'Feature',
            key: feature.code || '',
            iconUrl: feature.iconUrl || null, // Include iconUrl from feature
            strength: 5, // Default strength for display (0-10 scale, 5 = medium)
            price: 0, // Features don't have prices anymore
          };
        }).filter((f: any) => f !== null) || [];

        // Format benefits using pre-fetched benefit map
        const benefits = fullProduct.benefits
          ?.map((pb: any) => {
            const benefit = benefitMap.get(pb.benefitId);
            if (!benefit || typeof benefit !== 'object' || !('id' in benefit)) {
              console.warn(`[RecommendationsAdapter] Benefit not found for benefitId: ${pb.benefitId}`);
              return null;
            }
            return {
              id: (benefit as any).id,
              name: (benefit as any).name || 'Benefit',
              code: (benefit as any).code || '',
              score: pb.score || 0,
            };
          })
          .filter((b: any) => b !== null) || [];

        // Calculate MRP: Use database MRP if available, otherwise use baseOfferPrice as fallback (like admin panel does)
        // Admin panel uses: mrp: product.mrp || product.baseOfferPrice
        const calculatedMRP = fullProduct.mrp || fullProduct.baseOfferPrice || null;

        return {
          id: fullProduct.id,
          name: product.name || fullProduct.name,
          sku: product.itCode,
          itCode: product.itCode,
          description: null,
          brand: fullProduct.brandLine,
          mrp: calculatedMRP,
          basePrice: finalPrice,
          imageUrl: null,
          category: session.category,
          matchScore: product.finalScore,
          matchPercent: product.matchPercent, // Keep for internal use, but don't display
          benefitComponent: product.benefitComponent,
          finalScore: product.finalScore,
          rank: 0, // Will be set after sorting
          features,
          benefits,
          lensIndex: product.lensIndex,
          indexRecommendation: product.indexRecommendation,
          thicknessWarning: product.thicknessWarning,
          indexInvalid: product.indexInvalid,
          storeInfo: storeProduct
            ? {
                priceOverride: storeProduct.priceOverride,
                stockQuantity: Number(storeProduct.stockQuantity),
                isAvailable: storeProduct.isAvailable && Number(storeProduct.stockQuantity) > 0,
                finalPrice: storeProduct.priceOverride || finalPrice,
                discount: storeProduct.priceOverride && storeProduct.priceOverride < finalPrice
                  ? finalPrice - storeProduct.priceOverride
                  : undefined,
              }
            : {
                priceOverride: null,
                stockQuantity: 10,
                isAvailable: true,
                finalPrice: finalPrice,
                discount: undefined,
              },
          pricing: {
            framePrice: frame?.mrp || 0,
            lensPrice: {
              baseLensPrice: basePrice,
              featureAddons: [],
              totalLensPrice: finalPrice,
              bandPricing: bandPricing.bandExtra,
            },
            subtotal: (frame?.mrp || 0) + finalPrice,
            appliedOffer: undefined,
            finalPrice: (frame?.mrp || 0) + finalPrice,
            savings: 0,
          },
          offers,
          bandPricing: {
            applied: bandPricing.bandPricingApplied,
            extra: bandPricing.bandExtra,
            matchedBand: bandPricing.matchedBand,
          },
          yopoEligible: product.yopoEligible,
          brandLine: product.brandLine,
          visionType: product.visionType,
        };
      })
    );

    // Filter out nulls and sort by finalScore
    const validRecommendations = enrichedRecommendations
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.finalScore - a.finalScore);

    // Add labels based on final position after sorting
    const recommendationsWithLabels = validRecommendations.map((rec, index) => {
      const totalProducts = validRecommendations.length;
      let label = '';
      let canTry = false;
      
      if (index === 0) {
        label = 'Recommended';
      } else if (index === 1) {
        label = 'Premium';
      } else if (index === 2) {
        label = 'Value';
      } else if (index === totalProducts - 1) {
        // Last product - Lowest Price / Anti-Walkout
        label = 'Lowest Price';
        canTry = true;
      } else {
        // Other products - no label
        label = '';
      }

      return {
        ...rec,
        label,
        canTry,
      };
    });

    // Check if we have any valid recommendations
    if (recommendationsWithLabels.length === 0) {
      console.error('[RecommendationsAdapter] No valid recommendations found after enrichment');
      console.error('[RecommendationsAdapter] Products from benefit service:', recommendationResult.products.length);
      console.error('[RecommendationsAdapter] Enriched recommendations:', enrichedRecommendations.length);
      
      // Return empty result instead of throwing error
      return {
        sessionId,
        category: session.category,
        customerName: session.customerName,
        recommendations: [],
        answeredFeatures: [],
        generatedAt: new Date(),
        recommendedIndex: recommendationResult.recommendedIndex,
        benefitScores: recommendationResult.benefitScores,
        fourLensOutput: {
          bestMatch: null,
          premium: null,
          value: null,
          antiWalkout: null,
        },
      };
    }

    // Assign ranks
    recommendationsWithLabels.forEach((rec, index) => {
      rec.rank = index + 1;
    });

    // Generate 4-lens output (will handle empty arrays gracefully)
    const fourLensOutput = this.generateFourLensOutput(
      recommendationsWithLabels,
      recommendationResult.recommendedIndex
    );

    // Format answered features (for display)
    const answeredFeatures = Object.entries(recommendationResult.benefitScores).map(
      ([code, weight]) => ({
        feature: code,
        weight: weight as number,
      })
    );

    // Save recommendations to database for admin panel
    await this.saveRecommendationsToDatabase(sessionId, enrichedRecommendations);

    const result: RecommendationAdapterResult = {
      sessionId,
      category: session.category,
      customerName: session.customerName || null,
      recommendations: recommendationsWithLabels,
      answeredFeatures,
      generatedAt: new Date(),
      recommendedIndex: recommendationResult.recommendedIndex,
      benefitScores: recommendationResult.benefitScores,
      fourLensOutput,
    };

    // OPTIMIZATION: Cache the result (5 minutes TTL for session-specific data)
    // cacheKey is already defined at the top of the function
    cacheService.set(cacheKey, result, CACHE_TTL.SESSION_DATA);

    return result;
  }

  /**
   * Save recommendations to SessionRecommendation table for admin panel
   */
  private async saveRecommendationsToDatabase(
    sessionId: string,
    recommendations: any[]
  ): Promise<void> {
    try {
      // Delete existing recommendations for this session
      await prisma.sessionRecommendation.deleteMany({
        where: { sessionId },
      });

      // Save top recommendations (limit to 10)
      const topRecommendations = recommendations.slice(0, 10);
      const now = new Date();

      await Promise.all(
        topRecommendations.map((rec, index) =>
          prisma.sessionRecommendation.create({
            data: {
              sessionId,
              productId: rec.id,
              matchScore: rec.matchPercent || rec.matchScore || 0,
              rank: BigInt(index + 1),
              isSelected: false,
              createdAt: now,
            },
          })
        )
      );
    } catch (error) {
      console.error('[RecommendationsAdapter] Error saving recommendations to database:', error);
      // Don't throw - recommendations are still returned to frontend
    }
  }

  /**
   * Generate 4-lens output: Best Match, Premium, Value, Anti-Walkout
   * Updated with proper business logic per gap report
   */
  private generateFourLensOutput(
    recommendations: any[],
    recommendedIndex: string
  ): FourLensOutput {
    // Handle empty recommendations gracefully
    if (recommendations.length === 0) {
      return {
        bestMatch: null,
        premium: null,
        value: null,
        antiWalkout: null,
      };
    }

    // Helper: Get index numeric value (higher = thinner)
    const getIndexValue = (lensIndex: string): number => {
      const indexMap: Record<string, number> = {
        'INDEX_156': 1.56,
        'INDEX_160': 1.60,
        'INDEX_167': 1.67,
        'INDEX_174': 1.74,
      };
      return indexMap[lensIndex] || 1.56;
    };

    // Helper: Get index rank (higher number = thinner)
    const getIndexRank = (lensIndex: string): number => {
      const rankMap: Record<string, number> = {
        'INDEX_156': 1,
        'INDEX_160': 2,
        'INDEX_167': 3,
        'INDEX_174': 4,
      };
      return rankMap[lensIndex] || 1;
    };

    // Helper: Get recommended index rank
    const recommendedIndexRank = getIndexRank(recommendedIndex);

    // 1. Best Match (highest score)
    const bestMatch = recommendations[0];
    const bestMatchPercent = bestMatch.matchPercent || bestMatch.matchScore || 0;

    // 2. Premium (matchPercent >= bestLens.match - 10, sort by: thinner index, higher feature count, higher price)
    const premiumCandidates = recommendations.filter(
      (r) => {
        const matchPercent = r.matchPercent || r.matchScore || 0;
        return matchPercent >= (bestMatchPercent - 10) && !r.indexInvalid;
      }
    );

    // Sort premium candidates: 1) thinner index (desc), 2) feature count (desc), 3) price (desc)
    const sortedPremium = [...premiumCandidates].sort((a, b) => {
      // 1. Sort by index (thinner first = higher rank)
      const aIndexRank = getIndexRank(a.lensIndex || a.index || 'INDEX_156');
      const bIndexRank = getIndexRank(b.lensIndex || b.index || 'INDEX_156');
      if (bIndexRank !== aIndexRank) {
        return bIndexRank - aIndexRank; // Higher rank (thinner) first
      }

      // 2. Sort by feature count (higher first)
      const aFeatureCount = a.features?.length || 0;
      const bFeatureCount = b.features?.length || 0;
      if (bFeatureCount !== aFeatureCount) {
        return bFeatureCount - aFeatureCount;
      }

      // 3. Sort by price (higher first)
      const aPrice = a.pricing?.finalPrice || a.offerPrice || 0;
      const bPrice = b.pricing?.finalPrice || b.offerPrice || 0;
      return bPrice - aPrice;
    });

    const premium = sortedPremium[0] || recommendations[1] || recommendations[0];

    // 3. Value (best balance: good score, reasonable price)
    const sortedByValue = [...recommendations]
      .filter((r) => !r.indexInvalid)
      .sort((a, b) => {
        const aValue = (a.matchPercent || a.matchScore) / (a.pricing?.finalPrice || 999999);
        const bValue = (b.matchPercent || b.matchScore) / (b.pricing?.finalPrice || 999999);
        return bValue - aValue;
      });
    const value = sortedByValue[0] || recommendations[2] || recommendations[0];

    // 4. Anti-Walkout (cheapest safe option)
    // Rules: 1) Must pass safety filters, 2) matchPercent >= 40, 3) index >= recommendedIndex - 1, 4) Pick lowest finalLensPrice
    const safeOptions = recommendations.filter((r) => {
      // Must pass safety filters (not invalid)
      if (r.indexInvalid) return false;

      // matchPercent >= 40
      const matchPercent = r.matchPercent || r.matchScore || 0;
      if (matchPercent < 40) return false;

      // index >= recommendedIndex - 1 (can be one level below recommended)
      const lensIndexRank = getIndexRank(r.lensIndex || r.index || 'INDEX_156');
      if (lensIndexRank < recommendedIndexRank - 1) return false;

      return true;
    });

    // Sort by price (lowest first)
    const sortedByPrice = [...safeOptions].sort(
      (a, b) => (a.pricing?.finalPrice || a.offerPrice || 999999) - (b.pricing?.finalPrice || b.offerPrice || 999999)
    );
    const antiWalkout = sortedByPrice[0] || recommendations[recommendations.length - 1] || recommendations[0];

    return {
      bestMatch,
      premium,
      value,
      antiWalkout,
    };
  }
}

export const recommendationsAdapterService = new RecommendationsAdapterService();
