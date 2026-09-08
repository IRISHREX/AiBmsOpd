import apiClient from './client';
import { Message } from '../types';

export const messagesApi = {
  getAll: async (params?: Record<string, any>): Promise<Message[]> => {
    const response = await apiClient.get('/api/v1/message/getall', { params });
    return response.data.messages || response.data;
  },

  getByDoctorId: async (doctorId: string): Promise<Message[]> => {
    const response = await apiClient.get(`/api/v1/message/doctor/${doctorId}`);
    return response.data.messages || response.data;
  },

  search: async (query: string): Promise<Message[]> => {
    const response = await apiClient.get('/api/v1/message/search', {
      params: { q: query },
    });
    return response.data.messages || response.data;
  },

  send: async (payload: { recipientPhone: string; message: string; doctorId?: string; patientId?: string }) => {
    const response = await apiClient.post('/api/v1/message/send', payload);
    return response.data;
  },
};
