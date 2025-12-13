'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Search, Edit2, Trash2, Eye, TrendingUp } from 'lucide-react';
import { Select } from '@/components/ui/Select';

interface ContactLensProduct {
  id: string;
  skuCode: string;
  brand: string;
  line: string;
  modality: 'DAILY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
  lensType: 'SPHERICAL' | 'TORIC' | 'MULTIFOCAL' | 'COSMETIC';
  material?: string | null;
  waterContent?: string | null;
  designNotes?: string | null;
  packSize: number;
  mrp: number;
  offerPrice: number;
  sphMin?: number | null;
  sphMax?: number | null;
  cylMin?: number | null;
  cylMax?: number | null;
  axisSteps?: string | null; // JSON array
  addMin?: number | null;
  addMax?: number | null;
  isColorLens: boolean;
  colorOptions?: string | null; // JSON array
  isActive: boolean;
}

interface Brand {
  id: string;
  name: string;
  productTypes: string[];
  subBrands: SubBrand[];
}

interface SubBrand {
  id: string;
  name: string;
  isActive: boolean;
}

export default function ContactLensProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<ContactLensProduct[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ContactLensProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'benefits'>('general');
  const [benefits, setBenefits] = useState<any[]>([]);
  const [benefitScores, setBenefitScores] = useState<Record<string, number>>({});
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  
  const [formData, setFormData] = useState({
    skuCode: '',
    brand: '',
    line: '',
    modality: 'MONTHLY' as 'DAILY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY',
    lensType: 'SPHERICAL' as 'SPHERICAL' | 'TORIC' | 'MULTIFOCAL' | 'COSMETIC',
    material: '',
    waterContent: '',
    designNotes: '',
    packSize: 30,
    mrp: 0,
    offerPrice: 0,
    sphMin: '',
    sphMax: '',
    cylMin: '',
    cylMax: '',
    axisSteps: '',
    addMin: '',
    addMax: '',
    isColorLens: false,
    colorOptions: '',
    isActive: true,
  });

  useEffect(() => {
    fetchBrands();
    fetchProducts();
    fetchBenefits();
  }, []);

  const fetchBenefits = async () => {
    setLoadingBenefits(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/benefit-features?type=BENEFIT&isActive=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setBenefits(data.data);
          // Initialize benefit scores
          const initialScores: Record<string, number> = {};
          data.data.forEach((b: any) => {
            initialScores[b.code] = 0;
          });
          setBenefitScores(initialScores);
        }
      }
    } catch (error) {
      console.error('Failed to fetch benefits:', error);
    } finally {
      setLoadingBenefits(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/brands', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter brands that have CONTACT_LENS in productTypes or all brands if no productTypes filter
          const contactLensBrands = data.data.filter((brand: Brand) => 
            !brand.productTypes || brand.productTypes.length === 0 || brand.productTypes.includes('CONTACT_LENS')
          );
          setBrands(contactLensBrands || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/contact-lens-products', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProducts(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch contact lens products:', error);
      showToast('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      
      // Parse JSON arrays
      const axisSteps = formData.axisSteps 
        ? formData.axisSteps.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
        : undefined;
      const colorOptions = formData.colorOptions
        ? formData.colorOptions.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : undefined;

      const payload = {
        ...formData,
        packSize: Number(formData.packSize),
        mrp: Number(formData.mrp),
        offerPrice: Number(formData.offerPrice),
        sphMin: formData.sphMin ? Number(formData.sphMin) : undefined,
        sphMax: formData.sphMax ? Number(formData.sphMax) : undefined,
        cylMin: formData.cylMin ? Number(formData.cylMin) : undefined,
        cylMax: formData.cylMax ? Number(formData.cylMax) : undefined,
        addMin: formData.addMin ? Number(formData.addMin) : undefined,
        addMax: formData.addMax ? Number(formData.addMax) : undefined,
        axisSteps,
        colorOptions,
        material: formData.material || undefined,
        waterContent: formData.waterContent || undefined,
        designNotes: formData.designNotes || undefined,
      };

      const url = editingProduct
        ? `/api/admin/contact-lens-products/${editingProduct.id}`
        : '/api/admin/contact-lens-products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', `Product ${editingProduct ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
      } else {
        showToast('error', data.error?.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (product: ContactLensProduct) => {
    setEditingProduct(product);
    setFormData({
      skuCode: product.skuCode,
      brand: product.brand,
      line: product.line,
      modality: product.modality,
      lensType: product.lensType,
      material: product.material || '',
      waterContent: product.waterContent || '',
      designNotes: product.designNotes || '',
      packSize: product.packSize,
      mrp: product.mrp,
      offerPrice: product.offerPrice,
      sphMin: product.sphMin?.toString() || '',
      sphMax: product.sphMax?.toString() || '',
      cylMin: product.cylMin?.toString() || '',
      cylMax: product.cylMax?.toString() || '',
      axisSteps: product.axisSteps ? JSON.parse(product.axisSteps).join(', ') : '',
      addMin: product.addMin?.toString() || '',
      addMax: product.addMax?.toString() || '',
      isColorLens: product.isColorLens,
      colorOptions: product.colorOptions ? JSON.parse(product.colorOptions).join(', ') : '',
      isActive: product.isActive,
    });
    
    // Fetch benefit scores for this product
    if (product.id) {
      try {
        const token = localStorage.getItem('lenstrack_token');
        const response = await fetch(`/api/admin/contact-lens-products/${product.id}/benefits`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.benefitScores) {
            setBenefitScores(data.data.benefitScores);
          }
        }
      } catch (error) {
        console.error('Failed to fetch benefit scores:', error);
      }
    }
    
    setIsModalOpen(true);
    setActiveTab('general');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/contact-lens-products/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Product deleted successfully');
        fetchProducts();
      } else {
        showToast('error', data.error?.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('error', 'An error occurred');
    }
  };

  const resetForm = () => {
    setFormData({
      skuCode: '',
      brand: '',
      line: '',
      modality: 'MONTHLY',
      lensType: 'SPHERICAL',
      material: '',
      waterContent: '',
      designNotes: '',
      packSize: 30,
      mrp: 0,
      offerPrice: 0,
      sphMin: '',
      sphMax: '',
      cylMin: '',
      cylMax: '',
      axisSteps: '',
      addMin: '',
      addMax: '',
      isColorLens: false,
      colorOptions: '',
      isActive: true,
    });
    // Reset benefit scores
    const initialScores: Record<string, number> = {};
    benefits.forEach((b: any) => {
      initialScores[b.code] = 0;
    });
    setBenefitScores(initialScores);
    setActiveTab('general');
  };

  const updateBenefitScore = (code: string, score: number) => {
    setBenefitScores((prev) => ({
      ...prev,
      [code]: Math.max(0, Math.min(3, score)), // Clamp 0-3
    }));
  };

  const handleSaveBenefits = async () => {
    if (!editingProduct) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const benefitsArray = Object.entries(benefitScores)
        .filter(([_, score]) => score > 0)
        .map(([code, score]) => ({
          benefitCode: code,
          score,
        }));

      const response = await fetch(`/api/admin/contact-lens-products/${editingProduct.id}/benefits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          benefits: benefitsArray,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Benefit scores saved successfully');
      } else {
        showToast('error', data.error?.message || 'Failed to save benefit scores');
      }
    } catch (error) {
      console.error('Error saving benefit scores:', error);
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.line.toLowerCase().includes(search.toLowerCase()) ||
    p.skuCode.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<ContactLensProduct>[] = [
    {
      key: 'skuCode',
      header: 'SKU Code',
    },
    {
      key: 'brand',
      header: 'Brand',
    },
    {
      key: 'line',
      header: 'Line',
    },
    {
      key: 'modality',
      header: 'Modality',
      render: (product) => <Badge variant="outline">{product.modality}</Badge>,
    },
    {
      key: 'lensType',
      header: 'Type',
      render: (product) => <Badge variant="outline">{product.lensType}</Badge>,
    },
    {
      key: 'packSize',
      header: 'Pack Size',
    },
    {
      key: 'mrp',
      header: 'MRP',
      render: (product) => `₹${product.mrp.toLocaleString()}`,
    },
    {
      key: 'offerPrice',
      header: 'Offer Price',
      render: (product) => `₹${product.offerPrice.toLocaleString()}`,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (product) => (
        <Badge variant={product.isActive ? 'success' : 'secondary'}>
          {product.isActive ? 'Active' : 'Inactive'}
        </Badge>
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
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(product.id)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contact Lens Products</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage contact lens product catalog</p>
        </div>
        <Button onClick={() => {
          setEditingProduct(null);
          resetForm();
          setIsModalOpen(true);
        }} className="w-full sm:w-auto">
          <Plus size={20} className="mr-2" />
          Add Contact Lens Product
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by brand, line, or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No contact lens products found"
          description={search ? 'Try adjusting your search' : 'Get started by adding your first contact lens product'}
          action={{
            label: 'Add Product',
            onClick: () => {
              setEditingProduct(null);
              resetForm();
              setIsModalOpen(true);
            },
          }}
        />
      ) : (
        <DataTable data={filteredProducts} columns={columns} />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
          resetForm();
        }}
        title={editingProduct ? 'Edit Contact Lens Product' : 'Add Contact Lens Product'}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            {activeTab === 'benefits' && editingProduct ? (
              <Button onClick={handleSaveBenefits} loading={submitting}>
                Save Benefits
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}>
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            )}
          </>
        }
      >
        {/* Tabs */}
        {editingProduct && (
          <div className="border-b border-slate-200 mb-4">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'general'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('benefits')}
                className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'benefits'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp size={16} />
                Benefits
              </button>
            </div>
          </div>
        )}

        {/* General Tab */}
        {activeTab === 'general' && (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU Code"
              value={formData.skuCode}
              onChange={(e) => setFormData({ ...formData, skuCode: e.target.value.toUpperCase() })}
              required
              placeholder="CL-001"
            />
            <Select
              label="Brand *"
              value={formData.brand}
              onChange={(e) => {
                const selectedBrand = brands.find(b => b.name === e.target.value);
                setFormData({ 
                  ...formData, 
                  brand: e.target.value,
                  line: '' // Reset line when brand changes
                });
              }}
              options={[
                { value: '', label: 'Select Brand' },
                ...brands.map((b) => ({ value: b.name, label: b.name })),
                // If editing and brand doesn't exist in brands list, add it as an option
                ...(formData.brand && !brands.find(b => b.name === formData.brand)
                  ? [{ value: formData.brand, label: formData.brand }]
                  : []
                ),
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Line *"
              value={formData.line}
              onChange={(e) => setFormData({ ...formData, line: e.target.value })}
              options={[
                { value: '', label: 'Select Line' },
                ...(formData.brand 
                  ? (brands.find(b => b.name === formData.brand)?.subBrands || []).map((sb) => ({ 
                      value: sb.name, 
                      label: sb.name 
                    }))
                  : []
                ),
                // If editing and line doesn't exist in sub-brands, add it as an option
                ...(formData.line && formData.brand && !brands.find(b => b.name === formData.brand)?.subBrands.find(sb => sb.name === formData.line)
                  ? [{ value: formData.line, label: formData.line }]
                  : []
                ),
              ]}
              required
              disabled={!formData.brand}
            />
            <Select
              label="Modality"
              value={formData.modality}
              onChange={(e) => setFormData({ ...formData, modality: e.target.value as any })}
              options={[
                { value: 'DAILY', label: 'Daily' },
                { value: 'BIWEEKLY', label: 'Biweekly' },
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'YEARLY', label: 'Yearly' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Lens Type"
              value={formData.lensType}
              onChange={(e) => setFormData({ ...formData, lensType: e.target.value as any })}
              options={[
                { value: 'SPHERICAL', label: 'Spherical' },
                { value: 'TORIC', label: 'Toric' },
                { value: 'MULTIFOCAL', label: 'Multifocal' },
                { value: 'COSMETIC', label: 'Cosmetic' },
              ]}
              required
            />
            <Input
              label="Pack Size"
              type="number"
              value={formData.packSize}
              onChange={(e) => setFormData({ ...formData, packSize: parseInt(e.target.value) || 30 })}
              required
              placeholder="30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="MRP"
              type="number"
              step="0.01"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
              required
              placeholder="0.00"
            />
            <Input
              label="Offer Price"
              type="number"
              step="0.01"
              value={formData.offerPrice}
              onChange={(e) => setFormData({ ...formData, offerPrice: parseFloat(e.target.value) || 0 })}
              required
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Material (optional)"
              value={formData.material}
              onChange={(e) => setFormData({ ...formData, material: e.target.value })}
              placeholder="Silicone Hydrogel"
            />
            <Input
              label="Water Content (optional)"
              value={formData.waterContent}
              onChange={(e) => setFormData({ ...formData, waterContent: e.target.value })}
              placeholder="38%"
            />
          </div>

          <Input
            label="Design Notes (optional)"
            value={formData.designNotes}
            onChange={(e) => setFormData({ ...formData, designNotes: e.target.value })}
            multiline
            rows={2}
            placeholder="Best for dry eyes, Extended wear"
          />

          <div className="border-t pt-4">
            <h3 className="font-semibold text-slate-900 mb-3">Power Range (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="SPH Min"
                type="number"
                step="0.25"
                value={formData.sphMin}
                onChange={(e) => setFormData({ ...formData, sphMin: e.target.value })}
                placeholder="-10.00"
              />
              <Input
                label="SPH Max"
                type="number"
                step="0.25"
                value={formData.sphMax}
                onChange={(e) => setFormData({ ...formData, sphMax: e.target.value })}
                placeholder="+10.00"
              />
              <Input
                label="CYL Min"
                type="number"
                step="0.25"
                value={formData.cylMin}
                onChange={(e) => setFormData({ ...formData, cylMin: e.target.value })}
                placeholder="-6.00"
              />
              <Input
                label="CYL Max"
                type="number"
                step="0.25"
                value={formData.cylMax}
                onChange={(e) => setFormData({ ...formData, cylMax: e.target.value })}
                placeholder="0.00"
              />
              <Input
                label="ADD Min (for Multifocal)"
                type="number"
                step="0.25"
                value={formData.addMin}
                onChange={(e) => setFormData({ ...formData, addMin: e.target.value })}
                placeholder="+0.75"
              />
              <Input
                label="ADD Max (for Multifocal)"
                type="number"
                step="0.25"
                value={formData.addMax}
                onChange={(e) => setFormData({ ...formData, addMax: e.target.value })}
                placeholder="+3.00"
              />
            </div>
            <Input
              label="Axis Steps (comma-separated, optional)"
              value={formData.axisSteps}
              onChange={(e) => setFormData({ ...formData, axisSteps: e.target.value })}
              placeholder="10, 20, 90, 180"
              className="mt-4"
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="isColorLens"
                checked={formData.isColorLens}
                onChange={(e) => setFormData({ ...formData, isColorLens: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isColorLens" className="font-medium text-slate-900">
                Color Lens
              </label>
            </div>
            {formData.isColorLens && (
              <Input
                label="Color Options (comma-separated)"
                value={formData.colorOptions}
                onChange={(e) => setFormData({ ...formData, colorOptions: e.target.value })}
                placeholder="Brown, Grey, Hazel, Blue"
              />
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="font-medium text-slate-900">
                Active
              </label>
            </div>
          </div>
        </form>
        )}

        {/* Benefits Tab */}
        {activeTab === 'benefits' && editingProduct && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Benefit Mapping</h3>
              <p className="text-sm text-slate-600 mb-4">
                Map benefits to this contact lens product. Scores range from 0-3 (0 = not applicable, 3 = strongest match).
              </p>
              
              {loadingBenefits ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 mx-auto border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-slate-600 mt-2">Loading benefits...</p>
                </div>
              ) : benefits.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    No benefits found. Please create benefits first in Admin → Benefit Features.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {benefits.map((benefit) => (
                    <div key={benefit.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-slate-900">
                            {benefit.code} - {benefit.name}
                          </span>
                          {benefit.description && (
                            <p className="text-sm text-slate-500 mt-1">{benefit.description}</p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-600">
                          {benefitScores[benefit.code] || 0} / 3
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="3"
                          step="0.1"
                          value={benefitScores[benefit.code] || 0}
                          onChange={(e) =>
                            updateBenefitScore(benefit.code, parseFloat(e.target.value))
                          }
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min="0"
                          max="3"
                          step="0.1"
                          value={benefitScores[benefit.code] || 0}
                          onChange={(e) =>
                            updateBenefitScore(benefit.code, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        {benefitScores[benefit.code] === 0 && 'Not applicable'}
                        {benefitScores[benefit.code] > 0 && benefitScores[benefit.code] <= 1 && 'Weak match'}
                        {benefitScores[benefit.code] > 1 && benefitScores[benefit.code] <= 2 && 'Moderate match'}
                        {benefitScores[benefit.code] > 2 && benefitScores[benefit.code] <= 3 && 'Strong match'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

