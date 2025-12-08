'use client';

import { useEffect } from 'react';

/**
 * Fixes Performance API negative timestamp errors for button measurements
 * This is a known issue with Next.js performance monitoring
 */
export function PerformanceFix() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // Wrap performance.measure to catch negative timestamp errors
    const originalMeasure = window.performance.measure.bind(window.performance);
    
    window.performance.measure = function(
      name: string,
      startMark?: string,
      endMark?: string
    ): PerformanceMeasure | null {
      try {
        return originalMeasure(name, startMark, endMark);
      } catch (error: any) {
        // Silently ignore negative timestamp errors for button measurements
        if (
          error?.message &&
          (error.message.includes('negative time stamp') ||
            error.message.includes('cannot have a negative time stamp')) &&
          name &&
          (name.includes('button') || name.includes('Button'))
        ) {
          console.debug(`[PerformanceFix] Suppressed negative timestamp error for: ${name}`);
          return null;
        }
        // Re-throw other errors
        throw error;
      }
    };

    // Cleanup on unmount
    return () => {
      window.performance.measure = originalMeasure;
    };
  }, []);

  return null;
}

