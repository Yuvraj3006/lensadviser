'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import { 
  ShoppingCart,
  User,
  Phone,
  Users,
  ArrowLeft,
  CheckCircle,
  Eye,
  Package,
  Sparkles,
  ChevronDown,
  Gift,
  Tag,
  Percent,
  AlertCircle
} from 'lucide-react';
import { OfferCalculationResult, OfferApplied } from '@/types/offer-engine';

interface Staff {
  id: string;
  name: string;
  phone?: string | null;
  role: string;
  status: string;
}

interface CheckoutData {
  sessionId: string;
  productId: string;
  selectedLens: {
    id: string;
    name: string;
    index: string;
    price: number;
    brandLine?: string;
  };
  selectedFrame: {
    brand: string;
    subBrand?: string | null;
    mrp: number;
    frameType?: string;
  };
  offerResult: OfferCalculationResult;
  purchaseContext?: 'REGULAR' | 'COMBO' | 'YOPO';
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;
  const productId = params?.productId as string;

  // Get sales mode from session store or URL param
  const salesModeFromStore = useSessionStore((state) => state.salesMode);
  const storeId = useSessionStore((state) => state.storeId);
  const storeCode = useSessionStore((state) => state.storeCode);
  const storeName = useSessionStore((state) => state.storeName);
  const loggedInStaffId = useSessionStore((state) => state.staffId);
  
  // Determine sales mode - check URL param first, then store
  const [salesMode, setSalesMode] = useState<'SELF_SERVICE' | 'STAFF_ASSISTED'>('SELF_SERVICE');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const salesModeParam = urlParams.get('mode') as 'SELF_SERVICE' | 'STAFF_ASSISTED' | null;
      setSalesMode(salesModeParam || salesModeFromStore || 'SELF_SERVICE');
    } else {
      setSalesMode(salesModeFromStore || 'SELF_SERVICE');
    }
  }, [salesModeFromStore]);

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [accessories, setAccessories] = useState<any[]>([]);
  
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(loggedInStaffId || '');
  const [assistedByName, setAssistedByName] = useState('');
  
  // Staff list
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    // Load customer details from localStorage
    const savedCustomerDetails = localStorage.getItem('lenstrack_customer_details');
    if (savedCustomerDetails) {
      try {
        const data = JSON.parse(savedCustomerDetails);
        if (data.name) setCustomerName(data.name);
        if (data.phone) setCustomerPhone(data.phone);
      } catch (error) {
        console.error('[Checkout] Failed to parse customer details:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (sessionId && productId) {
      fetchCheckoutData();
      if (storeId) {
        fetchStaffList();
      }
    }
  }, [sessionId, productId, storeId]);

  const fetchCheckoutData = async () => {
    setLoading(true);
    try {
      // Get recommendations to find selected product
      const recommendationsResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recommendations`
      );
      
      if (!recommendationsResponse.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const recommendationsData = await recommendationsResponse.json();
      if (!recommendationsData.success) {
        throw new Error('Failed to load recommendations');
      }

      const selectedRec = recommendationsData.data.recommendations.find(
        (r: any) => r.id === productId
      );

      if (!selectedRec) {
        throw new Error('Selected product not found');
      }

      // Get frame data from localStorage
      const frameData = JSON.parse(localStorage.getItem('lenstrack_frame') || '{}');
      
      // Load accessories if any
      const savedAccessories = localStorage.getItem(`lenstrack_accessories_${sessionId}`);
      const accessoriesList = savedAccessories ? JSON.parse(savedAccessories) : [];
      setAccessories(accessoriesList);
      
      // Prepare otherItems with accessories for offer calculation
      const otherItems = accessoriesList.map((acc: any) => ({
        type: 'ACCESSORY' as const,
        brand: acc.brand?.name || acc.name,
        mrp: acc.mrp || acc.price,
        finalPrice: acc.price,
        quantity: 1,
      }));
      
      // ✅ BEST PRACTICE: Load category discount from session (database) first, then localStorage as fallback
      let customerCategory: string | null = null;
      
      // Try to get from session first (database)
      try {
        const sessionResponse = await fetch(
          `/api/public/questionnaire/sessions/${sessionId}`
        );
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.data?.session?.customerCategory) {
            customerCategory = sessionData.data.session.customerCategory;
            console.log('[Checkout] ✅ Loaded category discount from session (database):', customerCategory);
          }
        }
      } catch (sessionError) {
        console.warn('[Checkout] Could not load from session, trying localStorage...', sessionError);
      }
      
      // Fallback to localStorage if session doesn't have it
      if (!customerCategory) {
        const savedCategoryDiscount = localStorage.getItem('lenstrack_category_discount');
        if (savedCategoryDiscount) {
          try {
            const categoryData = JSON.parse(savedCategoryDiscount);
            customerCategory = categoryData.category || null;
            console.log('[Checkout] Loaded category discount from localStorage (fallback):', customerCategory);
          } catch (e) {
            console.error('[Checkout] Failed to parse saved category discount:', e);
          }
        }
      }
      
      // Calculate offers using offer engine (include accessories and category discount)
      const offersResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            couponCode: null,
            customerCategory: customerCategory,
            secondPair: null,
            accessories: otherItems.length > 0 ? otherItems : undefined,
          }),
        }
      );

      if (!offersResponse.ok) {
        throw new Error('Failed to calculate offers');
      }

      const offersData = await offersResponse.json();
      
      if (!offersData.success || !offersData.data) {
        throw new Error('Failed to load offer calculation');
      }

      const offerResult: OfferCalculationResult = offersData.data;
      const lensIndex = selectedRec.name.match(/\d+\.\d+/)?.[0] || '1.50';

      console.log('[Checkout] Offer Result:', {
        offersApplied: offerResult.offersApplied,
        categoryDiscount: offerResult.categoryDiscount,
        couponDiscount: offerResult.couponDiscount,
        finalPayable: offerResult.finalPayable,
        frameMRP: offerResult.frameMRP,
        lensPrice: offerResult.lensPrice,
      });

      setCheckoutData({
        sessionId,
        productId,
        selectedLens: {
          id: selectedRec.id,
          name: selectedRec.name,
          index: lensIndex,
          price: offerResult.lensPrice,
          brandLine: selectedRec.brand || 'Premium',
        },
        selectedFrame: {
          brand: frameData.brand || 'Unknown',
          subBrand: frameData.subCategory || null,
          mrp: offerResult.frameMRP,
          frameType: frameData.frameType,
        },
        offerResult,
      });
    } catch (error: any) {
      console.error('[Checkout] Error:', error);
      showToast('error', error.message || 'Failed to load checkout data');
      router.push(`/questionnaire/${sessionId}/recommendations`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    if (!storeId) return;
    
    setLoadingStaff(true);
    try {
      const response = await fetch(`/api/store/${storeId}/staff`);
      const data = await response.json();
      
      if (data.success) {
        setStaffList(data.data);
        // Pre-fill staff if in POS mode and logged in staff exists
        if (salesMode === 'STAFF_ASSISTED' && loggedInStaffId) {
          const loggedInStaff = data.data.find((s: Staff) => s.id === loggedInStaffId);
          if (loggedInStaff) {
            setSelectedStaffId(loggedInStaffId);
          }
        }
      }
    } catch (error) {
      console.error('[Checkout] Failed to fetch staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!checkoutData || !storeId) {
      showToast('error', 'Missing required information');
      return;
    }

    // Validate staff selection for POS mode
    if (salesMode === 'STAFF_ASSISTED' && !selectedStaffId && !assistedByName) {
      showToast('error', 'Please select the staff handling this order.');
      return;
    }

    setCreating(true);
    try {
      // Include RX add-on breakdown in lensData
      const lensDataWithAddOn = {
        ...checkoutData.selectedLens,
        rxAddOnBreakdown: checkoutData.offerResult.rxAddOnBreakdown || null,
        totalRxAddOn: checkoutData.offerResult.totalRxAddOn || null,
      };

      // Include accessories in offerData if any
      const offerDataWithAccessories = {
        ...checkoutData.offerResult,
        accessories: accessories.length > 0 ? accessories.map((acc: any) => ({
          id: acc.id,
          name: acc.name,
          price: acc.price,
          mrp: acc.mrp || acc.price,
        })) : undefined,
      };

      const response = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          salesMode,
          assistedByStaffId: selectedStaffId || null,
          assistedByName: assistedByName || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          frameData: checkoutData.selectedFrame,
          lensData: lensDataWithAddOn,
          offerData: offerDataWithAccessories,
          finalPrice: checkoutData.offerResult.finalPayable,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Track checkout completed
        const { analyticsService } = await import('@/services/analytics.service');
        await analyticsService.checkoutCompleted(
          sessionId,
          data.data.id,
          checkoutData.purchaseContext || 'REGULAR',
          data.data.finalPrice
        );
        
        // Store order info in localStorage for order success page
        localStorage.setItem(`lenstrack_order_${data.data.id}`, JSON.stringify({
          id: data.data.id,
          storeId: data.data.storeId,
          salesMode: salesMode,
          finalPrice: data.data.finalPrice,
          status: data.data.status,
          createdAt: data.data.createdAt,
          frameData: checkoutData.selectedFrame,
          lensData: lensDataWithAddOn,
          offerData: checkoutData.offerResult, // Save complete offer data
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          voucherCode: data.data.voucherCode || null, // Include voucher if issued
        }));
        
        showToast('success', 'Order created successfully!');
        router.push(`/questionnaire/${sessionId}/order-success/${data.data.id}`);
      } else {
        showToast('error', data.error?.message || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('[Checkout] Error creating order:', error);
      showToast('error', 'An error occurred while creating order');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Checkout</h2>
          <p className="text-slate-400">Preparing your order...</p>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-slate-800/50 backdrop-blur rounded-xl p-6 sm:p-8 border border-slate-700 shadow-lg">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Checkout</h2>
          <p className="text-slate-400 mb-6">
            Please go back and try again.
          </p>
          <Button 
            onClick={() => router.push(`/questionnaire/${sessionId}/offer-summary/${productId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Offer Summary
          </Button>
        </div>
      </div>
    );
  }

  const isStaffRequired = salesMode === 'STAFF_ASSISTED';
  const canProceed = !isStaffRequired || selectedStaffId || assistedByName;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <ShoppingCart className="text-blue-400" size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1">Checkout</h1>
              <p className="text-slate-400 text-sm">
                {salesMode === 'SELF_SERVICE' ? 'Self-Service Mode' : 'POS Mode'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Summary Card */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <Package size={18} className="text-blue-400" />
            </div>
            Order Summary
          </h2>
          
          <div className="space-y-4">
            {/* Frame + Lens Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Frame</h3>
                <p className="text-lg font-semibold text-white mb-1">{checkoutData.selectedFrame.brand}</p>
                {checkoutData.selectedFrame.subBrand && (
                  <p className="text-sm text-purple-300 font-medium mb-1">{checkoutData.selectedFrame.subBrand}</p>
                )}
                {checkoutData.selectedFrame.frameType && (
                  <p className="text-sm text-slate-400 mb-2">{checkoutData.selectedFrame.frameType.replace('_', ' ')}</p>
                )}
                <p className="text-xl font-semibold text-blue-400">₹{Math.round(checkoutData.selectedFrame.mrp).toLocaleString()}</p>
              </div>

              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Lens</h3>
                <p className="text-lg font-semibold text-white mb-1">{checkoutData.selectedLens.name}</p>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <span>Index {checkoutData.selectedLens.index}</span>
                  <span>•</span>
                  <span>{checkoutData.selectedLens.brandLine}</span>
                </div>
                <p className="text-xl font-semibold text-blue-400">₹{Math.round(checkoutData.selectedLens.price).toLocaleString()}</p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="py-4 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Tag className="text-blue-400" size={16} />
                Price Breakdown
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Frame MRP</span>
                  <span className="text-white font-medium">₹{Math.round(checkoutData.offerResult.frameMRP).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Lens Price</span>
                  <span className="text-white font-medium">₹{Math.round(checkoutData.offerResult.lensPrice).toLocaleString()}</span>
                </div>
                {/* Accessories */}
                {accessories.length > 0 && (
                  <>
                    {accessories.map((acc: any) => (
                      <div key={acc.id} className="flex justify-between text-sm">
                        <span className="text-slate-400">+ {acc.name}</span>
                        <span className="text-white font-medium">₹{Math.round(acc.price || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white font-medium">₹{Math.round(checkoutData.offerResult.baseTotal).toLocaleString()}</span>
                </div>
                
                {/* Applied Offers */}
                {checkoutData.offerResult.offersApplied && checkoutData.offerResult.offersApplied.length > 0 && (
                  <>
                    {checkoutData.offerResult.offersApplied.map((offer: OfferApplied, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm text-green-300">
                        <span className="flex items-center gap-1">
                          <Gift size={14} />
                          {offer.description}
                        </span>
                        <span className="font-medium">-₹{Math.round(offer.savings || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
                
                {/* Category Discount */}
                {checkoutData.offerResult.categoryDiscount && (
                  <>
                    <div className="flex justify-between text-sm text-blue-300">
                      <span className="flex items-center gap-1">
                        <Percent size={14} />
                        {checkoutData.offerResult.categoryDiscount.description}
                      </span>
                      <span className="font-medium">-₹{Math.round(checkoutData.offerResult.categoryDiscount.savings || 0).toLocaleString()}</span>
                    </div>
                    {/* Category Discount ID Verification */}
                    {(checkoutData.offerResult.categoryDiscount as any)?.verificationRequired && (
                      <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                        <p className="text-xs text-yellow-200 mb-2">
                          <AlertCircle size={14} className="inline mr-1" />
                          ID proof required for category discount
                        </p>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Store file for order creation
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                // Store base64 or file reference
                                localStorage.setItem('lenstrack_category_id_proof', JSON.stringify({
                                  fileName: file.name,
                                  fileType: file.type,
                                  fileSize: file.size,
                                  // In production, upload to server and store URL
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-xs text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Allowed: {(checkoutData.offerResult.categoryDiscount as any)?.allowedIdTypes?.join(', ') || 'Any ID'}
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {/* Coupon Discount */}
                {checkoutData.offerResult.couponDiscount && (
                  <div className="flex justify-between text-sm text-yellow-300">
                    <span className="flex items-center gap-1">
                      <Tag size={14} />
                      {checkoutData.offerResult.couponDiscount.description}
                    </span>
                    <span className="font-medium">-₹{Math.round(checkoutData.offerResult.couponDiscount.savings || 0).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Total Discount */}
                {checkoutData.offerResult.baseTotal > checkoutData.offerResult.finalPayable && (
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-600">
                    <span className="text-slate-300 font-medium">Total Discount</span>
                    <span className="text-green-400 font-bold">
                      -₹{Math.round(checkoutData.offerResult.baseTotal - checkoutData.offerResult.finalPayable).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Final Payable */}
            <div className="relative overflow-hidden flex justify-between items-center py-6 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-lg px-6 border-2 border-green-400/50 shadow-2xl transform hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 animate-pulse" />
              <div className="relative flex justify-between items-center w-full">
                <div>
                  <p className="text-green-100 text-sm font-semibold mb-1 uppercase tracking-wide">Final Payable Amount</p>
                  <p className="text-green-200 text-xs">Including all discounts & offers</p>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2 border border-white/30">
                    <span className="text-3xl md:text-4xl font-bold text-white">
                      ₹{Math.round(checkoutData.offerResult.finalPayable).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Details (Optional) */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <User size={18} className="text-blue-400" />
            </div>
            Customer Details (Optional)
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Name
              </label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Mobile Number
              </label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter mobile number"
                type="tel"
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Staff Assisted */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <Users size={18} className="text-blue-400" />
            </div>
            {isStaffRequired ? 'Select Staff (Required)' : 'Staff Assisted (Optional)'}
          </h2>
          
          {loadingStaff ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="text-sm text-slate-400 mt-2">Loading staff list...</p>
            </div>
          ) : staffList.length > 0 ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {isStaffRequired ? 'Select Staff' : 'Staff Assisted'}
                  {isStaffRequired && <span className="text-red-400 ml-1">*</span>}
                </label>
                <div className="relative">
                  <select
                    value={selectedStaffId}
                    onChange={(e) => {
                      setSelectedStaffId(e.target.value);
                      setAssistedByName(''); // Clear manual name if staff selected
                    }}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 pr-10 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required={isStaffRequired}
                  >
                    <option value="" className="bg-slate-700 text-white">
                      {isStaffRequired ? 'Select Staff...' : 'None'}
                    </option>
                    {staffList.map((staff) => (
                      <option
                        key={staff.id}
                        value={staff.id}
                        className="bg-slate-700 text-white"
                      >
                        {staff.name}{staff.role ? ` (${staff.role})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
              {!selectedStaffId && (
                <div className="pt-2">
                  <p className="text-sm text-slate-400 mb-2">Or type name:</p>
                  <input
                    value={assistedByName}
                    onChange={(e) => {
                      setAssistedByName(e.target.value);
                      setSelectedStaffId(''); // Clear staff selection if manual name entered
                    }}
                    placeholder="Type staff name"
                    required={isStaffRequired}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              )}
              {isStaffRequired && !selectedStaffId && !assistedByName && (
                <p className="text-sm text-red-400 font-medium mt-2">
                  Please select the staff handling this order.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {isStaffRequired ? 'Staff Name (Required)' : 'Staff Name (Optional)'}
                  {isStaffRequired && <span className="text-red-400 ml-1">*</span>}
                </label>
                <input
                  value={assistedByName}
                  onChange={(e) => setAssistedByName(e.target.value)}
                  placeholder="Type name"
                  required={isStaffRequired}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
              {isStaffRequired && !assistedByName && (
                <p className="text-sm text-red-400 font-medium">
                  Please select the staff handling this order.
                </p>
              )}
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => router.push(`/questionnaire/${sessionId}/offer-summary/${productId}`)}
            variant="outline"
            className="flex-1 border border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white font-medium py-3"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <Button
            onClick={handleCreateOrder}
            disabled={!canProceed || creating}
            loading={creating}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 shadow-lg hover:shadow-green-500/50 transform hover:scale-[1.02] transition-all duration-300 border-2 border-green-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <CheckCircle size={18} className="mr-2" />
            {salesMode === 'SELF_SERVICE' ? 'Confirm Order' : 'Create Order'}
          </Button>
        </div>
      </div>
    </div>
  );
}

