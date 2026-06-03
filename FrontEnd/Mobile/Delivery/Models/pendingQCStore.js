/**
 * pendingQCStore — Lưu kết quả QC tạm thời (chưa gửi lên server).
 * Module-level object: tồn tại xuyên suốt phiên SPA, bị xóa khi refresh trang.
 * 
 * Keyed by deliveryId → tránh lẫn dữ liệu giữa các phiếu bàn giao khác nhau.
 * 
 * Luồng: Sub-screen confirm → set() → Parent "Xác nhận" → getAll() → API → clear()
 */
const pendingQCStore = {
  _data: {},
  // {
  //   [deliveryId]: {
  //     [category]: {
  //       isPass: boolean | null,
  //       existingImages: string[],  // URL ảnh đã có trên server
  //       newImages: File[]           // Ảnh người dùng vừa chọn (chưa upload)
  //     }
  //   }
  // }

  /** Lưu kết quả kiểm tra của một hạng mục cho một phiếu cụ thể */
  set(deliveryId, category, { isPass, existingImages = [], newImages = [] }) {
    if (!this._data[deliveryId]) this._data[deliveryId] = {}
    this._data[deliveryId][category] = { isPass, existingImages, newImages }
  },

  /** Lấy kết quả của một hạng mục (hoặc null nếu chưa có) */
  get(deliveryId, category) {
    return this._data[deliveryId]?.[category] || null
  },

  /** Lấy tất cả kết quả đang chờ của một phiếu */
  getAll(deliveryId) {
    return { ...(this._data[deliveryId] || {}) }
  },

  /** Kiểm tra có dữ liệu đang chờ cho phiếu này không */
  hasPending(deliveryId) {
    return Object.keys(this._data[deliveryId] || {}).length > 0
  },

  /** Xóa pending của một phiếu sau khi đã lưu lên server */
  clear(deliveryId) {
    delete this._data[deliveryId]
  }
}

export default pendingQCStore
