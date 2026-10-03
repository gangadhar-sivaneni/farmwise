import React, { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { PAGE_T } from '../../data/translations';

export default function AppTopbar({ currentPage }) {
  const { t, L } = useLanguage();
  const { weatherData, locationInfo } = useApp();
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const off = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    const esc = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('pointerdown', off);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); };
  }, [menu]);

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
        <div className="pmenu" ref={menuRef}>
          <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={menu} aria-label={L({ en: 'Profile menu', te: 'ప్రొఫైల్ మెను' })} onClick={() => setMenu((m) => !m)}>
            {user?.name?.[0] || '?'}
          </button>
          {menu && (
            <div className="fsel-pop pmenu-pop" role="menu">
              <small className="fsel-h">{L({ en: 'SIGNED IN AS', te: 'లాగిన్ అయినవారు' })}</small>
              <b className="pmenu-name">{user?.name}</b>
              <button type="button" role="menuitem" className="fsel-add" onClick={logout}>
                <Icon name="logout" /><span>{t('logout', 'Log out')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
