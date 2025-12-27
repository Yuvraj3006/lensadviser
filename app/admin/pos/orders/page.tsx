'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Eye, Printer, Send, Clock, User, Store, DollarSign, UserCheck, Package } from 'lucide-react';
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
      if (data.success && Array.isArray(data.data)) {
        setStores(data.data.map((store: any) => ({ id: store.id, name: store.name, code: store.code })));
      } else {
        console.error('Invalid stores API response:', data);
        setStores([]);
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
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      } else {
        console.error('Invalid orders API response:', data);
        showToast('error', data.error?.message || 'Failed to load orders');
        setOrders([]);
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

  const formatTimeShort = (timeString: string) => {
    try {
      return format(new Date(timeString), 'MMM dd, HH:mm');
    } catch {
      return timeString;
    }
  };

  const columns: Column<Order>[] = [
    {
      key: 'orderId',
      header: 'Order ID',
      render: (order) => (
        <span className="font-mono font-semibold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">{order.orderId}</span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (order) => (
        <div className="flex items-center gap-1 sm:gap-2 text-slate-600 dark:text-slate-400">
          <Clock size={14} className="hidden sm:block" />
          <span className="text-xs sm:text-sm">
            <span className="sm:hidden">{formatTimeShort(order.time)}</span>
            <span className="hidden sm:inline">{formatTime(order.time)}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (order) => (
        <div className="flex items-center gap-1 sm:gap-2">
          <User size={14} className="text-slate-400 dark:text-slate-500 hidden sm:block" />
          <span className="text-xs sm:text-sm text-slate-900 dark:text-slate-200 truncate max-w-[120px] sm:max-w-none">
            {order.customerName || (
              <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>
            )}
          </span>
        </div>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      render: (order) => (
        <div className="flex items-center gap-1 sm:gap-2">
          <Store size={14} className="text-slate-400 dark:text-slate-500 hidden sm:block" />
          <div className="min-w-0">
            <div className="font-medium text-xs sm:text-sm text-slate-900 dark:text-slate-200 truncate">{order.store.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">{order.store.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <Badge color={getStatusBadgeColor(order.status)}>
          <span className="text-xs">{order.status.replace(/_/g, ' ')}</span>
        </Badge>
      ),
    },
    {
      key: 'finalAmount',
      header: 'Amount',
      render: (order) => (
        <div className="flex items-center gap-1 sm:gap-2 font-semibold text-slate-900 dark:text-slate-200">
          <DollarSign size={14} className="hidden sm:block" />
          <span className="text-xs sm:text-sm">{formatCurrency(order.finalAmount)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (order) => (
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrderDetail(order.id)}
            className="h-7 sm:h-8 text-xs px-2 sm:px-3"
          >
            <Eye size={12} className="sm:mr-1" />
            <span className="hidden sm:inline">View</span>
          </Button>
          {order.status === 'STORE_ACCEPTED' || order.status === 'CUSTOMER_CONFIRMED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint(order.id)}
              disabled={actionLoading === `print-${order.id}`}
              className="h-7 sm:h-8 text-xs px-2 sm:px-3"
            >
              <Printer size={12} className="sm:mr-1" />
              <span className="hidden sm:inline">{actionLoading === `print-${order.id}` ? 'Printing...' : 'Print'}</span>
            </Button>
          ) : null}
          {order.status === 'PRINTED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePushToLab(order.id)}
              disabled={actionLoading === `push-${order.id}`}
              className="h-7 sm:h-8 text-xs px-2 sm:px-3"
            >
              <Send size={12} className="sm:mr-1" />
              <span className="hidden sm:inline">{actionLoading === `push-${order.id}` ? 'Pushing...' : 'Push to Lab'}</span>
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">POS Dashboard</h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400">Manage online orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex-1 w-full">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CUSTOMER_CONFIRMED">Customer Confirmed</option>
            <option value="STORE_ACCEPTED">Store Accepted</option>
            <option value="PRINTED">Printed</option>
            <option value="PUSHED_TO_LAB">Pushed to Lab</option>
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Store</label>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
        <div className="flex h-64 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500 dark:text-slate-400">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="There are no orders matching your filters."
        />
      ) : (
        <div className="rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[800px] sm:min-w-0">
            <DataTable data={orders} columns={columns} />
          </div>
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
              <div className="text-slate-500 dark:text-slate-400">Loading order details...</div>
            </div>
          ) : (
            <div className="space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Order ID</label>
                  <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-slate-200">{selectedOrder.orderId}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</label>
                  <div className="mt-1">
                    <Badge color={getStatusBadgeColor(selectedOrder.status)}>
                      {selectedOrder.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Customer Name</label>
                  <div className="mt-1 text-slate-900 dark:text-slate-200">
                    {selectedOrder.customerName || (
                      <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Customer Phone</label>
                  <div className="mt-1 text-slate-900 dark:text-slate-200">
                    {selectedOrder.customerPhone || (
                      <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Store</label>
                  <div className="mt-1 text-slate-900 dark:text-slate-200">{selectedOrder.store?.name || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Final Amount</label>
                  <div className="mt-1 font-semibold text-lg text-slate-900 dark:text-slate-200">{formatCurrency(selectedOrder.finalAmount)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Created At</label>
                  <div className="mt-1 text-slate-900 dark:text-slate-200">{formatTime(selectedOrder.createdAt)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sales Mode</label>
                  <div className="mt-1">
                    <Badge color={selectedOrder.salesMode === 'SELF_SERVICE' ? 'blue' : 'green'}>
                      {selectedOrder.salesMode.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Frame Data */}
              {selectedOrder.frameData && typeof selectedOrder.frameData === 'object' && Object.keys(selectedOrder.frameData).length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package size={18} />
                    Frame Details
                  </h3>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-700/30 p-4 space-y-2">
                    {selectedOrder.frameData.brand && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Brand:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{String(selectedOrder.frameData.brand)}</span>
                      </div>
                    )}
                    {selectedOrder.frameData.subBrand && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Sub Brand:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{String(selectedOrder.frameData.subBrand)}</span>
                      </div>
                    )}
                    {selectedOrder.frameData.frameType && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Frame Type:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{String(selectedOrder.frameData.frameType)}</span>
                      </div>
                    )}
                    {(selectedOrder.frameData.mrp || selectedOrder.frameData.mrp === 0) && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">MRP:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(Number(selectedOrder.frameData.mrp) || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lens Data */}
              {selectedOrder.lensData && typeof selectedOrder.lensData === 'object' && Object.keys(selectedOrder.lensData).length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package size={18} />
                    Lens Details
                  </h3>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-700/30 p-4 space-y-2">
                    {selectedOrder.lensData.name && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Name:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{String(selectedOrder.lensData.name)}</span>
                      </div>
                    )}
                    {selectedOrder.lensData.brandLine && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Brand Line:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{String(selectedOrder.lensData.brandLine)}</span>
                      </div>
                    )}
                    {selectedOrder.lensData.index && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Index:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{String(selectedOrder.lensData.index).replace('INDEX_', '')}</span>
                      </div>
                    )}
                    {(selectedOrder.lensData.price || selectedOrder.lensData.price === 0) && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Price:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(Number(selectedOrder.lensData.price) || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Offer Data */}
              {selectedOrder.offerData && typeof selectedOrder.offerData === 'object' && Object.keys(selectedOrder.offerData).length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign size={18} />
                    Pricing & Offers
                  </h3>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-700/30 p-4 space-y-3">
                    {/* Price Breakdown */}
                    {(selectedOrder.offerData.frameMRP || selectedOrder.offerData.frameMRP === 0) && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Frame MRP:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{formatCurrency(Number(selectedOrder.offerData.frameMRP) || 0)}</span>
                      </div>
                    )}
                    {(selectedOrder.offerData.lensPrice || selectedOrder.offerData.lensPrice === 0) && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Lens Price:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{formatCurrency(Number(selectedOrder.offerData.lensPrice) || 0)}</span>
                      </div>
                    )}
                    {(selectedOrder.offerData.baseTotal || selectedOrder.offerData.baseTotal === 0) && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Base Total:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(Number(selectedOrder.offerData.baseTotal) || 0)}</span>
                      </div>
                    )}

                    {/* Price Components */}
                    {selectedOrder.offerData.priceComponents && Array.isArray(selectedOrder.offerData.priceComponents) && selectedOrder.offerData.priceComponents.length > 0 && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Price Components</div>
                        {selectedOrder.offerData.priceComponents.map((component: any, idx: number) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                            <span className={`text-sm ${component.amount < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                              {component.label}:
                            </span>
                            <span className={`text-sm font-medium ${component.amount < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-slate-200'}`}>
                              {component.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(Number(component.amount) || 0))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Discounts */}
                    {selectedOrder.offerData.categoryDiscount && typeof selectedOrder.offerData.categoryDiscount === 'object' && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                          <span className="text-sm text-green-600 dark:text-green-400">Category Discount:</span>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            -{formatCurrency(Number(selectedOrder.offerData.categoryDiscount.savings) || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedOrder.offerData.couponDiscount && typeof selectedOrder.offerData.couponDiscount === 'object' && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="text-sm text-green-600 dark:text-green-400">Coupon Discount:</span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          -{formatCurrency(Number(selectedOrder.offerData.couponDiscount.savings) || 0)}
                        </span>
                      </div>
                    )}

                    {/* Final Payable */}
                    {(selectedOrder.offerData.finalPayable || selectedOrder.offerData.finalPayable === 0) && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pt-3 border-t-2 border-slate-300 dark:border-slate-700">
                        <span className="text-base font-bold text-slate-900 dark:text-white">Final Payable:</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(Number(selectedOrder.offerData.finalPayable) || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                {(selectedOrder.status === 'STORE_ACCEPTED' ||
                  selectedOrder.status === 'CUSTOMER_CONFIRMED') && (
                  <Button
                    variant="primary"
                    onClick={() => handlePrint(selectedOrder.id)}
                    disabled={actionLoading === `print-${selectedOrder.id}`}
                    className="w-full sm:w-auto"
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
                    className="w-full sm:w-auto"
                  >
                    <Send size={16} className="mr-2" />
                    {actionLoading === `push-${selectedOrder.id}`
                      ? 'Pushing...'
                      : 'Push to Lab'}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full sm:w-auto"
                >
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

