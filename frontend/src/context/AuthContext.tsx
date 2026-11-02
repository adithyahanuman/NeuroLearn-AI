import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User, AuthResponse } from '@/api/types';
import { api, getStoredUser, getStoredToken, clearAuthSession } from '@/api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<AuthResponse>;
  register: (name: string, email: string, pass: string, cohortId?: string) => Promise<AuthResponse>;
  logout: () => void;
  notice: string | null;
  setNotice: (msg: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // If token exists but user doesn't, clear
    if (token && !user) {
      clearAuthSession();
      setToken(null);
    }
  }, [token, user]);

  const login = async (email: string, pass: string): Promise<AuthResponse> => {
    const res = await api.login(email, pass);
    setUser(res.user);
    setToken(res.token);
    setNotice(null);
    return res;
  };

  const register = async (name: string, email: string, pass: string, cohortId?: string): Promise<AuthResponse> => {
    const res = await api.register(name, email, pass, cohortId);
    setUser(res.user);
    setToken(res.token);
    setNotice(null);
    return res;
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
    setNotice(null);
    // Crucial requirement: clear TanStack Query cache so switching accounts never shows stale data
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        notice,
        setNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
