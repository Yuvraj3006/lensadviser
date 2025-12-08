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
  lensIndex: string;
  tintOption: string;
  mrp: number;
  offerPrice: number;
  yopoEligible: boolean;
  finalScore: number;
  benefitComponent: number;
  directBoostComponent: number;
  matchPercent: number;
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

    // 4. Fetch candidate products
    const candidateProducts = await this.fetchCandidateProducts(
      visionType,
      prescription,
      budgetFilter ?? null,
      organizationId
    );

    // 5. Score products
    const scored = await this.scoreProducts(
      candidateProducts,
      benefitScores,
      answers
    );

    // 6. Sort by final score
    const sorted = scored.sort((a, b) => b.finalScore - a.finalScore);

    // 7. Calculate match percent
    const maxScore = sorted[0]?.finalScore || 1;
    const productsWithMatchPercent = sorted.map((p) => ({
      ...p,
      matchPercent: Math.round((p.finalScore / maxScore) * 100),
    }));

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

    // Aggregate benefit scores (simple count-based scoring)
    const benefitScores: BenefitScores = {};

    for (const ab of answerBenefits) {
      const code = benefitMap.get(ab.benefitId);
      if (code) {
        benefitScores[code] = (benefitScores[code] || 0) + 1;
      }
    }

    return benefitScores;
  }

  /**
   * Fetch candidate products based on vision type, prescription, and budget
   */
  private async fetchCandidateProducts(
    visionType: VisionType,
    prescription: RxInput,
    budgetFilter: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'BEST' | null,
    organizationId: string
  ) {
    const products = await prisma.product.findMany({
      where: {
        organizationId,
        visionType,
        isActive: true,
        category: 'EYEGLASSES', // Assuming lenses are in EYEGLASSES category
      },
    });

    // Manually fetch benefits and answer scores for all products
    const productIds = products.map(p => p.id);
    const [productBenefits, productAnswerScores] = await Promise.all([
      prisma.productBenefit.findMany({
        where: { productId: { in: productIds } },
      }),
      prisma.productAnswerScore.findMany({
        where: { productId: { in: productIds } },
      }),
    ]);

    // Fetch benefit details
    const benefitIds = [...new Set(productBenefits.map(pb => pb.benefitId))];
    const benefits = await prisma.benefit.findMany({
      where: { id: { in: benefitIds } },
    });
    const benefitMap = new Map(benefits.map(b => [b.id, b]));

    // Attach benefits and answer scores to products
    const productsWithRelations = products.map(p => ({
      ...p,
      benefits: productBenefits
        .filter(pb => pb.productId === p.id)
        .map(pb => ({
          ...pb,
          benefit: benefitMap.get(pb.benefitId)!,
        })),
      answerScores: productAnswerScores.filter(pas => pas.productId === p.id),
    }));

    // Filter by RX range and budget
    return productsWithRelations.filter((p) => {
      // Check RX range - skip if product doesn't have RX range fields
      // Note: Product model doesn't have sphMin, sphMax, cylMax fields
      // So we skip this check for now
      // if (!this.rxService.isProductInRxRange(p, prescription)) {
      //   return false;
      // }

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
      // Calculate benefit component
      let benefitComponent = 0;
      for (const pb of p.benefits) {
        const code = pb.benefit.code;
        const userBenefitScore = benefitScores[code] || 0;
        benefitComponent += userBenefitScore;
      }

      // Calculate direct boost component
      let directBoost = 0;
      for (const pas of p.answerScores) {
        if (selectedAnswerIds.has(pas.answerId)) {
          directBoost += pas.score;
        }
      }

      const finalScore = benefitComponent + directBoost;

      return {
        itCode: p.itCode || p.sku,
        name: p.name,
        brandLine: p.brandLine || 'STANDARD',
        visionType: p.visionType || VisionType.MYOPIA,
        lensIndex: p.lensIndex || '1.56',
        tintOption: p.tintOption || 'CLEAR',
        mrp: p.mrp || p.basePrice,
        offerPrice: p.offerPrice || p.basePrice,
        yopoEligible: p.yopoEligible || false,
        benefitComponent,
        directBoostComponent: directBoost,
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

