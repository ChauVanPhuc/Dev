import apiClient from '@shared/services/api'

export const stageService = {
  async getAll() {
    const res = await apiClient.get('/production-v2/stages')
    return res.data || []
  },
}
