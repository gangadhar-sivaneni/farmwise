// Farm/plot data source. TODAY: browser localStorage. LATER: replace the bodies of listPlots,
// savePlot and deletePlot with calls to your backend (e.g. fetch(`${API_BASE}/plots`)) — the
// FarmContext and UI only use these async functions, so nothing else needs to change.
import { FARMS, daysSince } from '../data/farmsData';
import { byId } from '../data/cropsData';
import { areaFromSqm, SQM_PER_ACRE, toSvgPoints, centroidOf } from '../utils/geo';

const PLOTS_KEY = 'fw.plots.v1';
const ACTIVE_KEY = 'fw.farm'; // same key the old farm selector used, so the last selection carries over

/**
 * Plot record (backend-ready shape):
 * { id, name, location: { village, district, state }, lat, lng,
 *   polygon: [[lat, lng], ...] | null, areaSqm, areaAcres, areaHectares, perimeterM | null,
 *   areaSource: 'drawn' | 'uploaded' | 'manual' | 'demo', crop, sown (YYYY-MM-DD), irrigation,
 *   surveyNo, notes, documents: [{ name, type, size }], soilReport: { name, size, uploadedAt } | null,
 *   createdAt, updatedAt, isDemo }
 */
const demoPlot = (id, farm) => {
  const acres = farm.plots.reduce((a, p) => a + p.acres, 0);
  const [district, state] = farm.loc.en.split(',').map((s) => s.trim());
  return {
    id, isDemo: true, name: farm.name.en.split('·')[0].trim(),
    location: { village: '', district: district.replace(/ district$/i, ''), state: state || 'Telangana' },
    lat: farm.coords.lat, lng: farm.coords.lon, polygon: null,
    areaSqm: acres * SQM_PER_ACRE, areaAcres: acres, areaHectares: (acres * SQM_PER_ACRE) / 10000, perimeterM: null,
    areaSource: 'demo', crop: farm.plots[0].crop, sown: farm.plots[0].sown, irrigation: 'borewell',
    surveyNo: '', notes: '', documents: [], soilReport: null,
    createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
  };
};

const read = (k, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; }
};
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full/blocked */ } };

/** Synchronous first paint from the local cache (seeded with the two demo farms). */
export function getCachedPlots() {
  const saved = read(PLOTS_KEY, null);
  return Array.isArray(saved) && saved.length ? saved : [demoPlot('a', FARMS.a), demoPlot('b', FARMS.b)];
}
export const getCachedActiveId = () => read(ACTIVE_KEY, 'a');
export const saveActiveId = (id) => write(ACTIVE_KEY, id);

export async function listPlots() {
  return getCachedPlots();
}
export async function savePlot(plot) {
  const now = new Date().toISOString();
  const plots = getCachedPlots();
  const rec = { ...plot, id: plot.id || `plot-${Date.now().toString(36)}`, updatedAt: now, createdAt: plot.createdAt || now };
  const next = plots.some((p) => p.id === rec.id) ? plots.map((p) => (p.id === rec.id ? rec : p)) : [...plots, rec];
  write(PLOTS_KEY, next);
  return rec;
}
export async function deletePlot(id) {
  const next = getCachedPlots().filter((p) => p.id !== id);
  write(PLOTS_KEY, next);
  return next;
}

/** Build a plot record from area + (optional) boundary. */
export function withArea(plot, { sqm, perimeterM = null }) {
  const a = areaFromSqm(sqm);
  return { ...plot, areaSqm: a.sqm, areaAcres: a.acres, areaHectares: a.hectares, perimeterM };
}

export const SOURCE_LABEL = {
  drawn: { en: 'Drawn on map', te: 'మ్యాప్‌పై గీసినది' },
  uploaded: { en: 'From uploaded file', te: 'అప్‌లోడ్ ఫైల్ నుండి' },
  manual: { en: 'Manually entered', te: 'చేతితో నమోదు' },
  demo: { en: 'Sample farm', te: 'నమూనా పొలం' },
};

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const CROP_FILL = { rice: '#F2D22E', cotton: '#FF5A01', maize: '#F2D22E', chilli: '#FF5A01', turmeric: '#F2D22E', groundnut: '#CEE2E3' };

/**
 * The shape every dashboard page already reads as `activeFarm` (name, loc, coords, plots[], alert…),
 * built from the selected plot so all pages follow the selection.
 */
export function toFarmView(plot) {
  if (!plot) return null;
  const loc = [plot.location?.village, plot.location?.district, plot.location?.state].filter(Boolean).join(', ') || 'Location not set';
  const demo = plot.isDemo && plot.areaSource === 'demo' ? FARMS[plot.id] : null;
  const crop = byId(plot.crop);
  const subPlots = demo
    ? demo.plots
    : [{
        crop: plot.crop, label: 'A', acres: round(plot.areaAcres), sown: plot.sown, fill: CROP_FILL[plot.crop] || '#F2D22E',
        poly: plot.polygon?.length >= 3 ? toSvgPoints(plot.polygon) : '60,40 340,40 340,210 60,210',
        get day() { return daysSince(plot.sown); },
      }];
  return {
    id: plot.id,
    // demo farms keep their Telugu name until the farmer renames them
    name: plot.isDemo && FARMS[plot.id] && plot.name === FARMS[plot.id].name.en.split('·')[0].trim()
      ? { en: plot.name, te: FARMS[plot.id].name.te.split('·')[0].trim() }
      : { en: plot.name, te: plot.name },
    loc: { en: loc, te: loc },
    coords: { lat: plot.lat, lon: plot.lng },
    temp: demo?.temp, cond: demo?.cond,
    plots: subPlots,
    areaAcres: plot.areaAcres,
    areaSource: plot.areaSource,
    alert: demo?.alert || {
      t: { en: `Field check · ${crop?.name.en || 'crop'}`, te: `పొలం పరిశీలన · ${crop?.name.te || 'పంట'}` },
      b: {
        en: `Walk the field and look for ${crop?.pests?.en?.join(', ') || 'pest and disease signs'}.`,
        te: `పొలంలో నడిచి ${crop?.pests?.te?.join(', ') || 'పురుగు, తెగులు లక్షణాలు'} ఉన్నాయేమో చూడండి.`,
      },
    },
    record: plot,
  };
}

/** Where to centre a map for a plot. */
export const plotCenter = (plot) => (plot?.polygon?.length >= 3 ? centroidOf(plot.polygon) : [plot?.lat ?? 17.9689, plot?.lng ?? 79.5941]);
