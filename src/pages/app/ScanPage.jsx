import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { CROPS } from '../../data/cropsData';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
// Phone photos are 4–12 MB; the model needs far less. Shrink before upload so it is fast and never hits the size limit.
const MAX_SIDE = 1600;
function shrinkPhoto(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve({ dataUrl: c.toDataURL('image/jpeg', 0.85), mimeType: 'image/jpeg' });
    };
    img.onerror = () => resolve(null); // e.g. HEIC the browser cannot decode: send the original
    img.src = dataUrl;
  });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export default function ScanPage() {
  const { t, L, lang } = useLanguage();
  const { saveScanAlert } = useApp();

  // Selected crop filter / hint
  const [selectedCrop, setSelectedCrop] = useState('');

  // Photo states
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'ready' | 'scanning' | 'done' | 'error'
  const [photoSrc, setPhotoSrc] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const [photoSize, setPhotoSize] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Real-time analysis result & loading steps
  const [analysisResult, setAnalysisResult] = useState(null);
  const [scanStatusIndex, setScanStatusIndex] = useState(0);
  const [savedToAlerts, setSavedToAlerts] = useState(false);

  // Server Gemini API Key configuration status
  const [keyConfigured, setKeyConfigured] = useState(null);

  // References
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const resultRef = useRef(null);
  const uploadSectionRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Check server API key configuration status on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/config-status')
      .then((res) => (res.ok ? res.json() : { configured: false }))
      .then((data) => {
        if (isMounted) {
          setKeyConfigured(Boolean(data.configured));
        }
      })
      .catch(() => {
        if (isMounted) setKeyConfigured(false);
      });

    return () => {
      isMounted = false;
      clearTimers();
    };
  }, []);

  // Smoothly scroll the result into view without covering page heading or upload controls
  useEffect(() => {
    if (scanState === 'done' && resultRef.current) {
      const timer = setTimeout(() => {
        if (!resultRef.current) return;
        const rect = resultRef.current.getBoundingClientRect();
        const currentY = window.scrollY || window.pageYOffset;
        const vh = window.innerHeight;

        // Position top of result card comfortably below the top fold (~30-36% down)
        // so the analyze button and image preview remain visible above it without jumping
        if (rect.top > vh * 0.6 || rect.top < 0) {
          const targetY = Math.max(0, currentY + rect.top - Math.round(vh * 0.32));
          window.scrollTo({
            top: targetY,
            behavior: 'smooth',
          });
        }
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [scanState]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSelectFile = useCallback((file) => {
    setUploadError(null);
    if (!file) return;

    // Validate mime type
    const isImage = file.type.startsWith('image/') || ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
    if (!isImage) {
      setUploadError(
        t('scan.errType', 'Please choose a valid image file (JPEG, PNG, or WebP).')
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        t('scan.errSize', 'The selected photo exceeds the 10 MB limit. Please choose a smaller photo.')
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const small = await shrinkPhoto(dataUrl);
      setPhotoSrc(dataUrl);
      setPhotoBase64(small?.dataUrl || dataUrl);
      setPhotoName(file.name);
      setPhotoSize(file.size);
      setPhotoMimeType(small?.mimeType || file.type || 'image/jpeg');
      setScanState('ready');
      setAnalysisResult(null);
      setSavedToAlerts(false);
    };
    reader.onerror = () => {
      setUploadError(
        L({
          en: 'Failed to read photo file. Please try selecting it again.',
          te: 'ఫోటో ఫైల్ చదవడం విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
        })
      );
    };
    reader.readAsDataURL(file);
  }, [t, L]);

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleSelectFile(file);
    e.target.value = '';
  };

  const handleClearPhoto = () => {
    clearTimers();
    setPhotoSrc(null);
    setPhotoBase64(null);
    setPhotoName('');
    setPhotoSize(null);
    setUploadError(null);
    setScanState('idle');
    setAnalysisResult(null);
    setSavedToAlerts(false);
  };

  const handleScanAnother = () => {
    handleClearPhoto();
    if (uploadSectionRef.current) {
      uploadSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Open file picker shortly after scroll initiates
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 250);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = [...e.dataTransfer.files].find(
      (f) => f.type.startsWith('image/') || ALLOWED_MIME_TYPES.includes(f.type)
    );
    if (file) {
      handleSelectFile(file);
    } else {
      setUploadError(
        t('scan.errType', 'Please drop a valid image file (JPEG, PNG, or WebP).')
      );
    }
  };

  const statusSteps = [
    { en: 'Examining leaf surface, lesions, and discoloration…', te: 'ఆకు ఉపరితలం, మచ్చలు, రంగు మార్పులను పరిశీలిస్తోంది…' },
    { en: 'Consulting Google Gemini plant pathology vision model…', te: 'గూగుల్ జెమిని వ్యవసాయ నమూనాతో విశ్లేషిస్తోంది…' },
    { en: 'Generating real-time diagnosis & safe field recommendations…', te: 'నిజ-సమయ ఫలితం, సురక్షిత చర్యలను రూపొందిస్తోంది…' },
  ];

  const startAnalysis = async () => {
    if (!photoSrc || scanState === 'scanning') return;
    clearTimers();
    setScanState('scanning');
    setScanStatusIndex(0);
    setUploadError(null);
    setSavedToAlerts(false);

    statusSteps.forEach((_, i) => {
      timersRef.current.push(
        setTimeout(() => {
          setScanStatusIndex(i);
        }, i * 1100)
      );
    });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: photoBase64,
          mimeType: photoMimeType,
          crop: selectedCrop,
          lang,
        }),
      });

      const json = await response.json().catch(() => ({ error: `Server error (${response.status}). Please try again.` }));

      if (json.success && json.data) {
        setAnalysisResult(json.data);
        setScanState('done');
      } else {
        throw new Error(json.error || 'Server error occurred during real-time analysis.');
      }
    } catch (err) {
      console.error('Real-time scan analysis failed:', err);
      setScanState('ready');
      // fetch() throws TypeError ("Failed to fetch") only when the FarmWise server cannot be reached at all
      setUploadError(err instanceof TypeError
        ? L({ en: 'Cannot reach the FarmWise server. Check that it is running (npm run dev) and your internet is on, then try again.', te: 'FarmWise సర్వర్‌ను చేరుకోలేకపోయాం. అది నడుస్తోందో (npm run dev), ఇంటర్నెట్ ఉందో చూసి మళ్లీ ప్రయత్నించండి.' })
        : err.message || 'Real-time analysis failed. Please check your photo and try again.');
    }
  };

  const handleSaveToAlerts = () => {
    if (!analysisResult) return;

    saveScanAlert({
      crop: analysisResult.identified_crop || selectedCrop || 'Crop',
      possible_issue: analysisResult.possible_issue || 'Crop Health Observation',
      confidence: analysisResult.confidence_pct,
      confidence_level: analysisResult.confidence_level,
      first_step: analysisResult.practical_next_steps?.[0] || 'Monitor plants daily',
    });

    setSavedToAlerts(true);
  };

  const getCertaintyClass = (level) => {
    if (level === 'high') return 'high';
    if (level === 'medium') return 'medium';
    return 'uncertain';
  };

  const getCertaintyLabel = (level) => {
    if (level === 'high') return L({ en: 'High confidence', te: 'ఎక్కువ నమ్మకం' });
    if (level === 'medium') return L({ en: 'Moderate confidence', te: 'మధ్యస్థ నమ్మకం' });
    if (level === 'low') return L({ en: 'Low confidence', te: 'తక్కువ నమ్మకం' });
    return L({ en: 'Uncertain', te: 'అనిశ్చితం' });
  };

  return (
    <section className="panel page" data-page="scan" style={{ display: 'block' }}>
      <div className="scan-page-flow">
        {/* =========================================================
            SECTION 1: PAGE HEADING AND SHORT INSTRUCTIONS
            ========================================================= */}
        <header className="scan-heading-block">
          <div className="scan-heading-badge">
            <Icon name="scan" className="ico sm" />
            <span>{L({ en: 'AI Plant Health Diagnosis', te: 'AI పంట ఆరోగ్య నిర్ధారణ' })}</span>
          </div>
          <h1 className="scan-heading-title">{t('scan.h', 'Photograph a leaf, catch problems early')}</h1>
          <p className="scan-heading-desc">
            {t('scan.p', 'Take or upload a photo of an affected plant for live, real-time AI diagnosis and safe field steps.')}
          </p>
        </header>

        {/* API Key Missing Notice (if applicable) */}
        {keyConfigured === false && (
          <div className="scan-setup-card" role="region" aria-label="Setup notice">
            <Icon name="alert" className="ico" style={{ color: 'var(--orange)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '14.5px' }}>
                {L({ en: 'Gemini API Key Required in .env', te: 'జెమిని API కీ అవసరం' })}
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--ink-2)' }}>
                {L({
                  en: 'To run real-time plant analysis, configure GEMINI_API_KEY in your .env file on the server.',
                  te: 'ప్రత్యక్ష విశ్లేషణ కోసం మీ .env ఫైల్‌లో GEMINI_API_KEY ని అమర్చండి.',
                })}
              </p>
            </div>
          </div>
        )}

        {/* =========================================================
            SECTION 2: UPLOAD CROP PHOTO SECTION
            ========================================================= */}
        <div ref={uploadSectionRef} className="scan-upload-card" role="region" aria-label="Upload crop photo section">
          {/* Always-mounted hidden file and camera inputs */}
          <input
            ref={fileInputRef}
            type="file"
            id="scanFileInput"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            aria-label="Upload crop photo"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            id="scanCameraInput"
            accept="image/*"
            capture="environment"
            aria-label="Take photo with camera"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          {/* Crop Selector */}
          <div className="scan-crop-selector">
            <label id="cropSelectLabel" className="scan-selector-label">
              <Icon name="layers" className="ico sm" />
              <span>{t('scan.cropLabel', 'Select crop (if known)')}</span>
            </label>
            <div className="crop-select-pills" role="radiogroup" aria-labelledby="cropSelectLabel">
              <button
                type="button"
                className={`crop-pill-btn ${selectedCrop === '' ? 'active' : ''}`}
                onClick={() => setSelectedCrop('')}
                aria-checked={selectedCrop === ''}
                role="radio"
              >
                {t('scan.cropAuto', 'Auto-detect / Other')}
              </button>
              {CROPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`crop-pill-btn ${selectedCrop === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCrop(c.id)}
                  aria-checked={selectedCrop === c.id}
                  role="radio"
                >
                  {L(c.name)}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Dropzone or Preview */}
          {!photoSrc ? (
            /* Dropzone when NO photo is selected */
            <div
              className={`scan-dropzone ${isDragOver ? 'over' : ''}`}
              id="dropzoneArea"
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
              <div className="scan-dropzone-icon">
                <Icon name="camera" className="ico lg" />
              </div>
              <h2 className="scan-dropzone-title">{t('scan.drop', 'Drop a leaf or plant photo here')}</h2>
              <p className="scan-dropzone-subtitle">{t('scan.dropP', 'One leaf, in daylight, filling the frame with clear focus.')}</p>

              {/* Action Buttons: Camera & Upload */}
              <div className="scan-upload-btns">
                <button
                  type="button"
                  className="btn btn-dark scan-btn-camera"
                  id="cameraTriggerBtn"
                  onClick={() => cameraInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Icon name="camera" className="ico sm" />
                  <span>{t('scan.camera', 'Take photo')}</span>
                </button>

                <button
                  type="button"
                  className="btn scan-btn-choose"
                  id="chooseFileTriggerBtn"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Icon name="upload" className="ico sm" />
                  <span>{t('scan.choose', 'Choose photo')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Clear, Visible Photo Preview when photo IS selected (kept visible during and after analysis) */
            <div className="scan-preview-wrapper">
              <div className="scan-preview-header">
                <span className="scan-preview-status">
                  <Icon name="check" className="ico sm" />
                  <span>{L({ en: 'Photo Ready for Inspection', te: 'పరిశీలనకు ఫోటో సిద్ధంగా ఉంది' })}</span>
                </span>
                <span className="scan-preview-crop-tag">
                  {selectedCrop ? CROPS.find(c => c.id === selectedCrop)?.name?.[lang] || selectedCrop : t('scan.cropAuto', 'Auto-detect crop')}
                </span>
              </div>

              <div className={`scan-preview-frame ${scanState === 'scanning' ? 'is-scanning' : ''}`}>
                <img src={photoSrc} alt={photoName || 'Selected crop leaf'} className="scan-preview-img" />
                <div className="scan-laser-sweep" />
              </div>

              <div className="scan-preview-toolbar">
                <div className="scan-file-meta">
                  <span className="scan-filename" title={photoName}>{photoName}</span>
                  {photoSize && <span className="scan-filesize">{formatFileSize(photoSize)}</span>}
                </div>

                <div className="scan-preview-controls">
                  <button
                    type="button"
                    className="btn btn-sm scan-control-btn"
                    id="replacePhotoBtn"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={t('scan.replace', 'Replace photo')}
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon name="upload" className="ico sm" />
                    <span>{t('scan.replace', 'Replace')}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm scan-control-btn"
                    id="cameraReplaceBtn"
                    onClick={() => cameraInputRef.current?.click()}
                    aria-label="Take new photo"
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon name="camera" className="ico sm" />
                    <span>{L({ en: 'Camera', te: 'కెమెరా' })}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm scan-control-btn btn-danger-soft"
                    id="clearImg"
                    aria-label={t('scan.remove', 'Remove photo')}
                    onClick={handleClearPhoto}
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon name="x" className="ico sm" />
                    <span>{t('scan.remove', 'Remove')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message Box (if validation or upload error) */}
          {uploadError && (
            <div className="scan-error-alert" role="alert">
              <Icon name="alert" className="ico sm" style={{ flexShrink: 0 }} />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Guidelines and Tips */}
          <div className="scan-guidance-card">
            <h3 className="scan-guidance-title">
              <Icon name="info" className="ico sm" />
              <span>{t('scan.tipsTitle', 'Tips for a useful photo')}</span>
            </h3>
            <div className="scan-guidance-grid">
              <div className="scan-tip-item">
                <span className="scan-tip-num">1</span>
                <span>{t('scan.tip1', 'Good daylight: Take the photo in natural morning or afternoon light.')}</span>
              </div>
              <div className="scan-tip-item">
                <span className="scan-tip-num">2</span>
                <span>{t('scan.tip2', 'Sharp focus: Tap to focus directly on the spots, lesions, or insects.')}</span>
              </div>
              <div className="scan-tip-item">
                <span className="scan-tip-num">3</span>
                <span>{t('scan.tip3', 'Include context: Show both the affected area and a little healthy green.')}</span>
              </div>
            </div>
          </div>

          <div className="scan-privacy-line">
            <Icon name="check" className="ico sm" style={{ color: 'var(--leaf)', flexShrink: 0 }} />
            <span>
              {t(
                'scan.privacyNotice',
                'Privacy: Your photo is only sent to the configured Google Gemini service for AI analysis. It is never sold, publicly shared, or permanently stored.'
              )}
            </span>
          </div>
        </div>

        {/* =========================================================
            SECTION 3: ANALYZE CROP BUTTON (AND LOADING STATE)
            ========================================================= */}
        <div className="scan-analyze-block">
          <button
            type="button"
            className={`btn btn-orange btn-analyze-action ${scanState === 'scanning' ? 'is-loading' : ''}`}
            id="analyzeBtn"
            disabled={!photoSrc || scanState === 'scanning'}
            onClick={startAnalysis}
            aria-busy={scanState === 'scanning'}
          >
            {scanState === 'scanning' ? (
              <>
                <span className="spin scan-btn-spinner" />
                <span>{t('scan.analyzing', 'Analyzing crop in real time…')}</span>
              </>
            ) : (
              <>
                <Icon name="scan" className="ico" />
                <span>{t('scan.analyzeBtn', 'Analyze crop')}</span>
              </>
            )}
          </button>

          {!photoSrc && (
            <div className="scan-action-helper">
              {L({
                en: 'Take or choose a plant photo above to enable analysis',
                te: 'విశ్లేషణ కోసం పైనుండి ఫోటోను తీయండి లేదా ఎంచుకోండి',
              })}
            </div>
          )}

          {/* Real-time Analyzing Progress State Card */}
          {scanState === 'scanning' && (
            <div className="scan-analyzing-card" role="status" aria-live="polite">
              <div className="scan-analyzing-header">
                <span className="spin scan-loading-spin" />
                <div className="scan-analyzing-text">
                  <strong className="scan-analyzing-step">{L(statusSteps[scanStatusIndex])}</strong>
                  <span className="scan-analyzing-sub">
                    {L({ en: 'Powered by Google Gemini plant pathology vision model', te: 'గూగుల్ జెమిని ప్లాంట్ విజన్ నమూనా ద్వారా' })}
                  </span>
                </div>
              </div>
              <div className="scan-progress-track">
                <div
                  className="scan-progress-bar"
                  style={{ width: `${((scanStatusIndex + 1) / statusSteps.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            SECTION 4: ANALYSIS RESULT SECTION AT THE BOTTOM
            Appears strictly below the upload and analyze sections.
            ========================================================= */}
        {scanState === 'done' && analysisResult && (
          <article
            ref={resultRef}
            className="scan-result-card"
            id="resultSection"
            role="region"
            aria-label="Crop disease analysis result"
            aria-live="polite"
          >
            {/* 4.0 Result Card Top Bar */}
            <div className="result-card-banner">
              <div className="result-banner-left">
                <span className="result-badge-live">
                  <Icon name="check" className="ico sm" />
                  <span>{L({ en: 'Live AI Assessment · Preliminary', te: 'ప్రత్యక్ష AI అంచనా · ప్రాథమిక పరిశీలన' })}</span>
                </span>
                {analysisResult.identified_crop && (
                  <span className="result-badge-crop">
                    <Icon name="layers" className="ico sm" />
                    <span><strong>{L({ en: 'Identified crop: ', te: 'గుర్తించిన పంట: ' })}</strong>{analysisResult.identified_crop}</span>
                  </span>
                )}
              </div>

              {analysisResult.confidence_pct != null && (
                <div className="result-match-pill">
                  <div className="match-num">{analysisResult.confidence_pct}%</div>
                  <div className="match-meta">
                    <span className="match-label">{L({ en: 'Visual Match', te: 'సరిపోలిక' })}</span>
                    <span className={`certainty-tag ${getCertaintyClass(analysisResult.confidence_level)}`}>
                      {getCertaintyLabel(analysisResult.confidence_level)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Non-Plant or Unclear Photo Alert (if applicable) */}
            {(!analysisResult.is_plant || !analysisResult.is_clear) && (
              <div className="result-clarity-warning" role="alert">
                <Icon name="alert" className="ico" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>
                    {!analysisResult.is_plant
                      ? t('scan.notPlantTitle', 'No plant or leaf detected')
                      : t('scan.unclearTitle', 'Photo is unclear or out of focus')}
                  </strong>
                  <p>
                    {analysisResult.clarity_issue ||
                      L({
                        en: 'The uploaded image lacks sufficient visual detail to identify plant health issues. Please ensure the camera is in focus, well lit, and framed closely on a single leaf.',
                        te: 'అప్‌లోడ్ చేసిన ఫోటోలో ఆకు వివరాలు స్పష్టంగా లేవు. దయచేసి పగటి వెలుగులో ఆకు దగ్గరగా కనిపించేలా మళ్లీ ఫోటో తీయండి.',
                      })}
                  </p>
                </div>
              </div>
            )}

            {/* Section 4.1: Possible Disease */}
            <div className="result-section-box section-disease">
              <div className="result-section-header">
                <Icon name="sprout" className="ico sm" />
                <h3>{t('scan.issueSec', 'Possible disease / issue')}</h3>
              </div>

              <div className="disease-title-row">
                <h2 className="disease-primary-title">
                  {analysisResult.possible_issue || L({ en: 'Unable to determine', te: 'నిర్ధారించలేకపోయాం' })}
                </h2>
              </div>

              {analysisResult.confidence_explanation && (
                <p className="disease-confidence-desc">
                  {analysisResult.confidence_explanation}
                </p>
              )}
            </div>

            {/* Section 4.2: What the Image Shows */}
            {analysisResult.visible_symptoms && analysisResult.visible_symptoms.length > 0 && (
              <div className="result-section-box section-evidence">
                <div className="result-section-header">
                  <Icon name="eye" className="ico sm" />
                  <h3>{t('scan.symptomsSec', 'What the image shows (Visible evidence)')}</h3>
                </div>
                <ul className="result-checklist">
                  {analysisResult.visible_symptoms.map((symptom, i) => (
                    <li key={i} className="evidence-item">
                      <span className="evidence-bullet">
                        <Icon name="check" className="ico sm" />
                      </span>
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 4.3: Possible Causes */}
            {analysisResult.possible_causes && analysisResult.possible_causes.length > 0 && (
              <div className="result-section-box section-causes">
                <div className="result-section-header">
                  <Icon name="cloudsun" className="ico sm" />
                  <h3>{t('scan.causesSec', 'Possible causes & field conditions')}</h3>
                </div>
                <ul className="result-checklist">
                  {analysisResult.possible_causes.map((cause, i) => (
                    <li key={i} className="cause-item">
                      <span className="cause-bullet">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 4.4: Recommended Next Steps */}
            {analysisResult.practical_next_steps && analysisResult.practical_next_steps.length > 0 && (
              <div className="result-section-box section-steps">
                <div className="result-section-header">
                  <Icon name="check-sq" className="ico sm" />
                  <h3>{t('scan.actionsSec', 'Recommended next steps')}</h3>
                  <span className="safe-pill-header">{L({ en: 'Safe Field Actions', te: 'సురక్షిత చర్యలు' })}</span>
                </div>
                <div className="steps-list">
                  {analysisResult.practical_next_steps.map((step, i) => (
                    <div key={i} className="step-card">
                      <div className="step-badge-num">{i + 1}</div>
                      <div className="step-content">
                        <span className="step-tag">{L({ en: 'Low-Risk Step', te: 'రక్షిత చర్య' })}</span>
                        <p className="step-text">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4.5: When to Get Expert Help */}
            {analysisResult.when_to_contact_expert && (
              <div className="result-section-box section-expert">
                <div className="result-section-header">
                  <Icon name="phone" className="ico sm" />
                  <h3>{t('scan.expertSec', 'When to get expert help')}</h3>
                </div>
                <div className="expert-advisory-content">
                  <p>{analysisResult.when_to_contact_expert}</p>
                </div>
              </div>
            )}

            {/* Section 4.6: Helpful Additional Photos (if applicable) */}
            {analysisResult.additional_photo_needed && (
              <div className="result-section-box section-additional-photo">
                <div className="result-section-header">
                  <Icon name="camera" className="ico sm" />
                  <h3>{t('scan.photoSec', 'Helpful additional photos')}</h3>
                </div>
                <p className="additional-photo-text">{analysisResult.additional_photo_needed}</p>
              </div>
            )}

            {/* Section 4.7: Safety Disclaimer Banner */}
            <div className="result-disclaimer-banner" role="note">
              <Icon name="alert" className="ico sm" style={{ flexShrink: 0 }} />
              <span>
                {analysisResult.safety_notice ||
                  t(
                    'scan.safeDisclaimer',
                    'Important: This is an AI-generated preliminary assessment, not a laboratory diagnosis. Do not spray chemicals or pesticides without consulting your local agricultural extension officer and checking the product label.'
                  )}
              </span>
            </div>

            {/* Section 4.8: Quick Actions Container */}
            <div className="result-actions-block" role="region" aria-label="Next actions">
              <span className="actions-section-title">
                <Icon name="arrow" className="ico sm" />
                <span>{t('scan.nextActionsTitle', 'What would you like to do next?')}</span>
              </span>

              <div className="actions-tiles-list">
                {/* 1. Primary Action: Scan another photo */}
                <button
                  type="button"
                  className="scan-action-tile primary-rescan"
                  id="rescanBtn"
                  onClick={handleScanAnother}
                  aria-label={t('scan.againBtn', 'Scan another photo')}
                >
                  <div className="tile-icon-box">
                    <Icon name="scan" className="ico" />
                  </div>
                  <div className="tile-text">
                    <strong className="tile-title">{t('scan.againBtn', 'Scan another photo')}</strong>
                    <span className="tile-desc">{t('scan.againDesc', 'Take or upload a new photo to check another plant')}</span>
                  </div>
                  <span className="tile-arrow" aria-hidden="true">↑</span>
                </button>

                {/* 2. Secondary Action: Save to farm alerts */}
                <button
                  type="button"
                  className={`scan-action-tile secondary-save ${savedToAlerts ? 'is-saved' : ''}`}
                  id="saveScanAlertBtn"
                  onClick={handleSaveToAlerts}
                  disabled={savedToAlerts}
                  aria-label={savedToAlerts ? t('scan.savedBtn', 'Saved to alerts ✓') : t('scan.saveBtn', 'Save to farm alerts')}
                >
                  <div className="tile-icon-box">
                    <Icon name={savedToAlerts ? 'check' : 'save'} className="ico" />
                  </div>
                  <div className="tile-text">
                    <strong className="tile-title">
                      {savedToAlerts ? t('scan.savedBtn', 'Saved to alerts ✓') : t('scan.saveBtn', 'Save to farm alerts')}
                    </strong>
                    <span className="tile-desc">
                      {savedToAlerts
                        ? L({ en: 'Assessment saved to your farm dashboard overview', te: 'మీ డాష్‌బోర్డ్ అలర్ట్‌లలో భద్రపరచబడింది' })
                        : t('scan.saveDesc', 'Keeps this assessment in your farm monitoring list')}
                    </span>
                  </div>
                  <span className="tile-arrow" aria-hidden="true">{savedToAlerts ? '✓' : '+'}</span>
                </button>

                {/* 3. Third Action: Find nearby input shops */}
                <a
                  href="/app/market"
                  className="scan-action-tile tertiary-market"
                  id="nearbyShopsBtn"
                  aria-label={t('scan.marketBtn', 'Nearby input shops')}
                >
                  <div className="tile-icon-box">
                    <Icon name="store" className="ico" />
                  </div>
                  <div className="tile-text">
                    <strong className="tile-title">{t('scan.marketBtn', 'Nearby input shops')}</strong>
                    <span className="tile-desc">
                      {t('scan.marketDesc', 'Locate verified shops nearby for bio-inputs & sprayers')}
                    </span>
                  </div>
                  <span className="tile-arrow" aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
