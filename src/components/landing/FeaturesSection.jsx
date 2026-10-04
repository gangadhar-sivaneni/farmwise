import React from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';

export default function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    {
      img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=640&h=800&q=72',
      titleKey: 'f1',
      titleDef: 'Know your soil',
      descKey: 'f1p',
      descDef: 'pH and nutrients as simple levels.',
      delay: ''
    },
    {
      img: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=640&h=800&q=72',
      titleKey: 'f2',
      titleDef: 'Choose the right crop',
      descKey: 'f2p',
      descDef: 'Filter by season, water and soil.',
      delay: 'd1'
    },
    {
      img: 'https://images.unsplash.com/photo-1752007085497-e835495e2e25?auto=format&fit=crop&w=640&h=800&q=72',
      titleKey: 'f3',
      titleDef: 'Plan costs & profit',
      descKey: 'f3p',
      descDef: 'Know your break-even before you sow.',
      delay: 'd2'
    },
    {
      img: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=640&h=800&q=72',
      titleKey: 'f4',
      titleDef: 'Scan a leaf',
      descKey: 'f4p',
      descDef: 'Spot pests and disease early.',
      delay: 'd3'
    }
  ];

  return (
    <section className="wrap lp-sec" id="features">
      <div className="sec-h rv in">
        <div>
          <span className="mono">{t('s2.idx', '01 — Features')}</span>
          <h2>{t('s2.h2', 'Everything a season needs, in one place.')}</h2>
        </div>
        <p>
          {t(
            's2.p',
            'Plain advice from your soil, the weather and the market — in English or Telugu — so every rupee and every litre goes further.'
          )}
        </p>
      </div>

      <div className="feat">
        {features.map((f, i) => (
          <a
            key={i}
            className={`fcard rv in ${f.delay}`}
            href="/login"
          >
            <span className="ph">
              <img loading="lazy" src={f.img} alt="" />
            </span>
            <span className="row">
              <span>
                <b>{t(f.titleKey, f.titleDef)}</b>
                <span className="d">{t(f.descKey, f.descDef)}</span>
              </span>
              <span className="go">
                <Icon name="arrow" className="ico sm" />
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
