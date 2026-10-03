import React from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';

export default function HowItWorksSection() {
  const { t } = useLanguage();

  return (
    <section className="wrap lp-sec" id="how">
      <div className="sec-h rv in">
        <div>
          <span className="mono">{t('s3.idx', '02 — How it works')}</span>
          <h2>{t('s3.h2', 'From your phone to your field in three steps.')}</h2>
        </div>
        <p>
          {t(
            's3.p',
            'No new equipment. Sign in with your mobile number and FarmWise does the reading for you.'
          )}
        </p>
      </div>

      <div className="banner rv in">
        <img
          loading="lazy"
          src="https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=2000&q=72"
          alt="Rows of young crops in a field"
        />
        <div className="float">
          <div className="hd">
            <span>{t('bn.place', 'Demo Farm · Warangal')}</span>
            <Icon name="pin" className="ico sm" />
          </div>
          <div className="tabs">
            <span>{t('bn.ov', 'Overview')}</span>
            <span>{t('bn.rem', 'Reminders')}</span>
          </div>
          <span className="thumb">
            <img
              loading="lazy"
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=560&h=350&q=70"
              alt=""
            />
          </span>
          <div className="kv">
            <span>{t('bn.crop', 'Crop')}</span>
            <b>{t('crop.maize', 'Maize')}</b>
          </div>
          <div className="kv">
            <span>{t('bn.next', 'Next task')}</span>
            <b>{t('bn.task', 'Inspect leaves')}</b>
          </div>
        </div>
      </div>

      <div className="steps">
        <div className="rv in">
          <span className="mono">01</span>
          <b>{t('h1', 'Sign in with your number')}</b>
          <p>{t('h1p', 'A one-time code — no passwords to remember.')}</p>
        </div>
        <div className="rv in d1">
          <span className="mono">02</span>
          <b>{t('h2', 'Add your plots')}</b>
          <p>{t('h2p', 'Crop, acres and soil card. Takes two minutes.')}</p>
        </div>
        <div className="rv in d2">
          <span className="mono">03</span>
          <b>{t('h3', 'Get daily advice')}</b>
          <p>{t('h3p', 'Tasks from weather, crop stage and soil — every morning.')}</p>
        </div>
      </div>
    </section>
  );
}
