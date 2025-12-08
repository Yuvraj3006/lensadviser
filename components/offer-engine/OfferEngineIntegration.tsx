'use client';

/**
 * Complete Offer Engine Integration Component
 * Combines all offer engine components for easy integration
 */

import { OfferCalculationResult } from '@/types/offer-engine';
import { OfferEngineResultRenderer } from './OfferEngineResultRenderer';
import { OfferBreakdownPanel } from './OfferBreakdownPanel';
import { UpsellEngineUI } from './UpsellEngineUI';

interface OfferEngineIntegrationProps {
  result: OfferCalculationResult;
  upsellPlacement?: 'top' | 'bottom' | 'toast';
  onShopMore?: () => void;
  showBreakdown?: boolean;
  showUpsell?: boolean;
  className?: string;
}

export function OfferEngineIntegration({
  result,
  upsellPlacement = 'bottom',
  onShopMore,
  showBreakdown = true,
  showUpsell = true,
  className = '',
}: OfferEngineIntegrationProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Applied Offers */}
      <OfferEngineResultRenderer result={result} showBreakdown={false} />

      {/* Price Breakdown */}
      {showBreakdown && (
        <OfferBreakdownPanel result={result} showUpsell={false} />
      )}

      {/* Upsell Banner */}
      {showUpsell && result.upsell && (
        <UpsellEngineUI
          upsell={result.upsell}
          placement={upsellPlacement}
          onShopMore={onShopMore}
        />
      )}
    </div>
  );
}

