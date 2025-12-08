'use client';

/**
 * Admin Lenses List Page
 * Matches Frontend Specification exactly
 * Table: IT Code | Name | Brand Line | Index | OfferPrice | Active
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Search, Edit2, Copy, ToggleLeft, ToggleRight, Package } from 'lucide-react';
import { BrandLine } from '@prisma/client';

interface Lens {
  id: string;
  itCode: string;
  name: string;
  brandLine: BrandLine | null;
  index: string | null; // subCategory
  offerPrice: number; // basePrice
  isActive: boolean;
  sku: string;
}

export default function AdminLensesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('lenstrack_token');
    if (token) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.organizationId) {
            setOrganizationId(data.data.organizationId);
            fetchLenses(data.data.organizationId);
          }
        });
    }
  }, []);

  const fetchLenses = async (orgId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      params.append('category', 'EYEGLASSES');
      if (search) params.append('search', search);

      // Use admin products API to get all lenses including inactive ones
      const response = await fetch(`/api/admin/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setLenses(data.data.map((p: any) => ({
          id: p.id,
          itCode: p.itCode || p.sku,
          name: p.name,
          brandLine: p.brandLine,
          index: p.subCategory,
          offerPrice: p.basePrice,
          isActive: p.isActive,
          sku: p.sku,
        })));
      }
    } catch (error) {
      showToast('error', 'Failed to load lenses');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (lens: Lens) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login again');
        return;
      }

      const response = await fetch(`/api/admin/products/${lens.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !lens.isActive,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', `Lens ${!lens.isActive ? 'activated' : 'deactivated'}`);
        if (organizationId) fetchLenses(organizationId);
      } else {
        showToast('error', data.error?.message || 'Failed to update lens');
      }
    } catch (error) {
      showToast('error', 'Failed to update lens');
    }
  };

  const handleClone = async (lens: Lens) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login again');
        return;
      }

      // Fetch full product details
      const productResponse = await fetch(`/api/admin/products/${lens.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productData = await productResponse.json();
      
      if (!productData.success) {
        showToast('error', 'Failed to fetch lens details');
        return;
      }

      const product = productData.data;
      
      // Create cloned product with modified SKU
      const clonedSku = `${product.sku}-COPY-${Date.now()}`;
      const cloneResponse = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sku: clonedSku,
          itCode: product.itCode || clonedSku,
          name: `${product.name} (Copy)`,
          brand: product.brand,
          brandLine: product.brandLine,
          subCategory: product.subCategory,
          basePrice: product.basePrice,
          mrp: product.mrp,
          category: product.category,
          description: product.description || '',
          imageUrl: product.imageUrl || '',
          isActive: product.isActive,
          yopoEligible: product.yopoEligible || false,
          features: product.features?.map((f: any) => ({
            featureId: f.featureId || f.feature?.id,
            strength: f.strength || 1,
          })) || [],
        }),
      });

      const cloneData = await cloneResponse.json();
      if (cloneData.success) {
        showToast('success', 'Lens cloned successfully');
        if (organizationId) fetchLenses(organizationId);
      } else {
        showToast('error', cloneData.error?.message || 'Failed to clone lens');
      }
    } catch (error) {
      console.error('Clone error:', error);
      showToast('error', 'Failed to clone lens');
    }
  };

  const columns: Column<Lens>[] = [
    {
      key: 'itCode',
      header: 'IT Code',
      render: (lens) => (
        <span className="font-mono text-sm font-medium">{lens.itCode || lens.sku}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (lens) => <span className="font-medium">{lens.name}</span>,
    },
    {
      key: 'brandLine',
      header: 'Brand Line',
      render: (lens) => (
        <span className="text-sm text-slate-600">
          {lens.brandLine || 'N/A'}
        </span>
      ),
    },
    {
      key: 'index',
      header: 'Index',
      render: (lens) => (
        <span className="text-sm text-slate-600">{lens.index || 'N/A'}</span>
      ),
    },
    {
      key: 'offerPrice',
      header: 'Offer Price',
      render: (lens) => (
        <span className="font-medium">₹{lens.offerPrice.toLocaleString()}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (lens) => (
        <button
          onClick={() => handleToggleActive(lens)}
          className="flex items-center gap-2"
        >
          {lens.isActive ? (
            <ToggleRight className="text-green-600" size={24} />
          ) : (
            <ToggleLeft className="text-slate-400" size={24} />
          )}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (lens) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/lenses/${lens.id}`)}
          >
            <Edit2 size={14} className="mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClone(lens)}
          >
            <Copy size={14} className="mr-1" />
            Clone
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lenses</h1>
          <p className="text-slate-600 mt-1">Manage lens products</p>
        </div>
        <Button onClick={() => router.push('/admin/lenses/new')}>
          <Plus size={20} className="mr-2" />
          New Lens
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <Input
            placeholder="Search by IT Code, Name, Brand Line..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (organizationId) fetchLenses(organizationId);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : lenses.length === 0 ? (
        <EmptyState
          icon={<Package size={48} />}
          title="No Lenses"
          description="Start by adding a new lens"
          action={{
            label: 'New Lens',
            onClick: () => router.push('/admin/lenses/new'),
          }}
        />
      ) : (
        <DataTable data={lenses} columns={columns} />
      )}
    </div>
  );
}

