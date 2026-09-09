import apiClient from './client';
import { Doctor, CapacitySlot } from '../types';

export const doctorsApi = {
  getAll: async (): Promise<Doctor[]> => {
    const response = await apiClient.get('/api/v1/user/doctors');
    return response.data.doctors || response.data;
  },

  getList: async (): Promise<Doctor[]> => {
    const response = await apiClient.get('/api/v1/user/doctors/list');
    return response.data.doctors || response.data;
  },

  getById: async (id: string): Promise<Doctor> => {
    const response = await apiClient.get(`/api/v1/user/doctor/${id}`);
    return response.data.doctor || response.data;
  },

  search: async (query: string): Promise<Doctor[]> => {
    const response = await apiClient.get(`/api/v1/user/doctor/search?query=${encodeURIComponent(query)}`);
    return response.data.doctors || response.data;
  },

  addNew: async (formData: FormData | Partial<Doctor>) => {
    const headers = formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const response = await apiClient.post('/api/v1/user/doctor/addnew', formData, { headers });
    return response.data;
  },

  update: async (id: string, formData: FormData | Partial<Doctor>) => {
    const headers = formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const response = await apiClient.put(`/api/v1/user/doctor/update/${id}`, formData, { headers });
    return response.data;
  },

  getCapacity: async (params: { doctorId: string; date: string }): Promise<CapacitySlot> => {
    const response = await apiClient.get('/api/v1/capacity', { params });
    return response.data;
  },

  setCapacity: async (payload: { doctorId: string; date: string; capacity: number; slots?: string[] }) => {
    const response = await apiClient.post('/api/v1/capacity/set', payload);
    return response.data;
  },

  getCapacityScheduler: async (params?: { month?: string; doctorId?: string }) => {
    const response = await apiClient.get('/api/v1/capacity-scheduler', { params });
    return response.data;
  },
};
