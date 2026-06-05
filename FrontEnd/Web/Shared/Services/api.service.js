import axios from 'axios';

// Cấu hình cơ sở cho API - Tự động nhận diện IP máy chủ để tránh lỗi CORS
export const getBaseURL = () => {
  // Nếu đang chạy ở môi trường Dev (Vite thường dùng cổng 5173 hoặc 3000)
  // chúng ta cần trỏ cứng về cổng 8000 của BackEnd
  const { hostname, port } = window.location;
  if (port === '5173' || port === '3000') {
    return `http://${hostname}:8000`;
  }
  
  // Nếu đang chạy Production (đã build) hoặc qua Ngrok, dùng đường dẫn tương đối
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

// Intercept requests and return mock data if in preview mode
api.interceptors.request.use((config) => {
  const isPreview = window.__IS_PREVIEW__ === true || window.location.search.includes('preview=true');
  if (isPreview) {
    const url = config.url || '';
    let mockResponse = null;

    if (url.includes('/accounts/')) {
      mockResponse = {
        items: [
          { id: 1, employee_id: 'NV001', full_name: 'Nguyễn Văn A (Demo/Mock)', role_name: 'IT', username: 'admin', status: 'Đang sử dụng', created_at: '2026-05-01' },
          { id: 2, employee_id: 'NV002', full_name: 'Trần Thị B (Demo/Mock)', role_name: 'Tổ trưởng', stage_name: 'Cưa xẻ', username: 'tranb', status: 'Đang sử dụng', created_at: '2026-05-02' },
          { id: 3, employee_id: 'NV003', full_name: 'Lê Văn C (Demo/Mock)', role_name: 'Công nhân', stage_name: 'Gia công', username: 'levanc', status: 'Dừng hoạt động', created_at: '2026-05-03' }
        ],
        total: 3
      };
    } else if (url.includes('/roles/')) {
      mockResponse = [
        { id: 1, name: 'IT', description: 'IT Admin' },
        { id: 2, name: 'Tổ trưởng', description: 'Tổ trưởng sản xuất' },
        { id: 3, name: 'Công nhân', description: 'Công nhân trực tiếp' }
      ];
    } else if (url.includes('/plans/')) {
      mockResponse = {
        items: [
          { id: 1, plan_code: 'KH-2026-001', name: 'Kế hoạch sản xuất gỗ Sồi (Demo)', status: 'Đang chạy', start_date: '2026-06-01', end_date: '2026-06-30' },
          { id: 2, plan_code: 'KH-2026-002', name: 'Kế hoạch bổ sung gỗ Thông (Demo)', status: 'Đã hoàn thành', start_date: '2026-05-15', end_date: '2026-05-25' }
        ],
        total: 2
      };
    } else if (url.includes('/orders/')) {
      mockResponse = {
        items: [
          { id: 1, order_code: 'PO-2026-091', customer_name: 'Cty Gỗ An Cường (Demo)', status: 'Đang sản xuất', quantity: 1500 },
          { id: 2, order_code: 'PO-2026-092', customer_name: 'Cty Nội thất Hòa Phát (Demo)', status: 'Đã giao', quantity: 800 }
        ],
        total: 2
      };
    } else if (url.includes('/deliveries/')) {
      mockResponse = {
        items: [
          { id: 1, delivery_code: 'GN-0982', plan_code: 'KH-2026-001', driver_name: 'Trần Văn Tải (Demo)', status: 'Đang vận chuyển' },
          { id: 2, delivery_code: 'GN-0983', plan_code: 'KH-2026-001', driver_name: 'Lê Thế Hoàng (Demo)', status: 'Đã giao' }
        ],
        total: 2
      };
    } else if (url.includes('/master-products/')) {
      mockResponse = {
        items: [
          { id: 1, product_code: 'SP-OAK-01', name: 'Gỗ sồi Mỹ nhập khẩu (Demo)', size: '20x120x2400', unit: 'Thanh' },
          { id: 2, product_code: 'SP-PINE-02', name: 'Gỗ thông ghép thanh (Demo)', size: '18x1220x2440', unit: 'Tấm' }
        ],
        total: 2
      };
    } else if (url.includes('/defect-types')) {
      mockResponse = [
        { id: 1, name: 'Bề mặt xước (Mock)', category: 'visual', needs_tracking: true, is_active: true },
        { id: 2, name: 'Lệch màu (Mock)', category: 'visual', needs_tracking: false, is_active: true },
        { id: 3, name: 'Nứt tét (Mock)', category: 'structure', needs_tracking: true, is_active: true },
        { id: 4, name: 'Lẫn tạp chất (Mock)', category: 'material', needs_tracking: false, is_active: true },
        { id: 5, name: 'Độ ẩm cao (Mock)', category: 'material', needs_tracking: true, is_active: true }
      ];
    } else {
      mockResponse = { items: [], total: 0 };
    }

    config.adapter = () => {
      return Promise.resolve({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config
      });
    };
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Thêm interceptor để xử lý lỗi hoặc token nếu cần
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
