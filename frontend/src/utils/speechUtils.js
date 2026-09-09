// Resilient Speech Utilities for Indian Healthcare Voice Applications
// Supports clean TTS queue cancellation, Indian English (en-IN) & Hindi (hi-IN) voice routing,
// graceful regional phonetic fallback, boundary-based watchdog timer, and protects against
// Chromium utterance garbage collection and queue freeze.

import { getLanguageConfig } from '../i18n/languages.js';
import { getRegionalPhoneticText } from '../i18n/regionalPhonetics.js';

let cachedVoices = [];

/**
 * Ensure voices are loaded across Chrome/Edge/Firefox/Safari
 */
export const getBrowserVoices = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const current = window.speechSynthesis.getVoices();
  if (current && current.length > 0) {
    cachedVoices = current;
    return current;
  }
  return cachedVoices;
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Resolves once voices are guaranteed loaded (or after a 400ms timeout)
 */
export const ensureVoicesLoaded = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const current = window.speechSynthesis.getVoices();
    if (current && current.length > 0) {
      cachedVoices = current;
      resolve(current);
      return;
    }

    const timer = setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 400);

    const prevHandler = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = (e) => {
      clearTimeout(timer);
      cachedVoices = window.speechSynthesis.getVoices();
      if (typeof prevHandler === 'function') prevHandler(e);
      resolve(cachedVoices);
    };
  });
};

/**
 * Finds a true native voice for the given language code (e.g. Malayalam, Tamil, Bengali).
 * Returns null if the browser only has default English/Hindi voices installed.
 */
export const findNativeVoice = (langCode) => {
  const voices = getBrowserVoices();
  if (!voices || voices.length === 0) return null;

  const config = getLanguageConfig(langCode);
  const keywords = config.voiceKeywords || [config.speechLocale];

  // 1. First priority: Exact match on locale (e.g. 'ml-IN', 'ta-IN', 'te-IN')
  for (const kw of keywords) {
    const match = voices.find(v => v.lang && v.lang.toLowerCase() === kw.toLowerCase());
    if (match) return match;
  }

  // 2. Second priority: Voice name or language containing keyword
  for (const kw of keywords) {
    const match = voices.find(v => 
      (v.lang && v.lang.toLowerCase().includes(kw.toLowerCase())) ||
      (v.name && v.name.toLowerCase().includes(kw.toLowerCase()))
    );
    if (match) return match;
  }

  // 3. Fallback: Any voice matching the 2-letter language prefix (except when prefix would falsely match English)
  if (langCode !== 'en') {
    const prefixMatch = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
    if (prefixMatch) return prefixMatch;
  }

  return null;
};

/**
 * Finds the highest quality Indian voice on the host system
 * (Indian English e.g. Heera/Ravi/Google, or Hindi e.g. Hemant/Kalpana/Swara).
 * Used when a regional language lacks a native voice pack on Windows/Chrome.
 */
export const findIndianFallbackVoice = () => {
  const voices = getBrowserVoices();
  if (!voices || voices.length === 0) return null;

  // 1. First choice: Indian English voice (e.g. Heera, Ravi, Google English (India))
  const inEnglishVoice = voices.find(v => 
    (v.lang && (v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase() === 'en_in')) ||
    (v.name && (v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('ravi') || v.name.toLowerCase().includes('india')))
  );
  if (inEnglishVoice) return inEnglishVoice;

  // 2. Second choice: Hindi Indian voice (e.g. Google हिन्दी, Hemant, Kalpana, Swara)
  const hindiVoice = voices.find(v => 
    (v.lang && (v.lang.toLowerCase() === 'hi-in' || v.lang.toLowerCase() === 'hi_in')) ||
    (v.name && (v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('hemant') || v.name.toLowerCase().includes('kalpana') || v.name.toLowerCase().includes('swara')))
  );
  if (hindiVoice) return hindiVoice;

  // 3. Third choice: Any voice with 'IN' locale
  const anyIndianVoice = voices.find(v => v.lang && v.lang.toLowerCase().includes('-in'));
  if (anyIndianVoice) return anyIndianVoice;

  // 4. Fourth choice: Any English voice
  const englishVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  if (englishVoice) return englishVoice;

  return voices[0] || null;
};

/**
 * Finds the most natural voice for a given language code
 */
export const findBestVoice = (langCode) => {
  const native = findNativeVoice(langCode);
  if (native) return native;

  // Marathi can be smoothly articulated by Hindi Devanagari voice
  if (langCode === 'mr') {
    const hindiVoice = findNativeVoice('hi') || findIndianFallbackVoice();
    if (hindiVoice) return hindiVoice;
  }

  // Fallback to Indian English or Indian voice
  return findIndianFallbackVoice();
};

/**
 * Resolves the optimal speech payload (text, voice, locale) for a question.
 * If the host browser lacks a native regional voice, provides phonetic transliteration
 * routed through the Indian voice to eliminate silence and "Ramesh Kumar only" bugs.
 */
export const getSpeechPayload = ({
  category = 'GENERAL',
  questionId = '',
  langCode = 'hi',
  patientName = 'मरीज',
  nativeTextMap = {}
}) => {
  const nativeVoice = findNativeVoice(langCode);

  // Case 1: Browser has genuine native voice pack (e.g. Edge Natural voices, Android Chrome)
  if (nativeVoice) {
    const textToSpeak = nativeTextMap[langCode] || nativeTextMap.en || nativeTextMap.hi || '';
    return {
      textToSpeak,
      voice: nativeVoice,
      locale: nativeVoice.lang || getLanguageConfig(langCode)?.speechLocale || 'en-IN',
      isNative: true
    };
  }

  // Case 2: Marathi (uses Devanagari script; read fluently by Hindi voices)
  if (langCode === 'mr') {
    const hindiVoice = findNativeVoice('hi') || findIndianFallbackVoice();
    const textToSpeak = nativeTextMap.mr || nativeTextMap.hi || '';
    return {
      textToSpeak,
      voice: hindiVoice,
      locale: 'hi-IN',
      isNative: true
    };
  }

  // Case 3: Hindi or English
  if (langCode === 'hi' || langCode === 'en') {
    const best = findBestVoice(langCode);
    const textToSpeak = nativeTextMap[langCode] || nativeTextMap.en || nativeTextMap.hi || '';
    return {
      textToSpeak,
      voice: best,
      locale: getLanguageConfig(langCode)?.speechLocale || (langCode === 'hi' ? 'hi-IN' : 'en-IN'),
      isNative: true
    };
  }

  // Case 4: Regional Indic language without native OS voice pack (ml, bn, te, ta, gu, kn, pa, or)
  // Use phonetic transliteration so the Indian voice speaks every single syllable accurately
  const fallbackVoice = findIndianFallbackVoice();
  const phonetic = getRegionalPhoneticText(category, questionId, langCode, patientName);
  const textToSpeak = phonetic || nativeTextMap[langCode] || nativeTextMap.en || '';

  return {
    textToSpeak,
    voice: fallbackVoice,
    locale: fallbackVoice?.lang || 'en-IN',
    isNative: false
  };
};

/**
 * Stop any active utterance and reset speech synthesis queue cleanly.
 */
export const stopSpeechSynthesis = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    // Chromium bug fix: resume if paused so queue does not lock permanently
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (err) {
    console.warn('[speechUtils] Error stopping speech synthesis:', err);
  }
};

/**
 * Speaks text using Web Speech API with dynamic boundary-reset watchdog timer,
 * voice routing, and garbage collection protection.
 * @param {string} text - The text to speak
 * @param {string} langCode - Language code
 * @param {object} options - Optional pitch, rate, onStart, onEnd callbacks
 * @returns {Promise<void>}
 */
export const speakTextAsync = (text, langCode = 'hi', options = {}) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    if (!text || !text.trim()) {
      resolve();
      return;
    }

    // Stop previous utterances
    stopSpeechSynthesis();

    const config = getLanguageConfig(langCode);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.locale || config.speechLocale;
    utterance.rate = options.rate || ((langCode === 'hi' || langCode === 'en') ? 0.92 : 0.88);
    utterance.pitch = options.pitch || 1.05;

    const voice = options.voice || findBestVoice(langCode);
    if (voice) {
      utterance.voice = voice;
    }

    // Anchor to window object to prevent V8 garbage collector from terminating speech early
    window.__sanjeevniActiveUtterance = utterance;

    let hasCompleted = false;
    let watchdogTimer = null;

    const finish = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      if (watchdogTimer) clearTimeout(watchdogTimer);
      window.__sanjeevniActiveUtterance = null;
      if (options.onEnd) options.onEnd();
      resolve();
    };

    utterance.onstart = () => {
      if (options.onStart) options.onStart();
    };
    utterance.onend = finish;
    utterance.onerror = (err) => {
      console.warn('[speechUtils] Utterance error:', err);
      finish();
    };

    // Calculate maximum realistic duration: generous buffer based on length
    const timeoutMs = Math.max(12000, Math.min(45000, text.length * 110 + 6000));
    const resetWatchdog = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        // If browser is still actively speaking, do NOT kill it prematurely
        if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
          resetWatchdog();
          return;
        }
        finish();
      }, timeoutMs);
    };

    // Keep watchdog alive while words are actively spoken
    utterance.onboundary = () => {
      resetWatchdog();
    };

    resetWatchdog();

    // Short 50ms pause prevents speech synthesis race conditions
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[speechUtils] Failed to speak utterance:', err);
        if (watchdogTimer) clearTimeout(watchdogTimer);
        finish();
      }
    }, 50);
  });
};

/**
 * Reusable speak(text, language) function conforming directly to production specification
 */
export const speak = (text, language = 'hi', options = {}) => {
  return speakTextAsync(text, language, options);
};
