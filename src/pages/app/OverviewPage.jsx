import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { byId, cropCost, fmt, IMG } from '../../data/cropsData';
import { FORECAST } from '../../data/weatherData';
import { TASKS, getTodayDateStr } from '../../data/tasksData';
import { STAGES } from '../../data/translations';
import { useMandiPrices, livePriceOf } from '../../hooks/useMandiPrices';
import { generateFarmerTips, generateDayInsights } from '../../services/weatherService';
import { SOURCE_LABEL } from '../../services/farmService';
import { useFarm } from '../../context/FarmContext';
import MapBoundary from '../../components/common/MapBoundary';

// Leaflet loads with the overview card, not the whole app
const FieldMap = lazy(() => import('../../components/farm/FieldMap'));

// Growth stage from how far through its season the crop is (0 Sowing … 4 Harvest)
const stageOf = (pct) => (pct < 10 ? 0 : pct < 45 ? 1 : pct < 75 ? 2 : pct < 100 ? 3 : 4);

// Indian cropping season from today's date: Kharif Jun–Oct, Rabi Nov–Mar, Zaid (summer) Apr–May
const seasonLabel = (d = new Date()) => {
  const m = d.getMonth() + 1, y = d.getFullYear();
  if (m >= 6 && m <= 10) return { en: `Kharif ${y}`, te: `ఖరీఫ్ ${y}` };
  if (m >= 11) return { en: `Rabi ${y}–${String(y + 1).slice(2)}`, te: `రబీ ${y}–${String(y + 1).slice(2)}` };
  if (m <= 3) return { en: `Rabi ${y - 1}–${String(y).slice(2)}`, te: `రబీ ${y - 1}–${String(y).slice(2)}` };
  return { en: `Zaid (summer) ${y}`, te: `వేసవి పంట ${y}` };
};

export default function OverviewPage() {
  const { openPlotEditor, plots } = useFarm();
  const { t, L, loc, W, lang } = useLanguage();
  const {
    activeFarm,
    tasksDone,
    toggleTask,
    getDailyTasks,
    toggleDailyTask,
    scanAlerts = [],
    dismissScanAlert,
    weatherData,
    locationInfo,
    displayName,
  } = useApp();

  const { data: mandi } = useMandiPrices();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const [wxDay, setWxDay] = useState(0);
  const todayStr = getTodayDateStr();
  const todayTasksList = getDailyTasks ? getDailyTasks(todayStr) : TASKS;

  const h = new Date().getHours();
  const greetWord = L(h < 12 ? W.morning : h < 17 ? W.afternoon : W.evening);
  const todayDate = new Date().toLocaleDateString(loc, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const totals = useMemo(() => {
    let cost = 0;
    let rev = 0;
    let acres = 0;
    if (activeFarm?.plots) {
      activeFarm.plots.forEach((p) => {
        const c = byId(p.crop);
        if (c) {
          cost += cropCost(c) * p.acres;
          rev += c.yield * livePriceOf(c, mandi) * p.acres;
          acres += p.acres;
        }
      });
    }
    return { cost, rev, profit: rev - cost, acres };
  }, [activeFarm, mandi]);

  // KPI Animated values
  const [displayVals, setDisplayVals] = useState({
    crops: 0,
    area: 0,
    profit: 0,
    temp: 0,
  });

  useEffect(() => {
    const t0 = performance.now();
    const liveTemp = weatherData?.current?.temperature ?? activeFarm?.temp ?? 28;
    const target = {
      crops: activeFarm?.plots?.length || 0,
      area: totals.acres,
      profit: totals.profit,
      temp: liveTemp,
    };

    let animId;
    const step = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 900));
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayVals({
        crops: Math.round(target.crops * ease),
        area: Number((target.area * ease).toFixed(1)),
        profit: Math.round(target.profit * ease),
        temp: Math.round((target.temp ?? 0) * ease),
      });
      if (p < 1) {
        animId = requestAnimationFrame(step);
      }
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [activeFarm, totals, weatherData]);

  const dayName = (i) => {
    if (i === 0) return L(W.today);
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString(loc, { weekday: 'short' });
  };

  const segs = (pct, n = 9) => (
    <div className="segs">
      {Array.from({ length: n }, (_, i) => (
        <i
          key={i}
          className={(i + 1) / n <= pct / 100 + 0.001 ? 'on' : ''}
        />
      ))}
    </div>
  );

  const doneCount = todayTasksList.filter((t) => t.completed).length;
  // One-line overview of the selected forecast day: conditions + the rule-based field advice for it
  const forecastDays = weatherData?.forecast?.slice(0, 5) || FORECAST;
  const sel = forecastDays[Math.min(wxDay, forecastDays.length - 1)];
  const dayAdvice = sel && generateDayInsights({ temp: sel.hi, rain: sel.rain, rainSum: sel.rainSum, wind: sel.wind, humidity: sel.humidity, soilMoist: sel.soilMoisture, et0: sel.et0 }, wxDay === 0)[0];
  const dayLine = sel && [
    sel.condition && L(sel.condition),
    sel.lo != null ? `${sel.hi}° / ${sel.lo}°` : `${sel.hi}°`,
    `${sel.rain}% ${L({ en: 'chance of rain', te: 'వర్షం అవకాశం' })}`,
    dayAdvice && L(dayAdvice.t),
  ].filter(Boolean).join(' · ');

  const fieldAlert = (weatherData?.current && generateFarmerTips(weatherData.current)[1]) ||
    (activeFarm?.alert ? { t: activeFarm.alert.t, d: activeFarm.alert.b } : {
      t: { en: 'Add your farm plot', te: 'మీ పొలం ప్లాట్ జోడించండి' },
      d: { en: 'Click "Add Plot" to map your field boundary and get customized crop insights.', te: 'ఖచ్చితమైన పంట సలహాల కోసం "ప్లాట్ జోడించండి" నొక్కండి.' }
    });

  const farmSummary = activeFarm
    ? `${L(activeFarm.name)} · ${L(locationInfo?.isLiveGPS && locationInfo?.name ? locationInfo.name : activeFarm.loc)} · ${L(seasonLabel())}`
    : L({ en: 'No farm plot added yet · Please add your plot strictly', te: 'ఇంకా ప్లాట్ జోడించలేదు · దయచేసి ప్లాట్ జోడించండి' });

  return (
    <section className="panel page" data-page="overview" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>
            <span>{greetWord}</span>, <span>{displayName}</span>.
          </h1>
          <p id="farmSummary">
            {farmSummary}
          </p>
        </div>
        <span className="muted" id="todayDate">
          {todayDate}
        </span>
      </div>

      {/* STRICT ADD PLOT CALL-TO-ACTION CARD WHEN NO PLOT IS ADDED */}
      {!activeFarm && (
        <div
          className="card"
          style={{
            padding: '32px 24px',
            marginBottom: '20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.08), rgba(245, 158, 11, 0.08))',
            border: '2px dashed var(--brand, #2e7d32)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#2E7D32',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 4px 14px rgba(46, 125, 50, 0.35)',
            }}
          >
            🌾
          </div>
          <div style={{ maxWidth: '640px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--ink, #111)', margin: '0 0 8px' }}>
              {L({ en: 'Strict Requirement: Add Your Farm Plot', te: 'తప్పనిసరి: మీ పొలం ప్లాట్‌ను జోడించండి' })}
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ink-2, #555)', margin: 0, lineHeight: '1.6' }}>
              {L({
                en: 'You have not added any farm plots yet. FarmWise requires your field location and boundary to unlock live satellite weather, soil profiles, profit calculations, mandi rates, and daily farming tasks strictly for your land.',
                te: 'మీరు ఇంకా ఎటువంటి పొలం ప్లాట్ జోడించలేదు. ప్రత్యక్ష ఉపగ్రహ వాతావరణం, నేల నివేదిక, లాభాల ప్రణాళిక మరియు మార్కెట్ ధరల కోసం మీ పొలం ప్లాట్‌ను జోడించడం తప్పనిసరి.',
              })}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-dark"
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '999px',
              background: '#2E7D32',
              boxShadow: '0 4px 16px rgba(46, 125, 50, 0.35)',
              cursor: 'pointer',
            }}
            onClick={() => openPlotEditor({})}
          >
            <Icon name="plus" className="ico" />
            <span>{L({ en: 'Add Your Farm Plot Strictly', te: 'ఇప్పుడే మీ ప్లాట్‌ను జోడించండి' })}</span>
          </button>
        </div>
      )}

      <div className="grid g4" id="kpis">
        <div className="card kpi">
          <span className="k">
            <Icon name="sprout" className="ico sm" />
            <span>{t('kpi.crops', 'Active Crops')}</span>
          </span>
          <span className="v" id="kCrops">
            {displayVals.crops}
          </span>
          <span className="s" id="kCropsS">
            {activeFarm?.plots?.length
              ? activeFarm.plots.map((p) => L(byId(p.crop)?.name)).join(', ')
              : L({ en: 'No plots added', te: 'ప్లాట్లు లేవు' })}
          </span>
        </div>

        <div className="card kpi">
          <span className="k">
            <Icon name="layers" className="ico sm" />
            <span>{t('kpi.area', 'Farm Area')}</span>
          </span>
          <span className="v">
            <span id="kArea">{displayVals.area.toFixed(1)}</span>
            <small>{t('acres', 'acres')}</small>
          </span>
          <span className="s">
            {activeFarm?.areaSource === 'demo'
              ? t('kpi.areaS', 'Across all plots')
              : activeFarm?.areaSource
              ? L(SOURCE_LABEL[activeFarm.areaSource] || { en: 'Custom plot', te: 'స్వంత ప్లాట్' })
              : L({ en: 'Add plot', te: 'ప్లాట్ జోడించండి' })}
          </span>
        </div>

        <div className="card kpi hl">
          <span className="k">
            <Icon name="rupee" className="ico sm" />
            <span>{t('kpi.profit', 'Estimated Profit')}</span>
          </span>
          <span className="v">
            ₹<span id="kProfit">{fmt(displayVals.profit)}</span>
          </span>
          <span className="s">{t('kpi.profitS', 'This season · estimate')}</span>
        </div>

        <div className="card kpi">
          <span className="k">
            <Icon name={weatherData?.current?.icon || 'cloudsun'} className="ico sm" />
            <span>{t('kpi.wx', 'Weather')}</span>
          </span>
          <span className="v">
            <span id="kTemp">
              {(weatherData?.current?.temperature ?? activeFarm?.temp) == null ? '—' : displayVals.temp}
            </span>
            °C
          </span>
          <span className="s" id="kTempS">
            {weatherData?.current?.condition
              ? L(weatherData.current.condition)
              : activeFarm?.cond
              ? L(activeFarm.cond)
              : '—'}
          </span>
        </div>
      </div>

      <div className="grid g-ov" style={{ marginTop: '12px' }}>
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{t('ov.map', 'Field map')}</h3>
            {!activeFarm && (
              <button
                type="button"
                className="btn sm"
                style={{ minHeight: '30px' }}
                onClick={() => openPlotEditor({})}
              >
                <Icon name="plus" className="ico sm" />
                <span>{L({ en: 'Add Plot', te: 'ప్లాట్ జోడించండి' })}</span>
              </button>
            )}
          </div>
          <div className="map">
            {activeFarm ? (
              <>
                <MapBoundary
                  message={L({ en: 'The map could not load. Check your internet.', te: 'మ్యాప్ లోడ్ కాలేదు. ఇంటర్నెట్ చూడండి.' })}
                  retry={L({ en: 'Retry', te: 'మళ్లీ ప్రయత్నించండి' })}
                >
                  <Suspense fallback={null}>
                    <FieldMap
                      plot={activeFarm.record}
                      label={`${L(activeFarm.name)} · ${activeFarm.plots.map((p) => L(byId(p.crop)?.name)).join(', ')} · ${+totals.acres.toFixed(2)} ${L(W.acresW)}`}
                    />
                  </Suspense>
                </MapBoundary>
                <div className="over">
                  <span className="w" id="mapPlotsN">
                    {`${activeFarm.plots.length} ${L(activeFarm.plots.length === 1 ? { en: 'plot', te: 'ప్లాట్' } : W.plots)} · ${+totals.acres.toFixed(2)} ${L(W.acresW)}`}
                  </span>
                  <a className="btn sm" href="#/app/crops" style={{ minHeight: '30px' }}>
                    {t('ov.explore', 'Explore crops')}
                  </a>
                  {!activeFarm.record?.polygon && (
                    <button
                      type="button"
                      className="btn sm"
                      style={{ minHeight: '30px' }}
                      onClick={() => openPlotEditor(activeFarm.record)}
                    >
                      {L({ en: 'Draw boundary', te: 'సరిహద్దు గీయండి' })}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  height: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--soft, #f3f3f1)',
                  borderRadius: '12px',
                  gap: '12px',
                  color: 'var(--ink-2, #666)',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <Icon name="pin" style={{ width: '40px', height: '40px', color: '#2E7D32' }} />
                <b style={{ fontSize: '16px' }}>{L({ en: 'No Farm Plot Added', te: 'ఇంకా పొలం ప్లాట్ జోడించలేదు' })}</b>
                <p style={{ margin: 0, fontSize: '14px', maxWidth: '400px' }}>
                  {L({
                    en: 'Map your plot boundary or enter your acres to see satellite imagery and field boundaries.',
                    te: 'ఉపగ్రహ చిత్రం మరియు సరిహద్దుల కోసం మీ ప్లాట్‌ను నమోదు చేయండి.',
                  })}
                </p>
                <button
                  type="button"
                  className="btn btn-dark sm"
                  style={{ background: '#2E7D32', color: '#fff', marginTop: '6px' }}
                  onClick={() => openPlotEditor({})}
                >
                  <Icon name="plus" className="ico sm" />
                  <span>{L({ en: 'Add Plot Now', te: 'ఇప్పుడే ప్లాట్ జోడించండి' })}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid" style={{ alignContent: 'start', gap: '12px' }}>
          {scanAlerts.map((sa) => (
            <div
              key={sa.id}
              className="alert"
              role="status"
              style={{
                background: '#FFF9F5',
                borderColor: '#FFD4C2',
                color: 'var(--ink)',
              }}
            >
              <div className="h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="scan" className="ico" style={{ color: 'var(--orange)' }} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{sa.possible_issue || sa.title}</span>
                    <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '2px' }}>
                      {sa.identified_crop ? `${sa.identified_crop} · ` : ''}
                      {new Date(sa.date).toLocaleDateString(loc, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pill" style={{ fontSize: '11px', padding: '2px 8px', background: '#EAF6E8', color: '#1F5211', fontWeight: 600, border: '1px solid #A3E635' }}>
                    <span>{L({ en: 'AI Scan', te: 'AI స్కాన్' })}</span>
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => dismissScanAlert(sa.id)}
                    aria-label={L({ en: 'Dismiss alert', te: 'అలర్ట్ తీసివేయండి' })}
                    style={{ width: '28px', height: '28px', minWidth: '28px' }}
                  >
                    <Icon name="x" className="ico sm" />
                  </button>
                </div>
              </div>
              {sa.first_step && (
                <p style={{ margin: '8px 0 10px', fontSize: '13.5px', color: 'var(--ink-2)' }}>
                  <strong>{L({ en: 'Action: ', te: 'చర్య: ' })}</strong>
                  {sa.first_step}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                <a
                  className="btn btn-dark sm"
                  href="#/app/scan"
                  style={{ textDecoration: 'none', minHeight: '34px', fontSize: '13px' }}
                >
                  <Icon name="scan" className="ico sm" />
                  <span>{L({ en: 'Scan another leaf', te: 'మరో ఆకును స్కాన్ చేయండి' })}</span>
                </a>
                <a
                  className="btn sm"
                  href="#/app/market"
                  style={{ textDecoration: 'none', minHeight: '34px', fontSize: '13px', background: '#FFFFFF', color: '#111310' }}
                >
                  <Icon name="store" className="ico sm" />
                  <span>{L({ en: 'Nearby input shops', te: 'సమీప దుకాణాలు' })}</span>
                </a>
              </div>
            </div>
          ))}

          <div className="alert" role="status">
            <div className="h">
              <Icon name="alert" className="ico" />
              <span id="alertTitle">{L(fieldAlert.t)}</span>
            </div>
            <p id="alertBody">{L(fieldAlert.d)}</p>
            <a className="btn sm" href="#/app/scan">
              <Icon name="scan" className="ico sm" />
              <span>{t('dash.scanNow', 'Scan a leaf')}</span>
            </a>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>{t('dash.tasks', 'Today’s farm tasks')}</h3>
              <a
                className="muted"
                href="#/app/tasks"
                id="miniTaskCount"
                style={{ fontSize: '13.5px', textDecoration: 'none' }}
              >
                {`${doneCount} / ${todayTasksList.length} ${L(W.done)}`}
              </a>
            </div>
            <div id="miniTasks" style={{ maxHeight: 248, overflowY: 'auto', paddingRight: 4 }}>
              {todayTasksList.map((task) => (
                <label key={task.id} className="mt">
                  <input
                    type="checkbox"
                    checked={!!task.completed}
                    onChange={() => (toggleDailyTask ? toggleDailyTask(todayStr, task.id) : toggleTask(task.id))}
                  />
                  <span className="box">
                    <Icon name="check" className="ico sm" />
                  </span>
                  <span className="txt">{L(task.title || task.t)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: '12px' }}>
        <div className="card">
          <div className="card-h">
            <h3>{t('dash.progress', 'Crop growth cycle')}</h3>
            <a className="icon-btn" href="#/app/crops" aria-label="Crops">
              <Icon name="arrow-ur" className="ico sm" />
            </a>
          </div>
          <div id="cropProgress">
            {activeFarm?.plots?.length ? (
              activeFarm.plots.map((p, i) => {
                const c = byId(p.crop);
                if (!c) return null;
                const total = Math.round((c.dur[0] + c.dur[1]) / 2);
                const pct = Math.min(100, Math.round((p.day / total) * 100));
                return (
                  <div key={i} className="cprog">
                    <img src={IMG(c.img, 120)} alt="" />
                    <div>
                      <div className="t">
                        <b style={{ fontWeight: 500 }}>
                          {L(c.name)} · {L(W.plot)} {p.label}
                        </b>
                        <span>
                          {STAGES[lang][stageOf(pct)]} · {pct}%
                        </span>
                      </div>
                      {segs(pct)}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="muted" style={{ padding: '16px 0', fontSize: '14px' }}>
                {L({
                  en: 'No plots added yet. Click "+ Add Plot" above to start tracking crop cycles.',
                  te: 'ఇంకా ప్లాట్లు లేవు. పంట చక్రం కోసం పైనున్న "+ ప్లాట్ జోడించండి" నొక్కండి.',
                })}
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>{t('dash.forecast', '5-day forecast')}</h3>
            <a className="icon-btn" href="#/app/weather" aria-label="Weather">
              <Icon name="arrow-ur" className="ico sm" />
            </a>
          </div>
          <div className="wx-mini" id="wxMini">
            {forecastDays.map((d, i) => (
              <button key={i} type="button" aria-pressed={i === wxDay} onClick={() => setWxDay(i)}>
                <span>{dayName(i)}</span>
                <Icon name={d.icon} className="ico" />
                <b>{d.hi}°</b>
                <span>{d.rain}%</span>
              </button>
            ))}
          </div>
          {dayLine && (
            <p className="muted" aria-live="polite" style={{ fontSize: 13.5, marginTop: 12, lineHeight: 1.5 }}>
              <b style={{ fontWeight: 500, color: 'var(--ink)' }}>{dayName(wxDay)}:</b> {dayLine}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
