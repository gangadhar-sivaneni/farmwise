import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { IMG } from '../../data/cropsData';

const SAMPLE_LEAF = IMG('photo-1523348837708-15d4a09cfac2', 1000);

export default function ScanPage() {
  const { t, L } = useLanguage();

  const [scanState, setScanState] = useState('idle'); // 'idle' | 'ready' | 'scanning' | 'done'
  const [photoSrc, setPhotoSrc] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [scanStatusIndex, setScanStatusIndex] = useState(0);

  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handleSelectPhoto = (src, name) => {
    clearTimers();
    setPhotoSrc(src);
    setPhotoName(name);
    setScanState(src ? 'ready' : 'idle');
  };

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (f && f.type.startsWith('image/')) {
      handleSelectPhoto(URL.createObjectURL(f), f.name);
    }
    e.target.value = '';
  };

  const handleUseSample = () => {
    handleSelectPhoto(
      SAMPLE_LEAF,
      L({ en: 'Sample photo', te: 'నమూనా ఫోటో' })
    );
  };

  const handleClearPhoto = () => {
    handleSelectPhoto(null, '');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = [...e.dataTransfer.files].find((file) =>
      file.type.startsWith('image/')
    );
    if (f) {
      handleSelectPhoto(URL.createObjectURL(f), f.name);
    }
  };

  const startAnalysis = () => {
    setScanState('scanning');
    setScanStatusIndex(0);

    const statusSteps = [
      { en: 'Finding the leaf…', te: 'ఆకును గుర్తిస్తోంది…' },
      { en: 'Checking spots and colour…', te: 'మచ్చలు, రంగు పరిశీలిస్తోంది…' },
      { en: 'Comparing with sample library…', te: 'నమూనా లైబ్రరీతో పోలుస్తోంది…' },
    ];

    statusSteps.forEach((_, i) => {
      timersRef.current.push(
        setTimeout(() => {
          setScanStatusIndex(i);
        }, i * 800)
      );
    });

    timersRef.current.push(
      setTimeout(() => {
        setScanState('done');
      }, 2500)
    );
  };

  const statusMessages = [
    { en: 'Finding the leaf…', te: 'ఆకును గుర్తిస్తోంది…' },
    { en: 'Checking spots and colour…', te: 'మచ్చలు, రంగు పరిశీలిస్తోంది…' },
    { en: 'Comparing with sample library…', te: 'నమూనా లైబ్రరీతో పోలుస్తోంది…' },
  ];

  return (
    <section className="panel page" data-page="scan" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('scan.h', 'Photograph a leaf, catch problems early')}</h1>
          <p>{t('scan.p', 'Photograph one leaf to flag a likely pest or disease.')}</p>
        </div>
      </div>

      <div className="grid g2">
        <div
          className={`drop ${isDragOver ? 'over' : ''}`}
          id="drop"
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={handleDrop}
        >
          <div className="big">
            <Icon name="scan" className="ico lg" />
          </div>
          <h3>{t('scan.drop', 'Drop a leaf photo here')}</h3>
          <p>{t('scan.dropP', 'One leaf, in daylight, filling the frame.')}</p>
          <div className="btns">
            <label className="btn btn-dark file-btn">
              <Icon name="upload" className="ico sm" />
              <span>{t('scan.choose', 'Choose photo')}</span>
              <input
                type="file"
                id="scanInput"
                accept="image/*"
                aria-label="Upload crop photo"
                onChange={handleFileInput}
              />
            </label>
            <button
              type="button"
              className="btn"
              id="sampleImg"
              onClick={handleUseSample}
            >
              <Icon name="image" className="ico sm" />
              <span>{t('scan.sample', 'Use sample photo')}</span>
            </button>
          </div>

          <div
            className={`preview ${photoSrc ? 'show' : ''} ${
              scanState === 'scanning' ? 'scanning' : ''
            }`}
            id="preview"
          >
            {photoSrc && <img id="previewImg" src={photoSrc} alt="Selected crop photo" />}
            <div className="frame" />
            <div className="sweep" />
            <div className="bar2">
              <span id="previewName">{photoName}</span>
              <button
                type="button"
                className="icon-btn"
                id="clearImg"
                aria-label="Remove photo"
                onClick={handleClearPhoto}
              >
                <Icon name="x" className="ico sm" />
              </button>
            </div>
          </div>
        </div>

        <div className="card dark-card result" id="result" aria-live="polite">
          {(scanState === 'idle' || scanState === 'ready') && (
            <div style={{ margin: 'auto 0' }}>
              <span className="pill demo" style={{ alignSelf: 'flex-start' }}>
                <i />
                <span>{L({ en: 'Demo simulation', te: 'డెమో అనుకరణ' })}</span>
              </span>
              <h3>
                {L(
                  scanState === 'ready'
                    ? { en: 'Photo ready. Run the scan.', te: 'ఫోటో సిద్ధం. స్కాన్ చేయండి.' }
                    : { en: 'Results appear here', te: 'ఫలితాలు ఇక్కడ కనిపిస్తాయి' }
                )}
              </h3>
              <ol>
                <li>
                  {L({
                    en: 'Upload or use the sample photo',
                    te: 'ఫోటో అప్‌లోడ్ చేయండి లేదా నమూనా వాడండి',
                  })}
                </li>
                <li>
                  {L({
                    en: 'Tap Analyze Crop',
                    te: 'పంటను విశ్లేషించండి నొక్కండి',
                  })}
                </li>
                <li>
                  {L({
                    en: 'Read the likely issue and next steps',
                    te: 'సంభావ్య సమస్య, తదుపరి చర్యలు చదవండి',
                  })}
                </li>
              </ol>
              <button
                type="button"
                className="btn btn-orange"
                id="analyzeBtn"
                style={{ marginTop: '24px' }}
                disabled={scanState !== 'ready'}
                onClick={startAnalysis}
              >
                <Icon name="scan" className="ico sm" />
                <span>{L({ en: 'Analyze Crop', te: 'పంటను విశ్లేషించండి' })}</span>
              </button>
            </div>
          )}

          {scanState === 'scanning' && (
            <div style={{ margin: 'auto 0' }}>
              <span className="pill demo" style={{ alignSelf: 'flex-start' }}>
                <i />
                <span>{L({ en: 'Demo simulation', te: 'డెమో అనుకరణ' })}</span>
              </span>
              <h3>{L({ en: 'Analysing photo', te: 'ఫోటోను విశ్లేషిస్తోంది' })}</h3>
              <p className="status" id="scanStatus">
                <span className="spin" />
                <span>{L(statusMessages[scanStatusIndex])}</span>
              </p>
            </div>
          )}

          {scanState === 'done' && (
            <>
              <div className="res-top">
                <div>
                  <span className="pill demo">
                    <i />
                    <span>
                      {L({ en: 'Demo result · not a diagnosis', te: 'డెమో ఫలితం · నిర్ధారణ కాదు' })}
                    </span>
                  </span>
                  <h3>{L({ en: 'Possible leaf blight', te: 'ఆకు ఎండు తెగులు కావచ్చు' })}</h3>
                </div>
                <div className="pc">
                  <b>71%</b>
                  <span>{L({ en: 'sample match', te: 'నమూనా సరిపోలిక' })}</span>
                </div>
              </div>

              <div className="sev">
                <div className="l">
                  <span>{L({ en: 'Severity', te: 'తీవ్రత' })}</span>
                  <b>{L({ en: 'Moderate · 2 of 4', te: 'మధ్యస్థం · 4 లో 2' })}</b>
                </div>
                <div className="segs">
                  <i className="on" />
                  <i className="on" />
                  <i />
                  <i />
                </div>
              </div>

              <div className="rs">
                <h4>{L({ en: 'Symptoms', te: 'లక్షణాలు' })}</h4>
                <p>
                  {L({
                    en: 'Long grey-green to tan streaks along the leaf, starting low and moving up.',
                    te: 'ఆకు పొడవునా బూడిద-ఆకుపచ్చ నుండి గోధుమ రంగు చారలు.',
                  })}
                </p>
              </div>

              <div className="rs">
                <h4>{L({ en: 'Next steps', te: 'తదుపరి చర్యలు' })}</h4>
                <ul>
                  <li>{L({ en: 'Remove badly affected lower leaves.', te: 'బాగా దెబ్బతిన్న కింది ఆకులను తీసివేయండి.' })}</li>
                  <li>{L({ en: 'Avoid evening irrigation so leaves dry overnight.', te: 'సాయంత్రం నీరు పెట్టకండి.' })}</li>
                  <li>
                    {L({
                      en: 'Confirm with your Agriculture Extension Officer before any fungicide.',
                      te: 'శిలీంద్ర నాశిని ముందు వ్యవసాయ విస్తరణ అధికారితో నిర్ధారించుకోండి.',
                    })}
                  </li>
                  <li>{L({ en: 'Re-scan the same plant in 5 days.', te: '5 రోజుల తర్వాత మళ్లీ స్కాన్ చేయండి.' })}</li>
                </ul>
              </div>

              <div className="warn">
                <Icon name="alert" className="ico sm" />
                <span>
                  {L({
                    en: 'Simulated demo result, not a real diagnosis. Always confirm with an expert.',
                    te: 'ఇది అనుకరణ డెమో ఫలితం, నిజమైన నిర్ధారణ కాదు.',
                  })}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                <a href="#/app/market" className="btn btn-orange sm">
                  {L({ en: 'Find a nearby shop', te: 'సమీప దుకాణం చూడండి' })}
                </a>
                <button
                  type="button"
                  className="btn sm"
                  id="rescan"
                  onClick={() => setScanState('ready')}
                >
                  {L({ en: 'Scan again', te: 'మళ్లీ స్కాన్' })}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
