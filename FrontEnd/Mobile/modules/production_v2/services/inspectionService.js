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

  async getGuide(mode, productId = null, stageId = null, guideId = null) {
    try {
      if (guideId) {
        // 1. Try inspection-guides endpoint
        try {
          const res = await apiClient.get(`/inspection-guides/${guideId}`)
          const guideData = res?.data !== undefined ? res.data : res
          if (guideData && (guideData.id || guideData.steps)) {
            return guideData
          }
        } catch (err) {
          // ignore and try next source
        }

        // 2. Try ISO processes endpoint
        try {
          const isoRes = await apiClient.get(`/iso/processes/${guideId}/details`)
          const details = isoRes?.data !== undefined ? isoRes.data : isoRes
          if (details && (details.id || details.steps)) {
            return {
              id: details.id,
              name: details.name,
              code: details.code,
              steps: (details.steps || []).map((s, idx) => ({
                id: s.id || idx + 1,
                step_no: s.step_number || idx + 1,
                title: s.name || `Bước ${idx + 1}`,
                content: s.instructions || s.name || '',
                sub_steps: Array.isArray(s.checklist) ? s.checklist.map((c, ci) => ({ id: ci + 1, title: typeof c === 'string' ? c : (c.title || c.text || '') })) : []
              }))
            }
          }
        } catch (err) {
          // ignore and try next source
        }

        // 3. Try ISO documents endpoint
        try {
          const docRes = await apiClient.get(`/iso/${guideId}/details`)
          const details = docRes?.data !== undefined ? docRes.data : docRes
          if (details && (details.id || details.steps)) {
            return {
              id: details.id,
              name: details.name,
              code: details.code,
              steps: (details.steps || []).map((s, idx) => ({
                id: s.id || idx + 1,
                step_no: s.step_number || idx + 1,
                title: s.name || `Bước ${idx + 1}`,
                content: s.instructions || s.name || '',
                sub_steps: Array.isArray(s.checklist) ? s.checklist.map((c, ci) => ({ id: ci + 1, title: typeof c === 'string' ? c : (c.title || c.text || '') })) : []
              }))
            }
          }
        } catch (err) {
          // ignore
        }

        // 4. Safe fallback steps if guideId has no steps in DB
        return {
          id: guideId,
          name: 'Quy trình kiểm tra SOP',
          code: 'SOP-PROC',
          steps: [
            { id: 1, step_no: 1, title: 'Chuẩn bị thiết bị & Khu vực làm việc', content: 'Vệ sinh sạch sẽ, kiểm tra an toàn trang thiết bị trước khi bắt đầu', sub_steps: [] },
            { id: 2, step_no: 2, title: 'Đối chiếu thông số kỹ thuật & Tiêu chuẩn ISO', content: 'Thực hiện kiểm tra theo đúng quy chuẩn ban hành', sub_steps: [] },
            { id: 3, step_no: 3, title: 'Ghi nhận kết quả & Đánh giá tuân thủ', content: 'Đánh giá Đạt/Không đạt và báo cáo nếu có bất thường', sub_steps: [] }
          ]
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
    // Default fallback process list if DB has no process records
    const DEFAULT_PROCESSES = [
      { id: '1', code: 'QT01', name: 'Quy trình kiểm tra 5S khu vực sản xuất' },
      { id: '2', code: 'QT02', name: 'Quy trình kiểm tra vận hành thiết bị' },
      { id: '3', code: 'QT03', name: 'Quy trình an toàn lao động & PCCC' }
    ]

    try {
      // 1. Try /inspection-guides?inspection_type=process
      const res = await apiClient.get('/inspection-guides?inspection_type=process')
      const guides = res?.data !== undefined ? res.data : res
      if (Array.isArray(guides) && guides.length > 0) {
        return guides
      }

      // 2. Try /iso/processes
      const isoRes = await apiClient.get('/iso/processes')
      const isoProcs = isoRes?.data !== undefined ? isoRes.data : isoRes
      if (Array.isArray(isoProcs) && isoProcs.length > 0) {
        return isoProcs.map((p) => ({
          id: String(p.id),
          code: p.code,
          name: p.name
        }))
      }

      // 3. Try /iso/
      const docRes = await apiClient.get('/iso/')
      const isoDocs = docRes?.data !== undefined ? docRes.data : docRes
      if (Array.isArray(isoDocs) && isoDocs.length > 0) {
        return isoDocs.map((d) => ({
          id: String(d.id),
          code: d.code,
          name: d.name
        }))
      }

      return DEFAULT_PROCESSES
    } catch (e) {
      console.warn('[inspectionService.getProcessGuides] error:', e)
      return DEFAULT_PROCESSES
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
