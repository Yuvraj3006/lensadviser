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
   * Advanced Rules:
   * - Rimless → 1.59+ mandatory (never allow INDEX_156)
   * - Power-based escalation: 4+, 6+ thresholds
   * Returns LensIndex enum value (INDEX_156, INDEX_160, INDEX_167, INDEX_174)
   */
  recommendIndex(rx: RxInput, frame?: FrameInput | null): 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174' {
    const maxPower = this.computeMaxPower(rx);

    // Advanced Rule 1: Rimless → 1.59+ mandatory (INDEX_160 minimum)
    // Never allow INDEX_156 for rimless frames, regardless of power
    if (frame?.frameType === 'RIMLESS') {
      // For rimless, start with INDEX_160 as minimum
      if (maxPower < 4) {
        return 'INDEX_160'; // Power < 4: 1.60 minimum for rimless
      } else if (maxPower < 6) {
        return 'INDEX_160'; // Power 4-5.99: 1.60 for rimless
      } else if (maxPower <= 8) {
        return 'INDEX_167'; // Power 6-8: 1.67 for rimless
      } else {
        return 'INDEX_174'; // Power > 8: 1.74 for rimless
      }
    }

    // Advanced Rule 2: Power-based escalation logic with 4+ and 6+ thresholds
    // Base index recommendation based on power (for non-rimless frames)
    let baseIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174';
    if (maxPower < 4) {
      baseIndex = 'INDEX_156'; // Power < 4: 1.56
    } else if (maxPower < 6) {
      baseIndex = 'INDEX_160'; // Power 4-5.99: 1.60 (4+ threshold)
    } else if (maxPower <= 8) {
      baseIndex = 'INDEX_167'; // Power 6-8: 1.67 (6+ threshold)
    } else {
      baseIndex = 'INDEX_174'; // Power > 8: 1.74
    }

    // Adjust based on frame type (for non-rimless)
    if (frame?.frameType) {
      // Half-rim frames need higher index for higher powers
      if (frame.frameType === 'HALF_RIM' && maxPower >= 4 && baseIndex === 'INDEX_156') {
        baseIndex = 'INDEX_160'; // Half-rim with power >= 4: upgrade to 1.60
      }
      if (frame.frameType === 'HALF_RIM' && maxPower >= 6 && baseIndex === 'INDEX_160') {
        baseIndex = 'INDEX_167'; // Half-rim with power >= 6: upgrade to 1.67
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
   * Check if a lens index is valid for the given frame type and power
   * Returns validation result with warning message if invalid
   */
  validateIndexSelection(
    lensIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174',
    rx: RxInput,
    frame?: FrameInput | null
  ): {
    isValid: boolean;
    isWarning: boolean;
    message: string | null;
    recommendedIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174';
  } {
    const recommendedIndex = this.recommendIndex(rx, frame);
    const maxPower = this.computeMaxPower(rx);
    const indexDelta = this.calculateIndexDelta(lensIndex, recommendedIndex);

    // Advanced Rule: Rimless → 1.59+ mandatory
    if (frame?.frameType === 'RIMLESS' && lensIndex === 'INDEX_156') {
      return {
        isValid: false,
        isWarning: false,
        message: 'Rimless frames require index 1.60 or higher. INDEX_156 is not allowed for rimless frames.',
        recommendedIndex,
      };
    }

    // Warning if index is thicker than recommended
    if (indexDelta < 0) {
      const indexNames: Record<string, string> = {
        'INDEX_156': '1.56',
        'INDEX_160': '1.60',
        'INDEX_167': '1.67',
        'INDEX_174': '1.74',
      };
      
      const thicknessDiff = Math.abs(indexDelta);
      const thicknessPercent = thicknessDiff === 1 ? '~20-30%' : thicknessDiff === 2 ? '~40-50%' : '~60%+';
      
      return {
        isValid: true, // Still valid, but with warning
        isWarning: true,
        message: `This lens will be ${thicknessPercent} thicker than ideal for your power (${maxPower.toFixed(2)}D). Recommended index: ${indexNames[recommendedIndex]}.`,
        recommendedIndex,
      };
    }

    // Premium upsell suggestion if index is thinner than recommended
    if (indexDelta > 0) {
      return {
        isValid: true,
        isWarning: false,
        message: `Premium choice! This index is thinner than the minimum recommended, providing a slimmer look.`,
        recommendedIndex,
      };
    }

    // Perfect match
    return {
      isValid: true,
      isWarning: false,
      message: null,
      recommendedIndex,
    };
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

