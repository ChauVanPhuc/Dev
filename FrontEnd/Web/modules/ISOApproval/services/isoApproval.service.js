import api from '@webShared/Services/api.service';

/**
 * Service giao tiếp với API Backend của Module ISO Approvals (Hồ sơ cần duyệt)
 */
export const isoApprovalService = {
  /**
   * Lấy số liệu thống kê tổng quan (Chờ duyệt, Đã duyệt, Từ chối, Tổng số)
   */
  getStats: async () => {
    return await api.get('/iso-approvals/stats');
  },

  /**
   * Lấy danh sách hồ sơ với các bộ lọc linh hoạt
   * @param {Object} params - { status, item_type, department, keyword }
   */
  getItems: async (params = {}) => {
    return await api.get('/iso-approvals/list', { params });
  },

  /**
   * Lấy chi tiết toàn bộ thông tin một hồ sơ (văn bản sections, steps, checklist, revision logs, approval logs)
   * @param {string} itemType - 'document' | 'process'
   * @param {number|string} id - ID của hồ sơ
   */
  getItemDetail: async (itemType, id) => {
    return await api.get(`/iso-approvals/detail/${itemType}/${id}`);
  },

  /**
   * Phê duyệt hồ sơ (chuyển sang 'Hiệu lực' và lưu log)
   * @param {Object} payload - { item_type, item_id, comment, approver_name, approver_username }
   */
  approveItem: async (payload) => {
    return await api.post('/iso-approvals/approve', payload);
  },

  /**
   * Từ chối / Yêu cầu sửa đổi hồ sơ (bắt buộc nêu lý do)
   * @param {Object} payload - { item_type, item_id, comment, approver_name, approver_username }
   */
  rejectItem: async (payload) => {
    return await api.post('/iso-approvals/reject', payload);
  },

  /**
   * Phê duyệt hàng loạt nhiều hồ sơ cùng lúc
   * @param {Object} payload - { items: [{item_type, item_id}], comment, approver_name, approver_username }
   */
  batchApprove: async (payload) => {
    return await api.post('/iso-approvals/batch-approve', payload);
  },

  /**
   * Chuyển cấp hoặc người duyệt khác
   * @param {Object} payload - { item_type, item_id, new_approver_name, new_approver_role, note, forwarded_by }
   */
  forwardItem: async (payload) => {
    return await api.post('/iso-approvals/forward', payload);
  },

  /**
   * Lấy lịch sử phê duyệt (Audit Trail) của hồ sơ
   * @param {string} itemType - 'document' | 'process'
   * @param {number|string} id - ID của hồ sơ
   */
  getApprovalHistory: async (itemType, id) => {
    return await api.get(`/iso-approvals/history/${itemType}/${id}`);
  }
};

export default isoApprovalService;
