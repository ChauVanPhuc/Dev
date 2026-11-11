import api from '@webShared/Services/api.service';

// Helper đảm bảo tương thích dù axios interceptor đã unwrap response.data hay chưa
const unwrap = (res) => {
  if (
    res &&
    typeof res === 'object' &&
    res.data !== undefined &&
    res.groups === undefined &&
    res.batches === undefined &&
    res.factories === undefined &&
    res.items === undefined &&
    res.id === undefined
  ) {
    return res.data;
  }
  return res;
};

export const dailyProductionService = {
  /**
   * Lấy danh mục động từ CSDL (Nhà máy, Công đoạn, Cụm chi tiết BOM, Kế hoạch SX, Màu sơn)
   */
  getMetadata: async () => {
    const res = await api.get('daily-production/metadata');
    return unwrap(res);
  },

  /**
   * Lấy danh sách PO gốc và từng Cont lẻ bên trong từ CSDL để chọn gộp
   */
  getAvailableContainers: async (params = {}) => {
    const res = await api.get('daily-production/available-containers', { params });
    return unwrap(res);
  },

  /**
   * Xem trước kết quả gộp các Cont đã chọn (cộng dồn Tủ & tính SLKH chi tiết BOM từ CSDL)
   */
  previewMergedContainers: async (payload) => {
    const res = await api.post('daily-production/preview-merge', payload);
    return unwrap(res);
  },

  /**
   * Lấy danh sách các bảng "Hôm nay sản xuất gì"
   */
  getBatches: async (params = {}) => {
    const res = await api.get('daily-production/batches', { params });
    return unwrap(res);
  },

  /**
   * Lấy chi tiết 1 bảng sản xuất ngày
   */
  getBatchDetail: async (batchId, params = {}) => {
    const res = await api.get(`daily-production/batches/${batchId}`, { params });
    return unwrap(res);
  },

  /**
   * Tạo mới 1 bảng gộp Cont & Custom "Hôm nay sản xuất gì"
   */
  createBatch: async (payload) => {
    const res = await api.post('daily-production/batches', payload);
    return unwrap(res);
  },

  /**
   * Cập nhật thông tin bảng gộp Cont & danh sách chi tiết
   */
  updateBatch: async (batchId, payload) => {
    const res = await api.put(`daily-production/batches/${batchId}`, payload);
    return unwrap(res);
  },

  /**
   * Custom nhanh các dòng hiển thị (bật/tắt is_visible, sửa SLKH, sửa Ghi chú, thêm dòng mới)
   */
  quickUpdateBatchItems: async (batchId, payload) => {
    const res = await api.patch(`daily-production/batches/${batchId}/items`, payload);
    return unwrap(res);
  },

  /**
   * Xóa bảng sản xuất ngày
   */
  deleteBatch: async (batchId) => {
    const res = await api.delete(`daily-production/batches/${batchId}`);
    return unwrap(res);
  }
};
