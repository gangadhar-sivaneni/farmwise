import React, { useState } from 'react';
import Icon from '../../components/common/Icon';
import SoilDashboard from '../../components/soil/SoilDashboard';
import { useLanguage } from '../../context/LanguageContext';

export default function SoilPage() {
  const { t, L, W } = useLanguage();
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      const sizeKB = Math.max(1, Math.round(f.size / 1024));
      setUploadedFile({ name: f.name, sizeKB });
    }
  };

  const uploadCard = (
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
          : t('soil.upS', 'Attach a photo or PDF to keep it with this farm.')}
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
  );

  return (
    <section className="panel page" data-page="soil" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('soil.h', 'Good harvests start underground')}</h1>
          <p>{L({ en: 'A simulated soil profile for your location.', te: 'మీ ప్రాంతానికి అనుకరణ నేల వివరాలు.' })}</p>
        </div>
      </div>

      <SoilDashboard aside={uploadCard} />
    </section>
  );
}
