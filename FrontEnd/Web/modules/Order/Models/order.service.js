import api from '@webShared/Services/api.service';



export const orderService = {

  // Lấy danh sách đơn hàng

  getAll: async () => {

    return await api.get('/orders/');

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

