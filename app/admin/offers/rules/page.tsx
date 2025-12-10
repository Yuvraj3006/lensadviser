'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
// Client-safe enums
const OfferRuleType = {
  YOPO: 'YOPO',
  COMBO_PRICE: 'COMBO_PRICE',
  FREE_LENS: 'FREE_LENS',
  PERCENT_OFF: 'PERCENT_OFF',
  FLAT_OFF: 'FLAT_OFF',
  BOG50: 'BOG50',
  BOGO: 'BOGO',
  CATEGORY_DISCOUNT: 'CATEGORY_DISCOUNT',
  BONUS_FREE_PRODUCT: 'BONUS_FREE_PRODUCT',
} as const;

const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FLAT_AMOUNT: 'FLAT_AMOUNT',
  YOPO_LOGIC: 'YOPO_LOGIC',
  FREE_ITEM: 'FREE_ITEM',
  COMBO_PRICE: 'COMBO_PRICE',
} as const;

type OfferRuleType = typeof OfferRuleType[keyof typeof OfferRuleType];
type DiscountType = typeof DiscountType[keyof typeof DiscountType];

interface OfferRule {
  id: string;
  name: string;
  code: string;
  offerType: OfferRuleType;
  frameBrand?: string | null;
  frameSubCategory?: string | null;
  minFrameMRP?: number | null;
  maxFrameMRP?: number | null;
  lensBrandLines: string[];
  lensItCodes: string[];
  discountType: DiscountType;
  discountValue: number;
  comboPrice?: number | null;
  freeProductId?: string | null;
  isSecondPairRule: boolean;
  secondPairPercent?: number | null;
  priority: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  config?: any; // Additional configuration for offer rules
  upsellThreshold?: number | null; // Upsell threshold for offers
  upsellRewardText?: string | null; // Upsell reward text
}

export default function OfferRulesPage() {
  const { showToast } = useToast();
  const [rules, setRules] = useState<OfferRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<OfferRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<OfferRule | null>(null);
  const [formData, setFormData] = useState<Partial<OfferRule>>({
    name: '',
    code: '',
    offerType: 'PERCENT_OFF' as OfferRuleType,
    discountType: 'PERCENTAGE' as DiscountType,
    discountValue: 0,
    priority: 100,
    isActive: true,
    isSecondPairRule: false,
    lensBrandLines: [],
    lensItCodes: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [subBrands, setSubBrands] = useState<string[]>([]);
  const [brandSubBrandMap, setBrandSubBrandMap] = useState<Record<string, string[]>>({});
  const [availableSubBrands, setAvailableSubBrands] = useState<string[]>([]);

  useEffect(() => {
    // Get organization ID from auth context or API
    const token = localStorage.getItem('lenstrack_token');
    if (token) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.organizationId) {
            setOrganizationId(data.data.organizationId);
            fetchRules(data.data.organizationId);
            fetchBrands();
          }
        });
    }
  }, []);

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/products/brands', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setBrands(data.data.brands);
        setSubBrands(data.data.subBrands);
        setBrandSubBrandMap(data.data.brandSubBrandMap);
      }
    } catch (error) {
      console.error('Failed to load brands');
    }
  };

  // Update available sub-brands when brand changes
  useEffect(() => {
    if (formData.frameBrand && brandSubBrandMap[formData.frameBrand]) {
      setAvailableSubBrands(brandSubBrandMap[formData.frameBrand]);
    } else {
      setAvailableSubBrands(subBrands);
    }
  }, [formData.frameBrand, brandSubBrandMap, subBrands]);

  const fetchRules = async (orgId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/offers/rules?organizationId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      showToast('error', 'Failed to load offer rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      code: '',
      offerType: 'PERCENT_OFF' as OfferRuleType,
      discountType: 'PERCENTAGE' as DiscountType,
      discountValue: 0,
      priority: 100,
      isActive: true,
      isSecondPairRule: false,
      lensBrandLines: [],
      lensItCodes: [],
    });
    setEditingRule(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (rule: OfferRule) => {
    // Ensure config object exists for editing
    const ruleWithConfig = {
      ...rule,
      config: (rule as any).config || {},
    };
    setFormData(ruleWithConfig);
    setEditingRule(rule);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingRule
        ? `/api/admin/offers/rules/${editingRule.id}`
        : '/api/admin/offers/rules';
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          organizationId,
          config: (formData as any).config || {},
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', editingRule ? 'Offer rule updated' : 'Offer rule created');
        setIsCreateOpen(false);
        fetchRules(organizationId);
      } else {
        showToast('error', data.error?.message || 'Failed to save');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rule: OfferRule) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/offers/rules/${rule.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        showToast('success', 'Offer rule deleted');
        setDeleteConfirm(null);
        fetchRules(organizationId);
      }
    } catch (error) {
      showToast('error', 'Failed to delete');
    }
  };

  const columns: Column<OfferRule>[] = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'frameBrand',
      header: 'Frame Brand',
      render: (rule) => (
        <div className="flex gap-2">
          <Badge variant="outline" color="blue">{rule.frameBrand || 'Any'}</Badge>
          {rule.frameSubCategory && (
            <Badge variant="outline" color="green">{rule.frameSubCategory}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'offerType',
      header: 'Type',
      render: (rule) => <Badge variant={rule.isActive ? 'success' : 'secondary'}>{rule.offerType}</Badge>,
    },
    {
      key: 'discountType',
      header: 'Discount',
      render: (rule) => {
        if (rule.discountType === 'YOPO_LOGIC') return 'YOPO';
        if (rule.discountType === 'COMBO_PRICE') return `Combo ₹${rule.comboPrice}`;
        if (rule.discountType === 'FREE_ITEM') return 'Free Item';
        if (rule.discountType === 'PERCENTAGE') return `${rule.discountValue}%`;
        return `₹${rule.discountValue}`;
      },
    },
    { key: 'priority', header: 'Priority', sortable: true },
    {
      key: 'isActive',
      header: 'Status',
      render: (rule) => (
        <Badge variant={rule.isActive ? 'success' : 'secondary'}>
          {rule.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (rule) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
            <Edit2 size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(rule)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Offer Rules</h1>
          <p className="text-slate-600 mt-1">Manage offer rules and discounts</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={20} className="mr-2" />
          Create Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={<Tag size={48} />}
          title="No offer rules"
          description="Create your first offer rule to get started"
          action={{
            label: 'Create Rule',
            onClick: handleCreate,
          }}
        />
      ) : (
        <DataTable data={rules} columns={columns} />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingRule ? 'Edit Offer Rule' : 'Create Offer Rule'}
        size="full"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Code"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Offer Type"
              value={formData.offerType || ''}
              onChange={(e) => setFormData({ ...formData, offerType: e.target.value as OfferRuleType })}
              options={[
                { value: 'YOPO', label: 'YOPO' },
                { value: 'COMBO_PRICE', label: 'COMBO_PRICE' },
                { value: 'FREE_LENS', label: 'FREE_LENS' },
                { value: 'PERCENT_OFF', label: 'PERCENT_OFF' },
                { value: 'FLAT_OFF', label: 'FLAT_OFF' },
                { value: 'BOG50', label: 'BOG50 (Buy One Get 50% Off)' },
                { value: 'BOGO', label: 'BOGO (Buy One Get One Free)' },
                { value: 'CATEGORY_DISCOUNT', label: 'CATEGORY_DISCOUNT' },
                { value: 'BONUS_FREE_PRODUCT', label: 'BONUS_FREE_PRODUCT' },
              ]}
            />
            <Select
              label="Discount Type"
              value={formData.discountType || ''}
              onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
              options={[
                { value: 'PERCENTAGE', label: 'PERCENTAGE' },
                { value: 'FLAT_AMOUNT', label: 'FLAT_AMOUNT' },
                { value: 'YOPO_LOGIC', label: 'YOPO_LOGIC' },
                { value: 'FREE_ITEM', label: 'FREE_ITEM' },
                { value: 'COMBO_PRICE', label: 'COMBO_PRICE' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Discount Value"
              type="number"
              value={formData.discountValue || 0}
              onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
            />
            <Input
              label="Priority"
              type="number"
              value={formData.priority || 100}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Frame Brand"
              value={formData.frameBrand || ''}
              onChange={(e) => {
                const brand = e.target.value || null;
                setFormData({ 
                  ...formData, 
                  frameBrand: brand,
                  // Reset sub-brand if brand changes
                  frameSubCategory: brand ? formData.frameSubCategory : null
                });
              }}
              options={[
                { value: '', label: 'Any Brand' },
                ...brands.map(b => ({ value: b, label: b }))
              ]}
            />
            <Select
              label="Frame Sub-Brand"
              value={formData.frameSubCategory || ''}
              onChange={(e) => setFormData({ ...formData, frameSubCategory: e.target.value || null })}
              options={[
                { value: '', label: 'Any Sub-Brand' },
                ...availableSubBrands.map(sb => ({ value: sb, label: sb }))
              ]}
              disabled={!formData.frameBrand}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Frame MRP"
              type="number"
              value={formData.minFrameMRP || ''}
              onChange={(e) => setFormData({ ...formData, minFrameMRP: e.target.value ? parseFloat(e.target.value) : null })}
            />
            <Input
              label="Max Frame MRP"
              type="number"
              value={formData.maxFrameMRP || ''}
              onChange={(e) => setFormData({ ...formData, maxFrameMRP: e.target.value ? parseFloat(e.target.value) : null })}
            />
          </div>

          {formData.offerType === 'YOPO' && (
            <div className="space-y-4">
              <Select
                label="Free Under YOPO"
                value={(formData as any).freeUnderYOPO || 'BEST_OF'}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  config: {
                    ...(formData as any).config || {},
                    freeUnderYOPO: e.target.value
                  }
                } as any)}
                options={[
                  { value: 'BEST_OF', label: 'BEST_OF - Pay higher of frame or lens' },
                  { value: 'FRAME', label: 'FRAME - Frame free, pay lens price' },
                  { value: 'LENS', label: 'LENS - Lens free, pay frame price' },
                ]}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={((formData as any).config?.bonusFreeAllowed !== false)}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    config: {
                      ...(formData as any).config || {},
                      bonusFreeAllowed: e.target.checked
                    }
                  } as any)}
                />
                <span>Allow Bonus Free Product</span>
              </label>
            </div>
          )}

          {formData.offerType === 'COMBO_PRICE' && (
            <div className="space-y-4">
              <Select
                label="Combo Type"
                value={((formData as any).config?.comboType) || 'FIXED'}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  config: {
                    ...(formData as any).config,
                    comboType: e.target.value
                  }
                })}
                options={[
                  { value: 'FIXED', label: 'Fixed Price (Standard)' },
                  { value: 'FRAME_MRP_ONLY', label: 'Frame MRP Only (Lens Free)' },
                  { value: 'BRAND_LINE_COMBO', label: 'Brand-Line Combo (Frame Sub-Category + Lens Brand Line)' },
                  { value: 'FRAME_CATEGORY_COMBO', label: 'Frame Category Combo (Category + Lens Brand Line)' },
                  { value: 'VISION_TYPE_COMBO', label: 'Vision Type Combo (Vision Type + Lens Brand Line)' },
                ]}
              />
              
              {((formData as any).config?.comboType === 'FIXED' || !(formData as any).config?.comboType) && (
                <Input
                  label="Combo Price (₹)"
                  type="number"
                  value={formData.comboPrice || ''}
                  onChange={(e) => setFormData({ ...formData, comboPrice: e.target.value ? parseFloat(e.target.value) : null })}
                />
              )}
              
              {((formData as any).config?.comboType === 'BRAND_LINE_COMBO') && (
                <>
                  <Input
                    label="Required Frame Sub-Category"
                    value={((formData as any).config?.requiredFrameSubCategory) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        requiredFrameSubCategory: e.target.value
                      }
                    })}
                    placeholder="e.g., ESSENTIAL, ALFA"
                  />
                  <Input
                    label="Required Lens Brand Line"
                    value={((formData as any).config?.requiredLensBrandLine) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        requiredLensBrandLine: e.target.value
                      }
                    })}
                    placeholder="e.g., BLUEXPERT, DIGI360_ADVANCED"
                  />
                  <Input
                    label="Brand-Line Combo Price (₹)"
                    type="number"
                    value={((formData as any).config?.brandLineComboPrice) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        brandLineComboPrice: e.target.value ? parseFloat(e.target.value) : null
                      }
                    })}
                    placeholder="e.g., 1499"
                  />
                </>
              )}
              
              {((formData as any).config?.comboType === 'FRAME_CATEGORY_COMBO') && (
                <>
                  <Input
                    label="Required Frame Category"
                    value={((formData as any).config?.requiredFrameCategory) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        requiredFrameCategory: e.target.value
                      }
                    })}
                    placeholder="e.g., LUXURY, ESSENTIAL"
                  />
                  <Input
                    label="Required Lens Brand Line"
                    value={((formData as any).config?.requiredLensBrandLine) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        requiredLensBrandLine: e.target.value
                      }
                    })}
                    placeholder="e.g., DIGI360_ADVANCED"
                  />
                  <Input
                    label="Frame Category Combo Price (₹)"
                    type="number"
                    value={((formData as any).config?.frameCategoryComboPrice) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        frameCategoryComboPrice: e.target.value ? parseFloat(e.target.value) : null
                      }
                    })}
                    placeholder="e.g., 1499"
                  />
                </>
              )}
              
              {((formData as any).config?.comboType === 'VISION_TYPE_COMBO') && (
                <>
                  <Input
                    label="Required Vision Type"
                    value={((formData as any).config?.requiredVisionType) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        requiredVisionType: e.target.value
                      }
                    })}
                    placeholder="e.g., TINT, PHOTOCHROMIC"
                  />
                  <Input
                    label="Required Lens Brand Line"
                    value={((formData as any).config?.requiredLensBrandLine) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        requiredLensBrandLine: e.target.value
                      }
                    })}
                    placeholder="e.g., TINT_NEXT"
                  />
                  <Input
                    label="Vision Type Combo Price (₹)"
                    type="number"
                    value={((formData as any).config?.visionTypeComboPrice) || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      config: {
                        ...(formData as any).config,
                        visionTypeComboPrice: e.target.value ? parseFloat(e.target.value) : null
                      }
                    })}
                    placeholder="e.g., 899"
                  />
                </>
              )}
              
              {((formData as any).config?.comboType === 'FRAME_MRP_ONLY') && (
                <Input
                  label="Required Lens Brand Line (optional)"
                  value={((formData as any).config?.requiredLensBrandLine) || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    config: {
                      ...(formData as any).config,
                      requiredLensBrandLine: e.target.value
                    }
                  })}
                  placeholder="e.g., BLUEXPERT (leave empty for any lens)"
                />
              )}
            </div>
          )}

          {(formData.offerType === 'BOG50' || formData.offerType === 'BOGO') && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Second Pair Offer:</strong> {formData.offerType === 'BOGO' 
                    ? 'Buy One Get One Free - Second pair will be completely free (100% off on lower value)'
                    : 'Buy One Get 50% Off - Second pair will get discount based on percentage below'}
                </p>
              </div>
              {formData.offerType === 'BOG50' && (
                <Input
                  label="Second Pair Discount %"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.secondPairPercent || 50}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    secondPairPercent: e.target.value ? parseFloat(e.target.value) : 50
                  })}
                  placeholder="50"
                />
              )}
              {formData.offerType === 'BOGO' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Note:</strong> BOGO automatically applies 100% discount on the lower value of first and second pair.
                  </p>
                </div>
              )}
              <Input
                label="Eligible Brands (comma-separated, or * for all)"
                value={((formData as any).config?.eligibleBrands || []).join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  config: {
                    ...(formData as any).config || {},
                    eligibleBrands: e.target.value 
                      ? e.target.value.split(',').map(b => b.trim()).filter(b => b)
                      : []
                  }
                })}
                placeholder="e.g., LENSTRACK, RAYBAN or * for all"
              />
            </div>
          )}

          {formData.offerType === 'BONUS_FREE_PRODUCT' && (
            <div className="space-y-4">
              <Input
                label="Trigger Min Bill Value (₹)"
                type="number"
                value={((formData as any).config?.triggerMinBill) || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  config: {
                    ...(formData as any).config,
                    triggerMinBill: e.target.value ? parseFloat(e.target.value) : 0
                  }
                })}
                placeholder="e.g., 3000"
              />
              <Input
                label="Bonus Value Limit (₹)"
                type="number"
                value={((formData as any).config?.bonusLimit) || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  config: {
                    ...(formData as any).config,
                    bonusLimit: e.target.value ? parseFloat(e.target.value) : 0
                  }
                })}
                placeholder="e.g., 1499"
              />
              <Select
                label="Bonus Category"
                value={((formData as any).config?.bonusCategory) || 'ACCESSORY'}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  config: {
                    ...(formData as any).config,
                    bonusCategory: e.target.value
                  }
                })}
                options={[
                  { value: 'FRAME', label: 'FRAME' },
                  { value: 'SUNGLASS', label: 'SUNGLASS' },
                  { value: 'CONTACT_LENS', label: 'CONTACT_LENS' },
                  { value: 'ACCESSORY', label: 'ACCESSORY' },
                ]}
              />
              <Input
                label="Eligible Brands (comma-separated, * for all)"
                value={Array.isArray((formData as any).config?.eligibleBrands) 
                  ? ((formData as any).config.eligibleBrands as string[]).join(', ')
                  : ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  config: {
                    ...(formData as any).config,
                    eligibleBrands: e.target.value 
                      ? e.target.value.split(',').map(b => b.trim()).filter(b => b)
                      : []
                  }
                })}
                placeholder="e.g., LENSTRACK, RAYBAN or * for all"
              />
            </div>
          )}

          {(formData.offerType === 'PERCENT_OFF' || formData.offerType === 'FLAT_OFF') && (
            <div className="space-y-4">
              <Input
                label="Upsell Threshold (₹)"
                type="number"
                value={((formData as any).upsellThreshold) || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  upsellThreshold: e.target.value ? parseFloat(e.target.value) : null
                })}
                placeholder="Bill value threshold for upsell"
              />
              <Input
                label="Upsell Reward Text"
                value={((formData as any).upsellRewardText) || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  upsellRewardText: e.target.value
                })}
                placeholder="e.g., FREE Sunglasses worth ₹1499"
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isSecondPairRule || false}
                onChange={(e) => setFormData({ ...formData, isSecondPairRule: e.target.checked })}
              />
              <span>Second Pair Rule</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span>Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingRule ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Offer Rule"
      >
        <p className="mb-4">Are you sure you want to delete "{deleteConfirm?.name}"?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

