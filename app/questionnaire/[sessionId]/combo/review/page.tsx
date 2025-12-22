'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Check, ArrowLeft, ArrowRight, Package, Glasses, Eye } from 'lucide-react';

interface ComboTier {
  combo_code: string;
  display_name: string;
  effective_price: number;
  total_combo_value?: number | null;
  badge?: string;
  benefits: Array<{
    type: string;
    label: string;
  }>;
}

interface SessionData {
  session: {
    purchaseContext: string;
    selectedComboCode: string;
  };
  needsProfile?: any;
}

export default function ComboReviewPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [comboTier, setComboTier] = useState<ComboTier | null>(null);
  const [selectedFrameBrand, setSelectedFrameBrand] = useState<any>(null);
  const [selectedLens, setSelectedLens] = useState<any>(null);
  const [secondEyewearChoice, setSecondEyewearChoice] = useState<string>('');

  useEffect(() => {
    fetchReviewData();
  }, []);

  const fetchReviewData = async () => {
    try {
      // Fetch session data
      const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      if (!sessionResponse.ok) throw new Error('Failed to fetch session');
      const sessionResult = await sessionResponse.json();
      setSessionData(sessionResult.data);

      const selectedComboCode = sessionResult.data?.session?.selectedComboCode;
      if (!selectedComboCode) {
        showToast('error', 'No combo tier selected');
        router.push(`/questionnaire/${sessionId}/combo/tiers`);
        return;
      }

      // Fetch combo tier details
      const tiersResponse = await fetch('/api/combo/tiers');
      if (!tiersResponse.ok) throw new Error('Failed to fetch combo tiers');
      const tiersResult = await tiersResponse.json();
      const tier = tiersResult.data?.find((t: ComboTier) => t.combo_code === selectedComboCode);
      setComboTier(tier || null);

      // Fetch selected products from localStorage or session
      const savedSelection = localStorage.getItem(`combo_selection_${sessionId}`);
      if (savedSelection) {
        const selection = JSON.parse(savedSelection);
        setSelectedFrameBrand(selection.frameBrand);
        setSelectedLens(selection.lens);
        setSecondEyewearChoice(selection.secondEyewearChoice || '');
      }
    } catch (error) {
      console.error('Failed to fetch review data:', error);
      showToast('error', 'Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToCheckout = async () => {
    // Get selected products from localStorage
    const savedSelection = localStorage.getItem(`combo_selection_${sessionId}`);
    if (!savedSelection) {
      showToast('error', 'Please complete product selection first');
      router.push(`/questionnaire/${sessionId}/combo/products`);
      return;
    }

    const selection = JSON.parse(savedSelection);
    if (!selection.lens) {
      showToast('error', 'Please select products first');
      router.push(`/questionnaire/${sessionId}/combo/products`);
      return;
    }

    // Navigate to checkout with combo context
    // Pass combo tier code in URL for offer engine
    router.push(`/questionnaire/${sessionId}/checkout/${selection.lens.lens_sku_id}?context=COMBO&comboCode=${sessionData?.session?.selectedComboCode || ''}`);
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!comboTier) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Combo tier not found</p>
          <Button onClick={() => router.push(`/questionnaire/${sessionId}/combo/tiers`)}>
            Select Combo Tier
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4 sm:mb-6 text-slate-400 hover:text-white w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2" size={20} />
            Back
          </Button>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">Review Your Combo</h1>

          {/* Combo Tier Summary */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-purple-700 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{comboTier.display_name} Combo</h2>
                {comboTier.badge && (
                  <span className="inline-block mt-2 px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                    {comboTier.badge}
                  </span>
                )}
              </div>
              <div className="text-left sm:text-right">
                {comboTier.total_combo_value && (
                  <div className="text-lg sm:text-xl text-slate-400 line-through mb-1">
                    ₹{comboTier.total_combo_value.toLocaleString()}
                  </div>
                )}
                <div className="text-2xl sm:text-3xl font-bold text-purple-400">
                  ₹{comboTier.effective_price.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">Combo Price</div>
              </div>
            </div>
          </div>

          {/* Selected Products */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Selected Products</h3>
            
            <div className="space-y-4">
              {/* Frame */}
              {selectedFrameBrand && (
                <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg">
                  <Glasses className="text-purple-400" size={24} />
                  <div className="flex-1">
                    <div className="font-medium text-white">Frame</div>
                    <div className="text-sm text-slate-300">{selectedFrameBrand.brand_name}</div>
                  </div>
                </div>
              )}

              {/* Lens */}
              {selectedLens && (
                <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg">
                  <Eye className="text-purple-400" size={24} />
                  <div className="flex-1">
                    <div className="font-medium text-white">Lens</div>
                    <div className="text-sm text-slate-300">{selectedLens.name}</div>
                    <div className="text-xs text-slate-400">{selectedLens.lens_brand_name}</div>
                  </div>
                </div>
              )}

              {/* Second Eyewear */}
              {secondEyewearChoice && (
                <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg">
                  <Package className="text-purple-400" size={24} />
                  <div className="flex-1">
                    <div className="font-medium text-white">Second Eyewear</div>
                    <div className="text-sm text-slate-300">
                      {secondEyewearChoice === 'FRAME' ? 'Second Frame' : 'Sunglasses'}
                    </div>
                  </div>
                </div>
              )}

              {(!selectedFrameBrand || !selectedLens) && (
                <div className="text-center py-8 text-slate-400">
                  <p>Please complete product selection</p>
                  <Button
                    onClick={() => router.push(`/questionnaire/${sessionId}/combo/products`)}
                    className="mt-4"
                    variant="outline"
                  >
                    Select Products
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">What You Get</h3>
            <ul className="space-y-2">
              {comboTier.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-300">
                  <Check className="text-green-400 flex-shrink-0" size={20} />
                  <span>{benefit.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Final Price */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-200 text-sm mb-1">Total Payable</div>
                {comboTier.total_combo_value && (
                  <div className="text-xl text-slate-300 line-through mb-1">
                    ₹{comboTier.total_combo_value.toLocaleString()}
                  </div>
                )}
                <div className="text-4xl font-bold text-white">
                  ₹{comboTier.effective_price.toLocaleString()}
                </div>
              </div>
              <div className="text-right text-slate-200 text-sm">
                <div>Combo Price</div>
                <div className="text-xs mt-1">All benefits included</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={() => router.push(`/questionnaire/${sessionId}/combo/products`)}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Edit Selection
            </Button>
            <Button
              onClick={handleProceedToCheckout}
              disabled={!selectedFrameBrand || !selectedLens}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              Proceed to Checkout
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

