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
  ExternalLink,
  FileText
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
    subBrand?: string | null;
    mrp: number;
    frameType?: string;
  };
  lensData: {
    name: string;
    price: number;
    index?: string;
    brandLine?: string;
  };
  offerData?: any; // OfferCalculationResult
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
      // Try to fetch from API first
      try {
        const response = await fetch(`/api/order/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const order = data.data;
            setOrderData({
              id: order.id,
              storeId: order.storeId,
              storeName: storeName || undefined,
              salesMode: order.salesMode,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              finalPrice: order.finalPrice,
              status: order.status,
              createdAt: order.createdAt,
              frameData: typeof order.frameData === 'string' ? JSON.parse(order.frameData) : order.frameData,
              lensData: typeof order.lensData === 'string' ? JSON.parse(order.lensData) : order.lensData,
            });
            setLoading(false);
            return;
          }
        }
      } catch (apiError) {
        console.log('[OrderSuccess] API fetch failed, using localStorage fallback');
      }

      // Fallback: get order data from localStorage
      const frameData = JSON.parse(localStorage.getItem('lenstrack_frame') || '{}');
      const orderInfo = JSON.parse(localStorage.getItem(`lenstrack_order_${orderId}`) || '{}');
      const currentStoreName = storeName || localStorage.getItem('lenstrack_store_name') || undefined;
      
      if (orderInfo.id) {
        setOrderData({
          ...orderInfo,
          storeName: orderInfo.storeName || currentStoreName || undefined,
          frameData: orderInfo.frameData || frameData,
          lensData: orderInfo.lensData || { name: 'Unknown', price: 0 },
          offerData: orderInfo.offerData || null,
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
          offerData: orderInfo.offerData || null,
        });
      }
    } catch (error: any) {
      console.error('[OrderSuccess] Error:', error);
      showToast('error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!orderData) return;
    
    // Create a new window with receipt content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Please allow popups to print receipt');
      return;
    }

    const receiptHTML = generateReceiptHTML(orderData, true); // true for print mode
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadReceipt = async () => {
    if (!orderData) return;
    
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      showToast('error', 'PDF download is only available in browser');
      return;
    }
    
    try {
      showToast('info', 'Generating PDF receipt...');
      
      // Dynamically import html2pdf only on client side
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary element with receipt content
      const receiptElement = document.createElement('div');
      receiptElement.innerHTML = generateReceiptHTML(orderData);
      receiptElement.style.position = 'absolute';
      receiptElement.style.left = '-9999px';
      document.body.appendChild(receiptElement);

      // Configure PDF options for A3 size
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Receipt_${orderData.id}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a3' as const, 
          orientation: 'portrait' as const,
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any },
      };

      // Generate and download PDF
      await html2pdf().set(opt).from(receiptElement).save();
      
      // Clean up
      document.body.removeChild(receiptElement);
      showToast('success', 'PDF receipt downloaded successfully!');
    } catch (error) {
      console.error('[OrderSuccess] PDF download error:', error);
      showToast('error', 'Failed to download PDF receipt');
    }
  };

  const getOfferExplanation = (ruleCode: string, description: string): string => {
    const codeUpper = ruleCode.toUpperCase();
    const descUpper = description.toUpperCase();
    
    if (descUpper.includes('YOPO')) return 'You pay only the higher of frame or lens.';
    if (descUpper.includes('COMBO')) return 'Special package price applied.';
    if (descUpper.includes('FREE LENS')) return 'Lens free up to specified limit; you pay only difference.';
    if (descUpper.includes('% OFF')) return 'Percentage discount applied.';
    if (descUpper.includes('FLAT')) return 'Flat discount applied.';
    if (descUpper.includes('BOGO')) return 'Buy One Get One offer applied.';
    
    return description || 'Discount applied';
  };

  const generateReceiptHTML = (order: OrderData, isPrintMode: boolean = false): string => {
    const orderDate = new Date(order.createdAt).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Extract offer breakdown if available
    const offerResult = order.offerData;
    const frameMRP = offerResult?.frameMRP || order.frameData.mrp;
    const lensPrice = offerResult?.lensPrice || order.lensData.price;
    const baseTotal = offerResult?.baseTotal || (frameMRP + lensPrice);
    const effectiveBase = offerResult?.effectiveBase || baseTotal;
    const finalPayable = order.finalPrice;
    const totalDiscount = baseTotal - finalPayable;

    // Format offers with detailed breakdown
    let offersHTML = '';
    let offerDetailsHTML = '';
    
    if (offerResult) {
      // Primary Offers
      if (offerResult.offersApplied && offerResult.offersApplied.length > 0) {
        offerResult.offersApplied.forEach((offer: any) => {
          if (offer.savings > 0) {
            const offerExplanation = getOfferExplanation(offer.ruleCode || '', offer.description || '');
            offersHTML += `
            <div class="item-row discount">
              <span class="item-label">${offer.description || offer.ruleCode}</span>
              <span class="item-value discount">-₹${Math.round(offer.savings).toLocaleString()}</span>
            </div>`;
            offerDetailsHTML += `
            <div class="offer-detail">
              <strong>${offer.description || offer.ruleCode}:</strong> ${offerExplanation}
            </div>`;
          }
        });
      }
      
      // Category Discount
      if (offerResult.categoryDiscount && offerResult.categoryDiscount.savings > 0) {
        offersHTML += `
        <div class="item-row discount">
          <span class="item-label">${offerResult.categoryDiscount.description}</span>
          <span class="item-value discount">-₹${Math.round(offerResult.categoryDiscount.savings).toLocaleString()}</span>
        </div>`;
        offerDetailsHTML += `
        <div class="offer-detail">
          <strong>Category Discount:</strong> ${offerResult.categoryDiscount.description}
        </div>`;
      }
      
      // Coupon Discount
      if (offerResult.couponDiscount && offerResult.couponDiscount.savings > 0) {
        offersHTML += `
        <div class="item-row discount">
          <span class="item-label">${offerResult.couponDiscount.description}</span>
          <span class="item-value discount">-₹${Math.round(offerResult.couponDiscount.savings).toLocaleString()}</span>
        </div>`;
        offerDetailsHTML += `
        <div class="offer-detail">
          <strong>Coupon Discount:</strong> ${offerResult.couponDiscount.description}
        </div>`;
      }
      
      // Second Pair Discount
      if (offerResult.secondPairDiscount && offerResult.secondPairDiscount.savings > 0) {
        offersHTML += `
        <div class="item-row discount">
          <span class="item-label">${offerResult.secondPairDiscount.description}</span>
          <span class="item-value discount">-₹${Math.round(offerResult.secondPairDiscount.savings).toLocaleString()}</span>
        </div>`;
        offerDetailsHTML += `
        <div class="offer-detail">
          <strong>Second Pair Discount:</strong> ${offerResult.secondPairDiscount.description}
        </div>`;
      }
    }

    const frameDisplayName = order.frameData.subBrand 
      ? `${order.frameData.brand} - ${order.frameData.subBrand}`
      : order.frameData.brand;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - Order ${order.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      padding: ${isPrintMode ? '0' : '20px'};
      background: white;
      color: #000;
    }
    .receipt {
      max-width: ${isPrintMode ? '297mm' : '600px'};
      width: ${isPrintMode ? '297mm' : '100%'};
      min-height: ${isPrintMode ? '420mm' : 'auto'};
      margin: 0 auto;
      border: ${isPrintMode ? 'none' : '2px solid #000'};
      padding: ${isPrintMode ? '15mm' : '30px'};
      background: white;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
      color: #059669;
    }
    .header p {
      font-size: 14px;
      color: #666;
    }
    .order-info {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #ddd;
    }
    .order-info p {
      margin: 5px 0;
      font-size: 14px;
    }
    .order-info strong {
      font-weight: bold;
    }
    .items {
      margin-bottom: 20px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-row.discount {
      color: #059669;
    }
    .item-label {
      font-weight: 600;
    }
    .item-value {
      font-weight: bold;
    }
    .item-value.discount {
      color: #059669;
    }
    .total-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #000;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 16px;
    }
    .final-total {
      font-size: 24px;
      font-weight: bold;
      color: #059669;
      margin-top: 10px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .price-breakdown {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .breakdown-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #059669;
    }
    .offer-details {
      margin-top: 20px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #059669;
    }
    .offer-details h4 {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #059669;
    }
    .offer-detail {
      margin: 8px 0;
      font-size: 14px;
      color: #374151;
    }
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      .receipt {
        border: none;
        padding: 15mm;
        max-width: 297mm;
        width: 297mm;
        min-height: 420mm;
      }
      @page {
        size: A3;
        margin: 15mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>LensTrack</h1>
      <p>Order Receipt</p>
    </div>
    
    <div class="order-info">
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${orderDate}</p>
      ${order.storeName ? `<p><strong>Store:</strong> ${order.storeName}</p>` : ''}
      ${order.customerName ? `<p><strong>Customer:</strong> ${order.customerName}</p>` : ''}
      ${order.customerPhone ? `<p><strong>Phone:</strong> ${order.customerPhone}</p>` : ''}
      <p><strong>Mode:</strong> ${order.salesMode === 'STAFF_ASSISTED' ? 'POS Mode' : 'Self-Service'}</p>
    </div>
    
    <div class="price-breakdown">
      <div class="breakdown-title">Price Breakdown</div>
      <div class="items">
        <div class="item-row">
          <span class="item-label">Frame MRP (${frameDisplayName}${order.frameData.frameType ? ` - ${order.frameData.frameType.replace('_', ' ')}` : ''})</span>
          <span class="item-value">₹${Math.round(frameMRP).toLocaleString()}</span>
        </div>
        <div class="item-row">
          <span class="item-label">Lens Price (${order.lensData.name}${order.lensData.index ? ` - Index ${order.lensData.index}` : ''}${order.lensData.brandLine ? ` - ${order.lensData.brandLine}` : ''})</span>
          <span class="item-value">₹${Math.round(lensPrice).toLocaleString()}</span>
        </div>
        <div class="item-row">
          <span class="item-label"><strong>Subtotal</strong></span>
          <span class="item-value"><strong>₹${Math.round(baseTotal).toLocaleString()}</strong></span>
        </div>
        ${offersHTML}
        ${totalDiscount > 0 ? `
        <div class="item-row">
          <span class="item-label"><strong>Total Discount</strong></span>
          <span class="item-value discount"><strong>-₹${Math.round(totalDiscount).toLocaleString()}</strong></span>
        </div>` : ''}
      </div>
      
      ${offerDetailsHTML ? `
      <div class="offer-details">
        <h4>Applied Offers Details:</h4>
        ${offerDetailsHTML}
      </div>` : ''}
    </div>
    
    <div class="total-section">
      <div class="total-row final-total">
        <span>Total Amount</span>
        <span>₹${Math.round(finalPayable).toLocaleString()}</span>
      </div>
    </div>
    
    <div class="footer">
      <p>Thank you for your order!</p>
      <p>For any queries, please contact the store.</p>
    </div>
  </div>
</body>
</html>
    `;
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
              {orderData.frameData.subBrand && (
                <p className="text-sm text-purple-600 font-medium mb-1">{orderData.frameData.subBrand}</p>
              )}
              {orderData.frameData.frameType && (
                <p className="text-xs text-slate-500 mb-2">{orderData.frameData.frameType.replace('_', ' ')}</p>
              )}
              <p className="text-xl font-bold text-blue-600">₹{Math.round(orderData.frameData.mrp).toLocaleString()}</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Lens</h3>
              <p className="text-lg font-bold text-slate-900 mb-1">{orderData.lensData.name}</p>
              {orderData.lensData.index && (
                <p className="text-xs text-slate-500 mb-1">Index {orderData.lensData.index}</p>
              )}
              {orderData.lensData.brandLine && (
                <p className="text-xs text-slate-500 mb-2">{orderData.lensData.brandLine}</p>
              )}
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
              onClick={handleDownloadReceipt}
              variant="outline"
              className="flex-1 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-4 text-base"
            >
              <Download size={20} className="mr-2" />
              Download Receipt
            </Button>
            <Button
              onClick={handlePrintReceipt}
              variant="outline"
              className="flex-1 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-4 text-base"
            >
              <Share2 size={20} className="mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

