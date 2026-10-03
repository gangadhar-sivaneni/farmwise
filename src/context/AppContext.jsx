import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFarm } from './FarmContext';
import { useAuth } from './AuthContext';
import { ukey } from '../services/authService';
import { toFarmView } from '../services/farmService';
import { CROPS, byId, cropCost } from '../data/cropsData';
import {
  TASKS,
  getTasksForDate,
  toggleTaskComplete,
  addTaskForDate,
  editTaskForDate,
  deleteTaskForDate,
  getTodayDateStr
} from '../data/tasksData';
import { useLanguage } from './LanguageContext';
import {
  getUserLocation,
  fetchWeather,
  reverseGeocode,
} from '../services/weatherService';

const AppContext = createContext();

export function AppProvider({ children }) {
  const { showToast, W } = useLanguage();

  const { user, logout } = useAuth();
  const signedIn = !!user;
  // user-scoped storage; nothing is read or written while signed out
  const load = (name, fallback) => {
    if (!user) return fallback;
    try { return JSON.parse(localStorage.getItem(ukey(name))) ?? fallback; } catch { return fallback; }
  };
  const store = (name, value) => {
    if (!user) return;
    try { localStorage.setItem(ukey(name), JSON.stringify(value)); } catch { /* storage full/blocked */ }
  };

  // The selected plot drives the whole dashboard; `activeFarm` keeps the shape every page already reads.
  const { activePlot, activePlotId: farmKey, setActivePlotId } = useFarm();
  const activeFarm = useMemo(() => toFarmView(activePlot), [activePlot]);

  const [tasksDone, setTasksDoneState] = useState(() => load('tasks_done', {}));

  const [compareSel, setCompareSelState] = useState(() => load('preferences_compare', ['maize', 'cotton']));

  const [showTray, setShowTray] = useState(false);
  const [activeCropModal, setActiveCropModal] = useState(null);
  const [plannerCrop, setPlannerCrop] = useState(() => activePlot?.crop || 'maize');
  // switching plot (or changing its crop) points the planner at that plot's crop
  useEffect(() => {
    if (activePlot?.crop) setPlannerCrop(activePlot.crop);
  }, [farmKey, activePlot?.crop]);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const setSignedIn = useCallback((val) => { if (!val) logout(); }, [logout]);

  const setFarmKey = setActivePlotId;

  const toggleTask = useCallback((taskId) => {
    setTasksDoneState((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      store('tasks_done', next);
      const doneCount = TASKS.filter((t) => next[t.id]).length;
      if (doneCount === TASKS.length && next[taskId]) {
        showToast(W.allDone);
      }
      return next;
    });
  }, [showToast, W]);

  // Daily Tasks state & operations
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherStatus, setWeatherStatus] = useState('detecting_location');
  const [weatherStatusMessage, setWeatherStatusMessage] = useState({
    en: 'Detecting your location...',
    te: 'మీ స్థానాన్ని గుర్తిస్తోంది...',
  });
  const [weatherError, setWeatherError] = useState(null);
  const [locationInfo, setLocationInfo] = useState({
    latitude: null,
    longitude: null,
    name: activeFarm?.loc || { en: 'Detecting location...', te: 'స్థానాన్ని గుర్తిస్తోంది...' },
    isLiveGPS: false,
    isFallback: false,
  });
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const [dailyTasksVer, setDailyTasksVer] = useState(0);

  const getDailyTasks = useCallback((dateStr) => {
    return getTasksForDate(dateStr, activeFarm, weatherData);
  }, [farmKey, weatherData, dailyTasksVer]);

  const toggleDailyTask = useCallback((dateStr, taskId) => {
    const updated = toggleTaskComplete(dateStr, taskId, activeFarm, weatherData);
    setDailyTasksVer((v) => v + 1);
    const todayStr = getTodayDateStr();
    if (dateStr === todayStr) {
      const task = updated.find((t) => t.id === taskId);
      if (task) {
        setTasksDoneState((prev) => {
          const next = { ...prev, [taskId]: task.completed };
          store('tasks_done', next);
          return next;
        });
      }
    }
    const doneCount = updated.filter((t) => t.completed).length;
    if (doneCount === updated.length && updated.length > 0) {
      showToast(W.allDone);
    }
    return updated;
  }, [farmKey, weatherData, showToast, W]);

  const addDailyTask = useCallback((dateStr, taskInput) => {
    const updated = addTaskForDate(dateStr, taskInput, activeFarm, weatherData);
    setDailyTasksVer((v) => v + 1);
    return updated;
  }, [farmKey, weatherData]);

  const editDailyTask = useCallback((dateStr, taskId, fields) => {
    const updated = editTaskForDate(dateStr, taskId, fields, activeFarm, weatherData);
    setDailyTasksVer((v) => v + 1);
    return updated;
  }, [farmKey, weatherData]);

  const deleteDailyTask = useCallback((dateStr, taskId) => {
    const updated = deleteTaskForDate(dateStr, taskId, activeFarm, weatherData);
    setDailyTasksVer((v) => v + 1);
    return updated;
  }, [farmKey, weatherData]);

  const toggleCompare = useCallback((cropId) => {
    setCompareSelState((prev) => {
      let next;
      if (prev.includes(cropId)) {
        next = prev.filter((id) => id !== cropId);
      } else {
        next = [...prev, cropId].slice(-2);
      }
      store('preferences_compare', next);
      setShowTray(next.length > 0);
      return next;
    });
  }, []);

  const setComparePair = useCallback((cropA, cropB) => {
    const next = [cropA, cropB];
    setCompareSelState(next);
    store('preferences_compare', next);
  }, []);

  // Scan Alerts State (AI Crop Scanner)
  const [scanAlerts, setScanAlertsState] = useState(() => load('scan_alerts', []));

  const saveScanAlert = useCallback((alertItem) => {
    setScanAlertsState((prev) => {
      const newAlert = {
        id: 'scan-' + Date.now(),
        date: new Date().toISOString(),
        plotId: farmRef.current?.id, // notifications belong to the plot that was selected when scanning
        ...alertItem,
      };
      const next = [newAlert, ...prev.filter(a => a.id !== newAlert.id)].slice(0, 10);
      store('scan_alerts', next);
      return next;
    });
    showToast({
      en: 'Scan result saved to dashboard alerts & activity.',
      te: 'స్కాన్ ఫలితం డాష్‌బోర్డ్ అలర్ట్‌లలో సేవ్ చేయబడింది.'
    });
  }, [showToast]);

  const dismissScanAlert = useCallback((id) => {
    setScanAlertsState((prev) => {
      const next = prev.filter((a) => a.id !== id);
      store('scan_alerts', next);
      return next;
    });
  }, []);

  // Weather & Geolocation State
  const locationInfoRef = useRef(locationInfo);
  locationInfoRef.current = locationInfo;

  const farmRef = useRef(activeFarm);
  farmRef.current = activeFarm;

  // Load weather for coordinates
  const loadWeatherForCoords = useCallback(
    async (lat, lon, isLiveGPS = false, fallbackName = null, bypassCache = false) => {
      setWeatherLoading(true);
      setWeatherStatus('fetching_weather');
      setWeatherStatusMessage({
        en: 'Fetching live weather...',
        te: 'ప్రత్యక్ష వాతావరణం తీసుకువస్తోంది...',
      });
      setWeatherError(null);

      try {
        const data = await fetchWeather(lat, lon, bypassCache);
        setWeatherData(data);

        let locName = fallbackName;
        if (!locName || isLiveGPS) {
          try {
            const geo = await reverseGeocode(lat, lon);
            if (geo?.displayName) {
              locName = { en: geo.displayName, te: geo.displayName };
            }
          } catch {
            if (!locName) {
              locName = {
                en: `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`,
                te: `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`,
              };
            }
          }
        }

        setLocationInfo({
          latitude: lat,
          longitude: lon,
          name: locName || {
            en: `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`,
            te: `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`,
          },
          isLiveGPS,
          isFallback: !isLiveGPS,
        });

        setWeatherStatus('ready');
        setWeatherStatusMessage({
          en: isLiveGPS ? 'Live GPS weather' : 'Registered farm weather',
          te: isLiveGPS ? 'ప్రత్యక్ష GPS వాతావరణం' : 'నమోదిత పొలం వాతావరణం',
        });
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setWeatherError(err.message || 'Unable to fetch weather');
        setWeatherStatus('error');
        setWeatherStatusMessage({
          en: 'Weather update failed',
          te: 'వాతావరణం నవీకరణ విఫలమైంది',
        });
      } finally {
        setWeatherLoading(false);
      }
    },
    []
  );

  // Request user location via browser Geolocation API
  const requestLocation = useCallback(
    async (bypassCache = false) => {
      setWeatherLoading(true);
      setWeatherStatus('detecting_location');
      setWeatherStatusMessage({
        en: 'Detecting your location...',
        te: 'మీ స్థానాన్ని గుర్తిస్తోంది...',
      });
      setWeatherError(null);

      try {
        const coords = await getUserLocation();
        setLocationPermissionDenied(false);
        await loadWeatherForCoords(coords.latitude, coords.longitude, true, null, bypassCache);
      } catch (err) {
        console.warn('Geolocation detection failed:', err);
        const isDenied = err.code === 'PERMISSION_DENIED' || err.isDenied;
        setLocationPermissionDenied(isDenied);

        // Graceful fallback to currently selected farm coordinates (from existing farm selector)
        const currentFarm = farmRef.current;
        const fallbackCoords = currentFarm.coords || { lat: 17.9784, lon: 79.5941 };
        const fallbackLoc = currentFarm.loc;

        await loadWeatherForCoords(
          fallbackCoords.lat,
          fallbackCoords.lon,
          false,
          fallbackLoc,
          bypassCache
        );
      }
    },
    [loadWeatherForCoords]
  );

  // Refresh weather function
  const refreshWeather = useCallback(
    async (forceGps = false) => {
      if (forceGps || locationInfoRef.current.isLiveGPS) {
        await requestLocation(true);
      } else if (locationInfoRef.current.latitude && locationInfoRef.current.longitude) {
        await loadWeatherForCoords(
          locationInfoRef.current.latitude,
          locationInfoRef.current.longitude,
          false,
          locationInfoRef.current.name,
          true
        );
      } else {
        await requestLocation(true);
      }
    },
    [loadWeatherForCoords, requestLocation]
  );


  // Periodic weather refresh (every 15 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (locationInfoRef.current.latitude && locationInfoRef.current.longitude) {
        loadWeatherForCoords(
          locationInfoRef.current.latitude,
          locationInfoRef.current.longitude,
          locationInfoRef.current.isLiveGPS,
          locationInfoRef.current.name,
          false
        );
      }
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeatherForCoords]);

  // Weather is plot-specific: load it for the selected plot on start and whenever the plot (or its location) changes
  const plotLat = activeFarm?.coords?.lat, plotLon = activeFarm?.coords?.lon;
  useEffect(() => {
    if (Number.isFinite(plotLat) && Number.isFinite(plotLon)) {
      const named = farmRef.current?.record?.location && Object.values(farmRef.current.record.location).some(Boolean);
      loadWeatherForCoords(plotLat, plotLon, false, named ? farmRef.current.loc : null, false);
    }
  }, [farmKey, plotLat, plotLon, loadWeatherForCoords]);

  return (
    <AppContext.Provider
      value={{
        signedIn,
        user,
        setSignedIn,
        farmKey,
        setFarmKey,
        activeFarm,
        tasksDone,
        toggleTask,
        // Daily tasks engine
        dailyTasksVer,
        getDailyTasks,
        toggleDailyTask,
        addDailyTask,
        editDailyTask,
        deleteDailyTask,
        compareSel,
        toggleCompare,
        setComparePair,
        showTray,
        setShowTray,
        activeCropModal,
        setActiveCropModal,
        plannerCrop,
        setPlannerCrop,
        videoModalOpen,
        setVideoModalOpen,
        // Scan alerts
        scanAlerts: scanAlerts.filter((a) => !a.plotId || a.plotId === farmKey),
        saveScanAlert,
        dismissScanAlert,
        // Real-time Weather & Location
        weatherData,
        weatherLoading,
        weatherStatus,
        weatherStatusMessage,
        weatherError,
        locationInfo,
        locationPermissionDenied,
        refreshWeather,
        requestLocation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
