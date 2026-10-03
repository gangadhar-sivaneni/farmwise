import React from 'react';
import { levelOf } from '../../services/soilSimulation';

const LEVEL = {
  low: { en: 'Low', te: 'తక్కువ', cls: 'lo', color: 'var(--orange)' },
  medium: { en: 'Medium', te: 'మధ్యస్థం', cls: 'ok', color: 'var(--leaf)' },
  high: { en: 'High', te: 'ఎక్కువ', cls: 'ok', color: 'var(--green)' },
};

/** One nutrient row: name, value + unit, a progress bar with low/medium band ticks, and its rating. */
export default function SoilMetricCard({ param, value, lang }) {
  const level = LEVEL[levelOf(value, param.bands)];
  const pct = (v) => `${Math.min(100, (v / param.max) * 100)}%`;
  return (
    <div className="nut">
      <div className="nm">
        {lang === 'te' ? param.te : param.label}
        <small>{value} {param.unit}</small>
      </div>
      <div
        role="progressbar"
        aria-label={`${param.label}: ${value} ${param.unit}, ${level.en}`}
        aria-valuemin={0}
        aria-valuemax={param.max}
        aria-valuenow={value}
        style={{ position: 'relative', height: 10, borderRadius: 4, background: 'var(--pale)' }}
      >
        <span style={{ position: 'absolute', inset: 0, width: pct(value), borderRadius: 4, background: level.color, transition: 'width .7s cubic-bezier(.2,.7,.2,1)' }} />
        {param.bands.map((b) => (
          <span key={b} title={`${b} ${param.unit}`} style={{ position: 'absolute', top: -3, bottom: -3, left: pct(b), width: 2, background: 'var(--ink-3)', opacity: 0.5 }} />
        ))}
      </div>
      <div className={`lvl ${level.cls}`}>{lang === 'te' ? level.te : level.en}</div>
    </div>
  );
}
