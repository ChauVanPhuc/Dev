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

  async getPurchaseOrders() {
    try {
      const res = await apiClient.get('/purchase-requisitions/all-po-codes?order_type=Đơn mua hàng')
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      return items.map((i) => typeof i === 'string' ? i : (i.po_code || i.code)).filter(Boolean)
    } catch (e) {
      console.warn('getPurchaseOrders failed:', e)
      return []
    }
  },
}
