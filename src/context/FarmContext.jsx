import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import * as farmService from '../services/farmService';

const FarmContext = createContext(null);

/** Saved plots + the selected plot. The selected plot is the source of truth for every dashboard page. */
export function FarmProvider({ children }) {
  const [plots, setPlots] = useState(farmService.getCachedPlots);
  const [activeId, setActiveIdState] = useState(() => {
    const saved = farmService.getCachedActiveId();
    const list = farmService.getCachedPlots();
    return list.some((p) => p.id === saved) ? saved : (list[0]?.id || null);
  });

  // Automatically sync plots from Firestore cloud on mount
  useEffect(() => {
    let active = true;
    farmService.listPlots().then((list) => {
      if (active && Array.isArray(list)) {
        setPlots(list);
        setActiveIdState((cur) => {
          if (cur && list.some((p) => p.id === cur)) return cur;
          return list[0]?.id || null;
        });
      }
    });
    return () => { active = false; };
  }, []);

  // Plot editor: null = closed, {} = new plot, plot record = edit that plot
  const [editor, setEditor] = useState(null);

  const setActivePlotId = useCallback((id) => {
    setActiveIdState(id);
    if (id) farmService.saveActiveId(id);
  }, []);

  const savePlot = useCallback(async (plot) => {
    const saved = await farmService.savePlot(plot);
    const updatedList = await farmService.listPlots();
    setPlots(updatedList);
    setActivePlotId(saved.id);
    return saved;
  }, [setActivePlotId]);

  const removePlot = useCallback(async (id) => {
    const remaining = await farmService.deletePlot(id);
    setPlots(remaining);
    setActiveIdState((cur) => {
      const next = cur === id ? (remaining[0]?.id || null) : cur;
      if (next) farmService.saveActiveId(next);
      return next;
    });
  }, []);

  const activePlot = plots.find((p) => p.id === activeId) || plots[0] || null;
  const value = useMemo(() => ({
    plots,
    activePlot,
    activePlotId: activePlot?.id || null,
    setActivePlotId,
    savePlot,
    removePlot,
    editor,
    openPlotEditor: (plot = {}) => setEditor(plot),
    closePlotEditor: () => setEditor(null),
  }), [plots, activePlot, setActivePlotId, savePlot, removePlot, editor]);

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used within a FarmProvider');
  return ctx;
}
