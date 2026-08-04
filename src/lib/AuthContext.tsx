import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { initAuth, logoutGoogle } from "./firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  accessToken: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  accessToken: null,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setLoading(false);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const logout = async () => {
    await logoutGoogle();
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, accessToken, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
