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
  ContactLensItem,
  AccessoryItem,
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
   * Supports frame+lens, lens-only ("Only Lens"), and CONTACT_LENS_ONLY modes
   */
  async calculateOffers(input: OfferCalculationInput): Promise<OfferCalculationResult> {
    const { frame, lens, organizationId, mode, otherItems } = input;
    
    // Handle CONTACT_LENS_ONLY mode
    if (mode === 'CONTACT_LENS_ONLY' && otherItems) {
      return this.calculateContactLensOffers(input, otherItems);
    }
    
    const frameMRP = frame?.mrp || 0; // Default to 0 for lens-only flow
    const lensPrice = lens?.price || 0;
    const baseTotal = frameMRP + lensPrice;
    const isLensOnly = !frame || frameMRP === 0;

    // Initialize result structure
    const priceComponents: PriceComponent[] = [];
    if (!isLensOnly) {
      priceComponents.push({ label: 'Frame MRP', amount: frameMRP });
    }
    priceComponents.push({ label: 'Lens Offer Price', amount: lensPrice });

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
        // For lens-only, use lens brandLine or universal discount
        const brandCode = isLensOnly ? (lens?.brandLine || '*') : frame?.brand;
        const catDiscount = await prisma.categoryDiscount.findFirst({
          where: {
            organizationId: organizationId as any,
            customerCategory: input.customerCategory as any,
            isActive: true as any,
            OR: [
              ...(brandCode ? [{ brandCode: brandCode as any }] : []),
              { brandCode: '*' as any }, // Universal discount
            ],
          } as any,
          orderBy: {
            discountPercent: 'desc' as any, // Prefer higher discount
          } as any,
        }) as any;

        if (catDiscount) {
          const discountPercent = typeof catDiscount.discountPercent === 'number' 
            ? catDiscount.discountPercent 
            : parseFloat(String(catDiscount.discountPercent || 0));
          const maxDiscount = typeof catDiscount.maxDiscount === 'number'
            ? catDiscount.maxDiscount
            : parseFloat(String(catDiscount.maxDiscount || 0));
          
          const discountAmount = Math.min(
            effectiveBase * (discountPercent / 100),
            maxDiscount || effectiveBase
          );
          
          if (discountAmount > 0 && catDiscount) {
            effectiveBase -= discountAmount;
            const newCategoryDiscount = {
              ruleCode: 'CATEGORY',
              description: `${input.customerCategory} Discount (${discountPercent}%)`,
              savings: discountAmount,
              // Add verification fields for ID proof requirement
              verificationRequired: catDiscount.categoryVerificationRequired || false,
              allowedIdTypes: catDiscount.allowedIdTypes || [],
            } as any; // Type assertion to include extra fields
            categoryDiscount = newCategoryDiscount;
            priceComponents.push({
              label: newCategoryDiscount.description,
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
            organizationId: organizationId as any,
            code: input.couponCode.toUpperCase().trim() as any,
            isActive: true as any,
          } as any,
        }) as any;

        // Check usage limit and apply coupon
        if (!coupon) {
          couponError = `Coupon code "${input.couponCode.toUpperCase()}" not found or expired`;
          console.warn(`[OfferEngine] ${couponError}`);
        } else {
          // Check validity dates
          const validFrom = coupon.validFrom ? new Date(coupon.validFrom as any) : null;
          const validUntil = coupon.validUntil ? new Date(coupon.validUntil as any) : null;
          
          if (validFrom && validFrom > now) {
            couponError = `Coupon "${coupon.code}" is not yet valid`;
            console.warn(`[OfferEngine] ${couponError}`);
          } else if (validUntil && validUntil < now) {
            couponError = `Coupon "${coupon.code}" has expired`;
            console.warn(`[OfferEngine] ${couponError}`);
          } else {
            // Check if usage limit reached
            const usageLimit = typeof coupon.usageLimit === 'number' ? coupon.usageLimit : null;
            const usedCount = typeof coupon.usedCount === 'number' ? coupon.usedCount : 0;
            
            if (usageLimit !== null && usedCount >= usageLimit) {
              couponError = `Coupon "${coupon.code}" has reached its usage limit`;
              console.warn(`[OfferEngine] ${couponError}`);
            } else {
              const minCartValue = typeof coupon.minCartValue === 'number' ? coupon.minCartValue : null;
              
              if (minCartValue && effectiveBase < minCartValue) {
                // Check minimum cart value
                couponError = `Coupon "${coupon.code}" requires minimum cart value of ₹${minCartValue}. Current cart value is ₹${Math.round(effectiveBase)}`;
                console.warn(`[OfferEngine] ${couponError}`);
              } else {
                let discountAmount = 0;
                const discountType = String(coupon.discountType || '');
                const discountValue = typeof coupon.discountValue === 'number' 
                  ? coupon.discountValue 
                  : parseFloat(String(coupon.discountValue || 0));
                const maxDiscount = typeof coupon.maxDiscount === 'number' 
                  ? coupon.maxDiscount 
                  : null;
                
                if (discountType === DiscountType.PERCENTAGE) {
                  discountAmount = effectiveBase * (discountValue / 100);
                  if (maxDiscount) {
                    discountAmount = Math.min(discountAmount, maxDiscount);
                  }
                } else {
                  discountAmount = Math.min(discountValue, effectiveBase);
                }

                if (discountAmount > 0) {
                  effectiveBase -= discountAmount;
                  const couponCode = String(coupon.code || '');
                  couponDiscount = {
                    ruleCode: couponCode,
                    description: `Coupon ${couponCode} (${discountType === DiscountType.PERCENTAGE ? `${discountValue}%` : `₹${discountValue}`} OFF)`,
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
          }
        }
      } catch (couponErrorException: any) {
        // If coupon query fails, log but don't break the offer calculation
        couponError = `Failed to validate coupon: ${couponErrorException?.message || 'Unknown error'}`;
        console.error('[OfferEngine] Coupon query failed:', couponErrorException);
      }
    }

    // 5. BONUS FREE PRODUCT (after all discounts, before upsell)
    // Bonus products don't reduce price, they're free add-ons
    let bonusProduct: OfferApplied | null = null;
    try {
      const bonusRules = await prisma.offerRule.findMany({
        where: {
          organizationId,
          isActive: true,
          offerType: OfferType.BONUS_FREE_PRODUCT,
        } as any,
        orderBy: { priority: 'asc' },
      });

      for (const rule of bonusRules) {
        const config = rule.config as any;
        const triggerMinBill = config.triggerMinBill || 0;
        const bonusLimit = config.bonusLimit || 0; // Value limit (e.g., ₹1499)
        const bonusCategory = config.bonusCategory || 'ACCESSORY'; // FRAME, SUNGLASS, CONTACT_LENS, ACCESSORY
        const eligibleBrands = config.eligibleBrands || []; // Optional brand filter
        const eligibleCategories = config.eligibleCategories || []; // Optional category filter

        // Check if bill value meets trigger threshold
        if (effectiveBase >= triggerMinBill) {
          // Check brand/category filters if specified
          let brandMatch = true;
          let categoryMatch = true;

          if (eligibleBrands.length > 0) {
            const frameBrand = frame?.brand || '';
            const lensBrandLine = lens?.brandLine || '';
            brandMatch = eligibleBrands.includes(frameBrand) || 
                        eligibleBrands.includes(lensBrandLine) ||
                        eligibleBrands.includes('*'); // Universal
          }

          if (eligibleCategories.length > 0) {
            // Check frame sub-category or lens category
            const frameSubCat = frame?.subCategory || '';
            categoryMatch = eligibleCategories.includes(frameSubCat) ||
                           eligibleCategories.includes('*'); // Universal
          }

          if (brandMatch && categoryMatch) {
            bonusProduct = {
              ruleCode: rule.code,
              description: `Bonus: Free ${bonusCategory} worth up to ₹${bonusLimit}`,
              savings: 0, // Bonus doesn't reduce price, it's a free add-on
            };
            offersApplied.push(bonusProduct);
            break; // Apply only first applicable bonus
          }
        }
      }
    } catch (bonusError: any) {
      console.warn('[OfferEngine] Bonus product query failed:', bonusError?.message);
    }

    const finalPayable = Math.max(0, Math.round(effectiveBase));

    // 6. DYNAMIC UPSELL ENGINE (DUE) - Evaluates AFTER all discounts
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
      bonusProduct, // Bonus free product (if applicable)
      finalPayable,
      upsell, // V3: Dynamic Upsell Engine result
    };
  }

  /**
   * Find applicable primary offer rule (COMBO > YOPO > FREE > PERCENT/FLAT)
   * Supports lens-only scenarios (frame is optional)
   * Made public for offer simulator
   */
  async findApplicablePrimaryRule(
    input: OfferCalculationInput
  ): Promise<any | null | undefined> {
    const { frame, lens, organizationId, storeId } = input;
    const now = new Date();
    const isLensOnly = !frame || frame.mrp === 0;

    // V2: Fetch all active rules, ordered by priority (lower = higher priority)
    // Filter by offer types in priority order: COMBO_PRICE, YOPO, FREE_LENS, PERCENT_OFF, FLAT_OFF
    const priorityOrder: string[] = [OfferType.COMBO_PRICE, OfferType.YOPO, OfferType.FREE_LENS, OfferType.PERCENT_OFF, OfferType.FLAT_OFF];
    
    // Validate organizationId before querying
    if (!organizationId || organizationId.trim() === '' || !/^[0-9a-fA-F]{24}$/.test(organizationId)) {
      console.warn('[OfferEngine] Invalid organizationId, skipping rule lookup');
      return null;
    }

    const allRules = await prisma.offerRule.findMany({
      where: {
        organizationId,
        isActive: true,
        offerType: { in: priorityOrder as any },
      } as any,
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

    // If storeId is provided, filter rules by store activation
    let storeActivatedRuleIds: Set<string> | null = null;
    if (storeId && /^[0-9a-fA-F]{24}$/.test(storeId)) {
      try {
        const storeOfferMaps = await (prisma as any).storeOfferMap.findMany({
          where: {
            storeId,
            isActive: true,
          },
          select: {
            offerRuleId: true,
          },
        });
        storeActivatedRuleIds = new Set(storeOfferMaps.map((som: { offerRuleId: string }) => som.offerRuleId));
      } catch (error) {
        console.warn('[OfferEngine] Error fetching store offer maps:', error);
        // Continue without store filtering if query fails (backward compatible)
      }
    }

    // Filter by conditions and find first applicable
    for (const rule of rules) {
      // Check store activation if storeId is provided
      if (storeId && storeActivatedRuleIds) {
        // If store has specific activations, only apply those rules
        // If no store activations exist, apply all organization rules (backward compatible)
        if (storeActivatedRuleIds.size > 0 && !storeActivatedRuleIds.has(rule.id)) {
          continue; // Skip this rule - not activated for this store
        }
      }
      
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

    // For lens-only scenarios, skip frame-related checks unless rule explicitly allows it
    const isLensOnly = !frame || (frame.mrp || 0) === 0;

    // V2: Frame brands check (array)
    if (rule.frameBrands && rule.frameBrands.length > 0) {
      // For lens-only, only allow rules with '*' (universal) or empty array
      if (isLensOnly) {
        if (!rule.frameBrands.includes('*') && rule.frameBrands.length > 0) {
          return false;
        }
      } else if (frame) {
        if (!rule.frameBrands.includes(frame.brand) && !rule.frameBrands.includes('*')) {
          return false;
        }
      }
    }

    // V2: Frame sub-categories check (array)
    if (rule.frameSubCategories && rule.frameSubCategories.length > 0) {
      if (isLensOnly) {
        // Skip sub-category check for lens-only
        return false;
      } else if (frame && frame.subCategory && !rule.frameSubCategories.includes(frame.subCategory)) {
        return false;
      }
    }

    // Frame MRP range check
    if (!isLensOnly && frame) {
      if (rule.minFrameMRP != null && frame.mrp < rule.minFrameMRP) return false;
      if (rule.maxFrameMRP != null && frame.mrp > rule.maxFrameMRP) return false;
    } else if (isLensOnly && (rule.minFrameMRP != null || rule.maxFrameMRP != null)) {
      // If rule requires frame MRP range but we're in lens-only mode, skip this rule
      return false;
    }

    // V2: Lens brand lines check (array)
    if (rule.lensBrandLines && rule.lensBrandLines.length > 0) {
      if (!lens || !rule.lensBrandLines.includes(lens.brandLine)) return false;
    }

    // Enhanced Combo Price matching logic
    if (rule.offerType === 'COMBO_PRICE') {
      const comboType = config.comboType;
      
      // Brand-line combo: Match frame sub-category + lens brand line
      if (comboType === 'BRAND_LINE_COMBO') {
        if (!frame || !lens) return false;
        const requiredFrameSubCat = config.requiredFrameSubCategory;
        const requiredLensBrandLine = config.requiredLensBrandLine;
        
        if (requiredFrameSubCat && frame.subCategory !== requiredFrameSubCat) return false;
        if (requiredLensBrandLine && lens.brandLine !== requiredLensBrandLine) return false;
      }
      
      // Frame category combo: Match frame category + lens brand line
      if (comboType === 'FRAME_CATEGORY_COMBO') {
        if (!frame || !lens) return false;
        const requiredFrameCategory = config.requiredFrameCategory; // e.g., "LUXURY", "ESSENTIAL"
        const requiredLensBrandLine = config.requiredLensBrandLine;
        
        // Check if frame sub-category matches required category
        if (requiredFrameCategory && frame.subCategory !== requiredFrameCategory) {
          // Also check if frame brand matches category pattern
          if (!frame.brand?.toUpperCase().includes(requiredFrameCategory)) return false;
        }
        if (requiredLensBrandLine && lens.brandLine !== requiredLensBrandLine) return false;
      }
      
      // Vision-type combo: Match vision type + lens brand line
      if (comboType === 'VISION_TYPE_COMBO') {
        if (!lens) return false;
        const requiredVisionType = config.requiredVisionType;
        const requiredLensBrandLine = config.requiredLensBrandLine;
        
        // Vision type would need to be passed in lens input or derived
        // For now, check lens brand line matches
        if (requiredLensBrandLine && lens.brandLine !== requiredLensBrandLine) return false;
      }
      
      // Frame MRP only combo: Any frame + specific lens brand line
      if (comboType === 'FRAME_MRP_ONLY') {
        if (!frame || !lens) return false;
        const requiredLensBrandLine = config.requiredLensBrandLine;
        if (requiredLensBrandLine && lens.brandLine !== requiredLensBrandLine) return false;
      }
    }

    // V2: Mandatory validations per spec
    // YOPO cannot run after Combo (handled in priority)
    if (rule.offerType === 'YOPO' && (!lens || !lens.yopoEligible)) return false;

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
   * Supports lens-only scenarios (frameMRP can be 0)
   */
  private applyPrimaryRule(
    rule: any,
    frameMRP: number,
    lensPrice: number
  ): { newTotal: number; savings: number; label: string; locksFurtherEvaluation?: boolean; meta?: Record<string, any> } {
    const baseTotal = frameMRP + lensPrice;
    const config = rule.config as any || {};
    const isLensOnly = frameMRP === 0;

    // V2: Use offerType string (from OfferType enum)
    switch (rule.offerType) {
      case 'COMBO_PRICE':
        // Enhanced Combo config - supports multiple combo types:
        // 1. Fixed price (comboPrice)
        // 2. Brand-line combos (frameSubCategory + lensBrandLine)
        // 3. Frame category combos (frameCategory + lensBrandLine)
        // 4. Vision-type combos (visionType + lensBrandLine)
        // 5. Frame MRP only (comboPrice = frameMRP)
        
        // For lens-only, combo doesn't apply (requires frame)
        if (isLensOnly) {
          return { newTotal: baseTotal, savings: 0, label: 'Combo Price (not applicable for lens-only)' };
        }
        
        let comboPrice: number;
        let comboLabel: string;
        
        // Check for brand-line combo (e.g., "Frame Essential + BlueXpert = Frame MRP only")
        if (config.comboType === 'FRAME_MRP_ONLY') {
          comboPrice = frameMRP;
          comboLabel = `Combo: Frame MRP Only (Lens Free)`;
        }
        // Check for specific brand-line combo price
        else if (config.comboType === 'BRAND_LINE_COMBO' && config.brandLineComboPrice) {
          comboPrice = typeof config.brandLineComboPrice === 'number' 
            ? config.brandLineComboPrice 
            : parseFloat(config.brandLineComboPrice);
          comboLabel = `Combo: Brand-Line Special Price`;
        }
        // Check for frame category combo (e.g., "Luxury Frame + DIGI360 = ₹1499")
        else if (config.comboType === 'FRAME_CATEGORY_COMBO' && config.frameCategoryComboPrice) {
          comboPrice = typeof config.frameCategoryComboPrice === 'number'
            ? config.frameCategoryComboPrice
            : parseFloat(config.frameCategoryComboPrice);
          comboLabel = `Combo: Frame Category Special Price`;
        }
        // Check for vision-type combo (e.g., "Tint NEXT + Any Frame = ₹899")
        else if (config.comboType === 'VISION_TYPE_COMBO' && config.visionTypeComboPrice) {
          comboPrice = typeof config.visionTypeComboPrice === 'number'
            ? config.visionTypeComboPrice
            : parseFloat(config.visionTypeComboPrice);
          comboLabel = `Combo: Vision Type Special Price`;
        }
        // Default: Fixed combo price
        else {
          comboPrice = config.comboPrice || baseTotal;
          comboLabel = `Combo Price: ₹${comboPrice}`;
        }
        
        const comboSavings = Math.max(0, baseTotal - comboPrice);
        return {
          newTotal: comboPrice,
          savings: comboSavings,
          label: comboLabel,
          locksFurtherEvaluation: config.lockOtherOffers !== false, // Default true
        };

      case 'YOPO':
        // V2: YOPO config - pay higher value
        // For lens-only, YOPO applies to lens price only
        if (isLensOnly) {
          return {
            newTotal: lensPrice,
            savings: 0,
            label: 'YOPO - Lens only (no frame)',
            locksFurtherEvaluation: true,
          };
        }
        
        // Advanced YOPO logic with FreeUnderYOPO support
        const freeUnderYOPO = config.freeUnderYOPO || 'BEST_OF'; // FRAME | LENS | BEST_OF
        const bonusFreeAllowed = config.bonusFreeAllowed !== false; // Default true
        
        let yopoPrice: number;
        let freeItem: 'FRAME' | 'LENS' | 'BEST_OF';
        let label: string;
        
        if (freeUnderYOPO === 'FRAME') {
          // Frame is free, customer pays lens price
          yopoPrice = lensPrice;
          freeItem = 'FRAME';
          label = 'YOPO - Frame Free (Pay Lens Price)';
        } else if (freeUnderYOPO === 'LENS') {
          // Lens is free, customer pays frame price
          yopoPrice = frameMRP;
          freeItem = 'LENS';
          label = 'YOPO - Lens Free (Pay Frame Price)';
        } else {
          // BEST_OF: Pay higher of frame or lens (original logic)
          yopoPrice = Math.max(frameMRP, lensPrice);
          freeItem = frameMRP > lensPrice ? 'LENS' : 'FRAME';
          label = `YOPO - Pay higher of frame or lens (${freeItem} free)`;
        }
        
        const yopoSavings = baseTotal - yopoPrice;
        
        // If bonus free product is allowed and configured, it will be handled separately
        // in the bonus free product logic
        
        return {
          newTotal: yopoPrice,
          savings: yopoSavings,
          label: label,
          locksFurtherEvaluation: true, // YOPO locks further evaluation
          meta: {
            freeUnderYOPO: freeItem,
            bonusFreeAllowed: bonusFreeAllowed,
          },
        };

      case 'FREE_LENS':
        // V2: Free Lens config - percent/value limit-based
        // For lens-only, PERCENT_OF_FRAME doesn't apply
        let freeLensSavings = 0;
        if (isLensOnly && config.ruleType === 'PERCENT_OF_FRAME') {
          // Skip PERCENT_OF_FRAME for lens-only flow
          return { newTotal: baseTotal, savings: 0, label: 'Free Lens (not applicable for lens-only)' };
        }
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
    const { organizationId, storeId } = input;
    const now = new Date();

    const rules = await prisma.offerRule.findMany({
      where: {
        organizationId,
        isActive: true,
        offerType: 'BOG50',
      } as any,
      orderBy: {
        priority: 'asc',
      },
    });

    // Filter by store activation if storeId is provided
    if (storeId && /^[0-9a-fA-F]{24}$/.test(storeId)) {
      try {
        const storeOfferMaps = await (prisma as any).storeOfferMap.findMany({
          where: {
            storeId,
            isActive: true,
          },
          select: {
            offerRuleId: true,
          },
        });
        const storeActivatedRuleIds = new Set(storeOfferMaps.map((som: { offerRuleId: string }) => som.offerRuleId));
        
        if (storeActivatedRuleIds.size > 0) {
          const filteredRules = rules.filter((rule) => storeActivatedRuleIds.has(rule.id));
          return filteredRules[0] || null;
        }
      } catch (error) {
        console.warn('[OfferEngine] Error fetching store offer maps for second pair:', error);
      }
    }

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
    frame: any | null | undefined,
    lens: any
  ): Promise<UpsellSuggestion | null> {
    try {
      // Find all active offer rules with upsell enabled
      // For lens-only flow, frame is null, so we skip frame brand checks
      const whereClause: any = {
        organizationId,
        isActive: true,
        upsellEnabled: true,
        upsellThreshold: { not: null },
        upsellRewardText: { not: null },
      };
      
      // Only add frame brand filter if frame exists
      if (frame && frame.brand) {
        whereClause.OR = [
          { frameBrands: { has: frame.brand } },
          { frameBrands: { has: '*' } }, // Universal rule
          { frameBrands: { equals: [] } }, // No brand restriction (empty array)
        ];
      } else {
        // For lens-only, only match universal rules or rules with no frame brand restriction
        whereClause.OR = [
          { frameBrands: { has: '*' } }, // Universal rule
          { frameBrands: { equals: [] } }, // No brand restriction (empty array)
        ];
      }
      
      const upsellRules = await prisma.offerRule.findMany({
        where: whereClause,
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

  /**
   * Calculate offers for CONTACT_LENS_ONLY mode
   * Applies CL brand offers, combos, coupons, category discounts, bonus free products
   * Does NOT apply frame-based offers, YOPO, or lens offers
   */
  private async calculateContactLensOffers(
    input: OfferCalculationInput,
    items: (ContactLensItem | AccessoryItem)[]
  ): Promise<OfferCalculationResult> {
    const { organizationId, customerCategory, couponCode } = input;
    
    // Calculate base total from all items
    const baseTotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
    
    const priceComponents: PriceComponent[] = items.map(item => ({
      label: `${item.type === 'CONTACT_LENS' ? 'Contact Lens' : 'Accessory'} - ${item.brand}`,
      amount: item.finalPrice,
    }));
    
    let effectiveBase = baseTotal;
    const offersApplied: OfferApplied[] = [];
    
    // Separate CL items and accessories
    const clItems = items.filter(item => item.type === 'CONTACT_LENS') as ContactLensItem[];
    const accessoryItems = items.filter(item => item.type === 'ACCESSORY') as AccessoryItem[];
    
    // 1. CHECK FOR PACK + SOLUTION COMBO OFFERS (Priority: Highest)
    const hasSolution = accessoryItems.some(a => 
      a.brand.toLowerCase().includes('solution') || 
      a.brand.toLowerCase().includes('cleaning')
    );
    
    if (hasSolution && clItems.length > 0) {
      // Find combo rules for CL pack + Solution
      const comboRules = await prisma.offerRule.findMany({
        where: {
          organizationId,
          isActive: true,
          offerType: OfferType.COMBO_PRICE,
        } as any,
        orderBy: { priority: 'asc' },
      });
      
      for (const rule of comboRules) {
        const config = rule.config as any;
        // Check if rule applies to CL brands in cart
        const clBrands = clItems.map(cl => cl.brand.toUpperCase());
        const ruleApplies = config.clBrands && 
          clBrands.some(brand => (config.clBrands as string[]).includes(brand));
        
        if (ruleApplies && config.comboPrice) {
          const comboPrice = typeof config.comboPrice === 'number' ? config.comboPrice : parseFloat(config.comboPrice);
          const clTotal = clItems.reduce((sum, cl) => sum + cl.finalPrice, 0);
          const solutionTotal = accessoryItems
            .filter(a => a.brand.toLowerCase().includes('solution') || a.brand.toLowerCase().includes('cleaning'))
            .reduce((sum, a) => sum + a.finalPrice, 0);
          
          if (clTotal + solutionTotal > comboPrice) {
            const savings = (clTotal + solutionTotal) - comboPrice;
            effectiveBase -= savings;
            offersApplied.push({
              ruleCode: rule.code,
              description: `Combo Offer: ${rule.code}`,
              savings,
            });
            priceComponents.push({
              label: `Combo Offer: ${rule.code}`,
              amount: -savings,
            });
            break; // Apply only first applicable combo
          }
        }
      }
    }
    
    // 2. APPLY CL BRAND DISCOUNTS (PERCENT_OFF, FLAT_OFF)
    for (const clItem of clItems) {
      // Find applicable rules for this CL brand
      const brandRules = await prisma.offerRule.findMany({
        where: {
          organizationId,
          isActive: true,
          offerType: { in: [OfferType.PERCENT_OFF, OfferType.FLAT_OFF] },
        } as any,
        orderBy: { priority: 'asc' },
      });
      
      for (const rule of brandRules) {
        const config = rule.config as any;
        
        // Check if rule applies to this brand
        const ruleApplies = config.clBrands && 
          (config.clBrands as string[]).includes(clItem.brand.toUpperCase());
        
        if (ruleApplies) {
          let discount = 0;
          
          if (rule.offerType === OfferType.PERCENT_OFF && config.discountPercent) {
            const percent = typeof config.discountPercent === 'number' 
              ? config.discountPercent 
              : parseFloat(config.discountPercent);
            discount = clItem.finalPrice * (percent / 100);
            
            // Apply max discount cap if specified
            if (config.maxDiscount) {
              discount = Math.min(discount, config.maxDiscount);
            }
          } else if (rule.offerType === OfferType.FLAT_OFF && config.flatAmount) {
            const flatAmount = typeof config.flatAmount === 'number'
              ? config.flatAmount
              : parseFloat(config.flatAmount);
            
            // Check min bill value if specified
            if (!config.minBillValue || baseTotal >= config.minBillValue) {
              discount = Math.min(flatAmount, clItem.finalPrice);
            }
          }
          
          if (discount > 0) {
            effectiveBase -= discount;
            offersApplied.push({
              ruleCode: rule.code,
              description: `${rule.offerType === OfferType.PERCENT_OFF ? `${config.discountPercent}%` : `₹${config.flatAmount}`} OFF on ${clItem.brand}`,
              savings: discount,
            });
            priceComponents.push({
              label: `${rule.code} - ${clItem.brand}`,
              amount: -discount,
            });
            break; // Apply only first applicable rule per brand
          }
        }
      }
    }
    
    // 3. APPLY CATEGORY DISCOUNTS
    let categoryDiscount: OfferApplied | null = null;
    if (customerCategory) {
      try {
        // Find applicable category discount (brand-specific or universal *)
        const clBrands = clItems.map(cl => cl.brand.toUpperCase());
        let catDiscount = null;
        
        // Try brand-specific first
        for (const brand of clBrands) {
          catDiscount = await prisma.categoryDiscount.findFirst({
            where: {
              organizationId: organizationId as any,
              customerCategory: customerCategory as any,
              brandCode: brand as any,
              isActive: true as any,
            } as any,
          }) as any;
          if (catDiscount) break;
        }
        
        // Fallback to universal discount
        if (!catDiscount) {
          catDiscount = await prisma.categoryDiscount.findFirst({
            where: {
              organizationId: organizationId as any,
              customerCategory: customerCategory as any,
              brandCode: '*' as any,
              isActive: true as any,
            } as any,
            orderBy: {
              discountPercent: 'desc' as any,
            } as any,
          }) as any;
        }
        
        if (catDiscount) {
          const discountPercent = typeof catDiscount.discountPercent === 'number'
            ? catDiscount.discountPercent
            : parseFloat(String(catDiscount.discountPercent || 0));
          const maxDiscount = typeof catDiscount.maxDiscount === 'number'
            ? catDiscount.maxDiscount
            : null;
          
          const discountAmount = Math.min(
            effectiveBase * (discountPercent / 100),
            maxDiscount || Infinity
          );
          
          if (discountAmount > 0) {
            effectiveBase -= discountAmount;
            categoryDiscount = {
              ruleCode: `CATEGORY_${customerCategory}`,
              description: `${customerCategory} Discount (${discountPercent}%)`,
              savings: discountAmount,
            };
            priceComponents.push({
              label: `${customerCategory} Discount`,
              amount: -discountAmount,
            });
          }
        }
      } catch (error) {
        console.error('Error applying category discount:', error);
      }
    }
    
    // 4. APPLY COUPON IF PROVIDED
    let couponDiscount: OfferApplied | null = null;
    if (couponCode) {
      try {
        const coupon = await prisma.coupon.findFirst({
          where: {
            organizationId: organizationId as any,
            code: couponCode.toUpperCase() as any,
            isActive: true as any,
          } as any,
        }) as any;
        
        if (coupon) {
          // Check validity dates
          const now = new Date();
          const validFrom = coupon.validFrom ? new Date(coupon.validFrom as any) : null;
          const validUntil = coupon.validUntil ? new Date(coupon.validUntil as any) : null;
          
          if (validFrom && validFrom > now) {
            // Coupon not yet valid
          } else if (validUntil && validUntil < now) {
            // Coupon expired
          } else {
            // Check min cart value
            const minCartValue = typeof coupon.minCartValue === 'number' ? coupon.minCartValue : null;
            
            if (!minCartValue || effectiveBase >= minCartValue) {
              const discountType = String(coupon.discountType || '');
              const discountValue = typeof coupon.discountValue === 'number'
                ? coupon.discountValue
                : parseFloat(String(coupon.discountValue || 0));
              const maxDiscount = typeof coupon.maxDiscount === 'number'
                ? coupon.maxDiscount
                : null;
              
              const discount = discountType === 'PERCENTAGE'
                ? Math.min(effectiveBase * (discountValue / 100), maxDiscount || Infinity)
                : Math.min(discountValue, effectiveBase);
              
              if (discount > 0) {
                effectiveBase -= discount;
                const couponCodeStr = String(coupon.code || '');
                couponDiscount = {
                  ruleCode: couponCodeStr,
                  description: `Coupon: ${couponCodeStr}`,
                  savings: discount,
                };
                priceComponents.push({
                  label: `Coupon: ${couponCodeStr}`,
                  amount: -discount,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error applying coupon:', error);
      }
    }
    
    // 5. CHECK FOR BONUS FREE PRODUCTS
    let bonusProduct: OfferApplied | null = null;
    const bonusRules = await prisma.offerRule.findMany({
      where: {
        organizationId,
        isActive: true,
        offerType: OfferType.BONUS_FREE_PRODUCT,
      } as any,
      orderBy: { priority: 'asc' },
    });
    
    for (const rule of bonusRules) {
      const config = rule.config as any;
      const triggerMinBill = config.triggerMinBill || 0;
      
      if (effectiveBase >= triggerMinBill) {
        // Bonus product unlocked
        const bonusValue = config.bonusLimit || 0;
        bonusProduct = {
          ruleCode: rule.code,
          description: `Bonus: ${config.bonusCategory || 'Free Product'} worth ₹${bonusValue}`,
          savings: 0, // Bonus doesn't reduce price, it's a free add-on
        };
        offersApplied.push(bonusProduct);
        break; // Apply only first applicable bonus
      }
    }
    
    // 6. EVALUATE UPSELL ENGINE
    const upsell = await this.evaluateUpsellEngine(organizationId, effectiveBase, null, null);
    
    const finalPayable = Math.max(0, effectiveBase);
    
    return {
      frameMRP: 0,
      lensPrice: 0,
      baseTotal,
      effectiveBase,
      offersApplied,
      priceComponents,
      categoryDiscount,
      couponDiscount,
      finalPayable,
      upsell,
    };
  }
}

export const offerEngineService = new OfferEngineService();

