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
  
  // Check for combo discount
  const hasSolution = addOns.some(a => a.category === 'SOLUTION');
  const comboDiscount = hasSolution ? 150 : 0;
  const addOnsAfterDiscount = addOnsTotal - comboDiscount;
  
  // Check for quantity-based discount
  let quantityDiscount = 0;
  let quantityDiscountDesc = '';
  if (contactLensData.quantity >= 4) {
    quantityDiscount = clTotal * 0.10;
    quantityDiscountDesc = 'Buy 4+ Boxes - 10% OFF';
  } else if (contactLensData.quantity >= 2) {
    quantityDiscount = clTotal * 0.15;
    quantityDiscountDesc = 'Buy 2 Boxes - 15% OFF';
  }
  
  const clAfterDiscount = clTotal - quantityDiscount;
  const totalPrice = clAfterDiscount + addOnsAfterDiscount;
  
  // Load prescription/power data
  const finalPower = localStorage.getItem('lenstrack_cl_final_power');
  const powerData = finalPower ? JSON.parse(finalPower) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <ShoppingBag size={32} />
            Checkout
          </h1>

          <div className="bg-white rounded-xl p-6 space-y-6 mb-6">
            {/* Prescription/Power Summary */}
            {powerData && (
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Contact Lens Power</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {powerData.od?.sphere !== null && (
                    <div>
                      <span className="text-slate-600">OD (Right Eye):</span>
                      <div className="font-semibold text-slate-900">
                        {powerData.od.sphere >= 0 ? '+' : ''}{powerData.od.sphere?.toFixed(2)}
                        {powerData.od.cylinder && ` / ${powerData.od.cylinder >= 0 ? '+' : ''}${powerData.od.cylinder.toFixed(2)}`}
                        {powerData.od.axis && ` × ${powerData.od.axis}`}
                        {powerData.od.add && ` ADD +${powerData.od.add.toFixed(2)}`}
                      </div>
                    </div>
                  )}
                  {powerData.os?.sphere !== null && (
                    <div>
                      <span className="text-slate-600">OS (Left Eye):</span>
                      <div className="font-semibold text-slate-900">
                        {powerData.os.sphere >= 0 ? '+' : ''}{powerData.os.sphere?.toFixed(2)}
                        {powerData.os.cylinder && ` / ${powerData.os.cylinder >= 0 ? '+' : ''}${powerData.os.cylinder.toFixed(2)}`}
                        {powerData.os.axis && ` × ${powerData.os.axis}`}
                        {powerData.os.add && ` ADD +${powerData.os.add.toFixed(2)}`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                {/* Contact Lens Product */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Product:</span>
                    <span className="font-semibold">{contactLensData.productName}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Brand:</span>
                    <span className="font-semibold">{contactLensData.brand}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Pack Type:</span>
                    <span className="font-semibold">{contactLensData.packType}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Quantity:</span>
                    <span className="font-semibold">{contactLensData.quantity} box(es)</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold">₹{clTotal.toLocaleString()}</span>
                  </div>
                  {quantityDiscount > 0 && (
                    <div className="flex justify-between text-green-600 mt-2">
                      <span className="text-sm">{quantityDiscountDesc}:</span>
                      <span className="text-sm font-semibold">-₹{quantityDiscount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Add-ons */}
                {addOns.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-600">Add-ons:</span>
                      <span className="font-semibold">₹{addOnsTotal.toLocaleString()}</span>
                    </div>
                    {addOns.map((addOn) => (
                      <div key={addOn.id} className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">- {addOn.name}</span>
                        <span className="text-slate-600">₹{addOn.price.toLocaleString()}</span>
                      </div>
                    ))}
                    {comboDiscount > 0 && (
                      <div className="flex justify-between text-green-600 mt-2 pt-2 border-t border-slate-200">
                        <span className="text-sm">Combo Offer (CL + Solution):</span>
                        <span className="text-sm font-semibold">-₹{comboDiscount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Upsell Suggestion */}
                {contactLensData.quantity < 2 && (
                  <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600">💡</span>
                      <div>
                        <div className="font-semibold text-yellow-900 mb-1">Special Offer Available!</div>
                        <div className="text-sm text-yellow-700">
                          Add 1 more box to unlock 15% OFF on all contact lenses
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Final Total */}
                <div className="flex justify-between pt-3 border-t-2 border-slate-300">
                  <span className="text-lg font-bold text-slate-900">Total Payable:</span>
                  <span className="text-2xl font-bold text-blue-600">₹{totalPrice.toLocaleString()}</span>
                </div>
                {(quantityDiscount > 0 || comboDiscount > 0) && (
                  <div className="text-sm text-green-600 text-right">
                    You saved ₹{(quantityDiscount + comboDiscount).toLocaleString()}!
                  </div>
                )}
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

