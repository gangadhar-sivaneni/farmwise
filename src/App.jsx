import React, { useState, useEffect } from 'react';
import IconSprite from './components/common/IconSprite';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppShellPage from './pages/AppShellPage';
import { useApp } from './context/AppContext';
import { currentUser } from './services/authService';

export default function App() {
  const { signedIn } = useApp();

  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.hash || '#/';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      // Check auth for protected routes
      // read the auth service directly: it updates synchronously on login/logout
      if (hash.startsWith('#/app') && !currentUser()) {
        window.location.replace('#/login');
        return;
      }
      setCurrentRoute(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [signedIn]);

  // Handle in-page anchors clicking without breaking router
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]:not([href^="#/"])');
      if (!anchor) return;
      const targetId = anchor.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  // Determine which page to render based on currentRoute
  let pageContent = null;
  if (currentRoute === '#/signup') {
    pageContent = <LoginPage initialMode="signup" />;
  } else if (currentRoute === '#/login' || (currentRoute.startsWith('#/app') && !signedIn)) {
    pageContent = <LoginPage initialMode="signin" />; // the dashboard never renders without a signed-in user
  } else if (currentRoute.startsWith('#/app')) {
    const parts = currentRoute.replace('#/app/', '').split('/');
    const subpage = parts[0] || 'overview';
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
