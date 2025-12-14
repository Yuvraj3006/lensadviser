'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatIndexDisplay } from '@/lib/format-index';
import { 
  CheckCircle, 
  Star, 
  Sparkles, 
  ShoppingBag, 
  Phone, 
  ArrowRight,
  RefreshCw,
  Eye,
  Shield,
  Zap,
  CircleDollarSign
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
  mrp?: number; // MRP (Maximum Retail Price) for lens
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
  const [showKnowMoreModal, setShowKnowMoreModal] = useState<string | null>(null);
  const [showViewAllModal, setShowViewAllModal] = useState(false);
  const [sortBy, setSortBy] = useState<'price-high' | 'price-low' | 'match' | 'index'>('price-high');

  useEffect(() => {
    if (sessionId) {
      // Check if this is an ACCESSORIES session - redirect to accessories page
      checkSessionCategory();
    }
  }, [sessionId]);

  const checkSessionCategory = async () => {
    try {
      const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.success && sessionData.data?.category === 'ACCESSORIES') {
          // Redirect to accessories page for ACCESSORIES category
          router.push(`/questionnaire/${sessionId}/accessories`);
          return;
        }
      }
      // If not ACCESSORIES, fetch recommendations
      fetchRecommendations();
    } catch (error) {
      console.error('Failed to check session category:', error);
      // Continue with recommendations fetch
      fetchRecommendations();
    }
  };


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
        
        // Check if response is HTML (Next.js error page)
        if (errorText.trim().startsWith('<!') || errorText.trim().startsWith('<html')) {
          console.error('[fetchRecommendations] Server returned HTML error page instead of JSON');
          showToast('error', `Server error (${status}): The server returned an error page. Please try again.`);
          router.push('/questionnaire');
          return;
        }
        
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
            // Ensure we never assign an object to errorMessage
            if (errorData?.error?.message && typeof errorData.error.message === 'string') {
              errorMessage = errorData.error.message;
            } else if (errorData?.message && typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            } else if (errorData?.error?.code && typeof errorData.error.code === 'string') {
              errorMessage = `Error: ${errorData.error.code}`;
            } else if (errorData?.error && typeof errorData.error === 'object') {
              // If error is an object, try to extract a message or stringify it
              if ('message' in errorData.error && typeof errorData.error.message === 'string') {
                errorMessage = errorData.error.message;
              } else {
                errorMessage = 'Validation error occurred';
              }
            } else if (errorText) {
              errorMessage = errorText.substring(0, 100);
            }
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

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        // Check if it's HTML
        if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
          console.error('[fetchRecommendations] Server returned HTML instead of JSON');
          showToast('error', 'Server returned an error page. Please try again.');
          router.push('/questionnaire');
          return;
        }
        console.error('[fetchRecommendations] Non-JSON response:', contentType, text.substring(0, 200));
        showToast('error', 'Invalid response format from server');
        router.push('/questionnaire');
        return;
      }

      const result = await response.json();
      
      // Debug: Log recommendations data to verify MRP is present
      console.log('[fetchRecommendations] Full API Response:', JSON.stringify(result, null, 2));
      
      if (result?.data?.recommendations && result.data.recommendations.length > 0) {
        console.log('[fetchRecommendations] First recommendation MRP check:', {
          totalRecommendations: result.data.recommendations.length,
          firstRec: {
            id: result.data.recommendations[0].id,
            name: result.data.recommendations[0].name,
            mrp: result.data.recommendations[0].mrp,
            basePrice: result.data.recommendations[0].basePrice,
            hasMRP: 'mrp' in result.data.recommendations[0],
            mrpType: typeof result.data.recommendations[0].mrp,
            allKeys: Object.keys(result.data.recommendations[0]),
          },
        });
        
        // Check all recommendations for MRP
        const mrpStatus = result.data.recommendations.map((rec: any, idx: number) => ({
          index: idx,
          name: rec.name,
          mrp: rec.mrp,
          hasMRP: 'mrp' in rec,
        }));
        console.log('[fetchRecommendations] All recommendations MRP status:', mrpStatus);
      }

      if (result.success) {
        // Convert generatedAt from Date string to Date object if needed
        if (result.data.generatedAt && typeof result.data.generatedAt === 'string') {
          result.data.generatedAt = new Date(result.data.generatedAt).toISOString();
        }
        
        setData(result.data);
        if (result.data.recommendations && result.data.recommendations.length > 0) {
          const firstProductId = result.data.recommendations[0].id;
          setSelectedProduct(firstProductId);
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
      
      // Check if it's a JSON parsing error (HTML response)
      let errorMessage = 'An error occurred while loading recommendations';
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        errorMessage = 'Server returned an invalid response. Please try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('[fetchRecommendations] Showing error toast:', errorMessage);
      showToast('error', errorMessage);
      router.push('/questionnaire');
    } finally {
      setLoading(false);
    }
  };

  // Simple price calculation - just return lens price (no discounts/offers)
  const getLensPrice = (rec: Recommendation) => {
    return rec.pricing.lensPrice.totalLensPrice;
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
        <div className="text-center max-w-md bg-slate-800/50 backdrop-blur rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-xl">
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

  // Helper to get index numeric value for sorting
  const getIndexValue = (rec: Recommendation): number => {
    if (rec.lensIndex) {
      const indexMap: Record<string, number> = {
        'INDEX_156': 1.56,
        'INDEX_160': 1.60,
        'INDEX_167': 1.67,
        'INDEX_174': 1.74,
        'INDEX_150': 1.50,
        'INDEX_PC': 1.59,
      };
      return indexMap[rec.lensIndex] || 1.56;
    }
    // Fallback: extract from name
    const match = rec.name.match(/\d+\.\d+/);
    return match ? parseFloat(match[0]) : 1.56;
  };

  // Filter out 0% match lenses first
  const validRecommendations = data.recommendations.filter(rec => {
    const matchPercent = rec.matchPercent ?? (rec.matchScore ? rec.matchScore * 100 : 0);
    return matchPercent > 0; // Only show lenses with > 0% match
  });

  // Sort recommendations based on sortBy, then get first 4 (use valid recommendations only)
  const sortedForDisplay = [...validRecommendations].sort((a, b) => {
    switch (sortBy) {
      case 'price-high':
        return getLensPrice(b) - getLensPrice(a);
      case 'price-low':
        return getLensPrice(a) - getLensPrice(b);
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

  // Sort by matchPercent to find highest match (use valid recommendations only)
  const sortedByMatchPercent = [...validRecommendations].sort((a, b) => {
    const matchA = a.matchPercent ?? (a.matchScore ? a.matchScore * 100 : 0);
    const matchB = b.matchPercent ?? (b.matchScore ? b.matchScore * 100 : 0);
    return matchB - matchA; // Descending order
  });

  // Sort by price to find lowest price (use valid recommendations only)
  const sortedByPrice = [...validRecommendations].sort((a, b) => {
    const priceA = getLensPrice(a);
    const priceB = getLensPrice(b);
    return priceA - priceB; // Ascending order (lowest first)
  });

  // Get IDs for labeling
  const highestMatchId = sortedByMatchPercent[0]?.id;
  const secondHighestMatchId = sortedByMatchPercent[1]?.id;
  
  // Find lowest price lens that is NOT the highest or second highest match
  const lowestPriceId = sortedByPrice.find(rec => 
    rec.id !== highestMatchId && rec.id !== secondHighestMatchId
  )?.id || sortedByPrice[0]?.id; // Fallback to absolute lowest if all are top matches

  // Get label for each recommendation
  const getLabel = (recId: string): string => {
    if (recId === highestMatchId) {
      return 'Recommended';
    } else if (recId === secondHighestMatchId) {
      return 'Next Best';
    } else {
      // All other lenses (3rd, 4th, etc.) get "Can Try" label
      return 'Can Try';
    }
  };

  // Get tag for each recommendation based on match percent and price
  const getRoleTag = (recId: string): 'BEST_RECOMMENDED' | 'NEXT_BEST' | 'CAN_TRY' | 'OTHER' => {
    if (recId === highestMatchId) {
      return 'BEST_RECOMMENDED';
    } else if (recId === secondHighestMatchId) {
      return 'NEXT_BEST';
    } else {
      // All other lenses (3rd, 4th, etc.) get "CAN_TRY" tag
      return 'CAN_TRY';
    }
  };

  // Sort all recommendations for View All modal (use valid recommendations only)
  const sortedRecommendations = [...validRecommendations].sort((a, b) => {
    switch (sortBy) {
      case 'price-high':
        return getLensPrice(b) - getLensPrice(a);
      case 'price-low':
        return getLensPrice(a) - getLensPrice(b);
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
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 py-6 sm:py-8 px-4 sm:px-6 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg mb-2">
                Best Lenses for You
              </h1>
              <p className="text-emerald-50 text-sm sm:text-base font-medium">
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Sorting Controls */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            Showing {topFourRecommendations.length} of {validRecommendations.length} recommendations
          </div>
        </div>

        {/* LA-05: 4-Card Layout - Grid layout for parallel cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {topFourRecommendations.map((rec) => {
            const roleTag = getRoleTag(rec.id);
            const label = getLabel(rec.id);
            const tagConfig = {
              BEST_RECOMMENDED: { label: 'Recommended', color: 'bg-blue-600 text-white' },
              NEXT_BEST: { label: 'Next Best', color: 'bg-purple-600 text-white' },
              CAN_TRY: { label: 'Can Try', color: 'bg-green-600 text-white' },
              OTHER: { label: label || '', color: 'bg-slate-500 text-white' },
            }[roleTag];
            
            const lensPrice = getLensPrice(rec);
            // Get MRP - only use if explicitly set (not null/undefined)
            const lensMRP = (rec.mrp && rec.mrp > 0) ? rec.mrp : null;
            
            // Extract lens index from product name or use default
            const lensIndex = rec.name.match(/\d+\.\d+/)?.[0] || '1.50';
            const indexLabel = lensIndex === '1.50' ? 'Standard' : lensIndex === '1.60' ? 'Thin' : lensIndex === '1.67' ? 'Thinner' : lensIndex === '1.74' ? 'Thinnest' : 'Standard';
            
            // Get brand line from product name or brand
            const brandLine = rec.brand || 'Premium';
            
            // Get 3-4 key benefits from features
            const benefits = rec.features?.slice(0, 4).map(f => f?.name).filter(Boolean) || [];

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
                        {Math.round(rec.matchPercent ?? (rec.matchScore * 100))}% Match
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
                        {benefits.map((benefit: string, idx: number) => (
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

                  {/* Price Row - MRP with strikethrough and Offer Price */}
                  <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-sm font-medium text-slate-600">Lens Price:</span>
                      {lensMRP && lensMRP >= lensPrice ? (
                        <>
                          <span className="text-lg text-slate-500 line-through">₹{Math.round(lensMRP).toLocaleString()}</span>
                          {lensMRP > lensPrice && <span className="text-slate-400">→</span>}
                        </>
                      ) : null}
                      <span className="text-2xl font-bold text-slate-900">₹{Math.round(lensPrice).toLocaleString()}</span>
                    </div>
                  </div>

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

        {/* Removed: Coupon Code, Category Discount, and Second Pair sections - not relevant for lens selection */}

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
                  {rec.features?.filter((f: any) => f && f.name).map((feature: any) => {
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
                  <p className="text-blue-100 text-sm">Found {validRecommendations.length} options</p>
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
                    Showing {sortedRecommendations.length} of {validRecommendations.length} eligible lenses
                  </span>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {sortedRecommendations.map((rec) => {
                const lensPrice = getLensPrice(rec);
                // Get MRP - only use if explicitly set (not null/undefined)
                const lensMRP = (rec.mrp && rec.mrp > 0) ? rec.mrp : null;

                // Extract index from lensIndex or name
                const lensIndexStr = rec.lensIndex || rec.name.match(/\d+\.\d+/)?.[0] || '1.50';
                const lensIndexDisplay = formatIndexDisplay(lensIndexStr);
                const brandLine = rec.brand || 'Premium';
                const benefits = rec.features?.slice(0, 3).map((f: any) => f?.name).filter(Boolean) || [];
                
                // Get label based on match percent and price (same logic as top 4)
                const label = getLabel(rec.id);
                const canTry = rec.id !== highestMatchId && rec.id !== secondHighestMatchId;
                
                // Get index recommendation data
                const indexDelta = rec.indexRecommendation?.indexDelta ?? 0;
                const recommendedIndex = rec.indexRecommendation?.recommendedIndex || data?.recommendedIndex;
                const recommendedIndexDisplay = formatIndexDisplay(recommendedIndex) || '';
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
                          {/* Label Badge */}
                          {label && (
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                              label === 'Recommended' 
                                ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200'
                                : label === 'Next Best'
                                ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200'
                                : label === 'Can Try'
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {label}
                            </span>
                          )}
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
                        
                        <div className="mb-3 flex items-baseline gap-2">
                          {lensMRP && lensMRP >= lensPrice ? (
                            <>
                              <span className="text-lg text-slate-500 line-through">₹{Math.round(lensMRP).toLocaleString()}</span>
                              {lensMRP > lensPrice && <span className="text-slate-400">→</span>}
                            </>
                          ) : null}
                          <span className="text-2xl font-bold text-slate-900">₹{Math.round(lensPrice).toLocaleString()}</span>
                        </div>
                        {benefits.length > 0 && (
                          <ul className="space-y-1.5 mb-3">
                            {benefits.map((benefit: string, idx: number) => (
                              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        )}
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
