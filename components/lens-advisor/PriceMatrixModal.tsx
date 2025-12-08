'use client';

/**
 * View All Lenses Modal Component
 * WF-06: Enhanced with sorting, match %, and thickness warnings
 */

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { X, AlertTriangle } from 'lucide-react';
import { IndexRecommendationService } from '@/services/index-recommendation.service';

interface PriceMatrixItem {
  itCode: string;
  name: string;
  index: string;
  category: string; // SV, PAL, BF, Tint
  price: number;
  brandLine?: string;
  visionType?: string;
  matchPercent?: number;
  yopoEligible?: boolean;
  benefits?: string[];
}

interface PriceMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lens: PriceMatrixItem) => void;
  sph?: number;
  cyl?: number;
  add?: number;
  visionType?: string;
  recommendedIndex?: string;
}

export function PriceMatrixModal({
  isOpen,
  onClose,
  onSelect,
  sph,
  cyl,
  add,
  visionType,
  recommendedIndex,
}: PriceMatrixModalProps) {
  const [loading, setLoading] = useState(false);
  const [priceMatrix, setPriceMatrix] = useState<PriceMatrixItem[]>([]);
  const [sortBy, setSortBy] = useState<'PRICE_HIGH' | 'PRICE_LOW' | 'MATCH_HIGH' | 'INDEX_THIN'>('PRICE_HIGH');
  const indexService = new IndexRecommendationService();

  useEffect(() => {
    if (isOpen) {
      fetchPriceMatrix();
    }
  }, [isOpen, sph, cyl, add, visionType]);

  const fetchPriceMatrix = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sph !== undefined) params.append('sph', sph.toString());
      if (cyl !== undefined) params.append('cyl', cyl.toString());
      if (add !== undefined) params.append('add', add.toString());
      if (visionType) params.append('visionType', visionType);

      const response = await fetch(`/api/products/lenses/price-matrix?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPriceMatrix(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch price matrix:', error);
    } finally {
      setLoading(false);
    }
  };

  // WF-06: Sort lenses
  const sortedLenses = useMemo(() => {
    const sorted = [...priceMatrix];
    switch (sortBy) {
      case 'PRICE_HIGH':
        return sorted.sort((a, b) => b.price - a.price);
      case 'PRICE_LOW':
        return sorted.sort((a, b) => a.price - b.price);
      case 'MATCH_HIGH':
        return sorted.sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0));
      case 'INDEX_THIN':
        // Sort by index number (lower = thinner)
        return sorted.sort((a, b) => {
          const aIndex = parseFloat(a.index.replace(/[^0-9.]/g, '')) || 0;
          const bIndex = parseFloat(b.index.replace(/[^0-9.]/g, '')) || 0;
          return aIndex - bIndex;
        });
      default:
        return sorted;
    }
  }, [priceMatrix, sortBy]);

  // Calculate thickness warning
  const getThicknessWarning = (lensIndex: string): string | null => {
    if (!recommendedIndex || !sph) return null;
    
    const lensIndexNum = parseFloat(lensIndex.replace(/[^0-9.]/g, '')) || 0;
    const recIndexNum = parseFloat(recommendedIndex.replace(/[^0-9.]/g, '')) || 0;
    
    if (lensIndexNum < recIndexNum) {
      const diff = ((recIndexNum - lensIndexNum) / recIndexNum) * 100;
      return `~${Math.round(diff)}% thicker than ideal for your power. Recommended index: ${recommendedIndex}`;
    }
    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="All lenses matching your power" size="lg">
      <div className="space-y-6">
        {/* WF-06: Sorting Dropdown */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Sorted by:</p>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            options={[
              { value: 'PRICE_HIGH', label: 'Price: High to Low' },
              { value: 'PRICE_LOW', label: 'Price: Low to High' },
              { value: 'MATCH_HIGH', label: 'Best Match First' },
              { value: 'INDEX_THIN', label: 'Thinnest First (Index)' },
            ]}
            className="w-48"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* WF-06: Lens Card in List */}
            {sortedLenses.map((item) => {
              const thicknessWarning = getThicknessWarning(item.index);
              return (
                <div
                  key={item.itCode}
                  className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{item.name}</h3>
                        {item.brandLine && (
                          <span className="text-sm text-slate-600">• {item.brandLine}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                        <span>Index {item.index}</span>
                        {item.visionType && <span>• {item.visionType}</span>}
                        {item.matchPercent && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {item.matchPercent}% Match
                          </span>
                        )}
                      </div>
                      {item.benefits && item.benefits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.benefits.slice(0, 3).map((benefit, idx) => (
                            <span
                              key={idx}
                              className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded"
                            >
                              {benefit}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* WF-06: Warning text */}
                      {thicknessWarning && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                          <span>{thicknessWarning}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-slate-900 mb-2">
                        ₹{item.price.toLocaleString()}
                      </div>
                      <div className="flex gap-2 mb-2">
                        {item.yopoEligible && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                            YOPO
                          </span>
                        )}
                      </div>
                      {/* WF-06: CTA per card */}
                      <Button
                        size="sm"
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && priceMatrix.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No lenses found for this prescription
          </div>
        )}

        {/* WF-06: Footer CTA */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

