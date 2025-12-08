'use client';

/**
 * Order Success Page
 * Shows order confirmation after checkout
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Download } from 'lucide-react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const reset = useLensAdvisorStore((state) => state.reset);
  const storeName = useSessionStore((state) => state.storeName);

  useEffect(() => {
    if (orderId) {
      // In a real app, fetch order details
      // For now, use data from store
      setOrder({
        id: orderId,
        finalPrice: 0,
      });
      setLoading(false);
    }
  }, [orderId]);

  const handleNewCustomer = () => {
    reset();
    router.push('/lens-advisor');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* WF-10: Large animated checkmark */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="text-green-600" size={56} />
          </div>
          
          {/* WF-10: Title */}
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Order Created Successfully!
          </h1>
        </div>

        {/* WF-10: Details */}
        <div className="bg-slate-50 rounded-lg p-6 mb-6 space-y-3">
          {orderId && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Order ID:</span>
              <span className="font-mono font-semibold text-slate-900">LT-{orderId.slice(-6).toUpperCase()}</span>
            </div>
          )}
          {storeName && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Store:</span>
              <span className="font-semibold text-slate-900">{storeName}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-300">
            <span className="text-slate-600">Frame & Lens Summary:</span>
            <span className="text-sm text-slate-700">See order details</span>
          </div>
          {order && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Amount Paid:</span>
              <span className="text-lg font-bold text-green-600">
                ₹{order.finalPrice?.toLocaleString() || '0'}
              </span>
            </div>
          )}
        </div>

        {/* WF-10: Text Block */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <p className="text-blue-900 text-center">
            Our team will now print and process your order.
          </p>
        </div>

        {/* WF-10: CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleNewCustomer}
            size="lg"
          >
            New Customer
          </Button>
          <Button
            onClick={() => window.print()}
            size="lg"
            variant="outline"
          >
            <Download size={18} className="mr-2" />
            Download/Share Summary
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}

