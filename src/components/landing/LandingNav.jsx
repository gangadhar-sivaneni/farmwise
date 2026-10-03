import React from 'react';
import BrandMark from '../common/BrandMark';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';

export default function LandingNav() {
  const { t } = useLanguage();

  const handleScrollTo = (e, targetId) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="wrap lp-nav">
      <a href="#/" className="logo" aria-label="FarmWise home">
        <BrandMark />
        <span>
          <b>FarmWise</b>
          <small>{t('brand.sub', 'Smart Farming Platform')}</small>
        </span>
      </a>

      <nav className="links" aria-label="Sections">
        <a href="#features" onClick={(e) => handleScrollTo(e, 'features')}>
          {t('nav.features', 'Features')}
        </a>
        <a href="#how" onClick={(e) => handleScrollTo(e, 'how')}>
          {t('nav.how', 'How it works')}
        </a>
        <a href="#/login">{t('nav.planner', 'Crop Planner')}</a>
        <a href="#/login">{t('nav.scan', 'AI Crop Scan')}</a>
      </nav>

      <div className="right">
        <LanguageSwitcher />
        <a href="#/login" className="lp-login">
          {t('nav.login', 'Log in')}
        </a>
        <a
          href="#/login"
          className="btn btn-dark sm"
          style={{ borderRadius: '999px', padding: '0 18px' }}
        >
          {t('nav.signup', 'Get started')}
        </a>
      </div>
    </header>
  );
}
