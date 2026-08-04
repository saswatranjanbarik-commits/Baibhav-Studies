import React, { createContext, useContext, useEffect, useState } from "react";

export interface AppUser {
  id: string;
  username: string;
  role: string;
  timezone: string;
}

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('active_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password?: string) => {
    const usersStr = localStorage.getItem('dugu_users_v2');
    let users = usersStr ? JSON.parse(usersStr) : [
      {
        id: '1',
        username: 'Saswat',
        password: 'admin123',
        role: 'Admin',
        timezone: 'UTC+05:30 (Indian Standard Time)'
      }
    ];

    if (!usersStr) {
      localStorage.setItem('dugu_users_v2', JSON.stringify(users));
    } else {
      // Fix for previously saved users without password
      const adminIndex = users.findIndex((u: any) => u.username === 'Saswat');
      if (adminIndex !== -1 && !users[adminIndex].password) {
        users[adminIndex].password = 'admin123';
        localStorage.setItem('dugu_users_v2', JSON.stringify(users));
      }
    }
    
    // Simple check against stored users
    const user = users.find((u: any) => 
      u.username.toLowerCase().trim() === username.toLowerCase().trim() && 
      u.password === password
    );
    
    if (user) {
      const appUser = { id: user.id, username: user.username, role: user.role, timezone: user.timezone };
      setCurrentUser(appUser);
      localStorage.setItem('active_user', JSON.stringify(appUser));
    } else {
      throw new Error("Invalid username or password");
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('active_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};


