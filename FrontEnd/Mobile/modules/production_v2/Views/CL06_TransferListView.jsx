import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownAZ, Filter, Plus, X, ChevronLeft, ChevronRight, ClipboardX } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import { useTransferController } from '../Controllers/useTransferController'
import TransferCard from './components/TransferCard'
import FilterPanel from './components/FilterPanel'
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

  const monthOptions = availableMonths.length > 0
    ? availableMonths.map((m) => ({ value: m.month, label: `Tháng ${m.month}` }))
    : [{ value: 7, label: 'Tháng 7' }, { value: 6, label: 'Tháng 6' }]

  const activeTab = filters.tab || 'pending'
  const page = filters.page || 1
  const pageSize = 10
  const totalPages = Math.ceil(total / pageSize) || 1

  const user = useAuthStore((state) => state.user)
  const userStage = user?.activeStageName || user?.stage_name || user?.stageNames?.[0]
  const normalize = (s) => String(s || '').toLowerCase().trim()

  const isMyTicket = (t) => {
    if (!userStage) return true
    const u = normalize(userStage)
    const stages = [t.delivery_stage, t.receiving_stage]
    return stages.some((s) => normalize(s) === u)
  }

  const isHistoryStatus = (status) => ['done', 'hoàn thành'].includes(String(status).toLowerCase())

  const myTickets = tickets.filter(isMyTicket)
  const displayTickets = myTickets.filter((t) =>
    activeTab === 'history' ? isHistoryStatus(t.status) : !isHistoryStatus(t.status)
  )
  const myPendingCount = myTickets.filter((t) => !isHistoryStatus(t.status)).length

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
      <PageHeader title="Khởi tạo phiếu" subTitle="CL06: Danh sách luân chuyển" showBack={false} />

      <div className="pv2-page">
        {/* Top Outer Filter Card */}
        <div className="pv2-plan-filter-card">
          <div className="pv2-plan-filter-label">Kế hoạch</div>
          <div className="pv2-plan-filter-row">
            <div className="pv2-plan-select-wrap">
              <CustomSelect
                value={filters.month || monthOptions[0]?.value}
                options={monthOptions}
                onChange={(v) => setFilters({ month: Number(v), page: 1 })}
              />
            </div>
            <div className="pv2-plan-actions-right">
              <button type="button" className="pv2-btn-icon-square" title="Sắp xếp">
                <ArrowDownAZ size={18} />
              </button>
              <button type="button" className="pv2-btn-icon-square" onClick={() => setFilterOpen(true)} title="Bộ lọc">
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
              <div className="pv2-empty-title">Không có dữ liệu luân chuyển</div>
              <div className="pv2-empty-desc">
                Chưa có phiếu luân chuyển nào phù hợp với bộ lọc hiện tại.
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
                <>Show <strong>{(page - 1) * pageSize + 1}</strong> to <span className="pv2-page-num-box">{Math.min(page * pageSize, total)}</span> of <strong>{total}</strong> results</>
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
      {selectedTicket && (
        <div className="pv2-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="pv2-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="pv2-modal-header">
              <span className="pv2-modal-title" style={{ fontSize: 16, fontWeight: 800, color: '#4a240e' }}>
                Chi tiết phiếu {selectedTicket.code || `LC${selectedTicket.id}`}
              </span>
              <button type="button" className="pv2-modal-close" onClick={() => setSelectedTicket(null)}><X size={18} /></button>
            </div>
            <div className="pv2-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Thời gian lập:</span>
                <strong>{selectedTicket.time_str || selectedTicket.created_at || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Công đoạn:</span>
                <strong>{selectedTicket.route_str || (selectedTicket.delivery_stage ? `${selectedTicket.delivery_stage} - ${selectedTicket.receiving_stage || ''}` : '—')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Chi tiết sản phẩm:</span>
                <strong style={{ color: '#4a240e' }}>{selectedTicket.part_name || selectedTicket.product || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Số lượng bàn giao:</span>
                <strong style={{ color: '#c85a1e', fontSize: 16 }}>{selectedTicket.quantity || 0} Cái</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Trạng thái:</span>
                <strong style={{ color: '#d9381e' }}>{selectedTicket.status || 'Chờ xác nhận'}</strong>
              </div>
            </div>
            <div className="pv2-modal-footer">
              <button type="button" className="pv2-btn-cancel" onClick={() => setSelectedTicket(null)}>Đóng</button>
              <button
                type="button"
                className="pv2-btn-submit"
                disabled={confirming}
                onClick={() => handleConfirmReceived(selectedTicket)}
              >
                {confirming ? 'Đang lưu...' : 'Xác nhận nhận hàng'}
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
