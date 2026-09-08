import apiClient, { saveAuthToken, clearAuthStorage } from './client';
import { User } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
  role?: string;
}

export interface LoginResponse {
  token?: string;
  user: User;
  message?: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post('/api/v1/user/login', credentials);
    if (response.data.token) {
      await saveAuthToken(response.data.token);
    }
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/api/v1/user/dashboard/me');
    return response.data.user || response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.get('/api/v1/user/admin/logout');
    } catch (e) {
      console.warn('Backend logout call failed or expired, proceeding with local clean up', e);
    } finally {
      await clearAuthStorage();
    }
  },

  changeOwnPassword: async (passwords: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.post('/api/v1/user/change-own-password', passwords);
    return response.data;
  },

  registerAdmin: async (adminData: Partial<User> & { password: string }) => {
    const response = await apiClient.post('/api/v1/user/admin/addnew', adminData);
    return response.data;
  },
};
