// Reads land files in the browser. Boundaries come ONLY from files that contain coordinates
// (GeoJSON, KML, CSV). PDFs/images are documents: we try to read text fields, never a boundary.
import { cleanPoints } from './geo.js';

const err = (en, te) => Object.assign(new Error(en), { msg: { en, te } });

function firstPolygonFromGeoJSON(gj) {
  const geoms = [];
  const walk = (o) => {
    if (!o) return;
    if (o.type === 'FeatureCollection') o.features?.forEach(walk);
    else if (o.type === 'Feature') walk(o.geometry);
    else if (o.type === 'GeometryCollection') o.geometries?.forEach(walk);
    else geoms.push(o);
  };
  walk(gj);
  for (const g of geoms) {
    if (g.type === 'Polygon') return g.coordinates[0];
    if (g.type === 'MultiPolygon') return g.coordinates[0][0];
  }
  return null;
}

export function parseGeoJSON(text) {
  let gj;
  try { gj = JSON.parse(text); } catch { throw err('This file is not valid GeoJSON.', 'ఈ ఫైల్ సరైన GeoJSON కాదు.'); }
  const ring = firstPolygonFromGeoJSON(gj);
  if (!ring) throw err('No field boundary (polygon) was found in this GeoJSON file.', 'ఈ GeoJSON ఫైల్‌లో పొలం సరిహద్దు (పాలిగాన్) కనబడలేదు.');
  const name = gj.features?.[0]?.properties?.name || gj.properties?.name || '';
  return { kind: 'polygon', points: cleanPoints(ring.map(([lng, lat]) => [lat, lng])), name };
}

export function parseKML(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw err('This file is not valid KML.', 'ఈ ఫైల్ సరైన KML కాదు.');
  const polygon = doc.getElementsByTagName('Polygon')[0];
  const coordsEl = (polygon || doc).getElementsByTagName('coordinates')[0];
  const pts = (coordsEl?.textContent || '').trim().split(/\s+/).filter(Boolean)
    .map((t) => t.split(',').map(Number)).filter((c) => c.length >= 2 && c.every(Number.isFinite))
    .map(([lng, lat]) => [lat, lng]);
  if (pts.length < 3) throw err('No field boundary (polygon coordinates) was found in this KML file.', 'ఈ KML ఫైల్‌లో పొలం సరిహద్దు నిరూపకాలు కనబడలేదు.');
  const name = doc.getElementsByTagName('Placemark')[0]?.getElementsByTagName('name')[0]?.textContent?.trim() || '';
  return { kind: 'polygon', points: cleanPoints(pts), name };
}

export function parseCSV(text) {
  const rows = text.split(/\r?\n/).map((r) => r.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''))).filter((r) => r.some(Boolean));
  const head = rows[0]?.map((h) => h.toLowerCase()) || [];
  const latI = head.findIndex((h) => /^(lat|latitude|y)$/.test(h));
  const lngI = head.findIndex((h) => /^(lon|lng|long|longitude|x)$/.test(h));
  if (latI < 0 || lngI < 0) throw err('CSV needs "latitude" and "longitude" column headings.', 'CSVలో "latitude", "longitude" శీర్షికలు ఉండాలి.');
  const pts = rows.slice(1).map((r) => [Number(r[latI]), Number(r[lngI])]);
  const bad = pts.findIndex(([lat, lng]) => !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180);
  if (bad >= 0) throw err(`Row ${bad + 2} has an invalid latitude/longitude.`, `వరుస ${bad + 2}లో అక్షాంశం/రేఖాంశం సరైనవి కావు.`);
  if (pts.length < 3) throw err('The CSV needs at least 3 corner points.', 'CSVలో కనీసం 3 మూల బిందువులు ఉండాలి.');
  return { kind: 'polygon', points: cleanPoints(pts), name: '' };
}

/** Best-effort text from a PDF: reads text strings in plain and Flate-compressed content streams. */
async function pdfText(buffer) {
  const bytes = new Uint8Array(buffer);
  const latin = new TextDecoder('latin1').decode(bytes);
  const chunks = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(latin))) {
    const start = m.index + m[0].length;
    const end = latin.indexOf('endstream', start);
    if (end < 0) break;
    const dict = latin.slice(Math.max(0, m.index - 300), m.index);
    let data = bytes.subarray(start, end);
    if (/FlateDecode/.test(dict) && typeof DecompressionStream !== 'undefined') {
      try {
        const out = new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate')));
        data = new Uint8Array(await out.arrayBuffer());
      } catch { continue; }
    }
    const s = new TextDecoder('latin1').decode(data);
    for (const t of s.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:[^\]])*)\]\s*TJ/g)) {
      const piece = t[1] ?? (t[2].match(/\(((?:\\.|[^\\)])*)\)/g) || []).map((x) => x.slice(1, -1)).join('');
      chunks.push(piece.replace(/\\([()\\])/g, '$1'));
    }
    re.lastIndex = end;
  }
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

/** Pull survey no., village, district and area out of document text, when present. */
export function extractLandFields(text) {
  const grab = (re) => text.match(re)?.[1]?.trim() || '';
  const area = text.match(/(\d+(?:\.\d+)?)\s*(acres?|ac\.?|hectares?|ha\b|guntas?|cents?|sq\.?\s*m(?:etres|eters)?)/i);
  const unitOf = (u) => (/^ac/i.test(u) ? 'acres' : /^h/i.test(u) ? 'hectares' : /^g/i.test(u) ? 'guntas' : /^c/i.test(u) ? 'cents' : 'sqm');
  return {
    surveyNo: grab(/survey\s*(?:no\.?|number|#)?\s*[:\-.]?\s*([0-9][\w/\-]*)/i),
    // a name ends at the next label, a number, punctuation or the end (PDF text has no reliable spacing)
    village: grab(/village\s*[:\-]?\s*([A-Za-z][A-Za-z .]{1,40}?)(?=\s*(?:[,;|\n\d]|$)|\s+(?:extent|area|survey|mandal|tehsil|taluk|state|district|khata|patta)\b)/i),
    district: grab(/district\s*[:\-]?\s*([A-Za-z][A-Za-z .]{1,40}?)(?=\s*(?:[,;|\n\d]|$)|\s+(?:extent|area|survey|mandal|tehsil|taluk|state|village|khata|patta)\b)/i),
    area: area ? area[1] : '',
    areaUnit: area ? unitOf(area[2]) : 'acres',
  };
}

/** Parse any supported land file. */
export async function parseLandFile(file) {
  const name = file.name.toLowerCase();
  if (/\.(geo)?json$/.test(name)) return parseGeoJSON(await file.text());
  if (name.endsWith('.kml')) return parseKML(await file.text());
  if (name.endsWith('.csv')) return parseCSV(await file.text());
  const doc = { name: file.name, type: file.type || 'application/octet-stream', size: file.size };
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const text = await pdfText(await file.arrayBuffer());
    const fields = text ? extractLandFields(text) : {};
    const found = Object.entries(fields).filter(([k, v]) => v && k !== 'areaUnit').length;
    return { kind: 'document', doc, fields, readText: found > 0 };
  }
  if (file.type.startsWith('image/')) return { kind: 'document', doc, fields: {}, readText: false };
  throw err('Unsupported file. Use GeoJSON, KML, CSV, PDF or an image.', 'ఈ ఫైల్ రకం మద్దతు లేదు. GeoJSON, KML, CSV, PDF లేదా చిత్రం వాడండి.');
}

// Self-check: node src/utils/landFileParser.js
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('landFileParser.js')) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const gj = parseGeoJSON(JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'North field' }, geometry: { type: 'Polygon', coordinates: [[[79.59, 17.97], [79.59, 17.9709], [79.590945, 17.9709], [79.59, 17.97]]] } }] }));
  assert(gj.points.length === 3 && gj.points[0][0] === 17.97 && gj.name === 'North field', 'geojson');
  const csv = parseCSV('latitude,longitude\n17.97,79.59\n17.9709,79.59\n17.9709,79.590945\n');
  assert(csv.points.length === 3 && csv.points[1][0] === 17.9709, 'csv');
  let threw = false; try { parseCSV('a,b\n1,2'); } catch { threw = true; } assert(threw, 'csv without headers must fail');
  const f = extractLandFields('Pattadar passbook Survey No: 123/A Village: Hasanparthy Mandal: Hanamkonda District: West Godavari Extent 2.35 Acres');
  assert(f.surveyNo === '123/A' && f.village === 'Hasanparthy' && f.district === 'West Godavari' && f.area === '2.35' && f.areaUnit === 'acres', JSON.stringify(f));
  console.log('landFileParser self-check ok');
}
