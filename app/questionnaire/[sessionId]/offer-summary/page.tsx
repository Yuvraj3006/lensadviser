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
  Sparkles,
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
  const sessionId = params.sessionId as string;
  const productId = params.productId as string;

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
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-spin" 
                 style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
            <div className="absolute inset-2 rounded-full bg-slate-900 flex items-center justify-center">
              <Sparkles className="text-blue-400 animate-pulse" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Calculating Your Best Offers</h2>
          <p className="text-slate-400">Applying all eligible discounts...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-xl">
          <div className="text-7xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Unable to Load Offer Summary</h2>
          <p className="text-slate-300 mb-6">
            Please go back and select a lens again.
          </p>
          <Button 
            onClick={() => router.push(`/questionnaire/${sessionId}/recommendations`)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Recommendations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 py-8 px-6 shadow-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <CheckCircle className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Your Final Price</h1>
              <p className="text-blue-100 text-base">All offers applied</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Top Summary Card */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Eye size={20} className="text-blue-600" />
            Selected Items
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Selected Lens */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Selected Lens</h3>
              <p className="text-lg font-bold text-slate-900 mb-1">{data.selectedLens.name}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <span>Index {data.selectedLens.index}</span>
                <span>•</span>
                <span>{data.selectedLens.brandLine}</span>
              </div>
              <p className="text-xl font-bold text-blue-600">₹{Math.round(data.selectedLens.price).toLocaleString()}</p>
            </div>

            {/* Selected Frame */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Selected Frame</h3>
              <p className="text-lg font-bold text-slate-900 mb-1">{data.selectedFrame.brand}</p>
              {data.selectedFrame.frameType && (
                <p className="text-sm text-slate-600 mb-2">{data.selectedFrame.frameType}</p>
              )}
              <p className="text-xl font-bold text-purple-600">₹{Math.round(data.selectedFrame.mrp).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Price Breakdown Card */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Tag size={20} className="text-green-600" />
            Price Breakdown
          </h2>

          <div className="space-y-4">
            {/* Frame MRP */}
            <div className="flex justify-between items-center py-3 border-b border-slate-200">
              <span className="text-slate-700 font-medium">Frame MRP</span>
              <span className="text-lg font-semibold text-slate-900">₹{Math.round(data.priceBreakdown.frameMRP).toLocaleString()}</span>
            </div>

            {/* Lens Price */}
            <div className="flex justify-between items-center py-3 border-b border-slate-200">
              <span className="text-slate-700 font-medium">Lens Price</span>
              <span className="text-lg font-semibold text-slate-900">₹{Math.round(data.priceBreakdown.lensPrice).toLocaleString()}</span>
            </div>

            {/* Applied Offers */}
            {data.priceBreakdown.offers.length > 0 && (
              <div className="py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Applied Offers</h3>
                <div className="space-y-3">
                  {data.priceBreakdown.offers.map((offer, idx) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                            {offer.code || offer.type}
                          </span>
                          <span className="font-semibold text-slate-900">{offer.title}</span>
                        </div>
                        <p className="text-sm text-slate-600">{offer.explanation}</p>
                      </div>
                      <span className="text-lg font-bold text-green-600 ml-4">
                        -₹{Math.round(offer.discountAmount || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtotal */}
            <div className="flex justify-between items-center py-3 border-b-2 border-slate-300">
              <span className="text-lg font-semibold text-slate-700">Subtotal</span>
              <span className="text-xl font-bold text-slate-900">₹{Math.round(data.priceBreakdown.subtotal).toLocaleString()}</span>
            </div>

            {/* Total Discount */}
            {data.priceBreakdown.totalDiscount > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-700 font-medium flex items-center gap-2">
                  <Percent size={16} className="text-green-600" />
                  Total Discount
                </span>
                <span className="text-xl font-bold text-green-600">-₹{Math.round(data.priceBreakdown.totalDiscount).toLocaleString()}</span>
              </div>
            )}

            {/* Final Payable */}
            <div className="flex justify-between items-center py-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-4 border-2 border-blue-200">
              <span className="text-2xl font-bold text-slate-900">Final Payable</span>
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ₹{Math.round(data.priceBreakdown.finalPayable).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button
            onClick={() => router.push(`/questionnaire/${sessionId}/recommendations`)}
            variant="outline"
            className="flex-1 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-4 text-base"
          >
            <ArrowLeft size={20} className="mr-2" />
            Change Lens
          </Button>
          <Button
            onClick={() => {
              // Navigate to checkout or create order
              showToast('success', 'Proceeding to checkout...');
              // TODO: Navigate to checkout page
            }}
            className="flex-1 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white font-bold py-4 text-base shadow-lg hover:shadow-xl transition-all"
          >
            <ShoppingCart size={20} className="mr-2" />
            Proceed to Checkout
            <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>
      </div>

      {/* Upsell Strip - Sticky Bottom */}
      {data.upsellMessage && (
        <div className="sticky bottom-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 py-4 px-6 shadow-2xl border-t-2 border-yellow-600 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Gift className="text-yellow-900 flex-shrink-0" size={24} />
              <p className="text-yellow-900 font-bold text-base md:text-lg flex-1">
                {data.upsellMessage}
              </p>
            </div>
            <Button
              onClick={() => {
                // TODO: Show eligible products modal
                showToast('info', 'Eligible products feature coming soon!');
              }}
              className="bg-yellow-900 hover:bg-yellow-800 text-white font-semibold px-6 py-2 shadow-lg whitespace-nowrap"
            >
              See Eligible Products
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

