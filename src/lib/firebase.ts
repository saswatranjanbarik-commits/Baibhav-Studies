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
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  setPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';

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

// Stay signed in (v1.3): the login is remembered on this device until "Exit".
// The login page's "Keep me signed in" box can switch a single login to
// session-only (ends when the browser is closed) — see rememberLogin().
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

/** Choose whether the next login is remembered on this device. */
export const rememberLogin = (keep: boolean) =>
  setPersistence(auth, keep ? browserLocalPersistence : browserSessionPersistence);

// Secondary app used ONLY by Manage Users, so the admin can create a new
// login without being signed out of their own session.
const secondaryApp = getApps().find((a) => a.name === 'SecondaryApp')
  ?? initializeApp(firebaseConfig, 'SecondaryApp');
export const secondaryAuth = getAuth(secondaryApp);

// Offline support (v1.3): keep a copy of the database on this device so the
// app can open and show data without internet. Falls back to the normal
// in-memory cache where the browser doesn't allow it (e.g. some private modes).
function createDb(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    console.warn('Offline cache unavailable, using memory cache:', e);
    return getFirestore(app);
  }
}
export const db = createDb();

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };

export const logoutAuth = async () => {
  await auth.signOut();
};
