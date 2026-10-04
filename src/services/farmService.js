// Farm/plot data source. Scoped to the signed-in user.
import { daysSince } from '../data/farmsData';
import { ukey, currentUser } from './authService';
import { byId } from '../data/cropsData';
import { areaFromSqm, SQM_PER_ACRE, toSvgPoints, centroidOf } from '../utils/geo';

// Every key is scoped to the signed-in user (farmwise_user_<id>_plots …): accounts never share plots.
const PLOTS = 'plots';
const ACTIVE = 'active_plot';

const read = (k, fallback) => {
  if (!currentUser()) return fallback;
  try {
    const v = JSON.parse(localStorage.getItem(ukey(k)));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (k, v) => {
  if (!currentUser()) throw new Error('Sign in to save farm data');
  try {
    localStorage.setItem(ukey(k), JSON.stringify(v));
  } catch {
    /* storage full/blocked */
  }
};

/** The signed-in user's plots. Returns strictly only what the user has added (empty if none). */
export function getCachedPlots() {
  const user = currentUser();
  if (!user) return [];
  const saved = read(PLOTS, null);
  return Array.isArray(saved) ? saved : [];
}

export const getCachedActiveId = () => read(ACTIVE, null);
export const saveActiveId = (id) => write(ACTIVE, id);
export const resetPlots = () => {
  localStorage.removeItem(ukey(PLOTS));
};

export async function listPlots() {
  return getCachedPlots();
}

export async function savePlot(plot) {
  const now = new Date().toISOString();
  const plots = getCachedPlots();
  const rec = {
    ...plot,
    id: plot.id || `plot-${Date.now().toString(36)}`,
    updatedAt: now,
    createdAt: plot.createdAt || now,
  };
  const next = plots.some((p) => p.id === rec.id)
    ? plots.map((p) => (p.id === rec.id ? rec : p))
    : [...plots, rec];
  write(PLOTS, next);
  return rec;
}

export async function deletePlot(id) {
  const next = getCachedPlots().filter((p) => p.id !== id);
  write(PLOTS, next);
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
const CROP_FILL = {
  rice: '#F2D22E',
  cotton: '#FF5A01',
  maize: '#F2D22E',
  chilli: '#FF5A01',
  turmeric: '#F2D22E',
  groundnut: '#CEE2E3',
};

/**
 * Shape for dashboard pages: activeFarm representation built directly from selected plot.
 */
export function toFarmView(plot) {
  if (!plot) return null;
  const loc =
    [plot.location?.village, plot.location?.district, plot.location?.state]
      .filter(Boolean)
      .join(', ') || 'Location not set';
  const crop = byId(plot.crop);
  const subPlots = [
    {
      crop: plot.crop,
      label: 'A',
      acres: round(plot.areaAcres),
      sown: plot.sown,
      fill: CROP_FILL[plot.crop] || '#F2D22E',
      poly: plot.polygon?.length >= 3 ? toSvgPoints(plot.polygon) : '60,40 340,40 340,210 60,210',
      get day() {
        return daysSince(plot.sown);
      },
    },
  ];

  return {
    id: plot.id,
    name: { en: plot.name, te: plot.name },
    loc: { en: loc, te: loc },
    coords: { lat: plot.lat, lon: plot.lng },
    temp: 28,
    cond: { en: 'Sunny', te: 'ఎండ' },
    plots: subPlots,
    areaAcres: plot.areaAcres,
    areaSource: plot.areaSource,
    alert: {
      t: {
        en: `Field check · ${crop?.name.en || 'crop'}`,
        te: `పొలం పరిశీలన · ${crop?.name.te || 'పంట'}`,
      },
      b: {
        en: `Walk the field and look for ${crop?.pests?.en?.join(', ') || 'pest and disease signs'}.`,
        te: `పొలంలో నడిచి ${crop?.pests?.te?.join(', ') || 'పురుగు, తెగులు లక్షణాలు'} ఉన్నాయేమో చూడండి.`,
      },
    },
    record: plot,
  };
}

/** Where to centre a map for a plot. */
export const plotCenter = (plot) =>
  plot?.polygon?.length >= 3
    ? centroidOf(plot.polygon)
    : [plot?.lat ?? 17.9689, plot?.lng ?? 79.5941];
