import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, RotateCcw, Inbox } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import useAuthStore from '@modules/auth/Models/authModel';
import mobileWarehouseService from '../services/mobileWarehouseService';
import WarehouseVoucherCard from './components/WarehouseVoucherCard';
import WarehouseFilterDrawer from './components/WarehouseFilterDrawer';
import WarehousePagination from './components/WarehousePagination';
import {
  RETURN_STATUSES,
  RETURN_RESOLUTIONS,
  getStatusBadge,
  formatNumberVN,
  hasWarehouseAction,
} from '../constants/warehouseConstants';
import '../styles/mobileWarehouse.css';

const WarehouseReturnListView = () => {
  const navigate = useNavigate();
  const { user, permissions } = useAuthStore();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ totalVouchers: 0, pendingCount: 0, resolvedCount: 0 });
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('ALL');
  const [sourceType, setSourceType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Phân trang Mobile (mặc định 15 dòng)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [msgModal, setMsgModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const canCreate = hasWarehouseAction(
    permissions,
    user,
    ['/warehouse/returns', 'mobile_warehouse-return', 'mobile_warehouse', '/admin/warehouse/rejected-goods', 'warehouse-rejected', 'warehouse-management', 'warehouse'],
    'create'
  );

  const activeFilterCount =
    (warehouseCode !== 'ALL' ? 1 : 0) +
    (sourceType !== 'ALL' ? 1 : 0) +
    (status !== 'ALL' ? 1 : 0) +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0);

  const handleResetFilters = () => {
    setWarehouseCode('ALL');
    setSourceType('ALL');
    setStatus('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, res] = await Promise.all([
        mobileWarehouseService.getMobileMeta(),
        mobileWarehouseService.listReturns({
          search,
          warehouseCode,
          sourceType,
          status,
          createdChannel: 'ALL',
          fromDate,
          toDate,
          page,
          pageSize,
        }),
      ]);
      setWarehouses(meta.warehouses || []);
      setItems(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
      setStats(res.stats || { totalVouchers: 0, pendingCount: 0, resolvedCount: 0 });
    } catch (err) {
      console.error('[WarehouseReturnListView] Lỗi tải danh sách:', err);
      setMsgModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: err?.message || 'Không thể tải danh sách phiếu trả về.',
      });
    } finally {
      setLoading(false);
    }
  }, [search, warehouseCode, sourceType, status, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <Layout>
      <div className="mwh-page">
        <PageHeader title="Phiếu trả về" subTitle="Trả hàng về kho / Hàng loại" />

        {/* ── KHỐI ĐẦU TRANG CỐ ĐỊNH (Toolbar + Stats) ── */}
        <div className="mwh-sticky-top">
          <div className="mwh-toolbar">
            <div className="mwh-toolbar-row">
              <div className="mwh-search-box">
                <Search size={15} className="mwh-search-icon" />
                <input
                  className="mwh-search-input"
                  placeholder="Tìm mã phiếu, vật tư, chứng từ gốc..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <button
                type="button"
                className="mwh-icon-btn"
                onClick={() => setShowFilter((v) => !v)}
                title="Bộ lọc"
                style={{
                  position: 'relative',
                  ...(showFilter || activeFilterCount > 0 ? { background: '#faf4ee', borderColor: '#5c2d0e' } : {}),
                }}
              >
                <Filter size={16} />
                {activeFilterCount > 0 && <span className="mwh-filter-btn-badge">{activeFilterCount}</span>}
              </button>
              <button type="button" className="mwh-icon-btn" onClick={loadData} title="Làm mới">
                <RefreshCw size={16} />
              </button>
              {canCreate && (
                <button
                  type="button"
                  className="mwh-btn-primary"
                  onClick={() => navigate('/warehouse/returns/new')}
                >
                  <Plus size={15} /> Trả về
                </button>
              )}
            </div>

            <WarehouseFilterDrawer
              isOpen={showFilter}
              warehouses={warehouses}
              warehouseValueKey="code"
              warehouse={warehouseCode}
              onWarehouseChange={(w) => {
                setWarehouseCode(w);
                setPage(1);
              }}
              sourceOptions={[
                { key: 'ALL', label: 'Mọi nguồn' },
                { key: 'PROD_RETURN', label: 'Sản xuất trả về' },
                { key: 'QC_INCOMING', label: 'QC đầu vào' },
              ]}
              sourceType={sourceType}
              onSourceChange={(s) => {
                setSourceType(s);
                setPage(1);
              }}
              statusOptions={[
                { key: 'ALL', label: 'Mọi trạng thái' },
                { key: 'PENDING', label: 'Chờ xử lý' },
                { key: 'RESOLVED', label: 'Đã xử lý' },
              ]}
              status={status}
              onStatusChange={(s) => {
                setStatus(s);
                setPage(1);
              }}
              fromDate={fromDate}
              onFromDateChange={(d) => {
                setFromDate(d);
                setPage(1);
              }}
              toDate={toDate}
              onToDateChange={(d) => {
                setToDate(d);
                setPage(1);
              }}
              activeCount={activeFilterCount}
              onReset={handleResetFilters}
              onClose={() => setShowFilter(false)}
            />
          </div>

          <div className="mwh-stats-wrapper">
            <div className="mwh-stats-row">
              <div className="mwh-stat-box">
                <span className="mwh-stat-label">Tổng phiếu</span>
                <span className="mwh-stat-val">{formatNumberVN(stats.totalVouchers || 0)}</span>
              </div>
              <div className="mwh-stat-box">
                <span className="mwh-stat-label">Chờ kho xử lý</span>
                <span className="mwh-stat-val" style={{ color: '#d97706' }}>{formatNumberVN(stats.pendingCount || 0)}</span>
              </div>
              <div className="mwh-stat-box">
                <span className="mwh-stat-label">Đã xử lý</span>
                <span className="mwh-stat-val" style={{ color: '#059669' }}>{formatNumberVN(stats.resolvedCount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC CUỘN DANH SÁCH THẺ PHIẾU ── */}
        <div className="mwh-scroll-area mwh-scroll-area--list">
          {loading ? (
            <div className="mwh-empty">Đang tải danh sách phiếu trả về...</div>
          ) : items.length === 0 ? (
            <div className="mwh-empty">
              <Inbox size={36} color="#b09b84" />
              <span>Chưa có phiếu trả về nào phù hợp.</span>
              {canCreate && (
                <button type="button" className="mwh-btn-primary" onClick={() => navigate('/warehouse/returns/new')}>
                  <RotateCcw size={15} /> Lập phiếu trả về
                </button>
              )}
            </div>
          ) : (
            items.map((rg) => {
              const resInfo = RETURN_RESOLUTIONS[rg.resolution] || RETURN_RESOLUTIONS.PENDING;
              const typeTitle =
                rg.return_mode === 'GOOD_EXCESS'
                  ? 'Hoàn trả hàng tốt thừa'
                  : rg.source_type === 'QC_INCOMING'
                    ? 'QC đầu vào không đạt'
                    : 'Sản xuất trả về lỗi';

              return (
                <WarehouseVoucherCard
                  key={rg.id}
                  voucherNo={rg.voucher_no}
                  badge={getStatusBadge(RETURN_STATUSES, rg.status)}
                  createdChannel={rg.created_channel}
                  warehouseName={rg.warehouse_name}
                  dateValue={rg.created_date}
                  timeValue={rg.received_at}
                  typeLabel={`${typeTitle} • ${rg.item_code} - ${rg.item_name}`}
                  primaryPersonLabel="Trả → Nhận"
                  primaryPerson={`${rg.returned_by || rg.created_by || 'Người trả'} → ${rg.received_by || 'Kho nhận'}`}
                  secondaryMetaLabel="Hướng XL"
                  secondaryMeta={resInfo.label}
                  totalLabel={`Gốc: ${rg.origin_voucher_no || 'Trả trực tiếp'}${rg.factory_name ? ` • ${rg.factory_name}` : ''}`}
                  totalValue={rg.quantity_main}
                  unitLabel={rg.unit_main}
                  imageCount={(rg.images || []).length}
                  note={rg.defect_reason || rg.defect_category}
                  onClick={() => navigate(`/warehouse/returns/${rg.id}`)}
                />
              );
            })
          )}
        </div>

        {/* ── PHÂN TRANG GHIM CỐ ĐỊNH Ở ĐÁY MÀN HÌNH ── */}
        {!loading && items.length > 0 && (
          <div className="mwh-sticky-bottom">
            <WarehousePagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </div>
        )}

        <MessageModal
          isOpen={msgModal.isOpen}
          type={msgModal.type}
          title={msgModal.title}
          message={msgModal.message}
          onConfirm={() => setMsgModal((p) => ({ ...p, isOpen: false }))}
        />
      </div>
    </Layout>
  );
};

export default WarehouseReturnListView;

