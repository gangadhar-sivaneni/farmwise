import React, { useState, useEffect } from 'react';
import BrandMark from '../components/common/BrandMark';
import Icon from '../components/common/Icon';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { navigate } from '../utils/navigation';

const BAD = { en: 'Invalid email or password', te: 'ఈమెయిల్ లేదా పాస్‌వర్డ్ తప్పుగా ఉంది' };

export default function LoginPage({ initialMode = 'signin' }) {
  const { t, L, showToast, W } = useLanguage();
  const { login, register } = useAuth();

  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = mode === 'signup' ? 'FarmWise — Create Account' : 'FarmWise — Sign In';
    return () => {
      document.title = prev;
    };
  }, [mode]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const normEmail = email.trim();
    if (!normEmail || !password) {
      setError({
        en: 'Please enter both email and password.',
        te: 'దయచేసి ఈమెయిల్ మరియు పాస్‌వర్డ్ రెండూ నమోదు చేయండి.',
      });
      return;
    }

    setBusy(true);
    const ok = await login(normEmail, password);
    setBusy(false);

    if (!ok) {
      setError(BAD);
      return;
    }

    navigate('/app/overview', { replace: true });
    showToast(W.welcome);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const trimName = name.trim();
    const normEmail = email.trim().toLowerCase();

    if (!trimName) {
      setError({ en: 'Please enter your full name.', te: 'దయచేసి మీ పూర్తి పేరు నమోదు చేయండి.' });
      return;
    }
    if (!normEmail || !normEmail.includes('@')) {
      setError({
        en: 'Please enter a valid Gmail / Email address.',
        te: 'సరైన ఈమెయిల్ లేదా జిమెయిల్ చిరునామా ఇవ్వండి.',
      });
      return;
    }
    if (!password || password.length < 6) {
      setError({
        en: 'Password must be at least 6 characters long.',
        te: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.',
      });
      return;
    }
    if (password !== confirmPassword) {
      setError({
        en: 'Passwords do not match. Please re-enter.',
        te: 'పాస్‌వర్డ్‌లు సరిపోలలేదు. దయచేసి మళ్లీ సరిచూడండి.',
      });
      return;
    }

    setBusy(true);
    const res = await register({
      name: trimName,
      email: normEmail,
      password,
      phone: phone.trim(),
      district: district.trim(),
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    navigate('/app/overview', { replace: true });
    showToast(W.welcome);
  };


  return (
    <div className="screen on" id="s-login">
      <div className="login">
        <div className="panel login-l">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
            <a href="/" className="logo">
              <BrandMark />
              <span>
                <b>FarmWise</b>
                <small>{t('brand.sub', 'Smart Farming Platform')}</small>
              </span>
            </a>
            <LanguageSwitcher />
          </div>

          <div className="login-form" id="loginFormContainer" style={{ maxWidth: '440px', margin: 'auto 0' }}>
            {/* Tab switch between Sign In and Sign Up */}
            <div className="auth-tabs" style={{
              display: 'flex',
              background: 'var(--soft, #f3f3f1)',
              borderRadius: '999px',
              padding: '4px',
              marginBottom: '24px',
              border: '1px solid var(--line-2, #d2d2ce)'
            }}>
              <button
                type="button"
                className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  borderRadius: '999px',
                  border: 'none',
                  fontSize: '14.5px',
                  fontWeight: mode === 'signin' ? 600 : 500,
                  background: mode === 'signin' ? 'var(--card, #fff)' : 'transparent',
                  color: mode === 'signin' ? 'var(--ink, #111)' : 'var(--ink-2, #4f534b)',
                  cursor: 'pointer',
                  boxShadow: mode === 'signin' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => switchMode('signin')}
              >
                {L({ en: 'Login', te: 'లాగిన్' })}
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  borderRadius: '999px',
                  border: 'none',
                  fontSize: '14.5px',
                  fontWeight: mode === 'signup' ? 600 : 500,
                  background: mode === 'signup' ? 'var(--card, #fff)' : 'transparent',
                  color: mode === 'signup' ? 'var(--ink, #111)' : 'var(--ink-2, #4f534b)',
                  cursor: 'pointer',
                  boxShadow: mode === 'signup' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => switchMode('signup')}
              >
                {L({ en: 'Create Account', te: 'ఖాతా సృష్టించండి' })}
              </button>
            </div>

            {mode === 'signin' ? (
              <form noValidate onSubmit={handleSignIn}>
                <h1 style={{ marginTop: '0', fontSize: '32px' }}>
                  {L({ en: 'Welcome back, farmer.', te: 'స్వాగతం, రైతు మిత్రమా.' })}
                </h1>
                <p className="sub" style={{ margin: '8px 0 24px' }}>
                  {L({
                    en: 'Sign in with your email (Gmail) and password to manage your farm.',
                    te: 'మీ వ్యవసాయాన్ని నిర్వహించడానికి మీ ఈమెయిల్ మరియు పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి.',
                  })}
                </p>

                <div className="fld">
                  <label htmlFor="signin-email">{L({ en: 'Email / Gmail', te: 'ఈమెయిల్ / జిమెయిల్' })}</label>
                  <div className="inp">
                    <input
                      id="signin-email"
                      type="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="farmer@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                </div>

                <div className="fld">
                  <label htmlFor="signin-password">{L({ en: 'Password', te: 'పాస్‌వర్డ్' })}</label>
                  <div className="inp">
                    <input
                      id="signin-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost sm pw-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-pressed={showPw}
                      aria-controls="signin-password"
                    >
                      <Icon name="eye" className="ico sm" />
                      <span>{L(showPw ? { en: 'Hide', te: 'దాచు' } : { en: 'Show', te: 'చూపు' })}</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="err" role="alert" style={{ marginBottom: '14px', color: '#dc2626', fontSize: '13.5px' }}>
                    {L(error)}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn-dark"
                  style={{ width: '100%', minHeight: '48px', marginTop: '8px', fontSize: '15.5px' }}
                  disabled={busy}
                >
                  <span>{L(busy ? { en: 'Logging in...', te: 'లాగిన్ అవుతోంది...' } : { en: 'Login', te: 'లాగిన్ అవ్వండి' })}</span>
                  <Icon name="arrow" className="ico sm" />
                </button>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--ink-2)' }}>
                  <span>{L({ en: "Don't have an account? ", te: 'ఇంకా ఖాతా లేదా? ' })}</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--brand, #2e7d32)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                    onClick={() => switchMode('signup')}
                  >
                    {L({ en: 'Create Account', te: 'ఖాతా సృష్టించండి' })}
                  </button>
                </div>
              </form>
            ) : (
              <form noValidate onSubmit={handleSignUp}>
                <h1 style={{ marginTop: '0', fontSize: '32px' }}>
                  {L({ en: 'Create your account.', te: 'మీ ఖాతాను ప్రారంభించండి.' })}
                </h1>
                <p className="sub" style={{ margin: '8px 0 24px' }}>
                  {L({
                    en: 'Register with your name, Gmail and farm details. Your data is strictly saved to your account.',
                    te: 'మీ పేరు, జిమెయిల్ మరియు వివరాలతో నమోదు చేసుకోండి. మీ డేటా మీ ఖాతాలో భద్రంగా ఉంటుంది.',
                  })}
                </p>

                <div className="login-fields-scroll">
                <div className="fld">
                  <label htmlFor="signup-name">{L({ en: 'Full Name *', te: 'పూర్తి పేరు *' })}</label>
                  <div className="inp">
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Gangadhar Sivaneni"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                </div>

                <div className="fld">
                  <label htmlFor="signup-email">{L({ en: 'Email / Gmail *', te: 'ఈమెయిల్ / జిమెయిల్ *' })}</label>
                  <div className="inp">
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="farmer@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="fld">
                    <label htmlFor="signup-phone">{L({ en: 'Phone Number', te: 'ఫోన్ నంబర్' })}</label>
                    <div className="inp">
                      <input
                        id="signup-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fld">
                    <label htmlFor="signup-district">{L({ en: 'District', te: 'జిల్లా' })}</label>
                    <div className="inp">
                      <input
                        id="signup-district"
                        type="text"
                        placeholder="e.g. Warangal"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="fld">
                  <label htmlFor="signup-password">{L({ en: 'Create Password *', te: 'పాస్‌వర్డ్ రూపొందించండి *' })}</label>
                  <div className="inp">
                    <input
                      id="signup-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost sm pw-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-pressed={showPw}
                      aria-controls="signup-password"
                    >
                      <Icon name="eye" className="ico sm" />
                    </button>
                  </div>
                </div>

                <div className="fld">
                  <label htmlFor="signup-confirmpassword">{L({ en: 'Confirm Password *', te: 'పాస్‌వర్డ్ ధృవీకరించండి *' })}</label>
                  <div className="inp">
                    <input
                      id="signup-confirmpassword"
                      type={showConfirmPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost sm pw-toggle"
                      onClick={() => setShowConfirmPw((v) => !v)}
                      aria-pressed={showConfirmPw}
                      aria-controls="signup-confirmpassword"
                    >
                      <Icon name="eye" className="ico sm" />
                    </button>
                  </div>
                </div>
                </div>

                {error && (
                  <p className="err" role="alert" style={{ marginBottom: '14px', color: '#dc2626', fontSize: '13.5px' }}>
                    {L(error)}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn-dark"
                  style={{ width: '100%', minHeight: '48px', marginTop: '8px', fontSize: '15.5px' }}
                  disabled={busy}
                >
                  <span>{L(busy ? { en: 'Creating Account...', te: 'ఖాతా సృష్టించబడుతోంది...' } : { en: 'Create Account & Continue', te: 'ఖాతా సృష్టించి కొనసాగించండి' })}</span>
                  <Icon name="arrow" className="ico sm" />
                </button>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--ink-2)' }}>
                  <span>{L({ en: 'Already have an account? ', te: 'ఇప్పటికే ఖాతా ఉందా? ' })}</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--brand, #2e7d32)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                    onClick={() => switchMode('signin')}
                  >
                    {L({ en: 'Login', te: 'లాగిన్ అవ్వండి' })}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="login-r">
          <img
            src="https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&w=1400&q=72"
            alt="A farmer working in a green paddy field"
          />
          <div className="chip">
            <span className="name">
              <img
                src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=80&h=80&q=60"
                alt=""
              />
              <span>{t('art.paddy', 'Paddy Field')}</span>
            </span>
            <span className="row">
              <span className="ins">
                <span>{t('art.ai', 'AI Insight')}</span>
                <span style={{ color: 'var(--ink)', fontSize: '14px' }}>
                  {t('art.ins2', 'Rain on Sunday — hold urea')}
                </span>
              </span>
            </span>
          </div>
          <p className="q">
            {t('lg.quote', 'Every acre, planned with care — in your own language.')}
          </p>
        </div>
      </div>
    </div>
  );
}
