import apiClient from '@shared/services/api'
import { MOCK_INSPECTION_TICKETS, MOCK_INSPECTION_STEPS, PAGE_SIZE } from '../constants'

const USE_MOCK = false

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export const inspectionService = {
  async getList({ tab, month, stage, poCode, product, sort, page = 1 } = {}) {
    if (USE_MOCK) {
      await delay()
      let data = [...MOCK_INSPECTION_TICKETS]
      if (tab === 'pending') data = data.filter((t) => t.status === 'pending' || t.status === 'delivering')
      else data = data.filter((t) => t.status === 'done' || t.status === 'cancelled')
      const total = data.length
      const items = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      return { items, total, total_pending: MOCK_INSPECTION_TICKETS.filter((t) => t.status === 'pending').length, page, pageSize: PAGE_SIZE }
    }
    const params = new URLSearchParams()
    if (tab) params.append('tab', tab)
    if (month) params.append('month', month)
    if (stage) params.append('stage', stage)
    if (poCode) params.append('po_code', poCode)
    if (product) params.append('product', product)
    if (sort) params.append('sort', sort)
    if (page) params.append('page', page)

    try {
      const res = await apiClient.get(`/inspections/?${params.toString()}`)
      return res.data
    } catch (e) {
      let data = [...MOCK_INSPECTION_TICKETS]
      if (tab === 'pending') data = data.filter((t) => t.status === 'pending' || t.status === 'delivering')
      else data = data.filter((t) => t.status === 'done' || t.status === 'cancelled')
      return { items: data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: data.length, total_pending: 0, page, pageSize: PAGE_SIZE }
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

  async getGuide(mode, productId = null, stageId = null, guideId = null) {
    try {
      if (guideId) {
        // Fetch directly from inspection-guides endpoint (/admin/inspection-guides)
        try {
          const res = await apiClient.get(`/inspection-guides/${guideId}`)
          const guideData = res?.data !== undefined ? res.data : res
          if (guideData && (guideData.id || guideData.steps)) {
            return {
              id: guideData.id,
              name: guideData.name,
              code: guideData.code,
              steps: (guideData.steps || []).map((s, idx) => ({
                id: s.id || idx + 1,
                step_no: s.step_no || idx + 1,
                title: s.title || `Bước ${idx + 1}`,
                content: s.content || '',
                sub_steps: Array.isArray(s.sub_steps) ? s.sub_steps.map((sub, si) => ({
                  id: sub.id || si + 1,
                  title: sub.title || sub.content || ''
                })) : []
              }))
            }
          }
        } catch (err) {
          console.warn('[inspectionService.getGuide] error fetching guide:', err)
        }
      }

      const params = new URLSearchParams()
      if (productId) params.append('product_id', productId)
      if (stageId) params.append('stage_id', stageId)
      const queryStr = params.toString() ? `?${params.toString()}` : ''
      const url = `/inspection-guides/mobile/${mode}${queryStr}`
      const res = await apiClient.get(url)
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

  async getProcessGuides() {
    try {
      // Lấy trực tiếp 100% từ /inspection-guides (Quản lý bộ Hướng dẫn kiểm tra tại Web Admin /admin/inspection-guides)
      const res = await apiClient.get('/inspection-guides')
      const guides = res?.data !== undefined ? res.data : res
      if (Array.isArray(guides) && guides.length > 0) {
        return guides.map((g) => ({
          id: String(g.id),
          code: g.code,
          name: g.name
        }))
      }
      return []
    } catch (e) {
      console.warn('[inspectionService.getProcessGuides] error:', e)
      return []
    }
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
    const uniqueSuffix = String(Date.now()).slice(-4) + String(Math.floor(10 + Math.random() * 90))
    return { palletCode: `${prefix}${uniqueSuffix}`, success: true }
  },

  async generateTicketCode(prefix = 'KT') {
    const uniqueSuffix = String(Date.now()).slice(-4) + String(Math.floor(10 + Math.random() * 90))
    return { ticketCode: `${prefix}${uniqueSuffix}`, success: true }
  },

  async getDefectTypes(userId = null) {
    try {
      const url = userId ? `/inspections/defect-types?user_id=${userId}` : '/inspections/defect-types'
      const res = await apiClient.get(url)
      return Array.isArray(res.data) ? res.data : []
    } catch (e) {
      console.warn('[inspectionService.getDefectTypes] error:', e)
      return []
    }
  },

  async getCTQGuides() {
    try {
      const res = await apiClient.get('/inspection-guides?doc_type=CTQ&limit=500')
      const data = res?.data !== undefined ? res.data : res
      return Array.isArray(data) ? data : (data?.items || [])
    } catch (e) {
      console.warn('[inspectionService.getCTQGuides] error:', e)
      return []
    }
  },
}
