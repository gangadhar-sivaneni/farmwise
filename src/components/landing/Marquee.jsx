import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function Marquee() {
  const { t } = useLanguage();

  const crops = [
    { key: 'crop.rice', def: 'Rice' },
    { key: 'crop.cotton', def: 'Cotton' },
    { key: 'crop.maize', def: 'Maize' },
    { key: 'crop.chilli', def: 'Chilli' },
    { key: 'crop.turmeric', def: 'Turmeric' },
    { key: 'crop.groundnut', def: 'Groundnut' },
  ];

  return (
    <div className="marquee" aria-hidden="true">
      <div className="track">
        {crops.map((c, i) => (
          <span key={`m1-${i}`}>{t(c.key, c.def)}</span>
        ))}
        {crops.map((c, i) => (
          <span key={`m2-${i}`}>{t(c.key, c.def)}</span>
        ))}
      </div>
    </div>
  );
}
