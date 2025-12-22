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
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
            <User className="text-white" size={32} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Select Your Mode
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Choose how you'd like to proceed with your selection
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200/50 dark:border-slate-700/50 shadow-xl dark:shadow-2xl">
          <div className="space-y-4 mb-8">
            {/* Self-Service Mode */}
            <button
              type="button"
              onClick={() => setSelectedMode('SELF_SERVICE')}
              className={`group w-full p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden ${
                selectedMode === 'SELF_SERVICE'
                  ? 'border-blue-500 dark:border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/20 dark:to-blue-600/10 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30 scale-[1.02]'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 hover:shadow-md hover:scale-[1.01]'
              }`}
            >
              {/* Background gradient effect */}
              {selectedMode === 'SELF_SERVICE' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 dark:from-blue-400/20 dark:via-purple-400/20 dark:to-blue-400/20 animate-pulse" />
              )}
              
              <div className="relative flex items-center gap-4 sm:gap-6">
                {/* Icon Container */}
                <div className={`flex-shrink-0 p-4 rounded-xl transition-all duration-300 ${
                  selectedMode === 'SELF_SERVICE'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 shadow-lg shadow-blue-500/50 scale-110'
                    : 'bg-slate-100 dark:bg-slate-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/30'
                }`}>
                  <User 
                    size={28} 
                    className={`transition-all duration-300 ${
                      selectedMode === 'SELF_SERVICE'
                        ? 'text-white'
                        : 'text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      selectedMode === 'SELF_SERVICE'
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-400'
                        : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-400 dark:group-hover:border-blue-500'
                    }`}>
                      {selectedMode === 'SELF_SERVICE' && (
                        <div className="w-3 h-3 rounded-full bg-white animate-scale-in" />
                      )}
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                      selectedMode === 'SELF_SERVICE'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}>
                      Do It Yourself
                    </h3>
                  </div>
                  <p className={`text-sm sm:text-base transition-colors duration-300 ${
                    selectedMode === 'SELF_SERVICE'
                      ? 'text-blue-600 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`}>
                    Independent shopping experience
                  </p>
                </div>

                {/* Checkmark indicator */}
                {selectedMode === 'SELF_SERVICE' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>

            {/* Staff-Assisted Mode */}
            <button
              type="button"
              onClick={() => setSelectedMode('STAFF_ASSISTED')}
              className={`group w-full p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden ${
                selectedMode === 'STAFF_ASSISTED'
                  ? 'border-purple-500 dark:border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-500/20 dark:to-purple-600/10 shadow-lg shadow-purple-500/20 dark:shadow-purple-500/30 scale-[1.02]'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-500/10 hover:shadow-md hover:scale-[1.01]'
              }`}
            >
              {/* Background gradient effect */}
              {selectedMode === 'STAFF_ASSISTED' && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 dark:from-purple-400/20 dark:via-blue-400/20 dark:to-purple-400/20 animate-pulse" />
              )}
              
              <div className="relative flex items-center gap-4 sm:gap-6">
                {/* Icon Container */}
                <div className={`flex-shrink-0 p-4 rounded-xl transition-all duration-300 ${
                  selectedMode === 'STAFF_ASSISTED'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 shadow-lg shadow-purple-500/50 scale-110'
                    : 'bg-slate-100 dark:bg-slate-600 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/30'
                }`}>
                  <Users 
                    size={28} 
                    className={`transition-all duration-300 ${
                      selectedMode === 'STAFF_ASSISTED'
                        ? 'text-white'
                        : 'text-slate-600 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                    }`}
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      selectedMode === 'STAFF_ASSISTED'
                        ? 'border-purple-500 dark:border-purple-400 bg-purple-500 dark:bg-purple-400'
                        : 'border-slate-300 dark:border-slate-600 group-hover:border-purple-400 dark:group-hover:border-purple-500'
                    }`}>
                      {selectedMode === 'STAFF_ASSISTED' && (
                        <div className="w-3 h-3 rounded-full bg-white animate-scale-in" />
                      )}
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                      selectedMode === 'STAFF_ASSISTED'
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400'
                    }`}>
                      Get Helped
                    </h3>
                  </div>
                  <p className={`text-sm sm:text-base transition-colors duration-300 ${
                    selectedMode === 'STAFF_ASSISTED'
                      ? 'text-purple-600 dark:text-purple-300'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`}>
                    Staff-assisted shopping experience
                  </p>
                </div>

                {/* Checkmark indicator */}
                {selectedMode === 'STAFF_ASSISTED' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-purple-500 dark:bg-purple-400 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/customer-details')}
              className="flex items-center justify-center gap-2 order-2 sm:order-1"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedMode}
              className={`flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 order-1 sm:order-2 ${
                selectedMode === 'SELF_SERVICE'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                  : selectedMode === 'STAFF_ASSISTED'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
                  : 'bg-gradient-to-r from-slate-400 to-slate-500 text-white'
              }`}
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

