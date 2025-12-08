'use client';

/**
 * Admin Lens Detail Page
 * Matches Frontend Specification exactly
 * 5 Tabs: GENERAL | SPECIFICATIONS | FEATURES | BENEFITS | ANSWER BOOSTS
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Package, Settings, Sparkles, TrendingUp, Target } from 'lucide-react';
import { BrandLine } from '@prisma/client';

type Tab = 'general' | 'specifications' | 'features' | 'benefits' | 'answerBoosts';

interface Lens {
  id: string;
  itCode: string;
  name: string;
  brandLine: BrandLine | null;
  index: string | null;
  price: number;
  yopoEligible: boolean;
  features: Array<{ id: string; key: string; name: string; enabled: boolean }>;
  specifications?: Array<{ key: string; value: string; group: string }>;
  benefits?: Array<{ id: string; name: string; score: number }>;
  answerBoosts?: Array<{ questionId: string; optionKey: string; boost: number }>;
}

interface Feature {
  id: string;
  key: string;
  name: string;
}

export default function AdminLensDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const lensId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [lens, setLens] = useState<Lens | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  
  // Specifications state
  const [newSpec, setNewSpec] = useState({ key: '', value: '', group: '' });
  
  // Benefits state
  const [availableBenefits, setAvailableBenefits] = useState<Array<{ id: string; name: string }>>([]);
  const [newBenefitName, setNewBenefitName] = useState('');
  
  // Answer Boosts state
  const [questions, setQuestions] = useState<Array<{ id: string; key: string; textEn: string; options: Array<{ key: string; textEn: string }> }>>([]);
  const [newBoost, setNewBoost] = useState({ questionId: '', optionKey: '', boost: 0 });

  const tabs = [
    { id: 'general' as Tab, label: 'General', icon: Package },
    { id: 'specifications' as Tab, label: 'Specifications', icon: Settings },
    { id: 'features' as Tab, label: 'Features', icon: Sparkles },
    { id: 'benefits' as Tab, label: 'Benefits', icon: TrendingUp },
    { id: 'answerBoosts' as Tab, label: 'Answer Boosts', icon: Target },
  ];

  useEffect(() => {
    const token = localStorage.getItem('lenstrack_token');
    if (token) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.organizationId) {
            setOrganizationId(data.data.organizationId);
            fetchFeatures(data.data.organizationId);
            fetchBenefits();
            fetchQuestions();
          }
        });
    }
  }, []);

  useEffect(() => {
    if (lensId && lensId !== 'new') {
      fetchLens();
    } else {
      setLens({
        id: '',
        itCode: '',
        name: '',
        brandLine: null,
        index: null,
        price: 0,
        yopoEligible: false,
        features: [],
        specifications: [],
        benefits: [
          { id: 'B01', name: 'Comfort', score: 0 },
          { id: 'B02', name: 'Durability', score: 0 },
          { id: 'B03', name: 'Clarity', score: 0 },
          { id: 'B04', name: 'Style', score: 0 },
          { id: 'B05', name: 'Value', score: 0 },
        ],
        answerBoosts: [],
      });
      setLoading(false);
    }
  }, [lensId]);

  const fetchFeatures = async (orgId: string) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/features?category=EYEGLASSES`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAvailableFeatures(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch features');
    }
  };

  const fetchBenefits = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/benefits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAvailableBenefits(data.data);
        // Initialize benefits if empty
        if (lens && (!lens.benefits || lens.benefits.length === 0)) {
          setLens({
            ...lens,
            benefits: data.data.map((b: any) => ({ id: b.id, name: b.name, score: 0 }))
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch benefits');
    }
  };

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/questions?category=EYEGLASSES`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('[fetchQuestions] Lens page - Questions data:', data);
      if (data.success) {
        const mappedQuestions = data.data.map((q: any) => ({
          id: q.id,
          key: q.key,
          textEn: q.textEn,
          options: (q.options || []).map((opt: any) => ({
            key: opt.key,
            textEn: opt.textEn,
            id: opt.id,
          }))
        }));
        console.log('[fetchQuestions] Mapped questions:', mappedQuestions);
        setQuestions(mappedQuestions);
      } else {
        console.error('[fetchQuestions] API error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const fetchLens = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/products/${lensId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setLens({
          id: data.data.id,
          itCode: data.data.itCode || data.data.sku,
          name: data.data.name,
          brandLine: data.data.brandLine,
          index: data.data.subCategory,
          price: data.data.basePrice,
          yopoEligible: data.data.yopoEligible || false,
          features: data.data.features || [],
        });
      }
    } catch (error) {
      showToast('error', 'Failed to load lens');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lens || !organizationId) return;
    
    // Validation
    if (!lens.itCode || !lens.name || lens.price <= 0) {
      showToast('error', 'Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const isNew = lensId === 'new';
      
      const payload = {
        sku: lens.itCode,
        itCode: lens.itCode,
        name: lens.name,
        brandLine: lens.brandLine,
        subCategory: lens.index, // Index stored in subCategory
        basePrice: lens.price,
        yopoEligible: lens.yopoEligible,
        category: 'EYEGLASSES',
        description: `${lens.name} - ${lens.brandLine || 'Standard'}`,
        imageUrl: '/images/lens-placeholder.jpg',
        isActive: true,
        organizationId,
      };
      
      const url = isNew 
        ? '/api/admin/products' 
        : `/api/admin/products/${lensId}`;
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (data.success) {
        showToast('success', `Lens ${isNew ? 'created' : 'saved'} successfully`);
        router.push('/admin/lenses');
      } else {
        showToast('error', data.error?.message || 'Failed to save lens');
      }
    } catch (error) {
      showToast('error', 'Failed to save lens');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lens) {
    return <div>Lens not found</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => router.push('/admin/lenses')}>
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">
            {lensId === 'new' ? 'New Lens' : lens.name}
          </h1>
        </div>
        <Button onClick={handleSave} loading={submitting}>
          Save Lens
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Tab 1: GENERAL */}
        {activeTab === 'general' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="IT Code *"
                  value={lens.itCode}
                  onChange={(e) => setLens({ ...lens, itCode: e.target.value })}
                  required
                />
                <Input
                  label="Name *"
                  value={lens.name}
                  onChange={(e) => setLens({ ...lens, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Brand Line"
                  value={lens.brandLine || ''}
                  onChange={(e) => setLens({ ...lens, brandLine: (e.target.value || null) as BrandLine | null })}
                  options={Object.values(BrandLine).map(v => ({ value: v, label: v }))}
                />
                <Input
                  label="Index"
                  value={lens.index || ''}
                  onChange={(e) => setLens({ ...lens, index: e.target.value || null })}
                  placeholder="e.g., 1.56, 1.60, 1.67"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Offer Price (₹) *"
                  type="number"
                  value={lens.price.toString()}
                  onChange={(e) => setLens({ ...lens, price: parseFloat(e.target.value) || 0 })}
                  required
                />
                <label className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    checked={lens.yopoEligible}
                    onChange={(e) => setLens({ ...lens, yopoEligible: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium">YOPO Eligible</span>
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 2: SPECIFICATIONS */}
        {activeTab === 'specifications' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Specifications (Key/Value/Group)</h3>
            <div className="space-y-4">
              {/* Existing Specifications */}
              {lens.specifications && lens.specifications.length > 0 && (
                <div className="space-y-2">
                  {lens.specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg items-center">
                      <div>
                        <p className="text-xs text-slate-500">Key</p>
                        <p className="font-medium">{spec.key}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Value</p>
                        <p className="font-medium">{spec.value}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Group</p>
                        <p className="font-medium">{spec.group}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLens({
                            ...lens,
                            specifications: lens.specifications?.filter((_, i) => i !== index)
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add New Specification */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Input
                    label="Key"
                    placeholder="e.g., Material"
                    value={newSpec.key}
                    onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })}
                  />
                  <Input
                    label="Value"
                    placeholder="e.g., Polycarbonate"
                    value={newSpec.value}
                    onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                  />
                  <Input
                    label="Group"
                    placeholder="e.g., MATERIAL"
                    value={newSpec.group}
                    onChange={(e) => setNewSpec({ ...newSpec, group: e.target.value })}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newSpec.key && newSpec.value && newSpec.group) {
                      setLens({
                        ...lens,
                        specifications: [...(lens.specifications || []), newSpec]
                      });
                      setNewSpec({ key: '', value: '', group: '' });
                      showToast('success', 'Specification added');
                    } else {
                      showToast('error', 'Please fill all fields');
                    }
                  }}
                >
                  + Add Specification
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Groups: OPTICAL_DESIGN, MATERIAL, COATING, INDEX_USAGE, LIFESTYLE_TAG
              </p>
            </div>
          </Card>
        )}

        {/* Tab 3: FEATURES */}
        {activeTab === 'features' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Features (F01–F11 Toggles)</h3>
            <div className="space-y-3">
              {availableFeatures.length > 0 ? (
                availableFeatures.map((feature) => {
                  const isEnabled = lens.features.some((f) => f.id === feature.id || f.key === feature.key);
                  return (
                    <label key={feature.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLens({
                              ...lens,
                              features: [...lens.features, { id: feature.id, key: feature.key, name: feature.name, enabled: true }],
                            });
                          } else {
                            setLens({
                              ...lens,
                              features: lens.features.filter((f) => f.id !== feature.id && f.key !== feature.key),
                            });
                          }
                        }}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                      <span className="font-mono text-sm text-slate-500">{feature.key}</span>
                      <span className="text-slate-700 flex-1">{feature.name}</span>
                    </label>
                  );
                })
              ) : (
                <p className="text-slate-500 text-sm">Loading features...</p>
              )}
            </div>
          </Card>
        )}

        {/* Tab 4: BENEFITS */}
        {activeTab === 'benefits' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Benefits (Tag-based Scoring)</h3>
            <div className="space-y-6">
              {/* Add New Benefit */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-3">Add New Benefit</p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Type benefit name... (e.g., Blue Light Protection)"
                    value={newBenefitName}
                    onChange={(e) => setNewBenefitName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newBenefitName.trim()) {
                        const newBenefit = {
                          id: `B-${Date.now()}`,
                          name: newBenefitName.trim(),
                          score: 5
                        };
                        setLens({
                          ...lens,
                          benefits: [...(lens.benefits || []), newBenefit]
                        });
                        setNewBenefitName('');
                        showToast('success', 'Benefit added');
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newBenefitName.trim()) {
                        const newBenefit = {
                          id: `B-${Date.now()}`,
                          name: newBenefitName.trim(),
                          score: 5
                        };
                        setLens({
                          ...lens,
                          benefits: [...(lens.benefits || []), newBenefit]
                        });
                        setNewBenefitName('');
                        showToast('success', 'Benefit added');
                      }
                    }}
                  >
                    + Add Tag
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Press Enter or click Add Tag to create</p>
              </div>

              {/* Benefit Tags Grid */}
              <div className="grid grid-cols-2 gap-4">
                {lens.benefits && lens.benefits.length > 0 ? (
                  lens.benefits.map((benefit) => {
                    const score = benefit.score || 0;
                    const isActive = score > 0;
                    
                    return (
                      <div
                        key={benefit.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-slate-900">{benefit.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                              {score}/10
                            </span>
                            <button
                              onClick={() => {
                                setLens({
                                  ...lens,
                                  benefits: lens.benefits?.filter(b => b.id !== benefit.id)
                                });
                                showToast('success', 'Benefit removed');
                              }}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={score}
                            onChange={(e) => {
                              const newScore = parseFloat(e.target.value);
                              const updatedBenefits = lens.benefits?.map(b =>
                                b.id === benefit.id ? { ...b, score: newScore } : b
                              ) || [];
                              setLens({ ...lens, benefits: updatedBenefits });
                            }}
                            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                              isActive ? 'bg-blue-200' : 'bg-slate-200'
                            }`}
                          />
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>0</span>
                            <span>5</span>
                            <span>10</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 text-sm col-span-2">No benefits added yet. Type above to add custom benefits.</p>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Adjust scores (0-10) for each benefit to influence recommendation matching
              </p>
            </div>
          </Card>
        )}

        {/* Tab 5: ANSWER BOOSTS */}
        {activeTab === 'answerBoosts' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Answer Boosts (Map Questionnaire Answers)</h3>
            <div className="space-y-4">
              {/* Existing Answer Boosts */}
              {lens.answerBoosts && lens.answerBoosts.length > 0 && (
                <div className="space-y-2">
                  {lens.answerBoosts.map((boost, index) => {
                    const question = questions.find(q => q.id === boost.questionId);
                    const option = question?.options.find(o => o.key === boost.optionKey);
                    
                    return (
                      <div key={index} className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg items-center">
                        <div>
                          <p className="text-xs text-slate-500">Question</p>
                          <p className="font-medium text-sm">{question?.textEn || boost.questionId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Answer Option</p>
                          <p className="font-medium text-sm">{option?.textEn || boost.optionKey}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Boost Score</p>
                          <p className="font-bold text-green-600 text-lg">+{boost.boost}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLens({
                              ...lens,
                              answerBoosts: lens.answerBoosts?.filter((_, i) => i !== index)
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Add New Answer Boost */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Select
                    label="Question"
                    value={newBoost.questionId}
                    onChange={(e) => {
                      setNewBoost({ ...newBoost, questionId: e.target.value, optionKey: '' });
                    }}
                    options={[
                      { value: '', label: 'Select question...' },
                      ...questions.map(q => ({ value: q.id, label: `${q.key}: ${q.textEn}` }))
                    ]}
                  />
                  <Select
                    label="Answer Option"
                    value={newBoost.optionKey}
                    onChange={(e) => setNewBoost({ ...newBoost, optionKey: e.target.value })}
                    disabled={!newBoost.questionId}
                    options={[
                      { 
                        value: '', 
                        label: !newBoost.questionId 
                          ? 'Select question first...' 
                          : (questions.find(q => q.id === newBoost.questionId)?.options?.length === 0
                              ? 'No options available'
                              : 'Select answer...')
                      },
                      ...(newBoost.questionId 
                        ? (questions.find(q => q.id === newBoost.questionId)?.options || []).map((opt: any) => ({
                            value: opt.key,
                            label: opt.textEn || opt.key
                          }))
                        : [])
                    ]}
                  />
                  <Input
                    label="Boost Score"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    placeholder="e.g., 10"
                    value={newBoost.boost > 0 ? newBoost.boost.toString() : ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setNewBoost({ ...newBoost, boost: val });
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newBoost.questionId && newBoost.optionKey && newBoost.boost > 0) {
                      setLens({
                        ...lens,
                        answerBoosts: [...(lens.answerBoosts || []), newBoost]
                      });
                      setNewBoost({ questionId: '', optionKey: '', boost: 0 });
                      showToast('success', 'Answer boost added');
                    } else {
                      showToast('error', 'Please select question, answer, and enter boost score');
                    }
                  }}
                >
                  + Add Answer Boost
                </Button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">💡 How Answer Boosts Work:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Customer answers questionnaire questions</li>
                  <li>• Selected answers give this lens bonus points</li>
                  <li>• Higher boost = better recommendation match</li>
                  <li>• Example: "8+ hours screen time" → +10 boost for blue light lenses</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

