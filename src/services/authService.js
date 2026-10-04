// FarmWise Authentication & Persistent User Database Service
// Users and their sessions are persisted in browser localStorage under dedicated keys.
// Each signed-in account is strictly isolated; plots and app data are never shared or mixed.

const USERS_KEY = 'farmwise_users_db';
const SESSION_KEY = 'farmwise_session';

// Predefined accounts available for demo/testing
const DEFAULT_ACCOUNTS = [
  { id: 'u1', name: 'Gangadhar', email: 'gangadhar@farmwise.in', hash: '91141f8ac76b9186f62bc8b8ae09396c38236ab7cbeb11c5c98cb6b11b91ac28' },
  { id: 'u2', name: 'Rohith', email: 'rohith@farmwise.in', hash: '28dad401036308e4c5e72418cdb53d46a25f0c33c97df1530cfa029eec6adf64' },
  { id: 'u3', name: 'Vamshi', email: 'vamshi@farmwise.in', hash: 'bcf426e7d48a71a72e69d4ec72ef34e0af09f3b10e3aac7bfe9238e9b3d6da67' },
];

let current = null;

const publicUser = (a) => (a ? { id: a.id, name: a.name, email: a.email, phone: a.phone || '' } : null);

export function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users database:', err);
  }
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Storage key for the signed-in user's data, strictly isolated per user id */
export function ukey(name) {
  if (!current) throw new Error('No signed-in user');
  return `farmwise_user_${current.id}_${name}`;
}

export const currentUser = () => current;

/**
 * Register a new user account with Name, Email (Gmail), Password, and optional phone/details.
 * Persists the user in the database and automatically logs them in.
 */
export async function register({ name, email, password, phone = '', district = '', state = '' }) {
  const normEmail = String(email || '').trim().toLowerCase();
  const trimName = String(name || '').trim();

  if (!trimName) {
    return { ok: false, error: { en: 'Please enter your name.', te: 'దయచేసి మీ పేరును నమోదు చేయండి.' } };
  }
  if (!normEmail || !normEmail.includes('@')) {
    return { ok: false, error: { en: 'Please enter a valid Gmail / Email address.', te: 'సరైన ఈమెయిల్ లేదా జిమెయిల్ చిరునామా నమోదు చేయండి.' } };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: { en: 'Password must be at least 4 characters.', te: 'పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి.' } };
  }

  const users = getStoredUsers();
  const existsInUsers = users.some((u) => u.email === normEmail);
  const existsInDemo = DEFAULT_ACCOUNTS.some((a) => a.email.toLowerCase() === normEmail);

  if (existsInUsers || existsInDemo) {
    return {
      ok: false,
      error: {
        en: 'This email is already registered. Please sign in instead.',
        te: 'ఈ ఈమెయిల్ ఇప్పటికే నమోదై ఉంది. దయచేసి లాగిన్ అవ్వండి.',
      },
    };
  }

  const hash = await sha256(`${normEmail}\n${password}`);
  const id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const newUser = {
    id,
    name: trimName,
    email: normEmail,
    phone: String(phone || '').trim(),
    district: String(district || '').trim(),
    state: String(state || '').trim(),
    hash,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveStoredUsers(users);

  // Set current user & persist session
  current = publicUser(newUser);
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: newUser.id }));
  } catch {
    /* storage blocked */
  }

  return { ok: true, user: current };
}

/**
 * Log in with Email and Password.
 * Validates against both registered users and fallback demo accounts.
 */
export async function login(email, password) {
  const normEmail = String(email || '').trim().toLowerCase();
  if (!normEmail || !password) return null;

  const hash = await sha256(`${normEmail}\n${password}`);
  const users = getStoredUsers();

  // 1. Look up in persistent registered users database
  let acc = users.find((u) => u.email === normEmail && u.hash === hash);

  // 2. If not found, check default demo accounts
  if (!acc) {
    acc = DEFAULT_ACCOUNTS.find(
      (a) => a.hash === hash || (a.email.toLowerCase() === normEmail && a.hash === hash)
    );
  }

  if (!acc) return null;

  current = publicUser(acc);
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: acc.id }));
  } catch {
    /* storage blocked */
  }

  return current;
}

/**
 * Restore user session after a refresh or reopening the project.
 * Looks up the persistent user database so user is never logged out unexpectedly.
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      current = null;
      return null;
    }
    const s = JSON.parse(raw);
    if (!s?.userId) {
      current = null;
      return null;
    }
    const users = getStoredUsers();
    const acc = users.find((a) => a.id === s.userId) || DEFAULT_ACCOUNTS.find((a) => a.id === s.userId);
    current = publicUser(acc);
  } catch {
    current = null;
  }
  return current;
}

export function logout() {
  current = null;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked */
  }
}

// Initial session check on module load
getSession();
