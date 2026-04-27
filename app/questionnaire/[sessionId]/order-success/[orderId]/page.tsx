'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import html2pdf from 'html2pdf.js';
import { 
  CheckCircle,
  Package,
  ArrowRight,
  UserPlus,
  Home,
  Share2,
  ExternalLink,
  FileText,
  Gift,
  Download
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
    secondPairProductKind?: 'EYEGLASS' | 'SUNGLASS' | 'POWER_SUNGLASS';
    lensRecipient?: 'self' | 'other';
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
  const [isOnlyLens, setIsOnlyLens] = useState(false);
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
      const clearTimer = setTimeout(async () => {
        // SECURITY: Clear encrypted sensitive data
        const { removePrescriptionData, removeCustomerDetails, removeCategoryIdProof } = await import('@/lib/secure-storage');
        removePrescriptionData();
        removeCustomerDetails();
        removeCategoryIdProof();
        
        // Remove non-sensitive session-specific keys
        const keysToRemove = [
          'lenstrack_frame',
          'lenstrack_lens_type',
          'lenstrack_category',
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
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
      // Check session category for ONLY_LENS flow
      if (sessionId) {
        try {
          const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.success && sessionData.data?.session?.category === 'ONLY_LENS') {
              setIsOnlyLens(true);
            }
          }
        } catch (e) {
          console.warn('[OrderSuccess] Failed to check session category:', e);
        }
      }
      
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
                  secondPairProductKind: parsed.secondPairProductKind,
                  lensRecipient: parsed.lensRecipient,
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
        console.error('[OrderSuccess] API fetch failed:', apiError);
        // ✅ No localStorage fallback - show error if API fails
        throw new Error('Failed to load order from API. Please refresh the page.');
      }
      
      // ✅ If we reach here, API fetch succeeded and orderData was set above
      // No need for localStorage fallback
    } catch (error: any) {
      console.error('[OrderSuccess] Error:', error);
      showToast('error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!orderData) return;
    
    // Create a new window with receipt content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Please allow popups to print receipt');
      return;
    }

    const receiptHTML = generateReceiptHTML(orderData, true, isOnlyLens); // true for print mode
    
    // SECURITY: Sanitize HTML to prevent XSS attacks
    const DOMPurify = (await import('dompurify')).default;
    const sanitizedHTML = DOMPurify.sanitize(receiptHTML, {
      ALLOWED_TAGS: ['html', 'head', 'title', 'style', 'body', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'p', 'span', 'strong', 'b', 'br', 'hr'],
      ALLOWED_ATTR: ['class', 'style', 'colspan', 'rowspan'],
    } as any);
    
    printWindow.document.write(String(sanitizedHTML));
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadReceipt = async () => {
    if (!orderData) return;
    
    try {
      // Create a temporary container for the receipt
      const receiptHTML = generateReceiptHTML(orderData, true, isOnlyLens); // true for print mode
      
      // Create a temporary div to hold the receipt content
      const tempDiv = document.createElement('div');
      // SECURITY: Sanitize HTML to prevent XSS attacks
      const DOMPurify = (await import('dompurify')).default;
      tempDiv.innerHTML = String(DOMPurify.sanitize(receiptHTML, {
        ALLOWED_TAGS: ['html', 'head', 'title', 'style', 'body', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'p', 'span', 'strong', 'b', 'br', 'hr'],
        ALLOWED_ATTR: ['class', 'style', 'colspan', 'rowspan'],
      } as any));
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
      
      // Get the receipt element
      const receiptElement = tempDiv.querySelector('.receipt') as HTMLElement;
      
      if (!receiptElement) {
        document.body.removeChild(tempDiv);
        showToast('error', 'Failed to generate receipt');
        return;
      }
      
      // Configure PDF options
      const opt: any = {
        margin: [10, 10, 10, 10],
        filename: `Receipt_${orderData.id}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      // Generate and download PDF
      html2pdf()
        .set(opt)
        .from(receiptElement)
        .save()
        .then(() => {
          // Clean up
          document.body.removeChild(tempDiv);
          showToast('success', 'Receipt downloaded successfully!');
        })
        .catch((error: any) => {
          console.error('[OrderSuccess] Download receipt error:', error);
          document.body.removeChild(tempDiv);
          showToast('error', 'Failed to download receipt. Please try printing instead.');
        });
    } catch (error) {
      console.error('[OrderSuccess] Download receipt error:', error);
      showToast('error', 'Failed to download receipt. Please try printing instead.');
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

  const generateReceiptHTML = (order: OrderData, isPrintMode: boolean = false, onlyLens: boolean = false): string => {
    const orderDate = new Date(order.createdAt);
    const formattedDate = orderDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = orderDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Extract offer breakdown if available
    const offerResult = order.offerData;
    const frameMRP = onlyLens ? 0 : (offerResult?.frameMRP || order.frameData.mrp);
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
  <title>Tax Invoice - Order ${order.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      padding: ${isPrintMode ? '0' : '20px'};
      background: white;
      color: #000;
      line-height: 1.4;
      margin: 0;
      font-size: 12px;
    }
    .receipt {
      max-width: ${isPrintMode ? '210mm' : '600px'};
      width: ${isPrintMode ? '210mm' : '100%'};
      min-height: ${isPrintMode ? '297mm' : 'auto'};
      margin: 0 auto;
      border: ${isPrintMode ? 'none' : '2px solid #e2e8f0'};
      padding: ${isPrintMode ? '15mm' : '30px'};
      background: white;
      box-sizing: border-box;
      overflow: visible;
      box-shadow: ${isPrintMode ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'};
      border-radius: ${isPrintMode ? '0' : '8px'};
    }
    .header {
      text-align: center;
      border: 3px solid #1e293b;
      border-radius: 8px;
      padding: 25px 20px;
      margin-bottom: 25px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #ffffff 100%);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    }
    .logo-section {
      text-align: center;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 5px;
      background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%);
    }
    .logo-section {
      margin-bottom: 15px;
    }
    .logo-box {
      display: inline-block;
      padding: 15px 30px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 900;
      margin: 0;
      color: #ffffff;
      letter-spacing: 3px;
      text-transform: uppercase;
      line-height: 1.2;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .header .subtitle {
      font-size: 14px;
      color: #1e293b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 10px;
      line-height: 1.4;
      padding: 8px 20px;
      background: #f1f5f9;
      border-radius: 4px;
      display: inline-block;
      border: 1px solid #cbd5e1;
    }
    .store-badge {
      margin-top: 15px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 6px;
      display: inline-block;
      box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
      text-align: center;
    }
    .store-label {
      display: block;
      font-size: 10px;
      color: #ffffff;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
      opacity: 0.95;
      line-height: 1.3;
    }
    .store-name {
      display: block;
      font-size: 16px;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      line-height: 1.3;
    }
    .order-info {
      margin-bottom: 25px;
      padding: 20px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
      transition: all 0.2s;
      min-height: 60px;
    }
    .info-icon {
      font-size: 20px;
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-radius: 6px;
      border: 1px solid #bfdbfe;
    }
    .info-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }
    .info-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.3;
    }
    .info-value {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      word-break: break-word;
      line-height: 1.4;
      overflow-wrap: break-word;
    }
    .items {
      margin-bottom: 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .section-title {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 15px;
      padding: 14px 18px;
      border-left: 5px solid #3b82f6;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #1e293b;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-radius: 6px;
      border-top: 2px solid #3b82f6;
      border-right: 2px solid #3b82f6;
      border-bottom: 2px solid #3b82f6;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
      text-align: left;
      line-height: 1.4;
    }
    .item-row {
      display: table;
      width: 100%;
      padding: 14px 16px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
      table-layout: fixed;
      border-collapse: collapse;
      background: #ffffff;
      margin: 6px 0;
      border-radius: 6px;
      transition: all 0.2s;
      min-height: 45px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .item-row:hover {
      background: #f8f9fa;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      transform: translateY(-1px);
    }
    .item-row:last-child {
      border-bottom: 1px solid #e2e8f0;
    }
    .item-row.discount {
      color: #059669;
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #10b981;
      border-left: 5px solid #10b981;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.15);
    }
    .item-label {
      display: table-cell;
      font-weight: 500;
      color: #1e293b;
      width: 65%;
      padding-right: 15px;
      vertical-align: middle;
      word-wrap: break-word;
      line-height: 1.5;
      text-align: left;
    }
    .item-value {
      display: table-cell;
      font-weight: 700;
      color: #000;
      text-align: right;
      width: 35%;
      white-space: nowrap;
      vertical-align: middle;
      padding-left: 10px;
      font-size: 13px;
    }
    .item-value.discount {
      color: #059669;
    }
    .total-section {
      margin-top: 25px;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .total-row {
      display: table;
      width: 100%;
      padding: 12px 16px;
      font-size: 13px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      table-layout: fixed;
      border-collapse: collapse;
      min-height: 45px;
      background: #ffffff;
      margin: 8px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .total-row .item-label {
      vertical-align: middle;
      font-weight: 700;
      color: #1e293b;
    }
    .total-row .item-value {
      vertical-align: middle;
      font-weight: 800;
      color: #000;
      font-size: 14px;
    }
    .final-total {
      font-size: 18px;
      font-weight: 900;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 3px solid #000;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #ffffff;
      padding: 20px 15px;
      border-radius: 6px;
      display: table;
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .final-total .item-label {
      display: table-cell;
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      width: 65%;
      padding-right: 20px;
      vertical-align: middle;
      color: #ffffff;
      text-align: left;
      line-height: 1.3;
    }
    .final-total .item-value {
      display: table-cell;
      font-size: 24px;
      color: #ffffff;
      font-weight: 900;
      text-align: right;
      width: 35%;
      vertical-align: middle;
      padding-left: 10px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
      line-height: 1.2;
    }
    .footer {
      margin-top: 35px;
      padding: 20px 15px;
      border-top: 2px solid #ddd;
      text-align: center;
      font-size: 11px;
      color: #555;
      line-height: 1.8;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-radius: 6px;
    }
    .footer p {
      margin: 8px 0;
      text-align: center;
      line-height: 1.6;
    }
    .footer p:first-child {
      font-weight: 700;
      color: #000;
      font-size: 13px;
      margin-bottom: 10px;
    }
    .price-breakdown {
      margin-top: 20px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .offer-details {
      margin-top: 20px;
      padding: 16px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.15);
    }
    .offer-details h4 {
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 12px;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid #f59e0b;
      padding-bottom: 8px;
    }
    .offer-detail {
      margin: 8px 0;
      font-size: 11px;
      color: #78350f;
      padding-left: 16px;
      line-height: 1.6;
      position: relative;
    }
    .offer-detail::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #f59e0b;
      font-weight: bold;
    }
    .divider {
      border-top: 2px dashed #cbd5e1;
      margin: 12px 0;
      width: 100%;
      display: block;
      position: relative;
    }
    .divider::before {
      content: '• • •';
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 0 10px;
      color: #94a3b8;
      font-size: 10px;
    }
    .item-row strong {
      font-weight: 600;
    }
    /* Ensure proper spacing and alignment for PDF */
    .items {
      width: 100%;
    }
    .price-breakdown {
      width: 100%;
    }
    /* Fix for PDF rendering */
    table {
      border-collapse: collapse;
      width: 100%;
    }
    /* Ensure text doesn't overflow */
    .item-label, .order-info-value {
      max-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
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
        box-shadow: none;
        border-radius: 0;
      }
      .info-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .info-item {
        padding: 8px;
        page-break-inside: avoid;
      }
      .item-row {
        page-break-inside: avoid;
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
    <!-- Header Section with Logo Area -->
    <div class="header">
      <div class="logo-section">
        <div class="logo-box">
          <h1>LENSTRACK</h1>
        </div>
        <p class="subtitle">TAX INVOICE / RECEIPT</p>
      </div>
      ${order.storeName ? `
      <div class="store-badge">
        <span class="store-label">Store</span>
        <span class="store-name">${order.storeName}</span>
      </div>` : ''}
    </div>
    
    <!-- Invoice Details Card -->
    <div class="order-info">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-icon">📄</span>
          <div class="info-content">
            <span class="info-label">Invoice No.</span>
            <span class="info-value">${order.id}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">📅</span>
          <div class="info-content">
            <span class="info-label">Date</span>
            <span class="info-value">${formattedDate}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">🕐</span>
          <div class="info-content">
            <span class="info-label">Time</span>
            <span class="info-value">${formattedTime}</span>
          </div>
        </div>
        ${order.customerName ? `
        <div class="info-item">
          <span class="info-icon">👤</span>
          <div class="info-content">
            <span class="info-label">Customer Name</span>
            <span class="info-value">${order.customerName}</span>
          </div>
        </div>` : ''}
        ${order.customerPhone ? `
        <div class="info-item">
          <span class="info-icon">📱</span>
          <div class="info-content">
            <span class="info-label">Contact No.</span>
            <span class="info-value">${order.customerPhone}</span>
          </div>
        </div>` : ''}
        <div class="info-item">
          <span class="info-icon">🏪</span>
          <div class="info-content">
            <span class="info-label">Sales Mode</span>
            <span class="info-value">${order.salesMode === 'STAFF_ASSISTED' ? 'POS Mode' : 'Self-Service'}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="price-breakdown">
      <div class="section-title">Item Details & Price Breakdown</div>
      <div class="items">
        ${!onlyLens && order.frameData.mrp > 0 && frameMRP > 0 ? `
        <div class="item-row">
          <span class="item-label">Frame (${frameDisplayName}${order.frameData.frameType ? ` - ${order.frameData.frameType.replace('_', ' ')}` : ''})</span>
          <span class="item-value">₹${Math.round(frameMRP).toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
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
        <div class="item-row" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-left: 5px solid #0284c7; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.15);">
          <span class="item-label" style="font-weight: 700; color: #0c4a6e;"><strong>${onlyLens ? 'Lens Total' : '1st Pair Total'}</strong></span>
          <span class="item-value" style="font-weight: 800; color: #0c4a6e; font-size: 14px;"><strong>₹${Math.round(firstPairTotal).toLocaleString('en-IN')}</strong></span>
        </div>
        ${!onlyLens && order.frameData.mrp > 0 && order.secondPairData ? `
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
        <div class="item-row" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-left: 5px solid #d97706;">
          <span class="item-label" style="font-weight: 700; color: #78350f;"><strong>Subtotal</strong></span>
          <span class="item-value" style="font-weight: 800; color: #78350f; font-size: 14px;"><strong>₹${Math.round(baseTotal).toLocaleString('en-IN')}</strong></span>
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
          <div className={isOnlyLens || orderData.frameData.mrp === 0 ? "grid md:grid-cols-1 gap-4 mb-6" : "grid md:grid-cols-2 gap-4 mb-6"}>
            {/* Hide frame card if only lens flow OR if frame MRP is 0 */}
            {!isOnlyLens && orderData.frameData.mrp > 0 && (
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
            )}

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
          {/* Hide second pair if only lens flow OR if frame MRP is 0 */}
          {!isOnlyLens && orderData.frameData.mrp > 0 && orderData.secondPairData && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Gift size={16} className="text-green-600 dark:text-green-400" />
                2nd Pair (BOGO Offer)
              </h3>
              {orderData.secondPairData?.secondPairProductKind && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  Type:{' '}
                  {orderData.secondPairData.secondPairProductKind === 'EYEGLASS' && 'Eyeglasses'}
                  {orderData.secondPairData.secondPairProductKind === 'SUNGLASS' && 'Sunglasses'}
                  {orderData.secondPairData.secondPairProductKind === 'POWER_SUNGLASS' && 'Power sunglasses'}
                  {orderData.secondPairData.lensRecipient && (
                    <>
                      {' '}
                      · {orderData.secondPairData.lensRecipient === 'self' ? 'Same customer' : 'Another person'}
                    </>
                  )}
                </p>
              )}
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
                {/* Frame MRP - Hide if only lens flow OR if frame MRP is 0 */}
                {!isOnlyLens && orderData.frameData.mrp > 0 && (orderData.offerData.frameMRP || 0) > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b border-slate-200">
                    <span className="text-slate-700 text-sm sm:text-base flex-1 min-w-0">
                      Frame MRP {orderData.frameData.subBrand && `(${orderData.frameData.brand} - ${orderData.frameData.subBrand})`}
                    </span>
                    <span className="font-semibold text-slate-900 text-sm sm:text-base flex-shrink-0 whitespace-nowrap">
                      ₹{Math.round(orderData.offerData.frameMRP || orderData.frameData.mrp).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {/* Lens Price */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b border-slate-200">
                  <span className="text-slate-700 text-sm sm:text-base flex-1 min-w-0">
                    Lens Price ({orderData.lensData.name}{orderData.lensData.index ? ` - Index ${orderData.lensData.index}` : ''})
                  </span>
                  <span className="font-semibold text-slate-900 text-sm sm:text-base flex-shrink-0 whitespace-nowrap">
                    ₹{Math.round(orderData.offerData.lensPrice || orderData.lensData.price).toLocaleString()}
                  </span>
                </div>
                
                {/* RX Add-Ons */}
                {(orderData.lensData as any).rxAddOnBreakdown && Array.isArray((orderData.lensData as any).rxAddOnBreakdown) && (orderData.lensData as any).rxAddOnBreakdown.length > 0 && (
                  <>
                    {(orderData.lensData as any).rxAddOnBreakdown.map((addOn: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b border-slate-200">
                        <span className="text-slate-700 text-sm flex-1 min-w-0">{addOn.label || 'High Power Add-On'}</span>
                        <span className="font-semibold text-slate-900 text-sm flex-shrink-0 whitespace-nowrap">+₹{Math.round(addOn.charge || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
                
                {/* Subtotal */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b-2 border-slate-300">
                  <span className="font-semibold text-slate-900 text-sm sm:text-base flex-1 min-w-0">Subtotal</span>
                  <span className="font-bold text-slate-900 text-sm sm:text-base flex-shrink-0 whitespace-nowrap">
                    ₹{Math.round(orderData.offerData.baseTotal || ((orderData.offerData.frameMRP || orderData.frameData.mrp) + (orderData.offerData.lensPrice || orderData.lensData.price))).toLocaleString()}
                  </span>
                </div>
                
                {/* Discounts */}
                {orderData.offerData.offersApplied && orderData.offerData.offersApplied.length > 0 && (
                  <>
                    {orderData.offerData.offersApplied
                      .filter((offer: any) => offer.savings > 0)
                      .map((offer: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b border-slate-200">
                          <span className="text-green-700 text-sm flex-1 min-w-0">{offer.description || offer.ruleCode}</span>
                          <span className="font-semibold text-green-600 text-sm flex-shrink-0 whitespace-nowrap">-₹{Math.round(offer.savings).toLocaleString()}</span>
                        </div>
                      ))}
                  </>
                )}
                
                {/* Category Discount */}
                {orderData.offerData.categoryDiscount && orderData.offerData.categoryDiscount.savings > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b border-slate-200">
                    <span className="text-green-700 text-sm flex-1 min-w-0">{orderData.offerData.categoryDiscount.description}</span>
                    <span className="font-semibold text-green-600 text-sm flex-shrink-0 whitespace-nowrap">-₹{Math.round(orderData.offerData.categoryDiscount.savings).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Coupon Discount */}
                {orderData.offerData.couponDiscount && orderData.offerData.couponDiscount.savings > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b border-slate-200">
                    <span className="text-green-700 text-sm flex-1 min-w-0">{orderData.offerData.couponDiscount.description}</span>
                    <span className="font-semibold text-green-600 text-sm flex-shrink-0 whitespace-nowrap">-₹{Math.round(orderData.offerData.couponDiscount.savings).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Second Pair Discount */}
                {orderData.offerData.secondPairDiscount && orderData.offerData.secondPairDiscount.savings > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b border-slate-200">
                    <span className="text-green-700 text-sm flex-1 min-w-0">{orderData.offerData.secondPairDiscount.description}</span>
                    <span className="font-semibold text-green-600 text-sm flex-shrink-0 whitespace-nowrap">-₹{Math.round(orderData.offerData.secondPairDiscount.savings).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Total Discount */}
                {((orderData.offerData.baseTotal || 0) - (orderData.finalPrice || 0)) > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 border-b-2 border-slate-300">
                    <span className="font-semibold text-green-700 text-sm sm:text-base flex-1 min-w-0">Total Discount</span>
                    <span className="font-bold text-green-600 text-sm sm:text-base flex-shrink-0 whitespace-nowrap">
                      -₹{Math.round((orderData.offerData.baseTotal || 0) - (orderData.finalPrice || 0)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Final Total */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 py-4 mt-4 pt-4 border-t-2 border-slate-300 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-4">
                <span className="text-lg sm:text-xl font-bold text-slate-900 flex-1 min-w-0">Total Amount</span>
                <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex-shrink-0 whitespace-nowrap">
                  ₹{Math.round(orderData.finalPrice).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          
          {/* Amount (fallback if no offerData) */}
          {!orderData.offerData && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-4 border-2 border-green-200 mt-6">
              <span className="text-lg sm:text-xl font-bold text-slate-900 flex-1 min-w-0">Total Amount</span>
              <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex-shrink-0 whitespace-nowrap">
                ₹{Math.round(orderData.finalPrice).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-white dark:bg-white rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-400 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-900 mb-4">Next Steps</h3>
          {isPOSMode ? (
            <div className="space-y-4">
              <p className="text-slate-700 dark:text-slate-900 mb-4">
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
            <p className="text-slate-700 dark:text-slate-900 text-base leading-relaxed">
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
              className="flex-1 border-2 border-slate-300 dark:border-slate-400 text-slate-700 dark:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-100 font-semibold py-4 text-base bg-white dark:bg-white"
            >
              <Download size={20} className="mr-2" />
              Download Receipt
            </Button>
            <Button
              onClick={handlePrintReceipt}
              variant="outline"
              className="flex-1 border-2 border-slate-300 dark:border-slate-400 text-slate-700 dark:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-100 font-semibold py-4 text-base bg-white dark:bg-white"
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

