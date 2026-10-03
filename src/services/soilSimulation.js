// Simulated soil profile from a location — ILLUSTRATIVE ONLY, not a laboratory soil test.
// Deterministic: the same coordinates (rounded to ~100 m) + the same sample number always
// give the same values. "Refresh Sample" just bumps the sample number.
// Rating bands follow the low/medium/high bands commonly used on Indian Soil Health Cards.

export const DEMO_LOCATION = { latitude: 17.9689, longitude: 79.5941, label: 'Demo location · Warangal, Telangana' };

// FNV-1a hash -> 32-bit seed
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// mulberry32 seeded PRNG
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const TEXTURES = ['Sandy loam', 'Loam', 'Clay loam', 'Clay', 'Red sandy loam', 'Black clay (Vertisol)'];

// key, label, unit, [low|medium boundary, medium|high boundary], bar max, decimals
export const PARAMS = [
  { k: 'oc', label: 'Organic Carbon', unit: '%', bands: [0.5, 0.75], max: 1.5, d: 2 },
  { k: 'n', label: 'Nitrogen (N)', unit: 'kg/ha', bands: [280, 560], max: 700, d: 0 },
  { k: 'p', label: 'Phosphorus (P)', unit: 'kg/ha', bands: [10, 25], max: 40, d: 1 },
  { k: 'k', label: 'Potassium (K)', unit: 'kg/ha', bands: [110, 280], max: 450, d: 0 },
  { k: 's', label: 'Sulphur (S)', unit: 'mg/kg', bands: [10, 20], max: 35, d: 1 },
  { k: 'zn', label: 'Zinc (Zn)', unit: 'mg/kg', bands: [0.6, 1.2], max: 2.5, d: 2 },
  { k: 'fe', label: 'Iron (Fe)', unit: 'mg/kg', bands: [4.5, 9], max: 20, d: 1 },
  { k: 'mn', label: 'Manganese (Mn)', unit: 'mg/kg', bands: [2, 4], max: 12, d: 1 },
  { k: 'cu', label: 'Copper (Cu)', unit: 'mg/kg', bands: [0.2, 0.4], max: 2, d: 2 },
  { k: 'b', label: 'Boron (B)', unit: 'mg/kg', bands: [0.5, 1], max: 2, d: 2 },
];

export const levelOf = (v, [lo, hi]) => (v < lo ? 'low' : v <= hi ? 'medium' : 'high');

// Crop preferences: pH window + textures that suit it (ids match src/data/cropsData.js)
const CROP_NEEDS = {
  rice: { ph: [5.5, 7.5], tex: ['Clay', 'Clay loam', 'Black clay (Vertisol)'] },
  cotton: { ph: [6.0, 8.2], tex: ['Black clay (Vertisol)', 'Clay loam', 'Loam'] },
  maize: { ph: [5.8, 7.8], tex: ['Loam', 'Sandy loam', 'Red sandy loam', 'Clay loam'] },
  chilli: { ph: [6.0, 7.5], tex: ['Loam', 'Clay loam', 'Black clay (Vertisol)', 'Red sandy loam'] },
  turmeric: { ph: [5.0, 7.5], tex: ['Loam', 'Red sandy loam', 'Sandy loam', 'Clay loam'] },
  groundnut: { ph: [6.0, 7.5], tex: ['Sandy loam', 'Red sandy loam', 'Loam'] },
};

/** Simulated soil profile for a location. `sample` > 0 gives a different illustrative sample. */
export function simulateSoil(latitude, longitude, sample = 0) {
  const r = rng(seedFrom(`${latitude.toFixed(3)},${longitude.toFixed(3)}#${sample}`));
  const between = (lo, hi) => lo + r() * (hi - lo);

  const texture = TEXTURES[Math.floor(r() * TEXTURES.length)];
  const clayey = /Clay/.test(texture);
  const ph = round(clamp(between(5.2, 8.4) + (clayey ? 0.3 : -0.2), 4.5, 9), 1);
  const ec = round(between(0.08, 1.4) + (ph > 8 ? 0.4 : 0), 2); // dS/m; alkaline soils tend to be more saline
  const oc = round(between(0.25, 1.1) + (clayey ? 0.1 : 0), 2);
  const highPh = ph > 7.5; // micronutrients are less available in alkaline soils

  const values = {
    oc,
    n: round(between(150, 380) + oc * 220, 0), // nitrogen tracks organic carbon
    p: round(between(5, 34), 1),
    k: round(between(80, 380) + (clayey ? 40 : 0), 0),
    s: round(between(5, 30), 1),
    zn: round(between(0.3, 2) * (highPh ? 0.65 : 1), 2),
    fe: round(between(2.5, 18) * (highPh ? 0.6 : 1), 1),
    mn: round(between(1, 10) * (highPh ? 0.7 : 1), 1),
    cu: round(between(0.15, 1.6), 2),
    b: round(between(0.25, 1.6), 2),
  };

  // Fertility index from the major nutrients + organic carbon (low=1, medium=2, high=3)
  const score = { low: 1, medium: 2, high: 3 };
  const majors = ['oc', 'n', 'p', 'k'].map((k) => score[levelOf(values[k], PARAMS.find((p) => p.k === k).bands)]);
  const index = Math.round(((majors.reduce((a, b) => a + b, 0) / majors.length - 1) / 2) * 100);
  const fertility = index < 40 ? 'Low' : index < 70 ? 'Medium' : 'High';

  const crops = Object.entries(CROP_NEEDS).map(([id, need]) => {
    const phOk = ph >= need.ph[0] && ph <= need.ph[1];
    const texOk = need.tex.includes(texture);
    const fit = phOk && texOk && ec < 1.5 ? 'good' : phOk || texOk ? 'fair' : 'poor';
    return { id, fit };
  });
  const order = { good: 0, fair: 1, poor: 2 };
  crops.sort((a, b) => order[a.fit] - order[b.fit]);

  return { latitude, longitude, sample, texture, ph, ec, values, index, fertility, crops, simulated: true };
}

// Self-check: node src/services/soilSimulation.js
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('soilSimulation.js')) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const a = simulateSoil(17.9689, 79.5941);
  assert(JSON.stringify(a) === JSON.stringify(simulateSoil(17.9689, 79.5941)), 'same coords must match');
  const soilOnly = ({ latitude, longitude, ...rest }) => JSON.stringify(rest);
  assert(soilOnly(a) === soilOnly(simulateSoil(17.96891, 79.59412)), 'same ~100 m cell must match');
  assert(JSON.stringify(a) !== JSON.stringify(simulateSoil(28.6139, 77.209)), 'different places must differ');
  assert(JSON.stringify(a) !== JSON.stringify(simulateSoil(17.9689, 79.5941, 1)), 'refresh sample must differ');
  for (let i = 0; i < 500; i++) {
    const s = simulateSoil(8 + i * 0.05, 68 + i * 0.06, i % 3);
    assert(s.ph >= 4.5 && s.ph <= 9 && s.ec > 0 && s.index >= 0 && s.index <= 100, 'range');
    assert(Object.values(s.values).every((v) => Number.isFinite(v) && v >= 0), 'values finite');
  }
  console.log('soilSimulation self-check ok');
}
