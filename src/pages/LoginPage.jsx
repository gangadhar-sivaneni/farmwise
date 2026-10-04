import React, { useState, useEffect } from 'react';
import BrandMark from '../components/common/BrandMark';
import Icon from '../components/common/Icon';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { navigate } from '../utils/navigation';

function maskEmail(str) {
  if (!str || !str.includes('@')) return str || '';
  const [user, domain] = str.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${'*'.repeat(Math.min(user.length - 2, 5))}@${domain}`;
}

export default function LoginPage({ initialMode = 'signin' }) {
  const { t, L, showToast, W } = useLanguage();
  const {
    login,
    loginWithGoogle,
    register,
    resendVerificationEmail,
    checkEmailVerified,
    sendPasswordReset,
    handleVerifyEmailCode,
    completePasswordReset,
  } = useAuth();

  // 'signin' | 'signup' | 'forgot-password' | 'verify-pending' | 'reset-password' | 'verify-success'
  const [mode, setMode] = useState(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Password reset fields
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Verification Pending cooldown
  const [cooldown, setCooldown] = useState(0);
  const [pendingEmail, setPendingEmail] = useState('');

  // Status
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Sync mode with prop change
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // Handle URL query parameters (Firebase email verification / password reset links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const oobCode = params.get('oobCode');

    if (modeParam === 'verifyEmail' && oobCode) {
      setBusy(true);
      handleVerifyEmailCode(oobCode).then((res) => {
        setBusy(false);
        if (res.ok) {
          setMode('verify-success');
        } else {
          setError(res.error);
        }
      });
    } else if (modeParam === 'resetPassword' && oobCode) {
      setResetCode(oobCode);
      setMode('reset-password');
    } else if (params.get('verified') === 'true') {
      setMode('verify-success');
    }
  }, [handleVerifyEmailCode]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Document title
  useEffect(() => {
    const prev = document.title;
    if (mode === 'signup') document.title = 'FarmWise — Create Account';
    else if (mode === 'forgot-password') document.title = 'FarmWise — Reset Password';
    else if (mode === 'verify-pending') document.title = 'FarmWise — Verify Email';
    else if (mode === 'reset-password') document.title = 'FarmWise — Set New Password';
    else document.title = 'FarmWise — Login';

    return () => {
      document.title = prev;
    };
  }, [mode]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setForgotSent(false);
  };

  /* =========================================================
     1. SIGN IN (Email / Password)
     ========================================================= */
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (busy || googleBusy) return;
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
    const res = await login(normEmail, password, rememberMe);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    // Check email verification status
    if (res.emailVerified === false) {
      setPendingEmail(normEmail);
      setMode('verify-pending');
      setCooldown(60);
      return;
    }

    navigate('/app/overview', { replace: true });
    showToast(W.welcome);
  };

  /* =========================================================
     2. GOOGLE AUTHENTICATION (Login & Sign Up)
     ========================================================= */
  const handleGoogleAuth = async () => {
    if (busy || googleBusy) return;
    setError(null);
    setGoogleBusy(true);

    const res = await loginWithGoogle();
    setGoogleBusy(false);

    if (res.cancelled) return; // user closed popup

    if (!res.ok) {
      setError(res.error);
      return;
    }

    // Google accounts come verified
    navigate('/app/overview', { replace: true });
    showToast(W.welcome);
  };

  /* =========================================================
     3. SIGN UP (Registration)
     ========================================================= */
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (busy || googleBusy) return;
    setError(null);

    const trimName = name.trim();
    const normEmail = email.trim().toLowerCase();
    const trimPhone = phone.trim();
    const trimDistrict = district.trim();

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
    if (!trimPhone) {
      setError({
        en: 'Please enter your phone number.',
        te: 'దయచేసి మీ ఫోన్ నంబర్ నమోదు చేయండి.',
      });
      return;
    }
    if (!trimDistrict) {
      setError({
        en: 'Please enter your district.',
        te: 'దయచేసి మీ జిల్లా నమోదు చేయండి.',
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
    if (!acceptTerms) {
      setError({
        en: 'Please accept the Terms & Conditions to create an account.',
        te: 'ఖాతాను సృష్టించడానికి దయచేసి నిబంధనలు & షరతులను అంగీకరించండి.',
      });
      return;
    }

    setBusy(true);
    const res = await register({
      name: trimName,
      email: normEmail,
      password,
      phone: trimPhone,
      district: trimDistrict,
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    // Direct to dedicated email verification screen
    setPendingEmail(normEmail);
    setMode('verify-pending');
    setCooldown(60);
  };

  /* =========================================================
     4. RESEND VERIFICATION EMAIL
     ========================================================= */
  const handleResendVerification = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    const res = await resendVerificationEmail();
    setBusy(false);
    if (res.ok) {
      setCooldown(60);
      showToast({
        en: 'Verification link resent. Please check your inbox and spam folder.',
        te: 'ధృవీకరణ లింక్ మళ్లీ పంపబడింది. దయచేసి ఇన్‌బాక్స్ చూడండి.',
      });
    } else {
      setError(res.error);
    }
  };

  /* =========================================================
     5. CHECK VERIFICATION STATUS
     ========================================================= */
  const handleCheckVerification = async () => {
    setBusy(true);
    const isVerified = await checkEmailVerified();
    setBusy(false);

    if (isVerified) {
      setMode('verify-success');
      showToast({
        en: 'Email verified successfully! Welcome to FarmWise.',
        te: 'ఈమెయిల్ విజయవంతంగా ధృవీకరించబడింది!',
      });
    } else {
      showToast({
        en: 'Email not verified yet. Please click the link sent to your email.',
        te: 'ఈమెయిల్ ఇంకా ధృవీకరించబడలేదు. దయచేసి మీ ఈమెయిల్‌లోని లింక్‌ను క్లిక్ చేయండి.',
      });
    }
  };

  /* =========================================================
     6. FORGOT PASSWORD
     ========================================================= */
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const normEmail = email.trim();
    if (!normEmail || !normEmail.includes('@')) {
      setError({
        en: 'Please enter a valid Gmail / Email address.',
        te: 'సరైన ఈమెయిల్ లేదా జిమెయిల్ చిరునామా ఇవ్వండి.',
      });
      return;
    }

    setBusy(true);
    const res = await sendPasswordReset(normEmail);
    setBusy(false);

    if (res.ok) {
      setForgotSent(true);
    } else {
      setError(res.error);
    }
  };

  /* =========================================================
     7. RESET PASSWORD (using oobCode)
     ========================================================= */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (!newPassword || newPassword.length < 6) {
      setError({
        en: 'Password must be at least 6 characters long.',
        te: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.',
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError({
        en: 'Passwords do not match. Please re-enter.',
        te: 'పాస్‌వర్డ్‌లు సరిపోలలేదు. దయచేసి మళ్లీ సరిచూడండి.',
      });
      return;
    }

    setBusy(true);
    const res = await completePasswordReset(resetCode, newPassword);
    setBusy(false);

    if (res.ok) {
      setResetSuccess(true);
    } else {
      setError(res.error);
    }
  };

  const allSignUpFieldsFilled = Boolean(
    name.trim() &&
    email.trim() &&
    phone.trim() &&
    district.trim() &&
    password &&
    confirmPassword
  );
  const canSignUp = allSignUpFieldsFilled && acceptTerms;

  return (
    <div className="screen on" id="s-login">
      <div className="login">
        <div className="panel login-l">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
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

            {/* TAB TOGGLE: Shown for signin / signup */}
            {(mode === 'signin' || mode === 'signup') && (
              <div
                className="auth-tabs"
                style={{
                  display: 'flex',
                  background: 'var(--soft, #f3f3f1)',
                  borderRadius: '999px',
                  padding: '4px',
                  marginBottom: '20px',
                  border: '1px solid var(--line-2, #d2d2ce)',
                }}
              >
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
            )}

            {/* =========================================================
                MODE: SIGN IN
               ========================================================= */}
            {mode === 'signin' && (
              <form noValidate onSubmit={handleSignIn}>
                <h1 style={{ marginTop: '0', fontSize: '32px' }}>
                  {L({ en: 'Welcome back, farmer.', te: 'స్వాగతం, రైతు మిత్రమా.' })}
                </h1>
                <p className="sub" style={{ margin: '6px 0 20px' }}>
                  {L({
                    en: 'Sign in to access your farm overview, soil insights, and plot map.',
                    te: 'మీ వ్యవసాయ వివరాలు మరియు పొలాల మ్యాప్ చూడటానికి లాగిన్ అవ్వండి.',
                  })}
                </p>

                {/* Google Sign-in Button */}
                <GoogleAuthButton
                  onClick={handleGoogleAuth}
                  loading={googleBusy}
                  disabled={busy}
                />

                <div className="or" style={{ margin: '18px 0' }}>
                  <span>{L({ en: 'or with email', te: 'లేదా ఈమెయిల్‌తో' })}</span>
                </div>

                <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                  <label htmlFor="signin-email">{L({ en: 'Email / Gmail', te: 'ఈమెయిల్ / జిమెయిల్' })}</label>
                  <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
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
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                  <label htmlFor="signin-password">{L({ en: 'Password', te: 'పాస్‌వర్డ్' })}</label>
                  <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <input
                      id="signin-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost sm pw-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-pressed={showPw}
                      aria-controls="signin-password"
                      title={showPw ? 'Hide password' : 'Show password'}
                    >
                      <Icon name="eye" className="ico sm" />
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '14px' }}>
                  <label htmlFor="remember-me" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--ink-2)' }}>
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: 'var(--brand, #2e7d32)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span>{L({ en: 'Remember me', te: 'నన్ను గుర్తుంచుకో' })}</span>
                  </label>

                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand, #2e7d32)',
                      fontSize: '13.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onClick={() => switchMode('forgot-password')}
                  >
                    {L({ en: 'Forgot password?', te: 'పాస్‌వర్డ్ మర్చిపోయారా?' })}
                  </button>
                </div>

                {error && (
                  <p className="err" role="alert" style={{ marginBottom: '14px', color: '#dc2626', fontSize: '13.5px' }}>
                    {L(error)}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn-dark"
                  style={{ width: '100%', minHeight: '48px', marginTop: '4px', fontSize: '15.5px' }}
                  disabled={busy || googleBusy}
                >
                  <span>{L(busy ? { en: 'Logging in...', te: 'లాగిన్ అవుతోంది...' } : { en: 'Login', te: 'లాగిన్ అవ్వండి' })}</span>
                  <Icon name="arrow" className="ico sm" />
                </button>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--ink-2)' }}>
                  <span>{L({ en: 'Don’t have an account? ', te: 'ఖాతా లేదా? ' })}</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--brand, #2e7d32)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                    onClick={() => switchMode('signup')}
                  >
                    {L({ en: 'Create Account', te: 'ఖాతా సృష్టించండి' })}
                  </button>
                </div>
              </form>
            )}

            {/* =========================================================
                MODE: SIGN UP (Registration)
               ========================================================= */}
            {mode === 'signup' && (
              <form noValidate onSubmit={handleSignUp}>
                <h1 style={{ marginTop: '0', fontSize: '32px' }}>
                  {L({ en: 'Create your account.', te: 'మీ ఖాతాను ప్రారంభించండి.' })}
                </h1>
                <p className="sub" style={{ margin: '6px 0 16px' }}>
                  {L({
                    en: 'Register to manage your plots, soil advisory, and APMC market prices.',
                    te: 'మీ వ్యవసాయాన్ని నిర్వహించడానికి వివరాలతో నమోదు చేసుకోండి.',
                  })}
                </p>

                {/* Google Sign-up Option */}
                <GoogleAuthButton
                  onClick={handleGoogleAuth}
                  loading={googleBusy}
                  disabled={busy}
                  text={L({ en: 'Sign up with Google', te: 'గూగుల్‌తో నమోదు చేసుకోండి' })}
                />

                <div className="or" style={{ margin: '14px 0 12px' }}>
                  <span>{L({ en: 'or register with email', te: 'లేదా ఈమెయిల్‌తో నమోదు' })}</span>
                </div>

                <div className="login-fields-scroll" style={{ width: '100%', boxSizing: 'border-box' }}>
                  <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <label htmlFor="signup-name">{L({ en: 'Full Name *', te: 'పూర్తి పేరు *' })}</label>
                    <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
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
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <label htmlFor="signup-email">{L({ en: 'Email / Gmail *', te: 'ఈమెయిల్ / జిమెయిల్ *' })}</label>
                    <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
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
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                    <div className="fld" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                      <label htmlFor="signup-phone">{L({ en: 'Phone Number *', te: 'ఫోన్ నంబర్ *' })}</label>
                      <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
                        <input
                          id="signup-phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            setError(null);
                          }}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div className="fld" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                      <label htmlFor="signup-district">{L({ en: 'District *', te: 'జిల్లా *' })}</label>
                      <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
                        <input
                          id="signup-district"
                          type="text"
                          placeholder="e.g. Warangal"
                          value={district}
                          onChange={(e) => {
                            setDistrict(e.target.value);
                            setError(null);
                          }}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <label htmlFor="signup-password">{L({ en: 'Create Password *', te: 'పాస్‌వర్డ్ రూపొందించండి *' })}</label>
                    <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
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
                        style={{ width: '100%', boxSizing: 'border-box' }}
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

                  <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <label htmlFor="signup-confirmpassword">{L({ en: 'Confirm Password *', te: 'పాస్‌వర్డ్ ధృవీకరించండి *' })}</label>
                    <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
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
                        style={{ width: '100%', boxSizing: 'border-box' }}
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

                <div style={{ marginTop: '10px', marginBottom: '6px', width: '100%', boxSizing: 'border-box' }}>
                  <label
                    htmlFor="signup-terms"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: '13px',
                      color: 'var(--ink-2)',
                      lineHeight: '1.4',
                    }}
                  >
                    <input
                      id="signup-terms"
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        setError(null);
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--brand, #2e7d32)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <span>
                      {L({
                        en: 'I accept the Terms & Conditions and Privacy Policy *',
                        te: 'నేను నిబంధనలు & షరతులు మరియు గోప్యతా విధానాన్ని అంగీకరిస్తున్నాను *',
                      })}
                    </span>
                  </label>
                </div>

                {error && (
                  <p className="err" role="alert" style={{ marginBottom: '14px', color: '#dc2626', fontSize: '13.5px' }}>
                    {L(error)}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn-dark"
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    marginTop: '8px',
                    fontSize: '15.5px',
                    opacity: canSignUp && !busy ? 1 : 0.55,
                    cursor: canSignUp && !busy ? 'pointer' : 'not-allowed',
                    transition: 'opacity 0.2s, transform 0.1s',
                  }}
                  disabled={!canSignUp || busy || googleBusy}
                >
                  <span>{L(busy ? { en: 'Creating Account...', te: 'ఖాతా సృష్టించబడుతోంది...' } : { en: 'Create Account & Continue', te: 'ఖాతా సృష్టించి కొనసాగించండి' })}</span>
                  <Icon name="arrow" className="ico sm" />
                </button>

                <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '14px', color: 'var(--ink-2)' }}>
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

            {/* =========================================================
                MODE: FORGOT PASSWORD
               ========================================================= */}
            {mode === 'forgot-password' && (
              <div>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--ink-2)',
                    fontSize: '13.5px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: '16px',
                  }}
                >
                  <Icon name="chevron-left" className="ico sm" />
                  <span>{L({ en: 'Back to Login', te: 'లాగిన్‌కు తిరిగి వెళ్లండి' })}</span>
                </button>

                <h1 style={{ marginTop: '0', fontSize: '30px' }}>
                  {L({ en: 'Reset your password', te: 'పాస్‌వర్డ్ రీసెట్ చేయండి' })}
                </h1>

                {forgotSent ? (
                  <div style={{ marginTop: '16px' }}>
                    <div
                      style={{
                        padding: '16px',
                        background: 'rgba(46, 125, 50, 0.08)',
                        border: '1px solid rgba(46, 125, 50, 0.25)',
                        borderRadius: '12px',
                        marginBottom: '20px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink)', lineHeight: '1.5' }}>
                        {L({
                          en: 'If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.',
                          te: 'ఈ ఈమెయిల్‌తో ఖాతా ఉంటే, పాస్‌వర్డ్ రీసెట్ లింక్ పంపబడింది. దయచేసి మీ ఇన్‌బాక్స్ మరియు స్పామ్ ఫోల్డర్‌ను తనిఖీ చేయండి.',
                        })}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-dark"
                      style={{ width: '100%', minHeight: '46px' }}
                      onClick={() => switchMode('signin')}
                    >
                      <span>{L({ en: 'Return to Login', te: 'లాగిన్‌కు తిరిగి వెళ్లండి' })}</span>
                    </button>
                  </div>
                ) : (
                  <form noValidate onSubmit={handleForgotPassword}>
                    <p className="sub" style={{ margin: '6px 0 20px', fontSize: '14px' }}>
                      {L({
                        en: 'Enter your registered email address and we will send you a secure link to reset your password.',
                        te: 'మీ నమోదిత ఈమెయిల్ ఇవ్వండి, పాస్‌వర్డ్ రీసెట్ చేయడానికి మేము లింక్ పంపుతాము.',
                      })}
                    </p>

                    <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                      <label htmlFor="forgot-email">{L({ en: 'Email / Gmail', te: 'ఈమెయిల్ / జిమెయిల్' })}</label>
                      <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
                        <input
                          id="forgot-email"
                          type="email"
                          autoComplete="email"
                          placeholder="farmer@gmail.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                          }}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
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
                      style={{ width: '100%', minHeight: '48px', marginTop: '10px', fontSize: '15.5px' }}
                      disabled={busy}
                    >
                      <span>{L(busy ? { en: 'Sending link...', te: 'పంపబడుతోంది...' } : { en: 'Send Reset Link', te: 'రీసెట్ లింక్ పంపండి' })}</span>
                      <Icon name="arrow" className="ico sm" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* =========================================================
                MODE: VERIFICATION PENDING
               ========================================================= */}
            {mode === 'verify-pending' && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(46, 125, 50, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'var(--brand, #2e7d32)',
                  }}
                >
                  <Icon name="file" className="ico md" />
                </div>

                <h1 style={{ marginTop: '0', fontSize: '28px', marginBottom: '8px' }}>
                  {L({ en: 'Verify your email address', te: 'మీ ఈమెయిల్‌ను ధృవీకరించండి' })}
                </h1>

                <div
                  style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    background: 'var(--soft, #f3f3f1)',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--ink)',
                    marginBottom: '16px',
                    fontFamily: 'monospace',
                  }}
                >
                  {maskEmail(pendingEmail || email)}
                </div>

                <p style={{ fontSize: '14.5px', color: 'var(--ink-2)', lineHeight: '1.5', margin: '0 0 20px' }}>
                  {L({
                    en: 'Your FarmWise account has been created. Please verify your email address using the link we sent to your inbox before continuing. Please check your inbox and spam folder.',
                    te: 'మీ ఖాతా సృష్టించబడింది. కొనసాగడానికి ముందు మీ ఇన్‌బాక్స్‌కు పంపిన లింక్‌ను క్లిక్ చేసి ఈమెయిల్‌ను ధృవీకరించండి. దయచేసి స్పామ్ ఫోల్డర్‌ను కూడా తనిఖీ చేయండి.',
                  })}
                </p>

                {error && (
                  <p className="err" role="alert" style={{ marginBottom: '14px', color: '#dc2626', fontSize: '13.5px' }}>
                    {L(error)}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-dark"
                    style={{ width: '100%', minHeight: '48px', fontSize: '15px' }}
                    onClick={handleCheckVerification}
                    disabled={busy}
                  >
                    <span>{L(busy ? { en: 'Checking status...', te: 'తనిఖీ చేస్తోంది...' } : { en: 'I’ve Verified My Email (Check Status)', te: 'నేను ధృవీకరించాను (స్థితి చూడండి)' })}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      border: '1px solid var(--line-2)',
                      fontSize: '14px',
                      opacity: cooldown > 0 ? 0.6 : 1,
                      cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleResendVerification}
                    disabled={cooldown > 0 || busy}
                  >
                    <span>
                      {cooldown > 0
                        ? L({ en: `Resend in ${cooldown}s`, te: `${cooldown} సెకన్లలో మళ్లీ పంపవచ్చు` })
                        : L({ en: 'Resend Verification Email', te: 'ధృవీకరణ ఈమెయిల్ మళ్లీ పంపండి' })}
                    </span>
                  </button>

                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink-3)',
                      fontSize: '13.5px',
                      marginTop: '8px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    onClick={() => switchMode('signin')}
                  >
                    {L({ en: 'Change Email / Back to Login', te: 'వేరే ఈమెయిల్ / లాగిన్‌కు వెళ్లండి' })}
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================
                MODE: RESET PASSWORD (from link)
               ========================================================= */}
            {mode === 'reset-password' && (
              <div>
                <h1 style={{ marginTop: '0', fontSize: '30px' }}>
                  {L({ en: 'Set new password', te: 'కొత్త పాస్‌వర్డ్ రూపొందించండి' })}
                </h1>

                {resetSuccess ? (
                  <div style={{ marginTop: '16px' }}>
                    <div
                      style={{
                        padding: '16px',
                        background: 'rgba(46, 125, 50, 0.08)',
                        border: '1px solid rgba(46, 125, 50, 0.25)',
                        borderRadius: '12px',
                        marginBottom: '20px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--ink)', lineHeight: '1.5' }}>
                        {L({
                          en: 'Your password has been reset successfully! You can now log in with your new password.',
                          te: 'మీ పాస్‌వర్డ్ విజయవంతంగా రీసెట్ చేయబడింది! ఇప్పుడు మీ కొత్త పాస్‌వర్డ్‌తో లాగిన్ అవ్వవచ్చు.',
                        })}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-dark"
                      style={{ width: '100%', minHeight: '46px' }}
                      onClick={() => switchMode('signin')}
                    >
                      <span>{L({ en: 'Login Now', te: 'ఇప్పుడు లాగిన్ అవ్వండి' })}</span>
                      <Icon name="arrow" className="ico sm" />
                    </button>
                  </div>
                ) : (
                  <form noValidate onSubmit={handleResetPassword}>
                    <p className="sub" style={{ margin: '6px 0 20px', fontSize: '14px' }}>
                      {L({
                        en: 'Choose a strong password with at least 6 characters.',
                        te: 'కనీసం 6 అక్షరాలతో కూడిన బలమైన పాస్‌వర్డ్‌ను ఎంచుకోండి.',
                      })}
                    </p>

                    <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                      <label htmlFor="new-password">{L({ en: 'New Password *', te: 'కొత్త పాస్‌వర్డ్ *' })}</label>
                      <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
                        <input
                          id="new-password"
                          type={showPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Min 6 characters"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setError(null);
                          }}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost sm pw-toggle"
                          onClick={() => setShowPw((v) => !v)}
                          aria-pressed={showPw}
                          aria-controls="new-password"
                        >
                          <Icon name="eye" className="ico sm" />
                        </button>
                      </div>
                    </div>

                    <div className="fld" style={{ width: '100%', boxSizing: 'border-box' }}>
                      <label htmlFor="confirm-new-password">{L({ en: 'Confirm New Password *', te: 'పాస్‌వర్డ్ ధృవీకరించండి *' })}</label>
                      <div className="inp" style={{ width: '100%', boxSizing: 'border-box' }}>
                        <input
                          id="confirm-new-password"
                          type={showConfirmPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Repeat new password"
                          value={confirmNewPassword}
                          onChange={(e) => {
                            setConfirmNewPassword(e.target.value);
                            setError(null);
                          }}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost sm pw-toggle"
                          onClick={() => setShowConfirmPw((v) => !v)}
                          aria-pressed={showConfirmPw}
                          aria-controls="confirm-new-password"
                        >
                          <Icon name="eye" className="ico sm" />
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
                      style={{ width: '100%', minHeight: '48px', marginTop: '10px', fontSize: '15.5px' }}
                      disabled={busy}
                    >
                      <span>{L(busy ? { en: 'Updating password...', te: 'నవీకరించబడుతోంది...' } : { en: 'Update Password', te: 'పాస్‌వర్డ్ అప్‌డేట్ చేయండి' })}</span>
                      <Icon name="arrow" className="ico sm" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* =========================================================
                MODE: VERIFY SUCCESS
               ========================================================= */}
            {mode === 'verify-success' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'rgba(46, 125, 50, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'var(--brand, #2e7d32)',
                  }}
                >
                  <Icon name="check" className="ico md" />
                </div>

                <h1 style={{ marginTop: '0', fontSize: '28px', marginBottom: '8px' }}>
                  {L({ en: 'Email Verified Successfully!', te: 'ఈమెయిల్ విజయవంతంగా ధృవీకరించబడింది!' })}
                </h1>

                <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '1.5', margin: '0 0 24px' }}>
                  {L({
                    en: 'Your FarmWise account is now active. You have full access to smart advisory, plot mapping, weather forecasts, and crop planners.',
                    te: 'మీ ఖాతా విజయవంతంగా యాక్టివేట్ చేయబడింది. అన్ని వ్యవసాయ సాధనాలు మరియు మ్యాప్‌లను ఉపయోగించవచ్చు.',
                  })}
                </p>

                <button
                  type="button"
                  className="btn btn-dark"
                  style={{ width: '100%', minHeight: '48px', fontSize: '15.5px' }}
                  onClick={() => navigate('/app/overview', { replace: true })}
                >
                  <span>{L({ en: 'Continue to FarmWise', te: 'వ్యవసాయ డ్యాష్‌బోర్డుకు కొనసాగండి' })}</span>
                  <Icon name="arrow" className="ico sm" />
                </button>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT SIDE IMAGE PANEL */}
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
