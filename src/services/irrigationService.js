// Illustrative crop water need: ET₀ × crop coefficient (Kc, FAO-56 typical values) × plot area.
// 1 mm of water over 1 m² = 1 litre. An estimate only — not a measured soil-water balance.
// LATER: replace estimateIrrigation's body with a call to an agronomy/irrigation API.
import { SQM_PER_ACRE } from '../utils/geo.js';

// [initial, mid-season, late-season] Kc — FAO Irrigation & Drainage Paper 56, Table 12 (typical)
const KC = {
  rice: [1.05, 1.2, 0.9],
  cotton: [0.35, 1.15, 0.7],
  maize: [0.3, 1.2, 0.6],
  chilli: [0.6, 1.05, 0.9],
  turmeric: [0.5, 1.05, 0.9],
  groundnut: [0.4, 1.15, 0.6],
};

/** fraction of the season elapsed (0..1) -> Kc; ponytail: stepwise curve, use FAO-56 linear stages if precision matters */
export function kcFor(cropId, fraction) {
  const [ini, mid, end] = KC[cropId] || [0.5, 1.05, 0.8];
  if (fraction < 0.2) return ini;
  if (fraction < 0.4) return (ini + mid) / 2;
  if (fraction < 0.8) return mid;
  return end;
}

/** { litres, mm, kc } for one day, net of rain (80% of rain counted as effective). */
export function estimateIrrigation({ cropId, acres, et0, rainMm = 0, fraction = 0.5 }) {
  if (!(et0 >= 0) || !(acres > 0)) return null;
  const kc = kcFor(cropId, fraction);
  const mm = Math.max(0, et0 * kc - 0.8 * (rainMm || 0));
  return { kc, mm, litres: mm * acres * SQM_PER_ACRE };
}

// Self-check: node src/services/irrigationService.js
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('irrigationService.js')) {
  const r = estimateIrrigation({ cropId: 'maize', acres: 1, et0: 5, fraction: 0.5 });
  if (Math.abs(r.mm - 6) > 1e-9 || Math.abs(r.litres - 6 * 4046.8564224) > 1e-6) throw new Error(JSON.stringify(r));
  if (estimateIrrigation({ cropId: 'maize', acres: 1, et0: 5, rainMm: 20 }).litres !== 0) throw new Error('rain should cover need');
  console.log('irrigation self-check ok', Math.round(r.litres), 'L/acre/day');
}
