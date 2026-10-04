// FarmWise Authentication & Cloud Database Service (Firebase Auth & Realtime Database)
import { auth, rtdb } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

const SESSION_KEY = 'farmwise_session_user';
const listeners = new Set();

// Fail-safe helper: prevents any remote database call from hanging the UI
const withTimeout = (promise, ms = 2500) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ]);

const readCachedUser = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

let current = readCachedUser();

export function onAuthUserChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  });
}

export function currentUser() {
  return current;
}

export function ukey(name) {
  if (!current) throw new Error('No signed-in user');
  return `farmwise_user_${current.id}_${name}`;
}

export async function register({ name, email, password, phone = '', district = '', state = '' }) {
  const normEmail = String(email || '').trim().toLowerCase();
  const trimName = String(name || '').trim();

  if (!trimName) {
    return { ok: false, error: { en: 'Please enter your name.', te: 'దయచేసి మీ పేరును నమోదు చేయండి.' } };
  }
  if (!normEmail || !normEmail.includes('@')) {
    return { ok: false, error: { en: 'Please enter a valid Gmail / Email address.', te: 'సరైన ఈమెయిల్ లేదా జిమెయిల్ చిరునామా నమోదు చేయండి.' } };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: { en: 'Password must be at least 6 characters.', te: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.' } };
  }

  try {
    // 1. Create account in Firebase Auth (Instant cloud authentication)
    const userCred = await createUserWithEmailAndPassword(auth, normEmail, password);
    const fbUser = userCred.user;

    try {
      await updateProfile(fbUser, { displayName: trimName });
    } catch (e) {
      console.warn('updateProfile notice:', e);
    }

    const profileData = {
      id: fbUser.uid,
      name: trimName,
      email: normEmail,
      phone: String(phone || '').trim(),
      district: String(district || '').trim(),
      state: String(state || '').trim(),
      createdAt: new Date().toISOString(),
    };

    // 2. Set current user immediately for fast UI feedback (< 250ms)
    current = profileData;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    } catch {}
    notifyListeners();

    // 3. Save profile to cloud database in background (non-blocking)
    withTimeout(set(ref(rtdb, `users/${fbUser.uid}/profile`), profileData), 3000).catch((err) => {
      console.warn('Background profile cloud sync notice:', err.message);
    });

    return { ok: true, user: current };
  } catch (err) {
    console.error('Firebase register error:', err);
    if (err.code === 'auth/email-already-in-use') {
      return {
        ok: false,
        error: {
          en: 'This email is already registered. Please sign in instead.',
          te: 'ఈ ఈమెయిల్ ఇప్పటికే నమోదై ఉంది. దయచేసి లాగిన్ అవ్వండి.',
        },
      };
    }
    if (err.code === 'auth/weak-password') {
      return {
        ok: false,
        error: {
          en: 'Password must be at least 6 characters.',
          te: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.',
        },
      };
    }
    return {
      ok: false,
      error: {
        en: err.message || 'Registration failed. Please check network connection.',
        te: 'నమోదు విఫలమైంది. దయచేసి ఇంటర్నెట్ తనిఖీ చేయండి.',
      },
    };
  }
}

export async function login(email, password) {
  const normEmail = String(email || '').trim().toLowerCase();
  if (!normEmail || !password) return null;

  try {
    // 1. Authenticate with Firebase Auth (Lightning fast ~ 200ms)
    const userCred = await signInWithEmailAndPassword(auth, normEmail, password);
    const fbUser = userCred.user;

    const baseUser = {
      id: fbUser.uid,
      name: fbUser.displayName || normEmail.split('@')[0],
      email: normEmail,
      phone: '',
      district: '',
      state: '',
    };

    // 2. Log in immediately without waiting for database roundtrip
    current = baseUser;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    } catch {}
    notifyListeners();

    // 3. Fetch enhanced cloud profile in background and update
    withTimeout(get(ref(rtdb, `users/${fbUser.uid}/profile`)), 2500)
      .then((snapshot) => {
        if (snapshot && snapshot.exists()) {
          current = { ...baseUser, ...snapshot.val() };
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(current));
          } catch {}
          notifyListeners();
        }
      })
      .catch((e) => {
        console.warn('Background profile fetch notice:', e.message);
      });

    return current;
  } catch (err) {
    console.error('Firebase login error:', err);
    return null;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('signOut notice:', e);
  }
  current = null;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
  notifyListeners();
}

// Background session synchronization with Firebase Auth state
onAuthStateChanged(auth, (fbUser) => {
  if (fbUser) {
    const baseUser = {
      id: fbUser.uid,
      name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Farmer'),
      email: fbUser.email || '',
      phone: '',
      district: '',
      state: '',
    };

    if (!current || current.id !== fbUser.uid) {
      current = baseUser;
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      } catch {}
      notifyListeners();
    }

    // Try fetching profile from cloud database
    withTimeout(get(ref(rtdb, `users/${fbUser.uid}/profile`)), 2500)
      .then((snapshot) => {
        if (snapshot && snapshot.exists()) {
          current = { ...baseUser, ...snapshot.val() };
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(current));
          } catch {}
          notifyListeners();
        }
      })
      .catch(() => {});
  } else {
    if (current && !auth.currentUser) {
      current = null;
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {}
      notifyListeners();
    }
  }
});
