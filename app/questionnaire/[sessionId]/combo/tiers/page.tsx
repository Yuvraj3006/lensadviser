'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Check, Package, ArrowRight } from 'lucide-react';

interface ComboTier {
  combo_code: string;
  display_name: string;
  effective_price: number;
  total_combo_value?: number | null;
  badge?: string;
  benefits: Array<{
    type: string;
    label: string;
    max_value?: number;
  }>;
}

export default function ComboTiersPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<ComboTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [needsProfile, setNeedsProfile] = useState<any>(null);
  const [highlightedTier, setHighlightedTier] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
    fetchNeedsProfile();
    
    // Track combo cards viewed
    if (sessionId) {
      import('@/services/analytics.service').then(({ analyticsService }) => {
        // Will track after tiers are loaded
      });
    }
  }, [sessionId]);

  const fetchTiers = async () => {
    try {
      const response = await fetch('/api/combo/tiers');
      if (!response.ok) throw new Error('Failed to fetch tiers');
      const data = await response.json();
      if (data.success) {
        setTiers(data.data);
        
        // Track combo cards viewed
        if (sessionId) {
          const { analyticsService } = await import('@/services/analytics.service');
          await analyticsService.comboCardsViewed(sessionId, data.data.length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch combo tiers:', error);
      showToast('error', 'Failed to load combo tiers');
    } finally {
      setLoading(false);
    }
  };

  const fetchNeedsProfile = async () => {
    try {
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}/needs-profile`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setNeedsProfile(data.data);
          // Set highlighted tier based on needs profile
          const defaultTier = getDefaultTier(data.data);
          setHighlightedTier(defaultTier);
        }
      }
    } catch (error) {
      console.error('Failed to fetch needs profile:', error);
      // Continue without needs profile (default tier will be used)
      setHighlightedTier('SILVER'); // Default
    }
  };

  // Determine default highlighted tier based on needs profile
  const getDefaultTier = (profile?: any): string | null => {
    const profileToUse = profile || needsProfile;
    if (!profileToUse) return 'SILVER'; // Default
    
    const { backup_need, lens_complexity } = profileToUse;
    if (backup_need === true && (lens_complexity === 'ADVANCED' || lens_complexity === 'PREMIUM')) {
      return 'GOLD';
    }
    return 'SILVER';
  };

  const handleTierSelect = async (tierCode: string) => {
    if (selecting) return;
    
    setSelecting(true);
    try {
      // Update session with selected combo tier
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchaseContext: 'COMBO',
          selectedComboCode: tierCode,
          // Fetch and store combo version
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to select combo tier');
      }

      // Navigate to product selection
      router.push(`/questionnaire/${sessionId}/combo/products`);
    } catch (error) {
      console.error('Failed to select tier:', error);
      showToast('error', 'Failed to proceed. Please try again.');
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Use highlighted tier or calculate default
  const defaultTier = highlightedTier || getDefaultTier();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Package className="text-purple-400 sm:w-8 sm:h-8" size={24} />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Smart Value Combo
              </h1>
            </div>
            <p className="text-slate-300 text-base sm:text-lg">
              Choose the combo tier that works best for you
            </p>
          </div>

          {/* Combo Tier Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {tiers.map((tier) => {
              const isSelected = selectedTier === tier.combo_code;
              const isHighlighted = tier.combo_code === defaultTier;
              
              return (
                <div
                  key={tier.combo_code}
                  className={`bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border-2 p-6 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-500/50'
                      : isHighlighted
                      ? 'border-purple-400 border-dashed ring-2 ring-purple-500/30 hover:border-purple-400'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                  onClick={() => setSelectedTier(tier.combo_code)}
                >
                  {isHighlighted && !isSelected && (
                    <div className="flex items-center gap-2 text-xs text-purple-400 mb-2 font-semibold">
                      <span>⭐</span>
                      <span>RECOMMENDED FOR YOU</span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                      <Check size={16} />
                      <span className="text-sm font-semibold">SELECTED</span>
                    </div>
                  )}
                  
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {tier.display_name}
                    </h3>
                    {tier.badge && (
                      <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full mb-2">
                        {tier.badge}
                      </span>
                    )}
                    <div className="mt-2">
                      {tier.total_combo_value && (
                        <div className="text-lg text-slate-400 line-through mb-1">
                          ₹{tier.total_combo_value.toLocaleString()}
                        </div>
                      )}
                      <div className="text-3xl font-bold text-purple-400">
                        ₹{tier.effective_price.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      Combo Price
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-4">
                    <div className="text-sm text-slate-300 mb-2 font-semibold">
                      What you get:
                    </div>
                    <ul className="space-y-2">
                      {tier.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                          <Check size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                          <span>{benefit.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <Button
              onClick={() => selectedTier && handleTierSelect(selectedTier)}
              disabled={!selectedTier || selecting}
              loading={selecting}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 min-w-[200px]"
            >
              Continue
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

