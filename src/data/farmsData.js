export const FARMS = {
  a: {
    name: { en: 'My Farm · Telangana', te: 'నా పొలం · తెలంగాణ' },
    loc: { en: 'Warangal district, Telangana', te: 'వరంగల్ జిల్లా, తెలంగాణ' },
    coords: { lat: 17.9784, lon: 79.5941 },
    temp: 29,
    cond: { en: 'Partly cloudy', te: 'పాక్షికంగా మేఘావృతం' },
    plots: [
      { crop: 'maize', label: 'A', acres: 2.5, sown: '2026-07-21', fill: '#F2D22E', poly: '40,40 200,22 214,128 50,146' },
      { crop: 'cotton', label: 'B', acres: 3, sown: '2026-08-06', fill: '#FF5A01', poly: '226,24 372,40 360,170 236,140' },
      { crop: 'groundnut', label: 'C', acres: 1, sown: '2026-06-29', fill: '#CEE2E3', poly: '54,160 216,142 222,226 62,234' }
    ],
    alert: {
      t: { en: 'Fall armyworm risk · Maize', te: 'కత్తెర పురుగు ప్రమాదం · మొక్కజొన్న' },
      b: {
        en: 'Humid nights favour egg-laying this week. Check leaf whorls in Plot A for ragged holes.',
        te: 'ఈ వారం తేమ రాత్రులు గుడ్లు పెట్టడానికి అనుకూలం. ప్లాట్ Aలో ఆకు సుడులు చూడండి.'
      }
    }
  },
  b: {
    name: { en: 'Riverside Plot · Khammam', te: 'నదీతీర ప్లాట్ · ఖమ్మం' },
    loc: { en: 'Khammam district, Telangana', te: 'ఖమ్మం జిల్లా, తెలంగాణ' },
    coords: { lat: 17.2473, lon: 80.1514 },
    temp: 31,
    cond: { en: 'Humid, hazy sun', te: 'తేమతో మసక ఎండ' },
    plots: [
      { crop: 'rice', label: 'A', acres: 3, sown: '2026-08-16', fill: '#F2D22E', poly: '30,30 270,18 282,200 40,220' },
      { crop: 'chilli', label: 'B', acres: 1, sown: '2026-08-29', fill: '#FF5A01', poly: '292,24 376,32 370,196 300,202' }
    ],
    alert: {
      t: { en: 'Thrips watch · Chilli', te: 'తామర పురుగు నిఘా · మిరప' },
      b: {
        en: 'Warm, dry afternoons favour thrips. Look for upward leaf curling in Plot B.',
        te: 'వేడి, పొడి మధ్యాహ్నాలు తామర పురుగుకు అనుకూలం. ప్లాట్ Bలో ఆకులు ముడుచుకుంటున్నాయేమో చూడండి.'
      }
    }
  },
  c: {
    name: { en: 'Hill View Farm · Nalgonda', te: 'కొండ వీక్షణ పొలం · నల్గొండ' },
    loc: { en: 'Nalgonda district, Telangana', te: 'నల్గొండ జిల్లా, తెలంగాణ' },
    coords: { lat: 17.0575, lon: 79.2671 },
    temp: 30,
    cond: { en: 'Sunny, light breeze', te: 'ఎండ, తేలికపాటి గాలి' },
    plots: [
      { crop: 'cotton', label: 'A', acres: 3.5, sown: '2026-07-12', fill: '#FF5A01', poly: '36,34 236,26 244,214 44,224' },
      { crop: 'groundnut', label: 'B', acres: 1.5, sown: '2026-08-02', fill: '#CEE2E3', poly: '254,30 374,40 366,206 262,214' }
    ],
    alert: {
      t: { en: 'Pink bollworm watch · Cotton', te: 'గులాబీ రంగు పురుగు నిఘా · పత్తి' },
      b: {
        en: 'Check flowers in Plot A for rosette (twisted) blooms — an early pink bollworm sign.',
        te: 'ప్లాట్ Aలో పువ్వులు ముడుచుకుపోయాయేమో చూడండి — గులాబీ రంగు పురుగుకు ముందస్తు సంకేతం.'
      }
    }
  }
};

// Crop age is counted live from the sowing date, so every screen (overview, tasks) stays current.
const DAY_MS = 24 * 60 * 60 * 1000;
export const daysSince = (isoDate, now = new Date()) =>
  Math.max(0, Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.parse(isoDate)) / DAY_MS));
Object.values(FARMS).forEach((farm) =>
  farm.plots.forEach((plot) => Object.defineProperty(plot, 'day', { get: () => daysSince(plot.sown), enumerable: true }))
);
