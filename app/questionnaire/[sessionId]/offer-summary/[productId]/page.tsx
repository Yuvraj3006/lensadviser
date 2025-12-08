'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { 
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  Gift,
  Tag,
  Percent,
  Package,
  ArrowRight,
  Eye
} from 'lucide-react';

interface OfferDetail {
  type: string;
  code: string;
  title: string;
  description: string;
  discountAmount?: number;
  discountPercent?: number;
  explanation?: string;
}

interface PriceBreakdown {
  frameMRP: number;
  lensPrice: number;
  subtotal: number;
  totalDiscount: number;
  finalPayable: number;
  offers: OfferDetail[];
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
    mrp: number;
    frameType?: string;
  };
  priceBreakdown: PriceBreakdown;
  upsellMessage?: string;
  upsellThreshold?: number;
}

export default function OfferSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;
  const productId = params?.productId as string;

  const [data, setData] = useState<OfferSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId && productId) {
      fetchOfferSummary();
    }
  }, [sessionId, productId]);

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
      
      // Calculate offers
      const offersResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            couponCode: null,
            secondPair: null,
          }),
        }
      );

      const offersData = await offersResponse.json();
      
      // Extract lens index from name
      const lensIndex = selectedRec.name.match(/\d+\.\d+/)?.[0] || '1.50';

      // Build offer summary data
      const summaryData: OfferSummaryData = {
        sessionId,
        selectedLens: {
          id: selectedRec.id,
          name: selectedRec.name,
          index: lensIndex,
          price: selectedRec.pricing.lensPrice.totalLensPrice,
          brandLine: selectedRec.brand || 'Premium',
        },
        selectedFrame: {
          brand: frameData.brand || 'Unknown',
          mrp: frameData.mrp || 0,
          frameType: frameData.frameType,
        },
        priceBreakdown: {
          frameMRP: selectedRec.pricing.framePrice,
          lensPrice: selectedRec.pricing.lensPrice.totalLensPrice,
          subtotal: selectedRec.pricing.subtotal,
          totalDiscount: offersData.success ? (offersData.data.baseTotal - offersData.data.finalPayable) : selectedRec.pricing.savings,
          finalPayable: offersData.success ? offersData.data.finalPayable : selectedRec.pricing.finalPrice,
          offers: offersData.success ? formatOffers(offersData.data) : formatOffersFromRecommendation(selectedRec),
        },
        upsellMessage: offersData.success && offersData.data.upsellMessage 
          ? offersData.data.upsellMessage 
          : calculateUpsellMessage(selectedRec.pricing.finalPrice),
        upsellThreshold: offersData.success && offersData.data.upsellThreshold 
          ? offersData.data.upsellThreshold 
          : undefined,
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

  const formatOffers = (offerData: any): OfferDetail[] => {
    const offers: OfferDetail[] = [];
    
    if (offerData.offersApplied && offerData.offersApplied.length > 0) {
      offerData.offersApplied.forEach((offer: any) => {
        offers.push({
          type: offer.type || 'DISCOUNT',
          code: offer.code || '',
          title: offer.title || offer.description || 'Discount',
          description: offer.description || '',
          discountAmount: offer.discountAmount || 0,
          discountPercent: offer.discountPercent,
          explanation: getOfferExplanation(offer.type || 'DISCOUNT', offer),
        });
      });
    }

    if (offerData.categoryDiscount) {
      offers.push({
        type: 'CATEGORY_DISCOUNT',
        code: 'CATEGORY',
        title: offerData.categoryDiscount.description || 'Category Discount',
        description: '',
        discountAmount: offerData.categoryDiscount.savings || 0,
        explanation: `${offerData.categoryDiscount.description || 'Category Discount'} applied`,
      });
    }

    if (offerData.couponDiscount) {
      offers.push({
        type: 'COUPON',
        code: offerData.couponDiscount.code || '',
        title: offerData.couponDiscount.description || 'Coupon Discount',
        description: '',
        discountAmount: offerData.couponDiscount.savings || 0,
        explanation: `Coupon code ${offerData.couponDiscount.code || ''} applied`,
      });
    }

    return offers;
  };

  const formatOffersFromRecommendation = (rec: any): OfferDetail[] => {
    const offers: OfferDetail[] = [];
    
    if (rec.offers && rec.offers.length > 0) {
      rec.offers.filter((o: any) => o.isApplicable).forEach((offer: any) => {
        offers.push({
          type: offer.type || 'DISCOUNT',
          code: offer.code || '',
          title: offer.title || offer.description || 'Discount',
          description: offer.description || '',
          discountAmount: offer.discountAmount || 0,
          discountPercent: offer.discountPercent,
          explanation: getOfferExplanation(offer.type || 'DISCOUNT', offer),
        });
      });
    }

    return offers;
  };

  const getOfferExplanation = (type: string, offer: any): string => {
    switch (type) {
      case 'YOPO':
        return 'You pay only the higher of frame or lens.';
      case 'COMBO':
        return 'Special package price applied.';
      case 'FREE_LENS':
        const freeAmount = offer.freeAmount || offer.discountAmount || 0;
        return `Lens free up to ₹${Math.round(freeAmount).toLocaleString()}; you pay only difference.`;
      case 'BRAND_DISCOUNT':
        return `${offer.brand || ''} ${offer.discountPercent || 0}% Off`;
      case 'FLAT_DISCOUNT':
        return `${offer.title || 'Festival Offer'} -₹${Math.round(offer.discountAmount || 0).toLocaleString()}`;
      case 'BOGO50':
        return 'Buy One Get One 50% Off - Second item at 50% discount';
      case 'CATEGORY_DISCOUNT':
        return `${offer.title || 'Category Discount'} ${offer.discountPercent || 0}%`;
      default:
        return offer.description || 'Discount applied';
    }
  };

  const calculateUpsellMessage = (currentTotal: number): string => {
    const thresholds = [
      { amount: 500, message: 'Add ₹500 more and get free Lenstrack Sunglass worth ₹1499' },
      { amount: 300, message: 'Shop ₹300 more and unlock extra ₹500 OFF' },
      { amount: 1000, message: 'Add ₹1000 more for free Anti-Glare coating worth ₹2000' },
    ];

    for (const threshold of thresholds) {
      if (currentTotal < threshold.amount * 10) {
        const needed = threshold.amount - (currentTotal % threshold.amount);
        return threshold.message.replace(`₹${threshold.amount}`, `₹${needed}`);
      }
    }

    return 'Add ₹500 more and get free Lenstrack Sunglass worth ₹1499';
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

  const savingsPercent = data.priceBreakdown.totalDiscount > 0 
    ? Math.round((data.priceBreakdown.totalDiscount / data.priceBreakdown.subtotal) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
                  Your Final Price
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
        {/* Selected Items Card */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <Eye className="text-blue-400" size={18} />
            </div>
            <h2 className="text-xl font-semibold text-white">Selected Items</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Selected Lens */}
            <div className="bg-slate-700/50 rounded-lg p-5 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Selected Lens</h3>
                <Package className="text-blue-400" size={18} />
              </div>
              <p className="text-lg font-semibold text-white mb-2">{data.selectedLens.name}</p>
              <div className="flex items-center gap-2 text-slate-300 text-sm mb-4">
                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-600">Index {data.selectedLens.index}</span>
                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-600">{data.selectedLens.brandLine}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-slate-400 text-sm">₹</span>
                <span className="text-2xl font-semibold text-white">{Math.round(data.selectedLens.price).toLocaleString()}</span>
              </div>
            </div>

            {/* Selected Frame */}
            <div className="bg-slate-700/50 rounded-lg p-5 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Selected Frame</h3>
                <Eye className="text-blue-400" size={18} />
              </div>
              <p className="text-lg font-semibold text-white mb-2">{data.selectedFrame.brand}</p>
              {data.selectedFrame.frameType && (
                <p className="text-slate-300 text-sm mb-4 bg-slate-800 px-2 py-1 rounded border border-slate-600 inline-block">
                  {data.selectedFrame.frameType}
                </p>
              )}
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-slate-400 text-sm">₹</span>
                <span className="text-2xl font-semibold text-white">{Math.round(data.selectedFrame.mrp).toLocaleString()}</span>
              </div>
            </div>
          </div>
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
              <span className="text-lg font-semibold text-white">₹{Math.round(data.priceBreakdown.frameMRP).toLocaleString()}</span>
            </div>

            {/* Lens Price */}
            <div className="flex justify-between items-center py-3 px-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <span className="text-slate-300 font-medium">Lens Price</span>
              <span className="text-lg font-semibold text-white">₹{Math.round(data.priceBreakdown.lensPrice).toLocaleString()}</span>
            </div>

            {/* Applied Offers */}
            {data.priceBreakdown.offers.length > 0 && (
              <div className="py-4 border-t border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-lg animate-pulse" />
                    <Gift className="relative text-blue-400" size={18} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">🎉 Exclusive Offers Applied</h3>
                </div>
                <div className="space-y-3">
                  {data.priceBreakdown.offers.map((offer, idx) => (
                    <div 
                      key={idx} 
                      className="group relative overflow-hidden bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-lg p-4 border-2 border-blue-500/50 hover:border-blue-400 transition-all duration-300 transform hover:scale-[1.02] animate-fade-in"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-lg border border-blue-400/50 shadow-lg animate-pulse">
                              {offer.code || offer.type}
                            </span>
                            <span className="text-base font-bold text-white">{offer.title}</span>
                          </div>
                          <p className="text-blue-200 text-sm">{offer.explanation}</p>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg px-3 py-1 border border-green-300/50 shadow-lg">
                            <span className="text-lg font-bold text-white">
                              -₹{Math.round(offer.discountAmount || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtotal */}
            <div className="flex justify-between items-center py-4 px-4 bg-slate-700/70 rounded-lg border border-slate-600">
              <span className="text-lg font-semibold text-white">Subtotal</span>
              <span className="text-xl font-semibold text-white">₹{Math.round(data.priceBreakdown.subtotal).toLocaleString()}</span>
            </div>

            {/* Total Discount */}
            {data.priceBreakdown.totalDiscount > 0 && (
              <div className="relative overflow-hidden flex justify-between items-center py-4 px-4 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 rounded-lg border-2 border-green-400/50 shadow-lg animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                <span className="relative text-lg font-bold text-white flex items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-400 rounded-full blur-md animate-ping opacity-75" />
                    <Percent className="relative text-green-300" size={20} />
                  </div>
                  Total Savings
                </span>
                <span className="relative text-2xl font-bold text-green-300 animate-bounce">
                  -₹{Math.round(data.priceBreakdown.totalDiscount).toLocaleString()}
                </span>
              </div>
            )}

            {/* Final Payable */}
            <div className="relative overflow-hidden bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-lg p-6 border-2 border-green-400/50 shadow-2xl transform hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 animate-pulse" />
              <div className="relative flex justify-between items-center">
                <div>
                  <p className="text-green-100 text-sm font-semibold mb-1 uppercase tracking-wide">Final Payable Amount</p>
                  <p className="text-green-200 text-sm">Including all discounts & offers</p>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2 border border-white/30">
                    <span className="text-3xl md:text-4xl font-bold text-white animate-pulse">
                      ₹{Math.round(data.priceBreakdown.finalPayable).toLocaleString()}
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

      {/* Upsell Strip */}
      {data.upsellMessage && (
        <div className="sticky bottom-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 py-5 px-6 shadow-2xl border-t-4 border-yellow-600 z-50 backdrop-blur-xl animate-slide-up">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          <div className="max-w-5xl mx-auto relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-600 rounded-full blur-lg animate-pulse opacity-75" />
                <Gift className="relative text-yellow-900 flex-shrink-0 animate-bounce" size={24} />
              </div>
              <p className="text-yellow-900 font-bold text-sm md:text-base flex-1 leading-tight animate-fade-in">
                🎁 {data.upsellMessage}
              </p>
            </div>
            <Button
              onClick={() => {
                showToast('info', 'Eligible products feature coming soon!');
              }}
              className="bg-yellow-900 hover:bg-yellow-800 text-white font-bold px-6 py-2 whitespace-nowrap shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-800"
            >
              See Products
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

