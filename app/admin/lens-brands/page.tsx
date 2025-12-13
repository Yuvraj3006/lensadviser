'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Search, Edit2, Trash2, Glasses } from 'lucide-react';

interface LensBrand {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
}

export default function LensBrandsPage() {
  const { showToast } = useToast();
  const [brands, setBrands] = useState<LensBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login to continue');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/lens-brands', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showToast('error', errorData.error?.message || 'Failed to load lens brands');
        if (response.status === 401) window.location.href = '/login';
        return;
      }

      const data = await response.json();
      if (data.success) {
        setBrands(data.data || []);
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load lens brands');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (brand: LensBrand) => {
    setFormData({ name: brand.name, description: brand.description || '' });
    setEditingId(brand.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showToast('error', 'Brand name is required');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingId
        ? `/api/admin/lens-brands/${editingId}`
        : '/api/admin/lens-brands';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', editingId ? 'Lens brand updated' : 'Lens brand created');
        setIsModalOpen(false);
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to save lens brand');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save lens brand');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lens brand?')) return;

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lens-brands/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Lens brand deleted');
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to delete lens brand');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to delete lens brand');
    }
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<LensBrand>[] = [
    {
      key: 'name',
      header: 'Brand Name',
      render: (brand) => (
        <div>
          <div className="font-medium text-slate-900">{brand.name}</div>
          {brand.description && (
            <div className="text-sm text-slate-500 mt-1">{brand.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'productCount',
      header: 'Products',
      render: (brand) => (
        <span className="text-slate-600">{brand.productCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (brand) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            brand.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {brand.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (brand) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(brand)}
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(brand.id)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Lens Brands</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage lens brand lines (e.g., DIGI360, DriveXpert)</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus size={20} className="mr-2" />
          Add Lens Brand
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <Input
              placeholder="Search lens brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredBrands.length === 0 ? (
          <EmptyState
            title="No lens brands found"
            description="Create your first lens brand to get started"
            action={{
              label: 'Add Lens Brand',
              onClick: handleCreate,
            }}
          />
        ) : (
          <DataTable data={filteredBrands} columns={columns} />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Lens Brand' : 'Create Lens Brand'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Brand Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., DIGI360"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

