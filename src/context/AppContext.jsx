import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FARMS } from '../data/farmsData';
import { CROPS, byId, cropCost } from '../data/cropsData';
import { TASKS } from '../data/tasksData';
import { useLanguage } from './LanguageContext';

const AppContext = createContext();

export function AppProvider({ children }) {
  const { showToast, W } = useLanguage();

  const [signedIn, setSignedInState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fw.session')) || false;
    } catch {
      return false;
    }
  });

  const [farmKey, setFarmKeyState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fw.farm'));
      return FARMS[saved] ? saved : 'a';
    } catch {
      return 'a';
    }
  });

  const [tasksDone, setTasksDoneState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fw.tasks')) || {};
    } catch {
      return {};
    }
  });

  const [compareSel, setCompareSelState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fw.compare')) || ['maize', 'cotton'];
    } catch {
      return ['maize', 'cotton'];
    }
  });

  const [showTray, setShowTray] = useState(false);
  const [activeCropModal, setActiveCropModal] = useState(null);
  const [plannerCrop, setPlannerCrop] = useState('maize');
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const setSignedIn = useCallback((val) => {
    setSignedInState(val);
    try {
      localStorage.setItem('fw.session', JSON.stringify(val));
    } catch {}
  }, []);

  const setFarmKey = useCallback((key) => {
    if (FARMS[key]) {
      setFarmKeyState(key);
      try {
        localStorage.setItem('fw.farm', JSON.stringify(key));
      } catch {}
    }
  }, []);

  const toggleTask = useCallback((taskId) => {
    setTasksDoneState((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      try {
        localStorage.setItem('fw.tasks', JSON.stringify(next));
      } catch {}
      const doneCount = TASKS.filter((t) => next[t.id]).length;
      if (doneCount === TASKS.length && next[taskId]) {
        showToast(W.allDone);
      }
      return next;
    });
  }, [showToast, W]);

  const toggleCompare = useCallback((cropId) => {
    setCompareSelState((prev) => {
      let next;
      if (prev.includes(cropId)) {
        next = prev.filter((id) => id !== cropId);
      } else {
        next = [...prev, cropId].slice(-2);
      }
      try {
        localStorage.setItem('fw.compare', JSON.stringify(next));
      } catch {}
      setShowTray(next.length > 0);
      return next;
    });
  }, []);

  const setComparePair = useCallback((cropA, cropB) => {
    const next = [cropA, cropB];
    setCompareSelState(next);
    try {
      localStorage.setItem('fw.compare', JSON.stringify(next));
    } catch {}
  }, []);

  return (
    <AppContext.Provider
      value={{
        signedIn,
        setSignedIn,
        farmKey,
        setFarmKey,
        activeFarm: FARMS[farmKey],
        tasksDone,
        toggleTask,
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
