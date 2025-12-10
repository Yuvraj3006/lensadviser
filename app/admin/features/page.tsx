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
import { Plus, Edit2, Trash2, Sparkles, Link2 } from 'lucide-react';
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
  });
  const [submitting, setSubmitting] = useState(false);
  
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
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/admin/features?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Sort by displayOrder
        const sorted = data.data.sort((a: Feature, b: Feature) => 
          (a.displayOrder || 0) - (b.displayOrder || 0)
        );
        setFeatures(sorted);
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
    });
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
    });
    setEditingFeature(feature);
    setIsCreateOpen(true);
  };

  const handleManageBenefits = async (feature: Feature) => {
    setBenefitMappingFeature(feature);
    setLoadingBenefits(true);
    
    try {
      const token = localStorage.getItem('lenstrack_token');
      
      // Fetch available benefits
      const benefitsResponse = await fetch('/api/admin/benefits/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const benefitsData = await benefitsResponse.json();
      if (benefitsData.success) {
        setAvailableBenefits(benefitsData.data);
      }
      
      // Fetch existing feature-benefit mappings
      const mappingsResponse = await fetch(`/api/admin/features/${feature.id}/benefits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/features/${benefitMappingFeature.id}/benefits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          benefits: featureBenefits.filter(fb => fb.weight > 0),
        }),
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
      const token = localStorage.getItem('lenstrack_token');
      const url = editingFeature
        ? `/api/admin/features/${editingFeature.id}`
        : '/api/admin/features';
      const method = editingFeature ? 'PUT' : 'POST';

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
        showToast('success', `Feature ${editingFeature ? 'updated' : 'created'} successfully`);
        setIsCreateOpen(false);
        fetchFeatures();
      } else {
        showToast('error', data.error?.message || 'Operation failed');
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
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/features/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
        <span className="font-mono font-semibold text-slate-700">{feature.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Feature Name',
      render: (feature) => (
        <div>
          <p className="font-medium">{feature.name}</p>
          {feature.description && (
            <p className="text-xs text-slate-500 mt-1">{feature.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (feature) => (
        <span className="text-sm">{feature.description || '-'}</span>
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
        <span className="text-sm font-medium">{feature.displayOrder}</span>
      ),
    },
    {
      key: 'productCount',
      header: 'Products',
      render: (feature) => (
        <span className="text-sm font-medium">{feature.productCount}</span>
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Features</h1>
          <p className="text-slate-600 mt-1">Manage product features and attributes</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleCreate}>
          Add Feature
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select
          placeholder="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={categoryOptions}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Link2 size={14} />}
                  onClick={() => handleManageBenefits(feature)}
                >
                  Benefits
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Edit2 size={14} />}
                  onClick={() => handleEdit(feature)}
                >
                  Edit
                </Button>
                {!isCoreFeature(feature.code) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 size={14} />}
                    onClick={() => setDeleteConfirm(feature)}
                  >
                    Delete
                  </Button>
                )}
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
            disabled={!!(editingFeature?.code && isCoreFeature(editingFeature.code))}
            hint={editingFeature?.code && isCoreFeature(editingFeature.code) 
              ? "Core features (F01-F11) cannot be modified" 
              : "Must be F followed by 2+ digits (e.g., F12, F13)"}
          />

          <Input
            label="Feature Name"
            placeholder="Feature Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={!!(editingFeature?.code && isCoreFeature(editingFeature.code))}
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
        <p className="text-slate-600">
          Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong>?
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
          <p className="text-sm text-slate-600 mb-4">
            Map benefits to this feature. Weight (0.0-1.0) indicates connection strength.
            Higher weight = stronger relationship between feature and benefit.
          </p>
          
          {loadingBenefits ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {availableBenefits.map((benefit) => {
                const mapping = featureBenefits.find(fb => fb.benefitCode === benefit.code);
                const weight = mapping?.weight || 0;
                
                return (
                  <div
                    key={benefit.id}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge color="blue" size="sm">{benefit.code}</Badge>
                          <span className="font-medium text-slate-900">{benefit.name || benefit.code}</span>
                        </div>
                        {benefit.description && (
                          <p className="text-sm text-slate-600 mt-1">{benefit.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-blue-600">{weight.toFixed(1)}</span>
                        <span className="text-xs text-slate-500 block">/ 1.0</span>
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
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
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

