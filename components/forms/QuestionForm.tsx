'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
type ProductCategory = 'EYEGLASSES' | 'SUNGLASSES' | 'CONTACT_LENSES' | 'ACCESSORIES';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface AnswerOption {
  key: string;
  textEn: string;
  textHi?: string;
  textHiEn?: string;
  icon?: string;
  order: number;
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
  });

  const [options, setOptions] = useState<AnswerOption[]>(
    question?.options || [
      { key: '', textEn: '', textHi: '', textHiEn: '', icon: '', order: 1 },
    ]
  );

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addOption = () => {
    setOptions([
      ...options,
      { key: '', textEn: '', textHi: '', textHiEn: '', icon: '', order: options.length + 1 },
    ]);
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: string, value: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ ...formData, options });
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
