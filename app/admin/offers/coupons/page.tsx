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
import { Plus, Edit2, Trash2, Ticket } from 'lucide-react';
// Client-safe DiscountType enum
const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FLAT_AMOUNT: 'FLAT_AMOUNT',
  YOPO_LOGIC: 'YOPO_LOGIC',
  FREE_ITEM: 'FREE_ITEM',
  COMBO_PRICE: 'COMBO_PRICE',
} as const;

type DiscountType = typeof DiscountType[keyof typeof DiscountType];

interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number | null;
  minCartValue?: number | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
}

export default function CouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    description: '',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    maxDiscount: null,
    minCartValue: null,
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
            fetchCoupons(data.data.organizationId);
          }
        });
    }
  }, []);

  const fetchCoupons = async (orgId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login to access coupons');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to load coupons' } }));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setCoupons(data.data || []);
      } else {
        throw new Error(data.error?.message || 'Failed to load coupons');
      }
    } catch (error: any) {
      console.error('[fetchCoupons] Error:', error);
      showToast('error', error.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'PERCENTAGE' as DiscountType,
      discountValue: 10,
      maxDiscount: null,
      minCartValue: null,
      isActive: true,
    });
    setEditingCoupon(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setFormData(coupon);
    setEditingCoupon(coupon);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login to create coupons');
        setSubmitting(false);
        return;
      }

      // Prepare data - don't include organizationId, API will get it from authenticated user
      const payload: any = {
        code: formData.code,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        minCartValue: formData.minCartValue || null,
        maxDiscount: formData.maxDiscount || null,
        usageLimit: null, // Add if needed
        isActive: formData.isActive ?? true,
        validFrom: formData.startDate || new Date().toISOString(),
        validUntil: formData.endDate || null,
      };

      const url = editingCoupon
        ? `/api/admin/coupons/${editingCoupon.id}`
        : '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to save coupon' } }));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        showToast('success', editingCoupon ? 'Coupon updated' : 'Coupon created');
        setIsCreateOpen(false);
        setEditingCoupon(null);
        if (organizationId) {
          fetchCoupons(organizationId);
        }
      } else {
        throw new Error(data.error?.message || 'Failed to save coupon');
      }
    } catch (error: any) {
      console.error('[handleSubmit] Error:', error);
      showToast('error', error.message || 'An error occurred while saving coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (coupon) => <Badge variant="info">{coupon.code}</Badge>,
    },
    { key: 'description', header: 'Description' },
    {
      key: 'discountType',
      header: 'Discount',
      render: (coupon) => {
        if (coupon.discountType === 'PERCENTAGE') {
          return `${coupon.discountValue}%${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ''}`;
        }
        return `₹${coupon.discountValue}`;
      },
    },
    {
      key: 'minCartValue',
      header: 'Min Cart',
      render: (coupon) => coupon.minCartValue ? `₹${coupon.minCartValue}` : 'No minimum',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (coupon) => (
        <Badge variant={coupon.isActive ? 'success' : 'secondary'}>
          {coupon.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (coupon) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)}>
            <Edit2 size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(coupon)}>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Coupons</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage coupon codes</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus size={20} className="mr-2" />
          Create Coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          icon={<Ticket size={48} />}
          title="No coupons"
          description="Create your first coupon code"
          action={{
            label: 'Create Coupon',
            onClick: handleCreate,
          }}
        />
      ) : (
        <DataTable data={coupons} columns={columns} />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCoupon(null);
        }}
        title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Coupon Code"
            value={formData.code || ''}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            placeholder="WELCOME10"
          />

          <Input
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
          />

          <Select
            label="Discount Type"
            value={formData.discountType || ''}
            onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
            options={[
              { value: 'PERCENTAGE', label: 'Percentage' },
              { value: 'FLAT_AMOUNT', label: 'Flat Amount' },
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={formData.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount Amount (₹)'}
              type="number"
              value={formData.discountValue || 0}
              onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
              required
            />
            {formData.discountType === 'PERCENTAGE' && (
              <Input
                label="Max Discount (₹)"
                type="number"
                value={formData.maxDiscount || ''}
                onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="Optional"
              />
            )}
          </div>

          <Input
            label="Minimum Cart Value (₹)"
            type="number"
            value={formData.minCartValue || ''}
            onChange={(e) => setFormData({ ...formData, minCartValue: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="Optional - leave empty for no minimum"
          />

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
              {submitting ? 'Saving...' : editingCoupon ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Coupon"
      >
        <p className="mb-4">Are you sure you want to delete "{deleteConfirm?.code}"?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={async () => {
              if (!deleteConfirm) return;
              
              try {
                const token = localStorage.getItem('lenstrack_token');
                if (!token) {
                  showToast('error', 'Please login to delete coupons');
                  setDeleteConfirm(null);
                  return;
                }

                const response = await fetch(`/api/admin/coupons/${deleteConfirm.id}`, {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });

                const data = await response.json();
                if (data.success) {
                  showToast('success', 'Coupon deleted successfully');
                  setDeleteConfirm(null);
                  if (organizationId) {
                    fetchCoupons(organizationId);
                  }
                } else {
                  showToast('error', data.error?.message || 'Failed to delete coupon');
                }
              } catch (error: any) {
                console.error('[handleDelete] Error:', error);
                showToast('error', error.message || 'An error occurred while deleting coupon');
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

