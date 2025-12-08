'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { PrescriptionForm } from '@/components/lens-advisor/PrescriptionForm';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function PrescriptionPage() {
  const router = useRouter();
  const rx = useLensAdvisorStore((state) => state.rx);
  const setRx = useLensAdvisorStore((state) => state.setRx);
  const language = useSessionStore((state) => state.language);

  useEffect(() => {
    // Check if language is selected, redirect if not
    const savedLanguage = localStorage.getItem('lenstrack_language');
    if (!language && !savedLanguage) {
      router.push('/questionnaire/language');
      return;
    }
    
    // Load saved prescription from localStorage
    const saved = localStorage.getItem('lenstrack_prescription');
    if (saved) {
      const rxData = JSON.parse(saved);
      setRx(rxData);
    }
  }, [setRx, language, router]);

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
    // Navigate to frame page
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
