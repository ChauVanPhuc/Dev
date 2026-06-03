import apiClient from './api'

/**
 * Return Service - Service cho xử lý phiếu trả hàng
 */
const returnService = {
  /**
   * Lấy danh sách phiếu trả hàng chờ SX xác nhận
   * @param {string} toStage - Công đoạn nhận (filter tùy chọn)
   * @returns {Promise}
   */
  getPendingReturns: (toStage = null) => {
    const params = toStage ? `?to_stage=${encodeURIComponent(toStage)}` : ''
    return apiClient.get(`/returns/pending${params}`)
  },

  /**
   * Lấy chi tiết phiếu trả hàng
   * @param {number} returnId - ID phiếu trả hàng
   * @returns {Promise}
   */
  getReturnDetail: (returnId) => {
    return apiClient.get(`/returns/detail/${returnId}`)
  },

  /**
   * SX xác nhận nhận hàng bị trả
   * @param {number} returnId - ID phiếu trả hàng
   * @param {object} data - Dữ liệu xác nhận
   * @param {number} data.user_id - ID người SX xác nhận
   * @param {string} data.note - Ghi chú khi xác nhận (tùy chọn)
   * @param {string} data.status - Status sau khi xác nhận (mặc định "Đã SX Xác Nhận")
   * @returns {Promise}
   */
  confirmReturn: (returnId, data) => {
    return apiClient.patch(`/returns/${returnId}/confirm`, data)
  },

  /**
   * Lấy danh sách phiếu trả hàng theo kế hoạch
   * @param {number} planId - ID kế hoạch sản xuất
   * @returns {Promise}
   */
  getPlanReturns: (planId) => {
    return apiClient.get(`/returns/${planId}`)
  }
}

export default returnService
