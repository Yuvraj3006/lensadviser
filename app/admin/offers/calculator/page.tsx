'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calculator, Tag, Percent, Ticket, Package } from 'lucide-react';
import { BRAND_LINES } from '@/lib/constants/lens';

// CustomerCategory enum (client-side safe)
const CustomerCategory = {
  STUDENT: 'STUDENT',
  DOCTOR: 'DOCTOR',
  TEACHER: 'TEACHER',
  ARMED_FORCES: 'ARMED_FORCES',
  SENIOR_CITIZEN: 'SENIOR_CITIZEN',
  CORPORATE: 'CORPORATE',
  REGULAR: 'REGULAR',
} as const;

type CustomerCategory = typeof CustomerCategory[keyof typeof CustomerCategory];
import { OfferCalculationResult } from '@/types/offer-engine';

export default function OfferCalculatorPage() {
  const { showToast } = useToast();
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OfferCalculationResult | null>(null);

  // Frame inputs
  const [frameBrand, setFrameBrand] = useState('');
  const [frameSubCategory, setFrameSubCategory] = useState('');
  const [frameMRP, setFrameMRP] = useState('');
  const [frameType, setFrameType] = useState<'FULL_RIM' | 'HALF_RIM' | 'RIMLESS' | ''>('');

  // Lens inputs
  const [lensItCode, setLensItCode] = useState('');
  const [lensPrice, setLensPrice] = useState('');
  const [lensBrandLine, setLensBrandLine] = useState('');
  const [yopoEligible, setYopoEligible] = useState(false);

  // Customer & Coupon
  const [customerCategory, setCustomerCategory] = useState<CustomerCategory | ''>('');
  const [couponCode, setCouponCode] = useState('');

  // Second Pair
  const [secondPairEnabled, setSecondPairEnabled] = useState(false);
  const [secondPairFrameMRP, setSecondPairFrameMRP] = useState('');
  const [secondPairLensPrice, setSecondPairLensPrice] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('lenstrack_token');
    if (token) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.organizationId) {
            setOrganizationId(data.data.organizationId);
          }
        });
    }
  }, []);

  const handleCalculate = async () => {
    if (!frameBrand || !frameMRP || !lensItCode || !lensPrice || !lensBrandLine || !organizationId) {
      showToast('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/offers/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: {
            brand: frameBrand,
            subCategory: frameSubCategory || null,
            mrp: parseFloat(frameMRP),
            frameType: frameType || undefined,
          },
          lens: {
            itCode: lensItCode,
            price: parseFloat(lensPrice),
            brandLine: lensBrandLine,
            yopoEligible,
          },
          customerCategory: customerCategory || null,
          couponCode: couponCode || null,
          secondPair: secondPairEnabled ? {
            enabled: true,
            firstPairTotal: parseFloat(frameMRP) + parseFloat(lensPrice),
            secondPairFrameMRP: parseFloat(secondPairFrameMRP) || 0,
            secondPairLensPrice: parseFloat(secondPairLensPrice) || 0,
          } : null,
          organizationId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        showToast('success', 'Offers calculated successfully!');
      } else {
        showToast('error', data.error?.message || 'Failed to calculate offers');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <Calculator className="text-blue-500" size={24} className="sm:w-7 sm:h-7" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Offer Calculator</h1>
        </div>
        <p className="text-sm sm:text-base text-slate-600">Calculate offers for frame + lens combinations</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Frame Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Frame Brand *"
                  value={frameBrand}
                  onChange={(e) => setFrameBrand(e.target.value.toUpperCase())}
                  placeholder="e.g., LENSTRACK, RAYBAN"
                  required
                />
                <Input
                  label="Sub-Category"
                  value={frameSubCategory}
                  onChange={(e) => setFrameSubCategory(e.target.value)}
                  placeholder="e.g., ESSENTIAL, ADVANCED"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Frame MRP (₹) *"
                  type="number"
                  value={frameMRP}
                  onChange={(e) => setFrameMRP(e.target.value)}
                  placeholder="2500"
                  required
                />
                <Select
                  label="Frame Type"
                  value={frameType}
                  onChange={(e) => setFrameType(e.target.value as any)}
                  options={[
                    { value: '', label: 'Select...' },
                    { value: 'FULL_RIM', label: 'Full Rim' },
                    { value: 'HALF_RIM', label: 'Half Rim' },
                    { value: 'RIMLESS', label: 'Rimless' },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-4">Lens Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="IT Code *"
                  value={lensItCode}
                  onChange={(e) => setLensItCode(e.target.value.toUpperCase())}
                  placeholder="e.g., D360ASV"
                  required
                />
                <Input
                  label="Lens Price (₹) *"
                  type="number"
                  value={lensPrice}
                  onChange={(e) => setLensPrice(e.target.value)}
                  placeholder="2500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Brand Line *"
                  value={lensBrandLine}
                  onChange={(e) => setLensBrandLine(e.target.value)}
                  options={BRAND_LINES.map(line => ({ value: line, label: line }))}
                  required
                />
                <label className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    checked={yopoEligible}
                    onChange={(e) => setYopoEligible(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium">YOPO Eligible</span>
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-4">Customer & Offers</h2>
            <div className="space-y-4">
              <Select
                label="Customer Category"
                value={customerCategory}
                onChange={(e) => setCustomerCategory(e.target.value as CustomerCategory | '')}
                options={[
                  { value: '', label: 'Regular Customer' },
                  ...Object.values(CustomerCategory).map(v => ({
                    value: v,
                    label: v.replace('_', ' '),
                  })),
                ]}
              />
              <Input
                label="Coupon Code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g., WELCOME10"
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-4">Second Pair</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={secondPairEnabled}
                  onChange={(e) => setSecondPairEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300"
                />
                <span className="text-sm font-medium">Enable Second Pair Offer</span>
              </label>
              {secondPairEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Second Pair Frame MRP (₹)"
                    type="number"
                    value={secondPairFrameMRP}
                    onChange={(e) => setSecondPairFrameMRP(e.target.value)}
                    placeholder="1500"
                  />
                  <Input
                    label="Second Pair Lens Price (₹)"
                    type="number"
                    value={secondPairLensPrice}
                    onChange={(e) => setSecondPairLensPrice(e.target.value)}
                    placeholder="2000"
                  />
                </div>
              )}
            </div>
          </Card>

          <Button
            onClick={handleCalculate}
            disabled={loading}
            loading={loading}
            size="lg"
            fullWidth
          >
            <Calculator size={20} className="mr-2" />
            Calculate Offers
          </Button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1">
          {result && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Price Breakdown</h2>
              <div className="space-y-4">
                {/* Base Prices */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Frame MRP</span>
                    <span className="font-medium">₹{result.frameMRP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Lens Price</span>
                    <span className="font-medium">₹{result.lensPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                    <span>Base Total</span>
                    <span>₹{result.baseTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Offers Applied */}
                {result.offersApplied.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <h3 className="text-sm font-semibold text-slate-700">Primary Offers</h3>
                    {result.offersApplied.map((offer, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Tag size={12} />
                          {offer.description}
                        </span>
                        <span>-₹{offer.savings.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Category Discount */}
                {result.categoryDiscount && (
                  <div className="flex justify-between text-sm text-blue-600 pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Percent size={12} />
                      {result.categoryDiscount.description}
                    </span>
                    <span>-₹{result.categoryDiscount.savings.toLocaleString()}</span>
                  </div>
                )}

                {/* Coupon Discount */}
                {result.couponDiscount && (
                  <div className="flex justify-between text-sm text-yellow-600 pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Ticket size={12} />
                      {result.couponDiscount.description}
                    </span>
                    <span>-₹{result.couponDiscount.savings.toLocaleString()}</span>
                  </div>
                )}

                {/* Second Pair Discount */}
                {result.secondPairDiscount && (
                  <div className="flex justify-between text-sm text-purple-600 pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Package size={12} />
                      {result.secondPairDiscount.description}
                    </span>
                    <span>-₹{result.secondPairDiscount.savings.toLocaleString()}</span>
                  </div>
                )}

                {/* Final Payable */}
                <div className="pt-4 border-t-2 border-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">Final Payable</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      ₹{result.finalPayable.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 mt-1">
                    <span>Total Savings</span>
                    <span className="text-green-600 font-semibold">
                      ₹{(result.baseTotal - result.finalPayable).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Price Components Detail */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Detailed Breakdown</h3>
                  <div className="space-y-1 text-xs">
                    {result.priceComponents.map((component, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between ${
                          component.amount < 0 ? 'text-green-600' : 'text-slate-600'
                        }`}
                      >
                        <span>{component.label}</span>
                        <span>
                          {component.amount < 0 ? '-' : ''}₹{Math.abs(component.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {!result && (
            <Card>
              <div className="text-center py-12 text-slate-500">
                <Calculator size={48} className="mx-auto mb-4 text-slate-400" />
                <p>Enter frame and lens details</p>
                <p className="text-sm mt-1">Click "Calculate Offers" to see results</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

