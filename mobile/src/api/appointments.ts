import apiClient from './client';
import { Appointment } from '../types';

export interface CreateAppointmentPayload {
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: string;
  patientAddress?: string;
  doctorId: string;
  appointmentDate: string;
  slotTime?: string;
  symptoms?: string[];
  notes?: string;
  download?: boolean;
}

export const appointmentsApi = {
  getAll: async (params?: Record<string, any>): Promise<Appointment[]> => {
    const response = await apiClient.get('/api/v1/appointment/getall', { params });
    return response.data.appointments || response.data;
  },

  create: async (payload: CreateAppointmentPayload): Promise<Appointment> => {
    const url = payload.download ? '/api/v1/appointment/post?download=true' : '/api/v1/appointment/post';
    const response = await apiClient.post(url, payload);
    return response.data.appointment || response.data;
  },

  getByPatientId: async (patientId: string): Promise<Appointment[]> => {
    const response = await apiClient.get(`/api/v1/appointment/patient/${patientId}`);
    return response.data.appointments || response.data;
  },

  search: async (query: string): Promise<Appointment[]> => {
    const response = await apiClient.get('/api/v1/appointment/search', {
      params: { q: query },
    });
    return response.data.appointments || response.data;
  },

  getSuggestions: async (query: string) => {
    const response = await apiClient.get('/api/v1/appointment/suggest', {
      params: { query },
    });
    return response.data;
  },

  reschedule: async (appointmentId: string, payload: { appointmentDate: string; slotTime?: string }) => {
    const response = await apiClient.put(`/api/v1/appointment/reschedule/${appointmentId}`, payload);
    return response.data;
  },

  updateStatus: async (appointmentId: string, status: string) => {
    const response = await apiClient.put(`/api/v1/appointment/status/${appointmentId}`, { status });
    return response.data;
  },

  update: async (appointmentId: string, payload: Partial<Appointment>) => {
    const response = await apiClient.put(`/api/v1/appointment/update/${appointmentId}`, payload);
    return response.data;
  },

  delete: async (appointmentId: string) => {
    const response = await apiClient.delete(`/api/v1/appointment/delete/${appointmentId}`);
    return response.data;
  },

  bulkDelete: async (appointmentIds: string[]) => {
    const response = await apiClient.post('/api/v1/appointment/bulk-delete', { appointmentIds });
    return response.data;
  },
};
