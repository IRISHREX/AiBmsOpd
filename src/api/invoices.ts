import apiClient from './client';
import { Invoice } from '../types';

export const invoicesApi = {
  // 1) Create invoice
  create: async (payload: Partial<Invoice>): Promise<Invoice> => {
    const response = await apiClient.post('/api/v1/invoice/', payload);
    return response.data.invoice || response.data;
  },

  // 2) List invoices
  getAll: async (params?: Record<string, any>): Promise<Invoice[]> => {
    const response = await apiClient.get('/api/v1/invoice', { params });
    return response.data.invoices || response.data;
  },

  // 3) Search invoices
  search: async (q: string): Promise<Invoice[]> => {
    const response = await apiClient.get('/api/v1/invoice/search', { params: { q } });
    return response.data.invoices || response.data;
  },

  // 4) Get by appointment
  getByAppointmentId: async (appointmentId: string): Promise<Invoice[]> => {
    const response = await apiClient.get(`/api/v1/invoice/appointment/${appointmentId}`);
    return response.data.invoices || response.data;
  },

  // 5) Update by appointment
  updateByAppointmentId: async (appointmentId: string, payload: Partial<Invoice>): Promise<{ updatedCount: number, invoices: Invoice[] }> => {
    const response = await apiClient.put(`/api/v1/invoice/appointment/${appointmentId}`, payload);
    return response.data;
  },

  // 6) Get single
  getById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/api/v1/invoice/${id}`);
    return response.data.invoice || response.data;
  },

  // 7) Update single
  update: async (id: string, payload: Partial<Invoice>): Promise<Invoice> => {
    const response = await apiClient.put(`/api/v1/invoice/${id}`, payload);
    return response.data.invoice || response.data;
  },

  // 8) Delete
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/invoice/${id}`);
    return response.data;
  },

  // 9) Stats
  getStats: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/api/v1/invoice/stats', { params });
    return response.data;
  },
};
