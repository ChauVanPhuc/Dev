import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownAZ, ArrowUpAZ, Filter, Plus, Minus, X, ChevronLeft, ChevronRight, ClipboardX } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import { useTransferController } from '../Controllers/useTransferController'
import TransferCard from './components/TransferCard'
import FilterPanel from './components/FilterPanel'
import ErrorTrendRow from './components/ErrorTrendRow'
import { inspectionService } from '../services/inspectionService'
import useAuthStore from '@modules/auth/Models/authModel'
import { ROUTES } from '../constants'
import '../styles/production_v2.css'

const CL06_TransferListView = () => {
  const navigate = useNavigate()
  const {
    tickets, total, loading, error, availableMonths,
    filters, setFilters, pendingCount, confirmTicket, refresh
  } = useTransferController()
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [confirming, setConfirming] = useState(false)

  // Danh mục lỗi phục vụ Theo dõi xu hướng lỗi
  const [defectCatalog, setDefectCatalog] = useState([])
  const [rejectErrors, setRejectErrors] = useState([])

  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    inspectionService.getDefectTypes(user?.id)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDefectCatalog(data)
        } else {
          // Fallback danh mục lỗi mặc định chuẩn
          setDefectCatalog([
            { id: 1, code: 'APP-001', name: 'Nứt tét', needs_tracking: true, isQA: true },
            { id: 2, code: 'STR-001', name: 'Cong vênh', needs_tracking: true, isQA: true },
            { id: 3, code: 'APP-009', name: 'Không đồng màu', needs_tracking: true, isQA: true },
            { id: 4, code: 'APP-002', name: 'Trầy xước / Cấn móp', needs_tracking: false, isQA: false },
            { id: 5, code: 'DIM-001', name: 'Sai kích thước / Quy cách', needs_tracking: false, isQA: false },
            { id: 6, code: 'MST-001', name: 'Độ ẩm vượt chuẩn (>12%)', needs_tracking: false, isQA: false }
          ])
        }
      })
      .catch(() => {
        setDefectCatalog([
          { id: 1, code: 'APP-001', name: 'Nứt tét', needs_tracking: true, isQA: true },
          { id: 2, code: 'STR-001', name: 'Cong vênh', needs_tracking: true, isQA: true },
          { id: 3, code: 'APP-009', name: 'Không đồng màu', needs_tracking: true, isQA: true },
          { id: 4, code: 'APP-002', name: 'Trầy xước / Cấn móp', needs_tracking: false, isQA: false },
          { id: 5, code: 'DIM-001', name: 'Sai kích thước / Quy cách', needs_tracking: false, isQA: false },
          { id: 6, code: 'MST-001', name: 'Độ ẩm vượt chuẩn (>12%)', needs_tracking: false, isQA: false }
        ])
      })
  }, [user?.id])

  const defectOptions = useMemo(() => {
    return defectCatalog.map((d) => ({
      value: d.id,
      id: d.id,
      code: d.code,
      name: d.name,
      label: d.code ? `[${d.code}] ${d.name}` : d.name,
      category: d.category,
      isQA: Boolean(d.needs_tracking || d.qc_tracking || d.is_tracked_by_me || d.isQA || d.isCTQ),
      isCTQ: Boolean(d.isCTQ)
    }))
  }, [defectCatalog])

  const addRejectErrorRow = () => {
    setRejectErrors((prev) => [
      ...prev,
      { id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, defectId: '', code: '', name: '', qty: 0, isQA: false, isCTQ: false }
    ])
  }

  const updateRejectError = (index, updatedRow) => {
    setRejectErrors((prev) => {
      const next = [...prev]
      next[index] = updatedRow
      return next
    })
  }

  const removeRejectErrorRow = (index) => {
    setRejectErrors((prev) => prev.filter((_, i) => i !== index))
  }

  // Modal trả hàng
  const [rejectDialog, setRejectDialog] = useState({
    isOpen: false,
    ticket: null,
    reason: '',
    quantity: 0
  })

  // Message Modal State
  const [msgModal, setMsgModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  const showMessage = (type, title, message) => {
    setMsgModal({ isOpen: true, type, title, message })
  }

  const monthOptions = useMemo(() => {
    if (availableMonths && availableMonths.length > 0) {
      const monthNums = availableMonths.map((m) => Number(m.month || m)).filter(Boolean)
      const uniqueMonths = Array.from(new Set(monthNums)).sort((a, b) => b - a)
      if (uniqueMonths.length > 0) {
        return uniqueMonths.map((m) => ({ value: String(m), label: `Tháng ${m}` }))
      }
    }
    return [{ value: '7', label: 'Tháng 7' }, { value: '6', label: 'Tháng 6' }]
  }, [availableMonths])

  const activeTab = filters.tab || 'pending'
  const page = filters.page || 1
  const pageSize = 10
  const totalPages = Math.ceil(total / pageSize) || 1
  const isAscending = filters.sort === 'asc'

  const toggleSort = () => {
    setFilters({ sort: isAscending ? 'desc' : 'asc', page: 1 })
  }

  const userStage = user?.activeStageName || user?.stage_name || user?.stageNames?.[0]
  const normalize = (s) => String(s || '').toLowerCase().trim()

  const isMyTicket = (t) => {
    if (!userStage) return true
    const u = normalize(userStage)
    const stages = [t.delivery_stage, t.receiving_stage]
    return stages.some((s) => normalize(s) === u)
  }

  const isHistoryStatus = (status) => {
    const s = String(status || '').toLowerCase().trim()
    if (s.includes('chờ') || s.includes('pending')) return false
    return ['hoàn thành', 'đã nhận', 'trả lại', 'đã trả lại', 'đã hủy', 'done', 'cancelled', 'returned', 'rejected'].some((k) => s.includes(k))
  }

  const myTickets = tickets.filter(isMyTicket)
  const displayTickets = myTickets.filter((t) =>
    activeTab === 'history' ? isHistoryStatus(t.status) : !isHistoryStatus(t.status)
  )
  const myPendingCount = myTickets.filter((t) => !isHistoryStatus(t.status)).length

  const handleOpenReject = (ticket) => {
    const details = Array.isArray(ticket.details) && ticket.details.length > 0
      ? ticket.details.map((d) => ({
          id: d.id,
          part_name: d.part_name,
          specification: d.specification,
          quantity: Number(d.quantity) || 0,
          return_qty: Number(d.quantity) || 0,
        }))
      : []

    // Tự động nạp sẵn các lỗi QA Track / CTQ
    const trackedOpts = defectOptions.filter((d) => d.isQA || d.isCTQ)
    const initialErrors = trackedOpts.length > 0
      ? trackedOpts.slice(0, 3).map((opt, i) => ({
          id: `auto_${opt.id}_${i}`,
          defectId: opt.id || opt.value,
          code: opt.code || '',
          name: opt.name,
          isQA: Boolean(opt.isQA),
          isCTQ: Boolean(opt.isCTQ),
          qty: 0,
        }))
      : [{ id: '1', defectId: '', code: '', name: '', qty: 0, isQA: false, isCTQ: false }]
    setRejectErrors(initialErrors)

    setRejectDialog({
      isOpen: true,
      ticket,
      reason: '',
      returnMode: 'all', // 'all' | 'custom'
      quantity: Number(ticket?.quantity || ticket?.quantity_total || 0),
      items: details
    })
  }

  const handleConfirmReject = async () => {
    if (!rejectDialog.ticket) return
    setConfirming(true)
    try {
      const ticket = rejectDialog.ticket
      let finalReturnQty = Number(rejectDialog.quantity || ticket.quantity || 0)

      if (rejectDialog.returnMode === 'custom' && Array.isArray(rejectDialog.items) && rejectDialog.items.length > 0) {
        finalReturnQty = rejectDialog.items.reduce((s, it) => s + (Number(it.return_qty) || 0), 0)
      }

      // Chỉ lấy những lỗi mà người dùng thực sự ghi nhận số lượng > 0
      const errorList = rejectErrors.filter((e) => Number(e.qty) > 0 && Boolean(e.name))
      const errorDescs = errorList.map((e) => {
        const lbl = e.code ? `[${e.code}] ${e.name}` : e.name
        return `${lbl} (${e.qty} cái)`
      }).join(', ')

      const noteParts = []
      // Nếu có lỗi thì mới ghi
      if (errorDescs) {
        noteParts.push(`Lỗi: ${errorDescs}`)
      }
      // Nếu có nhập ghi chú thêm thì mới ghi
      if (rejectDialog.reason && rejectDialog.reason.trim()) {
        noteParts.push(rejectDialog.reason.trim())
      }

      const detailedNote = noteParts.join(' | ') || 'Trả lại hàng không đạt tiêu chuẩn'

      await confirmTicket(ticket.id, {
        user_id: user?.id || 1,
        sx_receipt: user?.id || 1,
        quantity_error: finalReturnQty,
        status: 'Chờ nhận hàng trả lại',
        note: detailedNote
      })
      setRejectDialog({ isOpen: false, ticket: null, reason: '', quantity: 0, items: [], returnMode: 'all' })
      setSelectedTicket(null)
      showMessage('success', 'Đã gửi yêu cầu trả hàng', `Phiếu ${ticket.code || `LC${ticket.id}`} đã chuyển sang trạng thái "Chờ nhận hàng trả lại" (SL trả: ${finalReturnQty}). Đang chờ bên giao xác nhận thu hồi.`)
      refresh()
    } catch (e) {
      console.error('Lỗi khi trả lại hàng:', e)
      const errDetail = e.response?.data?.detail || e.message || 'Không thể thực hiện trả hàng'
      showMessage('error', 'Lỗi trả hàng', typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail))
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmReturnReceived = async (ticket) => {
    if (!ticket || ticket.id === undefined || ticket.id === null) {
      showMessage('error', 'Lỗi dữ liệu', 'Không tìm thấy ID phiếu để xác nhận nhận lại hàng!')
      return
    }
    setConfirming(true)
    try {
      await confirmTicket(ticket.id, {
        user_id: user?.id || 1,
        sx_receipt: user?.id || 1,
        status: 'Trả lại',
        note: ticket.note
      })
      setSelectedTicket(null)
      showMessage('success', 'Đã xác nhận nhận lại hàng', `Đã xác nhận thu hồi hàng lỗi cho phiếu ${ticket.code || `LC${ticket.id}`}. Phiếu đã chuyển sang Lịch sử luân chuyển.`)
      refresh()
    } catch (e) {
      console.error('Lỗi xác nhận nhận lại hàng:', e)
      const errDetail = e.response?.data?.detail || e.message || 'Không thể xác nhận nhận lại hàng'
      showMessage('error', 'Lỗi xác nhận', typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail))
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmReceived = async (ticket) => {
    if (!ticket || ticket.id === undefined || ticket.id === null) {
      showMessage('error', 'Lỗi dữ liệu', 'Không tìm thấy ID phiếu luân chuyển để xác nhận!')
      return
    }
    setConfirming(true)
    try {
      await confirmTicket(ticket.id, {
        user_id: user?.id || 1,
        sx_receipt: user?.id || 1,
        quantity_received: Number(ticket.quantity || ticket.quantity_total || 0),
        status: 'Hoàn Thành'
      })
      setSelectedTicket(null)
      showMessage('success', 'Xác nhận thành công', `Đã xác nhận nhận hàng thành công cho phiếu ${ticket.code || `LC${ticket.id}`}`)
      refresh()
    } catch (e) {
      console.error('Lỗi xác nhận nhận hàng:', e)
      const errDetail = e.response?.data?.detail
        ? (typeof e.response.data.detail === 'string' ? e.response.data.detail : JSON.stringify(e.response.data.detail))
        : (e.message || 'Không rõ nguyên nhân')
      showMessage('error', 'Lỗi xác nhận', errDetail)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Layout>
      <PageHeader title="CL06: Danh sách luân chuyển" subTitle="Khởi tạo phiếu" showBack={false} />

      <div className="pv2-page">
        {/* Top Outer Filter Card */}
        <div className="pv2-plan-filter-card">
          <div className="pv2-plan-filter-label">Kế hoạch</div>
          <div className="pv2-plan-filter-row">
            <div className="pv2-plan-select-wrap">
              <CustomSelect
                value={String(filters.month || new Date().getMonth() + 1)}
                options={monthOptions}
                onChange={(v) => setFilters({ month: String(v), page: 1 })}
              />
            </div>
            <div className="pv2-plan-actions-right">
              <button
                type="button"
                className={`pv2-btn-icon-square ${filters.sort ? 'pv2-btn-icon-active' : ''}`}
                onClick={toggleSort}
                title={isAscending ? 'Sắp xếp cũ nhất trước' : 'Sắp xếp mới nhất trước'}
              >
                {isAscending ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
              </button>
              <button
                type="button"
                className={`pv2-btn-icon-square ${filterOpen || filters.stage || filters.status ? 'pv2-btn-icon-active' : ''}`}
                onClick={() => setFilterOpen(true)}
                title="Bộ lọc chi tiết"
              >
                <Filter size={18} />
              </button>
              <button
                type="button"
                className="pv2-btn-add-primary"
                onClick={() => navigate(`${ROUTES.TRANSFER_CREATE}/NEW`)}
              >
                <Plus size={16} /> Thêm mới
              </button>
            </div>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="pv2-custom-tabs-container">
          <button
            type="button"
            className={`pv2-custom-tab ${activeTab === 'pending' ? 'pv2-custom-tab--active' : ''}`}
            onClick={() => setFilters({ tab: 'pending', page: 1 })}
          >
            <span>Phiếu cần xác nhận</span>
            {myPendingCount > 0 && <span className="pv2-badge-red">{myPendingCount}</span>}
          </button>
          <button
            type="button"
            className={`pv2-custom-tab ${activeTab === 'history' ? 'pv2-custom-tab--active' : ''}`}
            onClick={() => setFilters({ tab: 'history', page: 1 })}
          >
            <span>Lịch sử luân chuyển</span>
          </button>
        </div>

        {/* Cards List */}
        <div className="pv2-list">
          {loading && <p className="pv2-status-text">Đang tải...</p>}
          {error && <p className="pv2-status-text pv2-status-text--error">{error}</p>}
          {!loading && !error && displayTickets.length === 0 && (
            <div className="pv2-empty-state">
              <div className="pv2-empty-icon-wrap">
                <ClipboardX size={32} />
              </div>
              <div className="pv2-empty-title">Không có phiếu luân chuyển nào</div>
              <div className="pv2-empty-desc">
                Chưa có dữ liệu phiếu nào phù hợp với bộ lọc {filters.month ? `Tháng ${filters.month}` : 'kỳ kế hoạch'}.
              </div>
            </div>
          )}
          {!loading && displayTickets.map((t) => (
            <TransferCard
              key={t.id}
              ticket={t}
              onClick={() => setSelectedTicket(t)}
            />
          ))}
        </div>

        {/* Fixed Bottom Pagination Bar */}
        <div className="pv2-pagination-wrapper">
          <div className="pv2-pagination-bar">
            <button
              type="button"
              className="pv2-page-arrow-btn"
              disabled={page <= 1}
              onClick={() => setFilters({ page: page - 1 })}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="pv2-page-status-text">
              {total > 0 ? (
                <>Hiển thị <strong>{(page - 1) * pageSize + 1}</strong> - <span className="pv2-page-num-box">{Math.min(page * pageSize, total)}</span> trong <strong>{total}</strong> kết quả</>
              ) : (
                'Không có kết quả'
              )}
            </div>
            <button
              type="button"
              className="pv2-page-arrow-btn"
              disabled={page >= totalPages}
              onClick={() => setFilters({ page: page + 1 })}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (() => {
        const sLower = String(selectedTicket.status || '').toLowerCase().trim()
        const isWaitingReturn = sLower.includes('chờ') && (sLower.includes('trả') || sLower.includes('lại'))
        const isCompletedOrReturned = !isWaitingReturn && ['hoàn thành', 'đã nhận', 'trả lại', 'đã trả lại', 'đã hủy', 'done', 'cancelled', 'returned', 'rejected'].some((k) => sLower.includes(k))
        const isPendingState = ['chờ', 'pending', ''].some((k) => sLower.includes(k)) || sLower === 'chưa xác nhận'
        const canConfirm = activeTab === 'pending' && !isCompletedOrReturned && isPendingState

        const statusColor = sLower.includes('hoàn thành') || sLower.includes('đã nhận')
          ? '#16a34a'
          : isWaitingReturn
            ? '#ea580c'
            : sLower.includes('trả') || sLower.includes('lỗi') || sLower.includes('hủy')
              ? '#dc2626'
              : '#3b82f6'

        return (
          <div className="pv2-modal-overlay" onClick={() => setSelectedTicket(null)}>
            <div className="pv2-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
              <div className="pv2-modal-header" style={{ flexShrink: 0, padding: '10px 14px' }}>
                <span className="pv2-modal-title" style={{ fontSize: 15, fontWeight: 800, color: '#4a240e' }}>
                  Chi tiết phiếu {selectedTicket.code || `LC${selectedTicket.id}`}
                </span>
                <button type="button" className="pv2-modal-close" onClick={() => setSelectedTicket(null)}><X size={18} /></button>
              </div>
              <div className="pv2-modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem', padding: '10px 12px' }}>
                {isWaitingReturn && (
                  <div style={{
                    backgroundColor: '#fff7ed',
                    border: '1.5px solid #fed7aa',
                    padding: '8px 10px',
                    borderRadius: 8,
                    color: '#c2410c',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>⚠️</span> Hàng bị trả lại. Đang chờ bên giao xác nhận thu hồi.
                  </div>
                )}

                {/* Box 1: Thông tin Lô hàng & Đơn hàng */}
                <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#432818', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📦 Thông tin Lô hàng & Chi tiết:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Mã PO (Đơn hàng):</span>
                      <span style={{ fontWeight: '800', color: '#1e293b' }}>{selectedTicket.po_code || '-'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Mã Pallet / Thùng:</span>
                      <span style={{ fontWeight: '800', color: '#1e293b' }}>{selectedTicket.pallet_code || '-'}</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Tên chi tiết / Sản phẩm:</span>
                      <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.84rem' }}>{selectedTicket.part_name || selectedTicket.product || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Quy cách:</span>
                      <span style={{ fontWeight: '700', color: '#334155' }}>{selectedTicket.specification || 'Quy cách tiêu chuẩn'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Thời gian lập:</span>
                      <span style={{ fontWeight: '700', color: '#334155' }}>{selectedTicket.time_str || selectedTicket.created_at || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Người bàn giao:</span>
                      <span style={{ fontWeight: '800', color: '#1e40af' }}>{selectedTicket.sender_name || 'Chưa phân công'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Người tiếp nhận:</span>
                      <span style={{ fontWeight: '800', color: selectedTicket.receiver_name === 'Chưa tiếp nhận' ? '#94a3b8' : '#1e40af' }}>{selectedTicket.receiver_name || 'Chưa tiếp nhận'}</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Lộ trình công đoạn:</span>
                      <span style={{ fontWeight: '700', color: '#334155' }}>{selectedTicket.route_str || (selectedTicket.delivery_stage ? `${selectedTicket.delivery_stage} - ${selectedTicket.receiving_stage || ''}` : '—')}</span>
                    </div>
                  </div>
                </div>

                {/* Box 2: Số lượng bàn giao & Thực nhận */}
                {(() => {
                  let parsedDetailReturnedSum = 0
                  let hasParsedDetails = false

                  if (selectedTicket.details && selectedTicket.details.length > 0 && selectedTicket.note) {
                    selectedTicket.details.forEach((dt) => {
                      const partName = dt.part_name || dt.detail || ''
                      const match = selectedTicket.note.match(new RegExp(`${partName}[^:]*:\\s*trả\\s*(\\d+)`, 'i'))
                      if (match) {
                        parsedDetailReturnedSum += Number(match[1]) || 0
                        hasParsedDetails = true
                      }
                    })
                  }

                  const totalDelivered = Number(selectedTicket.quantity || selectedTicket.quantity_total || 0)
                  const rawError = Number(selectedTicket.quantity_error || 0)
                  const isReturnedTicket = Boolean(
                    rawError > 0 || hasParsedDetails ||
                    (selectedTicket.status && (selectedTicket.status.includes('trả') || selectedTicket.status.includes('Trả')))
                  )
                  const effectiveError = isReturnedTicket ? (hasParsedDetails ? parsedDetailReturnedSum : (rawError || totalDelivered)) : 0
                  const totalReceived = isReturnedTicket ? Math.max(0, totalDelivered - effectiveError) : totalDelivered

                  return (
                    <div style={{ backgroundColor: '#fff', padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#432818', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📊 Thống kê Số lượng:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isReturnedTicket ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '6px', marginBottom: selectedTicket.details && selectedTicket.details.length > 0 ? '8px' : '0' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '6px 4px', borderRadius: '6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: '600' }}>Tổng bàn giao:</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#c85a1e' }}>{totalDelivered}</div>
                        </div>
                        {isReturnedTicket && (
                          <div style={{ backgroundColor: '#fef2f2', padding: '6px 4px', borderRadius: '6px', textAlign: 'center', border: '1px solid #fecaca' }}>
                            <div style={{ fontSize: '0.66rem', color: '#991b1b', fontWeight: '600' }}>SL Trả lại:</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#dc2626' }}>{effectiveError}</div>
                          </div>
                        )}
                        <div style={{ backgroundColor: '#f0fdf4', padding: '6px 4px', borderRadius: '6px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '0.66rem', color: '#166534', fontWeight: '600' }}>Tổng thực nhận:</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#16a34a' }}>{totalReceived}</div>
                        </div>
                      </div>

                      {/* Bảng chi tiết từng mặt hàng bàn giao */}
                      {selectedTicket.details && selectedTicket.details.length > 0 && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '4px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                            Chi tiết từng mặt hàng:
                          </div>
                          <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                                  <th style={{ padding: '5px 4px', textAlign: 'center', width: '26px' }}>STT</th>
                                  <th style={{ padding: '5px 6px' }}>Chi tiết</th>
                                  <th style={{ padding: '5px 6px' }}>Quy cách</th>
                                  <th style={{ padding: '5px 4px', textAlign: 'center', width: '38px' }}>Giao</th>
                                  {isReturnedTicket && (
                                    <th style={{ padding: '5px 4px', textAlign: 'center', width: '38px', color: '#dc2626' }}>Trả</th>
                                  )}
                                  <th style={{ padding: '5px 4px', textAlign: 'center', width: '42px', color: '#16a34a' }}>Nhận</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedTicket.details.map((dt, dIdx) => {
                                  const itemDelivered = Number(dt.quantity || dt.qty || 0)
                                  const partName = dt.part_name || dt.detail || ''
                                  let itemReturned = 0
                                  if (isReturnedTicket) {
                                    const match = selectedTicket.note ? selectedTicket.note.match(new RegExp(`${partName}[^:]*:\\s*trả\\s*(\\d+)`, 'i')) : null
                                    if (match) {
                                      itemReturned = Number(match[1]) || 0
                                    } else if (hasParsedDetails) {
                                      itemReturned = 0
                                    } else if (rawError === totalDelivered || totalDelivered === 0) {
                                      itemReturned = itemDelivered
                                    }
                                  }
                                  const itemReceived = Math.max(0, itemDelivered - itemReturned)

                                  return (
                                    <tr key={dIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: dIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                      <td style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{String(dIdx + 1).padStart(2, '0')}</td>
                                      <td style={{ padding: '4px 6px', fontWeight: 700, color: '#1e293b' }}>{partName}</td>
                                      <td style={{ padding: '4px 6px', color: '#475569' }}>{dt.specification || dt.spec || 'Tiêu chuẩn'}</td>
                                      <td style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 800, color: '#c85a1e' }}>{itemDelivered}</td>
                                      {isReturnedTicket && (
                                        <td style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 800, color: itemReturned > 0 ? '#dc2626' : '#94a3b8' }}>
                                          {itemReturned}
                                        </td>
                                      )}
                                      <td style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{itemReceived}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Box 3: Thông số & Ghi chú */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {selectedTicket.moisture_min !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Độ ẩm cho phép:</span>
                      <span style={{ fontWeight: '700', color: '#334155' }}>{selectedTicket.moisture_min || 10}% - {selectedTicket.moisture_max || 12}%</span>
                    </div>
                  )}
                  {selectedTicket.note && (() => {
                    const fullNote = selectedTicket.note || ''
                    // Tách và chỉ giữ lại những lỗi có số lượng, hoặc ghi chú thông thường
                    const cleanNoteStr = (() => {
                      let text = fullNote.replace(/\[Chi tiết:[^\]]+\]/i, '').trim()
                      const rawParts = text.split('|').map((p) => p.trim()).filter(Boolean)
                      const validParts = []

                      for (const part of rawParts) {
                        if (/\[[A-Z0-9_-]+\]/i.test(part)) {
                          // Đây là phần chứa lỗi
                          const items = part.split(',').map((it) => it.trim()).filter(Boolean)
                          const withQty = items.filter((it) => {
                            if (/\[[A-Z0-9_-]+\]/i.test(it)) {
                              return /\(\s*(?:SL:\s*)?\d+/i.test(it) || /:\s*\d+/i.test(it)
                            }
                            return true
                          })
                          if (withQty.length > 0) {
                            validParts.push(withQty.join(', '))
                          }
                        } else {
                          validParts.push(part)
                        }
                      }
                      return validParts.join(' | ').trim()
                    })()

                    if (!cleanNoteStr) return null

                    // Làm sạch tiền tố dư thừa nếu có
                    const displayText = cleanNoteStr.replace(/^(?:•\s*)?(?:Lỗi|Ghi chú):\s*/i, '').trim()
                    if (!displayText) return null

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ color: '#64748b', fontWeight: '600', fontSize: '0.72rem' }}>Lý do trả hàng / Ghi chú:</span>
                        <div style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                          <span style={{ color: '#475569', fontWeight: 700, flexShrink: 0 }}>• Ghi chú:</span>
                          <span style={{ color: '#1e293b' }}>{displayText}</span>
                        </div>
                      </div>
                    )
                  })()}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Trạng thái:</span>
                    <strong style={{ color: statusColor, fontWeight: 800 }}>{selectedTicket.status || 'Chờ xác nhận'}</strong>
                  </div>
                </div>
              </div>
              <div className="pv2-modal-footer" style={{ flexShrink: 0, padding: '8px 12px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '0 0 14px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                {isWaitingReturn ? (
                  <>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        height: 34,
                        padding: '0 6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: 8,
                        backgroundColor: '#4a240e',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}
                      disabled={confirming}
                      onClick={() => handleConfirmReturnReceived(selectedTicket)}
                    >
                      {confirming ? 'Đang lưu...' : '✓ Nhận lại hàng'}
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        height: 34,
                        padding: '0 6px',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                      onClick={() => setSelectedTicket(null)}
                    >
                      Đóng
                    </button>
                  </>
                ) : canConfirm ? (
                  <>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        height: 34,
                        padding: '0 6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: 8,
                        backgroundColor: '#4a240e',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}
                      disabled={confirming}
                      onClick={() => handleConfirmReceived(selectedTicket)}
                    >
                      {confirming ? 'Đang lưu...' : '✓ Nhận hàng'}
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        height: 34,
                        padding: '0 6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: 8,
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}
                      disabled={confirming}
                      onClick={() => {
                        const t = selectedTicket
                        setSelectedTicket(null)
                        handleOpenReject(t)
                      }}
                    >
                      ✕ Trả hàng
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        height: 34,
                        padding: '0 6px',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                      onClick={() => setSelectedTicket(null)}
                    >
                      Đóng
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '0 8px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedTicket(null)}
                  >
                    Đóng cửa sổ
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Reject / Return Modal Dialog */}
      {rejectDialog.isOpen && (
        <div className="pv2-modal-overlay" onClick={() => setRejectDialog({ isOpen: false, ticket: null, reason: '', quantity: 0, items: [], returnMode: 'all' })}>
          <div className="pv2-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="pv2-modal-header" style={{ borderBottom: '1.5px solid #fee2e2', backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '14px 14px 0 0' }}>
              <span className="pv2-modal-title" style={{ fontSize: 16, fontWeight: 900, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚠️</span> Xác nhận Trả hàng [{rejectDialog.ticket?.code || `LC${rejectDialog.ticket?.id}`}]
              </span>
              <button type="button" className="pv2-modal-close" onClick={() => setRejectDialog({ isOpen: false, ticket: null, reason: '', quantity: 0, items: [], returnMode: 'all' })}>
                <X size={18} />
              </button>
            </div>

            <div className="pv2-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px' }}>
              {/* Lựa chọn hình thức trả hàng nếu phiếu có nhiều chi tiết */}
              {Array.isArray(rejectDialog.items) && rejectDialog.items.length > 1 && (
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Hình thức trả hàng:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const allQty = Number(rejectDialog.ticket?.quantity || rejectDialog.ticket?.quantity_total || 0)
                        setRejectDialog((prev) => ({
                          ...prev,
                          returnMode: 'all',
                          quantity: allQty,
                          items: (prev.items || []).map((it) => ({ ...it, return_qty: it.quantity }))
                        }))
                      }}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: rejectDialog.returnMode === 'all' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: rejectDialog.returnMode === 'all' ? '#fef2f2' : '#fff',
                        color: rejectDialog.returnMode === 'all' ? '#b91c1c' : '#475569'
                      }}
                    >
                      📦 Trả toàn bộ ({rejectDialog.ticket?.quantity || rejectDialog.ticket?.quantity_total || 0} cái)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectDialog((prev) => ({
                          ...prev,
                          returnMode: 'custom'
                        }))
                      }}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: rejectDialog.returnMode === 'custom' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: rejectDialog.returnMode === 'custom' ? '#fef2f2' : '#fff',
                        color: rejectDialog.returnMode === 'custom' ? '#b91c1c' : '#475569'
                      }}
                    >
                      🔍 Trả từng chi tiết
                    </button>
                  </div>
                </div>
              )}

              {/* Danh sách chi tiết khi trả từng chi tiết */}
              {rejectDialog.returnMode === 'custom' && Array.isArray(rejectDialog.items) && rejectDialog.items.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                      Nhập số lượng trả cho từng chi tiết:
                    </label>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>
                      Tổng trả: {rejectDialog.items.reduce((s, it) => s + (Number(it.return_qty) || 0), 0)} / {rejectDialog.ticket?.quantity || rejectDialog.ticket?.quantity_total || 0} cái
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                          <th style={{ padding: '8px 6px' }}>Chi tiết</th>
                          <th style={{ padding: '8px 4px', textAlign: 'center', width: '50px' }}>Giao</th>
                          <th style={{ padding: '8px 6px', textAlign: 'center', width: '90px' }}>SL Trả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rejectDialog.items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 6px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.part_name}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{it.specification || 'Tiêu chuẩn'}</div>
                            </td>
                            <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 800, color: '#475569' }}>
                              {it.quantity}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  height: 32,
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  backgroundColor: '#fff',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = Number(it.return_qty) || 0
                                    const next = Math.max(0, cur - 1)
                                    setRejectDialog((prev) => ({
                                      ...prev,
                                      items: prev.items.map((item, i) => i === idx ? { ...item, return_qty: next } : item)
                                    }))
                                  }}
                                  style={{
                                    width: 24,
                                    height: '100%',
                                    border: 'none',
                                    borderRight: '1px solid #f1f5f9',
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    padding: 0
                                  }}
                                >
                                  <Minus size={12} />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={it.quantity}
                                  value={it.return_qty === '' ? '' : (it.return_qty !== undefined ? it.return_qty : 0)}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const raw = e.target.value
                                    if (raw === '') {
                                      setRejectDialog((prev) => ({
                                        ...prev,
                                        items: prev.items.map((item, i) => i === idx ? { ...item, return_qty: '' } : item)
                                      }))
                                      return
                                    }
                                    const num = parseInt(raw, 10)
                                    const val = isNaN(num) ? 0 : Math.min(it.quantity, Math.max(0, num))
                                    setRejectDialog((prev) => ({
                                      ...prev,
                                      items: prev.items.map((item, i) => i === idx ? { ...item, return_qty: val } : item)
                                    }))
                                  }}
                                  onBlur={() => {
                                    if (it.return_qty === '' || isNaN(it.return_qty)) {
                                      setRejectDialog((prev) => ({
                                        ...prev,
                                        items: prev.items.map((item, i) => i === idx ? { ...item, return_qty: 0 } : item)
                                      }))
                                    }
                                  }}
                                  style={{
                                    width: 38,
                                    height: '100%',
                                    padding: '0 2px',
                                    border: 'none',
                                    textAlign: 'center',
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: Number(it.return_qty) > 0 ? '#dc2626' : '#64748b',
                                    outline: 'none'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = Number(it.return_qty) || 0
                                    const next = Math.min(it.quantity, cur + 1)
                                    setRejectDialog((prev) => ({
                                      ...prev,
                                      items: prev.items.map((item, i) => i === idx ? { ...item, return_qty: next } : item)
                                    }))
                                  }}
                                  style={{
                                    width: 24,
                                    height: '100%',
                                    border: 'none',
                                    borderLeft: '1px solid #f1f5f9',
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#dc2626',
                                    padding: 0
                                  }}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Số lượng trả lại:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number"
                      min="1"
                      max={rejectDialog.ticket?.quantity || rejectDialog.ticket?.quantity_total || 99999}
                      value={rejectDialog.quantity === '' ? '' : rejectDialog.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === '') {
                          setRejectDialog((prev) => ({ ...prev, quantity: '' }))
                          return
                        }
                        const maxQ = Number(rejectDialog.ticket?.quantity || rejectDialog.ticket?.quantity_total || 99999)
                        const val = Math.min(maxQ, Math.max(0, parseInt(raw, 10) || 0))
                        setRejectDialog((prev) => ({ ...prev, quantity: val }))
                      }}
                      onBlur={() => {
                        if (rejectDialog.quantity === '' || isNaN(rejectDialog.quantity)) {
                          setRejectDialog((prev) => ({ ...prev, quantity: 1 }))
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 15,
                        fontWeight: 800,
                        color: '#dc2626'
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                      / {rejectDialog.ticket?.quantity || rejectDialog.ticket?.quantity_total || 0} cái
                    </span>
                  </div>
                </div>
              )}

              {/* Theo dõi xu hướng lỗi */}
              <div className="pv2-error-section" style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                <div className="pv2-section-title" style={{ fontSize: '0.88rem', fontWeight: 800, color: '#432818', marginBottom: 6 }}>
                  Theo dõi xu hướng lỗi
                </div>
                <div className="pv2-error-table-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', fontWeight: 700, padding: '0 4px 6px' }}>
                  <span>Tên lỗi</span>
                  <span>SL Ghi nhận</span>
                </div>
                {rejectErrors.map((row, idx) => (
                  <ErrorTrendRow
                    key={row.id || idx}
                    row={row}
                    defectOptions={defectOptions}
                    allDefectOptions={defectOptions}
                    selectedDefectIds={rejectErrors
                      .filter((_, i) => i !== idx)
                      .flatMap((e) => [e?.defectId, e?.code, e?.name])
                      .filter(Boolean)}
                    onChange={(r) => updateRejectError(idx, r)}
                    onRemove={rejectErrors.length > 1 ? () => removeRejectErrorRow(idx) : null}
                  />
                ))}
                <button
                  type="button"
                  className="pv2-btn-add-image-link"
                  onClick={addRejectErrorRow}
                  style={{
                    marginTop: 6,
                    background: 'none',
                    border: 'none',
                    color: '#b45309',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Plus size={14} /> Ghi nhận lỗi khác
                </button>
              </div>

              {/* Nhập chi tiết lý do */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Mô tả lỗi / Lý do trả hàng: <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả cụ thể về hàng bị lỗi cần trả lại..."
                  value={rejectDialog.reason}
                  onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>
            </div>

            <div className="pv2-modal-footer" style={{ display: 'flex', gap: 10, padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '0 0 14px 14px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="pv2-btn-cancel"
                onClick={() => setRejectDialog({ isOpen: false, ticket: null, reason: '', quantity: 0, items: [], returnMode: 'all' })}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  backgroundColor: '#fff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={confirming}
                onClick={handleConfirmReject}
                style={{
                  flex: 1.5,
                  padding: '10px 14px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                {confirming ? 'Đang lưu...' : '✓ Xác nhận Trả hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      <FilterPanel
        open={filterOpen}
        filters={filters}
        onApply={(f) => setFilters({ ...f, page: 1 })}
        onClose={() => setFilterOpen(false)}
      />

      <MessageModal
        isOpen={msgModal.isOpen}
        type={msgModal.type}
        title={msgModal.title}
        message={msgModal.message}
        onConfirm={() => setMsgModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </Layout>
  )
}

export default CL06_TransferListView
