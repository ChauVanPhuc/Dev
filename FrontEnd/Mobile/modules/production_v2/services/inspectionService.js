import apiClient from '@shared/services/api'
import { compressImage, blobToBase64 } from '@shared/utils/imageCompressor'
import { PAGE_SIZE } from '../constants'

export const inspectionService = {
  async getList({ tab, month, stage, poCode, product, sort, page = 1 } = {}) {
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
      console.warn('[inspectionService.getList] error:', e)
      return { items: [], total: 0, total_pending: 0, page, pageSize: PAGE_SIZE }
    }
  },

  async getById(id) {
    if (!id || id === 'NEW') return null
    try {
      const res = await apiClient.get(`/inspections/${id}/`)
      return res.data
    } catch (e) {
      console.warn('[inspectionService.getById] error:', e)
      return null
    }
  },

  async getGuide(mode, productId = null, stageId = null, guideId = null, parameter = null) {
    try {
      if (mode === 'process' && guideId) {
        try {
          const res = await apiClient.get(`/iso-documents/processes/${guideId}/details`)
          const procData = res?.data !== undefined ? res.data : res
          if (procData) {
            let steps = []
            if (Array.isArray(procData.steps)) {
              steps = procData.steps.map((s, idx) => ({
                id: s.id || idx + 1,
                step_no: s.step_number || idx + 1,
                title: s.name || `Bước ${s.step_number || idx + 1}`,
                content: s.instructions || '',
                standard: s.instructions || '',
                role: s.assignee_role || '',
                assignee_role: s.assignee_role || '',
                images: [],
                sub_steps: []
              }))
            }

            return {
              id: procData.id,
              code: procData.code,
              name: procData.name,
              sections: procData.sections || {},
              steps
            }
          }
        } catch (err) {
          console.warn('[inspectionService.getGuide] error fetching ISO process details:', err)
        }
      }

      if (guideId && mode !== 'process') {
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
                images: Array.isArray(s.images) ? s.images : [],
                sub_steps: Array.isArray(s.sub_steps) ? s.sub_steps.map((sub, si) => ({
                  id: sub.id || si + 1,
                  title: sub.title || sub.content || '',
                  content: sub.content || '',
                  images: Array.isArray(sub.images) ? sub.images : []
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
      if (parameter) params.append('parameter', parameter)
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
      if (status !== 404) {
        console.warn(`[inspectionService.getGuide] mode=${mode}, status=${status}:`, detail)
      }
    }
    return null
  },

  async getProcessGuides(stageName = '') {
    try {
      const res = await apiClient.get('/iso-documents/processes')
      const processes = res?.data !== undefined ? res.data : res
      if (Array.isArray(processes) && processes.length > 0) {
        return processes.map((p) => ({
          id: String(p.id),
          code: p.code,
          name: p.name,
          display_at: p.display_at || '',
          iso_document_code: p.iso_document_code || '',
          iso_document_name: p.iso_document_name || ''
        }))
      }
      return []
    } catch (e) {
      console.warn('[inspectionService.getProcessGuides] error:', e)
      return []
    }
  },

  async create(payload) {
    const res = await apiClient.post('/inspections/', payload)
    return res.data
  },

  async confirm(id, data) {
    const res = await apiClient.patch(`/inspections/${id}/confirm/`, data)
    return res.data
  },

  async uploadImage(file, { onProgress, maxRetries = 2 } = {}) {
    let uploadPayload = file
    try {
      uploadPayload = await compressImage(file)
    } catch (err) {
      console.warn('[inspectionService] Nén ảnh thất bại, dùng file gốc:', err)
    }

    const doUpload = async () => {
      const form = new FormData()
      form.append('image', uploadPayload)
      form.append('file', uploadPayload)
      const res = await apiClient.post('/inspections/upload-image', form, {
        timeout: 25000,
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            const percent = Math.round((evt.loaded * 100) / evt.total)
            onProgress(percent)
          }
        },
      })
      return res.data
    }

    let lastError = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.warn(`[inspectionService] Đang thử upload lại lần ${attempt}...`)
          await new Promise((r) => setTimeout(r, 800 * attempt))
        }
        return await doUpload()
      } catch (err) {
        lastError = err
      }
    }

    console.error('[inspectionService] Upload ảnh thất bại sau các lần thử:', lastError)
    throw lastError
  },

  async imageToBase64(file) {
    try {
      const compressed = await compressImage(file)
      return await blobToBase64(compressed)
    } catch (err) {
      return await blobToBase64(file)
    }
  },

  async getLastResult(mode, productId, poCode) {
    try {
      const res = await apiClient.get(`/inspections/last-result/?mode=${mode}&product=${encodeURIComponent(productId || '')}&po=${encodeURIComponent(poCode || '')}`)
      return res.data
    } catch (e) {
      console.warn('[inspectionService.getLastResult] error:', e)
      return null
    }
  },

  async generatePalletCode(prefix = 'DA') {
    const uniqueSuffix = String(Date.now()).slice(-4) + String(Math.floor(10 + Math.random() * 90))
    return { palletCode: `${prefix}${uniqueSuffix}`, success: true }
  },

  async generateTicketCode(prefix = 'DA') {
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

  async getPallets() {
    try {
      const res = await apiClient.get('/inspections/pallets')
      const data = res?.data !== undefined ? res.data : res
      if (Array.isArray(data) && data.length > 0) return data
    } catch (e) {
      console.warn('[inspectionService.getPallets] fallback to list filter:', e)
    }
    try {
      const res = await this.getList({ page: 1 })
      const items = res?.items || []
      const pallets = items.map((i) => i.palletCode || i.pallet_code).filter(Boolean)
      const unique = Array.from(new Set(pallets))
      if (unique.length > 0) return unique
    } catch (e) {}
    return []
  },

  async getTicketsByPallet(palletCode, limit = 3) {
    if (!palletCode) return []
    try {
      const res = await apiClient.get(`/inspections/by-pallet?pallet_code=${encodeURIComponent(palletCode)}&limit=${limit}`)
      const data = res?.data !== undefined ? res.data : res
      if (Array.isArray(data)) return data.slice(0, limit)
    } catch (e) {
      console.warn('[inspectionService.getTicketsByPallet] fallback filter:', e)
    }
    try {
      const res = await this.getList({ page: 1 })
      const items = res?.items || []
      const matched = items.filter((i) => (i.palletCode || i.pallet_code) === palletCode)
      if (matched.length > 0) return matched.slice(0, limit)
    } catch (e) {}
    return []
  },
}

