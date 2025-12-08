'use client';

import { UpsellSuggestion } from '@/types/offer-engine';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Gift, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';

interface UpsellEngineUIProps {
  upsell: UpsellSuggestion;
  placement?: 'top' | 'bottom' | 'toast';
  onShopMore?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function UpsellEngineUI({
  upsell,
  placement = 'bottom',
  onShopMore,
  onDismiss,
  className = '',
}: UpsellEngineUIProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  // Toast Style (Swiggy-style popup)
  if (placement === 'toast') {
    return (
      <div className={`fixed top-4 right-4 z-50 animate-slide-in-right ${className}`}>
        <Card className="p-4 shadow-lg border-2 border-blue-500 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Gift size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 mb-1">
                {upsell.rewardText}
              </p>
              <p className="text-xs text-slate-600 mb-2">
                {upsell.message}
              </p>
              {onShopMore && (
                <Button
                  size="sm"
                  onClick={onShopMore}
                  className="w-full"
                >
                  Shop More
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Top Sticky Banner
  if (placement === 'top') {
    return (
      <div className={`sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg ${className}`}>
        <Card className="border-0 bg-transparent text-white">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1">
              <Gift size={24} />
              <div className="flex-1">
                <p className="font-semibold text-sm">{upsell.rewardText}</p>
                <p className="text-xs text-blue-100 mt-1">{upsell.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="yellow" size="sm" className="bg-yellow-400 text-yellow-900">
                ₹{upsell.remaining} away
              </Badge>
              {onShopMore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onShopMore}
                  className="border-white text-white hover:bg-white hover:text-blue-600"
                >
                  Shop More
                </Button>
              )}
              {onDismiss && (
                <button
                  onClick={handleDismiss}
                  className="text-white hover:text-blue-100 ml-2"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Bottom Sticky CTA Bar (default)
  return (
    <div className={`sticky bottom-0 z-40 bg-white border-t-2 border-blue-500 shadow-lg ${className}`}>
      <Card className="border-0 rounded-none">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-blue-100 rounded-full p-2">
              <Gift size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">
                {upsell.rewardText}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {upsell.message}
              </p>
              {/* Progress Bar */}
              <div className="mt-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>You are ₹{upsell.remaining} away from unlocking</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: '75%' }} // Calculate based on remaining
                  />
                </div>
              </div>
            </div>
          </div>
          {onShopMore && (
            <Button
              onClick={onShopMore}
              className="ml-4"
            >
              Shop More
              <ArrowRight size={16} className="ml-1" />
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

