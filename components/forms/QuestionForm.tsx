'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
type ProductCategory = 'EYEGLASSES' | 'SUNGLASSES' | 'CONTACT_LENSES' | 'ACCESSORIES';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';

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
  triggersSubQuestion?: boolean; // If true, this answer triggers a sub-question
  subQuestionId?: string | null; // ID of the sub-question to show after this answer
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
    isRequired: question?.isRequired ?? true,
    allowMultiple: question?.allowMultiple ?? false,
    isActive: question?.isActive ?? true,
    parentAnswerId: question?.parentAnswerId || null, // For interconnected questions
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
        triggersSubQuestion: opt.triggersSubQuestion || false,
        subQuestionId: opt.subQuestionId || null,
      }));
    }
    return [
      { key: '', textEn: '', textHi: '', textHiEn: '', icon: '', order: 1, benefitMapping: {}, triggersSubQuestion: false, subQuestionId: null },
    ];
  });

  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [expandedBenefitMappings, setExpandedBenefitMappings] = useState<Set<number>>(new Set());
  const [allQuestions, setAllQuestions] = useState<any[]>([]); // All questions for sub-question dropdown
  const [loadingQuestions, setLoadingQuestions] = useState(false);

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
      const response = await fetch('/api/admin/benefits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBenefits(data.data || []);
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
        triggersSubQuestion: false,
        subQuestionId: null,
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
    if (!formData.key || !formData.key.trim()) {
      alert('Question key is required');
      return;
    }
    
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
      if (!opt.key || !opt.key.trim()) {
        alert(`Option ${i + 1}: Key is required`);
        return;
      }
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
            label="Question Key"
            placeholder="e.g., screen_time"
            value={formData.key}
            onChange={(e) => handleChange('key', e.target.value)}
            required
            hint="Unique identifier (use lowercase with underscores)"
          />
          
          <Input
            label="Display Order"
            type="number"
            value={formData.order}
            onChange={(e) => handleChange('order', parseInt(e.target.value))}
            required
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
        <h3 className="text-lg font-semibold text-slate-900">Question Text</h3>
        
        <Input
          label="English"
          placeholder="How many hours do you spend on screens daily?"
          value={formData.textEn}
          onChange={(e) => handleChange('textEn', e.target.value)}
          required
        />
        
        <Input
          label="Hindi (Optional)"
          placeholder="आप प्रतिदिन कितने घंटे स्क्रीन पर बिताते हैं?"
          value={formData.textHi}
          onChange={(e) => handleChange('textHi', e.target.value)}
        />
        
        <Input
          label="Hinglish (Optional)"
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
                      label="Option Key"
                      placeholder="e.g., 0-2hrs"
                      value={option.key}
                      onChange={(e) => updateOption(index, 'key', e.target.value)}
                      required
                    />
                    <Input
                      label="Icon/Emoji"
                      placeholder="📱"
                      value={option.icon}
                      onChange={(e) => updateOption(index, 'icon', e.target.value)}
                    />
                  </div>
                  
                  <Input
                    label="English Text"
                    placeholder="0-2 hours"
                    value={option.textEn}
                    onChange={(e) => updateOption(index, 'textEn', e.target.value)}
                    required
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Hindi (Optional)"
                      placeholder="0-2 घंटे"
                      value={option.textHi}
                      onChange={(e) => updateOption(index, 'textHi', e.target.value)}
                    />
                    <Input
                      label="Hinglish (Optional)"
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
                          <div className="grid grid-cols-3 gap-4">
                            {benefits.map((benefit) => (
                              <div key={benefit.code} className="space-y-1">
                                <label className="block text-xs font-medium text-slate-600">
                                  {benefit.code} — {benefit.name}
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="3"
                                  value={option.benefitMapping[benefit.code] || 0}
                                  onChange={(e) =>
                                    updateAnswerBenefit(
                                      index,
                                      benefit.code,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                            ))}
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
                          onChange={(e) => updateOption(index, 'subQuestionId', e.target.value || null)}
                          options={[
                            { value: '', label: '-- Select Question --' },
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
