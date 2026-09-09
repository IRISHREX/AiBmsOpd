import apiClient from './client';
import { Invoice } from '../types';

export const invoicesApi = {
  getAll: async (params?: Record<string, any>): Promise<Invoice[]> => {
    const response = await apiClient.get('/api/v1/invoice', { params });
    return response.data.invoices || response.data;
  },

  getStats: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/api/v1/invoice/stats', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/api/v1/invoice/${id}`);
    return response.data.invoice || response.data;
  },

  getByAppointmentId: async (appointmentId: string): Promise<Invoice> => {
    const response = await apiClient.get(`/api/v1/invoice/appointment/${appointmentId}`);
    return response.data.invoice || response.data;
  },

  create: async (payload: Partial<Invoice>): Promise<Invoice> => {
    const response = await apiClient.post('/api/v1/invoice', payload);
    return response.data.invoice || response.data;
  },

  update: async (id: string, payload: Partial<Invoice>): Promise<Invoice> => {
    const response = await apiClient.put(`/api/v1/invoice/${id}`, payload);
    return response.data.invoice || response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/invoice/${id}`);
    return response.data;
  },

  settle: async (id: string, paymentDetails?: { paymentMethod?: string; paidAmount?: number }) => {
    const response = await apiClient.post(`/api/v1/invoice/${id}/settle`, paymentDetails);
    return response.data;
  },

  settleByAppointmentId: async (appointmentId: string) => {
    const response = await apiClient.post(`/api/v1/invoice/appointment/${appointmentId}/settle`);
    return response.data;
  },

  getDownloadUrl: (id: string): string => {
    return `${apiClient.defaults.baseURL}/api/v1/invoice/${id}/download`;
  },
};
