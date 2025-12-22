'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Glasses, Contact } from 'lucide-react';

type PowerInputMethod = 'SPECTACLE' | 'CONTACT_LENS';

export default function PowerInputMethodPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PowerInputMethod | null>(null);

  useEffect(() => {
    // Verify Contact Lens is selected
    const savedLensType = localStorage.getItem('lenstrack_lens_type');
    if (savedLensType !== 'CONTACT_LENSES') {
      router.push('/questionnaire/lens-type');
      return;
    }
  }, [router]);

  const handleNext = () => {
    if (!selectedMethod) {
      return;
    }

    // Save selected method
    localStorage.setItem('lenstrack_cl_power_method', selectedMethod);
    
    // Navigate to appropriate power input page
    if (selectedMethod === 'SPECTACLE') {
      router.push('/questionnaire/contact-lens/spectacle-power');
    } else {
      router.push('/questionnaire/contact-lens/cl-power');
    }
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
              <Contact size={24} className="sm:w-8 sm:h-8" />
              How would you like to enter your power?
            </h1>
            <p className="text-slate-300">Choose the type of prescription you have</p>
          </div>

          <div className="space-y-4 mb-8">
            {/* Spectacle Power Option */}
            <button
              type="button"
              onClick={() => setSelectedMethod('SPECTACLE')}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                selectedMethod === 'SPECTACLE'
                  ? 'border-blue-500 bg-blue-500/20 dark:bg-blue-900/20 dark:border-blue-700'
                  : 'border-slate-600 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-600 bg-slate-700/50 dark:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedMethod === 'SPECTACLE' ? 'bg-blue-500 dark:bg-blue-600' : 'bg-slate-600 dark:bg-slate-700'
                }`}>
                  <Glasses size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      checked={selectedMethod === 'SPECTACLE'}
                      onChange={() => setSelectedMethod('SPECTACLE')}
                      className="w-5 h-5 text-blue-500 dark:text-blue-400"
                    />
                    <h3 className="text-xl font-semibold text-white dark:text-slate-100">
                      I have my Spectacle Power (Glasses Prescription)
                    </h3>
                  </div>
                  <p className="text-slate-300 dark:text-slate-400 text-sm">
                    We'll convert your glasses prescription to contact lens power automatically
                  </p>
                </div>
              </div>
            </button>

            {/* Contact Lens Power Option */}
            <button
              type="button"
              onClick={() => setSelectedMethod('CONTACT_LENS')}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                selectedMethod === 'CONTACT_LENS'
                  ? 'border-blue-500 bg-blue-500/20 dark:bg-blue-900/20 dark:border-blue-700'
                  : 'border-slate-600 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-600 bg-slate-700/50 dark:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedMethod === 'CONTACT_LENS' ? 'bg-blue-500 dark:bg-blue-600' : 'bg-slate-600 dark:bg-slate-700'
                }`}>
                  <Contact size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      checked={selectedMethod === 'CONTACT_LENS'}
                      onChange={() => setSelectedMethod('CONTACT_LENS')}
                      className="w-5 h-5 text-blue-500 dark:text-blue-400"
                    />
                    <h3 className="text-xl font-semibold text-white dark:text-slate-100">
                      I have my Contact Lens Power (CL Prescription)
                    </h3>
                  </div>
                  <p className="text-slate-300 dark:text-slate-400 text-sm">
                    Enter your contact lens prescription directly (no conversion needed)
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/lens-type')}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} className="flex-shrink-0" />
              <span className="truncate">Back</span>
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedMethod}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
            >
              <span className="truncate text-xs sm:text-sm">Continue →</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

