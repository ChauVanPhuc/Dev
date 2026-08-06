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

  const monthOptions = availableMonths.map((m) => ({ value: m.month, label: `Tháng ${m.month}` }))

  const activeTab = filters.tab || 'pending'
  const page = filters.page || 1
  const pageSize = 10
  const totalPages = Math.ceil(total / pageSize) || 1

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

      <div className="pv2-page pv2-page--fixed-layout">
        {/* Phần 1: Bộ lọc Kế hoạch & Tabs (Cố định ở Đỉnh) */}
        <div className="pv2-fixed-top-section">
          <div className="pv2-plan-filter-card">
            <div className="pv2-plan-filter-label">Kế hoạch</div>
            <div className="pv2-plan-filter-row">
              <div className="pv2-plan-select-wrap">
                <CustomSelect
                  value={filters.month || (monthOptions[0]?.value ?? '')}
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

          <div className="pv2-custom-tabs-container">
            <button
              type="button"
              className={`pv2-custom-tab ${activeTab === 'pending' ? 'pv2-custom-tab--active' : ''}`}
              onClick={() => setFilters({ tab: 'pending', page: 1 })}
            >
              <span>Phiếu cần xác nhận</span>
              <span className="pv2-badge-red">{total}</span>
            </button>
            <button
              type="button"
              className={`pv2-custom-tab ${activeTab === 'history' ? 'pv2-custom-tab--active' : ''}`}
              onClick={() => setFilters({ tab: 'history', page: 1 })}
            >
              <span>Lịch sử luân chuyển</span>
            </button>
          </div>
        </div>

        {/* Phần 2: Danh sách thẻ cuộn nội dung (Cuộn ở Giữa) */}
        <div className="pv2-scrollable-list-section">
          {loading && <p className="pv2-status-text">Đang tải dữ liệu từ CSDL...</p>}
          {error && <p className="pv2-status-text pv2-status-text--error">{error}</p>}
          {!loading && !error && tickets.length === 0 && (
            <p className="pv2-status-text">Không có phiếu luân chuyển phù hợp với bộ lọc trong CSDL</p>
          )}
          {!loading && tickets.map((t) => (
            <TransferCard
              key={t.id}
              ticket={t}
              onClick={() => setSelectedTicket(t)}
            />
          ))}
        </div>

        {/* Thanh Phân trang Cố định ở Đáy */}
        <div className="pv2-fixed-bottom-section">
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
              Show <strong>{total === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to <span className="pv2-page-num-box">{Math.min(page * pageSize, total)}</span> of <strong>{total}</strong> results
            </div>
            <button
              type="button"
              className="pv2-page-arrow-btn"
              disabled={page >= totalPages || total === 0}
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
