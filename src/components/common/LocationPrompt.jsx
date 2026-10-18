import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useLanguage } from '../../context/LanguageContext';
import { setLocationAsker } from '../../services/weatherService';

// Centered in-page popup that asks for location before the browser prompt.
// The browser request runs from the Allow tap, which mobile browsers require.
export default function LocationPrompt() {
  const { L } = useLanguage();
  const dlg = useRef(null);
  const [req, setReq] = useState(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocationAsker((state, read) => new Promise((resolve, reject) => {
      setDenied(state === 'denied');
      setReq({ read, resolve, reject });
    }));
    return () => setLocationAsker(null);
  }, []);

  useEffect(() => {
    if (req && !dlg.current.open) dlg.current.showModal();
  }, [req]);

  const finish = (settle, value) => {
    dlg.current.close();
    setReq(null);
    setBusy(false);
    settle(value);
  };

  const allow = () => {
    setBusy(true);
    req.read().then(
      (coords) => finish(req.resolve, coords),
      (err) => {
        setBusy(false);
        if (err.isDenied) setDenied(true);
        else finish(req.reject, err);
      }
    );
  };

  const dismiss = () =>
    finish(req.reject, { code: 'PERMISSION_DISMISSED', message: 'Location not shared', isDenied: false });

  return (
    <dialog
      ref={dlg}
      className="dlg loc-dlg"
      aria-labelledby="locDlgT"
      onCancel={(e) => { e.preventDefault(); if (req) dismiss(); }}
      onClick={(e) => e.target === dlg.current && req && dismiss()}
    >
      {req && (
        <div className="loc-dlg-body">
          <div className="loc-dlg-icon"><Icon name="pin" className="ico md" /></div>
          <h3 id="locDlgT">
            {denied
              ? L({ en: 'Location is blocked', te: 'స్థానం బ్లాక్ చేయబడింది' })
              : L({ en: 'Allow location access', te: 'స్థానం అనుమతించండి' })}
          </h3>
          {denied ? (
            <ol className="loc-dlg-steps">
              <li>{L({ en: 'Tap the lock / ⓘ icon next to the website address.', te: 'వెబ్‌సైట్ చిరునామా పక్కన ఉన్న తాళం / ⓘ గుర్తును నొక్కండి.' })}</li>
              <li>{L({ en: 'Open Permissions → Location → Allow.', te: 'Permissions → Location → Allow ఎంచుకోండి.' })}</li>
              <li>{L({ en: 'iPhone: Settings → Safari → Location → Allow.', te: 'iPhone: Settings → Safari → Location → Allow.' })}</li>
            </ol>
          ) : (
            <p className="muted">
              {L({
                en: 'FarmWise uses your location to show live weather and place your plot on the map. Tap Allow, then confirm in the next prompt.',
                te: 'ప్రత్యక్ష వాతావరణం మరియు మ్యాప్‌లో మీ పొలం చూపడానికి FarmWise మీ స్థానాన్ని ఉపయోగిస్తుంది. అనుమతించు నొక్కి, తదుపరి ప్రాంప్ట్‌లో నిర్ధారించండి.',
              })}
            </p>
          )}
          <div className="loc-dlg-actions">
            <button type="button" className="btn" onClick={dismiss} disabled={busy}>
              {L({ en: 'Not now', te: 'ఇప్పుడు కాదు' })}
            </button>
            <button type="button" className="btn btn-dark" onClick={allow} disabled={busy} autoFocus>
              {busy
                ? L({ en: 'Waiting…', te: 'వేచి ఉంది…' })
                : denied
                  ? L({ en: 'Try again', te: 'మళ్లీ ప్రయత్నించండి' })
                  : L({ en: 'Allow', te: 'అనుమతించు' })}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
