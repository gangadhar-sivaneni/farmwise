import React from 'react';
import Icon from '../common/Icon';
import IsometricArt from './IsometricArt';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';

export default function LandingHero() {
  const { t } = useLanguage();
  const { setVideoModalOpen } = useApp();

  return (
    <section className="wrap lp-hero" aria-label="Welcome">
      <div>
        <h1 className="display">
          <span className="ln">
            <span>
              <span>{t('hero.h1a', 'Your land has potential.')}</span>
            </span>
          </span>
          <span className="ln">
            <span className="soft">{t('hero.h1b', 'Let’s grow it wisely.')}</span>
          </span>
        </h1>
        <p className="lp-lede">
          {t('hero.sub', 'Understand your soil, choose the right crop, plan your costs, and grow with confidence.')}
        </p>
        <div className="lp-cta">
          <a href="/login" className="btn btn-dark">
            <span>{t('hero.cta1', 'Explore My Farm')}</span>
            <span className="ar">
              <Icon name="arrow-ur" className="ico sm" />
            </span>
          </a>
          <button
            type="button"
            className="play"
            id="watchDemo"
            onClick={() => setVideoModalOpen(true)}
          >
            <span className="c">
              <Icon name="play" className="ico sm" />
            </span>
            <span>{t('hero.cta2', 'Watch demo')}</span>
          </button>
        </div>
      </div>

      <IsometricArt />
    </section>
  );
}
