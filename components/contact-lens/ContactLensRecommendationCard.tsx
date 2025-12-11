'use client';

import { Button } from '@/components/ui/Button';
import { Star, ShoppingBag, GitCompare as Compare, Eye } from 'lucide-react';

interface ContactLensProduct {
  id: string;
  name: string;
  brand: string;
  line: string;
  mrp: number;
  offerPrice: number;
  modality: string;
  lensType: string;
  material: string;
  waterContent: string;
  packSize: number;
  matchScore: number;
  comfortScore: number;
  isColorLens?: boolean;
  colorOptions?: string[];
  powerRange?: {
    sphMin?: number;
    sphMax?: number;
    cylMin?: number;
    cylMax?: number;
    axisSteps?: string;
    addMin?: number;
    addMax?: number;
  };
}

interface ContactLensRecommendationCardProps {
  product: ContactLensProduct;
  type: 'BEST_MATCH' | 'PREMIUM_COMFORT' | 'VALUE' | 'BUDGET';
  onSelect: () => void;
  onCompare: () => void;
  onViewCompatibility: () => void;
}

const typeLabels = {
  BEST_MATCH: 'Best Match',
  PREMIUM_COMFORT: 'Premium Comfort Pick',
  VALUE: 'Value Pick',
  BUDGET: 'Budget Pick',
};

const typeColors = {
  BEST_MATCH: 'from-blue-500 to-blue-600',
  PREMIUM_COMFORT: 'from-purple-500 to-purple-600',
  VALUE: 'from-green-500 to-green-600',
  BUDGET: 'from-orange-500 to-orange-600',
};

export function ContactLensRecommendationCard({
  product,
  type,
  onSelect,
  onCompare,
  onViewCompatibility,
}: ContactLensRecommendationCardProps) {
  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          className={i <= score ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}
        />
      );
    }
    return stars;
  };

  const discount = product.mrp > product.offerPrice 
    ? Math.round(((product.mrp - product.offerPrice) / product.mrp) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-300 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Header Badge */}
      <div className={`bg-gradient-to-r ${typeColors[type]} text-white px-4 py-2 text-sm font-semibold`}>
        {typeLabels[type]}
      </div>

      <div className="p-6">
        {/* Product Name & Brand */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900 mb-1">{product.name}</h3>
          <p className="text-sm text-slate-600">{product.brand}</p>
        </div>

        {/* Match Score & Comfort Score */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">Match Score</div>
            <div className="text-2xl font-bold text-blue-600">{product.matchScore}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Comfort</div>
            <div className="flex items-center gap-1">
              {renderStars(product.comfortScore)}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          {discount > 0 && (
            <div className="text-sm text-slate-500 line-through mb-1">
              ₹{product.mrp.toLocaleString()}
            </div>
          )}
          <div className="text-2xl font-bold text-slate-900">
            ₹{product.offerPrice.toLocaleString()}
          </div>
          {discount > 0 && (
            <div className="text-sm text-green-600 font-semibold mt-1">
              {discount}% OFF
            </div>
          )}
        </div>

        {/* Specs Table */}
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Material:</span>
            <span className="font-semibold text-slate-900">{product.material}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Water Content:</span>
            <span className="font-semibold text-slate-900">{product.waterContent}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Usage:</span>
            <span className="font-semibold text-slate-900">{product.modality}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Vision Type:</span>
            <span className="font-semibold text-slate-900">{product.lensType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Pack Size:</span>
            <span className="font-semibold text-slate-900">{product.packSize} lenses</span>
          </div>
          {product.isColorLens && product.colorOptions && product.colorOptions.length > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Colors:</span>
              <span className="font-semibold text-slate-900">
                {product.colorOptions.length} options
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={onSelect}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
          >
            <ShoppingBag size={18} className="mr-2" />
            Select
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onCompare}
              variant="outline"
              className="w-full"
            >
              <Compare size={16} className="mr-1" />
              Compare
            </Button>
            <Button
              onClick={onViewCompatibility}
              variant="outline"
              className="w-full"
            >
              <Eye size={16} className="mr-1" />
              Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
