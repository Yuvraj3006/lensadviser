'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  CheckCircle, 
  Star, 
  Sparkles, 
  Tag, 
  ShoppingBag, 
  Phone, 
  ArrowRight,
  RefreshCw,
  Gift,
  Flame,
  Crown,
  Percent,
  Package,
  Eye,
  Shield,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  BadgePercent,
  Ticket,
  CircleDollarSign,
  Calculator
} from 'lucide-react';

interface Feature {
  name: string;
  key: string;
  strength: number;
}

interface LensPricing {
  baseLensPrice: number;
  featureAddons: { name: string; price: number }[];
  totalLensPrice: number;
}

interface PricingBreakdown {
  framePrice: number;
  lensPrice: LensPricing;
  subtotal: number;
  appliedOffer?: {
    name: string;
    discountAmount: number;
    discountPercent: number;
  };
  finalPrice: number;
  savings: number;
}

interface StoreInfo {
  priceOverride?: number | null;
  stockQuantity: number;
  isAvailable: boolean;
  finalPrice: number;
  discount?: number;
}

interface Offer {
  type: string;
  code: string;
  title: string;
  description: string;
  discountPercent?: number;
  discountAmount?: number;
  minPurchase?: number;
  isApplicable: boolean;
}

interface Recommendation {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  brand?: string | null;
  basePrice: number;
  imageUrl?: string | null;
  category: string;
  matchScore: number;
  matchPercent?: number; // Match percentage (0-100)
  rank: number;
  features: Feature[];
  storeInfo?: StoreInfo;
  pricing: PricingBreakdown;
  offers: Offer[];
  tintOption?: string; // For Power Sunglasses flow
  baseOfferPrice?: number; // For tint color selection
  lensIndex?: string; // Lens index (e.g., 'INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174')
  indexRecommendation?: {
    recommendedIndex: string; // INDEX_156, INDEX_160, etc.
    indexDelta: number; // >0 thinner, 0 ideal, <0 thicker
    validationMessage?: string | null; // Warning or error message
    isInvalid?: boolean; // True if violates rules (e.g., INDEX_156 for rimless)
    isWarning?: boolean; // True if thicker than recommended
  };
  thicknessWarning?: boolean; // Show warning if index is thicker than recommended
  indexInvalid?: boolean; // True if index selection violates rules
  bandPricing?: {
    applied: boolean;
    extra: number;
    matchedBand?: {
      minPower: number;
      maxPower: number;
      extraCharge: number;
    };
  };
}

interface RecommendationData {
  sessionId: string;
  category: string;
  customerName?: string | null;
  recommendations: Recommendation[];
  answeredFeatures: { feature: string; weight: number }[];
  generatedAt: string;
  recommendedIndex?: string; // Recommended index for the prescription
  store: {
    name: string;
    city?: string;
    phone?: string;
  };
}

const getFeatureIcon = (key: string) => {
  const icons: Record<string, typeof Eye> = {
    blue_light_filter: Eye,
    anti_scratch: Shield,
    anti_glare: Sparkles,
    progressive_lens: Zap,
    uv_protection: Shield,
  };
  return icons[key] || Sparkles;
};

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return { 
        label: '🥇 Best Match', 
        color: 'from-yellow-400 via-amber-500 to-yellow-500', 
        bg: 'bg-yellow-500/20',
        textColor: 'text-yellow-900',
        borderColor: 'border-yellow-500'
      };
    case 2:
      return { 
        label: '🥈 Great Choice', 
        color: 'from-gray-300 via-gray-400 to-gray-500', 
        bg: 'bg-gray-400/20',
        textColor: 'text-gray-900',
        borderColor: 'border-gray-400'
      };
    case 3:
      return { 
        label: '🥉 Top Pick', 
        color: 'from-orange-400 via-orange-500 to-orange-600', 
        bg: 'bg-orange-500/20',
        textColor: 'text-orange-900',
        borderColor: 'border-orange-500'
      };
    default:
      return { 
        label: `#${rank}`, 
        color: 'from-blue-500 via-blue-600 to-blue-700', 
        bg: 'bg-blue-500/20',
        textColor: 'text-blue-900',
        borderColor: 'border-blue-500'
      };
  }
};

export default function RecommendationsPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params.sessionId as string;

  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [expandedOffers, setExpandedOffers] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [secondPairEnabled, setSecondPairEnabled] = useState(false);
  const [secondPairFrameMRP, setSecondPairFrameMRP] = useState('');
  const [secondPairLensPrice, setSecondPairLensPrice] = useState('');
  const [recalculatedOffers, setRecalculatedOffers] = useState<Record<string, any>>({});
  const [showKnowMoreModal, setShowKnowMoreModal] = useState<string | null>(null);
  const [showViewAllModal, setShowViewAllModal] = useState(false);
  const [sortBy, setSortBy] = useState<'price-high' | 'price-low' | 'match' | 'index'>('price-high');

  useEffect(() => {
    if (sessionId) {
      fetchRecommendations();
    }
  }, [sessionId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      console.log('[fetchRecommendations] Fetching recommendations for session:', sessionId);
      
      const response = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recommendations`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('[fetchRecommendations] Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const status = response.status;
        const statusText = response.statusText || 'Unknown';
        const errorText = await response.text();
        
        // Log each value separately to avoid object serialization issues
        console.error('[fetchRecommendations] Response not OK');
        console.error('Status:', status);
        console.error('Status Text:', statusText);
        console.error('Error Text:', errorText);
        console.error('Error Text Length:', errorText?.length || 0);
        
        let errorData: any = {};
        let errorMessage = `Failed to load recommendations (${status})`;
        
        if (errorText && errorText.trim()) {
          try {
            errorData = JSON.parse(errorText);
            console.error('Parsed Error Data:', errorData);
            
            // Extract error message from various possible structures
            errorMessage = 
              errorData?.error?.message || 
              errorData?.message || 
              errorData?.error?.code ||
              errorData?.error ||
              errorText.substring(0, 100) ||
              errorMessage;
          } catch (parseError) {
            console.error('[fetchRecommendations] Failed to parse error JSON:', parseError);
            console.error('Raw error text:', errorText.substring(0, 500));
            errorData = { 
              error: { 
                message: `HTTP ${status}: ${statusText}`,
                code: 'PARSE_ERROR',
              } 
            };
            errorMessage = errorText.substring(0, 200) || errorMessage;
          }
        } else {
          console.error('[fetchRecommendations] Empty error text received');
          errorMessage = `Server returned ${status} ${statusText} with no error details`;
        }
        
        console.error('[fetchRecommendations] Final error message:', errorMessage);
        
        showToast('error', errorMessage);
        router.push('/questionnaire');
        return;
      }

      const result = await response.json();

      if (result.success) {
        // Convert generatedAt from Date string to Date object if needed
        if (result.data.generatedAt && typeof result.data.generatedAt === 'string') {
          result.data.generatedAt = new Date(result.data.generatedAt).toISOString();
        }
        
        setData(result.data);
        if (result.data.recommendations && result.data.recommendations.length > 0) {
          setSelectedProduct(result.data.recommendations[0].id);
          // Set default offer for each product
          const defaultOffers: Record<string, string> = {};
          result.data.recommendations.forEach((rec: Recommendation) => {
            if (rec.offers && rec.offers.length > 0) {
              const bestOffer = rec.offers.find(o => o.isApplicable && (o.discountAmount || 0) > 0);
              if (bestOffer) {
                defaultOffers[rec.id] = bestOffer.code;
              }
            }
          });
          setSelectedOffer(defaultOffers);
        } else {
          showToast('error', 'No recommendations found');
        }
      } else {
        const errorObj = result.error || {};
        const errorMessage = errorObj.message || errorObj.code || 'Failed to load recommendations';
        console.error('[fetchRecommendations] API returned error:', { error: errorObj, fullResponse: result });
        showToast('error', errorMessage);
        router.push('/questionnaire');
      }
    } catch (error: any) {
      console.error('[fetchRecommendations] Exception caught:');
      console.error('Error type:', typeof error);
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Error name:', error?.name);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string'
          ? error
          : 'An error occurred while loading recommendations';
      
      console.error('[fetchRecommendations] Showing error toast:', errorMessage);
      showToast('error', errorMessage);
      router.push('/questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOffer = (productId: string, offerCode: string) => {
    setSelectedOffer(prev => ({ ...prev, [productId]: offerCode }));
  };

  const calculatePriceWithOffer = (rec: Recommendation, offerCode?: string) => {
    // Check if we have recalculated offers (with coupon/second pair)
    const recalculated = recalculatedOffers[rec.id];
    if (recalculated) {
      return {
        finalPrice: recalculated.finalPayable,
        savings: recalculated.baseTotal - recalculated.finalPayable,
        offer: recalculated.offersApplied[0] || null,
        categoryDiscount: recalculated.categoryDiscount,
        couponDiscount: recalculated.couponDiscount,
        secondPairDiscount: recalculated.secondPairDiscount,
        priceComponents: recalculated.priceComponents,
      };
    }

    // Use original offers
    const offer = rec.offers.find(o => o.code === offerCode);
    if (offer && offer.discountAmount) {
      return {
        finalPrice: rec.pricing.subtotal - offer.discountAmount,
        savings: offer.discountAmount,
        offer,
      };
    }
    return {
      finalPrice: rec.pricing.finalPrice,
      savings: rec.pricing.savings,
      offer: rec.offers.find(o => o.isApplicable && (o.discountAmount || 0) > 0),
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-spin" 
                 style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
            <div className="absolute inset-2 rounded-full bg-slate-900 flex items-center justify-center">
              <Sparkles className="text-blue-400 animate-pulse" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Finding Your Perfect Lens</h2>
          <p className="text-slate-400">Calculating best prices and offers...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.recommendations || data.recommendations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-xl">
          <div className="text-7xl mb-6 animate-bounce">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-3">No Recommendations Found</h2>
          <p className="text-slate-300 mb-6 text-base">
            We couldn't find matching products at this time. Please contact our staff for personalized assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => router.push('/questionnaire')}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <RefreshCw size={18} className="mr-2" />
              Start New Questionnaire
            </Button>
            {data?.store?.phone && (
              <Button 
                variant="outline"
                onClick={() => window.location.href = `tel:${data.store.phone}`}
                className="border-2 border-slate-600 text-slate-300 hover:border-emerald-500"
              >
                <Phone size={18} className="mr-2" />
                Call Store
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const selectedRec = data.recommendations.find((r) => r.id === selectedProduct);
  const selectedPricing = selectedRec ? calculatePriceWithOffer(selectedRec, selectedOffer[selectedRec.id]) : null;

  // Helper function to extract index value for sorting (thinnest first = higher index number)
  const getIndexValue = (rec: Recommendation): number => {
    // Try to get from lensIndex field first
    if (rec.lensIndex) {
      const indexMap: Record<string, number> = {
        'INDEX_156': 1.56,
        'INDEX_160': 1.60,
        'INDEX_167': 1.67,
        'INDEX_174': 1.74,
        'INDEX_150': 1.50,
        'INDEX_PC': 1.59,
      };
      return indexMap[rec.lensIndex] || 1.50;
    }
    // Fallback: extract from name
    const match = rec.name.match(/\d+\.\d+/);
    return match ? parseFloat(match[0]) : 1.50;
  };

  // Sort recommendations based on sortBy, then get first 4
  const sortedForDisplay = [...data.recommendations].sort((a, b) => {
    switch (sortBy) {
      case 'price-high':
        return calculatePriceWithOffer(b, selectedOffer[b.id]).finalPrice - calculatePriceWithOffer(a, selectedOffer[a.id]).finalPrice;
      case 'price-low':
        return calculatePriceWithOffer(a, selectedOffer[a.id]).finalPrice - calculatePriceWithOffer(b, selectedOffer[b.id]).finalPrice;
      case 'match':
        return b.matchScore - a.matchScore;
      case 'index':
        // Sort by index (thinnest first = higher index number = descending order)
        return getIndexValue(b) - getIndexValue(a);
      default:
        return a.rank - b.rank;
    }
  });
  
  // Get first 4 recommendations for LA-05 spec
  const topFourRecommendations = sortedForDisplay.slice(0, 4);

  // Get tag for each recommendation based on rank
  const getRoleTag = (rank: number, allRecs: typeof data.recommendations): 'BEST_MATCH' | 'RECOMMENDED_INDEX' | 'PREMIUM' | 'ANTI_WALKOUT' => {
    if (rank === 1) return 'BEST_MATCH';
    if (rank === 2) return 'RECOMMENDED_INDEX';
    if (rank === 3) return 'PREMIUM';
    // Rank 4 or lowest price option = Anti-Walkout
    return 'ANTI_WALKOUT';
  };

  // Sort all recommendations for View All modal
  const sortedRecommendations = [...data.recommendations].sort((a, b) => {
    switch (sortBy) {
      case 'price-high':
        return calculatePriceWithOffer(b, selectedOffer[b.id]).finalPrice - calculatePriceWithOffer(a, selectedOffer[a.id]).finalPrice;
      case 'price-low':
        return calculatePriceWithOffer(a, selectedOffer[a.id]).finalPrice - calculatePriceWithOffer(b, selectedOffer[b.id]).finalPrice;
      case 'match':
        return b.matchScore - a.matchScore;
      case 'index':
        // Sort by index (thinnest first = higher index number = descending order)
        return getIndexValue(b) - getIndexValue(a);
      default:
        return a.rank - b.rank;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* LA-05: Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 py-8 px-6 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg mb-2">
                Best Lenses for You
              </h1>
              <p className="text-emerald-50 text-base font-medium">
                We analyzed your power, frame and lifestyle to recommend 4 options.
              </p>
            </div>
            <div className="text-right bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/20">
              <p className="text-white font-semibold text-base">{data.store.name}</p>
              {data.store.city && (
                <p className="text-emerald-100 text-sm">{data.store.city}</p>
              )}
              {data.store.phone && (
                <p className="text-white flex items-center gap-2 justify-end mt-2 text-sm font-medium">
                  <Phone size={14} /> {data.store.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Sorting Controls */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-300">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border-2 border-slate-600 rounded-lg text-sm font-semibold text-slate-200 bg-slate-800 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="match">Best Match First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
              <option value="index">Thinnest First (Index)</option>
            </select>
          </div>
          <div className="text-sm text-slate-400">
            Showing {topFourRecommendations.length} of {data.recommendations.length} recommendations
          </div>
        </div>

        {/* LA-05: 4-Card Layout - Vertical scroll on mobile */}
        <div className="space-y-6 mb-10">
          {topFourRecommendations.map((rec) => {
            const roleTag = getRoleTag(rec.rank, data.recommendations);
            const tagConfig = {
              BEST_MATCH: { label: 'Best Match', color: 'bg-blue-600 text-white' },
              RECOMMENDED_INDEX: { label: 'Recommended Index', color: 'bg-green-600 text-white' },
              PREMIUM: { label: 'Premium Upgrade', color: 'bg-purple-600 text-white' },
              ANTI_WALKOUT: { label: 'Anti-Walkout (Lowest Price)', color: 'bg-orange-600 text-white' },
            }[roleTag];
            
            const priceInfo = calculatePriceWithOffer(rec, selectedOffer[rec.id]);
            const lensPrice = rec.pricing.lensPrice.totalLensPrice;
            
            // Check if coupon is applied for this product
            const hasCouponDiscount = priceInfo.couponDiscount && priceInfo.couponDiscount.savings > 0;
            
            // Extract lens index from product name or use default
            const lensIndex = rec.name.match(/\d+\.\d+/)?.[0] || '1.50';
            const indexLabel = lensIndex === '1.50' ? 'Standard' : lensIndex === '1.60' ? 'Thin' : lensIndex === '1.67' ? 'Thinner' : lensIndex === '1.74' ? 'Thinnest' : 'Standard';
            
            // Get brand line from product name or brand
            const brandLine = rec.brand || 'Premium';
            
            // Get 3-4 key benefits from features
            const benefits = rec.features.slice(0, 4).map(f => f.name);
            
            // Check for YOPO, Combo, Free Lens eligibility
            const hasYOPO = rec.offers.some(o => o.type === 'YOPO' && o.isApplicable);
            const hasCombo = rec.offers.some(o => o.type === 'COMBO' && o.isApplicable);
            const hasFreeLens = rec.offers.some(o => o.type === 'FREE_LENS' && o.isApplicable);

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-2xl hover:border-blue-300 transition-all duration-300 overflow-hidden group"
              >
                {/* Tag & Match Score Header */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${tagConfig.color} shadow-sm`}>
                      {tagConfig.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-slate-700">
                        {Math.round(rec.matchScore)}% Match
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Lens Name + Brand Line */}
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">{rec.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">{brandLine}</span>
                      <span className="text-slate-400">•</span>
                      <span>Index {lensIndex}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                        {indexLabel}
                      </span>
                    </div>
                  </div>

                  {/* Benefits */}
                  {benefits.length > 0 && (
                    <div className="mb-5">
                      <ul className="space-y-2">
                        {benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-3">
                            <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="leading-relaxed">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowKnowMoreModal(rec.id);
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-3 flex items-center gap-1 group-hover:underline transition-all"
                      >
                        Know more
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* Price Row */}
                  <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-600">Final Price:</span>
                      <span className="text-2xl font-bold text-slate-900">₹{Math.round(priceInfo.finalPrice).toLocaleString()}</span>
                      {priceInfo.finalPrice < rec.pricing.subtotal && (
                        <span className="text-sm text-slate-500 line-through ml-2">
                          ₹{Math.round(rec.pricing.subtotal).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {/* Band Pricing Display */}
                    {rec.bandPricing?.applied && rec.bandPricing.extra > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                        <span className="font-medium">Power Band Extra:</span>
                        <span className="font-semibold text-slate-700">+₹{Math.round(rec.bandPricing.extra).toLocaleString()}</span>
                        {rec.bandPricing.matchedBand && (
                          <span className="text-slate-500">
                            ({rec.bandPricing.matchedBand.minPower}D - {rec.bandPricing.matchedBand.maxPower}D)
                          </span>
                        )}
                      </div>
                    )}
                    {hasCouponDiscount && (
                      <div className="mt-2 flex items-center gap-2">
                        <Ticket size={14} className="text-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-700">
                          Coupon Applied: Save ₹{Math.round(priceInfo.couponDiscount!.savings).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {priceInfo.savings > 0 && !hasCouponDiscount && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        You save ₹{Math.round(priceInfo.savings).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Icons/Tags */}
                  {(hasYOPO || hasCombo || hasFreeLens) && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {hasYOPO && (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 text-xs font-semibold rounded-lg border border-yellow-200 shadow-sm flex items-center gap-1">
                          <Star size={12} className="fill-yellow-600" />
                          YOPO
                        </span>
                      )}
                      {hasCombo && (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-xs font-semibold rounded-lg border border-purple-200 shadow-sm flex items-center gap-1">
                          <Package size={12} />
                          Combo Eligible
                        </span>
                      )}
                      {hasFreeLens && (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs font-semibold rounded-lg border border-green-200 shadow-sm flex items-center gap-1">
                          <Gift size={12} />
                          Free Lens Possible
                        </span>
                      )}
                    </div>
                  )}

                  {/* Primary CTA */}
                  <Button
                    fullWidth
                    onClick={() => {
                      setSelectedProduct(rec.id);
                      
                      // Check if this is Power Sunglasses flow
                      const lensType = localStorage.getItem('lenstrack_lens_type');
                      const isPowerSunglasses = lensType === 'SUNGLASSES';
                      
                      // Check if lens has tint option (TINT/PHOTOCHROMIC/TRANSITION)
                      const isTintLens = rec.tintOption && ['TINT', 'PHOTOCHROMIC', 'TRANSITION'].includes(rec.tintOption);
                      
                      if (isPowerSunglasses && isTintLens) {
                        // Save selected lens and navigate to tint color selection
                        localStorage.setItem(`lenstrack_selected_lens_${sessionId}`, JSON.stringify({
                          id: rec.id,
                          name: rec.name,
                          baseOfferPrice: rec.pricing?.lensPrice?.totalLensPrice || rec.basePrice || 0,
                          tintOption: rec.tintOption,
                        }));
                        router.push(`/questionnaire/${sessionId}/tint-color-selection`);
                      } else {
                        // Navigate to offer summary page (normal flow)
                        router.push(`/questionnaire/${sessionId}/offer-summary/${rec.id}`);
                      }
                    }}
                    className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold py-4 text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    <ShoppingBag size={20} className="mr-2" />
                    Select This Lens
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* LA-05: Bottom section - View All Lens Options button */}
        <div className="text-center mb-10">
          <Button
            onClick={() => setShowViewAllModal(true)}
            variant="outline"
            className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-blue-400 font-semibold px-10 py-4 text-base shadow-md hover:shadow-lg transition-all"
          >
            <Eye size={20} className="mr-2" />
            View All Lens Options
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>

        {/* Coupon Code & Second Pair Section - Keep for now */}
        <div className="mb-6 space-y-4">
          {/* Coupon Code */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-xl p-5 border-2 border-slate-700/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center border border-yellow-500/30">
                <Ticket size={24} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Have a Coupon Code?
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g., WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 rounded-lg border-2 border-slate-600 bg-slate-700/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50 transition-colors"
                    style={{ backgroundColor: 'rgba(51, 65, 85, 0.8)', color: 'white' }}
                  />
                  <Button
                    onClick={async () => {
                      if (!couponCode || !selectedProduct) return;
                      setApplyingCoupon(true);
                      try {
                        const response = await fetch(
                          `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              productId: selectedProduct,
                              couponCode: couponCode,
                              secondPair: secondPairEnabled ? {
                                enabled: true,
                                firstPairTotal: selectedRec?.pricing.subtotal || 0,
                                secondPairFrameMRP: parseFloat(secondPairFrameMRP) || 0,
                                secondPairLensPrice: parseFloat(secondPairLensPrice) || 0,
                              } : null,
                            }),
                          }
                        );
                        const result = await response.json();
                        if (result.success) {
                          // Check if coupon was actually applied or if there's an error
                          if (result.data.couponError) {
                            // Coupon validation failed
                            showToast('error', result.data.couponError);
                            setAppliedCouponCode(null);
                            setCouponCode('');
                          } else if (result.data.couponDiscount) {
                            // Coupon applied successfully
                            setAppliedCouponCode(couponCode);
                            setRecalculatedOffers(prev => ({
                              ...prev,
                              [selectedProduct]: result.data,
                            }));
                            const discountAmount = result.data.couponDiscount.savings || 0;
                            showToast('success', `Coupon applied! You saved ₹${Math.round(discountAmount).toLocaleString()}`);
                          } else {
                            // Coupon code was provided but no discount was applied
                            showToast('warning', 'Coupon code is valid but no discount was applied');
                            setAppliedCouponCode(null);
                          }
                        } else {
                          showToast('error', result.error?.message || 'Failed to apply coupon');
                          setAppliedCouponCode(null);
                        }
                      } catch (error) {
                        showToast('error', 'Failed to apply coupon');
                      } finally {
                        setApplyingCoupon(false);
                      }
                    }}
                    disabled={!couponCode || applyingCoupon}
                    loading={applyingCoupon}
                    className={appliedCouponCode === couponCode 
                      ? "bg-green-500 hover:bg-green-600 text-white font-semibold" 
                      : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg"
                    }
                  >
                    {appliedCouponCode === couponCode ? (
                      <>
                        <Check size={18} className="mr-2" />
                        Applied
                      </>
                    ) : (
                      'Apply Coupon'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Second Pair Toggle */}
          {selectedProduct && (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-xl p-5 border-2 border-slate-700/50 shadow-lg">
              <label className="flex items-center gap-4 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={secondPairEnabled}
                    onChange={(e) => setSecondPairEnabled(e.target.checked)}
                    className="w-6 h-6 rounded border-2 border-slate-600 bg-slate-700 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 cursor-pointer"
                  />
                  {secondPairEnabled && (
                    <CheckCircle className="absolute top-0 left-0 w-6 h-6 text-emerald-500 pointer-events-none" size={24} />
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <Package size={18} className="text-purple-400" />
                    Buy Second Pair?
                  </span>
                  <p className="text-sm text-slate-400 mt-1">Get additional discount on second pair</p>
                </div>
              </label>
              
              {secondPairEnabled && (
                <div className="mt-5 pt-4 border-t border-slate-700/50">
                  <p className="text-sm text-slate-300 mb-3 font-medium">Enter Second Pair Details:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Second Pair Frame MRP"
                      type="number"
                      placeholder="e.g., 1500"
                      value={secondPairFrameMRP}
                      onChange={(e) => setSecondPairFrameMRP(e.target.value)}
                      className="!bg-slate-700/80 !border-2 !border-slate-600 !text-white !placeholder:text-slate-500 focus:!border-purple-500 focus:!ring-purple-500/50 [&_input]:!bg-slate-700/80 [&_input]:!text-white"
                      style={{ backgroundColor: 'rgba(51, 65, 85, 0.8)' }}
                    />
                    <Input
                      label="Second Pair Lens Price"
                      type="number"
                      placeholder="e.g., 2000"
                      value={secondPairLensPrice}
                      onChange={(e) => setSecondPairLensPrice(e.target.value)}
                      className="!bg-slate-700/80 !border-2 !border-slate-600 !text-white !placeholder:text-slate-500 focus:!border-purple-500 focus:!ring-purple-500/50 [&_input]:!bg-slate-700/80 [&_input]:!text-white"
                      style={{ backgroundColor: 'rgba(51, 65, 85, 0.8)' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Old detailed view - keeping for reference but hidden */}
        {/* Hidden section, won't execute */}
        {false && data && (data as any).recommendations && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Product Cards List - 3 columns */}
          <div className="lg:col-span-3 space-y-4">
            {(data as any).recommendations.map((rec: any) => {
              const rankBadge = getRankBadge(rec.rank);
              const isSelected = selectedProduct === rec.id;
              const priceInfo = calculatePriceWithOffer(rec, selectedOffer[rec.id]);

              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedProduct(rec.id)}
                  className={`relative cursor-pointer rounded-2xl transition-all duration-300 overflow-hidden shadow-lg ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900 scale-[1.02] shadow-emerald-500/20'
                      : 'hover:ring-1 hover:ring-emerald-500/50 hover:shadow-xl'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className={`absolute top-0 left-0 right-0 py-2 px-4 bg-gradient-to-r ${rankBadge.color} text-center shadow-lg z-10`}>
                    <span className="text-xs font-bold text-white drop-shadow-md">{rankBadge.label}</span>
                    <span className="text-xs text-white/90 ml-2 font-medium">• {Math.round(rec.matchScore)}% Match</span>
                  </div>

                  <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 backdrop-blur pt-12 pb-4 px-4 border border-slate-700/50 rounded-2xl">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="relative w-28 h-28 flex-shrink-0 bg-gradient-to-br from-slate-700 via-slate-750 to-slate-800 rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-600/50 shadow-lg group-hover:border-emerald-500/50 transition-colors">
                        {rec.imageUrl && rec.imageUrl.trim() ? (
                          <img 
                            src={rec.imageUrl} 
                            alt={rec.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`${rec.imageUrl && rec.imageUrl.trim() ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600/20 to-purple-600/20`}>
                          <span className="text-6xl">👓</span>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{rec.name}</h3>
                        <p className="text-sm text-slate-400">{rec.brand || 'Premium Quality'}</p>
                        
                        {/* Features Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rec.features.slice(0, 3).map((feature: any) => {
                            const FeatureIcon = getFeatureIcon(feature.key);
                            return (
                              <span
                                key={feature.key}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs text-blue-300 font-medium"
                              >
                                <FeatureIcon size={12} className="text-blue-400" />
                                {feature.name}
                              </span>
                            );
                          })}
                          {rec.features.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-700/50 border border-slate-600 rounded-lg text-xs text-slate-400">
                              +{rec.features.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="bg-slate-700/40 border border-slate-600/50 rounded-lg p-2.5 shadow-sm">
                          <p className="text-xs text-slate-400 mb-1">Frame</p>
                          <p className="text-sm font-bold text-white">₹{Math.round(rec.pricing.framePrice).toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-700/40 border border-slate-600/50 rounded-lg p-2.5 shadow-sm">
                          <p className="text-xs text-slate-400 mb-1">Lens</p>
                          <p className="text-sm font-bold text-white">₹{Math.round(rec.pricing.lensPrice.totalLensPrice).toLocaleString()}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/50 rounded-lg p-2.5 shadow-sm">
                          <p className="text-xs text-emerald-300 mb-1 font-medium">Final</p>
                          <p className="text-sm font-bold text-emerald-300">₹{Math.round(priceInfo.finalPrice).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Savings Badge */}
                      {priceInfo.savings > 0 && (
                        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 rounded-lg py-2.5 px-4 shadow-lg">
                          <BadgePercent size={18} className="text-green-400" />
                          <span className="text-sm text-green-300 font-bold">
                            You save ₹{Math.round(priceInfo.savings).toLocaleString()}
                          </span>
                          {priceInfo.offer && (
                            <span className="text-xs text-green-100 bg-green-500/40 border border-green-400/50 px-2.5 py-1 rounded-md font-semibold">
                              {priceInfo.offer.code}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Available Offers Toggle */}
                      {rec.offers && rec.offers.filter((o: any) => o.isApplicable).length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedOffers(expandedOffers === rec.id ? null : rec.id);
                          }}
                          className="w-full mt-3 flex items-center justify-between text-sm text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg py-2 px-3 transition-all hover:bg-yellow-500/20"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Ticket size={16} className="text-yellow-400" />
                            {rec.offers.filter((o: any) => o.isApplicable).length} offers available
                          </span>
                          {expandedOffers === rec.id ? (
                            <ChevronUp size={18} className="text-yellow-400" />
                          ) : (
                            <ChevronDown size={18} className="text-yellow-400" />
                          )}
                        </button>
                      )}

                      {/* Offers List */}
                      {expandedOffers === rec.id && rec.offers && rec.offers.filter((o: any) => o.isApplicable).length > 0 && (
                        <div className="mt-3 space-y-2">
                          {rec.offers.filter((o: any) => o.isApplicable).map((offer: any) => (
                            <button
                              key={offer.code}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOffer(rec.id, offer.code);
                              }}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                selectedOffer[rec.id] === offer.code
                                  ? 'border-yellow-500 bg-yellow-500/20 shadow-lg shadow-yellow-500/20'
                                  : 'border-slate-600 bg-slate-700/40 hover:border-yellow-500/50 hover:bg-yellow-500/5'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-white">{offer.title || offer.description}</p>
                                  {offer.description && offer.title && (
                                    <p className="text-xs text-slate-400 mt-0.5">{offer.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  {offer.discountAmount && offer.discountAmount > 0 && (
                                    <span className="text-base font-bold text-green-400 whitespace-nowrap">
                                      -₹{Math.round(offer.discountAmount).toLocaleString()}
                                    </span>
                                  )}
                                  {selectedOffer[rec.id] === offer.code && (
                                    <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                                      <Check size={14} className="text-yellow-900 font-bold" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs bg-slate-600/80 text-slate-200 px-2.5 py-1 rounded-md font-medium border border-slate-500">
                                  Code: {offer.code}
                                </span>
                                {offer.minPurchase && (
                                  <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                                    Min: ₹{offer.minPurchase.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Star size={14} className={`${rec.rank <= 3 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`} />
                        <span className="text-xs text-slate-400">Rank #{rec.rank}</span>
                      </div>
                      <span
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${
                          rec.storeInfo?.isAvailable
                            ? 'bg-green-500/20 text-green-300 border-green-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}
                      >
                        {rec.storeInfo?.isAvailable ? '✓ In Stock' : '✗ Out of Stock'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed View Panel - 2 columns */}
          <div className="lg:col-span-2">
            {selectedRec && selectedPricing ? (
              <div className="sticky top-4 space-y-4">
                {/* Selected Product Summary */}
                <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 backdrop-blur rounded-2xl border-2 border-emerald-500/30 overflow-hidden shadow-2xl">
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 p-5 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{selectedRec!.name}</h3>
                        <p className="text-emerald-100 text-sm font-medium">{selectedRec!.brand || 'Premium Brand'}</p>
                        {selectedRec!.sku && (
                          <p className="text-emerald-200/80 text-xs mt-1 font-mono">SKU: {selectedRec!.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-2">
                          <p className="text-xs text-emerald-100">Match Score</p>
                          <p className="text-2xl font-bold text-white">{Math.round(selectedRec!.matchScore)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Lens Features Detail */}
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Eye size={16} className="text-blue-400" />
                        Lens Features Included
                      </h4>
                      <div className="space-y-2">
                        {selectedRec!.pricing.lensPrice.featureAddons && selectedRec!.pricing.lensPrice.featureAddons.length > 0 ? (
                          selectedRec!.pricing.lensPrice.featureAddons.map((addon: any) => (
                            <div key={addon.name} className="flex justify-between items-center text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                              <span className="text-slate-300 font-medium">{addon.name}</span>
                              <span className="text-blue-400 font-bold">+₹{Math.round(addon.price).toLocaleString()}</span>
                            </div>
                          ))
                        ) : (
                          <div className="bg-slate-800/50 rounded-lg px-3 py-2">
                            <p className="text-slate-400 text-sm">Standard lens included</p>
                            <p className="text-slate-500 text-xs mt-1">Base price: ₹{Math.round(selectedRec!.pricing.lensPrice.baseLensPrice).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="bg-gradient-to-br from-slate-700/40 to-slate-800/40 rounded-xl p-5 border border-slate-600/50 shadow-lg">
                      <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <CircleDollarSign size={18} className="text-emerald-400" />
                        Price Breakdown
                      </h4>
                      
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                          <span className="text-slate-300 font-medium">Frame Price</span>
                          <span className="text-white font-bold">₹{Math.round(selectedRec!.pricing.framePrice).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                          <span className="text-slate-300 font-medium">Base Lens</span>
                          <span className="text-white font-bold">₹{Math.round(selectedRec!.pricing.lensPrice.baseLensPrice).toLocaleString()}</span>
                        </div>
                        {selectedRec!.pricing.lensPrice.featureAddons && selectedRec!.pricing.lensPrice.featureAddons.map((addon: any) => (
                          <div key={addon.name} className="flex justify-between items-center text-sm bg-slate-800/30 rounded-lg px-3 py-1.5 pl-5">
                            <span className="text-slate-400">+ {addon.name}</span>
                            <span className="text-blue-300 font-medium">₹{Math.round(addon.price).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t-2 border-slate-600 pt-3 mt-3">
                          <div className="flex justify-between items-center text-base bg-slate-800/60 rounded-lg px-3 py-2">
                            <span className="text-slate-200 font-semibold">Subtotal</span>
                            <span className="text-white font-bold">₹{Math.round(selectedRec!.pricing.subtotal).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {/* Primary Offer */}
                        {selectedPricing!.offer && (
                          <div className="flex justify-between items-center text-sm bg-green-500/20 border border-green-500/40 rounded-lg px-3 py-2 text-green-300">
                            <span className="flex items-center gap-2 font-medium">
                              <Tag size={14} className="text-green-400" />
                              {selectedPricing!.offer.title || selectedPricing!.offer.description}
                            </span>
                            <span className="font-bold text-green-400">-₹{Math.round(selectedPricing!.offer.savings || selectedPricing!.savings).toLocaleString()}</span>
                          </div>
                        )}

                        {/* Category Discount */}
                        {selectedPricing!.categoryDiscount && (
                          <div className="flex justify-between items-center text-sm bg-blue-500/20 border border-blue-500/40 rounded-lg px-3 py-2 text-blue-300">
                            <span className="flex items-center gap-2 font-medium">
                              <Percent size={14} className="text-blue-400" />
                              {selectedPricing!.categoryDiscount.description}
                            </span>
                            <span className="font-bold text-blue-400">-₹{Math.round(selectedPricing!.categoryDiscount.savings).toLocaleString()}</span>
                          </div>
                        )}

                        {/* Coupon Discount */}
                        {selectedPricing!.couponDiscount && (
                          <div className="flex justify-between items-center text-sm bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-3 py-2 text-yellow-300">
                            <span className="flex items-center gap-2 font-medium">
                              <Ticket size={14} className="text-yellow-400" />
                              {selectedPricing!.couponDiscount.description}
                            </span>
                            <span className="font-bold text-yellow-400">-₹{Math.round(selectedPricing!.couponDiscount.savings).toLocaleString()}</span>
                          </div>
                        )}

                        {/* Second Pair Discount */}
                        {selectedPricing!.secondPairDiscount && (
                          <div className="flex justify-between items-center text-sm bg-purple-500/20 border border-purple-500/40 rounded-lg px-3 py-2 text-purple-300">
                            <span className="flex items-center gap-2 font-medium">
                              <Package size={14} className="text-purple-400" />
                              {selectedPricing!.secondPairDiscount.description}
                            </span>
                            <span className="font-bold text-purple-400">-₹{Math.round(selectedPricing!.secondPairDiscount.savings).toLocaleString()}</span>
                          </div>
                        )}

                        <div className="border-t-2 border-emerald-500/50 pt-4 mt-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg px-4 py-3">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-bold text-lg">Final Price</span>
                            <div className="text-right">
                              {selectedPricing!.savings > 0 && (
                                <span className="text-slate-400 line-through text-sm block mb-1">
                                  ₹{Math.round(selectedRec!.pricing.subtotal).toLocaleString()}
                                </span>
                              )}
                              <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                ₹{Math.round(selectedPricing!.finalPrice).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {selectedPricing!.savings > 0 && (
                            <div className="mt-2 text-center">
                              <span className="text-sm text-green-400 font-medium">
                                You save ₹{Math.round(selectedPricing!.savings).toLocaleString()}!
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button 
                        fullWidth 
                        className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 text-white font-semibold py-3 shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02]"
                      >
                        <ShoppingBag size={20} className="mr-2" />
                        Select This Lens
                      </Button>
                      <Button 
                        variant="outline" 
                        fullWidth
                        className="border-2 border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 py-3 font-medium"
                      >
                        <Phone size={20} className="mr-2" />
                        Talk to Expert
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Offer Code Box */}
                {selectedPricing!.offer && (
                  <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 backdrop-blur rounded-xl border-2 border-yellow-500/50 p-5 shadow-lg shadow-yellow-500/20">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl flex items-center justify-center border border-yellow-400/50">
                        <Gift size={28} className="text-yellow-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-yellow-200 font-medium mb-1">Apply at checkout</p>
                        <p className="text-xl font-bold text-white font-mono tracking-wider">{selectedPricing!.offer.code}</p>
                      </div>
                      <div className="text-right bg-green-500/20 rounded-lg px-4 py-2 border border-green-500/40">
                        <p className="text-xs text-green-300 font-medium">You Save</p>
                        <p className="text-xl font-bold text-green-300">
                          ₹{Math.round(selectedPricing!.savings).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
        )}

        {/* Bottom CTA Section */}
        <div className="mt-8 bg-gradient-to-r from-slate-800/80 via-slate-800/80 to-slate-900/80 backdrop-blur rounded-2xl border-2 border-slate-700/50 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to order your lens?</h3>
              <p className="text-slate-300 text-sm">
                Our optician will assist you with lens selection and fitting
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => router.push('/questionnaire')}
                className="border-2 border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white hover:bg-slate-700/50"
              >
                <RefreshCw size={18} className="mr-2" />
                New Search
              </Button>
              <Button className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-emerald-500/30">
                <Phone size={18} className="mr-2" />
                Call Store
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-slate-500 text-sm">
          <p>Powered by LensTrack AI • {data.store.name}</p>
        </div>
      </div>

      {/* LA-05: Know More Modal */}
      {showKnowMoreModal && data && (() => {
        const rec = data.recommendations.find(r => r.id === showKnowMoreModal);
        if (!rec) return null;
        
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between border-b border-blue-700">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{rec.name}</h3>
                  <p className="text-blue-100 text-sm">{rec.brand || 'Premium Brand'}</p>
                </div>
                <button
                  onClick={() => setShowKnowMoreModal(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Sparkles className="text-blue-600" size={20} />
                  Full Feature Grid
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rec.features.map((feature) => {
                    const FeatureIcon = getFeatureIcon(feature.key);
                    return (
                      <div key={feature.key} className="flex items-start gap-4 p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all group">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <FeatureIcon size={24} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 mb-1">{feature.name}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                                style={{ width: `${Math.min(feature.strength * 10, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{feature.strength}/10</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LA-06: View All Lenses Modal */}
      {showViewAllModal && data && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 px-6 py-5 border-b border-indigo-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">All lenses matching your power</h2>
                  <p className="text-blue-100 text-sm">Found {data.recommendations.length} options</p>
                </div>
                <button
                  onClick={() => setShowViewAllModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-blue-100">Sorted by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border-2 border-white/30 rounded-lg text-sm font-semibold text-slate-700 bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="match">Best Match First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="index">Thinnest First (Index)</option>
                </select>
                {data && (
                  <span className="text-sm text-blue-100 ml-auto">
                    Showing {sortedRecommendations.length} of {data.recommendations.length} eligible lenses
                  </span>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {sortedRecommendations.map((rec) => {
                const priceInfo = calculatePriceWithOffer(rec, selectedOffer[rec.id]);
                // Extract index from lensIndex or name
                const lensIndexStr = rec.lensIndex || rec.name.match(/\d+\.\d+/)?.[0] || '1.50';
                const lensIndexDisplay = lensIndexStr.replace('INDEX_', '1.').replace(/^1\./, '1.');
                const brandLine = rec.brand || 'Premium';
                const benefits = rec.features.slice(0, 3).map(f => f.name);
                const hasYOPO = rec.offers.some(o => o.type === 'YOPO' && o.isApplicable);
                const hasCombo = rec.offers.some(o => o.type === 'COMBO' && o.isApplicable);
                const hasFreeLens = rec.offers.some(o => o.type === 'FREE_LENS' && o.isApplicable);
                
                // Get match percentage (prefer matchPercent, fallback to matchScore)
                const matchPercent = rec.matchPercent ?? Math.round(rec.matchScore);
                
                // Get index recommendation data
                const indexDelta = rec.indexRecommendation?.indexDelta ?? 0;
                const recommendedIndex = rec.indexRecommendation?.recommendedIndex || data?.recommendedIndex;
                const recommendedIndexDisplay = recommendedIndex?.replace('INDEX_', '1.').replace(/^1\./, '1.') || '';
                const thicknessWarning = rec.thicknessWarning || rec.indexRecommendation?.isWarning || false;
                const indexInvalid = rec.indexInvalid || rec.indexRecommendation?.isInvalid || false;
                const validationMessage = rec.indexRecommendation?.validationMessage;
                
                // Calculate thickness difference display
                const getThicknessDisplay = () => {
                  if (indexDelta === 0) {
                    return { text: 'Ideal thickness', color: 'text-green-600', icon: '✓' };
                  } else if (indexDelta > 0) {
                    return { text: `${indexDelta === 1 ? '~20-30%' : indexDelta === 2 ? '~40-50%' : '~60%+'} thinner than recommended`, color: 'text-blue-600', icon: '✨' };
                  } else {
                    const thicknessPercent = Math.abs(indexDelta) === 1 ? '~20-30%' : Math.abs(indexDelta) === 2 ? '~40-50%' : '~60%+';
                    return { text: `${thicknessPercent} thicker than recommended`, color: 'text-yellow-600', icon: '⚠️' };
                  }
                };
                const thicknessInfo = getThicknessDisplay();
                
                return (
                  <div key={rec.id} className={`border-2 rounded-xl p-5 hover:shadow-lg transition-all bg-white group ${
                    indexInvalid ? 'border-red-300 bg-red-50/30' : thicknessWarning ? 'border-yellow-300 bg-yellow-50/30' : 'border-slate-200 hover:border-blue-400'
                  }`}>
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-xl font-bold text-slate-900">{rec.name}</h3>
                          {/* Match % Badge */}
                          <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200">
                            {matchPercent}% Match
                          </span>
                          {indexInvalid && (
                            <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-lg border border-red-200">
                              ❌ Not Suitable
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3 flex-wrap">
                          <span className="font-medium text-slate-700">{brandLine}</span>
                          <span className="text-slate-400">•</span>
                          <span>Index {lensIndexDisplay}</span>
                          {recommendedIndexDisplay && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500">Recommended: {recommendedIndexDisplay}</span>
                            </>
                          )}
                          <span className="text-slate-400">•</span>
                          <span>{rec.category}</span>
                        </div>
                        
                        {/* Thickness Difference Display */}
                        {recommendedIndexDisplay && (
                          <div className={`mb-3 px-3 py-2 rounded-lg border ${indexInvalid ? 'bg-red-50 border-red-200' : thicknessWarning ? 'bg-yellow-50 border-yellow-200' : indexDelta > 0 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex items-center gap-2 text-sm">
                              <span className={thicknessInfo.color}>{thicknessInfo.icon}</span>
                              <span className={`font-medium ${thicknessInfo.color}`}>
                                {thicknessInfo.text}
                              </span>
                              {indexDelta !== 0 && recommendedIndexDisplay && (
                                <span className="text-slate-500 text-xs">
                                  (Recommended: {recommendedIndexDisplay})
                                </span>
                              )}
                            </div>
                            {validationMessage && (
                              <p className={`text-xs mt-1 ${indexInvalid ? 'text-red-700' : thicknessWarning ? 'text-yellow-700' : 'text-slate-600'}`}>
                                {validationMessage}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="mb-3">
                          <span className="text-2xl font-bold text-slate-900">₹{Math.round(priceInfo.finalPrice).toLocaleString()}</span>
                          {priceInfo.savings > 0 && (
                            <span className="ml-2 text-sm text-green-600 font-semibold">
                              Save ₹{Math.round(priceInfo.savings).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {benefits.length > 0 && (
                          <ul className="space-y-1.5 mb-3">
                            {benefits.map((benefit, idx) => (
                              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {hasYOPO && (
                            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-lg border border-yellow-200">YOPO</span>
                          )}
                          {hasCombo && (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-lg border border-purple-200">Combo</span>
                          )}
                          {hasFreeLens && (
                            <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-lg border border-green-200">Free Lens</span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedProduct(rec.id);
                          setShowViewAllModal(false);
                          // Navigate to offer summary page
                          router.push(`/questionnaire/${sessionId}/offer-summary/${rec.id}`);
                        }}
                        disabled={indexInvalid}
                        className={`font-bold px-8 py-3 shadow-md hover:shadow-lg transition-all whitespace-nowrap ${
                          indexInvalid 
                            ? 'bg-slate-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                        }`}
                      >
                        {indexInvalid ? 'Not Available' : 'Select'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-blue-50 border-t-2 border-slate-200 px-6 py-4">
              <Button
                fullWidth
                onClick={() => setShowViewAllModal(false)}
                variant="outline"
                className="border-2 border-slate-300 text-slate-700 hover:bg-white hover:border-blue-400 font-semibold py-3 shadow-sm"
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
