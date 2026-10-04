import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { satelliteLayer } from './tiles';

/** Real satellite view of the selected plot: its drawn boundary, or a pin at its location. */
export default function FieldMap({ plot, label }) {
  const box = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    const m = L.map(box.current, { scrollWheelZoom: false, zoomControl: false });
    satelliteLayer().addTo(m);
    L.control.zoom({ position: 'topright' }).addTo(m); // top-left holds the plot chips
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  const key = JSON.stringify([plot?.polygon, plot?.lat, plot?.lng, label]);
  useEffect(() => {
    const m = map.current;
    if (!m || !plot) return;
    const shape = plot.polygon?.length >= 3
      ? L.polygon(plot.polygon, { color: '#FF5A01', weight: 3, fillColor: '#F2D22E', fillOpacity: 0.25, dashArray: '6 5' })
      : L.circleMarker([plot.lat, plot.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#FF5A01', fillOpacity: 1 });
    // Leaflet inserts a string tooltip as HTML; the label holds the user's plot name, so pass plain text
    const tip = document.createElement('span');
    tip.textContent = label;
    shape.bindTooltip(tip, { permanent: true, direction: 'center', className: 'fm-label' }).addTo(m);
    if (plot.polygon?.length >= 3) m.fitBounds(shape.getBounds(), { padding: [28, 28], maxZoom: 18 });
    else m.setView([plot.lat, plot.lng], 16);
    // the card may still be laying out on first paint
    const t = setTimeout(() => m.invalidateSize(), 200);
    return () => { clearTimeout(t); shape.remove(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="fm-box" />;
}
