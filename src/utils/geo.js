// Land geometry: geodesic area/perimeter from real latitude/longitude (Turf), never from pixels.
import turfArea from '@turf/area';
import turfLength from '@turf/length';
import kinks from '@turf/kinks';

export const SQM_PER_ACRE = 4046.8564224;
export const SQM_PER_HECTARE = 10000;
export const SQM_PER_GUNTA = SQM_PER_ACRE / 40; // common unit on Telangana/AP land records
export const SQM_PER_CENT = SQM_PER_ACRE / 100;

export const AREA_UNITS = {
  acres: { label: { en: 'Acres', te: 'ఎకరాలు' }, sqm: SQM_PER_ACRE },
  hectares: { label: { en: 'Hectares', te: 'హెక్టార్లు' }, sqm: SQM_PER_HECTARE },
  guntas: { label: { en: 'Guntas', te: 'గుంటలు' }, sqm: SQM_PER_GUNTA },
  cents: { label: { en: 'Cents', te: 'సెంట్లు' }, sqm: SQM_PER_CENT },
  sqm: { label: { en: 'Square metres', te: 'చదరపు మీటర్లు' }, sqm: 1 },
};

export const toSqm = (value, unit) => Number(value) * (AREA_UNITS[unit]?.sqm ?? 1);
export const areaFromSqm = (sqm) => ({
  sqm,
  acres: sqm / SQM_PER_ACRE,
  hectares: sqm / SQM_PER_HECTARE,
});

/** points: [[lat, lng], ...] (open or closed) -> closed GeoJSON polygon ([lng, lat] order). */
export function toGeoJSON(points) {
  const ring = points.map(([lat, lng]) => [lng, lat]);
  const [f, l] = [ring[0], ring[ring.length - 1]];
  if (f[0] !== l[0] || f[1] !== l[1]) ring.push([...f]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

/** Drop a repeated closing point and consecutive duplicates. */
export function cleanPoints(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push([Number(p[0]), Number(p[1])]);
  }
  if (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
}

/** Area (m², acres, ha) and perimeter (m) of a field boundary. */
export function measure(points) {
  const pts = cleanPoints(points);
  if (pts.length < 3) return null;
  const poly = toGeoJSON(pts);
  const sqm = turfArea(poly);
  const ring = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: poly.geometry.coordinates[0] } };
  return { ...areaFromSqm(sqm), perimeterM: turfLength(ring, { units: 'kilometers' }) * 1000 };
}

export const centroidOf = (points) => {
  const pts = cleanPoints(points);
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
};

/** Farmer-friendly validation. Returns null when valid, else a { en, te } message. */
export function validateBoundary(points) {
  const pts = cleanPoints(points || []);
  if (pts.length < 3) return { en: 'Mark at least 3 corners of your field, then join the last point to the first.', te: 'మీ పొలం కనీసం 3 మూలలు గుర్తించి, చివరి బిందువును మొదటిదానితో కలపండి.' };
  if (pts.some(([lat, lng]) => !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
    return { en: 'Some boundary points have invalid coordinates.', te: 'కొన్ని సరిహద్దు బిందువుల నిరూపకాలు సరైనవి కావు.' };
  }
  if (kinks(toGeoJSON(pts)).features.length) {
    return { en: 'The boundary lines cross each other. Move the corners so the edges do not cross.', te: 'సరిహద్దు గీతలు ఒకదానినొకటి దాటుతున్నాయి. అంచులు దాటకుండా మూలలను జరపండి.' };
  }
  const { sqm } = measure(pts);
  if (sqm < 10) return { en: 'This area is too small to be a field. Check the corner points.', te: 'ఈ విస్తీర్ణం పొలానికి చాలా చిన్నది. మూల బిందువులను పరిశీలించండి.' };
  if (sqm > 5000 * SQM_PER_HECTARE) return { en: 'This area is unusually large for one plot. Check the boundary.', te: 'ఒక ప్లాట్‌కు ఈ విస్తీర్ణం చాలా పెద్దది. సరిహద్దును పరిశీలించండి.' };
  return null;
}

/** Fit a lat/lng boundary into an SVG box (for the overview field map). */
export function toSvgPoints(points, w = 400, h = 250, pad = 24) {
  const pts = cleanPoints(points);
  const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180); // shrink longitude by latitude so shapes keep their proportions
  const spanX = (maxLng - minLng) * kx || 1e-9, spanY = maxLat - minLat || 1e-9;
  const s = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const ox = (w - spanX * s) / 2, oy = (h - spanY * s) / 2;
  return pts.map(([lat, lng]) => `${(ox + (lng - minLng) * kx * s).toFixed(1)},${(oy + (maxLat - lat) * s).toFixed(1)}`).join(' ');
}

// Self-check: node src/utils/geo.js
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('geo.js')) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  // ~100 m x 100 m square near Warangal: 0.0009° lat ≈ 99.5 m; 0.000945° lng at 17.97°N ≈ 100.1 m
  const sq = [[17.97, 79.59], [17.9709, 79.59], [17.9709, 79.590945], [17.97, 79.590945]];
  const m = measure(sq);
  assert(Math.abs(m.sqm - 9960) < 150, `area ${m.sqm}`);
  assert(Math.abs(m.acres - m.sqm / 4046.8564224) < 1e-9 && Math.abs(m.hectares - m.sqm / 10000) < 1e-9, 'conversions');
  assert(Math.abs(m.perimeterM - 399) < 6, `perimeter ${m.perimeterM}`);
  assert(JSON.stringify(measure([...sq, sq[0]])) === JSON.stringify(m), 'closed ring == open ring');
  assert(validateBoundary(sq) === null, 'valid square');
  assert(validateBoundary(sq.slice(0, 2)), 'too few points');
  assert(validateBoundary([sq[0], sq[2], sq[1], sq[3]]), 'bow-tie must be rejected');
  assert(validateBoundary([[95, 79], [17, 79], [17, 80]]), 'bad latitude');
  assert(Math.abs(toSqm(1, 'acres') - 4046.8564224) < 1e-9 && toSqm(40, 'guntas') === toSqm(1, 'acres'), 'units');
  console.log('geo self-check ok', Math.round(m.sqm), 'm²', m.acres.toFixed(3), 'ac', Math.round(m.perimeterM), 'm');
}
