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
  itCode?: string;
  price?: number;
  roleTag?: 'BEST_MATCH' | 'RECOMMENDED_INDEX' | 'PREMIUM' | 'BUDGET' | 'OTHER';
  indexRecommendation?: {
    recommendedIndex: string; // INDEX_156, INDEX_160, etc.
    indexDelta: number; // >0 thinner, 0 ideal, <0 thicker
  };
  thicknessWarning?: boolean;
}

interface LensRecommendationCardProps {
  lens: RecommendedLens;
  isSelected: boolean;
  onSelect: () => void;
  recommendedIndex?: string; // INDEX_156, INDEX_160, etc. (from parent)
}

// Helper to convert INDEX_156 to "1.56" for display
const formatIndexDisplay = (index: string | undefined): string => {
  if (!index) return '';
  if (index.startsWith('INDEX_')) {
    return index.replace('INDEX_', '1.');
  }
  return index;
};

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
  const showThicknessWarning = (lens.thicknessWarning || indexDelta < 0) && recommendedIndex;

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
          
          {/* Thickness Warning */}
          {showThicknessWarning && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ This lens will be thicker than the ideal index for your power. 
              {displayRecommendedIndex && ` Recommended: ${displayRecommendedIndex} for a slimmer look.`}
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

      {matchPercent > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-600">Match</span>
            <span className="font-semibold text-blue-600">{matchPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(matchPercent, 100)}%` }}
            />
          </div>
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
        </div>
      </div>

      {lens.benefits && lens.benefits.length > 0 && (
        <div className="mt-3">
          <ul className="space-y-1 mb-3">
            {lens.benefits.slice(0, 4).map((benefit, idx) => (
              <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
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

