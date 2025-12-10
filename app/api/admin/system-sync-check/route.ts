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
      issues.push({
        module: 'Lens-Benefit Mapping',
        severity: 'warning',
        message: `${lensesMissingBenefits.length} active lenses have no benefit mappings`,
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
      issues.push({
        module: 'Tint/Mirror Eligibility',
        severity: 'warning',
        message: `${lensesWithoutTintOptions.length} active lenses have no tint or mirror options`,
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
      issues.push({
        module: 'Rx Range Validation',
        severity: 'error',
        message: `${missingRxRanges.length} active lenses have no Rx ranges defined`,
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

    const invalidOfferRules = offerRules.filter((rule: any) => {
      // Check if rule has required config fields based on offer type
      const config = rule.config || {};
      if (rule.offerType === 'COMBO_PRICE' && !config.comboPrice) {
        return true;
      }
      if (rule.offerType === 'FREE_LENS' && !config.ruleType) {
        return true;
      }
      if (rule.offerType === 'BOG50' && !config.eligibleBrands && !config.eligibleCategories) {
        return true;
      }
      if (rule.offerType === 'BONUS_FREE_PRODUCT' && (!config.bonusLimit || !config.bonusCategory)) {
        return true;
      }
      return false;
    });

    if (invalidOfferRules.length > 0) {
      issues.push({
        module: 'Offer Rule Consistency',
        severity: 'error',
        message: `${invalidOfferRules.length} offer rules have invalid or missing configuration`,
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
        benefitMappings: true,
      },
    });

    const answersMissingBenefits = answersWithoutBenefits.filter((answer: any) => answer.benefitMappings.length === 0);
    if (answersMissingBenefits.length > 0) {
      issues.push({
        module: 'Answer-Benefit Mapping',
        severity: 'warning',
        message: `${answersMissingBenefits.length} answer options have no benefit mappings`,
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
      issues.push({
        module: 'Band Pricing',
        severity: 'error',
        message: `${overlappingBands.length} lenses have overlapping band pricing ranges`,
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
