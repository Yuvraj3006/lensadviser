'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Package, Plus, CheckCircle } from 'lucide-react';

interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'SOLUTION' | 'DROPS' | 'CASE' | 'KIT';
}

// Helper function to infer category from product name
function inferCategory(name: string): 'SOLUTION' | 'DROPS' | 'CASE' | 'KIT' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('solution') || lowerName.includes('cleaning') || lowerName.includes('multipurpose')) {
    return 'SOLUTION';
  }
  if (lowerName.includes('drop') || lowerName.includes('lubricat') || lowerName.includes('rewetting')) {
    return 'DROPS';
  }
  if (lowerName.includes('case') || lowerName.includes('container')) {
    return 'CASE';
  }
  if (lowerName.includes('kit') || lowerName.includes('travel')) {
    return 'KIT';
  }
  return 'SOLUTION'; // Default
}

export default function ContactLensAddOnsPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [contactLensData, setContactLensData] = useState<any>(null);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);

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
      return;
    }

    // Fetch add-ons from backend
    fetchAddOns();
  }, [sessionId, router]);

  const fetchAddOns = async () => {
    setLoading(true);
    try {
      // SECURITY: Get token from httpOnly cookie
      const { getTokenForAPI } = await import('@/lib/auth-helper');
      const token = await getTokenForAPI();
      const response = await fetch('/api/admin/products?type=ACCESSORY', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Map backend products to AddOn interface
          const mappedAddOns: AddOn[] = data.data
            .filter((p: any) => p.isActive !== false)
            .map((p: any) => ({
              id: p.id,
              name: p.name || `${p.brand?.name || 'Accessory'} ${p.type}`,
              description: p.name || 'Contact lens accessory',
              price: p.mrp || 0,
              category: inferCategory(p.name || ''),
            }));
          setAddOns(mappedAddOns);
        }
      } else {
        // Fallback to hardcoded add-ons if API fails
        setAddOns([
          {
            id: 'cl-solution-1',
            name: 'Contact Lens Solution',
            description: 'Multi-purpose solution for cleaning and storing',
            price: 299,
            category: 'SOLUTION',
          },
          {
            id: 'rewetting-drops-1',
            name: 'Rewetting Drops',
            description: 'Lubricating eye drops for comfort',
            price: 199,
            category: 'DROPS',
          },
          {
            id: 'lens-case-1',
            name: 'Lens Case',
            description: 'Travel-friendly contact lens case',
            price: 99,
            category: 'CASE',
          },
          {
            id: 'travel-kit-1',
            name: 'Travel Kit',
            description: 'Complete travel kit with solution, case, and drops',
            price: 599,
            category: 'KIT',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch add-ons:', error);
      // Fallback to hardcoded add-ons
      setAddOns([
        {
          id: 'cl-solution-1',
          name: 'Contact Lens Solution',
          description: 'Multi-purpose solution for cleaning and storing',
          price: 299,
          category: 'SOLUTION',
        },
        {
          id: 'rewetting-drops-1',
          name: 'Rewetting Drops',
          description: 'Lubricating eye drops for comfort',
          price: 199,
          category: 'DROPS',
        },
        {
          id: 'lens-case-1',
          name: 'Lens Case',
          description: 'Travel-friendly contact lens case',
          price: 99,
          category: 'CASE',
        },
        {
          id: 'travel-kit-1',
          name: 'Travel Kit',
          description: 'Complete travel kit with solution, case, and drops',
          price: 599,
          category: 'KIT',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddOn = (addOnId: string) => {
    const newSelected = new Set(selectedAddOns);
    if (newSelected.has(addOnId)) {
      newSelected.delete(addOnId);
    } else {
      newSelected.add(addOnId);
    }
    setSelectedAddOns(newSelected);
  };

  const handleNext = () => {
    // Save selected add-ons
    const selectedAddOnsList = addOns.filter(a => selectedAddOns.has(a.id));
    localStorage.setItem(`lenstrack_cl_addons_${sessionId}`, JSON.stringify(selectedAddOnsList));
    
    // Navigate to checkout
    router.push(`/questionnaire/${sessionId}/contact-lens-checkout`);
  };

  const handleSkip = () => {
    // No add-ons selected, proceed to checkout
    router.push(`/questionnaire/${sessionId}/contact-lens-checkout`);
  };

  if (!contactLensData || loading) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-slate-700 dark:border-slate-600 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
          <div className="text-white dark:text-slate-300">Loading add-ons...</div>
        </div>
      </div>
    );
  }

  const selectedAddOnsList = addOns.filter(a => selectedAddOns.has(a.id));
  const addOnsTotal = selectedAddOnsList.reduce((sum, a) => sum + a.price, 0);
  
  // Check for combo offers
  const hasSolution = selectedAddOnsList.some(a => a.category === 'SOLUTION');
  const hasCL = contactLensData !== null;
  const comboDiscount = (hasSolution && hasCL) ? 150 : 0;
  const finalAddOnsTotal = addOnsTotal - comboDiscount;

  // Group add-ons by category
  const groupedAddOns = {
    SOLUTION: addOns.filter(a => a.category === 'SOLUTION'),
    DROPS: addOns.filter(a => a.category === 'DROPS'),
    CASE: addOns.filter(a => a.category === 'CASE'),
    KIT: addOns.filter(a => a.category === 'KIT'),
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
            <Package size={24} className="sm:w-8 sm:h-8" />
            Recommended Add-ons
          </h1>
          <p className="text-slate-300 mb-6">Enhance your contact lens experience</p>

          {/* Combo Offer Banner */}
          {hasCL && (
            <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} />
                <span className="font-semibold">Special Offer: Contact Lens + Solution → ₹150 OFF</span>
              </div>
              <p className="text-sm mt-1 opacity-90">Add a solution to your order to unlock this discount!</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 space-y-6 mb-6 border border-slate-200 dark:border-slate-700">
            {/* Contact Lens Solution */}
            {groupedAddOns.SOLUTION.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Contact Lens Solution</h2>
                <div className="space-y-3">
                  {groupedAddOns.SOLUTION.map((addOn) => {
                    const isSelected = selectedAddOns.has(addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        type="button"
                        onClick={() => toggleAddOn(addOn.id)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAddOn(addOn.id)}
                                className="w-5 h-5 text-blue-500 dark:text-blue-400"
                              />
                              <h3 className="font-semibold text-slate-900 dark:text-white">{addOn.name}</h3>
                              {hasCL && isSelected && (
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded">
                                  Combo Offer Applied
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">{addOn.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900 dark:text-white">₹{addOn.price}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Eye Drops */}
            {groupedAddOns.DROPS.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Lubricating Eye Drops</h2>
                <div className="space-y-3">
                  {groupedAddOns.DROPS.map((addOn) => {
                    const isSelected = selectedAddOns.has(addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        type="button"
                        onClick={() => toggleAddOn(addOn.id)}
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
                                onChange={() => toggleAddOn(addOn.id)}
                                className="w-5 h-5 text-blue-500"
                              />
                              <h3 className="font-semibold text-slate-900">{addOn.name}</h3>
                            </div>
                            <p className="text-sm text-slate-600 ml-8">{addOn.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">₹{addOn.price}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lens Cases */}
            {groupedAddOns.CASE.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Lens Cases</h2>
                <div className="space-y-3">
                  {groupedAddOns.CASE.map((addOn) => {
                    const isSelected = selectedAddOns.has(addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        type="button"
                        onClick={() => toggleAddOn(addOn.id)}
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
                                onChange={() => toggleAddOn(addOn.id)}
                                className="w-5 h-5 text-blue-500"
                              />
                              <h3 className="font-semibold text-slate-900">{addOn.name}</h3>
                            </div>
                            <p className="text-sm text-slate-600 ml-8">{addOn.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">₹{addOn.price}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Travel Kits */}
            {groupedAddOns.KIT.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Travel Kits</h2>
                <div className="space-y-3">
                  {groupedAddOns.KIT.map((addOn) => {
                    const isSelected = selectedAddOns.has(addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        type="button"
                        onClick={() => toggleAddOn(addOn.id)}
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
                                onChange={() => toggleAddOn(addOn.id)}
                                className="w-5 h-5 text-blue-500"
                              />
                              <h3 className="font-semibold text-slate-900">{addOn.name}</h3>
                            </div>
                            <p className="text-sm text-slate-600 ml-8">{addOn.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">₹{addOn.price}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedAddOnsList.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Add-ons Subtotal:</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">₹{addOnsTotal.toLocaleString()}</span>
                </div>
                {comboDiscount > 0 && (
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span className="font-medium">Combo Discount:</span>
                    <span className="font-semibold">-₹{comboDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">Add-ons Total:</span>
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-400">₹{finalAddOnsTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/contact-lens')}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} className="flex-shrink-0" />
              <span className="truncate">Back</span>
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <span className="truncate text-xs sm:text-sm">Skip Add-ons</span>
              </Button>
              <Button
                onClick={handleNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600"
              >
                <CheckCircle size={20} className="flex-shrink-0" />
                <span className="truncate text-xs sm:text-sm">Continue to Checkout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

