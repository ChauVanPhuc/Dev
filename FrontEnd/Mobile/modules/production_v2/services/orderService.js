import apiClient from '@shared/services/api'

export const orderService = {
  async getAll(limit = 1000) {
    const res = await apiClient.get(`/production-v2/orders?limit=${limit}`)
    return res.data || {}
  },

  async getBom(poCode, stage = '') {
    const qs = stage ? `?stage=${encodeURIComponent(stage)}` : ''
    const res = await apiClient.get(`/production-v2/orders/${encodeURIComponent(poCode)}/bom${qs}`)
    return res.data || []
  },
}
