import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, ClipboardCheck, Inbox } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import useAuthStore from '@modules/auth/Models/authModel';
import mobileWarehouseService from '../services/mobileWarehouseService';
import WarehouseVoucherCard from './components/WarehouseVoucherCard';
import WarehouseFilterDrawer from './components/WarehouseFilterDrawer';
import {
  HANDOVER_STATUSES,
  getStatusBadge,
  formatNumberVN,
  hasWarehouseAction,
} from '../constants/warehouseConstants';
import '../styles/mobileWarehouse.css';

const WarehouseHandoverListView = () => {
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

  const [msgModal, setMsgModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const canCreate = hasWarehouseAction(
    permissions,
    user,
    ['/warehouse/handover', 'mobile_warehouse-handover', 'mobile_warehouse', '/admin/warehouse/goods-issue', 'goods-issue', 'warehouse'],
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
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, res] = await Promise.all([
        mobileWarehouseService.getMobileMeta(),
        mobileWarehouseService.listHandovers({
          search,
          warehouse,
          status,
          createdChannel: 'ALL',
          fromDate,
          toDate,
          page: 1,
          pageSize: 60,
        }),
      ]);
      setWarehouses(meta.warehouses || []);
      setItems(res.data || []);
      setStats(res.stats || { total: 0, pending: 0, completed: 0, totalQuantity: 0 });
    } catch (err) {
      console.error('[WarehouseHandoverListView] Lỗi tải danh sách:', err);
      setMsgModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: err?.message || 'Không thể tải danh sách phiếu bàn giao kho.',
      });
    } finally {
      setLoading(false);
    }
  }, [search, warehouse, status, fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <Layout>
      <div className="mwh-page">
        <PageHeader title="Phiếu bàn giao" subTitle="Xuất kho / Giao xưởng" />

        <div className="mwh-toolbar">
          <div className="mwh-toolbar-row">
            <div className="mwh-search-box">
              <Search size={15} className="mwh-search-icon" />
              <input
                className="mwh-search-input"
                placeholder="Tìm mã PXK, người giao, người nhận..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                onClick={() => navigate('/warehouse/handover/new')}
              >
                <Plus size={15} /> Bàn giao
              </button>
            )}
          </div>

          <WarehouseFilterDrawer
            isOpen={showFilter}
            warehouses={warehouses}
            warehouseValueKey="name"
            warehouse={warehouse}
            onWarehouseChange={setWarehouse}
            statusOptions={[
              { key: 'ALL', label: 'Mọi trạng thái' },
              { key: 'PENDING', label: 'Chờ nhận bàn giao' },
              { key: 'PROCESSING', label: 'Đang chuẩn bị' },
              { key: 'COMPLETED', label: 'Đã bàn giao' },
            ]}
            status={status}
            onStatusChange={setStatus}
            fromDate={fromDate}
            onFromDateChange={setFromDate}
            toDate={toDate}
            onToDateChange={setToDate}
            activeCount={activeFilterCount}
            onReset={handleResetFilters}
            onClose={() => setShowFilter(false)}
          />
        </div>

        <div className="mwh-scroll-area mwh-scroll-area--list">
          <div className="mwh-stats-row">
            <div className="mwh-stat-box">
              <span className="mwh-stat-label">Tổng phiếu</span>
              <span className="mwh-stat-val">{formatNumberVN(stats.total || 0)}</span>
            </div>
            <div className="mwh-stat-box">
              <span className="mwh-stat-label">Chờ nhận</span>
              <span className="mwh-stat-val" style={{ color: '#d97706' }}>{formatNumberVN(stats.pending || 0)}</span>
            </div>
            <div className="mwh-stat-box">
              <span className="mwh-stat-label">Đã bàn giao</span>
              <span className="mwh-stat-val" style={{ color: '#059669' }}>{formatNumberVN(stats.completed || 0)}</span>
            </div>
          </div>

          {loading ? (
            <div className="mwh-empty">Đang tải danh sách phiếu bàn giao...</div>
          ) : items.length === 0 ? (
            <div className="mwh-empty">
              <Inbox size={36} color="#b09b84" />
              <span>Chưa có phiếu bàn giao nào phù hợp.</span>
              {canCreate && (
                <button type="button" className="mwh-btn-primary" onClick={() => navigate('/warehouse/handover/new')}>
                  <ClipboardCheck size={15} /> Tạo phiếu bàn giao mới
                </button>
              )}
            </div>
          ) : (
            items.map((iss) => (
              <WarehouseVoucherCard
                key={iss.id}
                voucherNo={iss.voucher_no}
                badge={getStatusBadge(HANDOVER_STATUSES, iss.status)}
                createdChannel={iss.created_channel}
                warehouseName={iss.warehouse_name}
                dateValue={iss.issue_date}
                typeLabel={iss.issue_type}
                primaryPersonLabel="Giao → Nhận"
                primaryPerson={`${iss.deliverer_name || iss.created_by || 'Kho'} → ${iss.receiver_name || iss.department_name || 'Chờ nhận'}`}
                secondaryMetaLabel="Nhà máy / BP"
                secondaryMeta={[iss.factory_name, iss.department_name].filter(Boolean).join(' • ') || iss.customer_name || `${iss.total_lines || 0} dòng hàng`}
                totalLabel={`${iss.total_lines || 0} mặt hàng • Tổng SL xuất`}
                totalValue={iss.total_quantity}
                imageCount={(iss.images || []).length}
                note={iss.content}
                onClick={() => navigate(`/warehouse/handover/${iss.id}`)}
              />
            ))
          )}
        </div>

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

export default WarehouseHandoverListView;

