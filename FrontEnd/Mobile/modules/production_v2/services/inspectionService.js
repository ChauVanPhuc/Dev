import apiClient from '@shared/services/api'
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
      const [guidesRes, stagesRes] = await Promise.allSettled([
        apiClient.get('/inspection-guides'),
        apiClient.get('/stages').catch(() => apiClient.get('/stages/'))
      ])

      const guides = guidesRes.status === 'fulfilled' ? (guidesRes.value?.data !== undefined ? guidesRes.value.data : guidesRes.value) : []
      const stages = stagesRes.status === 'fulfilled' ? (stagesRes.value?.data !== undefined ? stagesRes.value.data : stagesRes.value) : []

      const stagesList = Array.isArray(stages) ? stages : (stages?.items || [])
      const stageMap = {}
      stagesList.forEach(s => {
        if (s.id && s.name) stageMap[s.id] = s.name.toLowerCase().trim()
      })

      let currentStageId = null
      if (stageName && typeof stageName === 'string') {
        const stLower = stageName.toLowerCase().trim()
        const foundStage = stagesList.find(s => (s.name || '').toLowerCase().trim() === stLower || stLower.includes((s.name || '').toLowerCase().trim()) || (s.name || '').toLowerCase().trim().includes(stLower))
        if (foundStage) currentStageId = foundStage.id
      }

      if (Array.isArray(guides) && guides.length > 0) {
        let filtered = guides
        if (stageName && typeof stageName === 'string' && stageName.trim()) {
          const stLower = stageName.toLowerCase().trim()

          filtered = guides.filter((g) => {
            const assignments = g.assignments || []
            // If guide has no assignments configured in Web Admin, do not display
            if (assignments.length === 0) {
              return false
            }

            // Check if any assignment matches current stage or applies to all stages
            return assignments.some(a => {
              if (a.stage_id === null || a.stage_id === undefined) {
                return true
              }
              if (currentStageId && a.stage_id === currentStageId) {
                return true
              }
              const assignedStageName = stageMap[a.stage_id] || ''
              if (assignedStageName && (stLower.includes(assignedStageName) || assignedStageName.includes(stLower))) {
                return true
              }
              return false
            })
          })
        }

        return filtered.map((g) => ({
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
    const res = await apiClient.post('/inspections/', payload)
    return res.data
  },

  async confirm(id, data) {
    const res = await apiClient.patch(`/inspections/${id}/confirm/`, data)
    return res.data
  },

  async uploadImage(file) {
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

