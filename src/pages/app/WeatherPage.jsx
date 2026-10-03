import React from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { FORECAST } from '../../data/weatherData';

export default function WeatherPage() {
  const { t, L, loc, W } = useLanguage();

  const dayName = (i, style = 'short') => {
    if (i === 0) return L(W.today);
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString(loc, { weekday: style });
  };

  const wet = FORECAST.findIndex((d) => d.rain >= 60);
  const dry = FORECAST.findIndex((d, i) => i > wet && d.rain <= 15);
  const wd = dayName(wet >= 0 ? wet : 1, 'long');
  const dd = dayName(dry >= 0 ? dry : 4, 'long');

  const tips = [
    {
      ic: 'rain',
      t: {
        en: `Hold sprays — rain ${wd.toLowerCase()}`,
        te: `స్ప్రేలు ఆపండి — ${wd} వర్షం`,
      },
      d: {
        en: `${
          FORECAST[wet >= 0 ? wet : 1].rain
        }% chance. Fertilizer or pesticide applied now may wash off. Clear field drains instead.`,
        te: `${
          FORECAST[wet >= 0 ? wet : 1].rain
        }% అవకాశం. ఇప్పుడు వేసిన ఎరువు, మందు కొట్టుకుపోవచ్చు.`,
      },
    },
    {
      ic: 'bug',
      t: {
        en: 'Humid nights raise pest risk',
        te: 'తేమ రాత్రులు పురుగు ప్రమాదాన్ని పెంచుతాయి',
      },
      d: {
        en: 'At 74% humidity, scout maize whorls for fall armyworm this week.',
        te: '74% తేమలో, ఈ వారం మొక్కజొన్నలో కత్తెర పురుగు కోసం చూడండి.',
      },
    },
    {
      ic: 'sun',
      t: {
        en: `${dd}: best spraying window`,
        te: `${dd}: స్ప్రేకు ఉత్తమ సమయం`,
      },
      d: {
        en: 'Dry and calm. Spray early morning when wind is under 10 km/h.',
        te: 'పొడిగా, ప్రశాంతంగా ఉంటుంది. ఉదయం వేళ స్ప్రే చేయండి.',
      },
    },
  ];

  return (
    <section className="panel page" data-page="weather" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('wx.h', 'The week ahead, in field terms')}</h1>
          <p>{t('wx.p', 'Warangal district')}</p>
        </div>
        <span className="pill demo">
          <i />
          <span>{t('wx.demo', 'Demo forecast')}</span>
        </span>
      </div>

      <div className="grid g-ov">
        <div className="card">
          <div className="days" id="days">
            {FORECAST.map((d, i) => (
              <div key={i} className={`day ${i === 0 ? 'today' : ''}`}>
                <span className="n">{dayName(i, 'short')}</span>
                <Icon name={d.icon} className="ico" />
                <span className="hl num">
                  {d.hi}° <span>{d.lo}°</span>
                </span>
                <div className="rain" aria-hidden="true">
                  <i style={{ height: `${Math.max(4, (d.rain / 100) * 44)}px` }} />
                </div>
                <span className="rp">
                  {d.rain}% {L(W.rain)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px' }} id="advice">
            {tips.map((x, i) => (
              <div key={i} className="adv">
                <span className="ic">
                  <Icon name={x.ic} className="ico" />
                </span>
                <div>
                  <b>{L(x.t)}</b>
                  <p>{L(x.d)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card dark-card wx-now">
          <div>
            <span className="muted">{t('wx.now', 'Right now')}</span>
            <div className="t num" style={{ marginTop: '12px' }}>
              29<sup>°C</sup>
            </div>
            <p style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Icon name="cloudsun" className="ico" />
              <span>{t('wx.pc', 'Partly Cloudy')}</span>
            </p>
          </div>

          <div className="wx-stats">
            <div>
              <span>{t('wx.rain', 'Rain')}</span>
              <b>20%</b>
            </div>
            <div>
              <span>{t('wx.hum', 'Humidity')}</span>
              <b>74%</b>
            </div>
            <div>
              <span>{t('wx.wind', 'Wind')}</span>
              <b>12 km/h</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
