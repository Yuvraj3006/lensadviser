'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Package, CheckCircle, ShoppingBag, Sparkles, Tag } from 'lucide-react';

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
  sku?: string;
  imageUrl?: string;
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
                sku: p.sku,
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
    
    // Always go to order summary for accessories (skip recommendations and offer engine)
    if (selectedAccessoriesList.length === 0) {
      showToast('error', 'Please select at least one accessory');
      return;
    }
    
    // Navigate directly to order summary (skip recommendations and checkout)
    router.push(`/questionnaire/${sessionId}/accessories-order-summary`);
  };

  const handleSkip = () => {
    // Skip accessories - go back to previous page
    const frameData = localStorage.getItem('lenstrack_frame');
    const selectedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
    
    if (!frameData && !selectedLens) {
      // Standalone accessories flow - go back to lens-type
      router.push('/questionnaire/lens-type');
      return;
    }
    
    // If there's frame/lens, go to checkout or offer summary
    const savedProductId = localStorage.getItem(`lenstrack_selected_product_${sessionId}`);
    if (savedProductId) {
      router.push(`/questionnaire/${sessionId}/checkout/${savedProductId}`);
    } else {
      // Go to offer summary if available, otherwise recommendations
      router.push(`/questionnaire/${sessionId}/recommendations`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <div className="text-slate-600 dark:text-slate-300">Loading accessories...</div>
        </div>
      </div>
    );
  }

  const selectedAccessoriesList = accessories.filter(a => selectedAccessories.has(a.id));
  const accessoriesSubtotal = selectedAccessoriesList.reduce((sum, a) => sum + a.price, 0);
  
  // Calculate discount from offer result
  let discountAmount = 0;
  let finalAccessoriesTotal = accessoriesSubtotal;
  
  if (offerResult && offerResult.offersApplied) {
    const totalDiscount = offerResult.offersApplied.reduce((sum: number, offer: any) => 
      sum + (offer.savings || 0), 0
    );
    
    if (offerResult.baseTotal > 0) {
      const accessoriesRatio = accessoriesSubtotal / offerResult.baseTotal;
      discountAmount = Math.round(totalDiscount * accessoriesRatio);
      finalAccessoriesTotal = accessoriesSubtotal - discountAmount;
    }
  }

  const isStandalone = !localStorage.getItem('lenstrack_frame') && !localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              const frameData = localStorage.getItem('lenstrack_frame');
              const selectedLens = localStorage.getItem(`lenstrack_selected_lens_${sessionId}`);
              
              if (!frameData && !selectedLens) {
                router.push('/questionnaire/lens-type');
                return;
              }
              
              const savedProductId = localStorage.getItem(`lenstrack_selected_product_${sessionId}`);
              if (savedProductId) {
                router.push(`/questionnaire/${sessionId}/offer-summary/${savedProductId}`);
              } else {
                router.push(`/questionnaire/${sessionId}/recommendations`);
              }
            }}
            className="mb-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Package size={28} className="text-blue-500" />
            Accessories
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isStandalone 
              ? 'Select accessories for your order' 
              : 'Add accessories to complete your order'}
          </p>
        </div>

        {/* Offer Banner */}
        {offerResult && offerResult.offersApplied && offerResult.offersApplied.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 mb-6 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} />
              <span className="font-semibold">Special Offers Applied!</span>
            </div>
            <div className="space-y-1">
              {offerResult.offersApplied.map((offer: any, idx: number) => (
                <p key={idx} className="text-sm opacity-90">• {offer.description}</p>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Grid */}
          <div className="lg:col-span-2">
            {accessories.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
                <Package size={64} className="mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">No accessories available at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {accessories.map((accessory) => {
                  const isSelected = selectedAccessories.has(accessory.id);
                  const discountPercent = accessory.mrp > accessory.price 
                    ? Math.round(((accessory.mrp - accessory.price) / accessory.mrp) * 100)
                    : 0;

                  return (
                    <div
                      key={accessory.id}
                      onClick={() => toggleAccessory(accessory.id)}
                      className={`relative bg-white dark:bg-slate-800 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                        isSelected
                          ? 'border-blue-500 dark:border-blue-400 shadow-lg'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className="w-8 h-8 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle size={20} className="text-white" />
                          </div>
                        </div>
                      )}

                      {/* Discount Badge */}
                      {discountPercent > 0 && (
                        <div className="absolute top-3 left-3 z-10">
                          <div className="bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Tag size={12} />
                            {discountPercent}% OFF
                          </div>
                        </div>
                      )}

                      {/* Product Image/Icon */}
                      <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-t-xl flex items-center justify-center overflow-hidden">
                        {accessory.imageUrl ? (
                          <img
                            src={accessory.imageUrl}
                            alt={accessory.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <Package size={64} className="text-blue-500 dark:text-blue-400 mb-2" />
                            <Sparkles size={24} className="text-purple-500 dark:text-purple-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <div className="mb-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-1 line-clamp-1">
                            {accessory.name}
                          </h3>
                          {accessory.brand && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              {accessory.brand.name}
                            </p>
                          )}
                          {accessory.sku && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                              SKU: {accessory.sku}
                            </p>
                          )}
                        </div>

                        {accessory.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                            {accessory.description}
                          </p>
                        )}

                        {/* Price Section */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            {accessory.mrp > accessory.price && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 line-through">
                                ₹{accessory.mrp.toLocaleString()}
                              </p>
                            )}
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                              ₹{accessory.price.toLocaleString()}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-500 dark:bg-blue-400 border-blue-500 dark:border-blue-400'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && (
                              <CheckCircle size={16} className="text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sticky top-6 shadow-lg">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <ShoppingBag size={24} className="text-blue-500" />
                Cart Summary
              </h2>

              {selectedAccessoriesList.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={48} className="mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No accessories selected</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {selectedAccessoriesList.map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {acc.name}
                          </p>
                          {acc.brand && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {acc.brand.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            ₹{acc.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 text-sm">Subtotal:</span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        ₹{accessoriesSubtotal.toLocaleString()}
                      </span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                        <span className="text-sm font-medium">Discount:</span>
                        <span className="font-semibold">-₹{discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-900 dark:text-white font-semibold">Total:</span>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        ₹{finalAccessoriesTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <Button
                  onClick={handleNext}
                  disabled={calculatingOffers || selectedAccessoriesList.length === 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  {calculatingOffers ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={20} className="mr-2" />
                      {isStandalone ? 'Proceed to Checkout' : 'Continue to Checkout'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="w-full"
                >
                  {isStandalone ? 'Back' : 'Skip'}
                </Button>
              </div>

              {/* Selection Count */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Selected Items</span>
                  <span className="font-semibold">{selectedAccessoriesList.length} / {accessories.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
