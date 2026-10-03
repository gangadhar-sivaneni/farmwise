import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { SHOPS } from '../../data/marketData';
import { FERTILIZERS } from '../../data/fertilizerData';
import { byId, IMG, inr } from '../../data/cropsData';

const PRICES_URL = '/api/markets/prices'; // served by server/mandi.js inside `npm run dev`
const REFRESH_MS = 5 * 60 * 60 * 1000;
const CACHE_KEY = 'fw.mandi.v2';
const CROP_ORDER = ['rice', 'cotton', 'maize', 'chilli', 'turmeric', 'groundnut'];

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
};

/** Agmarknet prices, re-fetched every 5 hours (and when a tab left open passes that mark). */
function useMandiPrices() {
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

function Sparkline({ values, change }) {
  values = values.filter(Number.isFinite);
  if (values.length < 2) return null;
  const mn = Math.min(...values);
  const sp = Math.max(...values) - mn || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 80 + 2, 25 - ((v - mn) / sp) * 20]);
  const col = change > 0 ? '#2F5A18' : change < 0 ? '#FF5A01' : '#83877F';
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox="0 0 84 28" aria-hidden="true">
      <polyline points={pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')} fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={col} />
    </svg>
  );
}

export default function MarketPage() {
  const { t, L, loc, W, showToast } = useLanguage();
  const [shopFilter, setShopFilter] = useState('all');
  const [fertFilter, setFertFilter] = useState('all');
  const { data, state, reload } = useMandiPrices();

  const fmt = (d, opts) => new Date(d).toLocaleString(loc, opts);
  const timeOpts = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
  const rows = CROP_ORDER.filter((c) => data?.crops?.[c]).map((c) => ({ crop: c, ...data.crops[c] }));
  const filteredShops = SHOPS.filter((s) => shopFilter === 'all' || s.type === shopFilter);

  return (
    <section className="panel page" data-page="market" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('mk.h', 'Sell at the right price, buy close to home')}</h1>
          <p>{L({ en: 'Today’s mandi prices from Agmarknet, Government of India.', te: 'భారత ప్రభుత్వ అగ్‌మార్క్‌నెట్ నుండి ఈరోజు మండీ ధరలు.' })}</p>
        </div>
        {rows.length > 0 && (
          <span className="pill ok"><i /><span>{L({ en: 'Live · Agmarknet', te: 'ప్రత్యక్షం · అగ్‌మార్క్‌నెట్' })}</span></span>
        )}
      </div>

      <div className="grid">
        <div className="card scroll-x">
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              {state === 'error' ? (
                <>
                  <b style={{ fontWeight: 500 }}>{L({ en: 'Couldn’t reach Agmarknet right now', te: 'ప్రస్తుతం అగ్‌మార్క్‌నెట్ అందుబాటులో లేదు' })}</b>
                  <p className="muted" style={{ fontSize: 14, margin: '6px 0 14px' }}>{L({ en: 'Prices will load automatically when it is back.', te: 'అందుబాటులోకి రాగానే ధరలు వస్తాయి.' })}</p>
                  <button type="button" className="btn sm" onClick={reload}><Icon name="reset" className="ico sm" /><span>{L({ en: 'Try again', te: 'మళ్లీ ప్రయత్నించండి' })}</span></button>
                </>
              ) : (
                <span className="muted">{L({ en: 'Fetching today’s mandi prices…', te: 'ఈరోజు మండీ ధరలు తెస్తోంది…' })}</span>
              )}
            </div>
          ) : (
            <>
              <table className="mk-table">
                <caption className="sr-only">Agmarknet mandi prices, rupees per quintal</caption>
                <thead>
                  <tr>
                    <th>{t('mk.crop', 'Crop & market')}</th>
                    <th>{t('mk.price', 'Price / quintal')}</th>
                    <th>{L({ en: '3-day', te: '3 రోజులు' })}</th>
                    <th><span className="sr-only">Trend</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const c = byId(r.crop);
                    const cls = r.change > 0 ? 'up' : r.change < 0 ? 'down' : 'flat';
                    const ic = r.change > 0 ? 'trend-up' : r.change < 0 ? 'trend-down' : 'minus';
                    return (
                      <tr key={r.crop}>
                        <td>
                          <div className="cc">
                            <img src={IMG(c.img, 80)} alt="" />
                            <div>
                              <b>{L(c.name)}</b>
                              <span>{r.state} · {fmt(r.date, { day: 'numeric', month: 'short' })}{r.msp ? ` · MSP ${inr(r.msp)}` : ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="price num">{inr(r.price)}</td>
                        <td>
                          <span className={`mv ${cls}`}>
                            <Icon name={ic} className="ico sm" />
                            {r.change > 0 ? '+' : ''}{r.change}%
                          </span>
                        </td>
                        <td><Sparkline values={r.history} change={r.change} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                {L({
                  en: `State average modal price. Updated ${fmt(data.asOf, timeOpts)} · next update ${fmt(data.nextUpdate, timeOpts)}.`,
                  te: `రాష్ట్ర సగటు మోడల్ ధర. నవీకరణ ${fmt(data.asOf, timeOpts)} · తదుపరి ${fmt(data.nextUpdate, timeOpts)}.`,
                })}
              </p>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-h" style={{ flexWrap: 'wrap' }}>
            <div>
              <h3>{L({ en: 'Fertilizers & crop protection', te: 'ఎరువులు & పంట రక్షణ' })}</h3>
              <p className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>{L({ en: 'Dosage, method and typical retail price per pack. Always follow the label.', te: 'మోతాదు, వాడే విధానం, సాధారణ రిటైల్ ధర. లేబుల్ సూచనలు పాటించండి.' })}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }} role="group" aria-label="Fertilizer type">
              {[['all', t('f.all', 'All')], ['fert', L({ en: 'Fertilizers', te: 'ఎరువులు' })], ['soil', L({ en: 'Soil & organic', te: 'నేల & సేంద్రియ' })], ['pest', L({ en: 'Pesticides', te: 'పురుగుమందులు' })]].map(([k, label]) => (
                <button key={k} className="chip-f" aria-pressed={fertFilter === k} onClick={() => setFertFilter(k)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="grid g3" style={{ gridAutoRows: "1fr" }}>
            {FERTILIZERS.filter((f) => fertFilter === 'all' || f.type === fertFilter).map((f) => (
              <article key={f.id} className="fert">
                <div className="fert-media">
                  {f.img ? <img src={f.img} alt={f.name.en} loading="lazy" /> : <span className="fert-formula">{f.formula}</span>}
                  <span className="pill">{f.pack}</span>
                </div>
                <div className="fert-b">
                  <div className="fert-t"><b>{L(f.name)}</b><span className="price num">{f.price ? inr(f.price) : <span className="muted" style={{ fontSize: 12.5, fontWeight: 400 }}>{L({ en: 'Price varies by brand', te: 'బ్రాండ్‌ను బట్టి ధర' })}</span>}</span></div>
                  <span className="muted" style={{ fontSize: 13 }}>{L(f.tag)}</span>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{L(f.desc)}</p>
                  <div className="kv">
                    <div><span>{L({ en: 'Dose', te: 'మోతాదు' })}</span><b>{f.dose}</b></div>
                    <div><span>{L({ en: 'Method', te: 'విధానం' })}</span><b>{L(f.method)}</b></div>
                  </div>
                  {f.credit && (
                    <a className="muted" style={{ fontSize: 11.5 }} href={f.credit.url} target="_blank" rel="noreferrer">
                      Photo: {f.credit.by} · {f.credit.lic} · Wikimedia Commons
                    </a>
                  )}
                  <span className="muted" style={{ fontSize: 13 }}>
                    {L({ en: 'For', te: 'పంటలు' })}: {[...f.crops.map((c) => L(byId(c).name)), L(f.cropsOther)].filter(Boolean).join(', ')}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>{t('mk.shops', 'Nearby input shops')}</h3>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }} role="group" aria-label="Shop type">
            {[['all', t('f.all', 'All')], ['fert', t('mk.fert', 'Fertilizer')], ['pest', t('mk.pest', 'Pesticide')]].map(([k, label]) => (
              <button key={k} className="chip-f" aria-pressed={shopFilter === k} onClick={() => setShopFilter(k)}>{label}</button>
            ))}
          </div>
          <div>
            {filteredShops.map((s, i) => (
              <div key={i} className="shop">
                <span className={`ic ${s.type === 'pest' ? 'p' : ''}`}>
                  <Icon name={s.type === 'pest' ? 'bug' : 'sprout'} className="ico" />
                </span>
                <div>
                  <b>{L(s.name)}</b>
                  <span>{L(s.type === 'pest' ? W.pestShop : W.fertShop)} · {s.km} {L(W.km)}</span>
                </div>
                <button type="button" className="btn sm" onClick={() => showToast(W.callMsg)}>
                  <Icon name="phone" className="ico sm" />
                  <span>{L(W.call)}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
