import { useCallback, useEffect, useState } from 'react';

const PRICES_URL = '/api/markets/prices'; // served by server/mandi.js inside `npm run dev`
const REFRESH_MS = 5 * 60 * 60 * 1000;
const CACHE_KEY = 'fw.mandi.v2';
export const CROP_ORDER = ['rice', 'cotton', 'maize', 'chilli', 'turmeric', 'groundnut'];

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
};

/** Agmarknet prices, re-fetched every 5 hours (and when a tab left open passes that mark). */
export function useMandiPrices() {
  const [data, setData] = useState(readCache);
  const [state, setState] = useState('idle'); // idle | loading | error

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(PRICES_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error(res.status);
      const json = await res.json();
      const next = { ...json, fetchedAt: Date.now() };
      setData(next);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
      setState('idle');
    } catch {
      setState('error'); // keep showing the last prices we had
    }
  }, []);

  useEffect(() => {
    const stale = () => { const c = readCache(); return !c || Date.now() - c.fetchedAt > REFRESH_MS; };
    if (stale()) load();
    const timer = setInterval(load, REFRESH_MS);
    const onShow = () => document.visibilityState === 'visible' && stale() && load();
    document.addEventListener('visibilitychange', onShow);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onShow); };
  }, [load]);

  return { data, state, reload: load };
}

/** Live Agmarknet price for a crop (₹/quintal), or its typical price when no live price is available. */
export const livePriceOf = (crop, mandi) => mandi?.crops?.[crop.id]?.price ?? crop.price;

/** State name from Agmarknet in the chosen language. */
const STATE_TE = { Telangana: 'తెలంగాణ', 'Andhra Pradesh': 'ఆంధ్రప్రదేశ్', India: 'భారతదేశం' };
export const stateName = (state, lang) => (lang === 'te' && STATE_TE[state]) || state;
