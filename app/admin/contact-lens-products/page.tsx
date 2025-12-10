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
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
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

export default function ContactLensProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<ContactLensProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ContactLensProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
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
    fetchProducts();
  }, []);

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

  const handleEdit = (product: ContactLensProduct) => {
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
    setIsModalOpen(true);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contact Lens Products</h1>
          <p className="text-slate-600 mt-1">Manage contact lens product catalog</p>
        </div>
        <Button onClick={() => {
          setEditingProduct(null);
          resetForm();
          setIsModalOpen(true);
        }}>
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
            <Button onClick={handleSubmit} loading={submitting}>
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU Code"
              value={formData.skuCode}
              onChange={(e) => setFormData({ ...formData, skuCode: e.target.value.toUpperCase() })}
              required
              placeholder="CL-001"
            />
            <Input
              label="Brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              required
              placeholder="Bausch & Lomb"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Line"
              value={formData.line}
              onChange={(e) => setFormData({ ...formData, line: e.target.value })}
              required
              placeholder="Acuvue Oasys"
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
      </Modal>
    </div>
  );
}

