import React, { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useFarm } from '../../context/FarmContext';
import { byId } from '../../data/cropsData';
import { toFarmView } from '../../services/farmService';

const where = (p) => p.location?.district || p.location?.village || p.location?.state || '';

/** The sidebar "Active farm" control: same look as the old <select>, now lists every saved plot. */
export default function FarmSelector() {
  const { t, L } = useLanguage();
  const { plots, activePlot, setActivePlotId, openPlotEditor, removePlot } = useFarm();
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', off);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); };
  }, [open]);

  const nameOf = (p) => L(toFarmView(p).name);
  const pick = (id) => { setActivePlotId(id); setOpen(false); };
  const edit = (p) => { setOpen(false); openPlotEditor(p); };
  const del = (p) => {
    if (window.confirm(L({ en: `Delete “${p.name}”? Its boundary and details will be removed from this device.`, te: `“${p.name}” తొలగించాలా? దీని సరిహద్దు, వివరాలు ఈ పరికరం నుండి తొలగిపోతాయి.` }))) removePlot(p.id);
  };

  return (
    <div className="side-farm fsel" ref={root}>
      <label id="farmSelL">{t('dash.farm', 'Active farm')}</label>
      <button
        type="button"
        id="farmSel"
        className="select fsel-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="farmSelL farmSel"
        onClick={() => setOpen((o) => !o)}
      >
        {activePlot ? `${nameOf(activePlot)}${where(activePlot) ? ` · ${where(activePlot)}` : ''}` : L({ en: '+ Add Plot Strictly', te: '+ ప్లాట్ జోడించండి' })}
      </button>

      {open && (
        <div className="fsel-pop" role="listbox" aria-label={L({ en: 'My farms', te: 'నా పొలాలు' })}>
          <small className="fsel-h">{L({ en: 'MY FARMS', te: 'నా పొలాలు' })}</small>
          {plots.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--ink-2)' }}>
              {L({ en: 'No plots added yet. Click below to add.', te: 'ఇంకా ప్లాట్లు లేవు. జోడించడానికి క్రింద నొక్కండి.' })}
            </div>
          )}
          {plots.map((p) => {
            const on = p.id === activePlot?.id;
            const crop = byId(p.crop);
            return (
              <div key={p.id} className="fsel-row" aria-selected={on} role="option">
                <button type="button" className="fsel-item" onClick={() => pick(p.id)}>
                  <span className="fsel-chk">{on && <Icon name="check" />}</span>
                  <span>
                    <b>{nameOf(p)}{where(p) && <span className="muted"> — {where(p)}</span>}</b>
                    <small>
                      {(+p.areaAcres).toFixed(2)} {L({ en: 'acres', te: 'ఎకరాలు' })}
                      {crop && ` · ${L(crop.name)}`}
                      {p.areaSource === 'manual' && ` · ${L({ en: 'manually entered', te: 'చేతితో నమోదు' })}`}
                    </small>
                  </span>
                </button>
                <button type="button" className="icon-btn" onClick={() => edit(p)} aria-label={L({ en: `Edit ${p.name}`, te: `${p.name} మార్చండి` })} title={L({ en: 'View / edit', te: 'చూడండి / మార్చండి' })}><Icon name="edit" /></button>
                <button type="button" className="icon-btn" onClick={() => del(p)} aria-label={L({ en: `Delete ${p.name}`, te: `${p.name} తొలగించండి` })} title={L({ en: 'Delete', te: 'తొలగించు' })}><Icon name="trash" /></button>
              </div>
            );
          })}
          <button type="button" className="fsel-add" onClick={() => edit({})}>
            <Icon name="plus" /><span>{L({ en: 'Add New Plot', te: 'కొత్త ప్లాట్ జోడించండి' })}</span>
          </button>
        </div>
      )}
    </div>
  );
}
