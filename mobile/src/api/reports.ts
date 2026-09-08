import apiClient from './client';
import { Report } from '../types';

export const reportsApi = {
  getAll: async (params?: Record<string, any>): Promise<Report[]> => {
    const response = await apiClient.get('/api/v1/reports', { params });
    return response.data.reports || response.data;
  },

  getSummary: async (groupBy = 'day', params?: Record<string, any>) => {
    const response = await apiClient.get('/api/v1/reports/summary', {
      params: { groupBy, ...params },
    });
    return response.data;
  },

  update: async (id: string, payload: Partial<Report>) => {
    const response = await apiClient.put(`/api/v1/reports/${id}`, payload);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/reports/${id}`);
    return response.data;
  },
};
