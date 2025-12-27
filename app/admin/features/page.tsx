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
import { Plus, Edit2, Trash2, Sparkles, Link2, Upload, X } from 'lucide-react';
// Client-safe ProductCategory
const ProductCategory = {
  EYEGLASSES: 'EYEGLASSES',
  SUNGLASSES: 'SUNGLASSES',
  CONTACT_LENSES: 'CONTACT_LENSES',
  ACCESSORIES: 'ACCESSORIES',
} as const;

type ProductCategory = typeof ProductCategory[keyof typeof ProductCategory];

interface Feature {
  id: string;
  code: string; // F01-F11
  name: string;
  description?: string | null;
  category: string; // DURABILITY, COATING, PROTECTION, LIFESTYLE, VISION
  displayOrder: number;
  iconUrl?: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

interface FeatureFormData {
  code: string;
  name: string;
  description: string;
  category: 'DURABILITY' | 'COATING' | 'PROTECTION' | 'LIFESTYLE' | 'VISION';
  displayOrder?: number;
  iconUrl?: string;
}

export default function FeaturesPage() {
  const { showToast } = useToast();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Feature | null>(null);
  const [formData, setFormData] = useState<FeatureFormData>({
    code: '',
    name: '',
    description: '',
    category: 'DURABILITY',
    iconUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  
  // Benefit mapping state
  const [benefitMappingFeature, setBenefitMappingFeature] = useState<Feature | null>(null);
  const [availableBenefits, setAvailableBenefits] = useState<Array<{ id: string; code: string; name: string; description?: string | null }>>([]);
  const [featureBenefits, setFeatureBenefits] = useState<Array<{ benefitCode: string; weight: number }>>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, [categoryFilter]);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      // SECURITY: Use authenticated fetch with httpOnly cookie
      const { authenticatedFetch } = await import('@/lib/api-client');
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await authenticatedFetch(`/api/admin/features?${params}`);

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        // Sort by displayOrder
        const sorted = [...data.data].sort((a: Feature, b: Feature) =>
          (a.displayOrder || 0) - (b.displayOrder || 0)
        );
        setFeatures(sorted);
      } else {
        console.error('Invalid API response:', data);
        setFeatures([]);
      }
    } catch (error) {
      console.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'DURABILITY',
      iconUrl: '',
    });
    setIconFile(null);
    setIconPreview(null);
    setEditingFeature(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (feature: Feature) => {
    // F01-F11 cannot be edited (only description/category)
    const isCoreFeature = /^F\d{2}$/.test(feature.code) && parseInt(feature.code.substring(1)) <= 11;
    setFormData({
      code: feature.code,
      name: feature.name,
      description: feature.description || '',
      category: feature.category as any,
      displayOrder: feature.displayOrder,
      iconUrl: feature.iconUrl || '',
    });
    setIconFile(null);
    setIconPreview(null); // Don't set preview for existing icons, use formData.iconUrl instead
    setEditingFeature(feature);
    setIsCreateOpen(true);
  };

  const handleManageBenefits = async (feature: Feature) => {
    setBenefitMappingFeature(feature);
    setLoadingBenefits(true);
    
    try {
      // SECURITY: Use authenticated fetch with httpOnly cookie
      const { authenticatedFetch } = await import('@/lib/api-client');
      
      // Fetch available benefits
      const benefitsResponse = await authenticatedFetch('/api/admin/benefits/all');
      const benefitsData = await benefitsResponse.json();
      if (benefitsData.success) {
        setAvailableBenefits(benefitsData.data);
      }
      
      // Fetch existing feature-benefit mappings
      const mappingsResponse = await authenticatedFetch(`/api/admin/features/${feature.id}/benefits`);
      const mappingsData = await mappingsResponse.json();
      if (mappingsData.success) {
        setFeatureBenefits(mappingsData.data.map((m: any) => ({
          benefitCode: m.benefitCode,
          weight: m.weight,
        })));
      } else {
        setFeatureBenefits([]);
      }
    } catch (error) {
      console.error('Failed to load benefits');
      showToast('error', 'Failed to load benefits');
    } finally {
      setLoadingBenefits(false);
    }
  };

  const handleSaveBenefitMappings = async () => {
    if (!benefitMappingFeature) return;
    
    setSubmitting(true);
    try {
      // SECURITY: Use authenticated fetch with httpOnly cookie
      const { apiPut } = await import('@/lib/api-client');
      const response = await apiPut(`/api/admin/features/${benefitMappingFeature.id}/benefits`, {
        benefits: featureBenefits.filter(fb => fb.weight > 0),
      });
      
      const data = await response.json();
      if (data.success) {
        showToast('success', 'Benefit mappings updated');
        setBenefitMappingFeature(null);
        setFeatureBenefits([]);
      } else {
        showToast('error', data.error?.message || 'Failed to update mappings');
      }
    } catch (error) {
      showToast('error', 'Failed to save mappings');
    } finally {
      setSubmitting(false);
    }
  };

  const updateBenefitWeight = (benefitCode: string, weight: number) => {
    setFeatureBenefits(prev => {
      const existing = prev.find(fb => fb.benefitCode === benefitCode);
      if (existing) {
        return prev.map(fb => 
          fb.benefitCode === benefitCode ? { ...fb, weight } : fb
        );
      } else {
        return [...prev, { benefitCode, weight }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // SECURITY: Use authenticated fetch with httpOnly cookie
      const { authenticatedFetch } = await import('@/lib/api-client');
      
      // If icon file is selected, upload it first
      let iconUrl = formData.iconUrl;
      if (iconFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('icon', iconFile);
        formDataUpload.append('featureCode', formData.code);

        // Use authenticated fetch for icon upload
        const uploadResponse = await authenticatedFetch('/api/admin/features/upload-icon', {
          method: 'POST',
          body: formDataUpload,
        });

        const uploadData = await uploadResponse.json();

        if (uploadData.success) {
          iconUrl = uploadData.data.iconUrl;
          console.log('[FeatureForm] Icon uploaded successfully:', iconUrl);
        } else {
          console.error('[FeatureForm] Icon upload failed:', uploadData);
          showToast('error', uploadData.error?.message || 'Failed to upload icon');
          setSubmitting(false);
          return;
        }
      }
      
      const url = editingFeature
        ? `/api/admin/features/${editingFeature.id}`
        : '/api/admin/features';
      const method = editingFeature ? 'PUT' : 'POST';

      const requestBody = {
        ...formData,
        iconUrl: iconUrl || null,
      };
      
      console.log('[FeatureForm] Submitting feature:', { 
        method, 
        url, 
        iconUrl: requestBody.iconUrl,
        hasIconFile: !!iconFile 
      });

        // SECURITY: Use authenticated API client
        const { apiPost, apiPut } = await import('@/lib/api-client');
        const response = method === 'POST' 
          ? await apiPost(url, requestBody)
          : await apiPut(url, requestBody);

      const data = await response.json();
      
      console.log('[FeatureForm] API response:', data);

      if (data.success) {
        showToast('success', `Feature ${editingFeature ? 'updated' : 'created'} successfully`);
        setIsCreateOpen(false);
        setIconFile(null);
        setIconPreview(null);
        fetchFeatures();
      } else {
        console.error('[FeatureForm] API error:', data);
        showToast('error', data.error?.message || data.error?.code || 'Operation failed');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      // SECURITY: Use authenticated fetch with httpOnly cookie
      const { apiDelete } = await import('@/lib/api-client');
      const response = await apiDelete(`/api/admin/features/${deleteConfirm.id}`);

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Feature deactivated successfully');
        setDeleteConfirm(null);
        fetchFeatures();
      } else {
        showToast('error', data.error?.message || 'Failed to delete feature');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'DURABILITY':
        return 'blue';
      case 'COATING':
        return 'purple';
      case 'PROTECTION':
        return 'green';
      case 'LIFESTYLE':
        return 'yellow';
      case 'VISION':
        return 'cyan';
      default:
        return 'gray';
    }
  };

  const isCoreFeature = (code: string): boolean => {
    return /^F\d{2}$/.test(code) && parseInt(code.substring(1)) <= 11;
  };

  const columns: Column<Feature>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (feature) => (
        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{feature.code}</span>
      ),
    },
    {
      key: 'icon',
      header: 'Icon',
      render: (feature) => (
        feature.iconUrl ? (
          <img
            src={feature.iconUrl.startsWith('http') ? feature.iconUrl : `${window.location.origin}${feature.iconUrl}?t=${Date.now()}`}
            alt={`${feature.name} icon`}
            className="w-8 h-8 object-contain border border-slate-200 dark:border-slate-700 rounded"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-8 h-8 border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <span className="text-xs text-slate-400">No icon</span>
          </div>
        )
      ),
    },
    {
      key: 'name',
      header: 'Feature Name',
      render: (feature) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-200">{feature.name}</p>
          {feature.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{feature.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (feature) => (
        <span className="text-sm text-slate-900 dark:text-slate-200">{feature.description || '-'}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (feature) => (
        <Badge color={getCategoryBadgeColor(feature.category)}>
          {feature.category.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'displayOrder',
      header: 'Order',
      render: (feature) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{feature.displayOrder}</span>
      ),
    },
    {
      key: 'productCount',
      header: 'Products',
      render: (feature) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{feature.productCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (feature) => (
        <Badge color={feature.isActive ? 'green' : 'red'}>
          {feature.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'DURABILITY', label: 'Durability' },
    { value: 'COATING', label: 'Coating' },
    { value: 'PROTECTION', label: 'Protection' },
    { value: 'LIFESTYLE', label: 'Lifestyle' },
    { value: 'VISION', label: 'Vision' },
  ];

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white truncate">Features</h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 dark:text-slate-400 mt-1">Manage product features and attributes</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleCreate} className="w-full sm:w-auto flex-shrink-0">
          <span className="hidden sm:inline">Add Feature</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-4 sm:mb-6 w-full sm:w-auto sm:max-w-xs">
        <Select
          placeholder="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={categoryOptions}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto w-full">
        {features.length === 0 && !loading ? (
          <EmptyState
            icon={<Sparkles size={48} />}
            title="No features found"
            description="Create features to describe product characteristics"
            action={{
              label: 'Add Feature',
              onClick: handleCreate,
            }}
          />
        ) : (
          <DataTable
              columns={columns}
              data={features}
              loading={loading}
              rowActions={(feature) => (
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Link2 size={14} />}
                    onClick={() => handleManageBenefits(feature)}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Benefits</span>
                    <span className="sm:hidden">B</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Edit2 size={14} />}
                    onClick={() => handleEdit(feature)}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Edit</span>
                    <span className="sm:hidden">E</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 size={14} />}
                    onClick={() => setDeleteConfirm(feature)}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Deactivate</span>
                    <span className="sm:hidden">D</span>
                  </Button>
                </div>
              )}
            />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingFeature ? 'Edit Feature' : 'Create Feature'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingFeature ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Feature Code"
            placeholder="F12"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            disabled={false}
            hint="Must be F followed by 2+ digits (e.g., F12, F13)"
          />

          <Input
            label="Feature Name"
            placeholder="Feature Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={false}
          />

          <Input
            label="Description"
            placeholder="Feature description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
          />

          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            options={categoryOptions.filter(opt => opt.value)}
            required
          />

          <Input
            label="Display Order"
            type="number"
            value={formData.displayOrder || ''}
            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || undefined })}
            hint="Order in which feature appears (lower = first). Leave empty for auto-assignment."
            min="1"
          />

          {/* Icon Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Feature Icon
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIconFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setIconPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                  <Upload size={18} className="text-slate-500 dark:text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {iconFile ? iconFile.name : 'Click to upload icon'}
                  </span>
                </div>
              </label>
              {(iconPreview || iconFile) && (
                <button
                  type="button"
                  onClick={() => {
                    setIconFile(null);
                    setIconPreview(null);
                    setFormData({ ...formData, iconUrl: '' });
                  }}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {(iconPreview || formData.iconUrl) && (
              <div className="mt-3">
                {(() => {
                  const imageSrc = iconPreview || formData.iconUrl || '';
                  const fullImageSrc = imageSrc.startsWith('http') ? imageSrc : `${window.location.origin}${imageSrc}`;
                  // Add cache busting parameter to prevent browser caching
                  const finalImageSrc = fullImageSrc ? `${fullImageSrc}?t=${Date.now()}` : '';
                  return (
                    <img
                      src={finalImageSrc}
                      alt="Icon preview"
                      className="w-16 h-16 object-contain border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    />
                  );
                })()}
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload an icon image to display in the feature grid popup (recommended: 64x64px, PNG/SVG)
            </p>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Deactivate Feature"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-400">
          Are you sure you want to deactivate <strong className="text-slate-900 dark:text-white">{deleteConfirm?.name}</strong>?
          This will not affect existing product associations.
        </p>
      </Modal>

      {/* Benefit Mapping Modal */}
      <Modal
        isOpen={!!benefitMappingFeature}
        onClose={() => {
          setBenefitMappingFeature(null);
          setFeatureBenefits([]);
        }}
        title={`Map Benefits to ${benefitMappingFeature?.name || 'Feature'}`}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setBenefitMappingFeature(null);
                setFeatureBenefits([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveBenefitMappings} loading={submitting}>
              Save Mappings
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Map benefits to this feature. Weight (0.0-1.0) indicates connection strength.
            Higher weight = stronger relationship between feature and benefit.
          </p>
          
          {loadingBenefits ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {availableBenefits.map((benefit) => {
                const mapping = featureBenefits.find(fb => fb.benefitCode === benefit.code);
                const weight = mapping?.weight || 0;
                
                return (
                  <div
                    key={benefit.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge color="blue" size="sm">{benefit.code}</Badge>
                          <span className="font-medium text-slate-900 dark:text-white">{benefit.name || benefit.code}</span>
                        </div>
                        {benefit.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{benefit.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{weight.toFixed(1)}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">/ 1.0</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={weight}
                        onChange={(e) => updateBenefitWeight(benefit.code, parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-600 accent-blue-600 dark:accent-blue-400"
                      />
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>0.0 (No connection)</span>
                        <span>0.5 (Moderate)</span>
                        <span>1.0 (Strong)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

