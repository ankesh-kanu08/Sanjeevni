import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageConfig, getAvailableLanguages } from '../i18n/languages';
import enTranslations from '../i18n/locales/en.json';
import hiTranslations from '../i18n/locales/hi.json';
import mlTranslations from '../i18n/locales/ml.json';
import bnTranslations from '../i18n/locales/bn.json';
import mrTranslations from '../i18n/locales/mr.json';
import teTranslations from '../i18n/locales/te.json';
import taTranslations from '../i18n/locales/ta.json';
import guTranslations from '../i18n/locales/gu.json';
import knTranslations from '../i18n/locales/kn.json';
import paTranslations from '../i18n/locales/pa.json';
import orTranslations from '../i18n/locales/or.json';
import { LOCALIZED_UI } from '../i18n/regionalQuestions';
import api from '../services/api';

const translations = {
  en: enTranslations,
  hi: hiTranslations,
  ml: mlTranslations,
  bn: bnTranslations,
  mr: mrTranslations,
  te: teTranslations,
  ta: taTranslations,
  gu: guTranslations,
  kn: knTranslations,
  pa: paTranslations,
  or: orTranslations
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  // Initialize language from localStorage or default to Hindi for accessible rural health
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('sanjeevni_language') || DEFAULT_LANGUAGE;
  });

  const languageConfig = getLanguageConfig(language);

  // Switch language and optionally sync with backend patient record
  const setLanguage = useCallback(async (newLang, syncWithBackend = false) => {
    if (!SUPPORTED_LANGUAGES[newLang]) return;

    setLanguageState(newLang);
    localStorage.setItem('sanjeevni_language', newLang);
    document.documentElement.lang = newLang;

    if (syncWithBackend) {
      try {
        await api.put('/patients/me/language', { language: newLang });
      } catch (err) {
        console.warn('Could not sync preferred language to server:', err.message);
      }
    }
  }, []);

  // Set document language attribute on mount and change
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Deep key lookup with optional template variable interpolation: t('patientDashboard.greeting', { name: 'Ramesh' })
  const t = useCallback((keyPath, params = {}) => {
    if (!keyPath) return '';
    const keys = keyPath.split('.');
    
    // Check selected language dictionary first
    let current = translations[language];
    if (current) {
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          current = null;
          break;
        }
      }
    }

    // Secondary fallback to LOCALIZED_UI for voiceAssistant keys
    if ((current === null || current === undefined) && LOCALIZED_UI[language] && keys[0] === 'voiceAssistant') {
      const regionalKey = keys.slice(1).join('.');
      current = LOCALIZED_UI[language][regionalKey] || LOCALIZED_UI[language][keys[1]];
    }

    if (current === null || current === undefined) {
      // Fallback lookup in English
      let fallback = translations.en;
      for (const k of keys) {
        if (fallback && typeof fallback === 'object' && k in fallback) {
          fallback = fallback[k];
        } else {
          fallback = null;
          break;
        }
      }
      current = fallback || keyPath;
    }

    if (typeof current === 'string') {
      let result = current;
      for (const [paramKey, paramVal] of Object.entries(params)) {
        result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramVal);
      }
      return result;
    }

    return current || keyPath;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        languageConfig,
        setLanguage,
        t,
        speechLocale: languageConfig.speechLocale,
        availableLanguages: getAvailableLanguages()
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
