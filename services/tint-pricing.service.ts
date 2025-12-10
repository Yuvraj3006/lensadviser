/**
 * Tint Pricing Service
 * Calculates tint pricing based on index and category
 */

import { prisma } from '@/lib/prisma';

export interface TintPricingResult {
  basePrice: number;
  indexFactor: number;
  categoryMultiplier: number;
  finalTintPrice: number;
  finalPrice: number; // Alias for finalTintPrice for consistency
  breakdown: {
    base: number;
    indexAdjustment: number;
    categoryAdjustment: number;
  };
}

export class TintPricingService {
  /**
   * Calculate tint price based on tint color, lens index, and category
   * Formula: finalTintPrice = (basePrice + indexAdjustment) * categoryMultiplier
   */
  async calculateTintPrice(
    tintColorId: string,
    lensIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174'
  ): Promise<TintPricingResult> {
    // Get tint color
    const tintColor = await (prisma as any).tintColor.findUnique({
      where: { id: tintColorId },
      include: {
        indexPricing: {
          where: { isActive: true },
        },
      },
    });

    if (!tintColor) {
      return {
        basePrice: 0,
        indexFactor: 1.0,
        categoryMultiplier: 1.0,
        finalPrice: 0,
        finalTintPrice: 0, // Keep for backward compatibility
        breakdown: {
          base: 0,
          indexAdjustment: 0,
          categoryAdjustment: 0,
        },
      };
    }

    const basePrice = tintColor.basePrice || 0;

    // Get index-based pricing
    const indexPricing = tintColor.indexPricing?.find(
      (ip: any) => ip.lensIndex === lensIndex
    );

    let indexAdjustment = 0;
    let indexFactor = 1.0;

    if (indexPricing) {
      // Apply price factor (multiplier)
      indexFactor = indexPricing.priceFactor || 1.0;
      // Add fixed add-on price
      indexAdjustment = indexPricing.addOnPrice || 0;
    }

    // Category-based multipliers
    const categoryMultiplier = this.getCategoryMultiplier(tintColor.category);

    // Calculate final price
    // Formula: (basePrice * indexFactor + indexAdjustment) * categoryMultiplier
    const priceAfterIndex = basePrice * indexFactor + indexAdjustment;
    const finalTintPrice = priceAfterIndex * categoryMultiplier;

    const categoryAdjustment = priceAfterIndex * (categoryMultiplier - 1.0);

    return {
      basePrice,
      indexFactor,
      categoryMultiplier,
      finalPrice: Math.round(finalTintPrice), // Use finalPrice for consistency
      finalTintPrice: Math.round(finalTintPrice), // Keep for backward compatibility
      breakdown: {
        base: basePrice,
        indexAdjustment: Math.round(indexAdjustment + (basePrice * (indexFactor - 1.0))),
        categoryAdjustment: Math.round(categoryAdjustment),
      },
    };
  }

  /**
   * Get category multiplier for tint pricing
   */
  private getCategoryMultiplier(category: string): number {
    const multipliers: Record<string, number> = {
      SOLID: 1.0, // No extra charge
      GRADIENT: 1.1, // 10% extra
      FASHION: 1.15, // 15% extra
      POLARIZED: 1.25, // 25% extra
      PHOTOCHROMIC: 1.3, // 30% extra
    };

    return multipliers[category] || 1.0;
  }

  /**
   * Get all active tint colors with pricing info
   */
  async getTintColorsWithPricing(
    lensIndex?: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174'
  ) {
    const tintColors = await (prisma as any).tintColor.findMany({
      where: { isActive: true },
      include: {
        indexPricing: {
          where: { isActive: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    if (!lensIndex) {
      return tintColors;
    }

    // Calculate pricing for each tint color
    return Promise.all(
      tintColors.map(async (tint: any) => {
        const pricing = await this.calculateTintPrice(tint.id, lensIndex);
        return {
          ...tint,
          calculatedPrice: pricing.finalTintPrice,
          pricingBreakdown: pricing.breakdown,
        };
      })
    );
  }
}

export const tintPricingService = new TintPricingService();
