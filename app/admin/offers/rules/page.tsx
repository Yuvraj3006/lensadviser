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
  upsellEnabled?: boolean; // Whether upsell is enabled for this rule
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
    upsellEnabled: false,
    lensBrandLines: [],
    lensItCodes: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [subBrands, setSubBrands] = useState<string[]>([]);
  const [brandSubBrandMap, setBrandSubBrandMap] = useState<Record<string, string[]>>({});
  const [availableSubBrands, setAvailableSubBrands] = useState<string[]>([]);
  const [selectedEligibleBrands, setSelectedEligibleBrands] = useState<string[]>([]);

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

  // Initialize selected eligible brands when form opens with BOGO/BOG50
  useEffect(() => {
    if (isCreateOpen && (formData.offerType === 'BOGO' || formData.offerType === 'BOG50')) {
      const eligibleBrands = ((formData as any).config?.eligibleBrands || []) as string[];
      if (eligibleBrands.length > 0 && JSON.stringify(eligibleBrands) !== JSON.stringify(selectedEligibleBrands)) {
        setSelectedEligibleBrands(eligibleBrands);
      }
    }
  }, [isCreateOpen, formData.offerType, (formData as any).config?.eligibleBrands]);

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
      upsellEnabled: false,
      upsellThreshold: null,
      upsellRewardText: null,
      lensBrandLines: [],
      lensItCodes: [],
    });
    setEditingRule(null);
    setSelectedEligibleBrands([]);
    setIsCreateOpen(true);
  };

  const handleEdit = (rule: OfferRule) => {
    // Ensure config object exists for editing
    const ruleWithConfig = {
      ...rule,
      config: (rule as any).config || {},
      frameBrand: (rule as any).frameBrands?.[0] || rule.frameBrand || null,
      frameSubCategory: (rule as any).frameSubCategories?.[0] || rule.frameSubCategory || null,
      upsellEnabled: (rule as any).upsellEnabled ?? false,
      upsellThreshold: (rule as any).upsellThreshold ?? null,
      upsellRewardText: (rule as any).upsellRewardText ?? null,
    };
    setFormData(ruleWithConfig);
    setEditingRule(rule);
    // Initialize selected eligible brands for BOGO/BOG50
    if (rule.offerType === 'BOGO' || rule.offerType === 'BOG50') {
      const eligibleBrands = ((ruleWithConfig as any).config?.eligibleBrands || []) as string[];
      setSelectedEligibleBrands(eligibleBrands);
    }
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Validate required fields
    if (!formData.code || formData.code.trim() === '') {
      showToast('error', 'Code is required');
      setSubmitting(false);
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingRule
        ? `/api/admin/offers/rules/${editingRule.id}`
        : '/api/admin/offers/rules';
      const method = editingRule ? 'PUT' : 'POST';

      // Prepare payload - ensure code is present and config is properly structured
      const payload = {
        ...formData,
        code: formData.code?.trim() || '',
        organizationId,
        config: (formData as any).config || {},
      };

      console.log('[OfferRules] Submitting payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // Check response status first
      if (!response.ok) {
        console.error('[OfferRules] Response not OK:', response.status, response.statusText);
        let errorData;
        try {
          const text = await response.text();
          console.error('[OfferRules] Response text:', text);
          errorData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('[OfferRules] Failed to parse error response:', parseError);
          errorData = { error: { message: `Server error: ${response.status} ${response.statusText}` } };
        }
        const errorMessage = errorData?.error?.message || errorData?.message || `Failed to save (${response.status})`;
        showToast('error', errorMessage);
        if (errorData?.error?.details && Array.isArray(errorData.error.details)) {
          console.error('[OfferRules] Validation errors:', errorData.error.details);
        }
        setSubmitting(false);
        return;
      }

      let data;
      try {
        const responseText = await response.text();
        console.log('[OfferRules] Raw response text:', responseText);
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('[OfferRules] Failed to parse response:', parseError);
        showToast('error', 'Invalid response from server');
        setSubmitting(false);
        return;
      }
      
      console.log('[OfferRules] Parsed API Response:', data);
      
      if (data.success) {
        showToast('success', editingRule ? 'Offer rule updated' : 'Offer rule created');
        setIsCreateOpen(false);
        fetchRules(organizationId);
      } else {
        console.error('[OfferRules] API Error - Full response:', JSON.stringify(data, null, 2));
        // Handle different error response formats
        let errorMessage = 'Failed to save';
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.details) {
            if (Array.isArray(data.error.details)) {
              errorMessage = data.error.details.map((d: any) => d.message || JSON.stringify(d)).join(', ');
            } else {
              errorMessage = String(data.error.details);
            }
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        showToast('error', errorMessage);
        
        // Log validation errors if present
        if (data.error?.details && Array.isArray(data.error.details)) {
          console.error('[OfferRules] Validation errors:', data.error.details);
        }
      }
    } catch (error) {
      console.error('[OfferRules] Exception during submit:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showToast('error', errorMessage);
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
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)} className="text-xs sm:text-sm">
            <Edit2 size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline ml-1">Edit</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(rule)} className="text-xs sm:text-sm">
            <Trash2 size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline ml-1">Delete</span>
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 truncate">Offer Rules</h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 mt-1">Manage offer rules and discounts</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto flex-shrink-0">
          <Plus size={20} className="mr-2" />
          <span className="hidden sm:inline">Create Rule</span>
          <span className="sm:hidden">Create</span>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-full">
          <DataTable data={rules} columns={columns} />
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingRule ? 'Edit Offer Rule' : 'Create Offer Rule'}
        size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="offer-rule-form" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Saving...' : editingRule ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="offer-rule-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 lg:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Select
              label="Offer Type"
              value={formData.offerType || ''}
              onChange={(e) => {
                const newOfferType = e.target.value as OfferRuleType;
                setFormData({ ...formData, offerType: newOfferType });
                // Initialize eligible brands when switching to BOGO/BOG50
                if ((newOfferType === 'BOGO' || newOfferType === 'BOG50') && !(formData as any).config?.eligibleBrands) {
                  setSelectedEligibleBrands([]);
                  setFormData({ 
                    ...formData, 
                    offerType: newOfferType,
                    config: {
                      ...(formData as any).config || {},
                      eligibleBrands: []
                    }
                  });
                }
              }}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Eligible Frames (Select Brands & Sub-Brands)
                </label>
                <div className="border border-slate-300 rounded-lg p-2 sm:p-4 max-h-48 sm:max-h-64 lg:max-h-96 overflow-y-auto bg-slate-50">
                  {/* Universal option */}
                  <div className="mb-4 pb-4 border-b border-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedEligibleBrands.includes('*')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Select all option - clear others and select *
                            setSelectedEligibleBrands(['*']);
                            setFormData({ 
                              ...formData, 
                              config: {
                                ...(formData as any).config || {},
                                eligibleBrands: ['*']
                              }
                            });
                          } else {
                            setSelectedEligibleBrands([]);
                            setFormData({ 
                              ...formData, 
                              config: {
                                ...(formData as any).config || {},
                                eligibleBrands: []
                              }
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-900">* (All Brands & Sub-Brands)</span>
                    </label>
                  </div>

                  {/* Brands and Sub-Brands */}
                  {brands.map((brand) => {
                    const brandSubBrands = brandSubBrandMap[brand] || [];
                    const isBrandSelected = selectedEligibleBrands.includes(brand);
                    const selectedSubBrands = selectedEligibleBrands.filter(sb => brandSubBrands.includes(sb));
                    const allSubBrandsSelected = brandSubBrands.length > 0 && selectedSubBrands.length === brandSubBrands.length;

                    return (
                      <div key={brand} className="mb-3">
                        {/* Brand checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={isBrandSelected && !selectedEligibleBrands.includes('*')}
                            onChange={(e) => {
                              let newSelection = [...selectedEligibleBrands.filter(b => b !== '*')];
                              if (e.target.checked) {
                                // Add brand and all its sub-brands
                                if (!newSelection.includes(brand)) {
                                  newSelection.push(brand);
                                }
                                brandSubBrands.forEach(sb => {
                                  if (!newSelection.includes(sb)) {
                                    newSelection.push(sb);
                                  }
                                });
                              } else {
                                // Remove brand and all its sub-brands
                                newSelection = newSelection.filter(b => b !== brand && !brandSubBrands.includes(b));
                              }
                              setSelectedEligibleBrands(newSelection);
                              setFormData({ 
                                ...formData, 
                                config: {
                                  ...(formData as any).config || {},
                                  eligibleBrands: newSelection
                                }
                              });
                            }}
                            disabled={selectedEligibleBrands.includes('*')}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <span className="font-medium text-slate-800">{brand}</span>
                          {brandSubBrands.length > 0 && (
                            <span className="text-xs text-slate-500">
                              ({selectedSubBrands.length}/{brandSubBrands.length} sub-brands)
                            </span>
                          )}
                        </label>

                        {/* Sub-Brands */}
                        {brandSubBrands.length > 0 && (
                          <div className="ml-6 mt-1 space-y-1">
                            {brandSubBrands.map((subBrand) => (
                              <label
                                key={subBrand}
                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedEligibleBrands.includes(subBrand) && !selectedEligibleBrands.includes('*')}
                                  onChange={(e) => {
                                    let newSelection = [...selectedEligibleBrands.filter(b => b !== '*' && b !== brand)];
                                    if (e.target.checked) {
                                      if (!newSelection.includes(subBrand)) {
                                        newSelection.push(subBrand);
                                      }
                                    } else {
                                      newSelection = newSelection.filter(b => b !== subBrand);
                                    }
                                    // If all sub-brands are selected, also add the brand
                                    const remainingSubBrands = brandSubBrands.filter(sb => sb !== subBrand);
                                    const otherSelectedSubBrands = newSelection.filter(sb => remainingSubBrands.includes(sb));
                                    if (e.target.checked && otherSelectedSubBrands.length === remainingSubBrands.length) {
                                      if (!newSelection.includes(brand)) {
                                        newSelection.push(brand);
                                      }
                                    }
                                    setSelectedEligibleBrands(newSelection);
                                    setFormData({ 
                                      ...formData, 
                                      config: {
                                        ...(formData as any).config || {},
                                        eligibleBrands: newSelection
                                      }
                                    });
                                  }}
                                  disabled={selectedEligibleBrands.includes('*')}
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-slate-700">{subBrand}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  💡 Select specific brands/sub-brands or choose "*" for all frames. Selected: {selectedEligibleBrands.length} item(s)
                </p>
              </div>
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

          {/* Upsell Configuration - Available for all offer types */}
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(formData as any).upsellEnabled || false}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  upsellEnabled: e.target.checked,
                  // Clear upsell fields if disabled
                  ...(e.target.checked ? {} : { upsellThreshold: null, upsellRewardText: null })
                })}
              />
              <span className="text-sm sm:text-base font-medium">Enable Upsell</span>
            </label>
            
            {(formData as any).upsellEnabled && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-700">
              <Input
                label="Upsell Threshold (₹)"
                type="number"
                value={((formData as any).upsellThreshold) || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  upsellThreshold: e.target.value ? parseFloat(e.target.value) : null
                })}
                  placeholder="Bill value threshold for upsell (e.g., 5000)"
                  required={(formData as any).upsellEnabled}
              />
              <Input
                label="Upsell Reward Text"
                value={((formData as any).upsellRewardText) || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  upsellRewardText: e.target.value
                })}
                placeholder="e.g., FREE Sunglasses worth ₹1499"
                  required={(formData as any).upsellEnabled}
              />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Customer will see this upsell banner if their current total is below the threshold
                </p>
            </div>
          )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isSecondPairRule || false}
                onChange={(e) => setFormData({ ...formData, isSecondPairRule: e.target.checked })}
              />
              <span className="text-sm sm:text-base">Second Pair Rule</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span className="text-sm sm:text-base">Active</span>
            </label>
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

