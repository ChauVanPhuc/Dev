import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const feedbackService = {
  // Lấy mã phiếu tiếp theo (VD: BC03, BC04)
  getNextCode: async () => {
    const response = await api.get('/quick-reports/next-code');
    return response.data;
  },

  // Lấy danh sách Phòng Ban từ Database (Roles)
  getRoles: async () => {
    const response = await api.get('/roles/');
    return response.data;
  },

  // Lấy danh sách Bộ Phận từ Database (Departments)
  getDepartments: async (params = {}) => {
    const response = await api.get('/departments/', { params });
    return response.data;
  },

  // Lấy danh sách phiếu báo cáo / góp ý kèm bộ lọc
  getReports: async (params = {}) => {
    const response = await api.get('/quick-reports/', { params });
    return response.data;
  },

  // Tạo mới báo cáo sự cố / feedback
  createReport: async (payload) => {
    const response = await api.post('/quick-reports/', payload);
    return response.data;
  },

  // Lấy chi tiết một phiếu
  getReportById: async (id) => {
    const response = await api.get(`/quick-reports/${id}`);
    return response.data;
  },

  // Cập nhật trạng thái / phản hồi của phiếu
  updateReport: async (id, data) => {
    const response = await api.put(`/quick-reports/${id}`, data);
    return response.data;
  },

  // Xóa phiếu báo cáo
  deleteReport: async (id) => {
    const response = await api.delete(`/quick-reports/${id}`);
    return response.data;
  },

  // Duyệt nhanh nhiều phiếu cùng lúc
  batchConfirm: async (ids, status = 'Đã xong', handlerName = 'Quản lý QC') => {
    const response = await api.post('/quick-reports/batch-confirm', {
      ids,
      status,
      handler_name: handlerName
    });
    return response.data;
  },

  // Tạo giải pháp tự động với AI Local Gemini
  generateAI: async (payload) => {
    const response = await api.post('/quick-reports/generate-ai', payload);
    return response.data;
  },

  // Tải file ghi âm âm thanh lên server
  uploadAudio: async (audioBlob, fileName = 'recording.webm') => {
    const formData = new FormData();
    formData.append('file', audioBlob, fileName);
    const response = await api.post('/quick-reports/upload-audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Tải file hình ảnh lên server
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/quick-reports/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};
