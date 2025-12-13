'use client';

/**
 * Admin Band Pricing Management Page
 * Manage power-based band pricing for lenses
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';

interface BandPricing {
  id: string;
  minPower: number;
  maxPower: number;
  extraCharge: number;
  isActive: boolean;
}

export default function BandPricingPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const lensId = params.id as string;

  const [bandPricing, setBandPricing] = useState<BandPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<BandPricing | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BandPricing | null>(null);
  const [formData, setFormData] = useState({
    minPower: '',
    maxPower: '',
    extraCharge: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lensId) {
      fetchBandPricing();
    }
  }, [lensId]);

  const fetchBandPricing = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lenses/${lensId}/band-pricing`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setBandPricing(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load band pricing');
      showToast('error', 'Failed to load band pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      minPower: '',
      maxPower: '',
      extraCharge: '',
    });
    setEditingBand(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (band: BandPricing) => {
    setFormData({
      minPower: band.minPower.toString(),
      maxPower: band.maxPower.toString(),
      extraCharge: band.extraCharge.toString(),
    });
    setEditingBand(band);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingBand
        ? `/api/admin/lenses/${lensId}/band-pricing/${editingBand.id}`
        : `/api/admin/lenses/${lensId}/band-pricing`;

      const response = await fetch(url, {
        method: editingBand ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          minPower: parseFloat(formData.minPower),
          maxPower: parseFloat(formData.maxPower),
          extraCharge: parseFloat(formData.extraCharge),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', editingBand ? 'Band pricing updated' : 'Band pricing created');
        setIsCreateOpen(false);
        fetchBandPricing();
      } else {
        showToast('error', data.error?.message || 'Failed to save band pricing');
      }
    } catch (error) {
      showToast('error', 'Failed to save band pricing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (band: BandPricing) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lenses/${lensId}/band-pricing/${band.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Band pricing deleted');
        setDeleteConfirm(null);
        fetchBandPricing();
      } else {
        showToast('error', data.error?.message || 'Failed to delete band pricing');
      }
    } catch (error) {
      showToast('error', 'Failed to delete band pricing');
    }
  };

  const columns: Column<BandPricing>[] = [
    { key: 'minPower', header: 'Min Power (D)', render: (band) => `${band.minPower}D` },
    { key: 'maxPower', header: 'Max Power (D)', render: (band) => `${band.maxPower}D` },
    {
      key: 'extraCharge',
      header: 'Extra Charge',
      render: (band) => `₹${band.extraCharge.toLocaleString()}`,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (band) => (
        <span className={band.isActive ? 'text-green-600' : 'text-red-600'}>
          {band.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="outline" icon={<ArrowLeft size={18} />} onClick={() => router.back()} className="w-full sm:w-auto">
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Band Pricing</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Manage power-based extra charges for this lens</p>
          </div>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleCreate} className="w-full sm:w-auto">
          Add Band Pricing
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <DataTable
          columns={columns}
          data={bandPricing}
          loading={loading}
          rowActions={(band) => (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon={<Edit2 size={14} />}
                onClick={() => handleEdit(band)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 size={14} />}
                onClick={() => setDeleteConfirm(band)}
              >
                Delete
              </Button>
            </div>
          )}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingBand ? 'Edit Band Pricing' : 'Add Band Pricing'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Min Power (D) *
            </label>
            <Input
              type="number"
              step="0.25"
              value={formData.minPower}
              onChange={(e) => setFormData({ ...formData, minPower: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Max Power (D) *
            </label>
            <Input
              type="number"
              step="0.25"
              value={formData.maxPower}
              onChange={(e) => setFormData({ ...formData, maxPower: e.target.value })}
              required
              placeholder="10.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Extra Charge (₹) *
            </label>
            <Input
              type="number"
              step="100"
              value={formData.extraCharge}
              onChange={(e) => setFormData({ ...formData, extraCharge: e.target.value })}
              required
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {editingBand ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Band Pricing"
      >
        <p className="text-slate-700 mb-4">
          Are you sure you want to delete band pricing for {deleteConfirm?.minPower}D -{' '}
          {deleteConfirm?.maxPower}D?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
