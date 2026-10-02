import { useState, useEffect, useCallback } from 'react'
import { inspectionService } from '../services/inspectionService'
import { transferService } from '../services/transferService'
import useProduction_v2Store from '../Models/production_v2Store'
import useAuthStore from '@modules/auth/Models/authModel'

export const useInspectionController = () => {
  const { inspectionFilters, setInspectionFilters } = useProduction_v2Store()
  const user = useAuthStore((state) => state.user)
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [availableMonths, setAvailableMonths] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isUserFiltered, setIsUserFiltered] = useState(false)
  const [hasUserData, setHasUserData] = useState(false)

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
      const res = await inspectionService.getList({
        ...inspectionFilters,
        user_id: user?.id,
        user_name: user?.full_name || user?.username || '',
      })
      setTickets(res.items || [])
      setTotal(res.total || 0)
      setIsUserFiltered(Boolean(res.is_user_filtered))
      setHasUserData(Boolean(res.has_user_data))
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
  }, [inspectionFilters, user?.id, user?.full_name, user?.username])

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
    isUserFiltered,
    hasUserData,
    currentUser: user,
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
        setImages(data.images.map((img, idx) => {
          if (typeof img === 'object' && img !== null) return img
          return {
            id: `server_img_${idx}`,
            url: img,
            serverUrl: img,
            file: null,
            status: 'success',
            progress: 100,
            errorMsg: null,
          }
        }))
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
          title: st.title || `Bước ${st.step_no}`,
          content: st.content || '',
          standard: st.standard || st.content || '',
          result: 'pass',
          note: '',
          images: Array.isArray(st.images) ? st.images : []
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
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const tempUrl = (file instanceof File || file instanceof Blob) ? URL.createObjectURL(file) : null

    const newImageObj = {
      id,
      url: tempUrl || '',
      serverUrl: null,
      file,
      status: 'uploading',
      progress: 0,
      errorMsg: null,
    }

    setImages((prev) => [...prev, newImageObj])

    try {
      const result = await inspectionService.uploadImage(file, {
        onProgress: (percent) => {
          setImages((prev) => prev.map((img) => (img?.id === id ? { ...img, progress: percent } : img)))
        },
      })
      const serverUrl = result?.url || result?.path
      if (serverUrl) {
        setImages((prev) => prev.map((img) => (img?.id === id ? { ...img, status: 'success', serverUrl, url: serverUrl, progress: 100 } : img)))
      }
      return result
    } catch (err) {
      console.warn('[useInspectionController] Upload ảnh lên server thất bại, lưu trạng thái lỗi để thử lại:', err)
      setImages((prev) => prev.map((img) => (img?.id === id ? { ...img, status: 'error', errorMsg: 'Mạng yếu, chưa tải lên được' } : img)))
    }
  }

  const retryImage = async (idOrIndex) => {
    let targetImg = null
    setImages((prev) => {
      targetImg = prev.find((img, idx) => img?.id === idOrIndex || idx === idOrIndex)
      return prev.map((img, idx) => {
        if (img?.id === idOrIndex || idx === idOrIndex) {
          return { ...img, status: 'uploading', progress: 0, errorMsg: null }
        }
        return img
      })
    })

    if (!targetImg || !targetImg.file) return

    const id = targetImg.id || idOrIndex
    try {
      const result = await inspectionService.uploadImage(targetImg.file, {
        onProgress: (percent) => {
          setImages((prev) => prev.map((img) => (img?.id === id ? { ...img, progress: percent } : img)))
        },
      })
      const serverUrl = result?.url || result?.path
      if (serverUrl) {
        setImages((prev) => prev.map((img) => (img?.id === id ? { ...img, status: 'success', serverUrl, url: serverUrl, progress: 100 } : img)))
      }
      return result
    } catch (err) {
      console.warn('[useInspectionController] Thử lại tải ảnh vẫn thất bại:', err)
      setImages((prev) => prev.map((img) => (img?.id === id ? { ...img, status: 'error', errorMsg: 'Mạng yếu, thử lại thất bại' } : img)))
    }
  }

  const removeImage = (idOrIndex) => {
    setImages((prev) => {
      const target = prev.find((img, idx) => img?.id === idOrIndex || idx === idOrIndex)
      if (target?.url && String(target.url).startsWith('blob:')) {
        try { URL.revokeObjectURL(target.url) } catch (_) {}
      }
      return prev.filter((img, idx) => img?.id !== idOrIndex && idx !== idOrIndex)
    })
  }

  const getLastResult = async (mode, productId, poCode) => {
    return await inspectionService.getLastResult(mode, productId, poCode)
  }

  return { ticket, loading, error, steps, setSteps, images, setImages, addImage, retryImage, removeImage, loadGuide, getLastResult, currentGuide }
}
