// DEMO-ONLY authentication. Not secure: anything shipped to the browser can be inspected.
// LATER: replace login/getSession/logout with calls to a real backend (server-side sessions + authorization).
// Credentials are not stored in plain text — only SHA-256(email + "\n" + password) per account.
const ACCOUNTS = [
  { id: 'u1', name: 'Gangadhar', hash: '91141f8ac76b9186f62bc8b8ae09396c38236ab7cbeb11c5c98cb6b11b91ac28', sample: 'a' },
  { id: 'u2', name: 'Rohith', hash: '28dad401036308e4c5e72418cdb53d46a25f0c33c97df1530cfa029eec6adf64', sample: 'b' },
  { id: 'u3', name: 'Vamshi', hash: 'bcf426e7d48a71a72e69d4ec72ef34e0af09f3b10e3aac7bfe9238e9b3d6da67', sample: 'c' },
];
const SESSION_KEY = 'farmwise_session';

const publicUser = (a) => (a ? { id: a.id, name: a.name, sample: a.sample } : null);
let current = null; // the signed-in account; every user-data key is scoped to it

/** Storage key for the signed-in user's data, e.g. farmwise_user_u1_plots. Throws when nobody is signed in. */
export function ukey(name) {
  if (!current) throw new Error('No signed-in user');
  return `farmwise_user_${current.id}_${name}`;
}
export const currentUser = () => current;

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Resolves to the user, or null for ANY wrong email/password (never says which part was wrong). */
export async function login(email, password) {
  const hash = await sha256(`${String(email).trim().toLowerCase()}\n${password}`);
  const acc = ACCOUNTS.find((a) => a.hash === hash);
  if (!acc) return null;
  current = publicUser(acc);
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: acc.id })); } catch { /* storage blocked */ }
  migrateLegacy();
  return current;
}

/** Restore the session after a refresh (only for a known account id). */
export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    current = publicUser(ACCOUNTS.find((a) => a.id === s?.userId));
  } catch { current = null; }
  return current;
}

export function logout() {
  current = null;
  try { localStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ }
}

// Data saved before accounts existed lived in shared keys. Hand it to the first account once, then delete
// the shared keys so no data is ever visible to every user.
const LEGACY = { 'fw.plots.v1': 'plots', 'fw.farm': 'active_plot', 'fw.daily_tasks': 'tasks', 'fw.tasks': 'tasks_done', 'fw.plans': 'plans', 'fw.scan_alerts': 'scan_alerts', 'fw.compare': 'preferences_compare' };
function migrateLegacy() {
  try {
    localStorage.removeItem('fw.session');
    for (const [old, name] of Object.entries(LEGACY)) {
      const v = localStorage.getItem(old);
      if (v === null) continue;
      const k = `farmwise_user_u1_${name}`;
      if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
      localStorage.removeItem(old);
    }
  } catch { /* storage blocked */ }
}

getSession();
