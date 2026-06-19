import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const { token, schoolId } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (schoolId) {
    config.headers['X-School-ID'] = schoolId;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // If we get an unauthorized error and have a refresh mechanism
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
    }
    return Promise.reject(error);
  }
);
