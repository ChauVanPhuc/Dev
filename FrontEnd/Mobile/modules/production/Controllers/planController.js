import { useState, useCallback } from 'react'
import apiClient from '@shared/services/api'

/**
 * Plan Controller (Custom Hook)
 * Xử lý logic nghiệp vụ cho việc lấy dữ liệu Kế hoạch và Đơn hàng từ Backend.
 */
export const usePlanController = () => {
  const [plans, setPlans] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Lấy danh sách kế hoạch sản xuất
  const fetchPlans = useCallback(async (userStage = '') => {
    setLoading(true)
    setError('')
    try {
      const url = userStage ? `plans/?user_stage=${encodeURIComponent(userStage)}` : 'plans/'
      const response = await apiClient.get(url)
      if (Array.isArray(response.data)) {
        setPlans(response.data)
        return response.data
      }
    } catch (err) {
      setError('Không thể lấy danh sách kế hoạch sản xuất')
    } finally {
      setLoading(false)
    }
  }, [])

  // Lấy danh sách đơn hàng
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('orders/')
      if (Array.isArray(response.data)) {
        setOrders(response.data)
        return response.data
      }
    } catch (err) {
      setError('Không thể lấy danh sách đơn hàng')
    } finally {
      setLoading(false)
    }
  }, [])

  // Lấy danh sách phiếu bàn giao theo KHSX
  const fetchDeliveriesByPlan = useCallback(async (planId, skip = 0, limit = 100) => {
    if (!planId) return []
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get(`deliveries/${planId}?skip=${skip}&limit=${limit}`)
      return response.data
    } catch (err) {
      setError('Không thể lấy lịch sử bàn giao')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Lấy chi tiết đầy đủ của một kế hoạch (Bao gồm cả BOM, có hỗ trợ lọc công đoạn, lọc theo PO/Cont)
  const fetchPlanDetail = useCallback(async (planId, stage = null, userStage = null, simple = false, orderIds = null) => {
    if (!planId) return null
    setLoading(true)
    try {
      // Nếu có stage, truyền thêm vào query string để Backend lọc giảm tải dữ liệu, limit=0 để lấy tất cả đơn hàng
      let url = stage ? `plans/${planId}?stage=${encodeURIComponent(stage)}&limit=0` : `plans/${planId}?limit=0`
      if (userStage) {
        url += `&user_stage=${encodeURIComponent(userStage)}`
      }
      if (simple) {
        url += `&simple=true`
      }
      if (orderIds && orderIds !== 'ALL') {
        url += `&order_ids=${orderIds}`
      }
      const response = await apiClient.get(url)
      return response.data
    } catch (err) {
      console.error('[API Error] fetchPlanDetail:', err)
      setError('Không thể lấy thông tin chi tiết kế hoạch')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    plans,
    orders,
    loading,
    error,
    fetchPlans,
    fetchOrders,
    fetchDeliveriesByPlan,
    fetchPlanDetail
  }
}
