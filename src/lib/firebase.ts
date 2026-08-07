import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged, browserSessionPersistence, inMemoryPersistence, browserPopupRedirectResolver } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Custom Firebase project configuration
const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyD4hjE7UhFfzpBh63XzPwRY9gOhCQfUn8w",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "dugu-edutrack.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "dugu-edutrack",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "dugu-edutrack.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "336963361004",
  appId: env.VITE_FIREBASE_APP_ID || "1:336963361004:web:4cde59e43fee0ad3282dc9"
};

// Primary App for normal usage
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: [browserSessionPersistence, inMemoryPersistence],
  popupRedirectResolver: browserPopupRedirectResolver
});

// Secondary App exclusively for Admin to create users without being signed out
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);

export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const logoutAuth = async () => {
  await auth.signOut();
};
