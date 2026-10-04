import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { getUserLocation } from '../../services/weatherService';
import { satelliteLayer, streetLayer } from './tiles';

const ringOf = (layer) => layer.getLatLngs()[0].map((p) => [p.lat, p.lng]);
const POLY_STYLE = { color: '#FF5A01', weight: 3, fillColor: '#F2D22E', fillOpacity: 0.25 };

/**
 * Interactive field boundary map (OpenStreetMap street tiles — not satellite imagery).
 * points: [[lat, lng], ...] | null. onChange(points | null) fires on every draw / vertex edit / clear.
 */
export default function PlotMap({ points, center, onChange }) {
  const { L: tr, lang } = useLanguage();
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [drawing, setDrawing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');

  const attach = (lyr) => {
    layer.current = lyr;
    lyr.setStyle?.(POLY_STYLE);
    const emit = () => onChangeRef.current(ringOf(lyr));
    lyr.on('pm:edit pm:vertexremoved pm:vertexadded pm:markerdragend', emit);
    lyr.pm.enable({ allowSelfIntersection: true, removeVertexOn: 'contextmenu' });
    emit();
  };

  useEffect(() => {
    const m = L.map(box.current, { zoomControl: true, tap: true }).setView(center, points?.length ? 17 : 15);
    const sat = satelliteLayer().addTo(m);
    L.control.layers({ Satellite: sat, Map: streetLayer() }, null, { position: 'topright' }).addTo(m);
    m.pm.setGlobalOptions({ allowSelfIntersection: true, snappable: false, finishOn: null });
    m.on('pm:create', ({ layer: lyr }) => { setDrawing(false); attach(lyr); });
    m.on('pm:drawend', () => setDrawing(false));
    map.current = m;
    // the map lives inside a dialog that may still be animating open
    const t = setTimeout(() => m.invalidateSize(), 250);
    return () => { clearTimeout(t); m.remove(); map.current = null; layer.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatically update map to user location via GPS as soon as permissions are accepted
  useEffect(() => {
    let active = true;
    if (!points || points.length === 0) {
      getUserLocation()
        .then((c) => {
          if (!active || !map.current) return;
          if (!points || points.length === 0) {
            map.current.setView([c.latitude, c.longitude], 17);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // show a boundary that came from outside (saved plot or uploaded file)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const current = layer.current && JSON.stringify(ringOf(layer.current));
    if (points?.length >= 3 && current !== JSON.stringify(points)) {
      layer.current?.remove();
      const lyr = L.polygon(points, POLY_STYLE).addTo(m);
      attach(lyr);
      m.fitBounds(lyr.getBounds(), { padding: [30, 30], maxZoom: 18 });
    } else if (!points && layer.current) {
      layer.current.remove();
      layer.current = null;
    }
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  // a finished boundary is never wiped by a stray (double) tap
  const keepBoundary = () => layer.current && !window.confirm(tr({ en: 'Remove the drawn boundary?', te: 'గీసిన సరిహద్దును తొలగించాలా?' }));

  const startDraw = () => {
    if (keepBoundary()) return;
    layer.current?.remove();
    layer.current = null;
    onChange(null);
    map.current.pm.enableDraw('Polygon', { tooltips: true, templineStyle: { color: '#FF5A01' }, hintlineStyle: { color: '#FF5A01', dashArray: '5,5' } });
    setDrawing(true);
    setMsg(null);
  };
  const finish = () => {
    const d = map.current.pm.Draw.Polygon;
    if ((d._layer?.getLatLngs()?.length || 0) < 3) {
      setMsg({ en: 'Tap at least 3 corners before joining the shape.', te: 'ఆకారం కలిపే ముందు కనీసం 3 మూలలు నొక్కండి.' });
      return;
    }
    d._finishShape();
  };
  const undo = () => map.current.pm.Draw.Polygon._removeLastVertex();
  const clear = () => {
    if (keepBoundary()) return;
    map.current.pm.disableDraw();
    setDrawing(false);
    layer.current?.remove();
    layer.current = null;
    onChange(null);
  };

  const gps = async () => {
    setMsg({ en: 'Finding your location…', te: 'మీ స్థానాన్ని కనుగొంటోంది…' });
    try {
      const c = await getUserLocation();
      map.current.setView([c.latitude, c.longitude], 18);
      setMsg(null);
    } catch {
      setMsg({ en: 'Location permission was denied or unavailable. Search a place or type coordinates instead.', te: 'స్థాన అనుమతి లభించలేదు. ప్రదేశం వెతకండి లేదా నిరూపకాలు టైప్ చేయండి.' });
    }
  };

  const go = async (e) => {
    e.preventDefault();
    const s = q.trim();
    const ll = s.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
    if (ll) {
      const [lat, lng] = [Number(ll[1]), Number(ll[2])];
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return setMsg({ en: 'Those coordinates are out of range.', te: 'ఆ నిరూపకాలు పరిధిలో లేవు.' });
      map.current.setView([lat, lng], 17);
      return setMsg(null);
    }
    if (!s) return;
    try {
      // free OpenStreetMap place search (no key)
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&accept-language=${lang}&q=${encodeURIComponent(s)}`);
      const [hit] = await r.json();
      if (!hit) return setMsg({ en: 'Place not found. Try the village and district name.', te: 'ప్రదేశం కనబడలేదు. గ్రామం, జిల్లా పేరుతో ప్రయత్నించండి.' });
      map.current.setView([Number(hit.lat), Number(hit.lon)], 16);
      setMsg(null);
    } catch {
      setMsg({ en: 'Search is unavailable offline. Type latitude, longitude instead.', te: 'ఆఫ్‌లైన్‌లో వెతకడం పనిచేయదు. అక్షాంశం, రేఖాంశం టైప్ చేయండి.' });
    }
  };

  return (
    <div className="pmap">
      <div className="pmap-find">
        <div className="inp">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go(e)} enterKeyHint="search" placeholder={tr({ en: 'Village, town or 17.97, 79.59', te: 'గ్రామం, పట్టణం లేదా 17.97, 79.59' })} aria-label={tr({ en: 'Search place or coordinates', te: 'ప్రదేశం లేదా నిరూపకాలు వెతకండి' })} />
        </div>
        <button className="btn sm" type="button" onClick={go}>{tr({ en: 'Go', te: 'వెళ్ళు' })}</button>
      </div>
      <div ref={box} className="pmap-box" />
      <div className="pmap-tools">
        {!drawing ? (
          <button className="btn sm btn-dark" type="button" onClick={startDraw}>
            <Icon name="edit" className="ico" /><span>{tr(points ? { en: 'Redraw boundary', te: 'సరిహద్దు మళ్ళీ గీయండి' } : { en: 'Start drawing', te: 'గీయడం ప్రారంభించండి' })}</span>
          </button>
        ) : (
          <>
            <button className="btn sm btn-orange" type="button" onClick={finish}><Icon name="check" className="ico" /><span>{tr({ en: 'Join & finish', te: 'కలిపి ముగించండి' })}</span></button>
            <button className="btn sm" type="button" onClick={undo}><Icon name="reset" className="ico" /><span>{tr({ en: 'Undo point', te: 'బిందువు రద్దు' })}</span></button>
          </>
        )}
        {(points || drawing) && (
          <button className="btn sm btn-ghost" type="button" onClick={clear}><Icon name="trash" className="ico" /><span>{tr({ en: 'Clear', te: 'తుడిచివేయి' })}</span></button>
        )}
      </div>
      <p className="muted pmap-hint">
        {msg ? tr(msg) : tr(drawing
          ? { en: 'Tap each corner of your field in order. Tap the first point (or “Join & finish”) to close the shape.', te: 'మీ పొలం ప్రతి మూలను వరుసగా నొక్కండి. ఆకారం మూసేందుకు మొదటి బిందువును (లేదా “కలిపి ముగించండి”) నొక్కండి.' }
          : points
            ? { en: 'Drag a corner to move it, drag a middle dot to add a corner, right-click / long-press a corner to remove it.', te: 'మూలను జరపడానికి లాగండి, కొత్త మూలకు మధ్య చుక్కను లాగండి, తొలగించడానికి మూలపై రైట్-క్లిక్ / ఎక్కువసేపు నొక్కండి.' }
            : { en: 'Location updated automatically via GPS. Or search village above, then press “Start drawing”. Switch Satellite / Map at top right.', te: 'GPS ద్వారా స్థానం స్వయంచాలకంగా నవీకరించబడుతుంది. లేదా పైన గ్రామం పేరు వెతికి, “గీయడం ప్రారంభించండి” నొక్కండి.' })}
      </p>
    </div>
  );
}
