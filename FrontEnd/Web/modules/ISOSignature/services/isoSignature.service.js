import api from '@webShared/Services/api.service';

/**
 * Service API cho Module Quản lý Chữ ký ISO (SmartFlow)
 * Truy vấn và thao tác dữ liệu 100% trực tiếp từ CSDL Database Backend qua RESTful API.
 * Tuyệt đối không dùng dữ liệu mock cứng.
 */

export const isoSignatureService = {
  /**
   * Lấy số liệu thống kê KPI chữ ký từ CSDL
   */
  getStats: async () => {
    return await api.get('/iso-signatures/stats');
  },

  /**
   * Lấy danh sách chữ ký kèm bộ lọc từ CSDL
   */
  getSignatures: async (params = {}) => {
    const res = await api.get('/iso-signatures/list', { params });
    return Array.isArray(res) ? res : [];
  },

  /**
   * Lấy chi tiết một chữ ký theo ID từ CSDL
   */
  getSignatureDetail: async (id) => {
    return await api.get(`/iso-signatures/${id}`);
  },

  /**
   * Tạo mới chữ ký và lưu vào CSDL
   */
  createSignature: async (payload) => {
    return await api.post('/iso-signatures/create', payload);
  },

  /**
   * Cập nhật thông tin chữ ký trong CSDL
   */
  updateSignature: async (id, payload) => {
    return await api.put(`/iso-signatures/${id}`, payload);
  },

  /**
   * Đổi trạng thái kích hoạt / tạm khóa trong CSDL
   */
  toggleStatus: async (id) => {
    return await api.patch(`/iso-signatures/${id}/toggle-status`);
  },

  /**
   * Xóa chữ ký khỏi CSDL
   */
  deleteSignature: async (id) => {
    return await api.delete(`/iso-signatures/${id}`);
  },

  /**
   * Tải tệp hình ảnh chữ ký lên máy chủ
   */
  uploadSignatureImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/iso-signatures/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default isoSignatureService;
