import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default to environment variable or fallback to deployed Render endpoint
export const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  'https://bms-opd-be.onrender.com';

export const AUTH_TOKEN_KEY = '@bms_opd_token';
export const USER_DATA_KEY = '@bms_opd_user';

export const apiClient: AxiosInstance = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor: inject Bearer token into outgoing requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Error reading auth token from storage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: handle 401 unauthenticated
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(USER_DATA_KEY);
      } catch (e) {
        console.warn('Error clearing auth storage:', e);
      }
    }
    return Promise.reject(error);
  }
);

export const setBaseUrl = (url: string) => {
  apiClient.defaults.baseURL = url;
};

export const saveAuthToken = async (token: string) => {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const getStoredAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
};

export const clearAuthStorage = async () => {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
};

export default apiClient;
