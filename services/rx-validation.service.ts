/**
 * RX Validation Service
 * Handles prescription validation and vision type inference
 */

import { VisionType } from '@prisma/client';

export interface RxInput {
  rSph?: number | null; // Right eye sphere
  rCyl?: number | null; // Right eye cylinder
  lSph?: number | null; // Left eye sphere
  lCyl?: number | null; // Left eye cylinder
  add?: number | null; // Addition (for progressive/bifocal)
}

export interface ProductRxRange {
  sphMin: number;
  sphMax: number;
  cylMax: number;
  addMin?: number | null;
  addMax?: number | null;
}

export class RxValidationService {
  /**
   * Check if a product is within the prescription power range
   */
  isProductInRxRange(product: ProductRxRange, rx: RxInput): boolean {
    if (!rx.rSph && !rx.lSph) {
      return false; // No prescription data
    }

    // Calculate maximum power from both eyes
    const powers = [
      Math.abs(rx.rSph || 0),
      Math.abs(rx.lSph || 0),
      Math.abs((rx.rSph || 0) + (rx.rCyl || 0)),
      Math.abs((rx.lSph || 0) + (rx.lCyl || 0)),
    ].filter(p => p > 0);

    if (powers.length === 0) {
      return false;
    }

    const maxPower = Math.max(...powers);

    // Check sphere range
    if (maxPower < (product.sphMin || -Infinity) || maxPower > (product.sphMax || Infinity)) {
      return false;
    }

    // Check cylinder range
    const maxCyl = Math.max(
      Math.abs(rx.rCyl || 0),
      Math.abs(rx.lCyl || 0)
    );
    if (maxCyl > Math.abs(product.cylMax || 0)) {
      return false;
    }

    // Check addition range (for progressive/bifocal)
    if (rx.add !== null && rx.add !== undefined && rx.add > 0) {
      if (product.addMin !== null && product.addMin !== undefined) {
        if (rx.add < product.addMin) {
          return false;
        }
      }
      if (product.addMax !== null && product.addMax !== undefined) {
        if (rx.add > product.addMax) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Infer vision type from prescription
   */
  inferVisionType(rx: RxInput, override?: VisionType | null): VisionType {
    if (override) {
      return override as VisionType;
    }

    // If addition is present and significant, it's likely progressive or bifocal
    if (rx.add !== null && rx.add !== undefined && rx.add > 0.75) {
      return VisionType.MULTIFOCAL;
    }

    // Default to myopia (most common)
    return VisionType.MYOPIA;
  }

  /**
   * Validate prescription values
   */
  validateRx(rx: RxInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Sphere validation (±20 range)
    if (rx.rSph !== null && rx.rSph !== undefined) {
      if (rx.rSph < -20 || rx.rSph > 20) {
        errors.push('Right eye sphere must be between -20 and +20');
      }
    }
    if (rx.lSph !== null && rx.lSph !== undefined) {
      if (rx.lSph < -20 || rx.lSph > 20) {
        errors.push('Left eye sphere must be between -20 and +20');
      }
    }

    // Cylinder validation (negative only)
    if (rx.rCyl !== null && rx.rCyl !== undefined) {
      if (rx.rCyl > 0) {
        errors.push('Right eye cylinder must be negative or zero');
      }
      if (rx.rCyl < -6) {
        errors.push('Right eye cylinder must be between -6 and 0');
      }
    }
    if (rx.lCyl !== null && rx.lCyl !== undefined) {
      if (rx.lCyl > 0) {
        errors.push('Left eye cylinder must be negative or zero');
      }
      if (rx.lCyl < -6) {
        errors.push('Left eye cylinder must be between -6 and 0');
      }
    }

    // Addition validation
    if (rx.add !== null && rx.add !== undefined) {
      if (rx.add < 0 || rx.add > 4) {
        errors.push('Addition must be between 0 and 4');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

