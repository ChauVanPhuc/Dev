import api from '@webShared/Services/api.service';

export const purchasingService = {
  // ===== Đơn đặt mua (Purchase Requisitions) =====
  
  getRequisitions: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.append('skip', params.skip);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.status) query.append('status', params.status);
    if (params.warehouse_status) query.append('warehouse_status', params.warehouse_status);
    if (params.search) query.append('search', params.search);
    if (params.supplier_code) query.append('supplier_code', params.supplier_code);
    if (params.supplier_name) query.append('supplier_name', params.supplier_name);
    if (params.order_type) query.append('order_type', params.order_type);
    if (params.month) query.append('month', params.month);
    return await api.get(`/purchase-requisitions/?${query.toString()}`);
  },

  getShippingMonitoring: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.append('skip', params.skip);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.search) query.append('search', params.search);
    return await api.get(`/purchase-requisitions/shipping-monitoring?${query.toString()}`);
  },

  getRequisitionStats: async () => {
    return await api.get('/purchase-requisitions/stats');
  },

  getRequisitionById: async (id) => {
    return await api.get(`/purchase-requisitions/${id}`);
  },

  createRequisition: async (data) => {
    return await api.post('/purchase-requisitions/', data);
  },

  updateRequisition: async (id, data) => {
    return await api.put(`/purchase-requisitions/${id}`, data);
  },

  deleteRequisition: async (id) => {
    return await api.delete(`/purchase-requisitions/${id}`);
  },

  importRequisitionsExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/purchase-requisitions/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  exportRequisitionsExcel: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.warehouse_status) query.append('warehouse_status', params.warehouse_status);
    if (params.search) query.append('search', params.search);
    const baseUrl = api.defaults?.baseURL || '';
    window.open(`${baseUrl}/purchase-requisitions/export-excel/download?${query.toString()}`, '_blank');
  },

  // ===== Chi tiết mặt hàng (Purchase Order Items) =====

  getOrderItems: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.append('skip', params.skip);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.status) query.append('status', params.status);
    if (params.po_code) query.append('po_code', params.po_code);
    if (params.search) query.append('search', params.search);
    if (params.supplier_code) query.append('supplier_code', params.supplier_code);
    return await api.get(`/purchase-order-items/?${query.toString()}`);
  },

  getOrderItemStats: async () => {
    return await api.get('/purchase-order-items/stats');
  },

  getOrderItemsByPO: async (poCode) => {
    return await api.get(`/purchase-order-items/by-po/${encodeURIComponent(poCode)}`);
  },

  getOrderItemById: async (id) => {
    return await api.get(`/purchase-order-items/${id}`);
  },

  createOrderItem: async (data) => {
    return await api.post('/purchase-order-items/', data);
  },

  updateOrderItem: async (id, data) => {
    return await api.put(`/purchase-order-items/${id}`, data);
  },

  deleteOrderItem: async (id) => {
    return await api.delete(`/purchase-order-items/${id}`);
  },

  importOrderItemsExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/purchase-order-items/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  exportOrderItemsExcel: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.po_code) query.append('po_code', params.po_code);
    if (params.search) query.append('search', params.search);
    const baseUrl = api.defaults?.baseURL || '';
    window.open(`${baseUrl}/purchase-order-items/export-excel/download?${query.toString()}`, '_blank');
  },
};
