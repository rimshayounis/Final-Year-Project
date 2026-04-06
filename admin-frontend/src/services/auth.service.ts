import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  login: async (username: string, password: string) => {
    const { data } = await api.post('/auth/admin/login', { username, password });
    return data; // { access_token, admin }
  },

  register: async (payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }) => {
    const { data } = await api.post('/auth/admin/register', payload);
    return data;
  },

  logout: () => {
    localStorage.removeItem('admin_token');
  },

  getProfile: async () => {
    const { data } = await api.get('/auth/admin/profile');
    return data;
  },
};

export default api;