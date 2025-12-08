'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Glasses, Sun, Contact, Package, ArrowRight, ArrowLeft } from 'lucide-react';

// Client-safe ProductCategory
const ProductCategory = {
  EYEGLASSES: 'EYEGLASSES',
  SUNGLASSES: 'SUNGLASSES',
  CONTACT_LENSES: 'CONTACT_LENSES',
  ACCESSORIES: 'ACCESSORIES',
} as const;

type ProductCategory = typeof ProductCategory[keyof typeof ProductCategory];

export default function LensTypePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  useEffect(() => {
    // Load saved selection
    const saved = localStorage.getItem('lenstrack_lens_type');
    if (saved) {
      setSelectedCategory(saved as ProductCategory);
    }
  }, []);

  const categories = [
    {
      value: ProductCategory.EYEGLASSES,
      label: 'Eyeglasses',
      icon: <Glasses size={48} />,
      description: 'Clear prescription lenses',
      color: 'from-blue-500 to-blue-600',
    },
    {
      value: ProductCategory.SUNGLASSES,
      label: 'Power Sunglasses',
      icon: <Sun size={48} />,
      description: 'Tinted & mirror lenses',
      color: 'from-amber-500 to-amber-600',
    },
    {
      value: ProductCategory.CONTACT_LENSES,
      label: 'Contact Lenses',
      icon: <Contact size={48} />,
      description: 'Daily, monthly, yearly',
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      value: ProductCategory.ACCESSORIES,
      label: 'Accessories',
      icon: <Package size={48} />,
      description: 'Cases, solutions, more',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const handleNext = () => {
    if (!selectedCategory) {
      showToast('error', 'Please select a lens type');
      return;
    }

    // Save selection
    localStorage.setItem('lenstrack_lens_type', selectedCategory);
    
    // Navigate to prescription
    router.push('/questionnaire/prescription');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">What are you looking for?</h1>
            <p className="text-slate-400">Select the type of lens you need</p>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  selectedCategory === category.value
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center text-white mb-4 mx-auto`}>
                  {category.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{category.label}</h3>
                <p className="text-slate-400 text-sm">{category.description}</p>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/customer-details')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedCategory}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Next: Prescription
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

