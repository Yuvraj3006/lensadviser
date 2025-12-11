'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Package, CheckCircle, ShoppingBag } from 'lucide-react';

interface Accessory {
  id: string;
  name: string;
  description?: string;
  price: number;
  mrp: number;
  brand?: {
    id: string;
    name: string;
  };
}

export default function AccessoriesPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;
  const [selectedAccessories, setSelectedAccessories] = useState<Set<string>>(new Set());
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [offerResult, setOfferResult] = useState<any>(null);
  const [calculatingOffers, setCalculatingOffers] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.push('/questionnaire/lens-type');
      return;
    }

    fetchAccessories();
  }, [sessionId, router]);

  // Recalculate offers when accessories selection changes (only if we have frame/lens)
  useEffect(() => {
    const frameData = localStorage.getItem('lenstrack_frame');
    const selectedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
    const productId = localStorage.getItem(`lenstrack_selected_product_${sessionId}`);
    
    // Only calculate offers if we have frame/lens or productId
    if (selectedAccessories.size > 0 && (frameData || selectedLens || productId)) {
      calculateOffers();
    } else {
      setOfferResult(null);
    }
  }, [selectedAccessories, sessionId]);

  const fetchAccessories = async () => {
    setLoading(true);
    try {
      // Get session to get storeId (optional)
      let storeId: string | null = null;
      try {
        const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.data?.storeId) {
            storeId = sessionData.data.storeId;
          }
        }
      } catch (e) {
        // Continue without storeId
      }

      // Try to fetch from public accessories API
      const url = storeId 
        ? `/api/public/accessories?storeId=${storeId}`
        : '/api/public/accessories';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAccessories(data.data);
          setLoading(false);
          return;
        }
      }

      // Fallback: Try admin API with token
      const token = localStorage.getItem('lenstrack_token');
      if (token) {
        const adminResponse = await fetch('/api/admin/products?type=ACCESSORY', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          if (adminData.success && adminData.data) {
            setAccessories(adminData.data
              .filter((p: any) => p.isActive !== false)
              .map((p: any) => ({
                id: p.id,
                name: p.name || 'Accessory',
                description: p.description || '',
                price: p.mrp || 0,
                mrp: p.mrp || 0,
                brand: p.brand,
              })));
            setLoading(false);
            return;
          }
        }
      }

      // Final fallback: Hardcoded accessories
      setAccessories([
        {
          id: 'cleaning-kit-1',
          name: 'Lens Cleaning Kit',
          description: 'Complete cleaning kit with microfiber cloth and cleaning solution',
          price: 299,
          mrp: 399,
        },
        {
          id: 'lens-case-1',
          name: 'Hard Case',
          description: 'Durable hard case for protection',
          price: 199,
          mrp: 249,
        },
        {
          id: 'microfiber-cloth-1',
          name: 'Microfiber Cloth',
          description: 'Premium microfiber cleaning cloth',
          price: 99,
          mrp: 149,
        },
        {
          id: 'anti-fog-spray-1',
          name: 'Anti-Fog Spray',
          description: 'Prevents lens fogging',
          price: 149,
          mrp: 199,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch accessories:', error);
      // Use fallback accessories
      setAccessories([
        {
          id: 'cleaning-kit-1',
          name: 'Lens Cleaning Kit',
          description: 'Complete cleaning kit with microfiber cloth and cleaning solution',
          price: 299,
          mrp: 399,
        },
        {
          id: 'lens-case-1',
          name: 'Hard Case',
          description: 'Durable hard case for protection',
          price: 199,
          mrp: 249,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const calculateOffers = async () => {
    if (selectedAccessories.size === 0) {
      setOfferResult(null);
      return;
    }

    setCalculatingOffers(true);
    try {
      // Get selected accessories
      const selectedAccessoriesList = accessories.filter(a => selectedAccessories.has(a.id));
      
      // Get productId from localStorage
      const productId = localStorage.getItem(`lenstrack_selected_product_${sessionId}`);
      
      // For standalone accessories (no frame/lens), we can't use recalculate-offers
      // Just show the subtotal without offer calculation
      if (!productId) {
        const frameData = localStorage.getItem('lenstrack_frame');
        const selectedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
        
        if (!frameData && !selectedLens) {
          // Standalone accessories - no offer calculation needed
          setCalculatingOffers(false);
          return;
        }
        
        console.warn('No productId found, skipping offer calculation');
        setCalculatingOffers(false);
        return;
      }

      // Prepare accessories array for API
      const accessoriesForAPI = selectedAccessoriesList.map(acc => ({
        type: 'ACCESSORY' as const,
        brand: acc.brand?.name || acc.name,
        mrp: acc.mrp,
        finalPrice: acc.price,
        quantity: 1,
      }));

      // Calculate offers using recalculate-offers API (includes accessories)
      const offerResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            couponCode: null,
            secondPair: null,
            accessories: accessoriesForAPI,
          }),
        }
      );

      if (offerResponse.ok) {
        const offerData = await offerResponse.json();
        if (offerData.success) {
          setOfferResult(offerData.data);
        }
      }
    } catch (error) {
      console.error('Failed to calculate offers:', error);
    } finally {
      setCalculatingOffers(false);
    }
  };

  const toggleAccessory = (accessoryId: string) => {
    const newSelected = new Set(selectedAccessories);
    if (newSelected.has(accessoryId)) {
      newSelected.delete(accessoryId);
    } else {
      newSelected.add(accessoryId);
    }
    setSelectedAccessories(newSelected);
  };

  const handleNext = async () => {
    // Save selected accessories
    const selectedAccessoriesList = accessories.filter(a => selectedAccessories.has(a.id));
    localStorage.setItem(`lenstrack_accessories_${sessionId}`, JSON.stringify(selectedAccessoriesList));
    
    // If this is a standalone accessories flow (no frame/lens), go to a simple checkout
    const frameData = localStorage.getItem('lenstrack_frame');
    const selectedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
    
    if (!frameData && !selectedLens) {
      // Standalone accessories order - navigate to a simple checkout
      if (selectedAccessoriesList.length === 0) {
        showToast('error', 'Please select at least one accessory');
        return;
      }
      // Navigate to checkout with accessories only
      router.push(`/questionnaire/${sessionId}/accessories-checkout`);
      return;
    }
    
    // Get productId from localStorage or URL
    const savedProductId = localStorage.getItem(`lenstrack_selected_product_${sessionId}`);
    if (savedProductId) {
      router.push(`/questionnaire/${sessionId}/checkout/${savedProductId}`);
    } else {
      // Try to get from offer summary
      router.push(`/questionnaire/${sessionId}/checkout`);
    }
  };

  const handleSkip = () => {
    // If this is a standalone accessories flow, just go back
    const frameData = localStorage.getItem('lenstrack_frame');
    const selectedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
    
    if (!frameData && !selectedLens) {
      router.push('/questionnaire/lens-type');
      return;
    }
    
    // No accessories selected, proceed to checkout
    const savedProductId = localStorage.getItem(`lenstrack_selected_product_${sessionId}`);
    if (savedProductId) {
      router.push(`/questionnaire/${sessionId}/checkout/${savedProductId}`);
    } else {
      router.push(`/questionnaire/${sessionId}/checkout`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <div className="text-white">Loading accessories...</div>
        </div>
      </div>
    );
  }

  const selectedAccessoriesList = accessories.filter(a => selectedAccessories.has(a.id));
  const accessoriesSubtotal = selectedAccessoriesList.reduce((sum, a) => sum + a.price, 0);
  
  // Calculate discount from offer result
  // If offer result exists, it includes accessories in the calculation
  // The discount is the difference between subtotal and what's actually charged
  let discountAmount = 0;
  let finalAccessoriesTotal = accessoriesSubtotal;
  
  if (offerResult && offerResult.offersApplied) {
    // Find offers that apply to accessories
    const accessoryOffers = offerResult.offersApplied.filter((offer: any) => 
      offer.description?.toLowerCase().includes('accessory') ||
      offer.description?.toLowerCase().includes('combo')
    );
    
    // Calculate total discount from offers
    const totalDiscount = offerResult.offersApplied.reduce((sum: number, offer: any) => 
      sum + (offer.savings || 0), 0
    );
    
    // Estimate accessories discount (proportional to accessories in total)
    if (offerResult.baseTotal > 0) {
      const accessoriesRatio = accessoriesSubtotal / offerResult.baseTotal;
      discountAmount = Math.round(totalDiscount * accessoriesRatio);
      finalAccessoriesTotal = accessoriesSubtotal - discountAmount;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Package size={32} />
            Accessories
          </h1>
          <p className="text-slate-300 mb-6">
            {(() => {
              const frameData = localStorage.getItem('lenstrack_frame');
              const selectedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
              return (!frameData && !selectedLens) 
                ? 'Select accessories for your order' 
                : 'Add accessories to complete your order';
            })()}
          </p>

          {/* Offer Banner */}
          {offerResult && offerResult.offersApplied && offerResult.offersApplied.length > 0 && (
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} />
                <span className="font-semibold">Special Offers Applied!</span>
              </div>
              <div className="mt-2 space-y-1">
                {offerResult.offersApplied.map((offer: any, idx: number) => (
                  <p key={idx} className="text-sm opacity-90">• {offer.description}</p>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 space-y-4 mb-6">
            {accessories.length === 0 ? (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600">No accessories available at the moment</p>
              </div>
            ) : (
              accessories.map((accessory) => {
                const isSelected = selectedAccessories.has(accessory.id);
                return (
                  <button
                    key={accessory.id}
                    type="button"
                    onClick={() => toggleAccessory(accessory.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAccessory(accessory.id)}
                            className="w-5 h-5 text-blue-500"
                          />
                          <h3 className="font-semibold text-slate-900">{accessory.name}</h3>
                          {accessory.brand && (
                            <span className="text-xs text-slate-500">({accessory.brand.name})</span>
                          )}
                        </div>
                        {accessory.description && (
                          <p className="text-sm text-slate-600 ml-8">{accessory.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {accessory.mrp > accessory.price && (
                          <div className="text-sm text-slate-400 line-through">₹{accessory.mrp}</div>
                        )}
                        <div className="text-lg font-bold text-slate-900">₹{accessory.price}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Summary */}
          {selectedAccessoriesList.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Accessories Subtotal:</span>
                  <span className="text-lg font-semibold text-slate-900">₹{accessoriesSubtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="font-medium">Discount:</span>
                    <span className="font-semibold">-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-slate-700 font-semibold">Accessories Total:</span>
                  <span className="text-xl font-bold text-blue-700">₹{finalAccessoriesTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                // Check if this is standalone accessories flow
                const frameData = localStorage.getItem('lenstrack_frame');
                const selectedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
                
                if (!frameData && !selectedLens) {
                  // Standalone accessories - go back to lens-type
                  router.push('/questionnaire/lens-type');
                  return;
                }
                
                // For accessories added to frame/lens order, go back appropriately
                const savedProductId = localStorage.getItem(`lenstrack_selected_product_${sessionId}`);
                if (savedProductId) {
                  router.push(`/questionnaire/${sessionId}/offer-summary/${savedProductId}`);
                } else {
                  // Try to go to recommendations, but if it fails, go to lens-type
                  router.push(`/questionnaire/${sessionId}/recommendations`);
                }
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex items-center gap-2"
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                disabled={calculatingOffers}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600"
              >
                {calculatingOffers ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <ShoppingBag size={20} />
                    Continue to Checkout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
