import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownAZ, Filter, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useTransferController } from '../Controllers/useTransferController'
import TransferCard from './components/TransferCard'
import FilterPanel from './components/FilterPanel'
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

  const monthOptions = availableMonths.length > 0
    ? availableMonths.map((m) => ({ value: m.month, label: `Tháng ${m.month}` }))
    : [{ value: 7, label: 'Tháng 7' }, { value: 6, label: 'Tháng 6' }]

  const activeTab = filters.tab || 'pending'
  const page = filters.page || 1
  const pageSize = 10
  const totalPages = Math.ceil(total / pageSize) || 1

  const mockTickets = [
    { id: 1, code: 'LC01', version: 'V1', version_badge: 'V1', time_str: '16:40 | 22/1/2026', route_str: 'Định hình 1 - Lắp ráp 1', status: 'Chờ xác nhận' },
    { id: 3, code: 'LC03', version: 'V2', version_badge: 'V2', time_str: '16:45 | 22/1/2026', route_str: 'Lắp ráp 1 - Định hình 1', status: 'Chờ xác nhận' },
  ]

  const displayTickets = tickets.length > 0 ? tickets : mockTickets

  const handleConfirmReceived = async (ticket) => {
    setConfirming(true)
    try {
      await confirmTicket(ticket.id, { status: 'Đã nhận' })
      alert(`Đã xác nhận nhận hàng thành công cho phiếu ${ticket.code || ticket.id}`)
      setSelectedTicket(null)
      refresh()
    } catch (e) {
      alert('Lỗi xác nhận nhận hàng: ' + (e.message || 'Không rõ nguyên nhân'))
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
            <span className="pv2-badge-red">{pendingCount || 9}</span>
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
          {!loading && displayTickets.map((t) => (
            <TransferCard
              key={t.id}
              ticket={t}
              onClick={() => setSelectedTicket(t)}
            />
          ))}
        </div>

        {/* Pagination Bar */}
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
            Show <strong>{(page - 1) * pageSize + 1}</strong> to <span className="pv2-page-num-box">{Math.min(page * pageSize, total || 20)}</span> of <strong>{total || 20}</strong> results
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
                <strong>{selectedTicket.time_str || '16:40 | 22/1/2026'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Công đoạn:</span>
                <strong>{selectedTicket.route_str || 'Định hình 1 - Lắp ráp 1'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Chi tiết sản phẩm:</span>
                <strong style={{ color: '#4a240e' }}>{selectedTicket.part_name || 'Thanh A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Số lượng bàn giao:</span>
                <strong style={{ color: '#c85a1e', fontSize: 16 }}>{selectedTicket.quantity || 134} Cái</strong>
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
    </Layout>
  )
}

export default CL06_TransferListView
