import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, FileUp, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { planService } from '@modules/Plan/Models/plan.service';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

/**
 * View: Quản lý Lệnh sản xuất - Danh sách (/admin/production-orders)
 * Mã màn hình: SX02
 */
const ProductionOrdersView = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, startGlobalUpload } = outletContext;
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [sortValue, setSortValue] = useState('time_desc');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const activeFiltersCount = [filterStatus, filterPriority, filterDateFrom, filterDateTo].filter(Boolean).length;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-orders');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Lệnh sản xuất');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'Danh sách lệnh sản xuất toàn hệ thống');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'SX02');
    if (setHeaderExtra) setHeaderExtra(null);

    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, title, subtitle, screenCode]);

  // State dữ liệu danh sách Lệnh sản xuất
  const [ordersList, setOrdersList] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterPriority, filterDateFrom, filterDateTo]);

  const toISODate = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) {
      return val.split('T')[0].trim();
    }
    if (val.includes('-') && val.length === 10) return val;
    const parts = (val || '').split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return val;
  };

  const toDisplayDate = (val) => {
    if (!val) return '';
    if (val.includes('/')) return val;
    const cleanVal = (typeof val === 'string' && val.includes('T') ? val.split('T')[0] : val) || '';
    const parts = cleanVal.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    return val;
  };

  // Gọi API lấy danh sách LỆNH SẢN XUẤT cho bảng chính
  const fetchProductionOrders = async () => {
    try {
      setLoading(true);
      
      const res = await planService.getPlans(1, 100, searchTerm, 'all', sortValue === 'time_asc' ? 'asc' : 'desc').catch(() => null);
      let allOrders = [];

      if (res && res.items && res.items.length > 0) {
        res.items.forEach((plan, pIdx) => {
          if (plan.orders && plan.orders.length > 0) {
            plan.orders.forEach((ord, oIdx) => {
              const totalQty = ord.products ? ord.products.reduce((acc, p) => acc + (p.quantity || 0), 0) : 50;
              const orderCode = ord.name || ord.order_code || `DH-2026-${100 + oIdx}`;
              const cleanCode = orderCode.replace(/^LSX-?/i, '');
              const priorityText = ord.is_priority === 1 || ord.priority === 'Cao' ? 'Cao' : (ord.priority || 'Bình thường');

              const rawStatus = ord.status ?? ord.order_status;
              let statusText;
              if (rawStatus == null) {
                statusText = 'Đang sản xuất';
              } else if (['Đang sản xuất', 'Hoàn thành', 'Chờ sản xuất'].includes(rawStatus)) {
                statusText = rawStatus;
              } else if (['0', '1', '3'].includes(String(rawStatus))) {
                statusText = { '0': 'Chờ sản xuất', '1': 'Đang sản xuất', '3': 'Hoàn thành' }[String(rawStatus)];
              } else {
                statusText = String(rawStatus);
              }
              const rawStart = ord.start_date || ord.order_date || plan.estimated_date || plan.start_date || '';
              const rawEnd = ord.end_date || ord.delivery_date || ord.estimated_date || plan.finished_date || plan.end_date || '';

              allOrders.push({
                id: ord.id || `${plan.id}-${oIdx}`,
                planId: plan.id,
                code: cleanCode,
                orderNo: orderCode,
                customer: ord.customer || plan.customer || 'Khách hàng hệ thống',
                totalProducts: ord.products ? ord.products.length : 1,
                planQty: totalQty,
                startDate: toISODate(rawStart) || '2026-08-01',
                endDate: toISODate(rawEnd) || '2026-08-15',
                priority: priorityText,
                status: statusText,
                note: ord.customer || '',
                products: ord.products || []
              });
            });
          }
        });
      }

      let filtered = allOrders;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(item =>
          item.code.toLowerCase().includes(term) ||
          item.orderNo.toLowerCase().includes(term) ||
          item.customer.toLowerCase().includes(term) ||
          item.status.toLowerCase().includes(term)
        );
      }

      setOrdersList(filtered);
      setTotal(filtered.length);
    } catch (err) {
      console.warn('Lỗi tải danh sách Lệnh sản xuất:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionOrders();
  }, [page, pageSize, searchTerm, sortValue]);

  const handleOpenOrderDetail = (item) => {
    navigate(`/admin/production-orders/edit/${item.id}`, { state: { item } });
  };

  const handleOpenCreateOrder = () => {
    navigate('/admin/production-orders/create');
  };

  const handleDeleteOrder = async (item, e) => {
    if (e) e.stopPropagation();

    const orderName = item.code || item.orderNo || 'này';
    const isConfirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa Lệnh sản xuất "${orderName}"?\n\nLưu ý: Thao tác này sẽ xóa toàn bộ danh sách sản phẩm và chi tiết BOM thuộc lệnh này khỏi hệ thống.`
    );
    if (!isConfirmed) return;

    try {
      setLoading(true);
      await planService.deleteOrder(item.id);
      if (toast) toast('success', `Đã xóa thành công Lệnh sản xuất "${orderName}"!`);
      await fetchProductionOrders();
    } catch (err) {
      console.error('Lỗi khi xóa lệnh sản xuất:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Xóa lệnh sản xuất thất bại!';
      if (toast) toast('error', `Lỗi: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let res = ordersList;
    if (filterStatus) res = res.filter(o => o.status === filterStatus);
    if (filterPriority) res = res.filter(o => o.priority === filterPriority);
    if (filterDateFrom) res = res.filter(o => o.startDate >= filterDateFrom);
    if (filterDateTo) res = res.filter(o => o.endDate <= filterDateTo);
    return res;
  }, [ordersList, filterStatus, filterPriority, filterDateFrom, filterDateTo]);

  const sortedOrders = useMemo(() => {
    const res = [...filteredOrders];
    if (sortValue === 'code_asc') res.sort((a, b) => a.code.localeCompare(b.code));
    if (sortValue === 'code_desc') res.sort((a, b) => b.code.localeCompare(a.code));
    return res;
  }, [filteredOrders, sortValue]);

  const totalCount = sortedOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(page * pageSize, totalCount);
  const currentItems = sortedOrders.slice((page - 1) * pageSize, page * pageSize);

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (startGlobalUpload) {
        await startGlobalUpload(
          file, 
          '/production-plans/import', 
          () => fetchProductionOrders()
        );
      } else {
        setLoading(true);
        await planService.importExcel(file);
        if (toast) toast('success', 'Nhập dữ liệu Lệnh sản xuất thành công!');
        fetchProductionOrders();
      }
    } catch (error) {
      console.error("Lỗi khi nhập dữ liệu Excel:", error);
      if (toast) toast('error', 'Lỗi khi nhập file Excel: ' + (error.response?.data?.detail || error.message));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (sortedOrders.length === 0) {
      if (toast) toast('warning', 'Không có dữ liệu Lệnh sản xuất để xuất Excel!');
      return;
    }
    try {
      const exportData = sortedOrders.map((item, idx) => ({
        'STT': idx + 1,
        'Mã lệnh': item.code,
        'Đơn hàng': item.orderNo,
        'Khách hàng': item.customer,
        'Tổng số sản phẩm': item.totalProducts,
        'Số lượng kế hoạch': item.planQty,
        'Thời gian bắt đầu': toDisplayDate(item.startDate),
        'Thời gian kết thúc': toDisplayDate(item.endDate),
        'Mức độ ưu tiên': item.priority,
        'Trạng thái': item.status
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'LenhSanXuat');
      XLSX.writeFile(wb, `Danh_sach_Lenh_San_Xuat_${new Date().toISOString().slice(0, 10)}.xlsx`);
      if (toast) toast('success', 'Đã xuất file Excel danh sách Lệnh sản xuất thành công!');
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      if (toast) toast('error', 'Xuất file Excel thất bại: ' + err.message);
    }
  };

  const [isSyncingBOM, setIsSyncingBOM] = useState(false);

  const handleSyncAllOrdersBOM = async () => {
    if (isSyncingBOM) return;
    const confirmed = window.confirm(
      "Bạn có chắc muốn đồng bộ lại Quy cách & Cây BOM từ Sản phẩm mẫu (Master Products) sang toàn bộ các Lệnh sản xuất (POs)?\n\nThao tác này sẽ cập nhật quy cách và tái lập cây linh kiện đa tầng cho tất cả đơn hàng."
    );
    if (!confirmed) return;

    try {
      setIsSyncingBOM(true);
      if (toast) toast('info', 'Đang đồng bộ BOM từ Sản phẩm mẫu sang các đơn hàng...');
      const res = await api.post('/orders/sync-all-from-master-bom');
      if (toast) {
        toast('success', `Đồng bộ thành công ${res?.updated_orders || 0} lệnh SX, tạo mới ${res?.created_boms || 0} chi tiết BOM!`);
      }
      fetchProductionOrders();
    } catch (error) {
      console.error("Lỗi đồng bộ BOM:", error);
      if (toast) toast('error', 'Lỗi đồng bộ: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSyncingBOM(false);
    }
  };

  return (
    <div className="gold-layout">

      {/* ── STICKY TOP ZONE ── */}
      <div className="sticky-top-zone">
        <PageToolbar
          searchValue={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val); setPage(1); }}
          searchPlaceholder="Tìm mã lệnh, đơn hàng, khách hàng..."
          showSort={true}
          sortOptions={[
            { value: 'time_desc', label: 'Mới nhất' },
            { value: 'time_asc', label: 'Cũ nhất' },
            { value: 'code_asc', label: 'Mã lệnh (A → Z)' },
            { value: 'code_desc', label: 'Mã lệnh (Z → A)' }
          ]}
          sortValue={sortValue}
          onSortChange={(val) => { setSortValue(val); setPage(1); }}
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={activeFiltersCount}
          importActions={[
            {
              label: 'Nhập Excel',
              icon: <FileUp size={14} />,
              onClick: () => fileInputRef.current?.click()
            }
          ]}
          onExport={handleExport}
          onCreate={handleOpenCreateOrder}
          createLabel="Thêm mới"
          hasWritePermission={true}
          extraActions={[
            {
              label: isSyncingBOM ? 'Đang đồng bộ...' : 'Đồng bộ BOM từ SP mẫu',
              icon: <RefreshCw size={14} className={isSyncingBOM ? 'animate-spin' : ''} />,
              onClick: handleSyncAllOrdersBOM,
              disabled: isSyncingBOM
            }
          ]}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".xlsx, .xls"
            onChange={handleImportExcel}
          />
        </PageToolbar>

        {isFilterBarOpen && (
          <div className="filter-bar" style={{ margin: '0 0 20px 0', padding: '16px 20px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #EADCC9', boxShadow: '0 2px 8px rgba(45,26,18,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'nowrap' }}>
              <div style={{ flex: '1 1 0', minWidth: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Trạng thái</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">Tất cả</option>
                  <option value="Đang sản xuất">Đang sản xuất</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Chờ sản xuất">Chờ sản xuất</option>
                </select>
              </div>
              <div style={{ flex: '1 1 0', minWidth: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Mức độ ưu tiên</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">Tất cả</option>
                  <option value="Cao">Cao</option>
                  <option value="Bình thường">Bình thường</option>
                </select>
              </div>
              <div style={{ flex: '1 1 0', minWidth: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Từ ngày</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                />
              </div>
              <div style={{ flex: '1 1 0', minWidth: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Đến ngày</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                />
              </div>
              <div style={{ flex: '1 1 0', minWidth: '100px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Số lượng dòng</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                  style={{ padding: '8px 16px', border: '1.5px solid #D1D5DB', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#5D3B32', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Đặt lại
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                    <th style={{ textAlign: 'center', width: '50px', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>STT</th>
                    <th style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Mã lệnh</th>
                    <th style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Đơn hàng</th>
                    <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Tổng số sản phẩm</th>
                    <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Số lượng kế hoạch</th>
                    <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Thời gian bắt đầu</th>
                    <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Thời gian kết thúc</th>
                    <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Mức độ ưu tiên</th>
                    <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center', width: '100px', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        Đang tải dữ liệu lệnh sản xuất...
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        Chưa có dữ liệu lệnh sản xuất phù hợp
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, index) => {
                      const sttVal = (page - 1) * pageSize + index + 1;
                      return (
                        <tr key={item.id || index}>
                          <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>{sttVal}</td>
                          <td
                            onClick={() => handleOpenOrderDetail(item)}
                            style={{ fontWeight: '800', color: '#2D1A12', cursor: 'pointer' }}
                            title="Nhấp để xem chi tiết Lệnh SX"
                          >
                            {item.code}
                          </td>
                          <td style={{ color: '#475569', fontWeight: '600' }}>{item.orderNo}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: '#334155' }}>{item.totalProducts}</td>
                          <td style={{ textAlign: 'center', fontWeight: '800', color: '#2D1A12' }}>{item.planQty}</td>
                          <td style={{ textAlign: 'center', color: '#64748B' }}>{toDisplayDate(item.startDate)}</td>
                          <td style={{ textAlign: 'center', color: '#64748B' }}>{toDisplayDate(item.endDate)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              backgroundColor: item.priority === 'Cao' ? '#FEF2F2' : item.priority === 'Bình thường' ? '#FFFBEB' : '#F1F5F9',
                              color: item.priority === 'Cao' ? '#EF4444' : item.priority === 'Bình thường' ? '#D97706' : '#64748B',
                              border: `1px solid ${item.priority === 'Cao' ? '#FCA5A5' : item.priority === 'Bình thường' ? '#FDE68A' : '#CBD5E1'}`
                            }}>
                              {item.priority}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              backgroundColor: item.status === 'Hoàn thành' ? '#ECFDF5' : item.status === 'Đang sản xuất' ? '#EFF6FF' : '#FFFBEB',
                              color: item.status === 'Hoàn thành' ? '#10B981' : item.status === 'Đang sản xuất' ? '#3B82F6' : '#D97706',
                              border: `1px solid ${item.status === 'Hoàn thành' ? '#A7F3D0' : item.status === 'Đang sản xuất' ? '#BFDBFE' : '#FDE68A'}`
                            }}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenOrderDetail(item)}
                                style={{
                                  border: 'none',
                                  background: '#FAF6F0',
                                  color: '#7B5233',
                                  cursor: 'pointer',
                                  padding: '5px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                                title="Chỉnh sửa lệnh sản xuất"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteOrder(item, e)}
                                style={{
                                  border: 'none',
                                  background: '#FEF2F2',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: '5px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                                title="Xóa lệnh sản xuất"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Show <b>{startIndex}</b> to <b>{endIndex}</b> of <b>{totalCount}</b> results
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="page-btn"
                  >
                    Previous
                  </button>
                  {(() => {
                    const pages = [];
                    const delta = 2;
                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                        pages.push(i);
                      } else if (pages[pages.length - 1] !== '...') {
                        pages.push('...');
                      }
                    }
                    return pages.map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`ell-${idx}`} style={{ padding: '0 8px', color: '#7B5233', fontWeight: '700' }}>
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={p}
                          className={`page-btn ${page === p ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="page-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Cards View - Scrollable */}
            <div className="mobile-only manufacture-cards-scroll" style={{ padding: '12px' }}>
              <div className="manufacture-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loading && currentItems.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                    Đang tải dữ liệu lệnh sản xuất...
                  </div>
                ) : currentItems.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                    Chưa có dữ liệu lệnh sản xuất phù hợp
                  </div>
                ) : (
                  currentItems.map((item, index) => {
                    const priorityColor = item.priority === 'Cao' ? '#EF4444' : item.priority === 'Bình thường' ? '#D97706' : '#64748B';
                    const priorityBg = item.priority === 'Cao' ? '#FEF2F2' : item.priority === 'Bình thường' ? '#FFFBEB' : '#F1F5F9';
                    const statusColor = item.status === 'Hoàn thành' ? '#10B981' : item.status === 'Đang sản xuất' ? '#3B82F6' : '#D97706';
                    const statusBg = item.status === 'Hoàn thành' ? '#ECFDF5' : item.status === 'Đang sản xuất' ? '#EFF6FF' : '#FFFBEB';

                    return (
                      <div
                        key={item.id || index}
                        onClick={() => handleOpenOrderDetail(item)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1.5px solid #EADCC9',
                          padding: '14px 16px',
                          boxShadow: '0 2px 8px rgba(45,26,18,0.06)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#2D1A12' }}>{item.code}</span>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusColor}40`
                          }}>
                            {item.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                          <span>Đơn hàng: <strong style={{ color: '#1E293B' }}>{item.orderNo}</strong></span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            backgroundColor: priorityBg,
                            color: priorityColor
                          }}>
                            {item.priority}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.82rem', color: '#64748B', paddingTop: '6px', borderTop: '1px dashed #E2E8F0' }}>
                          <div>Số SP: <strong style={{ color: '#1E293B' }}>{item.totalProducts}</strong></div>
                          <div>SL KH: <strong style={{ color: '#2D1A12', fontSize: '0.9rem' }}>{item.planQty}</strong></div>
                          <div>Bắt đầu: <span>{toDisplayDate(item.startDate) || '---'}</span></div>
                          <div>Kết thúc: <span>{toDisplayDate(item.endDate) || '---'}</span></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenOrderDetail(item); }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid #EADCC9',
                              backgroundColor: '#FAF6F0',
                              color: '#7B5233',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Pencil size={13} /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteOrder(item, e)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#EF4444',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} /> Xóa
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pagination Mobile - Sticky */}
            <div className="pagination-mobile-sticky mobile-only" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#FFFFFF', borderTop: '1px solid #EADCC9' }}>
              <button
                type="button"
                className="page-btn"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#F8FAFC', fontWeight: '700', color: '#5D3B32', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Trước
              </button>
              <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#7B5233' }}>
                Trang {page} / {totalPages || 1}
              </span>
              <button
                type="button"
                className="page-btn"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages || totalPages <= 1}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#F8FAFC', fontWeight: '700', color: '#5D3B32', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                Sau
              </button>
            </div>

          </div>
        </div>
    </div>
  );
};

export default ProductionOrdersView;
