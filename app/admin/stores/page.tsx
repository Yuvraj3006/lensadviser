'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Search, Edit2, Trash2, Store as StoreIcon, RotateCcw, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Store {
  id: string;
  code: string;
  name: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  isActive: boolean;
  staffCount: number;
  sessionCount: number;
  createdAt: string;
}

interface StoreFormData {
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
}

export default function StoresPage() {
  const { showToast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [qrCodeStore, setQrCodeStore] = useState<Store | null>(null);

  useEffect(() => {
    fetchStores();
  }, [showDeactivated]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStores();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, showDeactivated]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      // Filter by active/deactivated status
      params.append('isActive', showDeactivated ? 'false' : 'true');

      const response = await fetch(`/api/admin/stores?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStores(data.data);
      } else {
        showToast('error', data.error?.message || 'Failed to load stores');
      }
    } catch (error) {
      showToast('error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      code: '',
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      gstNumber: '',
    });
    setEditingStore(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (store: Store) => {
    setFormData({
      code: store.code,
      name: store.name,
      address: '',
      city: store.city || '',
      state: store.state || '',
      pincode: '',
      phone: store.phone || '',
      email: store.email || '',
      gstNumber: store.gstNumber || '',
    });
    setEditingStore(store);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingStore
        ? `/api/admin/stores/${editingStore.id}`
        : '/api/admin/stores';
      const method = editingStore ? 'PUT' : 'POST';

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
        showToast('success', `Store ${editingStore ? 'updated' : 'created'} successfully`);
        setIsCreateOpen(false);
        fetchStores();
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
      const response = await fetch(`/api/admin/stores/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Store deactivated successfully');
        setDeleteConfirm(null);
        fetchStores();
      } else {
        showToast('error', data.error?.message || 'Failed to delete store');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const handleReactivate = async (store: Store) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/stores/${store.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Store reactivated successfully');
        fetchStores();
      } else {
        showToast('error', data.error?.message || 'Failed to reactivate store');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const columns: Column<Store>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (store) => (
        <span className="font-mono font-semibold">{store.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Store Name',
      render: (store) => (
        <div>
          <p className="font-medium">{store.name}</p>
          {store.city && <p className="text-xs text-slate-500">{store.city}, {store.state}</p>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (store) => (
        <div className="text-sm">
          {store.phone && <p>{store.phone}</p>}
          {store.email && <p className="text-slate-500">{store.email}</p>}
        </div>
      ),
    },
    {
      key: 'staffCount',
      header: 'Staff',
      render: (store) => (
        <span className="text-sm font-medium">{store.staffCount}</span>
      ),
    },
    {
      key: 'sessionCount',
      header: 'Sessions',
      render: (store) => (
        <span className="text-sm font-medium">{store.sessionCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (store) => (
        <Badge variant={store.isActive ? 'success' : 'secondary'}>
          {store.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Stores</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage store locations and details</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            variant={showDeactivated ? 'outline' : 'primary'}
            onClick={() => setShowDeactivated(!showDeactivated)}
            className="w-full sm:w-auto"
          >
            {showDeactivated ? 'Show Active Stores' : 'Show Deactivated Stores'}
          </Button>
          {!showDeactivated && (
            <Button icon={<Plus size={18} />} onClick={handleCreate}>
              Add Store
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search stores by name, code, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {stores.length === 0 && !loading ? (
          <EmptyState
            icon={<StoreIcon size={48} />}
            title={showDeactivated ? 'No deactivated stores found' : 'No stores found'}
            description={showDeactivated ? 'There are no deactivated stores' : 'Get started by creating your first store'}
            action={!showDeactivated ? {
              label: 'Add Store',
              onClick: handleCreate,
            } : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={stores}
            loading={loading}
            rowActions={(store) => (
              <div className="flex items-center gap-2">
                {showDeactivated ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<RotateCcw size={14} />}
                    onClick={() => handleReactivate(store)}
                  >
                    Reactivate
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<QrCode size={14} />}
                      onClick={() => setQrCodeStore(store)}
                    >
                      QR Code
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit2 size={14} />}
                      onClick={() => handleEdit(store)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => setDeleteConfirm(store)}
                    >
                      Delete
                    </Button>
                  </>
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
        title={editingStore ? 'Edit Store' : 'Create Store'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingStore ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Store Code"
              placeholder="STORE-001"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <Input
              label="Store Name"
              placeholder="Main Store"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <Input
            label="Address"
            placeholder="123 Main Street"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="City"
              placeholder="Mumbai"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State"
              placeholder="Maharashtra"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Pincode"
              placeholder="400001"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              placeholder="+91-9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="store@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <Input
            label="GST Number"
            placeholder="27XXXXX1234X1Z5"
            value={formData.gstNumber}
            onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Deactivate Store"
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
        <p className="text-slate-600">
          Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong>?
          This will not delete the store but will mark it as inactive.
        </p>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={!!qrCodeStore}
        onClose={() => setQrCodeStore(null)}
        title={`QR Code - ${qrCodeStore?.name}`}
        size="sm"
        footer={
            <Button variant="outline" onClick={() => setQrCodeStore(null)}>
              Close
            </Button>
        }
      >
        {qrCodeStore && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-lg" id="qr-code-container">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/questionnaire?code=${qrCodeStore.code}`}
                size={256}
                level="H"
                includeMargin={true}
                fgColor="#1e293b"
                bgColor="#ffffff"
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {qrCodeStore.name}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                Code: {qrCodeStore.code}
              </p>
              {qrCodeStore.city && (
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {qrCodeStore.city}, {qrCodeStore.state}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center mb-3">
                Customers can scan this QR code to access the questionnaire
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/questionnaire?code={qrCodeStore.code}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  const svgElement = document.querySelector('#qr-code-container svg');
                  if (svgElement) {
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    canvas.width = 256;
                    canvas.height = 256;
                    
                    img.onload = () => {
                      ctx?.drawImage(img, 0, 0);
                      canvas.toBlob((blob) => {
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `QR-${qrCodeStore.code}.png`;
                          document.body.appendChild(link);
                    link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }
                      }, 'image/png');
                    };
                    
                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                  }
                }}
              >
                <Download size={14} className="mr-2" />
                Download QR Image
              </Button>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  const svgElement = document.querySelector('#qr-code-container svg');
                  if (svgElement) {
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>QR Code - ${qrCodeStore.code}</title>
                            <style>
                              body {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                padding: 40px;
                                font-family: Arial, sans-serif;
                              }
                              h1 { margin-bottom: 10px; }
                              p { margin: 5px 0; }
                              img { margin: 20px 0; width: 256px; height: 256px; }
                            </style>
                          </head>
                          <body>
                            <h1>${qrCodeStore.name}</h1>
                            <p><strong>Code:</strong> ${qrCodeStore.code}</p>
                            ${qrCodeStore.city ? `<p><strong>Location:</strong> ${qrCodeStore.city}, ${qrCodeStore.state}</p>` : ''}
                            <img src="${svgBase64}" alt="QR Code" />
                            <p style="font-size: 12px; color: #666;">Scan this QR code to access LensTrack questionnaire</p>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      setTimeout(() => {
                      printWindow.print();
                      }, 250);
                    }
                  }
                }}
              >
                Print
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

