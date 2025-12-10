'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';

interface BenefitFeature {
  id: string;
  type: 'BENEFIT' | 'FEATURE';
  code: string;
  name: string;
  description?: string | null;
  pointWeight?: number | null;
  maxScore?: number | null;
  category?: string | null;
  displayOrder?: number | null;
  isActive: boolean;
  organizationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BenefitFeatureFormData {
  type: 'BENEFIT' | 'FEATURE';
  code: string;
  name: string;
  description: string;
  pointWeight?: number;
  maxScore?: number;
  category?: string;
  displayOrder?: number;
  isActive: boolean;
}

export default function BenefitFeaturesPage() {
  const { showToast } = useToast();
  const [benefitFeatures, setBenefitFeatures] = useState<BenefitFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'BENEFIT' | 'FEATURE' | ''>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BenefitFeature | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BenefitFeature | null>(null);
  const [formData, setFormData] = useState<BenefitFeatureFormData>({
    type: 'BENEFIT',
    code: '',
    name: '',
    description: '',
    pointWeight: 1.0,
    maxScore: 3.0,
    category: 'DURABILITY',
    displayOrder: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBenefitFeatures();
  }, [typeFilter]);

  const fetchBenefitFeatures = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);

      const response = await fetch(`/api/admin/benefit-features?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setBenefitFeatures(data.data);
      }
    } catch (error) {
      console.error('Failed to load benefit-features');
      showToast('error', 'Failed to load benefit-features');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      type: 'BENEFIT',
      code: '',
      name: '',
      description: '',
      pointWeight: 1.0,
      maxScore: 3.0,
      category: 'DURABILITY',
      displayOrder: 0,
      isActive: true,
    });
    setEditingItem(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (item: BenefitFeature) => {
    setFormData({
      type: item.type,
      code: item.code,
      name: item.name,
      description: item.description || '',
      pointWeight: item.pointWeight ?? undefined,
      maxScore: item.maxScore ?? undefined,
      category: item.category || undefined,
      displayOrder: item.displayOrder ?? undefined,
      isActive: item.isActive,
    });
    setEditingItem(item);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingItem
        ? `/api/admin/benefit-features/${editingItem.id}`
        : '/api/admin/benefit-features';
      const method = editingItem ? 'PUT' : 'POST';

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
        showToast('success', `${formData.type} ${editingItem ? 'updated' : 'created'} successfully`);
        setIsCreateOpen(false);
        fetchBenefitFeatures();
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
      const response = await fetch(`/api/admin/benefit-features/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', `${deleteConfirm.type} deactivated successfully`);
        setDeleteConfirm(null);
        fetchBenefitFeatures();
      } else {
        showToast('error', data.error?.message || 'Failed to delete');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const columns: Column<BenefitFeature>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (item) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          item.type === 'BENEFIT' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {item.type}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Code',
    },
    {
      key: 'name',
      header: 'Name',
    },
    {
      key: 'description',
      header: 'Description',
      render: (item) => item.description || '-',
    },
    {
      key: 'details',
      header: 'Details',
      render: (item) => {
        if (item.type === 'BENEFIT') {
          return (
            <div className="text-sm text-slate-600">
              Weight: {item.pointWeight ?? '-'} | Max: {item.maxScore ?? '-'}
            </div>
          );
        } else {
          return (
            <div className="text-sm text-slate-600">
              {item.category || '-'} | Order: {item.displayOrder ?? '-'}
            </div>
          );
        }
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item) => (
        <span className={`px-2 py-1 rounded text-xs ${
          item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(item)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm(item)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Benefits & Features Master</h1>
          <p className="text-slate-600 mt-1">Unified management for Benefits and Features</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={20} />
          Create New
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          options={[
            { value: '', label: 'All Types' },
            { value: 'BENEFIT', label: 'Benefits Only' },
            { value: 'FEATURE', label: 'Features Only' },
          ]}
        />
      </div>

      {/* Data Table */}
      <DataTable
        data={benefitFeatures}
        columns={columns}
        loading={loading}
        emptyMessage="No benefit-features found"
      />

      {/* Create/Edit Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingItem ? 'Edit' : 'Create'} {formData.type}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type *
                  </label>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    options={[
                      { value: 'BENEFIT', label: 'Benefit' },
                      { value: 'FEATURE', label: 'Feature' },
                    ]}
                    disabled={!!editingItem}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Code *
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder={formData.type === 'BENEFIT' ? 'B01' : 'F01'}
                    required
                    disabled={!!editingItem}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                />
              </div>

              {formData.type === 'BENEFIT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Point Weight
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.pointWeight}
                      onChange={(e) => setFormData({ ...formData, pointWeight: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Max Score
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              {formData.type === 'FEATURE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Category
                    </label>
                    <Select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      options={[
                        { value: 'DURABILITY', label: 'Durability' },
                        { value: 'COATING', label: 'Coating' },
                        { value: 'PROTECTION', label: 'Protection' },
                        { value: 'LIFESTYLE', label: 'Lifestyle' },
                        { value: 'VISION', label: 'Vision' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Display Order
                    </label>
                    <Input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirm Deactivation</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to deactivate {deleteConfirm.type} "{deleteConfirm.name}"?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
