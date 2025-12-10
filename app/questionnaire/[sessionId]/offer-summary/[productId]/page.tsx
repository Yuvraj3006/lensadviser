'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  Gift,
  Tag,
  Percent,
  Package,
  ArrowRight,
  Eye,
  X,
  Sparkles,
  Upload,
  UserCheck
} from 'lucide-react';
import { OfferCalculationResult, OfferApplied } from '@/types/offer-engine';

interface OfferDetail {
  type: string;
  code: string;
  title: string;
  description: string;
  discountAmount?: number;
  explanation: string;
}

interface OfferSummaryData {
  sessionId: string;
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
}

export default function OfferSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;
  const productId = params?.productId as string;

  const [data, setData] = useState<OfferSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEligibleProducts, setShowEligibleProducts] = useState(false);
  const [eligibleProducts, setEligibleProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [applyingCategory, setApplyingCategory] = useState(false);
  const [appliedCategory, setAppliedCategory] = useState<string | null>(null);
  const [categoryIdImage, setCategoryIdImage] = useState<File | null>(null);
  const [categoryIdImagePreview, setCategoryIdImagePreview] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  useEffect(() => {
    if (sessionId && productId) {
      fetchOfferSummary();
      fetchAvailableCategories();
      
      // Load saved category from localStorage
      const savedCategory = localStorage.getItem('lenstrack_category_discount');
      if (savedCategory) {
        try {
          const categoryData = JSON.parse(savedCategory);
          setAppliedCategory(categoryData.category);
          if (categoryData.idImage) {
            setCategoryIdImagePreview(categoryData.idImage);
          }
        } catch (e) {
          console.error('Failed to parse saved category:', e);
        }
      }
    }
  }, [sessionId, productId]);

  const fetchAvailableCategories = async () => {
    try {
      const storeCode = localStorage.getItem('lenstrack_store_code');
      if (storeCode) {
        const response = await fetch(`/api/public/stores/verify?code=${storeCode}`);
        const storeData = await response.json();
        if (storeData.success && storeData.data?.organizationId) {
          const catResponse = await fetch(`/api/admin/offers/category-discounts?organizationId=${storeData.data.organizationId}`);
          const catData = await catResponse.json();
          if (catData.success) {
            setAvailableCategories(catData.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchOfferSummary = async () => {
    setLoading(true);
    try {
      // Get selected product from recommendations
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
      
      // Get tint selection if available (for Power Sunglasses)
      const tintSelection = localStorage.getItem(`lenstrack_tint_selection_${sessionId}`);
      const tintData = tintSelection ? JSON.parse(tintSelection) : null;
      
      // Calculate offers using offer engine
      const offersResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            couponCode: null,
            customerCategory: appliedCategory || null,
            secondPair: null,
            tintSelection: tintData, // Include tint selection for mirror add-on price
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
      
      // Debug: Log offer result
      console.log('[OfferSummary] Offer Result:', {
        offersApplied: offerResult.offersApplied,
        categoryDiscount: offerResult.categoryDiscount,
        couponDiscount: offerResult.couponDiscount,
        secondPairDiscount: offerResult.secondPairDiscount,
        upsell: offerResult.upsell,
        finalPayable: offerResult.finalPayable,
        baseTotal: offerResult.baseTotal,
        frameMRP: offerResult.frameMRP,
        lensPrice: offerResult.lensPrice,
      });
      
      if (offerResult.upsell) {
        console.log('[OfferSummary] ✅ Upsell found! Details:', {
          message: offerResult.upsell.message,
          rewardText: offerResult.upsell.rewardText,
          remaining: offerResult.upsell.remaining,
          type: offerResult.upsell.type,
        });
      } else {
        console.log('[OfferSummary] ⚠️ No upsell suggestion returned from offer engine');
        console.log('[OfferSummary] Final payable:', offerResult.finalPayable);
        console.log('[OfferSummary] This might mean:');
        console.log('  - No upsell rules configured in database');
        console.log('  - Customer has already reached all thresholds');
        console.log('  - No matching upsell rules for this frame/lens combination');
      }
      
      // Extract lens index from name
      const lensIndex = selectedRec.name.match(/\d+\.\d+/)?.[0] || '1.50';

      // Build offer summary data
      const frameBrand = frameData.brand || 'Unknown';
      const frameSubBrand = frameData.subCategory || null;
      
      console.log('[OfferSummary] Frame data from localStorage:', {
        brand: frameBrand,
        subCategory: frameSubBrand,
        mrp: frameData.mrp,
        frameType: frameData.frameType,
        fullFrameData: frameData,
      });
      
      const summaryData: OfferSummaryData = {
        sessionId,
        selectedLens: {
          id: selectedRec.id,
          name: selectedRec.name,
          index: lensIndex,
          price: offerResult.lensPrice,
          brandLine: selectedRec.brand || 'Premium',
        },
        selectedFrame: {
          brand: frameBrand,
          subBrand: frameSubBrand,
          mrp: offerResult.frameMRP,
          frameType: frameData.frameType,
        },
        offerResult,
      };

      setData(summaryData);
    } catch (error: any) {
      console.error('[OfferSummary] Error:', error);
      showToast('error', error.message || 'Failed to load offer summary');
      router.push(`/questionnaire/${sessionId}/recommendations`);
    } finally {
      setLoading(false);
    }
  };

  const formatOffers = (offerResult: OfferCalculationResult): OfferDetail[] => {
    const offers: OfferDetail[] = [];
    
    // Only show offers that are actually applied (from offersApplied array)
    // This ensures we only show the one offer that was selected/applied
    if (offerResult.offersApplied && offerResult.offersApplied.length > 0) {
      console.log('[OfferSummary] Processing offersApplied:', offerResult.offersApplied);
      offerResult.offersApplied.forEach((offer: OfferApplied) => {
        // Only add if there's actual savings
        if (offer.savings > 0) {
          const explanation = getOfferExplanation(offer.ruleCode, offer);
          console.log('[OfferSummary] Offer:', {
            ruleCode: offer.ruleCode,
            description: offer.description,
            savings: offer.savings,
            explanation,
          });
          offers.push({
            type: offer.ruleCode || 'DISCOUNT',
            code: offer.ruleCode || '',
            title: offer.description || 'Discount',
            description: offer.description || '',
            discountAmount: offer.savings || 0,
            explanation,
          });
        }
      });
    } else {
      console.log('[OfferSummary] No offersApplied found');
    }

    // Also include automatic discounts that are always applied (not user-selected)
    // Category Discount (automatic based on customer category)
    if (offerResult.categoryDiscount && offerResult.categoryDiscount.savings > 0) {
      // Check if not already in offersApplied
      const alreadyInOffers = offers.some(o => o.type === 'CATEGORY_DISCOUNT');
      if (!alreadyInOffers) {
        offers.push({
          type: 'CATEGORY_DISCOUNT',
          code: 'CATEGORY',
          title: offerResult.categoryDiscount.description || 'Category Discount',
          description: offerResult.categoryDiscount.description || '',
          discountAmount: offerResult.categoryDiscount.savings || 0,
          explanation: formatCategoryDiscountExplanation(offerResult.categoryDiscount),
        });
      }
    }

    // Coupon Discount (user applied)
    if (offerResult.couponDiscount && offerResult.couponDiscount.savings > 0) {
      // Check if not already in offersApplied
      const alreadyInOffers = offers.some(o => o.type === 'COUPON' || o.code === offerResult.couponDiscount?.ruleCode);
      if (!alreadyInOffers) {
        offers.push({
          type: 'COUPON',
          code: offerResult.couponDiscount.ruleCode || '',
          title: offerResult.couponDiscount.description || 'Coupon Discount',
          description: offerResult.couponDiscount.description || '',
          discountAmount: offerResult.couponDiscount.savings || 0,
          explanation: offerResult.couponDiscount.description || 'Coupon applied',
        });
      }
    }

    // Second Pair Discount (user enabled)
    if (offerResult.secondPairDiscount && offerResult.secondPairDiscount.savings > 0) {
      // Check if not already in offersApplied
      const alreadyInOffers = offers.some(o => o.type === 'BOGO50' || o.code === 'BOGO50');
      if (!alreadyInOffers) {
        offers.push({
          type: 'BOGO50',
          code: offerResult.secondPairDiscount.ruleCode || 'BOGO50',
          title: offerResult.secondPairDiscount.description || 'Second Pair Discount',
          description: offerResult.secondPairDiscount.description || '',
          discountAmount: offerResult.secondPairDiscount.savings || 0,
          explanation: 'Second pair discount applied',
        });
      }
    }

    return offers;
  };

  const getExplanationFromLabel = (label: string, discountAmount: number): string => {
    const labelUpper = label.toUpperCase();
    
    // YOPO: "YOPO - Pay higher of frame or lens"
    if (labelUpper.includes('YOPO')) {
      return 'You pay only the higher of frame or lens.';
    }
    
    // Combo: "Combo Price: ₹X"
    if (labelUpper.includes('COMBO') || labelUpper.includes('COMBO PRICE')) {
      return 'Special package price applied.';
    }
    
    // Free Lens: "Free Lens (PERCENT_OF_FRAME)" or "Free Lens (VALUE_LIMIT)" or "Free Lens (FULL)"
    if (labelUpper.includes('FREE LENS') || labelUpper.includes('FREE_LENS')) {
      return `Lens free up to ₹${Math.round(discountAmount).toLocaleString()}; you pay only difference.`;
    }
    
    // Percent OFF: "X% OFF" or "X% OFF (FRAME_ONLY)" or "X% OFF (LENS_ONLY)"
    if (labelUpper.includes('% OFF') || labelUpper.includes('%OFF') || labelUpper.match(/\d+%/)) {
      // Check if it's a brand discount (has brand name before percentage)
      const brandPercentMatch = label.match(/(\w+)\s+(\d+)%\s*OFF/i);
      if (brandPercentMatch) {
        const brand = brandPercentMatch[1];
        const percent = brandPercentMatch[2];
        return `${brand} ${percent}% Off`;
      }
      // Regular percentage discount
      const percentMatch = label.match(/(\d+)%\s*OFF/i);
      if (percentMatch) {
        return `${percentMatch[1]}% OFF`;
      }
      return label || 'Percentage discount applied';
    }
    
    // Flat OFF: "Flat ₹X OFF"
    if (labelUpper.includes('FLAT') && labelUpper.includes('OFF')) {
      const flatMatch = label.match(/FLAT\s*₹?(\d+)\s*OFF/i);
      if (flatMatch) {
        return `Festival Offer -₹${flatMatch[1]}`;
      }
      return `Festival Offer -₹${Math.round(discountAmount).toLocaleString()}`;
    }
    
    // BOGO50: "BOG50" or "Second pair X% off"
    if (labelUpper.includes('BOGO') || labelUpper.includes('BOG50') || labelUpper.includes('SECOND PAIR')) {
      return 'Buy One Get One 50% Off - Second item at 50% discount';
    }
    
    // Default: return the label as-is
    return label || 'Discount applied';
  };

  const getOfferExplanation = (ruleCode: string, offer: OfferApplied): string => {
    const description = offer.description || '';
    return getExplanationFromLabel(description, offer.savings || 0);
  };

  const formatCategoryDiscountExplanation = (categoryDiscount: OfferApplied): string => {
    // Extract category name and percentage from description
    // Format: "STUDENT Discount (5%)" or similar
    const match = categoryDiscount.description.match(/(\w+)\s+Discount\s*\((\d+)%\)/);
    if (match) {
      const category = match[1];
      const percent = match[2];
      return `${category} Discount ${percent}%`;
    }
    return categoryDiscount.description || 'Category Discount applied';
  };

  const fetchEligibleProducts = async () => {
    if (!data) return;
    
    setLoadingProducts(true);
    setShowEligibleProducts(true);
    
    try {
      // Get session to find store and organization
      const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session');
      }
      
      const sessionData = await sessionResponse.json();
      if (!sessionData.success) {
        throw new Error('Session not found');
      }
      
      const storeId = sessionData.data.storeId;
      
      // Fetch products that can help reach the upsell threshold
      const currentTotal = data.offerResult.finalPayable;
      const remaining = data.offerResult.upsell?.remaining || 1000;
      const minPrice = Math.max(remaining - 500, 100); // Products around the remaining amount
      const maxPrice = remaining + 1000; // Slightly above threshold
      
      // Fetch products from store
      const productsResponse = await fetch(
        `/api/public/products/eligible?storeId=${storeId}&minPrice=${minPrice}&maxPrice=${maxPrice}&limit=20`
      );
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        if (productsData.success) {
          setEligibleProducts(productsData.data || []);
        } else {
          // Fallback: fetch from recommendations
          const recResponse = await fetch(
            `/api/public/questionnaire/sessions/${sessionId}/recommendations`
          );
          if (recResponse.ok) {
            const recData = await recResponse.json();
            if (recData.success && recData.data.recommendations) {
              // Filter products that can help reach threshold
              const filtered = recData.data.recommendations
                .filter((r: any) => {
                  const price = r.pricing?.finalPrice || r.pricing?.subtotal || 0;
                  return price >= minPrice && price <= maxPrice;
                })
                .slice(0, 10);
              setEligibleProducts(filtered);
            }
          }
        }
      } else {
        // Fallback: use recommendations
        const recResponse = await fetch(
          `/api/public/questionnaire/sessions/${sessionId}/recommendations`
        );
        if (recResponse.ok) {
          const recData = await recResponse.json();
          if (recData.success && recData.data.recommendations) {
            const filtered = recData.data.recommendations
              .filter((r: any) => {
                const price = r.pricing?.finalPrice || r.pricing?.subtotal || 0;
                return price >= minPrice && price <= maxPrice;
              })
              .slice(0, 10);
            setEligibleProducts(filtered);
          }
        }
      }
    } catch (error: any) {
      console.error('[OfferSummary] Error fetching eligible products:', error);
      showToast('error', 'Failed to load eligible products');
    } finally {
      setLoadingProducts(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <h2 className="text-xl font-semibold text-white mb-2">Calculating Your Best Offers</h2>
          <p className="text-slate-400">Applying all eligible discounts...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700 shadow-lg">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Offer Summary</h2>
          <p className="text-slate-400 mb-6">
            Please go back and select a lens again.
          </p>
          <Button 
            onClick={() => router.push(`/questionnaire/${sessionId}/recommendations`)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Recommendations
          </Button>
        </div>
      </div>
    );
  }

  const totalDiscount = data.offerResult.baseTotal - data.offerResult.finalPayable;
  const savingsPercent = totalDiscount > 0 
    ? Math.round((totalDiscount / data.offerResult.baseTotal) * 100)
    : 0;

  const allOffers = formatOffers(data.offerResult);
  // Filter out offers with zero or negative discount
  const offers = allOffers.filter(offer => (offer.discountAmount || 0) > 0);
  
  // Debug: Log formatted offers
  console.log('[OfferSummary] All formatted offers:', allOffers);
  console.log('[OfferSummary] Filtered offers (with discount > 0):', offers);
  console.log('[OfferSummary] Total offers count:', offers.length);
  console.log('[OfferSummary] Offer result data:', {
    offersApplied: data.offerResult.offersApplied,
    categoryDiscount: data.offerResult.categoryDiscount,
    couponDiscount: data.offerResult.couponDiscount,
    secondPairDiscount: data.offerResult.secondPairDiscount,
    priceComponents: data.offerResult.priceComponents,
  });
  
  // Debug: Log upsell status
  const hasUpsell = !!data.offerResult.upsell;
  console.log('[OfferSummary] 🎁 Upsell Banner Status:', {
    hasUpsell,
    upsellData: data.offerResult.upsell,
    finalPayable: data.offerResult.finalPayable,
    willShowBanner: hasUpsell || (data.offerResult.finalPayable < 5000),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <CheckCircle className="text-blue-400" size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1">
                  Offer Summary
                </h1>
                <p className="text-slate-400">All offers applied</p>
              </div>
            </div>
            {savingsPercent > 0 && (
              <div className="bg-blue-500/20 rounded-lg px-6 py-3 border border-blue-500/30">
                <p className="text-blue-300 text-sm font-medium mb-1">You Saved</p>
                <p className="text-2xl font-semibold text-blue-400">{savingsPercent}%</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Top Summary: Selected Lens + Frame */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Selected Lens */}
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-lg p-5 border-2 border-blue-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-blue-300 uppercase tracking-wide">Selected Lens</h3>
                <Package className="text-blue-400" size={18} />
              </div>
              <p className="text-xl font-bold text-white mb-2">{data.selectedLens.name}</p>
              <div className="flex items-center gap-2 text-slate-300 text-sm mb-4">
                <span className="bg-blue-500/20 px-3 py-1 rounded-lg border border-blue-500/30 font-semibold text-blue-200">
                  Index {data.selectedLens.index}
                </span>
                {data.selectedLens.brandLine && (
                  <span className="bg-slate-700/50 px-3 py-1 rounded-lg border border-slate-600">
                    {data.selectedLens.brandLine}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-slate-400 text-sm">₹</span>
                <span className="text-2xl font-bold text-white">{Math.round(data.selectedLens.price).toLocaleString()}</span>
              </div>
            </div>

            {/* Selected Frame */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-5 border-2 border-purple-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-purple-300 uppercase tracking-wide">Selected Frame</h3>
                <Eye className="text-purple-400" size={18} />
              </div>
              <div className="mb-2">
                <p className="text-xl font-bold text-white">{data.selectedFrame.brand}</p>
                {data.selectedFrame.subBrand && (
                  <p className="text-purple-200 text-sm font-medium mt-1">{data.selectedFrame.subBrand}</p>
                )}
              </div>
              {data.selectedFrame.frameType && (
                <div className="mb-4">
                  <span className="text-slate-300 text-sm bg-purple-500/20 px-3 py-1 rounded-lg border border-purple-500/30 inline-block">
                    {data.selectedFrame.frameType.replace('_', ' ')}
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-slate-400 text-sm">MRP: ₹</span>
                <span className="text-2xl font-bold text-white">{Math.round(data.selectedFrame.mrp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Discount Section */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <UserCheck className="text-blue-400" size={18} />
            </div>
            <h2 className="text-xl font-semibold text-white">Category Discount</h2>
          </div>
          
          {!appliedCategory ? (
            <div className="space-y-4">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'Select Category' },
                  ...availableCategories
                    .filter(cat => cat.isActive)
                    .map(cat => ({
                      value: cat.customerCategory,
                      label: `${cat.customerCategory} - ${cat.discountPercent}% off${cat.maxDiscount ? ` (max ₹${cat.maxDiscount})` : ''}`,
                    })),
                ]}
                className="!bg-slate-700/80 !border-2 !border-slate-600 !text-white"
              />
              
              {selectedCategory && availableCategories.find(c => c.customerCategory === selectedCategory && c.categoryVerificationRequired) && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Upload ID Proof <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCategoryIdImage(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setCategoryIdImagePreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-slate-600 bg-slate-700/50 hover:border-blue-500 transition-colors">
                          <Upload size={18} className="text-slate-400" />
                          <span className="text-sm text-slate-300">
                            {categoryIdImage ? categoryIdImage.name : 'Click to upload ID proof'}
                          </span>
                        </div>
                      </label>
                      {categoryIdImagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryIdImage(null);
                            setCategoryIdImagePreview(null);
                          }}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                    {categoryIdImagePreview && (
                      <div className="mt-2">
                        <img
                          src={categoryIdImagePreview}
                          alt="ID Preview"
                          className="max-w-full h-32 object-contain rounded-lg border border-slate-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                onClick={async () => {
                  if (!selectedCategory || !productId) return;
                  const selectedCat = availableCategories.find(c => c.customerCategory === selectedCategory);
                  if (selectedCat?.categoryVerificationRequired && !categoryIdImage) {
                    showToast('error', 'Please upload ID proof for this category');
                    return;
                  }
                  
                  setApplyingCategory(true);
                  try {
                    // Convert image to base64 if exists
                    let idImageBase64 = null;
                    if (categoryIdImage) {
                      idImageBase64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(categoryIdImage);
                      });
                    }
                    
                    // Recalculate offers with category
                    const offersResponse = await fetch(
                      `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          productId: productId,
                          couponCode: null,
                          customerCategory: selectedCategory,
                          secondPair: null,
                        }),
                      }
                    );
                    
                    const offersData = await offersResponse.json();
                    if (offersData.success && offersData.data) {
                      if (offersData.data.categoryDiscount) {
                        setAppliedCategory(selectedCategory);
                        // Update data with new offer result
                        setData(prev => prev ? {
                          ...prev,
                          offerResult: offersData.data,
                        } : null);
                        // Save to localStorage
                        localStorage.setItem('lenstrack_category_discount', JSON.stringify({
                          category: selectedCategory,
                          idImage: idImageBase64,
                        }));
                        const discountAmount = offersData.data.categoryDiscount.savings || 0;
                        showToast('success', `Category discount applied! You saved ₹${Math.round(discountAmount).toLocaleString()}`);
                      } else {
                        showToast('warning', 'No discount available for this category');
                      }
                    } else {
                      showToast('error', offersData.error?.message || 'Failed to apply category discount');
                    }
                  } catch (error) {
                    showToast('error', 'Failed to apply category discount');
                  } finally {
                    setApplyingCategory(false);
                  }
                }}
                disabled={!selectedCategory || applyingCategory}
                loading={applyingCategory}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-lg"
              >
                Apply Category Discount
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/20 border border-green-500/40 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-green-300">{appliedCategory} Discount Applied</p>
                    {data.offerResult.categoryDiscount && (
                      <p className="text-xs text-green-400">
                        Saving ₹{Math.round(data.offerResult.categoryDiscount.savings).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!productId) return;
                    setApplyingCategory(true);
                    try {
                      // Recalculate offers without category
                      const offersResponse = await fetch(
                        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            productId: productId,
                            couponCode: null,
                            customerCategory: null,
                            secondPair: null,
                          }),
                        }
                      );
                      
                      const offersData = await offersResponse.json();
                      if (offersData.success && offersData.data) {
                        setAppliedCategory(null);
                        setSelectedCategory('');
                        setCategoryIdImage(null);
                        setCategoryIdImagePreview(null);
                        // Update data with new offer result
                        setData(prev => prev ? {
                          ...prev,
                          offerResult: offersData.data,
                        } : null);
                        localStorage.removeItem('lenstrack_category_discount');
                        showToast('success', 'Category discount removed');
                      }
                    } catch (error) {
                      showToast('error', 'Failed to remove category discount');
                    } finally {
                      setApplyingCategory(false);
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  <X size={16} className="mr-1" />
                  Remove
                </Button>
              </div>
              {categoryIdImagePreview && (
                <div className="p-2 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Uploaded ID Proof:</p>
                  <img
                    src={categoryIdImagePreview}
                    alt="ID Proof"
                    className="max-w-full h-24 object-contain rounded border border-slate-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price Breakdown Card */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <Tag className="text-blue-400" size={18} />
            </div>
            <h2 className="text-xl font-semibold text-white">Price Breakdown</h2>
          </div>

          <div className="space-y-4">
            {/* Frame MRP */}
            <div className="flex justify-between items-center py-3 px-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <span className="text-slate-300 font-medium">Frame MRP</span>
              <span className="text-lg font-semibold text-white">₹{Math.round(data.offerResult.frameMRP).toLocaleString()}</span>
            </div>

            {/* Lens Price */}
            <div className="flex justify-between items-center py-3 px-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <span className="text-slate-300 font-medium">Lens Price</span>
              <span className="text-lg font-semibold text-white">₹{Math.round(data.offerResult.lensPrice).toLocaleString()}</span>
            </div>

            {/* Applied Offers */}
            <div className="py-4 border-t border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-lg animate-pulse" />
                  <Gift className="relative text-blue-400" size={18} />
                </div>
                <h3 className="text-lg font-semibold text-white">🎉 Applied Offer(s)</h3>
              </div>
              {offers.length > 0 ? (
                <div className="space-y-3">
                  {offers.map((offer, idx) => (
                    <div 
                      key={`${offer.code || offer.type || 'offer'}-${idx}`}
                      className="group relative overflow-hidden bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-lg p-4 border-2 border-blue-500/50 hover:border-blue-400 transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {offer.code && offer.code !== 'DISCOUNT' && offer.code.length > 0 && (
                              <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-lg border border-blue-400/50 shadow-lg whitespace-nowrap">
                                {offer.code}
                              </span>
                            )}
                            <span className="text-base font-bold text-white break-words">{offer.title || 'Discount'}</span>
                          </div>
                          {offer.explanation && (
                            <p className="text-blue-200 text-sm mt-1 break-words">{offer.explanation}</p>
                          )}
                        </div>
                        <div className="ml-4 text-right flex-shrink-0">
                          <div className="bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg px-3 py-1 border border-green-300/50 shadow-lg whitespace-nowrap">
                            <span className="text-lg font-bold text-white">
                              -₹{Math.round(offer.discountAmount || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-400 text-sm italic">No offers applied</p>
                </div>
              )}
            </div>

            {/* Subtotal */}
            <div className="flex justify-between items-center py-4 px-4 bg-slate-700/70 rounded-lg border border-slate-600">
              <span className="text-lg font-semibold text-white">Subtotal</span>
              <span className="text-xl font-semibold text-white">₹{Math.round(data.offerResult.baseTotal).toLocaleString()}</span>
            </div>

            {/* Total Discount */}
            {totalDiscount > 0 && (
              <div className="relative overflow-hidden flex justify-between items-center py-4 px-4 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 rounded-lg border-2 border-green-400/50 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                <span className="relative text-lg font-bold text-white flex items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-400 rounded-full blur-md animate-ping opacity-75" />
                    <Percent className="relative text-green-300" size={20} />
                  </div>
                  Total Discount
                </span>
                <span className="relative text-2xl font-bold text-green-300">
                  -₹{Math.round(totalDiscount).toLocaleString()}
                </span>
              </div>
            )}

            {/* Final Payable */}
            <div className="relative overflow-hidden bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-lg p-6 border-2 border-green-400/50 shadow-2xl transform hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 animate-pulse" />
              <div className="relative flex justify-between items-center">
                <div>
                  <p className="text-green-100 text-sm font-semibold mb-1 uppercase tracking-wide">Final Payable</p>
                  <p className="text-green-200 text-sm">Including all discounts & offers</p>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2 border border-white/30">
                    <span className="text-3xl md:text-4xl font-bold text-white">
                      ₹{Math.round(data.offerResult.finalPayable).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button
            onClick={() => router.push(`/questionnaire/${sessionId}/recommendations`)}
            variant="outline"
            className="flex-1 border border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white font-medium py-3"
          >
            <ArrowLeft size={18} className="mr-2" />
            Change Lens
          </Button>
          <Button
            onClick={() => {
              router.push(`/questionnaire/${sessionId}/checkout/${productId}`);
            }}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 shadow-lg hover:shadow-green-500/50 transform hover:scale-[1.02] transition-all duration-300 border-2 border-green-400/50"
          >
            <ShoppingCart size={18} className="mr-2" />
            Proceed to Checkout
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>

      {/* Upsell Strip - Sticky Banner */}
      {data.offerResult.upsell ? (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 py-4 px-6 shadow-2xl border-t-4 border-yellow-600 z-50 backdrop-blur-xl animate-slide-up">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          <div className="max-w-5xl mx-auto relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-yellow-600 rounded-full blur-lg animate-pulse opacity-75" />
                <Gift className="relative text-yellow-900 animate-bounce" size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-yellow-900 font-bold text-base md:text-lg leading-tight mb-1">
                  {data.offerResult.upsell.message}
                </p>
                {data.offerResult.upsell.rewardText && (
                  <p className="text-yellow-800 text-sm font-semibold">
                    🎁 {data.offerResult.upsell.rewardText}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={fetchEligibleProducts}
              className="bg-yellow-900 hover:bg-yellow-800 text-white font-bold px-6 py-3 whitespace-nowrap shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-800 rounded-lg"
            >
              See eligible products
            </Button>
          </div>
        </div>
      ) : (
        // Fallback upsell banner if no upsell from backend
        (() => {
          const currentTotal = data.offerResult.finalPayable;
          
          // Show upsell if total is less than common thresholds
          const thresholds = [
            { amount: 5000, reward: 'free Lenstrack Sunglass worth ₹1499', remaining: 5000 - currentTotal },
            { amount: 3000, reward: 'extra ₹500 OFF', remaining: 3000 - currentTotal },
            { amount: 2000, reward: 'free Anti-Glare coating worth ₹2000', remaining: 2000 - currentTotal },
          ];
          
          // Find the best threshold that customer hasn't reached yet
          const bestThreshold = thresholds.find(t => t.remaining > 0 && t.remaining <= 1000);
          
          if (bestThreshold) {
            const remaining = Math.ceil(bestThreshold.remaining / 100) * 100; // Round to nearest 100
            
            console.log('[OfferSummary] 🎁 Showing fallback upsell banner:', {
              currentTotal,
              threshold: bestThreshold.amount,
              remaining,
              reward: bestThreshold.reward,
            });
            
            return (
              <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 py-4 px-6 shadow-2xl border-t-4 border-yellow-600 z-50 backdrop-blur-xl animate-slide-up">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                <div className="max-w-5xl mx-auto relative flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-yellow-600 rounded-full blur-lg animate-pulse opacity-75" />
                      <Gift className="relative text-yellow-900 animate-bounce" size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-yellow-900 font-bold text-base md:text-lg leading-tight mb-1">
                        Add ₹{remaining.toLocaleString()} more and get {bestThreshold.reward}
                      </p>
                      <p className="text-yellow-800 text-sm font-semibold">
                        🎁 Unlock amazing rewards with just a little more!
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={fetchEligibleProducts}
                    className="bg-yellow-900 hover:bg-yellow-800 text-white font-bold px-6 py-3 whitespace-nowrap shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-800 rounded-lg"
                  >
                    See eligible products
                  </Button>
                </div>
              </div>
            );
          }
          
          console.log('[OfferSummary] ⚠️ No fallback upsell banner - customer total too high or too low');
          return null;
        })()
      )}

      {/* Eligible Products Modal */}
      {showEligibleProducts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 px-6 py-5 border-b border-yellow-600 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Eligible Products</h2>
                  {data.offerResult.upsell && (
                    <p className="text-yellow-100 text-sm">
                      Add ₹{data.offerResult.upsell.remaining.toLocaleString()} more to unlock {data.offerResult.upsell.rewardText}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowEligibleProducts(false);
                    setEligibleProducts([]);
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin" />
                    <p className="text-slate-600 font-medium">Loading eligible products...</p>
                  </div>
                </div>
              ) : eligibleProducts.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {eligibleProducts.map((product: any) => {
                    // Handle both API response format and recommendations format
                    const productPrice = product.storePrice || product.pricing?.finalPrice || product.pricing?.subtotal || product.basePrice || 0;
                    const productName = product.name || product.product?.name || 'Product';
                    const productBrand = product.brand || product.product?.brand || '';
                    const productImage = product.imageUrl || product.product?.imageUrl || '';
                    const productId = product.id || product.productId;
                    const subtotal = product.pricing?.subtotal || product.storePrice || product.basePrice || 0;
                    
                    return (
                      <div
                        key={productId || Math.random()}
                        className="border-2 border-slate-200 rounded-xl p-5 hover:border-yellow-400 hover:shadow-lg transition-all bg-white group cursor-pointer"
                        onClick={() => {
                          // Navigate to product details
                          if (productId) {
                            router.push(`/questionnaire/${sessionId}/offer-summary/${productId}`);
                            setShowEligibleProducts(false);
                          }
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {productImage && productImage.trim() ? (
                            <img
                              src={productImage}
                              alt={productName}
                              className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg border border-yellow-200 flex items-center justify-center flex-shrink-0">
                              <Package className="text-yellow-600" size={32} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 mb-1 text-lg line-clamp-2">{productName}</h3>
                            {productBrand && (
                              <p className="text-slate-600 text-sm mb-2">{productBrand}</p>
                            )}
                            {product.sku && (
                              <p className="text-xs text-slate-500 mb-2">SKU: {product.sku}</p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              <div>
                                <span className="text-2xl font-bold text-slate-900">
                                  ₹{Math.round(productPrice).toLocaleString()}
                                </span>
                                {subtotal > productPrice && (
                                  <span className="text-sm text-slate-500 line-through ml-2">
                                    ₹{Math.round(subtotal).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-lg border border-yellow-300 whitespace-nowrap">
                                  Select
                                </span>
                                <ArrowRight className="text-yellow-600 group-hover:translate-x-1 transition-transform" size={18} />
                              </div>
                            </div>
                            {data.offerResult.upsell && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-medium">
                                  ✓ Adding this will unlock your reward!
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="text-slate-400 mx-auto mb-4" size={48} />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No Products Found</h3>
                  <p className="text-slate-600 mb-6">
                    We couldn't find products matching your criteria at this time.
                  </p>
                  <Button
                    onClick={() => {
                      setShowEligibleProducts(false);
                    }}
                    variant="outline"
                    className="border-2 border-slate-300"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-yellow-50 border-t-2 border-slate-200 px-6 py-4 rounded-b-3xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  {eligibleProducts.length > 0 && (
                    <span className="font-semibold text-slate-900">{eligibleProducts.length}</span>
                  )}{' '}
                  products found
                </p>
                <Button
                  onClick={() => {
                    setShowEligibleProducts(false);
                    setEligibleProducts([]);
                  }}
                  variant="outline"
                  className="border-2 border-slate-300"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

