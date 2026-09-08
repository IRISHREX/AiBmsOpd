import axios from 'axios';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

// Reschedule appointment to a new date
export const rescheduleAppointment = async (appointmentId, newDate) => {
  try {
    const { data } = await api.put(`/api/v1/appointment/reschedule/${appointmentId}`, {
      appointment_date: newDate,
    });
    return data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to reschedule appointment' };
  }
};

export default api;
