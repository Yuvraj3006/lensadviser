'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';

export default function LanguagePage() {
  const router = useRouter();
  const setLanguage = useSessionStore((state) => state.setLanguage);

  const handleLanguageSelect = (lang: 'en' | 'hi' | 'hinglish') => {
    // Save language to session store
    setLanguage(lang);
    
    // Also save to localStorage for persistence
    localStorage.setItem('lenstrack_language', lang);
    
    // Navigate to mode selection (lens-type) as per spec: Language → Mode Selection
    router.push('/questionnaire/lens-type');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        {/* WF-01: Lenstrack Logo (center) */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-blue-500/30 mx-auto mb-4">
            👓
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            LensTrack
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          {/* WF-01: Title */}
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Choose Your Language
          </h2>
          <p className="text-slate-400 text-center mb-8">अपनी भाषा चुनें</p>

          {/* WF-01: Buttons - full width, 56px height, rounded 12px */}
          <div className="space-y-3">
            <Button
              fullWidth
              onClick={() => handleLanguageSelect('en')}
              className="h-14 text-lg rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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
    </div>
  );
}
