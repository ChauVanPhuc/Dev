import api, { getFullImageUrl } from '@webShared/Services/api.service';

export const feedbackService = {
  // Lấy danh sách phiếu báo cáo sự cố & góp ý
  getReports: async (params = {}) => {
    return await api.get('/quick-reports/', { params });
  },

  // Lấy chi tiết 1 phiếu
  getReportById: async (id) => {
    return await api.get(`/quick-reports/${id}`);
  },

  // Cập nhật trạng thái / phản hồi
  updateReport: async (id, data) => {
    return await api.put(`/quick-reports/${id}`, data);
  },

  // Xóa phiếu
  deleteReport: async (id) => {
    return await api.delete(`/quick-reports/${id}`);
  },

  // Duyệt hàng loạt
  batchConfirm: async (ids, status = 'Đã xong', handlerName = 'Ban Quản Lý') => {
    return await api.post('/quick-reports/batch-confirm', {
      ids,
      status,
      handler_name: handlerName
    });
  },

  // AI Local Gemini phân tích giải pháp
  generateAI: async (payload) => {
    return await api.post('/quick-reports/generate-ai', payload);
  },

  // Tải file hình ảnh lên server
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/quick-reports/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Lấy URL đầy đủ cho file âm thanh / ảnh
  formatMediaUrl: (path) => {
    return getFullImageUrl(path);
  }
};
