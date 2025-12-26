'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { PrescriptionForm } from '@/components/lens-advisor/PrescriptionForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft } from 'lucide-react';

export default function PrescriptionPage() {
  const router = useRouter();
  const rx = useLensAdvisorStore((state) => state.rx);
  const setRx = useLensAdvisorStore((state) => state.setRx);
  const language = useSessionStore((state) => state.language);
  const hasLoadedRef = useRef(false); // Track if we've already loaded from localStorage

  useEffect(() => {
    // Check if language is selected, redirect if not
    const savedLanguage = localStorage.getItem('lenstrack_language');
    if (!language && !savedLanguage) {
      router.push('/questionnaire/language');
      return;
    }
    
    // Check if Contact Lens is selected - redirect to power input method
    const savedLensType = localStorage.getItem('lenstrack_lens_type');
    if (savedLensType === 'CONTACT_LENSES') {
      // Redirect to Contact Lens power input method selection
      router.push('/questionnaire/contact-lens/power-input-method');
      return;
    }
    
    // Load saved prescription from encrypted storage only once (prevent infinite loop)
    if (!hasLoadedRef.current) {
      (async () => {
        try {
          const { getPrescriptionData } = await import('@/lib/secure-storage');
          const saved = getPrescriptionData();
          if (saved) {
            // Check if rx is empty (no prescription data yet)
            const isRxEmpty = !rx.odSphere && !rx.osSphere && !rx.odCylinder && !rx.osCylinder;
            
            // Only set if rx is empty or if saved data is different
            if (isRxEmpty || JSON.stringify(rx) !== JSON.stringify(saved)) {
              setRx(saved);
            }
          }
          hasLoadedRef.current = true; // Mark as loaded
        } catch (error) {
          console.error('[PrescriptionPage] Failed to load saved prescription:', error);
          hasLoadedRef.current = true; // Mark as loaded even on error to prevent retries
        }
      })();
    }
  }, [language, router, rx, setRx]); // Now safe to include rx and setRx since we use ref to prevent re-runs

  const handleNext = async () => {
    // Validation: SPH ±20 range, CYL negative only
    const isValid =
      (rx.odSphere === undefined || rx.odSphere === null || (rx.odSphere >= -20 && rx.odSphere <= 20)) &&
      (rx.osSphere === undefined || rx.osSphere === null || (rx.osSphere >= -20 && rx.osSphere <= 20)) &&
      (rx.odCylinder === undefined || rx.odCylinder === null || rx.odCylinder <= 0) &&
      (rx.osCylinder === undefined || rx.osCylinder === null || rx.osCylinder <= 0);

    if (!isValid) {
      return; // PrescriptionForm will show validation error
    }

    // SECURITY: Store prescription data encrypted
    const { setPrescriptionData } = await import('@/lib/secure-storage');
    setPrescriptionData(rx);
    
    // Navigate to frame page (session will be created there, then redirect to tint selection if Power Sunglasses)
    router.push('/questionnaire/frame');
  };

  const handleSkip = () => {
    // Navigate to frame page even without prescription
    router.push('/questionnaire/frame');
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl w-full mx-auto">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-2xl">
          {/* Use enhanced PrescriptionForm component */}
          <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
            <PrescriptionForm hideNextButton={true} onNext={handleNext} onSkip={handleSkip} />
          </div>

          {/* Custom Navigation */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/lens-type')}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="w-full sm:w-auto"
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full sm:w-auto"
              >
                Next: Frame Details →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
