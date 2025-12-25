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
  RxAddOnBreakdown,
} from '@/types/offer-engine';
import { rxAddOnPricingService } from './rx-addon-pricing.service';
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
  BOGO: 'BOGO',
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
    
    // Add accessories to base total if provided
    const accessoriesTotal = otherItems 
      ? otherItems
          .filter(item => item.type === 'ACCESSORY')
          .reduce((sum, item) => sum + item.finalPrice, 0)
      : 0;
    
    const baseTotal = frameMRP + lensPrice + accessoriesTotal;
    const isLensOnly = !frame || frameMRP === 0;

    // Initialize result structure
    const priceComponents: PriceComponent[] = [];
    if (!isLensOnly) {
      priceComponents.push({ label: 'Frame MRP', amount: frameMRP });
    }
    priceComponents.push({ label: 'Lens Offer Price', amount: lensPrice });
    
    // Add accessories to price components
    if (otherItems) {
      otherItems
        .filter(item => item.type === 'ACCESSORY')
        .forEach(item => {
          priceComponents.push({ 
            label: `Accessory - ${item.brand}`, 
            amount: item.finalPrice 
          });
        });
    }

    let effectiveBase = baseTotal;
    const offersApplied: OfferApplied[] = [];

    // V2: PRIMARY OFFER (Waterfall: COMBO_PRICE > YOPO > FREE_LENS > PERCENT_OFF > FLAT_OFF)
    // If a specific offer type is selected, find and apply that specific offer
    // Otherwise, apply the highest priority applicable offer
    const selectedOfferType = input.selectedOfferType;
    const primaryRule = selectedOfferType
      ? await this.findSpecificPrimaryRule(input, selectedOfferType)
      : await this.findApplicablePrimaryRule(input);
    
    // Debug: Log YOPO eligibility and rule finding
    console.log('[OfferEngine] Primary rule search:', {
      selectedOfferType,
      lensYopoEligible: lens?.yopoEligible,
      foundRule: primaryRule ? {
        code: primaryRule.code,
        offerType: primaryRule.offerType,
      } : null,
      frameMRP,
      lensPrice,
    });
    
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
      
      console.log('[OfferEngine] ✅ Primary rule applied:', {
        ruleCode: primaryRule.code,
        offerType: primaryRule.offerType,
        label: result.label,
        savings: result.savings,
        newTotal: result.newTotal,
        effectiveBase,
        frameMRP,
        lensPrice,
        isLensOnly,
      });
      
      // V2: If rule locks further evaluation (Combo/YOPO), break early
      if (result.locksFurtherEvaluation) {
        // Skip remaining primary offers, but still apply category discount and upsell
      }
    } else {
      // Debug: Log why no primary rule was found
      console.log('[OfferEngine] No primary rule found. Lens YOPO eligible:', lens?.yopoEligible);
    }

    // 2. CALCULATE RX ADD-ON FOR FIRST PAIR (needed for BOGO comparison)
    // Calculate RX add-on charges for first pair lens early so we can include it in BOGO comparison
    let firstPairRxAddOn = 0;
    let firstPairRxAddOnBreakdown: RxAddOnBreakdown[] = [];
    
    if (input.prescription && input.lens?.itCode) {
      try {
        const lensProduct = await prisma.lensProduct.findUnique({
          where: { itCode: input.lens.itCode },
        });

        if (lensProduct) {
          const rxAddOnResult = await rxAddOnPricingService.calculateRxAddOnPricing(
            lensProduct.id,
            input.prescription,
            'HIGHEST_ONLY' // Business rule: Apply only highest matching band
          );

          if (rxAddOnResult.addOnApplied && rxAddOnResult.totalAddOn > 0) {
            firstPairRxAddOn = rxAddOnResult.totalAddOn;
            firstPairRxAddOnBreakdown = rxAddOnResult.breakdown;
          }
        }
      } catch (rxAddOnError: any) {
        console.warn('[OfferEngine] First pair RX add-on pricing calculation failed:', rxAddOnError?.message);
      }
    }

    // 3. SECOND PAIR OFFER (if applicable)
    // BOGO Logic: Customer pays the HIGHEST price pair, lower pair is free
    let secondPairDiscount: OfferApplied | null = null;
    let secondPairRxAddOn = 0;
    let secondPairRxAddOnBreakdown: RxAddOnBreakdown[] = [];
    
    if (input.secondPair?.enabled) {
      // Calculate RX add-on for second pair lens if prescription and IT code are available
      if (input.prescription && input.secondPair.secondPairLensItCode) {
        try {
          const secondPairLensProduct = await prisma.lensProduct.findUnique({
            where: { itCode: input.secondPair.secondPairLensItCode },
          });

          if (secondPairLensProduct) {
            const secondPairRxAddOnResult = await rxAddOnPricingService.calculateRxAddOnPricing(
              secondPairLensProduct.id,
              input.prescription,
              'HIGHEST_ONLY' // Business rule: Apply only highest matching band
            );

            if (secondPairRxAddOnResult.addOnApplied && secondPairRxAddOnResult.totalAddOn > 0) {
              secondPairRxAddOn = secondPairRxAddOnResult.totalAddOn;
              secondPairRxAddOnBreakdown = secondPairRxAddOnResult.breakdown;
            }
          }
        } catch (secondPairRxAddOnError: any) {
          console.warn('[OfferEngine] Second pair RX add-on pricing calculation failed:', secondPairRxAddOnError?.message);
        }
      }
      
      const secondPairRule = await this.findApplicableSecondPairRule(input);
      if (secondPairRule) {
        // effectiveBase is the first pair total AFTER primary offer (YOPO, COMBO, etc.)
        // Include first pair RX add-on in comparison (RX add-on is non-discountable)
        const firstPairTotal = effectiveBase + firstPairRxAddOn;
        // Second pair total includes frame + lens + RX add-on (RX add-on is non-discountable)
        const secondPairBaseTotal = (input.secondPair.secondPairFrameMRP || 0) + (input.secondPair.secondPairLensPrice || 0);
        const secondPairTotal = secondPairBaseTotal + secondPairRxAddOn;
        
        const result = this.applySecondPairRule(secondPairRule, firstPairTotal, secondPairTotal);
        if (result.savings > 0) {
          secondPairDiscount = {
            ruleCode: secondPairRule.code,
            description: result.label,
            savings: result.savings,
          };
          
          // For BOGO: Show 1st pair price, then second pair, then discount
          if (secondPairRule.offerType === 'BOGO') {
            // Add 1st Pair Price (after primary offer)
            priceComponents.push({
              label: '1st Pair Price',
              amount: firstPairTotal,
            });
            
            // Add second pair details to price components for display
            priceComponents.push({
              label: 'Second Pair (Frame + Lens)',
              amount: secondPairBaseTotal,
            });
            
            // Add second pair RX add-on if applicable
            if (secondPairRxAddOn > 0) {
              secondPairRxAddOnBreakdown.forEach((item) => {
                priceComponents.push({
                  label: `2nd Pair: ${item.label}`,
                  amount: item.charge,
                });
              });
            }
            
            // Add BOGO discount
            priceComponents.push({
              label: `BOGO DISCOUNT 2ND FRAME FREE`,
              amount: -result.savings,
            });
            
            // Update effectiveBase to the higher value (what customer actually pays)
            effectiveBase = result.payableAmount;
          } else {
            // BOG50: Apply discount on lower pair
            priceComponents.push({
              label: 'Second Pair (Frame + Lens)',
              amount: secondPairBaseTotal,
            });
            
            // Add second pair RX add-on if applicable
            if (secondPairRxAddOn > 0) {
              secondPairRxAddOnBreakdown.forEach((item) => {
                priceComponents.push({
                  label: `2nd Pair: ${item.label}`,
                  amount: item.charge,
                });
              });
            }
            priceComponents.push({
              label: result.label,
              amount: -result.savings,
            });
            // For BOG50, customer pays: higher + (lower - discount)
            effectiveBase = result.payableAmount;
          }
        }
      }
    }

    // 4. CUSTOMER CATEGORY DISCOUNT
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

    // 5. COUPON DISCOUNT
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

    // 6. BONUS FREE PRODUCT (after all discounts, before upsell)
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

    // 7. ADD FIRST PAIR RX ADD-ON TO PRICE COMPONENTS (if not already added)
    // First pair RX add-on was calculated early for BOGO comparison
    // Now add it to price components for display
    if (firstPairRxAddOn > 0 && firstPairRxAddOnBreakdown.length > 0) {
      firstPairRxAddOnBreakdown.forEach((item) => {
        priceComponents.push({
          label: item.label,
          amount: item.charge,
        });
      });
    }

    // Calculate final payable: effectiveBase (after discounts) + RX add-on charges
    // RX add-on charges are NOT discountable
    // Include both first pair and second pair RX add-ons
    const totalRxAddOnIncludingSecondPair = firstPairRxAddOn + (input.secondPair?.enabled ? secondPairRxAddOn : 0);
    const finalPayable = Math.max(0, Math.round(effectiveBase + totalRxAddOnIncludingSecondPair));

    // 8. DYNAMIC UPSELL ENGINE (DUE) - Evaluates AFTER all discounts
    // Does not modify totals, only suggests upsell opportunities
    const upsell = await this.evaluateUpsellEngine(
      organizationId,
      finalPayable,
      input.frame,
      input.lens
    );

    // 9. CHECK FOR AVAILABLE BOGO RULES (even if secondPair is not selected)
    // This helps frontend to show BOGO section and auto-enable if frame is eligible
    let availableBOGORule: any | null = null;
    if (!input.secondPair?.enabled) {
      const bogoRule = await this.findApplicableSecondPairRule(input);
      if (bogoRule) {
        // Check if current frame is eligible for BOGO
        const config = bogoRule.config as any || {};
        const eligibleBrands = config.eligibleBrands || [];
        const frameBrand = input.frame?.brand || '';
        const frameSubBrand = input.frame?.subCategory || '';
        
        // Check eligibility: '*' means all brands, or specific brand/sub-brand match
        const isEligible = eligibleBrands.length === 0 || // No restriction = all eligible
                          eligibleBrands.includes('*') || // Universal
                          eligibleBrands.includes(frameBrand) || // Brand match
                          eligibleBrands.includes(frameSubBrand); // Sub-brand match
        
        if (isEligible) {
          availableBOGORule = {
            code: bogoRule.code,
            offerType: bogoRule.offerType,
            description: bogoRule.offerType === 'BOGO' 
              ? 'Buy One Get One Free - Second pair completely free'
              : `Buy One Get ${config.secondPairPercent || 50}% Off - Second pair discount available`,
          };
        }
      }
    }

    // 10. FIND ALL APPLICABLE OFFERS (for user selection)
    const availableOffers = await this.findAllApplicableOffers(input);

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
      rxAddOnBreakdown: firstPairRxAddOnBreakdown.length > 0 ? firstPairRxAddOnBreakdown : undefined,
      totalRxAddOn: totalRxAddOnIncludingSecondPair > 0 ? totalRxAddOnIncludingSecondPair : undefined,
      finalPayable,
      upsell, // V3: Dynamic Upsell Engine result
      availableBOGORule, // Available BOGO rule if frame is eligible
      availableOffers, // All applicable offers for this frame + lens combination
    };
  }

  /**
   * Find all applicable offers for the given frame/lens combination
   * Returns all offers that match the frame and lens criteria
   */
  async findAllApplicableOffers(input: OfferCalculationInput): Promise<any[]> {
    const { frame, lens, organizationId, storeId } = input;
    const now = new Date();
    const availableOffers: any[] = [];

    // Validate organizationId
    if (!organizationId || organizationId.trim() === '' || !/^[0-9a-fA-F]{24}$/.test(organizationId)) {
      return availableOffers;
    }

    // 1. Check all primary offers (COMBO_PRICE, YOPO, FREE_LENS, PERCENT_OFF, FLAT_OFF)
    const primaryOfferTypes = [OfferType.COMBO_PRICE, OfferType.YOPO, OfferType.FREE_LENS, OfferType.PERCENT_OFF, OfferType.FLAT_OFF];
    
    const primaryRules = await prisma.offerRule.findMany({
      where: {
        organizationId,
        isActive: true,
        offerType: { in: primaryOfferTypes as any },
      } as any,
      orderBy: {
        priority: 'asc',
      },
    });

    // Filter by store activation if storeId is provided
    let storeActivatedRuleIds: Set<string> | null = null;
    if (storeId && /^[0-9a-fA-F]{24}$/.test(storeId)) {
      try {
        const storeOfferMaps = await (prisma as any).storeOfferMap.findMany({
          where: { storeId, isActive: true },
          select: { offerRuleId: true },
        });
        storeActivatedRuleIds = new Set(storeOfferMaps.map((som: { offerRuleId: string }) => som.offerRuleId));
      } catch (error) {
        console.warn('[OfferEngine] Error fetching store offer maps:', error);
      }
    }

    // Check each primary offer rule
    for (const rule of primaryRules) {
      // Check store activation
      if (storeId && storeActivatedRuleIds && storeActivatedRuleIds.size > 0) {
        if (!storeActivatedRuleIds.has(rule.id)) {
          continue;
        }
      }

      // Check if rule is applicable (matches frame/lens criteria)
      const isApplicable = this.isRuleApplicable(rule, frame, lens, now);
      
      if (isApplicable) {
        // Calculate estimated savings
        const frameMRP = frame?.mrp || 0;
        const lensPrice = lens?.price || 0;
        const baseTotal = frameMRP + lensPrice;
        let estimatedSavings = 0;

        if (rule.offerType === 'COMBO_PRICE') {
          const comboPrice = (rule.config as any)?.comboPrice || 0;
          estimatedSavings = baseTotal - comboPrice;
        } else if (rule.offerType === 'YOPO') {
          const higher = Math.max(frameMRP, lensPrice);
          estimatedSavings = baseTotal - higher;
        } else if (rule.offerType === 'FREE_LENS') {
          estimatedSavings = lensPrice;
        } else if (rule.offerType === 'PERCENT_OFF') {
          const discountPercent = (rule.config as any)?.discountPercent || 0;
          estimatedSavings = (baseTotal * discountPercent) / 100;
        } else if (rule.offerType === 'FLAT_OFF') {
          estimatedSavings = (rule.config as any)?.flatAmount || 0;
        }

        availableOffers.push({
          type: rule.offerType,
          code: rule.code,
          description: `${rule.offerType} Offer`,
          estimatedSavings: Math.max(0, estimatedSavings),
          isApplicable: true,
        });
      }
    }

    // 2. Check BOGO/BOG50 offers (if second pair is not enabled)
    if (!input.secondPair?.enabled) {
      const bogoRule = await this.findApplicableSecondPairRule(input);
      if (bogoRule) {
        const config = bogoRule.config as any || {};
        const eligibleBrands = config.eligibleBrands || [];
        const frameBrand = input.frame?.brand || '';
        const frameSubBrand = input.frame?.subCategory || '';
        
        const isEligible = eligibleBrands.length === 0 ||
                          eligibleBrands.includes('*') ||
                          eligibleBrands.includes(frameBrand) ||
                          eligibleBrands.includes(frameSubBrand);
        
        if (isEligible) {
          availableOffers.push({
            type: bogoRule.offerType,
            code: bogoRule.code,
            description: bogoRule.offerType === 'BOGO'
              ? 'Buy One Get One Free - Second pair completely free'
              : `Buy One Get ${config.secondPairPercent || 50}% Off - Second pair discount available`,
            estimatedSavings: 0, // Will be calculated when second pair is selected
            isApplicable: true,
          });
        }
      }
    }

    return availableOffers;
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
    console.log('[OfferEngine] Checking rules for applicability. Total rules:', rules.length);
    for (const rule of rules) {
      // Check store activation if storeId is provided
      if (storeId && storeActivatedRuleIds) {
        // If store has specific activations, only apply those rules
        // If no store activations exist, apply all organization rules (backward compatible)
        if (storeActivatedRuleIds.size > 0 && !storeActivatedRuleIds.has(rule.id)) {
          console.log('[OfferEngine] Rule skipped - not activated for store:', rule.code);
          continue; // Skip this rule - not activated for this store
        }
      }
      
      const isApplicable = this.isRuleApplicable(rule, frame, lens, now);
      console.log('[OfferEngine] Checking rule applicability:', {
        ruleCode: rule.code,
        offerType: rule.offerType,
        isApplicable,
        lensYopoEligible: lens?.yopoEligible,
        frameBrand: frame?.brand,
        lensBrandLine: lens?.brandLine,
      });
      
      if (isApplicable) {
        console.log('[OfferEngine] ✅ Rule is applicable:', rule.code);
        return rule;
      }
    }

    console.log('[OfferEngine] ❌ No applicable primary rule found');
    return null;
  }

  /**
   * Find specific primary offer rule by type
   * Used when user selects a specific offer type
   */
  async findSpecificPrimaryRule(
    input: OfferCalculationInput,
    offerType: string
  ): Promise<any | null | undefined> {
    const { frame, lens, organizationId, storeId } = input;
    const now = new Date();

    // Validate organizationId before querying
    if (!organizationId || organizationId.trim() === '' || !/^[0-9a-fA-F]{24}$/.test(organizationId)) {
      console.warn('[OfferEngine] Invalid organizationId, skipping rule lookup');
      return null;
    }

    const rule = await prisma.offerRule.findFirst({
      where: {
        organizationId,
        isActive: true,
        offerType: offerType as any,
      } as any,
      orderBy: {
        priority: 'asc',
      },
    });

    if (!rule) {
      console.log(`[OfferEngine] No ${offerType} rule found`);
      return null;
    }

    // Check store activation if storeId is provided
    if (storeId && /^[0-9a-fA-F]{24}$/.test(storeId)) {
      try {
        const storeOfferMaps = await (prisma as any).storeOfferMap.findMany({
          where: {
            storeId,
            offerRuleId: rule.id,
            isActive: true,
          },
        });
        if (storeOfferMaps.length === 0) {
          // Check if store has any activations - if yes, this rule is not activated
          const allStoreActivations = await (prisma as any).storeOfferMap.findMany({
            where: { storeId, isActive: true },
          });
          if (allStoreActivations.length > 0) {
            console.log(`[OfferEngine] ${offerType} rule not activated for store`);
            return null;
          }
        }
      } catch (error) {
        console.warn('[OfferEngine] Error checking store activation:', error);
      }
    }

    const isApplicable = this.isRuleApplicable(rule, frame, lens, now);
    if (isApplicable) {
      console.log(`[OfferEngine] ✅ ${offerType} rule is applicable:`, rule.code);
      return rule;
    }

    console.log(`[OfferEngine] ❌ ${offerType} rule is not applicable`);
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
    if (rule.offerType === 'YOPO') {
      if (!lens || !lens.yopoEligible) {
        console.log('[OfferEngine] ❌ YOPO rule rejected - lens not YOPO eligible:', {
          ruleCode: rule.code,
          hasLens: !!lens,
          yopoEligible: lens?.yopoEligible,
        });
        return false;
      }
      console.log('[OfferEngine] ✅ YOPO rule passed eligibility check:', {
        ruleCode: rule.code,
        lensYopoEligible: lens.yopoEligible,
      });
    }

    // Free Lens must define ruleType in config
    if (rule.offerType === 'FREE_LENS' && !config.ruleType) return false;

    // BOG50 and BOGO require brand or category
    if ((rule.offerType === 'BOG50' || rule.offerType === 'BOGO') && (!config.eligibleBrands && !config.eligibleCategories)) {
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
        const discountPercent = config.discountPercent || 0;
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
        const flatAmount = config.flatAmount || 0;
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

      case 'BOGO':
        // Handled separately in second pair logic (Buy One Get One Free)
        return { newTotal: baseTotal, savings: 0, label: 'BOGO (Buy One Get One Free)' };

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
   * V2: Find applicable second pair rule (BOG50 or BOGO)
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
        offerType: { in: ['BOG50', 'BOGO'] },
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
   * BOGO Logic: Customer pays the HIGHEST price pair, lower pair is free
   * @param firstPairTotal - First pair total AFTER primary offer (effectiveBase)
   * @param secondPairTotal - Second pair total (frame + lens)
   */
  private applySecondPairRule(
    rule: any,
    firstPairTotal: number, // First pair after primary offer
    secondPairTotal: number // Second pair total
  ): { savings: number; label: string; payableAmount: number } {
    const lower = Math.min(firstPairTotal, secondPairTotal);
    const higher = Math.max(firstPairTotal, secondPairTotal);

    // BOGO: Buy One Get One Free - Customer pays HIGHEST price, lower pair is free
    if (rule.offerType === 'BOGO') {
      return {
        savings: lower, // Lower pair is free (savings)
        payableAmount: higher, // Customer pays the higher value
        label: `BOGO discount 2nd pair free`,
      };
    }

    // BOG50: Buy One Get 50% Off
    // Read secondPairPercent from config (where it's stored)
    const config = rule.config || {};
    const secondPairPercent = config.secondPairPercent || rule.secondPairPercent || 50; // Default to 50% for BOG50

    if (secondPairPercent) {
      const savings = (lower * secondPairPercent) / 100;
      // For BOG50, customer pays: higher pair + (lower pair - discount on lower pair)
      const payableAmount = higher + (lower - savings);
      return {
        savings,
        payableAmount,
        label: `Second pair ${secondPairPercent}% off (lower value) - Pay ₹${Math.round(payableAmount).toLocaleString()}`,
      };
    }

    return { savings: 0, payableAmount: firstPairTotal + secondPairTotal, label: 'No second pair benefit' };
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
    
    // 1.5. APPLY QUANTITY-BASED OFFERS (Buy 2 boxes → 15% OFF, Buy 4+ boxes → 10% OFF)
    const totalCLQuantity = clItems.reduce((sum, cl) => sum + (cl.quantity || 1), 0);
    if (totalCLQuantity >= 2) {
      const clTotal = clItems.reduce((sum, cl) => sum + cl.finalPrice, 0);
      let quantityDiscount = 0;
      let discountDescription = '';
      
      if (totalCLQuantity >= 4) {
        // Buy 4+ boxes → 10% OFF
        quantityDiscount = clTotal * 0.10;
        discountDescription = 'Buy 4+ Boxes - 10% OFF';
      } else if (totalCLQuantity >= 2) {
        // Buy 2 boxes → 15% OFF
        quantityDiscount = clTotal * 0.15;
        discountDescription = 'Buy 2 Boxes - 15% OFF';
      }
      
      if (quantityDiscount > 0) {
        effectiveBase -= quantityDiscount;
        offersApplied.push({
          ruleCode: 'CL_QUANTITY_OFFER',
          description: discountDescription,
          savings: quantityDiscount,
        });
        priceComponents.push({
          label: discountDescription,
          amount: -quantityDiscount,
        });
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

