/**
 * Benefit-Based Recommendation Service
 * Implements the backend spec algorithm: benefit scores + direct answer boosts
 */

import { prisma } from '@/lib/prisma';
import { RxValidationService, RxInput } from './rx-validation.service';
import { IndexRecommendationService, FrameInput } from './index-recommendation.service';

// VisionType enum from Prisma schema
type VisionType = 'SINGLE_VISION' | 'PROGRESSIVE' | 'BIFOCAL' | 'ANTI_FATIGUE' | 'MYOPIA_CONTROL';

export interface AnswerSelection {
  questionId: string;
  answerIds: string[];
}

export interface BenefitScores {
  [benefitCode: string]: number;
}

export interface RecommendedProduct {
  itCode: string;
  name: string;
  brandLine: string;
  visionType: VisionType;
  lensIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174';
  tintOption: string;
  mrp: number;
  offerPrice: number;
  yopoEligible: boolean;
  finalScore: number;
  benefitComponent: number;
  directBoostComponent: number;
  matchPercent: number;
  indexRecommendation?: {
    recommendedIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174';
    indexDelta: number; // >0 thinner, 0 ideal, <0 thicker
    validationMessage?: string | null;
    isInvalid?: boolean;
    isWarning?: boolean;
  };
  thicknessWarning?: boolean;
  indexInvalid?: boolean; // Mark as invalid if violates rules (e.g., INDEX_156 for rimless)
}

export interface RecommendationResponse {
  recommendedIndex: string;
  benefitScores: BenefitScores;
  products: RecommendedProduct[];
}

export class BenefitRecommendationService {
  private rxService: RxValidationService;
  private indexService: IndexRecommendationService;

  constructor() {
    this.rxService = new RxValidationService();
    this.indexService = new IndexRecommendationService();
  }

  /**
   * Main recommendation method - matches backend spec
   */
  async recommend(input: {
    prescription: RxInput;
    frame?: FrameInput | null;
    answers: AnswerSelection[];
    visionTypeOverride?: VisionType | null;
    budgetFilter?: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'BEST' | null;
    category?: 'EYEGLASSES' | 'SUNGLASSES' | 'ONLY_LENS' | 'CONTACT_LENSES' | null;
    organizationId: string;
  }): Promise<RecommendationResponse> {
    const { prescription, frame, answers, visionTypeOverride, budgetFilter, category, organizationId } = input;

    // 1. Infer vision type
    // Auto-set to SINGLE_VISION for Power Sunglasses (as per spec)
    let finalVisionTypeOverride = visionTypeOverride;
    if (category === 'SUNGLASSES' && !visionTypeOverride) {
      finalVisionTypeOverride = 'SINGLE_VISION' as VisionType;
    }
    const visionType = this.rxService.inferVisionType(prescription, finalVisionTypeOverride);

    // 2. Recommend index
    const recommendedIndex = this.indexService.recommendIndex(prescription, frame || null);

    // 3. Compute benefit scores from answers
    const benefitScores = await this.computeBenefitScores(answers, organizationId);

    // 4. Fetch candidate products (with frame type and tint filtering)
    const frameType = frame?.frameType || null;
    const candidateProducts = await this.fetchCandidateProducts(
      visionType,
      prescription,
      budgetFilter ?? null,
      organizationId,
      frameType,
      category || null
    );

    // 5. Score products
    const scored = await this.scoreProducts(
      candidateProducts,
      benefitScores,
      answers
    );

    // 6. Sort by final score
    const sorted = scored.sort((a, b) => b.finalScore - a.finalScore);

    // 7. Calculate match percent and add index recommendations with advanced validation
    const maxScore = sorted[0]?.finalScore || 1;
    const productsWithMatchPercent = sorted.map((p) => {
      const indexDelta = this.indexService.calculateIndexDelta(p.lensIndex, recommendedIndex);
      
      // Advanced validation: Check if index selection is valid/warning
      const indexValidation = this.indexService.validateIndexSelection(
        p.lensIndex,
        prescription,
        frame || null
      );
      
      return {
        ...p,
        matchPercent: Math.round((p.finalScore / maxScore) * 100),
        indexRecommendation: {
          recommendedIndex,
          indexDelta,
          validationMessage: indexValidation.message,
          isInvalid: !indexValidation.isValid,
          isWarning: indexValidation.isWarning,
        },
        thicknessWarning: indexDelta < 0 || indexValidation.isWarning, // Show warning if chosen index is thicker than recommended or invalid
        indexInvalid: !indexValidation.isValid, // Mark as invalid if violates rules (e.g., INDEX_156 for rimless)
      };
    });

    return {
      recommendedIndex,
      benefitScores,
      products: productsWithMatchPercent,
    };
  }

  /**
   * Compute benefit scores from answer selections
   */
  private async computeBenefitScores(
    answersInput: AnswerSelection[],
    organizationId: string
  ): Promise<BenefitScores> {
    const answerIds = answersInput.flatMap((a) => a.answerIds);

    if (answerIds.length === 0) {
      return {};
    }

    // Get all answer-benefit mappings
    const answerBenefits = await (prisma.answerBenefit.findMany as any)({
      where: {
        answerId: { in: answerIds },
      },
    });

    // Get benefit IDs and fetch benefits from unified BenefitFeature model
    const benefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))];
    const benefits = await (prisma as any).benefitFeature.findMany({
      where: {
        id: { in: benefitIds },
        type: 'BENEFIT',
        organizationId,
      },
    });

    // Create a map of benefit ID to benefit object
    const benefitMap = new Map(benefits.map((b: any) => [b.id, b]));

    // Aggregate benefit scores using points from AnswerBenefit
    const benefitScores: BenefitScores = {};

    for (const ab of answerBenefits) {
      const benefit = benefitMap.get(ab.benefitId);
      if (benefit && (benefit as any).code) {
        const code = String((benefit as any).code);
        // Use points from AnswerBenefit (can be fractional, e.g. +1.5, +2.0)
        const points = typeof (ab as any).points === 'number' ? (ab as any).points : 1; // Default to 1 if points not set
        // Apply category weight multiplier
        const categoryWeight = typeof (ab as any).categoryWeight === 'number' ? (ab as any).categoryWeight : 1.0;
        const weightedPoints = points * categoryWeight;
        if (code) {
          benefitScores[code] = (benefitScores[code] || 0) + weightedPoints;
        }
      }
    }

    return benefitScores;
  }

  /**
   * Check if lens is allowed for frame type (safety rules)
   * Advanced Rule: Rimless → 1.59+ mandatory (never allow INDEX_156)
   */
  private isLensAllowedForFrameType(lens: any, frameType: 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS' | null): boolean {
    if (!frameType) return true; // No frame type specified, allow all

    // Advanced Rule: Rimless → 1.59+ mandatory (INDEX_160 minimum)
    // Never allow INDEX_156 for rimless frames, regardless of power
    if (frameType === 'RIMLESS' && lens.lensIndex === 'INDEX_156') {
      return false; // Block INDEX_156 for rimless
    }

    // Half-rim frames: allow all indices (power-based recommendation will handle it)
    // FULL_RIM allows all indices
    return true;
  }

  /**
   * Fetch candidate products based on vision type, prescription, frame type, budget, and category
   */
  private async fetchCandidateProducts(
    visionType: VisionType,
    prescription: RxInput,
    budgetFilter: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'BEST' | null,
    organizationId: string,
    frameType?: 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS' | null,
    category?: 'EYEGLASSES' | 'SUNGLASSES' | 'ONLY_LENS' | 'CONTACT_LENSES' | null
  ) {
    // Build where clause
    const where: any = {
      visionType: visionType as any, // Cast to VisionType enum
      isActive: true,
    };

    // For sunglasses, filter by tint option (TINT or PHOTOCHROMIC only) and brandLine
    if (category === 'SUNGLASSES') {
      where.tintOption = {
        in: ['TINT', 'PHOTOCHROMIC', 'TRANSITION'],
      };
      // Only show Tint NEXT, Premium, Essential brand lines
      where.brandLine = {
        in: ['TINT_NEXT', 'TINT_PREMIUM', 'TINT_ESSENTIAL'],
      };
      // Force SINGLE_VISION for Power Sunglasses (99% cases)
      where.visionType = 'SINGLE_VISION';
    }

    // Get lens products matching vision type and tint (if sunglasses)
    const products = await (prisma as any).lensProduct.findMany({
      where,
      include: {
        rxRanges: true,
      },
    });
    
    console.log(`[BenefitRecommendationService] Found ${products.length} products matching initial criteria:`, {
      visionType,
      category,
      whereClause: JSON.stringify(where),
    });

    // Manually fetch benefits and answer scores for all products
    const productIds = products.map((p: any) => p.id);
    // Get product benefits (Answer Boosts removed - all scoring via Benefits only)
    const productBenefits = await (prisma.productBenefit.findMany as any)({
      where: { productId: { in: productIds } },
    });

    // Fetch benefit details from BenefitFeature (not old Benefit model)
    const benefitIds = [...new Set(productBenefits.map((pb: any) => String(pb.benefitId)))];
    const benefits = benefitIds.length > 0
      ? await (prisma as any).benefitFeature.findMany({
          where: {
            type: 'BENEFIT',
            id: { in: benefitIds },
            organizationId,
          },
        })
      : [];
    const benefitMap = new Map(benefits.map((b: any) => [b.id, b]));

    // Attach benefits to products
    const productsWithRelations = products.map((p: any) => ({
      ...p,
      benefits: productBenefits
        .filter((pb: any) => pb.productId === p.id)
        .map((pb: any) => {
          const benefit = benefitMap.get(pb.benefitId);
          if (!benefit) {
            console.warn(`[BenefitRecommendationService] Benefit not found for benefitId: ${pb.benefitId}`);
            return null;
          }
          return {
            ...pb,
            benefit: benefit, // Use BenefitFeature data
          };
        })
        .filter((pb: any) => pb !== null)
        .filter((pb: any) => pb.benefit !== null), // Filter out benefits that weren't found
    }));

    // Filter by RX range, frame type, and budget
    const filteredProducts = productsWithRelations.filter((p: any) => {
      // Filter by frame type (safety rules)
      if (!this.isLensAllowedForFrameType(p, frameType || null)) {
        return false;
      }

      // Check RX range using rxRanges
      if (p.rxRanges && p.rxRanges.length > 0) {
        const rxSupported = p.rxRanges.some((range: any) => {
          const rSph = prescription.rSph || 0;
          const rCyl = prescription.rCyl || 0;
          const lSph = prescription.lSph || 0;
          const lCyl = prescription.lCyl || 0;
          
          // Check if prescription falls within any range
          const sphInRange = (rSph >= range.sphMin && rSph <= range.sphMax) ||
                            (lSph >= range.sphMin && lSph <= range.sphMax);
          const cylInRange = Math.abs(rCyl || 0) <= Math.abs(range.cylMax) &&
                            Math.abs(lCyl || 0) <= Math.abs(range.cylMax);
          
          return sphInRange && cylInRange;
        });
        
        if (!rxSupported) {
          return false;
        }
      } else {
        // If no RX ranges defined, allow the product (backward compatibility)
        console.warn(`[BenefitRecommendationService] Product ${p.itCode} has no RX ranges defined`);
      }

      // Filter by budget
      if (budgetFilter && !this.filterByBudget(p, budgetFilter)) {
        return false;
      }

      return true;
    });
    
    console.log(`[BenefitRecommendationService] After filtering (RX, frame, budget): ${filteredProducts.length} products remaining`);
    
    return filteredProducts;
  }

  /**
   * Score products using benefit component + direct boost component
   */
  private async scoreProducts(
    products: any[],
    benefitScores: BenefitScores,
    answersInput: AnswerSelection[]
  ) {
    const selectedAnswerIds = new Set(answersInput.flatMap((a) => a.answerIds));

    return products.map((p) => {
      // Calculate benefit component (Answer Boosts removed - all scoring via Benefits only)
      // Formula: Σ(answer.points × lens.benefitStrength × benefit.pointWeight)
      let benefitComponent = 0;
      for (const pb of p.benefits) {
        // Handle both old Benefit model and new BenefitFeature model
        const benefit = pb.benefit;
        if (!benefit) continue; // Skip if benefit not found
        
        const code = benefit.code;
        if (!code) continue; // Skip if no code
        
        const userBenefitScore = benefitScores[code] || 0;
        const productBenefitScore = pb.score || 0; // 0-3 scale
        const benefitWeight = (benefit as any).pointWeight || 1.0; // Default weight is 1.0
        
        // Multiply user benefit score by product benefit score by benefit weight
        benefitComponent += userBenefitScore * productBenefitScore * benefitWeight;
      }

      const finalScore = benefitComponent; // No direct boost component

      return {
        itCode: p.itCode || p.sku,
        name: p.name,
        brandLine: p.brandLine || 'STANDARD',
        visionType: (p.visionType || 'SINGLE_VISION') as VisionType,
        lensIndex: p.lensIndex || 'INDEX_156',
        tintOption: p.tintOption || 'CLEAR',
        mrp: p.mrp || p.basePrice,
        offerPrice: p.baseOfferPrice || p.offerPrice || p.basePrice,
        yopoEligible: p.yopoEligible || false,
        benefitComponent,
        directBoostComponent: 0, // Answer Boosts removed - all scoring via Benefits
        finalScore,
      };
    });
  }

  /**
   * Filter products by budget
   */
  private filterByBudget(
    product: any,
    budgetFilter: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'BEST'
  ): boolean {
    const price = product.offerPrice || product.basePrice;

    switch (budgetFilter) {
      case 'ECONOMY':
        return price <= 2000;
      case 'STANDARD':
        return price > 2000 && price <= 5000;
      case 'PREMIUM':
        return price > 5000 && price <= 10000;
      case 'BEST':
        return true; // No filter
      default:
        return true;
    }
  }
}

