import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, ArrowUpDown, Plus } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import Tabs from '@mobile/Shared/Views/components/ui/Tabs'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useTransferController } from '../Controllers/useTransferController'
import TransferCard from './components/TransferCard'
import FilterPanel from './components/FilterPanel'
import { MONTH_OPTIONS, ROUTES } from '../constants'
import '../styles/production_v2.css'

const monthOpts = [{ value: '', label: 'Kế hoạch' }, ...MONTH_OPTIONS]

const CL06_TransferListView = () => {
  const navigate = useNavigate()
  const { tickets, total, loading, error, filters, setFilters, pendingCount } = useTransferController()
  const [filterOpen, setFilterOpen] = useState(false)

  const tabs = [
    { id: 'pending', label: `Phiếu cần xác nhận`, badge: pendingCount },
    { id: 'history', label: 'Lịch sử luân chuyển' },
  ]

  const page = filters.page || 1
  const totalPages = Math.ceil(total / 10)

  return (
    <Layout>
      <PageHeader title="CL06: Danh sách luân chuyển" subTitle="Khởi tạo phiếu" showBack={false} />

      <div className="pv2-page">
        <div className="pv2-toolbar">
          <div className="pv2-toolbar-left">
            <CustomSelect
              value={filters.month}
              options={monthOpts}
              onChange={(v) => setFilters({ month: v, page: 1 })}
            />
          </div>
          <div className="pv2-toolbar-right">
            <button className="pv2-icon-btn" onClick={() => setFilters({ page: 1 })} title="Sắp xếp">
              <ArrowUpDown size={18} />
            </button>
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
          activeTab={filters.tab}
          onTabChange={(tab) => setFilters({ tab, page: 1 })}
        />

        <div className="pv2-list">
          {loading && <p className="pv2-status-text">Đang tải...</p>}
          {error && <p className="pv2-status-text pv2-status-text--error">{error}</p>}
          {!loading && !error && tickets.length === 0 && (
            <p className="pv2-status-text">Không có phiếu nào</p>
          )}
          {!loading && tickets.map((t) => (
            <TransferCard
              key={t.id}
              ticket={t}
              onClick={() => navigate(`${ROUTES.TRANSFER_CREATE}/${t.code}`)}
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
