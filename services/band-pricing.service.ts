/**
 * Band Pricing Service
 * Calculates extra charges based on power bands
 */

import { prisma } from '@/lib/prisma';
import { RxInput } from './rx-validation.service';

export interface BandPricingResult {
  bandPricingApplied: boolean;
  bandExtra: number;
  matchedBand?: {
    minPower: number;
    maxPower: number;
    extraCharge: number;
  };
}

export class BandPricingService {
  /**
   * Calculate band pricing for a lens based on prescription
   */
  async calculateBandPricing(
    lensId: string,
    prescription: RxInput
  ): Promise<BandPricingResult> {
    // Get all active band pricing rules for this lens
    const bandPricingRules = await (prisma as any).lensBandPricing.findMany({
      where: {
        lensId,
        isActive: true,
      },
      orderBy: {
        minPower: 'asc',
      },
    });

    if (bandPricingRules.length === 0) {
      return {
        bandPricingApplied: false,
        bandExtra: 0,
      };
    }

    // Calculate maximum power from prescription
    const maxPower = this.computeMaxPower(prescription);

    // Find matching band
    const matchedBand = bandPricingRules.find((band: any) => {
      const absMaxPower = Math.abs(maxPower);
      return absMaxPower >= band.minPower && absMaxPower <= band.maxPower;
    });

    if (!matchedBand) {
      return {
        bandPricingApplied: false,
        bandExtra: 0,
      };
    }

    return {
      bandPricingApplied: true,
      bandExtra: matchedBand.extraCharge || 0,
      matchedBand: {
        minPower: matchedBand.minPower,
        maxPower: matchedBand.maxPower,
        extraCharge: matchedBand.extraCharge,
      },
    };
  }

  /**
   * Compute maximum power from prescription
   */
  private computeMaxPower(prescription: RxInput): number {
    const rSph = Math.abs(prescription.rSph || 0);
    const rCyl = Math.abs(prescription.rCyl || 0);
    const lSph = Math.abs(prescription.lSph || 0);
    const lCyl = Math.abs(prescription.lCyl || 0);

    const rTotal = rSph + rCyl;
    const lTotal = lSph + lCyl;

    return Math.max(rTotal, lTotal);
  }
}

export const bandPricingService = new BandPricingService();
