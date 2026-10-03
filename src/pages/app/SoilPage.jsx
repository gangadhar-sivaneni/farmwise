import React, { useState } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { NUTRIENTS, SUIT } from '../../data/soilData';
import { byId } from '../../data/cropsData';

export default function SoilPage() {
  const { t, L, W } = useLanguage();
  const [uploadedFile, setUploadedFile] = useState(null);

  const levelOf = (n) =>
    n.val < n.zones[0] ? W.low : n.val <= n.zones[1] ? W.med : W.high;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      const sizeKB = Math.max(1, Math.round(f.size / 1024));
      setUploadedFile({ name: f.name, sizeKB });
    }
  };

  return (
    <section className="panel page" data-page="soil" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('soil.h', 'Good harvests start underground')}</h1>
          <p>{t('soil.p', 'From your sample Soil Health Card.')}</p>
        </div>
        <span className="pill demo">
          <i />
          <span>{t('soil.sample', 'Sample soil card')}</span>
        </span>
      </div>

      <div className="grid g-ov">
        <div className="card">
          <div className="card-h">
            <h3>{t('soil.ph', 'Soil pH')}</h3>
            <b style={{ fontSize: '26px', fontWeight: 500 }}>6.8</b>
          </div>
          <div className="ph-scale">
            <span className="mk" style={{ left: '56%' }} />
          </div>
          <div className="ph-ticks">
            <span>{t('soil.acid', '4 · Acidic')}</span>
            <span>{t('soil.neutral', '7 · Neutral')}</span>
            <span>{t('soil.alk', '9 · Alkaline')}</span>
          </div>

          <div id="nutrients" style={{ marginTop: '20px' }}>
            {NUTRIENTS.map((n) => {
              const lv = levelOf(n);
              const idx = lv === W.low ? 1 : lv === W.med ? 2 : 3;
              const isLo = lv === W.low;
              return (
                <div key={n.k} className="nut">
                  <div className="nm">
                    {L(n.name)} ({n.k})
                    <small>
                      {n.val} {n.unit}
                    </small>
                  </div>
                  <div className="segs">
                    {[1, 2, 3].map((i) => (
                      <i
                        key={i}
                        className={`${i <= idx ? 'on' : ''} ${isLo ? 'lo' : ''}`}
                      />
                    ))}
                  </div>
                  <div className={`lvl ${isLo ? 'lo' : 'ok'}`}>{L(lv)}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px' }}>
            <b style={{ fontWeight: 500 }}>{t('soil.suit', 'Suits this soil')}</b>
            <div className="suit" id="suit">
              {SUIT.map((s, i) => (
                <span
                  key={i}
                  className={`pill ${s.f === 'good' ? 'ok' : ''}`}
                >
                  {L(byId(s.c)?.name)} · {L(W[s.f])}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="soil-img">
            <img
              src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=70"
              alt="Dark loamy soil with a trowel"
            />
            <span style={{ opacity: 0.8, fontSize: '13px' }}>
              {t('soil.type', 'Soil type')}
            </span>
            <span className="type">{t('soil.loamy', 'Loamy')}</span>
            <span
              className="pill ok"
              style={{ alignSelf: 'flex-start', marginTop: '10px' }}
            >
              {t('soil.fert', 'Fertility: Medium · 65/100')}
            </span>
          </div>

          <div className="card">
            <b style={{ fontWeight: 500 }}>
              {t('soil.up', 'Have a Soil Health Card?')}
            </b>
            <p
              className={`muted fn ${uploadedFile ? 'ok' : ''}`}
              id="soilFile"
              style={{ fontSize: '14px', margin: '4px 0 12px' }}
            >
              {uploadedFile
                ? `${uploadedFile.name} (${uploadedFile.sizeKB} KB) — ${L(W.fileAttached)}`
                : t(
                    'soil.upS',
                    'Attach a photo or PDF to keep it with this farm.'
                  )}
            </p>
            <label className="btn sm file-btn">
              <Icon name="upload" className="ico sm" />
              <span>{t('soil.choose', 'Choose file')}</span>
              <input
                type="file"
                id="soilInput"
                accept="image/*,.pdf"
                aria-label="Upload soil report"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
