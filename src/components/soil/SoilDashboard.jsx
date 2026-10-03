import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../common/Icon';
import SoilLocation from './SoilLocation';
import SoilMetricCard from './SoilMetricCard';
import { useLanguage } from '../../context/LanguageContext';
import { byId } from '../../data/cropsData';
import { getUserLocation, reverseGeocode } from '../../services/weatherService';
import { simulateSoil, PARAMS, DEMO_LOCATION } from '../../services/soilSimulation';

const SOIL_IMG = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=70';
const FIT = {
  good: { en: 'Good fit', te: 'బాగా సరిపోతుంది', cls: 'pill ok' },
  fair: { en: 'Fair fit', te: 'మోస్తరుగా', cls: 'pill' },
  poor: { en: 'Poor fit', te: 'సరిపోదు', cls: 'pill demo' },
};

const demo = () => ({ ...DEMO_LOCATION, source: 'Demo location' });

/** Location-based simulated soil profile. `aside` renders under the soil card (e.g. the upload card). */
export default function SoilDashboard({ aside }) {
  const { L, lang } = useLanguage();
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('locating'); // locating | ok | denied | unavailable
  const [error, setError] = useState('');
  const [sample, setSample] = useState(0);
  const [loading, setLoading] = useState(true);

  const locate = useCallback(async () => {
    setStatus('locating');
    setError('');
    try {
      const { latitude, longitude } = await getUserLocation();
      setLocation({ latitude, longitude, label: 'Your location', source: 'GPS' });
      setSample(0);
      setStatus('ok');
      const place = await reverseGeocode(latitude, longitude); // falls back to coordinates, never throws
      setLocation((cur) => (cur?.latitude === latitude ? { ...cur, label: place.displayName } : cur));
    } catch (err) {
      const denied = err?.code === 'PERMISSION_DENIED';
      setStatus(denied ? 'denied' : 'unavailable');
      setError(denied
        ? 'Location permission was denied. Enter latitude and longitude below — showing the demo location until then.'
        : 'GPS is unavailable on this device. Enter coordinates below — showing the demo location until then.');
      setLocation((cur) => cur ?? demo());
      setSample(0);
    }
  }, []);

  useEffect(() => { locate(); }, [locate]);

  const useManual = (latitude, longitude) => {
    setLocation({ latitude, longitude, label: 'Entered location', source: 'Manual entry' });
    setSample(0);
    setStatus('ok');
    setError('');
    reverseGeocode(latitude, longitude).then((place) =>
      setLocation((cur) => (cur?.latitude === latitude ? { ...cur, label: place.displayName } : cur)));
  };

  // Brief generating state whenever the location or sample changes
  useEffect(() => {
    if (!location) return undefined;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, [location?.latitude, location?.longitude, sample]);

  const soil = useMemo(
    () => (location ? simulateSoil(location.latitude, location.longitude, sample) : null),
    [location?.latitude, location?.longitude, sample]
  );

  const phPos = soil ? `${((soil.ph - 4) / 5) * 100}%` : '50%';

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <span className="pill demo"><i /><span>Simulated Soil Data</span></span>
        {sample > 0 && <span className="pill">Simulated sample #{sample + 1}</span>}
        <span className="muted" style={{ fontSize: 13.5 }}>
          Illustrative soil profile generated from location. Not a laboratory soil test.
        </span>
      </div>

      <SoilLocation location={location} status={status} error={error} onUseGps={locate} onManual={useManual} />

      <div className="grid g-ov" style={{ marginTop: 12 }}>
        <div className="card" aria-busy={loading}>
          {loading || !soil ? (
            <div className="animate-pulse" aria-label="Generating simulated soil profile">
              <p className="status" style={{ color: 'var(--ink-3)', marginBottom: 16 }}>
                <span className="spin" aria-hidden="true" /> Generating simulated soil profile…
              </p>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} style={{ height: 14, margin: '22px 0', borderRadius: 6, background: 'var(--soft)', width: `${92 - (i % 3) * 14}%` }} />
              ))}
            </div>
          ) : (
            <>
              <div className="card-h">
                <h3>Soil pH</h3>
                <b style={{ fontSize: 26, fontWeight: 500 }}>{soil.ph}</b>
              </div>
              <div className="ph-scale"><span className="mk" style={{ left: phPos, transition: 'left .7s' }} /></div>
              <div className="ph-ticks"><span>4 · Acidic</span><span>7 · Neutral</span><span>9 · Alkaline</span></div>

              <div className="nut">
                <div className="nm">Electrical Conductivity (EC)<small>{soil.ec} dS/m</small></div>
                <span className="muted" style={{ fontSize: 13 }}>{soil.ec < 1 ? 'Normal salinity' : soil.ec < 2 ? 'Slightly saline — watch sensitive crops' : 'Saline'}</span>
                <div className={`lvl ${soil.ec < 1 ? 'ok' : 'lo'}`}>{soil.ec < 1 ? 'Normal' : 'Raised'}</div>
              </div>
              {PARAMS.map((p) => <SoilMetricCard key={p.k} param={p} value={soil.values[p.k]} lang={lang} />)}

              <div style={{ marginTop: 16 }}>
                <b style={{ fontWeight: 500 }}>Crop suitability for this simulated soil</b>
                <div className="suit">
                  {soil.crops.map((c) => (
                    <span key={c.id} className={FIT[c.fit].cls}>{L(byId(c.id)?.name)} · {lang === 'te' ? FIT[c.fit].te : FIT[c.fit].en}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="soil-img">
            <img src={SOIL_IMG} alt="Soil with a trowel" />
            <span style={{ opacity: 0.8, fontSize: 13 }}>Soil texture (simulated)</span>
            <span className="type">{soil && !loading ? soil.texture : '…'}</span>
            {soil && !loading && (
              <>
                <span className={`pill ${soil.fertility === 'Low' ? 'demo' : 'ok'}`} style={{ alignSelf: 'flex-start', marginTop: 10 }}>
                  Fertility: {soil.fertility} · {soil.index}/100
                </span>
                <div className="segs" style={{ marginTop: 12, gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }} aria-hidden="true">
                  {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < Math.round(soil.index / 10) ? 'on' : ''} />)}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <b style={{ fontWeight: 500 }}>Need a different illustrative sample?</b>
            <p className="muted" style={{ fontSize: 14, margin: '4px 0 12px' }}>
              Generates another simulated profile for the same location. Values are illustrative, not measured.
            </p>
            <button type="button" className="btn sm" onClick={() => setSample((s) => s + 1)} disabled={!location || loading}>
              <Icon name="reset" className="ico sm" />
              <span>Refresh Sample</span>
            </button>
          </div>

          {aside}
        </div>
      </div>
    </>
  );
}
