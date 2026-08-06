import { useState, useEffect, useCallback } from 'react'
import { inspectionService } from '../services/inspectionService'
import useProduction_v2Store from '../Models/production_v2Store'

export const useInspectionController = () => {
  const { inspectionFilters, setInspectionFilters } = useProduction_v2Store()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inspectionService.getList(inspectionFilters)
      setTickets(res.items)
      setTotal(res.total)
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

  const pendingCount = tickets.filter((t) => t.status === 'pending').length
  const totalPages = Math.ceil(total / 10)

  return {
    tickets, total, totalPages, loading, error,
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
      setLoading(false)
    }).catch((e) => {
      setError(e.message)
      setLoading(false)
    })
  }, [id])

  const loadGuide = async (mode, productId) => {
    const result = await inspectionService.getGuide(mode, productId)
    setSteps(result)
    return result
  }

  const addImage = async (file) => {
    const result = await inspectionService.uploadImage(file)
    setImages((prev) => [...prev, result.url])
    return result
  }

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx))

  const getLastResult = async (mode, productId, poCode) => {
    return await inspectionService.getLastResult(mode, productId, poCode)
  }

  return { ticket, loading, error, steps, setSteps, images, addImage, removeImage, loadGuide, getLastResult }
}
