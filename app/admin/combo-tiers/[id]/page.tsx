'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Gift, Settings, Eye, Save, X, Edit2, Package, Check } from 'lucide-react';

interface ComboBenefit {
  id?: string;
  benefitType: 'frame' | 'lens' | 'eyewear' | 'addon' | 'voucher';
  label: string;
  maxValue?: number;
  constraints?: string;
  // Constraint fields (stored in constraints JSON)
  frameBrands?: string[]; // Multiple brands
  frameSubBrands?: string[]; // Multiple sub-brands
  framePriceMin?: number;
  framePriceMax?: number;
  lensProductIds?: string[]; // Multiple lens product IDs (direct selection)
  lensPriceMin?: number;
  lensPriceMax?: number;
  showAllLenses?: boolean;
  accessoryIds?: string[]; // Multiple accessories for addon
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
  totalComboValue?: number | null;
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

function ComboTierDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const tierId = params?.id as string;
  
  // Get edit mode from window.location to avoid Suspense issues
  const [isEditMode, setIsEditMode] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const editMode = urlParams.get('edit') === 'true';
      setIsEditMode(editMode);
    }
  }, []);
  
  const isNew = tierId === 'new' || !tierId || (isEditMode && !tierId);
  
  // For new tiers, don't show loading at all
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'benefits' | 'rules' | 'preview'>('benefits');
  const [tier, setTier] = useState<ComboTier | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Data for constraints
  const [frameBrands, setFrameBrands] = useState<Array<{ id: string; name: string; subBrands: Array<{ id: string; name: string }> }>>([]);
  const [lensProducts, setLensProducts] = useState<Array<{ id: string; itCode: string; name: string; brandLine: string; baseOfferPrice: number }>>([]);
  const [accessories, setAccessories] = useState<Array<{ id: string; name: string; brand?: { name: string } }>>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    comboCode: '',
    displayName: '',
    effectivePrice: 0,
    totalComboValue: null as number | null,
    badge: '',
    isActive: true,
    sortOrder: 0,
    benefits: [] as ComboBenefit[],
  });

  useEffect(() => {
    // Always fetch brands for constraints (needed for both new and existing tiers)
    fetchBrands().catch(err => console.error('❌ Error fetching brands:', err));
    
    // Initialize based on whether it's a new tier or existing
    if (isNew) {
      // For new tiers, set loading to false and editing to true immediately
      setLoading(false);
      setEditing(true);
    } else if (tierId && tierId !== 'new') {
      // For existing tiers, fetch the tier data
      fetchTier();
    } else {
      // Fallback: if tierId is not available yet, keep loading
      setLoading(true);
    }
  }, [tierId, isNew]);

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      
      if (!token) {
        console.error('[fetchBrands] No token found in localStorage');
        return;
      }
      
      console.log('[fetchBrands] Starting to fetch brands...');
      
      // Fetch frame brands (with sub-brands)
      const frameResponse = await fetch('/api/admin/brands', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('[fetchBrands] Frame brands response status:', frameResponse.status);
      
      if (frameResponse.ok) {
        const frameData = await frameResponse.json();
        console.log('[fetchBrands] Frame brands data:', { success: frameData.success, count: frameData.data?.length || 0 });
        
        if (frameData.success) {
          // Filter brands that have FRAME or SUNGLASS in productTypes
          const frameBrandsData = frameData.data.filter((b: any) => 
            b.productTypes?.includes('FRAME') || b.productTypes?.includes('SUNGLASS')
          );
          console.log('[fetchBrands] Filtered frame brands:', frameBrandsData.length);
          setFrameBrands(frameBrandsData);
        } else {
          console.error('[fetchBrands] Frame brands API returned error:', frameData.error);
        }
      } else {
        const errorText = await frameResponse.text();
        console.error('[fetchBrands] Frame brands fetch failed:', frameResponse.status, errorText);
      }
      
      // Fetch combo-allowed lens products directly (no brands/sub-brands)
      console.log('[fetchBrands] Fetching combo-allowed lens products...');
      const comboLensesResponse = await fetch('/api/admin/lens-products?comboAllowed=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('[fetchBrands] Lens products response status:', comboLensesResponse.status);
      
      if (comboLensesResponse.ok) {
        const comboLensesData = await comboLensesResponse.json();
        console.log('[fetchBrands] Lens products data:', { success: comboLensesData.success, count: comboLensesData.data?.length || 0, error: comboLensesData.error });
        
        if (comboLensesData.success && comboLensesData.data && comboLensesData.data.length > 0) {
          // Map lens products to a simpler format
          const products = comboLensesData.data.map((lens: any) => ({
            id: lens.id,
            itCode: lens.itCode || '',
            name: lens.name || '',
            brandLine: lens.brandLine || '',
            baseOfferPrice: lens.baseOfferPrice || 0,
          }));
          
          // Sort by brandLine and name for better organization
          products.sort((a: { id: string; itCode: string; name: string; brandLine: string; baseOfferPrice: number }, b: { id: string; itCode: string; name: string; brandLine: string; baseOfferPrice: number }) => {
            const brandLineA = a.brandLine || '';
            const brandLineB = b.brandLine || '';
            if (brandLineA !== brandLineB) {
              return brandLineA.localeCompare(brandLineB);
            }
            return (a.name || '').localeCompare(b.name || '');
          });
          
          console.log('[fetchBrands] Loaded combo-allowed lens products:', products.length);
          setLensProducts(products);
        } else {
          console.warn('[fetchBrands] No combo-allowed lens products found');
          setLensProducts([]);
        }
      } else {
        const errorText = await comboLensesResponse.text();
        console.error('[fetchBrands] Failed to fetch lens products:', comboLensesResponse.status, errorText);
        setLensProducts([]);
      }
      
      // Fetch accessories for addon benefits
      const accessoriesResponse = await fetch('/api/admin/products?type=ACCESSORY', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (accessoriesResponse.ok) {
        const accessoriesData = await accessoriesResponse.json();
        console.log('[Accessories] API Response:', accessoriesData);
        if (accessoriesData.success) {
          // Don't filter by isActive - show all accessories
          const allAccessories = (accessoriesData.data || [])
            .map((a: any) => ({
              id: a.id,
              name: a.name || a.sku || 'Unnamed Accessory',
              brand: a.brand,
              isActive: a.isActive,
            }));
          setAccessories(allAccessories);
          console.log('[Accessories] Loaded accessories:', allAccessories.length, allAccessories);
        } else {
          console.error('[Accessories] API error:', accessoriesData.error);
        }
      } else {
        const errorText = await accessoriesResponse.text();
        console.error('[Accessories] Fetch failed:', accessoriesResponse.status, errorText);
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

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
        
        // Parse constraints from benefits
        const benefitsWithConstraints = (data.data.benefits || []).map((b: any) => {
          let parsedConstraints: any = {};
          if (b.constraints) {
            try {
              parsedConstraints = JSON.parse(b.constraints);
              // Convert single brand to array for backward compatibility
              if (parsedConstraints.frameBrand && !parsedConstraints.frameBrands) {
                parsedConstraints.frameBrands = [parsedConstraints.frameBrand];
              }
              // Backward compatibility: convert old lensBrand/lensBrands to lensProductIds if needed
              // (Old format won't be converted automatically, but we'll handle it in the UI)
            } catch (e) {
              parsedConstraints = {};
            }
          }
          return {
            ...b,
            ...parsedConstraints,
          };
        });
        
        setFormData({
          comboCode: data.data.comboCode,
          displayName: data.data.displayName,
          effectivePrice: data.data.effectivePrice,
          totalComboValue: data.data.totalComboValue || null,
          badge: data.data.badge || '',
          isActive: data.data.isActive,
          sortOrder: data.data.sortOrder || 0,
          benefits: benefitsWithConstraints,
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

      // Prepare benefits with constraints as JSON string
      const benefitsToSave = formData.benefits.map(b => {
        const { frameBrands, frameSubBrands, framePriceMin, framePriceMax, lensProductIds, lensPriceMin, lensPriceMax, showAllLenses, accessoryIds, ...rest } = b;
        
        // Build constraints object
        const constraints: any = {};
        if (b.benefitType === 'frame') {
          if (frameBrands && frameBrands.length > 0) constraints.frameBrands = frameBrands;
          if (frameSubBrands && frameSubBrands.length > 0) constraints.frameSubBrands = frameSubBrands;
          if (framePriceMin !== undefined) constraints.framePriceMin = framePriceMin;
          if (framePriceMax !== undefined) constraints.framePriceMax = framePriceMax;
        } else if (b.benefitType === 'lens') {
          if (showAllLenses) constraints.showAllLenses = true;
          if (lensProductIds && lensProductIds.length > 0) constraints.lensProductIds = lensProductIds;
          if (lensPriceMin !== undefined) constraints.lensPriceMin = lensPriceMin;
          if (lensPriceMax !== undefined) constraints.lensPriceMax = lensPriceMax;
        } else if (b.benefitType === 'addon') {
          if (accessoryIds && accessoryIds.length > 0) constraints.accessoryIds = accessoryIds;
        }
        
        return {
          ...rest,
          constraints: Object.keys(constraints).length > 0 ? JSON.stringify(constraints) : undefined,
        };
      });

      const payload = {
        ...formData,
        benefits: benefitsToSave,
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
    
    // If constraints field is being updated, parse and merge
    if (field === 'constraints' && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        updated[index] = { ...updated[index], ...parsed };
      } catch (e) {
        // Invalid JSON, keep as is
      }
    }
    
    setFormData({ ...formData, benefits: updated });
  };

  const updateBenefitConstraint = (index: number, constraintField: string, value: any) => {
    const updated = [...formData.benefits];
    const benefit = updated[index];
    
    // Parse existing constraints or create new
    let constraints: any = {};
    if (benefit.constraints) {
      try {
        constraints = JSON.parse(benefit.constraints);
      } catch (e) {
        constraints = {};
      }
    }
    
    // Update constraint
    constraints[constraintField] = value;
    
    // Update benefit with new constraint value and JSON string
    updated[index] = {
      ...benefit,
      [constraintField]: value,
      constraints: JSON.stringify(constraints),
    };
    
    setFormData({ ...formData, benefits: updated });
  };

  const getBenefitConstraints = (benefit: ComboBenefit) => {
    if (!benefit.constraints) return {};
    try {
      return JSON.parse(benefit.constraints);
    } catch (e) {
      return {};
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
        <div className="ml-4 text-slate-600">Loading combo tier...</div>
      </div>
    );
  }

  const displayTier = editing ? { ...tier, ...formData } : tier;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/combo-tiers')}
            className="mb-4 w-full sm:w-auto"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Combo Tiers
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {isNew ? 'Create Combo Tier' : displayTier?.displayName || 'Combo Tier'}
              </h1>
              {!isNew && displayTier && (
                <p className="text-sm sm:text-base text-slate-600 mt-1">Code: {displayTier.comboCode} • Version: {displayTier.comboVersion}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                  value={formData.effectivePrice}
                  onChange={(e) => setFormData({ ...formData, effectivePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="5000"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total Combo Value (₹)
                </label>
                <Input
                  type="number"
                  value={formData.totalComboValue || ''}
                  onChange={(e) => setFormData({ ...formData, totalComboValue: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="7000 (optional - for showing original price)"
                  min="0"
                />
                <p className="text-xs text-slate-500 mt-1">This will be shown with strikethrough to show savings</p>
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
                  {(editing || isNew) && (
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
                          <div className="w-full space-y-3">
                            <div className="flex items-center gap-3">
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
                            </div>
                            
                            {/* Frame Constraints */}
                            {benefit.benefitType === 'frame' && (
                              <div className="pl-4 border-l-2 border-purple-200 space-y-2 bg-purple-50/50 p-3 rounded">
                                <div className="text-sm font-medium text-slate-700 mb-2">Frame Selection Constraints</div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs text-slate-600 mb-2">Brands (Select Multiple)</label>
                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded p-2 bg-white">
                                      {frameBrands.length === 0 ? (
                                        <p className="text-xs text-slate-500 py-2">No brands available</p>
                                      ) : (
                                        <div className="space-y-1">
                                          {frameBrands.map((brand) => {
                                            const isSelected = (benefit.frameBrands || []).includes(brand.id);
                                            return (
                                              <label
                                                key={brand.id}
                                                className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={(e) => {
                                                    const currentBrands = benefit.frameBrands || [];
                                                    const newBrands = e.target.checked
                                                      ? [...currentBrands, brand.id]
                                                      : currentBrands.filter((id) => id !== brand.id);
                                                    updateBenefitConstraint(idx, 'frameBrands', newBrands.length > 0 ? newBrands : undefined);
                                                  }}
                                                  className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                                />
                                                <span className="text-sm text-slate-700">{brand.name}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                    {(benefit.frameBrands || []).length > 0 && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {(benefit.frameBrands || []).length} brand(s) selected
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-600 mb-2">Sub Brands (Select Multiple)</label>
                                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded p-2 bg-white">
                                      {(!benefit.frameBrands || benefit.frameBrands.length === 0) ? (
                                        <p className="text-xs text-slate-500 py-2">Please select brands first to see sub-brands</p>
                                      ) : (() => {
                                        // Group subbrands by brand for better organization
                                        const selectedBrands = frameBrands.filter(b => benefit.frameBrands?.includes(b.id));
                                        const brandsWithSubBrands = selectedBrands.filter(b => b.subBrands && b.subBrands.length > 0);
                                        
                                        if (brandsWithSubBrands.length === 0) {
                                          return <p className="text-xs text-slate-500 py-2">No sub-brands available for selected brands</p>;
                                        }
                                        
                                        return (
                                          <div className="space-y-3">
                                            {brandsWithSubBrands.map((brand) => (
                                              <div key={brand.id} className="border-b border-slate-200 last:border-b-0 pb-2 last:pb-0">
                                                <div className="text-xs font-semibold text-slate-700 mb-1.5 px-1">
                                                  {brand.name}
                                                </div>
                                                <div className="space-y-1 pl-2">
                                                  {brand.subBrands?.map((subBrand) => {
                                                    const isSelected = (benefit.frameSubBrands || []).includes(subBrand.id);
                                                    return (
                                                      <label
                                                        key={subBrand.id}
                                                        className="flex items-center gap-2 p-1.5 hover:bg-purple-50 rounded cursor-pointer transition-colors"
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          checked={isSelected}
                                                          onChange={(e) => {
                                                            const currentSubBrands = benefit.frameSubBrands || [];
                                                            const newSubBrands = e.target.checked
                                                              ? [...currentSubBrands, subBrand.id]
                                                              : currentSubBrands.filter((id) => id !== subBrand.id);
                                                            updateBenefitConstraint(idx, 'frameSubBrands', newSubBrands.length > 0 ? newSubBrands : undefined);
                                                          }}
                                                          className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                                        />
                                                        <span className="text-sm text-slate-700">
                                                          {subBrand.name}
                                                        </span>
                                                      </label>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    {(benefit.frameSubBrands || []).length > 0 && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {(benefit.frameSubBrands || []).length} sub-brand(s) selected
                                      </p>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs text-slate-600 mb-1">Min Price (₹)</label>
                                      <Input
                                        type="number"
                                        value={benefit.framePriceMin || ''}
                                        onChange={(e) => updateBenefitConstraint(idx, 'framePriceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                                        placeholder="0"
                                        min="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-slate-600 mb-1">Max Price (₹)</label>
                                      <Input
                                        type="number"
                                        value={benefit.framePriceMax || ''}
                                        onChange={(e) => updateBenefitConstraint(idx, 'framePriceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                                        placeholder="No limit"
                                        min="0"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Lens Constraints */}
                            {benefit.benefitType === 'lens' && (
                              <div className="pl-4 border-l-2 border-blue-200 space-y-2 bg-blue-50/50 p-3 rounded">
                                <div className="text-sm font-medium text-slate-700 mb-2">Lens Selection</div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`show-all-${idx}`}
                                      checked={benefit.showAllLenses || false}
                                      onChange={(e) => updateBenefitConstraint(idx, 'showAllLenses', e.target.checked)}
                                      className="w-4 h-4"
                                    />
                                    <label htmlFor={`show-all-${idx}`} className="text-sm text-slate-700">
                                      Show All Combo-Allowed Lenses
                                    </label>
                                  </div>
                                  {!benefit.showAllLenses && (
                                    <div>
                                      <label className="block text-xs text-slate-600 mb-2">Select Lens Products (Multiple)</label>
                                      <div className="max-h-60 overflow-y-auto border border-slate-200 rounded p-2 bg-white">
                                        {lensProducts.length === 0 ? (
                                          <p className="text-xs text-slate-500 py-2">No combo-allowed lens products available. Please mark lenses as "Combo Lens" first.</p>
                                        ) : (
                                          <div className="space-y-1">
                                            {lensProducts.map((lens) => {
                                              const isSelected = (benefit.lensProductIds || []).includes(lens.id);
                                              return (
                                                <label
                                                  key={lens.id}
                                                  className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors border-b border-slate-100 last:border-b-0"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                      const currentProducts = benefit.lensProductIds || [];
                                                      const newProducts = e.target.checked
                                                        ? [...currentProducts, lens.id]
                                                        : currentProducts.filter((id) => id !== lens.id);
                                                      updateBenefitConstraint(idx, 'lensProductIds', newProducts.length > 0 ? newProducts : undefined);
                                                    }}
                                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                  />
                                                  <div className="flex-1">
                                                    <div className="text-sm font-medium text-slate-700">{lens.name}</div>
                                                    <div className="text-xs text-slate-500">
                                                      {lens.brandLine} • {lens.itCode} • ₹{lens.baseOfferPrice.toLocaleString()}
                                                    </div>
                                                  </div>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                      {(benefit.lensProductIds || []).length > 0 && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          {(benefit.lensProductIds || []).length} lens product(s) selected
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  <div>
                                    <label className="block text-xs text-slate-600 mb-1">Price Range (Optional)</label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        value={benefit.lensPriceMin || ''}
                                        onChange={(e) => updateBenefitConstraint(idx, 'lensPriceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                                        placeholder="Min"
                                        min="0"
                                        className="flex-1"
                                      />
                                      <Input
                                        type="number"
                                        value={benefit.lensPriceMax || ''}
                                        onChange={(e) => updateBenefitConstraint(idx, 'lensPriceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                                        placeholder="Max"
                                        min="0"
                                        className="flex-1"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Addon Constraints */}
                            {benefit.benefitType === 'addon' && (
                              <div className="pl-4 border-l-2 border-green-200 space-y-2 bg-green-50/50 p-3 rounded">
                                <div className="text-sm font-medium text-slate-700 mb-2">Accessory Selection</div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs text-slate-600 mb-2">Accessories (Select Multiple)</label>
                                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded p-2 bg-white">
                                      {accessories.length === 0 ? (
                                        <p className="text-xs text-slate-500 py-2">No accessories available</p>
                                      ) : (
                                        <div className="space-y-1">
                                          {accessories.map((accessory) => {
                                            const isSelected = (benefit.accessoryIds || []).includes(accessory.id);
                                            return (
                                              <label
                                                key={accessory.id}
                                                className="flex items-center gap-2 p-1.5 hover:bg-green-50 rounded cursor-pointer transition-colors"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={(e) => {
                                                    const currentAccessories = benefit.accessoryIds || [];
                                                    const newAccessories = e.target.checked
                                                      ? [...currentAccessories, accessory.id]
                                                      : currentAccessories.filter((id) => id !== accessory.id);
                                                    updateBenefitConstraint(idx, 'accessoryIds', newAccessories.length > 0 ? newAccessories : undefined);
                                                  }}
                                                  className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                                                />
                                                <span className="text-sm text-slate-700">
                                                  {accessory.name}
                                                  {accessory.brand?.name && (
                                                    <span className="text-xs text-slate-500 ml-1">({accessory.brand.name})</span>
                                                  )}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                    {(benefit.accessoryIds || []).length > 0 && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {(benefit.accessoryIds || []).length} accessory(ies) selected
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
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
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Customer Preview</h2>
                  <p className="text-sm text-slate-600">This is how customers will see this combo tier on the selection page</p>
                </div>
                
                {/* Preview Container with Gradient Background */}
                <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl p-8 min-h-[600px]">
                  {/* Simulated Customer Page Header */}
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Package className="text-purple-400" size={32} />
                      <h1 className="text-3xl font-bold text-white">
                        Smart Value Combo
                      </h1>
                    </div>
                    <p className="text-slate-300 text-lg">
                      Choose the combo tier that works best for you
                    </p>
                  </div>

                  {/* Preview Card */}
                  <div className="max-w-md mx-auto">
                    <div className={`bg-slate-800/50 backdrop-blur rounded-xl shadow-2xl border-2 p-6 transition-all ${
                      (formData.isActive !== false && (displayTier?.isActive !== false)) 
                        ? 'border-purple-400 ring-2 ring-purple-500/30' 
                        : 'border-slate-700 opacity-75'
                    }`}>
                      {/* Status Indicator */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (formData.isActive !== false && (displayTier?.isActive !== false))
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {(formData.isActive !== false && (displayTier?.isActive !== false)) ? 'Active' : 'Inactive'}
                        </span>
                        {!isNew && displayTier && (
                          <span className="text-xs text-slate-500">v{displayTier.comboVersion}</span>
                        )}
                      </div>

                      {/* Tier Header */}
                      <div className="text-center mb-4">
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {formData.displayName || displayTier?.displayName || 'Tier Name'}
                        </h3>
                        {(formData.badge || displayTier?.badge) && (
                          <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full mb-2 font-medium">
                            {formData.badge || displayTier?.badge}
                          </span>
                        )}
                        <div className="mt-2">
                          {(formData.totalComboValue || displayTier?.totalComboValue) && (
                            <div className="text-lg text-slate-400 line-through mb-1">
                              ₹{(formData.totalComboValue || displayTier?.totalComboValue || 0).toLocaleString()}
                            </div>
                          )}
                          <div className="text-3xl font-bold text-purple-400">
                            ₹{(formData.effectivePrice || displayTier?.effectivePrice || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">Combo Price</div>
                      </div>

                      {/* Benefits List */}
                      <div className="border-t border-slate-700 pt-4">
                        <div className="text-sm text-slate-300 mb-3 font-semibold flex items-center gap-2">
                          <Gift size={16} className="text-purple-400" />
                          What you get:
                        </div>
                        {(formData.benefits.length > 0 ? formData.benefits : displayTier?.benefits || []).length > 0 ? (
                          <ul className="space-y-2.5">
                            {(formData.benefits.length > 0 ? formData.benefits : displayTier?.benefits || []).map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                                <Check size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="font-medium">{benefit.label}</span>
                                  {benefit.benefitType && (
                                    <span className="text-xs text-slate-500 ml-2">({benefit.benefitType})</span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-slate-500 italic py-4 text-center">
                            No benefits configured yet
                          </div>
                        )}
                      </div>

                      {/* Additional Info */}
                      {!isNew && displayTier && (
                        <div className="border-t border-slate-700 pt-4 mt-4">
                          <div className="text-xs text-slate-500 space-y-1">
                            <div>Code: <span className="text-slate-400 font-mono">{displayTier.comboCode}</span></div>
                            <div>Sort Order: <span className="text-slate-400">{formData.sortOrder || displayTier.sortOrder || 0}</span></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview Note */}
                    <div className="mt-6 text-center">
                      <p className="text-xs text-slate-400 italic">
                        This is a preview. Customers will see this card in a grid with other tiers.
                      </p>
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

export default function ComboTierDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
        <div className="ml-4 text-slate-600">Suspense fallback loading...</div>
      </div>
    }>
      <ComboTierDetailPageContent />
    </Suspense>
  );
}

