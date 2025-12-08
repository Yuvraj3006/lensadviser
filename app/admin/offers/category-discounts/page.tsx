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
import { Plus, Edit2, Trash2, Percent } from 'lucide-react';
// Client-safe CustomerCategory enum
const CustomerCategory = {
  STUDENT: 'STUDENT',
  DOCTOR: 'DOCTOR',
  TEACHER: 'TEACHER',
  ARMED_FORCES: 'ARMED_FORCES',
  SENIOR_CITIZEN: 'SENIOR_CITIZEN',
  CORPORATE: 'CORPORATE',
  REGULAR: 'REGULAR',
} as const;

type CustomerCategory = typeof CustomerCategory[keyof typeof CustomerCategory];

interface CategoryDiscount {
  id: string;
  customerCategory: CustomerCategory;
  brandCode: string;
  discountPercent: number;
  maxDiscount?: number | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

export default function CategoryDiscountsPage() {
  const { showToast } = useToast();
  const [discounts, setDiscounts] = useState<CategoryDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<CategoryDiscount | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CategoryDiscount | null>(null);
  const [formData, setFormData] = useState<Partial<CategoryDiscount>>({
    customerCategory: 'STUDENT' as CustomerCategory,
    brandCode: '*',
    discountPercent: 10,
    maxDiscount: null,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [organizationId, setOrganizationId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('lenstrack_token');
    if (token) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.organizationId) {
            setOrganizationId(data.data.organizationId);
            fetchDiscounts(data.data.organizationId);
          }
        });
    }
  }, []);

  const fetchDiscounts = async (orgId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/offers/category-discounts?organizationId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setDiscounts(data.data);
      }
    } catch (error) {
      showToast('error', 'Failed to load category discounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      customerCategory: CustomerCategory.STUDENT,
      brandCode: '*',
      discountPercent: 10,
      maxDiscount: null,
      isActive: true,
    });
    setEditingDiscount(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (discount: CategoryDiscount) => {
    setFormData(discount);
    setEditingDiscount(discount);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/offers/category-discounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          organizationId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', editingDiscount ? 'Category discount updated' : 'Category discount created');
        setIsCreateOpen(false);
        fetchDiscounts(organizationId);
      } else {
        showToast('error', data.error?.message || 'Failed to save');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<CategoryDiscount>[] = [
    {
      key: 'customerCategory',
      header: 'Category',
      render: (discount) => <Badge variant="info">{discount.customerCategory}</Badge>,
    },
    { key: 'brandCode', header: 'Brand', render: (d) => d.brandCode === '*' ? 'All Brands' : d.brandCode },
    {
      key: 'discountPercent',
      header: 'Discount',
      render: (discount) => `${discount.discountPercent}%`,
    },
    {
      key: 'maxDiscount',
      header: 'Max Discount',
      render: (discount) => discount.maxDiscount ? `₹${discount.maxDiscount}` : 'No limit',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (discount) => (
        <Badge variant={discount.isActive ? 'success' : 'secondary'}>
          {discount.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (discount) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(discount)}>
            <Edit2 size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(discount)}>
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
          <h1 className="text-3xl font-bold text-slate-900">Category Discounts</h1>
          <p className="text-slate-600 mt-1">Manage customer category discounts</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={20} className="mr-2" />
          Create Discount
        </Button>
      </div>

      {discounts.length === 0 ? (
        <EmptyState
          icon={<Percent size={48} />}
          title="No category discounts"
          description="Create your first category discount"
          action={{
            label: 'Create Discount',
            onClick: handleCreate,
          }}
        />
      ) : (
        <DataTable data={discounts} columns={columns} />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingDiscount ? 'Edit Category Discount' : 'Create Category Discount'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Customer Category"
            value={formData.customerCategory || ''}
            onChange={(e) => setFormData({ ...formData, customerCategory: e.target.value as CustomerCategory })}
            options={[
              { value: 'STUDENT', label: 'STUDENT' },
              { value: 'DOCTOR', label: 'DOCTOR' },
              { value: 'TEACHER', label: 'TEACHER' },
              { value: 'ARMED_FORCES', label: 'ARMED_FORCES' },
              { value: 'SENIOR_CITIZEN', label: 'SENIOR_CITIZEN' },
              { value: 'CORPORATE', label: 'CORPORATE' },
              { value: 'REGULAR', label: 'REGULAR' },
            ]}
            required
          />

          <Input
            label="Brand Code"
            value={formData.brandCode || ''}
            onChange={(e) => setFormData({ ...formData, brandCode: e.target.value })}
            placeholder="* for all brands"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Discount %"
              type="number"
              min="0"
              max="100"
              value={formData.discountPercent || 0}
              onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) })}
              required
            />
            <Input
              label="Max Discount (₹)"
              type="number"
              value={formData.maxDiscount || ''}
              onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="Optional"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive ?? true}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <span>Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingDiscount ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Category Discount"
      >
        <p className="mb-4">Are you sure you want to delete this discount?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => {
            // Implement delete API call
            setDeleteConfirm(null);
            showToast('info', 'Delete functionality to be implemented');
          }}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

