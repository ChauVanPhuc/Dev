import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard'
import DataTable from '@mobile/Shared/Views/components/ui/DataTable'
import { usePlanController } from '@modules/production/Controllers/planController'
import { X, CheckCircle2, Clock, AlertCircle, Filter, ArrowDownWideNarrow, Check, Search, Calendar, CheckSquare, Square, RotateCcw } from 'lucide-react'
import useAuthStore from '@modules/auth/Models/authModel'
import apiClient from '@shared/services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Toast Notification Component
// ─────────────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = 'success', onDone }) => {
  useEffect(() => {
    const t = setTimeout(() => onDone(), 3000)
    return () => clearTimeout(t)
  }, [onDone])
  const bg = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#f59e0b'
  return (
    <div style={{
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, backgroundColor: bg, color: '#fff', padding: '12px 24px',
      borderRadius: '16px', fontWeight: '800', fontSize: '0.9rem',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
      maxWidth: '90vw', textAlign: 'center'
    }}>
      {message}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getWeekStart = (dateStr) => {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const addDays = (dateStr, days) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const formatDisplayDate = (dateStr) => {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

const isToday = (dateStr) => {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

const getDaysInMonth = (dateStr) => {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth()
  const daysCount = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysCount }, (_, i) => {
    const dayDate = new Date(year, month, i + 1)
    return dayDate.toISOString().split('T')[0]
  })
}

// Hàm chuẩn hoá tiếng Việt không dấu siêu mạnh mẽ để khớp 100% dữ liệu BOM
const normalizeString = (str) => {
  if (!str) return ''
  let s = String(str).toLowerCase().normalize('NFC').trim()
  s = s.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
  s = s.replace(/[èéẹẻẽêềếệểễ]/g, 'e')
  s = s.replace(/[ìíịỉĩ]/g, 'i')
  s = s.replace(/[òóọỏõôồốồổỗơờớợởỡ]/g, 'o')
  s = s.replace(/[ùúụủũưừứựửữ]/g, 'u')
  s = s.replace(/[ỳýỵỷỹ]/g, 'y')
  s = s.replace(/[đ]/g, 'd')
  // Thay các ký tự viết tắt hoặc đặc biệt
  s = s.replace(/\s+/g, ' ')
  return s
}

const formatQty = (val) => {
  if (val === undefined || val === null) return 0
  const num = parseFloat(val)
  if (isNaN(num)) return 0
  return Number(num.toFixed(5))
}


/**
 * PlanTracking Screen — Phiên bản chuẩn tách trang theo Route URL
 */
const PlanTracking = ({ defaultTab = 'progress' }) => {
  const { plans, fetchPlans, fetchDeliveriesByPlan, loading: controllerLoading } = usePlanController()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Đồng bộ activeTab dựa trên pathname (từng trang riêng biệt)
  const activeTab = useMemo(() => {
    if (location.pathname === '/plan-calendar') return 'calendar'
    if (location.pathname === '/plan-create') return 'create'
    return 'progress'
  }, [location.pathname])

  const handleTabChange = (tab) => {
    if (tab === 'progress') navigate('/plan')
    else if (tab === 'calendar') navigate('/plan-calendar')
    else if (tab === 'create') navigate('/plan-create')
  }

  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedOrderCode, setSelectedOrderCode] = useState('ALL')
  const [deliveries, setDeliveries] = useState([])
  const [detailedPlan, setDetailedPlan] = useState(null)
  
  // State lưu trữ dữ liệu KHSX đầy đủ có BOM để làm dropdown/available items (giải quyết bug rỗng)
  const [fullDetailedPlan, setFullDetailedPlan] = useState(null)
  
  const [displayOrders, setDisplayOrders] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const itemsPerPage = 15
  const totalPages = Math.ceil(totalOrders / itemsPerPage)
  const [loadingMore, setLoadingMore] = useState(false)
  const [detailModal, setDetailModal] = useState({ isOpen: false, product: null })
  const [loading, setLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState(null)
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() })
  }, [])

  // Filters (Màn hình 1 - Tiến độ)
  const [filterModal, setFilterModal] = useState(false)
  const [sortModal, setSortModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('NAME_ASC')
  const [activePrefix, setActivePrefix] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Lọc chung cho Tạo KHSX và Xem KHSX
  const [selectedStage, setSelectedStage] = useState('Định hình')
  const [selectedFactory, setSelectedFactory] = useState('Nhà máy 2')

  // Create Mode state (Ảnh 2 & 3)
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0])
  const [createViewType, setCreateViewType] = useState('po') // 'po' | 'detail'
  const [selectedPoForCreate, setSelectedPoForCreate] = useState('')
  const [selectedDetailForCreate, setSelectedDetailForCreate] = useState('')
  const [selectedRows, setSelectedRows] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false)

  // Calendar Mode state (Ảnh 5)
  const [calendarViewMode, setCalendarViewMode] = useState('weekly') // 'weekly' | 'monthly'
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split('T')[0])
  const [weeklyPlanData, setWeeklyPlanData] = useState([])

  const userStage = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || ''

  // Load plans list
  useEffect(() => { fetchPlans(userStage) }, [fetchPlans, userStage])

  const sortedPlans = useMemo(() => {
    if (!Array.isArray(plans)) return []
    return [...plans].sort((a, b) => {
      if ((a.year || 0) !== (b.year || 0)) return (b.year || 0) - (a.year || 0)
      return (b.month || 0) - (a.month || 0)
    })
  }, [plans])

  const planOptions = useMemo(() => sortedPlans.map(p => ({ label: p.name, value: p.id.toString() })), [sortedPlans])

  const formatPlanLabel = (name) => {
    if (!name) return 'Không tên'
    const dates = name.match(/\d{2}\/\d{2}/g)
    if (dates && dates.length >= 2) return `KHSX: ${dates[0]} - ${dates[1]}`
    return name.replace('KẾ HOẠCH SẢN XUẤT - ', 'KHSX: ')
  }

  const shortPlanOptions = useMemo(() =>
    sortedPlans.map(p => ({ label: formatPlanLabel(p.name), value: p.id.toString() })),
    [sortedPlans]
  )

  const currentPlan = detailedPlan || plans.find(p => p.id.toString() === selectedPlanId)
  const fullPlan = plans.find(p => p.id.toString() === selectedPlanId)

  const orderOptions = useMemo(() => [
    { label: 'Tất cả đơn', value: 'ALL' },
    ...(fullDetailedPlan && Array.isArray(fullDetailedPlan.orders)
      ? fullDetailedPlan.orders.map(o => ({ label: o.name || o.order_code, value: o.name || o.order_code }))
      : [])
  ], [fullDetailedPlan])

  // Lấy các công đoạn thực tế có trong PO của KHSX này
  const stageOptions = useMemo(() => {
    const stageSet = new Set()
    const targetPlan = fullDetailedPlan || fullPlan
    if (targetPlan?.orders) {
      targetPlan.orders.forEach(o => {
        if (o.products) {
          o.products.forEach(p => {
            const traverseBom = (items) => {
              if (!items) return
              items.forEach(item => {
                if (item.input_stage) stageSet.add(item.input_stage)
                if (item.output_stage) stageSet.add(item.output_stage)
                traverseBom(item.parts || item.components || item.children || item.bom_details)
              })
            }
            traverseBom(p.bom_details || p.components || p.parts || [])
          })
        }
      })
    }
    const stagesFromBom = Array.from(stageSet).sort()
    const defaults = ['Định hình', 'Lắp ráp', 'Đóng gói']
    const merged = [...new Set([...(stagesFromBom.length ? stagesFromBom : defaults)])]
    return merged.map(s => ({ label: s, value: s }))
  }, [fullDetailedPlan, fullPlan])

  // Auto select plan
  useEffect(() => {
    if (planOptions.length > 0 && !selectedPlanId) setSelectedPlanId(planOptions[0].value)
  }, [planOptions, selectedPlanId])

  // Reset when plan changes
  useEffect(() => {
    setActivePrefix('ALL'); setSearchQuery(''); setStatusFilter('ALL')
    setSortOrder('NAME_ASC'); setSelectedOrderCode('ALL'); setCurrentPage(1)
    setDisplayOrders([]); setDetailedPlan(null); setTotalOrders(0); setDeliveries([])
    if (selectedPlanId) loadPage(1, 'ALL', '', 'ALL', 'NAME_ASC', 'ALL')
  }, [selectedPlanId])

  // Tải trực tiếp dữ liệu KHSX có BOM từ API bằng apiClient để đảm bảo ổn định tối đa
  useEffect(() => {
    if (selectedPlanId) {
      setLoading(true)
      apiClient.get(`plans/${selectedPlanId}?limit=0&simple=false`)
        .then(res => {
          setFullDetailedPlan(res.data)
          setLoading(false)
        })
        .catch(err => {
          console.error("Lỗi tải chi tiết kế hoạch:", err)
          setLoading(false)
        })
    } else {
      setFullDetailedPlan(null)
    }
  }, [selectedPlanId])

  // Reset selectedRows when toggling view type
  useEffect(() => { setSelectedRows([]) }, [createViewType])

  // Load deliveries for details modal
  useEffect(() => {
    if (detailModal.isOpen && selectedPlanId && deliveries.length === 0) {
      fetchDeliveriesByPlan(selectedPlanId, 0, 1000).then(data => setDeliveries(data || []))
    }
  }, [detailModal.isOpen, selectedPlanId])

  // Load page for PO progress
  const loadPage = async (page, p_activePrefix, p_searchQuery, p_status, p_sort, p_orderCode) => {
    if (!selectedPlanId) return
    const _prefix = p_activePrefix !== undefined ? p_activePrefix : activePrefix
    const _search = p_searchQuery !== undefined ? p_searchQuery : searchQuery
    const _status = p_status !== undefined ? p_status : statusFilter
    const _sort = p_sort !== undefined ? p_sort : sortOrder
    const _order = p_orderCode !== undefined ? p_orderCode : selectedOrderCode
    setLoading(true)
    try {
      const skip = (page - 1) * itemsPerPage
      const qParam = _search.trim() ? `&q=${encodeURIComponent(_search.trim())}` : ''
      const prefixParam = _prefix !== 'ALL' ? `&prefix=${encodeURIComponent(_prefix)}` : ''
      const orderCodeParam = _order !== 'ALL' ? `&exact_order=${encodeURIComponent(_order)}` : ''
      const stageParam = selectedStage ? `&user_stage=${encodeURIComponent(selectedStage)}` : ''
      const url = `plans/${selectedPlanId}?skip=${skip}&limit=${itemsPerPage}${qParam}${prefixParam}&status=${_status}&sort_order=${_sort}${orderCodeParam}${stageParam}`
      const response = await apiClient.get(url)
      const data = response.data
      if (data) { setDetailedPlan(data); setDisplayOrders(data.orders || []); setTotalOrders(data.total_orders || 0); setCurrentPage(page) }
    } catch (err) { console.error('[loadPage ERROR]', err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (selectedPlanId && activeTab === 'progress') {
      loadPage(1, activePrefix, searchQuery, statusFilter, sortOrder, selectedOrderCode)
    }
  }, [statusFilter, sortOrder, selectedOrderCode, selectedStage, activeTab])

  const handleFilterChange = (v) => { setActivePrefix(v); loadPage(1, v, searchQuery, statusFilter, sortOrder, selectedOrderCode) }
  const handleSearchChange = (v) => { setSearchQuery(v); loadPage(1, activePrefix, v, statusFilter, sortOrder, selectedOrderCode) }
  const handleStatusChange = (v) => { setStatusFilter(v); setFilterModal(false) }
  const handleSortChange = (v) => { setSortOrder(v); setSortModal(false) }

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return
    setLoadingMore(true)
    try {
      const skip = (newPage - 1) * itemsPerPage
      const qParam = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ''
      const prefixParam = activePrefix !== 'ALL' ? `&prefix=${encodeURIComponent(activePrefix)}` : ''
      const stageParam = selectedStage ? `&user_stage=${encodeURIComponent(selectedStage)}` : ''
      const response = await apiClient.get(`plans/${selectedPlanId}?skip=${skip}&limit=${itemsPerPage}${qParam}${prefixParam}&status={statusFilter}&sort_order=${sortOrder}${stageParam}`)
      if (response.data) { setDetailedPlan(response.data); setDisplayOrders(response.data.orders || []); setTotalOrders(response.data.total_orders || 0); setCurrentPage(newPage); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    } catch (err) { console.error('Error page change:', err) }
    finally { setLoadingMore(false) }
  }

  // ── LỊCH TUẦN & THÁNG ──────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    if (calendarViewMode === 'weekly') {
      const start = getWeekStart(calendarDate)
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    } else {
      return getDaysInMonth(calendarDate)
    }
  }, [calendarDate, calendarViewMode])

  const calendarDateFrom = useMemo(() => calendarDays[0], [calendarDays])
  const calendarDateTo = useMemo(() => calendarDays[calendarDays.length - 1], [calendarDays])

  const fetchWeeklyPlansFromDb = useCallback(async () => {
    if (!selectedPlanId) return
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('plan_date_from', calendarDateFrom)
      params.append('plan_date_to', calendarDateTo)
      if (selectedStage) params.append('stage', selectedStage)
      if (selectedFactory) params.append('factory', selectedFactory)
      const response = await apiClient.get(`plans/daily?${params.toString()}`)
      if (Array.isArray(response.data)) setWeeklyPlanData(response.data)
    } catch (err) { console.error('Lỗi tải kế hoạch tuần/tháng:', err) }
    finally { setLoading(false) }
  }, [selectedPlanId, calendarDateFrom, calendarDateTo, selectedStage, selectedFactory])

  useEffect(() => {
    if (activeTab === 'calendar' && selectedPlanId) fetchWeeklyPlansFromDb()
  }, [activeTab, calendarDate, calendarViewMode, selectedStage, selectedFactory, selectedPlanId])

  const calendarGridRows = useMemo(() => {
    const partMap = {}
    weeklyPlanData.forEach(item => {
      if (!partMap[item.part_name]) partMap[item.part_name] = {}
      partMap[item.part_name][item.plan_date] = item
    })
    return Object.keys(partMap).map(partName => ({ part_name: partName, dates: partMap[partName] }))
  }, [weeklyPlanData])

  // ── BẢNG TẠO KẾ HOẠCH ──────────────────────────────────────────────────────
  const availableBomsForPo = useMemo(() => {
    if (!fullDetailedPlan || !selectedPoForCreate) return []
    const order = fullDetailedPlan.orders?.find(o => (o.name || o.order_code) === selectedPoForCreate)
    if (!order) return []
    const list = []; const processedNames = new Set()
    const traverseBom = (items) => {
      if (!items || !Array.isArray(items)) return
      items.forEach(item => {
        const matchesStage = !selectedStage || 
                             normalizeString(item.input_stage).includes(normalizeString(selectedStage)) || 
                             normalizeString(item.output_stage).includes(normalizeString(selectedStage))
        
        if (matchesStage && item.name && !processedNames.has(item.name)) {
          processedNames.add(item.name)
          const plannedVal = item.planned || item.quantity || 0
          const deliveredVal = item.delivered || 0
          list.push({ part_name: item.name, planned: plannedVal, delivered: deliveredVal, remaining: Math.max(0, plannedVal - deliveredVal) })
        }
        traverseBom(item.parts || item.components || item.children || item.bom_details)
      })
    }
    if (order.products) order.products.forEach(p => traverseBom(p.bom_details || p.components || p.parts || []))
    return list
  }, [fullDetailedPlan, selectedPoForCreate, selectedStage])

  const uniqueDetailNames = useMemo(() => {
    if (!fullDetailedPlan) return []
    const names = new Set()
    const traverse = (items) => {
      if (!items) return
      items.forEach(item => {
        const matchesStage = !selectedStage || 
                             normalizeString(item.input_stage).includes(normalizeString(selectedStage)) || 
                             normalizeString(item.output_stage).includes(normalizeString(selectedStage))
        if (matchesStage && item.name) names.add(item.name)
        traverse(item.parts || item.components || item.children || item.bom_details)
      })
    }
    if (fullDetailedPlan.orders) {
      fullDetailedPlan.orders.forEach(o => {
        if (o.products) o.products.forEach(p => traverse(p.bom_details || p.components || p.parts || []))
      })
    }
    return Array.from(names).sort()
  }, [fullDetailedPlan, selectedStage])

  const availablePosForDetail = useMemo(() => {
    if (!fullDetailedPlan || !selectedDetailForCreate) return []
    const list = []
    const findQtyInBom = (items, targetName) => {
      let qty = 0, del = 0
      const traverse = (parts) => {
        if (!parts) return
        parts.forEach(p => {
          if (p.name === targetName) { qty += (p.planned || p.quantity || 0); del += (p.delivered || 0) }
          traverse(p.parts || p.components || p.children || p.bom_details)
        })
      }
      traverse(items); return { planned: qty, delivered: del }
    }
    if (fullDetailedPlan.orders) {
      fullDetailedPlan.orders.forEach(o => {
        let totalPlanned = 0, totalDelivered = 0
        if (o.products) { o.products.forEach(p => { const res = findQtyInBom(p.bom_details || p.components || p.parts || [], selectedDetailForCreate); totalPlanned += res.planned; totalDelivered += res.delivered }) }
        if (totalPlanned > 0) list.push({ order_code: o.name || o.order_code, planned: totalPlanned, remaining: Math.max(0, totalPlanned - totalDelivered) })
      })
    }
    return list
  }, [fullDetailedPlan, selectedDetailForCreate])

  // Tự động gán PO và Chi tiết đầu tiên khi dữ liệu tải xong để tránh màn hình trống rỗng
  useEffect(() => {
    if (fullDetailedPlan?.orders?.length > 0 && !selectedPoForCreate) {
      setSelectedPoForCreate(fullDetailedPlan.orders[0].name || fullDetailedPlan.orders[0].order_code)
    }
  }, [fullDetailedPlan, selectedPoForCreate])

  useEffect(() => {
    if (uniqueDetailNames.length > 0 && !selectedDetailForCreate) {
      setSelectedDetailForCreate(uniqueDetailNames[0])
    }
  }, [uniqueDetailNames, selectedDetailForCreate])

  // Reset khi đổi công đoạn/KHSX
  useEffect(() => {
    setSelectedPoForCreate('')
    setSelectedDetailForCreate('')
  }, [selectedStage, selectedPlanId])

  const currentSource = createViewType === 'po' ? availableBomsForPo : availablePosForDetail
  const allChecked = currentSource.length > 0 && selectedRows.length === currentSource.length

  const handleToggleRowSelect = (row) => {
    const key = createViewType === 'po' ? 'part_name' : 'order_code'
    const isSelected = selectedRows.some(r => r[key] === row[key])
    setSelectedRows(isSelected ? selectedRows.filter(r => r[key] !== row[key]) : [...selectedRows, row])
  }

  const handleSelectAll = () => {
    setSelectedRows(allChecked ? [] : [...currentSource])
  }

  const handleConfirmDailyPlanSubmit = async () => {
    if (selectedRows.length === 0) return
    try {
      setIsSubmittingPlan(true)
      const payload = selectedRows.map(row => ({
        plan_date: planDate, stage: selectedStage, factory: selectedFactory,
        order_code: createViewType === 'po' ? selectedPoForCreate : row.order_code,
        part_name: createViewType === 'po' ? row.part_name : selectedDetailForCreate,
        planned_qty: parseFloat(row.planned || 0), remaining_qty: parseFloat(row.remaining || 0)
      }))
      const response = await apiClient.post('plans/daily', payload)
      if (response.data) {
        handleTabChange('calendar')
        setSelectedRows([]); setShowConfirmModal(false)
        fetchWeeklyPlansFromDb()
        showToast(`Đã lưu ${payload.length} kế hoạch thành công!`, 'success')
      }
    } catch (err) {
      console.error('Lỗi lưu KHSX:', err)
      showToast('Không thể lưu kế hoạch sản xuất vào Database', 'error')
    } finally { setIsSubmittingPlan(false) }
  }

  const getAugmentedProducts = (order) => {
    if (!order?.products) return []
    return order.products.map(p => {
      let tPlanned = 0, tDelivered = 0
      const rawBom = p.bom_details || p.components || p.parts || []
      const processItems = (items) => {
        if (!items || !Array.isArray(items)) return []
        return items.map(item => {
          const planned = item.planned || 0; const delivered = item.delivered || 0
          tPlanned += planned; tDelivered += delivered
          const children = processItems(item.parts || item.components || item.children || item.bom_details)
          return { name: item.name, planned, delivered, status: delivered >= planned && planned > 0 ? 'Xong' : (delivered > 0 ? 'Dở dang' : 'Chờ'), subParts: children }
        })
      }
      const breakdown = processItems(rawBom)
      let finalProgress = tPlanned > 0 ? (tDelivered / tPlanned) * 100 : 0
      if (typeof p.progress === 'number') finalProgress = p.progress
      const roundedProgress = Math.min(100, Math.round(finalProgress))
      return { ...p, delivered: tDelivered, totalPlannedParts: tPlanned, progress: roundedProgress, status: roundedProgress >= 100 ? 'Hoàn thành' : (roundedProgress > 0 ? 'Đang làm' : 'Chờ làm'), breakdown }
    })
  }

  const getOrderProgress = (order) => {
    const products = getAugmentedProducts(order)
    if (products.length === 0) return 0
    return Math.round(products.reduce((s, p) => s + p.progress, 0) / products.length)
  }

  const prefixes = useMemo(() => {
    if (detailedPlan?.prefixes && Array.isArray(detailedPlan.prefixes)) return detailedPlan.prefixes
    const ordersToProcess = detailedPlan?.orders || currentPlan?.orders || []
    if (ordersToProcess.length === 0) return []
    const set = new Set()
    ordersToProcess.forEach(o => { const p = (o.name || o.order_code || '').split('-')[0]; if (p && p.length < 10) set.add(p.toUpperCase().trim()) })
    return Array.from(set).sort()
  }, [detailedPlan, currentPlan])

  const filteredOrders = displayOrders || []

  const TabItem = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: '10px', backgroundColor: active ? 'var(--primary-color)' : '#fff', color: active ? '#fff' : '#64748b', border: active ? 'none' : '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>
      {label}
    </button>
  )

  const SelectionModal = ({ isOpen, onClose, title, options, value, onChange }) => {
    if (!isOpen) return null
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '24px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={24} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); onClose() }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '16px', backgroundColor: value === opt.value ? 'rgba(124, 82, 59, 0.05)' : 'transparent', border: value === opt.value ? '1px solid var(--primary-color)' : '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: value === opt.value ? '800' : '600', color: value === opt.value ? 'var(--primary-color)' : '#475569' }}>{opt.label}</span>
                {value === opt.value && <Check size={20} color="var(--primary-color)" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    )
  }

  return (
    <Layout>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* STICKY HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--bg-cream)' }}>
        <PageHeader title="G7 - Smart Flow" subTitle={activeTab === 'calendar' ? 'Lịch tuần' : activeTab === 'create' ? 'Thêm KHSX' : 'Kế hoạch sản xuất'} />

        {/* Tab chính: 2 chế độ Xem KHSX & Tạo kế hoạch */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 4px 16px' }}>
          <button
            onClick={() => handleTabChange(activeTab === 'calendar' ? 'progress' : 'calendar')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: '800',
              border: activeTab === 'calendar' ? '1.5px solid #cbd5e1' : '1px solid transparent',
              backgroundColor: activeTab === 'calendar' ? '#fff' : '#f1f5f9',
              color: activeTab === 'calendar' ? 'var(--primary-color)' : '#64748b',
              boxShadow: activeTab === 'calendar' ? '0 4px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Xem KHSX
          </button>
          <button
            onClick={() => handleTabChange(activeTab === 'create' ? 'progress' : 'create')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: '800',
              border: activeTab === 'create' ? '1.5px solid #cbd5e1' : '1px solid transparent',
              backgroundColor: activeTab === 'create' ? '#fff' : '#f1f5f9',
              color: activeTab === 'create' ? 'var(--primary-color)' : '#64748b',
              boxShadow: activeTab === 'create' ? '0 4px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Tạo kế hoạch
          </button>
        </div>


        {/* ── MÀN HÌNH 1: TIẾN ĐỘ PO ── */}
        {activeTab === 'progress' && (
          <div style={{ padding: '8px 16px 4px 16px' }}>
            {/* Lọc: KHSX & Công đoạn */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Kế hoạch sản xuất</span>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }}><Calendar size={16} color="#7c5438" /></div>
                  <CustomSelect value={selectedPlanId} options={shortPlanOptions} onChange={setSelectedPlanId} style={{ paddingLeft: '34px', height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
                </div>
              </div>
              <div style={{ width: '130px', minWidth: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Công đoạn</span>
                <CustomSelect value={selectedStage} options={[{ label: 'Tất cả', value: '' }, ...stageOptions]} onChange={setSelectedStage} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
            </div>

            {/* Ô tìm kiếm & Sắp xếp */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Search size={16} /></div>
                <input type="text" placeholder="Tìm kiếm PO..." value={searchQuery} onChange={e => handleSearchChange(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.85rem', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setFilterModal(true)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', position: 'relative' }}>
                  <Filter size={18} color={statusFilter !== 'ALL' ? 'var(--primary-color)' : '#7c5438'} />
                  {statusFilter !== 'ALL' && <div style={{ position: 'absolute', top: 2, right: 2, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)' }} />}
                </button>
                <button onClick={() => setSortModal(true)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                  <ArrowDownWideNarrow size={18} color={sortOrder.includes('PROGRESS') ? 'var(--primary-color)' : '#7c5438'} />
                </button>
              </div>
            </div>

            {/* Tab prefix */}
            {prefixes.length > 0 && (
              <div style={{ display: 'flex', overflowX: 'auto', gap: '6px', paddingBottom: '8px', marginBottom: '4px', scrollbarWidth: 'none' }}>
                <TabItem label="Tất cả" active={activePrefix === 'ALL'} onClick={() => handleFilterChange('ALL')} />
                {prefixes.map(p => <TabItem key={p} label={p} active={activePrefix === p} onClick={() => handleFilterChange(p)} />)}
              </div>
            )}
          </div>
        )}

        {/* ── MÀN HÌNH 5: XEM KHSX LỊCH ── */}
        {activeTab === 'calendar' && (
          <div style={{ padding: '8px 16px 4px 16px' }}>
            {/* Lọc Công đoạn & Nhà máy */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Chọn công đoạn</span>
                <CustomSelect value={selectedStage} options={stageOptions} onChange={setSelectedStage} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Chọn nhà máy</span>
                <CustomSelect value={selectedFactory} options={[{ label: 'Nhà máy 1', value: 'Nhà máy 1' }, { label: 'Nhà máy 2', value: 'Nhà máy 2' }, { label: 'Nhà máy 3', value: 'Nhà máy 3' }]} onChange={setSelectedFactory} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
            </div>

            {/* Chọn tuần & Chọn hiển thị */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Chọn tuần/tháng chứa ngày</span>
                <input type="date" value={calendarDate} onChange={(e) => setCalendarDate(e.target.value)} style={{ width: '100%', height: '42px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ width: '120px', minWidth: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Hiển thị</span>
                <CustomSelect value={calendarViewMode} options={[{ label: 'Theo tuần', value: 'weekly' }, { label: 'Theo tháng', value: 'monthly' }]} onChange={setCalendarViewMode} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── MÀN HÌNH 2 & 3: TẠO KẾ HOẠCH ── */}
        {activeTab === 'create' && (
          <div style={{ padding: '8px 16px 8px 16px', borderBottom: '1px solid #e2e8f0' }}>
            {/* Lọc: Công đoạn & Nhà máy */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Công đoạn</span>
                <CustomSelect value={selectedStage} options={stageOptions} onChange={setSelectedStage} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Nhà máy</span>
                <CustomSelect value={selectedFactory} options={[{ label: 'Nhà máy 1', value: 'Nhà máy 1' }, { label: 'Nhà máy 2', value: 'Nhà máy 2' }, { label: 'Nhà máy 3', value: 'Nhà máy 3' }]} onChange={setSelectedFactory} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
            </div>

            {/* Ngày sx & Hiển thị theo */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày sx</span>
                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} style={{ width: '100%', height: '42px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Hiển thị theo</span>
                <CustomSelect value={createViewType} options={[{ label: 'Theo PO', value: 'po' }, { label: 'Tên chi tiết', value: 'detail' }]} onChange={setCreateViewType} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
            </div>

            {/* Dropdown thay đổi theo kiểu hiển thị */}
            {createViewType === 'po' ? (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Mã PO</span>
                <CustomSelect value={selectedPoForCreate} options={(fullDetailedPlan && Array.isArray(fullDetailedPlan.orders)) ? fullDetailedPlan.orders.map(o => ({ label: o.name || o.order_code, value: o.name || o.order_code })) : []} onChange={setSelectedPoForCreate} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
            ) : (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tên chi tiết</span>
                <CustomSelect value={selectedDetailForCreate} options={uniqueDetailNames.map(name => ({ label: name, value: name }))} onChange={setSelectedDetailForCreate} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* NỘI DUNG CHI TIẾT CÁC TAB */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-cream)' }}>
        {/* Tab 1: Tiến độ PO */}
        {activeTab === 'progress' && (
          <div className="page-content" style={{ padding: '0 16px 16px 16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '8px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TIẾN ĐỘ (Trang {currentPage}/{totalPages || 1})
              </h4>
            </div>
            {(loading || controllerLoading || loadingMore) ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ color: '#64748b' }}>Đang tải dữ liệu...</p></div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}><p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>Trống</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px' }}>
                {filteredOrders.map(order => (
                  <CollapsibleCard key={order.id} title={order.name || order.order_code} progress={getOrderProgress(order)} defaultOpen={selectedOrderCode !== 'ALL' || searchQuery !== ''}>
                    <DataTable
                      columns={[
                        { header: 'Mã SP', key: 'sku', render: (row) => <div style={{ textAlign: 'left', paddingLeft: '4px' }}>{row.sku || row.name || '---'}</div> },
                        { header: 'KH', key: 'quantity', nowrap: true, render: (row) => row.quantity || 0 },
                        { header: 'Tiến độ', key: 'progress', nowrap: true, render: (row) => <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{row.progress}%</span> },
                        { header: 'Trạng thái', key: 'status', render: (row) => <span style={{ color: row.status === 'Hoàn thành' ? 'var(--status-success)' : (row.status === 'Đang làm' ? '#3b82f6' : '#94a3b8'), fontWeight: '700', fontSize: '0.75rem' }}>{row.status}</span> }
                      ]}
                      data={getAugmentedProducts(order)}
                      onRowClick={(row) => setDetailModal({ isOpen: true, product: row, activeTab: 'bom' })}
                    />
                  </CollapsibleCard>
                ))}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '10px 0 40px' }}>
                    <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: '800', opacity: currentPage === 1 ? 0.4 : 1 }}>«</button>
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: '800', opacity: currentPage === 1 ? 0.4 : 1 }}>‹</button>
                    <div style={{ padding: '8px 16px', borderRadius: '12px', backgroundColor: 'var(--primary-color)', color: '#fff', fontWeight: '900', fontSize: '0.9rem' }}>{currentPage} / {totalPages}</div>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: '800', opacity: currentPage === totalPages ? 0.4 : 1 }}>›</button>
                    <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: '800', opacity: currentPage === totalPages ? 0.4 : 1 }}>»</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Xem KHSX (Màn hình 5) */}
        {activeTab === 'calendar' && (
          <div className="page-content" style={{ padding: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#64748b', margin: 0 }}>
                {calendarViewMode === 'weekly' ? 'Tuần ' : 'Tháng '}
                {formatDisplayDate(calendarDateFrom)} — {formatDisplayDate(calendarDateTo)}
              </h4>
              <button onClick={fetchWeeklyPlansFromDb} style={{ padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#7c5438', fontWeight: '800', fontSize: '0.8rem' }}>
                Tải lại
              </button>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ color: '#64748b' }}>Đang tải...</p></div>
            ) : calendarGridRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                <Calendar size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>Chưa có kế hoạch nào được ghi nhận cho khoảng thời gian này.</p>
                <p style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '4px' }}>Hãy tạo kế hoạch trong tab "+ Tạo kế hoạch"</p>
              </div>
            ) : (
              <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: `${150 + calendarDays.length * 64}px` }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: '800', minWidth: '150px', position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 2 }}>Tên chi tiết</th>
                      {calendarDays.map(day => (
                        <th key={day} style={{ textAlign: 'center', padding: '10px 4px', color: isToday(day) ? 'var(--primary-color)' : '#64748b', fontWeight: '800', minWidth: '64px', backgroundColor: isToday(day) ? 'rgba(124,82,59,0.05)' : 'transparent' }}>
                          {formatDisplayDate(day)}
                          {isToday(day) && <div style={{ fontSize: '0.6rem', color: 'var(--primary-color)', fontWeight: '900', marginTop: '2px' }}>HÔM NAY</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calendarGridRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '800', color: '#1e293b', position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1 }}>{row.part_name}</td>
                        {calendarDays.map(day => {
                          const entry = row.dates[day]
                          return (
                            <td key={day} style={{ textAlign: 'center', padding: '10px 4px', backgroundColor: isToday(day) ? 'rgba(124,82,59,0.03)' : 'transparent' }}>
                              {entry ? (
                                <div>
                                  <div style={{ fontWeight: '900', color: 'var(--primary-color)', fontSize: '0.9rem' }}>{entry.planned_qty}</div>
                                  {entry.remaining_qty > 0 && <div style={{ fontWeight: '700', color: '#94a3b8', fontSize: '0.7rem' }}>còn {Math.round(entry.remaining_qty)}</div>}
                                </div>
                              ) : <span style={{ color: '#e2e8f0', fontWeight: '800' }}>—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tạo kế hoạch */}
        {activeTab === 'create' && (
          <div className="page-content" style={{ padding: '16px 16px 100px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '24px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569' }}>
                  {createViewType === 'po'
                    ? <>Danh sách chi tiết của PO: <span style={{ color: 'var(--primary-color)' }}>{selectedPoForCreate || 'Chưa chọn'}</span></>
                    : <>Danh sách PO chứa chi tiết: <span style={{ color: 'var(--primary-color)' }}>{selectedDetailForCreate || 'Chưa chọn'}</span></>
                }
                </div>
                {currentSource.length > 0 && (
                  <button onClick={handleSelectAll} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: allChecked ? 'rgba(124,82,59,0.06)' : '#fff', color: allChecked ? 'var(--primary-color)' : '#64748b', fontWeight: '700', fontSize: '0.78rem' }}>
                    {allChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                    {allChecked ? 'Bỏ chọn' : 'Chọn tất cả'}
                  </button>
                )}
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: '#94a3b8' }}>Đang tải dữ liệu cấu thành...</p>
                </div>
              ) : currentSource.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    {createViewType === 'po' ? 'Không tìm thấy chi tiết nào ở công đoạn này.' : 'Không có PO nào chứa chi tiết này.'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #f1f5f9', color: '#64748b' }}>
                      <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: '800' }}>{createViewType === 'po' ? 'Tên chi tiết' : 'PO'}</th>
                      <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '800', width: '45px' }}>KH</th>
                      <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '800', width: '55px' }}>Còn lại</th>
                      <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '800', width: '40px' }}>Chọn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSource.map((row, idx) => {
                      const key = createViewType === 'po' ? 'part_name' : 'order_code'
                      const isChecked = selectedRows.some(r => r[key] === row[key])
                      const remaining = row.remaining || 0
                      const isDone = remaining === 0 && (row.planned || 0) > 0
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', backgroundColor: isChecked ? 'rgba(124,82,59,0.04)' : 'transparent', cursor: 'pointer' }} onClick={() => handleToggleRowSelect(row)}>
                          <td style={{ padding: '12px 4px', fontWeight: '700', color: '#1e293b' }}>
                            <div>{createViewType === 'po' ? row.part_name : row.order_code}</div>
                            {isDone && <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '900', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>✅ Đã đủ</span>}
                            {!isDone && remaining > 0 && <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: '900', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>còn {formatQty(remaining)}</span>}
                          </td>
                          <td style={{ padding: '12px 4px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>{formatQty(row.planned)}</td>
                          <td style={{ padding: '12px 4px', textAlign: 'center', fontWeight: '800', color: remaining > 0 ? '#ef4444' : '#16a34a' }}>{formatQty(remaining)}</td>
                          <td style={{ padding: '12px 4px', textAlign: 'center' }} onClick={e => { e.stopPropagation(); handleToggleRowSelect(row) }}>
                            <input type="checkbox" checked={isChecked} readOnly style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)', cursor: 'pointer' }} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {/* Nút thêm PO / Thêm chi tiết ở cuối bảng */}
              {createViewType === 'po' ? (
                <button
                  onClick={() => showToast('Chức năng thêm PO nâng cao đang tải...', 'warning')}
                  style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#7c5438', color: '#fff', fontWeight: '800', fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(124, 82, 59, 0.15)' }}
                >
                  + Thêm PO
                </button>
              ) : (
                <button
                  onClick={() => showToast('Chức năng thêm chi tiết nâng cao đang tải...', 'warning')}
                  style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#7c5438', color: '#fff', fontWeight: '800', fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(124, 82, 59, 0.15)' }}
                >
                  + Thêm chi tiết
                </button>
              )}
            </div>

            {/* Bottom Actions: styled identically to /delivery-create using responsive-fixed-footer */}
            <div className="responsive-fixed-footer" style={{
              backgroundColor: '#fff',
              padding: '16px',
              display: 'flex',
              gap: '12px',
              borderTop: '1px solid #e2e8f0',
              zIndex: 30
            }}>
              <button
                onClick={() => {
                  if (selectedRows.length === 0) { showToast('Vui lòng chọn ít nhất một mục!', 'warning'); return }
                  setShowConfirmModal(true)
                }}
                style={{
                  flex: 1,
                  backgroundColor: selectedRows.length > 0 ? 'var(--primary-color)' : '#94a3b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Check size={20} />
                {selectedRows.length > 0 ? `Xác nhận (${selectedRows.length})` : 'Xác nhận'}
              </button>
              <button
                onClick={() => { handleTabChange('progress'); setSelectedRows([]) }}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  color: '#94a3b8',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={20} />
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL BÁO CÁO XÁC NHẬN */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => setShowConfirmModal(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px', backgroundColor: '#fff', borderRadius: '28px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1e293b' }}>Báo cáo KHSX cho ngày</h3>
              <button onClick={() => setShowConfirmModal(false)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            
            {/* Thống kê chi tiết */}
            <div style={{ padding: '16px 24px', backgroundColor: 'rgba(124,82,59,0.04)', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Công đoạn', value: selectedStage },
                  { label: 'Nhà máy', value: selectedFactory },
                  { label: 'Ngày sản xuất', value: new Date(planDate + 'T00:00:00').toLocaleDateString('vi-VN') },
                  { label: 'Số lượng', value: `${selectedRows.length} chi tiết` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>{label}</div>
                    <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '900' }}>{value}</div>
                  </div>
                ))}
              </div>
              {createViewType === 'po' && selectedPoForCreate && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Mã PO</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: '900' }}>{selectedPoForCreate}</div>
                </div>
              )}
            </div>

            {/* Bảng liệt kê */}
            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', maxHeight: '40vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: '800' }}>Chi tiết</th>
                    <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: '800', width: '60px' }}>KH</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 4px', fontWeight: '700', color: '#1e293b' }}>
                        {createViewType === 'po' ? row.part_name : `${row.order_code} — ${selectedDetailForCreate}`}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: '900', color: 'var(--primary-color)' }}>{formatQty(row.planned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Nút bấm */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
              <button disabled={isSubmittingPlan} onClick={handleConfirmDailyPlanSubmit} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#22c55e', color: '#fff', fontWeight: '900', fontSize: '0.9rem', opacity: isSubmittingPlan ? 0.7 : 1 }}>
                {isSubmittingPlan ? 'Đang lưu...' : 'Xác nhận'}
              </button>
              <button onClick={() => setShowConfirmModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#64748b', fontWeight: '900', fontSize: '0.9rem' }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT SẢN PHẨM */}
      {detailModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => setDetailModal({ ...detailModal, isOpen: false })} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderRadius: '30px', display: 'flex', flexDirection: 'column', maxHeight: '88vh', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b' }}>Chi tiết cấu thành</h3><span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{detailModal.product?.sku}</span></div>
              <button onClick={() => setDetailModal({ ...detailModal, isOpen: false })} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} strokeWidth={2.5} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'bom' }))} style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', border: 'none', backgroundColor: (detailModal.activeTab || 'bom') === 'bom' ? 'var(--primary-color)' : '#e2e8f0', color: (detailModal.activeTab || 'bom') === 'bom' ? '#fff' : '#64748b' }}>Cấu thành (BOM)</button>
                <button onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'logs' }))} style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', border: 'none', backgroundColor: detailModal.activeTab === 'logs' ? 'var(--primary-color)' : '#e2e8f0', color: detailModal.activeTab === 'logs' ? '#fff' : '#64748b' }}>
                  Lịch sử ({deliveries.filter(d => {
                    const pName = (detailModal.product?.name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '')
                    const dName = (d.part_name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '')
                    return dName.includes(pName) || pName.includes(dName)
                  }).length})
                </button>
              </div>
              {(detailModal.activeTab || 'bom') === 'bom' ? (
                detailModal.product?.breakdown?.length > 0 ? (
                  detailModal.product.breakdown.map((comp, cIdx) => (
                    <div key={cIdx} style={{ marginBottom: '24px' }}>
                      <div style={{ padding: '16px', borderRadius: '20px', backgroundColor: '#fff', border: comp.status === 'Xong' ? '2px solid #22c55e' : '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: comp.status === 'Xong' ? '#dcfce7' : (comp.status === 'Dở dang' ? '#dbeafe' : '#f1f5f9'), display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px' }}>
                            {comp.status === 'Xong' ? <CheckCircle2 size={24} color="#166534" /> : (comp.status === 'Dở dang' ? <Clock size={24} color="#1e40af" /> : <AlertCircle size={24} color="#64748b" />)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#0f172a' }}>{comp.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Tiến độ: <span style={{ color: comp.status === 'Xong' ? '#16a34a' : '#78523b', fontWeight: '900' }}>{comp.delivered}</span> / {comp.planned}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.7 pound', fontWeight: '900', padding: '4px 10px', borderRadius: '10px', backgroundColor: comp.status === 'Xong' ? '#dcfce7' : (comp.status === 'Dở dang' ? '#dbeafe' : '#f1f5f9'), color: comp.status === 'Xong' ? '#166534' : (comp.status === 'Dở dang' ? '#1e40af' : '#64748b') }}>{comp.status}</div>
                      </div>
                      {comp.subParts?.length > 0 && (
                        <div style={{ marginLeft: '23px', borderLeft: '2.5px solid #cbd5e1', paddingLeft: '16px', marginTop: '-10px', paddingTop: '20px' }}>
                          {comp.subParts.map((part, pIdx) => (
                            <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: part.status === 'Xong' ? 'rgba(34,197,94,0.05)' : 'transparent', borderRadius: '12px', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-18px', top: '50%', width: '10px', height: '2px', backgroundColor: '#cbd5e1' }} />
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: part.status === 'Xong' ? '#22c55e' : '#cbd5e1', marginRight: '10px' }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: part.status === 'Xong' ? '#1e293b' : '#64748b' }}>{part.name}</span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: part.status === 'Xong' ? '#16a34a' : '#475569', fontWeight: '900' }}>{part.delivered} / {part.planned}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <AlertCircle size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Không tìm thấy chi tiết cấu thành.</p>
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {deliveries.filter(d => {
                    const pName = (detailModal.product?.name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '')
                    const dName = (d.part_name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '')
                    return dName.includes(pName) || pName.includes(dName)
                  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((log, lIdx) => (
                    <div key={lIdx} style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>{new Date(log.created_at).toLocaleString('vi-VN')}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#1e293b' }}>{log.delivery_stage} → {log.receiving_stage}</div>
                        <div style={{ fontSize: '0.75rem', color: log.status === 'Hoàn thành' ? '#16a34a' : '#3b82f6', fontWeight: '800' }}>Trạng thái: {log.status}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>Số lượng</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--primary-color)' }}>{log.quantity_received || log.quantity_total || 0}</div>
                      </div>
                    </div>
                  ))}
                  {deliveries.filter(d => {
                    const pName = (detailModal.product?.name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '')
                    const dName = (d.part_name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '')
                    return dName.includes(pName) || pName.includes(dName)
                  }).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Clock size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Chưa có lịch sử bàn giao.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fff', boxShadow: '0 -10px 20px -15px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                <div><span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tổng tiến độ sản phẩm</span><span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e293b' }}>{detailModal.product?.progress}%</span></div>
                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: detailModal.product?.status === 'Hoàn thành' ? '#16a34a' : '#3b82f6', backgroundColor: detailModal.product?.status === 'Hoàn thành' ? '#dcfce7' : '#dbeafe', padding: '4px 10px', borderRadius: '8px' }}>{detailModal.product?.status}</span>
              </div>
              <div style={{ width: '100%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${detailModal.product?.progress}%`, height: '100%', backgroundColor: detailModal.product?.progress >= 100 ? 'var(--status-success)' : 'var(--accent-color)', borderRadius: '6px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELECTION MODALS */}
      <SelectionModal isOpen={filterModal} onClose={() => setFilterModal(false)} title="Lọc trạng thái" options={[{ label: 'Tất cả', value: 'ALL' }, { label: 'Chờ làm (0%)', value: 'PENDING' }, { label: 'Đang làm (1-99%)', value: 'DOING' }, { label: 'Hoàn thành (100%)', value: 'DONE' }]} value={statusFilter} onChange={handleStatusChange} />
      <SelectionModal isOpen={sortModal} onClose={() => setSortModal(false)} title="Sắp xếp theo" options={[{ label: 'Tên đơn (A-Z)', value: 'NAME_ASC' }, { label: 'Tên đơn (Z-A)', value: 'NAME_DESC' }, { label: 'Tiến độ giảm dần', value: 'PROGRESS_DESC' }, { label: 'Tiến độ tăng dần', value: 'PROGRESS_ASC' }]} value={sortOrder} onChange={handleSortChange} />
    </Layout>
  )
}

export default PlanTracking
