import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authApi } from '../api/auth';
import { setBaseUrl, DEFAULT_API_BASE_URL, AUTH_TOKEN_KEY, USER_DATA_KEY } from '../api/client';

const BACKEND_URL_STORAGE_KEY = '@bms_opd_backend_url';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  backendUrl: string;
  login: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setCustomBackendUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendUrl, setBackendUrlState] = useState<string>(DEFAULT_API_BASE_URL);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Load custom backend URL if previously configured by the user
        const storedUrl = await AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY);
        if (storedUrl) {
          setBackendUrlState(storedUrl);
          setBaseUrl(storedUrl);
        }

        // Check for stored token and restore user profile
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          const cachedUser = await AsyncStorage.getItem(USER_DATA_KEY);
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          }
          // Fetch fresh user profile in background
          try {
            const freshUser = await authApi.getCurrentUser();
            setUser(freshUser);
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(freshUser));
          } catch (e) {
            console.log('Background session check failed, using cached session:', e);
          }
        }
      } catch (e) {
        console.warn('Failed to restore auth session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email: string, password: string, role = 'Doctor') => {
    const response = await authApi.login({ email, password, role });
    const loggedUser = response.user;
    setUser(loggedUser);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(loggedUser));
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authApi.getCurrentUser();
      setUser(freshUser);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(freshUser));
    } catch (e) {
      console.warn('Refresh user failed:', e);
    }
  };

  const setCustomBackendUrl = async (url: string) => {
    const formattedUrl = url.trim().replace(/\/+$/, '');
    setBackendUrlState(formattedUrl);
    setBaseUrl(formattedUrl);
    await AsyncStorage.setItem(BACKEND_URL_STORAGE_KEY, formattedUrl);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        backendUrl,
        login,
        logout,
        refreshUser,
        setCustomBackendUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
