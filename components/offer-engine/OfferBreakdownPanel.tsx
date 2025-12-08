'use client';

import { OfferCalculationResult } from '@/types/offer-engine';
import { Card } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';

interface OfferBreakdownPanelProps {
  result: OfferCalculationResult;
  showUpsell?: boolean;
  className?: string;
}

export function OfferBreakdownPanel({ 
  result, 
  showUpsell = true,
  className = '' 
}: OfferBreakdownPanelProps) {
  const totalSavings = result.baseTotal - result.finalPayable;

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Price Breakdown</h3>
      
      <div className="space-y-3">
        {/* Base Components */}
        {result.priceComponents.map((component, index) => {
          const isDiscount = component.amount < 0;
          return (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className={isDiscount ? 'text-green-600' : 'text-slate-700'}>
                {component.label}
              </span>
              <span className={`font-medium ${isDiscount ? 'text-green-600' : 'text-slate-900'}`}>
                {isDiscount ? '-' : ''}₹{Math.abs(component.amount).toLocaleString('en-IN')}
              </span>
            </div>
          );
        })}

        <Separator className="my-4" />

        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium text-slate-900">
            ₹{result.effectiveBase.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Total Savings */}
        {totalSavings > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600 font-medium">Total Savings</span>
            <span className="font-bold text-green-600">
              -₹{totalSavings.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <Separator className="my-4" />

        {/* Final Payable */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-900">Final Payable</span>
          <span className="text-2xl font-bold text-blue-600">
            ₹{result.finalPayable.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Upsell Banner (if enabled and available) */}
        {showUpsell && result.upsell && (
          <>
            <Separator className="my-4" />
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">
                🎁 {result.upsell.rewardText}
              </p>
              <p className="text-xs text-blue-700">
                {result.upsell.message}
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

