'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';

type ProductType = 'FRAME' | 'SUNGLASS' | 'CONTACT_LENS' | 'ACCESSORY';

interface SubBrand {
  id: string;
  name: string;
  isActive: boolean;
}

interface Brand {
  id: string;
  name: string;
  isActive: boolean;
  productTypes: ProductType[];
  subBrands: SubBrand[];
}

export default function BrandsPage() {
  const { showToast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isSubBrandModalOpen, setIsSubBrandModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingSubBrandId, setEditingSubBrandId] = useState<string | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const [brandFormData, setBrandFormData] = useState({
    name: '',
    productTypes: [] as ProductType[],
  });

  const [subBrandFormData, setSubBrandFormData] = useState({
    name: '',
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

      const response = await fetch('/api/admin/brands', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showToast('error', errorData.error?.message || 'Failed to load brands');
        if (response.status === 401) window.location.href = '/login';
        return;
      }

      const data = await response.json();
      if (data.success) {
        setBrands(data.data || []);
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrand = () => {
    setBrandFormData({ name: '', productTypes: [] });
    setEditingBrandId(null);
    setIsBrandModalOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setBrandFormData({ name: brand.name, productTypes: brand.productTypes });
    setEditingBrandId(brand.id);
    setIsBrandModalOpen(true);
  };

  const handleSubmitBrand = async () => {
    if (!brandFormData.name.trim()) {
      showToast('error', 'Brand name is required');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingBrandId
        ? `/api/admin/brands/${editingBrandId}`
        : '/api/admin/brands';
      const method = editingBrandId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(brandFormData),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', editingBrandId ? 'Brand updated' : 'Brand created');
        setIsBrandModalOpen(false);
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to save brand');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save brand');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/brands/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Brand deleted');
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to delete brand');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to delete brand');
    }
  };

  const handleAddSubBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setSubBrandFormData({ name: '' });
    setEditingSubBrandId(null);
    setIsSubBrandModalOpen(true);
  };

  const handleEditSubBrand = (brand: Brand, subBrand: SubBrand) => {
    setSelectedBrand(brand);
    setSubBrandFormData({ name: subBrand.name });
    setEditingSubBrandId(subBrand.id);
    setIsSubBrandModalOpen(true);
  };

  const handleSubmitSubBrand = async () => {
    if (!subBrandFormData.name.trim() || !selectedBrand) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingSubBrandId
        ? `/api/admin/brands/${selectedBrand.id}/subbrands/${editingSubBrandId}`
        : `/api/admin/brands/${selectedBrand.id}/subbrands`;
      const method = editingSubBrandId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subBrandFormData),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', editingSubBrandId ? 'Sub-brand updated' : 'Sub-brand created');
        setIsSubBrandModalOpen(false);
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to save sub-brand');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save sub-brand');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubBrand = async (brandId: string, subBrandId: string) => {
    if (!confirm('Are you sure you want to delete this sub-brand?')) return;

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/brands/${brandId}/subbrands/${subBrandId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Sub-brand deleted');
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to delete sub-brand');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to delete sub-brand');
    }
  };

  const toggleBrand = (brandId: string) => {
    const newExpanded = new Set(expandedBrands);
    if (newExpanded.has(brandId)) {
      newExpanded.delete(brandId);
    } else {
      newExpanded.add(brandId);
    }
    setExpandedBrands(newExpanded);
  };

  const toggleProductType = (type: ProductType) => {
    setBrandFormData((prev) => {
      const types = prev.productTypes.includes(type)
        ? prev.productTypes.filter((t) => t !== type)
        : [...prev.productTypes, type];
      return { ...prev, productTypes: types };
    });
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Brands & Sub-Brands</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage product brands and their sub-brands</p>
        </div>
        <Button onClick={handleCreateBrand} className="w-full sm:w-auto">
          <Plus size={20} className="mr-2" />
          Add Brand
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <Input
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredBrands.length === 0 ? (
          <EmptyState
            title="No brands found"
            description="Create your first brand to get started"
            action={{
              label: 'Add Brand',
              onClick: handleCreateBrand,
            }}
          />
        ) : (
          <div className="space-y-2">
            {filteredBrands.map((brand) => (
              <div key={brand.id} className="border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleBrand(brand.id)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {expandedBrands.has(brand.id) ? (
                        <ChevronDown size={20} />
                      ) : (
                        <ChevronRight size={20} />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{brand.name}</span>
                        <span className="text-xs text-slate-500">
                          ({brand.productTypes.join(', ') || 'No types'})
                        </span>
                        {!brand.isActive && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inactive</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {brand.subBrands.length} sub-brand{brand.subBrands.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSubBrand(brand)}
                    >
                      <Plus size={16} className="mr-1" />
                      Sub-Brand
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBrand(brand)}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBrand(brand.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                {expandedBrands.has(brand.id) && brand.subBrands.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50">
                    {brand.subBrands.map((subBrand) => (
                      <div
                        key={subBrand.id}
                        className="flex items-center justify-between p-3 pl-12 hover:bg-slate-100"
                      >
                        <span className="text-slate-700">{subBrand.name}</span>
                        <div className="flex items-center gap-2">
                          {!subBrand.isActive && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inactive</span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSubBrand(brand, subBrand)}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSubBrand(brand.id, subBrand.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Modal */}
      <Modal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title={editingBrandId ? 'Edit Brand' : 'Create Brand'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Brand Name *
            </label>
            <Input
              value={brandFormData.name}
              onChange={(e) => setBrandFormData({ ...brandFormData, name: e.target.value })}
              placeholder="e.g., RayBan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Types *
            </label>
            <div className="space-y-2">
              {(['FRAME', 'SUNGLASS', 'CONTACT_LENS', 'ACCESSORY'] as ProductType[]).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={brandFormData.productTypes.includes(type)}
                    onChange={() => toggleProductType(type)}
                  />
                  <span className="text-sm text-slate-700">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsBrandModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitBrand} disabled={submitting}>
              {submitting ? 'Saving...' : editingBrandId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sub-Brand Modal */}
      <Modal
        isOpen={isSubBrandModalOpen}
        onClose={() => setIsSubBrandModalOpen(false)}
        title={editingSubBrandId ? 'Edit Sub-Brand' : 'Create Sub-Brand'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sub-Brand Name *
            </label>
            <Input
              value={subBrandFormData.name}
              onChange={(e) => setSubBrandFormData({ ...subBrandFormData, name: e.target.value })}
              placeholder="e.g., Essential"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsSubBrandModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitSubBrand} disabled={submitting}>
              {submitting ? 'Saving...' : editingSubBrandId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

