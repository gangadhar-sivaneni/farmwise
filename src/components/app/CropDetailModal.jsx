import React, { useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { byId, cropCost, IMG, inr } from '../../data/cropsData';
import { useMandiPrices, livePriceOf } from '../../hooks/useMandiPrices';
import { LBL } from '../../data/translations';
import { navigate } from '../../utils/navigation';

export default function CropDetailModal() {
  const { L, W } = useLanguage();
  const {
    activeCropModal,
    setActiveCropModal,
    setPlannerCrop,
    compareSel,
    toggleCompare,
  } = useApp();
  const { data: mandi } = useMandiPrices();

  const dialogRef = useRef(null);
  const crop = activeCropModal ? byId(activeCropModal) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (crop) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [crop]);

  if (!crop) return <dialog ref={dialogRef} className="dlg" id="cropDlg" />;

  const cost = cropCost(crop);
  const rev = crop.yield * livePriceOf(crop, mandi);

  const handleClose = () => {
    setActiveCropModal(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  const handlePlan = () => {
    setPlannerCrop(crop.id);
    handleClose();
    navigate('/app/planner');
  };

  const handleCompare = () => {
    if (!compareSel.includes(crop.id)) {
      toggleCompare(crop.id);
    }
    handleClose();
    const compareEl = document.getElementById('compare');
    if (compareEl) {
      compareEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="dlg"
      id="cropDlg"
      aria-labelledby="dlgTitle"
      onClick={handleBackdropClick}
      onClose={handleClose}
    >
      <div className="dlg-in">
        <div className="dlg-fig">
          <img src={IMG(crop.img, 1000)} alt={crop.name.en} />
        </div>
        <div className="dlg-body">
          <button
            type="button"
            className="icon-btn dlg-close"
            onClick={handleClose}
            aria-label={L(W.close)}
          >
            <Icon name="x" className="ico sm" />
          </button>
          <span className="pill">
            {L(LBL.cat[crop.cat])} ·{' '}
            <i style={{ background: 'none', width: 'auto', height: 'auto', fontStyle: 'italic' }}>
              {crop.sci}
            </i>
          </span>
          <h2 id="dlgTitle">{L(crop.name)}</h2>
          <p className="ov">{L(crop.ov)}</p>

          <div className="kv">
            <div>
              <span>{L(W.duration)}</span>
              <b>
                {crop.dur[0]}–{crop.dur[1]} {L(W.days)}
              </b>
            </div>
            <div>
              <span>{L(W.waterNeed)}</span>
              <b>{L(LBL.water[crop.water])}</b>
            </div>
            <div>
              <span>{L(W.yield)}</span>
              <b>
                {crop.yield} {L(W.qpa)}
              </b>
            </div>
          </div>

          <dl className="dl">
            <div>
              <dt>{L(W.soilSuit)}</dt>
              <dd>{crop.soils.map((s) => L(LBL.soil[s])).join(', ')}</dd>
            </div>
            <div>
              <dt>{L(W.sowing)}</dt>
              <dd>{L(crop.sow)}</dd>
            </div>
            <div>
              <dt>{L(W.irrigation)}</dt>
              <dd>{L(crop.irr)}</dd>
            </div>
            <div>
              <dt>{L(W.nutrients)}</dt>
              <dd>{L(crop.nut)}</dd>
            </div>
            <div>
              <dt>{L(W.pests)}</dt>
              <dd>{L(crop.pests).join(' · ')}</dd>
            </div>
            <div>
              <dt>{L(W.harvest)}</dt>
              <dd>{L(crop.har)}</dd>
            </div>
          </dl>

          <div className="econ-mini">
            <div>
              <span>{L(W.costAcre)}</span>
              <b>{inr(cost)}</b>
            </div>
            <div>
              <span>{L(W.revAcre)}</span>
              <b>{inr(rev)}</b>
            </div>
            <div className="o">
              <span>{L(W.profR)}</span>
              <b>{inr(rev - cost)}</b>
            </div>
          </div>

          <p className="muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
            {L(W.illus)}
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-dark" onClick={handlePlan}>
              <span>{L(W.plan)}</span>
              <Icon name="arrow" className="ico sm" />
            </button>
            <button type="button" className="btn" onClick={handleCompare}>
              <Icon name="scale" className="ico sm" />
              <span>{L(W.compareX)}</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
