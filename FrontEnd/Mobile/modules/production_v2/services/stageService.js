import apiClient from '@shared/services/api'
import { STANDARD_BOM_STAGES } from '../constants'

export const stageService = {
  async getAll() {
    try {
      const res = await apiClient.get('/stages/?include_inactive=false')
      const data = res.data || []
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    } catch (e) {
      console.warn('Lấy danh sách công đoạn từ API thất bại, dùng danh sách chuẩn BOM:', e)
    }
    return STANDARD_BOM_STAGES.map((name, idx) => ({ id: idx + 1, name, code: `CD0${idx + 1}` }))
  },
}

