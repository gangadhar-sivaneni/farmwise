import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { CROPS } from '../../data/cropsData';
import { LBL } from '../../data/translations';

const IRRIGATION = {
  borewell: { en: 'Borewell', te: 'బోరుబావి' },
  canal: { en: 'Canal', te: 'కాలువ' },
  drip: { en: 'Drip', te: 'బిందు సేద్యం' },
  sprinkler: { en: 'Sprinkler', te: 'స్ప్రింక్లర్' },
  rainfed: { en: 'Rain-fed', te: 'వర్షాధారం' },
  tank: { en: 'Tank / pond', te: 'చెరువు' },
};
const REQ = { en: 'Required', te: 'తప్పనిసరి' };

function formatDateSafe(val, fallback = 'Recent') {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return fallback;
  }
}

function maskEmail(str) {
  if (!str || !str.includes('@')) return str || '';
  const [user, domain] = str.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${'*'.repeat(Math.min(user.length - 2, 5))}@${domain}`;
}

/** Farmer's personal details — saved per account. */
export default function ProfilePage() {
  const { L, showToast } = useLanguage();
  const { profile, saveProfile } = useApp();
  const {
    user,
    resendVerificationEmail,
    checkEmailVerified,
    changePassword,
    updateUserProfilePhoto,
    sendAccountDeletionVerification,
    deleteAccountAndAllData,
  } = useAuth();

  const fileInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Danger Zone: Account Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState('initial'); // 'initial' | 'verify'
  const [deleteCooldown, setDeleteCooldown] = useState(0);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [f, setF] = useState(() => {
    const p = profile || {};
    const safeCrops = Array.isArray(p.crops) ? p.crops : [];
    return {
      name: p.name || user?.name || '',
      phone: p.phone || user?.phone || '',
      village: p.village || '',
      mandal: p.mandal || '',
      district: p.district || user?.district || '',
      state: p.state || user?.state || 'Telangana',
      pin: p.pin || '',
      landAcres: p.landAcres || '',
      experience: p.experience || '',
      crops: safeCrops,
      irrigation: p.irrigation || 'borewell',
      soil: p.soil || 'loamy',
      farmerId: p.farmerId || '',
      photoURL: p.photoURL || user?.photoURL || '',
    };
  });

  const [errors, setErrors] = useState({});

  // Sync profile form state when profile or user asynchronously loads
  useEffect(() => {
    if (!profile && !user) return;
    setF((prev) => {
      const p = profile || {};
      const safeCrops = Array.isArray(p.crops) ? p.crops : [];
      return {
        ...prev,
        name: prev.name || p.name || user?.name || '',
        phone: prev.phone || p.phone || user?.phone || '',
        village: prev.village || p.village || '',
        mandal: prev.mandal || p.mandal || '',
        district: prev.district || p.district || user?.district || '',
        state: prev.state || p.state || user?.state || 'Telangana',
        pin: prev.pin || p.pin || '',
        landAcres: prev.landAcres || p.landAcres || '',
        experience: prev.experience || p.experience || '',
        crops: Array.isArray(prev.crops) && prev.crops.length > 0 ? prev.crops : safeCrops,
        irrigation: prev.irrigation || p.irrigation || 'borewell',
        soil: prev.soil || p.soil || 'loamy',
        farmerId: prev.farmerId || p.farmerId || '',
        photoURL: prev.photoURL || p.photoURL || user?.photoURL || '',
      };
    });
  }, [profile, user]);

  // Account Security state
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [checkingVerify, setCheckingVerify] = useState(false);

  // Cooldown timer for resending verification email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const res = await resendVerificationEmail();
    if (res.ok) {
      setResendCooldown(60);
      showToast({
        en: 'Verification email sent. Please check your inbox and spam folder.',
        te: 'ధృవీకరణ ఈమెయిల్ పంపబడింది. దయచేసి ఇన్‌బాక్స్ చూడండి.',
      });
    } else {
      showToast({
        en: res.error?.en || 'Failed to send verification email.',
        te: 'ఈమెయిల్ పంపడం విఫలమైంది.',
      });
    }
  };

  const handleCheckVerify = async () => {
    setCheckingVerify(true);
    const verified = await checkEmailVerified();
    setCheckingVerify(false);
    if (verified) {
      showToast({ en: 'Email verified successfully!', te: 'ఈమెయిల్ విజయవంతంగా ధృవీకరించబడింది!' });
    } else {
      showToast({
        en: 'Email not verified yet. Please check your inbox.',
        te: 'ఈమెయిల్ ఇంకా ధృవీకరించబడలేదు. దయచేసి ఇన్‌బాక్స్ చూడండి.',
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (!newPw || newPw.length < 6) {
      setPwError({ en: 'New password must be at least 6 characters.', te: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.' });
      return;
    }
    if (newPw !== confirmNewPw) {
      setPwError({ en: 'Passwords do not match.', te: 'పాస్‌వర్డ్‌లు సరిపోలలేదు.' });
      return;
    }

    setPwBusy(true);
    const res = await changePassword(newPw);
    setPwBusy(false);

    if (res.ok) {
      setPwSuccess(true);
      setNewPw('');
      setConfirmNewPw('');
      showToast({ en: 'Password updated successfully!', te: 'పాస్‌వర్డ్ విజయవంతంగా నవీకరించబడింది!' });
    } else {
      setPwError(res.error);
    }
  };

  /* =========================================================
     PROFILE PHOTO HANDLERS
     ========================================================= */
  const activePhoto = f.photoURL || profile?.photoURL || user?.photoURL || '';

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast({ en: 'Please select an image file (PNG, JPG, or WEBP).', te: 'దయచేసి ఫోటో ఫైల్ ఎంచుకోండి.' });
      return;
    }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setF((prev) => ({ ...prev, photoURL: dataUrl }));
        updateUserProfilePhoto(dataUrl);
        saveProfile({ ...f, photoURL: dataUrl });
        setPhotoUploading(false);
        showToast({ en: 'Profile photo updated!', te: 'ప్రొఫైల్ ఫోటో నవీకరించబడింది!' });
      };
      img.onerror = () => {
        setPhotoUploading(false);
        showToast({ en: 'Failed to process image.', te: 'ఫోటోను ప్రాసెస్ చేయడం విఫలమైంది.' });
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setPhotoUploading(false);
      showToast({ en: 'Failed to read image file.', te: 'ఫోటో చదవడం విఫలమైంది.' });
    };
    reader.readAsDataURL(file);
  };

  const handleUseGmailPhoto = () => {
    const gPhoto = user?.photoURL || '';
    if (!gPhoto) return;
    setF((prev) => ({ ...prev, photoURL: gPhoto }));
    updateUserProfilePhoto(gPhoto);
    saveProfile({ ...f, photoURL: gPhoto });
    showToast({ en: 'Using your Google account photo.', te: 'గూగుల్ ఖాతా ఫోటో వర్తించబడింది.' });
  };

  const handleRemovePhoto = () => {
    setF((prev) => ({ ...prev, photoURL: '' }));
    updateUserProfilePhoto('');
    saveProfile({ ...f, photoURL: '' });
    showToast({ en: 'Profile photo removed.', te: 'ప్రొఫైల్ ఫోటో తీసివేయబడింది.' });
  };

  /* =========================================================
     ACCOUNT DELETION HANDLERS
     ========================================================= */
  useEffect(() => {
    if (deleteCooldown <= 0) return;
    const t = setInterval(() => setDeleteCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [deleteCooldown]);

  const handleSendDeletionEmail = async () => {
    if (deleteCooldown > 0) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const res = await sendAccountDeletionVerification();
    setDeleteBusy(false);
    if (res.ok) {
      setDeleteStep('verify');
      setDeleteCooldown(60);
      showToast({
        en: 'Verification link sent to your email. Please check your inbox.',
        te: 'ధృవీకరణ లింక్ మీ ఈమెయిల్‌కు పంపబడింది. దయచేసి ఇన్‌బాక్స్ చూడండి.',
      });
    } else {
      setDeleteError(res.error);
    }
  };

  const handleConfirmDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError(null);

    const isGoogle = user?.authProvider === 'google.com';
    if (!isGoogle && !deletePassword) {
      setDeleteError({
        en: 'Please enter your account password to confirm deletion.',
        te: 'ఖాతాను తొలగించడానికి మీ పాస్‌వర్డ్‌ను నమోదు చేయండి.',
      });
      return;
    }

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError({
        en: 'Please type DELETE in the confirmation box.',
        te: 'ధృవీకరణ పెట్టెలో DELETE అని టైప్ చేయండి.',
      });
      return;
    }

    setDeleteBusy(true);
    const res = await deleteAccountAndAllData(deletePassword);
    setDeleteBusy(false);

    if (res.ok) {
      setShowDeleteModal(false);
      showToast({
        en: 'Your account and all associated data have been permanently deleted.',
        te: 'మీ ఖాతా మరియు అన్ని రికార్డులు డేటాబేస్ నుండి పూర్తిగా తొలగించబడ్డాయి.',
      });
    } else {
      setDeleteError(res.error);
    }
  };

  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setErrors((s) => ({ ...s, [k]: null }));
  };

  const toggleCrop = (id) =>
    setF((s) => {
      const cropsArr = Array.isArray(s.crops) ? s.crops : [];
      return {
        ...s,
        crops: cropsArr.includes(id) ? cropsArr.filter((c) => c !== id) : [...cropsArr, id],
      };
    });

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    for (const k of ['name', 'village', 'district', 'state']) if (!String(f[k] || '').trim()) err[k] = REQ;
    const phone = String(f.phone || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phone)) err.phone = { en: 'Enter a 10-digit Indian mobile number.', te: '10 అంకెల మొబైల్ నంబర్ ఇవ్వండి.' };
    if (f.pin && !/^[1-9]\d{5}$/.test(String(f.pin).trim())) err.pin = { en: 'PIN code has 6 digits.', te: 'పిన్ కోడ్ 6 అంకెలు.' };
    if (!(Number(f.landAcres) > 0)) err.landAcres = { en: 'Enter your total land in acres.', te: 'మొత్తం భూమి ఎకరాల్లో ఇవ్వండి.' };
    if (f.experience !== '' && !(Number(f.experience) >= 0 && Number(f.experience) <= 80)) err.experience = { en: 'Enter years between 0 and 80.', te: '0–80 మధ్య సంవత్సరాలు ఇవ్వండి.' };
    const cropsArr = Array.isArray(f.crops) ? f.crops : [];
    if (!cropsArr.length) err.crops = { en: 'Pick at least one crop you grow.', te: 'మీరు పండించే కనీసం ఒక పంట ఎంచుకోండి.' };
    setErrors(err);
    if (Object.values(err).some(Boolean)) {
      document.querySelector('.prof .err:not(:empty)')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const trimmed = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    saveProfile({ ...trimmed, phone, updatedAt: new Date().toISOString() });
    showToast({ en: 'Profile saved', te: 'ప్రొఫైల్ సేవ్ అయింది' });
  };

  const fld = (k, label, input, required) => (
    <div className="fld">
      <label htmlFor={`pr-${k}`}>{L(label)}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      {input}
      <p className="err" role={errors[k] ? 'alert' : undefined}>{errors[k] ? L(errors[k]) : ''}</p>
    </div>
  );
  const text = (k, label, { required, ...props } = {}) =>
    fld(k, label, <div className="inp"><input id={`pr-${k}`} value={f[k] || ''} onChange={set(k)} required={required} {...props} /></div>, required);

  const selectedCrops = Array.isArray(f.crops) ? f.crops : [];

  return (
    <section className="panel page" data-page="profile" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{L({ en: 'Your farmer profile', te: 'మీ రైతు ప్రొఫైల్' })}</h1>
          <p>{L({ en: 'Fields marked * are required. Saved securely for your account.', te: '* గుర్తు ఉన్నవి తప్పనిసరి. మీ ఖాతా కోసం భద్రంగా సేవ్ చేయబడుతుంది.' })}</p>
        </div>
        {profile?.updatedAt && (
          <span className="pill ok"><i /><span>{L({ en: 'Saved', te: 'సేవ్ అయింది' })} · {formatDateSafe(profile.updatedAt)}</span></span>
        )}
      </div>

      <form className="prof" onSubmit={submit} noValidate>
        {/* PROFILE PICTURE CARD */}
        <div className="card">
          <div className="card-h">
            <h3>{L({ en: 'Profile picture', te: 'ప్రొఫైల్ ఫోటో' })}</h3>
          </div>
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={f.name || 'Farmer'}
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--brand, #2e7d32)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '30px',
                    fontWeight: '700',
                    border: '3px solid rgba(46, 125, 50, 0.3)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  {(f.name || user?.name || '?')[0].toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  hidden
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  className="btn btn-dark sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                >
                  <Icon name="upload" className="ico sm" />
                  <span>{L(photoUploading ? { en: 'Uploading...', te: 'అప్‌లోడ్ అవుతోంది...' } : { en: 'Upload Photo', te: 'ఫోటో అప్‌లోడ్ చేయండి' })}</span>
                </button>

                {user?.photoURL && f.photoURL !== user.photoURL && (
                  <button
                    type="button"
                    className="btn btn-ghost sm"
                    onClick={handleUseGmailPhoto}
                    style={{ border: '1px solid var(--line-2)' }}
                  >
                    <span>{L({ en: 'Use Google Photo', te: 'గూగుల్ ఫోటో వాడండి' })}</span>
                  </button>
                )}

                {activePhoto && (
                  <button
                    type="button"
                    className="btn btn-ghost sm"
                    onClick={handleRemovePhoto}
                    style={{ border: '1px solid var(--line-2)', color: 'var(--ink-3)' }}
                  >
                    <Icon name="trash" className="ico sm" />
                    <span>{L({ en: 'Remove', te: 'తొలగించు' })}</span>
                  </button>
                )}
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.4' }}>
                {user?.photoURL
                  ? L({
                      en: 'Automatically synced from your Google account. You can replace or upload a new photo anytime.',
                      te: 'మీ గూగుల్ ఖాతా నుండి స్వయంచాలకంగా తీసుకోబడింది. మీరు ఎప్పుడైనా కొత్త ఫోటోను మార్చవచ్చు లేదా అప్‌లోడ్ చేయవచ్చు.',
                    })
                  : L({
                      en: 'Upload a picture (JPG, PNG, WEBP). It will appear across your FarmWise topbar and profile.',
                      te: 'ఫోటోను అప్‌లోడ్ చేయండి (JPG, PNG, WEBP). ఇది మీ FarmWise డాష్‌బోర్డ్‌లో కనిపిస్తుంది.',
                    })}
              </p>
            </div>
          </div>
        </div>

        {/* PERSONAL DETAILS CARD */}
        <div className="card">
          <div className="card-h"><h3>{L({ en: 'Personal details', te: 'వ్యక్తిగత వివరాలు' })}</h3></div>
          <div className="pm-grid">
            {text('name', { en: 'Full name', te: 'పూర్తి పేరు' }, { required: true, autoComplete: 'name' })}
            {fld('phone', { en: 'Mobile number', te: 'మొబైల్ నంబర్' },
              <div className="inp"><span className="pre">+91</span><input id="pr-phone" type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={f.phone || ''} onChange={(e) => { setF((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })); setErrors((s) => ({ ...s, phone: null })); }} /></div>, true)}
            {text('farmerId', { en: 'Farmer ID / Pattadar passbook no. (optional)', te: 'రైతు ID / పట్టాదారు పాస్‌బుక్ నం. (ఐచ్ఛికం)' })}
            {text('experience', { en: 'Years of farming (optional)', te: 'వ్యవసాయ అనుభవం (సంవత్సరాలు, ఐచ్ఛికం)' }, { inputMode: 'numeric' })}
          </div>
        </div>

        {/* ADDRESS CARD */}
        <div className="card">
          <div className="card-h"><h3>{L({ en: 'Address', te: 'చిరునామా' })}</h3></div>
          <div className="pm-grid">
            {text('village', { en: 'Village', te: 'గ్రామం' }, { required: true })}
            {text('mandal', { en: 'Mandal (optional)', te: 'మండలం (ఐచ్ఛికం)' })}
            {text('district', { en: 'District', te: 'జిల్లా' }, { required: true })}
            {text('state', { en: 'State', te: 'రాష్ట్రం' }, { required: true })}
            {text('pin', { en: 'PIN code (optional)', te: 'పిన్ కోడ్ (ఐచ్ఛికం)' }, { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' })}
          </div>
        </div>

        {/* FARMING DETAILS CARD */}
        <div className="card">
          <div className="card-h"><h3>{L({ en: 'Farming details', te: 'వ్యవసాయ వివరాలు' })}</h3></div>
          <div className="pm-grid">
            {fld('landAcres', { en: 'Total land', te: 'మొత్తం భూమి' },
              <div className="inp"><input id="pr-landAcres" inputMode="decimal" value={f.landAcres || ''} onChange={set('landAcres')} /><span className="suf">{L({ en: 'acres', te: 'ఎకరాలు' })}</span></div>, true)}
            {fld('irrigation', { en: 'Main water source', te: 'ప్రధాన నీటి వనరు' },
              <select id="pr-irrigation" className="select" value={f.irrigation || 'borewell'} onChange={set('irrigation')}>
                {Object.entries(IRRIGATION).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
              </select>)}
            {fld('soil', { en: 'Main soil type', te: 'ప్రధాన నేల రకం' },
              <select id="pr-soil" className="select" value={f.soil || 'loamy'} onChange={set('soil')}>
                {Object.entries(LBL.soil).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
              </select>)}
          </div>
          <div className="fld">
            <label id="pr-crops-l">{L({ en: 'Crops you grow', te: 'మీరు పండించే పంటలు' })}<span className="req" aria-hidden="true"> *</span></label>
            <div className="prof-crops" role="group" aria-labelledby="pr-crops-l">
              {CROPS.map((c) => (
                <button key={c.id} type="button" className="chip-f" aria-pressed={selectedCrops.includes(c.id)} onClick={() => { toggleCrop(c.id); setErrors((s) => ({ ...s, crops: null })); }}>
                  {L(c.name)}
                </button>
              ))}
            </div>
            <p className="err" role={errors.crops ? 'alert' : undefined}>{errors.crops ? L(errors.crops) : ''}</p>
          </div>
        </div>

        {/* ACCOUNT SECURITY & VERIFICATION SECTION */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{L({ en: 'Account Security & Verification', te: 'ఖాతా భద్రత & ధృవీకరణ' })}</h3>
            {user?.emailVerified ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(46, 125, 50, 0.12)',
                  color: '#2e7d32',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  fontSize: '12.5px',
                }}
              >
                <Icon name="check" className="ico sm" />
                <span>{L({ en: 'Email Verified', te: 'ఈమెయిల్ ధృవీకరించబడింది' })}</span>
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(234, 153, 0, 0.12)',
                  color: '#b45309',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  fontSize: '12.5px',
                }}
              >
                <Icon name="alert" className="ico sm" />
                <span>{L({ en: 'Email Not Verified', te: 'ధృవీకరించబడలేదు' })}</span>
              </span>
            )}
          </div>

          <div className="pm-grid" style={{ padding: '16px 20px', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {L({ en: 'Registered Email', te: 'నమోదిత ఈమెయిల్' })}
              </span>
              <span style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: '500', wordBreak: 'break-all' }}>
                {user?.email || 'farmer@gmail.com'}
              </span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {L({ en: 'Sign-in Method', te: 'లాగిన్ విధానం' })}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14.5px', color: 'var(--ink)', fontWeight: '500' }}>
                {user?.authProvider === 'google.com' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google OAuth 2.0</span>
                  </>
                ) : (
                  <>
                    <Icon name="file" className="ico sm" />
                    <span>{L({ en: 'Email & Password', te: 'ఈమెయిల్ & పాస్‌వర్డ్' })}</span>
                  </>
                )}
              </span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {L({ en: 'Account Created', te: 'ఖాతా సృష్టించిన తేదీ' })}
              </span>
              <span style={{ fontSize: '14.5px', color: 'var(--ink)', fontWeight: '500' }}>
                {formatDateSafe(user?.createdAt)}
              </span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {L({ en: 'Verification Action', te: 'ధృవీకరణ చర్య' })}
              </span>
              {!user?.emailVerified ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost sm"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    style={{ fontSize: '13px', padding: '4px 10px', minHeight: '32px' }}
                  >
                    <span>
                      {resendCooldown > 0
                        ? `${resendCooldown}s`
                        : L({ en: 'Resend Verification Email', te: 'ఈమెయిల్ మళ్లీ పంపండి' })}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost sm"
                    onClick={handleCheckVerify}
                    disabled={checkingVerify}
                    style={{ fontSize: '13px', padding: '4px 10px', minHeight: '32px' }}
                  >
                    <span>{L(checkingVerify ? { en: 'Checking...', te: 'తనిఖీ...' } : { en: 'Check Status', te: 'స్థితి చూడండి' })}</span>
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '13.5px', color: '#2e7d32', fontWeight: '500' }}>
                  {user?.authProvider === 'google.com'
                    ? L({ en: 'Verified by Google OAuth', te: 'గూగుల్ ద్వారా ధృవీకరించబడింది' })
                    : L({ en: 'Verified and active', te: 'ధృవీకరించబడింది' })}
                </span>
              )}
            </div>
          </div>

          {/* PASSWORD MANAGEMENT FOR PASSWORD-BASED ACCOUNTS */}
          {user?.authProvider !== 'google.com' ? (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--line-2)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px' }}>{L({ en: 'Password & Security', te: 'పాస్‌వర్డ్ & భద్రత' })}</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ink-3)' }}>
                    {L({ en: 'Ensure your account has a secure password.', te: 'మీ ఖాతాకు బలమైన పాస్‌వర్డ్ ఉండేలా చూసుకోండి.' })}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost sm"
                  onClick={() => setShowChangePw((v) => !v)}
                  style={{ border: '1px solid var(--line-2)' }}
                >
                  <span>{showChangePw ? L({ en: 'Cancel', te: 'రద్దు చేయి' }) : L({ en: 'Change Password', te: 'పాస్‌వర్డ్ మార్చండి' })}</span>
                </button>
              </div>

              {showChangePw && (
                <div style={{ marginTop: '16px', background: 'var(--soft, #f8f8f6)', padding: '16px', borderRadius: '12px' }}>
                  {pwSuccess && (
                    <p style={{ color: '#2e7d32', fontSize: '13.5px', margin: '0 0 12px', fontWeight: '600' }}>
                      {L({ en: 'Password updated successfully!', te: 'పాస్‌వర్డ్ విజయవంతంగా నవీకరించబడింది!' })}
                    </p>
                  )}
                  {pwError && (
                    <p className="err" style={{ marginBottom: '12px', fontSize: '13.5px', color: '#dc2626' }}>
                      {L(pwError)}
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                    <div className="fld" style={{ marginBottom: '8px' }}>
                      <label htmlFor="pr-newpw">{L({ en: 'New Password *', te: 'కొత్త పాస్‌వర్డ్ *' })}</label>
                      <div className="inp">
                        <input
                          id="pr-newpw"
                          type="password"
                          placeholder="Min 6 characters"
                          value={newPw}
                          onChange={(e) => {
                            setNewPw(e.target.value);
                            setPwError(null);
                          }}
                        />
                      </div>
                    </div>
                    <div className="fld" style={{ marginBottom: '8px' }}>
                      <label htmlFor="pr-confpw">{L({ en: 'Confirm New Password *', te: 'పాస్‌వర్డ్ నిర్ధారించండి *' })}</label>
                      <div className="inp">
                        <input
                          id="pr-confpw"
                          type="password"
                          placeholder="Repeat new password"
                          value={confirmNewPw}
                          onChange={(e) => {
                            setConfirmNewPw(e.target.value);
                            setPwError(null);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-dark sm"
                    onClick={handleChangePassword}
                    disabled={pwBusy}
                    style={{ marginTop: '10px' }}
                  >
                    <span>{L(pwBusy ? { en: 'Updating...', te: 'నవీకరిస్తోంది...' } : { en: 'Update Password', te: 'పాస్‌వర్డ్ అప్‌డేట్ చేయండి' })}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line-2)', background: 'var(--soft, #f8f8f6)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)' }}>
                ℹ️ {L({
                  en: 'Your account is authenticated through Google. Password and two-factor authentication are managed through your Google Account.',
                  te: 'మీ ఖాతా గూగుల్ ద్వారా ధృవీకరించబడింది. పాస్‌వర్డ్ మరియు భద్రత మీ గూగుల్ ఖాతా ద్వారా నిర్వహించబడుతుంది.',
                })}
              </p>
            </div>
          )}
        </div>

        {/* DANGER ZONE: DELETE ACCOUNT CARD */}
        <div className="card" style={{ borderColor: '#fca5a5', marginTop: '24px', background: 'rgba(239, 68, 68, 0.02)' }}>
          <div className="card-h" style={{ borderBottom: '1px solid #fee2e2' }}>
            <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="trash" className="ico" style={{ color: '#dc2626' }} />
              <span>{L({ en: 'Delete Account (Danger Zone)', te: 'ఖాతాను తొలగించండి (ప్రమాదకర ప్రాంతం)' })}</span>
            </h3>
          </div>
          <div style={{ padding: '20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              {L({
                en: 'Permanently delete your FarmWise account and all personal data, plots, field records, and crop insights from the website database. This action is irreversible.',
                te: 'మీ ఖాతా మరియు డేటాబేస్ లో సేవ్ చేయబడిన అన్ని ప్లాట్లు, పొలం రికార్డులు మరియు వివరాలను శాశ్వతంగా తొలగించండి. ఈ చర్యను వెనక్కి తీసుకోలేము.',
              })}
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteStep('initial');
                setDeleteError(null);
                setDeleteConfirmText('');
                setDeletePassword('');
              }}
              style={{
                borderColor: '#dc2626',
                color: '#dc2626',
                fontWeight: '600',
                padding: '10px 18px',
              }}
            >
              <Icon name="trash" className="ico sm" />
              <span>{L({ en: 'Delete My Account', te: 'నా ఖాతాను తొలగించండి' })}</span>
            </button>
          </div>
        </div>

        <div className="prof-foot">
          <button type="submit" className="btn btn-orange">
            <Icon name="save" className="ico" />
            <span>{L({ en: 'Save profile', te: 'ప్రొఫైల్ సేవ్ చేయండి' })}</span>
          </button>
        </div>
      </form>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteBusy) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div
            style={{
              background: 'var(--card, #ffffff)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--line-2, #e5e7eb)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="trash" className="ico md" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>
                  {L({ en: 'Delete Account & All Data', te: 'ఖాతా & మొత్తం డేటాను తొలగించండి' })}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  {maskEmail(user?.email || '')}
                </p>
              </div>
            </div>

            {deleteStep === 'initial' ? (
              <div>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: '#fff5f5',
                    border: '1px solid #fed7d7',
                    marginBottom: '18px',
                    fontSize: '13.5px',
                    color: '#9b2c2c',
                    lineHeight: '1.5',
                  }}
                >
                  <b>{L({ en: 'Warning:', te: 'హెచ్చరిక:' })}</b>{' '}
                  {L({
                    en: 'This will permanently erase all your farm plots, crop history, soil data, and account from the database. To verify your identity, a verification email will be sent to your Gmail/Email.',
                    te: 'ఇది మీ అన్ని ప్లాట్లు, పంట చరిత్ర, నేల వివరాలు మరియు ఖాతాను డేటాబేస్ నుండి శాశ్వతంగా తొలగిస్తుంది. మీ గుర్తింపును ధృవీకరించడానికి మీ ఈమెయిల్‌కు ధృవీకరణ మెయిల్ పంపబడుతుంది.',
                  })}
                </div>

                {deleteError && (
                  <p className="err" style={{ marginBottom: '14px', color: '#dc2626', fontSize: '13.5px' }}>
                    {L(deleteError)}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleteBusy}
                  >
                    <span>{L({ en: 'Cancel', te: 'రద్దు' })}</span>
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleSendDeletionEmail}
                    disabled={deleteBusy}
                    style={{ background: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
                  >
                    <span>
                      {L(deleteBusy
                        ? { en: 'Sending verification...', te: 'పంపబడుతోంది...' }
                        : { en: 'Send Verification Email', te: 'ధృవీకరణ ఈమెయిల్ పంపండి' })}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmDeleteAccount}>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(46, 125, 50, 0.08)',
                    border: '1px solid rgba(46, 125, 50, 0.25)',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: 'var(--ink)',
                  }}
                >
                  ✉️ {L({
                    en: 'Verification mail has been dispatched to your email inbox and spam folder.',
                    te: 'మీ ఇన్‌బాక్స్ మరియు స్పామ్ ఫోల్డర్‌కు ధృవీకరణ మెయిల్ పంపబడింది.',
                  })}
                  {deleteCooldown > 0 && (
                    <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--ink-3)' }}>
                      {L({ en: `Resend available in ${deleteCooldown}s`, te: `${deleteCooldown} సెకన్లలో మళ్లీ పంపవచ్చు` })}
                    </span>
                  )}
                </div>

                {user?.authProvider !== 'google.com' && (
                  <div className="fld" style={{ marginBottom: '12px' }}>
                    <label htmlFor="del-pw">{L({ en: 'Your Password *', te: 'మీ పాస్‌వర్డ్ *' })}</label>
                    <div className="inp">
                      <input
                        id="del-pw"
                        type="password"
                        placeholder="Current password"
                        value={deletePassword}
                        onChange={(e) => {
                          setDeletePassword(e.target.value);
                          setDeleteError(null);
                        }}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="fld" style={{ marginBottom: '16px' }}>
                  <label htmlFor="del-confirm">
                    {L({
                      en: 'Type DELETE to confirm *',
                      te: 'నిర్ధారించడానికి DELETE అని టైప్ చేయండి *',
                    })}
                  </label>
                  <div className="inp">
                    <input
                      id="del-confirm"
                      type="text"
                      placeholder="DELETE"
                      value={deleteConfirmText}
                      onChange={(e) => {
                        setDeleteConfirmText(e.target.value);
                        setDeleteError(null);
                      }}
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                {deleteError && (
                  <p className="err" style={{ marginBottom: '14px', color: '#dc2626', fontSize: '13.5px' }}>
                    {L(deleteError)}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleteBusy}
                  >
                    <span>{L({ en: 'Cancel', te: 'రద్దు' })}</span>
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={deleteBusy || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                    style={{
                      background: '#dc2626',
                      borderColor: '#dc2626',
                      color: '#ffffff',
                      opacity: deleteConfirmText.trim().toUpperCase() !== 'DELETE' ? 0.6 : 1,
                    }}
                  >
                    <span>
                      {L(deleteBusy
                        ? { en: 'Deleting everything...', te: 'తొలగిస్తోంది...' }
                        : { en: 'Permanently Delete Account', te: 'శాశ్వతంగా ఖాతా తొలగించు' })}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
