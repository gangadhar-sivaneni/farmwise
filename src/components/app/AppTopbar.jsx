import React from 'react';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import { PAGE_T } from '../../data/translations';

export default function AppTopbar({ currentPage }) {
  const { t } = useLanguage();

  const titleKey = PAGE_T[currentPage] || 'p.overview';
  const defaultTitles = {
    overview: 'Overview',
    crops: 'Crops',
    planner: 'Profit Planner',
    weather: 'Weather',
    soil: 'Soil Health',
    scan: 'Crop Scan',
    market: 'Market & Shops',
    tasks: "Today’s Tasks",
  };

  return (
    <header className="panel topbar">
      <h2 id="pageTitle">{t(titleKey, defaultTitles[currentPage] || 'Overview')}</h2>
      <span className="pill demo">
        <i />
        <span>{t('demo', 'Demo Mode')}</span>
      </span>
      <div className="r">
        <LanguageSwitcher />
        <span className="avatar" aria-label="Gangadhar">
          G
        </span>
      </div>
    </header>
  );
}
