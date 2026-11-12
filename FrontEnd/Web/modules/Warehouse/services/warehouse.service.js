import api from '@webShared/Services/api.service';

/**
 * Service xử lý giao tiếp API cho phân hệ Quản lý Kho (Warehouse)
 * Cung cấp khung phương thức sẵn sàng mở rộng cho Nhập kho, Xuất kho và Quản lý kho.
 */
export const warehouseService = {
  // --- Nghiệp vụ Nhập kho (Goods Receipt) ---
  getGoodsReceipts: async (params = {}) => {
    // Sẵn sàng tích hợp API khi backend công bố endpoint
    return { data: [], total: 0, page: 1, limit: 20 };
  },

  getGoodsReceiptById: async (id) => {
    return null;
  },

  // --- Nghiệp vụ Xuất kho (Goods Issue) ---
  getGoodsIssues: async (params = {}) => {
    // Sẵn sàng tích hợp API khi backend công bố endpoint
    return { data: [], total: 0, page: 1, limit: 20 };
  },

  getGoodsIssueById: async (id) => {
    return null;
  },

  // --- Nghiệp vụ Quản lý kho (Warehouse Management / Inventory) ---
  getWarehouses: async () => {
    // Sẵn sàng tích hợp API khi backend công bố endpoint
    return [];
  },

  getInventoryStatus: async (params = {}) => {
    return { items: [], totalCount: 0 };
  }
};

export default warehouseService;
