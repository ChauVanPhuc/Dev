/**
 * File: api.js
 * Tự động comment: File này thuộc mô hình dự án, phụ trách api.
 */
import axios from 'axios';

/**
 * Cấu hình Axios Instance dùng chung cho toàn bộ ứng dụng.
 * - baseURL: Đường dẫn cơ sở tới API Backend (FastAPI).
 * - headers: Các tiêu đề mặc định cho mọi request.
 */
// [NEW] Tự động nhận diện URL API thông minh
const getBaseURL = () => {
  const hostname = window.location.hostname;
  if (hostname.includes('smartflowq7.cloud') || hostname.includes('smartflowg7.cloud')) {
    return window.location.origin;
  }
  const resolvedHost = (hostname === 'localhost' || hostname === '::1') ? '127.0.0.1' : hostname;
  return `http://${resolvedHost}:8000`;
};

const API_BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json', // Đảm bảo dữ liệu gửi đi và nhận về là định dạng JSON
  },
});

export default api;

