'use client';

/**
 * Step 6: Checkout - Customer details + Staff selection
 * Integrated into existing flow
 */

import { useState, useEffect } from 'react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ShoppingCart, User, Phone, Users } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

export function CheckoutStep() {
  const { showToast } = useToast();
  const router = useRouter();
  
  const setCurrentStep = useLensAdvisorStore((state) => state.setCurrentStep);
  const frame = useLensAdvisorStore((state) => state.frame);
  const selectedLens = useLensAdvisorStore((state) => state.selectedLens);
  const offerResult = useLensAdvisorStore((state) => state.offerResult);
  
  const storeId = useSessionStore((state) => state.storeId);
  const salesMode = useSessionStore((state) => state.salesMode) || 'SELF_SERVICE';
  const staffId = useSessionStore((state) => state.staffId);
  const staffList = useSessionStore((state) => state.staffList);
  const setStaffId = useSessionStore((state) => state.setStaffId);
  const setStaffList = useSessionStore((state) => state.setStaffList);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffId || '');
  const [assistedByName, setAssistedByName] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch staff list if storeId is available
  useEffect(() => {
    if (storeId && staffList.length === 0) {
      fetch(`/api/store/${storeId}/staff`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStaffList(data.data);
          }
        })
        .catch(() => {
          // Silently fail - staff list is optional
        });
    }
  }, [storeId, staffList.length, setStaffList]);

  const handleCreateOrder = async () => {
    if (!frame || !selectedLens || !offerResult) {
      showToast('error', 'Please complete previous steps');
      return;
    }

    if (salesMode === 'STAFF_ASSISTED' && !selectedStaffId && !assistedByName) {
      showToast('error', 'Please select staff handling this order');
      return;
    }

    if (!storeId) {
      showToast('error', 'Store information missing');
      return;
    }

    setCreating(true);
    try {
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
          frameData: frame,
          lensData: selectedLens,
          offerData: offerResult,
          finalPrice: offerResult.finalPayable,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Confirm order
        await fetch('/api/order/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.data.id }),
        });

        showToast('success', 'Order created successfully!');
        router.push(`/order-success?id=${data.data.id}`);
      } else {
        showToast('error', data.error?.message || 'Failed to create order');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  if (!frame || !selectedLens || !offerResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingCart className="text-blue-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Checkout</h2>
            <p className="text-slate-600">Please complete previous steps first</p>
          </div>
        </div>
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WF-08/09: Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Checkout</h2>
      </div>

      {/* WF-08/09: Summary Card */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Frame:</span>
            <span className="font-medium text-slate-900">{frame.brand} (₹{frame.mrp?.toLocaleString()})</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Lens:</span>
            <span className="font-medium text-slate-900">{selectedLens.name} (₹{selectedLens.price.toLocaleString()})</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-slate-300">
            <span className="text-lg font-bold text-slate-900">Final Payable:</span>
            <span className="text-xl font-bold text-green-600">
              ₹{offerResult.finalPayable.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* WF-08/09: Customer Details (optional) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Customer Details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Name (Optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            icon={<User size={18} />}
          />
          <Input
            label="Phone (Optional)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone number"
            icon={<Phone size={18} />}
          />
        </div>
      </div>

      {/* WF-08/09: Staff Assisted */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          {salesMode === 'SELF_SERVICE' ? 'Staff Assisted (Optional)' : 'Select Staff (Required)'}
        </label>
        
        {staffList.length > 0 ? (
          <Select
            value={selectedStaffId}
            onChange={(e) => {
              setSelectedStaffId(e.target.value);
              setStaffId(e.target.value || null);
            }}
            options={[
              { value: '', label: salesMode === 'SELF_SERVICE' ? 'None' : 'Select Staff...' },
              ...staffList.map((staff) => ({
                value: staff.id,
                label: `${staff.name} (${staff.role})`,
              })),
            ]}
            required={salesMode === 'STAFF_ASSISTED'}
          />
        ) : (
          <Input
            value={assistedByName}
            onChange={(e) => setAssistedByName(e.target.value)}
            placeholder="Type name"
            required={salesMode === 'STAFF_ASSISTED'}
          />
        )}
        
        {salesMode === 'STAFF_ASSISTED' && !selectedStaffId && !assistedByName && (
          <p className="text-sm text-red-600">Please select the staff handling this order.</p>
        )}
      </div>

      {/* WF-08/09: CTA */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleCreateOrder}
          loading={creating}
          size="lg"
          disabled={salesMode === 'STAFF_ASSISTED' && !selectedStaffId && !assistedByName}
        >
          {salesMode === 'SELF_SERVICE' ? 'Confirm Order' : 'Create Order'}
        </Button>
      </div>
    </div>
  );
}

