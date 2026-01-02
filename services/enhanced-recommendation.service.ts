import { prisma } from '@/lib/prisma';

interface ProductWithScore {
  productId: string;
  product: any;
  matchScore: number;
  featureScore: number;
  benefitScore: number;
  interconnectedScore: number;
  storePrice: number;
  inStock: boolean;
}

interface PreferenceVector {
  [featureId: string]: number;
}

interface BenefitScores {
  [benefitCode: string]: number;
}

/**
 * Enhanced Recommendation Service
 * Combines Feature-Based, Benefit-Based, and Interconnected Scoring
 */
export class EnhancedRecommendationService {
  // Scoring weights (can be configured)
  private readonly FEATURE_WEIGHT = 0.4; // 40% weight for feature-based scoring
  private readonly BENEFIT_WEIGHT = 0.4; // 40% weight for benefit-based scoring
  private readonly INTERCONNECTED_WEIGHT = 0.2; // 20% weight for interconnected scoring

  /**
   * Generate product recommendations with dual scoring system
   */
  async generateRecommendations(
    sessionId: string,
    storeId: string,
    category: string,
    limit: number = 10
  ): Promise<ProductWithScore[]> {
    // Step 1: Get all session answers
    const answers = await prisma.sessionAnswer.findMany({
      where: { sessionId },
    });

    if (answers.length === 0) {
      return [];
    }

    // Get options and questions
    const optionIds = [...new Set(answers.map(a => a.optionId))];
    const questionIds = [...new Set(answers.map(a => a.questionId))];
    const [options, questions] = await Promise.all([
      prisma.answerOption.findMany({ where: { id: { in: optionIds } } }),
      prisma.question.findMany({ where: { id: { in: questionIds } } }),
    ]);
    const optionMap = new Map(options.map(o => [o.id, o]));
    const questionMap = new Map(questions.map(q => [q.id, q]));

    const answersWithRelations = answers.map(a => ({
      ...a,
      option: optionMap.get(a.optionId)!,
      question: questionMap.get(a.questionId)!,
    }));

    // Step 2: Build preference vectors
    const featurePreferenceVector = await this.buildFeaturePreferenceVector(answersWithRelations);
    const benefitScores = await this.buildBenefitScores(answersWithRelations);

    // Step 3: Get products
    // Map category to RetailProductType
    // NOTE: FRAME and SUNGLASS are manual-entry only, not SKU products
    // For EYEGLASSES/SUNGLASSES, recommend LENS products, not frames
    // For CONTACT_LENSES/ACCESSORIES, use RetailProduct
    let products: any[] = [];
    
    if (category === 'EYEGLASSES' || category === 'SUNGLASSES') {
      // For frame-based flows, recommend LENS products (not frames)
      products = await prisma.lensProduct.findMany({
        where: {
          isActive: true,
        },
      });
    } else if (category === 'CONTACT_LENSES') {
      // For contact lenses, use ContactLensProduct (not RetailProduct)
      products = await (prisma as any).contactLensProduct.findMany({
        where: {
          isActive: true,
        },
      });
      // Map to expected format
      products = products.map((cl: any) => ({
        ...cl,
        type: 'CONTACT_LENS',
      }));
    } else if (category === 'ACCESSORIES') {
      // For accessories, use RetailProduct
      products = await (prisma as any).retailProduct.findMany({
        where: {
          type: 'ACCESSORY',
          isActive: true,
        },
      });
    }

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map((p: any) => p.id);

    // Step 4: Fetch all related data
    const [
      productFeatures,
      productBenefits,
      storeProducts,
      featureBenefitMappings,
    ] = await Promise.all([
      prisma.productFeature.findMany({ where: { productId: { in: productIds } } }),
      prisma.productBenefit.findMany({ where: { productId: { in: productIds } } }),
      prisma.storeProduct.findMany({ where: { productId: { in: productIds }, storeId } }),
      // FeatureBenefit is deprecated - using direct BenefitFeature queries instead
      Promise.resolve([]), // Old: prisma.featureBenefit.findMany (no longer needed)
    ]);

    // Fetch feature and benefit details
    const oldFeatureIds = [...new Set(productFeatures.map(pf => String(pf.featureId)))];
    const oldBenefitIds = [...new Set(productBenefits.map(pb => String(pb.benefitId)))];
    
    // OPTIMIZATION: Batch fetch old features, old benefits, benefit features in parallel
    const [oldFeatures, oldBenefits, benefitFeaturesByCode] = await Promise.all([
      oldFeatureIds.length > 0
        ? (prisma as any).feature.findMany({
            where: { id: { in: oldFeatureIds } },
          })
        : Promise.resolve([]),
      oldBenefitIds.length > 0
        ? prisma.benefit.findMany({
            where: { id: { in: oldBenefitIds } },
          })
        : Promise.resolve([]),
      // Pre-fetch all benefit features (both BENEFIT and FEATURE types)
      (prisma as any).benefitFeature.findMany({
        where: {
          type: { in: ['BENEFIT', 'FEATURE'] },
          isActive: true,
        },
      }) as Promise<any[]>,
    ]);
    
    // Create mappings: old Feature.id -> BenefitFeature (for FEATURE type)
    const oldFeatureIdToCodeMap = new Map<string, string>(oldFeatures.map((f: any) => [String(f.id), String(f.code)]));
    const featureCodeToFeatureIdMap = new Map<string, string>(
      benefitFeaturesByCode.filter((bf: any) => bf.type === 'FEATURE').map((bf: any) => [String(bf.code), String(bf.id)])
    );
    
    // Create final mapping: old Feature.id -> BenefitFeature object
    const oldFeatureIdToBenefitFeatureMap = new Map<string, any>();
    oldFeatureIdToCodeMap.forEach((code, oldId) => {
      const benefitFeatureId = featureCodeToFeatureIdMap.get(code);
      if (benefitFeatureId) {
        const benefitFeature = benefitFeaturesByCode.find((bf: any) => String(bf.id) === benefitFeatureId);
        if (benefitFeature) {
          oldFeatureIdToBenefitFeatureMap.set(String(oldId), benefitFeature);
        }
      }
    });
    
    // Create mappings: old Benefit.id -> BenefitFeature (for BENEFIT type)
    const oldBenefitIdToCodeMap = new Map<string, string>(oldBenefits.map(b => [String(b.id), String(b.code)]));
    const benefitCodeToFeatureIdMap = new Map<string, string>(
      benefitFeaturesByCode.filter((bf: any) => bf.type === 'BENEFIT').map((bf: any) => [String(bf.code), String(bf.id)])
    );
    
    // Create final mapping: old Benefit.id -> BenefitFeature object
    const oldIdToBenefitFeatureMap = new Map<string, any>();
    oldBenefitIdToCodeMap.forEach((code, oldId) => {
      const benefitFeatureId = benefitCodeToFeatureIdMap.get(code);
      if (benefitFeatureId) {
        const benefitFeature = benefitFeaturesByCode.find((bf: any) => String(bf.id) === benefitFeatureId);
        if (benefitFeature) {
          oldIdToBenefitFeatureMap.set(String(oldId), benefitFeature);
        }
      }
    });

    // Use mapped BenefitFeature objects
    const featureMap = oldFeatureIdToBenefitFeatureMap;
    const benefitMap = oldIdToBenefitFeatureMap;
    const benefitCodeMap = new Map<string, string>(
      Array.from(oldIdToBenefitFeatureMap.values()).map((b: any) => [String(b.id), String(b.code || '')])
    );

    // Step 5: Attach relations to products
    const productsWithRelations = products.map((p: any) => ({
      ...p,
      features: productFeatures
        .filter((pf: any) => pf.productId === p.id)
        .map((pf: any) => ({
          ...pf,
          feature: featureMap.get(pf.featureId)!,
        })),
      benefits: productBenefits
        .filter((pb: any) => pb.productId === p.id)
        .map((pb: any) => ({
          ...pb,
          benefit: benefitMap.get(pb.benefitId)!,
        })),
      storeProducts: storeProducts.filter((sp: any) => sp.productId === p.id),
    }));

    // Step 6: Calculate scores for each product
    const scoredProducts = productsWithRelations.map((product: any) => {
      const featureScore = this.calculateFeatureScore(product, featurePreferenceVector);
      const benefitScore = this.calculateBenefitScore(product, benefitScores, benefitCodeMap);
      const interconnectedScore = this.calculateInterconnectedScore(
        product,
        featurePreferenceVector,
        benefitScores,
        featureBenefitMappings,
        benefitCodeMap
      );

      // Combine scores with weights
      const matchScore =
        featureScore * this.FEATURE_WEIGHT +
        benefitScore * this.BENEFIT_WEIGHT +
        interconnectedScore * this.INTERCONNECTED_WEIGHT;

      const storeProduct = product.storeProducts[0];

      return {
        productId: product.id,
        product,
        matchScore: Math.min(100, Math.max(0, matchScore)), // Clamp 0-100
        featureScore,
        benefitScore,
        interconnectedScore,
        storePrice: storeProduct?.priceOverride
          ? Number(storeProduct.priceOverride)
          : Number(product.basePrice),
        inStock: storeProduct
          ? storeProduct.isAvailable && storeProduct.stockQuantity > 0
          : false,
      };
    });

    // Step 7: Sort by match score
    let ranked = scoredProducts.sort((a: any, b: any) => b.matchScore - a.matchScore);

    // Step 8: Apply diversity bonus
    ranked = this.applyDiversityBonus(ranked);

    // Step 9: Prioritize in-stock items
    ranked = ranked.sort((a: any, b: any) => {
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      return b.matchScore - a.matchScore;
    });

    return ranked.slice(0, limit);
  }

  /**
   * Build feature preference vector from answers
   * SIMPLIFIED: Use AnswerBenefit directly instead of FeatureMapping
   * Clean mapping: AnswerOption → Benefit → Points
   */
  private async buildFeaturePreferenceVector(answers: any[]): Promise<PreferenceVector> {
    // Get answer IDs
    const answerIds = answers.map(a => a.optionId);
    
    // Get benefit scores directly from AnswerBenefit
    const answerBenefits = await prisma.answerBenefit.findMany({
      where: {
        answerId: { in: answerIds },
      },
      include: {
        benefit: true,
      },
    });

    // Build benefit preference map (using benefit codes as keys)
    const benefitPreference: Record<string, number> = {};
    answerBenefits.forEach((ab) => {
      if (ab.benefit && typeof ab.points === 'number') {
        const code = ab.benefit.code;
        benefitPreference[code] = (benefitPreference[code] || 0) + ab.points;
      }
    });

    // Return empty preference vector for now (legacy compatibility)
    // The actual scoring should use benefit-based matching, not feature-based
    return {};
  }

  /**
   * Build benefit scores from answers
   */
  private async buildBenefitScores(answers: any[]): Promise<BenefitScores> {
    const answerIds = answers.map(a => a.option.id);
    const answerBenefits = await prisma.answerBenefit.findMany({
      where: {
        answerId: { in: answerIds },
      },
      include: {
        benefit: true,
      },
    });

    const benefitScores: BenefitScores = {};
    for (const ab of answerBenefits) {
      const code = ab.benefit.code;
      if (!benefitScores[code]) {
        benefitScores[code] = 0;
      }
      benefitScores[code] += ab.points;
    }

    return benefitScores;
  }

  /**
   * Calculate feature-based score
   */
  private calculateFeatureScore(
    product: any,
    preferences: PreferenceVector
  ): number {
    let score = 0;
    let maxPossibleScore = 0;

    for (const [featureId, prefWeight] of Object.entries(preferences)) {
      const productFeature = product.features.find(
        (pf: any) => pf.featureId === featureId
      );

      if (productFeature) {
        score += prefWeight * productFeature.strength;
      }

      maxPossibleScore += Math.abs(prefWeight) * 2.0; // Assuming max strength 2.0
    }

    if (maxPossibleScore === 0) return 0;
    return Math.min(100, (score / maxPossibleScore) * 100);
  }

  /**
   * Calculate benefit-based score
   */
  private calculateBenefitScore(
    product: any,
    benefitScores: BenefitScores,
    benefitCodeMap: Map<string, string>
  ): number {
    let score = 0;
    let maxPossibleScore = 0;

    for (const [benefitCode, points] of Object.entries(benefitScores)) {
      const productBenefit = product.benefits.find((pb: any) => {
        const code = benefitCodeMap.get(pb.benefitId);
        return code === benefitCode;
      });

      if (productBenefit) {
        score += points * productBenefit.strength;
      }

      maxPossibleScore += points * 3; // Max points (3) × max strength (3)
    }

    if (maxPossibleScore === 0) return 0;
    return Math.min(100, (score / maxPossibleScore) * 100);
  }

  /**
   * Calculate interconnected score (Feature → Benefit)
   */
  private calculateInterconnectedScore(
    product: any,
    featurePreferences: PreferenceVector,
    benefitScores: BenefitScores,
    featureBenefitMappings: any[],
    benefitCodeMap: Map<string, string>
  ): number {
    let score = 0;
    let maxPossibleScore = 0;

    // For each feature preference
    for (const [featureId, featureWeight] of Object.entries(featurePreferences)) {
      // Find feature-benefit mappings
      const mappings = featureBenefitMappings.filter(
        (fb) => fb.featureId === featureId
      );

      for (const mapping of mappings) {
        const benefitCode = mapping.benefit.code;
        const benefitPoints = benefitScores[benefitCode] || 0;

        if (benefitPoints > 0) {
          // Find product benefit
          const productBenefit = product.benefits.find((pb: any) => {
            const code = benefitCodeMap.get(pb.benefitId);
            return code === benefitCode;
          });

          if (productBenefit) {
            // Interconnected score: featureWeight × mappingWeight × productBenefitStrength
            score += featureWeight * mapping.weight * productBenefit.strength;
          }
        }

        // Max score calculation
        maxPossibleScore += Math.abs(featureWeight) * mapping.weight * 3; // Max strength 3
      }
    }

    if (maxPossibleScore === 0) return 0;
    return Math.min(100, (score / maxPossibleScore) * 100);
  }

  /**
   * Apply diversity bonus to ensure brand variety
   */
  private applyDiversityBonus(products: ProductWithScore[]): ProductWithScore[] {
    if (products.length <= 5) return products;

    const brandCounts: { [brand: string]: number } = {};
    const result: ProductWithScore[] = [];

    for (const product of products) {
      const brand = product.product.brand || 'unknown';

      if (!brandCounts[brand]) {
        brandCounts[brand] = 0;
      }

      const diversityBonus = brandCounts[brand] === 0 ? 2 : brandCounts[brand] === 1 ? 1 : 0;

      result.push({
        ...product,
        matchScore: Math.min(100, product.matchScore + diversityBonus),
      });

      brandCounts[brand]++;
    }

    return result.sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const enhancedRecommendationService = new EnhancedRecommendationService();

