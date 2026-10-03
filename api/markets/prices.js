// Vercel serverless function: GET /api/markets/prices (Agmarknet). Vercel's CDN caches the answer
// for 5 hours, so Agmarknet is called about once per 5 h instead of on every visit.
import { fetchPrices } from '../../server/mandi.js';

export default async function handler(req, res) {
  try {
    const data = await fetchPrices();
    const ok = Object.keys(data.crops).length > 0;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // keep serving the last good copy for a day if a refresh fails
    if (ok) res.setHeader('Cache-Control', 's-maxage=18000, stale-while-revalidate=86400');
    res.statusCode = ok ? 200 : 503;
    res.end(JSON.stringify(ok ? data : { error: 'Agmarknet unavailable' }));
  } catch (err) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Agmarknet unavailable' }));
  }
}
