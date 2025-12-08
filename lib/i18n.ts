/**
 * i18n System - Simple translation dictionary
 * Supports English, Hindi, and Hinglish
 */

type Language = 'en' | 'hi' | 'hinglish';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'app.name': 'LensTrack',
    'app.tagline': 'Find Your Perfect Eyewear',
    
    // Steps
    'step.prescription': 'Prescription',
    'step.frame': 'Frame Entry',
    'step.questionnaire': 'Questionnaire',
    'step.recommendations': 'Recommendations',
    'step.offer': 'Offer & Quote',
    
    // Prescription
    'rx.title': 'Your Eye Power',
    'rx.subtitle': 'Enter your prescription details',
    'rx.rightEye': 'Right Eye (OD)',
    'rx.leftEye': 'Left Eye (OS)',
    'rx.sph': 'SPH',
    'rx.cyl': 'CYL',
    'rx.axis': 'AXIS',
    'rx.add': 'ADD',
    'rx.pd': 'PD',
    'rx.next': 'Next: Frame Details',
    'rx.skip': 'Skip',
    
    // Frame
    'frame.title': 'Your Frame',
    'frame.brand': 'Frame Brand',
    'frame.subCategory': 'Sub-Category',
    'frame.mrp': 'MRP',
    'frame.type': 'Frame Type',
    'frame.material': 'Material',
    'frame.next': 'Next: Your Lifestyle',
    
    // Questionnaire
    'questions.title': 'Your Lifestyle',
    'questions.subtitle': 'Help us understand your needs',
    'questions.next': 'Next',
    'questions.back': 'Back',
    'questions.skip': 'Skip',
    
    // Recommendations
    'recommend.title': 'Best Lenses for You',
    'recommend.subtitle': 'We analyzed your power, frame and lifestyle',
    'recommend.bestMatch': 'Best Match',
    'recommend.recommendedIndex': 'Recommended Index',
    'recommend.premium': 'Premium Upgrade',
    'recommend.budget': 'Budget Option',
    'recommend.viewAll': 'View All Lens Options',
    'recommend.select': 'Select This Lens',
    'recommend.match': 'Match',
    'recommend.priceFrom': 'Lens Price from',
    
    // Offer
    'offer.title': 'Your Final Price',
    'offer.calculate': 'Calculate Offers',
    'offer.finalPayable': 'Final Payable',
    'offer.proceed': 'Proceed to Checkout',
    'offer.changeLens': 'Change Lens',
    
    // Checkout
    'checkout.title': 'Checkout',
    'checkout.customerName': 'Name (Optional)',
    'checkout.customerPhone': 'Phone (Optional)',
    'checkout.staffOptional': 'Staff Assisted (Optional)',
    'checkout.staffRequired': 'Select Staff (Required)',
    'checkout.confirm': 'Confirm Order',
    'checkout.create': 'Create Order',
    
    // Order Success
    'order.success': 'Order Created Successfully!',
    'order.id': 'Order ID',
    'order.nextSteps': 'Our staff will now print and process your order.',
    'order.newCustomer': 'New Customer',
    
    // Common actions
    'action.back': 'Back',
    'action.next': 'Next',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.select': 'Select',
    'action.close': 'Close',
  },
  
  hi: {
    // Common
    'app.name': 'लेंसट्रैक',
    'app.tagline': 'अपना सही चश्मा खोजें',
    
    // Steps
    'step.prescription': 'नुस्खा',
    'step.frame': 'फ्रेम',
    'step.questionnaire': 'सवाल',
    'step.recommendations': 'सुझाव',
    'step.offer': 'ऑफर',
    
    // Prescription
    'rx.title': 'आपकी आंख की पावर',
    'rx.subtitle': 'अपना नुस्खा दर्ज करें',
    'rx.rightEye': 'दाहिनी आंख (OD)',
    'rx.leftEye': 'बाईं आंख (OS)',
    'rx.sph': 'SPH',
    'rx.cyl': 'CYL',
    'rx.axis': 'AXIS',
    'rx.add': 'ADD',
    'rx.pd': 'PD',
    'rx.next': 'अगला: फ्रेम विवरण',
    'rx.skip': 'छोड़ें',
    
    // Frame
    'frame.title': 'आपका फ्रेम',
    'frame.brand': 'फ्रेम ब्रांड',
    'frame.subCategory': 'उप-श्रेणी',
    'frame.mrp': 'MRP',
    'frame.type': 'फ्रेम प्रकार',
    'frame.material': 'सामग्री',
    'frame.next': 'अगला: आपकी जीवनशैली',
    
    // Questionnaire
    'questions.title': 'आपकी जीवनशैली',
    'questions.subtitle': 'हमें आपकी जरूरतों को समझने में मदद करें',
    'questions.next': 'अगला',
    'questions.back': 'पीछे',
    'questions.skip': 'छोड़ें',
    
    // Recommendations
    'recommend.title': 'आपके लिए सर्वश्रेष्ठ लेंस',
    'recommend.subtitle': 'हमने आपकी पावर, फ्रेम और जीवनशैली का विश्लेषण किया',
    'recommend.bestMatch': 'सबसे बेहतर',
    'recommend.recommendedIndex': 'सुझावित इंडेक्स',
    'recommend.premium': 'प्रीमियम अपग्रेड',
    'recommend.budget': 'बजट विकल्प',
    'recommend.viewAll': 'सभी लेंस विकल्प देखें',
    'recommend.select': 'इस लेंस को चुनें',
    'recommend.match': 'मैच',
    'recommend.priceFrom': 'लेंस कीमत से',
    
    // Offer
    'offer.title': 'आपकी अंतिम कीमत',
    'offer.calculate': 'ऑफर गणना करें',
    'offer.finalPayable': 'अंतिम देय',
    'offer.proceed': 'चेकआउट पर जाएं',
    'offer.changeLens': 'लेंस बदलें',
    
    // Checkout
    'checkout.title': 'चेकआउट',
    'checkout.customerName': 'नाम (वैकल्पिक)',
    'checkout.customerPhone': 'फोन (वैकल्पिक)',
    'checkout.staffOptional': 'स्टाफ सहायता (वैकल्पिक)',
    'checkout.staffRequired': 'स्टाफ चुनें (आवश्यक)',
    'checkout.confirm': 'ऑर्डर पुष्टि करें',
    'checkout.create': 'ऑर्डर बनाएं',
    
    // Order Success
    'order.success': 'ऑर्डर सफलतापूर्वक बनाया गया!',
    'order.id': 'ऑर्डर ID',
    'order.nextSteps': 'हमारा स्टाफ अब आपका ऑर्डर प्रिंट और प्रोसेस करेगा।',
    'order.newCustomer': 'नया ग्राहक',
    
    // Common actions
    'action.back': 'पीछे',
    'action.next': 'अगला',
    'action.cancel': 'रद्द करें',
    'action.confirm': 'पुष्टि करें',
    'action.select': 'चुनें',
    'action.close': 'बंद करें',
  },
  
  hinglish: {
    // Common
    'app.name': 'LensTrack',
    'app.tagline': 'Apna Perfect Eyewear Dhoondho',
    
    // Steps
    'step.prescription': 'Prescription',
    'step.frame': 'Frame Entry',
    'step.questionnaire': 'Questionnaire',
    'step.recommendations': 'Recommendations',
    'step.offer': 'Offer & Quote',
    
    // Prescription
    'rx.title': 'Aapki Eye Power',
    'rx.subtitle': 'Apna prescription details enter karo',
    'rx.rightEye': 'Right Eye (OD)',
    'rx.leftEye': 'Left Eye (OS)',
    'rx.sph': 'SPH',
    'rx.cyl': 'CYL',
    'rx.axis': 'AXIS',
    'rx.add': 'ADD',
    'rx.pd': 'PD',
    'rx.next': 'Next: Frame Details',
    'rx.skip': 'Skip',
    
    // Frame
    'frame.title': 'Aapka Frame',
    'frame.brand': 'Frame Brand',
    'frame.subCategory': 'Sub-Category',
    'frame.mrp': 'MRP',
    'frame.type': 'Frame Type',
    'frame.material': 'Material',
    'frame.next': 'Next: Aapki Lifestyle',
    
    // Questionnaire
    'questions.title': 'Aapki Lifestyle',
    'questions.subtitle': 'Humko aapki needs samajhne mein help karo',
    'questions.next': 'Next',
    'questions.back': 'Back',
    'questions.skip': 'Skip',
    
    // Recommendations
    'recommend.title': 'Best Lenses Aapke Liye',
    'recommend.subtitle': 'Humne aapki power, frame aur lifestyle analyze ki',
    'recommend.bestMatch': 'Best Match (Sabse Sahi)',
    'recommend.recommendedIndex': 'Recommended Index',
    'recommend.premium': 'Premium Upgrade',
    'recommend.budget': 'Budget Option',
    'recommend.viewAll': 'Saare Lens Options Dekho',
    'recommend.select': 'Is Lens Ko Chuno',
    'recommend.match': 'Match',
    'recommend.priceFrom': 'Lens Price Se',
    
    // Offer
    'offer.title': 'Aapki Final Price',
    'offer.calculate': 'Offers Calculate Karo',
    'offer.finalPayable': 'Final Payable',
    'offer.proceed': 'Checkout Par Jao',
    'offer.changeLens': 'Lens Badlo',
    
    // Checkout
    'checkout.title': 'Checkout',
    'checkout.customerName': 'Name (Optional)',
    'checkout.customerPhone': 'Phone (Optional)',
    'checkout.staffOptional': 'Staff Assisted (Optional)',
    'checkout.staffRequired': 'Staff Chuno (Required)',
    'checkout.confirm': 'Order Confirm Karo',
    'checkout.create': 'Order Banao',
    
    // Order Success
    'order.success': 'Order Successfully Bana Diya!',
    'order.id': 'Order ID',
    'order.nextSteps': 'Humaara staff ab aapka order print aur process karega.',
    'order.newCustomer': 'Naya Customer',
    
    // Common actions
    'action.back': 'Back',
    'action.next': 'Next',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.select': 'Select',
    'action.close': 'Close',
  },
};

/**
 * Translation function
 */
export function t(key: string, lang: Language = 'en'): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}

/**
 * Get translation for current language from store
 */
export function useTranslation() {
  // This will be used with useSessionStore hook
  return (key: string) => {
    if (typeof window === 'undefined') return translations.en[key] || key;
    
    const lang = localStorage.getItem('lenstrack-session-language') || 'en';
    return t(key, lang as Language);
  };
}

