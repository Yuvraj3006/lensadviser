'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';

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

  const languages = [
    {
      code: 'en' as const,
      name: 'English',
      icon: 'E',
      description: 'English'
    },
    {
      code: 'hi' as const,
      name: 'हिंदी',
      icon: 'हिं',
      description: 'Hindi'
    },
    {
      code: 'hinglish' as const,
      name: 'Hinglish',
      icon: 'EH',
      description: 'Hinglish'
    }
  ];

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        {/* WF-01: Lenstrack Logo (center) */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-blue-500/30 mx-auto mb-3 sm:mb-4">
            👓
          </div>
          <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            LensTrack
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-2xl">
          {/* WF-01: Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
            Choose Your Language
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-8">अपनी भाषा चुनें</p>

          {/* Language options in square boxes, horizontal layout */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {languages.map((lang) => (
              <div key={lang.code} className="flex flex-col items-center">
                <button
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`flex items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-lg transition-all duration-200 active:scale-95 group overflow-visible ${
                    lang.code === 'hi' || lang.code === 'hinglish' ? 'w-28 h-28 sm:w-32 sm:h-32' : 'w-24 h-24 sm:w-28 sm:h-28'
                  }`}
                >
                  <div className="group-hover:scale-110 transition-transform flex items-center justify-center w-full h-full p-2">
                    {lang.code === 'en' && (
                      <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent drop-shadow-lg leading-none">
                        E
                      </div>
                    )}
                    {lang.code === 'hi' && (
                      <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent drop-shadow-lg" style={{ lineHeight: '1.1', paddingTop: '2px' }}>
                        हिं
                      </div>
                    )}
                    {lang.code === 'hinglish' && (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg leading-none">E</span>
                        <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-orange-500 to-red-500 bg-clip-text text-transparent drop-shadow-lg" style={{ lineHeight: '1.1', paddingTop: '2px' }}>हिं</span>
                      </div>
                    )}
                  </div>
                </button>
                <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mt-3">
                  {lang.name}
                </span>
              </div>
            ))}
          </div>

          {/* WF-01: Footer */}
          <p className="text-center text-xs text-slate-600 dark:text-slate-500 mt-8">
            Powered by LensTrack Retail Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
