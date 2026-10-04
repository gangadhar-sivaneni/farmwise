import React from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { byId } from '../../data/cropsData';
import { navigate } from '../../utils/navigation';

export default function CompareTray() {
  const { L, t, W } = useLanguage();
  const { compareSel, showTray, setShowTray } = useApp();

  if (!showTray || !compareSel.length) return null;

  const compareText = `${L(W.comparing)}: ${compareSel
    .map((id) => {
      const c = byId(id);
      return c ? L(c.name) : id;
    })
    .join(' & ')}`;

  const handleGoCompare = (e) => {
    e.preventDefault();
    setShowTray(false);
    navigate('/app/crops');
    setTimeout(() => {
      const el = document.getElementById('compare');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className={`tray ${showTray ? 'show' : ''}`} id="tray">
      <span className="txt" id="trayTxt">
        {compareText}
      </span>
      <a
        href="#compare"
        className="btn sm btn-orange"
        onClick={handleGoCompare}
      >
        {t('tray.go', 'Compare')}
      </a>
      <button
        type="button"
        className="icon-btn"
        id="trayX"
        aria-label="Hide"
        onClick={() => setShowTray(false)}
      >
        <Icon name="x" className="ico sm" />
      </button>
    </div>
  );
}
