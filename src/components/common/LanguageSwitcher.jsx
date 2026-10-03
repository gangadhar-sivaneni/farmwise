import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`lang ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        data-lang="en"
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <button
        type="button"
        data-lang="te"
        aria-pressed={lang === 'te'}
        lang="te"
        onClick={() => setLang('te')}
      >
        తెలుగు
      </button>
    </div>
  );
}
