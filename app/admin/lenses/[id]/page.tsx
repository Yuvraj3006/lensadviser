'use client';

/**
 * Admin Lens Detail Page - Refactored
 * Tabs: General | RX Ranges | Features | Benefits | Specifications
 * REMOVED: Answer Boosts tab
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Package, Settings, Sparkles, TrendingUp, Eye, DollarSign } from 'lucide-react';
import { BRAND_LINES, SPEC_GROUPS } from '@/lib/constants/lens';

type Tab = 'general' | 'rxRanges' | 'powerAddOnPricing' | 'features' | 'benefits' | 'specifications';

interface RxRange {
  sphMin: number;
  sphMax: number;
  cylMin: number;
  cylMax: number;
  addOnPrice: number;
}

interface LensFormData {
  itCode: string;
  name: string;
  brandLine: string;
  visionType: 'SINGLE_VISION' | 'PROGRESSIVE' | 'BIFOCAL' | 'ANTI_FATIGUE' | 'MYOPIA_CONTROL';
  lensIndex: 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174';
  tintOption: 'CLEAR' | 'TINT' | 'PHOTOCHROMIC' | 'TRANSITION';
  mrp: number;
  baseOfferPrice: number;
  addOnPrice: number;
  category: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'ULTRA';
  yopoEligible: boolean;
  deliveryDays: number;
  isActive: boolean;
  rxRanges: RxRange[];
  featureCodes: string[];
  benefitScores: Record<string, number>;
  specs: Array<{ group: string; key: string; value: string }>;
}

interface Feature {
  id: string;
  code: string;
  name: string;
}

interface Benefit {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface PowerAddOnBand {
  id: string;
  sphMin: number | null;
  sphMax: number | null;
  cylMin: number | null;
  cylMax: number | null;
  addMin: number | null;
  addMax: number | null;
  extraCharge: number;
}

export default function AdminLensDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const lensId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [powerAddOnBands, setPowerAddOnBands] = useState<PowerAddOnBand[]>([]);
  const [loadingAddOnBands, setLoadingAddOnBands] = useState(false);

  const [formData, setFormData] = useState<LensFormData>({
    itCode: '',
    name: '',
    brandLine: '',
    visionType: 'SINGLE_VISION',
    lensIndex: 'INDEX_156',
    tintOption: 'CLEAR',
    mrp: 0,
    baseOfferPrice: 0,
    addOnPrice: 0,
    category: 'STANDARD',
    yopoEligible: true,
    deliveryDays: 4,
    isActive: true,
    rxRanges: [],
    featureCodes: [],
    benefitScores: {},
    specs: [],
  });

  const tabs = [
    { id: 'general' as Tab, label: 'General', icon: Package },
    { id: 'rxRanges' as Tab, label: 'RX Ranges', icon: Eye },
    { id: 'features' as Tab, label: 'Features', icon: Sparkles },
    { id: 'benefits' as Tab, label: 'Benefits', icon: TrendingUp },
    { id: 'specifications' as Tab, label: 'Specifications', icon: Settings },
  ];

  useEffect(() => {
    fetchFeatures();
    fetchBenefits();
    if (lensId && lensId !== 'new') {
      fetchLens();
      fetchPowerAddOnBands();
    } else {
      setLoading(false);
    }
  }, [lensId]);

  const fetchFeatures = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/features', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setFeatures(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch features');
    }
  };

  const fetchBenefits = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/benefits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        const benefitsList = data.data || [];
        setBenefits(benefitsList);
        // Initialize benefit scores if creating new lens
        if (lensId === 'new') {
          const initialScores: Record<string, number> = {};
          benefitsList.forEach((b: Benefit) => {
            initialScores[b.code] = 0;
          });
          setFormData((prev) => ({ ...prev, benefitScores: initialScores }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch benefits');
    }
  };

  const fetchLens = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lenses/${lensId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        const lens = data.data;
        setFormData({
          itCode: lens.itCode || '',
          name: lens.name || '',
          brandLine: lens.brandLine || '',
          visionType: lens.visionType || 'SINGLE_VISION',
          lensIndex: lens.lensIndex || 'INDEX_156',
          tintOption: lens.tintOption || 'CLEAR',
          mrp: lens.mrp || lens.baseOfferPrice || 0,
          baseOfferPrice: lens.baseOfferPrice || 0,
          addOnPrice: lens.addOnPrice || 0,
          category: lens.category || 'STANDARD',
          yopoEligible: lens.yopoEligible ?? true,
          deliveryDays: lens.deliveryDays || 4,
          isActive: lens.isActive ?? true,
          rxRanges: lens.rxRanges || [],
          featureCodes: lens.featureCodes || [],
          benefitScores: lens.benefitScores || {},
          specs: lens.specs || [],
        });
      }
    } catch (error) {
      showToast('error', 'Failed to load lens');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.itCode || !formData.name || !formData.brandLine || formData.baseOfferPrice <= 0 || formData.mrp <= 0) {
      showToast('error', 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const isNew = lensId === 'new';
      const url = isNew ? '/api/admin/lenses' : `/api/admin/lenses/${lensId}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload = {
        itCode: formData.itCode,
        name: formData.name,
        brandLine: formData.brandLine,
        visionType: formData.visionType,
        lensIndex: formData.lensIndex,
        tintOption: formData.tintOption,
        mrp: formData.mrp || null,
        baseOfferPrice: formData.baseOfferPrice,
        addOnPrice: formData.addOnPrice || null,
        category: formData.category,
        yopoEligible: formData.yopoEligible,
        deliveryDays: formData.deliveryDays,
        isActive: formData.isActive,
        rxRanges: formData.rxRanges,
        featureCodes: formData.featureCodes,
        benefitScores: formData.benefitScores,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', `Lens ${isNew ? 'created' : 'updated'} successfully`);
        router.push('/admin/lenses');
      } else {
        showToast('error', data.error?.message || 'Failed to save lens');
      }
    } catch (error) {
      showToast('error', 'Failed to save lens');
    } finally {
      setSubmitting(false);
    }
  };

  const addRxRange = () => {
    setFormData((prev) => ({
      ...prev,
      rxRanges: [
        ...prev.rxRanges,
        { sphMin: -10, sphMax: 10, cylMin: 0, cylMax: -4, addOnPrice: 0 },
      ],
    }));
  };

  const removeRxRange = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rxRanges: prev.rxRanges.filter((_, i) => i !== index),
    }));
  };

  const updateRxRange = (index: number, field: keyof RxRange, value: number) => {
    setFormData((prev) => ({
      ...prev,
      rxRanges: prev.rxRanges.map((range, i) =>
        i === index ? { ...range, [field]: value } : range
      ),
    }));
  };

  const fetchPowerAddOnBands = async () => {
    if (lensId === 'new') return;
    setLoadingAddOnBands(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lenses/${lensId}/power-addon-pricing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to fetch power add-on bands' } }));
        console.error('Failed to fetch power add-on bands:', errorData.error?.message || `HTTP ${response.status}`);
        // Set empty array on error to prevent UI issues
        setPowerAddOnBands([]);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setPowerAddOnBands(data.data || []);
      } else {
        console.error('Failed to fetch power add-on bands:', data.error?.message || 'Unknown error');
        setPowerAddOnBands([]);
      }
    } catch (error) {
      console.error('Failed to fetch power add-on bands:', error);
      // Set empty array on error to prevent UI issues
      setPowerAddOnBands([]);
    } finally {
      setLoadingAddOnBands(false);
    }
  };

  const addPowerAddOnBand = async () => {
    if (lensId === 'new') {
      showToast('error', 'Please save the lens first before adding add-on pricing');
      return;
    }
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lenses/${lensId}/power-addon-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sphMin: null,
          sphMax: null,
          cylMin: null,
          cylMax: null,
          addMin: null,
          addMax: null,
          extraCharge: 0,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showToast('success', 'Add-on band added successfully');
        fetchPowerAddOnBands();
      } else {
        showToast('error', data.error?.message || 'Failed to add band');
      }
    } catch (error) {
      showToast('error', 'Failed to add band');
    }
  };

  const updatePowerAddOnBand = async (bandId: string, field: keyof PowerAddOnBand, value: number | null) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const band = powerAddOnBands.find(b => b.id === bandId);
      if (!band) return;

      const updateData: any = { [field]: value };
      const response = await fetch(`/api/admin/lenses/${lensId}/power-addon-pricing/${bandId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (data.success) {
        fetchPowerAddOnBands();
      } else {
        showToast('error', data.error?.message || 'Failed to update band');
      }
    } catch (error) {
      showToast('error', 'Failed to update band');
    }
  };

  const deletePowerAddOnBand = async (bandId: string) => {
    if (!confirm('Are you sure you want to delete this add-on band?')) return;
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lenses/${lensId}/power-addon-pricing/${bandId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        showToast('success', 'Band deleted successfully');
        fetchPowerAddOnBands();
      } else {
        showToast('error', data.error?.message || 'Failed to delete band');
      }
    } catch (error) {
      showToast('error', 'Failed to delete band');
    }
  };

  const toggleFeature = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      featureCodes: prev.featureCodes.includes(code)
        ? prev.featureCodes.filter((c) => c !== code)
        : [...prev.featureCodes, code],
    }));
  };

  const updateBenefitScore = (code: string, score: number) => {
    setFormData((prev) => ({
      ...prev,
      benefitScores: { ...prev.benefitScores, [code]: score },
    }));
  };

  const addSpec = () => {
    setFormData((prev) => ({
      ...prev,
      specs: [...prev.specs, { group: '', key: '', value: '' }],
    }));
  };

  const removeSpec = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.filter((_, i) => i !== index),
    }));
  };

  const updateSpec = (index: number, field: 'group' | 'key' | 'value', value: string) => {
    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.map((spec, i) => (i === index ? { ...spec, [field]: value } : spec)),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <Button variant="outline" onClick={() => router.push('/admin/lenses')} className="mb-4 w-full sm:w-auto">
            ← Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 sm:mt-4">
            {lensId === 'new' ? 'New Lens' : formData.name || 'Edit Lens'}
          </h1>
        </div>
        <Button onClick={handleSave} loading={submitting} className="w-full sm:w-auto">
          Save Lens
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IT Code *
                </label>
                <Input
                  value={formData.itCode}
                  onChange={(e) => setFormData({ ...formData, itCode: e.target.value })}
                  placeholder="e.g., D360ASV"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Digi360 Advanced 1.56"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brand Line *
                </label>
                <Select
                  value={formData.brandLine}
                  onChange={(e) => setFormData({ ...formData, brandLine: e.target.value })}
                  options={[
                    { value: '', label: 'Select Brand Line' },
                    ...BRAND_LINES.map((bl) => ({
                      value: bl,
                      label: bl.replace(/_/g, ' '),
                    })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vision Type *
                </label>
                <Select
                  value={formData.visionType}
                  onChange={(e) =>
                    setFormData({ ...formData, visionType: e.target.value as any })
                  }
                  options={[
                    { value: 'SINGLE_VISION', label: 'Single Vision' },
                    { value: 'PROGRESSIVE', label: 'Progressive' },
                    { value: 'BIFOCAL', label: 'Bifocal' },
                    { value: 'ANTI_FATIGUE', label: 'Anti-Fatigue' },
                    { value: 'MYOPIA_CONTROL', label: 'Myopia Control' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Index *
                </label>
                <Select
                  value={formData.lensIndex}
                  onChange={(e) =>
                    setFormData({ ...formData, lensIndex: e.target.value as any })
                  }
                  options={[
                    { value: 'INDEX_156', label: '1.56' },
                    { value: 'INDEX_160', label: '1.60' },
                    { value: 'INDEX_167', label: '1.67' },
                    { value: 'INDEX_174', label: '1.74' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tint Option *
                </label>
                <Select
                  value={formData.tintOption}
                  onChange={(e) =>
                    setFormData({ ...formData, tintOption: e.target.value as any })
                  }
                  options={[
                    { value: 'CLEAR', label: 'Clear' },
                    { value: 'TINT', label: 'Tint' },
                    { value: 'PHOTOCHROMIC', label: 'Photochromic' },
                    { value: 'TRANSITION', label: 'Transition' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  MRP (₹) *
                </label>
                <Input
                  type="number"
                  value={formData.mrp}
                  onChange={(e) =>
                    setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">Maximum Retail Price</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Base Offer Price (₹) *
                </label>
                <Input
                  type="number"
                  value={formData.baseOfferPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, baseOfferPrice: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">Actual selling price</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Add-on Price (₹)
                </label>
                <Input
                  type="number"
                  value={formData.addOnPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, addOnPrice: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">Additional features</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category *
              </label>
              <Select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as any })
                }
                options={[
                  { value: 'ECONOMY', label: 'Economy' },
                  { value: 'STANDARD', label: 'Standard' },
                  { value: 'PREMIUM', label: 'Premium' },
                  { value: 'ULTRA', label: 'Ultra' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Delivery Days
                </label>
                <Input
                  type="number"
                  value={formData.deliveryDays}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryDays: parseInt(e.target.value) || 4 })
                  }
                  placeholder="4"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.yopoEligible}
                  onChange={(e) =>
                    setFormData({ ...formData, yopoEligible: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">YOPO Eligible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>
        )}

        {/* RX Ranges Tab */}
        {activeTab === 'rxRanges' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">RX Ranges</h3>
              <Button onClick={addRxRange} size="sm" className="w-full sm:w-auto">
                + Add RX Range
              </Button>
            </div>

            {formData.rxRanges.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No RX ranges added yet</p>
            ) : (
              <div className="space-y-3">
                {formData.rxRanges.map((range, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-6 gap-3 p-4 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        SPH Min
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={range.sphMin}
                        onChange={(e) =>
                          updateRxRange(index, 'sphMin', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        SPH Max
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={range.sphMax}
                        onChange={(e) =>
                          updateRxRange(index, 'sphMax', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        CYL Min
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={range.cylMin}
                        onChange={(e) =>
                          updateRxRange(index, 'cylMin', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        CYL Max
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={range.cylMax}
                        onChange={(e) =>
                          updateRxRange(index, 'cylMax', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Add-on Price
                      </label>
                      <Input
                        type="number"
                        value={range.addOnPrice}
                        onChange={(e) =>
                          updateRxRange(index, 'addOnPrice', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeRxRange(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RX Add-On Pricing Tab */}
        {activeTab === 'powerAddOnPricing' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">RX Add-On Pricing</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Configure combined SPH + CYL + ADD based extra charges. All conditions in a band must match together.
                </p>
              </div>
              <Button onClick={addPowerAddOnBand} size="sm" disabled={lensId === 'new'}>
                + Add Add-On Band
              </Button>
            </div>

            {lensId === 'new' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  Please save the lens first before adding RX add-on pricing bands.
                </p>
              </div>
            )}

            {loadingAddOnBands ? (
              <p className="text-slate-500 text-center py-8">Loading add-on bands...</p>
            ) : powerAddOnBands.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No add-on bands added yet</p>
            ) : (
              <div className="space-y-3">
                {powerAddOnBands.map((band) => (
                  <div
                    key={band.id}
                    className="grid grid-cols-8 gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        SPH Min
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={band.sphMin ?? ''}
                        placeholder="ANY"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          updatePowerAddOnBand(band.id, 'sphMin', val);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        SPH Max
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={band.sphMax ?? ''}
                        placeholder="ANY"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          updatePowerAddOnBand(band.id, 'sphMax', val);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        CYL Min
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={band.cylMin ?? ''}
                        placeholder="ANY"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          updatePowerAddOnBand(band.id, 'cylMin', val);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        CYL Max
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={band.cylMax ?? ''}
                        placeholder="ANY"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          updatePowerAddOnBand(band.id, 'cylMax', val);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        ADD Min
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={band.addMin ?? ''}
                        placeholder="ANY"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          updatePowerAddOnBand(band.id, 'addMin', val);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        ADD Max
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={band.addMax ?? ''}
                        placeholder="ANY"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          updatePowerAddOnBand(band.id, 'addMax', val);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Extra Charge (₹)
                      </label>
                      <Input
                        type="number"
                        value={band.extraCharge}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          updatePowerAddOnBand(band.id, 'extraCharge', val);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePowerAddOnBand(band.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Features (F01-F11)</h3>
            {features.length === 0 ? (
              <p className="text-slate-500">Loading features...</p>
            ) : (
              <div className="space-y-2">
                {features.map((feature) => (
                  <label
                    key={feature.id}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.featureCodes.includes(feature.code)}
                      onChange={() => toggleFeature(feature.code)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <div>
                      <span className="font-medium text-slate-900">
                        {feature.code} - {feature.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Benefits Tab */}
        {activeTab === 'benefits' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Benefits (B01-B12)</h3>
            {benefits.length === 0 ? (
              <p className="text-slate-500">Loading benefits...</p>
            ) : (
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-slate-900">
                          {benefit.code} - {benefit.name}
                        </span>
                        {benefit.description && (
                          <p className="text-sm text-slate-500 mt-1">{benefit.description}</p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-600">
                        {formData.benefitScores[benefit.code] || 0} / 3
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={formData.benefitScores[benefit.code] || 0}
                      onChange={(e) =>
                        updateBenefitScore(benefit.code, parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Specifications Tab */}
        {activeTab === 'specifications' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Specifications</h3>
              <Button onClick={addSpec} size="sm" className="w-full sm:w-auto">
                + Add Specification
              </Button>
            </div>

            {formData.specs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No specifications added yet</p>
            ) : (
              <div className="space-y-3">
                {formData.specs.map((spec, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-4 gap-3 p-4 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Group
                      </label>
                      <Select
                        value={spec.group}
                        onChange={(e) => updateSpec(index, 'group', e.target.value)}
                        options={[
                          { value: '', label: 'Select Group' },
                          ...SPEC_GROUPS.map((g) => ({
                            value: g,
                            label: g.replace(/_/g, ' '),
                          })),
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Key</label>
                      <Input
                        value={spec.key}
                        onChange={(e) => updateSpec(index, 'key', e.target.value)}
                        placeholder="e.g., Core Material"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Value
                      </label>
                      <Input
                        value={spec.value}
                        onChange={(e) => updateSpec(index, 'value', e.target.value)}
                        placeholder="e.g., Polycarbonate"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSpec(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
