'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Contact, ShoppingBag, CheckCircle } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';

export default function ContactLensCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;
  const storeCode = useSessionStore((state) => state.storeCode);
  const storeId = useSessionStore((state) => state.storeId);
  const salesMode = useSessionStore((state) => state.salesMode) || 'SELF_SERVICE';
  const loggedInStaffId = useSessionStore((state) => state.staffId);
  
  const [loading, setLoading] = useState(false);
  const [contactLensData, setContactLensData] = useState<any>(null);
  const [addOns, setAddOns] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(loggedInStaffId || '');
  const [assistedByName, setAssistedByName] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.push('/questionnaire/lens-type');
      return;
    }

    // Load contact lens selection
    const saved = localStorage.getItem(`lenstrack_contact_lens_${sessionId}`);
    if (saved) {
      setContactLensData(JSON.parse(saved));
    } else {
      router.push('/questionnaire/contact-lens');
    }

    // Load add-ons if any
    const savedAddOns = localStorage.getItem(`lenstrack_cl_addons_${sessionId}`);
    if (savedAddOns) {
      setAddOns(JSON.parse(savedAddOns));
    }

    // Load customer details if available
    const customerDetails = JSON.parse(localStorage.getItem('lenstrack_customer_details') || '{}');
    setCustomerName(customerDetails?.name || '');
    setCustomerPhone(customerDetails?.phone || '');
    
    // Fetch staff list if storeId is available
    if (storeId) {
      fetchStaffList();
    }
  }, [sessionId, router, storeId]);

  const fetchStaffList = async () => {
    if (!storeId) return;
    
    setLoadingStaff(true);
    try {
      const response = await fetch(`/api/store/${storeId}/staff`);
      const data = await response.json();
      
      if (data.success) {
        setStaffList(data.data || []);
        // Pre-fill staff if in POS mode and logged in staff exists
        if (salesMode === 'STAFF_ASSISTED' && loggedInStaffId) {
          const loggedInStaff = data.data.find((s: any) => s.id === loggedInStaffId);
          if (loggedInStaff) {
            setSelectedStaffId(loggedInStaffId);
          }
        }
      }
    } catch (error) {
      console.error('[ContactLensCheckout] Failed to fetch staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!customerName || !customerPhone) {
      showToast('error', 'Please enter customer name and phone');
      return;
    }

    // Business Rule: Staff selection is mandatory for STAFF_ASSISTED mode
    if (salesMode === 'STAFF_ASSISTED' && !selectedStaffId && !assistedByName) {
      showToast('error', 'Please select the staff handling this order.');
      return;
    }

    setLoading(true);
    try {
      // Get store ID and organization ID from session
      const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      const sessionData = await sessionResponse.json();
      
      if (!sessionData.success || !sessionData.data?.storeId) {
        showToast('error', 'Session not found');
        return;
      }

      const storeId = sessionData.data.storeId;
      
      // Get store to find organizationId
      const storeResponse = await fetch(`/api/admin/stores/${storeId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lenstrack_token') || ''}`,
        },
      });
      const storeData = await storeResponse.json();
      const organizationId = storeData.data?.organizationId;

      // Load add-ons if any
      const savedAddOns = localStorage.getItem(`lenstrack_cl_addons_${sessionId}`);
      const addOns = savedAddOns ? JSON.parse(savedAddOns) : [];

      // Calculate base total
      const clTotal = contactLensData.mrp * contactLensData.quantity;
      const addOnsTotal = addOns.reduce((sum: number, a: any) => sum + a.price, 0);
      const baseTotal = clTotal + addOnsTotal;

      // Apply offers using offer engine (CONTACT_LENS_ONLY mode)
      const otherItems = [
        {
          type: 'CONTACT_LENS' as const,
          brand: contactLensData.brand,
          mrp: contactLensData.mrp,
          finalPrice: clTotal,
          quantity: contactLensData.quantity,
        },
        ...addOns.map((addOn: any) => ({
          type: 'ACCESSORY' as const,
          brand: addOn.name,
          mrp: addOn.price,
          finalPrice: addOn.price,
          quantity: 1,
        })),
      ];

      // Call offer engine for CL-only mode
      const offerResponse = await fetch('/api/offer-engine/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'CONTACT_LENS_ONLY',
          frame: null,
          lens: null,
          otherItems,
          customerCategory: sessionData.data?.customerCategory || null,
          couponCode: null,
          organizationId,
        }),
      });

      let offerData: any;
      if (offerResponse.ok) {
        const offerResult = await offerResponse.json();
        if (offerResult.success) {
          offerData = {
            offersApplied: offerResult.data.offersApplied || [],
            priceComponents: offerResult.data.priceComponents || [],
            totalSavings: offerResult.data.baseTotal - offerResult.data.finalPayable,
            baseTotal: offerResult.data.baseTotal,
            effectiveBase: offerResult.data.effectiveBase,
            finalPayable: offerResult.data.finalPayable,
            categoryDiscount: offerResult.data.categoryDiscount,
            couponDiscount: offerResult.data.couponDiscount,
          };
        } else {
          // Fallback to manual calculation
          offerData = {
            offersApplied: [],
            priceComponents: [
              { label: 'Contact Lens', amount: clTotal },
              ...addOns.map((a: any) => ({ label: a.name, amount: a.price })),
            ],
            totalSavings: 0,
            baseTotal,
            effectiveBase: baseTotal,
            finalPayable: baseTotal,
          };
        }
      } else {
        // Fallback to manual calculation
        offerData = {
          offersApplied: [],
          priceComponents: [
            { label: 'Contact Lens', amount: clTotal },
            ...addOns.map((a: any) => ({ label: a.name, amount: a.price })),
          ],
          totalSavings: 0,
          baseTotal,
          effectiveBase: baseTotal,
          finalPayable: baseTotal,
        };
      }

      // Create order with correct format
      const response = await fetch('/api/order/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          salesMode,
          assistedByStaffId: selectedStaffId || null,
          assistedByName: assistedByName || null,
          customerName,
          customerPhone,
          frameData: {}, // No frame for contact lenses
          lensData: {
            type: 'CONTACT_LENS',
            productId: contactLensData.productId,
            name: contactLensData.productName,
            brand: contactLensData.brand,
            quantity: contactLensData.quantity,
            packType: contactLensData.packType,
            price: contactLensData.mrp,
            addOns: addOns.map((a: any) => ({
              id: a.id,
              name: a.name,
              price: a.price,
            })),
          },
          offerData,
          finalPrice: offerData.finalPayable || totalPrice,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        showToast('success', 'Order placed successfully!');
        router.push(`/questionnaire/${sessionId}/order-success?orderId=${data.data.id}`);
      } else {
        showToast('error', data.error?.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      showToast('error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!contactLensData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const clTotal = contactLensData.mrp * contactLensData.quantity;
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = clTotal + addOnsTotal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <ShoppingBag size={32} />
            Checkout
          </h1>

          <div className="bg-white rounded-xl p-6 space-y-6 mb-6">
            {/* Order Summary */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Product:</span>
                  <span className="font-semibold">{contactLensData.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Brand:</span>
                  <span className="font-semibold">{contactLensData.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pack Type:</span>
                  <span className="font-semibold">{contactLensData.packType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Quantity:</span>
                  <span className="font-semibold">{contactLensData.quantity}</span>
                </div>
                {addOns.length > 0 && (
                  <>
                    <div className="flex justify-between pt-3 border-t">
                      <span className="text-slate-600">Add-ons:</span>
                      <span className="font-semibold">₹{addOnsTotal.toLocaleString()}</span>
                    </div>
                    {addOns.map((addOn) => (
                      <div key={addOn.id} className="flex justify-between text-sm">
                        <span className="text-slate-500">- {addOn.name}</span>
                        <span className="text-slate-600">₹{addOn.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-lg font-bold text-slate-900">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Customer Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Name *
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone *
                  </label>
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Staff Selection */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                {salesMode === 'SELF_SERVICE' ? 'Staff Assisted (Optional)' : 'Select Staff (Required)'}
              </h2>
              <div className="space-y-4">
                {staffList.length > 0 ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Staff Member
                      {salesMode === 'STAFF_ASSISTED' && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => {
                        setSelectedStaffId(e.target.value);
                        setAssistedByName(''); // Clear manual name if staff selected
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={salesMode === 'STAFF_ASSISTED'}
                    >
                      <option value="">
                        {salesMode === 'SELF_SERVICE' ? 'None' : 'Select Staff...'}
                      </option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}{staff.role ? ` (${staff.role})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                
                {!selectedStaffId && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Or Enter Staff Name
                      {salesMode === 'STAFF_ASSISTED' && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <Input
                      value={assistedByName}
                      onChange={(e) => {
                        setAssistedByName(e.target.value);
                        setSelectedStaffId(''); // Clear staff selection if manual name entered
                      }}
                      placeholder="Type staff name"
                      required={salesMode === 'STAFF_ASSISTED'}
                    />
                  </div>
                )}
                
                {salesMode === 'STAFF_ASSISTED' && !selectedStaffId && !assistedByName && (
                  <p className="text-sm text-red-600">Please select the staff handling this order.</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/contact-lens')}
              className="flex items-center gap-2"
            >
              ← Back
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={
                loading || 
                !customerName || 
                !customerPhone || 
                (salesMode === 'STAFF_ASSISTED' && !selectedStaffId && !assistedByName)
              }
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {loading ? 'Placing Order...' : (
                <>
                  <CheckCircle size={20} />
                  Place Order
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

