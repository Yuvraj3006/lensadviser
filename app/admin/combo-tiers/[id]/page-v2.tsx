'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Gift, Settings, Eye, Save, X, Edit2 } from 'lucide-react';

interface ComboBenefit {
  id?: string;
  benefitType: 'frame' | 'lens' | 'eyewear' | 'addon' | 'voucher';
  label: string;
  maxValue?: number;
  constraints?: string;
}

interface ComboRule {
  id?: string;
  ruleType: string;
  ruleJson?: string;
}

interface ComboTier {
  id: string;
  comboCode: string;
  displayName: string;
  effectivePrice: number;
  badge?: string | null;
  isActive: boolean;
  comboVersion: number;
  sortOrder: number;
  benefits: ComboBenefit[];
  rules?: ComboRule[];
}

const BENEFIT_TEMPLATES = [
  { type: 'frame' as const, label: 'Frame 1' },
  { type: 'lens' as const, label: 'Lens 1' },
  { type: 'eyewear' as const, label: '2nd Eyewear (Frame/Sun)' },
  { type: 'lens' as const, label: 'Lens 2' },
  { type: 'addon' as const, label: 'Lens Cleaner' },
  { type: 'voucher' as const, label: 'Voucher (Next Visit)' },
];

export default function ComboTierDetailPageV2() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const tierId = params?.id as string;
  const isEditMode = searchParams?.get('edit') === 'true' || tierId === 'new';
  const isNew = tierId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [activeTab, setActiveTab] = useState<'benefits' | 'rules' | 'preview'>('benefits');
  const [tier, setTier] = useState<ComboTier | null>(null);
  const [editing, setEditing] = useState(isNew);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    comboCode: '',
    displayName: '',
    effectivePrice: 0,
    badge: '',
    isActive: true,
    sortOrder: 0,
    benefits: [] as ComboBenefit[],
  });

  useEffect(() => {
    if (!isNew && tierId) {
      fetchTier();
    } else if (isNew) {
      // Initialize new tier
      setFormData({
        comboCode: '',
        displayName: '',
        effectivePrice: 0,
        badge: '',
        isActive: true,
        sortOrder: 0,
        benefits: [],
      });
      setTier(null);
      setLoading(false);
    }
  }, [tierId, isNew]);

  const fetchTier = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/combo-tiers/${tierId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTier(data.data);
        setFormData({
          comboCode: data.data.comboCode,
          displayName: data.data.displayName,
          effectivePrice: data.data.effectivePrice,
          badge: data.data.badge || '',
          isActive: data.data.isActive,
          sortOrder: data.data.sortOrder || 0,
          benefits: data.data.benefits || [],
        });
      } else {
        showToast('error', 'Failed to load combo tier');
        router.push('/admin/combo-tiers');
      }
    } catch (error) {
      console.error('Failed to fetch tier:', error);
      showToast('error', 'Failed to load combo tier');
      router.push('/admin/combo-tiers');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.comboCode || !formData.displayName || formData.effectivePrice <= 0) {
      showToast('error', 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = isNew
        ? '/api/admin/combo-tiers'
        : `/api/admin/combo-tiers/${tierId}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', isNew ? 'Combo tier created' : 'Combo tier updated');
        if (isNew) {
          router.push(`/admin/combo-tiers/${data.data.id}`);
        } else {
          setEditing(false);
          fetchTier();
        }
      } else {
        showToast('error', data.error?.message || 'Failed to save combo tier');
      }
    } catch (error) {
      console.error('Failed to save tier:', error);
      showToast('error', 'Failed to save combo tier');
    } finally {
      setSubmitting(false);
    }
  };

  const addBenefit = (template?: typeof BENEFIT_TEMPLATES[0]) => {
    setFormData({
      ...formData,
      benefits: [
        ...formData.benefits,
        {
          benefitType: template?.type || 'frame',
          label: template?.label || '',
        },
      ],
    });
  };

  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  const updateBenefit = (index: number, field: keyof ComboBenefit, value: any) => {
    const updated = [...formData.benefits];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, benefits: updated });
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const displayTier = editing ? { ...tier, ...formData } : tier;

  return (
    <div className="min-h-safe-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/combo-tiers')}
            className="mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Combo Tiers
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {isNew ? 'Create Combo Tier' : displayTier?.displayName || 'Combo Tier'}
              </h1>
              {!isNew && displayTier && (
                <p className="text-slate-600 mt-1">Code: {displayTier.comboCode} • Version: {displayTier.comboVersion}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isNew && !editing && (
                <Button
                  variant="outline"
                  onClick={() => setEditing(true)}
                  icon={<Edit2 size={16} />}
                >
                  Edit
                </Button>
              )}
              {(editing || isNew) && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isNew) {
                        router.push('/admin/combo-tiers');
                      } else {
                        setEditing(false);
                        fetchTier();
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    loading={submitting}
                    icon={<Save size={16} />}
                  >
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info - Always Editable in Edit Mode */}
        {(editing || isNew) && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Combo Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.comboCode}
                  onChange={(e) => setFormData({ ...formData, comboCode: e.target.value.toUpperCase() })}
                  placeholder="BRONZE, SILVER, GOLD, etc."
                  disabled={!isNew}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Bronze, Silver, Gold, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Effective Price (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.effectivePrice || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const newFormData = { ...formData, effectivePrice: value === '' ? 0 : (parseFloat(value) || 0) };
                    setFormData(newFormData);
                  }}
                  placeholder="Enter effective price"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Badge
                </label>
                <Select
                  value={formData.badge || ''}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value || '' })}
                  options={[
                    { value: '', label: 'None' },
                    { value: 'MOST_POPULAR', label: 'Most Popular' },
                    { value: 'BEST_VALUE', label: 'Best Value' },
                    { value: 'PREMIUM_CHOICE', label: 'Premium Choice' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sort Order
                </label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <Select
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  options={[
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('benefits')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'benefits'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Gift size={18} />
                Benefits
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'rules'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Settings size={18} />
                Rules
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'preview'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Eye size={18} />
                Preview
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'benefits' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Combo Benefits</h2>
                  {editing && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBenefit()}
                      >
                        Add Custom Benefit
                      </Button>
                      <div className="border-l border-slate-300 pl-2">
                        <span className="text-sm text-slate-600 mr-2">Quick Add:</span>
                        {BENEFIT_TEMPLATES.map((template, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant="ghost"
                            onClick={() => addBenefit(template)}
                            className="text-xs"
                          >
                            {template.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {formData.benefits.length > 0 ? (
                    formData.benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        {editing ? (
                          <>
                            <Select
                              value={benefit.benefitType}
                              onChange={(e) => updateBenefit(idx, 'benefitType', e.target.value)}
                              options={[
                                { value: 'frame', label: 'Frame' },
                                { value: 'lens', label: 'Lens' },
                                { value: 'eyewear', label: 'Eyewear' },
                                { value: 'addon', label: 'Addon' },
                                { value: 'voucher', label: 'Voucher' },
                              ]}
                              className="w-32"
                            />
                            <Input
                              value={benefit.label}
                              onChange={(e) => updateBenefit(idx, 'label', e.target.value)}
                              placeholder="Benefit label"
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeBenefit(idx)}
                              icon={<X size={14} />}
                            >
                              Remove
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1">
                              <div className="font-medium text-slate-900">{benefit.label}</div>
                              <div className="text-sm text-slate-500">Type: {benefit.benefitType}</div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-8">No benefits configured. Add benefits to show in customer cards.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'rules' && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Combo Rules</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Rules are optional. By default, eligibility is controlled by brand flags (combo_allowed, yopo_allowed).
                    Custom rules can override default behavior.
                  </p>
                </div>
                <div className="space-y-3">
                  {displayTier?.rules && displayTier.rules.length > 0 ? (
                    displayTier.rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="font-medium text-slate-900 mb-2">{rule.ruleType}</div>
                        {rule.ruleJson && (
                          <pre className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                            {JSON.stringify(JSON.parse(rule.ruleJson), null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-center py-8">
                      <p className="mb-2">No custom rules configured</p>
                      <p className="text-sm">
                        This tier uses default eligibility rules (brand flags: combo_allowed)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Customer Preview</h2>
                <p className="text-sm text-slate-600 mb-4">This is how customers will see this combo tier</p>
                <div className="max-w-md mx-auto">
                  <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border-2 border-purple-400 p-6">
                    <div className="text-center mb-4">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {formData.displayName || displayTier?.displayName || 'Tier Name'}
                      </h3>
                      {formData.badge && (
                        <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full mb-2">
                          {formData.badge}
                        </span>
                      )}
                      <div className="text-3xl font-bold text-purple-400 mt-2">
                        ₹{(formData.effectivePrice || displayTier?.effectivePrice || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">Effective Price</div>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <div className="text-sm text-slate-300 mb-2 font-semibold">
                        What you get:
                      </div>
                      <ul className="space-y-2">
                        {(formData.benefits.length > 0 ? formData.benefits : displayTier?.benefits || []).map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-purple-400 mt-0.5">✓</span>
                            <span>{benefit.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

