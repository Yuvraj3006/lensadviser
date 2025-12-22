'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Palette, CheckCircle, Sparkles } from 'lucide-react';

interface TintColor {
  id: string;
  code: string;
  name: string;
  hexColor?: string | null;
  imageUrl?: string | null;
  category: 'SOLID' | 'GRADIENT' | 'FASHION' | 'POLARIZED' | 'PHOTOCHROMIC';
  darknessPercent: number;
  isPolarized: boolean;
  isMirror: boolean;
}

interface MirrorCoating {
  id: string;
  code: string;
  name: string;
  imageUrl?: string | null;
  addOnPrice: number;
}

export default function TintColorSelectionPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;
  const [loading, setLoading] = useState(false);
  const [tintColors, setTintColors] = useState<TintColor[]>([]);
  const [mirrorCoatings, setMirrorCoatings] = useState<MirrorCoating[]>([]);
  const [selectedTintColor, setSelectedTintColor] = useState<string | null>(null);
  const [selectedMirror, setSelectedMirror] = useState<string | null>(null);
  const [selectedLens, setSelectedLens] = useState<any>(null);
  const [tintPricing, setTintPricing] = useState<Record<string, { finalPrice: number; breakdown: any }>>({});

  useEffect(() => {
    if (!sessionId) {
      router.push('/questionnaire/lens-type');
      return;
    }

    // Check if this is Power Sunglasses flow (tint selection after prescription, before lens selection)
    const savedLensType = localStorage.getItem('lenstrack_lens_type');
    const isPowerSunglasses = savedLensType === 'SUNGLASSES';

    // Load selected lens from session (if available - for post-lens-selection flow)
    const savedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
    if (savedLens) {
      const lens = JSON.parse(savedLens);
      setSelectedLens(lens);
      fetchTintColorsForLens(lens.id);
      // Fetch pricing for all tint colors when lens is selected
      if (lens.lensIndex) {
        // Will fetch pricing when user selects a tint color
      }
    } else if (isPowerSunglasses) {
      // For Power Sunglasses, show all available tint colors (before lens selection)
      fetchAllTintColors();
    } else {
      // For other flows, redirect to recommendations
      router.push(`/questionnaire/${sessionId}/recommendations`);
    }
  }, [sessionId, router]);

  const fetchAllTintColors = async () => {
    setLoading(true);
    try {
      // Fetch all active tint colors (public API, no auth required)
      const [tintResponse, mirrorResponse] = await Promise.all([
        fetch('/api/public/tint-colors'),
        fetch('/api/public/mirror-coatings'),
      ]);

      if (tintResponse.ok) {
        const tintData = await tintResponse.json();
        if (tintData.success) {
          setTintColors(tintData.data || []);
        }
      }

      if (mirrorResponse.ok) {
        const mirrorData = await mirrorResponse.json();
        if (mirrorData.success) {
          setMirrorCoatings(mirrorData.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tint colors:', error);
      showToast('error', 'Failed to load tint colors');
    } finally {
      setLoading(false);
    }
  };

  const fetchTintPricing = async (tintColorId: string, lensIndex: string) => {
    try {
      const response = await fetch(`/api/public/tint-colors/${tintColorId}/pricing?lensIndex=${lensIndex}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTintPricing(prev => ({
            ...prev,
            [tintColorId]: data.data,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch tint pricing:', error);
    }
  };

  const fetchTintColorsForLens = async (lensId: string) => {
    setLoading(true);
    try {
      // Fetch tint colors for this specific lens (requires auth)
      const response = await fetch(`/api/admin/lenses/${lensId}/tint-colors`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lenstrack_token') || ''}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTintColors(data.data.tintColors || []);
          setMirrorCoatings(data.data.mirrorCoatings || []);
        }
      } else {
        // Fallback to public API if auth fails
        fetchAllTintColors();
      }
    } catch (error) {
      console.error('Failed to fetch tint colors:', error);
      // Fallback to public API
      fetchAllTintColors();
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!selectedTintColor) {
      showToast('error', 'Please select a tint color');
      return;
    }

    // Save tint color and mirror selection
    const tintColor = tintColors.find(t => t.id === selectedTintColor);
    const mirror = selectedMirror ? mirrorCoatings.find(m => m.id === selectedMirror) : null;

    localStorage.setItem(`lenstrack_tint_selection_${sessionId}`, JSON.stringify({
      tintColorId: selectedTintColor,
      tintColor: tintColor,
      mirrorCoatingId: selectedMirror,
      mirrorCoating: mirror,
      mirrorAddOnPrice: mirror?.addOnPrice || 0,
    }));

    // Check if this is Power Sunglasses flow (before lens selection)
    const savedLensType = localStorage.getItem('lenstrack_lens_type');
    const isPowerSunglasses = savedLensType === 'SUNGLASSES';
    
    if (selectedLens) {
      // After lens selection → tint selection → offer summary
      router.push(`/questionnaire/${sessionId}/offer-summary/${selectedLens.id}`);
    } else if (isPowerSunglasses && !selectedLens) {
      // After prescription → frame entry → tint selection → recommendations
      // Frame has already been entered, so go directly to recommendations
      router.push(`/questionnaire/${sessionId}/recommendations`);
    } else {
      router.push(`/questionnaire/${sessionId}/recommendations`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading tint colors...</div>
      </div>
    );
  }

  const selectedMirrorObj = selectedMirror ? mirrorCoatings.find(m => m.id === selectedMirror) : null;
  const mirrorAddOn = selectedMirrorObj?.addOnPrice || 0;

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
            <Palette size={32} />
            Select Tint Color & Mirror Coating
          </h1>
          <p className="text-slate-300 mb-6">
            {selectedLens 
              ? `Choose your preferred tint color for ${selectedLens.name}`
              : 'Choose your preferred tint color and mirror coating for your Power Sunglasses'}
          </p>

          <div className="bg-white rounded-xl p-6 space-y-6 mb-6">
            {/* Tint Colors - Grouped by Category */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Tint Color Chart</h2>
              
              {/* Group by category */}
              {['SOLID', 'GRADIENT', 'FASHION', 'POLARIZED', 'PHOTOCHROMIC'].map((category) => {
                const categoryColors = tintColors.filter(c => c.category === category);
                if (categoryColors.length === 0) return null;

                return (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-3 capitalize">{category} Colors</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {categoryColors.map((color) => {
                        const isSelected = selectedTintColor === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => {
                              setSelectedTintColor(color.id);
                              // Fetch pricing if lens is selected
                              if (selectedLens?.lensIndex) {
                                fetchTintPricing(color.id, selectedLens.lensIndex);
                              }
                            }}
                            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-300'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Color Swatch */}
                            <div className="relative mb-3">
                              {color.imageUrl ? (
                                <img
                                  src={color.imageUrl}
                                  alt={color.name}
                                  className="w-full h-20 rounded object-cover"
                                  onError={(e) => {
                                    // Fallback to hex color if image fails
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-full h-20 rounded ${color.imageUrl ? 'hidden' : ''}`}
                                style={{
                                  backgroundColor: color.hexColor || '#cccccc',
                                }}
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-1">
                                  <CheckCircle size={16} className="text-white" />
                                </div>
                              )}
                            </div>
                            
                            {/* Color Info */}
                            <div className="text-left">
                              <div className="text-sm font-bold text-slate-900">{color.name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-1">Code: {color.code}</div>
                              <div className="text-xs text-slate-600 mt-1">{color.darknessPercent}% Darkness</div>
                              {color.isPolarized && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Sparkles size={12} className="text-blue-500" />
                                  <span className="text-xs text-blue-600 font-medium">Polarized</span>
                                </div>
                              )}
                              {/* Tint Pricing Display */}
                              {selectedLens && tintPricing[color.id] && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                  <div className="text-xs font-semibold text-green-600">
                                    +₹{tintPricing[color.id].finalPrice.toLocaleString()}
                                  </div>
                                  {tintPricing[color.id].breakdown.indexAdjustment > 0 && (
                                    <div className="text-xs text-slate-500">
                                      Index: +₹{tintPricing[color.id].breakdown.indexAdjustment}
                                    </div>
                                  )}
                                  {tintPricing[color.id].breakdown.categoryAdjustment > 0 && (
                                    <div className="text-xs text-slate-500">
                                      Category: +₹{tintPricing[color.id].breakdown.categoryAdjustment}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {tintColors.length === 0 && (
                <p className="text-slate-500 text-center py-8">No tint colors available</p>
              )}
            </div>

            {/* Mirror Coating Selection */}
            {mirrorCoatings.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Mirror Coating (Optional)</h2>
                <p className="text-sm text-slate-600 mb-4">Add a mirror coating for enhanced style and UV protection</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedMirror(null)}
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      !selectedMirror
                        ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">No Mirror</div>
                    <div className="text-xs text-slate-600 mt-1">Standard</div>
                    <div className="text-xs text-green-600 font-medium mt-1">₹0</div>
                  </button>
                  {mirrorCoatings.map((mirror) => {
                    const isSelected = selectedMirror === mirror.id;
                    return (
                      <button
                        key={mirror.id}
                        type="button"
                        onClick={() => setSelectedMirror(mirror.id)}
                        className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-300'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {mirror.imageUrl && (
                          <img
                            src={mirror.imageUrl}
                            alt={mirror.name}
                            className="w-full h-16 rounded mb-2 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="text-sm font-semibold text-slate-900">{mirror.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1">Code: {mirror.code}</div>
                        <div className="text-xs font-bold text-blue-600 mt-1">+₹{mirror.addOnPrice.toLocaleString()}</div>
                        {isSelected && (
                          <div className="mt-2 flex items-center justify-center">
                            <CheckCircle size={16} className="text-blue-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Summary */}
            {selectedTintColor && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200 shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Price Summary</h3>
                {selectedLens && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-700 font-medium">Lens Base Price:</span>
                    <span className="font-semibold text-slate-900">₹{selectedLens.baseOfferPrice?.toLocaleString() || '0'}</span>
                  </div>
                )}
                {/* Tint Price */}
                {selectedTintColor && selectedLens && tintPricing[selectedTintColor] && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-700 font-medium">Tint Color Add-on:</span>
                    <span className="font-semibold text-blue-600">+₹{tintPricing[selectedTintColor].finalPrice.toLocaleString()}</span>
                    {tintPricing[selectedTintColor].breakdown.indexAdjustment > 0 && (
                      <span className="text-xs text-slate-500 ml-2">
                        (Index: +₹{tintPricing[selectedTintColor].breakdown.indexAdjustment})
                      </span>
                    )}
                    {tintPricing[selectedTintColor].breakdown.categoryAdjustment > 0 && (
                      <span className="text-xs text-slate-500 ml-2">
                        (Category: +₹{tintPricing[selectedTintColor].breakdown.categoryAdjustment})
                      </span>
                    )}
                  </div>
                )}
                {mirrorAddOn > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-700 font-medium">Mirror Coating Add-on:</span>
                    <span className="font-semibold text-blue-600">+₹{mirrorAddOn.toLocaleString()}</span>
                  </div>
                )}
                {selectedLens && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-blue-300">
                    <span className="text-lg font-bold text-slate-900">Estimated Total:</span>
                    <span className="text-xl font-bold text-blue-700">
                      ₹{((selectedLens.baseOfferPrice || 0) + (selectedTintColor && tintPricing[selectedTintColor] ? tintPricing[selectedTintColor].finalPrice : 0) + mirrorAddOn).toLocaleString()}
                    </span>
                  </div>
                )}
                {!selectedLens && mirrorAddOn > 0 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-blue-300">
                    <span className="text-lg font-bold text-slate-900">Mirror Coating:</span>
                    <span className="text-xl font-bold text-blue-700">
                      +₹{mirrorAddOn.toLocaleString()}
                    </span>
                  </div>
                )}
                {!selectedLens && (
                  <p className="text-sm text-slate-600 mt-3 italic">
                    Final price will be calculated after lens selection
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                const savedLensType = localStorage.getItem('lenstrack_lens_type');
                const isPowerSunglasses = savedLensType === 'SUNGLASSES';
                
                if (isPowerSunglasses && !selectedLens) {
                  // Back to prescription
                  router.push('/questionnaire/prescription');
                } else if (selectedLens) {
                  // Back to recommendations
                  router.push(`/questionnaire/${sessionId}/recommendations`);
                } else {
                  router.push('/questionnaire/prescription');
                }
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedTintColor || loading}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-50"
            >
              <CheckCircle size={20} />
              {selectedLens ? 'Continue to Offer Summary' : 'Continue to Frame Entry'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

