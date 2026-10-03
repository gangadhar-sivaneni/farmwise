import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function StatsStrip() {
  const { t } = useLanguage();

  return (
    <section className="wrap" aria-label="What you get">
      <div className="lp-stats rv in">
        <div>
          <span className="mono">{t('st.k1', 'Crops')}</span>
          <span className="n">06</span>
          <span className="t">{t('st.crops', 'Crop plans')}</span>
          <span className="s">{t('st.cropsS', 'Kharif & Rabi')}</span>
        </div>
        <div>
          <span className="mono">{t('st.k2', 'Languages')}</span>
          <span className="n">02</span>
          <span className="t">{t('st.lang', 'English · తెలుగు')}</span>
          <span className="s">{t('st.langS', 'Switch any time')}</span>
        </div>
        <div>
          <span className="mono">{t('st.k3', 'Forecast')}</span>
          <span className="n">5d</span>
          <span className="t">{t('st.wx', 'Weather advice')}</span>
          <span className="s">{t('st.wxS', 'Day-by-day field tips')}</span>
        </div>
        <div className="cyc">
          <div className="top">
            <span className="mono">{t('st.cycle', 'Maize growth · My Farm')}</span>
            <span className="pill ok">67%</span>
          </div>
          <span className="n">
            Day 74 <span style={{ color: 'var(--ink-3)' }}>/ 110</span>
          </span>
          <div className="segs">
            <i className="on" style={{ animationDelay: '.1s' }} />
            <i className="on" style={{ animationDelay: '.18s' }} />
            <i className="on" style={{ animationDelay: '.26s' }} />
            <i className="on" style={{ animationDelay: '.34s' }} />
            <i className="on" style={{ animationDelay: '.42s' }} />
            <i className="on" style={{ animationDelay: '.5s' }} />
            <i />
            <i />
            <i />
          </div>
          <div className="segs-l">
            <span className="mono">{t('st.sow', 'Sowing')}</span>
            <span className="mono">{t('st.now', 'Tasseling')}</span>
            <span className="mono">{t('st.har', 'Harvest')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
