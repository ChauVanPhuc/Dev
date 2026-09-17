/**
 * File: userActivityService.js
 * Quản lý ghi log và truy xuất lịch sử hoạt động cá nhân của từng người kiểm tra (QC):
 * - Phiếu kiểm tra gần nhất
 * - Công đoạn gần nhất
 * - PO gần nhất
 * - Danh sách lịch sử các phiếu gần đây
 * 
 * Đảm bảo phân lập độc lập 100% giữa các tài khoản đăng nhập khác nhau.
 */
import apiClient from '@shared/services/api'

const STORAGE_PREFIX = 'smartflow_qc_activity_'

export const userActivityService = {
  /**
   * Lấy mã định danh người dùng duy nhất
   */
  getUserIdentifier(user) {
    if (!user) return 'anonymous'
    return String(user.id || user.username || user.full_name || 'anonymous').trim()
  },

  /**
   * Khóa lưu trữ LocalStorage cho từng user
   */
  getStorageKey(user) {
    const ident = this.getUserIdentifier(user)
    return `${STORAGE_PREFIX}${ident}`
  },

  /**
   * Đọc toàn bộ dữ liệu hoạt động của người dùng từ LocalStorage
   */
  getUserActivity(user) {
    const key = this.getStorageKey(user)
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          userId: user?.id || parsed.userId,
          username: user?.username || parsed.username,
          lastTicket: parsed.lastTicket || null,
          lastStage: parsed.lastStage || null,
          lastPo: parsed.lastPo || null,
          recentTickets: Array.isArray(parsed.recentTickets) ? parsed.recentTickets : [],
          recentStages: Array.isArray(parsed.recentStages) ? parsed.recentStages : [],
          recentPos: Array.isArray(parsed.recentPos) ? parsed.recentPos : []
        }
      }
    } catch (e) {
      console.warn('[userActivityService] Error parsing user activity:', e)
    }

    return {
      userId: user?.id || null,
      username: user?.username || '',
      lastTicket: null,
      lastStage: null,
      lastPo: null,
      recentTickets: [],
      recentStages: [],
      recentPos: []
    }
  },

  /**
   * Lưu dữ liệu hoạt động vào LocalStorage
   */
  saveUserActivity(user, activity) {
    const key = this.getStorageKey(user)
    try {
      localStorage.setItem(key, JSON.stringify(activity))
    } catch (e) {
      console.warn('[userActivityService] Error saving user activity:', e)
    }
  },

  /**
   * Ghi nhận công đoạn gần nhất
   */
  recordStage(user, stageName) {
    const cleanStage = (stageName || '').trim()
    if (!cleanStage) return this.getUserActivity(user)

    const current = this.getUserActivity(user)
    const now = new Date().toISOString()

    current.lastStage = {
      name: cleanStage,
      timestamp: now
    }

    if (!Array.isArray(current.recentStages)) current.recentStages = []
    // Cập nhật danh sách công đoạn gần đây (tối đa 5 công đoạn, không trùng)
    const existingStages = current.recentStages.filter(s => s !== cleanStage)
    current.recentStages = [cleanStage, ...existingStages].slice(0, 5)

    this.saveUserActivity(user, current)
    return current
  },

  /**
   * Ghi nhận PO gần nhất
   */
  recordPo(user, poCode, stageName = '') {
    const cleanPo = (poCode || '').trim()
    if (!cleanPo) return this.getUserActivity(user)

    const current = this.getUserActivity(user)
    const now = new Date().toISOString()

    current.lastPo = {
      code: cleanPo,
      stage: stageName || current.lastStage?.name || '',
      timestamp: now
    }

    if (!Array.isArray(current.recentPos)) current.recentPos = []
    // Cập nhật danh sách PO gần đây (tối đa 5 PO, không trùng)
    const existingPos = current.recentPos.filter(p => p !== cleanPo)
    current.recentPos = [cleanPo, ...existingPos].slice(0, 5)

    this.saveUserActivity(user, current)
    return current
  },

  /**
   * Ghi nhận phiếu kiểm tra gần nhất
   */
  recordTicket(user, ticket) {
    if (!ticket) return this.getUserActivity(user)

    const current = this.getUserActivity(user)
    if (!Array.isArray(current.recentTickets)) current.recentTickets = []
    if (!Array.isArray(current.recentStages)) current.recentStages = []
    if (!Array.isArray(current.recentPos)) current.recentPos = []
    const now = new Date().toISOString()
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
                   new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

    const normalizedTicket = {
      id: ticket.id,
      code: ticket.code || (ticket.id ? `KT${ticket.id}` : ''),
      mode: ticket.mode || 'first_sample',
      stage: ticket.stage || '',
      po: ticket.po || ticket.batch_no || '',
      product: ticket.product || ticket.product_sku || ticket.part_name || '',
      spec: ticket.spec || ticket.specification || '',
      sampleQty: ticket.sampleQty !== undefined ? ticket.sampleQty : (ticket.sample_qty || 0),
      errorQty: ticket.errorQty !== undefined ? ticket.errorQty : (ticket.error_qty || 0),
      palletCode: ticket.palletCode || ticket.pallet_code || '',
      result: (ticket.result === 'pass' || ticket.conclusion === 'pass' || ticket.result === 'Đạt') ? 'pass' : 'fail',
      action: ticket.action || '',
      status: ticket.status || 'pending',
      timestamp: ticket.created_at || now,
      time_str: ticket.time_str || nowStr
    }

    current.lastTicket = normalizedTicket

    // Đồng thời cập nhật lastStage và lastPo nếu phiếu có thông tin
    if (normalizedTicket.stage) {
      current.lastStage = {
        name: normalizedTicket.stage,
        timestamp: now
      }
      const existingStages = current.recentStages.filter(s => s !== normalizedTicket.stage)
      current.recentStages = [normalizedTicket.stage, ...existingStages].slice(0, 5)
    }

    if (normalizedTicket.po) {
      current.lastPo = {
        code: normalizedTicket.po,
        stage: normalizedTicket.stage || '',
        timestamp: now
      }
      const existingPos = current.recentPos.filter(p => p !== normalizedTicket.po)
      current.recentPos = [normalizedTicket.po, ...existingPos].slice(0, 5)
    }

    // Đưa vào danh sách phiếu gần đây (tối đa 10 phiếu)
    const existingTickets = current.recentTickets.filter(
      t => (t.id && t.id !== normalizedTicket.id) || (t.code && t.code !== normalizedTicket.code)
    )
    current.recentTickets = [normalizedTicket, ...existingTickets].slice(0, 10)

    this.saveUserActivity(user, current)
    return current
  },

  /**
   * Đồng bộ dữ liệu hoạt động cá nhân từ Backend API
   * Hữu ích khi người dùng đổi tablet mới hoặc vừa xóa cache
   */
  async fetchRecentActivityFromBackend(user) {
    if (!user) return null
    try {
      const inspectorName = user.full_name || user.username
      const inspectorId = user.id
      const res = await apiClient.get('/inspections/my-recent-activity', {
        params: {
          inspector_name: inspectorName,
          inspector_id: inspectorId,
          limit: 10
        }
      })

      const data = res?.data !== undefined ? res.data : res
      if (!data) return this.getUserActivity(user)

      const local = this.getUserActivity(user)

      // Merge: Nếu local chưa có lastTicket hoặc server mới hơn -> lấy server
      const merged = {
        ...local,
        lastTicket: local.lastTicket || data.last_ticket || null,
        lastStage: local.lastStage || data.last_stage || null,
        lastPo: local.lastPo || data.last_po || null,
      }

      if (Array.isArray(data.recent_tickets) && data.recent_tickets.length > 0) {
        if (!merged.recentTickets || merged.recentTickets.length === 0) {
          merged.recentTickets = data.recent_tickets.map(t => ({
            id: t.id,
            code: t.code,
            mode: t.mode,
            stage: t.stage,
            po: t.po,
            product: t.product,
            spec: t.spec,
            sampleQty: t.sample_qty,
            errorQty: t.error_qty,
            palletCode: t.pallet_code,
            result: t.result,
            status: t.status,
            timestamp: t.created_at,
            time_str: t.time_str
          }))
        }
      }

      this.saveUserActivity(user, merged)
      return merged
    } catch (e) {
      console.warn('[userActivityService] fetchRecentActivityFromBackend failed:', e)
      return this.getUserActivity(user)
    }
  }
}

export default userActivityService
