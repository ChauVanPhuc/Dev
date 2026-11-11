import api from '@webShared/Services/api.service';

/**
 * Service kết nối dữ liệu Quét Container (CW03) từ /pallet-check-v1 với CSDL Backend
 */
const containerScanService = {
  // Lấy danh sách containers (có tìm kiếm, lọc, phân trang)
  getContainers: (params = {}) => {
    return api.get('/pallet-check/containers', { params });
  },

  // Lấy số liệu thống kê tổng quan (4 KPI cards)
  getStats: () => {
    return api.get('/pallet-check/stats');
  },

  // Lấy chi tiết container kèm 20 pallets
  getContainerDetail: (containerId) => {
    return api.get(`/pallet-check/containers/${containerId}`);
  },

  // Cập nhật thông tin container hoặc danh sách pallets (Admin)
  updateContainer: (containerId, data) => {
    return api.put(`/pallet-check/containers/${containerId}`, data);
  },

  // Xóa container khỏi CSDL
  deleteContainer: (containerId) => {
    return api.delete(`/pallet-check/containers/${containerId}`);
  }
};

export default containerScanService;

