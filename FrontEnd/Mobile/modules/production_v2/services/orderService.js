import apiClient from '@shared/services/api'

export const orderService = {
  async getPoCodes(params = {}) {
    let url = '/production-v2/po-codes'
    if (typeof params === 'number') {
      url += `?limit=${params}`
    } else if (typeof params === 'object' && params !== null) {
      const qs = new URLSearchParams()
      if (params.month !== undefined && params.month !== null && params.month !== '') qs.append('month', params.month)
      if (params.search) qs.append('search', params.search)
      if (params.limit) qs.append('limit', params.limit)
      else qs.append('limit', '1000')
      if (qs.toString()) url += `?${qs.toString()}`
    }
    const res = await apiClient.get(url)
    return res.data?.codes || []
  },

  async getAll(params = {}) {
    let url = '/production-v2/orders'
    if (typeof params === 'number') {
      url += `?limit=${params}`
    } else if (typeof params === 'object' && params !== null) {
      const qs = new URLSearchParams()
      if (params.month !== undefined && params.month !== null && params.month !== '') qs.append('month', params.month)
      if (params.search) qs.append('search', params.search)
      if (params.category) qs.append('category', params.category)
      if (params.limit) qs.append('limit', params.limit)
      else qs.append('limit', '1000')
      if (qs.toString()) url += `?${qs.toString()}`
    }
    const res = await apiClient.get(url)
    return res.data || {}
  },

  async getBom(poCode, stage = '') {
    const qs = stage ? `?stage=${encodeURIComponent(stage)}` : ''
    const res = await apiClient.get(`/production-v2/orders/${encodeURIComponent(poCode)}/bom${qs}`)
    return res.data || []
  },

  async getPurchaseOrders(search = '') {
    try {
      const qs = new URLSearchParams({ order_type: 'Đơn mua hàng' })
      if (search) qs.append('search', search)
      const res = await apiClient.get(`/purchase-requisitions/all-po-codes?${qs.toString()}`)
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      return items.map((i) => typeof i === 'string' ? i : (i.po_code || i.code)).filter(Boolean)
    } catch (e) {
      console.warn('getPurchaseOrders failed:', e)
      return []
    }
  },
}
