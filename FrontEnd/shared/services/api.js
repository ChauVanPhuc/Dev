import axios from 'axios'

/**
 * API Service (Universal Version 4.0)
 * Sử dụng Axios cho mọi nền tảng để đảm bảo tính ổn định tối đa của FormData/File Upload.
 */

// [NEW] Cho phép người dùng cấu hình Server IP thủ công từ ứng dụng
// Nếu không có cấu hình thủ công, mặc định dùng biến môi trường hoặc IP cứng.
const getBaseURL = () => {
  let url = localStorage.getItem('smartflow_api_url')
  if (!url) {
    const hostname = window.location.hostname
    const port = window.location.port
    
    // Nếu đang vào thẳng bằng tên miền dashboard hoặc chính chủ
    if (hostname.includes('smartflowg7.cloud')) {
      return window.location.origin
    } 
    
    // Nếu là môi trường phát triển trên máy tính (Web browser localhost hoặc IP cục bộ)
    if (port === '3000' || port === '5173' || hostname === 'localhost' || hostname.startsWith('192.168.')) {
      return `http://${hostname}:8000`
    }

    // Mọi trường hợp khác (App Android, iOS, truy cập từ xa)
    // Luôn ưu tiên dùng tên miền Production đã cấu hình Cloudflare
    url = 'https://smartflowg7.cloud'
  }
  return url.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}

export const API_ROOT = `${getBaseURL()}/`
export const API_URL = `${API_ROOT}api/v1/`
const API_BASE_URL = API_URL

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json'
  },
  timeout: 15000
})

import useAuthStore from '@mobile/Auth/Models/authModel'

// Interceptor để tự động gắn Token vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token || localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Xử lý đặc biệt cho FormData: Xóa Content-Type để Axios tự động set boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  
  return config
}, (error) => {
  return Promise.reject(error)
})

export default apiClient
