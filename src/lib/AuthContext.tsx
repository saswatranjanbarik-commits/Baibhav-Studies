import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, logoutAuth } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

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
  login: (email?: string, password?: string) => Promise<void>;
  signUp: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => {},
  signUp: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.email) {
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        let appUser: AppUser = {
          id: user.uid,
          email: user.email,
          username: user.displayName || user.email || 'User',
          role: user.email === 'saswatranjanbarik@gmail.com' ? 'Admin' : 'Student',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        try {
          const userRef = doc(db, 'users', user.email.toLowerCase());
          let userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            await setDoc(userRef, appUser);
          } else {
            const data = userDoc.data();
            appUser = { ...appUser, ...data } as AppUser;
            
            if (user.email === 'saswatranjanbarik@gmail.com' && appUser.role !== 'Admin') {
              appUser.role = 'Admin';
              await setDoc(userRef, appUser, { merge: true });
            }
          }
        } catch (error) {
          console.error("Error fetching/updating user in Firestore:", error);
        }
        
        setCurrentUser(appUser);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email?: string, password?: string) => {
    try {
      if (!email || !password) throw new Error("Email and password required");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const signUp = async (email?: string, password?: string) => {
    try {
      if (!email || !password) throw new Error("Email and password required");
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Signup failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutAuth();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, signUp, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
