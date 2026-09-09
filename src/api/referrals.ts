import apiClient from './client';
import { Referral, Hospital } from '../types';

export const referralsApi = {
  getAll: async (params?: Record<string, any>): Promise<Referral[]> => {
    const response = await apiClient.get('/api/v1/referral/all', { params });
    return response.data.referrals || response.data;
  },

  create: async (payload: Partial<Referral>): Promise<Referral> => {
    const response = await apiClient.post('/api/v1/referral/create', payload);
    return response.data.referral || response.data;
  },

  update: async (id: string, payload: Partial<Referral>): Promise<Referral> => {
    const response = await apiClient.put(`/api/v1/referral/update/${id}`, payload);
    return response.data.referral || response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/referral/delete/${id}`);
    return response.data;
  },

  getHospitals: async (limit = 50): Promise<Hospital[]> => {
    const response = await apiClient.get('/api/v1/hospital/all', {
      params: { limit },
    });
    return response.data.hospitals || response.data;
  },
};
