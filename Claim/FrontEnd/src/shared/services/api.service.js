import axios from 'axios';

// Cấu hình cơ sở cho API - Tự động nhận diện IP máy chủ để tránh lỗi CORS
export const getBaseURL = () => {
  const { hostname, port } = window.location;

  if (hostname.includes('smartflowq7.cloud') || hostname.includes('smartflowg7.cloud')) {
    return window.location.origin;
  }

  if (port === '2222' || port === '3333' || port === '5173' || port === '5174' || port === '5175' || port === '3000' || port === '1222' || port === '1333') {
    const resolvedHost = (hostname === 'localhost' || hostname === '::1') ? '127.0.0.1' : hostname;
    return `http://${resolvedHost}:8000`;
  }
  
  return window.location.origin;
};

// Export API_ROOT cho WebSocket (không có /api/v1 prefix)
export const API_ROOT = `${getBaseURL()}/`;
export const API_URL = `${API_ROOT}api/v1/`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000, // 5 phút cho các file lớn
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Intercept requests for authentication tokens
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') {
    token = 'system_auto_token';
    localStorage.setItem('token', token);
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor xử lý phản hồi API
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    if (error.response && error.response.status === 401) {
      localStorage.setItem('token', 'system_auto_token');
    }
    return Promise.reject(error);
  }
);

export default api;
