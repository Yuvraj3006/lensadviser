'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Package, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface ComboBenefit {
  id?: string;
  benefitType: 'frame' | 'lens' | 'eyewear' | 'addon' | 'voucher';
  label: string;
  maxValue?: number;
  constraints?: string;
}

interface ComboTier {
  id: string;
  comboCode: string;
  displayName: string;
  effectivePrice: number;
  badge?: string | null;
  isActive: boolean;
  benefits: ComboBenefit[];
}

interface ComboTierFormData {
  comboCode: string;
  displayName: string;
  effectivePrice: number;
  badge?: string;
  isActive: boolean;
  benefits: ComboBenefit[];
}

export default function ComboTiersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [tiers, setTiers] = useState<ComboTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<ComboTier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ComboTier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ComboTierFormData>({
    comboCode: '',
    displayName: '',
    effectivePrice: 0,
    badge: '',
    isActive: true,
    benefits: [],
  });

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/combo-tiers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTiers(data.data);
      } else {
        showToast('error', 'Failed to load combo tiers');
      }
    } catch (error) {
      console.error('Failed to fetch tiers:', error);
      showToast('error', 'Failed to load combo tiers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      comboCode: '',
      displayName: '',
      effectivePrice: 0,
      badge: '',
      isActive: true,
      benefits: [],
    });
    setEditingTier(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (tier: ComboTier) => {
    setFormData({
      comboCode: tier.comboCode,
      displayName: tier.displayName,
      effectivePrice: tier.effectivePrice,
      badge: tier.badge || '',
      isActive: tier.isActive,
      benefits: tier.benefits.map(b => ({
        id: b.id,
        benefitType: b.benefitType,
        label: b.label,
        maxValue: b.maxValue,
        constraints: b.constraints,
      })),
    });
    setEditingTier(tier);
    setIsCreateOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.comboCode || !formData.displayName || formData.effectivePrice <= 0) {
      showToast('error', 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingTier
        ? `/api/admin/combo-tiers/${editingTier.id}`
        : '/api/admin/combo-tiers';
      const method = editingTier ? 'PUT' : 'POST';

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
        showToast('success', editingTier ? 'Combo tier updated' : 'Combo tier created');
        setIsCreateOpen(false);
        fetchTiers();
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

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/combo-tiers/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Combo tier deleted');
        setDeleteConfirm(null);
        fetchTiers();
      } else {
        showToast('error', data.error?.message || 'Failed to delete combo tier');
      }
    } catch (error) {
      console.error('Failed to delete tier:', error);
      showToast('error', 'Failed to delete combo tier');
    } finally {
      setSubmitting(false);
    }
  };

  const addBenefit = () => {
    setFormData({
      ...formData,
      benefits: [
        ...formData.benefits,
        {
          benefitType: 'frame',
          label: '',
        },
      ],
    });
  };

  const updateBenefit = (index: number, field: keyof ComboBenefit, value: any) => {
    const updated = [...formData.benefits];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, benefits: updated });
  };

  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  const columns: Column<ComboTier>[] = [
    {
      key: 'comboCode',
      header: 'Code',
      render: (tier: ComboTier) => (
        <span className="font-mono font-semibold text-purple-600">{tier.comboCode}</span>
      ),
    },
    {
      key: 'displayName',
      header: 'Display Name',
      render: (tier: ComboTier) => (
        <div>
          <div className="font-medium">{tier.displayName}</div>
          {tier.badge && (
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              {tier.badge}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'effectivePrice',
      header: 'Price',
      render: (tier: ComboTier) => (
        <span className="font-semibold">₹{tier.effectivePrice.toLocaleString()}</span>
      ),
    },
    {
      key: 'benefits',
      header: 'Benefits',
      render: (tier: ComboTier) => (
        <span className="text-sm text-slate-600">{tier.benefits.length} items</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (tier: ComboTier) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            tier.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {tier.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Combo Tiers</h1>
          <p className="text-slate-600 mt-1">Manage combo offer tiers (Bronze, Silver, Gold, Platinum)</p>
        </div>
        <Button onClick={handleCreate} icon={<Plus size={16} />}>
          Create Combo Tier
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {tiers.length === 0 && !loading ? (
          <EmptyState
            icon={<Package size={48} />}
            title="No combo tiers found"
            description="Create combo tiers to offer bundled solutions to customers"
            action={{
              label: 'Create Combo Tier',
              onClick: handleCreate,
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={tiers}
            loading={loading}
            rowActions={(tier) => (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Edit2 size={14} />}
                  onClick={() => router.push(`/admin/combo-tiers/${tier.id}`)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Edit2 size={14} />}
                  onClick={() => handleEdit(tier)}
                >
                  Quick Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={14} />}
                  onClick={() => setDeleteConfirm(tier)}
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
        title={editingTier ? 'Edit Combo Tier' : 'Create Combo Tier'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Combo Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.comboCode}
                onChange={(e) => setFormData({ ...formData, comboCode: e.target.value.toUpperCase() })}
                placeholder="BRONZE, SILVER, GOLD, etc."
                disabled={!!editingTier}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Effective Price (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.effectivePrice}
                onChange={(e) => setFormData({ ...formData, effectivePrice: parseFloat(e.target.value) || 0 })}
                placeholder="2999"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Badge
              </label>
              <Select
                value={formData.badge || ''}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value || undefined })}
                options={[
                  { value: '', label: 'None' },
                  { value: 'MOST_POPULAR', label: 'Most Popular' },
                  { value: 'BEST_VALUE', label: 'Best Value' },
                  { value: 'RECOMMENDED', label: 'Recommended' },
                ]}
              />
            </div>
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

          {/* Benefits Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Benefits <span className="text-red-500">*</span>
              </label>
              <Button size="sm" variant="outline" onClick={addBenefit} icon={<Plus size={14} />}>
                Add Benefit
              </Button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {formData.benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Select
                      value={benefit.benefitType}
                      onChange={(e) => updateBenefit(index, 'benefitType', e.target.value)}
                      options={[
                        { value: 'frame', label: 'Frame' },
                        { value: 'lens', label: 'Lens' },
                        { value: 'eyewear', label: 'Eyewear' },
                        { value: 'addon', label: 'Add-on' },
                        { value: 'voucher', label: 'Voucher' },
                      ]}
                    />
                    <Input
                      value={benefit.label}
                      onChange={(e) => updateBenefit(index, 'label', e.target.value)}
                      placeholder="e.g., Frame 1, Lens 1, etc."
                    />
                    {benefit.benefitType === 'voucher' && (
                      <Input
                        type="number"
                        value={benefit.maxValue || ''}
                        onChange={(e) => updateBenefit(index, 'maxValue', parseFloat(e.target.value) || undefined)}
                        placeholder="Max Value (₹)"
                        min="0"
                      />
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<X size={14} />}
                    onClick={() => removeBenefit(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {formData.benefits.length === 0 && (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No benefits added. Click "Add Benefit" to add items.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting} icon={<Check size={16} />}>
              {editingTier ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Combo Tier"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to delete <strong>{deleteConfirm?.displayName}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={submitting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

