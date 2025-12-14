'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Search, Edit2, Trash2, Glasses, Filter, Eye } from 'lucide-react';
import { Select } from '@/components/ui/Select';

type LensType = 'SINGLE_VISION' | 'PROGRESSIVE' | 'BIFOCAL' | 'SPECIALITY';
type LensIndex = 'INDEX_150' | 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174' | 'INDEX_PC';

interface LensBrand {
  id: string;
  name: string;
}

interface Feature {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface Benefit {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface LensProduct {
  id: string;
  itCode: string;
  name: string;
  lensBrand?: LensBrand | null;
  brandLine?: string; // For backward compatibility
  type: LensType;
  index: LensIndex;
  category?: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'ULTRA';
  deliveryDays?: number;
  mrp: number;
  baseOfferPrice: number;
  addOnPrice: number | null;
  sphMin: number;
  sphMax: number;
  cylMax: number;
  addMin: number | null;
  addMax: number | null;
  yopoEligible: boolean;
  comboAllowed: boolean;
  isActive: boolean;
}

export default function LensProductsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState<LensProduct[]>([]);
  const [brands, setBrands] = useState<LensBrand[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBrandId, setFilterBrandId] = useState<string>('');
  const [filterType, setFilterType] = useState<LensType | ''>('');
  const [filterIndex, setFilterIndex] = useState<LensIndex | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    itCode: '',
    name: '',
    lensBrandId: '',
    type: 'SINGLE_VISION' as LensType,
    index: 'INDEX_156' as LensIndex,
    tintOption: 'CLEAR' as 'CLEAR' | 'TINT' | 'PHOTOCHROMIC' | 'TRANSITION',
    category: 'STANDARD' as 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'ULTRA',
    deliveryDays: 4,
    mrp: 0,
    baseOfferPrice: 0,
    addOnPrice: 0,
    rxRanges: [
      {
        sphMin: -10,
        sphMax: 10,
        cylMin: -4,
        cylMax: 4,
        addMin: null as number | null,
        addMax: null as number | null,
        addOnPrice: 0,
      },
    ] as Array<{
      sphMin: number;
      sphMax: number;
      cylMin: number;
      cylMax: number;
      addMin: number | null;
      addMax: number | null;
      addOnPrice: number;
    }>,
    yopoEligible: false,
    comboAllowed: false,
    featureCodes: [] as string[],
    benefitScores: {} as Record<string, number>, // Benefit code -> score (0-3)
  });

  useEffect(() => {
    fetchBrands();
    fetchFeatures();
    fetchBenefits();
    fetchProducts();
  }, [filterBrandId, filterType, filterIndex]);

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/lens-brands', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBrands(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load lens brands');
    }
  };

  const fetchFeatures = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/features?isActive=true', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load features');
    }
  };

  const fetchBenefits = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/benefits', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBenefits(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load benefits');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      if (filterBrandId) params.append('brandId', filterBrandId);
      if (filterType) params.append('type', filterType);
      if (filterIndex) params.append('index', filterIndex);

      const response = await fetch(`/api/admin/lens-products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showToast('error', errorData.error?.message || 'Failed to load lens products');
        if (response.status === 401) window.location.href = '/login';
        return;
      }

      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load lens products');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      itCode: '',
      name: '',
      lensBrandId: '',
      type: 'SINGLE_VISION',
      index: 'INDEX_156',
      tintOption: 'CLEAR',
      category: 'STANDARD',
      deliveryDays: 4,
      mrp: 0,
      baseOfferPrice: 0,
      addOnPrice: 0,
      rxRanges: [
        {
          sphMin: -10,
          sphMax: 10,
          cylMin: -4,
          cylMax: 4,
          addMin: null,
          addMax: null,
          addOnPrice: 0,
        },
      ],
      yopoEligible: false,
      comboAllowed: false,
      featureCodes: [],
      benefitScores: {},
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (product: LensProduct) => {
    // Load benefit scores for this product
    let benefitScores: Record<string, number> = {};
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lens-products/${product.id}/benefits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Convert array to object: { B01: 3, B02: 2, ... }
          data.data.forEach((item: any) => {
            benefitScores[item.benefitCode] = item.score || 0;
          });
        }
      }
    } catch (error) {
      console.error('Failed to load benefit scores');
    }

    // Fetch all RX ranges for this product
    let rxRanges: Array<{
      sphMin: number;
      sphMax: number;
      cylMin: number;
      cylMax: number;
      addMin: number | null;
      addMax: number | null;
      addOnPrice: number;
    }> = [];
    
    try {
      const token = localStorage.getItem('lenstrack_token');
      const rxResponse = await fetch(`/api/admin/lens-products/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rxResponse.ok) {
        const rxData = await rxResponse.json();
        if (rxData.success && rxData.data?.rxRanges) {
          rxRanges = rxData.data.rxRanges.map((r: any) => ({
            sphMin: r.sphMin,
            sphMax: r.sphMax,
            cylMin: r.cylMin,
            cylMax: r.cylMax,
            addMin: r.addMin ?? null,
            addMax: r.addMax ?? null,
            addOnPrice: r.addOnPrice || 0,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load RX ranges');
      // Fallback to single range from product data
      rxRanges = [{
        sphMin: product.sphMin ?? -10,
        sphMax: product.sphMax ?? 10,
        cylMin: (product as any).cylMin ?? -4,
        cylMax: product.cylMax ?? 4,
        addMin: product.addMin ?? null,
        addMax: product.addMax ?? null,
        addOnPrice: (product as any).rxRangeAddOnPrice || 0,
      }];
    }

    // If no RX ranges, add a default one
    if (rxRanges.length === 0) {
      rxRanges = [{
        sphMin: -10,
        sphMax: 10,
        cylMin: -4,
        cylMax: 4,
        addMin: null,
        addMax: null,
        addOnPrice: 0,
      }];
    }

    setFormData({
      itCode: product.itCode,
      name: product.name,
      lensBrandId: product.lensBrand?.id || '',
      type: product.type,
      index: product.index,
      tintOption: (product as any).tintOption || 'CLEAR',
      category: (product as any).category || 'STANDARD',
      deliveryDays: (product as any).deliveryDays || 4,
      mrp: product.mrp || product.baseOfferPrice || 0,
      baseOfferPrice: product.baseOfferPrice || (product as any).offerPrice || 0,
      addOnPrice: product.addOnPrice || 0,
      rxRanges,
      yopoEligible: product.yopoEligible,
      comboAllowed: product.comboAllowed ?? false,
      featureCodes: (product as any).featureCodes || [],
      benefitScores,
    });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.itCode.trim() || !formData.name.trim() || !formData.lensBrandId) {
      showToast('error', 'Please fill all required fields');
      return;
    }

    // Validate RX ranges
    if (formData.rxRanges.length === 0) {
      showToast('error', 'Please add at least one RX range');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingId
        ? `/api/admin/lens-products/${editingId}`
        : '/api/admin/lens-products';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          addOnPrice: formData.addOnPrice || null,
          rxRanges: formData.rxRanges || [],
          featureCodes: formData.featureCodes || [],
          benefitScores: formData.benefitScores || {},
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', editingId ? 'Lens product updated' : 'Lens product created');
        setIsModalOpen(false);
        
        // Reset form and refresh list - no redirect
        setFormData({
          itCode: '',
          name: '',
          lensBrandId: '',
          type: 'SINGLE_VISION' as LensType,
          index: 'INDEX_156' as LensIndex,
          tintOption: 'CLEAR' as 'CLEAR' | 'TINT' | 'PHOTOCHROMIC' | 'TRANSITION',
          category: 'STANDARD' as 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'ULTRA',
          deliveryDays: 4,
          mrp: 0,
          baseOfferPrice: 0,
          addOnPrice: 0,
          rxRanges: [
            {
              sphMin: -10,
              sphMax: 10,
              cylMin: -4,
              cylMax: 4,
              addMin: null,
              addMax: null,
              addOnPrice: 0,
            },
          ],
          yopoEligible: false,
          comboAllowed: false,
          featureCodes: [] as string[],
          benefitScores: {},
        });
        setEditingId(null);
        fetchProducts();
      } else {
        showToast('error', data.error?.message || 'Failed to save lens product');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to save lens product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lens product?')) return;

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/lens-products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Lens product deleted');
        fetchProducts();
      } else {
        showToast('error', data.error?.message || 'Failed to delete lens product');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to delete lens product');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.itCode.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<LensProduct>[] = [
    {
      key: 'itCode',
      header: 'IT Code',
      render: (product) => (
        <span className="font-mono text-sm text-slate-600">{product.itCode}</span>
      ),
    },
    {
      key: 'name',
      header: 'Product Name',
      render: (product) => (
        <div>
          <div className="font-medium text-slate-900">{product.name}</div>
          <div className="text-sm text-slate-500">{product.lensBrand?.name || product.brandLine || 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (product) => (
        <span className="text-slate-600">{product.type.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'index',
      header: 'Index',
      render: (product) => {
        const formatIndex = (index: string) => {
          if (!index) return 'N/A';
          if (index.startsWith('INDEX_')) {
            const numPart = index.replace('INDEX_', '');
            if (numPart.length >= 3 && numPart.startsWith('1')) {
              return `1.${numPart.substring(1)}`;
            }
            return index.replace('INDEX_', '1.');
          }
          return index;
        };
        return <span className="text-slate-600">{formatIndex(product.index)}</span>;
      },
    },
    {
      key: 'pricing',
      header: 'Pricing',
      render: (product) => (
        <div className="text-sm">
          {product.mrp && product.mrp > 0 && (
            <div className="text-slate-500 line-through">MRP: ₹{product.mrp.toLocaleString()}</div>
          )}
          <div>Offer Price: ₹{(product.baseOfferPrice || (product as any).offerPrice || 0).toLocaleString()}</div>
          {product.addOnPrice && product.addOnPrice > 0 && (
            <div className="text-slate-500">Add-On: ₹{product.addOnPrice.toLocaleString()}</div>
          )}
        </div>
      ),
    },
    {
      key: 'yopoEligible',
      header: 'YOPO',
      render: (product) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.yopoEligible
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {product.yopoEligible ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(product)}
            title="Edit Lens Product"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(product.id)}
            title="Delete"
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Lens Products</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage lens products with type, index, and Rx ranges</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus size={20} className="mr-2" />
          Add Lens Product
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="mb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <Input
              placeholder="Search by name or IT code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              value={filterBrandId}
              onChange={(e) => setFilterBrandId(e.target.value)}
              options={[
                { value: '', label: 'All Brands' },
                ...brands.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as LensType | '')}
              options={[
                { value: '', label: 'All Types' },
                { value: 'SINGLE_VISION', label: 'Single Vision' },
                { value: 'PROGRESSIVE', label: 'Progressive' },
                { value: 'BIFOCAL', label: 'Bifocal' },
                { value: 'SPECIALITY', label: 'Speciality' },
              ]}
            />
            <Select
              value={filterIndex}
              onChange={(e) => setFilterIndex(e.target.value as LensIndex | '')}
              options={[
                { value: '', label: 'All Indexes' },
                { value: 'INDEX_150', label: '1.50' },
                { value: 'INDEX_156', label: '1.56' },
                { value: 'INDEX_160', label: '1.60' },
                { value: 'INDEX_167', label: '1.67' },
                { value: 'INDEX_174', label: '1.74' },
                { value: 'INDEX_PC', label: 'PC 1.59' },
              ]}
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No lens products found"
            description="Create your first lens product to get started"
            action={{
              label: 'Add Lens Product',
              onClick: handleCreate,
            }}
          />
        ) : (
          <DataTable data={filteredProducts} columns={columns} />
        )}
      </div>

      {/* Create/Edit Modal - Simplified: All fields in one place, no redirects */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          // Reset form on close
          setFormData({
            itCode: '',
            name: '',
            lensBrandId: '',
            type: 'SINGLE_VISION' as LensType,
            index: 'INDEX_156' as LensIndex,
            tintOption: 'CLEAR' as 'CLEAR' | 'TINT' | 'PHOTOCHROMIC' | 'TRANSITION',
            category: 'STANDARD' as 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'ULTRA',
            deliveryDays: 4,
            mrp: 0,
            baseOfferPrice: 0,
            addOnPrice: 0,
            rxRanges: [
              {
                sphMin: -10,
                sphMax: 10,
                cylMin: -4,
                cylMax: 4,
                addMin: null,
                addMax: null,
                addOnPrice: 0,
              },
            ],
            yopoEligible: false,
            comboAllowed: false,
            featureCodes: [] as string[],
            benefitScores: {},
          });
        }}
        title={editingId ? 'Edit Lens Product' : 'Create Lens Product'}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                IT Code *
              </label>
              <Input
                value={formData.itCode}
                onChange={(e) => setFormData({ ...formData, itCode: e.target.value })}
                placeholder="e.g., DIGI360-SV-156"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., DIGI360 Single Vision 1.56"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Lens Brand *
              </label>
              <Select
                value={formData.lensBrandId}
                onChange={(e) => setFormData({ ...formData, lensBrandId: e.target.value })}
                options={[
                  { value: '', label: 'Select Brand' },
                  ...brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Lens Type *
              </label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as LensType })}
                options={[
                  { value: 'SINGLE_VISION', label: 'Single Vision' },
                  { value: 'PROGRESSIVE', label: 'Progressive' },
                  { value: 'BIFOCAL', label: 'Bifocal' },
                  { value: 'SPECIALITY', label: 'Speciality' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Index *
              </label>
              <Select
                value={formData.index}
                onChange={(e) => setFormData({ ...formData, index: e.target.value as LensIndex })}
                options={[
                  { value: 'INDEX_150', label: '1.50' },
                  { value: 'INDEX_156', label: '1.56' },
                  { value: 'INDEX_160', label: '1.60' },
                  { value: 'INDEX_167', label: '1.67' },
                  { value: 'INDEX_174', label: '1.74' },
                  { value: 'INDEX_PC', label: 'PC 1.59' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tint Option *
              </label>
              <Select
                value={formData.tintOption}
                onChange={(e) => setFormData({ ...formData, tintOption: e.target.value as any })}
                options={[
                  { value: 'CLEAR', label: 'Clear' },
                  { value: 'TINT', label: 'Tint' },
                  { value: 'PHOTOCHROMIC', label: 'Photochromic' },
                  { value: 'TRANSITION', label: 'Transition' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category *
              </label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                options={[
                  { value: 'ECONOMY', label: 'Economy' },
                  { value: 'STANDARD', label: 'Standard' },
                  { value: 'PREMIUM', label: 'Premium' },
                  { value: 'ULTRA', label: 'Ultra' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Delivery Days *
              </label>
              <Input
                type="number"
                min="1"
                value={formData.deliveryDays}
                onChange={(e) => setFormData({ ...formData, deliveryDays: parseInt(e.target.value) || 4 })}
                placeholder="4"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Features</h3>
            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
              {features.length === 0 ? (
                <p className="text-sm text-slate-500">Loading features...</p>
              ) : (
                features.map((feature) => (
                  <label
                    key={feature.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.featureCodes.includes(feature.code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            featureCodes: [...formData.featureCodes, feature.code],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            featureCodes: formData.featureCodes.filter((c) => c !== feature.code),
                          });
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-slate-900 text-sm">
                        {feature.code} - {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{feature.description}</p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Benefits Section - Required for Recommendation Scoring */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Benefits (Required for Scoring)</h3>
              <span className="text-xs text-slate-500">Score: 0 = No benefit, 1 = Weak, 2 = Medium, 3 = Strong</span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3 border border-slate-200 rounded-lg p-4">
              {benefits.length === 0 ? (
                <p className="text-sm text-slate-500">Loading benefits...</p>
              ) : (
                benefits.map((benefit) => (
                  <div key={benefit.id} className="flex items-center gap-4 p-2 rounded hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-700 text-sm">{benefit.code}</span>
                        <span className="font-medium text-slate-900 text-sm">{benefit.name}</span>
                      </div>
                      {benefit.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{benefit.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="3"
                        step="0.5"
                        value={formData.benefitScores[benefit.code] || 0}
                        onChange={(e) => {
                          const score = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData,
                            benefitScores: {
                              ...formData.benefitScores,
                              [benefit.code]: Math.max(0, Math.min(3, score)),
                            },
                          });
                        }}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                      <span className="text-xs text-slate-500 w-8">/ 3</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 <strong>Important:</strong> Benefits are used for recommendation scoring. At least one benefit with score &gt; 0 is recommended.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                MRP *
              </label>
              <Input
                type="number"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Maximum Retail Price (shown to customers)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Base Offer Price *
              </label>
              <Input
                type="number"
                value={formData.baseOfferPrice}
                onChange={(e) => setFormData({ ...formData, baseOfferPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Actual selling price (offer price)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Add-On Price
              </label>
              <Input
                type="number"
                value={formData.addOnPrice}
                onChange={(e) => setFormData({ ...formData, addOnPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1">Additional price for add-on features</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Rx Ranges with Add-on Prices</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData({
                    ...formData,
                    rxRanges: [
                      ...formData.rxRanges,
                      {
                        sphMin: -10,
                        sphMax: 10,
                        cylMin: -4,
                        cylMax: 4,
                        addMin: null,
                        addMax: null,
                        addOnPrice: 0,
                      },
                    ],
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add RX Range
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.rxRanges.map((rxRange, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">RX Range #{index + 1}</span>
                    {formData.rxRanges.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            rxRanges: formData.rxRanges.filter((_, i) => i !== index),
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        SPH Min *
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={rxRange.sphMin}
                        onChange={(e) => {
                          const newRanges = [...formData.rxRanges];
                          newRanges[index].sphMin = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, rxRanges: newRanges });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        SPH Max *
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={rxRange.sphMax}
                        onChange={(e) => {
                          const newRanges = [...formData.rxRanges];
                          newRanges[index].sphMax = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, rxRanges: newRanges });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        CYL Min *
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={rxRange.cylMin}
                        onChange={(e) => {
                          const newRanges = [...formData.rxRanges];
                          newRanges[index].cylMin = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, rxRanges: newRanges });
                        }}
                      />
                      <p className="text-xs text-slate-500 mt-1">Usually negative (e.g., -4)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        CYL Max *
                      </label>
                      <Input
                        type="number"
                        step="0.25"
                        value={rxRange.cylMax}
                        onChange={(e) => {
                          const newRanges = [...formData.rxRanges];
                          newRanges[index].cylMax = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, rxRanges: newRanges });
                        }}
                      />
                      <p className="text-xs text-slate-500 mt-1">Usually positive (e.g., 4)</p>
                    </div>
                    {(formData.type === 'PROGRESSIVE' || formData.type === 'BIFOCAL') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            ADD Min (Optional)
                          </label>
                          <Input
                            type="number"
                            step="0.25"
                            value={rxRange.addMin ?? ''}
                            onChange={(e) => {
                              const newRanges = [...formData.rxRanges];
                              newRanges[index].addMin = e.target.value ? parseFloat(e.target.value) : null;
                              setFormData({ ...formData, rxRanges: newRanges });
                            }}
                            placeholder="Leave empty if not applicable"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            ADD Max (Optional)
                          </label>
                          <Input
                            type="number"
                            step="0.25"
                            value={rxRange.addMax ?? ''}
                            onChange={(e) => {
                              const newRanges = [...formData.rxRanges];
                              newRanges[index].addMax = e.target.value ? parseFloat(e.target.value) : null;
                              setFormData({ ...formData, rxRanges: newRanges });
                            }}
                            placeholder="Leave empty if not applicable"
                          />
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Add-on Price (₹) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rxRange.addOnPrice}
                        onChange={(e) => {
                          const newRanges = [...formData.rxRanges];
                          newRanges[index].addOnPrice = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, rxRanges: newRanges });
                        }}
                        placeholder="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">Extra charge for this RX range</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="yopoEligible"
              checked={formData.yopoEligible}
              onChange={(e) => setFormData({ ...formData, yopoEligible: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="yopoEligible" className="text-sm font-medium text-slate-700">
              YOPO Eligible
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="comboAllowed"
              checked={formData.comboAllowed}
              onChange={(e) => setFormData({ ...formData, comboAllowed: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="comboAllowed" className="text-sm font-medium text-slate-700">
              Combo Lens
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
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

