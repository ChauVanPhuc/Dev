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
    
    // Nếu là môi trường Cloudflare (smartflowq7.cloud hoặc smartflowg7.cloud)
    if (hostname.includes('smartflowq7.cloud') || hostname.includes('smartflowg7.cloud')) {
      return window.location.origin
    } 
    
    // Nếu là môi trường phát triển trên máy tính (Web browser localhost hoặc IP cục bộ)
    if (port === '1333' || port === '1222' || port === '3000' || port === '5173' || hostname === 'localhost' || hostname.startsWith('192.168.') || hostname === '127.0.0.1') {
      const resolvedHost = (hostname === 'localhost' || hostname === '::1') ? '127.0.0.1' : hostname;
      return `http://${resolvedHost}:8000`
    }

    // Mọi trường hợp khác (App Android, iOS, truy cập từ xa)
    url = window.location.origin || 'https://smartflowq7.cloud'
  }
  return url.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}

export const API_ROOT = `${getBaseURL()}/`
export const API_URL = `${API_ROOT}api/v1/`
const API_BASE_URL = API_URL

export const getFullImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const cleanRoot = API_ROOT ? API_ROOT.replace(/\/$/, '') : ''
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanRoot}${cleanPath}`
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

// Interceptor để tự động gắn Token vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Xử lý đặc biệt cho FormData: Xóa Content-Type để Axios tự động set boundary
  if (config.data instanceof FormData) {
    if (config.headers) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type')
        config.headers.delete('content-type')
      }
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }
  }
  
  return config
}, (error) => {
  return Promise.reject(error)
})

// Interceptor dọn token hỏng / hết hạn khi server trả về 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const reqUrl = String(error?.config?.url || '')
    if (error?.response?.status === 401 && !reqUrl.includes('accounts/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('access_token')
      localStorage.removeItem('smartflow_user')
      localStorage.removeItem('smartflow_active_permissions')
    }
    return Promise.reject(error)
  }
)

export default apiClient
