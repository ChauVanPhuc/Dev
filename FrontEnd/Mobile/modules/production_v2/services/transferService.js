import apiClient from '@shared/services/api'
import { MOCK_TRANSFER_TICKETS, PAGE_SIZE } from '../constants'

const USE_MOCK = false

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export const transferService = {
  async getAvailableMonths() {
    try {
      const res = await apiClient.get('/production-v2/available-months')
      return res.data || { months: [], default_month: new Date().getMonth() + 1 }
    } catch (e) {
      console.warn('Lỗi khi tải danh sách tháng từ Backend, dùng dữ liệu mặc định:', e)
      return { months: [{ month: 7, label: 'Tháng 7' }, { month: 6, label: 'Tháng 6' }], default_month: 7 }
    }
  },

  async getList({ tab = 'pending', month, part_name, status, factory, stage, type, page = 1, limit = PAGE_SIZE }) {
    if (USE_MOCK) {
      await delay()
      let data = [...MOCK_TRANSFER_TICKETS]
      if (tab === 'pending') data = data.filter((t) => t.status === 'pending' || t.status === 'delivering' || t.status === 'Chờ xác nhận')
      else data = data.filter((t) => t.status === 'done' || t.status === 'cancelled' || t.status === 'Đã nhận' || t.status === 'Hoàn thành')
      if (status) data = data.filter((t) => t.status === status)
      if (type) data = data.filter((t) => t.version === type)
      const total = data.length
      const items = data.slice((page - 1) * limit, page * limit)
      return { items, total, page, pageSize: limit, available_parts: ['Thanh A', 'Thanh B', 'Thanh C'] }
    }

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
      const available_parts = res.data?.available_parts || ['Thanh A', 'Thanh B', 'Thanh C']
      return { items, total, page, pageSize: limit, available_parts }
    } catch (err) {
      console.warn('Backend API /production-v2/transfers lỗi, fallback mock data:', err)
      let data = [...MOCK_TRANSFER_TICKETS]
      if (tab === 'pending') data = data.filter((t) => t.status === 'pending' || t.status === 'delivering' || t.status === 'Chờ xác nhận')
      else data = data.filter((t) => t.status === 'done' || t.status === 'cancelled' || t.status === 'Đã nhận' || t.status === 'Hoàn thành')
      const total = data.length
      const items = data.slice((page - 1) * limit, page * limit)
      return { items, total, page, pageSize: limit, available_parts: ['Thanh A', 'Thanh B', 'Thanh C'] }
    }
  },

  async getById(id) {
    try {
      const res = await apiClient.get(`/deliveries/${id}/`)
      return res.data
    } catch (e) {
      return MOCK_TRANSFER_TICKETS.find((t) => t.code === id || t.id === Number(id)) || null
    }
  },

  async create(payload) {
    try {
      const res = await apiClient.post('/deliveries/', payload)
      return res.data
    } catch (e) {
      await delay(500)
      return { id: Date.now(), code: `LC${String(Date.now()).slice(-3)}`, ...payload }
    }
  },

  async confirm(id, quantities) {
    try {
      const res = await apiClient.patch(`/deliveries/${id}/confirm/`, quantities)
      return res.data
    } catch (e) {
      await delay(400)
      return { success: true }
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
