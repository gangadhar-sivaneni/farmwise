import React, { useState } from 'react';
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

/** Farmer's personal details — saved per account (farmwise_user_<id>_profile). */
export default function ProfilePage() {
  const { L, showToast } = useLanguage();
  const { profile, saveProfile } = useApp();
  const { user, resendVerificationEmail, checkEmailVerified, changePassword } = useAuth();
  
  const [f, setF] = useState(() => ({
    name: user?.name || '', phone: user?.phone || '', village: '', mandal: '', district: user?.district || '', state: user?.state || 'Telangana', pin: '',
    landAcres: '', experience: '', crops: [], irrigation: 'borewell', soil: 'loamy', farmerId: '',
    ...profile,
  }));
  const [errors, setErrors] = useState({});

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
  React.useEffect(() => {
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
      setPwError({ en: 'Password must be at least 6 characters.', te: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.' });
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

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    for (const k of ['name', 'village', 'district', 'state']) if (!String(f[k]).trim()) err[k] = REQ;
    const phone = f.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phone)) err.phone = { en: 'Enter a 10-digit Indian mobile number.', te: '10 అంకెల మొబైల్ నంబర్ ఇవ్వండి.' };
    if (f.pin && !/^[1-9]\d{5}$/.test(f.pin.trim())) err.pin = { en: 'PIN code has 6 digits.', te: 'పిన్ కోడ్ 6 అంకెలు.' };
    if (!(Number(f.landAcres) > 0)) err.landAcres = { en: 'Enter your total land in acres.', te: 'మొత్తం భూమి ఎకరాల్లో ఇవ్వండి.' };
    if (f.experience !== '' && !(Number(f.experience) >= 0 && Number(f.experience) <= 80)) err.experience = { en: 'Enter years between 0 and 80.', te: '0–80 మధ్య సంవత్సరాలు ఇవ్వండి.' };
    if (!f.crops.length) err.crops = { en: 'Pick at least one crop you grow.', te: 'మీరు పండించే కనీసం ఒక పంట ఎంచుకోండి.' };
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
    fld(k, label, <div className="inp"><input id={`pr-${k}`} value={f[k]} onChange={set(k)} required={required} {...props} /></div>, required);

  return (
    <section className="panel page" data-page="profile" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{L({ en: 'Your farmer profile', te: 'మీ రైతు ప్రొఫైల్' })}</h1>
          <p>{L({ en: 'Fields marked * are required. Saved only for your account, in this browser.', te: '* గుర్తు ఉన్నవి తప్పనిసరి. మీ ఖాతాకు మాత్రమే, ఈ బ్రౌజర్‌లో సేవ్ అవుతుంది.' })}</p>
        </div>
        {profile?.updatedAt && (
          <span className="pill ok"><i /><span>{L({ en: 'Saved', te: 'సేవ్ అయింది' })} · {new Date(profile.updatedAt).toLocaleDateString()}</span></span>
        )}
      </div>

      <form className="prof" onSubmit={submit} noValidate>
        <div className="card">
          <div className="card-h"><h3>{L({ en: 'Personal details', te: 'వ్యక్తిగత వివరాలు' })}</h3></div>
          <div className="pm-grid">
            {text('name', { en: 'Full name', te: 'పూర్తి పేరు' }, { required: true, autoComplete: 'name' })}
            {fld('phone', { en: 'Mobile number', te: 'మొబైల్ నంబర్' },
              <div className="inp"><span className="pre">+91</span><input id="pr-phone" type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={f.phone} onChange={(e) => { setF((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })); setErrors((s) => ({ ...s, phone: null })); }} /></div>, true)}
            {text('farmerId', { en: 'Farmer ID / Pattadar passbook no. (optional)', te: 'రైతు ID / పట్టాదారు పాస్‌బుక్ నం. (ఐచ్ఛికం)' })}
            {text('experience', { en: 'Years of farming (optional)', te: 'వ్యవసాయ అనుభవం (సంవత్సరాలు, ఐచ్ఛికం)' }, { inputMode: 'numeric' })}
          </div>
        </div>

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

        <div className="card">
          <div className="card-h"><h3>{L({ en: 'Farming details', te: 'వ్యవసాయ వివరాలు' })}</h3></div>
          <div className="pm-grid">
            {fld('landAcres', { en: 'Total land', te: 'మొత్తం భూమి' },
              <div className="inp"><input id="pr-landAcres" inputMode="decimal" value={f.landAcres} onChange={set('landAcres')} /><span className="suf">{L({ en: 'acres', te: 'ఎకరాలు' })}</span></div>, true)}
            {fld('irrigation', { en: 'Main water source', te: 'ప్రధాన నీటి వనరు' },
              <select id="pr-irrigation" className="select" value={f.irrigation} onChange={set('irrigation')}>
                {Object.entries(IRRIGATION).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
              </select>)}
            {fld('soil', { en: 'Main soil type', te: 'ప్రధాన నేల రకం' },
              <select id="pr-soil" className="select" value={f.soil} onChange={set('soil')}>
                {Object.entries(LBL.soil).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
              </select>)}
          </div>
          <div className="fld">
            <label id="pr-crops-l">{L({ en: 'Crops you grow', te: 'మీరు పండించే పంటలు' })}<span className="req" aria-hidden="true"> *</span></label>
            <div className="prof-crops" role="group" aria-labelledby="pr-crops-l">
              {CROPS.map((c) => (
                <button key={c.id} type="button" className="chip-f" aria-pressed={f.crops.includes(c.id)} onClick={() => { toggleCrop(c.id); setErrors((s) => ({ ...s, crops: null })); }}>
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
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
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

        <div className="prof-foot">
          <button type="submit" className="btn btn-orange">
            <Icon name="save" className="ico" />
            <span>{L({ en: 'Save profile', te: 'ప్రొఫైల్ సేవ్ చేయండి' })}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
