import apiClient from './client';
import { User } from '../types';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/v1/user/all');
    return response.data.users || response.data;
  },

  getPatients: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/v1/user/patients');
    return response.data.patients || response.data;
  },

  getPatientById: async (patientId: string): Promise<User> => {
    const response = await apiClient.get(`/api/v1/user/patient/${patientId}`);
    return response.data.patient || response.data;
  },

  updatePatient: async (patientId: string, payload: Partial<User>) => {
    const response = await apiClient.put(`/api/v1/appointment/patient/update/${patientId}`, payload);
    return response.data;
  },

  getCompounders: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/v1/user/compounders');
    return response.data.compounders || response.data;
  },

  addCompounder: async (payload: Partial<User> & { password?: string }) => {
    const response = await apiClient.post('/api/v1/user/compounder/addnew', payload);
    return response.data;
  },

  updateCompounder: async (id: string, payload: Partial<User>) => {
    const response = await apiClient.put(`/api/v1/user/compounder/update/${id}`, payload);
    return response.data;
  },

  updateRole: async (userId: string, role: string) => {
    const response = await apiClient.put(`/api/v1/user/role/${userId}`, { role });
    return response.data;
  },

  changePassword: async (payload: { userId: string; newPassword: string }) => {
    const response = await apiClient.post('/api/v1/user/change-password', payload);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await apiClient.delete(`/api/v1/user/user/${userId}`);
    return response.data;
  },
};
