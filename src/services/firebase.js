import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBNLcgdkxPiTY0RxNlshIfIkQalemHeLaM",
  authDomain: "farmwise-be0bd.firebaseapp.com",
  databaseURL: "https://farmwise-be0bd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "farmwise-be0bd",
  storageBucket: "farmwise-be0bd.firebasestorage.app",
  messagingSenderId: "119415281112",
  appId: "1:119415281112:web:ff464b369e8ad4068f0ead",
  measurementId: "G-LKVZWCYZ97"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export default app;
