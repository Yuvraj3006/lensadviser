'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Calculator, TrendingUp, Tag, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function OfferSimulatorPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    frameBrand: '',
    frameMRP: '',
    frameSubCategory: '',
    lensSKU: '',
    lensBrandLine: '',
    lensPrice: '',
    customerCategory: '',
    couponCode: '',
  });

  useEffect(() => {
    // Get organization ID from auth
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

  const handleSimulate = async () => {
    if (!organizationId) {
      showToast('error', 'Organization ID not found');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/offers/simulator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('lenstrack_token')}`,
        },
        body: JSON.stringify({
          ...formData,
          frameMRP: formData.frameMRP ? parseFloat(formData.frameMRP) : undefined,
          lensPrice: formData.lensPrice ? parseFloat(formData.lensPrice) : undefined,
          organizationId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        showToast('success', 'Offer calculation completed');
      } else {
        showToast('error', data.error?.message || 'Failed to simulate offers');
      }
    } catch (error) {
      console.error('Error simulating offers:', error);
      showToast('error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
            <Calculator size={24} className="sm:w-8 sm:h-8 text-blue-600" />
            Offer Simulator
          </h1>
          <p className="text-sm sm:text-base text-slate-600">Test offer calculations for different frame and lens combinations</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Left: Input Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Input Parameters</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Frame Brand</label>
                <Input
                  value={formData.frameBrand}
                  onChange={(e) => setFormData({ ...formData, frameBrand: e.target.value })}
                  placeholder="e.g., Ray-Ban"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Frame MRP (₹)</label>
                <Input
                  type="number"
                  value={formData.frameMRP}
                  onChange={(e) => setFormData({ ...formData, frameMRP: e.target.value })}
                  placeholder="e.g., 5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Frame Sub-Category</label>
                <Input
                  value={formData.frameSubCategory}
                  onChange={(e) => setFormData({ ...formData, frameSubCategory: e.target.value })}
                  placeholder="e.g., Aviator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lens SKU</label>
                <Input
                  value={formData.lensSKU}
                  onChange={(e) => setFormData({ ...formData, lensSKU: e.target.value })}
                  placeholder="e.g., LENS-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lens Brand Line</label>
                <Input
                  value={formData.lensBrandLine}
                  onChange={(e) => setFormData({ ...formData, lensBrandLine: e.target.value })}
                  placeholder="e.g., DIGI360"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lens Price (₹)</label>
                <Input
                  type="number"
                  value={formData.lensPrice}
                  onChange={(e) => setFormData({ ...formData, lensPrice: e.target.value })}
                  placeholder="e.g., 3000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer Category</label>
                <Select
                  value={formData.customerCategory}
                  onChange={(e) => setFormData({ ...formData, customerCategory: e.target.value })}
                  options={[
                    { value: '', label: 'Select...' },
                    { value: 'REGULAR', label: 'Regular' },
                    { value: 'STUDENT', label: 'Student' },
                    { value: 'SENIOR_CITIZEN', label: 'Senior Citizen' },
                    { value: 'DOCTOR', label: 'Doctor' },
                    { value: 'TEACHER', label: 'Teacher' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Coupon Code</label>
                <Input
                  value={formData.couponCode}
                  onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                  placeholder="e.g., SAVE100"
                />
              </div>

              <Button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Calculating...' : 'Simulate Offers'}
              </Button>
            </div>
          </Card>

          {/* Right: Results */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Price Breakdown */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <DollarSign size={24} className="text-green-600" />
                    Price Breakdown
                  </h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Base Total:</span>
                      <span className="font-semibold">₹{result.result.baseTotal.toLocaleString()}</span>
                    </div>
                    
                    {result.result.offersApplied && result.result.offersApplied.length > 0 && (
                      <>
                        {result.result.offersApplied.map((offer: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-green-600">
                            <span>{offer.description}:</span>
                            <span className="font-semibold">-₹{offer.savings.toLocaleString()}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {result.result.categoryDiscount && (
                      <div className="flex justify-between text-blue-600">
                        <span>Category Discount:</span>
                        <span className="font-semibold">-₹{result.result.categoryDiscount.discountAmount?.toLocaleString() || 0}</span>
                      </div>
                    )}

                    {result.result.couponDiscount && (
                      <div className="flex justify-between text-purple-600">
                        <span>Coupon Discount:</span>
                        <span className="font-semibold">-₹{result.result.couponDiscount.discountAmount?.toLocaleString() || 0}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-300 flex justify-between">
                      <span className="text-lg font-bold text-slate-900">Final Payable:</span>
                      <span className="text-xl font-bold text-green-600">
                        ₹{result.result.finalPayable.toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-2 flex justify-between text-slate-600">
                      <span>Total Savings:</span>
                      <span className="font-semibold text-green-600">
                        ₹{result.result.savings.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Applicable Offers */}
                {result.applicableOffers && result.applicableOffers.length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Tag size={24} className="text-blue-600" />
                      Applicable Offers
                    </h2>
                    
                    <div className="space-y-2">
                      {result.applicableOffers.map((offer: any, idx: number) => (
                        <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-slate-900">{offer.title}</p>
                              <p className="text-sm text-slate-600">{offer.description}</p>
                              <Badge className="mt-1">{offer.type}</Badge>
                            </div>
                            <span className="text-xs text-slate-500">Priority: {offer.priority}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Price Components */}
                {result.result.priceComponents && result.result.priceComponents.length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">Price Components</h2>
                    <div className="space-y-2">
                      {result.result.priceComponents.map((component: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className={component.amount < 0 ? 'text-green-600' : 'text-slate-600'}>
                            {component.label}:
                          </span>
                          <span className={component.amount < 0 ? 'text-green-600 font-semibold' : 'font-semibold'}>
                            {component.amount < 0 ? '-' : ''}₹{Math.abs(component.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-12 text-center">
                <Calculator size={48} className="mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600">Enter parameters and click "Simulate Offers" to see results</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
