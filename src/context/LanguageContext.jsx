import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TE, W } from '../data/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('fw.lang');
      return saved ? JSON.parse(saved) : 'en';
    } catch {
      return 'en';
    }
  });

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('fw.lang', JSON.stringify(newLang));
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const L = useCallback((o) => {
    if (!o) return '';
    if (typeof o === 'object') {
      return o[lang] ?? o.en ?? '';
    }
    return o;
  }, [lang]);

  const t = useCallback((key, fallback) => {
    if (lang === 'te') {
      return TE[key] ?? fallback ?? key;
    }
    return fallback ?? key;
  }, [lang]);

  const loc = lang === 'te' ? 'te-IN' : 'en-IN';

  const showToast = useCallback((msg) => {
    const text = typeof msg === 'object' ? (msg[lang] ?? msg.en ?? '') : (TE[msg] ?? msg);
    setToastMessage(text);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, L, t, loc, showToast, W, TE }}>
      {children}
      <div
        id="toast"
        role="status"
        aria-live="polite"
        className={`toast ${toastVisible ? 'show' : ''}`}
      >
        {toastMessage}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
