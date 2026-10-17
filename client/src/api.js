import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ledgerly_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const onAuthPage = window.location.pathname === '/login';
    if (error.response?.status === 401 && !onAuthPage) {
      localStorage.removeItem('ledgerly_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (err) =>
  err?.response?.data?.message || 'Could not reach the server. Check your connection and try again.';

export default api;
