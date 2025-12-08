/**
 * Index Recommendation Service
 * Recommends lens index based on prescription power and frame type
 */

import { RxInput } from './rx-validation.service';

export interface FrameInput {
  frameType?: 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS' | null;
  brand?: string;
  subCategory?: string | null;
  mrp?: number;
}

export class IndexRecommendationService {
  /**
   * Recommend lens index based on prescription power and frame type
   */
  recommendIndex(rx: RxInput, frame?: FrameInput | null): string {
    // Calculate maximum power from both eyes
    const powers = [
      Math.abs(rx.rSph || 0),
      Math.abs(rx.lSph || 0),
      Math.abs((rx.rSph || 0) + (rx.rCyl || 0)),
      Math.abs((rx.lSph || 0) + (rx.lCyl || 0)),
    ].filter(p => p > 0);

    if (powers.length === 0) {
      // Default to 1.56 if no power
      return '1.56';
    }

    const maxPower = Math.max(...powers);

    // Base index recommendation based on power
    let baseIndex: string;
    if (maxPower <= 3) {
      baseIndex = '1.56';
    } else if (maxPower <= 5) {
      baseIndex = '1.60';
    } else if (maxPower <= 8) {
      baseIndex = '1.67';
    } else {
      baseIndex = '1.74';
    }

    // Adjust based on frame type
    if (frame?.frameType) {
      // Rimless frames need higher index for higher powers
      if (frame.frameType === 'RIMLESS' && maxPower > 2 && baseIndex === '1.56') {
        baseIndex = '1.60';
      }

      // Half-rim frames need higher index for higher powers
      if (frame.frameType === 'HALF_RIM' && maxPower > 4 && baseIndex === '1.56') {
        baseIndex = '1.67';
      }
    }

    return baseIndex;
  }

  /**
   * Get index display name
   */
  getIndexDisplayName(index: string): string {
    switch (index) {
      case '1.56':
        return '1.56';
      case '1.60':
        return '1.60';
      case '1.67':
        return '1.67';
      case '1.74':
        return '1.74';
      default:
        return '1.56';
    }
  }

  /**
   * Get index from string value
   */
  getIndexFromString(value: string): string | null {
    const normalized = value.replace(/[^0-9.]/g, '');
    switch (normalized) {
      case '1.56':
        return '1.56';
      case '1.60':
        return '1.60';
      case '1.67':
        return '1.67';
      case '1.74':
        return '1.74';
      default:
        return null;
    }
  }
}

