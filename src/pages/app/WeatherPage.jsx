import React, { useState } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { estimateIrrigation } from '../../services/irrigationService';
import { byId } from '../../data/cropsData';
import { FORECAST } from '../../data/weatherData';
import {
  generateDayInsights,
  generateFarmerTips,
  getSoilMoistureInterpretation,
  getSoilTempInterpretation,
  getET0Interpretation,
  getRainProbInterpretation,
  getHumidityInterpretation,
  getWindInterpretation,
  getIrrigationInsight,
  getSelectedDayInsight,
} from '../../services/weatherService';

export default function WeatherPage() {
  const { t, L, loc, W } = useLanguage();
  const {
    weatherData,
    weatherLoading,
    weatherStatusMessage,
    weatherError,
    locationInfo,
    locationPermissionDenied,
    refreshWeather,
    requestLocation,
    activeFarm,
  } = useApp();

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const forecastList = weatherData?.forecast?.slice(0, 5) || FORECAST;

  // Safe clamp in case list size changes
  const activeIndex = Math.min(selectedDayIndex, Math.max(0, forecastList.length - 1));
  const isSelectedToday = activeIndex === 0;
  const selectedDay = forecastList[activeIndex] || forecastList[0] || {};

  // Parse YYYY-MM-DD cleanly into local Date without UTC offset issues
  const parseDateStr = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return null;
  };

  const dayName = (i, style = 'short') => {
    if (i === 0) return L(W.today);
    const dStr = weatherData?.forecast?.[i]?.dateStr;
    const parsed = parseDateStr(dStr);
    if (parsed) {
      return parsed.toLocaleDateString(loc, { weekday: style });
    }
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString(loc, { weekday: style });
  };

  // Title for the green detail panel header
  const getPanelHeaderTitle = () => {
    if (isSelectedToday) {
      return t('wx.now', 'RIGHT NOW').toUpperCase();
    }
    const parsed = parseDateStr(selectedDay.dateStr);
    if (parsed) {
      return parsed.toLocaleDateString(loc, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      }).toUpperCase();
    }
    return dayName(activeIndex, 'long').toUpperCase();
  };


  const cur = weatherData?.current;

  // Selected Day vs Today Variables
  const displayTemp = isSelectedToday
    ? (cur ? cur.temperature : activeFarm.temp)
    : (selectedDay.hi ?? activeFarm.temp);

  const displayApparent = isSelectedToday
    ? (cur ? cur.apparentTemperature : activeFarm.temp)
    : null;

  const displayCondition = isSelectedToday
    ? (cur ? L(cur.condition) : L(activeFarm.cond))
    : (selectedDay.condition ? L(selectedDay.condition) : L(activeFarm.cond));

  const displayIcon = isSelectedToday
    ? (cur ? cur.icon : 'cloudsun')
    : (selectedDay.icon || 'cloudsun');

  const displayHigh = isSelectedToday
    ? (cur?.todayMax ?? selectedDay.hi ?? (displayTemp + 2))
    : selectedDay.hi;

  const displayLow = isSelectedToday
    ? (cur?.todayMin ?? selectedDay.lo ?? (displayTemp - 5))
    : selectedDay.lo;

  // 6 fixed metrics for the selected day (identical structure for all days)
  const displayHumidity = isSelectedToday
    ? (cur?.humidity ?? (weatherData ? null : 74))
    : (selectedDay.humidity ?? null);

  const displayRain = isSelectedToday
    ? (cur?.precipitationProbability ?? (weatherData ? null : 20))
    : (selectedDay.rain ?? null);

  const displayWind = isSelectedToday
    ? (cur?.windSpeed ?? (weatherData ? null : 12))
    : (selectedDay.wind ?? null);

  const displaySoilMoist = isSelectedToday
    ? (cur?.soilMoisture ?? (weatherData ? null : 0.24))
    : (selectedDay.soilMoisture ?? null);

  const displaySoilTemp = isSelectedToday
    ? (cur?.soilTemperature ?? (weatherData ? null : 27))
    : (selectedDay.soilTemperature ?? null);

  const displayET0 = isSelectedToday
    ? (cur?.et0 ?? (weatherData ? null : 3.8))
    : (selectedDay.et0 ?? null);

  // Selected Day Agricultural / Irrigation Insight
  const panelHeaderTitle = getPanelHeaderTitle();
  const dayInsight = isSelectedToday
    ? getIrrigationInsight(cur, weatherData?.forecast)
    : getSelectedDayInsight(selectedDay, panelHeaderTitle, false, cur);

  // 3 Dynamic Farm Insight Rows for the selected day
  const selectedDayMetrics = {
    temp: displayTemp,
    rain: displayRain ?? 0,
    rainSum: isSelectedToday ? (cur?.precipitation ?? selectedDay.rainSum ?? 0) : (selectedDay.rainSum ?? 0),
    wind: displayWind ?? 10,
    humidity: displayHumidity,
    soilMoist: displaySoilMoist,
    soilTemp: displaySoilTemp,
    et0: displayET0,
  };

  // Illustrative irrigation need for every crop on the selected plot (ET₀ × Kc × area)
  const irrigation = displayET0 == null ? null : activeFarm.plots.map((p) => {
    const crop = byId(p.crop);
    const fraction = crop ? p.day / ((crop.dur[0] + crop.dur[1]) / 2) : 0.5;
    return { p, crop, est: estimateIrrigation({ cropId: p.crop, acres: p.acres, et0: displayET0, rainMm: selectedDayMetrics.rainSum, fraction }) };
  }).filter((r) => r.est);


  const tips = generateDayInsights(selectedDayMetrics, isSelectedToday);

  // Location display
  let locationDisplay = '';
  if (weatherLoading && !weatherData) {
    locationDisplay = L(weatherStatusMessage);
  } else if (locationInfo?.isLiveGPS && locationInfo?.name) {
    const coordsStr =
      locationInfo.latitude && locationInfo.longitude
        ? ` (${Number(locationInfo.latitude).toFixed(2)}°N, ${Number(locationInfo.longitude).toFixed(2)}°E)`
        : '';
    locationDisplay = `${L(locationInfo.name)}${coordsStr}`;
  } else if (locationInfo?.name) {
    locationDisplay = `${L(locationInfo.name)} · ${L(activeFarm.name)}`;
  } else {
    locationDisplay = L(activeFarm.loc);
  }

  return (
    <section className="panel page" data-page="weather" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('wx.h', 'The week ahead, in field terms')}</h1>
          <p id="weatherLocation">{locationDisplay}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {weatherLoading ? (
            <span className="pill" style={{ background: 'var(--soft)' }}>
              <i
                className="spin"
                style={{
                  width: '8px',
                  height: '8px',
                  borderWidth: '1.5px',
                  marginRight: '4px',
                  display: 'inline-block',
                }}
              />
              <span>{L(weatherStatusMessage)}</span>
            </span>
          ) : locationInfo?.isLiveGPS ? (
            <span className="pill ok">
              <i />
              <span>{L({ en: 'Live GPS Weather', te: 'ప్రత్యక్ష GPS వాతావరణం' })}</span>
            </span>
          ) : (
            <span className="pill demo">
              <i />
              <span>{L({ en: 'Farm Location Weather', te: 'పొలం స్థాన వాతావరణం' })}</span>
            </span>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={() => refreshWeather(true)}
            title={L({ en: 'Refresh live weather', te: 'వాతావరణం రిఫ్రెష్ చేయండి' })}
            aria-label="Refresh weather"
          >
            <Icon name="reset" className={`ico sm ${weatherLoading ? 'spin' : ''}`} />
          </button>
        </div>
      </div>

      {locationPermissionDenied && (
        <div className="alert" role="status" style={{ marginBottom: '16px' }}>
          <div className="h">
            <Icon name="alert" className="ico" />
            <span>{L({ en: 'Location Permission Denied', te: 'స్థాన అనుమతి నిరాకరించబడింది' })}</span>
          </div>
          <p>
            {L({
              en: 'Browser location access was denied. Showing real-time Open-Meteo weather for your registered farm location. Enable location in browser settings to detect your field automatically.',
              te: 'బ్రౌజర్ లొకేషన్ అనుమతి నిరాకరించబడింది. ప్రస్తుతం నమోదిత పొలం స్థానానికి Open-Meteo వాతావరణం చూపిస్తున్నాం. మీ ఖచ్చితమైన పొలం కోసం బ్రౌజర్‌లో లొకేషన్ అనుమతించండి.',
            })}
          </p>
          <button
            type="button"
            className="btn sm"
            onClick={() => requestLocation(true)}
            style={{ marginTop: '4px' }}
          >
            <Icon name="pin" className="ico sm" />
            <span>{L({ en: 'Retry Location Access', te: 'లొకేషన్ మళ్లీ ప్రయత్నించండి' })}</span>
          </button>
        </div>
      )}

      {weatherError && !weatherData && (
        <div className="alert" role="status" style={{ marginBottom: '16px' }}>
          <div className="h">
            <Icon name="alert" className="ico" />
            <span>{L({ en: 'Weather Service Notice', te: 'వాతావరణ సమాచారం' })}</span>
          </div>
          <p>{weatherError}</p>
          <button
            type="button"
            className="btn sm"
            onClick={() => refreshWeather(true)}
            style={{ marginTop: '4px' }}
          >
            <Icon name="reset" className="ico sm" />
            <span>{L({ en: 'Retry Weather Fetch', te: 'మళ్లీ ప్రయత్నించండి' })}</span>
          </button>
        </div>
      )}

      <div className="grid g-ov">
        <div className="card">
          <div className="days" id="days" role="tablist" aria-label="Forecast days">
            {forecastList.map((d, i) => {
              const isSelected = activeIndex === i;
              return (
                <div
                  key={i}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`day ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDayIndex(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDayIndex(i);
                    }
                  }}
                  title={dayName(i, 'long')}
                >
                  <span className="n">{dayName(i, 'short')}</span>
                  <Icon name={d.icon} className="ico" />
                  <span className="hl num">
                    {d.hi}° <span>{d.lo}°</span>
                  </span>
                  <div className="rain" aria-hidden="true">
                    <i style={{ height: `${Math.max(4, (d.rain / 100) * 44)}px` }} />
                  </div>
                  <span className="rp">
                    {d.rain}% {L(W.rain)}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px' }} id="advice">
            {tips.map((x, i) => (
              <div key={i} className="adv">
                <span className="ic">
                  <Icon name={x.ic} className="ico" />
                </span>
                <div>
                  <b>{L(x.t)}</b>
                  <p>{L(x.d)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card dark-card wx-now">
          <div className="wx-now-header">
            <span className="muted">{panelHeaderTitle}</span>
            {isSelectedToday ? (
              displayApparent !== null && (
                <span className="wx-feels">
                  {L({ en: 'Feels', te: 'అనిపించేది' })} {displayApparent}°C
                </span>
              )
            ) : (
              <span className="wx-feels">
                {L({ en: 'Daily Forecast', te: 'రోజువారీ సూచన' })}
              </span>
            )}
          </div>

          <div className="wx-hero">
            <div className="wx-hero-main">
              <div className="t num">
                {displayTemp}<sup>°C</sup>
              </div>
              <div className="wx-hero-cond">
                <Icon name={displayIcon} className="ico" />
                <span>{displayCondition}</span>
              </div>
            </div>
            <div className="wx-hero-range">
              <span>
                {t('wx.high', 'High')} {displayHigh}° · {t('wx.low', 'Low')} {displayLow}°
              </span>
            </div>
          </div>

          <div className="wx-stats">
            <div>
              <span className="lbl">
                <Icon name="drop" className="ico" />
                <span>{t('wx.hum', 'Humidity')}</span>
              </span>
              <b>{displayHumidity != null ? `${displayHumidity}%` : '—'}</b>
              <small className="sub">
                {displayHumidity != null
                  ? L(getHumidityInterpretation(displayHumidity))
                  : '—'}
              </small>
            </div>

            <div>
              <span className="lbl">
                <Icon name="rain" className="ico" />
                <span>{t('wx.rainProb', 'Rain Probability')}</span>
              </span>
              <b>{displayRain != null ? `${displayRain}%` : '—'}</b>
              <small className="sub">
                {displayRain != null
                  ? L(getRainProbInterpretation(displayRain))
                  : '—'}
              </small>
            </div>

            <div>
              <span className="lbl">
                <Icon name="wind" className="ico" />
                <span>{t('wx.wind', 'Wind')}</span>
              </span>
              <b>{displayWind != null ? `${displayWind} km/h` : '—'}</b>
              <small className="sub">
                {displayWind != null
                  ? L(getWindInterpretation(displayWind))
                  : '—'}
              </small>
            </div>

            <div>
              <span className="lbl">
                <Icon name="sprout" className="ico" />
                <span>{t('wx.soilMoist', 'Soil Moisture')}</span>
              </span>
              <b>{displaySoilMoist != null ? `${displaySoilMoist} m³/m³` : '—'}</b>
              <small className="sub">
                {displaySoilMoist != null
                  ? L(getSoilMoistureInterpretation(displaySoilMoist))
                  : '—'}
              </small>
            </div>

            <div>
              <span className="lbl">
                <Icon name="layers" className="ico" />
                <span>{t('wx.soilTemp', 'Soil Temperature')}</span>
              </span>
              <b>{displaySoilTemp != null ? `${displaySoilTemp}°C` : '—'}</b>
              <small className="sub">
                {displaySoilTemp != null
                  ? L(getSoilTempInterpretation(displaySoilTemp))
                  : '—'}
              </small>
            </div>

            <div>
              <span className="lbl">
                <Icon name="tap" className="ico" />
                <span>{t('wx.et0', 'ET₀ (Water loss)')}</span>
              </span>
              <b>{displayET0 != null ? `${displayET0} mm/d` : '—'}</b>
              <small className="sub">
                {displayET0 != null
                  ? L(getET0Interpretation(displayET0))
                  : '—'}
              </small>
            </div>
          </div>

          {dayInsight && (
            <div className="wx-insight-box">
              <div className="h">
                <Icon name="tap" className="ico" />
                <span>{L(dayInsight.title)}</span>
              </div>
              <p>{L(dayInsight.body)}</p>
            </div>
          )}

          {irrigation?.length > 0 && (
            <div className="wx-insight-box">
              <div className="h">
                <Icon name="drop" className="ico" />
                <span>{L({ en: `Irrigation estimate · ${L(activeFarm.name)}`, te: `నీటి అవసరం అంచనా · ${L(activeFarm.name)}` })}</span>
                <span className="pill demo" style={{ marginLeft: 'auto' }}><i /><span>{L({ en: 'Estimate', te: 'అంచనా' })}</span></span>
              </div>
              {irrigation.map(({ p, crop, est }, i) => (
                <p key={i}>
                  {L(crop?.name)} · {p.acres} {L(W.acresW)}: {est.litres > 0
                    ? L({ en: `about ${Math.round(est.litres / 1000).toLocaleString('en-IN')} thousand litres (${est.mm.toFixed(1)} mm)`, te: `సుమారు ${Math.round(est.litres / 1000).toLocaleString('en-IN')} వేల లీటర్లు (${est.mm.toFixed(1)} మి.మీ.)` })
                    : L({ en: 'rain covers the need', te: 'వర్షం సరిపోతుంది' })}
                  <small className="muted"> · ET₀ {displayET0} × Kc {est.kc.toFixed(2)}</small>
                </p>
              ))}
              <small className="muted">{L({ en: 'Illustrative: ET₀ × typical crop factor (FAO-56) × plot area, minus rain. Check soil moisture before watering.', te: 'ఉదాహరణ మాత్రమే: ET₀ × సాధారణ పంట గుణకం (FAO-56) × ప్లాట్ విస్తీర్ణం, వర్షం మినహా. నీరు పెట్టే ముందు నేల తేమ చూడండి.' })}</small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
