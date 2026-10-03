// Live mandi prices from Agmarknet 2.0 (agmarknet.gov.in) — no API key needed.
// Runs inside the Vite dev/preview server: GET /api/markets/prices.
// The browser can't call Agmarknet directly (its CORS only allows agmarknet.gov.in),
// so the dev server fetches on the page's behalf and refreshes every 5 hours.

const API = 'https://api.agmarknet.gov.in/v1/dashboard-data/';
const REFRESH_MS = 5 * 60 * 60 * 1000;

// FarmWise crop -> [Agmarknet commodity id, name as Agmarknet reports it]
const CROPS = {
  rice: [2, 'Paddy(Common)'],
  cotton: [15, 'Cotton'],
  maize: [4, 'Maize'],
  chilli: [113, 'Dry Chillies'],
  turmeric: [35, 'Turmeric'],
  groundnut: [10, 'Groundnut'],
};
// nearest first: a crop with no fresh price in Telangana falls back to AP, then India
const STATES = [[32, 'Telangana'], [2, 'Andhra Pradesh'], [100006, 'India']];

const num = (v) => (Number(v) > 0 ? Number(v) : null);
const istDate = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

async function fetchState(stateId, ids) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 FarmWise' },
    body: JSON.stringify({ dashboard: 'marketwise_price_arrival', date: istDate(), commodity: ids, state: stateId, format: 'json', page: 0, limit: 50 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Agmarknet HTTP ${res.status}`);
  return (await res.json())?.data?.records ?? [];
}

/** One Agmarknet record -> FarmWise price row (null when today's price is missing). */
export function toPrice(r, state) {
  const series = [r.two_day_ago_price, r.one_day_ago_price, r.as_on_price].map(num);
  const price = series[2];
  if (!price) return null;
  const first = series.find(Boolean);
  const [d, m, y] = String(r.reported_date).split('-');
  return {
    price: Math.round(price),
    msp: num(r.msp_price) && Math.round(num(r.msp_price)),
    state,
    date: `${y}-${m}-${d}`,
    history: series.filter(Boolean).map(Math.round),
    change: Math.round(((price - first) / first) * 1000) / 10,
  };
}

export async function fetchPrices() {
  const crops = {};
  for (const [stateId, stateName] of STATES) {
    const missing = Object.entries(CROPS).filter(([crop]) => !crops[crop]);
    if (!missing.length) break;
    let records;
    try {
      records = await fetchState(stateId, missing.map(([, [id]]) => id));
    } catch (err) {
      console.warn(`[mandi] ${stateName}: ${err.message}`);
      continue;
    }
    for (const [crop, [, name]] of missing) {
      const r = records.find((x) => x.cmdt_name === name);
      const row = r && toPrice(r, stateName);
      if (row) crops[crop] = row;
    }
  }
  const now = Date.now();
  return { source: 'agmarknet', asOf: new Date(now).toISOString(), nextUpdate: new Date(now + REFRESH_MS).toISOString(), crops };
}

export function mandiPrices() {
  let cache = null;
  let pending = null;
  const refresh = () =>
    (pending ??= fetchPrices()
      .then((next) => {
        // keep a crop's last good price if this round couldn't get one
        if (Object.keys(next.crops).length) cache = { ...next, crops: { ...cache?.crops, ...next.crops } };
      })
      .catch((err) => console.warn('[mandi]', err.message))
      .finally(() => { pending = null; }));

  const handler = async (req, res, next) => {
    if (!req.url.startsWith('/api/markets/prices')) return next();
    if (!cache || Date.now() > Date.parse(cache.nextUpdate)) await refresh();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = cache ? 200 : 503;
    res.end(JSON.stringify(cache ?? { error: 'Agmarknet unavailable' }));
  };
  const setup = (server) => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    server.httpServer?.on('close', () => clearInterval(timer));
    server.middlewares.use(handler);
  };
  return { name: 'mandi-prices', configureServer: setup, configurePreviewServer: setup };
}

// self-check: node server/mandi.js
if (process.argv[1]?.endsWith('mandi.js')) {
  const row = toPrice({ cmdt_name: 'Maize', msp_price: '2410.00', as_on_price: '2257.21', one_day_ago_price: '2308.43', two_day_ago_price: '2333.85', reported_date: '01-10-2026' }, 'Telangana');
  console.assert(row.price === 2257 && row.msp === 2410 && row.date === '2026-10-01', row);
  console.assert(row.change === -3.3 && row.history.join() === '2334,2308,2257', row);
  console.assert(toPrice({ as_on_price: null, two_day_ago_price: '6036.00', reported_date: '01-10-2026' }, 'Telangana') === null);
  console.log('self-check ok');
}
