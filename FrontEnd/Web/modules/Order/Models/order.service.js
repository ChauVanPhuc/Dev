import api from '@webShared/Services/api.service';



export const orderService = {

  // Lấy danh sách đơn hàng

  getAll: async (page = null, pageSize = 15, search = '', status = 'all', customer = 'all', deadline = 'all', sortDirection = 'desc') => {
    if (page === null) {
      return await api.get('/orders/');
    }
    return await api.get(`/orders/?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&status=${status}&customer=${encodeURIComponent(customer)}&deadline=${deadline}&sortDirection=${sortDirection}`);
  },



  // Tạo đơn hàng mới

  create: async (orderData) => {

    return await api.post('/orders/', orderData);

  },



  // Cập nhật đơn hàng

  update: async (id, orderData) => {

    return await api.put(`/orders/${id}`, orderData);

  }

};

