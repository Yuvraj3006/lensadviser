'use client';

/**
 * Step 5: Offer Calculator View
 * Matches Frontend Specification exactly - Two-column layout
 */

import { useState, useEffect } from 'react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Calculator, Tag, Percent, Ticket, Package, Printer, ShoppingCart } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { OfferCalculationResult } from '@/types/offer-engine';

// CustomerCategory is a string field, not an enum in Prisma
const CustomerCategory = ['REGULAR', 'SENIOR_CITIZEN', 'STUDENT', 'CORPORATE'] as const;

export function OfferCalculatorView() {
  const { showToast } = useToast();
  const setCurrentStep = useLensAdvisorStore((state) => state.setCurrentStep);
  const frame = useLensAdvisorStore((state) => state.frame);
  const selectedLens = useLensAdvisorStore((state) => state.selectedLens);
  const offerResult = useLensAdvisorStore((state) => state.offerResult);
  const customerCategory = useLensAdvisorStore((state) => state.customerCategory);
  const couponCode = useLensAdvisorStore((state) => state.couponCode);
  const setOfferResult = useLensAdvisorStore((state) => state.setOfferResult);
  const setCustomerCategory = useLensAdvisorStore((state) => state.setCustomerCategory);
  const setCouponCode = useLensAdvisorStore((state) => state.setCouponCode);

  const [organizationId, setOrganizationId] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Get organization ID (should be from auth context)
  useEffect(() => {
    const token = localStorage.getItem('lenstrack_token');
    if (token) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.organizationId) {
            setOrganizationId(data.data.organizationId);
          }
        });
    }
  }, []);

  const handleCalculate = async () => {
    if (!frame || !selectedLens || !organizationId) {
      showToast('error', 'Please complete previous steps');
      return;
    }

    setCalculating(true);
    try {
      const response = await fetch('/api/offers/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame,
          lens: {
            itCode: selectedLens.itCode,
            price: selectedLens.price,
            brandLine: selectedLens.brandLine,
            yopoEligible: selectedLens.yopoEligible,
          },
          customerCategory: customerCategory || null,
          couponCode: couponCode || null,
          organizationId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOfferResult(data.data);
        showToast('success', 'Offers calculated successfully!');
      } else {
        showToast('error', data.error?.message || 'Failed to calculate offers');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setCalculating(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setApplyingCoupon(true);
    await handleCalculate();
    setApplyingCoupon(false);
  };

  const handleConfirm = () => {
    // Navigate to checkout step
    setCurrentStep(6);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!frame || !selectedLens) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="text-blue-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Offer & Quote</h2>
            <p className="text-slate-600">Please complete previous steps first</p>
          </div>
        </div>
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setCurrentStep(4)}>
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WF-07: Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Your Final Price</h2>
      </div>

      {/* WF-07: Top Summary */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-slate-600 mb-1">Selected Lens</p>
            <p className="font-semibold text-slate-900">
              {selectedLens.name} - ₹{selectedLens.price.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Selected Frame</p>
            <p className="font-semibold text-slate-900">
              {frame.brand} - ₹{frame.mrp?.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: OfferConfigPanel */}
        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-900">Offer Configuration</h3>
          
          <div className="space-y-4">
            <Select
              label="Customer Category"
              value={customerCategory || ''}
              onChange={(e) => setCustomerCategory(e.target.value || null)}
              options={[
                { value: '', label: 'Regular Customer' },
                ...Object.values(CustomerCategory).map((cat) => ({
                  value: cat,
                  label: cat.replace('_', ' '),
                })),
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Coupon Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={couponCode || ''}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g., WELCOME10"
                  className="flex-1"
                />
                <Button
                  onClick={handleApplyCoupon}
                  loading={applyingCoupon}
                  disabled={!couponCode}
                >
                  Apply
                </Button>
              </div>
            </div>

            <Button
              onClick={handleCalculate}
              loading={calculating}
              fullWidth
              size="lg"
            >
              Calculate Offers
            </Button>
          </div>
        </div>

        {/* WF-07: Middle - Price Breakdown Card */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-900">Price Breakdown</h3>
          
          {offerResult ? (
            <div className="space-y-3">
              {/* Base Prices */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Frame MRP</span>
                  <span className="font-medium">₹{offerResult.frameMRP.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Lens Price</span>
                  <span className="font-medium">₹{offerResult.lensPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* WF-07: Applied Offers with explanations */}
              {offerResult.offersApplied.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  {offerResult.offersApplied.map((offer, idx) => {
                    let explanation = '';
                    if (offer.description.includes('YOPO')) {
                      explanation = 'You pay only the higher of frame or lens.';
                    } else if (offer.description.includes('Combo')) {
                      explanation = 'Special package price applied.';
                    } else if (offer.description.includes('Free Lens')) {
                      explanation = `Lens free up to ₹X; you pay only difference.`;
                    }
                    
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="flex items-center gap-1">
                            <Tag size={12} />
                            {offer.description}
                          </span>
                          <span>-₹{offer.savings.toLocaleString()}</span>
                        </div>
                        {explanation && (
                          <p className="text-xs text-slate-500 ml-5">{explanation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Category Discount */}
              {offerResult.categoryDiscount && (
                <div className="flex justify-between text-sm text-blue-600 pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Percent size={12} />
                    {offerResult.categoryDiscount.description}
                  </span>
                  <span>-₹{offerResult.categoryDiscount.savings.toLocaleString()}</span>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                <span>Subtotal</span>
                <span>₹{offerResult.baseTotal.toLocaleString()}</span>
              </div>

              {/* Total Discount */}
              <div className="flex justify-between text-sm text-green-600 pt-2 border-t">
                <span>Total Discount</span>
                <span>-₹{(offerResult.baseTotal - offerResult.finalPayable).toLocaleString()}</span>
              </div>

              {/* WF-07: Final Payable (large, bold) */}
              <div className="pt-4 border-t-2 border-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-slate-900">Final Payable</span>
                  <span className="text-3xl font-bold text-green-600">
                    ₹{offerResult.finalPayable.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p>Click "Calculate Offers" to see breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* WF-07: Upsell Strip (sticky banner at bottom) */}
      {offerResult?.upsell && (
        <div className="sticky bottom-0 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg p-4 text-white shadow-lg z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg mb-1">{offerResult.upsell.message}</p>
              <p className="text-sm opacity-90">{offerResult.upsell.rewardText}</p>
            </div>
            <Button
              variant="outline"
              className="bg-white text-purple-600 hover:bg-purple-50 border-white"
              onClick={() => {
                // Could navigate to bonus products page or show modal
                showToast('info', 'Bonus products feature coming soon!');
              }}
            >
              See Eligible Products
            </Button>
          </div>
        </div>
      )}

      {/* WF-07: Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setCurrentStep(4)}>
          Change Lens
        </Button>
        <Button
          onClick={handleConfirm}
          size="lg"
          disabled={!offerResult}
        >
          Proceed to Checkout →
        </Button>
      </div>
    </div>
  );
}
