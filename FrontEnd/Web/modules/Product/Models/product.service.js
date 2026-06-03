import api from '@webShared/Services/api.service';

/**
 * Model: Xử lý dữ liệu liên quan đến Sản phẩm
 */
export const productService = {
  // Lấy danh sách sản phẩm
  getAll: async () => {
    return await api.get('/products');
  },

  // Lấy chi tiết sản phẩm
  getById: async (id) => {
    return await api.get(`/products/${id}`);
  },

  // Thêm sản phẩm mới
  create: async (productData) => {
    return await api.post('/products', productData);
  },

  // Cập nhật sản phẩm
  update: async (id, productData) => {
    return await api.put(`/products/${id}`, productData);
  },

  // Xóa sản phẩm
  delete: async (id) => {
    return await api.delete(`/products/${id}`);
  }
};
