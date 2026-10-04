import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBNLcgdkxPiTY0RxNlshIfIkQalemHeLaM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "farmwise-be0bd.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://farmwise-be0bd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "farmwise-be0bd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "farmwise-be0bd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "119415281112",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:119415281112:web:ff464b369e8ad4068f0ead",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-LKVZWCYZ97"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export default app;
