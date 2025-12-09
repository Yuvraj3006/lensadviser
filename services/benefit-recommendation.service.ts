/**
 * Benefit-Based Recommendation Service
 * Implements the backend spec algorithm: benefit scores + direct answer boosts
 */

import { prisma } from '@/lib/prisma';
import { VisionType } from '@prisma/client';
import { RxValidationService, RxInput } from './rx-validation.service';
import { IndexRecommendationService, FrameInput } from './index-recommendation.service';

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
  };
  thicknessWarning?: boolean;
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
    organizationId: string;
  }): Promise<RecommendationResponse> {
    const { prescription, frame, answers, visionTypeOverride, budgetFilter, organizationId } = input;

    // 1. Infer vision type
    const visionType = this.rxService.inferVisionType(prescription, visionTypeOverride);

    // 2. Recommend index
    const recommendedIndex = this.indexService.recommendIndex(prescription, frame || null);

    // 3. Compute benefit scores from answers
    const benefitScores = await this.computeBenefitScores(answers, organizationId);

    // 4. Fetch candidate products (with frame type filtering)
    const frameType = frame?.frameType || null;
    const candidateProducts = await this.fetchCandidateProducts(
      visionType,
      prescription,
      budgetFilter ?? null,
      organizationId,
      frameType
    );

    // 5. Score products
    const scored = await this.scoreProducts(
      candidateProducts,
      benefitScores,
      answers
    );

    // 6. Sort by final score
    const sorted = scored.sort((a, b) => b.finalScore - a.finalScore);

    // 7. Calculate match percent and add index recommendations
    const maxScore = sorted[0]?.finalScore || 1;
    const productsWithMatchPercent = sorted.map((p) => {
      const indexDelta = this.indexService.calculateIndexDelta(p.lensIndex, recommendedIndex);
      return {
        ...p,
        matchPercent: Math.round((p.finalScore / maxScore) * 100),
        indexRecommendation: {
          recommendedIndex,
          indexDelta,
        },
        thicknessWarning: indexDelta < 0, // Show warning if chosen index is thicker than recommended
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
    const answerBenefits = await prisma.answerBenefit.findMany({
      where: {
        answerId: { in: answerIds },
      },
    });

    // Get benefit IDs and fetch benefits
    const benefitIds = [...new Set(answerBenefits.map(ab => ab.benefitId))];
    const benefits = await prisma.benefit.findMany({
      where: {
        id: { in: benefitIds },
        organizationId,
      },
    });

    // Create a map of benefit ID to code
    const benefitMap = new Map(benefits.map(b => [b.id, b.code]));

    // Aggregate benefit scores using points from AnswerBenefit
    const benefitScores: BenefitScores = {};

    for (const ab of answerBenefits) {
      const code = benefitMap.get(ab.benefitId);
      if (code) {
        // Use points from AnswerBenefit (can be fractional, e.g. +1.5, +2.0)
        const points = typeof ab.points === 'number' ? ab.points : 1; // Default to 1 if points not set
        benefitScores[code] = (benefitScores[code] || 0) + points;
      }
    }

    return benefitScores;
  }

  /**
   * Check if lens is allowed for frame type (safety rules)
   */
  private isLensAllowedForFrameType(lens: any, frameType: 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS' | null): boolean {
    if (!frameType) return true; // No frame type specified, allow all
    
    // Never show 1.56 for rimless or half-rim
    if (frameType === 'RIMLESS' || frameType === 'HALF_RIM') {
      if (lens.lensIndex === 'INDEX_156') {
        return false;
      }
    }
    
    return true; // FULL_RIM allows all indices
  }

  /**
   * Fetch candidate products based on vision type, prescription, frame type, and budget
   */
  private async fetchCandidateProducts(
    visionType: VisionType,
    prescription: RxInput,
    budgetFilter: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'BEST' | null,
    organizationId: string,
    frameType?: 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS' | null
  ) {
    // Get lens products matching vision type
    const products = await (prisma as any).lensProduct.findMany({
      where: {
        visionType: visionType as any, // Cast to VisionType enum
        isActive: true,
      },
      include: {
        rxRanges: true,
      },
    });

    // Manually fetch benefits and answer scores for all products
    const productIds = products.map((p: any) => p.id);
    // Get product benefits (Answer Boosts removed - all scoring via Benefits only)
    const productBenefits = await prisma.productBenefit.findMany({
      where: { productId: { in: productIds } },
    });

    // Fetch benefit details
    const benefitIds = [...new Set(productBenefits.map(pb => pb.benefitId))];
    const benefits = await prisma.benefit.findMany({
      where: { id: { in: benefitIds } },
    });
    const benefitMap = new Map(benefits.map(b => [b.id, b]));

    // Attach benefits to products
    const productsWithRelations = products.map((p: any) => ({
      ...p,
      benefits: productBenefits
        .filter((pb: any) => pb.productId === p.id)
        .map((pb: any) => ({
          ...pb,
          benefit: benefitMap.get(pb.benefitId)!,
        })),
    }));

    // Filter by RX range, frame type, and budget
    return productsWithRelations.filter((p: any) => {
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
      }

      // Filter by budget
      if (budgetFilter && !this.filterByBudget(p, budgetFilter)) {
        return false;
      }

      return true;
    });
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
      let benefitComponent = 0;
      for (const pb of p.benefits) {
        const code = pb.benefit.code;
        const userBenefitScore = benefitScores[code] || 0;
        // Multiply user benefit score by product benefit score (0-3 scale)
        benefitComponent += userBenefitScore * (pb.score || 0);
      }

      const finalScore = benefitComponent; // No direct boost component

      return {
        itCode: p.itCode || p.sku,
        name: p.name,
        brandLine: p.brandLine || 'STANDARD',
        visionType: p.visionType || VisionType.SINGLE_VISION,
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

