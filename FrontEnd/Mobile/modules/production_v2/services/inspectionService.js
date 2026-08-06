import { MOCK_INSPECTION_TICKETS, MOCK_INSPECTION_STEPS, PAGE_SIZE } from '../constants'

const USE_MOCK = true

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
    const res = await import('@shared/services/api').then((m) => m.default.get(`/inspections/?${params}`))
    return res.data
  },

  async getById(id) {
    if (USE_MOCK) {
      await delay()
      return MOCK_INSPECTION_TICKETS.find((t) => t.code === id || t.id === Number(id)) || null
    }
    const res = await import('@shared/services/api').then((m) => m.default.get(`/inspections/${id}/`))
    return res.data
  },

  async getGuide(mode, productId) {
    if (USE_MOCK) {
      await delay(300)
      return MOCK_INSPECTION_STEPS
    }
    const res = await import('@shared/services/api').then((m) =>
      m.default.get(`/inspections/guide/?mode=${mode}&product=${productId}`)
    )
    return res.data
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
    const form = new FormData()
    form.append('image', file)
    const res = await import('@shared/services/api').then((m) =>
      m.default.post('/inspections/upload-image/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    )
    return res.data
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
}
