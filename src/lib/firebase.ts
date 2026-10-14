/**
 * Firebase initialisation.
 *
 * The config values can be overridden with VITE_FIREBASE_* environment
 * variables (set them in Vercel → Project → Settings → Environment Variables).
 * If none are set, the built-in values below (project "dugu-edutrack") are used.
 * Firebase web API keys are not secret; access is protected by firestore.rules.
 */
import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyD4hjE7UhFfzpBh63XzPwRY9gOhCQfUn8w',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'dugu-edutrack.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'dugu-edutrack',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'dugu-edutrack.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '336963361004',
  appId: env.VITE_FIREBASE_APP_ID || '1:336963361004:web:4cde59e43fee0ad3282dc9',
};

// Primary app used for everything.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Session persistence: closing the browser tab logs the user out.
// (Switch to browserLocalPersistence to stay signed in across visits.)
export const auth = initializeAuth(app, {
  persistence: [browserSessionPersistence, inMemoryPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

// Secondary app used ONLY by Manage Users, so the admin can create a new
// login without being signed out of their own session.
const secondaryApp = getApps().find((a) => a.name === 'SecondaryApp')
  ?? initializeApp(firebaseConfig, 'SecondaryApp');
export const secondaryAuth = getAuth(secondaryApp);

export const db = getFirestore(app);

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };

export const logoutAuth = async () => {
  await auth.signOut();
};
