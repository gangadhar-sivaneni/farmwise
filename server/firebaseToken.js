// Verifies a Firebase Auth ID token (RS256 JWT) with Node's built-in crypto — no extra dependency.
// Checks: Google signature, issuer, audience (project), expiry, issued-at and subject.
import { createVerify } from 'node:crypto';

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certCache = { certs: null, expiresAt: 0 };

async function googleCerts() {
  if (certCache.certs && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`cert fetch ${res.status}`);
  const maxAge = Number(res.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 3600);
  certCache = { certs: await res.json(), expiresAt: Date.now() + maxAge * 1000 };
  return certCache.certs;
}

const b64json = (s) => JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

/** Resolves to the verified payload ({ sub, email, … }) or null for any invalid/forged/expired token. */
export async function verifyFirebaseToken(token, projectId, getCerts = googleCerts) {
  try {
    const [h, p, sig] = String(token).split('.');
    if (!h || !p || !sig) return null;
    const header = b64json(h);
    const payload = b64json(p);
    if (header.alg !== 'RS256') return null;
    const cert = (await getCerts())[header.kid];
    if (!cert) return null;
    const ok = createVerify('RSA-SHA256').update(`${h}.${p}`).verify(cert, Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    const now = Date.now() / 1000;
    if (!ok
      || payload.aud !== projectId
      || payload.iss !== `https://securetoken.google.com/${projectId}`
      || !(payload.exp > now)
      || !(payload.iat <= now + 300)
      || typeof payload.sub !== 'string' || !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

// Self-check: node server/firebaseToken.js
if (process.argv[1]?.endsWith('firebaseToken.js')) {
  const { generateKeyPairSync, createSign } = await import('node:crypto');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const make = (payload, key = privateKey) => {
    const hp = `${enc({ alg: 'RS256', kid: 'k1' })}.${enc(payload)}`;
    return `${hp}.${createSign('RSA-SHA256').update(hp).sign(key).toString('base64url')}`;
  };
  const good = { aud: 'proj', iss: 'https://securetoken.google.com/proj', sub: 'u1', iat: now, exp: now + 3600 };
  const certs = async () => ({ k1: pem });
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const check = async (name, token, expectOk) => {
    const r = await verifyFirebaseToken(token, 'proj', certs);
    if (!!r !== expectOk) throw new Error(`${name}: expected ${expectOk ? 'valid' : 'rejected'}`);
  };
  await check('valid token', make(good), true);
  await check('forged signature', make(good, other), false);
  await check('unsigned (old bypass)', `${enc({ alg: 'RS256', kid: 'k1' })}.${enc(good)}.x`, false);
  await check('expired', make({ ...good, exp: now - 10 }), false);
  await check('other project', make({ ...good, aud: 'evil', iss: 'https://securetoken.google.com/evil' }), false);
  await check('alg none', `${enc({ alg: 'none', kid: 'k1' })}.${enc(good)}.`, false);
  console.log('firebaseToken self-check ok');
}
