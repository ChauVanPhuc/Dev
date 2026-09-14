import { useState, useEffect, useCallback } from 'react'
import { inspectionService } from '../services/inspectionService'
import { transferService } from '../services/transferService'
import useProduction_v2Store from '../Models/production_v2Store'

export const useInspectionController = () => {
  const { inspectionFilters, setInspectionFilters } = useProduction_v2Store()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [availableMonths, setAvailableMonths] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    transferService.getAvailableMonths().then((data) => {
      if (data && data.months) {
        setAvailableMonths(data.months)
      }
    }).catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inspectionService.getList(inspectionFilters)
      setTickets(res.items || [])
      setTotal(res.total || 0)
      if (res.total_pending !== undefined) {
        setPendingCount(res.total_pending)
      } else if (inspectionFilters.tab === 'pending') {
        setPendingCount(res.total || 0)
      }
    } catch (e) {
      setError(e.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [inspectionFilters])

  useEffect(() => { fetchList() }, [fetchList])

  const createTicket = async (payload) => {
    const result = await inspectionService.create(payload)
    fetchList()
    return result
  }

  const confirmTicket = async (id, data) => {
    const result = await inspectionService.confirm(id, data)
    fetchList()
    return result
  }

  const totalPages = Math.ceil(total / 10)

  return {
    tickets, total, totalPages, loading, error, availableMonths,
    filters: inspectionFilters,
    setFilters: setInspectionFilters,
    pendingCount,
    createTicket,
    confirmTicket,
    refresh: fetchList,
  }
}

export const useInspectionDetail = (id) => {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [steps, setSteps] = useState([])
  const [images, setImages] = useState([])

  useEffect(() => {
    if (!id || id === 'NEW') { setLoading(false); return }
    inspectionService.getById(id).then((data) => {
      setTicket(data)
      if (Array.isArray(data.images) && data.images.length > 0) {
        setImages(data.images)
      }
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        setSteps(data.steps)
      }
      setLoading(false)
    }).catch((e) => {
      setError(e.message)
      setLoading(false)
    })
  }, [id])

  const [currentGuide, setCurrentGuide] = useState(null)

  const loadGuide = async (mode, productId = null, stageId = null, guideId = null, parameter = null) => {
    try {
      const guideData = await inspectionService.getGuide(mode, productId, stageId, guideId, parameter)
      setCurrentGuide(guideData || null)
      if (guideData && Array.isArray(guideData.steps)) {
        const formattedSteps = guideData.steps.map((st) => ({
          id: st.id,
          step_no: st.step_no,
          step: st.step_no,
          title: st.title || `Bước ${st.step_no}`,
          description: st.title || `Bước ${st.step_no}`,
          standard: st.standard || st.content || '',
          content: st.content || st.note || st.standard || '',
          note: st.note || st.content || '',
          role: st.role || st.assignee_role || '',
          assignee_role: st.assignee_role || st.role || '',
          sub_steps: Array.isArray(st.sub_steps) ? st.sub_steps : [],
          images: Array.isArray(st.images) ? st.images : [],
          qty: 1,
          result: 'pass',
          guide_name: guideData.name,
          guide_code: guideData.code
        }))
        setSteps(formattedSteps)
        return { guide: guideData, steps: formattedSteps }
      } else {
        setSteps([])
        return { guide: null, steps: [] }
      }
    } catch (e) {
      console.warn('Lỗi khi tải hướng dẫn:', e)
      setCurrentGuide(null)
      setSteps([])
      return { guide: null, steps: [] }
    }
  }

  const addImage = async (file) => {
    if (!file) return
    const tempUrl = (file instanceof File || file instanceof Blob) ? URL.createObjectURL(file) : null
    if (tempUrl) {
      setImages((prev) => [...prev, tempUrl])
    }
    try {
      const result = await inspectionService.uploadImage(file)
      const serverUrl = result?.url || result?.path
      if (serverUrl && tempUrl) {
        setImages((prev) => prev.map((img) => (img === tempUrl ? serverUrl : img)))
      }
      return result
    } catch (err) {
      console.warn('Lỗi khi tải ảnh lên server:', err)
      if (tempUrl) {
        setImages((prev) => prev.filter((img) => img !== tempUrl))
      }
    }
  }

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx))

  const getLastResult = async (mode, productId, poCode) => {
    return await inspectionService.getLastResult(mode, productId, poCode)
  }

  return { ticket, loading, error, steps, setSteps, images, setImages, addImage, removeImage, loadGuide, getLastResult, currentGuide }
}
