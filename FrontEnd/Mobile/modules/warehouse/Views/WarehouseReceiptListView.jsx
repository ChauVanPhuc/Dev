import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, PackagePlus, Inbox } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import useAuthStore from '@modules/auth/Models/authModel';
import mobileWarehouseService from '../services/mobileWarehouseService';
import WarehouseVoucherCard from './components/WarehouseVoucherCard';
import WarehouseFilterDrawer from './components/WarehouseFilterDrawer';
import WarehousePagination from './components/WarehousePagination';
import {
  RECEIPT_STATUSES,
  getStatusBadge,
  formatNumberVN,
  hasWarehouseAction,
} from '../constants/warehouseConstants';
import '../styles/mobileWarehouse.css';

const WarehouseReceiptListView = () => {
  const navigate = useNavigate();
  const { user, permissions } = useAuthStore();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, totalQuantity: 0 });
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState('ALL');
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
    ['/warehouse/goods-receipt', 'mobile_warehouse-receipt', 'mobile_warehouse', '/admin/warehouse/goods-receipt', 'goods-receipt', 'warehouse'],
    'create'
  );

  const activeFilterCount =
    (warehouse !== 'ALL' ? 1 : 0) +
    (status !== 'ALL' ? 1 : 0) +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0);

  const handleResetFilters = () => {
    setWarehouse('ALL');
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
        mobileWarehouseService.listReceipts({
          search,
          warehouse,
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
      setStats(res.stats || { total: 0, pending: 0, completed: 0, totalQuantity: 0 });
    } catch (err) {
      console.error('[WarehouseReceiptListView] Lỗi tải danh sách:', err);
      setMsgModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: err?.message || 'Không thể tải danh sách phiếu nhập kho.',
      });
    } finally {
      setLoading(false);
    }
  }, [search, warehouse, status, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <Layout>
      <div className="mwh-page">
        <PageHeader title="Phiếu nhập kho" subTitle="Kho Mobile" />

        {/* ── KHỐI ĐẦU TRANG CỐ ĐỊNH (Toolbar + Stats) ── */}
        <div className="mwh-sticky-top">
          <div className="mwh-toolbar">
            <div className="mwh-toolbar-row">
              <div className="mwh-search-box">
                <Search size={15} className="mwh-search-icon" />
                <input
                  className="mwh-search-input"
                  placeholder="Tìm mã PNK, người giao, CTGS..."
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
                  onClick={() => navigate('/warehouse/goods-receipt/new')}
                >
                  <Plus size={15} /> Nhập kho
                </button>
              )}
            </div>

            <WarehouseFilterDrawer
              isOpen={showFilter}
              warehouses={warehouses}
              warehouseValueKey="name"
              warehouse={warehouse}
              onWarehouseChange={(w) => {
                setWarehouse(w);
                setPage(1);
              }}
              statusOptions={[
                { key: 'ALL', label: 'Mọi trạng thái' },
                { key: 'PENDING', label: 'Chờ nhập kho' },
                { key: 'PROCESSING', label: 'Đang kiểm đếm' },
                { key: 'COMPLETED', label: 'Đã nhập kho' },
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
                <span className="mwh-stat-val">{formatNumberVN(stats.total || 0)}</span>
              </div>
              <div className="mwh-stat-box">
                <span className="mwh-stat-label">Chờ nhập</span>
                <span className="mwh-stat-val" style={{ color: '#d97706' }}>{formatNumberVN(stats.pending || 0)}</span>
              </div>
              <div className="mwh-stat-box">
                <span className="mwh-stat-label">Đã nhập</span>
                <span className="mwh-stat-val" style={{ color: '#059669' }}>{formatNumberVN(stats.completed || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC CUỘN DANH SÁCH THẺ PHIẾU ── */}
        <div className="mwh-scroll-area mwh-scroll-area--list">
          {loading ? (
            <div className="mwh-empty">Đang tải danh sách phiếu nhập kho...</div>
          ) : items.length === 0 ? (
            <div className="mwh-empty">
              <Inbox size={36} color="#b09b84" />
              <span>Chưa có phiếu nhập kho nào phù hợp.</span>
              {canCreate && (
                <button type="button" className="mwh-btn-primary" onClick={() => navigate('/warehouse/goods-receipt/new')}>
                  <PackagePlus size={15} /> Tạo phiếu nhập kho đầu tiên
                </button>
              )}
            </div>
          ) : (
            items.map((rcp) => (
              <WarehouseVoucherCard
                key={rcp.id}
                voucherNo={rcp.voucher_no}
                badge={getStatusBadge(RECEIPT_STATUSES, rcp.status)}
                createdChannel={rcp.created_channel}
                warehouseName={rcp.warehouse_name}
                dateValue={rcp.receipt_date}
                timeValue={rcp.confirmed_at}
                typeLabel={rcp.receipt_type}
                primaryPersonLabel="Giao → Nhận"
                primaryPerson={`${rcp.deliverer_name || rcp.customer_name || 'NCC'} → ${rcp.confirmed_by || rcp.created_by || 'Kho'}`}
                secondaryMetaLabel={rcp.customer_name ? 'Đối tác' : ''}
                secondaryMeta={rcp.customer_name || `${rcp.total_lines || 0} dòng hàng`}
                totalLabel={`${rcp.total_lines || 0} mặt hàng • Tổng SL`}
                totalValue={rcp.total_quantity}
                imageCount={(rcp.images || []).length}
                note={rcp.content}
                onClick={() => navigate(`/warehouse/goods-receipt/${rcp.id}`)}
              />
            ))
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

export default WarehouseReceiptListView;

