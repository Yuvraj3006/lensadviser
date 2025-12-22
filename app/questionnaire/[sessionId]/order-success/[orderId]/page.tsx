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
  FileText,
  Gift
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
  secondPairData?: {
    frameMRP: number;
    brand: string;
    subBrand?: string;
    lensId: string;
    lensName: string;
    lensPrice: number;
  } | null;
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

  // Clear localStorage after order success (for next customer)
  useEffect(() => {
    if (orderData && !loading) {
      // Clear all session-related data after a short delay to ensure order is saved
      const clearTimer = setTimeout(() => {
        const keysToRemove = [
          'lenstrack_frame',
          'lenstrack_customer_details',
          'lenstrack_prescription',
          'lenstrack_lens_type',
          'lenstrack_category',
        ];
        
        // Remove all session-specific keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('lenstrack_') && 
              !key.includes('store_code') && // Keep store code
              !key.includes('language') && // Keep language preference
              !key.startsWith('lenstrack_order_')) { // Keep order data
            localStorage.removeItem(key);
          } else if (key.startsWith('combo_selection_') ||
                     key.startsWith('lenstrack_accessories_') ||
                     key.startsWith('lenstrack_tint_selection_') ||
                     key.startsWith('lenstrack_selected_lens_') ||
                     key.startsWith('lenstrack_selected_product_') ||
                     key.startsWith('lenstrack_contact_lens_') ||
                     key.startsWith('lenstrack_cl_')) {
            localStorage.removeItem(key);
          }
        });
      }, 2000); // Clear after 2 seconds

      return () => clearTimeout(clearTimer);
    }
  }, [orderData, loading]);

  const fetchOrderData = async () => {
    setLoading(true);
    try {
      // ✅ Fetch second pair data from session database
      let secondPairData: OrderData['secondPairData'] = null;
      if (sessionId) {
        try {
          const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.success && sessionData.data?.session?.secondPairData) {
              const parsed = sessionData.data.session.secondPairData as any;
              if (parsed && parsed.frameMRP && parsed.lensId && parsed.lensPrice > 0) {
                secondPairData = {
                  frameMRP: parsed.frameMRP,
                  brand: parsed.brand || 'Unknown',
                  subBrand: parsed.subBrand || undefined,
                  lensId: parsed.lensId,
                  lensName: parsed.lensName || 'Lens',
                  lensPrice: parsed.lensPrice,
                };
                console.log('[OrderSuccess] ✅ Loaded second pair data from session:', secondPairData);
              }
            }
          }
        } catch (sessionError) {
          console.warn('[OrderSuccess] Failed to fetch second pair data from session:', sessionError);
        }
      }
      
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
              offerData: order.offerData || null, // Include offer data from API
              secondPairData: secondPairData, // Include second pair data
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
      
      // ✅ Fetch second pair data from session if not already fetched
      if (!secondPairData && sessionId) {
        try {
          const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.success && sessionData.data?.session?.secondPairData) {
              const parsed = sessionData.data.session.secondPairData as any;
              if (parsed && parsed.frameMRP && parsed.lensId && parsed.lensPrice > 0) {
                secondPairData = {
                  frameMRP: parsed.frameMRP,
                  brand: parsed.brand || 'Unknown',
                  subBrand: parsed.subBrand || undefined,
                  lensId: parsed.lensId,
                  lensName: parsed.lensName || 'Lens',
                  lensPrice: parsed.lensPrice,
                };
              }
            }
          }
        } catch (sessionError) {
          console.warn('[OrderSuccess] Failed to fetch second pair data from session (fallback):', sessionError);
        }
      }
      
      if (orderInfo.id) {
        setOrderData({
          ...orderInfo,
          storeName: orderInfo.storeName || currentStoreName || undefined,
          frameData: orderInfo.frameData || frameData,
          lensData: orderInfo.lensData || { name: 'Unknown', price: 0 },
          offerData: orderInfo.offerData || null,
          secondPairData: secondPairData,
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
          secondPairData: secondPairData,
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
      
      // Generate full HTML
      const fullHTML = generateReceiptHTML(orderData);
      
      // Create a hidden iframe to render the HTML with all styles
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      // Write HTML to iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Could not access iframe document');
      }
      
      iframeDoc.open();
      iframeDoc.write(fullHTML);
      iframeDoc.close();
      
      // Wait for iframe to fully load
      await new Promise<void>((resolve) => {
        const checkLoad = () => {
          if (iframe.contentWindow?.document.readyState === 'complete') {
            // Additional wait for styles to apply
            setTimeout(() => resolve(), 500);
          } else {
            setTimeout(checkLoad, 100);
          }
        };
        checkLoad();
        // Fallback timeout
        setTimeout(() => resolve(), 3000);
      });
      
      // Get the receipt element from iframe
      const receiptElement = iframeDoc.querySelector('.receipt') as HTMLElement;
      
      if (!receiptElement) {
        document.body.removeChild(iframe);
        throw new Error('Receipt element not found in iframe');
      }

      console.log('[OrderSuccess] Receipt element found, generating PDF...');

      // Configure PDF options for A4 size (standard receipt format)
      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `Receipt_${orderData.id}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
          logging: false,
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const,
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any },
      };

      // Generate and download PDF
      await html2pdf().set(opt).from(receiptElement).save();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      
      showToast('success', 'PDF receipt downloaded successfully!');
    } catch (error) {
      console.error('[OrderSuccess] PDF download error:', error);
      showToast('error', `Failed to download PDF receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const firstPairTotal = offerResult?.baseTotal || (frameMRP + lensPrice);
    const secondPairTotal = order.secondPairData ? (order.secondPairData.frameMRP + order.secondPairData.lensPrice) : 0;
    const baseTotal = firstPairTotal + secondPairTotal;
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
              <span class="item-value discount">-₹${Math.round(offer.savings).toLocaleString('en-IN')}</span>
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
          <span class="item-value discount">-₹${Math.round(offerResult.categoryDiscount.savings).toLocaleString('en-IN')}</span>
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
          <span class="item-value discount">-₹${Math.round(offerResult.couponDiscount.savings).toLocaleString('en-IN')}</span>
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
          <span class="item-value discount">-₹${Math.round(offerResult.secondPairDiscount.savings).toLocaleString('en-IN')}</span>
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
      font-family: 'Times New Roman', 'DejaVu Serif', serif;
      padding: ${isPrintMode ? '0' : '20px'};
      background: white;
      color: #000;
      line-height: 1.6;
    }
    .receipt {
      max-width: ${isPrintMode ? '210mm' : '600px'};
      width: ${isPrintMode ? '210mm' : '100%'};
      min-height: ${isPrintMode ? '297mm' : 'auto'};
      margin: 0 auto;
      border: ${isPrintMode ? 'none' : '1px solid #ccc'};
      padding: ${isPrintMode ? '20mm' : '40px'};
      background: white;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .header h1 {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #000;
      letter-spacing: 1px;
    }
    .header .subtitle {
      font-size: 16px;
      color: #333;
      font-weight: normal;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .order-info {
      margin-bottom: 25px;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }
    .order-info-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 14px;
    }
    .order-info-label {
      font-weight: bold;
      color: #333;
      min-width: 120px;
    }
    .order-info-value {
      color: #000;
      text-align: right;
    }
    .items {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px dotted #ccc;
      font-size: 14px;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-row.discount {
      color: #059669;
      font-style: italic;
    }
    .item-label {
      font-weight: normal;
      color: #333;
      flex: 1;
    }
    .item-value {
      font-weight: bold;
      color: #000;
      text-align: right;
      min-width: 100px;
    }
    .item-value.discount {
      color: #059669;
    }
    .total-section {
      margin-top: 25px;
      padding-top: 20px;
      border-top: 2px solid #000;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 16px;
      border-bottom: 1px solid #ddd;
    }
    .final-total {
      font-size: 20px;
      font-weight: bold;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 3px double #000;
    }
    .final-total .item-label {
      font-size: 20px;
    }
    .final-total .item-value {
      font-size: 22px;
      color: #000;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 11px;
      color: #666;
      line-height: 1.8;
    }
    .price-breakdown {
      margin-top: 25px;
    }
    .offer-details {
      margin-top: 25px;
      padding: 15px;
      background: #f5f5f5;
      border: 1px solid #ddd;
    }
    .offer-details h4 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 12px;
      color: #000;
      text-transform: uppercase;
    }
    .offer-detail {
      margin: 6px 0;
      font-size: 12px;
      color: #444;
      padding-left: 15px;
    }
    .divider {
      border-top: 1px solid #ddd;
      margin: 15px 0;
    }
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      .receipt {
        border: none;
        padding: 20mm;
        max-width: 210mm;
        width: 210mm;
        min-height: 297mm;
      }
      @page {
        size: A4;
        margin: 20mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>LENSTRACK</h1>
      <p class="subtitle">TAX INVOICE / RECEIPT</p>
    </div>
    
    <div class="order-info">
      <div class="order-info-row">
        <span class="order-info-label">Invoice No.:</span>
        <span class="order-info-value">${order.id}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Date & Time:</span>
        <span class="order-info-value">${orderDate}</span>
      </div>
      ${order.storeName ? `
      <div class="order-info-row">
        <span class="order-info-label">Store Name:</span>
        <span class="order-info-value">${order.storeName}</span>
      </div>` : ''}
      ${order.customerName ? `
      <div class="order-info-row">
        <span class="order-info-label">Customer Name:</span>
        <span class="order-info-value">${order.customerName}</span>
      </div>` : ''}
      ${order.customerPhone ? `
      <div class="order-info-row">
        <span class="order-info-label">Contact No.:</span>
        <span class="order-info-value">${order.customerPhone}</span>
      </div>` : ''}
      <div class="order-info-row">
        <span class="order-info-label">Sales Mode:</span>
        <span class="order-info-value">${order.salesMode === 'STAFF_ASSISTED' ? 'POS Mode' : 'Self-Service'}</span>
      </div>
    </div>
    
    <div class="price-breakdown">
      <div class="section-title">Item Details & Price Breakdown</div>
      <div class="items">
        <div class="item-row">
          <span class="item-label">Frame (${frameDisplayName}${order.frameData.frameType ? ` - ${order.frameData.frameType.replace('_', ' ')}` : ''})</span>
          <span class="item-value">₹${Math.round(frameMRP).toLocaleString('en-IN')}</span>
        </div>
        <div class="item-row">
          <span class="item-label">Lens (${order.lensData.name}${order.lensData.index ? ` - Index ${order.lensData.index}` : ''}${order.lensData.brandLine ? ` - ${order.lensData.brandLine}` : ''})</span>
          <span class="item-value">₹${Math.round(lensPrice).toLocaleString('en-IN')}</span>
        </div>
        ${(order.lensData as any).rxAddOnBreakdown && Array.isArray((order.lensData as any).rxAddOnBreakdown) && (order.lensData as any).rxAddOnBreakdown.length > 0 ? 
          (order.lensData as any).rxAddOnBreakdown.map((addOn: any) => `
            <div class="item-row">
              <span class="item-label">${addOn.label || 'High Power Add-On'}</span>
              <span class="item-value">+₹${Math.round(addOn.charge || 0).toLocaleString('en-IN')}</span>
            </div>
          `).join('') : ''}
        ${(order.lensData as any).totalRxAddOn && (order.lensData as any).totalRxAddOn > 0 && (!(order.lensData as any).rxAddOnBreakdown || !Array.isArray((order.lensData as any).rxAddOnBreakdown) || (order.lensData as any).rxAddOnBreakdown.length === 0) ? `
          <div class="item-row">
            <span class="item-label">RX Add-On Charge</span>
            <span class="item-value">+₹${Math.round((order.lensData as any).totalRxAddOn).toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        <div class="divider"></div>
        <div class="item-row">
          <span class="item-label"><strong>1st Pair Total</strong></span>
          <span class="item-value"><strong>₹${Math.round(firstPairTotal).toLocaleString('en-IN')}</strong></span>
        </div>
        ${order.secondPairData ? `
        <div class="divider"></div>
        <div class="item-row">
          <span class="item-label">2nd Pair - Frame (${order.secondPairData.brand}${order.secondPairData.subBrand ? ` - ${order.secondPairData.subBrand}` : ''})</span>
          <span class="item-value">₹${Math.round(order.secondPairData.frameMRP).toLocaleString('en-IN')}</span>
        </div>
        <div class="item-row">
          <span class="item-label">2nd Pair - Lens (${order.secondPairData.lensName})</span>
          <span class="item-value">₹${Math.round(order.secondPairData.lensPrice).toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        <div class="divider"></div>
        <div class="item-row">
          <span class="item-label"><strong>Subtotal</strong></span>
          <span class="item-value"><strong>₹${Math.round(baseTotal).toLocaleString('en-IN')}</strong></span>
        </div>
        ${offersHTML}
        ${totalDiscount > 0 ? `
        <div class="divider"></div>
        <div class="item-row">
          <span class="item-label"><strong>Total Discount</strong></span>
          <span class="item-value discount"><strong>-₹${Math.round(totalDiscount).toLocaleString('en-IN')}</strong></span>
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
        <span class="item-label">TOTAL AMOUNT PAYABLE</span>
        <span class="item-value">₹${Math.round(finalPayable).toLocaleString('en-IN')}</span>
      </div>
    </div>
    
    ${offerDetailsHTML ? `
    <div class="offer-details">
      <h4>Terms & Conditions / Offer Details:</h4>
      ${offerDetailsHTML}
    </div>` : ''}
    
    <div class="footer">
      <p><strong>Thank you for your business!</strong></p>
      <p>This is a computer-generated invoice and does not require a signature.</p>
      <p>For any queries or complaints, please contact the store.</p>
      <p style="margin-top: 15px; font-size: 10px; color: #999;">Generated on ${new Date().toLocaleString('en-IN')}</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
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
      <div className="min-h-safe-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
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
    <div className="min-h-safe-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-50">
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

          {/* Second Pair - Frame + Lens Details (BOGO) */}
          {orderData.secondPairData && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Gift size={16} className="text-green-600 dark:text-green-400" />
                2nd Pair (BOGO Offer)
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-500/50">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Frame</h3>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{orderData.secondPairData.brand}</p>
                  {orderData.secondPairData.subBrand && (
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">{orderData.secondPairData.subBrand}</p>
                  )}
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">₹{Math.round(orderData.secondPairData.frameMRP).toLocaleString()}</p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-500/50">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Lens</h3>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{orderData.secondPairData.lensName}</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">₹{Math.round(orderData.secondPairData.lensPrice).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          {orderData.offerData && (
            <div className="mt-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Price Breakdown
              </h3>
              
              <div className="space-y-3">
                {/* Frame MRP */}
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-700">
                    Frame MRP {orderData.frameData.subBrand && `(${orderData.frameData.brand} - ${orderData.frameData.subBrand})`}
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{Math.round(orderData.offerData.frameMRP || orderData.frameData.mrp).toLocaleString()}
                  </span>
                </div>
                
                {/* Lens Price */}
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-700">
                    Lens Price ({orderData.lensData.name}{orderData.lensData.index ? ` - Index ${orderData.lensData.index}` : ''})
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{Math.round(orderData.offerData.lensPrice || orderData.lensData.price).toLocaleString()}
                  </span>
                </div>
                
                {/* RX Add-Ons */}
                {(orderData.lensData as any).rxAddOnBreakdown && Array.isArray((orderData.lensData as any).rxAddOnBreakdown) && (orderData.lensData as any).rxAddOnBreakdown.length > 0 && (
                  <>
                    {(orderData.lensData as any).rxAddOnBreakdown.map((addOn: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200">
                        <span className="text-slate-700 text-sm">{addOn.label || 'High Power Add-On'}</span>
                        <span className="font-semibold text-slate-900">+₹{Math.round(addOn.charge || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
                
                {/* Subtotal */}
                <div className="flex justify-between items-center py-2 border-b-2 border-slate-300">
                  <span className="font-semibold text-slate-900">Subtotal</span>
                  <span className="font-bold text-slate-900">
                    ₹{Math.round(orderData.offerData.baseTotal || ((orderData.offerData.frameMRP || orderData.frameData.mrp) + (orderData.offerData.lensPrice || orderData.lensData.price))).toLocaleString()}
                  </span>
                </div>
                
                {/* Discounts */}
                {orderData.offerData.offersApplied && orderData.offerData.offersApplied.length > 0 && (
                  <>
                    {orderData.offerData.offersApplied
                      .filter((offer: any) => offer.savings > 0)
                      .map((offer: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-green-700 text-sm">{offer.description || offer.ruleCode}</span>
                          <span className="font-semibold text-green-600">-₹{Math.round(offer.savings).toLocaleString()}</span>
                        </div>
                      ))}
                  </>
                )}
                
                {/* Category Discount */}
                {orderData.offerData.categoryDiscount && orderData.offerData.categoryDiscount.savings > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-green-700 text-sm">{orderData.offerData.categoryDiscount.description}</span>
                    <span className="font-semibold text-green-600">-₹{Math.round(orderData.offerData.categoryDiscount.savings).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Coupon Discount */}
                {orderData.offerData.couponDiscount && orderData.offerData.couponDiscount.savings > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-green-700 text-sm">{orderData.offerData.couponDiscount.description}</span>
                    <span className="font-semibold text-green-600">-₹{Math.round(orderData.offerData.couponDiscount.savings).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Second Pair Discount */}
                {orderData.offerData.secondPairDiscount && orderData.offerData.secondPairDiscount.savings > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-green-700 text-sm">{orderData.offerData.secondPairDiscount.description}</span>
                    <span className="font-semibold text-green-600">-₹{Math.round(orderData.offerData.secondPairDiscount.savings).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Total Discount */}
                {((orderData.offerData.baseTotal || 0) - (orderData.finalPrice || 0)) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b-2 border-slate-300">
                    <span className="font-semibold text-green-700">Total Discount</span>
                    <span className="font-bold text-green-600">
                      -₹{Math.round((orderData.offerData.baseTotal || 0) - (orderData.finalPrice || 0)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Final Total */}
              <div className="flex justify-between items-center py-4 mt-4 pt-4 border-t-2 border-slate-300 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-4">
                <span className="text-xl font-bold text-slate-900">Total Amount</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  ₹{Math.round(orderData.finalPrice).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          
          {/* Amount (fallback if no offerData) */}
          {!orderData.offerData && (
            <div className="flex justify-between items-center py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-4 border-2 border-green-200 mt-6">
              <span className="text-xl font-bold text-slate-900">Total Amount</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ₹{Math.round(orderData.finalPrice).toLocaleString()}
              </span>
            </div>
          )}
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
                // Clear ALL session data for next customer
                const keysToRemove = [
                  'lenstrack_frame',
                  'lenstrack_customer_details',
                  'lenstrack_prescription',
                  'lenstrack_lens_type',
                  'lenstrack_category',
                  'lenstrack_language',
                  'lenstrack_store_code',
                ];
                
                // Remove all session-specific keys (accessories, tint, etc.)
                Object.keys(localStorage).forEach(key => {
                  if (key.startsWith('lenstrack_') || 
                      key.startsWith('combo_selection_') ||
                      key.startsWith('lenstrack_accessories_') ||
                      key.startsWith('lenstrack_tint_selection_') ||
                      key.startsWith('lenstrack_selected_lens_') ||
                      key.startsWith('lenstrack_selected_product_') ||
                      key.startsWith('lenstrack_contact_lens_') ||
                      key.startsWith('lenstrack_cl_')) {
                    localStorage.removeItem(key);
                  }
                });
                
                // Also clear session store
                useSessionStore.getState().reset();
                
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

