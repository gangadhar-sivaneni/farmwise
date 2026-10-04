import React, { useState, useEffect } from 'react';
import IconSprite from './components/common/IconSprite';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppShellPage from './pages/AppShellPage';
import { useApp } from './context/AppContext';
import { currentUser } from './services/authService';
import { navigate } from './utils/navigation';

export default function App() {
  const { signedIn } = useApp();

  const getInitialPath = () => {
    // If arriving with a legacy hash URL (e.g. #/login or #/app/overview), cleanly migrate to path
    if (window.location.hash.startsWith('#/')) {
      const clean = window.location.hash.slice(1);
      window.history.replaceState({}, '', clean);
      return clean;
    }
    return window.location.pathname || '/';
  };

  const [currentRoute, setCurrentRoute] = useState(getInitialPath);

  useEffect(() => {
    const handleRouteChange = () => {
      // Check for legacy hash migration
      if (window.location.hash.startsWith('#/')) {
        const clean = window.location.hash.slice(1);
        navigate(clean, { replace: true });
        return;
      }

      const path = window.location.pathname || '/';

      // Protected routes check
      if (path.startsWith('/app') && !currentUser()) {
        navigate('/login', { replace: true });
        return;
      }

      setCurrentRoute(path);
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    // Initial check
    handleRouteChange();

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, [signedIn]);

  // Global click interceptor: handles in-page section scrolling & SPA path navigation
  useEffect(() => {
    const handleClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignore external links, mailto, tel, or links opening in new tab
      if (
        href.startsWith('http:') ||
        href.startsWith('https:') ||
        href.startsWith('//') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return;
      }

      // Legacy hash route: #/app/...
      if (href.startsWith('#/')) {
        e.preventDefault();
        navigate(href.slice(1));
        return;
      }

      // In-page section anchor: #features, #how, etc.
      if (href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        const targetId = href.slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      // Clean internal SPA path: /login, /app, /app/crops, etc.
      if (href.startsWith('/')) {
        e.preventDefault();
        navigate(href);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Determine which page to render based on currentRoute
  let pageContent = null;
  if (currentRoute === '/signup') {
    pageContent = <LoginPage initialMode="signup" />;
  } else if (currentRoute === '/login' || (currentRoute.startsWith('/app') && !signedIn)) {
    pageContent = <LoginPage initialMode="signin" />;
  } else if (currentRoute.startsWith('/app')) {
    const cleanSub = currentRoute.replace(/^\/app\/?/, '').split('/')[0];
    const subpage = cleanSub || 'overview';
    pageContent = <AppShellPage subpage={subpage} />;
  } else {
    pageContent = <LandingPage />;
  }

  return (
    <>
      <IconSprite />
      {pageContent}
    </>
  );
}
