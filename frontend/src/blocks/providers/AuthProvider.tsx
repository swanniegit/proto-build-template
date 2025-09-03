/**
 * @file The new, refactored AuthProvider using LEGO blocks.
 * @coder Gemini
 * @category Controller Block
 */
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, LoginRequest, RegisterRequest } from '../types/auth';
import { authApi } from '../bridges/authApi';
import { tokenStorage } from '../bridges/tokenStorage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initializeAuth = useCallback(async () => {
    const token = tokenStorage.getToken();
    if (token) {
      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        tokenStorage.removeToken(); // Token is invalid
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    tokenStorage.setToken(response.access_token);
    setUser(response.user);
  };

  const register = async (userData: RegisterRequest) => {
    const response = await authApi.register(userData);
    tokenStorage.setToken(response.access_token);
    setUser(response.user);
  };

  const logout = () => {
    tokenStorage.removeToken();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    const updatedUser = await authApi.updateProfile(updates);
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
