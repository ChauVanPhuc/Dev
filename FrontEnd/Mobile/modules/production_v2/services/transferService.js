import { MOCK_TRANSFER_TICKETS, PAGE_SIZE } from '../constants'

const USE_MOCK = true

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export const transferService = {
  async getList({ tab, month, status, factory, stage, type, dateFrom, dateTo, page = 1 }) {
    if (USE_MOCK) {
      await delay()
      let data = [...MOCK_TRANSFER_TICKETS]
      if (tab === 'pending') data = data.filter((t) => t.status === 'pending' || t.status === 'delivering')
      else data = data.filter((t) => t.status === 'done' || t.status === 'cancelled')
      if (status) data = data.filter((t) => t.status === status)
      if (type) data = data.filter((t) => t.version === type)
      const total = data.length
      const items = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      return { items, total, page, pageSize: PAGE_SIZE }
    }
    const params = new URLSearchParams({ tab, month, status, factory, stage, type, dateFrom, dateTo, page })
    const res = await import('@shared/services/api').then((m) => m.default.get(`/deliveries/?${params}`))
    return res.data
  },

  async getById(id) {
    if (USE_MOCK) {
      await delay()
      return MOCK_TRANSFER_TICKETS.find((t) => t.code === id || t.id === Number(id)) || null
    }
    const res = await import('@shared/services/api').then((m) => m.default.get(`/deliveries/${id}/`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) {
      await delay(600)
      return { id: Date.now(), code: `LC${String(Date.now()).slice(-3)}`, ...payload }
    }
    const res = await import('@shared/services/api').then((m) => m.default.post('/deliveries/', payload))
    return res.data
  },

  async confirm(id, quantities) {
    if (USE_MOCK) {
      await delay(500)
      return { success: true }
    }
    const res = await import('@shared/services/api').then((m) => m.default.patch(`/deliveries/${id}/confirm/`, quantities))
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
      m.default.post('/deliveries/upload-image/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    )
    return res.data
  },
}
