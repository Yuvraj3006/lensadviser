'use client';

/**
 * Language Selector Component
 * Integrated into existing flow - shows as first step or overlay
 */

import { useState, useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import { Globe } from 'lucide-react';

export function LanguageSelector({ onSelect }: { onSelect?: () => void }) {
  const language = useSessionStore((state) => state.language);
  const setLanguage = useSessionStore((state) => state.setLanguage);
  const [showSelector, setShowSelector] = useState(!language);

  useEffect(() => {
    // Auto-show if no language selected
    if (!language) {
      setShowSelector(true);
    }
  }, [language]);

  const handleLanguageSelect = (lang: 'en' | 'hi' | 'hinglish') => {
    setLanguage(lang);
    setShowSelector(false);
    if (onSelect) {
      onSelect();
    }
  };

  if (!showSelector && language) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Globe size={16} />
        <span className="capitalize">{language}</span>
        <button
          onClick={() => setShowSelector(true)}
          className="text-blue-600 hover:text-blue-700 text-xs underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* WF-01: Lenstrack Logo (center) */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            LensTrack
          </div>
        </div>

        {/* WF-01: Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
          Choose Your Language
        </h2>
        <p className="text-slate-600 text-center mb-8">अपनी भाषा चुनें</p>

        {/* WF-01: Buttons - full width, 56px height, rounded 12px */}
        <div className="space-y-3">
          <Button
            fullWidth
            onClick={() => handleLanguageSelect('en')}
            className="h-14 text-lg rounded-xl font-semibold"
            size="lg"
          >
            English
          </Button>
          
          <Button
            fullWidth
            onClick={() => handleLanguageSelect('hi')}
            className="h-14 text-lg rounded-xl font-semibold"
            variant="outline"
            size="lg"
          >
            हिंदी (Hindi)
          </Button>
          
          <Button
            fullWidth
            onClick={() => handleLanguageSelect('hinglish')}
            className="h-14 text-lg rounded-xl font-semibold"
            variant="outline"
            size="lg"
          >
            Hinglish
          </Button>
        </div>

        {/* WF-01: Footer */}
        <p className="text-center text-xs text-slate-500 mt-8">
          Powered by LensTrack Retail Intelligence
        </p>
      </div>
    </div>
  );
}

