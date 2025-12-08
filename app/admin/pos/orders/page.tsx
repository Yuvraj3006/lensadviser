'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Eye, Printer, Send, Clock, User, Store, DollarSign, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  orderId: string;
  time: string;
  customerName: string | null;
  customerPhone: string | null;
  store: {
    id: string;
    name: string;
    code: string;
  };
  status: 'DRAFT' | 'CUSTOMER_CONFIRMED' | 'STORE_ACCEPTED' | 'PRINTED' | 'PUSHED_TO_LAB';
  staff: {
    id: string | null;
    name: string;
    role: string | null;
  } | null;
  finalAmount: number;
  salesMode: 'SELF_SERVICE' | 'STAFF_ASSISTED';
  createdAt: string;
  updatedAt: string;
}

interface OrderDetail extends Order {
  frameData: any;
  lensData: any;
  offerData: any;
}

export default function POSOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
    fetchOrders();
  }, [statusFilter, storeFilter]);

  const fetchStores = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/stores', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStores(data.data.map((store: any) => ({ id: store.id, name: store.name, code: store.code })));
      }
    } catch (error) {
      console.error('Failed to load stores');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (storeFilter) params.append('storeId', storeFilter);

      const response = await fetch(`/api/admin/orders?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
      } else {
        showToast('error', data.error?.message || 'Failed to load orders');
      }
    } catch (error) {
      showToast('error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        showToast('error', data.error?.message || 'Failed to load order details');
      }
    } catch (error) {
      showToast('error', 'Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrint = async (orderId: string) => {
    setActionLoading(`print-${orderId}`);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/orders/${orderId}/print`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Order marked as printed');
        fetchOrders(); // Refresh list
        if (selectedOrder?.id === orderId) {
          fetchOrderDetail(orderId); // Refresh detail view
        }
      } else {
        showToast('error', data.error?.message || 'Failed to print order');
      }
    } catch (error) {
      showToast('error', 'Failed to print order');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePushToLab = async (orderId: string) => {
    setActionLoading(`push-${orderId}`);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/orders/${orderId}/push-to-lab`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Order pushed to lab successfully');
        fetchOrders(); // Refresh list
        if (selectedOrder?.id === orderId) {
          fetchOrderDetail(orderId); // Refresh detail view
        }
      } else {
        showToast('error', data.error?.message || 'Failed to push order to lab');
      }
    } catch (error) {
      showToast('error', 'Failed to push order to lab');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeColor = (status: Order['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'gray';
      case 'CUSTOMER_CONFIRMED':
        return 'blue';
      case 'STORE_ACCEPTED':
        return 'green';
      case 'PRINTED':
        return 'purple';
      case 'PUSHED_TO_LAB':
        return 'cyan';
      default:
        return 'gray';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return format(new Date(timeString), 'MMM dd, yyyy HH:mm');
    } catch {
      return timeString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns: Column<Order>[] = [
    {
      key: 'orderId',
      header: 'Order ID',
      render: (order) => (
        <span className="font-mono font-semibold text-slate-900">{order.orderId}</span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (order) => (
        <div className="flex items-center gap-2 text-slate-600">
          <Clock size={16} />
          <span>{formatTime(order.time)}</span>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (order) => (
        <div className="flex items-center gap-2">
          <User size={16} className="text-slate-400" />
          <span className="text-slate-900">
            {order.customerName || (
              <span className="text-slate-400 italic">Not provided</span>
            )}
          </span>
        </div>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      render: (order) => (
        <div className="flex items-center gap-2">
          <Store size={16} className="text-slate-400" />
          <div>
            <div className="font-medium text-slate-900">{order.store.name}</div>
            <div className="text-xs text-slate-500">{order.store.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <Badge color={getStatusBadgeColor(order.status)}>
          {order.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'staff',
      header: 'Staff',
      render: (order) => (
        <div className="flex items-center gap-2">
          {order.staff ? (
            <>
              <UserCheck size={16} className="text-slate-400" />
              <div>
                <div className="text-slate-900">{order.staff.name}</div>
                {order.staff.role && (
                  <div className="text-xs text-slate-500">{order.staff.role}</div>
                )}
              </div>
            </>
          ) : (
            <span className="text-slate-400 italic">Self-service</span>
          )}
        </div>
      ),
    },
    {
      key: 'finalAmount',
      header: 'Final Amount',
      render: (order) => (
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <DollarSign size={16} />
          {formatCurrency(order.finalAmount)}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (order) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrderDetail(order.id)}
            className="h-8"
          >
            <Eye size={14} className="mr-1" />
            View
          </Button>
          {order.status === 'STORE_ACCEPTED' || order.status === 'CUSTOMER_CONFIRMED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint(order.id)}
              disabled={actionLoading === `print-${order.id}`}
              className="h-8"
            >
              <Printer size={14} className="mr-1" />
              {actionLoading === `print-${order.id}` ? 'Printing...' : 'Print'}
            </Button>
          ) : null}
          {order.status === 'PRINTED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePushToLab(order.id)}
              disabled={actionLoading === `push-${order.id}`}
              className="h-8"
            >
              <Send size={14} className="mr-1" />
              {actionLoading === `push-${order.id}` ? 'Pushing...' : 'Push to Lab'}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">POS Dashboard</h1>
          <p className="mt-1 text-slate-600">Manage online orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CUSTOMER_CONFIRMED">Customer Confirmed</option>
            <option value="STORE_ACCEPTED">Store Accepted</option>
            <option value="PRINTED">Printed</option>
            <option value="PUSHED_TO_LAB">Pushed to Lab</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Store</label>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-white">
          <div className="text-slate-500">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="There are no orders matching your filters."
        />
      ) : (
        <div className="rounded-lg bg-white shadow-sm">
          <DataTable data={orders} columns={columns} />
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order Details - ${selectedOrder.orderId}`}
          size="lg"
        >
          {detailLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-slate-500">Loading order details...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Order ID</label>
                  <div className="mt-1 font-mono font-semibold">{selectedOrder.orderId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Status</label>
                  <div className="mt-1">
                    <Badge color={getStatusBadgeColor(selectedOrder.status)}>
                      {selectedOrder.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Customer Name</label>
                  <div className="mt-1">
                    {selectedOrder.customerName || (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Customer Phone</label>
                  <div className="mt-1">
                    {selectedOrder.customerPhone || (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Store</label>
                  <div className="mt-1">{selectedOrder.store.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Final Amount</label>
                  <div className="mt-1 font-semibold">{formatCurrency(selectedOrder.finalAmount)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Created At</label>
                  <div className="mt-1">{formatTime(selectedOrder.createdAt)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Sales Mode</label>
                  <div className="mt-1">
                    <Badge color={selectedOrder.salesMode === 'SELF_SERVICE' ? 'blue' : 'green'}>
                      {selectedOrder.salesMode.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Frame Data */}
              {selectedOrder.frameData && (
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">Frame Details</h3>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <pre className="text-sm text-slate-700">
                      {JSON.stringify(selectedOrder.frameData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Lens Data */}
              {selectedOrder.lensData && (
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">Lens Details</h3>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <pre className="text-sm text-slate-700">
                      {JSON.stringify(selectedOrder.lensData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Offer Data */}
              {selectedOrder.offerData && (
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">Offer Details</h3>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <pre className="text-sm text-slate-700">
                      {JSON.stringify(selectedOrder.offerData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 border-t pt-4">
                {(selectedOrder.status === 'STORE_ACCEPTED' ||
                  selectedOrder.status === 'CUSTOMER_CONFIRMED') && (
                  <Button
                    variant="primary"
                    onClick={() => handlePrint(selectedOrder.id)}
                    disabled={actionLoading === `print-${selectedOrder.id}`}
                  >
                    <Printer size={16} className="mr-2" />
                    {actionLoading === `print-${selectedOrder.id}` ? 'Printing...' : 'Print Order'}
                  </Button>
                )}
                {selectedOrder.status === 'PRINTED' && (
                  <Button
                    variant="primary"
                    onClick={() => handlePushToLab(selectedOrder.id)}
                    disabled={actionLoading === `push-${selectedOrder.id}`}
                  >
                    <Send size={16} className="mr-2" />
                    {actionLoading === `push-${selectedOrder.id}`
                      ? 'Pushing...'
                      : 'Push to Lab'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

