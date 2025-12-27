'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Package, Plus, Edit2, Trash2, Eye, Copy, Check, X } from 'lucide-react';

interface ComboTier {
  id: string;
  comboCode: string;
  displayName: string;
  effectivePrice: number;
  badge?: string | null;
  isActive: boolean;
  comboVersion: number;
  sortOrder: number;
  benefits: Array<{
    id?: string;
    benefitType: string;
    label: string;
  }>;
}

export default function ComboTiersPageV2() {
  const router = useRouter();
  const { showToast } = useToast();
  const [tiers, setTiers] = useState<ComboTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<ComboTier | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      if (data.success && Array.isArray(data.data)) {
        // Sort by sortOrder
        const sorted = [...data.data].sort((a: ComboTier, b: ComboTier) =>
          (a.sortOrder || 0) - (b.sortOrder || 0)
        );
        setTiers(sorted);
      } else {
        console.error('Invalid API response:', data);
        setTiers([]);
      }
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

  const handleToggleActive = async (tier: ComboTier) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/combo-tiers/${tier.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !tier.isActive,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', `Tier ${!tier.isActive ? 'activated' : 'deactivated'}`);
        fetchTiers();
      } else {
        showToast('error', data.error?.message || 'Failed to update tier');
      }
    } catch (error) {
      console.error('Failed to toggle tier:', error);
      showToast('error', 'Failed to update tier');
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

  const handleDuplicate = async (tier: ComboTier) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/combo-tiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comboCode: `${tier.comboCode}_COPY`,
          displayName: `${tier.displayName} (Copy)`,
          effectivePrice: tier.effectivePrice,
          badge: tier.badge,
          isActive: false, // Duplicate as inactive
          sortOrder: tiers.length,
          benefits: tier.benefits.map(b => ({
            benefitType: b.benefitType,
            label: b.label,
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Tier duplicated successfully');
        fetchTiers();
      } else {
        showToast('error', data.error?.message || 'Failed to duplicate tier');
      }
    } catch (error) {
      console.error('Failed to duplicate tier:', error);
      showToast('error', 'Failed to duplicate tier');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-safe-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Combo Tiers</h1>
              <p className="text-slate-600 mt-1">Manage combo offer tiers - Simple & Functional</p>
            </div>
            <Button
              onClick={() => router.push('/admin/combo-tiers/new')}
              icon={<Plus size={16} />}
            >
              Create New Tier
            </Button>
          </div>
        </div>

        {/* Tiers Grid - Card View (like customer-facing) */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all ${
                tier.isActive
                  ? 'border-green-200 hover:border-green-300'
                  : 'border-slate-200 hover:border-slate-300 opacity-75'
              }`}
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    tier.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {tier.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-slate-500">v{tier.comboVersion}</span>
              </div>

              {/* Tier Info */}
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-slate-900 mb-1">{tier.displayName}</h3>
                {tier.badge && (
                  <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mb-2">
                    {tier.badge}
                  </span>
                )}
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  ₹{tier.effectivePrice.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">Effective Price</div>
              </div>

              {/* Benefits Count */}
              <div className="border-t border-slate-200 pt-4 mb-4">
                <div className="text-sm text-slate-600">
                  <strong>{tier.benefits.length}</strong> benefits included
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/admin/combo-tiers/${tier.id}`)}
                  className="flex-1"
                  icon={<Eye size={14} />}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/admin/combo-tiers/${tier.id}?edit=true`)}
                  className="flex-1"
                  icon={<Edit2 size={14} />}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleActive(tier)}
                  disabled={submitting}
                  className="flex-1"
                  icon={tier.isActive ? <X size={14} /> : <Check size={14} />}
                >
                  {tier.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDuplicate(tier)}
                  disabled={submitting}
                  icon={<Copy size={14} />}
                  title="Duplicate"
                >
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirm(tier)}
                  disabled={submitting}
                  icon={<Trash2 size={14} />}
                  className="text-red-600 hover:text-red-700"
                  title="Delete"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        {tiers.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No combo tiers found</h3>
            <p className="text-slate-600 mb-4">Create your first combo tier to get started</p>
            <Button onClick={() => router.push('/admin/combo-tiers/new')} icon={<Plus size={16} />}>
              Create Combo Tier
            </Button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Combo Tier</h3>
              <p className="text-slate-600 mb-4">
                Are you sure you want to delete <strong>{deleteConfirm.displayName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={submitting}
                  loading={submitting}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

