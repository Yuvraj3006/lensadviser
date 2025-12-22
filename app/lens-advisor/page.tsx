'use client';

/**
 * Lens Advisor Main Page
 * Matches Frontend Specification - Step by Step Wizard
 */

import { useEffect, useState } from 'react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { PrescriptionForm } from '@/components/lens-advisor/PrescriptionForm';
import { FrameEntryForm } from '@/components/lens-advisor/FrameEntryForm';
import { QuestionnaireWizard } from '@/components/lens-advisor/QuestionnaireWizard';
import { LensRecommendations } from '@/components/lens-advisor/LensRecommendations';
import { OfferCalculatorView } from '@/components/lens-advisor/OfferCalculatorView';
import { CheckoutStep } from '@/components/lens-advisor/CheckoutStep';
import { LanguageSelector } from '@/components/lens-advisor/LanguageSelector';
import { StepHeader } from '@/components/lens-advisor/StepHeader';
import { SummarySidebar } from '@/components/lens-advisor/SummarySidebar';
import { Eye, Frame, HelpCircle, Sparkles, Calculator, ShoppingCart } from 'lucide-react';

const steps = [
  { number: 1, label: 'Prescription', icon: Eye },
  { number: 2, label: 'Frame Entry', icon: Frame },
  { number: 3, label: 'Questionnaire', icon: HelpCircle },
  { number: 4, label: 'Recommendations', icon: Sparkles },
  { number: 5, label: 'Offer & Quote', icon: Calculator },
  { number: 6, label: 'Checkout', icon: ShoppingCart },
];

export default function LensAdvisorPage() {
  const currentStep = useLensAdvisorStore((state) => state.currentStep);
  const language = useSessionStore((state) => state.language);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const storeId = useSessionStore((state) => state.storeId);
  const salesMode = useSessionStore((state) => state.salesMode);

  // Check for QR code params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qrStoreId = params.get('store');
      const qrCode = params.get('qr');
      
      if (qrStoreId && !storeId) {
        // Set store from QR (using storeId as code and name temporarily)
        useSessionStore.getState().setStore(qrStoreId, qrStoreId, 'Store');
        useSessionStore.getState().setSalesMode('SELF_SERVICE');
      }
    }
  }, [storeId]);

  // Show language selector if no language selected
  useEffect(() => {
    if (!language) {
      setShowLanguageSelector(true);
    }
  }, [language]);

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {showLanguageSelector && (
        <LanguageSelector
          onSelect={() => setShowLanguageSelector(false)}
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Step Header */}
        <StepHeader steps={steps} currentStep={currentStep} />

        <div className="grid lg:grid-cols-4 gap-4 sm:gap-6 mt-4 sm:mt-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
              {currentStep === 1 && <PrescriptionForm />}
              {currentStep === 2 && <FrameEntryForm />}
              {currentStep === 3 && <QuestionnaireWizard />}
              {currentStep === 4 && <LensRecommendations />}
              {currentStep === 5 && <OfferCalculatorView />}
              {currentStep === 6 && <CheckoutStep />}
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <SummarySidebar />
          </div>
        </div>
      </div>
    </div>
  );
}

