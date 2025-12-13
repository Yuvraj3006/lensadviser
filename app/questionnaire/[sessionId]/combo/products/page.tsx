'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { UpgradeSuggestionModal } from '@/components/combo/UpgradeSuggestionModal';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function ComboProductsPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [selectedFrameBrand, setSelectedFrameBrand] = useState<string>('');
  const [selectedLensSku, setSelectedLensSku] = useState<string>('');
  const [frameMRP, setFrameMRP] = useState<string>('');
  const [secondEyewearChoice, setSecondEyewearChoice] = useState<'FRAME' | 'SUN' | ''>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeData, setUpgradeData] = useState<any>(null);
  const [frameBrands, setFrameBrands] = useState<any[]>([]);
  const [lensSkus, setLensSkus] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Fetch combo-eligible frame brands
      const brandsResponse = await fetch(`/api/brands?category=frame&context=COMBO`);
      if (brandsResponse.ok) {
        const brandsData = await brandsResponse.json();
        if (brandsData.success) {
          setFrameBrands(brandsData.data);
        }
      }

      // Fetch combo-eligible lens SKUs
      const lensesResponse = await fetch(`/api/lens-skus?context=COMBO`);
      if (lensesResponse.ok) {
        const lensesData = await lensesResponse.json();
        if (lensesData.success) {
          setLensSkus(lensesData.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showToast('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const validateSelection = async () => {
    if (!selectedFrameBrand || !selectedLensSku) {
      showToast('error', 'Please select both frame brand and lens');
      return;
    }

    if (!frameMRP || parseFloat(frameMRP) <= 0) {
      showToast('error', 'Please enter frame MRP');
      return;
    }

    if (!secondEyewearChoice) {
      showToast('error', 'Please select second eyewear option (Frame or Sunglasses)');
      return;
    }

    try {
      // Get session data for needs profile
      const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      const sessionData = await sessionResponse.json();
      
      // Get selected combo tier
      const selectedComboCode = sessionData.data?.session?.selectedComboCode || 'SILVER';

      const response = await fetch('/api/combo/validate-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          context: 'COMBO',
          combo_code: selectedComboCode,
          selected: {
            frame_brand_id: selectedFrameBrand,
            lens_sku_id: selectedLensSku,
            second_eyewear_choice: secondEyewearChoice as 'FRAME' | 'SUN' | null,
          },
          needs_profile: sessionData.data?.needsProfile || {},
        }),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const data = await response.json();
      if (data.success) {
        if (data.data.upgrade.suggest_upgrade) {
          // Track upgrade prompt shown
          const { analyticsService } = await import('@/services/analytics.service');
          await analyticsService.upgradePromptShown(
            sessionId,
            data.data.upgrade.reason_code as any,
            data.data.upgrade.from_tier || '',
            data.data.upgrade.to_tier || ''
          );
          
          // Show upgrade modal
          setUpgradeData(data.data.upgrade);
          setShowUpgradeModal(true);
        } else {
          // Save selection to localStorage for review page
          const selectedFrameBrandObj = frameBrands.find(b => b.brand_id === selectedFrameBrand);
          const selectedLensObj = lensSkus.find(l => l.lens_sku_id === selectedLensSku);
          
          localStorage.setItem(`combo_selection_${sessionId}`, JSON.stringify({
            frameBrand: selectedFrameBrandObj,
            lens: selectedLensObj,
            frameMRP: parseFloat(frameMRP),
            secondEyewearChoice,
          }));

          // Proceed to review
          router.push(`/questionnaire/${sessionId}/combo/review`);
        }
      }
    } catch (error) {
      console.error('Failed to validate selection:', error);
      showToast('error', 'Failed to validate selection');
    }
  };

  const handleUpgrade = async () => {
    if (!upgradeData?.to_tier) {
      setShowUpgradeModal(false);
      return;
    }

    try {
      // Update session with upgraded tier
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchaseContext: 'COMBO',
          selectedComboCode: upgradeData.to_tier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upgrade tier');
      }

      // Track upgrade accepted
      const { analyticsService } = await import('@/services/analytics.service');
      await analyticsService.upgradeAccepted(
        sessionId,
        upgradeData.from_tier || '',
        upgradeData.to_tier || ''
      );

      setShowUpgradeModal(false);
      showToast('success', `Upgraded to ${upgradeData.to_tier} Combo`);
      
      // Re-fetch products with new tier eligibility
      fetchProducts();
    } catch (error) {
      console.error('Failed to upgrade tier:', error);
      showToast('error', 'Failed to upgrade tier');
    }
  };

  const handleSwitchToRegular = async () => {
    // Track upgrade rejected / switched to regular
    if (upgradeData) {
      const { analyticsService } = await import('@/services/analytics.service');
      await analyticsService.switchedToRegularFromCombo(sessionId);
    }
    
    // Update session to REGULAR context
    // Reset cart and navigate
    router.push(`/questionnaire/${sessionId}/recommendations`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">
            Select Your Products
          </h1>

          {/* Frame Brand Selection */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Frame Brand</h2>
            <select
              value={selectedFrameBrand}
              onChange={(e) => setSelectedFrameBrand(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Select Frame Brand</option>
              {frameBrands.map((brand) => (
                <option key={brand.brand_id} value={brand.brand_id}>
                  {brand.brand_name}
                </option>
              ))}
            </select>
          </div>

          {/* Lens SKU Selection */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Lens</h2>
            <select
              value={selectedLensSku}
              onChange={(e) => setSelectedLensSku(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white mb-3"
            >
              <option value="">Select Lens</option>
              {lensSkus.map((lens) => (
                <option key={lens.lens_sku_id} value={lens.lens_sku_id}>
                  {lens.name} - {lens.lens_brand_name} (₹{lens.base_offer_price})
                </option>
              ))}
            </select>
            {selectedLensSku && (
              <div className="text-sm text-slate-400 mt-2">
                Selected: {lensSkus.find(l => l.lens_sku_id === selectedLensSku)?.name}
              </div>
            )}
          </div>

          {/* Frame MRP Input */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Frame MRP</h2>
            <input
              type="number"
              value={frameMRP}
              onChange={(e) => setFrameMRP(e.target.value)}
              placeholder="Enter Frame MRP (₹)"
              min="0"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>

          {/* Second Eyewear Selection */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Second Eyewear <span className="text-red-400">*</span>
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Choose exactly one option (Frame or Sunglasses)
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  name="secondEyewear"
                  value="FRAME"
                  checked={secondEyewearChoice === 'FRAME'}
                  onChange={(e) => setSecondEyewearChoice(e.target.value as 'FRAME')}
                  className="w-5 h-5 text-purple-600"
                />
                <div>
                  <div className="font-medium text-white">Second Frame</div>
                  <div className="text-sm text-slate-400">Additional frame for backup</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  name="secondEyewear"
                  value="SUN"
                  checked={secondEyewearChoice === 'SUN'}
                  onChange={(e) => setSecondEyewearChoice(e.target.value as 'SUN')}
                  className="w-5 h-5 text-purple-600"
                />
                <div>
                  <div className="font-medium text-white">Sunglasses</div>
                  <div className="text-sm text-slate-400">Sunglasses for outdoor use</div>
                </div>
              </label>
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <Button
              onClick={validateSelection}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 min-w-[200px]"
            >
              Continue to Review
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Upgrade Suggestion Modal */}
      {showUpgradeModal && upgradeData && (
        <UpgradeSuggestionModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgrade={handleUpgrade}
          onSwitchToRegular={handleSwitchToRegular}
          onChangeSelection={() => setShowUpgradeModal(false)}
          fromTier={upgradeData.from_tier}
          toTier={upgradeData.to_tier || ''}
          reasonCode={upgradeData.reason_code || ''}
          customerMessage={upgradeData.customer_message || ''}
        />
      )}
    </div>
  );
}

