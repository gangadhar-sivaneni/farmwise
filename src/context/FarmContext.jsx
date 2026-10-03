import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as farmService from '../services/farmService';

const FarmContext = createContext(null);

/** Saved plots + the selected plot. The selected plot is the source of truth for every dashboard page. */
export function FarmProvider({ children }) {
  const [plots, setPlots] = useState(farmService.getCachedPlots);
  const [activeId, setActiveIdState] = useState(() => {
    const saved = farmService.getCachedActiveId();
    const list = farmService.getCachedPlots();
    return list.some((p) => p.id === saved) ? saved : list[0]?.id;
  });
  // Plot editor: null = closed, {} = new plot, plot record = edit that plot
  const [editor, setEditor] = useState(null);

  const setActivePlotId = useCallback((id) => {
    setActiveIdState(id);
    farmService.saveActiveId(id);
  }, []);

  const savePlot = useCallback(async (plot) => {
    const saved = await farmService.savePlot(plot);
    setPlots(await farmService.listPlots());
    setActivePlotId(saved.id);
    return saved;
  }, [setActivePlotId]);

  const removePlot = useCallback(async (id) => {
    const remaining = await farmService.deletePlot(id);
    if (!remaining.length) {
      // never leave the dashboard without a plot: fall back to this user's sample farm
      farmService.resetPlots();
      const seeded = await farmService.listPlots();
      setPlots(seeded);
      setActivePlotId(seeded[0].id);
      return;
    }
    setPlots(remaining);
    setActiveIdState((cur) => {
      const next = cur === id ? remaining[0].id : cur; // deleting the selected plot selects the first remaining one
      farmService.saveActiveId(next);
      return next;
    });
  }, [setActivePlotId]);

  const activePlot = plots.find((p) => p.id === activeId) || plots[0];
  const value = useMemo(() => ({
    plots, activePlot, activePlotId: activePlot?.id, setActivePlotId, savePlot, removePlot,
    editor, openPlotEditor: (plot = {}) => setEditor(plot), closePlotEditor: () => setEditor(null),
  }), [plots, activePlot, setActivePlotId, savePlot, removePlot, editor]);

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used within a FarmProvider');
  return ctx;
}
