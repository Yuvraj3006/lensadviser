'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Contact, GitCompare as CompareIcon, X } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { ContactLensRecommendationCard } from '@/components/contact-lens/ContactLensRecommendationCard';
import { ComparisonTable } from '@/components/contact-lens/ComparisonTable';

type PackType = 'DAILY' | 'MONTHLY' | 'YEARLY';

interface Recommendation {
  type: 'BEST_MATCH' | 'PREMIUM_COMFORT' | 'VALUE' | 'BUDGET';
  product: {
    id: string;
    name: string;
    brand: string;
    line: string;
    mrp: number;
    offerPrice: number;
    modality: string;
    lensType: string;
    material: string;
    waterContent: string;
    packSize: number;
    matchScore: number;
    comfortScore: number;
    isColorLens?: boolean;
    colorOptions?: string[];
    powerRange?: any;
  };
}

export default function ContactLensPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const storeCode = useSessionStore((state) => state.storeCode);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [comparedProducts, setComparedProducts] = useState<any[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showPackSelection, setShowPackSelection] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PackType>('MONTHLY');
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>('');

  useEffect(() => {
    // Verify Contact Lens is selected
    const savedLensType = localStorage.getItem('lenstrack_lens_type');
    if (savedLensType !== 'CONTACT_LENSES') {
      router.push('/questionnaire/lens-type');
      return;
    }

    // Verify power is entered
    const finalPower = localStorage.getItem('lenstrack_cl_final_power');
    if (!finalPower) {
      router.push('/questionnaire/contact-lens/power-input-method');
      return;
    }

    // Verify questionnaire is completed
    const questionnaire = localStorage.getItem('lenstrack_cl_questionnaire');
    if (!questionnaire) {
      router.push('/questionnaire/contact-lens/questionnaire');
      return;
    }
    
    fetchRecommendations();
  }, [router]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const finalPower = localStorage.getItem('lenstrack_cl_final_power');
      const questionnaire = localStorage.getItem('lenstrack_cl_questionnaire');
      
      if (!finalPower || !questionnaire) {
        router.push('/questionnaire/contact-lens/questionnaire');
        return;
      }

      const powerData = JSON.parse(finalPower);
      const questionnaireData = JSON.parse(questionnaire);

      const response = await fetch('/api/contact-lens/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactLensPower: {
            odSphere: powerData.od?.sphere,
            odCylinder: powerData.od?.cylinder,
            odAxis: powerData.od?.axis,
            odAdd: powerData.od?.add,
            osSphere: powerData.os?.sphere,
            osCylinder: powerData.os?.cylinder,
            osAxis: powerData.os?.axis,
            osAdd: powerData.os?.add,
          },
          questionnaireAnswers: questionnaireData,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data?.recommendations) {
        setRecommendations(data.data.recommendations);
        if (data.data.recommendations.length === 0) {
          showToast('error', 'No compatible contact lenses found for your prescription');
        }
      } else {
        showToast('error', data.error?.message || 'Failed to load recommendations');
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      showToast('error', 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProduct(productId);
    setShowPackSelection(true);
  };

  const handleAddToCompare = (productId: string) => {
    const recommendation = recommendations.find(r => r.product.id === productId);
    if (!recommendation) return;

    const product = recommendation.product;
    if (comparedProducts.find(p => p.id === productId)) {
      showToast('info', 'Product already in comparison');
      return;
    }

    if (comparedProducts.length >= 4) {
      showToast('error', 'You can compare up to 4 products');
      return;
    }

    setComparedProducts([...comparedProducts, {
      id: product.id,
      name: product.name,
      brand: product.brand,
      material: product.material,
      waterContent: product.waterContent,
      comfortScore: product.comfortScore,
      packSize: product.packSize,
      mrp: product.mrp,
      offerPrice: product.offerPrice,
      matchScore: product.matchScore,
    }]);
    showToast('success', 'Product added to comparison');
  };

  const handleRemoveFromCompare = (productId: string) => {
    setComparedProducts(comparedProducts.filter(p => p.id !== productId));
  };

  const handleViewCompatibility = (product: any) => {
    // Show compatibility details in a modal or expandable section
    const details = `
Product: ${product.name}
Material: ${product.material}
Water Content: ${product.waterContent}%
Match Score: ${product.matchScore}%
Comfort Score: ${product.comfortScore}/5
    `;
    alert(details);
  };

  const handleProceedToPackSelection = () => {
    if (!selectedProduct) {
      showToast('error', 'Please select a product first');
      return;
    }
    setShowPackSelection(true);
  };

  const handleNext = async () => {
    if (!selectedProduct) {
      showToast('error', 'Please select a contact lens product');
      return;
    }

    const recommendation = recommendations.find(r => r.product.id === selectedProduct);
    if (!recommendation) {
      showToast('error', 'Selected product not found');
      return;
    }

    const product = recommendation.product;

    // Validate color selection for color lenses
    if (product.isColorLens && (!selectedColor || selectedColor.trim() === '')) {
      showToast('error', 'Please select a color for this contact lens');
      return;
    }

    setLoading(true);
    try {
      const customerDetails = JSON.parse(localStorage.getItem('lenstrack_customer_details') || '{}');
      
      const response = await fetch('/api/public/questionnaire/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeCode: storeCode || 'MAIN-001',
          category: 'CONTACT_LENSES',
          customerName: customerDetails?.name || undefined,
          customerPhone: customerDetails?.phone || undefined,
          customerEmail: customerDetails?.email || undefined,
          customerCategory: customerDetails?.category || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data?.sessionId) {
        localStorage.setItem(`lenstrack_contact_lens_${data.data.sessionId}`, JSON.stringify({
          productId: selectedProduct,
          productName: product.name,
          brand: product.brand,
          packType: selectedPack,
          quantity,
          mrp: product.mrp,
          offerPrice: product.offerPrice,
          selectedColor: product.isColorLens ? selectedColor : null,
        }));
        
        router.push(`/questionnaire/${data.data.sessionId}/contact-lens-addons`);
      } else {
        showToast('error', data.error?.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating contact lens session:', error);
      showToast('error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedProductData = recommendations.find(r => r.product.id === selectedProduct)?.product;

  if (showPackSelection && selectedProductData) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
            <h1 className="text-3xl font-bold text-white mb-6">Select Pack & Quantity</h1>
            
            <div className="bg-white rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedProductData.name}</h2>
                <p className="text-slate-600">{selectedProductData.brand}</p>
              </div>

              {/* Pack Selection with Pricing */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-4">Pack Options</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['DAILY', 'MONTHLY', 'YEARLY'].map((pack) => {
                    const packType = pack as PackType;
                    const basePrice = selectedProductData.offerPrice;
                    const months = packType === 'DAILY' ? 1 : packType === 'MONTHLY' ? 3 : 12;
                    const totalPrice = basePrice * quantity;
                    const perMonth = totalPrice / months;
                    
                    // Apply quantity-based offers
                    let discount = 0;
                    let finalPrice = totalPrice;
                    if (quantity >= 4) {
                      discount = totalPrice * 0.10;
                      finalPrice = totalPrice - discount;
                    } else if (quantity >= 2) {
                      discount = totalPrice * 0.15;
                      finalPrice = totalPrice - discount;
                    }

                    return (
                      <div
                        key={pack}
                        onClick={() => setSelectedPack(packType)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedPack === packType
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 mb-2">{pack}</div>
                        <div className="text-sm text-slate-600 mb-2">
                          {selectedProductData.packSize * quantity} lenses, {months} months
                        </div>
                        {discount > 0 ? (
                          <>
                            <div className="text-sm text-slate-500 line-through mb-1">
                              ₹{totalPrice.toLocaleString()}
                            </div>
                            <div className="text-xl font-bold text-slate-900 mb-1">
                              ₹{finalPrice.toLocaleString()}
                            </div>
                            <div className="text-sm text-green-600 font-semibold mb-2">
                              ₹{discount.toLocaleString()} OFF
                            </div>
                          </>
                        ) : (
                          <div className="text-xl font-bold text-slate-900 mb-2">
                            ₹{totalPrice.toLocaleString()}
                          </div>
                        )}
                        <div className="text-sm text-slate-600">
                          ₹{Math.round(perMonth).toLocaleString()}/month
                        </div>
                        {quantity >= 2 && (
                          <div className="mt-2 text-xs text-green-600 font-semibold">
                            ✓ Best Value
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Color Selection */}
              {selectedProductData.isColorLens && selectedProductData.colorOptions && selectedProductData.colorOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {selectedProductData.colorOptions.map((color: string) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`p-3 rounded-lg border-2 ${
                          selectedColor === color
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPackSelection(false)}
                >
                  <ArrowLeft size={18} className="mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || (selectedProductData.isColorLens && !selectedColor)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  {loading ? 'Processing...' : 'Next: Add-ons →'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700 shadow-2xl">
          <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
                <Contact size={24} className="sm:w-8 sm:h-8" />
                Contact Lens Recommendations
              </h1>
              <p className="text-slate-300">Choose the best contact lenses for your eyes</p>
            </div>
            {comparedProducts.length > 0 && (
              <Button
                onClick={() => setShowComparison(!showComparison)}
                variant="outline"
                className="text-white border-slate-600 hover:bg-slate-700"
              >
                <CompareIcon size={18} className="mr-2" />
                Compare ({comparedProducts.length})
              </Button>
            )}
          </div>

          {showComparison && comparedProducts.length > 0 && (
            <div className="mb-6">
              <ComparisonTable
                products={comparedProducts}
                onSelect={handleSelectProduct}
                onRemove={handleRemoveFromCompare}
              />
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-slate-300">Loading recommendations...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="bg-red-50 rounded-lg p-6 border-2 border-red-200">
              <p className="text-red-700 font-semibold">No compatible contact lenses found</p>
              <p className="text-red-600 text-sm mt-2">
                Please check with store staff for alternative options or verify your power entry.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.map((recommendation) => (
                <ContactLensRecommendationCard
                  key={recommendation.product.id}
                  product={recommendation.product}
                  type={recommendation.type}
                  onSelect={() => handleSelectProduct(recommendation.product.id)}
                  onCompare={() => handleAddToCompare(recommendation.product.id)}
                  onViewCompatibility={() => handleViewCompatibility(recommendation.product)}
                />
              ))}
            </div>
          )}

          <div className="flex justify-between mt-6 pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/contact-lens/questionnaire')}
              className="flex items-center gap-2 text-white border-slate-600 hover:bg-slate-700"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
