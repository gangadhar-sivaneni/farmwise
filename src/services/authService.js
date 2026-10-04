// FarmWise Authentication & Cloud Database Service (Firebase Auth & Firestore)
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SESSION_KEY = 'farmwise_session_user';
const listeners = new Set();

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

    try {
      await setDoc(doc(db, 'users', fbUser.uid), profileData, { merge: true });
    } catch (dbErr) {
      console.warn('Firestore setDoc notice (account created in auth):', dbErr);
    }

    current = profileData;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    } catch {}
    notifyListeners();

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
    const userCred = await signInWithEmailAndPassword(auth, normEmail, password);
    const fbUser = userCred.user;

    let profileData = {
      id: fbUser.uid,
      name: fbUser.displayName || normEmail.split('@')[0],
      email: normEmail,
      phone: '',
      district: '',
      state: '',
    };

    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        profileData = { ...profileData, ...userDoc.data() };
      }
    } catch (e) {
      console.warn('Firestore profile fetch notice:', e);
    }

    current = profileData;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    } catch {}
    notifyListeners();

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
onAuthStateChanged(auth, async (fbUser) => {
  if (fbUser) {
    let profileData = {
      id: fbUser.uid,
      name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Farmer'),
      email: fbUser.email || '',
      phone: '',
      district: '',
      state: '',
    };

    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        profileData = { ...profileData, ...userDoc.data() };
      }
    } catch (e) {
      console.warn('Firestore profile fetch notice:', e);
    }

    current = profileData;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    } catch {}
    notifyListeners();
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
