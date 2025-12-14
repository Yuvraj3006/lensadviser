/**
 * System Sync Check API
 * GET /api/admin/system-sync-check
 * Validates system consistency across all modules
 */

import { NextRequest } from 'next/server';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/lib/constants';
import { handleApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!organizationId) {
      return Response.json({
        success: false,
        error: 'organizationId is required',
      }, { status: 400 });
    }

    const issues: Array<{ module: string; severity: 'error' | 'warning'; message: string; count?: number }> = [];

    // 1. Check lens benefit mapping completeness
    const lensesWithoutBenefits = await (prisma as any).lensProduct.findMany({
      where: {
        isActive: true,
      },
      include: {
        benefits: true,
      },
    });

    const lensesMissingBenefits = lensesWithoutBenefits.filter((lens: any) => lens.benefits.length === 0);
    if (lensesMissingBenefits.length > 0) {
      // Create detailed message with lens IT codes, names, and IDs
      const lensDetails = lensesMissingBenefits
        .slice(0, 10) // Limit to first 10 for readability
        .map((lens: any) => {
          const lensCode = lens.itCode || 'NO_CODE';
          const lensName = lens.name || 'NO_NAME';
          const lensId = lens.id;
          return `${lensCode} (${lensName}, ID: ${lensId})`;
        })
        .join('; ');
      
      const moreCount = lensesMissingBenefits.length > 10 ? ` and ${lensesMissingBenefits.length - 10} more` : '';
      
      issues.push({
        module: 'Lens-Benefit Mapping',
        severity: 'warning',
        message: `${lensesMissingBenefits.length} active lens(es) have no benefit mappings. ${lensDetails}${moreCount}. Please add benefit mappings for these lenses in the Lens Products page.`,
        count: lensesMissingBenefits.length,
      });
    }

    // 2. Check tint/mirror eligibility
    const lensesWithTint = await (prisma as any).lensProduct.findMany({
      where: {
        isActive: true,
      },
      include: {
        tintColors: true,
        mirrorCoatings: true,
      },
    });

    const lensesWithoutTintOptions = lensesWithTint.filter(
      (lens: any) => lens.tintColors.length === 0 && lens.mirrorCoatings.length === 0
    );
    if (lensesWithoutTintOptions.length > 0) {
      // Create detailed message with lens IT codes, names, and IDs
      const lensDetails = lensesWithoutTintOptions
        .slice(0, 10) // Limit to first 10 for readability
        .map((lens: any) => {
          const lensCode = lens.itCode || 'NO_CODE';
          const lensName = lens.name || 'NO_NAME';
          const lensId = lens.id;
          return `${lensCode} (${lensName}, ID: ${lensId})`;
        })
        .join('; ');
      
      const moreCount = lensesWithoutTintOptions.length > 10 ? ` and ${lensesWithoutTintOptions.length - 10} more` : '';
      
      issues.push({
        module: 'Tint/Mirror Eligibility',
        severity: 'warning',
        message: `${lensesWithoutTintOptions.length} active lens(es) have no tint or mirror options. ${lensDetails}${moreCount}. Please add tint/mirror options for these lenses in the Lens Products page.`,
        count: lensesWithoutTintOptions.length,
      });
    }

    // 3. Check Rx ranges
    const lensesWithoutRxRanges = await (prisma as any).lensProduct.findMany({
      where: {
        isActive: true,
      },
      include: {
        rxRanges: true,
      },
    });

    const missingRxRanges = lensesWithoutRxRanges.filter((lens: any) => lens.rxRanges.length === 0);
    if (missingRxRanges.length > 0) {
      // Create detailed message with lens IT codes, names, and IDs
      const lensDetails = missingRxRanges
        .map((lens: any) => {
          const lensCode = lens.itCode || 'NO_CODE';
          const lensName = lens.name || 'NO_NAME';
          const lensId = lens.id;
          return `${lensCode} (${lensName}, ID: ${lensId})`;
        })
        .join('; ');
      
      issues.push({
        module: 'Rx Range Validation',
        severity: 'error',
        message: `${missingRxRanges.length} active lens(es) have no Rx ranges defined. ${lensDetails}. Please add Rx ranges for these lenses in the Lens Products page.`,
        count: missingRxRanges.length,
      });
    }

    // 4. Check offer rule consistency
    const offerRules = await (prisma as any).offerRule.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    const invalidOfferRules: Array<{ rule: any; reason: string }> = [];
    
    for (const rule of offerRules) {
      const config = rule.config || {};
      let reason = '';
      
      // Check if rule has required config fields based on offer type
      switch (rule.offerType) {
        case 'COMBO_PRICE':
          if (!config.comboPrice && config.comboPrice !== 0) {
            reason = 'Missing comboPrice in config';
          }
          break;
          
        case 'FREE_LENS':
          // FREE_LENS requires ruleType to be set
          // Valid values: 'PERCENT_OF_FRAME', 'VALUE_LIMIT', or null/undefined (fully free)
          // However, the offer engine service requires ruleType, so we validate it
          if (!config.ruleType || config.ruleType === null || config.ruleType === '') {
            reason = 'Missing ruleType in config. Valid values: PERCENT_OF_FRAME, VALUE_LIMIT, or FULL (for fully free lens)';
          } else if (config.ruleType === 'PERCENT_OF_FRAME') {
            // If PERCENT_OF_FRAME, percentLimit is required
            if (config.percentLimit === null || config.percentLimit === undefined) {
              reason = 'ruleType is PERCENT_OF_FRAME but missing percentLimit in config';
            }
          } else if (config.ruleType === 'VALUE_LIMIT') {
            // If VALUE_LIMIT, valueLimit is required
            if (config.valueLimit === null || config.valueLimit === undefined) {
              reason = 'ruleType is VALUE_LIMIT but missing valueLimit in config';
            }
          }
          // If ruleType is 'FULL' or other valid value, it's okay
          break;
          
        case 'BOG50':
          if ((!config.eligibleBrands || config.eligibleBrands.length === 0) && 
              (!config.eligibleCategories || config.eligibleCategories.length === 0)) {
            reason = 'Missing eligibleBrands or eligibleCategories in config';
          }
          break;
          
        case 'BONUS_FREE_PRODUCT':
          if (!config.bonusLimit && config.bonusLimit !== 0) {
            reason = 'Missing bonusLimit in config';
          } else if (!config.bonusCategory) {
            reason = 'Missing bonusCategory in config';
          }
          break;
          
        case 'PERCENT_OFF':
        case 'FLAT_OFF':
        case 'CATEGORY_DISCOUNT':
          // These offer types might work without config if using legacy fields
          // Only validate if config exists but is incomplete
          if (Object.keys(config).length > 0) {
            if (config.discountType && !config.discountValue && config.discountValue !== 0) {
              reason = 'Has discountType but missing discountValue in config';
            }
          }
          break;
          
        case 'BOGO':
          // BOGO might need eligibleBrands or eligibleCategories
          if ((!config.eligibleBrands || config.eligibleBrands.length === 0) && 
              (!config.eligibleCategories || config.eligibleCategories.length === 0)) {
            reason = 'Missing eligibleBrands or eligibleCategories in config';
          }
          break;
          
        case 'YOPO':
          // YOPO typically doesn't need config, but check if it has invalid config
          // No validation needed for YOPO
          break;
          
        default:
          reason = `Unknown offer type: ${rule.offerType}`;
      }
      
      if (reason) {
        invalidOfferRules.push({ rule, reason });
      }
    }

    if (invalidOfferRules.length > 0) {
      // Create detailed message with rule codes and IDs for easy lookup
      const ruleDetails = invalidOfferRules
        .map(({ rule, reason }) => {
          const ruleId = rule.id;
          const ruleCode = rule.code || 'NO_CODE';
          return `${ruleCode} (ID: ${ruleId}, Type: ${rule.offerType}): ${reason}`;
        })
        .join('; ');
      
      issues.push({
        module: 'Offer Rule Consistency',
        severity: 'error',
        message: `${invalidOfferRules.length} offer rule(s) have invalid or missing configuration. ${ruleDetails}. Please check and update these rules in the Offer Rules page.`,
        count: invalidOfferRules.length,
      });
    }

    // 5. Check answer-benefit mapping
    const answersWithoutBenefits = await (prisma as any).answerOption.findMany({
      where: {
        question: {
          organizationId,
        },
      },
      include: {
        benefitMappings: {
          include: {
            benefit: {
              select: {
                id: true,
                code: true,
              },
            },
          },
        },
        question: {
          select: {
            id: true,
            text: true,
            code: true,
          },
        },
      },
    });

    // Filter answers that truly have no benefit mappings
    const answersMissingBenefits = answersWithoutBenefits.filter((answer: any) => {
      const hasMappings = answer.benefitMappings && Array.isArray(answer.benefitMappings) && answer.benefitMappings.length > 0;
      return !hasMappings;
    });
    if (answersMissingBenefits.length > 0) {
      // Create detailed message with question and answer details
      const answerDetails = answersMissingBenefits
        .slice(0, 10) // Limit to first 10 for readability
        .map((answer: any) => {
          const questionText = answer.question?.text || 'NO_QUESTION';
          const questionCode = answer.question?.code || 'NO_CODE';
          const answerText = answer.text || 'NO_ANSWER';
          const answerId = answer.id;
          return `Q: ${questionCode} (${questionText}) - A: ${answerText} (ID: ${answerId})`;
        })
        .join('; ');
      
      const moreCount = answersMissingBenefits.length > 10 ? ` and ${answersMissingBenefits.length - 10} more` : '';
      
      issues.push({
        module: 'Answer-Benefit Mapping',
        severity: 'warning',
        message: `${answersMissingBenefits.length} answer option(s) have no benefit mappings. ${answerDetails}${moreCount}. Please add benefit mappings for these answers in the Questionnaire Builder page.`,
        count: answersMissingBenefits.length,
      });
    }

    // 6. Check band pricing
    const lensesWithBandPricing = await (prisma as any).lensProduct.findMany({
      where: {
        isActive: true,
      },
      include: {
        bandPricing: {
          where: { isActive: true },
        },
      },
    });

    // Check for overlapping bands
    const overlappingBands: any[] = [];
    for (const lens of lensesWithBandPricing) {
      const bands = lens.bandPricing || [];
      for (let i = 0; i < bands.length; i++) {
        for (let j = i + 1; j < bands.length; j++) {
          const band1 = bands[i];
          const band2 = bands[j];
          if (
            (band1.minPower >= band2.minPower && band1.minPower < band2.maxPower) ||
            (band1.maxPower > band2.minPower && band1.maxPower <= band2.maxPower) ||
            (band1.minPower <= band2.minPower && band1.maxPower >= band2.maxPower)
          ) {
            overlappingBands.push({ lensId: lens.id, lensCode: lens.itCode, band1, band2 });
          }
        }
      }
    }

    if (overlappingBands.length > 0) {
      // Create detailed message with lens and band details
      const bandDetails = overlappingBands
        .slice(0, 10) // Limit to first 10 for readability
        .map((item: any) => {
          const lensCode = item.lensCode || 'NO_CODE';
          const lensId = item.lensId;
          const band1Range = `${item.band1.minPower} to ${item.band1.maxPower}`;
          const band2Range = `${item.band2.minPower} to ${item.band2.maxPower}`;
          return `${lensCode} (ID: ${lensId}): Bands [${band1Range}] and [${band2Range}] overlap`;
        })
        .join('; ');
      
      const moreCount = overlappingBands.length > 10 ? ` and ${overlappingBands.length - 10} more` : '';
      
      issues.push({
        module: 'Band Pricing',
        severity: 'error',
        message: `${overlappingBands.length} lens(es) have overlapping band pricing ranges. ${bandDetails}${moreCount}. Please fix overlapping ranges in the Lens Products page.`,
        count: overlappingBands.length,
      });
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    return Response.json({
      success: true,
      data: {
        summary: {
          totalIssues: issues.length,
          errors: errorCount,
          warnings: warningCount,
          status: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'ok',
        },
        issues,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[system-sync-check] Error:', error);
    return handleApiError(error);
  }
}
