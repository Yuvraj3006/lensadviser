'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { User, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';

type SalesMode = 'SELF_SERVICE' | 'STAFF_ASSISTED';

export default function ModeSelectionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const setSalesMode = useSessionStore((state) => state.setSalesMode);
  const [selectedMode, setSelectedMode] = useState<SalesMode | null>(null);

  useEffect(() => {
    // Check if store is verified
    const storeCode = localStorage.getItem('lenstrack_store_code');
    if (!storeCode) {
      router.push('/questionnaire');
      return;
    }

    // Load saved mode if exists
    const savedMode = useSessionStore.getState().salesMode;
    if (savedMode) {
      setSelectedMode(savedMode);
    }
  }, [router]);

  const handleNext = () => {
    if (!selectedMode) {
      showToast('error', 'Please select a mode');
      return;
    }

    // Save mode to session store
    setSalesMode(selectedMode);
    
    // Navigate to language selection (as per spec: Mode → Language → Mode Selection)
    router.push('/questionnaire/language');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 text-center">Select Mode</h1>
            <p className="text-slate-400 text-center">Choose how you want to proceed</p>
          </div>

          <div className="space-y-4 mb-8">
            {/* Self-Service Mode */}
            <button
              type="button"
              onClick={() => setSelectedMode('SELF_SERVICE')}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                selectedMode === 'SELF_SERVICE'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedMode === 'SELF_SERVICE' ? 'bg-blue-500' : 'bg-slate-600'
                }`}>
                  <User size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      checked={selectedMode === 'SELF_SERVICE'}
                      onChange={() => setSelectedMode('SELF_SERVICE')}
                      className="w-5 h-5 text-blue-500"
                    />
                    <h3 className="text-xl font-semibold text-white">
                      Self-Service Mode
                    </h3>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Customer enters details themselves. Staff assistance is optional.
                  </p>
                </div>
              </div>
            </button>

            {/* Staff-Assisted Mode */}
            <button
              type="button"
              onClick={() => setSelectedMode('STAFF_ASSISTED')}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                selectedMode === 'STAFF_ASSISTED'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedMode === 'STAFF_ASSISTED' ? 'bg-blue-500' : 'bg-slate-600'
                }`}>
                  <Users size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      checked={selectedMode === 'STAFF_ASSISTED'}
                      onChange={() => setSelectedMode('STAFF_ASSISTED')}
                      className="w-5 h-5 text-blue-500"
                    />
                    <h3 className="text-xl font-semibold text-white">
                      POS Mode (Staff-Assisted)
                    </h3>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Staff member assists the customer. Staff selection is required.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedMode}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
            >
              Continue
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

