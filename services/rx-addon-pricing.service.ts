/**
 * RX Add-On Pricing Service
 * Calculates extra charges based on combined SPH + CYL + ADD ranges
 * All conditions in a band must match together
 */

import { prisma } from '@/lib/prisma';
import { RxInput } from './rx-validation.service';

export interface RxAddOnBand {
  id: string;
  sphMin: number | null;
  sphMax: number | null;
  cylMin: number | null;
  cylMax: number | null;
  addMin: number | null;
  addMax: number | null;
  extraCharge: number;
}

export interface RxAddOnBreakdown {
  label: string;
  charge: number;
  matchedBand: {
    sphRange?: string;
    cylRange?: string;
    addRange?: string;
  };
}

export interface RxAddOnPricingResult {
  addOnApplied: boolean;
  totalAddOn: number;
  breakdown: RxAddOnBreakdown[];
  matchedBands: RxAddOnBand[];
}

export class RxAddOnPricingService {
  /**
   * Calculate RX add-on pricing for a lens based on prescription
   * Returns all matching bands and total charge
   * 
   * Business Rule: Option A - Apply ONLY highest matching band (recommended)
   * Can be changed to Option B - Sum of all matching bands
   */
  async calculateRxAddOnPricing(
    lensId: string,
    prescription: RxInput,
    stackingPolicy: 'HIGHEST_ONLY' | 'SUM_ALL' = 'HIGHEST_ONLY'
  ): Promise<RxAddOnPricingResult> {
    // Get all add-on pricing bands for this lens
    const addOnBands = await prisma.lensPowerAddOnPricing.findMany({
      where: {
        lensId,
      },
      orderBy: {
        extraCharge: 'desc', // Order by charge descending
      },
    });

    if (addOnBands.length === 0) {
      return {
        addOnApplied: false,
        totalAddOn: 0,
        breakdown: [],
        matchedBands: [],
      };
    }

    // Identify worse eye (highest absolute SPH/CYL)
    const worseEye = this.identifyWorseEye(prescription);

    // Find all matching bands
    const matchingBands: RxAddOnBand[] = [];
    const breakdown: RxAddOnBreakdown[] = [];

    for (const band of addOnBands) {
      if (this.isBandMatching(band, worseEye, prescription)) {
        const bandData: RxAddOnBand = {
          id: band.id,
          sphMin: band.sphMin,
          sphMax: band.sphMax,
          cylMin: band.cylMin,
          cylMax: band.cylMax,
          addMin: band.addMin,
          addMax: band.addMax,
          extraCharge: band.extraCharge,
        };
        matchingBands.push(bandData);

        // Create breakdown entry
        const label = this.generateBandLabel(band);
        breakdown.push({
          label,
          charge: band.extraCharge,
          matchedBand: {
            sphRange: band.sphMin !== null && band.sphMax !== null
              ? `${band.sphMin} to ${band.sphMax}`
              : undefined,
            cylRange: band.cylMin !== null && band.cylMax !== null
              ? `${band.cylMin} to ${band.cylMax}`
              : undefined,
            addRange: band.addMin !== null && band.addMax !== null
              ? `${band.addMin} to ${band.addMax}`
              : undefined,
          },
        });
      }
    }

    if (matchingBands.length === 0) {
      return {
        addOnApplied: false,
        totalAddOn: 0,
        breakdown: [],
        matchedBands: [],
      };
    }

    // Apply stacking policy
    let totalAddOn: number;
    let finalBreakdown: RxAddOnBreakdown[];

    if (stackingPolicy === 'HIGHEST_ONLY') {
      // Option A: Apply only highest charge
      totalAddOn = Math.max(...matchingBands.map(b => b.extraCharge));
      // Find the band with highest charge
      const highestBand = matchingBands.find(b => b.extraCharge === totalAddOn);
      finalBreakdown = breakdown.filter(b => 
        b.charge === totalAddOn && 
        matchingBands.findIndex(mb => mb.extraCharge === totalAddOn) === 
        breakdown.findIndex(d => d.charge === totalAddOn)
      );
      if (finalBreakdown.length === 0 && highestBand) {
        finalBreakdown = [{
          label: this.generateBandLabel(highestBand),
          charge: totalAddOn,
          matchedBand: {
            sphRange: highestBand.sphMin !== null && highestBand.sphMax !== null
              ? `${highestBand.sphMin} to ${highestBand.sphMax}`
              : undefined,
            cylRange: highestBand.cylMin !== null && highestBand.cylMax !== null
              ? `${highestBand.cylMin} to ${highestBand.cylMax}`
              : undefined,
            addRange: highestBand.addMin !== null && highestBand.addMax !== null
              ? `${highestBand.addMin} to ${highestBand.addMax}`
              : undefined,
          },
        }];
      }
    } else {
      // Option B: Sum all matching charges
      totalAddOn = matchingBands.reduce((sum, band) => sum + band.extraCharge, 0);
      finalBreakdown = breakdown;
    }

    return {
      addOnApplied: true,
      totalAddOn,
      breakdown: finalBreakdown,
      matchedBands: stackingPolicy === 'HIGHEST_ONLY' 
        ? matchingBands.filter(b => b.extraCharge === totalAddOn)
        : matchingBands,
    };
  }

  /**
   * Identify worse eye (highest absolute SPH/CYL)
   */
  private identifyWorseEye(prescription: RxInput): {
    sph: number;
    cyl: number;
  } {
    const rSph = Math.abs(prescription.rSph || 0);
    const rCyl = Math.abs(prescription.rCyl || 0);
    const lSph = Math.abs(prescription.lSph || 0);
    const lCyl = Math.abs(prescription.lCyl || 0);

    const rTotal = rSph + rCyl;
    const lTotal = lSph + lCyl;

    // Use worse eye (higher total)
    if (rTotal >= lTotal) {
      return {
        sph: prescription.rSph || 0,
        cyl: prescription.rCyl || 0,
      };
    } else {
      return {
        sph: prescription.lSph || 0,
        cyl: prescription.lCyl || 0,
      };
    }
  }

  /**
   * Check if a band matches the prescription
   * All conditions (SPH, CYL, ADD) must match together
   */
  private isBandMatching(
    band: {
      sphMin: number | null;
      sphMax: number | null;
      cylMin: number | null;
      cylMax: number | null;
      addMin: number | null;
      addMax: number | null;
    },
    worseEye: { sph: number; cyl: number },
    prescription: RxInput
  ): boolean {
    // Check SPH range
    const sphOK = 
      (band.sphMin === null || worseEye.sph >= band.sphMin) &&
      (band.sphMax === null || worseEye.sph <= band.sphMax);

    // Check CYL range (use absolute value for comparison)
    const absCyl = Math.abs(worseEye.cyl);
    const cylOK = 
      (band.cylMin === null || absCyl >= Math.abs(band.cylMin)) &&
      (band.cylMax === null || absCyl <= Math.abs(band.cylMax));

    // Check ADD range (optional)
    let addOK = true;
    if (band.addMin !== null || band.addMax !== null) {
      const add = prescription.add || 0;
      if (band.addMin !== null && add < band.addMin) {
        addOK = false;
      }
      if (band.addMax !== null && add > band.addMax) {
        addOK = false;
      }
    }

    // All conditions must match
    return sphOK && cylOK && addOK;
  }

  /**
   * Generate human-readable label for a band
   */
  private generateBandLabel(band: {
    sphMin: number | null;
    sphMax: number | null;
    cylMin: number | null;
    cylMax: number | null;
    addMin: number | null;
    addMax: number | null;
  }): string {
    const parts: string[] = [];

    if (band.sphMin !== null && band.sphMax !== null) {
      parts.push(`SPH ${band.sphMin} to ${band.sphMax}`);
    } else if (band.sphMin !== null) {
      parts.push(`SPH ≥ ${band.sphMin}`);
    } else if (band.sphMax !== null) {
      parts.push(`SPH ≤ ${band.sphMax}`);
    }

    if (band.cylMin !== null && band.cylMax !== null) {
      parts.push(`CYL ${band.cylMin} to ${band.cylMax}`);
    } else if (band.cylMin !== null) {
      parts.push(`CYL ≥ ${band.cylMin}`);
    } else if (band.cylMax !== null) {
      parts.push(`CYL ≤ ${band.cylMax}`);
    }

    if (band.addMin !== null && band.addMax !== null) {
      parts.push(`ADD ${band.addMin} to ${band.addMax}`);
    } else if (band.addMin !== null) {
      parts.push(`ADD ≥ ${band.addMin}`);
    } else if (band.addMax !== null) {
      parts.push(`ADD ≤ ${band.addMax}`);
    }

    if (parts.length === 0) {
      return 'Any Power';
    }

    return parts.join(' + ');
  }
}

export const rxAddOnPricingService = new RxAddOnPricingService();
