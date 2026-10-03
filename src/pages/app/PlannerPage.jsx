import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { CROPS, byId, fmt, inr } from '../../data/cropsData';
import { useMandiPrices, stateName } from '../../hooks/useMandiPrices';

// Inputs keep the raw text the farmer types (so clearing a field and retyping works);
// numbers are derived only for the calculation.
const num = (v) => Number(v) || 0;

const COST_KEYS = ['seed', 'fert', 'pest', 'labour', 'irrig', 'other'];
const COST_COL = {
  seed: '#F2D22E',
  fert: '#8CC063',
  pest: '#FF5A01',
  labour: '#CEE2E3',
  irrig: '#5FA3A3',
  other: '#9A9C94',
};

export default function PlannerPage() {
  const { t, L, loc, W, lang } = useLanguage();
  const { plannerCrop, activeFarm } = useApp();
  const { data: mandi } = useMandiPrices();
  const [priceEdited, setPriceEdited] = useState(false);

  const [selectedCrop, setSelectedCrop] = useState(plannerCrop || 'maize');
  const [area, setArea] = useState(2.5);
  const [costs, setCosts] = useState({
    seed: 4200,
    fert: 7000,
    pest: 2600,
    labour: 7600,
    irrig: 2800,
    other: 1800,
  });
  const [yieldVal, setYieldVal] = useState(28);
  const [priceVal, setPriceVal] = useState(2100);

  const [savedPlans, setSavedPlans] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fw.plans')) || [];
    } catch {
      return [];
    }
  });

  const areaRef = React.useRef(activeFarm?.areaAcres);
  areaRef.current = activeFarm?.areaAcres;
  const mandiRef = React.useRef(mandi);
  mandiRef.current = mandi;
  const live = mandi?.crops?.[selectedCrop];

  // Live price arrives (or refreshes every 5 h): apply it unless the farmer typed their own price
  useEffect(() => {
    if (live && !priceEdited) setPriceVal(live.price);
  }, [live?.price, priceEdited]);

  const setCropDefaults = useCallback((cropId, resetArea = false) => {
    const c = byId(cropId);
    if (!c) return;
    setSelectedCrop(cropId);
    setCosts({ ...c.cost });
    setYieldVal(c.yield);
    setPriceVal(mandiRef.current?.crops?.[cropId]?.price ?? c.price);
    setPriceEdited(false);
    if (resetArea) {
      setArea(Math.round((areaRef.current || 2.5) * 100) / 100);
    }
  }, []);

  useEffect(() => {
    if (plannerCrop) {
      setCropDefaults(plannerCrop, false);
    }
  }, [plannerCrop, setCropDefaults]);

  // Area follows the selected plot (the farmer can still type a different area to explore)
  const plotAcres = activeFarm?.areaAcres;
  useEffect(() => {
    if (plotAcres > 0) setArea(Math.round(plotAcres * 100) / 100);
  }, [activeFarm?.id, plotAcres]);

  const handleCropChange = (e) => {
    setCropDefaults(e.target.value, false);
  };

  const handleReset = () => {
    setCropDefaults('maize', true);
  };

  const { showToast } = useLanguage();

  const handleSavePlan = () => {
    const newPlan = {
      crop: selectedCrop,
      area: num(area),
      costs: Object.fromEntries(COST_KEYS.map((k) => [k, num(costs[k])])),
      yld: num(yieldVal),
      price: num(priceVal),
      profit: gross - total,
      at: Date.now(),
    };
    const updated = [newPlan, ...savedPlans].slice(0, 5);
    setSavedPlans(updated);
    try {
      localStorage.setItem('fw.plans', JSON.stringify(updated));
      showToast(W.savedOk);
    } catch {
      showToast(W.saveFail);
    }
  };

  const handleLoadPlan = (p) => {
    setSelectedCrop(p.crop);
    setArea(p.area);
    setCosts({ ...p.costs });
    setYieldVal(p.yld);
    setPriceVal(p.price);
    setPriceEdited(true);
  };

  const handleDeletePlan = (index) => {
    const updated = savedPlans.filter((_, i) => i !== index);
    setSavedPlans(updated);
    try {
      localStorage.setItem('fw.plans', JSON.stringify(updated));
    } catch {}
  };

  const perAcreCost = useMemo(() => {
    return Object.values(costs).reduce((a, b) => a + (Number(b) || 0), 0);
  }, [costs]);

  const acres = num(area);
  const total = perAcreCost * acres;
  const prod = num(yieldVal) * acres;
  const gross = prod * num(priceVal);
  const revPerAcre = num(yieldVal) * num(priceVal);
  const profit = gross - total;

  const ppa = revPerAcre - perAcreCost; // per acre, independent of area
  const isLoss = profit < 0;
  const be = num(yieldVal) ? `${inr(perAcreCost / num(yieldVal))}/q` : '—';
  const roi = total ? `${((profit / total) * 100).toFixed(0)}%` : '—';

  const maxVal = Math.max(total, gross) || 1;

  // Sensitivity data (-20% to +20%)
  const steps = [-0.2, -0.1, 0, 0.1, 0.2].map((s) => ({
    s,
    p: prod * num(priceVal) * (1 + s) - total,
  }));
  const hi = Math.max(0, ...steps.map((x) => x.p));
  const lo = Math.min(0, ...steps.map((x) => x.p));
  const span = hi - lo || 1;
  const getY = (v) => 18 + ((hi - v) / span) * 98;
  const zeroY = getY(0);

  return (
    <section className="panel page" data-page="planner" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('econ.h', 'Know your profit before you sow')}</h1>
          <p>{t('econ.p', 'Enter costs per acre — results update as you type.')}</p>
        </div>
        <span className="pill demo">
          <i />
          <span>{t('econ.estimate', 'Estimate, not a guarantee')}</span>
        </span>
      </div>

      <form className="grid g-econ" id="econForm" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <div className="card">
          <div className="fgrid">
            <div className="fld full" style={{ margin: 0 }}>
              <label htmlFor="eCrop">{t('econ.crop', 'Crop')}</label>
              <select
                id="eCrop"
                className="select"
                style={{ width: '100%', minHeight: '48px' }}
                value={selectedCrop}
                onChange={handleCropChange}
              >
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {L(c.name)}
                  </option>
                ))}
              </select>
            </div>

            <div className="fld full" style={{ margin: 0 }}>
              <label htmlFor="eArea">{t('econ.area', 'Farm area (acres)')}</label>
              <div className="area-row">
                <input
                  type="range"
                  id="eAreaR"
                  min="0.5"
                  max={Math.max(25, Math.ceil(num(area)))}
                  step="0.5"
                  value={area}
                  aria-label="Farm area slider"
                  onChange={(e) => setArea(e.target.value)}
                />
                <div className="inp">
                  <input
                    id="eArea"
                    type="number"
                    min="0"
                    step="0.5"
                    value={area}
                    inputMode="decimal"
                    onChange={(e) => setArea(e.target.value)}
                  />
                  <span className="suf">{t('acres', 'acres')}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="grp">{t('econ.costs', 'Costs per acre')}</p>
          <div className="fgrid" id="costFields">
            {COST_KEYS.map((k) => (
              <div key={k} className="fld" style={{ margin: 0 }}>
                <label htmlFor={`c-${k}`}>{L(W[k])}</label>
                <div className="inp">
                  <span className="pre">₹</span>
                  <input
                    id={`c-${k}`}
                    type="number"
                    min="0"
                    step="100"
                    inputMode="numeric"
                    value={costs[k]}
                    onChange={(e) => setCosts((c) => ({ ...c, [k]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="grp">{t('econ.output', 'Expected output')}</p>
          <div className="fgrid">
            <div className="fld" style={{ margin: 0 }}>
              <label htmlFor="eYield">{t('econ.yield', 'Yield (quintal / acre)')}</label>
              <div className="inp">
                <input
                  id="eYield"
                  type="number"
                  min="0"
                  step="0.5"
                  inputMode="decimal"
                  value={yieldVal}
                  onChange={(e) => setYieldVal(e.target.value)}
                />
                <span className="suf">q</span>
              </div>
            </div>

            <div className="fld" style={{ margin: 0 }}>
              <label htmlFor="ePrice">{t('econ.price', 'Price (per quintal)')}</label>
              <div className="inp">
                <span className="pre">₹</span>
                <input
                  id="ePrice"
                  type="number"
                  min="0"
                  step="50"
                  inputMode="numeric"
                  value={priceVal}
                  onChange={(e) => { setPriceVal(e.target.value); setPriceEdited(true); }}
                />
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                {live ? (
                  <>
                    {L({ en: 'Live mandi price', te: 'ప్రత్యక్ష మండీ ధర' })}: <b style={{ fontWeight: 500 }}>{inr(live.price)}/{L({ en: 'q', te: 'క్వి' })}</b> · {stateName(live.state, lang)} · {new Date(live.date).toLocaleDateString(loc, { day: 'numeric', month: 'short' })} ({L({ en: 'Agmarknet', te: 'అగ్‌మార్క్‌నెట్' })})
                    {priceEdited && num(priceVal) !== live.price && (
                      <button type="button" className="btn sm" style={{ marginLeft: 8, minHeight: 28 }} onClick={() => { setPriceVal(live.price); setPriceEdited(false); }}>
                        {L({ en: 'Use live price', te: 'ప్రత్యక్ష ధర వాడండి' })}
                      </button>
                    )}
                  </>
                ) : L({ en: 'Typical price — live mandi price not available for this crop right now.', te: 'సాధారణ ధర — ఈ పంటకు ప్రత్యక్ష మండీ ధర ప్రస్తుతం లేదు.' })}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-dark"
              id="savePlan"
              onClick={handleSavePlan}
            >
              <Icon name="save" className="ico sm" />
              <span>{t('econ.save', 'Save Plan')}</span>
            </button>
            <button
              type="button"
              className="btn"
              id="resetPlan"
              onClick={handleReset}
            >
              <Icon name="reset" className="ico sm" />
              <span>{t('econ.reset', 'Reset')}</span>
            </button>
          </div>

          {savedPlans.length > 0 && (
            <div id="savedWrap" style={{ marginTop: '16px' }}>
              <p className="grp" style={{ marginTop: 0 }}>
                {L(W.saved)}
              </p>
              {savedPlans.map((p, i) => (
                <div key={i} className="saved-item">
                  <div className="grow">
                    <b style={{ fontWeight: 500 }}>
                      {L(byId(p.crop)?.name)} · {p.area} {L(W.acresW)}
                    </b>
                    <small>
                      {inr(p.profit)} ·{' '}
                      {new Date(p.at).toLocaleDateString(loc, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => handleLoadPlan(p)}
                  >
                    {L(W.load)}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleDeletePlan(i)}
                    aria-label="Remove saved plan"
                  >
                    <Icon name="x" className="ico sm" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card dark-card" aria-live="polite">
          <span className="muted" id="oProfitK">
            {L(isLoss ? W.loss : W.profit)}
          </span>
          <div className={`out-v ${isLoss ? 'loss' : ''}`} id="oProfit">
            {inr(profit)}
          </div>
          <div className="out-grid" style={{ marginBottom: 0 }}>
            <div><span>{L({ en: 'Cost / acre', te: 'ఖర్చు / ఎకరం' })}</span><b>{inr(perAcreCost)}</b></div>
            <div><span>{L({ en: 'Revenue / acre', te: 'ఆదాయం / ఎకరం' })}</span><b>{inr(revPerAcre)}</b></div>
            <div><span>{L({ en: 'Profit / acre', te: 'లాభం / ఎకరం' })}</span><b>{inr(ppa)}</b></div>
          </div>

          <div className="out-grid">
            <div>
              <span>{t('econ.total', 'Total investment')}</span>
              <b id="oTotal">{inr(total)}</b>
            </div>
            <div>
              <span>{t('econ.prod', 'Production')}</span>
              <b id="oProd">{`${prod.toLocaleString('en-IN', { maximumFractionDigits: 1 })} q`}</b>
            </div>
            <div>
              <span>{t('econ.gross', 'Gross revenue')}</span>
              <b id="oGross">{inr(gross)}</b>
            </div>
            <div>
              <span>{t('econ.be', 'Break-even price')}</span>
              <b id="oBe">{be}</b>
            </div>
            <div>
              <span>{t('econ.roi', 'Return on cost')}</span>
              <b id="oRoi">{roi}</b>
            </div>
          </div>

          <div className="lab">
            <span>{t('econ.cost', 'Cost')}</span>
            <b id="oCostL">{inr(total)}</b>
          </div>
          <div className="stack" id="costStack">
            {COST_KEYS.map((k) => (
              <i
                key={k}
                style={{
                  width: `${((num(costs[k]) * acres) / maxVal) * 100}%`,
                  background: COST_COL[k],
                }}
              />
            ))}
          </div>

          <div className="lab">
            <span>{t('econ.rev', 'Revenue')}</span>
            <b id="oRevL">{inr(gross)}</b>
          </div>
          <div className="stack rev">
            <i id="revBar" style={{ width: `${(gross / maxVal) * 100}%` }} />
          </div>

          <div className="legend" id="legend">
            {COST_KEYS.map((k) => (
              <span key={k}>
                <i style={{ background: COST_COL[k] }} />
                {L(W[k])}{' '}
                {total ? Math.round(((num(costs[k]) * acres) / total) * 100) : 0}%
              </span>
            ))}
          </div>

          <div className="sens">
            <h4>{t('econ.sens', 'If the market price moves')}</h4>
            <p>
              {t(
                'econ.sensP',
                'Profit at 20% below to 20% above your price. Dashed line = zero.'
              )}
            </p>
            <svg
              viewBox="0 0 400 150"
              id="sensChart"
              role="img"
              aria-label="Profit at different selling prices"
            >
              <line
                x1="0"
                x2="400"
                y1={zeroY}
                y2={zeroY}
                stroke="rgba(255,255,255,.4)"
                strokeDasharray="3 5"
              />
              {steps.map((x, i) => {
                const cx = 40 + i * 80;
                const yy = getY(x.p);
                const top = Math.min(yy, zeroY);
                const h = Math.max(2, Math.abs(zeroY - yy));
                const barFill =
                  x.p >= 0 ? (x.s === 0 ? '#FF5A01' : '#CEE2E3') : '#FFB08A';
                const labelText =
                  Math.abs(x.p) >= 1e5
                    ? (x.p / 1e5).toFixed(1) + 'L'
                    : Math.round(x.p / 1000) + 'k';
                const priceLabel =
                  x.s === 0
                    ? '₹' + fmt(num(priceVal))
                    : (x.s > 0 ? '+' : '') + x.s * 100 + '%';

                return (
                  <g key={i}>
                    <rect
                      x={cx - 20}
                      y={top}
                      width="40"
                      height={h}
                      rx="5"
                      fill={barFill}
                    />
                    <text
                      x={cx}
                      y={x.p >= 0 ? top - 6 : top + h + 14}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#fff"
                      fontFamily="Geist"
                    >
                      {labelText}
                    </text>
                    <text
                      x={cx}
                      y="146"
                      textAnchor="middle"
                      fontSize="11.5"
                      fill="rgba(255,255,255,.6)"
                      fontFamily="Geist"
                    >
                      {priceLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </form>
    </section>
  );
}
