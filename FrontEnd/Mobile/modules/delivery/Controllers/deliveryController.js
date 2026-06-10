import { useState, useCallback } from 'react'
import apiClient from '@shared/services/api'

/**
 * Delivery Controller Custom Hook
 * Quản lý toàn bộ logic nghiệp vụ, gọi API và quản lý trạng thái cho quy trình
 * Giao nhận hàng, kiểm tra QC và xử lý Trả hàng (Returns).
 */
export const useDeliveryController = () => {
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // 1. Lấy ID dự kiến cho phiếu bàn giao mới
  const fetchNextDeliveryId = useCallback(async () => {
    try {
      const res = await apiClient.get('/deliveries/next-id')
      return res.data?.next_id || null
    } catch (err) {
      console.error('Error fetching next delivery id:', err)
      return null
    }
  }, [])

  // 2. Lấy danh sách sản phẩm/đơn hàng cho chi tiết bàn giao
  const fetchPartProducts = useCallback(async (planId, partName, spec = '', stage = '') => {
    try {
      const params = new URLSearchParams({ part_name: partName })
      if (spec && spec !== 'Không có') {
        params.append('spec', spec)
      }
      if (stage) {
        params.append('stage', stage)
      }
      const res = await apiClient.get(`/plans/${planId}/part-products?${params.toString()}`)
      return res.data || []
    } catch (err) {
      console.error('Error fetching part products:', err)
      return []
    }
  }, [])

  // 3. Lấy danh sách kết quả kiểm tra chất lượng đầu vào
  const fetchInspectionsByPlan = useCallback(async (planId, stage = '') => {
    try {
      const res = await apiClient.get(`/inspections/plan/${planId}?stage=${encodeURIComponent(stage)}`)
      return res.data || []
    } catch (err) {
      console.error('Error fetching inspections by plan:', err)
      return []
    }
  }, [])

  // 4. Tạo mới hoặc cập nhật phiếu bàn giao
  const createOrUpdateDelivery = useCallback(async (payload, isEditMode = false, editDeliveryId = null, photos = []) => {
    setIsSubmitting(true)
    setError(null)
    try {
      let response
      if (isEditMode && editDeliveryId) {
        // Chế độ chỉnh sửa: Gửi JSON qua PATCH
        const updatePayload = {
          part_name: payload.part_name,
          specification: payload.specification,
          quantity_total: payload.quantity,
          residual: payload.residual,
          note: payload.note,
          moisture_min: payload.moisture_min ? parseFloat(payload.moisture_min) : null,
          moisture_max: payload.moisture_max ? parseFloat(payload.moisture_max) : null
        }
        response = await apiClient.patch(`/deliveries/${editDeliveryId}/update`, updatePayload)
      } else {
        // Chế độ tạo mới: Gửi FormData qua POST
        const formData = new FormData()
        formData.append('plan_id', payload.plan_id)
        formData.append('receiving_stage', payload.receiving_stage)
        formData.append('note', payload.note || '')
        formData.append('user_id', payload.user_id)
        formData.append('quantity', payload.quantity)
        formData.append('residual', payload.residual)
        formData.append('part_name', payload.part_name)
        formData.append('specification', payload.specification || '')
        formData.append('delivery_stage', payload.delivery_stage)
        formData.append('status', payload.status || 'Chờ Nhận Hàng')
        if (payload.backup_qr) {
          formData.append('backup_qr', payload.backup_qr)
        }
        if (payload.moisture_min) formData.append('moisture_min', payload.moisture_min)
        if (payload.moisture_max) formData.append('moisture_max', payload.moisture_max)
        if (payload.order_ids) {
          formData.append('order_ids', payload.order_ids)
        }

        photos.forEach(p => {
          if (p.file) formData.append('files', p.file)
        })

        response = await apiClient.post('/deliveries/', formData)
      }
      return response.data
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Không thể lưu phiếu bàn giao.'
      setError(errMsg)
      throw new Error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  // 5. Lấy thông tin chi tiết một phiếu bàn giao
  const fetchDeliveryDetail = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(`/deliveries/detail/${id}`)
      return res.data
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Không thể lấy thông tin chi tiết phiếu.'
      setError(errMsg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // 6. Xác nhận nhận hàng của Sản xuất
  const confirmDeliveryReceipt = useCallback(async (id, totalReceived, userId) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        user_id: userId,
        sx_receipt: userId,
        quantity_received: parseInt(totalReceived) || 0,
        status: 'Chờ Kiểm Tra'
      }
      const res = await apiClient.patch(`/deliveries/${id}/confirm`, payload)
      return res.data
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Lỗi khi xác nhận nhận hàng.'
      setError(errMsg)
      throw new Error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  // 7. Xóa phiếu bàn giao khi chưa nhận
  const deleteDelivery = useCallback(async (id) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await apiClient.delete(`/deliveries/${id}`)
      return res.data
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Không thể xóa phiếu.'
      setError(errMsg)
      throw new Error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  // 8. Lưu kết quả kiểm tra chất lượng QC
  const saveQCResults = useCallback(async (id, qcData, totalInspected, userId) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const resultsToSave = {}
      Object.keys(qcData).forEach(cat => {
        if (['note', 'error_qty', 'scrap_qty'].includes(cat)) return
        if (qcData[cat] && typeof qcData[cat] === 'object') {
          const { images, ...data } = qcData[cat]
          resultsToSave[cat] = data
        }
      })

      const formData = new FormData()
      formData.append('results_json', JSON.stringify(resultsToSave))
      formData.append('note', qcData.note || '')

      const tags = []
      const categories = ['size', 'structure', 'visual', 'moisture', 'bend', 'accessories', 'visual_ext', 'functional']
      categories.forEach(cat => {
        if (qcData[cat] && Array.isArray(qcData[cat].images)) {
          qcData[cat].images.forEach(imgFile => {
            if (imgFile instanceof File) {
              formData.append('files', imgFile)
              tags.push(`qc_${cat}`)
            }
          })
        }
      })

      formData.append('category_tags', JSON.stringify(tags))
      formData.append('quantity_error', parseInt(qcData.scrap_qty) || 0)
      formData.append('quantity_returned', 0)
      formData.append('quantity_inspection', parseInt(totalInspected) || 0)
      if (userId) {
        formData.append('user_id', userId)
      }

      const res = await apiClient.post(`/qc/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Không thể lưu kết quả kiểm tra QC.'
      setError(errMsg)
      throw new Error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  // 9. Lập phiếu trả hàng lỗi
  const createReturnSlip = useCallback(async (deliveryId, planId, fromStage, toStage, partName, returnQty, returnNote, returnPhotos, userId) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('plan_id', planId)
      formData.append('delivery_id', deliveryId)
      formData.append('from_stage', fromStage)
      formData.append('to_stage', toStage)
      formData.append('part_name', partName)
      formData.append('quantity', parseInt(returnQty) || 0)
      formData.append('note', returnNote || '')
      formData.append('user_id', userId)
      formData.append('status', 'Chờ SX Xác Nhận')
      formData.append('allocation_method', 'LIFO')

      returnPhotos.forEach(p => {
        if (p.file) formData.append('files', p.file)
      })

      const res = await apiClient.post('/returns/', formData)
      return res.data
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Không thể lập phiếu trả hàng.'
      setError(errMsg)
      throw new Error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  // 10. Xác nhận nhận hàng trả từ phía sản xuất
  const confirmReturnSlip = useCallback(async (returnId, userId, note) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await apiClient.patch(`/returns/${returnId}/confirm`, {
        user_id: userId,
        sx_confirmation_note: note
      })
      return res.data
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Không thể xác nhận phiếu trả hàng.'
      setError(errMsg)
      throw new Error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  // 11. Lấy danh sách phiếu trả hàng liên quan của kế hoạch
  const fetchReturnsByPlan = useCallback(async (planId) => {
    try {
      const res = await apiClient.get(`/returns/${planId}`)
      return res.data || []
    } catch (err) {
      console.error('Error fetching returns by plan:', err)
      return []
    }
  }, [])

  // 12. Lấy danh sách phiếu trả hàng liên quan của một phiếu giao
  const fetchReturnsByDelivery = useCallback(async (deliveryId) => {
    try {
      const res = await apiClient.get(`/returns/by-delivery/${deliveryId}`)
      return res.data ? [res.data] : []
    } catch (err) {
      console.error('Error fetching returns by delivery:', err)
      return []
    }
  }, [])

  // 13. Lấy dữ liệu QC chi tiết từ server
  const fetchQCDetail = useCallback(async (deliveryId) => {
    try {
      const res = await apiClient.get(`/qc/${deliveryId}`)
      return res.data || null
    } catch (err) {
      console.error('Error fetching QC detail:', err)
      return null
    }
  }, [])

  return {
    loading,
    isSubmitting,
    error,
    fetchNextDeliveryId,
    fetchPartProducts,
    fetchInspectionsByPlan,
    createOrUpdateDelivery,
    fetchDeliveryDetail,
    confirmDeliveryReceipt,
    deleteDelivery,
    saveQCResults,
    createReturnSlip,
    confirmReturnSlip,
    fetchReturnsByPlan,
    fetchReturnsByDelivery,
    fetchQCDetail
  }
}
