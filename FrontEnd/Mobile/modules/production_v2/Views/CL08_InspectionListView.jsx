import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownAZ, Filter, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useInspectionController } from '../Controllers/useInspectionController'
import InspectionCard from './components/InspectionCard'
import { MONTH_OPTIONS, ROUTES } from '../constants'
import '../styles/production_v2.css'

const CL08_InspectionListView = () => {
  const navigate = useNavigate()
  const {
    tickets, total, loading, error, availableMonths,
    filters, setFilters, pendingCount
  } = useInspectionController()
  const [filterOpen, setFilterOpen] = useState(false)

  const monthOptions = availableMonths && availableMonths.length > 0
    ? availableMonths.map((m) => ({ value: String(m.month), label: `Tháng ${m.month}` }))
    : MONTH_OPTIONS

  const activeTab = filters.tab || 'pending'
  const page = filters.page || 1
  const pageSize = 10
  const totalPages = Math.ceil(total / pageSize) || 1

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
              <button type="button" className="pv2-btn-icon-square" title="Sắp xếp">
                <ArrowDownAZ size={18} />
              </button>
              <button type="button" className="pv2-btn-icon-square" onClick={() => setFilterOpen(true)} title="Bộ lọc">
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
            <p className="pv2-status-text">Không có phiếu nào</p>
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
      </div>
    </Layout>
  )
}

export default CL08_InspectionListView
