'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import { 
  CheckCircle,
  Package,
  ArrowRight,
  UserPlus,
  Home,
  Download,
  Share2,
  ExternalLink
} from 'lucide-react';

interface OrderData {
  id: string;
  storeId: string;
  storeName?: string;
  salesMode?: 'SELF_SERVICE' | 'STAFF_ASSISTED';
  customerName?: string | null;
  customerPhone?: string | null;
  finalPrice: number;
  status: string;
  createdAt: string;
  frameData: {
    brand: string;
    mrp: number;
  };
  lensData: {
    name: string;
    price: number;
  };
}

export default function OrderSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const orderId = params?.orderId as string;
  const sessionId = params?.sessionId as string;

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const storeName = useSessionStore((state) => state.storeName);

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  const fetchOrderData = async () => {
    setLoading(true);
    try {
      // For now, get order data from localStorage or reconstruct from session
      // In production, you'd fetch from API: `/api/order/${orderId}`
      const frameData = JSON.parse(localStorage.getItem('lenstrack_frame') || '{}');
      const orderInfo = JSON.parse(localStorage.getItem(`lenstrack_order_${orderId}`) || '{}');
      const currentStoreName = storeName || localStorage.getItem('lenstrack_store_name') || undefined;
      
      if (orderInfo.id) {
        setOrderData({
          ...orderInfo,
          storeName: orderInfo.storeName || currentStoreName || undefined,
        });
      } else {
        // Fallback: reconstruct from available data
        setOrderData({
          id: orderId,
          storeId: '',
          storeName: currentStoreName || undefined,
          salesMode: orderInfo.salesMode || 'SELF_SERVICE',
          finalPrice: orderInfo.finalPrice || 0,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          frameData: frameData,
          lensData: orderInfo.lensData || { name: 'Unknown', price: 0 },
        });
      }
    } catch (error: any) {
      console.error('[OrderSuccess] Error:', error);
      showToast('error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 animate-spin" 
                 style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
              <CheckCircle className="text-green-500 animate-pulse" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Order</h2>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-white rounded-2xl p-8 border-2 border-slate-200 shadow-xl">
          <div className="text-7xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Order Not Found</h2>
          <p className="text-slate-600 mb-6">
            Unable to load order details.
          </p>
          <Button 
            onClick={() => router.push('/questionnaire')}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <Home size={18} className="mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const isPOSMode = orderData?.salesMode === 'STAFF_ASSISTED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-50">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 py-12 px-6 shadow-xl">
        <div className="max-w-2xl mx-auto text-center">
          {/* Big Checkmark Illustration */}
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-in zoom-in-95 duration-500">
            <CheckCircle className="text-green-600" size={80} strokeWidth={3} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Your order has been created</h1>
          <p className="text-green-100 text-lg">Order ID: <span className="font-mono font-semibold text-white bg-white/20 px-3 py-1 rounded-lg">{orderData.id}</span></p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Order Details Card */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-8 mb-6">
          {/* Store Name */}
          {orderData.storeName && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 text-center">
              <p className="text-sm text-slate-600 mb-1">Store</p>
              <p className="text-xl font-bold text-slate-900">{orderData.storeName}</p>
            </div>
          )}

          {/* Frame + Lens Summary */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Frame</h3>
              <p className="text-lg font-bold text-slate-900 mb-1">{orderData.frameData.brand}</p>
              <p className="text-xl font-bold text-blue-600">₹{Math.round(orderData.frameData.mrp).toLocaleString()}</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Lens</h3>
              <p className="text-lg font-bold text-slate-900 mb-1">{orderData.lensData.name}</p>
              <p className="text-xl font-bold text-purple-600">₹{Math.round(orderData.lensData.price).toLocaleString()}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-4 border-2 border-green-200">
            <span className="text-xl font-bold text-slate-900">Total Amount</span>
            <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ₹{Math.round(orderData.finalPrice).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Next Steps</h3>
          {isPOSMode ? (
            <div className="space-y-4">
              <p className="text-slate-700 mb-4">
                Our staff will now print and process your order.
              </p>
              <Button
                onClick={() => {
                  // Navigate to POS order view
                  window.open(`/admin/orders/${orderData.id}`, '_blank');
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
              >
                <ExternalLink size={18} className="mr-2" />
                Click here to open this order in POS
              </Button>
            </div>
          ) : (
            <p className="text-slate-700 text-base leading-relaxed">
              Our staff will now print and process your order.
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => {
                // Clear session data and start new questionnaire
                localStorage.removeItem('lenstrack_frame');
                localStorage.removeItem('lenstrack_customer_details');
                localStorage.removeItem('lenstrack_prescription');
                router.push('/questionnaire');
              }}
              className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold py-4 text-base shadow-lg hover:shadow-xl transition-all"
            >
              <UserPlus size={20} className="mr-2" />
              New Customer
              <ArrowRight size={20} className="ml-2" />
            </Button>
            <Button
              onClick={() => {
                // Future: Download/Share Summary
                showToast('info', 'Download/Share feature coming soon!');
              }}
              variant="outline"
              className="flex-1 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-4 text-base"
            >
              <Download size={20} className="mr-2" />
              Download/Share Summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

