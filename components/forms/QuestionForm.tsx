'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
type ProductCategory = 'EYEGLASSES' | 'SUNGLASSES' | 'CONTACT_LENSES' | 'ACCESSORIES';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Languages } from 'lucide-react';

interface Benefit {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface AnswerOption {
  key: string;
  textEn: string;
  textHi?: string;
  textHiEn?: string;
  icon?: string;
  order: number;
  benefitMapping: Record<string, number>; // { B01: 2, B04: 1.5, ... }
  categoryWeight?: number; // Category weight multiplier (default 1.0)
  triggersSubQuestion?: boolean; // If true, this answer triggers a sub-question
  subQuestionId?: string | null; // ID of the sub-question to show after this answer (legacy - single sub-question)
  nextQuestionIds?: string[]; // Array of question IDs for unlimited nesting support
}

interface QuestionFormProps {
  question?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function QuestionForm({ question, onSubmit, onCancel, loading }: QuestionFormProps) {
  const [formData, setFormData] = useState({
    key: question?.key || '',
    textEn: question?.textEn || '',
    textHi: question?.textHi || '',
    textHiEn: question?.textHiEn || '',
    category: question?.category || 'EYEGLASSES',
    order: question?.order || 0,
    displayOrder: question?.displayOrder || question?.order || 0, // displayOrder field
    isRequired: question?.isRequired ?? true,
    allowMultiple: question?.allowMultiple ?? false,
    isActive: question?.isActive ?? true,
    parentAnswerId: question?.parentAnswerId || null, // For interconnected questions
    questionCategory: question?.questionCategory || '', // Optional category grouping
    questionType: question?.questionType || '', // Optional type (SINGLE_SELECT, MULTI_SELECT, etc.)
    code: question?.code || '', // Optional code field
  });

  const [options, setOptions] = useState<AnswerOption[]>(() => {
    if (question?.options && question.options.length > 0) {
      return question.options.map((opt: any) => ({
        key: opt.key || '',
        textEn: opt.textEn || opt.text || '',
        textHi: opt.textHi || '',
        textHiEn: opt.textHiEn || '',
        icon: opt.icon || '',
        order: opt.order || opt.displayOrder || 1,
        benefitMapping: opt.benefitMapping || {},
        categoryWeight: opt.categoryWeight || 1.0,
        triggersSubQuestion: opt.triggersSubQuestion || false,
        subQuestionId: opt.subQuestionId || null,
        nextQuestionIds: opt.nextQuestionIds || (opt.subQuestionId ? [opt.subQuestionId] : []), // Support both old and new format
      }));
    }
    return [
      { key: '', textEn: '', textHi: '', textHiEn: '', icon: '', order: 1, benefitMapping: {}, triggersSubQuestion: false, subQuestionId: null, nextQuestionIds: [] },
    ];
  });

  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [expandedBenefitMappings, setExpandedBenefitMappings] = useState<Set<number>>(new Set());
  const [allQuestions, setAllQuestions] = useState<any[]>([]); // All questions for sub-question dropdown
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [translatingQuestion, setTranslatingQuestion] = useState(false);
  const [translatingOptions, setTranslatingOptions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchBenefits();
    fetchAllQuestions();
  }, []);

  const fetchAllQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/questions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out the current question being edited (to prevent self-links)
          const filtered = question?.id 
            ? data.data.filter((q: any) => q.id !== question.id)
            : data.data;
          setAllQuestions(filtered);
        }
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAutoTranslateQuestion = async () => {
    if (!formData.textEn || formData.textEn.trim().length === 0) {
      return;
    }

    setTranslatingQuestion(true);
    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: formData.textEn,
          type: 'question',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFormData({
          ...formData,
          textHi: data.data.hindi || formData.textHi,
          textHiEn: data.data.hinglish || formData.textHiEn,
        });
      }
    } catch (error) {
      console.error('Failed to translate:', error);
    } finally {
      setTranslatingQuestion(false);
    }
  };

  const handleAutoTranslateOption = async (index: number) => {
    const option = options[index];
    if (!option.textEn || option.textEn.trim().length === 0) {
      return;
    }

    setTranslatingOptions(new Set([...translatingOptions, index]));
    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: option.textEn,
          type: 'answer',
        }),
      });

      const data = await response.json();
      if (data.success) {
        const updatedOptions = [...options];
        updatedOptions[index] = {
          ...option,
          textHi: data.data.hindi || option.textHi,
          textHiEn: data.data.hinglish || option.textHiEn,
        };
        setOptions(updatedOptions);
      }
    } catch (error) {
      console.error('Failed to translate option:', error);
    } finally {
      const newSet = new Set(translatingOptions);
      newSet.delete(index);
      setTranslatingOptions(newSet);
    }
  };

  // Update options when question prop changes (for editing)
  useEffect(() => {
    if (question?.options && question.options.length > 0) {
      setOptions(
        question.options.map((opt: any) => ({
          key: opt.key || '',
          textEn: opt.textEn || opt.text || '',
          textHi: opt.textHi || '',
          textHiEn: opt.textHiEn || '',
          icon: opt.icon || '',
          order: opt.order || opt.displayOrder || 1,
          benefitMapping: opt.benefitMapping || {},
          triggersSubQuestion: opt.triggersSubQuestion || false,
          subQuestionId: opt.subQuestionId || null,
        }))
      );
    }
  }, [question]);

  const fetchBenefits = async () => {
    setLoadingBenefits(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      // Fetch from benefit-features endpoint (unified model)
      const response = await fetch('/api/admin/benefit-features?type=BENEFIT', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Map BenefitFeature to Benefit format
          const benefitsData = (data.data || []).map((bf: any) => ({
            id: bf.id,
            code: bf.code,
            name: bf.name,
            description: bf.description,
          }));
          setBenefits(benefitsData);
        }
      } else {
        // Fallback to old endpoint
        const fallbackResponse = await fetch('/api/admin/benefits', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.success) {
            setBenefits(fallbackData.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch benefits:', error);
    } finally {
      setLoadingBenefits(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addOption = () => {
    setOptions([
      ...options,
      { 
        key: '', 
        textEn: '', 
        textHi: '', 
        textHiEn: '', 
        icon: '', 
        order: options.length + 1,
        benefitMapping: {},
        categoryWeight: 1.0,
        triggersSubQuestion: false,
        subQuestionId: null,
        nextQuestionIds: [],
      },
    ]);
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
      // Remove from expanded mappings if exists
      const newExpanded = new Set(expandedBenefitMappings);
      newExpanded.delete(index);
      setExpandedBenefitMappings(newExpanded);
    }
  };

  const updateOption = (index: number, field: string, value: any) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    // If triggersSubQuestion is turned off, clear subQuestionId
    if (field === 'triggersSubQuestion' && !value) {
      updated[index].subQuestionId = null;
    }
    setOptions(updated);
  };

  const updateAnswerBenefit = (answerIndex: number, benefitCode: string, value: number) => {
    const updated = [...options];
    updated[answerIndex].benefitMapping = {
      ...updated[answerIndex].benefitMapping,
      [benefitCode]: Math.max(0, Math.min(3, value)), // Clamp between 0-3
    };
    setOptions(updated);
  };

  const toggleBenefitMapping = (index: number) => {
    const newExpanded = new Set(expandedBenefitMappings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedBenefitMappings(newExpanded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    // Question key is optional - backend will auto-generate if not provided
    if (!formData.textEn || !formData.textEn.trim()) {
      alert('Question text (English) is required');
      return;
    }
    
    if (!options || options.length === 0) {
      alert('At least one answer option is required');
      return;
    }
    
    // Validate options
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      // Option key is optional - backend will auto-generate if not provided
      if (!opt.textEn || !opt.textEn.trim()) {
        alert(`Option ${i + 1}: Text (English) is required`);
        return;
      }
    }
    
    // Ensure all benefits are included in mapping (default to 0 if not set)
    const optionsWithCompleteMapping = options.map((option) => {
      const completeMapping: Record<string, number> = {};
      benefits.forEach((benefit) => {
        completeMapping[benefit.code] = option.benefitMapping[benefit.code] || 0;
      });
      return {
        ...option,
        benefitMapping: completeMapping,
      };
    });
    
    console.log('[QuestionForm] Submitting data:', {
      ...formData,
      options: optionsWithCompleteMapping,
    });
    
    await onSubmit({ ...formData, options: optionsWithCompleteMapping });
  };

  const categoryOptions = [
    { value: 'EYEGLASSES', label: 'Eyeglasses' },
    { value: 'SUNGLASSES', label: 'Sunglasses' },
    { value: 'CONTACT_LENSES', label: 'Contact Lenses' },
    { value: 'ACCESSORIES', label: 'Accessories' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Question Key (Optional)"
            placeholder="Auto-generated if empty"
            value={formData.key}
            onChange={(e) => handleChange('key', e.target.value)}
          />
          
          <Input
            label="Order"
            type="number"
            value={formData.order}
            onChange={(e) => handleChange('order', parseInt(e.target.value) || 0)}
            required
            hint="Sort order for questions"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Display Order"
            type="number"
            value={formData.displayOrder}
            onChange={(e) => handleChange('displayOrder', parseInt(e.target.value) || formData.order)}
            hint="Display order (defaults to Order if not set)"
          />
          
          <Input
            label="Code (Optional)"
            placeholder="e.g., Q01"
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value)}
            hint="Optional code for reference"
          />
          
          <Input
            label="Question Category (Optional)"
            placeholder="e.g., lifestyle"
            value={formData.questionCategory}
            onChange={(e) => handleChange('questionCategory', e.target.value)}
            hint="Optional category grouping"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Select
            label="Question Type (Optional)"
            value={formData.questionType || ''}
            onChange={(e) => handleChange('questionType', e.target.value || '')}
            options={[
              { value: '', label: '-- Auto (based on allowMultiple) --' },
              { value: 'SINGLE_SELECT', label: 'Single Select' },
              { value: 'MULTI_SELECT', label: 'Multi Select' },
              { value: 'TEXT', label: 'Text Input' },
              { value: 'NUMBER', label: 'Number Input' },
            ]}
          />
        </div>

        <Select
          label="Category"
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value as ProductCategory)}
          options={categoryOptions}
          required
        />
      </div>

      {/* Question Text */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Question Text</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoTranslateQuestion}
            disabled={!formData.textEn || formData.textEn.trim().length === 0 || translatingQuestion}
            className="flex items-center gap-2"
          >
            <Languages size={16} />
            {translatingQuestion ? 'Translating...' : 'Auto-Translate'}
          </Button>
        </div>
        
        <Input
          label="English *"
          placeholder="How many hours do you spend on screens daily?"
          value={formData.textEn}
          onChange={(e) => handleChange('textEn', e.target.value)}
          required
        />
        
        <Input
          label="Hindi (Auto-generated)"
          placeholder="आप प्रतिदिन कितने घंटे स्क्रीन पर बिताते हैं?"
          value={formData.textHi}
          onChange={(e) => handleChange('textHi', e.target.value)}
        />
        
        <Input
          label="Hinglish (Auto-generated)"
          placeholder="Aap daily kitne ghante screen par bitaate hain?"
          value={formData.textHiEn}
          onChange={(e) => handleChange('textHiEn', e.target.value)}
        />
      </div>

      {/* Answer Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Answer Options</h3>
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus size={16} className="mr-1" />
            Add Option
          </Button>
        </div>

        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-start gap-3">
                <div className="text-slate-400 mt-2">
                  <GripVertical size={20} />
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Option Key (Optional)"
                      placeholder="Auto-generated if empty"
                      value={option.key || ''}
                      onChange={(e) => updateOption(index, 'key', e.target.value)}
                    />
                    <Input
                      label="Icon/Emoji (Optional)"
                      placeholder="e.g., 📱 or icon name"
                      value={option.icon}
                      onChange={(e) => updateOption(index, 'icon', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        label="English Text *"
                        placeholder="0-2 hours"
                        value={option.textEn}
                        onChange={(e) => updateOption(index, 'textEn', e.target.value)}
                        required
                      />
                    </div>
                    <div className="pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoTranslateOption(index)}
                        disabled={!option.textEn || option.textEn.trim().length === 0 || translatingOptions.has(index)}
                        className="flex items-center gap-1"
                        title="Auto-translate to Hindi and Hinglish"
                      >
                        <Languages size={14} />
                        {translatingOptions.has(index) ? 'Translating...' : 'Translate'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Hindi (Auto-generated)"
                      placeholder="0-2 घंटे"
                      value={option.textHi}
                      onChange={(e) => updateOption(index, 'textHi', e.target.value)}
                    />
                    <Input
                      label="Hinglish (Auto-generated)"
                      placeholder="0-2 ghante"
                      value={option.textHiEn}
                      onChange={(e) => updateOption(index, 'textHiEn', e.target.value)}
                    />
                  </div>

                  {/* Benefit Mapping Accordion */}
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <button
                      type="button"
                      onClick={() => toggleBenefitMapping(index)}
                      className="flex items-center justify-between w-full text-left text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      <span>Benefit Mapping</span>
                      {expandedBenefitMappings.has(index) ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>

                    {expandedBenefitMappings.has(index) && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        {loadingBenefits ? (
                          <p className="text-sm text-slate-500">Loading benefits...</p>
                        ) : benefits.length === 0 ? (
                          <p className="text-sm text-slate-500">No benefits available. Create benefits first.</p>
                        ) : (
                          <div className="space-y-4">
                            {/* Category Weight (applies to all benefits for this answer) */}
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <label className="block text-xs font-semibold text-blue-900 mb-1">
                                Category Weight (Multiplier for all benefits)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0.5"
                                max="3"
                                value={option.categoryWeight || 1.0}
                                onChange={(e) => {
                                  const updated = [...options];
                                  updated[index] = {
                                    ...updated[index],
                                    categoryWeight: parseFloat(e.target.value) || 1.0,
                                  };
                                  setOptions(updated);
                                }}
                                className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="1.0"
                              />
                              <p className="text-xs text-blue-700 mt-1">
                                Screen-heavy answers should have higher weight (e.g., 1.5) to amplify screen-related benefits
                              </p>
                            </div>
                            
                            {/* Benefit Points */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-slate-700">
                                  Benefit Points (0-3 scale)
                                </h4>
                                <span className="text-xs text-slate-500">
                                  {benefits.length} benefits available
                                </span>
                              </div>
                              
                              {/* Scrollable grid for benefits */}
                              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {benefits.map((benefit) => {
                                    const currentValue = option.benefitMapping[benefit.code] || 0;
                                    const hasValue = currentValue > 0;
                                    
                                    return (
                                      <div 
                                        key={benefit.code} 
                                        className={`space-y-1.5 p-2 rounded-lg border transition-colors ${
                                          hasValue 
                                            ? 'bg-blue-50 border-blue-300' 
                                            : 'bg-white border-slate-200'
                                        }`}
                                      >
                                        <label className="block text-xs font-semibold text-slate-700">
                                          <span className="font-mono text-blue-600">{benefit.code}</span>
                                          <span className="ml-1 text-slate-600">— {benefit.name}</span>
                                        </label>
                                        {benefit.description && (
                                          <p className="text-xs text-slate-500 mb-1 line-clamp-1">
                                            {benefit.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="3"
                                            value={currentValue}
                                            onChange={(e) =>
                                              updateAnswerBenefit(
                                                index,
                                                benefit.code,
                                                parseFloat(e.target.value) || 0
                                              )
                                            }
                                            className={`flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                              hasValue 
                                                ? 'border-blue-400 bg-white' 
                                                : 'border-slate-300 bg-white'
                                            }`}
                                            placeholder="0"
                                          />
                                          {hasValue && (
                                            <span className="text-xs font-medium text-blue-600 min-w-[2rem] text-right">
                                              {currentValue}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              {benefits.length === 0 && (
                                <div className="text-center py-4 text-sm text-slate-500">
                                  No benefits found. Please create benefits in the Benefits Management page first.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub-Question Toggle and Dropdown */}
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={option.triggersSubQuestion || false}
                          onChange={(e) => updateOption(index, 'triggersSubQuestion', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Triggers Sub-question?</span>
                      </label>
                    </div>

                    {option.triggersSubQuestion && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Select follow-up question
                        </label>
                        <Select
                          value={option.subQuestionId || ''}
                          onChange={(e) => {
                            const subQId = e.target.value || null;
                            updateOption(index, 'subQuestionId', subQId);
                            // Also update nextQuestionIds if it's empty
                            if (subQId && (!option.nextQuestionIds || option.nextQuestionIds.length === 0)) {
                              updateOption(index, 'nextQuestionIds', [subQId]);
                            }
                          }}
                          options={[
                            { value: '', label: '-- Select Single Question (Legacy) --' },
                            ...allQuestions
                              .filter((q) => q.id !== question?.id) // Prevent self-link
                              .sort((a, b) => (a.displayOrder || a.order || 0) - (b.displayOrder || b.order || 0))
                              .map((q) => ({
                                value: q.id,
                                label: `${q.textEn || q.text || q.key} (Order: ${q.displayOrder || q.order || 0})`,
                              })),
                          ]}
                        />
                        {loadingQuestions && (
                          <p className="text-xs text-slate-500 mt-1">Loading questions...</p>
                        )}
                        {/* Multiple sub-questions (new feature) */}
                        <div className="mt-3">
                          <label className="block text-xs text-slate-600 mb-1">
                            Or select multiple questions (unlimited nesting):
                          </label>
                          <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                            {allQuestions
                              .filter((q) => q.id !== question?.id)
                              .sort((a, b) => (a.displayOrder || a.order || 0) - (b.displayOrder || b.order || 0))
                              .map((q) => {
                                const isSelected = (option.nextQuestionIds || []).includes(q.id);
                                return (
                                  <label
                                    key={q.id}
                                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const currentIds = option.nextQuestionIds || [];
                                        const newIds = e.target.checked
                                          ? [...currentIds, q.id]
                                          : currentIds.filter((id) => id !== q.id);
                                        updateOption(index, 'nextQuestionIds', newIds);
                                        // Update legacy subQuestionId if only one selected
                                        if (newIds.length === 1) {
                                          updateOption(index, 'subQuestionId', newIds[0]);
                                        } else if (newIds.length === 0) {
                                          updateOption(index, 'subQuestionId', null);
                                        }
                                      }}
                                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">
                                      {q.textEn || q.text || q.key} (Order: {q.displayOrder || q.order || 0})
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                          {(option.nextQuestionIds || []).length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              {(option.nextQuestionIds || []).length} question(s) selected
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-red-600 hover:text-red-700 mt-2"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Settings</h3>
        
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isRequired}
              onChange={(e) => handleChange('isRequired', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Required Question</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allowMultiple}
              onChange={(e) => handleChange('allowMultiple', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Allow Multiple Answers</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <Button type="submit" loading={loading} fullWidth>
          {question ? 'Update Question' : 'Create Question'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} fullWidth>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default QuestionForm;
