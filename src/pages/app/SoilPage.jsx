import React from 'react';
import Icon from '../../components/common/Icon';
import SoilDashboard from '../../components/soil/SoilDashboard';
import { useLanguage } from '../../context/LanguageContext';
import { useFarm } from '../../context/FarmContext';

export default function SoilPage() {
  const { t, L, W } = useLanguage();
  // the soil report belongs to the selected plot (file name/size kept with the plot record)
  const { activePlot, savePlot } = useFarm();
  const uploadedFile = activePlot?.soilReport;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && activePlot) {
      const sizeKB = Math.max(1, Math.round(f.size / 1024));
      savePlot({ ...activePlot, soilReport: { name: f.name, sizeKB, type: f.type, uploadedAt: new Date().toISOString() } });
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
