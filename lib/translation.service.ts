/**
 * Translation Service
 * Auto-converts English text to Hindi and Hinglish using Google Translate API
 * 
 * Supports:
 * - EN → HI (Hindi translation via Google Translate)
 * - EN → Hinglish (Romanized Hindi via transliteration)
 * 
 * Uses @vitalets/google-translate-api for free Google Translate access
 */

import { translate } from '@vitalets/google-translate-api';

/**
 * Convert English to Hindi using Google Translate API
 * Falls back to rule-based translation if API fails
 */
export async function translateToHindi(englishText: string): Promise<string> {
  if (!englishText || englishText.trim().length === 0) {
    return '';
  }

  try {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await translate(englishText, { to: 'hi' });
    return result.text;
  } catch (error: any) {
    console.warn('Google Translate error (Hindi), using fallback:', error.message);
    // Fallback to rule-based translation
    return fallbackTranslateToHindi(englishText);
  }
}

/**
 * Fallback rule-based Hindi translation
 */
function fallbackTranslateToHindi(englishText: string): string {
  const text = englishText.trim().toLowerCase();
  
  // Common answer options
  const answerOptions: Record<string, string> = {
    'yes': 'हाँ',
    'no': 'नहीं',
    'sometimes': 'कभी-कभी',
    'always': 'हमेशा',
    'never': 'कभी नहीं',
    'often': 'अक्सर',
    'rarely': 'शायद ही',
    'daily': 'रोजाना',
    'weekly': 'साप्ताहिक',
    'monthly': 'मासिक',
    'yearly': 'वार्षिक',
    'all day': 'पूरे दिन',
    'few hours': 'कुछ घंटे',
    'one hour': 'एक घंटा',
    'two hours': 'दो घंटे',
    'three hours': 'तीन घंटे',
    'four hours': 'चार घंटे',
    'five hours': 'पांच घंटे',
    'six hours': 'छह घंटे',
    'more than six': 'छह से अधिक',
    'less than one': 'एक से कम',
    'indoor': 'घर के अंदर',
    'outdoor': 'बाहर',
    'both': 'दोनों',
    'none': 'कोई नहीं',
    'all': 'सभी',
    'some': 'कुछ',
    'many': 'कई',
    'few': 'कुछ',
    'budget': 'बजट',
    'premium': 'प्रीमियम',
    'standard': 'मानक',
    'basic': 'बुनियादी',
    'advanced': 'उन्नत',
    'beginner': 'शुरुआती',
    'intermediate': 'मध्यम',
    'expert': 'विशेषज्ञ',
  };

  // Check for exact match first
  if (answerOptions[text]) {
    return answerOptions[text];
  }

  // Word-by-word translation for longer phrases
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
    'type': 'प्रकार',
    'of': 'का',
    'lens': 'लेंस',
    'protection': 'सुरक्षा',
    'need': 'आवश्यकता',
    'work': 'काम',
    'computer': 'कंप्यूटर',
    'hour': 'घंटा',
    'day': 'दिन',
    'week': 'सप्ताह',
    'month': 'महीना',
    'year': 'साल',
    'more': 'अधिक',
    'less': 'कम',
    'than': 'से',
    'one': 'एक',
    'two': 'दो',
    'three': 'तीन',
    'four': 'चार',
    'five': 'पांच',
    'six': 'छह',
  };

  let hindiText = text;
  const sortedEntries = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);
  
  sortedEntries.forEach(([en, hi]) => {
    const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    hindiText = hindiText.replace(regex, hi);
  });

  // If no translation found, return original (better than empty)
  if (hindiText === text) {
    return englishText; // Return original with proper casing
  }

  return hindiText;
}

/**
 * Convert Hindi text to Roman script (Hinglish)
 * Uses improved transliteration algorithm
 */
async function hindiToRoman(hindiText: string): Promise<string> {
  if (!hindiText || hindiText.trim().length === 0) {
    return '';
  }

  // Use improved transliteration function
  return simpleTransliteration(hindiText);
}

/**
 * Improved transliteration for Hindi to Roman (Hinglish)
 * Handles Devanagari script with proper character mapping
 */
function simpleTransliteration(hindiText: string): string {
  // Comprehensive Hindi to Roman transliteration mapping
  const consonants: Record<string, string> = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'ळ': 'l',
    'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  };

  const vowels: Record<string, string> = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'ऋ': 'ri', 'ॠ': 'ree', 'ऌ': 'li', 'ॡ': 'lee',
  };

  const matras: Record<string, string> = {
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    'ृ': 'ri', 'ॄ': 'ree', 'ॢ': 'li', 'ॣ': 'lee',
  };

  const modifiers: Record<string, string> = {
    'ं': 'n', 'ः': 'h', '़': '', '्': '', // halant (virama) - no sound
    'ँ': 'n', // candrabindu (nasalization)
  };

  let result = '';
  let i = 0;

  while (i < hindiText.length) {
    const char = hindiText[i];
    const nextChar = i + 1 < hindiText.length ? hindiText[i + 1] : '';
    const nextNextChar = i + 2 < hindiText.length ? hindiText[i + 2] : '';

    // Check for halant (्) - consonant cluster
    if (nextChar === '्' && consonants[char]) {
      const consonant = consonants[char];
      result += consonant;
      i += 2; // Skip consonant and halant
      continue;
    }

    // Check for independent vowel
    if (vowels[char]) {
      result += vowels[char];
      i++;
      continue;
    }

    // Check for consonant
    if (consonants[char]) {
      let consonant = consonants[char];
      let advance = 1;
      
      // Check if next char is a matra (vowel sign)
      if (matras[nextChar]) {
        consonant += matras[nextChar];
        advance = 2;
        
        // Check if there's a modifier after the matra (e.g., हाँ = ह + ा + ँ)
        if (modifiers[nextNextChar]) {
          if (nextNextChar === 'ं' || nextNextChar === 'ँ') {
            consonant += 'n';
          } else if (nextNextChar === 'ः') {
            consonant += 'h';
          }
          advance = 3;
        }
      } else if (modifiers[nextChar]) {
        // Check for anusvara, visarga, candrabindu, etc.
        if (nextChar === 'ं' || nextChar === 'ँ') {
          consonant += 'n';
        } else if (nextChar === 'ः') {
          consonant += 'h';
        }
        advance = 2;
      } else {
        // Consonant without matra - add default 'a'
        consonant += 'a';
      }
      
      result += consonant;
      i += advance;
      continue;
    }

    // Check for matra (standalone vowel sign - shouldn't happen but handle it)
    if (matras[char]) {
      result += matras[char];
      i++;
      continue;
    }

    // Check for modifiers (standalone - shouldn't happen often)
    if (modifiers[char] && char !== '्') {
      if (char === 'ं' || char === 'ँ') {
        result += 'n';
      } else if (char === 'ः') {
        result += 'h';
      }
      i++;
      continue;
    }

    // Non-Devanagari character - keep as is
    result += char;
    i++;
  }

  // Clean up and format
  result = result
    .replace(/aa+/g, 'aa') // Fix double 'aa' to single 'aa'
    .replace(/a([aeiou])/g, 'aa$1') // Fix cases where 'a' should be 'aa' before vowels
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  // Special handling for common words
  const commonWords: Record<string, string> = {
    'han': 'haan', // हाँ
  };
  
  // Check if result matches any common word pattern
  const lowerResult = result.toLowerCase();
  if (commonWords[lowerResult]) {
    result = commonWords[lowerResult];
  }

  // Capitalize first letter
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

/**
 * Convert English to Hinglish (Romanized Hindi)
 * First translates to Hindi, then transliterates to Roman script
 */
export async function translateToHinglish(englishText: string): Promise<string> {
  if (!englishText || englishText.trim().length === 0) {
    return '';
  }

  try {
    // First translate to Hindi
    const hindiText = await translateToHindi(englishText);
    
    if (!hindiText) {
      return '';
    }

    // Then transliterate Hindi to Roman script
    return await hindiToRoman(hindiText);
  } catch (error) {
    console.error('Google Translate error (Hinglish):', error);
    return '';
  }
}

/**
 * Auto-translate question text from English to Hindi and Hinglish
 * Uses Google Translate API for accurate translations
 * Optimized to make only one API call
 */
export async function autoTranslateQuestion(englishText: string): Promise<{
  hindi: string;
  hinglish: string;
}> {
  if (!englishText || englishText.trim().length === 0) {
    return {
      hindi: '',
      hinglish: '',
    };
  }

  try {
    // Translate to Hindi (single API call)
    const hindi = await translateToHindi(englishText);
    
    // Convert Hindi to Hinglish (uses Google Translate transliteration)
    const hinglish = hindi ? await hindiToRoman(hindi) : '';

    return {
      hindi: hindi || '',
      hinglish: hinglish || '',
    };
  } catch (error) {
    console.error('Auto-translate error:', error);
    return {
      hindi: '',
      hinglish: '',
    };
  }
}

/**
 * Auto-translate answer option text
 */
export async function autoTranslateAnswer(englishText: string): Promise<{
  hindi: string;
  hinglish: string;
}> {
  return autoTranslateQuestion(englishText);
}
