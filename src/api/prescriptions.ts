import apiClient from './client';
import { Medicine } from '../types';

export const prescriptionsApi = {
  getMedicines: async (page = 1, limit = 50): Promise<{ medicines: Medicine[]; total: number }> => {
    const response = await apiClient.get('/api/v1/medical', {
      params: { page, limit },
    });
    return response.data;
  },

  getAllMedicines: async (): Promise<Medicine[]> => {
    const response = await apiClient.get('/api/v1/medicine/getall');
    return response.data.medicines || response.data;
  },

  searchByName: async (name: string): Promise<Medicine[]> => {
    const response = await apiClient.get(`/api/v1/medicine/search/name?name=${encodeURIComponent(name)}`);
    return response.data.medicines || response.data;
  },

  searchByComposition: async (composition: string): Promise<Medicine[]> => {
    const response = await apiClient.get(
      `/api/v1/medicine/search/composition?composition=${encodeURIComponent(composition)}`
    );
    return response.data.medicines || response.data;
  },

  addMedicine: async (payload: Partial<Medicine>) => {
    const response = await apiClient.post('/api/v1/medicine/add', payload);
    return response.data;
  },

  addBulkMedicines: async (medicines: Partial<Medicine>[]) => {
    const response = await apiClient.post('/api/v1/medicine/add/bulk', { medicines });
    return response.data;
  },

  updateMedicine: async (id: string, payload: Partial<Medicine>) => {
    const response = await apiClient.put(`/api/v1/medicine/update/${id}`, payload);
    return response.data;
  },

  deleteMedicine: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/medicine/delete/${id}`);
    return response.data;
  },

  getSymptomSuggestions: async (query?: string) => {
    const response = await apiClient.get('/api/v1/medical/suggestions/symptoms', {
      params: { query },
    });
    return response.data.suggestions || response.data;
  },

  advanceSearchSymptoms: async (query: string) => {
    const response = await apiClient.get('/api/v1/medical/advance-search-symptoms', {
      params: { query },
    });
    return response.data;
  },
};
