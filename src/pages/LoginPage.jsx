import React, { useState, useEffect } from 'react';
import BrandMark from '../components/common/BrandMark';
import Icon from '../components/common/Icon';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { t, L, showToast, W } = useLanguage();
  const { setSignedIn } = useApp();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'FarmWise — Login';
  }, []);

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
  };

  const signIn = () => {
    setSignedIn(true);
    setOtpStep(false);
    setPhone('');
    setOtp('');
    setError('');
    window.location.hash = '#/app/overview';
    showToast(W.welcome);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError(L(W.phoneErr));
      return;
    }

    if (!otpStep) {
      setOtpStep(true);
      setError('');
      showToast(W.otpSent);
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(L(W.otpErr));
      return;
    }

    signIn();
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
            <span className="pill demo">
              <i />
              <span>{t('demo', 'Demo Mode')}</span>
            </span>

            <h1 style={{ marginTop: '16px' }}>{t('lg.h1', 'Welcome back, farmer.')}</h1>
            <p className="sub">
              {t('lg.sub', 'Sign in with your mobile number. We’ll send a one-time code.')}
            </p>

            <div className="fld">
              <label htmlFor="phone">{t('lg.phone', 'Mobile number')}</label>
              <div className="inp">
                <span className="pre">+91</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={handlePhoneChange}
                />
              </div>
            </div>

            {otpStep && (
              <div className="fld" id="otpFld">
                <label htmlFor="otp">{t('lg.otp', '6-digit code')}</label>
                <div className="inp">
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    value={otp}
                    onChange={handleOtpChange}
                    autoFocus
                  />
                </div>
                <p className="muted" style={{ fontSize: '13px', marginTop: '6px' }}>
                  {t('lg.otpHint', 'Demo mode: any 6 digits work. No SMS is sent.')}
                </p>
              </div>
            )}

            <p className="err" id="loginErr" role="alert">
              {error}
            </p>

            <button
              type="submit"
              className="btn btn-dark"
              style={{ width: '100%', minHeight: '48px' }}
              id="loginBtn"
            >
              <span>{otpStep ? L(W.verify) : L(W.send)}</span>
              <Icon name="arrow" className="ico sm" />
            </button>

            <div className="or">{t('lg.or', 'or')}</div>

            <button
              type="button"
              className="btn"
              style={{ width: '100%', minHeight: '48px' }}
              id="demoLogin"
              onClick={signIn}
            >
              {t('lg.demo', 'Continue as demo farmer')}
            </button>
          </form>

          <p className="muted" style={{ fontSize: '13px' }}>
            {t(
              'lg.note',
              'Prototype only — no account is created and nothing leaves this browser.'
            )}
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
