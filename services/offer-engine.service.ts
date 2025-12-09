/**
 * LensTrack Offer Engine Service
 * Implements the complete offer waterfall logic as per specification
 */

import { prisma } from '@/lib/prisma';
import {
  OfferCalculationInput,
  OfferCalculationResult,
  OfferApplied,
  PriceComponent,
  UpsellSuggestion,
} from '@/types/offer-engine';
// DiscountType and OfferType are string fields, not enums in Prisma
const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FLAT_AMOUNT: 'FLAT_AMOUNT',
} as const;

const OfferType = {
  PERCENT_OFF: 'PERCENT_OFF',
  FLAT_OFF: 'FLAT_OFF',
  FREE_LENS: 'FREE_LENS',
  BONUS_FREE_PRODUCT: 'BONUS_FREE_PRODUCT',
  COMBO_PRICE: 'COMBO_PRICE',
  YOPO: 'YOPO',
  BOG50: 'BOG50',
} as const;

// CustomerCategory is a string field, not an enum in Prisma
type CustomerCategory = 'REGULAR' | 'SENIOR_CITIZEN' | 'STUDENT' | 'CORPORATE';

export class OfferEngineService {
  /**
   * Main entry point: Calculate offers for a frame + lens combination
   */
  async calculateOffers(input: OfferCalculationInput): Promise<OfferCalculationResult> {
    const { frame, lens, organizationId } = input;
    const frameMRP = frame.mrp;
    const lensPrice = lens.price;
    const baseTotal = frameMRP + lensPrice;

    // Initialize result structure
    const priceComponents: PriceComponent[] = [
      { label: 'Frame MRP', amount: frameMRP },
      { label: 'Lens Offer Price', amount: lensPrice },
    ];

    let effectiveBase = baseTotal;
    const offersApplied: OfferApplied[] = [];

    // V2: PRIMARY OFFER (Waterfall: COMBO_PRICE > YOPO > FREE_LENS > PERCENT_OFF > FLAT_OFF)
    const primaryRule = await this.findApplicablePrimaryRule(input);
    if (primaryRule) {
      const result = this.applyPrimaryRule(primaryRule, frameMRP, lensPrice);
      effectiveBase = result.newTotal;
      offersApplied.push({
        ruleCode: primaryRule.code,
        description: result.label,
        savings: result.savings,
      });
      priceComponents.push({
        label: result.label,
        amount: -result.savings,
      });
      
      // V2: If rule locks further evaluation (Combo/YOPO), break early
      if (result.locksFurtherEvaluation) {
        // Skip remaining primary offers, but still apply category discount and upsell
      }
    }

    // 2. SECOND PAIR OFFER (if applicable)
    let secondPairDiscount: OfferApplied | null = null;
    if (input.secondPair?.enabled) {
      const secondPairRule = await this.findApplicableSecondPairRule(input);
      if (secondPairRule) {
        const result = this.applySecondPairRule(secondPairRule, input.secondPair!);
        if (result.savings > 0) {
          secondPairDiscount = {
            ruleCode: secondPairRule.code,
            description: result.label,
            savings: result.savings,
          };
          priceComponents.push({
            label: result.label,
            amount: -result.savings,
          });
          effectiveBase -= result.savings;
        }
      }
    }

    // 3. CUSTOMER CATEGORY DISCOUNT
    let categoryDiscount: OfferApplied | null = null;
    if (input.customerCategory) {
      try {
        // Find applicable category discount (brand-specific or universal *)
        const catDiscount = await prisma.categoryDiscount.findFirst({
          where: {
            organizationId,
            customerCategory: input.customerCategory as CustomerCategory,
            isActive: true,
            OR: [
              { brandCode: frame.brand },
              { brandCode: '*' }, // Universal discount
            ],
          },
          orderBy: {
            discountPercent: 'desc', // Prefer higher discount
          },
        });

        if (catDiscount) {
          const discountAmount = Math.min(
            effectiveBase * (catDiscount.discountPercent / 100),
            catDiscount.maxDiscount || effectiveBase
          );
          
          if (discountAmount > 0) {
            effectiveBase -= discountAmount;
            categoryDiscount = {
              ruleCode: 'CATEGORY',
              description: `${input.customerCategory} Discount (${catDiscount.discountPercent}%)`,
              savings: discountAmount,
            };
            priceComponents.push({
              label: categoryDiscount.description,
              amount: -discountAmount,
            });
          }
        }
      } catch (catDiscError: any) {
        // If category discount query fails, log but don't break the offer calculation
        console.warn('[OfferEngine] Category discount query failed:', catDiscError?.message);
      }
    }

    // 4. COUPON DISCOUNT
    let couponDiscount: OfferApplied | null = null;
    let couponError: string | null = null;
    if (input.couponCode) {
      try {
        const now = new Date();
        // First find the coupon
        const coupon = await prisma.coupon.findFirst({
          where: {
            organizationId,
            code: input.couponCode.toUpperCase().trim(),
            isActive: true,
            validFrom: { lte: now },
            OR: [
              { validUntil: null },
              { validUntil: { gte: now } },
            ],
          },
        });

        // Check usage limit and apply coupon
        if (!coupon) {
          couponError = `Coupon code "${input.couponCode.toUpperCase()}" not found or expired`;
          console.warn(`[OfferEngine] ${couponError}`);
        } else {
          // Check if usage limit reached
          if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            couponError = `Coupon "${coupon.code}" has reached its usage limit`;
            console.warn(`[OfferEngine] ${couponError}`);
          } else if (coupon.minCartValue && effectiveBase < coupon.minCartValue) {
            // Check minimum cart value
            couponError = `Coupon "${coupon.code}" requires minimum cart value of ₹${coupon.minCartValue}. Current cart value is ₹${Math.round(effectiveBase)}`;
            console.warn(`[OfferEngine] ${couponError}`);
          } else {
            let discountAmount = 0;
            
            if (coupon.discountType === DiscountType.PERCENTAGE) {
              discountAmount = effectiveBase * (coupon.discountValue / 100);
              if (coupon.maxDiscount) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscount);
              }
            } else {
              discountAmount = Math.min(coupon.discountValue, effectiveBase);
            }

            if (discountAmount > 0) {
              effectiveBase -= discountAmount;
              couponDiscount = {
                ruleCode: coupon.code,
                description: `Coupon ${coupon.code} (${coupon.discountType === DiscountType.PERCENTAGE ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} OFF)`,
                savings: discountAmount,
              };
              priceComponents.push({
                label: couponDiscount.description,
                amount: -discountAmount,
              });
              console.log(`[OfferEngine] Coupon "${coupon.code}" applied successfully. Discount: ₹${discountAmount}`);
            } else {
              couponError = `Coupon "${coupon.code}" discount could not be calculated`;
            }
          }
        }
      } catch (couponErrorException: any) {
        // If coupon query fails, log but don't break the offer calculation
        couponError = `Failed to validate coupon: ${couponErrorException?.message || 'Unknown error'}`;
        console.error('[OfferEngine] Coupon query failed:', couponErrorException);
      }
    }

    const finalPayable = Math.max(0, Math.round(effectiveBase));

    // 5. DYNAMIC UPSELL ENGINE (DUE) - Evaluates AFTER all discounts
    // Does not modify totals, only suggests upsell opportunities
    const upsell = await this.evaluateUpsellEngine(
      organizationId,
      finalPayable,
      input.frame,
      input.lens
    );

    return {
      frameMRP,
      lensPrice,
      baseTotal,
      effectiveBase,
      offersApplied,
      priceComponents,
      categoryDiscount,
      couponDiscount,
      couponError: couponError || null,
      secondPairDiscount,
      finalPayable,
      upsell, // V3: Dynamic Upsell Engine result
    };
  }

  /**
   * Find applicable primary offer rule (COMBO > YOPO > FREE > PERCENT/FLAT)
   */
  private async findApplicablePrimaryRule(
    input: OfferCalculationInput
  ): Promise<any | null> {
    const { frame, lens, organizationId } = input;
    const now = new Date();

    // V2: Fetch all active rules, ordered by priority (lower = higher priority)
    // Filter by offer types in priority order: COMBO_PRICE, YOPO, FREE_LENS, PERCENT_OFF, FLAT_OFF
    const priorityOrder: string[] = [OfferType.COMBO_PRICE, OfferType.YOPO, OfferType.FREE_LENS, OfferType.PERCENT_OFF, OfferType.FLAT_OFF];
    
    const allRules = await prisma.offerRule.findMany({
      where: {
        organizationId,
        isActive: true,
        offerType: { in: priorityOrder },
      },
      orderBy: {
        priority: 'asc',
      },
    });
    
    // V2: Sort by priority order first, then by priority field
    const rules = allRules.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.offerType);
      const bIndex = priorityOrder.indexOf(b.offerType);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return Number(a.priority) - Number(b.priority);
    });

    // Filter by conditions and find first applicable
    for (const rule of rules) {
      if (this.isRuleApplicable(rule, frame, lens, now)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * V2: Check if a rule is applicable to the given frame + lens
   * Uses config-based logic and array fields
   */
  private isRuleApplicable(
    rule: any,
    frame: OfferCalculationInput['frame'],
    lens: OfferCalculationInput['lens'],
    now: Date
  ): boolean {
    // Date checks (if startDate/endDate exist in config)
    const config = rule.config as any || {};
    if (config.startDate && now < new Date(config.startDate)) return false;
    if (config.endDate && now > new Date(config.endDate)) return false;

    // V2: Frame brands check (array)
    if (rule.frameBrands && rule.frameBrands.length > 0) {
      if (!rule.frameBrands.includes(frame.brand) && !rule.frameBrands.includes('*')) {
        return false;
      }
    }

    // V2: Frame sub-categories check (array)
    if (rule.frameSubCategories && rule.frameSubCategories.length > 0) {
      if (frame.subCategory && !rule.frameSubCategories.includes(frame.subCategory)) {
        return false;
      }
    }

    // Frame MRP range check
    if (rule.minFrameMRP != null && frame.mrp < rule.minFrameMRP) return false;
    if (rule.maxFrameMRP != null && frame.mrp > rule.maxFrameMRP) return false;

    // V2: Lens brand lines check (array)
    if (rule.lensBrandLines && rule.lensBrandLines.length > 0) {
      if (!rule.lensBrandLines.includes(lens.brandLine)) return false;
    }

    // V2: Mandatory validations per spec
    // YOPO cannot run after Combo (handled in priority)
    if (rule.offerType === 'YOPO' && !lens.yopoEligible) return false;

    // Free Lens must define ruleType in config
    if (rule.offerType === 'FREE_LENS' && !config.ruleType) return false;

    // BOG50 requires brand or category
    if (rule.offerType === 'BOG50' && (!config.eligibleBrands && !config.eligibleCategories)) {
      return false;
    }

    // BonusProduct requires bonusLimit and category
    if (rule.offerType === 'BONUS_FREE_PRODUCT' && (!config.bonusLimit || !config.bonusCategory)) {
      return false;
    }

    return true;
  }

  /**
   * V2: Apply primary offer rule using config-based logic
   * Handles all 8 offer types according to V2 spec
   */
  private applyPrimaryRule(
    rule: any,
    frameMRP: number,
    lensPrice: number
  ): { newTotal: number; savings: number; label: string; locksFurtherEvaluation?: boolean } {
    const baseTotal = frameMRP + lensPrice;
    const config = rule.config as any || {};

    // V2: Use offerType string (from OfferType enum)
    switch (rule.offerType) {
      case 'COMBO_PRICE':
        // V2: Combo config - fixed price for Frame + Lens
        const comboPrice = config.comboPrice || baseTotal;
        const comboSavings = Math.max(0, baseTotal - comboPrice);
        return {
          newTotal: comboPrice,
          savings: comboSavings,
          label: `Combo Price: ₹${comboPrice}`,
          locksFurtherEvaluation: config.lockOtherOffers !== false, // Default true
        };

      case 'YOPO':
        // V2: YOPO config - pay higher value
        const yopoPrice = Math.max(frameMRP, lensPrice);
        const yopoSavings = baseTotal - yopoPrice;
        return {
          newTotal: yopoPrice,
          savings: yopoSavings,
          label: 'YOPO - Pay higher of frame or lens',
          locksFurtherEvaluation: true, // YOPO locks further evaluation
        };

      case 'FREE_LENS':
        // V2: Free Lens config - percent/value limit-based
        let freeLensSavings = 0;
        if (config.ruleType === 'PERCENT_OF_FRAME') {
          const maxFreeValue = frameMRP * (config.percentLimit || 0.4);
          freeLensSavings = Math.min(lensPrice, maxFreeValue);
        } else if (config.ruleType === 'VALUE_LIMIT') {
          freeLensSavings = Math.min(lensPrice, config.valueLimit || 0);
        } else {
          freeLensSavings = lensPrice; // Fully free
        }
        return {
          newTotal: baseTotal - freeLensSavings,
          savings: freeLensSavings,
          label: `Free Lens (${config.ruleType || 'FULL'})`,
        };

      case 'PERCENT_OFF':
        // V2: Percent config
        const discountPercent = config.discountPercent || rule.discountValue || 0;
        let percentBase = baseTotal;
        if (config.appliesTo === 'FRAME_ONLY') {
          percentBase = frameMRP;
        } else if (config.appliesTo === 'LENS_ONLY') {
          percentBase = lensPrice;
        }
        const percentSavings = (percentBase * discountPercent) / 100;
        return {
          newTotal: baseTotal - percentSavings,
          savings: percentSavings,
          label: `${discountPercent}% OFF${config.appliesTo ? ` (${config.appliesTo})` : ''}`,
        };

      case 'FLAT_OFF':
        // V2: Flat config
        const flatAmount = config.flatAmount || rule.discountValue || 0;
        const minBillValue = config.minBillValue || 0;
        if (baseTotal < minBillValue) {
          return { newTotal: baseTotal, savings: 0, label: 'Flat OFF (min bill not met)' };
        }
        const flatSavings = Math.min(flatAmount, baseTotal);
        return {
          newTotal: baseTotal - flatSavings,
          savings: flatSavings,
          label: `Flat ₹${flatAmount} OFF`,
        };

      case 'BOG50':
        // Handled separately in second pair logic
        return { newTotal: baseTotal, savings: 0, label: 'BOG50 (second pair)' };

      case 'CATEGORY_DISCOUNT':
        // Handled separately in category discount logic
        return { newTotal: baseTotal, savings: 0, label: 'Category Discount' };

      case 'BONUS_FREE_PRODUCT':
        // Handled separately in bonus product logic
        return { newTotal: baseTotal, savings: 0, label: 'Bonus Free Product' };

      default:
        return { newTotal: baseTotal, savings: 0, label: 'No primary offer' };
    }
  }

  /**
   * V2: Find applicable second pair rule (BOG50)
   */
  private async findApplicableSecondPairRule(
    input: OfferCalculationInput
  ): Promise<any | null> {
    const { organizationId } = input;
    const now = new Date();

    const rules = await prisma.offerRule.findMany({
      where: {
        organizationId,
        isActive: true,
        offerType: 'BOG50',
      },
      orderBy: {
        priority: 'asc',
      },
    });

    return rules[0] || null; // Take first applicable second pair rule
  }

  /**
   * Apply second pair rule
   */
  private applySecondPairRule(
    rule: any,
    secondPair: NonNullable<OfferCalculationInput['secondPair']>
  ): { savings: number; label: string } {
    const first = secondPair.firstPairTotal;
    const second = (secondPair.secondPairFrameMRP || 0) + (secondPair.secondPairLensPrice || 0);
    const lower = Math.min(first, second);

    if (rule.secondPairPercent) {
      const savings = (lower * rule.secondPairPercent) / 100;
      return {
        savings,
        label: `Second pair ${rule.secondPairPercent}% off (lower value)`,
      };
    }

    return { savings: 0, label: 'No second pair benefit' };
  }

  /**
   * Apply category discount
   */
  private applyCategoryDiscount(effectiveBase: number, catDisc: any): number {
    const discountAmount = (effectiveBase * catDisc.discountPercent) / 100;
    if (catDisc.maxDiscount && discountAmount > catDisc.maxDiscount) {
      return catDisc.maxDiscount;
    }
    return discountAmount;
  }

  /**
   * Apply coupon discount
   */
  private applyCouponDiscount(effectiveBase: number, coupon: any): number {
    // Check min cart value
    if (coupon.minCartValue && effectiveBase < coupon.minCartValue) {
      return 0;
    }

    let discountAmount = 0;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (effectiveBase * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === DiscountType.FLAT_AMOUNT) {
      discountAmount = Math.min(coupon.discountValue, effectiveBase);
    }

    return discountAmount;
  }

  /**
   * V3: Dynamic Upsell Engine (DUE)
   * Evaluates all offer rules with upsell thresholds and returns the BEST upsell opportunity
   * based on remaining spend vs reward value.
   * Does NOT modify totals - only suggests opportunities.
   */
  private async evaluateUpsellEngine(
    organizationId: string,
    currentTotal: number,
    frame: any,
    lens: any
  ): Promise<UpsellSuggestion | null> {
    try {
      // Find all active offer rules with upsell enabled
      const upsellRules = await prisma.offerRule.findMany({
        where: {
          organizationId,
          isActive: true,
          upsellEnabled: true,
          upsellThreshold: { not: null },
          upsellRewardText: { not: null },
          // V2: Check if rule matches current frame/lens (using frameBrands array)
          OR: [
            { frameBrands: { has: frame.brand } },
            { frameBrands: { has: '*' } }, // Universal rule
            { frameBrands: { equals: [] } }, // No brand restriction (empty array)
          ],
        },
        orderBy: {
          priority: 'asc',
        },
      });

      if (upsellRules.length === 0) {
        return null;
      }

      // Evaluate each rule and find the best opportunity
      let bestUpsell: {
        remaining: number;
        rewardText: string;
        message: string;
        type: 'BONUS_FREE_PRODUCT' | 'UPGRADE_LENS' | 'ADD_ON_FEATURE';
      } | null = null;

      for (const rule of upsellRules) {
        const threshold = typeof rule.upsellThreshold === 'number' ? rule.upsellThreshold : (typeof rule.upsellThreshold === 'object' && rule.upsellThreshold !== null && 'value' in rule.upsellThreshold ? Number((rule.upsellThreshold as any).value) : 0);
        const remaining = threshold - currentTotal;

        // Only suggest if customer hasn't reached threshold yet
        if (remaining > 0) {
          // Calculate reward value (could be from config or rewardText parsing)
          const rewardText = typeof rule.upsellRewardText === 'string' ? rule.upsellRewardText : (typeof rule.upsellRewardText === 'object' && rule.upsellRewardText !== null && 'text' in rule.upsellRewardText ? String((rule.upsellRewardText as any).text) : '');
          const rewardValue = this.extractRewardValue(rewardText);
          
          // Best upsell = highest reward value / remaining amount ratio
          const valueRatio = rewardValue / remaining;

          if (!bestUpsell || valueRatio > this.extractRewardValue(bestUpsell.rewardText) / bestUpsell.remaining) {
            const rewardTextStr = typeof rule.upsellRewardText === 'string' ? rule.upsellRewardText : (typeof rule.upsellRewardText === 'object' && rule.upsellRewardText !== null && 'text' in rule.upsellRewardText ? String((rule.upsellRewardText as any).text) : 'Free Product');
            bestUpsell = {
              remaining: Math.round(remaining),
              rewardText: rewardTextStr,
              message: `Add ₹${Math.round(remaining)} more to unlock ${rewardTextStr || 'this reward'}`,
              type: this.determineUpsellType(rule.offerType),
            };
          }
        }
      }

      if (!bestUpsell) {
        return null;
      }

      return {
        type: bestUpsell.type,
        message: bestUpsell.message,
        rewardText: bestUpsell.rewardText,
        remaining: bestUpsell.remaining,
      };
    } catch (error) {
      console.error('Error evaluating upsell engine:', error);
      return null;
    }
  }

  /**
   * Extract reward value from reward text (e.g., "FREE Sunglasses worth ₹1499" -> 1499)
   */
  private extractRewardValue(rewardText: string): number {
    const match = rewardText.match(/₹(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Determine upsell type based on offer type
   */
  private determineUpsellType(offerType: string): 'BONUS_FREE_PRODUCT' | 'UPGRADE_LENS' | 'ADD_ON_FEATURE' {
    const type = offerType.toUpperCase();
    if (type.includes('BONUS') || type.includes('FREE')) {
      return 'BONUS_FREE_PRODUCT';
    }
    if (type.includes('UPGRADE') || type.includes('LENS')) {
      return 'UPGRADE_LENS';
    }
    return 'ADD_ON_FEATURE';
  }
}

export const offerEngineService = new OfferEngineService();

