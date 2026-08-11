import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownAZ, ArrowUpAZ, Filter, Plus, ChevronLeft, ChevronRight, ClipboardX } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useInspectionController } from '../Controllers/useInspectionController'
import InspectionCard from './components/InspectionCard'
import FilterPanel from './components/FilterPanel'
import { MONTH_OPTIONS, ROUTES } from '../constants'
import '../styles/production_v2.css'

const CL08_InspectionListView = () => {
  const navigate = useNavigate()
  const {
    tickets, total, loading, error, availableMonths,
    filters, setFilters, pendingCount
  } = useInspectionController()
  const [filterOpen, setFilterOpen] = useState(false)

  // Khử trùng lặp danh sách tháng để tránh trùng key trong CustomSelect
  const monthOptions = useMemo(() => {
    if (availableMonths && availableMonths.length > 0) {
      const monthNums = availableMonths.map((m) => Number(m.month || m)).filter(Boolean)
      const uniqueMonths = Array.from(new Set(monthNums)).sort((a, b) => b - a)
      if (uniqueMonths.length > 0) {
        return uniqueMonths.map((m) => ({ value: String(m), label: `Tháng ${m}` }))
      }
    }
    return MONTH_OPTIONS
  }, [availableMonths])

  const activeTab = filters.tab || 'pending'
  const page = filters.page || 1
  const pageSize = 10
  const totalPages = Math.ceil(total / pageSize) || 1
  const isAscending = filters.sort === 'asc'

  const toggleSort = () => {
    setFilters({ sort: isAscending ? 'desc' : 'asc', page: 1 })
  }

  return (
    <Layout>
      <PageHeader title="CL08: Danh sách phiếu kiểm tra" subTitle="Khởi tạo phiếu" showBack={false} />

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
                onClick={() => navigate(`${ROUTES.INSPECTION_CREATE}/NEW`)}
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
            <span>Chờ kiểm tra</span>
            {pendingCount > 0 && <span className="pv2-badge-red">{pendingCount}</span>}
          </button>
          <button
            type="button"
            className={`pv2-custom-tab ${activeTab === 'history' ? 'pv2-custom-tab--active' : ''}`}
            onClick={() => setFilters({ tab: 'history', page: 1 })}
          >
            <span>Lịch sử lập phiếu</span>
          </button>
        </div>

        {/* Cards List */}
        <div className="pv2-list">
          {loading && <p className="pv2-status-text">Đang tải...</p>}
          {error && <p className="pv2-status-text pv2-status-text--error">{error}</p>}
          {!loading && !error && tickets.length === 0 && (
            <div className="pv2-empty-state">
              <div className="pv2-empty-icon-wrap">
                <ClipboardX size={32} />
              </div>
              <div className="pv2-empty-title">Không có phiếu kiểm tra nào</div>
              <div className="pv2-empty-desc">
                Chưa có dữ liệu phiếu nào phù hợp với bộ lọc {filters.month ? `Tháng ${filters.month}` : 'kỳ kế hoạch'}.
              </div>
            </div>
          )}
          {!loading && tickets.map((t) => (
            <InspectionCard
              key={t.id}
              ticket={t}
              onClick={() => navigate(`${ROUTES.INSPECTION_CREATE}/${t.code || t.id}`)}
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

        {/* Drawer / Popup Bộ Lọc Chi Tiết */}
        <FilterPanel
          open={filterOpen}
          filters={filters}
          onApply={(newFilters) => setFilters({ ...newFilters, page: 1 })}
          onClose={() => setFilterOpen(false)}
        />
      </div>
    </Layout>
  )
}

export default CL08_InspectionListView
