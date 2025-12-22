'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';

interface ConfigData {
  combo_offer_status: 'ON' | 'OFF';
  active_combo_tiers: any[];
}

export default function PathChoicePage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    fetchConfig();
    
    // Track path selection viewed
    if (sessionId) {
      import('@/services/analytics.service').then(({ analyticsService }) => {
        analyticsService.pathSelectionViewed(sessionId);
      });
    }
  }, [sessionId]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Failed to fetch config');
      }
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
        
        // If combo is OFF, auto-select REGULAR and proceed
        if (data.data.combo_offer_status === 'OFF') {
          handlePathSelect('REGULAR');
        }
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
      showToast('error', 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handlePathSelect = async (path: 'REGULAR' | 'COMBO') => {
    if (selecting) return;
    
    // Check if session already has a different purchase context (cart context lock)
    // If switching context, we should reset cart/clear selections
    try {
      const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        const existingContext = sessionData.data?.session?.purchaseContext;
        
        // If switching context and items might be in cart, show warning
        if (existingContext && existingContext !== path) {
          const confirmSwitch = window.confirm(
            'Switching purchase path will reset your current selections. Do you want to continue?'
          );
          if (!confirmSwitch) {
            return;
          }
          
          // Track switched to regular from combo
          if (existingContext === 'COMBO' && path === 'REGULAR') {
            const { analyticsService } = await import('@/services/analytics.service');
            await analyticsService.switchedToRegularFromCombo(sessionId);
          }
          
          // Clear any saved selections in localStorage
          localStorage.removeItem(`combo_selection_${sessionId}`);
        }
      }
    } catch (error) {
      console.error('Failed to check session context:', error);
    }
    
    setSelecting(true);
    try {
      // Update session with purchase context
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchaseContext: path,
          // Clear combo code if switching to REGULAR
          selectedComboCode: path === 'REGULAR' ? null : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set purchase context');
      }

      // Track path selected
      import('@/services/analytics.service').then(({ analyticsService }) => {
        analyticsService.pathSelected(sessionId, path);
      });

      // Navigate based on path
      if (path === 'REGULAR') {
        router.push(`/questionnaire/${sessionId}/recommendations`);
      } else if (path === 'COMBO') {
        router.push(`/questionnaire/${sessionId}/combo/tiers`);
      }
    } catch (error) {
      console.error('Failed to select path:', error);
      showToast('error', 'Failed to proceed. Please try again.');
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If combo is OFF, show loading while redirecting
  if (config?.combo_offer_status === 'OFF') {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Choose How You Want To Buy
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Select the purchase path that works best for you
            </p>
          </div>

          {/* Path Options */}
          <div className="flex flex-col items-center">
            {/* COMBO Path - Centered */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-200 dark:border-purple-700 p-4 sm:p-6 lg:p-8 hover:border-purple-500 dark:hover:border-purple-500 transition-all w-full max-w-md">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center mb-4 border border-purple-300 dark:border-purple-500/30">
                  <Sparkles className="text-purple-600 dark:text-purple-400" size={32} />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                  Smart Value Combo
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  Pre-configured bundles with great value. Fixed combo pricing.
                </p>
                <Button
                  onClick={() => handlePathSelect('COMBO')}
                  disabled={selecting}
                  loading={selecting}
                  size="lg"
                  fullWidth
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  View Combos
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </div>
            </div>
            
            {/* Build Your Glasses - Clickable Text Below Card */}
            <div className="text-center mt-6">
              <button
                onClick={() => handlePathSelect('REGULAR')}
                disabled={selecting}
                className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Build Your Glasses
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

