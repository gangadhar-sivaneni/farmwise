import React, { useState } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import {
  CROPS,
  byId,
  cropCost,
  WATER_N,
  IMG,
  inr,
} from '../../data/cropsData';
import { LBL } from '../../data/translations';
import { useMandiPrices, livePriceOf } from '../../hooks/useMandiPrices';

export default function CropsPage() {
  const { t, L, W } = useLanguage();
  const {
    compareSel,
    toggleCompare,
    setComparePair,
    setActiveCropModal,
    activeFarm,
  } = useApp();

  const { data: mandi } = useMandiPrices();
  const priceOf = (c) => livePriceOf(c, mandi);
  const cropProfit = (c) => c.yield * priceOf(c) - cropCost(c);

  const [filters, setFilters] = useState({
    season: 'all',
    water: 'all',
    soil: 'all',
    cat: 'all',
  });

  const filteredCrops = CROPS.filter(
    (c) =>
      (filters.season === 'all' || c.season.includes(filters.season)) &&
      (filters.water === 'all' || c.water === filters.water) &&
      (filters.soil === 'all' || c.soils.includes(filters.soil)) &&
      (filters.cat === 'all' || c.cat === filters.cat)
  );

  const clearFilters = () => {
    setFilters({ season: 'all', water: 'all', soil: 'all', cat: 'all' });
  };

  const aId = compareSel[0] || 'maize';
  const bId = compareSel[1] || (aId === 'cotton' ? 'maize' : 'cotton');
  const ca = byId(aId) || CROPS[0];
  const cb = byId(bId) || CROPS[1];

  const avgDur = (c) => Math.round((c.dur[0] + c.dur[1]) / 2);

  const compareRows = [
    {
      m: W.costAcre,
      va: cropCost(ca),
      vb: cropCost(cb),
      f: inr,
      best: 'low',
    },
    {
      m: W.duration,
      va: avgDur(ca),
      vb: avgDur(cb),
      f: (v) => `${v} ${L(W.days)}`,
      best: 'low',
    },
    {
      m: W.waterNeed,
      va: WATER_N[ca.water],
      vb: WATER_N[cb.water],
      f: (v) => L(LBL.water[['', 'low', 'medium', 'high'][v]]),
      best: 'low',
    },
    {
      m: W.yield,
      va: ca.yield,
      vb: cb.yield,
      f: (v) => `${v} q`,
      best: 'high',
    },
    {
      m: W.profR,
      va: cropProfit(ca),
      vb: cropProfit(cb),
      f: inr,
      best: 'high',
    },
  ];

  const pa = cropProfit(ca);
  const pb = cropProfit(cb);
  const hi = pa >= pb ? ca : cb;
  const lo = hi === ca ? cb : ca;
  const diff = Math.abs(pa - pb);
  const ratio = cropCost(hi) / (cropCost(lo) || 1);

  const cmpSumText =
    aId === bId
      ? L({
          en: 'Pick two different crops to see the trade-off.',
          te: 'తేడా చూడటానికి రెండు వేర్వేరు పంటలను ఎంచుకోండి.',
        })
      : L({
          en: `${hi.name.en} could return ${inr(diff)} more per acre than ${lo.name.en}${
            ratio > 1.4
              ? ` — but needs ${ratio.toFixed(1)}× the investment, so more is at risk if prices fall.`
              : '.'
          }`,
          te: `${lo.name.te} కంటే ${hi.name.te} ఎకరానికి ${inr(diff)} ఎక్కువ రాబడి ఇవ్వవచ్చు${
            ratio > 1.4 ? ` — కానీ ${ratio.toFixed(1)} రెట్లు పెట్టుబడి అవసరం.` : '.'
          }`,
        });

  return (
    <section className="panel page" data-page="crops" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('crops.h', 'Find the crop that fits your field')}</h1>
          <p>{t('crops.p', 'Per-acre, illustrative numbers.')} · {L(activeFarm.name)}: {+(+activeFarm.areaAcres).toFixed(2)} {L(W.acresW)}</p>
        </div>
      </div>

      <div className="filters" id="filters">
        <select
          className="select"
          value={filters.season}
          aria-label="Season"
          onChange={(e) => setFilters({ ...filters, season: e.target.value })}
        >
          <option value="all">{t('f.season', 'All seasons')}</option>
          <option value="kharif">{t('season.kharif', 'Kharif')}</option>
          <option value="rabi">{t('season.rabi', 'Rabi')}</option>
        </select>

        <select
          className="select"
          value={filters.water}
          aria-label="Water requirement"
          onChange={(e) => setFilters({ ...filters, water: e.target.value })}
        >
          <option value="all">{t('f.water', 'Any water need')}</option>
          <option value="low">{t('water.low', 'Low water')}</option>
          <option value="medium">{t('water.medium', 'Medium water')}</option>
          <option value="high">{t('water.high', 'High water')}</option>
        </select>

        <select
          className="select"
          value={filters.soil}
          aria-label="Soil type"
          onChange={(e) => setFilters({ ...filters, soil: e.target.value })}
        >
          <option value="all">{t('f.soil', 'Any soil')}</option>
          <option value="loamy">{t('soil.loamy', 'Loamy')}</option>
          <option value="black">{t('soil.black', 'Black')}</option>
          <option value="red">{t('soil.red', 'Red')}</option>
          <option value="clay">{t('soil.clay', 'Clay')}</option>
        </select>

        <select
          className="select"
          value={filters.cat}
          aria-label="Crop category"
          onChange={(e) => setFilters({ ...filters, cat: e.target.value })}
        >
          <option value="all">{t('f.cat', 'All categories')}</option>
          <option value="cereal">{t('cat.cereal', 'Cereal')}</option>
          <option value="commercial">{t('cat.commercial', 'Commercial')}</option>
          <option value="spice">{t('cat.spice', 'Spice')}</option>
          <option value="oilseed">{t('cat.oilseed', 'Oilseed')}</option>
        </select>

        <span className="count" id="fcount" aria-live="polite">
          {`${filteredCrops.length} / ${CROPS.length} ${L(W.shown)}`}
        </span>
      </div>

      <div className="grid g3" id="cropGrid">
        {filteredCrops.length === 0 ? (
          <div className="card empty">
            <svg
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M14 80h72" strokeDasharray="3 5" />
              <path d="M50 80V50" />
              <path d="M50 54c0-12-9-19-22-19 0 12 9 19 22 19zM50 48c0-11 8-18 21-18 0 12-8 18-21 18z" />
            </svg>
            <h3>{L(W.noMatch)}</h3>
            <p>{L(W.noMatchP)}</p>
            <button className="btn btn-dark sm" id="clearF" onClick={clearFilters}>
              {L(W.clear)}
            </button>
          </div>
        ) : (
          filteredCrops.map((c, i) => (
            <article key={c.id} className="crop" style={{ '--i': i }}>
              <button
                type="button"
                className="crop-media"
                onClick={() => setActiveCropModal(c.id)}
                aria-label={`${L(W.viewPlan)}: ${L(c.name)}`}
              >
                <img src={IMG(c.img, 700)} alt="" loading="lazy" />
                <span className="pill">
                  {c.season.map((s) => L(LBL.season[s])).join(' · ')}
                </span>
                <span className="yl">
                  {c.yield} {L(W.qpa)}
                  <span>{L(W.yield)}</span>
                </span>
              </button>

              <div className="crop-b">
                <div className="crop-t">
                  <h3>
                    {L(c.name)}
                    <small>{L(LBL.cat[c.cat])}</small>
                  </h3>
                  <span className="muted" style={{ fontSize: '13px' }}>
                    {c.dur[0]}–{c.dur[1]} {L(W.days)}
                  </span>
                </div>

                <div className="kv">
                  <div>
                    <span>{L(W.waterNeed)}</span>
                    <b>{L(LBL.water[c.water])}</b>
                  </div>
                  <div>
                    <span>{L(W.costAcre)}</span>
                    <b>{inr(cropCost(c))}</b>
                  </div>
                  <div>
                    <span>{L(W.revAcre)}</span>
                    <b>{inr(c.yield * priceOf(c))}</b>
                  </div>
                </div>

                <div className="crop-f">
                  <button
                    type="button"
                    className="btn btn-dark sm"
                    onClick={() => setActiveCropModal(c.id)}
                  >
                    <span>{L(W.viewPlan)}</span>
                    <Icon name="arrow" className="ico sm" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn cmp-toggle"
                    aria-pressed={compareSel.includes(c.id)}
                    aria-label={`${L(W.compareX)} ${L(c.name)}`}
                    onClick={() => toggleCompare(c.id)}
                  >
                    <Icon name="scale" className="ico sm" />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="card" id="compare" style={{ marginTop: '12px' }}>
        <div className="card-h" style={{ flexWrap: 'wrap' }}>
          <h3>{t('cmp.h', 'Compare two crops')}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label className="sr-only" htmlFor="cmpA">
              First crop
            </label>
            <select
              id="cmpA"
              className="select"
              value={aId}
              onChange={(e) => setComparePair(e.target.value, bId)}
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {L(c.name)}
                </option>
              ))}
            </select>

            <span className="muted">vs</span>

            <label className="sr-only" htmlFor="cmpB">
              Second crop
            </label>
            <select
              id="cmpB"
              className="select"
              value={bId}
              onChange={(e) => setComparePair(aId, e.target.value)}
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {L(c.name)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div id="cmpBody">
          <div className="cmp-row h">
            <div className="sd a">
              <img src={IMG(ca.img, 100)} alt="" />
              {L(ca.name)}
            </div>
            <span />
            <div className="sd b">
              <img src={IMG(cb.img, 100)} alt="" />
              {L(cb.name)}
            </div>
          </div>

          {compareRows.map((r, i) => {
            const max = Math.max(r.va, r.vb) || 1;
            const aw =
              r.va !== r.vb && (r.best === 'low' ? r.va < r.vb : r.va > r.vb);
            const bw = r.va !== r.vb && !aw;

            return (
              <div key={i} className="cmp-row">
                <div className="sd a">
                  <span
                    className="bar"
                    style={{ width: `${Math.max(3, (r.va / max) * 68)}%` }}
                  />
                  <span className="val">{r.f(r.va)}</span>
                  {aw && <span className="win">{L(W.better)}</span>}
                </div>

                <span className="m">{L(r.m)}</span>

                <div className="sd b">
                  <span
                    className="bar"
                    style={{ width: `${Math.max(3, (r.vb / max) * 68)}%` }}
                  />
                  <span className="val">{r.f(r.vb)}</span>
                  {bw && <span className="win">{L(W.better)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <p className="cmp-sum" id="cmpSum">
          {cmpSumText}
        </p>
      </div>
    </section>
  );
}
