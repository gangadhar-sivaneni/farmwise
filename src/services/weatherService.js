/**
 * Real-time Weather Service using Open-Meteo API
 * https://open-meteo.com/
 *
 * Implements browser geolocation, Open-Meteo real-time & forecast fetching,
 * reverse geocoding, WMO weather code interpretation, and farmer-friendly rule-based insights.
 */

// Cache duration: 10 minutes in milliseconds
const CACHE_TTL_MS = 10 * 60 * 1000;
const weatherCache = new Map();

/**
 * Request user's current GPS location using the browser Geolocation API
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject({
        code: 'GEOLOCATION_UNSUPPORTED',
        message: 'Geolocation is not supported by your browser',
        isDenied: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let code = 'UNKNOWN_ERROR';
        if (error.code === 1) code = 'PERMISSION_DENIED';
        else if (error.code === 2) code = 'POSITION_UNAVAILABLE';
        else if (error.code === 3) code = 'TIMEOUT';

        reject({
          code,
          message: error.message,
          isDenied: error.code === 1,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000, // 5 min cache
      }
    );
  });
}

/**
 * Map WMO weather codes from Open-Meteo to human-readable bilingual conditions.
 * 0 → Clear sky
 * 1–3 → Mainly clear / partly cloudy / overcast
 * 45–48 → Fog
 * 51–57 → Drizzle
 * 61–67 → Rain
 * 71–77 → Snow
 * 80–82 → Rain showers
 * 95 → Thunderstorm
 * 96–99 → Thunderstorm with hail
 */
export function getWeatherDescription(code) {
  const c = Number(code);
  if (c === 0) {
    return { en: 'Clear sky', te: 'నిర్మలమైన ఆకాశం' };
  }
  if (c === 1) {
    return { en: 'Mainly clear', te: 'చాలావరకు నిర్మలం' };
  }
  if (c === 2) {
    return { en: 'Partly cloudy', te: 'పాక్షికంగా మేఘావృతం' };
  }
  if (c === 3) {
    return { en: 'Overcast', te: 'మేఘావృతం' };
  }
  if (c === 45 || c === 48) {
    return { en: 'Fog', te: 'పొగమంచు' };
  }
  if (c === 51 || c === 53 || c === 55) {
    return { en: 'Drizzle', te: 'చినుకులు' };
  }
  if (c === 56 || c === 57) {
    return { en: 'Freezing drizzle', te: 'చల్లని చినుకులు' };
  }
  if (c === 61) {
    return { en: 'Slight rain', te: 'తేలికపాటి వర్షం' };
  }
  if (c === 63) {
    return { en: 'Moderate rain', te: 'మోస్తరు వర్షం' };
  }
  if (c === 65) {
    return { en: 'Heavy rain', te: 'భారీ వర్షం' };
  }
  if (c === 66 || c === 67) {
    return { en: 'Freezing rain', te: 'చల్లని వర్షం' };
  }
  if (c >= 71 && c <= 77) {
    return { en: 'Snowfall', te: 'మంచు కురిసే అవకాశం' };
  }
  if (c === 80) {
    return { en: 'Light rain showers', te: 'తేలికపాటి జల్లులు' };
  }
  if (c === 81 || c === 82) {
    return { en: 'Rain showers', te: 'వర్షపు జల్లులు' };
  }
  if (c === 95) {
    return { en: 'Thunderstorm', te: 'ఉరుములతో కూడిన వర్షం' };
  }
  if (c >= 96 && c <= 99) {
    return { en: 'Thunderstorm with hail', te: 'వడగండ్ల వాన' };
  }
  return { en: 'Clear sky', te: 'నిర్మలమైన ఆకాశం' };
}

/**
 * Map WMO weather code to one of the icons available in the existing sprite:
 * 'sun' | 'cloudsun' | 'cloud' | 'rain'
 */
export function getWeatherIcon(code) {
  const c = Number(code);
  if (c === 0) return 'sun';
  if (c === 1 || c === 2) return 'cloudsun';
  if (c === 3 || c === 45 || c === 48) return 'cloud';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || (c >= 95 && c <= 99)) return 'rain';
  if (c >= 71 && c <= 77) return 'cloud';
  return 'cloudsun';
}

/**
 * Fetch real-time weather and forecast data from Open-Meteo
 * @param {number} latitude
 * @param {number} longitude
 * @param {boolean} [bypassCache=false]
 */
export async function fetchWeather(latitude, longitude, bypassCache = false) {
  if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Valid latitude and longitude coordinates are required.');
  }

  const latKey = Number(latitude).toFixed(3);
  const lonKey = Number(longitude).toFixed(3);
  const cacheKey = `${latKey},${lonKey}`;

  if (!bypassCache) {
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latKey}&longitude=${lonKey}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=relative_humidity_2m,wind_speed_10m,soil_temperature_0_to_10cm,soil_moisture_0_to_10cm,et0_fao_evapotranspiration,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,uv_index_max&timezone=auto`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo server responded with status: ${res.status}`);
    }

    const json = await res.json();
    const parsed = parseWeatherData(json);

    weatherCache.set(cacheKey, {
      timestamp: Date.now(),
      data: parsed,
    });

    return parsed;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Weather request timed out. Please check your network connection.');
    }
    throw err;
  }
}

/**
 * Parse raw Open-Meteo JSON into a structured, farmer-friendly format
 */
export function parseWeatherData(data) {
  const cur = data.current || {};
  const daily = data.daily || {};
  const hourly = data.hourly || {};

  // Find matching hour index for soil and ET0 metrics
  const curTime = cur.time || '';
  const curPrefix = curTime.slice(0, 13);
  const hourlyTimes = hourly.time || [];
  let hourIdx = hourlyTimes.findIndex((t) => t.startsWith(curPrefix));
  if (hourIdx < 0) hourIdx = 0;

  const soilMoisture =
    hourly.soil_moisture_0_to_10cm?.[hourIdx] != null
      ? Number(hourly.soil_moisture_0_to_10cm[hourIdx].toFixed(2))
      : null;

  const soilTemp =
    hourly.soil_temperature_0_to_10cm?.[hourIdx] != null
      ? Math.round(hourly.soil_temperature_0_to_10cm[hourIdx])
      : null;

  const et0Daily =
    daily.et0_fao_evapotranspiration?.[0] != null
      ? Number(daily.et0_fao_evapotranspiration[0].toFixed(1))
      : hourly.et0_fao_evapotranspiration?.[hourIdx] != null
      ? Number(hourly.et0_fao_evapotranspiration[hourIdx].toFixed(1))
      : null;

  const uvIndex =
    hourly.uv_index?.[hourIdx] != null
      ? Number(hourly.uv_index[hourIdx].toFixed(1))
      : daily.uv_index_max?.[0] != null
      ? Number(daily.uv_index_max[0].toFixed(1))
      : null;

  const current = {
    time: cur.time,
    temperature: Math.round(cur.temperature_2m ?? 0),
    temperatureExact: cur.temperature_2m,
    apparentTemperature: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
    humidity: Math.round(cur.relative_humidity_2m ?? 0),
    precipitation: Number((cur.precipitation ?? 0).toFixed(1)),
    weatherCode: cur.weather_code ?? 0,
    condition: getWeatherDescription(cur.weather_code ?? 0),
    icon: getWeatherIcon(cur.weather_code ?? 0),
    windSpeed: Math.round(cur.wind_speed_10m ?? 0),
    windSpeedExact: cur.wind_speed_10m,
    soilMoisture,
    soilTemperature: soilTemp,
    et0: et0Daily,
    uvIndex,
  };

  // Group hourly data by date (YYYY-MM-DD) to calculate daily forecast metrics
  const dailyHourlyMap = {};
  hourlyTimes.forEach((t, idx) => {
    const dayStr = t.slice(0, 10);
    if (!dailyHourlyMap[dayStr]) {
      dailyHourlyMap[dayStr] = { hum: [], soilM: [], soilT: [], wind: [] };
    }
    if (hourly.relative_humidity_2m?.[idx] != null) {
      dailyHourlyMap[dayStr].hum.push(hourly.relative_humidity_2m[idx]);
    }
    if (hourly.soil_moisture_0_to_10cm?.[idx] != null) {
      dailyHourlyMap[dayStr].soilM.push(hourly.soil_moisture_0_to_10cm[idx]);
    }
    if (hourly.soil_temperature_0_to_10cm?.[idx] != null) {
      dailyHourlyMap[dayStr].soilT.push(hourly.soil_temperature_0_to_10cm[idx]);
    }
    if (hourly.wind_speed_10m?.[idx] != null) {
      dailyHourlyMap[dayStr].wind.push(hourly.wind_speed_10m[idx]);
    }
  });

  const forecast = [];
  const times = daily.time || [];

  for (let i = 0; i < times.length; i++) {
    const dateStr = times[i];
    const dayH = dailyHourlyMap[dateStr] || {};
    const code = daily.weather_code?.[i] ?? 0;
    const hi = Math.round(daily.temperature_2m_max?.[i] ?? current.temperature);
    const lo = Math.round(daily.temperature_2m_min?.[i] ?? (current.temperature - 5));
    const rain = Math.round(daily.precipitation_probability_max?.[i] ?? 0);
    const rainSum = Number((daily.precipitation_sum?.[i] ?? 0).toFixed(1));
    const windSpeed = Math.round(
      daily.wind_speed_10m_max?.[i] ??
        (dayH.wind?.length ? dayH.wind.reduce((a, b) => a + b, 0) / dayH.wind.length : current.windSpeed)
    );
    const avgHum = dayH.hum?.length
      ? Math.round(dayH.hum.reduce((a, b) => a + b, 0) / dayH.hum.length)
      : null;
    const avgSoilM = dayH.soilM?.length
      ? Number((dayH.soilM.reduce((a, b) => a + b, 0) / dayH.soilM.length).toFixed(2))
      : null;
    const avgSoilT = dayH.soilT?.length
      ? Math.round(dayH.soilT.reduce((a, b) => a + b, 0) / dayH.soilT.length)
      : null;
    const et0Day =
      daily.et0_fao_evapotranspiration?.[i] != null
        ? Number(daily.et0_fao_evapotranspiration[i].toFixed(1))
        : null;

    forecast.push({
      dateStr,
      hi,
      lo,
      rain,
      rainSum,
      wind: windSpeed,
      humidity: avgHum,
      soilMoisture: avgSoilM,
      soilTemperature: avgSoilT,
      et0: et0Day,
      weatherCode: code,
      condition: getWeatherDescription(code),
      icon: getWeatherIcon(code),
    });
  }

  // Populate current precipitation probability and max/min from today's forecast
  if (forecast[0]) {
    current.precipitationProbability = forecast[0].rain;
    current.todayMax = forecast[0].hi;
    current.todayMin = forecast[0].lo;
    current.todayPrecipitationSum = forecast[0].rainSum;
  } else {
    current.precipitationProbability = current.precipitation > 0 ? 80 : 0;
    current.todayMax = current.temperature;
    current.todayMin = current.temperature - 5;
    current.todayPrecipitationSum = current.precipitation;
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone || 'Asia/Kolkata',
    current,
    forecast,
    fetchedAt: Date.now(),
  };
}

/**
 * Reverse geocode latitude and longitude to a human-readable location name.
 * Uses BigDataCloud client-side reverse geocode endpoint (CORS-friendly, no API key).
 * Falls back to OpenStreetMap Nominatim or formatted coordinates.
 */
export async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&localityLanguage=en`
    );
    if (res.ok) {
      const d = await res.json();
      const place = d.locality || d.city || d.district || '';
      const state = d.principalSubdivision || '';
      const country = d.countryName || 'India';

      let label = place;
      if (state && state !== place) {
        label = label ? `${label}, ${state}` : state;
      }
      if (!label && country) {
        label = country;
      }

      if (label) {
        return {
          displayName: label,
          city: d.city || place,
          state: state,
          country: country,
        };
      }
    }
  } catch {
    // Fallback: continue to Nominatim
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=10`
    );
    if (res.ok) {
      const d = await res.json();
      const addr = d.address || {};
      const place = addr.city || addr.town || addr.county || addr.district || addr.state_district || '';
      const state = addr.state || '';
      let label = place;
      if (state && state !== place) {
        label = label ? `${label}, ${state}` : state;
      }
      if (label) {
        return {
          displayName: label,
          city: place,
          state: state,
        };
      }
    }
  } catch {
    // Fallback: formatted coordinate string
  }

  const coordStr = `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
  return {
    displayName: coordStr,
    city: coordStr,
    state: '',
  };
}

/**
 * Generate actionable, farmer-friendly rule-based recommendations from real-time weather and forecast.
 * Covers:
 * 1. Irrigation recommendation (Rule-based recommendation)
 * 2. Pest & fungal disease risk advisory
 * 3. Spraying & field activity window
 */
/**
 * Generate 3 dynamic date-specific agricultural insights for the selected day:
 * 1. Irrigation / Soil
 * 2. Crop Inspection
 * 3. Spraying / Farm Activity
 */
export function generateDayInsights(dayMetrics, isToday = false) {
  if (!dayMetrics) return [];

  const temp = Math.round(dayMetrics.temp ?? 28);
  const rain = Math.round(dayMetrics.rain ?? 0);
  const rainSum = Number((dayMetrics.rainSum ?? 0).toFixed(1));
  const wind = Math.round(dayMetrics.wind ?? 10);
  const humidity = dayMetrics.humidity != null ? Math.round(dayMetrics.humidity) : null;
  const et0 = dayMetrics.et0 != null ? Number(dayMetrics.et0.toFixed(1)) : null;
  const soilMoist = dayMetrics.soilMoist != null ? Number(dayMetrics.soilMoist.toFixed(2)) : null;

  const insights = [];

  // ==================================================
  // INSIGHT 1 — IRRIGATION / SOIL
  // ==================================================
  if (rain >= 50 || rainSum >= 3) {
    insights.push({
      ic: 'rain',
      t: {
        en: 'Rain may reduce irrigation needs',
        te: 'వర్షం వలన నీటి అవసరం తగ్గే అవకాశం',
      },
      d: {
        en: isToday
          ? 'Rain is expected today. Check actual soil moisture before scheduling irrigation. (Rule-based recommendation)'
          : 'Rain is expected. Check actual soil moisture before scheduling irrigation. (Rule-based recommendation)',
        te: isToday
          ? 'ఈరోజు వర్షం అవకాశం ఉంది. నీటిపారుదల నిర్ణయించే ముందు వాస్తవ నేల తేమను పరిశీలించండి. (సూచన మాత్రమే)'
          : 'వర్షం అవకాశం ఉంది. నీటిపారుదల నిర్ణయించే ముందు వాస్తవ నేల తేమను పరిశీలించండి. (సూచన మాత్రమే)',
      },
    });
  } else if ((et0 != null && et0 >= 5.0 && rain < 35) || (temp >= 35 && rain < 25)) {
    insights.push({
      ic: 'tap',
      t: {
        en: 'High irrigation demand',
        te: 'అధిక నీటిపారుదల అవసరం',
      },
      d: {
        en: 'Low rainfall is expected with higher water loss. Check soil moisture before irrigating. (Rule-based recommendation)',
        te: 'తక్కువ వర్షం మరియు అధిక నీటి ఆవిరి రేటు అవకాశం. నీరు పెట్టే ముందు నేల తేమను పరిశీలించండి. (సూచన మాత్రమే)',
      },
    });
  } else if (soilMoist != null && soilMoist < 0.16 && rain < 35) {
    insights.push({
      ic: 'tap',
      t: {
        en: 'Low soil moisture — check plots',
        te: 'తక్కువ నేల తేమ — పొలాన్ని పరిశీలించండి',
      },
      d: {
        en: `Topsoil moisture is low (${soilMoist} m³/m³). Check root-zone moisture before deciding on irrigation. (Rule-based recommendation)`,
        te: `నేలలో తేమ తక్కువగా ఉంది (${soilMoist} m³/m³). నీరు పెట్టే ముందు నేలను పరీక్షించండి. (సూచన మాత్రమే)`,
      },
    });
  } else {
    insights.push({
      ic: 'tap',
      t: {
        en: 'Moderate irrigation conditions',
        te: 'మోస్తరు నీటిపారుదల పరిస్థితులు',
      },
      d: {
        en: 'Some rainfall is possible. Check soil moisture before deciding on irrigation. (Rule-based recommendation)',
        te: 'కొంత వర్షం అవకాశం ఉంది. నీరు పెట్టే ముందు నేల తేమను పరిశీలించండి. (సూచన మాత్రమే)',
      },
    });
  }

  // ==================================================
  // INSIGHT 2 — CROP INSPECTION
  // ==================================================
  if (rain >= 55 || rainSum >= 3) {
    insights.push({
      ic: 'rain',
      t: {
        en: 'Wet conditions expected',
        te: 'తేమతో కూడిన వాతావరణం',
      },
      d: {
        en: 'Rain is likely. Consider checking fields after rainfall for standing water or crop stress.',
        te: 'వర్షం అవకాశం ఉంది. వర్షం తగ్గాక పొలంలో నీరు నిల్వ లేదా పంట ఒత్తిడిని పరిశీలించండి.',
      },
    });
  } else if (temp >= 34) {
    insights.push({
      ic: 'sun',
      t: {
        en: 'Hot conditions — inspect carefully',
        te: 'అధిక వేడి — జాగ్రత్తగా పరిశీలించండి',
      },
      d: {
        en: 'High temperatures are expected. Schedule field inspection during cooler morning or evening hours.',
        te: 'అధిక ఉష్ణోగ్రతలు అంచనా. ఉదయం లేదా సాయంత్రం వేళల్లో పొలం పరిశీలన చేయండి.',
      },
    });
  } else if (humidity != null && humidity >= 75) {
    insights.push({
      ic: 'bug',
      t: {
        en: 'Humid conditions raise pest & disease risk',
        te: 'అధిక తేమ తెగుళ్ల ప్రమాదాన్ని పెంచుతుంది',
      },
      d: {
        en: 'High relative humidity favors fungal growth and foliar pests. Scout crop whorls and leaf undersides.',
        te: 'అధిక తేమ వల్ల శిలీంధ్రాలు మరియు పురుగులు వ్యాపించే అవకాశం ఉంది. ఆకుల అడుగుభాగం పరిశీలించండి.',
      },
    });
  } else if (wind >= 20) {
    insights.push({
      ic: 'wind',
      t: {
        en: 'Windy conditions',
        te: 'వేగవంతమైన గాలి',
      },
      d: {
        en: 'Stronger winds are expected. Avoid unnecessary field activities during peak wind periods.',
        te: 'గాలి వేగం ఎక్కువ. గాలి తగ్గే వరకు అవసరం లేని పనులను నివారించండి.',
      },
    });
  } else {
    insights.push({
      ic: 'bug',
      t: {
        en: 'Good conditions for crop inspection',
        te: 'పంట పరిశీలనకు అనుకూలమైన వాతావరణం',
      },
      d: {
        en: 'Moderate temperature and humidity with low rainfall. Routine crop scouting can be carried out.',
        te: 'మోస్తరు ఉష్ణోగ్రత మరియు తేమతో సాధారణ పంట పరిశీలన కొనసాగించవచ్చు.',
      },
    });
  }

  // ==================================================
  // INSIGHT 3 — SPRAYING / FARM ACTIVITY
  // ==================================================
  if (rain >= 50 || rainSum >= 2) {
    insights.push({
      ic: 'rain',
      t: {
        en: 'Rain may affect spraying',
        te: 'వర్షం స్ప్రేయింగ్‌పై ప్రభావం చూపవచ్చు',
      },
      d: {
        en: 'Rain is expected. Consider avoiding spraying immediately before rainfall.',
        te: 'వర్షం అవకాశం ఉంది. మందులు కొట్టుకుపోయే ప్రమాదం ఉన్నందున స్ప్రేయింగ్ నివారించండి.',
      },
    });
  } else if (wind >= 14) {
    insights.push({
      ic: 'wind',
      t: {
        en: 'Wind may affect spraying',
        te: 'గాలి స్ప్రేయింగ్‌పై ప్రభావం చూపవచ్చు',
      },
      d: {
        en: 'Stronger winds are expected. Consider postponing spraying to a calmer period.',
        te: 'గాలి వేగం ఎక్కువ. మందు కొట్టుకుపోయే ప్రమాదం ఉన్నందున గాలి తగ్గాక స్ప్రే చేయండి.',
      },
    });
  } else if (temp >= 35) {
    insights.push({
      ic: 'sun',
      t: {
        en: 'High temperature conditions',
        te: 'అధిక ఉష్ణోగ్రత పరిస్థితులు',
      },
      d: {
        en: 'High temperatures are expected. Consider cooler morning or evening hours for field activities.',
        te: 'అధిక ఉష్ణోగ్రతలు అంచనా. ఉదయం లేదా సాయంత్రం చల్లని వేళల్లో పనులు చేపట్టండి.',
      },
    });
  } else {
    insights.push({
      ic: 'sun',
      t: {
        en: 'Favourable spraying conditions',
        te: 'స్ప్రేయింగ్‌కు అనుకూలమైన వాతావరణం',
      },
      d: {
        en: 'Low rainfall probability and gentle winds may provide a suitable spraying window. Follow crop and product guidance.',
        te: 'తక్కువ వర్ష అవకాశం మరియు తేలికపాటి గాలి స్ప్రేకు అనుకూలమైన సమయం కావచ్చు. లేబుల్ సూచనలు పాటించండి.',
      },
    });
  }

  return insights;
}

/**
 * Backward compatibility wrapper for generateFarmerTips
 */
export function generateFarmerTips(current, forecast, dayNameFn) {
  return generateDayInsights({
    temp: current?.temperature,
    rain: current?.precipitationProbability,
    rainSum: current?.precipitation,
    wind: current?.windSpeed,
    humidity: current?.humidity,
    soilMoist: current?.soilMoisture,
    et0: current?.et0,
  }, true);
}

/**
 * Short farmer-friendly interpretations for metrics displayed in the Right Now card
 */

export function getSoilMoistureInterpretation(val) {
  if (val == null) return null;
  if (val < 0.15) return { en: 'Dry · Needs water', te: 'పొడి నేల' };
  if (val <= 0.22) return { en: 'Moderate', te: 'మోస్తరు తేమ' };
  if (val <= 0.35) return { en: 'Adequate', te: 'సరిపడా తేమ' };
  return { en: 'Moist / High', te: 'అధిక తేమ' };
}

export function getSoilTempInterpretation(val) {
  if (val == null) return null;
  if (val < 18) return { en: 'Cool topsoil', te: 'చల్లని నేల' };
  if (val <= 30) return { en: 'Optimal', te: 'అనుకూలం' };
  if (val <= 38) return { en: 'Warm topsoil', te: 'వెచ్చని నేల' };
  return { en: 'Hot surface', te: 'అధిక వేడి' };
}

export function getET0Interpretation(val) {
  if (val == null) return null;
  if (val < 3.0) return { en: 'Low water loss', te: 'తక్కువ ఆవిరి' };
  if (val <= 5.0) return { en: 'Moderate demand', te: 'మోస్తరు ఆవిరి' };
  return { en: 'High water loss', te: 'అధిక ఆవిరి రేటు' };
}

export function getRainProbInterpretation(val) {
  if (val == null) return null;
  if (val <= 20) return { en: 'Low rain chance', te: 'తక్కువ అవకాశం' };
  if (val <= 50) return { en: 'Scattered showers', te: 'జల్లులు సాధ్యం' };
  return { en: 'Rain expected', te: 'వర్షం అవకాశం' };
}

export function getHumidityInterpretation(val) {
  if (val == null) return null;
  if (val < 40) return { en: 'Dry air', te: 'పొడి గాలి' };
  if (val <= 70) return { en: 'Normal', te: 'సాధారణం' };
  return { en: 'High humidity', te: 'అధిక తేమ' };
}

export function getWindInterpretation(val) {
  if (val == null) return null;
  if (val < 10) return { en: 'Calm breeze', te: 'ప్రశాంతమైన గాలి' };
  if (val <= 18) return { en: 'Gentle wind', te: 'తేలికపాటి గాలి' };
  return { en: 'Breezy · Drift risk', te: 'వేగవంతమైన గాలి' };
}

/**
 * Generate a rule-based irrigation recommendation for the green card
 */
export function getIrrigationInsight(current, forecast) {
  if (!current) return null;

  const todayRain = current.precipitationProbability ?? forecast?.[0]?.rain ?? 0;
  const precip = current.precipitation ?? 0;
  const et0 = current.et0;

  if (todayRain >= 50 || precip >= 3) {
    return {
      title: { en: 'Irrigation insight', te: 'నీటిపారుదల సలహా' },
      body: {
        en: 'Rain is expected. Check soil moisture before irrigating. (Rule-based recommendation)',
        te: 'వర్షం అవకాశం ఉంది. నీరు పెట్టే ముందు నేల తేమను పరిశీలించండి. (సూచన మాత్రమే)',
      },
    };
  }

  if (et0 != null && et0 >= 5.0 && todayRain < 25) {
    return {
      title: { en: 'Irrigation insight', te: 'నీటిపారుదల సలహా' },
      body: {
        en: 'High evaporative demand expected. Monitor crop water needs. (Rule-based recommendation)',
        te: 'అధిక నీటి ఆవిరి రేటు అవకాశం. పంట నీటి అవసరాలను గమనించండి. (సూచన మాత్రమే)',
      },
    };
  }

  return {
    title: { en: 'Irrigation insight', te: 'నీటిపారుదల సలహా' },
    body: {
      en: 'Moderate conditions. Check soil moisture before irrigation. (Rule-based recommendation)',
      te: 'మోస్తరు వాతావరణం. నీరు పెట్టే ముందు నేల తేమను పరిశీలించండి. (సూచన మాత్రమే)',
    },
  };
}

export function getUVInterpretation(val) {
  if (val == null) return null;
  if (val < 3) return { en: 'Low UV index', te: 'తక్కువ ఎండ' };
  if (val < 6) return { en: 'Moderate UV', te: 'మోస్తరు ఎండ' };
  if (val < 8) return { en: 'High UV index', te: 'అధిక ఎండ' };
  return { en: 'Very high UV', te: 'తీవ్ర ఎండ' };
}

/**
 * Generate a date-specific rule-based agricultural insight for any selected forecast day
 */
export function getSelectedDayInsight(dayData, dayName, isToday, current) {
  if (isToday) {
    return getIrrigationInsight(current, [dayData]);
  }
  if (!dayData) return null;

  const rainProb = dayData.rain ?? 0;
  const rainSum = dayData.rainSum ?? 0;
  const et0 = dayData.et0;

  if (rainProb >= 50 || rainSum >= 3) {
    return {
      title: { en: 'Irrigation insight', te: 'నీటిపారుదల సలహా' },
      body: {
        en: 'Rain is expected. Check soil moisture before irrigating. (Rule-based recommendation)',
        te: 'వర్షం అవకాశం ఉంది. నీరు పెట్టే ముందు నేల తేమను పరిశీలించండి. (సూచన మాత్రమే)',
      },
    };
  }

  if (et0 != null && et0 >= 5.0 && rainProb < 25) {
    return {
      title: { en: 'Irrigation insight', te: 'నీటిపారుదల సలహా' },
      body: {
        en: 'High evaporative demand expected. Monitor crop water needs. (Rule-based recommendation)',
        te: 'అధిక నీటి ఆవిరి రేటు అవకాశం. పంట నీటి అవసరాలను గమనించండి. (సూచన మాత్రమే)',
      },
    };
  }

  return {
    title: { en: 'Irrigation insight', te: 'నీటిపారుదల సలహా' },
    body: {
      en: 'Moderate conditions. Check soil moisture before irrigation. (Rule-based recommendation)',
      te: 'మోస్తరు వాతావరణం. నీరు పెట్టే ముందు నేల తేమను పరిశీలించండి. (సూచన మాత్రమే)',
    },
  };
}

