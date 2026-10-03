import React, { useState } from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';

/** Location label + coordinates, a GPS button, and manual lat/long entry (shown when GPS fails or on demand). */
export default function SoilLocation({ location, status, error, onUseGps, onManual }) {
  const { L } = useLanguage();
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [formError, setFormError] = useState('');
  const showForm = open || status === 'denied' || status === 'unavailable';

  const submit = (e) => {
    e.preventDefault();
    const la = Number(lat), lo = Number(lng);
    if (lat.trim() === '' || !Number.isFinite(la) || la < -90 || la > 90) return setFormError(L({ en: 'Latitude must be a number between -90 and 90.', te: 'అక్షాంశం -90 నుండి 90 మధ్య సంఖ్య కావాలి.' }));
    if (lng.trim() === '' || !Number.isFinite(lo) || lo < -180 || lo > 180) return setFormError(L({ en: 'Longitude must be a number between -180 and 180.', te: 'రేఖాంశం -180 నుండి 180 మధ్య సంఖ్య కావాలి.' }));
    setFormError('');
    setOpen(false);
    onManual(la, lo);
  };

  return (
    <div className="card">
      <div className="card-h" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
          <Icon name="pin" className="ico" />
          <div style={{ minWidth: 0 }}>
            <b style={{ fontWeight: 500, display: 'block' }}>{location ? L(location.label) : L({ en: 'Finding your location…', te: 'మీ స్థానాన్ని కనుగొంటోంది…' })}</b>
            {location && (
              <span className="muted num" style={{ fontSize: 13 }}>
                {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}° · {L(location.source)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn sm" onClick={onUseGps} disabled={status === 'locating'}>
            {status === 'locating' ? <span className="spin" aria-hidden="true" /> : <Icon name="pin" className="ico sm" />}
            <span>{L(status === 'locating' ? { en: 'Locating…', te: 'కనుగొంటోంది…' } : { en: 'Use my location', te: 'నా స్థానం వాడండి' })}</span>
          </button>
          <button type="button" className="btn sm" aria-expanded={showForm} onClick={() => setOpen((o) => !o)}>
            <span>{L({ en: 'Enter coordinates', te: 'నిరూపకాలు నమోదు చేయండి' })}</span>
          </button>
        </div>
      </div>

      {error && <p className="err" role="alert" style={{ marginTop: 0 }}>{L(error)}</p>}

      {showForm && (
        <form onSubmit={submit} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'end' }}>
          <div className="fld" style={{ margin: 0 }}>
            <label htmlFor="soil-lat">{L({ en: 'Latitude', te: 'అక్షాంశం' })}</label>
            <div className="inp"><input id="soil-lat" inputMode="decimal" placeholder="17.9689" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
          </div>
          <div className="fld" style={{ margin: 0 }}>
            <label htmlFor="soil-lng">{L({ en: 'Longitude', te: 'రేఖాంశం' })}</label>
            <div className="inp"><input id="soil-lng" inputMode="decimal" placeholder="79.5941" value={lng} onChange={(e) => setLng(e.target.value)} /></div>
          </div>
          <button type="submit" className="btn btn-dark" style={{ minHeight: 48 }}>{L({ en: 'Show soil profile', te: 'నేల వివరాలు చూపండి' })}</button>
          {formError && <p className="err" role="alert" style={{ gridColumn: '1 / -1', margin: 0 }}>{formError}</p>}
        </form>
      )}
    </div>
  );
}
