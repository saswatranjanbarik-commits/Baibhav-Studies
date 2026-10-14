/**
 * AuthContext — who is logged in, and with which role.
 *
 * Accounts are created by the Admin on the Manage Users page. Each account has
 * a profile document in the Firestore `users` collection, keyed by lower-case
 * email address: users/{email} → { id, email, username, role, timezone }.
 *
 * SECURITY: a Firebase login on its own is NOT enough to use the app. The
 * account must also have a profile in `users` (or be the primary admin).
 * Anyone else is signed straight back out. The Firestore security rules
 * (firestore.rules) enforce the same thing on the server.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, signInWithEmailAndPassword, logoutAuth } from './firebase';
import { PRIMARY_ADMIN_EMAIL } from '../config/app';
import { markOffline } from './presence';

export interface AppUser {
  id: string;
  email: string;
  username: string;
  role: string;
  timezone: string;
}

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  /** Why the last login was rejected (e.g. account not registered). */
  authError: string | null;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  authError: null,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const isPrimaryAdmin = (email?: string | null) =>
  !!email && email.toLowerCase() === PRIMARY_ADMIN_EMAIL;

const NOT_REGISTERED_MESSAGE =
  'This account has not been added to the app. Please ask the admin to add you on the Manage Users page.';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      const email = user.email.toLowerCase();
      const primaryAdmin = isPrimaryAdmin(email);

      // Defaults, overridden by the stored profile below.
      let appUser: AppUser = {
        id: user.uid,
        email,
        username: user.displayName || email,
        role: primaryAdmin ? 'Admin' : 'Student',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      try {
        const userRef = doc(db, 'users', email);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          appUser = { ...appUser, ...userDoc.data() } as AppUser;
          // The primary admin must always stay Admin.
          if (primaryAdmin && appUser.role !== 'Admin') {
            appUser.role = 'Admin';
            await setDoc(userRef, { role: 'Admin' }, { merge: true });
          }
        } else if (primaryAdmin) {
          // First ever login of the primary admin: create the profile.
          await setDoc(userRef, appUser);
        } else {
          // Not registered by the admin → not allowed in.
          await rejectLogin(NOT_REGISTERED_MESSAGE);
          return;
        }
      } catch (error: any) {
        if (error?.code === 'permission-denied' && !primaryAdmin) {
          // The security rules refused this account.
          await rejectLogin(NOT_REGISTERED_MESSAGE);
          return;
        }
        // Network hiccup etc.: keep the user signed in with default values,
        // exactly as the app did before.
        console.error('Error fetching/updating user profile:', error);
      }

      setAuthError(null);
      setCurrentUser(appUser);
      setLoading(false);
    });

    /** Sign the user out and show a reason on the login page. */
    async function rejectLogin(message: string) {
      setAuthError(message);
      setCurrentUser(null);
      await logoutAuth().catch(() => {});
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const login = async (email?: string, password?: string) => {
    if (!email || !password) throw new Error('Email and password required');
    setAuthError(null);
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const logout = async () => {
    try {
      // Mark offline first: once signed out, the database refuses writes.
      await markOffline(currentUser);
      await logoutAuth();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, authError, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
