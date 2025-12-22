'use client';

/**
 * Admin Benefits Page
 * Manage Benefits master (B01-B12)
 */

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Edit2, Trash2, TrendingUp } from 'lucide-react';

interface Benefit {
  id: string;
  code: string; // B01-B12
  name: string;
  description?: string | null;
  pointWeight: number;
  maxScore: number;
  isActive: boolean;
  questionMappingCount: number;
  productMappingCount: number;
}

interface BenefitFormData {
  code: string;
  name: string;
  description: string;
  pointWeight: number;
  maxScore: number;
}

export default function BenefitsPage() {
  const { showToast } = useToast();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Benefit | null>(null);
  const [formData, setFormData] = useState<BenefitFormData>({
    code: '',
    name: '',
    description: '',
    pointWeight: 1.0,
    maxScore: 3.0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBenefits();
  }, []);

  const fetchBenefits = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/benefits', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Sort by code (B01, B02, ...)
        const sorted = data.data.sort((a: Benefit, b: Benefit) => 
          a.code.localeCompare(b.code)
        );
        setBenefits(sorted);
      }
    } catch (error) {
      console.error('Failed to load benefits');
      showToast('error', 'Failed to load benefits');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      pointWeight: 1.0,
      maxScore: 3.0,
    });
    setEditingBenefit(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (benefit: Benefit) => {
    setFormData({
      code: benefit.code,
      name: benefit.name,
      description: benefit.description || '',
      pointWeight: benefit.pointWeight,
      maxScore: benefit.maxScore,
    });
    setEditingBenefit(benefit);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingBenefit
        ? `/api/admin/benefits/${editingBenefit.id}`
        : '/api/admin/benefits';
      const method = editingBenefit ? 'PUT' : 'POST';

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
        showToast('success', `Benefit ${editingBenefit ? 'updated' : 'created'} successfully`);
        setIsCreateOpen(false);
        fetchBenefits();
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
      const response = await fetch(`/api/admin/benefits/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Benefit deactivated successfully');
        setDeleteConfirm(null);
        fetchBenefits();
      } else {
        showToast('error', data.error?.message || 'Failed to delete benefit');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const isCoreBenefit = (code: string): boolean => {
    return /^B\d{2}$/.test(code) && parseInt(code.substring(1)) <= 12;
  };

  const columns: Column<Benefit>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (benefit) => (
        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{benefit.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Benefit Name',
      render: (benefit) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-200">{benefit.name}</p>
          {benefit.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{benefit.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'maxScore',
      header: 'Max Score',
      render: (benefit) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{benefit.maxScore}</span>
      ),
    },
    {
      key: 'questionMappingCount',
      header: 'Question Mappings',
      render: (benefit) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{benefit.questionMappingCount}</span>
      ),
    },
    {
      key: 'productMappingCount',
      header: 'Product Mappings',
      render: (benefit) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{benefit.productMappingCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (benefit) => (
        <Badge color={benefit.isActive ? 'green' : 'red'}>
          {benefit.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Benefits</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">Manage benefits used in questionnaire and lens scoring</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleCreate} className="w-full sm:w-auto">
          Add Benefit
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {benefits.length === 0 && !loading ? (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title="No benefits found"
            description="Create benefits to map questionnaire answers to lens recommendations"
            action={{
              label: 'Add Benefit',
              onClick: handleCreate,
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={benefits}
            loading={loading}
            rowActions={(benefit) => (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Edit2 size={14} />}
                  onClick={() => handleEdit(benefit)}
                >
                  Edit
                </Button>
                {!isCoreBenefit(benefit.code) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 size={14} />}
                    onClick={() => setDeleteConfirm(benefit)}
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
        title={editingBenefit ? 'Edit Benefit' : 'Create Benefit'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingBenefit ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Benefit Code"
            placeholder="B13"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            disabled={editingBenefit !== null}
            hint={editingBenefit 
              ? "Benefit code cannot be changed after creation" 
              : "Must be B followed by 2+ digits (e.g., B01, B13)"}
          />

          <Input
            label="Benefit Name"
            placeholder="Benefit Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Description"
            placeholder="Benefit description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Point Weight"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={formData.pointWeight}
              onChange={(e) => setFormData({ ...formData, pointWeight: parseFloat(e.target.value) || 1.0 })}
              hint="Global importance weight"
            />

            <Input
              label="Max Score"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={formData.maxScore}
              onChange={(e) => setFormData({ ...formData, maxScore: parseFloat(e.target.value) || 3.0 })}
              hint="Maximum score (usually 3)"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Deactivate Benefit"
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
          Are you sure you want to deactivate <strong className="text-slate-900 dark:text-white">{deleteConfirm?.name}</strong> ({deleteConfirm?.code})?
          This will not affect existing mappings.
        </p>
      </Modal>
    </div>
  );
}
