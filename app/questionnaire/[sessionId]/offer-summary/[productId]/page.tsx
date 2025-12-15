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
  allApplicableOffers?: any[]; // All offers from recommendations
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
  const [allApplicableOffersList, setAllApplicableOffersList] = useState<any[]>([]);
  
  // Second pair selection state
  const [secondPairEnabled, setSecondPairEnabled] = useState(false);
  const [secondPairFrameMRP, setSecondPairFrameMRP] = useState('');
  const [secondPairBrand, setSecondPairBrand] = useState('');
  const [secondPairSubBrand, setSecondPairSubBrand] = useState('');
  const [secondPairLensId, setSecondPairLensId] = useState('');
  const [secondPairLensPrice, setSecondPairLensPrice] = useState(0);
  const [showLensSelectionModal, setShowLensSelectionModal] = useState(false);
  const [availableLenses, setAvailableLenses] = useState<any[]>([]);
  const [loadingLenses, setLoadingLenses] = useState(false);
  const [frameBrands, setFrameBrands] = useState<any[]>([]);
  const [availableSubBrands, setAvailableSubBrands] = useState<string[]>([]);

  useEffect(() => {
    if (sessionId && productId) {
      fetchOfferSummary();
      fetchAvailableCategories();
      fetchFrameBrands();
      
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
      console.log('[OfferSummary] Fetching categories...');
      
      // Method 1: Try to get organizationId from store verification (most reliable)
      const storeCode = localStorage.getItem('lenstrack_store_code');
      let organizationId: string | null = null;
      
      if (storeCode) {
        try {
          console.log('[OfferSummary] Trying store verification with code:', storeCode);
          const verifyResponse = await fetch(`/api/public/verify-store?code=${storeCode}`);
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log('[OfferSummary] Store verification response:', verifyData);
            if (verifyData.success && verifyData.data?.organizationId) {
              organizationId = verifyData.data.organizationId;
              console.log('[OfferSummary] Got organizationId from store verification:', organizationId);
            }
          } else {
            const errorText = await verifyResponse.text();
            console.warn('[OfferSummary] Store verification failed:', verifyResponse.status, errorText);
          }
        } catch (e) {
          console.warn('[OfferSummary] Store verification error:', e);
        }
      }
      
      // Method 2: Get from session -> store
      if (!organizationId) {
        try {
          console.log('[OfferSummary] Trying to get organizationId from session');
          const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.success && sessionData.data?.session?.storeId) {
              const storeId = sessionData.data.session.storeId;
              // Get store details from verify-store or use storeCode
              if (storeCode) {
                const verifyResponse = await fetch(`/api/public/verify-store?code=${storeCode}`);
                if (verifyResponse.ok) {
                  const verifyData = await verifyResponse.json();
                  if (verifyData.success && verifyData.data?.organizationId) {
                    organizationId = verifyData.data.organizationId;
                    console.log('[OfferSummary] Got organizationId from session->store:', organizationId);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('[OfferSummary] Session fetch error:', e);
        }
      }
      
      if (!organizationId) {
        console.error('[OfferSummary] Could not determine organizationId for categories');
        console.error('[OfferSummary] Store code in localStorage:', storeCode);
        return;
      }
      
      console.log('[OfferSummary] Fetching category discounts for organizationId:', organizationId);
      const catResponse = await fetch(`/api/admin/offers/category-discounts?organizationId=${organizationId}`);
      
      console.log('[OfferSummary] Category discounts response status:', catResponse.status);
      
      if (!catResponse.ok) {
        const errorText = await catResponse.text();
        console.error('[OfferSummary] Category discounts API error:', catResponse.status, errorText);
        if (catResponse.status === 404) {
          console.warn('[OfferSummary] Category discounts endpoint not found (404)');
        } else if (catResponse.status === 401 || catResponse.status === 403) {
          console.warn('[OfferSummary] Category discounts API requires authentication');
        } else {
          console.warn('[OfferSummary] Failed to fetch category discounts:', catResponse.status);
        }
        return;
      }
      
      const catContentType = catResponse.headers.get('content-type');
      if (!catContentType || !catContentType.includes('application/json')) {
        const responseText = await catResponse.text();
        console.warn('[OfferSummary] Category discounts returned non-JSON response:', responseText.substring(0, 200));
        return;
      }
      
      const catData = await catResponse.json();
      console.log('[OfferSummary] Category discounts API response:', catData);
      
      if (catData.success && catData.data) {
        const categories = catData.data || [];
        setAvailableCategories(categories);
        console.log('[OfferSummary] ✅ Loaded categories:', categories.length, categories);
      } else {
        console.warn('[OfferSummary] Category discounts API returned unsuccessful response:', catData);
      }
    } catch (error) {
      console.error('[OfferSummary] ❌ Failed to fetch categories:', error);
    }
  };

  const fetchOfferSummary = async () => {
    setLoading(true);
    try {
      // ✅ BEST PRACTICE: Load category discount from session (database) first, then localStorage as fallback
      let customerCategoryToUse: string | null = appliedCategory || null;
      
      // Try to get from session first (database)
      try {
        const sessionResponse = await fetch(
          `/api/public/questionnaire/sessions/${sessionId}`
        );
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.data?.session?.customerCategory) {
            customerCategoryToUse = sessionData.data.session.customerCategory;
            // Update state if not already set
            if (customerCategoryToUse && !appliedCategory) {
              setAppliedCategory(customerCategoryToUse);
            }
            console.log('[OfferSummary] ✅ Loaded category discount from session (database):', customerCategoryToUse);
          }
        }
      } catch (sessionError) {
        console.warn('[OfferSummary] Could not load from session, trying localStorage...', sessionError);
      }
      
      // Fallback to localStorage if session doesn't have it
      if (!customerCategoryToUse) {
        const savedCategoryDiscount = localStorage.getItem('lenstrack_category_discount');
        if (savedCategoryDiscount) {
          try {
            const categoryData = JSON.parse(savedCategoryDiscount);
            customerCategoryToUse = categoryData.category || null;
            // Update state if not already set
            if (customerCategoryToUse && !appliedCategory) {
              setAppliedCategory(customerCategoryToUse);
              if (categoryData.idImage) {
                setCategoryIdImagePreview(categoryData.idImage);
              }
            }
            console.log('[OfferSummary] Loaded category discount from localStorage (fallback):', customerCategoryToUse);
          } catch (e) {
            console.error('[OfferSummary] Failed to parse saved category discount:', e);
          }
        }
      }
      
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
      
      // Calculate offers using offer engine (include category discount from localStorage)
      const offersResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            couponCode: null,
            customerCategory: customerCategoryToUse,
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
      
      // Debug: Log each offer in detail
      if (offerResult.offersApplied && offerResult.offersApplied.length > 0) {
        console.log('[OfferSummary] 🔍 Detailed offersApplied breakdown:');
        offerResult.offersApplied.forEach((offer: any, index: number) => {
          console.log(`[OfferSummary]   Offer ${index + 1}:`, {
            ruleCode: offer.ruleCode,
            description: offer.description,
            savings: offer.savings,
            type: offer.type,
            isYOPO: (offer.ruleCode || '').toUpperCase().includes('YOPO') || 
                    (offer.description || '').toUpperCase().includes('YOPO'),
          });
        });
      } else {
        console.log('[OfferSummary] ⚠️ No offers applied! This might indicate YOPO rule not found or not applicable.');
      }
      
      if (offerResult.upsell) {
        console.log('[OfferSummary] ? Upsell found! Details:', {
          message: offerResult.upsell.message,
          rewardText: offerResult.upsell.rewardText,
          remaining: offerResult.upsell.remaining,
          type: offerResult.upsell.type,
        });
      } else {
        console.log('[OfferSummary] ?? No upsell suggestion returned from offer engine');
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
        allApplicableOffers: selectedRec.offers || [], // Store all applicable offers
      };

      setData(summaryData);
      
      // Fetch available lenses for second pair selection
      fetchAvailableLenses();
      
      // Fetch all applicable offers (always fetch)
      fetchAllApplicableOffers(offerResult);
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
    
    // Primary offer types (only ONE should apply)
    const primaryOfferTypes = ['COMBO_PRICE', 'YOPO', 'FREE_LENS', 'PERCENT_OFF', 'FLAT_OFF'];
    let primaryOfferAdded = false;
    
    // Only show offers that are actually applied (from offersApplied array)
    // This ensures we only show the one offer that was selected/applied
    if (offerResult.offersApplied && offerResult.offersApplied.length > 0) {
      console.log('[OfferSummary] Processing offersApplied:', offerResult.offersApplied);
      offerResult.offersApplied.forEach((offer: OfferApplied) => {
        // Check if this is a primary offer type
        const isPrimaryOffer = primaryOfferTypes.includes(offer.ruleCode || '') || 
                              primaryOfferTypes.some(type => offer.description?.toUpperCase().includes(type));
        
        // Check if this is a BOGO/BOG50 offer
        const isBOGOOffer = offer.ruleCode?.includes('BOGO') || offer.ruleCode?.includes('BOG50') || 
                           offer.description?.toUpperCase().includes('BOGO') || 
                           offer.description?.toUpperCase().includes('BUY ONE GET');
        
        // Check if this is a category discount
        const isCategoryDiscount = offer.ruleCode === 'CATEGORY' || 
                                   offer.description?.toUpperCase().includes('DISCOUNT');
        
        // Only add primary offer if none has been added yet (only ONE primary offer)
        // YOPO should be shown even if savings is 0 (when frame and lens prices are equal)
        if (isPrimaryOffer) {
          if (!primaryOfferAdded) {
            // For YOPO, show even if savings is 0 (it's still the applied offer)
            const isYOPO = (offer.ruleCode || '').toUpperCase() === 'YOPO' || 
                          (offer.description || '').toUpperCase().includes('YOPO');
            
            // Show if savings > 0 OR if it's YOPO (even with 0 savings)
            if (offer.savings > 0 || isYOPO) {
              const explanation = getOfferExplanation(offer.ruleCode, offer);
              offers.push({
                type: offer.ruleCode || 'DISCOUNT',
                code: offer.ruleCode || '',
                title: offer.description || 'Discount',
                description: offer.description || '',
                discountAmount: offer.savings || 0,
                explanation,
              });
              primaryOfferAdded = true;
            }
          }
        } 
        // Always add BOGO offers (even with 0 savings, to show as available)
        // BOGO is separate from primary offers
        else if (isBOGOOffer) {
          const explanation = getOfferExplanation(offer.ruleCode, offer);
          offers.push({
            type: offer.ruleCode || 'DISCOUNT',
            code: offer.ruleCode || '',
            title: offer.description || 'Discount',
            description: offer.description || '',
            discountAmount: offer.savings || 0,
            explanation,
          });
        }
        // Always add category discounts (they are separate from primary offers)
        else if (isCategoryDiscount && offer.savings > 0) {
          const explanation = getOfferExplanation(offer.ruleCode, offer);
          offers.push({
            type: 'CATEGORY_DISCOUNT',
            code: offer.ruleCode || '',
            title: offer.description || 'Category Discount',
            description: offer.description || '',
            discountAmount: offer.savings || 0,
            explanation,
          });
        }
        // Add other offers (coupons, etc.) if they have savings
        else if (!isPrimaryOffer && !isBOGOOffer && !isCategoryDiscount && offer.savings > 0) {
          const explanation = getOfferExplanation(offer.ruleCode, offer);
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

    // Category Discount is already included in offersApplied array (added in service with ruleCode 'CATEGORY')
    // Check if it's already in the offers list to avoid duplication
    const categoryDiscountInOffers = offers.some(o => 
      o.code === 'CATEGORY' || 
      o.type === 'CATEGORY_DISCOUNT' ||
      (o.description && offerResult.categoryDiscount?.description && 
       o.description.toUpperCase() === offerResult.categoryDiscount.description.toUpperCase())
    );
    
    // Only add separately if not already in offersApplied and categoryDiscount exists
    // This is a fallback in case category discount wasn't added to offersApplied for some reason
    if (offerResult.categoryDiscount && offerResult.categoryDiscount.savings > 0 && !categoryDiscountInOffers) {
      offers.push({
        type: 'CATEGORY_DISCOUNT',
        code: 'CATEGORY',
        title: offerResult.categoryDiscount.description || 'Category Discount',
        description: offerResult.categoryDiscount.description || '',
        discountAmount: offerResult.categoryDiscount.savings || 0,
        explanation: formatCategoryDiscountExplanation(offerResult.categoryDiscount),
      });
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

    // Second Pair Discount is already included in offersApplied array
    // No need to add it separately here to avoid duplication

    return offers;
  };

  const getExplanationFromLabel = (label: string, discountAmount: number): string => {
    const labelUpper = label.toUpperCase();
    
    // YOPO: "YOPO - Pay higher of frame or lens"
    if (labelUpper.includes('YOPO')) {
      return 'You pay only the higher of frame or lens.';
    }
    
    // Combo: "Combo Price: ?X"
    if (labelUpper.includes('COMBO') || labelUpper.includes('COMBO PRICE')) {
      return 'Special package price applied.';
    }
    
    // Free Lens: "Free Lens (PERCENT_OF_FRAME)" or "Free Lens (VALUE_LIMIT)" or "Free Lens (FULL)"
    if (labelUpper.includes('FREE LENS') || labelUpper.includes('FREE_LENS')) {
      return `Lens free up to ?${Math.round(discountAmount).toLocaleString()}; you pay only difference.`;
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
    
    // Flat OFF: "Flat ?X OFF"
    if (labelUpper.includes('FLAT') && labelUpper.includes('OFF')) {
      const flatMatch = label.match(/FLAT\s*₹?(\d+)\s*OFF/i);
      if (flatMatch) {
        return `Festival Offer -?${flatMatch[1]}`;
      }
      return `Festival Offer -?${Math.round(discountAmount).toLocaleString()}`;
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

  const fetchAvailableLenses = async () => {
    setLoadingLenses(true);
    try {
      const response = await fetch('/api/products/lenses');
      const result = await response.json();
      if (result.success) {
        setAvailableLenses(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch lenses:', error);
    } finally {
      setLoadingLenses(false);
    }
  };

  const fetchFrameBrands = async () => {
    try {
      const storeCode = localStorage.getItem('lenstrack_store_code');
      if (storeCode) {
        const response = await fetch(`/api/public/frame-brands?storeCode=${storeCode}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setFrameBrands(result.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch frame brands:', error);
    }
  };

  const fetchAllApplicableOffers = async (offerResult?: OfferCalculationResult) => {
    try {
      // Use provided offerResult or current data's offerResult
      const currentOfferResult = offerResult || data?.offerResult;
      
      // First, get offers from recommendations API which has all applicable offers
      const recommendationsResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recommendations`
      );
      
      if (recommendationsResponse.ok) {
        const recommendationsData = await recommendationsResponse.json();
        if (recommendationsData.success) {
          const selectedRec = recommendationsData.data.recommendations.find(
            (r: any) => r.id === productId
          );
          
          if (selectedRec) {
            // Get offers from recommendations (if available)
            const recOffers = selectedRec.offers || [];
            
            // Also get formatted offers from current offer result
            let formattedOffers: any[] = [];
            if (currentOfferResult) {
              formattedOffers = formatOffers(currentOfferResult);
            }
            
            // Combine both sources and deduplicate
            const allOffersMap = new Map();
            
            // Add offers from recommendations
            recOffers.forEach((offer: any) => {
              if (offer.code) {
                allOffersMap.set(offer.code, {
                  type: offer.type || 'DISCOUNT',
                  code: offer.code,
                  title: offer.title || offer.description || 'Discount',
                  description: offer.description || '',
                  discountAmount: offer.discountAmount || 0,
                  discountPercent: offer.discountPercent,
                  isApplicable: offer.isApplicable !== false,
                });
              }
            });
            
            // Add formatted offers from offer result
            formattedOffers.forEach(offer => {
              if (offer.code && !allOffersMap.has(offer.code)) {
                allOffersMap.set(offer.code, {
                  type: offer.type,
                  code: offer.code,
                  title: offer.title,
                  description: offer.description,
                  discountAmount: offer.discountAmount || 0,
                  isApplicable: true,
                });
              }
            });
            
            const applicableOffers = Array.from(allOffersMap.values());
            
            setAllApplicableOffersList(applicableOffers);
            
            // Update data with applicable offers
            setData(prev => prev ? {
              ...prev,
              allApplicableOffers: applicableOffers,
            } : null);
            
            console.log('[OfferSummary] Fetched all applicable offers:', applicableOffers.length, applicableOffers);
          }
        }
      }
    } catch (error) {
      console.error('[OfferSummary] Failed to fetch all applicable offers:', error);
    }
  };

  // Update sub-brands when brand is selected
  useEffect(() => {
    if (secondPairBrand && frameBrands.length > 0) {
      const selectedBrand = frameBrands.find(b => b.brandName === secondPairBrand);
      if (selectedBrand && selectedBrand.subBrands) {
        setAvailableSubBrands(selectedBrand.subBrands.map((sb: any) => sb.subBrandName));
      } else {
        setAvailableSubBrands([]);
      }
      // Reset sub-brand if brand changes
      if (selectedBrand && !selectedBrand.subBrands?.some((sb: any) => sb.subBrandName === secondPairSubBrand)) {
        setSecondPairSubBrand('');
      }
    } else {
      setAvailableSubBrands([]);
    }
  }, [secondPairBrand, frameBrands]);

  const recalculateOffersWithSecondPair = async (secondPairData: {
    frameMRP: number;
    brand: string;
    subBrand: string;
    lensId: string;
    lensPrice: number;
  } | null) => {
    if (!data || !productId) return;
    
    try {
      const offersResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            couponCode: null,
            customerCategory: appliedCategory || null,
            secondPair: secondPairData ? {
              enabled: true,
              firstPairTotal: data.offerResult.baseTotal,
              secondPairFrameMRP: secondPairData.frameMRP,
              secondPairLensPrice: secondPairData.lensPrice,
            } : null,
          }),
        }
      );
      
      const offersData = await offersResponse.json();
      if (offersData.success && offersData.data) {
        // Update data with new offer result
        setData(prev => prev ? {
          ...prev,
          offerResult: offersData.data,
        } : null);
      }
    } catch (error) {
      console.error('Failed to recalculate offers with second pair:', error);
    }
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
        <div className="text-center max-w-md bg-slate-800/50 backdrop-blur rounded-xl p-6 sm:p-8 border border-slate-700 shadow-lg">
          <div className="text-5xl mb-4">??</div>
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
  // Filter out offers with zero or negative discount, BUT keep YOPO even if savings is 0
  // YOPO should be shown even with 0 savings because it's the applied offer
  const offers = allOffers.filter(offer => {
    const isYOPO = (offer.code || '').toUpperCase() === 'YOPO' || 
                   (offer.type || '').toUpperCase() === 'YOPO' ||
                   (offer.title || '').toUpperCase().includes('YOPO');
    // Keep YOPO even if discountAmount is 0, otherwise filter out 0 discount offers
    return (offer.discountAmount || 0) > 0 || isYOPO;
  });
  
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
  console.log('[OfferSummary] ?? Upsell Banner Status:', {
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
              {availableCategories.length > 0 ? (
                <Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    // Reset image when category changes
                    setCategoryIdImage(null);
                    setCategoryIdImagePreview(null);
                  }}
                  options={[
                    { value: '', label: 'Select Category' },
                    ...(() => {
                      // Get unique categories (deduplicate by customerCategory)
                      const uniqueCategories = new Map<string, typeof availableCategories[0]>();
                      availableCategories
                        .filter(cat => cat.isActive)
                        .forEach(cat => {
                          if (!uniqueCategories.has(cat.customerCategory)) {
                            uniqueCategories.set(cat.customerCategory, cat);
                          }
                        });
                      
                      return Array.from(uniqueCategories.values()).map(cat => ({
                        value: cat.customerCategory,
                        label: `${cat.customerCategory} - ${cat.discountPercent}% off${cat.maxDiscount ? ` (max ₹${cat.maxDiscount})` : ''}`,
                      }));
                    })(),
                  ]}
                  className="!bg-slate-700/80 !border-2 !border-slate-600 !text-white"
                />
              ) : (
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                  <p className="text-slate-400 text-sm">
                    {availableCategories.length === 0 ? 'No category discounts available' : 'Loading categories...'}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">Check browser console for details</p>
                </div>
              )}
              
              {selectedCategory && (() => {
                const selectedCat = availableCategories.find(c => c.customerCategory === selectedCategory);
                const requiresVerification = selectedCat?.categoryVerificationRequired === true;
                console.log('[OfferSummary] Selected category:', selectedCategory);
                console.log('[OfferSummary] Selected cat object:', selectedCat);
                console.log('[OfferSummary] Requires verification:', requiresVerification);
                
                // Show upload option for all selected categories
                return (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Upload ID Proof {requiresVerification && <span className="text-red-400">*</span>}
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
                );
              })()}
              
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
                    console.log('[OfferSummary] Applying category discount:', selectedCategory);
                    console.log('[OfferSummary] Product ID:', productId);
                    console.log('[OfferSummary] Session ID:', sessionId);
                    
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
                    const requestBody = {
                      productId: productId,
                      couponCode: null,
                      customerCategory: selectedCategory,
                      secondPair: null,
                    };
                    console.log('[OfferSummary] Request body:', requestBody);
                    
                    const offersResponse = await fetch(
                      `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody),
                      }
                    );
                    
                    console.log('[OfferSummary] Response status:', offersResponse.status);
                    const offersData = await offersResponse.json();
                    console.log('[OfferSummary] Response data:', offersData);
                    
                    if (offersData.success && offersData.data) {
                      console.log('[OfferSummary] Category discount in response:', offersData.data.categoryDiscount);
                      console.log('[OfferSummary] Full offer result:', offersData.data);
                      
                      // Apply category discount if it exists (even if savings is 0, to show it's applied)
                      if (offersData.data.categoryDiscount) {
                        setAppliedCategory(selectedCategory);
                        
                        // ✅ BEST PRACTICE: Update session in database (not just localStorage)
                        try {
                          const sessionUpdateResponse = await fetch(
                            `/api/public/questionnaire/sessions/${sessionId}`,
                            {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                customerCategory: selectedCategory,
                              }),
                            }
                          );
                          
                          if (sessionUpdateResponse.ok) {
                            console.log('[OfferSummary] ✅ Session updated with category discount in database');
                          } else {
                            console.warn('[OfferSummary] ⚠️ Failed to update session, but continuing...');
                          }
                        } catch (sessionError) {
                          console.error('[OfferSummary] Error updating session:', sessionError);
                          // Continue even if session update fails (non-critical)
                        }
                        
                        // Update data with new offer result
                        setData(prev => prev ? {
                          ...prev,
                          offerResult: offersData.data,
                        } : null);
                        
                        // Also save to localStorage as fallback (for backward compatibility)
                        localStorage.setItem('lenstrack_category_discount', JSON.stringify({
                          category: selectedCategory,
                          idImage: idImageBase64,
                        }));
                        
                        const discountAmount = offersData.data.categoryDiscount.savings || 0;
                        
                        // Fetch all applicable offers after category is applied
                        await fetchAllApplicableOffers(offersData.data);
                        
                        if (discountAmount > 0) {
                          showToast('success', `Category discount applied! You saved ₹${Math.round(discountAmount).toLocaleString()}`);
                        } else {
                          showToast('success', 'Category discount applied!');
                        }
                      } else {
                        console.warn('[OfferSummary] No category discount in response');
                        showToast('warning', 'No discount available for this category');
                      }
                    } else {
                      console.error('[OfferSummary] API error:', offersData.error);
                      showToast('error', offersData.error?.message || 'Failed to apply category discount');
                    }
                  } catch (error) {
                    console.error('[OfferSummary] Exception applying category discount:', error);
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
                        
                        // Fetch all applicable offers after removing category
                        await fetchAllApplicableOffers(offersData.data);
                        
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

        {/* Second Pair Selection for BOGO Offers */}
        {(() => {
          // Check if there's a BOGO/BOG50 offer available
          // Check in allApplicableOffers, offersApplied, or secondPairDiscount
          const hasBOGOInAllOffers = data.allApplicableOffers?.some((o: any) => 
            o.type === 'BOGO' || o.type === 'BOG50' || o.code?.includes('BOGO') || o.code?.includes('BOG50')
          );
          const hasBOGOInApplied = data.offerResult?.offersApplied?.some((o: any) => 
            o.ruleCode?.includes('BOGO') || o.ruleCode?.includes('BOG50') ||
            o.description?.toUpperCase().includes('BOGO') || o.description?.toUpperCase().includes('BUY ONE GET')
          );
          const hasBOGOOffer = hasBOGOInAllOffers || hasBOGOInApplied || data.offerResult?.secondPairDiscount;
          
          console.log('[OfferSummary] BOGO Offer Check:', {
            hasBOGOInAllOffers,
            hasBOGOInApplied,
            hasSecondPairDiscount: !!data.offerResult?.secondPairDiscount,
            hasBOGOOffer,
            offersApplied: data.offerResult?.offersApplied,
          });
          
          if (!hasBOGOOffer) return null;
          
          return (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                  <Package className="text-purple-400" size={18} />
                </div>
                <h2 className="text-xl font-semibold text-white">Second Pair (BOGO Offer)</h2>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secondPairEnabled}
                    onChange={(e) => {
                      setSecondPairEnabled(e.target.checked);
                      if (!e.target.checked) {
                        // Reset second pair data
                        setSecondPairFrameMRP('');
                        setSecondPairBrand('');
                        setSecondPairSubBrand('');
                        setSecondPairLensId('');
                        setSecondPairLensPrice(0);
                        // Recalculate offers without second pair
                        recalculateOffersWithSecondPair(null);
                      }
                    }}
                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 cursor-pointer"
                  />
                  <span className="text-base font-semibold text-slate-200">
                    Enable Second Pair Discount
                  </span>
                </label>
                
                {secondPairEnabled && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                    <p className="text-sm text-slate-300 font-medium">Enter Second Pair Details:</p>
                    
                    {/* Frame Price */}
                    <Input
                      label="Second Pair Frame MRP"
                      type="number"
                      placeholder="e.g., 1500"
                      value={secondPairFrameMRP}
                      onChange={(e) => {
                        setSecondPairFrameMRP(e.target.value);
                        if (e.target.value && parseFloat(e.target.value) > 0) {
                          recalculateOffersWithSecondPair({
                            frameMRP: parseFloat(e.target.value),
                            brand: secondPairBrand,
                            subBrand: secondPairSubBrand,
                            lensId: secondPairLensId,
                            lensPrice: secondPairLensPrice,
                          });
                        }
                      }}
                      className="!bg-slate-700/80 !border-2 !border-slate-600 !text-white !placeholder:text-slate-500"
                    />
                    
                    {/* Frame Brand */}
                    <Select
                      label="Frame Brand"
                      value={secondPairBrand}
                      onChange={(e) => {
                        setSecondPairBrand(e.target.value);
                        setSecondPairSubBrand(''); // Reset sub-brand when brand changes
                        if (e.target.value && secondPairFrameMRP && parseFloat(secondPairFrameMRP) > 0) {
                          recalculateOffersWithSecondPair({
                            frameMRP: parseFloat(secondPairFrameMRP),
                            brand: e.target.value,
                            subBrand: '',
                            lensId: secondPairLensId,
                            lensPrice: secondPairLensPrice,
                          });
                        }
                      }}
                      options={[
                        { value: '', label: 'Select Brand' },
                        ...frameBrands.map(b => ({ value: b.brandName, label: b.brandName })),
                      ]}
                      className="!bg-slate-700/80 !border-2 !border-slate-600 !text-white"
                    />
                    
                    {/* Frame Sub Brand */}
                    {secondPairBrand && availableSubBrands.length > 0 && (
                      <Select
                        label="Frame Sub Brand"
                        value={secondPairSubBrand}
                        onChange={(e) => {
                          setSecondPairSubBrand(e.target.value);
                          if (secondPairFrameMRP && parseFloat(secondPairFrameMRP) > 0) {
                            recalculateOffersWithSecondPair({
                              frameMRP: parseFloat(secondPairFrameMRP),
                              brand: secondPairBrand,
                              subBrand: e.target.value,
                              lensId: secondPairLensId,
                              lensPrice: secondPairLensPrice,
                            });
                          }
                        }}
                        options={[
                          { value: '', label: 'Select Sub Brand (Optional)' },
                          ...availableSubBrands.map(sb => ({ value: sb, label: sb })),
                        ]}
                        className="!bg-slate-700/80 !border-2 !border-slate-600 !text-white"
                      />
                    )}
                    
                    {/* Lens Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Second Pair Lens
                      </label>
                      <div className="flex gap-3">
                        <Input
                          type="text"
                          placeholder={secondPairLensId ? 'Lens selected' : 'Click to select lens'}
                          value={secondPairLensId ? availableLenses.find(l => l.id === secondPairLensId)?.name || '' : ''}
                          readOnly
                          onClick={() => setShowLensSelectionModal(true)}
                          className="flex-1 !bg-slate-700/80 !border-2 !border-slate-600 !text-white cursor-pointer"
                        />
                        <Button
                          onClick={() => setShowLensSelectionModal(true)}
                          variant="outline"
                          className="border-2 border-slate-600 text-slate-300 hover:border-purple-500 hover:text-purple-400"
                        >
                          <Eye size={18} className="mr-2" />
                          Select Lens
                        </Button>
                      </div>
                      {secondPairLensPrice > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          Selected lens price: ₹{Math.round(secondPairLensPrice).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Price Breakdown Card */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <Tag className="text-blue-400" size={18} />
            </div>
            <h2 className="text-xl font-semibold text-white">Price Breakdown</h2>
          </div>

          <div className="space-y-4">
            {/* Price Components - Use priceComponents array for accurate breakdown */}
            {data.offerResult.priceComponents && data.offerResult.priceComponents.length > 0 ? (
              <>
                {data.offerResult.priceComponents
                  .filter((component: any) => {
                    // Filter out category discounts from price breakdown
                    // Category discounts should only show in applicable offers section
                    const labelLower = (component.label || '').toLowerCase();
                    const isCategoryDiscount = labelLower.includes('category') || 
                                              labelLower.includes('student') ||
                                              labelLower.includes('doctor') ||
                                              labelLower.includes('teacher') ||
                                              labelLower.includes('senior') ||
                                              labelLower.includes('corporate') ||
                                              labelLower.includes('armed') ||
                                              labelLower.includes('forces');
                    
                    // Filter out any component with 0 discount amount
                    const hasZeroDiscount = component.amount < 0 && Math.abs(component.amount) === 0;
                    
                    // Filter out components with "0 off" or "₹0" in label
                    const hasZeroInLabel = labelLower.includes('₹0') || 
                                          labelLower.includes('0 off') ||
                                          labelLower.includes('flat ₹0') ||
                                          labelLower.includes('flat 0');
                    
                    return !isCategoryDiscount && !hasZeroDiscount && !hasZeroInLabel;
                  })
                  .map((component: any, index: number) => {
                    // Show all components - positive amounts are prices, negative are discounts
                    if (component.amount < 0) {
                      // Discount component - show with green styling
                      // Don't show if discount is 0
                      if (Math.abs(component.amount) === 0) {
                        return null;
                      }
                      return (
                        <div key={index} className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 rounded-lg border-2 border-green-400/50">
                          <span className="text-green-200 font-medium">{component.label}</span>
                          <span className="text-lg font-bold text-green-300">-₹{Math.round(Math.abs(component.amount)).toLocaleString()}</span>
                        </div>
                      );
                    } else {
                      // Price component
                      return (
                        <div key={index} className="flex justify-between items-center py-3 px-4 bg-slate-700/50 rounded-lg border border-slate-600">
                          <span className="text-slate-300 font-medium">{component.label}</span>
                          <span className="text-lg font-semibold text-white">₹{Math.round(component.amount).toLocaleString()}</span>
                        </div>
                      );
                    }
                  })
                  .filter(Boolean) // Remove null entries (0 discounts)
                }
              </>
            ) : (
              <>
                {/* Fallback to original display if priceComponents not available */}
                {data.offerResult.frameMRP > 0 && (
                  <div className="flex justify-between items-center py-3 px-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <span className="text-slate-300 font-medium">Frame MRP</span>
                    <span className="text-lg font-semibold text-white">₹{Math.round(data.offerResult.frameMRP).toLocaleString()}</span>
                  </div>
                )}
                {data.offerResult.lensPrice > 0 && (
                  <div className="flex justify-between items-center py-3 px-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <span className="text-slate-300 font-medium">Lens Price</span>
                    <span className="text-lg font-semibold text-white">₹{Math.round(data.offerResult.lensPrice).toLocaleString()}</span>
                  </div>
                )}
              </>
            )}

            {/* Applied Offers */}
            <div className="py-4 border-t border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-lg animate-pulse" />
                  <Gift className="relative text-blue-400" size={18} />
                </div>
                <h3 className="text-lg font-semibold text-white">🎉 All Applicable Offers</h3>
              </div>
              {(() => {
                // Combine applied offers with all applicable offers from recommendations and fetched list
                const allApplicableOffers = data.allApplicableOffers || [];
                const fetchedApplicableOffers = allApplicableOffersList || [];
                const appliedOfferCodes = new Set(offers.map(o => o.code));
                
                // Show applied offers first
                const displayOffers = [...offers];
                
                // Combine all sources of applicable offers
                const combinedOffers = [...allApplicableOffers, ...fetchedApplicableOffers];
                
                // Add other applicable offers that aren't applied yet
                combinedOffers.forEach((offer: any) => {
                  // Skip if already applied
                  if (appliedOfferCodes.has(offer.code)) {
                    return;
                  }
                  
                  // Calculate discount amount if not provided
                  let discountAmount = offer.discountAmount;
                  if (!discountAmount && offer.discountPercent) {
                    discountAmount = Math.round((data.offerResult.baseTotal * (offer.discountPercent || 0)) / 100);
                  }
                  
                  // Include offer if it has discount or is a freebie type
                  if (discountAmount > 0 || offer.type === 'FREE_LENS' || offer.type === 'BONUS_FREE_PRODUCT' || offer.isApplicable) {
                    // Check if not already in displayOffers
                    if (!displayOffers.find(o => o.code === offer.code)) {
                      displayOffers.push({
                        type: offer.type || 'DISCOUNT',
                        code: offer.code || '',
                        title: offer.title || offer.description || 'Discount',
                        description: offer.description || '',
                        discountAmount: discountAmount || 0,
                        explanation: getExplanationFromLabel(offer.description || offer.title || '', discountAmount || 0),
                      });
                    }
                  }
                });
                
                return displayOffers.length > 0 ? (
                  <div className="space-y-3">
                    {displayOffers.map((offer, idx) => {
                      const isApplied = offers.some(o => o.code === offer.code);
                      return (
                        <div 
                          key={`${offer.code || offer.type || 'offer'}-${idx}`}
                          className={`group relative overflow-hidden rounded-lg p-4 border-2 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer ${
                            isApplied
                              ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border-blue-500/50 hover:border-blue-400'
                              : 'bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 border-slate-600/50 hover:border-slate-500 hover:border-yellow-500/50'
                          }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {isApplied ? (
                                  <span className="px-2 py-0.5 bg-green-500/30 text-green-300 text-xs font-semibold rounded border border-green-500/50">
                                    ✓ Applied
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-yellow-500/30 text-yellow-300 text-xs font-semibold rounded border border-yellow-500/50">
                                    Available
                                  </span>
                                )}
                                {offer.code && offer.code !== 'DISCOUNT' && offer.code.length > 0 && (
                                  <span className={`px-3 py-1 text-white text-xs font-bold rounded-lg border shadow-lg whitespace-nowrap ${
                                    isApplied
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 border-blue-400/50'
                                      : 'bg-slate-600 border-slate-500'
                                  }`}>
                                    {offer.code}
                                  </span>
                                )}
                                <span className="text-base font-bold text-white break-words">{offer.title || 'Discount'}</span>
                              </div>
                              {offer.explanation && (
                                <p className={`text-sm mt-1 break-words ${isApplied ? 'text-blue-200' : 'text-slate-300'}`}>
                                  {offer.explanation}
                                </p>
                              )}
                              {!isApplied && (
                                <p className="text-xs text-yellow-400 mt-2 italic">
                                  Note: A better offer is currently applied. This offer would save ₹{Math.round(offer.discountAmount || 0).toLocaleString()}.
                                </p>
                              )}
                            </div>
                            {(offer.discountAmount || 0) > 0 && (
                              <div className="ml-4 text-right flex-shrink-0">
                                <div className={`rounded-lg px-3 py-1 border shadow-lg whitespace-nowrap ${
                                  isApplied
                                    ? 'bg-gradient-to-r from-green-400 to-emerald-400 border-green-300/50'
                                    : 'bg-slate-600 border-slate-500'
                                }`}>
                                  <span className="text-lg font-bold text-white">
                                    -₹{Math.round(offer.discountAmount || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400 text-sm italic">No offers available</p>
                  </div>
                );
              })()}
            </div>

            {/* Discount components are already shown above, no need to duplicate */}

            {/* Subtotal - Show effectiveBase if YOPO/Combo is applied, otherwise baseTotal */}
            <div className="flex justify-between items-center py-4 px-4 bg-slate-700/70 rounded-lg border border-slate-600">
              <span className="text-lg font-semibold text-white">Subtotal</span>
              <span className="text-xl font-semibold text-white">
                ₹{Math.round((data.offerResult.effectiveBase ?? data.offerResult.baseTotal)).toLocaleString()}
              </span>
            </div>

            {/* Total Discount - Only show if there are additional discounts beyond primary offer */}
            {(() => {
              // Calculate discount from offersApplied (excluding primary offer which is already in effectiveBase)
              const additionalDiscount = data.offerResult.categoryDiscount?.savings || 0 
                + (data.offerResult.couponDiscount?.savings || 0)
                + (data.offerResult.secondPairDiscount?.savings || 0);
              
              // Total discount is baseTotal - finalPayable
              const actualTotalDiscount = data.offerResult.baseTotal - data.offerResult.finalPayable;
              
              // Only show if there's a discount and it's not already shown in priceComponents
              if (actualTotalDiscount > 0) {
                return (
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
                      -₹{Math.round(actualTotalDiscount).toLocaleString()}
                    </span>
                  </div>
                );
              }
              return null;
            })()}

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
              // Navigate directly to checkout, skipping accessories page
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
                    ?? {data.offerResult.upsell.rewardText}
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
            
            console.log('[OfferSummary] ?? Showing fallback upsell banner:', {
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
                        ?? Unlock amazing rewards with just a little more!
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
          
          console.log('[OfferSummary] ?? No fallback upsell banner - customer total too high or too low');
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
                                  ? Adding this will unlock your reward!
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

      {/* Lens Selection Modal for Second Pair */}
      {showLensSelectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 px-6 py-5 border-b border-purple-700 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Select Second Pair Lens</h2>
                  <p className="text-purple-100 text-sm">Choose a lens for your second pair</p>
                </div>
                <button
                  onClick={() => setShowLensSelectionModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingLenses ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  <p className="text-slate-600">Loading lenses...</p>
                </div>
              ) : availableLenses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600">No lenses available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableLenses.map((lens) => (
                    <div
                      key={lens.id}
                      className={`border-2 rounded-xl p-5 hover:shadow-lg transition-all bg-white group ${
                        secondPairLensId === lens.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-2">{lens.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-slate-600 mb-3 flex-wrap">
                            {lens.brandLine && (
                              <>
                                <span className="font-medium text-slate-700">{lens.brandLine}</span>
                                <span className="text-slate-400">•</span>
                              </>
                            )}
                            {lens.index && (
                              <>
                                <span>Index {lens.index}</span>
                                <span className="text-slate-400">•</span>
                              </>
                            )}
                            {lens.itCode && (
                              <span className="text-slate-500">IT Code: {lens.itCode}</span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">₹{Math.round(lens.price || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSecondPairLensId(lens.id);
                            setSecondPairLensPrice(lens.price || 0);
                            setShowLensSelectionModal(false);
                            // Recalculate offers with selected lens
                            if (secondPairFrameMRP && parseFloat(secondPairFrameMRP) > 0) {
                              recalculateOffersWithSecondPair({
                                frameMRP: parseFloat(secondPairFrameMRP),
                                brand: secondPairBrand,
                                subBrand: secondPairSubBrand,
                                lensId: lens.id,
                                lensPrice: lens.price || 0,
                              });
                            }
                          }}
                          className={`font-bold px-8 py-3 shadow-md hover:shadow-lg transition-all whitespace-nowrap ${
                            secondPairLensId === lens.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                          }`}
                        >
                          {secondPairLensId === lens.id ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-purple-50 border-t-2 border-slate-200 px-6 py-4 rounded-b-3xl">
              <Button
                fullWidth
                onClick={() => setShowLensSelectionModal(false)}
                variant="outline"
                className="border-2 border-slate-300 text-slate-700 hover:bg-white hover:border-purple-400 font-semibold py-3 shadow-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

