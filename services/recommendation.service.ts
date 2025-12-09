import { prisma } from '@/lib/prisma';

interface FeatureWeight {
  featureId: string;
  weight: number;
}

interface PreferenceVector {
  [featureId: string]: number;
}

interface ProductWithScore {
  productId: string;
  product: any;
  matchScore: number;
  storePrice: number;
  inStock: boolean;
}

export class RecommendationService {
  /**
   * Generate product recommendations based on session answers
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

    // Manually fetch option and question details
    const optionIds = [...new Set(answers.map(a => a.optionId))];
    const questionIds = [...new Set(answers.map(a => a.questionId))];
    const [options, questions] = await Promise.all([
      prisma.answerOption.findMany({ where: { id: { in: optionIds } } }),
      prisma.question.findMany({ where: { id: { in: questionIds } } }),
    ]);
    const optionMap = new Map(options.map(o => [o.id, o]));
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Attach option and question to answers
    const answersWithRelations = answers.map(a => ({
      ...a,
      option: optionMap.get(a.optionId)!,
      question: questionMap.get(a.questionId)!,
    }));

    // Step 2: Build preference vector from feature mappings
    const preferenceVector = await this.buildPreferenceVector(answersWithRelations);

    // Step 3: Get available products for this category and store
    // Map category to RetailProductType
    const categoryMap: Record<string, 'FRAME' | 'SUNGLASS' | 'CONTACT_LENS' | 'ACCESSORY'> = {
      'EYEGLASSES': 'FRAME',
      'SUNGLASSES': 'SUNGLASS',
      'CONTACT_LENSES': 'CONTACT_LENS',
      'ACCESSORIES': 'ACCESSORY',
    };
    const productType = categoryMap[category] || 'FRAME';
    const products = await (prisma as any).retailProduct.findMany({
      where: {
        type: productType,
        isActive: true,
      },
    });

    // Manually fetch features and storeProducts
    const productIds = products.map((p: any) => p.id);
    const [productFeatures, storeProducts] = await Promise.all([
      prisma.productFeature.findMany({ where: { productId: { in: productIds } } }),
      prisma.storeProduct.findMany({ where: { productId: { in: productIds }, storeId } }),
    ]);

    // Fetch feature details
    const featureIds = [...new Set(productFeatures.map(pf => pf.featureId))];
    const features = await prisma.feature.findMany({ where: { id: { in: featureIds } } });
    const featureMap = new Map(features.map(f => [f.id, f]));

    // Attach features and storeProducts to products
    const productsWithRelations = products.map((p: any) => ({
      ...p,
      features: productFeatures
        .filter((pf: any) => pf.productId === p.id)
        .map((pf: any) => ({
          ...pf,
          feature: featureMap.get(pf.featureId)!,
        })),
      storeProducts: storeProducts.filter((sp: any) => sp.productId === p.id),
    }));

    // Step 4: Calculate match score for each product
    const scoredProducts = productsWithRelations.map((product: any) => {
      const matchScore = this.calculateMatchScore(product, preferenceVector);
      const storeProduct = product.storeProducts[0];

      return {
        productId: product.id,
        product,
        matchScore,
        storePrice: storeProduct?.priceOverride
          ? Number(storeProduct.priceOverride)
          : Number(product.basePrice),
        inStock: storeProduct
          ? storeProduct.isAvailable && storeProduct.stockQuantity > 0
          : false,
      };
    });

    // Step 5: Sort by match score and apply diversity bonus
    let ranked = scoredProducts.sort((a: any, b: any) => b.matchScore - a.matchScore);

    // Step 6: Apply diversity bonus (ensure brand variety)
    ranked = this.applyDiversityBonus(ranked);

    // Step 7: Prioritize in-stock items
    ranked = ranked.sort((a: any, b: any) => {
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      return b.matchScore - a.matchScore;
    });

    return ranked.slice(0, limit);
  }

  /**
   * Build preference vector from session answers
   */
  private async buildPreferenceVector(answers: any[]): Promise<PreferenceVector> {
    const preferenceVector: PreferenceVector = {};

    for (const answer of answers) {
      // Get feature mappings for this answer option
      const mappings = await prisma.featureMapping.findMany({
        where: {
          questionId: answer.questionId,
          optionKey: answer.option.key,
        },
      });

      // Accumulate weights
      for (const mapping of mappings) {
        if (!preferenceVector[mapping.featureId]) {
          preferenceVector[mapping.featureId] = 0;
        }
        preferenceVector[mapping.featureId] += mapping.weight;
      }
    }

    return preferenceVector;
  }

  /**
   * Calculate match score between product and preference vector
   */
  private calculateMatchScore(
    product: any,
    preferences: PreferenceVector
  ): number {
    let score = 0;
    let maxPossibleScore = 0;

    // Calculate for each feature in preferences
    for (const [featureId, prefWeight] of Object.entries(preferences)) {
      const productFeature = product.features.find(
        (pf: any) => pf.featureId === featureId
      );

      if (productFeature) {
        // Positive preference + product has feature = add to score
        score += prefWeight * productFeature.strength;
      } else if (prefWeight < 0) {
        // Negative preference + product doesn't have feature = good
        score += Math.abs(prefWeight);
      }

      // Max score assumes perfect match with strength 2.0
      maxPossibleScore += Math.abs(prefWeight) * 2.0;
    }

    // Normalize to 0-100 scale
    if (maxPossibleScore === 0) return 0;
    const normalizedScore = (score / maxPossibleScore) * 100;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, normalizedScore));
  }

  /**
   * Apply diversity bonus to ensure brand variety in top results
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

      // Give slight boost to underrepresented brands
      const diversityBonus = brandCounts[brand] === 0 ? 2 : brandCounts[brand] === 1 ? 1 : 0;
      
      result.push({
        ...product,
        matchScore: product.matchScore + diversityBonus,
      });

      brandCounts[brand]++;
    }

    return result.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Save recommendations to database
   */
  async saveRecommendations(
    sessionId: string,
    recommendations: ProductWithScore[]
  ): Promise<void> {
    const data = recommendations.map((rec, index) => ({
      sessionId,
      productId: rec.productId,
      matchScore: rec.matchScore,
      rank: BigInt(index + 1),
      isSelected: false,
      createdAt: new Date(),
    }));

    await prisma.sessionRecommendation.createMany({
      data,
    });
  }

  /**
   * Mark product as selected (conversion)
   */
  async selectProduct(sessionId: string, productId: string): Promise<void> {
    await prisma.$transaction([
      // Update recommendation as selected
      prisma.sessionRecommendation.update({
        where: {
          sessionId_productId: {
            sessionId,
            productId,
          },
        },
        data: {
          isSelected: true,
        },
      }),
      // Update session as converted
      prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'CONVERTED',
        },
      }),
    ]);
  }
}

export const recommendationService = new RecommendationService();

