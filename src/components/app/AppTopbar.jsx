import React from 'react';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { PAGE_T } from '../../data/translations';

export default function AppTopbar({ currentPage }) {
  const { t, L } = useLanguage();
  const { weatherData, locationInfo } = useApp();

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

  const isLiveGps = !!(locationInfo?.isLiveGPS && weatherData);
  const isLiveWeather = !!weatherData;

  return (
    <header className="panel topbar">
      <h2 id="pageTitle">{t(titleKey, defaultTitles[currentPage] || 'Overview')}</h2>
      {isLiveGps ? (
        <span className="pill ok">
          <i />
          <span>{L({ en: 'Live GPS Weather', te: 'ప్రత్యక్ష GPS వాతావరణం' })}</span>
        </span>
      ) : isLiveWeather ? (
        <span className="pill ok">
          <i />
          <span>{L({ en: 'Live Weather', te: 'ప్రత్యక్ష వాతావరణం' })}</span>
        </span>
      ) : null}

      <div className="r">
        <LanguageSwitcher />
        <span className="avatar" aria-label="Gangadhar">
          G
        </span>
      </div>
    </header>
  );
}
