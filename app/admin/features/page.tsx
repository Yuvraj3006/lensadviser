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
import { Plus, Edit2, Trash2, Sparkles } from 'lucide-react';
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
  key: string;
  name: string;
  description?: string;
  category: ProductCategory;
  isActive: boolean;
  productCount: number;
  mappingCount: number;
  createdAt: string;
}

interface FeatureFormData {
  key: string;
  name: string;
  description: string;
  category: ProductCategory;
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
    key: '',
    name: '',
    description: '',
    category: 'EYEGLASSES' as ProductCategory,
  });
  const [submitting, setSubmitting] = useState(false);

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
        setFeatures(data.data);
      }
    } catch (error) {
      console.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      category: 'EYEGLASSES' as ProductCategory,
    });
    setEditingFeature(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (feature: Feature) => {
    setFormData({
      key: feature.key,
      name: feature.name,
      description: feature.description || '',
      category: feature.category,
    });
    setEditingFeature(feature);
    setIsCreateOpen(true);
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

  const getCategoryBadgeColor = (category: ProductCategory) => {
    switch (category) {
      case 'EYEGLASSES':
        return 'blue';
      case 'SUNGLASSES':
        return 'yellow';
      case 'CONTACT_LENSES':
        return 'cyan';
      case 'ACCESSORIES':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const columns: Column<Feature>[] = [
    {
      key: 'name',
      header: 'Feature Name',
      render: (feature) => (
        <div>
          <p className="font-medium">{feature.name}</p>
          <p className="text-xs text-slate-500 font-mono">{feature.key}</p>
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
      key: 'productCount',
      header: 'Products',
      render: (feature) => (
        <span className="text-sm font-medium">{feature.productCount}</span>
      ),
    },
    {
      key: 'mappingCount',
      header: 'Mappings',
      render: (feature) => (
        <span className="text-sm font-medium">{feature.mappingCount}</span>
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
    { value: 'EYEGLASSES', label: 'Eyeglasses' },
    { value: 'SUNGLASSES', label: 'Sunglasses' },
    { value: 'CONTACT_LENSES', label: 'Contact Lenses' },
    { value: 'ACCESSORIES', label: 'Accessories' },
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
                  icon={<Edit2 size={14} />}
                  onClick={() => handleEdit(feature)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={14} />}
                  onClick={() => setDeleteConfirm(feature)}
                >
                  Delete
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
            label="Feature Key"
            placeholder="blue_light_filter"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            required
            hint="Lowercase, underscore separated (e.g., blue_light_filter)"
          />

          <Input
            label="Feature Name"
            placeholder="Blue Light Filter"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Description"
            placeholder="Blocks harmful blue light from screens"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
          />

          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
            options={categoryOptions.filter(opt => opt.value)}
            required
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
    </div>
  );
}

