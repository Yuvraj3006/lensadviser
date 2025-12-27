'use client';

import { Button } from '@/components/ui/Button';

/**
 * Lens Recommendation Card Component
 * Matches Frontend Specification exactly
 */

interface RecommendedLens {
  id: string;
  name: string;
  brandLine?: string;
  visionType?: string;
  index?: string;
  lensIndex?: string; // INDEX_156, INDEX_160, etc.
  mrp?: number;
  offerPrice?: number;
  yopoEligible?: boolean;
  matchScore?: number;
  matchPercent?: number;
  benefits?: string[];
  features?: Array<{
    id: string;
    name: string;
    key: string;
    iconUrl?: string | null;
    strength: number;
    price: number;
  }>;
  pricing?: {
    lensPrice: {
      rxAddOnBreakdown?: Array<{
        label: string;
        charge: number;
        matchedBand: any;
      }>;
    };
  };
  itCode?: string;
  price?: number;
  roleTag?: 'BEST_MATCH' | 'RECOMMENDED_INDEX' | 'PREMIUM' | 'BUDGET' | 'OTHER';
  label?: string; // 'Recommended', 'Premium', 'Value', 'Lowest Price', etc.
  canTry?: boolean; // Show "Can Try" badge for last product
  indexRecommendation?: {
    recommendedIndex: string; // INDEX_156, INDEX_160, etc.
    indexDelta: number; // >0 thinner, 0 ideal, <0 thicker
    validationMessage?: string | null; // Warning or error message
    isInvalid?: boolean; // True if violates rules (e.g., INDEX_156 for rimless)
    isWarning?: boolean; // True if thicker than recommended
  };
  thicknessWarning?: boolean;
  indexInvalid?: boolean; // True if index selection violates rules
}

interface LensRecommendationCardProps {
  lens: RecommendedLens;
  isSelected: boolean;
  onSelect: () => void;
  recommendedIndex?: string; // INDEX_156, INDEX_160, etc. (from parent)
}

import { formatIndexDisplay } from '@/lib/format-index';

const roleTagConfig = {
  BEST_MATCH: { label: 'Best Match', color: 'bg-blue-600 text-white' },
  RECOMMENDED_INDEX: { label: 'Recommended Index', color: 'bg-green-600 text-white' },
  PREMIUM: { label: 'Premium Upgrade', color: 'bg-purple-600 text-white' },
  BUDGET: { label: 'Budget Option', color: 'bg-orange-600 text-white' },
  OTHER: { label: '', color: '' },
};

export function LensRecommendationCard({ lens, isSelected, onSelect, recommendedIndex }: LensRecommendationCardProps) {
  const roleTag = lens.roleTag || 'OTHER';
  const tagConfig = roleTagConfig[roleTag];
  const matchPercent = lens.matchPercent || lens.matchScore || 0;
  
  // Get lens index for comparison
  const lensIndex = lens.lensIndex || lens.index || '';
  const displayIndex = formatIndexDisplay(lensIndex);
  const displayRecommendedIndex = formatIndexDisplay(recommendedIndex || lens.indexRecommendation?.recommendedIndex);
  
  // Determine index badge
  const indexDelta = lens.indexRecommendation?.indexDelta ?? 
    (recommendedIndex && lensIndex ? 
      (() => {
        const indexRank: Record<string, number> = {
          'INDEX_156': 1,
          'INDEX_160': 2,
          'INDEX_167': 3,
          'INDEX_174': 4,
        };
        const recRank = indexRank[recommendedIndex] || 0;
        const lensRank = indexRank[lensIndex] || 0;
        return lensRank - recRank;
      })() : 0);
  
  const isBestIndex = indexDelta === 0 && recommendedIndex && lensIndex === recommendedIndex;
  const isExtraThin = indexDelta > 0;
  const showThicknessWarning = (lens.thicknessWarning || indexDelta < 0 || lens.indexRecommendation?.isWarning) && recommendedIndex;
  const showInvalidWarning = lens.indexInvalid || lens.indexRecommendation?.isInvalid;
  const validationMessage = lens.indexRecommendation?.validationMessage;

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
        isSelected
          ? 'border-blue-600 bg-blue-50 shadow-lg'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      {/* Role Tag */}
      {tagConfig.label && (
        <div className="mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tagConfig.color}`}>
            {tagConfig.label}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 mb-1">{lens.name}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            {lens.brandLine && <span>{lens.brandLine}</span>}
            {lens.visionType && <span>• {lens.visionType}</span>}
            {displayIndex && <span>• Index {displayIndex}</span>}
          </div>
          
          {/* Index Recommendation Badges */}
          {displayIndex && recommendedIndex && (
            <div className="flex items-center gap-2 flex-wrap">
              {isBestIndex && (
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                  ✓ Best Index for your power
                </span>
              )}
              {isExtraThin && !isBestIndex && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  Extra Thin
                </span>
              )}
            </div>
          )}
          
          {/* Invalid Index Warning (e.g., INDEX_156 for rimless) */}
          {showInvalidWarning && (
            <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded text-xs text-red-800 font-medium">
              ❌ {validationMessage || 'This index is not suitable for your frame type. Please select a different lens.'}
            </div>
          )}
          
          {/* Thickness Warning */}
          {showThicknessWarning && !showInvalidWarning && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ {validationMessage || `This lens will be thicker than the ideal index for your power. Recommended: ${displayRecommendedIndex} for a slimmer look.`}
            </div>
          )}
          
          {/* Premium Upsell Message */}
          {isExtraThin && !showThicknessWarning && !showInvalidWarning && validationMessage && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              ✨ {validationMessage}
            </div>
          )}
        </div>
        {lens.yopoEligible && (
          <div className="flex flex-col items-end gap-1">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
              YOPO Eligible
            </span>
            <span className="text-xs text-yellow-700">Pay Higher Value</span>
          </div>
        )}
      </div>

      {/* Label Badge - Show if label exists */}
      {lens.label && (
        <div className="mb-3">
          <span className={`px-3 py-1 text-xs font-bold rounded-full border inline-block ${
            lens.label === 'Recommended' 
              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200'
              : lens.label === 'Premium'
              ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200'
              : lens.label === 'Value'
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200'
              : lens.label === 'Lowest Price'
              ? 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border-orange-200'
              : 'bg-slate-100 text-slate-800 border-slate-200'
          }`}>
            {lens.label}
          </span>
          {lens.canTry && (
            <span className="ml-2 px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-lg border border-yellow-200">
              Can Try
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          {lens.mrp && (
            <div className="text-sm text-slate-500 line-through">₹{lens.mrp.toLocaleString()}</div>
          )}
          <div className="text-lg font-bold text-slate-900">
            ₹{(lens.offerPrice || lens.price || 0).toLocaleString()}
          </div>
          {/* RX Add-on breakdown */}
          {lens.pricing?.lensPrice?.rxAddOnBreakdown && lens.pricing.lensPrice.rxAddOnBreakdown.length > 0 && (
            <div className="text-xs text-slate-600 mt-1">
              {lens.pricing.lensPrice.rxAddOnBreakdown.map((addon, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{addon.label}</span>
                  <span>+₹{addon.charge}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lens.features && lens.features.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {lens.features.slice(0, 6).map((feature, idx) => (
              <div key={feature.id || idx} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-2 py-1 rounded-lg text-xs">
                {feature.iconUrl ? (
                  <img
                    src={feature.iconUrl.startsWith('http') ? feature.iconUrl : `${window.location.origin}${feature.iconUrl}?t=${Date.now()}`}
                    alt={feature.name}
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-4 h-4 bg-slate-300 rounded"></div>
                )}
                <span className="font-medium">{feature.name}</span>
              </div>
            ))}
          </div>
          {/* WF-05: Know more link */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Could show modal with full feature grid
              alert('Full feature details coming soon!');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Know more
          </button>
        </div>
      )}

      {/* WF-05: Price row */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <div className="text-sm text-slate-600 mb-1">
          Lens Price from: <span className="font-semibold text-slate-900">₹{(lens.offerPrice || lens.price || 0).toLocaleString()}</span>
        </div>
        <p className="text-xs text-slate-500">Offer, before frame & discounts</p>
      </div>

      {/* WF-05: Primary CTA */}
      <Button
        fullWidth
        onClick={onSelect}
        className="mt-4"
        variant={isSelected ? 'outline' : 'primary'}
      >
        {isSelected ? '✓ Selected' : 'Select This Lens'}
      </Button>
    </div>
  );
}

