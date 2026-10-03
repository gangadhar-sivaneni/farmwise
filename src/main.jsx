import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './context/LanguageContext';
import { AppProvider } from './context/AppContext';
import { FarmProvider } from './context/FarmContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// A page restored from the back/forward cache could show a dashboard after logout: reload so the session is re-checked
window.addEventListener('pageshow', (e) => e.persisted && window.location.reload());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        {(user) => (
          // keyed by user: a different account (or none) gets fresh state, never the previous user's
          <FarmProvider key={user?.id || 'signed-out'}>
            <AppProvider>
              <App />
            </AppProvider>
          </FarmProvider>
        )}
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);
