'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  ShoppingCart,
  User,
  Phone,
  ArrowLeft,
  CheckCircle,
  Package,
  AlertCircle
} from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  phone?: string | null;
  role: string;
  status: string;
}

export default function AccessoriesCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;

  const storeId = useSessionStore((state) => state.storeId);
  const loggedInStaffId = useSessionStore((state) => state.staffId);
  
  const [accessories, setAccessories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(loggedInStaffId || '');
  const [assistedByName, setAssistedByName] = useState('');
  
  // Staff list
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [salesMode, setSalesMode] = useState<'SELF_SERVICE' | 'STAFF_ASSISTED'>('SELF_SERVICE');

  useEffect(() => {
    if (sessionId) {
      loadAccessories();
      if (storeId) {
        fetchStaffList();
      }
    }
  }, [sessionId, storeId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const salesModeParam = urlParams.get('mode') as 'SELF_SERVICE' | 'STAFF_ASSISTED' | null;
      setSalesMode(salesModeParam || 'SELF_SERVICE');
    }
  }, []);

  useEffect(() => {
    // Load customer details from localStorage
    const savedCustomerDetails = localStorage.getItem('lenstrack_customer_details');
    if (savedCustomerDetails) {
      try {
        const data = JSON.parse(savedCustomerDetails);
        if (data.name) setCustomerName(data.name);
        if (data.phone) setCustomerPhone(data.phone);
      } catch (e) {
        console.error('Failed to parse customer details:', e);
      }
    }
  }, []);

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

  const fetchStaffList = async () => {
    if (!storeId) return;
    
    setLoadingStaff(true);
    try {
      const response = await fetch(`/api/store/${storeId}/staff`);
      const data = await response.json();
      
      if (data.success) {
        setStaffList(data.data);
        if (salesMode === 'STAFF_ASSISTED' && loggedInStaffId) {
          const loggedInStaff = data.data.find((s: Staff) => s.id === loggedInStaffId);
          if (loggedInStaff) {
            setSelectedStaffId(loggedInStaffId);
          }
        }
      }
    } catch (error) {
      console.error('[AccessoriesCheckout] Failed to fetch staff:', error);
    } finally {
      setLoadingStaff(false);
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

    // Validate staff selection for POS mode
    if (salesMode === 'STAFF_ASSISTED' && !selectedStaffId && !assistedByName) {
      showToast('error', 'Please select the staff handling this order.');
      return;
    }

    setCreating(true);
    try {
      // Calculate total
      const accessoriesTotal = accessories.reduce((sum, acc) => sum + (acc.price || acc.mrp || 0), 0);

      // Prepare order data
      const orderData = {
        storeId,
        salesMode,
        assistedByStaffId: selectedStaffId || null,
        assistedByName: assistedByName || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        frameData: null,
        lensData: null,
        offerData: {
          baseTotal: accessoriesTotal,
          finalPayable: accessoriesTotal,
          offersApplied: [],
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
        // Store order info
        localStorage.setItem(`lenstrack_order_${data.data.id}`, JSON.stringify({
          id: data.data.id,
          storeId: data.data.storeId,
          salesMode: salesMode,
          finalPrice: data.data.finalPrice,
          status: data.data.status,
          createdAt: data.data.createdAt,
          accessories: accessories,
          offerData: orderData.offerData,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
        }));
        
        showToast('success', 'Order created successfully!');
        router.push(`/questionnaire/${sessionId}/order-success/${data.data.id}`);
      } else {
        showToast('error', data.error?.message || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('[AccessoriesCheckout] Error creating order:', error);
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

  if (accessories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-slate-800/50 backdrop-blur rounded-xl p-6 sm:p-8 border border-slate-700 shadow-lg">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">No Accessories Selected</h2>
          <p className="text-slate-400 mb-6">
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
  const isStaffRequired = salesMode === 'STAFF_ASSISTED';
  const canProceed = !isStaffRequired || selectedStaffId || assistedByName;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <ShoppingCart className="text-blue-400" size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-1">Checkout</h1>
              <p className="text-slate-400 text-xs sm:text-sm">Complete your accessories order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - Customer Details */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 sm:p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <User className="text-blue-400" size={20} />
                Customer Details
              </h2>
              
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
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  type="tel"
                />
              </div>

              {/* Staff Selection (if STAFF_ASSISTED mode) */}
              {isStaffRequired && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="text-yellow-400" size={18} />
                    Staff Information <span className="text-red-400">*</span>
                  </h3>
                  
                  {loadingStaff ? (
                    <div className="text-slate-400 text-sm">Loading staff...</div>
                  ) : (
                    <div className="space-y-4">
                      {staffList.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Select Staff
                          </label>
                          <select
                            value={selectedStaffId}
                            onChange={(e) => {
                              setSelectedStaffId(e.target.value);
                              setAssistedByName('');
                            }}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select staff member</option>
                            {staffList.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name} {staff.phone ? `(${staff.phone})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      <div className="text-center text-slate-400 text-sm">OR</div>
                      
                      <Input
                        label="Enter Staff Name Manually"
                        value={assistedByName}
                        onChange={(e) => {
                          setAssistedByName(e.target.value);
                          if (e.target.value) setSelectedStaffId('');
                        }}
                        placeholder="Enter staff name"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 sm:p-6 border border-slate-700 sticky top-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="text-blue-400" size={20} />
                Order Summary
              </h2>

              {/* Accessories List */}
              <div className="space-y-3 mb-4">
                {accessories.map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center py-2 border-b border-slate-700">
                    <div>
                      <p className="text-white font-medium">{acc.name}</p>
                      {acc.brand?.name && (
                        <p className="text-slate-400 text-sm">{acc.brand.name}</p>
                      )}
                    </div>
                    <p className="text-white font-semibold">₹{Math.round(acc.price || acc.mrp || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Subtotal</span>
                  <span className="text-white font-medium">₹{Math.round(accessoriesTotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                  <span className="text-lg font-semibold text-white">Total</span>
                  <span className="text-2xl font-bold text-blue-400">₹{Math.round(accessoriesTotal).toLocaleString()}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <Button
                onClick={handleCreateOrder}
                disabled={creating || !canProceed}
                fullWidth
                className="mt-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3"
              >
                {creating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="mr-2" />
                    Place Order
                  </>
                )}
              </Button>

              {!canProceed && (
                <p className="text-red-400 text-sm mt-2 text-center">
                  Please select staff member or enter staff name
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => router.push(`/questionnaire/${sessionId}/accessories`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Accessories
          </Button>
        </div>
      </div>
    </div>
  );
}
