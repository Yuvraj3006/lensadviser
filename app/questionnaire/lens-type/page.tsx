'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Glasses, Sun, Contact, Package, ArrowRight, ArrowLeft, Eye, ShoppingBag } from 'lucide-react';

// Client-safe ProductCategory
const ProductCategory = {
  EYEGLASSES: 'EYEGLASSES',
  ONLY_LENS: 'ONLY_LENS', // New: Only Lens flow (no frame)
  SUNGLASSES: 'SUNGLASSES',
  CONTACT_LENSES: 'CONTACT_LENSES',
  ACCESSORIES: 'ACCESSORIES',
} as const;

type ProductCategory = typeof ProductCategory[keyof typeof ProductCategory];

export default function LensTypePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');

  useEffect(() => {
    // Load saved selection
    const saved = localStorage.getItem('lenstrack_lens_type');
    if (saved) {
      setSelectedCategory(saved as ProductCategory);
    }
    
    // Load language preference
    const savedLanguage = localStorage.getItem('lenstrack_language') || 'en';
    setLanguage(savedLanguage as 'en' | 'hi' | 'hinglish');
  }, []);

  // Helper function to get text based on language
  const getText = (textEn: string, textHi?: string, textHiEn?: string): string => {
    if (language === 'hi' && textHi) return textHi;
    if (language === 'hinglish' && textHiEn) return textHiEn;
    return textEn;
  };

  const categories = [
    {
      value: ProductCategory.EYEGLASSES,
      label: {
        en: 'Eyeglasses',
        hi: 'चश्मा',
        hinglish: 'Eyeglasses'
      },
      icon: <Glasses className="w-8 h-8 sm:w-12 sm:h-12 drop-shadow-lg" />,
      description: {
        en: 'Frame + Lens',
        hi: 'फ्रेम + लेंस',
        hinglish: 'Frame + Lens'
      },
      color: 'from-blue-500 to-blue-600',
    },
    {
      value: ProductCategory.ONLY_LENS,
      label: {
        en: 'Only Lens',
        hi: 'केवल लेंस',
        hinglish: 'Only Lens'
      },
      icon: <Eye className="w-8 h-8 sm:w-12 sm:h-12 drop-shadow-lg" />,
      description: {
        en: 'Lens replacement only',
        hi: 'केवल लेंस बदलना',
        hinglish: 'Lens replacement only'
      },
      color: 'from-green-500 to-green-600',
    },
    {
      value: ProductCategory.SUNGLASSES,
      label: {
        en: 'Power Sunglasses',
        hi: 'पावर सनग्लास',
        hinglish: 'Power Sunglasses'
      },
      icon: (
        <svg 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 sm:w-12 sm:h-12 drop-shadow-lg"
        >
          {/* Left lens */}
          <ellipse cx="14" cy="24" rx="8" ry="7" fill="black" stroke="currentColor" strokeWidth="2" />
          {/* Right lens */}
          <ellipse cx="34" cy="24" rx="8" ry="7" fill="black" stroke="currentColor" strokeWidth="2" />
          {/* Bridge */}
          <line x1="22" y1="24" x2="26" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Left temple */}
          <line x1="6" y1="24" x2="6" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="6" y1="20" x2="2" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Right temple */}
          <line x1="42" y1="24" x2="42" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="42" y1="20" x2="46" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      description: {
        en: 'Tinted & mirror lenses',
        hi: 'टिंटेड और मिरर लेंस',
        hinglish: 'Tinted & mirror lenses'
      },
      color: 'from-amber-500 to-amber-600',
    },
    {
      value: ProductCategory.CONTACT_LENSES,
      label: {
        en: 'Contact Lenses',
        hi: 'कॉन्टैक्ट लेंस',
        hinglish: 'Contact Lenses'
      },
      icon: (
        <svg 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 sm:w-12 sm:h-12 drop-shadow-lg"
        >
          {/* First contact lens (left, flat) */}
          <ellipse 
            cx="18" 
            cy="26" 
            rx="8" 
            ry="6" 
            fill="#E0F2FE" 
            stroke="black" 
            strokeWidth="2.5"
          />
          <ellipse 
            cx="18" 
            cy="26" 
            rx="6" 
            ry="4.5" 
            fill="#BAE6FD" 
          />
          
          {/* Second contact lens (right, tilted/overlapping) */}
          <ellipse 
            cx="30" 
            cy="22" 
            rx="8" 
            ry="6" 
            fill="#E0F2FE" 
            stroke="black" 
            strokeWidth="2.5"
            transform="rotate(-15 30 22)"
          />
          <ellipse 
            cx="30" 
            cy="22" 
            rx="6" 
            ry="4.5" 
            fill="#BAE6FD"
            transform="rotate(-15 30 22)"
          />
        </svg>
      ),
      description: {
        en: 'Daily, monthly, yearly',
        hi: 'दैनिक, मासिक, वार्षिक',
        hinglish: 'Daily, monthly, yearly'
      },
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      value: ProductCategory.ACCESSORIES,
      label: {
        en: 'Accessories',
        hi: 'सामान',
        hinglish: 'Accessories'
      },
      icon: (
        <svg 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 sm:w-12 sm:h-12 drop-shadow-lg"
        >
          {/* Case/Box */}
          <rect x="12" y="16" width="24" height="18" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2" />
          <rect x="12" y="16" width="24" height="6" rx="2" fill="currentColor" opacity="0.2" />
          
          {/* Solution bottle */}
          <rect x="18" y="26" width="4" height="6" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="20" y1="26" x2="20" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Lens case (circular) */}
          <circle cx="28" cy="29" r="3" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="28" cy="29" r="1.5" fill="currentColor" opacity="0.5" />
          
          {/* Cleaning cloth */}
          <rect x="16" y="32" width="8" height="2" rx="1" fill="currentColor" opacity="0.4" />
        </svg>
      ),
      description: {
        en: 'Cases, solutions, more',
        hi: 'केस, सॉल्यूशन, और अधिक',
        hinglish: 'Cases, solutions, more'
      },
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const handleNext = async () => {
    if (!selectedCategory) {
      const errorMsg = getText('Please select a lens type', 'कृपया लेंस का प्रकार चुनें', 'Please select a lens type');
      showToast('error', errorMsg);
      return;
    }

    // Save selection
    localStorage.setItem('lenstrack_lens_type', selectedCategory);
    
    // If ACCESSORIES is selected, create session and go directly to accessories page
    if (selectedCategory === ProductCategory.ACCESSORIES) {
      try {
        // Get store code from localStorage or use default
        const storeCode = localStorage.getItem('lenstrack_store_code') || 'MAIN-001';
        
        // Create session for accessories
        const response = await fetch('/api/public/questionnaire/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storeCode: storeCode,
            category: 'ACCESSORIES',
            customerName: 'Guest',
            customerPhone: '0000000000',
          }),
        });

        const data = await response.json();
        
        if (data.success && data.data?.sessionId) {
          // Navigate directly to accessories page
          router.push(`/questionnaire/${data.data.sessionId}/accessories`);
        } else {
          const errorMsg = getText(
            data.error?.message || 'Failed to start accessories flow',
            data.error?.message || 'सामान फ्लो शुरू करने में विफल',
            data.error?.message || 'Failed to start accessories flow'
          );
          showToast('error', errorMsg);
        }
      } catch (error: any) {
        console.error('Failed to create session:', error);
        const errorMsg = getText(
          'Failed to start accessories flow',
          'सामान फ्लो शुरू करने में विफल',
          'Failed to start accessories flow'
        );
        showToast('error', errorMsg);
      }
      return;
    }
    
    // For other categories, navigate to prescription
    router.push('/questionnaire/prescription');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {getText('What are you looking for?', 'आप क्या ढूंढ रहे हैं?', 'What are you looking for?')}
            </h1>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {categories.slice(0, 4).map((category) => (
              <button
                key={category.value}
                onClick={async () => {
                  setSelectedCategory(category.value);
                  // Save selection immediately
                  localStorage.setItem('lenstrack_lens_type', category.value);
                  
                  // For other categories, navigate to prescription
                  router.push('/questionnaire/prescription');
                }}
                className={`p-4 sm:p-6 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center text-center ${
                  selectedCategory === category.value
                    ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/10'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center text-white mb-3 sm:mb-4`}>
                  {category.icon}
                </div>
                <h3 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2 leading-tight">
                  {getText(category.label.en, category.label.hi, category.label.hinglish)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-tight">
                  {getText(category.description.en, category.description.hi, category.description.hinglish)}
                </p>
              </button>
            ))}
            {/* Fifth box (Accessories) - centered */}
            {categories[4] && (
              <div className="col-span-2 md:col-span-1 md:col-start-2 flex justify-center">
                <button
                  onClick={async () => {
                    setSelectedCategory(categories[4].value);
                    // Save selection immediately
                    localStorage.setItem('lenstrack_lens_type', categories[4].value);
                  
                  // If ACCESSORIES is selected, create session and go directly to accessories page
                    try {
                      // Get store code from localStorage or use default
                      const storeCode = localStorage.getItem('lenstrack_store_code') || 'MAIN-001';
                      
                      // Create session for accessories
                      const response = await fetch('/api/public/questionnaire/sessions', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          storeCode: storeCode,
                          category: 'ACCESSORIES',
                          customerName: 'Guest',
                          customerPhone: '0000000000',
                        }),
                      });

                      const data = await response.json();
                      
                      if (data.success && data.data?.sessionId) {
                        // Navigate directly to accessories page
                        router.push(`/questionnaire/${data.data.sessionId}/accessories`);
                      } else {
                        const errorMsg = getText(
                          data.error?.message || 'Failed to start accessories flow',
                          data.error?.message || 'सामान फ्लो शुरू करने में विफल',
                          data.error?.message || 'Failed to start accessories flow'
                        );
                        showToast('error', errorMsg);
                      }
                    } catch (error: any) {
                      console.error('Failed to create session:', error);
                      const errorMsg = getText(
                        'Failed to start accessories flow',
                        'सामान फ्लो शुरू करने में विफल',
                        'Failed to start accessories flow'
                      );
                      showToast('error', errorMsg);
                    }
                }}
                  className={`p-4 sm:p-6 rounded-xl border-2 transition-all cursor-pointer w-full max-w-[280px] flex flex-col items-center text-center ${
                    selectedCategory === categories[4].value
                      ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/10'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br ${categories[4].color} flex items-center justify-center text-white mb-3 sm:mb-4`}>
                    {categories[4].icon}
                </div>
                  <h3 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2 leading-tight">
                    {getText(categories[4].label.en, categories[4].label.hi, categories[4].label.hinglish)}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-tight">
                    {getText(categories[4].description.en, categories[4].description.hi, categories[4].description.hinglish)}
                  </p>
              </button>
              </div>
            )}
          </div>

          {/* Navigation - Only Back button now */}
          <div className="flex justify-start pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/language')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              {getText('Back', 'वापस', 'Back')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

