// Centralized Language Configuration for CareWatch (Sanjeevni)
// Production-certified Indian Healthcare Languages: Hindi (hi-IN) and English (en-IN)
// Designed for modular extensibility for future regional language rollout.

export const speechLocales = {
  hi: 'hi-IN',
  en: 'en-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  pa: 'pa-IN',
  or: 'or-IN'
};

export const SUPPORTED_LANGUAGES = {
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    speechLocale: speechLocales.hi,
    voiceKeywords: ['hi-IN', 'hi_IN', 'hindi', 'hi', 'kalpana', 'hemant'],
    direction: 'ltr',
    badge: 'हिन्दी'
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    speechLocale: speechLocales.en,
    voiceKeywords: ['en-IN', 'en_IN', 'indian english', 'en-GB', 'en-US', 'en'],
    direction: 'ltr',
    badge: 'English'
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    speechLocale: speechLocales.ml,
    voiceKeywords: ['ml-IN', 'ml_IN', 'malayalam', 'ml'],
    direction: 'ltr',
    badge: 'മലയാളം'
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    speechLocale: speechLocales.bn,
    voiceKeywords: ['bn-IN', 'bn_IN', 'bengali', 'bangla', 'bn'],
    direction: 'ltr',
    badge: 'বাংলা'
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    speechLocale: speechLocales.mr,
    voiceKeywords: ['mr-IN', 'mr_IN', 'marathi', 'mr'],
    direction: 'ltr',
    badge: 'मराठी'
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    speechLocale: speechLocales.te,
    voiceKeywords: ['te-IN', 'te_IN', 'telugu', 'te'],
    direction: 'ltr',
    badge: 'తెలుగు'
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    speechLocale: speechLocales.ta,
    voiceKeywords: ['ta-IN', 'ta_IN', 'tamil', 'ta', 'valluvar'],
    direction: 'ltr',
    badge: 'தமிழ்'
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    speechLocale: speechLocales.gu,
    voiceKeywords: ['gu-IN', 'gu_IN', 'gujarati', 'gu'],
    direction: 'ltr',
    badge: 'ગુજરાતી'
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    speechLocale: speechLocales.kn,
    voiceKeywords: ['kn-IN', 'kn_IN', 'kannada', 'kn'],
    direction: 'ltr',
    badge: 'ಕನ್ನಡ'
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    speechLocale: speechLocales.pa,
    voiceKeywords: ['pa-IN', 'pa_IN', 'punjabi', 'pa'],
    direction: 'ltr',
    badge: 'ਪੰਜਾਬੀ'
  },
  or: {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    speechLocale: speechLocales.or,
    voiceKeywords: ['or-IN', 'or_IN', 'odia', 'oriya', 'or'],
    direction: 'ltr',
    badge: 'ଓଡ଼ିଆ'
  }
};

export const DEFAULT_LANGUAGE = 'hi';

export const getAvailableLanguages = () => {
  return Object.values(SUPPORTED_LANGUAGES);
};

export const getLanguageConfig = (code) => {
  return SUPPORTED_LANGUAGES[code] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
};
