import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, ArrowUpDown, Plus, X } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import Tabs from '@mobile/Shared/Views/components/ui/Tabs'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useTransferController } from '../Controllers/useTransferController'
import TransferCard from './components/TransferCard'
import FilterPanel from './components/FilterPanel'
import { ROUTES } from '../constants'
import '../styles/production_v2.css'

const CL06_TransferListView = () => {
  const navigate = useNavigate()
  const {
    tickets, total, loading, error, availableMonths, availableParts,
    filters, setFilters, pendingCount, confirmTicket, refresh
  } = useTransferController()
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const monthOptions = availableMonths.length > 0
    ? availableMonths.map((m) => ({ value: m.month, label: `Tháng ${m.month}` }))
    : [{ value: 7, label: 'Tháng 7' }, { value: 6, label: 'Tháng 6' }]

  const partOptions = [
    { value: 'Tất cả chi tiết', label: 'Tất cả chi tiết' },
    ...(availableParts.map((p) => ({ value: p, label: p })))
  ]

  const tabs = [
    { id: 'pending', label: `Phiếu cần xác nhận`, badge: pendingCount },
    { id: 'history', label: 'Lịch sử luân chuyển' },
  ]

  const page = filters.page || 1
  const totalPages = Math.ceil(total / 10)

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
      <PageHeader title="CL06: Danh sách luân chuyển" subTitle="Khởi tạo phiếu" showBack={false} />

      <div className="pv2-page">
        <div className="pv2-toolbar">
          <div className="pv2-toolbar-left" style={{ display: 'flex', gap: 8, flex: 1 }}>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={filters.month || monthOptions[0]?.value}
                options={monthOptions}
                onChange={(v) => setFilters({ month: Number(v), page: 1 })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={filters.part_name || 'Tất cả chi tiết'}
                options={partOptions}
                onChange={(v) => setFilters({ part_name: v, page: 1 })}
              />
            </div>
          </div>
          <div className="pv2-toolbar-right">
            <button className="pv2-icon-btn" onClick={() => setFilterOpen(true)} title="Bộ lọc">
              <SlidersHorizontal size={18} />
            </button>
            <button className="pv2-btn-add" onClick={() => navigate(`${ROUTES.TRANSFER_CREATE}/NEW`)}>
              <Plus size={16} /> Thêm mới
            </button>
          </div>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={filters.tab || 'pending'}
          onTabChange={(tab) => setFilters({ tab, page: 1 })}
        />

        <div className="pv2-list">
          {loading && <p className="pv2-status-text">Đang tải lịch sử luân chuyển...</p>}
          {error && <p className="pv2-status-text pv2-status-text--error">{error}</p>}
          {!loading && !error && tickets.length === 0 && (
            <p className="pv2-status-text">Không có phiếu luân chuyển phù hợp với bộ lọc</p>
          )}
          {!loading && tickets.map((t) => (
            <TransferCard
              key={t.id}
              ticket={t}
              onClick={() => setSelectedTicket(t)}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pv2-pagination">
            <button
              className="pv2-page-btn"
              disabled={page <= 1}
              onClick={() => setFilters({ page: page - 1 })}
            >&lt;</button>
            <span className="pv2-page-info">
              Show {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} results
            </span>
            <button
              className="pv2-page-btn"
              disabled={page >= totalPages}
              onClick={() => setFilters({ page: page + 1 })}
            >&gt;</button>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal (matching CL05) */}
      {selectedTicket && (
        <div className="pv2-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="pv2-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="pv2-modal-header">
              <span className="pv2-modal-title" style={{ fontSize: 16, fontWeight: 800, color: '#4a240e' }}>
                Chi tiết phiếu {selectedTicket.code || `LC${selectedTicket.id}`}
              </span>
              <button className="pv2-modal-close" onClick={() => setSelectedTicket(null)}><X size={18} /></button>
            </div>
            <div className="pv2-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Thời gian lập:</span>
                <strong>{selectedTicket.time_str || selectedTicket.createdAt || '16:40 | 22/1/2026'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Công đoạn:</span>
                <strong>{selectedTicket.route_str || `${selectedTicket.fromStage} → ${selectedTicket.toStage}`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Chi tiết sản phẩm:</span>
                <strong style={{ color: '#4a240e' }}>{selectedTicket.part_name || selectedTicket.detail || 'Thanh A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Số lượng bàn giao:</span>
                <strong style={{ color: '#c85a1e', fontSize: 16 }}>{selectedTicket.quantity || selectedTicket.totalQty || 134} Cái</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Người bàn giao:</span>
                <span>{selectedTicket.sender_name || 'Nguyễn Văn A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Người tiếp nhận:</span>
                <span>{selectedTicket.receiver_name || 'Chưa tiếp nhận'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6 }}>
                <span style={{ color: '#666' }}>Trạng thái:</span>
                <strong style={{ color: selectedTicket.status_color || '#d97706' }}>
                  {selectedTicket.status || 'Chờ xác nhận'}
                </strong>
              </div>
            </div>
            <div className="pv2-modal-footer">
              <button className="pv2-btn-cancel" onClick={() => setSelectedTicket(null)}>Đóng</button>
              {(selectedTicket.status === 'pending' || selectedTicket.status === 'Chờ xác nhận' || selectedTicket.status === 'delivering') && (
                <button
                  className="pv2-btn-submit"
                  disabled={confirming}
                  onClick={() => handleConfirmReceived(selectedTicket)}
                >
                  {confirming ? 'Đang lưu...' : 'Xác nhận nhận hàng'}
                </button>
              )}
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
