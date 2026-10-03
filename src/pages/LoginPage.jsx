import React, { useState, useEffect } from 'react';
import BrandMark from '../components/common/BrandMark';
import Icon from '../components/common/Icon';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const BAD = { en: 'Invalid email or password', te: 'ఈమెయిల్ లేదా పాస్‌వర్డ్ తప్పు' };

export default function LoginPage() {
  const { t, L, showToast, W } = useLanguage();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = 'FarmWise — Login';
    return () => { document.title = prev; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = email.trim() && password ? await login(email, password) : false;
    setBusy(false);
    if (!ok) {
      setError(BAD); // same message for unknown email and wrong password
      setPassword('');
      return;
    }
    window.location.replace('#/app/overview');
    showToast(W.welcome);
  };

  return (
    <div className="screen on" id="s-login">
      <div className="login">
        <div className="panel login-l">
          <a href="#/" className="logo">
            <BrandMark />
            <span>
              <b>FarmWise</b>
              <small>{t('brand.sub', 'Smart Farming Platform')}</small>
            </span>
          </a>

          <form className="login-form" id="loginForm" noValidate onSubmit={handleSubmit}>

            <h1 style={{ marginTop: '16px' }}>{t('lg.h1', 'Welcome back, farmer.')}</h1>
            <p className="sub">
              {L({ en: 'Sign in with your FarmWise account email and password.', te: 'మీ FarmWise ఖాతా ఈమెయిల్, పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి.' })}
            </p>

            <div className="fld">
              <label htmlFor="email">{L({ en: 'Email', te: 'ఈమెయిల్' })}</label>
              <div className="inp">
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                />
              </div>
            </div>

            <div className="fld">
              <label htmlFor="password">{L({ en: 'Password', te: 'పాస్‌వర్డ్' })}</label>
              <div className="inp">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                />
                <button
                  type="button"
                  className="btn btn-ghost sm pw-toggle"
                  onClick={() => setShow((v) => !v)}
                  aria-pressed={show}
                  aria-controls="password"
                >
                  <Icon name="eye" className="ico sm" />
                  <span>{L(show ? { en: 'Hide', te: 'దాచు' } : { en: 'Show', te: 'చూపు' })}</span>
                </button>
              </div>
            </div>

            <p className="err" id="loginErr" role="alert">
              {error ? L(error) : ''}
            </p>

            <button
              type="submit"
              className="btn btn-dark"
              style={{ width: '100%', minHeight: '48px' }}
              id="loginBtn"
              disabled={busy}
            >
              <span>{L({ en: 'Log in', te: 'లాగిన్' })}</span>
              <Icon name="arrow" className="ico sm" />
            </button>
          </form>

          <p className="muted" style={{ fontSize: '13px' }}>
            {L({ en: 'Demo sign-in for invited accounts only — no sign-up. Not production-grade security; your data stays in this browser.', te: 'ఆహ్వానిత ఖాతాలకు మాత్రమే డెమో లాగిన్ — కొత్త నమోదు లేదు. ఇది పూర్తి భద్రత కాదు; మీ సమాచారం ఈ బ్రౌజర్‌లోనే ఉంటుంది.' })}
          </p>
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
