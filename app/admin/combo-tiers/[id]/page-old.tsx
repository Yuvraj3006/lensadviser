'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Package, Gift, Settings, Eye } from 'lucide-react';

interface ComboBenefit {
  id?: string;
  benefitType: 'frame' | 'lens' | 'eyewear' | 'addon' | 'voucher';
  label: string;
  maxValue?: number;
  constraints?: string;
}

interface ComboRule {
  id?: string;
  ruleType: string;
  ruleJson?: string;
}

interface ComboTier {
  id: string;
  comboCode: string;
  displayName: string;
  effectivePrice: number;
  badge?: string | null;
  isActive: boolean;
  comboVersion: number;
  sortOrder: number;
  benefits: ComboBenefit[];
  rules?: ComboRule[];
}

export default function ComboTierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const tierId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'benefits' | 'rules' | 'preview'>('benefits');
  const [tier, setTier] = useState<ComboTier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tierId) {
      fetchTier();
    }
  }, [tierId]);

  const fetchTier = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/combo-tiers/${tierId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTier(data.data);
      } else {
        showToast('error', 'Failed to load combo tier');
        router.push('/admin/combo-tiers');
      }
    } catch (error) {
      console.error('Failed to fetch tier:', error);
      showToast('error', 'Failed to load combo tier');
      router.push('/admin/combo-tiers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tier) {
    return (
      <div className="min-h-safe-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Combo tier not found</p>
          <Button onClick={() => router.push('/admin/combo-tiers')}>Back to List</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-safe-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/combo-tiers')}
            className="mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Combo Tiers
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{tier.displayName}</h1>
              <p className="text-slate-600 mt-1">Combo Code: {tier.comboCode}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  tier.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {tier.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('benefits')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'benefits'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Gift size={18} />
                Benefits
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'rules'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Settings size={18} />
                Rules
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'preview'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Eye size={18} />
                Preview
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'benefits' && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Combo Benefits</h2>
                <div className="space-y-3">
                  {tier.benefits.length > 0 ? (
                    tier.benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div>
                          <div className="font-medium text-slate-900">{benefit.label}</div>
                          <div className="text-sm text-slate-500 mt-1">
                            Type: {benefit.benefitType}
                            {benefit.maxValue && ` • Max Value: ₹${benefit.maxValue}`}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No benefits configured</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'rules' && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Combo Rules</h2>
                <div className="space-y-3">
                  {tier.rules && tier.rules.length > 0 ? (
                    tier.rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="font-medium text-slate-900 mb-2">{rule.ruleType}</div>
                        {rule.ruleJson && (
                          <pre className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                            {JSON.stringify(JSON.parse(rule.ruleJson), null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500">
                      <p className="mb-2">No custom rules configured</p>
                      <p className="text-sm">
                        This tier uses default eligibility rules (brand flags: combo_allowed)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Customer Preview</h2>
                <div className="max-w-md mx-auto">
                  <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border-2 border-purple-400 p-6">
                    <div className="text-center mb-4">
                      <h3 className="text-2xl font-bold text-white mb-2">{tier.displayName}</h3>
                      {tier.badge && (
                        <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full mb-2">
                          {tier.badge}
                        </span>
                      )}
                      <div className="text-3xl font-bold text-purple-400 mt-2">
                        ₹{tier.effectivePrice.toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">Effective Price</div>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <div className="text-sm text-slate-300 mb-2 font-semibold">
                        What you get:
                      </div>
                      <ul className="space-y-2">
                        {tier.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-purple-400 mt-0.5">✓</span>
                            <span>{benefit.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

