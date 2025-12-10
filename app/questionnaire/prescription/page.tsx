'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { PrescriptionForm } from '@/components/lens-advisor/PrescriptionForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Ticket } from 'lucide-react';

export default function PrescriptionPage() {
  const router = useRouter();
  const rx = useLensAdvisorStore((state) => state.rx);
  const setRx = useLensAdvisorStore((state) => state.setRx);
  const language = useSessionStore((state) => state.language);
  const hasLoadedRef = useRef(false); // Track if we've already loaded from localStorage
  const [couponCode, setCouponCode] = useState('');

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
    
    // Load saved prescription from localStorage only once (prevent infinite loop)
    if (!hasLoadedRef.current) {
      const saved = localStorage.getItem('lenstrack_prescription');
      if (saved) {
        try {
          const rxData = JSON.parse(saved);
          // Check if rx is empty (no prescription data yet)
          const isRxEmpty = !rx.odSphere && !rx.osSphere && !rx.odCylinder && !rx.osCylinder;
          
          // Only set if rx is empty or if saved data is different
          if (isRxEmpty || JSON.stringify(rx) !== JSON.stringify(rxData)) {
            setRx(rxData);
          }
          hasLoadedRef.current = true; // Mark as loaded
        } catch (error) {
          console.error('[PrescriptionPage] Failed to parse saved prescription:', error);
          hasLoadedRef.current = true; // Mark as loaded even on error to prevent retries
        }
      } else {
        hasLoadedRef.current = true; // Mark as loaded if no saved data
      }
    }
  }, [language, router, rx, setRx]); // Now safe to include rx and setRx since we use ref to prevent re-runs

  const handleNext = () => {
    // Validation: SPH ±20 range, CYL negative only
    const isValid =
      (rx.odSphere === undefined || rx.odSphere === null || (rx.odSphere >= -20 && rx.odSphere <= 20)) &&
      (rx.osSphere === undefined || rx.osSphere === null || (rx.osSphere >= -20 && rx.osSphere <= 20)) &&
      (rx.odCylinder === undefined || rx.odCylinder === null || rx.odCylinder <= 0) &&
      (rx.osCylinder === undefined || rx.osCylinder === null || rx.osCylinder <= 0);

    if (!isValid) {
      return; // PrescriptionForm will show validation error
    }

    // Save to localStorage
    localStorage.setItem('lenstrack_prescription', JSON.stringify(rx));
    
    // Save coupon code if entered
    if (couponCode) {
      localStorage.setItem('lenstrack_coupon_code', couponCode);
    }
    
    // Navigate to frame page (session will be created there, then redirect to tint selection if Power Sunglasses)
    router.push('/questionnaire/frame');
  };

  const handleSkip = () => {
    // Navigate to frame page even without prescription
    router.push('/questionnaire/frame');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-7xl w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          {/* Use enhanced PrescriptionForm component */}
          <div className="bg-white rounded-xl p-6">
            <PrescriptionForm hideNextButton={true} onNext={handleNext} onSkip={handleSkip} />
          </div>

          {/* Coupon Code Section */}
          <div className="mt-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-5 border border-yellow-500/20">
            <div className="flex items-center gap-3 mb-3">
              <Ticket className="text-yellow-500" size={20} />
              <h3 className="text-lg font-semibold text-slate-200">Have a Coupon Code?</h3>
            </div>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter coupon code (e.g., WELCOME10)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 !bg-slate-700/80 !border-2 !border-slate-600 !text-white !placeholder:text-slate-500 focus:!border-yellow-500 focus:!ring-yellow-500/50"
                style={{ backgroundColor: 'rgba(51, 65, 85, 0.8)', color: 'white' }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">You can apply this coupon code later during checkout</p>
          </div>

          {/* Custom Navigation */}
          <div className="flex justify-between mt-6 pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/language')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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
