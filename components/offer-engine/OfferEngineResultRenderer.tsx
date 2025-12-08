'use client';

import { OfferCalculationResult, OfferApplied } from '@/types/offer-engine';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tag, Percent, Gift, Ticket, Award } from 'lucide-react';

interface OfferEngineResultRendererProps {
  result: OfferCalculationResult;
  showBreakdown?: boolean;
}

export function OfferEngineResultRenderer({ 
  result, 
  showBreakdown = true 
}: OfferEngineResultRendererProps) {
  const getOfferIcon = (ruleCode: string) => {
    const code = ruleCode.toUpperCase();
    if (code.includes('YOPO')) return <Award size={16} />;
    if (code.includes('FREE')) return <Gift size={16} />;
    if (code.includes('BOGO') || code.includes('BOG')) return <Tag size={16} />;
    if (code.includes('PERCENT') || code.includes('CATEGORY')) return <Percent size={16} />;
    if (code.includes('COUPON')) return <Ticket size={16} />;
    return <Tag size={16} />;
  };

  const formatOfferDescription = (offer: OfferApplied): string => {
    const code = offer.ruleCode.toUpperCase();
    
    // YOPO
    if (code.includes('YOPO')) {
      return `YOPO Applied: Paying higher value → ₹${offer.savings.toLocaleString('en-IN')}`;
    }
    
    // Free Lens
    if (code.includes('FREE') && code.includes('LENS')) {
      return `Free Lens: ${offer.description} (Saved ₹${offer.savings.toLocaleString('en-IN')})`;
    }
    
    // BOG50
    if (code.includes('BOGO') || code.includes('BOG')) {
      return `BOG50 Applied: 50% OFF second frame (Saved ₹${offer.savings.toLocaleString('en-IN')})`;
    }
    
    // Category Discount
    if (code.includes('CATEGORY') || code.includes('STUDENT') || code.includes('DOCTOR')) {
      return `${offer.description} (Saved ₹${offer.savings.toLocaleString('en-IN')})`;
    }
    
    // Bonus Free Product
    if (code.includes('BONUS')) {
      return `Bonus Free Product: ${offer.description} (Saved ₹${offer.savings.toLocaleString('en-IN')})`;
    }
    
    // Default
    return `${offer.description} (Saved ₹${offer.savings.toLocaleString('en-IN')})`;
  };

  const allOffers: OfferApplied[] = [
    ...result.offersApplied,
    ...(result.categoryDiscount ? [result.categoryDiscount] : []),
    ...(result.couponDiscount ? [result.couponDiscount] : []),
    ...(result.secondPairDiscount ? [result.secondPairDiscount] : []),
  ];

  if (allOffers.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-slate-600 text-sm">Standard Pricing</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Applied Offers List */}
      <div className="space-y-2">
        {allOffers.map((offer, index) => (
          <div
            key={`${offer.ruleCode}-${index}`}
            className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="text-green-600 mt-0.5">
              {getOfferIcon(offer.ruleCode)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                {formatOfferDescription(offer)}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Code: {offer.ruleCode}
              </p>
            </div>
            <Badge color="green" size="sm">
              -₹{offer.savings.toLocaleString('en-IN')}
            </Badge>
          </div>
        ))}
      </div>

      {/* Total Savings Summary */}
      {showBreakdown && (
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Total Savings:</span>
            <span className="text-lg font-bold text-green-600">
              ₹{(result.baseTotal - result.finalPayable).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

