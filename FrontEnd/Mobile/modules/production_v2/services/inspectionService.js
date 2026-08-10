import apiClient from '@shared/services/api'
import { MOCK_INSPECTION_TICKETS, MOCK_INSPECTION_STEPS, PAGE_SIZE } from '../constants'

const USE_MOCK = false

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export const inspectionService = {
  async getList({ tab, month, page = 1 }) {
    if (USE_MOCK) {
      await delay()
      let data = [...MOCK_INSPECTION_TICKETS]
      if (tab === 'pending') data = data.filter((t) => t.status === 'pending' || t.status === 'delivering')
      else data = data.filter((t) => t.status === 'done' || t.status === 'cancelled')
      const total = data.length
      const items = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      return { items, total, page, pageSize: PAGE_SIZE }
    }
    const params = new URLSearchParams({ tab, month, page })
    try {
      const res = await apiClient.get(`/inspections/?${params}`)
      return res.data
    } catch (e) {
      // Fallback to mock if endpoint not available
      let data = [...MOCK_INSPECTION_TICKETS]
      if (tab === 'pending') data = data.filter((t) => t.status === 'pending' || t.status === 'delivering')
      else data = data.filter((t) => t.status === 'done' || t.status === 'cancelled')
      return { items: data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: data.length, page, pageSize: PAGE_SIZE }
    }
  },

  async getById(id) {
    if (USE_MOCK) {
      await delay()
      return MOCK_INSPECTION_TICKETS.find((t) => t.code === id || t.id === Number(id)) || null
    }
    try {
      const res = await apiClient.get(`/inspections/${id}/`)
      return res.data
    } catch (e) {
      return MOCK_INSPECTION_TICKETS.find((t) => t.code === id || t.id === Number(id)) || null
    }
  },

  async getGuide(mode, productId = null, stageId = null) {
    try {
      const params = new URLSearchParams()
      if (productId) params.append('product_id', productId)
      if (stageId) params.append('stage_id', stageId)
      const queryStr = params.toString() ? `?${params.toString()}` : ''
      const url = `/inspection-guides/mobile/${mode}${queryStr}`
      const res = await apiClient.get(url)
      // Axios trả về { data, status, ... }. apiClient có thể wrapper hoặc không.
      const guideData = res?.data !== undefined ? res.data : res
      if (guideData && (guideData.id || guideData.steps)) {
        return guideData
      }
    } catch (e) {
      const status = e?.response?.status
      const detail = e?.response?.data?.detail || e.message
      console.warn(`[inspectionService.getGuide] mode=${mode}, status=${status}:`, detail)
    }
    return null
  },

  async create(payload) {
    if (USE_MOCK) {
      await delay(600)
      return { id: Date.now(), code: `KT${String(Date.now()).slice(-3)}`, ...payload }
    }
    const res = await import('@shared/services/api').then((m) => m.default.post('/inspections/', payload))
    return res.data
  },

  async confirm(id, data) {
    if (USE_MOCK) {
      await delay(500)
      return { success: true }
    }
    const res = await import('@shared/services/api').then((m) => m.default.patch(`/inspections/${id}/confirm/`, data))
    return res.data
  },

  async uploadImage(file) {
    if (USE_MOCK) {
      await delay(800)
      return { url: URL.createObjectURL(file) }
    }
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('file', file)
      const res = await apiClient.post('/inspections/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    } catch (e) {
      console.warn('[inspectionService] Upload image to server failed, using local object URL fallback:', e)
      return { url: URL.createObjectURL(file) }
    }
  },

  async getLastResult(mode, productId, poCode) {
    if (USE_MOCK) {
      await delay(300)
      return { sampleQty: 134, errorQty: 2, result: 'pass' }
    }
    const res = await import('@shared/services/api').then((m) =>
      m.default.get(`/inspections/last-result/?mode=${mode}&product=${productId}&po=${poCode}`)
    )
    return res.data
  },

  async generatePalletCode(prefix = 'DA') {
    if (USE_MOCK) {
      return { palletCode: `DA${Math.floor(10000 + Math.random() * 90000)}`, success: true }
    }
    try {
      const res = await apiClient.get(`/inspections/generate-pallet-code?prefix=${encodeURIComponent(prefix)}`)
      if (res && res.data && res.data.palletCode) {
        return res.data
      }
    } catch (e) {
      console.warn('[inspectionService] generatePalletCode failed, fallback to local:', e)
    }
    return { palletCode: `DA${Math.floor(10000 + Math.random() * 90000)}`, success: true }
  },
}
