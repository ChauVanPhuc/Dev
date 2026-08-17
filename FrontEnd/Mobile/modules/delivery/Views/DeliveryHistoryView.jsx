import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { ArrowUpDown, Filter, X, Check, RefreshCw, ChevronDown, Loader2, Truck, ArrowRight, Clock, Calendar } from 'lucide-react'
import useAuthStore from '@modules/auth/Models/authModel'
import { usePlanController } from '@modules/production/Controllers/planController'
import { useDeliveryController } from '@modules/delivery/Controllers/deliveryController'

/**
 * Trang Lịch sử bàn giao (Mobile)
 * Route: /delivery-history
 * Hiển thị toàn bộ lịch sử phiếu bàn giao với bộ lọc server-side và phân trang lazy load.
 */

// Helper rút gọn tên kế hoạch
const formatPlanLabel = (name) => {
  if (!name) return 'Không tên';
  if (name.includes('KẾ HOẠCH SẢN XUẤT')) {
    const dates = name.match(/\d{2}\/\d{2}/g);
    if (dates && dates.length >= 2) {
      return `KHSX: ${dates[0]} - ${dates[1]}`;
    }
    return name.replace('KẾ HOẠCH SẢN XUẤT - ', 'KHSX: ');
  }
  return name;
};

// Helper format ngày giờ theo VN (HH:mm | dd/MM/yyyy)
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} | ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

// Helper format date cho input type="date" (yyyy-MM-dd)
const formatDateInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Helper màu trạng thái
const getStatusColor = (status) => {
  switch (status) {
    case 'Chờ Xác Nhận': return { bg: '#fef2f2', border: '#fecaca', text: '#ef4444' };
    case 'Chờ Kiểm Tra': return { bg: '#eff6ff', border: '#bfdbfe', text: '#3b82f6' };
    case 'Chờ Nhận Hàng': return { bg: '#fff7ed', border: '#fed7aa', text: '#f97316' };
    case 'Hoàn thành':
    case 'Đã Nhận': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#22c55e' };
    case 'Trả Hàng': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
    default: return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' };
  }
};

const ITEMS_PER_PAGE = 20;

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: 'Tất cả' },
  { label: 'Chờ Nhận Hàng', value: 'Chờ Nhận Hàng' },
  { label: 'Chờ Xác Nhận', value: 'Chờ Xác Nhận' },
  { label: 'Chờ Kiểm Tra', value: 'Chờ Kiểm Tra' },
  { label: 'Hoàn thành', value: 'Hoàn thành' },
  { label: 'Trả Hàng', value: 'Trả Hàng' }
];

const TICKET_TYPE_OPTIONS = [
  { label: 'Tất cả', value: 'Tất cả' },
  { label: 'Phiếu giao', value: 'delivery' },
  { label: 'Phiếu nhận', value: 'receive' }
];

const DeliveryHistory = () => {
  const { plans, fetchPlans } = usePlanController()
  const { fetchDeliveryHistory } = useDeliveryController()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // User stage info
  const userStageName = (user?.activeStageName || user?.stage_name || '').trim()
  const userStageDesc = (user?.activeStageDescription === 'Tất cả công đoạn' ? '' : (user?.activeStageDescription || user?.stage_description || '')).trim()

  // State
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [currentSkip, setCurrentSkip] = useState(0)

  // Sort
  const [sortOrder, setSortOrder] = useState('desc')

  // Filter Modal
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    status: 'Tất cả',
    stage: 'Tất cả',
    ticket_type: 'Tất cả'
  })
  // Bộ lọc tạm (trong modal chưa apply)
  const [tempFilters, setTempFilters] = useState({ ...filters })

  // Infinite scroll ref
  const listEndRef = useRef(null)
  const scrollContainerRef = useRef(null)

  // Sắp xếp plans
  const sortedPlans = Array.isArray(plans) ? [...plans].sort((a, b) => {
    const yearA = a.year || 0; const yearB = b.year || 0;
    const monthA = a.month || 0; const monthB = b.month || 0;
    if (yearA !== yearB) return yearB - yearA;
    return monthB - monthA;
  }) : [];

  const planOptions = sortedPlans.map(p => ({
    label: formatPlanLabel(p.name),
    value: p.id ? p.id.toString() : ''
  }))

  // Tính danh sách công đoạn từ deliveries hiện tại
  const stageOptions = useMemo(() => {
    const stages = new Set()
    deliveries.forEach(d => {
      if (d.delivery_stage) stages.add(d.delivery_stage)
      if (d.receiving_stage) stages.add(d.receiving_stage)
    })
    return [
      { label: 'Tất cả', value: 'Tất cả' },
      ...Array.from(stages).sort().map(s => ({ label: s, value: s }))
    ]
  }, [deliveries])

  // Tính badge version cho mỗi phiếu
  const versionMap = useMemo(() => {
    const map = {}
    const counterMap = {}
    const sorted = [...deliveries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    sorted.forEach(d => {
      const key = `${d.part_name || ''}_${d.plan_id || ''}`
      if (!counterMap[key]) counterMap[key] = 0
      counterMap[key]++
      map[d.id] = counterMap[key]
    })
    return map
  }, [deliveries])

  // Đếm số filter đang áp dụng
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.date_from || filters.date_to) count++;
    if (filters.status !== 'Tất cả') count++;
    if (filters.stage !== 'Tất cả') count++;
    if (filters.ticket_type !== 'Tất cả') count++;
    return count;
  }, [filters])

  // Tải dữ liệu plans ban đầu
  useEffect(() => {
    const loadPlans = async () => {
      const stage = userStageDesc || userStageName || ''
      await fetchPlans(stage)
      setLoading(false)
    }
    loadPlans()
  }, [fetchPlans, userStageDesc, userStageName])

  // Tự động chọn plan đầu tiên
  useEffect(() => {
    if (planOptions.length > 0 && !selectedPlanId) {
      setSelectedPlanId(planOptions[0].value)
    }
  }, [planOptions, selectedPlanId])

  // Fetch delivery history từ server
  const fetchData = useCallback(async (planId, skip = 0, append = false) => {
    if (!planId) return
    if (skip === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      const filterParams = {
        plan_id: planId,
        sort_order: sortOrder,
        skip,
        limit: ITEMS_PER_PAGE
      }
      if (filters.date_from) filterParams.date_from = filters.date_from
      if (filters.date_to) filterParams.date_to = filters.date_to
      if (filters.status && filters.status !== 'Tất cả') filterParams.status = filters.status
      if (filters.stage && filters.stage !== 'Tất cả') filterParams.stage = filters.stage
      if (filters.ticket_type && filters.ticket_type !== 'Tất cả') filterParams.ticket_type = filters.ticket_type

      const result = await fetchDeliveryHistory(filterParams)

      if (append) {
        setDeliveries(prev => [...prev, ...(result.items || [])])
      } else {
        setDeliveries(result.items || [])
      }
      setTotalCount(result.total_count || 0)
      setHasMore(result.has_more || false)
      setCurrentSkip(skip)
    } catch (err) {
      console.error('[DeliveryHistory] Error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [fetchDeliveryHistory, filters, sortOrder])

  // Load data khi thay đổi plan, filters, hoặc sort
  useEffect(() => {
    if (selectedPlanId) {
      fetchData(selectedPlanId, 0, false)
    }
  }, [selectedPlanId, fetchData])

  // Infinite scroll handler
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return
    const nextSkip = currentSkip + ITEMS_PER_PAGE
    fetchData(selectedPlanId, nextSkip, true)
  }, [hasMore, loadingMore, currentSkip, selectedPlanId, fetchData])

  // Intersection Observer cho infinite scroll
  useEffect(() => {
    if (!listEndRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(listEndRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, handleLoadMore])

  // Handlers
  const handleToggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
  }

  const handleApplyFilter = () => {
    setFilters({ ...tempFilters })
    setShowFilterModal(false)
  }

  const handleResetFilter = () => {
    const defaultFilters = {
      date_from: '',
      date_to: '',
      status: 'Tất cả',
      stage: 'Tất cả',
      ticket_type: 'Tất cả'
    }
    setTempFilters(defaultFilters)
    setFilters(defaultFilters)
    setShowFilterModal(false)
  }

  const handleCardClick = (delivery) => {
    navigate(`/delivery-detail/${delivery.id}`)
  }

  // ─── RENDER ────────────────────────────────────────────────

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="MB16 | Lịch sử bàn giao" />

      <div style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, width: '100%', padding: '0 16px 100px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px'
      }}>

        {/* ② Toolbar: Chọn PO + Sort + Filter */}
        <div style={{
          position: 'sticky',
          top: '58px',
          zIndex: 100,
          backgroundColor: 'var(--bg-main, #f5f1eb)',
          paddingTop: '12px',
          paddingBottom: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* PO Select */}
          <CustomSelect
            options={planOptions}
            value={selectedPlanId}
            onChange={(val) => {
              setSelectedPlanId(val)
              setDeliveries([])
              setCurrentSkip(0)
            }}
            placeholder="Chọn PO sản xuất..."
          />

          {/* Sort + Filter */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleToggleSort}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                color: '#475569',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ArrowUpDown size={16} />
              {sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
            </button>
            <button
              onClick={() => { setTempFilters({ ...filters }); setShowFilterModal(true); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: activeFilterCount > 0 ? '1.5px solid var(--primary-color, #7c523b)' : '1px solid #e2e8f0',
                backgroundColor: activeFilterCount > 0 ? 'rgba(124, 82, 59, 0.05)' : '#fff',
                color: activeFilterCount > 0 ? 'var(--primary-color, #7c523b)' : '#475569',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s'
              }}
            >
              <Filter size={16} />
              Bộ lọc
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: '800'
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Tổng kết quả */}
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textAlign: 'right' }}>
            {loading ? 'Đang tải...' : `${totalCount} phiếu bàn giao`}
          </div>
        </div>

        {/* ③ Danh sách phiếu bàn giao */}
        <div ref={scrollContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && deliveries.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px' }}>
              <Loader2 size={32} color="var(--primary-color, #7c523b)" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Đang tải lịch sử bàn giao...</p>
            </div>
          ) : deliveries.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#94a3b8',
              fontSize: '0.9rem',
              fontStyle: 'italic'
            }}>
              <Truck size={40} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p>"Không có phiếu bàn giao nào phù hợp."</p>
            </div>
          ) : (
            deliveries.map((delivery) => {
              const colors = getStatusColor(delivery.status || 'Chờ xác nhận');
              const version = versionMap[delivery.id] || 1;
              const hasReturns = delivery.quantity_returned && delivery.quantity_returned > 0;

              return (
                <div
                  key={delivery.id}
                  onClick={() => handleCardClick(delivery)}
                  style={{
                    backgroundColor: hasReturns ? '#fffbeb' : '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: hasReturns
                      ? '0 4px 12px rgba(217, 119, 6, 0.12)'
                      : '0 2px 8px rgba(0,0,0,0.04)',
                    border: hasReturns ? '1.5px solid #fbbf24' : '1px solid #f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  {/* Row 1: Mã phiếu + Thời gian */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontWeight: '800',
                        color: '#1e293b',
                        fontSize: '0.95rem'
                      }}>
                        BG-{String(delivery.id).padStart(2, '0')}
                      </span>
                      <span style={{
                        backgroundColor: version <= 1 ? '#dbeafe' : (version <= 3 ? '#fef9c3' : '#fce7f3'),
                        color: version <= 1 ? '#2563eb' : (version <= 3 ? '#a16207' : '#be185d'),
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontWeight: '800'
                      }}>
                        V{version}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#94a3b8',
                      fontSize: '0.78rem'
                    }}>
                      <Clock size={12} />
                      {formatDateTime(delivery.created_at)}
                    </div>
                  </div>

                  {/* Row 2: Công đoạn giao → nhận */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    color: '#475569'
                  }}>
                    <span style={{ fontWeight: '600' }}>{delivery.delivery_stage || '—'}</span>
                    <ArrowRight size={14} color="#94a3b8" />
                    <span style={{ fontWeight: '600' }}>{delivery.receiving_stage || '—'}</span>
                  </div>

                  {/* Row 3: Chi tiết + Trạng thái */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.82rem' }}>
                      <div style={{ color: '#64748b', marginBottom: '2px' }}>
                        {delivery.part_name || 'Không xác định'}
                        {delivery.specification && (
                          <span style={{ color: '#94a3b8' }}> • {delivery.specification}</span>
                        )}
                      </div>
                      <div style={{ fontWeight: '800', color: 'var(--accent-color, #d97706)', fontSize: '1rem' }}>
                        {delivery.quantity_received || delivery.quantity_total || 0}
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginLeft: '4px' }}>SP</span>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      {delivery.status || 'Chờ xác nhận'}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Infinite scroll sentinel */}
          <div ref={listEndRef} style={{ height: '1px' }} />

          {/* Loading more indicator */}
          {loadingMore && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '20px',
              color: '#94a3b8',
              fontSize: '0.85rem'
            }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Đang tải thêm...
            </div>
          )}

          {/* End of list */}
          {!hasMore && deliveries.length > 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '16px',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontStyle: 'italic'
            }}>
              — Đã hiển thị tất cả {totalCount} phiếu —
            </div>
          )}
        </div>
      </div>

      {/* ④ Filter Modal (Slide-up) */}
      {showFilterModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 20000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowFilterModal(false)}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)'
            }}
          />
          {/* Modal Content */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '500px',
            backgroundColor: '#fff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '24px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.12)',
            animation: 'slideUp 0.3s ease-out',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>Bộ lọc</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} color="#64748b" />
              </button>
            </div>

            {/* Lọc theo ngày */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> Lọc theo ngày
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={tempFilters.date_from}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b'
                  }}
                />
                <span style={{ color: '#94a3b8', fontWeight: '600' }}>—</span>
                <input
                  type="date"
                  value={tempFilters.date_to}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, date_to: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>

            {/* Lọc theo trạng thái */}
            <FilterSelect
              label="Lọc theo trạng thái"
              value={tempFilters.status}
              options={STATUS_OPTIONS}
              onChange={(val) => setTempFilters(prev => ({ ...prev, status: val }))}
            />

            {/* Lọc theo công đoạn */}
            <FilterSelect
              label="Lọc theo công đoạn"
              value={tempFilters.stage}
              options={stageOptions}
              onChange={(val) => setTempFilters(prev => ({ ...prev, stage: val }))}
            />

            {/* Lọc theo loại phiếu */}
            <FilterSelect
              label="Lọc theo loại phiếu"
              value={tempFilters.ticket_type}
              options={TICKET_TYPE_OPTIONS}
              onChange={(val) => setTempFilters(prev => ({ ...prev, ticket_type: val }))}
            />

            {/* Nút hành động */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '24px'
            }}>
              <button
                onClick={handleApplyFilter}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '14px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: 'var(--primary-color, #7c523b)',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Check size={18} /> Xác nhận
              </button>
              <button
                onClick={handleResetFilter}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} /> Hủy
              </button>
            </div>
          </div>

          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
}

/**
 * Component con: Dropdown filter trong modal
 */
const FilterSelect = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{
        fontSize: '0.82rem',
        fontWeight: '700',
        color: '#475569',
        marginBottom: '8px',
        display: 'block'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            color: '#1e293b',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <span>{options.find(o => o.value === value)?.label || value}</span>
          <ChevronDown size={16} color="#94a3b8" style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
          }} />
        </button>

        {open && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
            zIndex: 10,
            marginTop: '4px',
            maxHeight: '180px',
            overflowY: 'auto'
          }}>
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  border: 'none',
                  backgroundColor: value === opt.value ? 'rgba(124, 82, 59, 0.05)' : 'transparent',
                  color: value === opt.value ? 'var(--primary-color, #7c523b)' : '#475569',
                  fontWeight: value === opt.value ? '800' : '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={16} color="var(--primary-color, #7c523b)" strokeWidth={3} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryHistory
