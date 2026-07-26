import api from '@webShared/Services/api.service';

export const customerService = {
  getAll: async (skip = 0, limit = 100, search = '') => {
    return await api.get(`/customers/?skip=${skip}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },

  getById: async (id) => {
    return await api.get(`/customers/${id}`);
  },

  create: async (data) => {
    return await api.post('/customers/', data);
  },

  update: async (id, data) => {
    return await api.put(`/customers/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/customers/${id}`);
  }
};
