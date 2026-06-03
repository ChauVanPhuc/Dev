import api from '../../Shared/Services/api.service';

export const bomService = {
  // Lấy dữ liệu BOM Master (MasterProduct kèm theo Element và Part)
  getBOMs: async (q = '', limit = 50, skip = 0) => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('limit', limit);
    params.append('skip', skip);
    return await api.get(`/master-products/?${params.toString()}`);
  },
  getBOM: async (id) => {
    return await api.get(`/master-products/${id}`);
  }
};
