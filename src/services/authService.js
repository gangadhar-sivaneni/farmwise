// FarmWise Authentication & Cloud Database Service (Firebase Auth & Realtime Database)
import { auth, rtdb } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updatePassword,
  reload,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { ref, get, set, update, remove } from 'firebase/database';

const SESSION_KEY = 'farmwise_session_user';
const listeners = new Set();

// Fail-safe helper: prevents any remote database call from hanging the UI
const withTimeout = (promise, ms = 3000) =>
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

/**
 * Format raw user data from Firebase Auth + RTDB
 */
function buildUserObject(fbUser, extra = {}) {
  const providerId = fbUser.providerData?.[0]?.providerId || extra.authProvider || 'password';
  // Email/password accounts: only Firebase's own flag counts — the stored profile copy is user-writable,
  // so it must never be able to mark an unverified account as verified.
  // Google accounts keep the app's extra one-time verification step (stored flag).
  const isVerified = providerId === 'password' || extra.emailVerified === undefined
    ? Boolean(fbUser.emailVerified)
    : Boolean(extra.emailVerified);

  return {
    id: fbUser.uid,
    name: fbUser.displayName || extra.name || (fbUser.email ? fbUser.email.split('@')[0] : 'Farmer'),
    email: fbUser.email || extra.email || '',
    emailVerified: isVerified,
    authProvider: providerId,
    phone: extra.phone || fbUser.phoneNumber || '',
    district: extra.district || '',
    state: extra.state || '',
    createdAt: extra.createdAt || fbUser.metadata?.creationTime || new Date().toISOString(),
    photoURL: fbUser.photoURL || extra.photoURL || null,
  };
}

/**
 * Email/Password Registration with Real Email Verification Link
 */
export async function register({ name, email, password, phone = '', district = '', state = '' }) {
  const normEmail = String(email || '').trim().toLowerCase();
  const trimName = String(name || '').trim();

  if (!trimName) {
    return { ok: false, error: { en: 'Please enter your full name.', te: 'దయచేసి మీ పూర్తి పేరు నమోదు చేయండి.' } };
  }
  if (!normEmail || !normEmail.includes('@')) {
    return { ok: false, error: { en: 'Please enter a valid Gmail / Email address.', te: 'సరైన ఈమెయిల్ లేదా జిమెయిల్ చిరునామా ఇవ్వండి.' } };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: { en: 'Password must be at least 6 characters long.', te: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.' } };
  }

  try {
    // 1. Create account in Firebase Auth
    const userCred = await createUserWithEmailAndPassword(auth, normEmail, password);
    const fbUser = userCred.user;

    try {
      await updateProfile(fbUser, { displayName: trimName });
    } catch (e) {
      console.warn('updateProfile notice:', e);
    }

    // 2. Send real email verification link to user's registered inbox
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/login?verified=true',
        handleCodeInApp: true,
      };
      await sendEmailVerification(fbUser, actionCodeSettings);
    } catch (verErr) {
      console.warn('sendEmailVerification notice:', verErr);
    }

    const profileData = {
      id: fbUser.uid,
      name: trimName,
      email: normEmail,
      phone: String(phone || '').trim(),
      district: String(district || '').trim(),
      state: String(state || '').trim(),
      emailVerified: false,
      authProvider: 'password',
      createdAt: new Date().toISOString(),
    };

    current = buildUserObject(fbUser, profileData);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    } catch {}
    notifyListeners();

    // 3. Save profile to cloud database in background
    withTimeout(set(ref(rtdb, `users/${fbUser.uid}/profile`), profileData), 3500).catch((err) => {
      console.warn('Background profile cloud sync notice:', err.message);
    });

    return { ok: true, user: current, emailVerified: false };
  } catch (err) {
    console.error('Firebase register error:', err);
    if (err.code === 'auth/email-already-in-use') {
      return {
        ok: false,
        error: {
          en: 'An account with this email already exists. Please log in instead.',
          te: 'ఈ ఈమెయిల్‌తో ఖాతా ఇప్పటికే ఉంది. దయచేసి లాగిన్ అవ్వండి.',
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

/**
 * Email/Password Login
 */
export async function login(email, password, rememberMe = true) {
  const normEmail = String(email || '').trim().toLowerCase();
  if (!normEmail || !password) return { ok: false, error: { en: 'Please enter both email and password.', te: 'దయచేసి ఈమెయిల్ మరియు పాస్‌వర్డ్ రెండూ నమోదు చేయండి.' } };

  try {
    // Apply session persistence based on "Remember me"
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    } catch (e) {
      console.warn('setPersistence notice:', e);
    }

    const userCred = await signInWithEmailAndPassword(auth, normEmail, password);
    const fbUser = userCred.user;

    const baseUser = buildUserObject(fbUser);
    current = baseUser;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    } catch {}
    notifyListeners();

    // Fetch cloud profile in background
    withTimeout(get(ref(rtdb, `users/${fbUser.uid}/profile`)), 3000)
      .then((snapshot) => {
        if (snapshot && snapshot.exists()) {
          current = buildUserObject(fbUser, snapshot.val());
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(current));
          } catch {}
          notifyListeners();
        }
      })
      .catch((e) => {
        console.warn('Background profile fetch notice:', e.message);
      });

    return { ok: true, user: current, emailVerified: fbUser.emailVerified };
  } catch (err) {
    console.error('Firebase login error:', err);
    // Generic invalid-credentials message (does not reveal if email exists)
    return {
      ok: false,
      error: {
        en: 'Invalid email or password. Please check your credentials.',
        te: 'ఈమెయిల్ లేదా పాస్‌వర్డ్ తప్పుగా ఉంది. దయచేసి సరిచూడండి.',
      },
    };
  }
}

/**
 * Google OAuth Sign In & Registration
 * Enforces one-time email verification for registrations as requested.
 */
export async function loginWithGoogle(isRegistration = false) {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const userCred = await signInWithPopup(auth, provider);
    const fbUser = userCred.user;

    let profileData = {
      id: fbUser.uid,
      name: fbUser.displayName || 'Farmer',
      email: fbUser.email || '',
      authProvider: 'google.com',
      photoURL: fbUser.photoURL || null,
      createdAt: fbUser.metadata?.creationTime || new Date().toISOString(),
    };

    let alreadyVerifiedOnce = false;
    let isNewUser = false;

    // Check if user already has an existing profile in cloud database
    try {
      const snap = await withTimeout(get(ref(rtdb, `users/${fbUser.uid}/profile`)), 3000);
      if (snap && snap.exists()) {
        const val = snap.val();
        alreadyVerifiedOnce = Boolean(val.emailVerified);
        profileData = { ...profileData, ...val };
      } else {
        isNewUser = true;
        alreadyVerifiedOnce = false;
      }
    } catch (e) {
      console.warn('Google profile fetch notice:', e.message);
    }

    // When user selects Google sign-in while registering, or is a first-time Google user who hasn't verified:
    if (!alreadyVerifiedOnce && (isRegistration || isNewUser)) {
      // Send real email verification link to their Gmail
      try {
        const actionCodeSettings = {
          url: window.location.origin + '/login?verified=true',
          handleCodeInApp: true,
        };
        await sendEmailVerification(fbUser, actionCodeSettings);
      } catch (verErr) {
        console.warn('sendEmailVerification for Google notice:', verErr);
      }

      profileData.emailVerified = false;
      withTimeout(set(ref(rtdb, `users/${fbUser.uid}/profile`), profileData), 3500).catch(() => {});

      current = buildUserObject(fbUser, profileData);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      } catch {}
      notifyListeners();

      return {
        ok: true,
        user: current,
        emailVerified: false,
        needsVerification: true,
      };
    }

    // User has already completed the one-time verification in the past: permit direct access
    profileData.emailVerified = true;
    withTimeout(set(ref(rtdb, `users/${fbUser.uid}/profile`), profileData), 3500).catch(() => {});

    current = buildUserObject(fbUser, profileData);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    } catch {}
    notifyListeners();

    return { ok: true, user: current, emailVerified: true, needsVerification: false };
  } catch (err) {
    console.error('Google Auth error:', err);
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return { ok: false, cancelled: true };
    }
    if (err.code === 'auth/unauthorized-domain') {
      return {
        ok: false,
        error: {
          en: 'Domain not authorized for Google Sign-in in Firebase Console. Please add this domain to Authorized Domains.',
          te: 'ఫైర్‌బేస్ ప్రాజెక్ట్‌లో ఈ డొమైన్ ఆమోదించబడలేదు.',
        },
      };
    }
    return {
      ok: false,
      error: {
        en: err.message || 'Google sign-in failed. Please try again.',
        te: 'గూగుల్ లాగిన్ విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
      },
    };
  }
}

/**
 * Resend Email Verification link to currently signed-in user
 */
export async function resendVerificationEmail() {
  if (!auth.currentUser) {
    return {
      ok: false,
      error: { en: 'No active session found. Please log in first.', te: 'క్రియాశీల సెషన్ కనుగొనబడలేదు.' },
    };
  }

  try {
    const actionCodeSettings = {
      url: window.location.origin + '/login?verified=true',
      handleCodeInApp: true,
    };
    await sendEmailVerification(auth.currentUser, actionCodeSettings);
    return { ok: true };
  } catch (err) {
    console.error('resendVerificationEmail error:', err);
    if (err.code === 'auth/too-many-requests') {
      return {
        ok: false,
        error: {
          en: 'Too many requests. Please wait a moment before trying again.',
          te: 'చాలా ఎక్కువ అభ్యర్థనలు వచ్చాయి. దయచేసి కాసేపు ఆగండి.',
        },
      };
    }
    return {
      ok: false,
      error: {
        en: 'Could not send verification email. Please try again later.',
        te: 'ధృవీకరణ ఈమెయిల్ పంపడం సాధ్యం కాలేదు.',
      },
    };
  }
}

/**
 * Reloads the user session to check if email was verified in background
 */
export async function checkEmailVerified() {
  if (!auth.currentUser) return false;
  try {
    await reload(auth.currentUser);
    const verified = Boolean(auth.currentUser.emailVerified);
    if (current) {
      current.emailVerified = verified;
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      } catch {}
      if (verified) {
        // Sync verified state to RTDB
        update(ref(rtdb, `users/${auth.currentUser.uid}/profile`), { emailVerified: true }).catch(() => {});
      }
      notifyListeners();
    }
    return verified;
  } catch (err) {
    console.warn('checkEmailVerified error:', err);
    return current?.emailVerified || false;
  }
}

/**
 * Request Password Reset Email (generic response to prevent email enumeration)
 */
export async function sendPasswordReset(email) {
  const normEmail = String(email || '').trim().toLowerCase();
  if (!normEmail || !normEmail.includes('@')) {
    return {
      ok: false,
      error: {
        en: 'Please enter a valid Gmail / Email address.',
        te: 'సరైన ఈమెయిల్ లేదా జిమెయిల్ చిరునామా ఇవ్వండి.',
      },
    };
  }

  try {
    const actionCodeSettings = {
      url: window.location.origin + '/reset-password',
      handleCodeInApp: true,
    };
    await sendPasswordResetEmail(auth, normEmail, actionCodeSettings);
  } catch (err) {
    console.warn('sendPasswordReset notice:', err.code);
    // Don't leak whether user exists; continue to return generic success
  }

  return {
    ok: true,
    message: {
      en: 'If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.',
      te: 'ఈ ఈమెయిల్‌తో ఖాతా ఉంటే, పాస్‌వర్డ్ రీసెట్ లింక్ పంపబడింది. దయచేసి మీ ఇన్‌బాక్స్ మరియు స్పామ్ ఫోల్డర్‌ను తనిఖీ చేయండి.',
    },
  };
}

/**
 * Apply email verification action code from Firebase link
 */
export async function handleVerifyEmailCode(oobCode) {
  try {
    await applyActionCode(auth, oobCode);
    if (auth.currentUser) {
      await reload(auth.currentUser);
      if (current) {
        current.emailVerified = true;
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(current));
        } catch {}
        update(ref(rtdb, `users/${auth.currentUser.uid}/profile`), { emailVerified: true }).catch(() => {});
        notifyListeners();
      }
    }
    return { ok: true };
  } catch (err) {
    console.error('handleVerifyEmailCode error:', err);
    return {
      ok: false,
      error: {
        en: 'This verification link is invalid or has expired. Please request a new verification link.',
        te: 'ఈ ధృవీకరణ లింక్ చెల్లదు లేదా గడువు ముగిసింది.',
      },
    };
  }
}

/**
 * Verify password reset action code and get email
 */
export async function verifyResetCode(oobCode) {
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { ok: true, email };
  } catch (err) {
    console.error('verifyResetCode error:', err);
    return {
      ok: false,
      error: {
        en: 'This password reset link is invalid or has expired. Please request a new reset link.',
        te: 'ఈ పాస్‌వర్డ్ రీసెట్ లింక్ చెల్లదు లేదా గడువు ముగిసింది. దయచేసి కొత్త లింక్‌ను అభ్యర్థించండి.',
      },
    };
  }
}

/**
 * Complete Password Reset with new password
 */
export async function completePasswordReset(oobCode, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return {
      ok: false,
      error: {
        en: 'New password must be at least 6 characters long.',
        te: 'కొత్త పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.',
      },
    };
  }

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    return { ok: true };
  } catch (err) {
    console.error('completePasswordReset error:', err);
    return {
      ok: false,
      error: {
        en: err.message || 'Failed to reset password. Link may have expired.',
        te: 'పాస్‌వర్డ్ రీసెట్ విఫలమైంది. లింక్ గడువు ముగిసి ఉండవచ్చు.',
      },
    };
  }
}

/**
 * Change password for logged-in user in settings
 */
export async function changePassword(newPassword) {
  if (!auth.currentUser) {
    return { ok: false, error: { en: 'No active session found.', te: 'క్రియాశీల సెషన్ లేదు.' } };
  }
  if (!newPassword || newPassword.length < 6) {
    return {
      ok: false,
      error: { en: 'Password must be at least 6 characters.', te: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.' },
    };
  }

  try {
    await updatePassword(auth.currentUser, newPassword);
    return { ok: true };
  } catch (err) {
    console.error('changePassword error:', err);
    if (err.code === 'auth/requires-recent-login') {
      return {
        ok: false,
        error: {
          en: 'For security reasons, please log out and log in again before changing your password.',
          te: 'భద్రతా కారణాల దృష్ట్యా, దయచేసి లాగౌట్ అయి మళ్లీ లాగిన్ అవ్వండి.',
        },
      };
    }
    return {
      ok: false,
      error: {
        en: err.message || 'Failed to update password.',
        te: 'పాస్‌వర్డ్ అప్‌డేట్ విఫలమైంది.',
      },
    };
  }
}

/**
 * Update user's profile photo (custom upload or Gmail photo)
 */
export async function updateUserProfilePhoto(photoURL) {
  if (!auth.currentUser) {
    return { ok: false, error: { en: 'No signed-in user', te: 'లాగిన్ అయిన యూజర్ లేరు' } };
  }

  const uid = auth.currentUser.uid;
  try {
    // 1. Update Firebase Auth user
    await updateProfile(auth.currentUser, { photoURL });

    // 2. Update RTDB profile in cloud
    withTimeout(set(ref(rtdb, `users/${uid}/profile/photoURL`), photoURL || ''), 4000).catch((err) => {
      console.warn('RTDB photoURL sync notice:', err.message);
    });

    // 3. Update memory session
    if (current) {
      current = { ...current, photoURL };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      } catch {}
      notifyListeners();
    }

    return { ok: true, photoURL };
  } catch (err) {
    console.error('Update profile photo error:', err);
    // Graceful fallback: update local session
    if (current) {
      current = { ...current, photoURL };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      } catch {}
      notifyListeners();
    }
    return { ok: true, photoURL };
  }
}

/**
 * Send email verification link/notice before account deletion
 */
export async function sendAccountDeletionVerification() {
  if (!auth.currentUser) {
    return { ok: false, error: { en: 'No signed-in user', te: 'లాగిన్ అయిన యూజర్ లేరు' } };
  }

  try {
    const actionCodeSettings = {
      url: window.location.origin + '/app/profile?deletionVerificationSent=true',
      handleCodeInApp: true,
    };
    await sendEmailVerification(auth.currentUser, actionCodeSettings);
    return { ok: true };
  } catch (err) {
    console.error('sendAccountDeletionVerification error:', err);
    return {
      ok: false,
      error: {
        en: err.message || 'Failed to send verification email.',
        te: 'ధృవీకరణ ఈమెయిల్ పంపడం విఫలమైంది.',
      },
    };
  }
}

/**
 * Permanently delete user account and wipe all data from website database
 */
export async function deleteAccountAndAllData(password = '') {
  if (!auth.currentUser) {
    return { ok: false, error: { en: 'No signed-in user', te: 'లాగిన్ అయిన యూజర్ లేరు' } };
  }

  const uid = auth.currentUser.uid;
  const email = auth.currentUser.email;
  const isGoogle = current?.authProvider === 'google.com' || auth.currentUser.providerData?.some((p) => p.providerId === 'google.com');

  try {
    // 1. Re-authenticate if password provided to satisfy recent-login requirement
    if (password && !isGoogle) {
      try {
        const cred = EmailAuthProvider.credential(email, password);
        await reauthenticateWithCredential(auth.currentUser, cred);
      } catch (authErr) {
        return {
          ok: false,
          error: {
            en: 'Incorrect password. Please verify your current password.',
            te: 'తప్పు పాస్‌వర్డ్. దయచేసి సరైన పాస్‌వర్డ్ ఇవ్వండి.',
          },
        };
      }
    }

    // 2. Wipe ALL user data from Firebase Realtime Database
    try {
      await withTimeout(remove(ref(rtdb, `users/${uid}`)), 5000);
    } catch (dbErr) {
      console.warn('RTDB wipe notice:', dbErr.message);
    }

    // 3. Clear all user-specific data from localStorage
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(`farmwise_user_${uid}`) || k.includes(uid))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem(SESSION_KEY);
    } catch {}

    // 4. Delete user account from Firebase Auth
    try {
      await deleteUser(auth.currentUser);
    } catch (delErr) {
      if (delErr.code === 'auth/requires-recent-login') {
        if (isGoogle) {
          // Attempt Google re-authentication popup
          try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await reauthenticateWithCredential(auth.currentUser, provider);
            await deleteUser(auth.currentUser);
          } catch (gErr) {
            return {
              ok: false,
              requiresRecentLogin: true,
              error: {
                en: 'Please re-authenticate with Google before deleting your account.',
                te: 'ఖాతాను తొలగించే ముందు గూగుల్‌తో మళ్లీ ధృవీకరించుకోండి.',
              },
            };
          }
        } else {
          return {
            ok: false,
            requiresRecentLogin: true,
            error: {
              en: 'Please re-enter your password to confirm account deletion.',
              te: 'ఖాతాను తొలగించడానికి మీ పాస్‌వర్డ్‌ను మళ్లీ నమోదు చేయండి.',
            },
          };
        }
      } else {
        console.warn('deleteUser notice:', delErr.message);
      }
    }

    // 5. Clear active session in memory
    current = null;
    notifyListeners();

    return { ok: true };
  } catch (err) {
    console.error('Delete account error:', err);
    return {
      ok: false,
      error: {
        en: err.message || 'Failed to delete account.',
        te: 'ఖాతా తొలగింపు విఫలమైంది.',
      },
    };
  }
}

/**
 * Sign out user
 */
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
    const baseUser = buildUserObject(fbUser);

    if (!current || current.id !== fbUser.uid || current.emailVerified !== fbUser.emailVerified) {
      current = baseUser;
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      } catch {}
      notifyListeners();
    }

    // Background cloud profile synchronization
    withTimeout(get(ref(rtdb, `users/${fbUser.uid}/profile`)), 3000)
      .then((snapshot) => {
        if (snapshot && snapshot.exists()) {
          current = buildUserObject(fbUser, snapshot.val());
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

export async function getIdToken(forceRefresh = false) {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token:', err);
      return null;
    }
  }
  return null;
}
