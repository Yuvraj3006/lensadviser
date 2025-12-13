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
interface Lens {
  id: string;
  itCode: string;
  name: string;
  brandLine: string;
  lensIndex: string;
  baseOfferPrice: number;
  category: string;
  yopoEligible: boolean;
  isActive: boolean;
}

export default function AdminLensesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLenses();
  }, [search]);

  const fetchLenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/lenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setLenses(data.data || []);
      } else {
        showToast('error', data.error?.message || 'Failed to load lenses');
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

      const response = await fetch(`/api/admin/lenses/${lens.id}`, {
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
        fetchLenses();
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

      // Fetch full lens details
      const lensResponse = await fetch(`/api/admin/lenses/${lens.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lensData = await lensResponse.json();
      
      if (!lensData.success) {
        showToast('error', 'Failed to fetch lens details');
        return;
      }

      const lensDetails = lensData.data;
      
      // Create cloned lens with modified IT code
      const clonedItCode = `${lensDetails.itCode}-COPY-${Date.now()}`;
      const cloneResponse = await fetch('/api/admin/lenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...lensDetails,
          itCode: clonedItCode,
          name: `${lensDetails.name} (Copy)`,
          isActive: false, // Clone as inactive by default
        }),
      });

      const cloneData = await cloneResponse.json();
      if (cloneData.success) {
        showToast('success', 'Lens cloned successfully');
        fetchLenses();
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
        <span className="font-mono text-sm font-medium">{lens.itCode}</span>
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
      key: 'lensIndex',
      header: 'Index',
      render: (lens) => {
        const formatIndex = (index: string | undefined) => {
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
        return <span className="text-sm text-slate-600">{formatIndex(lens.lensIndex)}</span>;
      },
    },
    {
      key: 'baseOfferPrice',
      header: 'Offer Price',
      render: (lens) => (
        <span className="font-medium">₹{lens.baseOfferPrice.toLocaleString()}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (lens) => (
        <span className="text-sm text-slate-600">{lens.category}</span>
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

