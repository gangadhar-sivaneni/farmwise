import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../common/Icon';
import MapBoundary from '../common/MapBoundary';
import { useLanguage } from '../../context/LanguageContext';
import { useFarm } from '../../context/FarmContext';
import { CROPS } from '../../data/cropsData';
import { getTodayDateStr } from '../../data/tasksData';
import { withArea, plotCenter, SOURCE_LABEL } from '../../services/farmService';
import { getUserLocation } from '../../services/weatherService';
import { measure, validateBoundary, centroidOf, toSqm, AREA_UNITS } from '../../utils/geo';
import { parseLandFile } from '../../utils/landFileParser';

// Leaflet only loads when a farmer actually opens the map
const PlotMap = lazy(() => import('./PlotMap'));

const IRRIGATION = {
  borewell: { en: 'Borewell', te: 'బోరుబావి' },
  canal: { en: 'Canal', te: 'కాలువ' },
  drip: { en: 'Drip', te: 'బిందు సేద్యం' },
  sprinkler: { en: 'Sprinkler', te: 'స్ప్రింక్లర్' },
  rainfed: { en: 'Rain-fed', te: 'వర్షాధారం' },
  tank: { en: 'Tank / pond', te: 'చెరువు' },
};
const METHODS = {
  draw: { icon: 'edit', t: { en: 'Draw on map', te: 'మ్యాప్‌పై గీయండి' }, d: { en: 'Tap the corners of your field', te: 'మీ పొలం మూలలు నొక్కండి' } },
  upload: { icon: 'upload', t: { en: 'Upload land file', te: 'భూమి ఫైల్ అప్‌లోడ్' }, d: { en: 'GeoJSON, KML, CSV, PDF or photo', te: 'GeoJSON, KML, CSV, PDF లేదా ఫోటో' } },
  manual: { icon: 'file', t: { en: 'Enter manually', te: 'చేతితో నమోదు' }, d: { en: 'Type area and location', te: 'విస్తీర్ణం, స్థానం టైప్ చేయండి' } },
};

const fmt = (n, d = 2) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
const blank = () => ({
  name: '', state: 'Telangana', district: '', village: '', surveyNo: '', crop: 'rice', sown: getTodayDateStr(),
  irrigation: 'borewell', notes: '', area: '', areaUnit: 'acres', lat: '', lng: '',
});

export default function AddPlotModal() {
  const { L } = useLanguage();
  const { editor, closePlotEditor, savePlot, activePlot } = useFarm();
  const dlg = useRef(null);
  const isEdit = !!editor?.id;

  const [method, setMethod] = useState('draw');
  const [f, setF] = useState(blank);
  const [points, setPoints] = useState(null);
  const [fromFile, setFromFile] = useState(false); // boundary came from an uploaded file
  const [docInfo, setDocInfo] = useState(null); // { doc, readText, filled: [...] }
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // (re)initialise whenever the editor opens
  useEffect(() => {
    const d = dlg.current;
    if (!editor) { if (d?.open) d.close(); return; }
    const p = editor;
    setF(isEdit ? {
      name: p.name, state: p.location?.state || '', district: p.location?.district || '', village: p.location?.village || '',
      surveyNo: p.surveyNo || '', crop: p.crop || 'rice', sown: p.sown || getTodayDateStr(), irrigation: p.irrigation || 'borewell',
      notes: p.notes || '', area: String(+(p.areaAcres || 0).toFixed(3)), areaUnit: 'acres',
      lat: String(p.lat ?? ''), lng: String(p.lng ?? ''),
    } : blank());
    setPoints(p.polygon || null);
    setFromFile(p.areaSource === 'uploaded');
    setMethod(isEdit ? (p.polygon ? (p.areaSource === 'uploaded' ? 'upload' : 'draw') : 'manual') : 'draw');
    setDocInfo(null);
    setErrors({});
    if (d && !d.open) d.showModal();
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = useMemo(() => (points ? measure(points) : null), [points]);
  const boundaryErr = useMemo(() => (points ? validateBoundary(points) : null), [points]);
  const mapCenter = useMemo(() => {
    if (points?.length >= 3) return centroidOf(points);
    const lat = Number(f.lat), lng = Number(f.lng);
    if (f.lat && f.lng && Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return plotCenter(isEdit ? editor : activePlot);
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: null })); };
  const useBoundary = method !== 'manual' && !!points;
  const needsManualArea = method === 'manual' || (method === 'upload' && !points && !!docInfo);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrors({});
    setBusy(true);
    try {
      const r = await parseLandFile(file);
      if (r.kind === 'polygon') {
        setPoints(r.points);
        setFromFile(true);
        setDocInfo({ doc: { name: file.name, type: file.type || 'geo', size: file.size }, boundary: true });
        if (r.name) setF((s) => ({ ...s, name: s.name || r.name }));
      } else {
        // a document: only text fields, never a boundary
        const filled = Object.entries(r.fields).filter(([k, v]) => v && k !== 'areaUnit').map(([k]) => k);
        setF((s) => ({
          ...s,
          surveyNo: r.fields.surveyNo || s.surveyNo,
          village: r.fields.village || s.village,
          district: r.fields.district || s.district,
          area: r.fields.area || s.area,
          areaUnit: r.fields.area ? r.fields.areaUnit : s.areaUnit,
        }));
        setPoints(null);
        setDocInfo({ doc: r.doc, readText: r.readText, filled });
      }
    } catch (err) {
      setErrors({ file: err.msg || { en: 'Could not read this file.', te: 'ఈ ఫైల్ చదవలేకపోయాం.' } });
    } finally {
      setBusy(false);
    }
  };

  const fillGps = async () => {
    try {
      const c = await getUserLocation();
      setF((s) => ({ ...s, lat: c.latitude.toFixed(6), lng: c.longitude.toFixed(6) }));
      setErrors((s) => ({ ...s, lat: null }));
    } catch {
      setErrors((s) => ({ ...s, lat: { en: 'Location permission denied. Type the latitude and longitude, or draw the field on the map.', te: 'స్థాన అనుమతి లభించలేదు. అక్షాంశం, రేఖాంశం టైప్ చేయండి లేదా మ్యాప్‌పై పొలం గీయండి.' } }));
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const err = {};
    if (!f.name.trim()) err.name = { en: 'Give this plot a name, e.g. “North field”.', te: 'ఈ ప్లాట్‌కు పేరు ఇవ్వండి, ఉదా. “ఉత్తర పొలం”.' };
    let area, lat, lng, polygon = null;
    if (useBoundary) {
      if (boundaryErr) err.boundary = boundaryErr;
      else { area = { sqm: m.sqm, perimeterM: m.perimeterM }; polygon = points; [lat, lng] = centroidOf(points); }
    } else {
      if (method !== 'manual' && !docInfo && !isEdit) {
        err.boundary = method === 'draw'
          ? { en: 'Draw your field boundary on the map, or switch to “Enter manually”.', te: 'మ్యాప్‌పై పొలం సరిహద్దు గీయండి, లేదా “చేతితో నమోదు” ఎంచుకోండి.' }
          : { en: 'Choose a land file to upload, or switch to “Enter manually”.', te: 'అప్‌లోడ్ చేయడానికి భూమి ఫైల్ ఎంచుకోండి, లేదా “చేతితో నమోదు” ఎంచుకోండి.' };
      }
      const sqm = toSqm(f.area, f.areaUnit);
      if (!(sqm > 0)) err.area = { en: 'Enter the land area (a number above 0).', te: 'భూమి విస్తీర్ణం నమోదు చేయండి (0 కంటే ఎక్కువ).' };
      else if (sqm > 5000 * 10000) err.area = { en: 'This area is unusually large for one plot. Check the number and unit.', te: 'ఒక ప్లాట్‌కు ఈ విస్తీర్ణం చాలా పెద్దది. సంఖ్య, యూనిట్ చూడండి.' };
      lat = Number(f.lat); lng = Number(f.lng);
      if (f.lat === '' || f.lng === '' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        err.lat = { en: 'Enter a valid latitude and longitude (or use GPS) so weather and soil match this plot.', te: 'వాతావరణం, నేల ఈ ప్లాట్‌కు సరిపోయేలా సరైన అక్షాంశం, రేఖాంశం ఇవ్వండి (లేదా GPS వాడండి).' };
      }
      area = { sqm, perimeterM: null };
    }
    if (Object.values(err).some(Boolean)) { setErrors(err); return; }

    const base = isEdit ? editor : {};
    const source = useBoundary ? (fromFile ? 'uploaded' : 'drawn') : 'manual';
    const rec = withArea({
      ...base,
      isDemo: false,
      name: f.name.trim(),
      location: { village: f.village.trim(), district: f.district.trim(), state: f.state.trim() },
      lat, lng, polygon, areaSource: source,
      crop: f.crop, sown: f.sown, irrigation: f.irrigation, surveyNo: f.surveyNo.trim(), notes: f.notes.trim(),
      documents: docInfo ? [...(base.documents || []), docInfo.doc] : base.documents || [],
      soilReport: base.soilReport || null,
    }, area);
    setBusy(true);
    await savePlot(rec);
    setBusy(false);
    closePlotEditor();
  };

  const fld = (k, label, input) => (
    <div className="fld">
      <label htmlFor={`pf-${k}`}>{L(label)}{docInfo?.filled?.includes(k) && <span className="pill demo pf-tag">{L({ en: 'Read from document — please check', te: 'పత్రం నుండి చదివినది — సరిచూడండి' })}</span>}</label>
      {input}
      {errors[k] && <p className="err">{L(errors[k])}</p>}
    </div>
  );
  const text = (k, label, ph = '') => fld(k, label, <div className="inp"><input id={`pf-${k}`} value={f[k]} onChange={set(k)} placeholder={ph} /></div>);

  return (
    <dialog ref={dlg} className="dlg plot-dlg" onCancel={closePlotEditor} onClick={(e) => e.target === dlg.current && closePlotEditor()} aria-labelledby="plotDlgT">
      {editor && (
        <form className="dlg-body" onSubmit={save} noValidate>
          <button type="button" className="icon-btn dlg-close" onClick={closePlotEditor} aria-label={L({ en: 'Close', te: 'మూసివేయి' })}><Icon name="x" /></button>
          <span className="muted">{L(isEdit ? { en: 'Plot details', te: 'ప్లాట్ వివరాలు' } : { en: 'My farms', te: 'నా పొలాలు' })}</span>
          <h2 id="plotDlgT">{L(isEdit ? { en: `Edit ${editor.name}`, te: `${editor.name} మార్చండి` } : { en: 'Add a new plot', te: 'కొత్త ప్లాట్ జోడించండి' })}</h2>

          <div className="pm-methods" role="tablist">
            {Object.entries(METHODS).map(([k, v]) => (
              <button key={k} type="button" role="tab" aria-selected={method === k} className="pm-method" onClick={() => { setMethod(k); setErrors({}); }}>
                <Icon name={v.icon} className="ico" />
                <b>{L(v.t)}</b>
                <small>{L(v.d)}</small>
              </button>
            ))}
          </div>

          {method === 'upload' && (
            <div className="pm-upload">
              <label className="btn" htmlFor="pf-file"><Icon name="upload" className="ico" /><span>{L(busy ? { en: 'Reading file…', te: 'ఫైల్ చదువుతోంది…' } : { en: 'Choose file', te: 'ఫైల్ ఎంచుకోండి' })}</span></label>
              <input id="pf-file" type="file" hidden accept=".geojson,.json,.kml,.csv,.pdf,image/*" onChange={onFile} />
              <p className="muted">{L({ en: 'GeoJSON / KML / CSV (latitude, longitude columns) give the exact boundary. PDF and photos (e.g. pattadar passbook) can only fill details — they do not contain a boundary, and FarmWise does not verify ownership.', te: 'GeoJSON / KML / CSV (latitude, longitude నిలువు వరుసలు) ఖచ్చితమైన సరిహద్దు ఇస్తాయి. PDF, ఫోటోలు (ఉదా. పట్టాదారు పాస్‌బుక్) వివరాలు మాత్రమే నింపగలవు — వాటిలో సరిహద్దు ఉండదు, FarmWise యాజమాన్యాన్ని ధృవీకరించదు.' })}</p>
              {errors.file && <p className="err">{L(errors.file)}</p>}
              {docInfo && (
                <p className={`pill ${docInfo.boundary ? 'ok' : ''}`}>
                  <i />
                  <span>{docInfo.doc.name} · {L(docInfo.boundary
                    ? { en: 'boundary found — check it on the map', te: 'సరిహద్దు దొరికింది — మ్యాప్‌లో సరిచూడండి' }
                    : docInfo.readText
                      ? { en: 'some details read — no boundary in this document; enter area & location below', te: 'కొన్ని వివరాలు చదివాం — ఈ పత్రంలో సరిహద్దు లేదు; క్రింద విస్తీర్ణం, స్థానం ఇవ్వండి' }
                      : { en: 'saved as a document — text could not be read; enter details below', te: 'పత్రంగా సేవ్ — వచనం చదవలేకపోయాం; క్రింద వివరాలు ఇవ్వండి' })}</span>
                </p>
              )}
            </div>
          )}

          {(method === 'draw' || (method === 'upload' && points)) && (
            <MapBoundary message={L({ en: 'The map could not load. Check your internet.', te: 'మ్యాప్ లోడ్ కాలేదు. ఇంటర్నెట్ చూడండి.' })} retry={L({ en: 'Retry', te: 'మళ్లీ ప్రయత్నించండి' })}>
            <Suspense fallback={<div className="pmap-box pmap-wait muted">{L({ en: 'Loading map…', te: 'మ్యాప్ లోడ్ అవుతోంది…' })}</div>}>
              <PlotMap points={points} center={mapCenter} onChange={(p) => { setPoints(p); if (method === 'draw') setFromFile(false); setErrors((s) => ({ ...s, boundary: null })); }} />
            </Suspense>
            </MapBoundary>
          )}

          {useBoundary && !boundaryErr && (
            <div className="pm-area" aria-live="polite">
              {m && <>
                <div><span>{L({ en: 'Acres', te: 'ఎకరాలు' })}</span><b>{fmt(m.acres)}</b></div>
                <div><span>{L({ en: 'Hectares', te: 'హెక్టార్లు' })}</span><b>{fmt(m.hectares)}</b></div>
                <div><span>{L({ en: 'Square metres', te: 'చ.మీ.' })}</span><b>{fmt(m.sqm, 0)}</b></div>
                <div><span>{L({ en: 'Perimeter', te: 'చుట్టుకొలత' })}</span><b>{fmt(m.perimeterM, 0)} m</b></div>
              </>}
            </div>
          )}
          {(errors.boundary || (useBoundary && boundaryErr)) && <p className="err">{L(errors.boundary || boundaryErr)}</p>}

          <div className="pm-grid">
            {text('name', { en: 'Plot name', te: 'ప్లాట్ పేరు' }, 'North field')}
            {fld('crop', { en: 'Crop', te: 'పంట' },
              <select id="pf-crop" className="select" value={f.crop} onChange={set('crop')}>
                {CROPS.map((c) => <option key={c.id} value={c.id}>{L(c.name)}</option>)}
              </select>)}
            {text('village', { en: 'Village', te: 'గ్రామం' })}
            {text('district', { en: 'District', te: 'జిల్లా' })}
            {text('state', { en: 'State', te: 'రాష్ట్రం' })}
            {text('surveyNo', { en: 'Survey number', te: 'సర్వే నంబర్' }, '123/A')}
            {fld('sown', { en: 'Sowing date', te: 'విత్తిన తేదీ' }, <div className="inp"><input id="pf-sown" type="date" value={f.sown} onChange={set('sown')} /></div>)}
            {fld('irrigation', { en: 'Irrigation', te: 'నీటిపారుదల' },
              <select id="pf-irrigation" className="select" value={f.irrigation} onChange={set('irrigation')}>
                {Object.entries(IRRIGATION).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
              </select>)}
          </div>

          {needsManualArea && (
            <fieldset className="pm-manual">
              <legend><span className="pill demo"><i /><span>{L(SOURCE_LABEL.manual)}</span></span></legend>
              <div className="pm-grid">
                {fld('area', { en: 'Land area', te: 'భూమి విస్తీర్ణం' },
                  <div className="inp">
                    <input id="pf-area" inputMode="decimal" value={f.area} onChange={set('area')} placeholder="2.5" />
                    <select className="pm-unit" aria-label={L({ en: 'Area unit', te: 'విస్తీర్ణ యూనిట్' })} value={f.areaUnit} onChange={set('areaUnit')}>
                      {Object.entries(AREA_UNITS).map(([k, v]) => <option key={k} value={k}>{L(v.label)}</option>)}
                    </select>
                  </div>)}
                {fld('lat', { en: 'Latitude, longitude', te: 'అక్షాంశం, రేఖాంశం' },
                  <div className="pm-ll">
                    <div className="inp"><input id="pf-lat" inputMode="decimal" value={f.lat} onChange={set('lat')} placeholder="17.9689" aria-label="Latitude" /></div>
                    <div className="inp"><input inputMode="decimal" value={f.lng} onChange={set('lng')} placeholder="79.5941" aria-label="Longitude" /></div>
                    <button type="button" className="btn sm" onClick={fillGps}><Icon name="pin" className="ico" /><span>GPS</span></button>
                  </div>)}
              </div>
              {f.area > 0 && <p className="muted">≈ {fmt(toSqm(f.area, f.areaUnit) / 4046.8564224)} {L({ en: 'acres', te: 'ఎకరాలు' })} · {fmt(toSqm(f.area, f.areaUnit) / 10000)} ha</p>}
            </fieldset>
          )}

          {fld('notes', { en: 'Notes', te: 'గమనికలు' }, <textarea id="pf-notes" className="pm-notes" rows={2} value={f.notes} onChange={set('notes')} />)}

          <div className="pm-foot">
            <button type="button" className="btn btn-ghost" onClick={closePlotEditor}>{L({ en: 'Cancel', te: 'రద్దు' })}</button>
            <button type="submit" className="btn btn-orange" disabled={busy}><Icon name="save" className="ico" /><span>{L(isEdit ? { en: 'Save changes', te: 'మార్పులు సేవ్ చేయండి' } : { en: 'Save plot', te: 'ప్లాట్ సేవ్ చేయండి' })}</span></button>
          </div>
        </form>
      )}
    </dialog>
  );
}
