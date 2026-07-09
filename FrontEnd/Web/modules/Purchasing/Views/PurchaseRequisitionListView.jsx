import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search, FileDown, FileUp, Eye, Trash2,
  ChevronRight, ChevronLeft, CheckCircle, Clock, AlertCircle,
  Package, Layers, X, Warehouse
} from 'lucide-react';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import '@styles/components.css';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '---';
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '---'; }
};

const getStatusDisplay = (status) => {
  switch (status) {
    case 'Duyệt thành công': return { text: 'Đã duyệt', bg: '#ecfdf5', color: '#10b981', icon: CheckCircle };
    case 'K.tra thành công': return { text: 'Đã kiểm tra', bg: '#eff6ff', color: '#3b82f6', icon: Eye };
    case 'Nháp': return { text: 'Nháp', bg: '#fffbeb', color: '#f59e0b', icon: Clock };
    default: return { text: status || '---', bg: '#f1f5f9', color: '#64748b', icon: AlertCircle };
  }
};

const getWarehouseDisplay = (status) => {
  switch (status) {
    case 'Đã nhập kho': return { text: 'Đã nhập kho', bg: '#ecfdf5', color: '#10b981' };
    case 'Nhập chưa hết': return { text: 'Nhập chưa hết', bg: '#fff7ed', color: '#f97316' };
    case 'Chưa nhập kho': return { text: 'Chưa nhập kho', bg: '#f1f5f9', color: '#94a3b8' };
    default: return { text: status || '---', bg: '#f1f5f9', color: '#94a3b8' };
  }
};

const PurchaseRequisitionList = () => {
  const navigate = useNavigate();
  const { startGlobalUpload } = useOutletContext() || {};
  const fileInputRef = useRef(null);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [stats, setStats] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        warehouse_status: filterWarehouse || undefined,
      };
      const result = await purchasingService.getRequisitions(params);
      setData(result.items || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Lỗi tải đơn đặt mua:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await purchasingService.getRequisitionStats();
      setStats(result);
    } catch (error) {
      console.error('Lỗi tải thống kê:', error);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchData(); }, [currentPage, itemsPerPage, searchTerm, filterStatus, filterWarehouse]);

  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  const getPaginationRange = () => {
    const range = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (currentPage > 3) range.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) range.push(i);
      if (currentPage < totalPages - 2) range.push('...');
      range.push(totalPages);
    }
    return range;
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    const byStatus = stats.by_status || {};
    return [
      { label: 'TỔNG ĐƠN', value: stats.total || 0, iconBg: '#EEF2FF', iconColor: '#4F46E5', Icon: Layers },
      { label: 'ĐÃ DUYỆT', value: byStatus['Duyệt thành công'] || 0, iconBg: '#ECFDF4', iconColor: '#10B981', Icon: CheckCircle },
      { label: 'ĐÃ KIỂM TRA', value: byStatus['K.tra thành công'] || 0, iconBg: '#EFF6FF', iconColor: '#3B82F6', Icon: Eye },
      { label: 'NHÁP', value: byStatus['Nháp'] || 0, iconBg: '#FFFBEB', iconColor: '#F59E0B', Icon: Clock },
    ];
  }, [stats]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (startGlobalUpload) {
        await startGlobalUpload(
          file,
          '/purchase-requisitions/import-excel',
          () => {
            fetchData();
            fetchStats();
          }
        );
      } else {
        setImportLoading(true);
        const result = await purchasingService.importRequisitionsExcel(file);
        showNotification(result.message || 'Import thành công!');
        fetchData();
        fetchStats();
      }
    } catch (error) {
      showNotification(error?.response?.data?.detail || 'Lỗi import Excel!', 'error');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    purchasingService.exportRequisitionsExcel({
      status: filterStatus !== 'all' ? filterStatus : undefined,
      warehouse_status: filterWarehouse || undefined,
      search: searchTerm || undefined,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn đặt mua này?')) return;
    try {
      await purchasingService.deleteRequisition(id);
      showNotification('Xóa đơn đặt mua thành công!');
      fetchData();
      fetchStats();
    } catch (error) {
      showNotification('Lỗi xóa đơn đặt mua!', 'error');
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-layout:has(.pr-compact-container) {
          height: 100vh !important;
          overflow: hidden !important;
        }
        .admin-main:has(.pr-compact-container) {
          height: 100vh !important;
          overflow: hidden !important;
          max-width: none !important;
        }
        .dashboard-content:has(.pr-compact-container) {
          height: calc(100vh - 60px) !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          padding: 8px 12px !important;
          box-sizing: border-box !important;
        }
        .admin-main:has(.pr-compact-container) .admin-header {
          padding: 6px 12px !important;
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
      `}} />
      <div className="mgmt-container pr-compact-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', maxWidth: '100%', margin: '0', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {/* Toast */}
        {notification && (
          <div className={`toast-notification ${notification.type}`}>
            <div className="toast-content">
              <span className="toast-icon">{notification.type === 'error' ? '❌' : '✅'}</span>
              <span className="toast-text">{notification.msg}</span>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />

        {/* Compact KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          marginBottom: '4px',
          width: '100%'
        }}>
          {statCards.map((stat, idx) => (
            <div key={idx} className="kpi-card" style={{
              background: '#fff', border: '1px solid #E2E8F0',
              padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                backgroundColor: stat.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stat.iconColor, flexShrink: 0
              }}>
                <stat.Icon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700', letterSpacing: '0.05em' }}>{stat.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Compact Toolbar */}
        {isMobile ? (
          <div className="qr-toolbar filter-pagination-toolbar" style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            padding: '8px 12px', background: '#fff', borderRadius: '10px',
            border: '1px solid #E2E8F0', marginBottom: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.01)', width: '100%', boxSizing: 'border-box'
          }}>
            {/* Row 1: Search, Status filter, Warehouse filter */}
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                  <Search size={12} />
                </span>
                <input
                  type="text" placeholder="Tìm mã đơn, NCC..."
                  value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{
                    paddingLeft: '26px', height: '32px', borderRadius: '8px',
                    border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.74rem',
                    width: '100%', boxSizing: 'border-box'
                  }}
                />
              </div>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                style={{ height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.74rem', padding: '0 4px', cursor: 'pointer', color: '#334155', width: '90px', flexShrink: 0 }}>
                <option value="all">Tất cả TT</option>
                <option value="Duyệt thành công">Đã duyệt</option>
                <option value="K.tra thành công">Đã K.tra</option>
                <option value="Nháp">Nháp</option>
              </select>
              <select value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setCurrentPage(1); }}
                style={{ height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.74rem', padding: '0 4px', cursor: 'pointer', color: '#334155', width: '90px', flexShrink: 0 }}>
                <option value="">Tất cả kho</option>
                <option value="Đã nhập kho">Đã nhập</option>
                <option value="Nhập chưa hết">Chưa hết</option>
                <option value="Chưa nhập kho">Chưa nhập</option>
              </select>
            </div>

            {/* Row 2: Page limit and Excel Buttons */}
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              <select value={itemsPerPage} onChange={e => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                style={{ height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.74rem', padding: '0 6px', cursor: 'pointer', color: '#334155', width: '75px', flexShrink: 0 }}>
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
              <button onClick={() => fileInputRef.current?.click()} disabled={importLoading} style={{
                flex: 1, height: '32px', borderRadius: '8px',
                border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer',
                fontSize: '0.74rem', fontWeight: '600', color: '#334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}>
                <FileUp size={13} /> {importLoading ? 'Đang nhập...' : 'Nhập Excel'}
              </button>
              <button onClick={handleExport} style={{
                flex: 1, height: '32px', borderRadius: '8px',
                border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer',
                fontSize: '0.74rem', fontWeight: '600', color: '#334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}>
                <FileDown size={13} /> Xuất Excel
              </button>
            </div>
          </div>
        ) : (
          <div className="mgmt-toolbar card filter-pagination-toolbar" style={{ marginBottom: '4px' }}>
            <div className="toolbar-left" style={{ flex: 1 }}>
              <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text" 
                  placeholder="Tìm mã đơn, NCC, người tạo..."
                  value={searchTerm} 
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="select-minimal"
                style={{
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  padding: '0 8px',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Duyệt thành công">Đã duyệt</option>
                <option value="K.tra thành công">Đã kiểm tra</option>
                <option value="Nháp">Nháp</option>
              </select>

              <select 
                value={filterWarehouse} 
                onChange={e => { setFilterWarehouse(e.target.value); setCurrentPage(1); }}
                className="select-minimal"
                style={{
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  padding: '0 8px',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">Tất cả kho</option>
                <option value="Đã nhập kho">Đã nhập kho</option>
                <option value="Nhập chưa hết">Nhập chưa hết</option>
                <option value="Chưa nhập kho">Chưa nhập kho</option>
              </select>

              <select 
                value={itemsPerPage} 
                onChange={e => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                className="select-minimal"
                style={{
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  padding: '0 8px',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            <div className="toolbar-right">
              <button 
                className="btn btn-outline" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={importLoading}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#fff',
                  color: '#7B5233',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileUp size={14} /> {importLoading ? 'Đang nhập...' : 'Nhập Excel'}
              </button>

              <button 
                className="btn btn-outline" 
                onClick={handleExport}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#fff',
                  color: '#7B5233',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileDown size={14} /> Xuất Excel
              </button>
            </div>
          </div>
        )}

        {/* Table - fills remaining space */}
        <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            
            <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>STT</th>
                    <th>Mã đơn mua</th>
                    <th>Ngày đặt</th>
                    <th>Ngày giao</th>
                    <th>Tên NCC</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Nhập kho</th>
                    <th>Người tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu hiển thị.</td></tr>
                  ) : data.map((item, idx) => {
                    const status = getStatusDisplay(item.status);
                    const warehouse = getWarehouseDisplay(item.warehouse_status);
                    const stt = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr key={item.id} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/purchase-requisitions/${item.id}`)}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                        <td style={{ fontWeight: 700, color: '#7B5233' }}>{item.po_code}</td>
                        <td>{formatDate(item.order_date)}</td>
                        <td>{formatDate(item.delivery_date)}</td>
                        <td>{item.vendor_name || item.supplier_name || '---'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: status.bg, color: status.color,
                            border: `1px solid ${status.color}22`
                          }}>
                            <status.icon size={12} /> {status.text}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: warehouse.bg, color: warehouse.color,
                            border: `1px solid ${warehouse.color}22`
                          }}>
                            {warehouse.text}
                          </span>
                        </td>
                        <td>{item.created_by_name || item.creator || '---'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Cards list */}
            <div className="mobile-only mgmt-cards-container" style={{ padding: '10px', overflowY: 'auto', flex: 1 }}>
              {data.map((item, idx) => {
                const status = getStatusDisplay(item.status);
                const warehouse = getWarehouseDisplay(item.warehouse_status);
                const stt = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <div key={item.id} className="mgmt-card animate-card-entrance" style={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '10px', 
                    border: '1px solid #EADCC9',
                    padding: '12px',
                    marginBottom: '10px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/admin/purchase-requisitions/${item.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
                        backgroundColor: status.bg, color: status.color
                      }}>
                        <status.icon size={10} /> {status.text}
                      </span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                      {item.po_code}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '4px' }}>
                      NCC: {item.vendor_name || item.supplier_name || '---'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8D6E63' }}>
                      <span>Ngày giao: {formatDate(item.delivery_date)}</span>
                      <span style={{ fontWeight: '700', color: warehouse.color }}>{warehouse.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Container - Desktop inside card */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Hiển thị <b>{data.length}</b> trên <b>{total}</b> đơn mua
              </div>
              {totalPages > 1 && (
                <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                    disabled={currentPage === 1}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: '#7B5233' }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {getPaginationRange().map((page, i) => {
                    if (page === '...') {
                      return <span key={`ellipsis-${i}`} style={{ color: '#8D6E63', fontSize: '0.7rem', padding: '0 4px' }}>...</span>;
                    }
                    if (page > totalPages) return null;
                    return (
                      <button 
                        key={page} 
                        className={`page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #EADCC9',
                          backgroundColor: currentPage === page ? '#7B5233' : '#FAF6F0',
                          color: currentPage === page ? '#fff' : '#7B5233',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                    disabled={currentPage === totalPages}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, color: '#7B5233' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Sticky Pagination */}
        {totalPages > 1 && (
          <div className="pagination-mobile-sticky mobile-only">
            <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {totalPages || 1}</span>
            <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const thStyle = { padding: '12px 10px', textAlign: 'left', fontSize: '0.73rem', fontWeight: 700, whiteSpace: 'nowrap' };
const tdStyle = { padding: '12px 10px', fontSize: '0.76rem', color: '#334155' };
const pageBtnStyle = { padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', background: '#fff' };

export default PurchaseRequisitionList;
