import { useState, useEffect, useCallback } from 'react'
import { transferService } from '../services/transferService'
import useProduction_v2Store from '../Models/production_v2Store'

export const useTransferController = () => {
  const { transferFilters, setTransferFilters } = useProduction_v2Store()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [availableMonths, setAvailableMonths] = useState([])
  const [availableParts, setAvailableParts] = useState([])

  // Fetch available months once on mount
  useEffect(() => {
    const loadMonths = async () => {
      const data = await transferService.getAvailableMonths()
      setAvailableMonths(data.months || [])
      if (!transferFilters.month && data.default_month) {
        setTransferFilters({ month: data.default_month })
      }
    }
    loadMonths()
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await transferService.getList(transferFilters)
      setTickets(res.items || [])
      setTotal(res.total || 0)
      if (res.available_parts) {
        setAvailableParts(res.available_parts)
      }
    } catch (e) {
      setError(e.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [transferFilters])

  useEffect(() => { fetchList() }, [fetchList])

  const createTicket = async (payload) => {
    const result = await transferService.create(payload)
    fetchList()
    return result
  }

  const confirmTicket = async (id, quantities) => {
    const result = await transferService.confirm(id, quantities)
    fetchList()
    return result
  }

  const pendingCount = tickets.filter((t) => t.status === 'pending' || t.status === 'delivering' || t.status === 'Chờ xác nhận').length

  const totalPages = Math.ceil(total / 10)
  const setPage = (page) => setTransferFilters({ page })

  return {
    tickets, total, totalPages, loading, error,
    availableMonths, availableParts,
    filters: transferFilters,
    setFilters: setTransferFilters,
    pendingCount,
    createTicket,
    confirmTicket,
    refresh: fetchList,
  }
}

export const useTransferDetail = (id) => {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [images, setImages] = useState([])

  useEffect(() => {
    if (!id || id === 'NEW') { setLoading(false); return }
    transferService.getById(id).then((data) => {
      setTicket(data)
      setLoading(false)
    }).catch((e) => {
      setError(e.message)
      setLoading(false)
    })
  }, [id])

  const addImage = async (file) => {
    const result = await transferService.uploadImage(file)
    setImages((prev) => [...prev, result.url])
    return result
  }

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx))

  return { ticket, loading, error, images, addImage, removeImage }
}
