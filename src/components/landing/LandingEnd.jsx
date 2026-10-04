import React from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';

export default function LandingEnd() {
  const { t } = useLanguage();

  return (
    <section className="lp-end">
      <div className="wrap end-in">
        <h2 className="rv in">
          <span>{t('end.h1', 'Plan this season')}</span>
          <br />
          <span>{t('end.h2', 'before you sow.')}</span>
        </h2>
        <div className="r rv in d1">
          <p>
            {t(
              'end.p',
              'Open your farm and try the crop planner, weather advice and leaf scan.'
            )}
          </p>
          <a href="#/login" className="btn btn-light">
            <span>{t('hero.cta1', 'Explore My Farm')}</span>
            <span className="ar">
              <Icon name="arrow-ur" className="ico sm" />
            </span>
          </a>
        </div>
      </div>

      <div className="wrap lp-foot">
        <span>
          {t('foot.p', 'Grow Smarter. Farm Better.')}
        </span>
        <span className="mono">
          {t('foot.credit', 'made by knighthunters · © 2026 FarmWise')}
        </span>
      </div>
    </section>
  );
}
