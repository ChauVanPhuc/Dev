import apiClient from '@shared/services/api'
import { PAGE_SIZE } from '../constants'

export const transferService = {
  async getAvailableMonths() {
    try {
      const res = await apiClient.get('/production-v2/available-months')
      return res.data || { months: [], default_month: new Date().getMonth() + 1 }
    } catch (e) {
      console.warn('Lỗi khi tải danh sách tháng từ Backend:', e)
      const currentM = new Date().getMonth() + 1
      return { months: [{ month: currentM, label: `Tháng ${currentM}` }], default_month: currentM }
    }
  },

  async getList({ tab = 'pending', month, part_name, status, factory, stage, type, page = 1, limit = PAGE_SIZE }) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        tab: tab === 'pending' ? 'transfer' : tab,
      })
      if (month) params.append('month', month.toString())
      if (part_name && part_name !== 'Tất cả chi tiết') params.append('part_name', part_name)
      if (status) params.append('status', status)

      const res = await apiClient.get(`/production-v2/transfers?${params.toString()}`)
      const items = res.data?.items || []
      const total = res.data?.total || items.length
      const available_parts = res.data?.available_parts || []
      return { items, total, page, pageSize: limit, available_parts }
    } catch (err) {
      console.warn('Backend API /production-v2/transfers lỗi:', err)
      return { items: [], total: 0, page, pageSize: limit, available_parts: [] }
    }
  },

  async getById(id) {
    if (!id || id === 'NEW') return null
    try {
      const res = await apiClient.get(`/deliveries/${id}/`)
      return res.data
    } catch (e) {
      console.warn('[transferService.getById] error:', e)
      return null
    }
  },

  async create(payload) {
    if (payload instanceof FormData) {
      const res = await apiClient.post('/deliveries/', payload)
      return res.data
    }

    const formData = new FormData()
    formData.append('plan_id', payload.plan_id || payload.planId || 1)
    formData.append('delivery_stage', payload.fromStage || payload.delivery_stage || 'Tạo phôi')
    formData.append('receiving_stage', payload.toStage || payload.receiving_stage || 'Định hình')
    formData.append('user_id', payload.user_id || payload.userId || 1)
    
    const items = Array.isArray(payload.items) ? payload.items : []
    const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0) || Number(payload.totalQty) || 0
    formData.append('quantity', totalQty)
    formData.append('residual', Number(payload.surplus) || 0)
    formData.append('status', payload.status || 'Chờ Nhận Hàng')
    
    const mainPartName = payload.detail || items[0]?.detail || payload.palletCode || 'Chi tiết sản xuất'
    const mainSpec = payload.spec || items[0]?.spec || 'Tiêu chuẩn'
    
    formData.append('part_name', mainPartName)
    formData.append('specification', mainSpec)
    formData.append('note', payload.note || '')
    formData.append('details', JSON.stringify(items))

    if (Array.isArray(payload.files)) {
      payload.files.forEach((file) => formData.append('files', file))
    }

    const res = await apiClient.post('/deliveries/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  async confirm(id, payload = {}) {
    const formattedPayload = {
      user_id: payload.user_id || payload.userId || 1,
      sx_receipt: payload.sx_receipt || payload.user_id || payload.userId || 1,
      quantity_received: Number(payload.quantity_received || payload.quantity || 0),
      status: payload.status || 'Hoàn Thành'
    }
    const res = await apiClient.patch(`/deliveries/${id}/confirm`, formattedPayload)
    return res.data
  },

  async getNextCode() {
    try {
      const res = await apiClient.get('/deliveries/next-id')
      const nextId = res.data?.next_id || 1
      return `LC${String(nextId).padStart(3, '0')}`
    } catch (e) {
      console.warn('Lỗi lấy mã phiếu tiếp theo, dùng mã tạm:', e)
      return `LC${String(Date.now()).slice(-3)}`
    }
  },

  async getPlanByMonth(month) {
    try {
      const m = month ? String(month).match(/\d+/) : null
      const res = await apiClient.get(`/production-v2/plan-by-month${m ? '?month=' + m[0] : ''}`)
      return res.data || { name: 'Luân chuyển sản xuất' }
    } catch (e) {
      console.warn('Lỗi lấy KHSX theo tháng:', e)
      return { name: 'Luân chuyển sản xuất' }
    }
  },

  async getOrdersByPart({ part_name, specification, month }) {
    try {
      const params = new URLSearchParams()
      if (part_name) params.append('part_name', part_name)
      if (specification) params.append('specification', specification)
      const m = month ? String(month).match(/\d+/) : null
      if (m) params.append('month', m[0])
      const res = await apiClient.get(`/production-v2/orders-by-part?${params.toString()}`)
      return res.data || []
    } catch (e) {
      console.warn('Lỗi lấy đơn hàng theo chi tiết:', e)
      return []
    }
  },

  async uploadImage(file) {
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await apiClient.post('/deliveries/upload-image/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    } catch (e) {
      return { url: URL.createObjectURL(file) }
    }
  },
}

