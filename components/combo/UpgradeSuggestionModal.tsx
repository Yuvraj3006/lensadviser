'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface UpgradeSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onSwitchToRegular: () => void;
  onChangeSelection: () => void;
  fromTier: string;
  toTier: string;
  reasonCode: string;
  customerMessage: string;
}

export function UpgradeSuggestionModal({
  isOpen,
  onClose,
  onUpgrade,
  onSwitchToRegular,
  onChangeSelection,
  fromTier,
  toTier,
  reasonCode,
  customerMessage,
}: UpgradeSuggestionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
            <Sparkles className="text-purple-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Better Match Available
          </h2>
        </div>

        {/* Message */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
          <p className="text-slate-200 text-lg">
            {customerMessage || `This selection works best in the ${toTier} Combo for complete coverage.`}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onUpgrade}
            size="lg"
            fullWidth
            className="bg-purple-600 hover:bg-purple-700"
          >
            Upgrade to {toTier}
            <ArrowRight className="ml-2" size={20} />
          </Button>

          <Button
            onClick={onSwitchToRegular}
            size="lg"
            fullWidth
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Continue with Build My Glasses
          </Button>

          <Button
            onClick={() => {
              // Track upgrade rejected when user clicks "Change Selection"
              if (typeof window !== 'undefined') {
                import('@/services/analytics.service').then(({ analyticsService }) => {
                  // Note: sessionId would need to be passed as prop if we want to track here
                  // For now, tracking happens in parent component
                });
              }
              onChangeSelection();
            }}
            size="lg"
            fullWidth
            variant="ghost"
            className="text-slate-400 hover:text-slate-300"
          >
            Change Selection
          </Button>
        </div>
      </div>
    </Modal>
  );
}

