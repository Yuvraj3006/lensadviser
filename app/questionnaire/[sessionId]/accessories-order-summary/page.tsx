'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Package,
  Printer,
  CheckCircle,
  ArrowLeft,
  ShoppingBag,
  FileText,
  Download,
  User
} from 'lucide-react';

export default function AccessoriesOrderSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;

  const storeId = useSessionStore((state) => state.storeId);
  const storeName = useSessionStore((state) => state.storeName);
  const salesMode = useSessionStore((state) => state.salesMode) || 'SELF_SERVICE';
  const loggedInStaffId = useSessionStore((state) => state.staffId);

  const [accessories, setAccessories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  useEffect(() => {
    if (sessionId) {
      loadAccessories();
      loadCustomerDetails();
    }
  }, [sessionId]);

  const loadCustomerDetails = () => {
    try {
      const savedCustomerDetails = localStorage.getItem('lenstrack_customer_details');
      console.log('[AccessoriesOrderSummary] Loading customer details:', savedCustomerDetails);
      if (savedCustomerDetails) {
        const data = JSON.parse(savedCustomerDetails);
        console.log('[AccessoriesOrderSummary] Parsed customer data:', data);
        if (data.name && data.name.trim()) {
          setCustomerName(data.name.trim());
        }
        if (data.phone && data.phone.trim()) {
          setCustomerPhone(data.phone.trim());
        }
      } else {
        console.log('[AccessoriesOrderSummary] No customer details found in localStorage');
      }
    } catch (error) {
      console.error('[AccessoriesOrderSummary] Failed to load customer details:', error);
    }
  };

  const loadAccessories = () => {
    try {
      const savedAccessories = localStorage.getItem(`lenstrack_accessories_${sessionId}`);
      if (savedAccessories) {
        const accessoriesList = JSON.parse(savedAccessories);
        setAccessories(accessoriesList);
      } else {
        showToast('error', 'No accessories selected');
        router.push(`/questionnaire/${sessionId}/accessories`);
      }
    } catch (error) {
      console.error('Failed to load accessories:', error);
      showToast('error', 'Failed to load accessories');
      router.push(`/questionnaire/${sessionId}/accessories`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!storeId) {
      showToast('error', 'Store information missing');
      return;
    }

    if (accessories.length === 0) {
      showToast('error', 'No accessories selected');
      return;
    }

    setCreating(true);
    try {
      // Get customer details from localStorage
      const savedCustomerDetails = localStorage.getItem('lenstrack_customer_details');
      let customerName = null;
      let customerPhone = null;
      if (savedCustomerDetails) {
        try {
          const data = JSON.parse(savedCustomerDetails);
          customerName = data.name || null;
          customerPhone = data.phone || null;
        } catch (e) {
          console.error('Failed to parse customer details:', e);
        }
      }

      // Calculate total
      const accessoriesTotal = accessories.reduce((sum, acc) => sum + (acc.price || acc.mrp || 0), 0);

      // Prepare order data
      const orderData = {
        storeId,
        salesMode,
        assistedByStaffId: loggedInStaffId || null,
        assistedByName: null,
        customerName: customerName,
        customerPhone: customerPhone,
        // For ACCESSORIES_ONLY orders, provide default empty objects (API will handle them)
        frameData: { brand: 'N/A', mrp: 0 },
        lensData: { brandLine: 'N/A', id: 'N/A', index: 'N/A', name: 'N/A', price: 0 },
        offerData: {
          baseTotal: accessoriesTotal,
          effectiveBase: accessoriesTotal,
          finalPayable: accessoriesTotal,
          frameMRP: 0,
          lensPrice: 0,
          offersApplied: [],
          priceComponents: accessories.map(acc => ({
            amount: acc.price || acc.mrp || 0,
            label: acc.name,
          })),
          accessories: accessories.map(acc => ({
            id: acc.id,
            name: acc.name,
            price: acc.price || acc.mrp || 0,
            mrp: acc.mrp || acc.price || 0,
          })),
        },
        orderType: 'ACCESSORIES_ONLY' as any,
        finalPrice: accessoriesTotal,
      };

      const response = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();
      
      if (data.success) {
        const createdOrderData = {
          ...orderData,
          id: data.data.id,
          createdAt: data.data.createdAt,
          status: data.data.status,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          accessories: accessories, // Include accessories in order data for receipt
        };
        
        setOrderId(data.data.id);
        setOrderData(createdOrderData);
        
        // Store order info
        localStorage.setItem(`lenstrack_order_${data.data.id}`, JSON.stringify({
          id: data.data.id,
          storeId: data.data.storeId,
          salesMode: salesMode,
          finalPrice: data.data.finalPrice,
          status: data.data.status,
          createdAt: data.data.createdAt,
          orderType: 'ACCESSORIES_ONLY',
          accessories: accessories,
          offerData: orderData.offerData,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
        }));
        
        showToast('success', 'Order created successfully!');
        
        // Automatically print receipt after order creation
        setTimeout(() => {
          printReceipt(createdOrderData);
        }, 500);
      } else {
        showToast('error', data.error?.message || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('[AccessoriesOrderSummary] Error creating order:', error);
      showToast('error', 'An error occurred while creating order');
    } finally {
      setCreating(false);
    }
  };

  const printReceipt = (order: any) => {
    if (!order || !order.id) {
      showToast('error', 'Order data not available');
      return;
    }

    // Generate receipt HTML
    const receiptHTML = generateReceiptHTML(order);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Please allow popups to print receipt');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order ${order.id}</title>
          <style>
            ${getReceiptStyles()}
          </style>
        </head>
        <body>
          ${receiptHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handlePrintReceipt = () => {
    if (!orderData) {
      showToast('error', 'Order not created yet. Please create order first.');
      return;
    }
    printReceipt(orderData);
  };

  const handleDownloadReceipt = async () => {
    if (!orderData) {
      showToast('error', 'Order not created yet. Please create order first.');
      return;
    }

    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Generate receipt HTML (same as print receipt)
      const receiptHTML = generateReceiptHTML(orderData);
      const receiptStyles = getReceiptStyles();
      
      // Create a temporary iframe to render the receipt with styles (same as print)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '400px';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      // Wait for iframe to load
      await new Promise((resolve) => {
        iframe.onload = resolve;
        iframe.src = 'about:blank';
      });
      
      // Write HTML with styles to iframe (same as print receipt)
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        showToast('error', 'Failed to generate receipt');
        return;
      }
      
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - Order ${orderData?.id || 'N/A'}</title>
            <style>
              ${receiptStyles}
            </style>
          </head>
          <body>
            ${receiptHTML}
          </body>
        </html>
      `);
      iframeDoc.close();
      
      // Wait for content to render and ensure styles are loaded
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Force style recalculation
      iframeDoc.body.style.display = 'none';
      iframeDoc.body.offsetHeight; // Trigger reflow
      iframeDoc.body.style.display = '';
      
      // Get the receipt element from iframe
      const receiptElement = iframeDoc.querySelector('.receipt') as HTMLElement;
      
      if (!receiptElement) {
        document.body.removeChild(iframe);
        showToast('error', 'Failed to generate receipt');
        return;
      }
      
      // Ensure receipt element has proper styling for PDF
      receiptElement.style.width = '400px';
      receiptElement.style.maxWidth = '400px';
      receiptElement.style.margin = '0 auto';
      receiptElement.style.backgroundColor = 'white';
      
      // Configure PDF options - optimized to match print receipt exactly with CSS support
      const opt: any = {
        margin: [0, 0, 0, 0],
        filename: `Receipt_${orderData?.id || 'order'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          width: 400,
          windowWidth: 400,
          height: receiptElement.scrollHeight,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            // Ensure styles are preserved in cloned document
            const clonedReceipt = clonedDoc.querySelector('.receipt') as HTMLElement;
            if (clonedReceipt) {
              clonedReceipt.style.width = '400px';
              clonedReceipt.style.maxWidth = '400px';
              clonedReceipt.style.margin = '0 auto';
              clonedReceipt.style.backgroundColor = 'white';
            }
          }
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', // Use A4 to match print
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
          document.body.removeChild(iframe);
          showToast('success', 'Receipt downloaded successfully!');
        })
        .catch((error: any) => {
          console.error('[AccessoriesOrderSummary] Download receipt error:', error);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          showToast('error', 'Failed to download receipt. Please try printing instead.');
        });
    } catch (error) {
      console.error('[AccessoriesOrderSummary] Download receipt error:', error);
      showToast('error', 'Failed to download receipt. Please try printing instead.');
    }
  };

  const generateReceiptHTML = (order: any) => {
    const orderAccessories = order.accessories || accessories;
    const accessoriesTotal = orderAccessories.reduce((sum: number, acc: any) => sum + (acc.price || acc.mrp || 0), 0);
    const orderDate = new Date(order.createdAt || new Date()).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <div class="receipt">
        <div class="receipt-header">
          <h1>Order Receipt</h1>
          <p class="order-id">Order ID: ${order.id}</p>
          <p class="order-date">Date: ${orderDate}</p>
          ${storeName ? `<p class="store-name">Store: ${storeName}</p>` : ''}
        </div>

        <div class="receipt-body">
          <h2>Order Items</h2>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${orderAccessories.map((acc: any) => `
                <tr>
                  <td>
                    <strong>${acc.name}</strong>
                    ${acc.brand?.name ? `<br><small>${acc.brand.name}</small>` : ''}
                  </td>
                  <td>₹${Math.round(acc.price || acc.mrp || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="receipt-total">
            <div class="total-row">
              <span>Total Amount:</span>
              <span class="total-amount">₹${Math.round(accessoriesTotal).toLocaleString()}</span>
            </div>
          </div>

          ${order.customerName ? `
            <div class="customer-info">
              <p><strong>Customer:</strong> ${order.customerName}</p>
              ${order.customerPhone ? `<p><strong>Phone:</strong> ${order.customerPhone}</p>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="receipt-footer">
          <p>Thank you for your order!</p>
        </div>
      </div>
    `;
  };

  const getReceiptStyles = () => {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: Arial, sans-serif;
        padding: 20px;
        background: white;
      }

      .receipt {
        max-width: 400px;
        margin: 0 auto;
        background: white;
        padding: 20px;
        border: 1px solid #ddd;
      }

      .receipt-header {
        text-align: center;
        border-bottom: 2px solid #333 !important;
        padding-bottom: 15px;
        margin-bottom: 20px;
      }

      .receipt-header h1 {
        font-size: 24px;
        margin-bottom: 10px;
        color: #333 !important;
        font-weight: bold;
      }

      .receipt-header p {
        font-size: 14px;
        color: #666 !important;
        margin: 5px 0;
      }

      .receipt-body h2 {
        font-size: 18px;
        margin-bottom: 15px;
        color: #333;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        border: 1px solid #ddd;
      }

      .items-table th,
      .items-table td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #ddd !important;
        border-right: 1px solid #ddd;
      }

      .items-table th {
        background: #f5f5f5 !important;
        background-color: #f5f5f5 !important;
        font-weight: bold;
        color: #333 !important;
      }

      .items-table td {
        font-size: 14px;
        color: #333 !important;
      }

      .items-table td strong {
        font-weight: bold;
        color: #333 !important;
      }

      .items-table small {
        color: #666 !important;
        font-size: 12px;
      }

      .receipt-total {
        border-top: 2px solid #333 !important;
        padding-top: 15px;
        margin-top: 20px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 18px;
        font-weight: bold;
        color: #333 !important;
      }

      .total-amount {
        color: #2563eb !important;
        font-size: 20px;
        font-weight: bold;
      }

      .customer-info {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #ddd;
      }

      .customer-info p {
        margin: 5px 0;
        font-size: 14px;
        color: #333;
      }

      .receipt-footer {
        text-align: center;
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px solid #ddd;
        color: #666;
        font-size: 14px;
      }

      @media print {
        body {
          padding: 0;
        }

        .receipt {
          border: none;
          padding: 10px;
        }
      }
    `;
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <div className="text-slate-600 dark:text-slate-300">Loading order summary...</div>
        </div>
      </div>
    );
  }

  if (accessories.length === 0) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-white dark:bg-slate-800 rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Accessories Selected</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please go back and select accessories.
          </p>
          <Button 
            onClick={() => router.push(`/questionnaire/${sessionId}/accessories`)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Accessories
          </Button>
        </div>
      </div>
    );
  }

  const accessoriesTotal = accessories.reduce((sum, acc) => sum + (acc.price || acc.mrp || 0), 0);

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/questionnaire/${sessionId}/accessories`)}
            className="mb-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <FileText size={28} className="text-blue-500" />
            Order Summary
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Review your order and create it to print receipt
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
              {/* Customer Details Section - Always Visible */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <User size={20} className="text-blue-500" />
                  Customer Details
                </h3>
                {(() => {
                  // Get customer details from state or orderData
                  const displayName = customerName || orderData?.customerName || '';
                  const displayPhone = customerPhone || orderData?.customerPhone || '';
                  
                  // If order is already created, show read-only details
                  if (orderId) {
                    if (displayName?.trim() || displayPhone?.trim()) {
                      return (
                        <div className="space-y-2">
                          {displayName?.trim() && (
                            <p className="text-slate-700 dark:text-slate-300">
                              <span className="font-medium">Name:</span> {displayName.trim()}
                            </p>
                          )}
                          {displayPhone?.trim() && (
                            <p className="text-slate-700 dark:text-slate-300">
                              <span className="font-medium">Phone:</span> {displayPhone.trim()}
                            </p>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          Customer details not provided
                        </p>
                      );
                    }
                  }
                  
                  // If order not created, show input fields
                  return (
                    <div className="space-y-4">
                      <Input
                        label="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                      />
                      <Input
                        label="Phone Number"
                        value={customerPhone}
                        onChange={(e) => {
                          // Only allow digits and limit to 10
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setCustomerPhone(value);
                        }}
                        placeholder="Enter phone number"
                        type="tel"
                        maxLength={10}
                        inputMode="numeric"
                      />
                    </div>
                  );
                })()}
              </div>

              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <ShoppingBag size={24} className="text-blue-500" />
                Order Items
              </h2>

              <div className="space-y-4">
                {accessories.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{acc.name}</h3>
                      {acc.brand?.name && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{acc.brand.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        ₹{Math.round(acc.price || acc.mrp || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Total */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{Math.round(accessoriesTotal).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg sticky top-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package size={24} className="text-blue-500" />
                Actions
              </h2>

              {!orderId ? (
                <Button
                  onClick={handleCreateOrder}
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 mb-4"
                >
                  {creating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} className="mr-2" />
                      Create Order
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                      <span className="font-semibold text-green-900 dark:text-green-300">Order Created!</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Order ID: {orderId}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handlePrintReceipt}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3"
                    >
                      <Printer size={20} className="mr-2" />
                      Print Receipt
                    </Button>
                    
                    <Button
                      onClick={handleDownloadReceipt}
                      variant="outline"
                      className="w-full"
                    >
                      <Download size={20} className="mr-2" />
                      Download Receipt
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

