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
   * Calculate maximum power from prescription
   */
  computeMaxPower(rx: RxInput): number {
    const powers = [
      Math.abs(rx.rSph || 0),
      Math.abs(rx.lSph || 0),
      Math.abs((rx.rSph || 0) + (rx.rCyl || 0)),
      Math.abs((rx.lSph || 0) + (rx.lCyl || 0)),
    ].filter(p => p > 0);

    return powers.length > 0 ? Math.max(...powers) : 0;
  }

  /**
   * Recommend lens index based on prescription power and frame type
   * Returns LensIndex enum value (INDEX_156, INDEX_160, INDEX_167, INDEX_174)
   */
  recommendIndex(rx: RxInput, frame?: FrameInput | null): 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174' {
    const maxPower = this.computeMaxPower(rx);

    // Base index recommendation based on power
    let baseIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174';
    if (maxPower <= 3) {
      baseIndex = 'INDEX_156';
    } else if (maxPower <= 5) {
      baseIndex = 'INDEX_160';
    } else if (maxPower <= 8) {
      baseIndex = 'INDEX_167';
    } else {
      baseIndex = 'INDEX_174';
    }

    // Adjust based on frame type
    if (frame?.frameType) {
      // Rimless frames need higher index for higher powers
      if (frame.frameType === 'RIMLESS' && maxPower > 2 && baseIndex === 'INDEX_156') {
        baseIndex = 'INDEX_160';
      }

      // Half-rim frames need higher index for higher powers
      if (frame.frameType === 'HALF_RIM' && maxPower > 4 && baseIndex === 'INDEX_156') {
        baseIndex = 'INDEX_167';
      }
    }

    return baseIndex;
  }

  /**
   * Calculate index delta (thickness difference)
   * Returns: >0 if thinner than recommended, 0 if ideal, <0 if thicker
   */
  calculateIndexDelta(
    lensIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174',
    recommendedIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174'
  ): number {
    const indexRank: Record<string, number> = {
      'INDEX_156': 1,
      'INDEX_160': 2,
      'INDEX_167': 3,
      'INDEX_174': 4,
    };

    return indexRank[lensIndex] - indexRank[recommendedIndex];
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

