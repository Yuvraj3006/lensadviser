/**
 * Translation Service
 * Auto-converts English text to Hindi and Hinglish
 * 
 * Supports:
 * - EN → HI (Hindi translation)
 * - EN → Hinglish (Romanized Hindi)
 * 
 * Note: This uses a rule-based approach. For production, consider integrating
 * Google Translate API or similar service for better accuracy.
 */

/**
 * Convert English to Hindi using transliteration rules and common translations
 * This is a rule-based approach. For production, consider using Google Translate API
 */
export function translateToHindi(englishText: string): string {
  if (!englishText || englishText.trim().length === 0) {
    return '';
  }

  // Fallback: Common word translations
  const translations: Record<string, string> = {
    'how many': 'कितने',
    'hours': 'घंटे',
    'do you': 'आप',
    'spend': 'बिताते',
    'on': 'पर',
    'screens': 'स्क्रीन',
    'daily': 'प्रतिदिन',
    'what': 'क्या',
    'is': 'है',
    'your': 'आपका',
    'age': 'उम्र',
    'do': 'करते',
    'you': 'आप',
    'wear': 'पहनते',
    'glasses': 'चश्मा',
    'day': 'दिन',
    'only': 'केवल',
    'when': 'जब',
    'needed': 'जरूरत',
    'working': 'काम',
    'computer': 'कंप्यूटर',
    'mobile': 'मोबाइल',
    'phone': 'फोन',
    'driving': 'ड्राइविंग',
    'outdoor': 'बाहर',
    'activities': 'गतिविधियां',
    'indoor': 'अंदर',
    'sports': 'खेल',
    'protection': 'सुरक्षा',
    'comfort': 'आराम',
    'style': 'स्टाइल',
    'budget': 'बजट',
    'premium': 'प्रीमियम',
    'durability': 'टिकाऊपन',
    'scratch': 'खरोंच',
    'resistant': 'प्रतिरोधी',
    'anti': 'एंटी',
    'glare': 'चकाचौंध',
    'reflection': 'प्रतिबिंब',
    'blue': 'नीला',
    'light': 'प्रकाश',
    'filter': 'फिल्टर',
    'uv': 'यूवी',
    'sun': 'सूरज',
    'water': 'पानी',
    'repellent': 'विकर्षक',
    'dust': 'धूल',
    'clear': 'स्पष्ट',
    'vision': 'दृष्टि',
    'crystal': 'क्रिस्टल',
    'photochromic': 'फोटोक्रोमिक',
    'adaptive': 'अनुकूली',
    'myopia': 'मायोपिया',
    'control': 'नियंत्रण',
    'reading': 'पढ़ना',
    'near': 'निकट',
    'distance': 'दूरी',
    'all': 'सभी',
    'color': 'रंग',
    'accuracy': 'सटीकता',
    'natural': 'प्राकृतिक',
  };

  // Simple word-by-word translation (basic approach)
  // For production, use Google Translate API or similar
  let hindiText = englishText.toLowerCase();
  
  // Replace common phrases (longer phrases first)
  const sortedEntries = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);
  sortedEntries.forEach(([en, hi]) => {
    const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    hindiText = hindiText.replace(regex, hi);
  });

  // If no translation found, return transliterated version
  if (hindiText === englishText.toLowerCase()) {
    return transliterateToHindi(englishText);
  }

  return hindiText;
}

/**
 * Convert English to Hinglish (Romanized Hindi)
 * This converts English text to a mix of Hindi words written in English script
 */
export function translateToHinglish(englishText: string): string {
  if (!englishText || englishText.trim().length === 0) {
    return '';
  }

  // Common English to Hinglish conversions
  const hinglishMap: Record<string, string> = {
    'how many': 'kitne',
    'hours': 'ghante',
    'do you': 'aap',
    'spend': 'bitaate',
    'on': 'par',
    'screens': 'screen',
    'daily': 'daily',
    'what': 'kya',
    'is': 'hai',
    'your': 'aapka',
    'age': 'umr',
    'do': 'karte',
    'you': 'aap',
    'wear': 'pehante',
    'glasses': 'chashma',
    'day': 'din',
    'only': 'sirf',
    'when': 'jab',
    'needed': 'zarurat',
    'working': 'kaam',
    'computer': 'computer',
    'mobile': 'mobile',
    'phone': 'phone',
    'driving': 'driving',
    'outdoor': 'bahar',
    'activities': 'gatividhiyan',
    'indoor': 'andar',
    'sports': 'khel',
    'protection': 'suraksha',
    'comfort': 'aram',
    'style': 'style',
    'budget': 'budget',
    'premium': 'premium',
    'durability': 'tikau',
    'scratch': 'kharoch',
    'resistant': 'pratirodhi',
    'anti': 'anti',
    'glare': 'chakachondh',
    'reflection': 'pratibimb',
    'blue': 'neela',
    'light': 'light',
    'filter': 'filter',
    'uv': 'uv',
    'sun': 'suraj',
    'water': 'paani',
    'repellent': 'vikarshak',
    'dust': 'dhool',
    'clear': 'spasht',
    'vision': 'drishti',
    'crystal': 'crystal',
    'photochromic': 'photochromic',
    'adaptive': 'anukuli',
    'myopia': 'myopia',
    'control': 'niyantran',
    'reading': 'padhna',
    'near': 'nikat',
    'distance': 'doori',
    'all': 'sab',
    'color': 'rang',
    'accuracy': 'sateekta',
    'natural': 'prakritik',
  };

  let hinglishText = englishText.toLowerCase();
  
  // Replace common phrases
  Object.entries(hinglishMap).forEach(([en, hinglish]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    hinglishText = hinglishText.replace(regex, hinglish);
  });

  // Capitalize first letter
  if (hinglishText.length > 0) {
    hinglishText = hinglishText.charAt(0).toUpperCase() + hinglishText.slice(1);
  }

  return hinglishText;
}

/**
 * Transliterate English to Hindi (basic Devanagari conversion)
 * This is a simplified transliteration - for production use proper libraries
 */
function transliterateToHindi(text: string): string {
  // Basic transliteration rules (simplified)
  const transliterationMap: Record<string, string> = {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
    'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
    'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ',
    'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ',
    't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध',
    'n': 'न', 'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ',
    'm': 'म', 'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व',
    'sh': 'श', 'shh': 'ष', 's': 'स', 'h': 'ह',
  };

  // This is a very basic implementation
  // For production, use a proper transliteration library like 'transliteration' npm package
  return text; // Return as-is for now, can be enhanced
}

/**
 * Auto-translate question text from English to Hindi and Hinglish
 */
export function autoTranslateQuestion(englishText: string): {
  hindi: string;
  hinglish: string;
} {
  return {
    hindi: translateToHindi(englishText),
    hinglish: translateToHinglish(englishText),
  };
}

/**
 * Auto-translate answer option text
 */
export function autoTranslateAnswer(englishText: string): {
  hindi: string;
  hinglish: string;
} {
  return autoTranslateQuestion(englishText);
}
