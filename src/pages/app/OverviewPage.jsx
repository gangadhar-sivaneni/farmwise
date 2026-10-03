import React, { useMemo, useState, useEffect } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { byId, cropCost, fmt, IMG } from '../../data/cropsData';
import { FORECAST } from '../../data/weatherData';
import { TASKS, getTodayDateStr } from '../../data/tasksData';
import { STAGES } from '../../data/translations';
import { useMandiPrices, livePriceOf } from '../../hooks/useMandiPrices';
import { generateFarmerTips } from '../../services/weatherService';

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
    locationInfo
  } = useApp();

  const { data: mandi } = useMandiPrices();
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
    activeFarm.plots.forEach((p) => {
      const c = byId(p.crop);
      if (c) {
        cost += cropCost(c) * p.acres;
        rev += c.yield * livePriceOf(c, mandi) * p.acres;
        acres += p.acres;
      }
    });
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
    const liveTemp = weatherData?.current?.temperature ?? activeFarm.temp;
    const target = {
      crops: activeFarm.plots.length,
      area: totals.acres,
      profit: totals.profit,
      temp: liveTemp,
    };

    let animId;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 900);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayVals({
        crops: Math.round(target.crops * ease),
        area: Number((target.area * ease).toFixed(1)),
        profit: Math.round(target.profit * ease),
        temp: Math.round(target.temp * ease),
      });
      if (p < 1) {
        animId = requestAnimationFrame(step);
      }
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [activeFarm, totals, weatherData]);

  const centroid = (poly) => {
    const pts = poly.split(' ').map((p) => p.split(',').map(Number));
    return pts.reduce(
      (a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length],
      [0, 0]
    );
  };

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
  const fieldAlert = (weatherData?.current && generateFarmerTips(weatherData.current)[1]) || { t: activeFarm.alert.t, d: activeFarm.alert.b };

  return (
    <section className="panel page" data-page="overview" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>
            <span>{greetWord}</span>, <span>{t('name', 'Gangadhar')}</span>.
          </h1>
          <p id="farmSummary">
            {`${L(locationInfo?.isLiveGPS && locationInfo?.name ? locationInfo.name : activeFarm.loc)} · ${L(seasonLabel())}`}
          </p>
        </div>
        <span className="muted" id="todayDate">
          {todayDate}
        </span>
      </div>

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
            {activeFarm.plots.map((p) => L(byId(p.crop)?.name)).join(', ')}
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
          <span className="s">{t('kpi.areaS', 'Across all plots')}</span>
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
            <Icon name={weatherData?.current?.icon || "cloudsun"} className="ico sm" />
            <span>{t('kpi.wx', 'Weather')}</span>
          </span>
          <span className="v">
            <span id="kTemp">{displayVals.temp}</span>°C
          </span>
          <span className="s" id="kTempS">
            {weatherData?.current?.condition ? L(weatherData.current.condition) : L(activeFarm.cond)}
          </span>
        </div>
      </div>

      <div className="grid g-ov" style={{ marginTop: '12px' }}>
        <div className="card">
          <div className="card-h">
            <h3>{t('ov.map', 'Field map')}</h3>
          </div>
          <div className="map">
            <img
              src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=70"
              alt=""
            />
            <svg viewBox="0 0 400 250" preserveAspectRatio="none" id="farmMap" role="img">
              {activeFarm.plots.map((p, i) => {
                const [cx, cy] = centroid(p.poly);
                const dark = p.fill === '#CEE2E3' || p.fill === '#F2D22E';
                const cropObj = byId(p.crop);
                return (
                  <g key={i}>
                    <polygon
                      points={p.poly}
                      fill={p.fill}
                      fillOpacity=".9"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                    <text
                      x={cx}
                      y={cy - 2}
                      textAnchor="middle"
                      fontFamily="Geist, Noto Sans Telugu"
                      fontSize="13"
                      fontWeight="600"
                      fill={dark ? '#111310' : '#fff'}
                    >
                      {L(W.plot)} {p.label} · {L(cropObj?.name)}
                    </text>
                    <text
                      x={cx}
                      y={cy + 14}
                      textAnchor="middle"
                      fontFamily="Geist"
                      fontSize="11"
                      fill={dark ? '#4F534B' : 'rgba(255,255,255,.85)'}
                    >
                      {p.acres} {L(p.acres === 1 ? { en: 'acre', te: 'ఎకరం' } : W.acresW)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="over">
              <span className="w" id="mapPlotsN">
                {`${activeFarm.plots.length} ${L(W.plots)} · ${totals.acres} ${L(W.acresW)}`}
              </span>
              <a
                className="btn sm"
                href="#/app/crops"
                style={{ minHeight: '30px' }}
              >
                {t('ov.explore', 'Explore crops')}
              </a>
            </div>
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
                color: 'var(--ink)'
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
            <div id="miniTasks">
              {todayTasksList.slice(0, 4).map((task) => (
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
            {activeFarm.plots.map((p, i) => {
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
            })}
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
            {(weatherData?.forecast?.slice(0, 5) || FORECAST).map((d, i) => (
              <div key={i}>
                <span>{dayName(i)}</span>
                <Icon name={d.icon} className="ico" />
                <b>{d.hi}°</b>
                <span>{d.rain}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
