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
          margin-left: 260px !important;
          width: calc(100% - 260px) !important;
          max-width: none !important;
        }
        @media (min-width: 993px) {
          .admin-main.sidebar-collapsed:has(.pr-compact-container) {
            margin-left: 80px !important;
            width: calc(100% - 80px) !important;
          }
        }
        @media (max-width: 992px) {
          .admin-main:has(.pr-compact-container) {
            margin-left: 80px !important;
            width: calc(100% - 80px) !important;
          }
        }
        @media (max-width: 768px) {
          .admin-main:has(.pr-compact-container) {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
          }
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
          <div className="qr-toolbar" style={{
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
          <div className="qr-toolbar" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', background: '#fff', borderRadius: '10px',
            border: '1px solid #E2E8F0', marginBottom: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.01)', width: '100%', boxSizing: 'border-box',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                <Search size={14} />
              </span>
              <input
                type="text" placeholder="Tìm mã đơn, NCC, người tạo..."
                value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{
                  paddingLeft: '32px', height: '32px', borderRadius: '8px',
                  border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.78rem',
                  width: '100%', boxSizing: 'border-box', transition: 'all 0.2s'
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
                onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
              />
            </div>

            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              style={{ height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem', padding: '0 8px', cursor: 'pointer', color: '#334155' }}>
              <option value="all">Tất cả trạng thái</option>
              <option value="Duyệt thành công">Đã duyệt</option>
              <option value="K.tra thành công">Đã kiểm tra</option>
              <option value="Nháp">Nháp</option>
            </select>

            <select value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setCurrentPage(1); }}
              style={{ height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem', padding: '0 8px', cursor: 'pointer', color: '#334155' }}>
              <option value="">Tất cả kho</option>
              <option value="Đã nhập kho">Đã nhập kho</option>
              <option value="Nhập chưa hết">Nhập chưa hết</option>
              <option value="Chưa nhập kho">Chưa nhập kho</option>
            </select>

            <select value={itemsPerPage} onChange={e => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              style={{ height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem', padding: '0 8px', cursor: 'pointer', color: '#334155' }}>
              <option value={15}>15 dòng</option>
              <option value={30}>30 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>

            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={importLoading} style={{
                height: '32px', padding: '0 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: '600', color: '#334155',
                display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
              }}>
                <FileUp size={14} /> {importLoading ? 'Đang nhập...' : 'Nhập Excel'}
              </button>
              <button onClick={handleExport} style={{
                height: '32px', padding: '0 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: '600', color: '#334155',
                display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
              }}>
                <FileDown size={14} /> Xuất Excel
              </button>
            </div>
          </div>
        )}

        {/* Table - fills remaining space */}
        <div className="table-responsive" style={{ flex: 1, minHeight: 0, overflow: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#5d3b32', color: '#fff', position: 'sticky', top: 0, zIndex: 2 }}>
                <th style={thStyle}>STT</th>
                <th style={thStyle}>Mã đơn mua</th>
                <th style={thStyle}>Ngày đặt</th>
                <th style={thStyle}>Ngày giao</th>
                <th style={thStyle}>Tên NCC</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}>Nhập kho</th>
                <th style={thStyle}>Người tạo</th>
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
                    style={{ borderBottom: '1px solid #f0ece8', backgroundColor: idx % 2 === 0 ? '#fff' : '#fdfcfb', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f0eb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#fdfcfb'}
                    onClick={() => navigate(`/admin/purchase-requisitions/${item.id}`)}>
                    <td style={tdStyle} data-label="STT">{stt}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#5d3b32' }} data-label="Mã đơn mua">{item.po_code}</td>
                    <td style={tdStyle} data-label="Ngày đặt">{formatDate(item.order_date)}</td>
                    <td style={tdStyle} data-label="Ngày giao">{formatDate(item.delivery_date)}</td>
                    <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-label="Tên NCC">{item.supplier_name || '---'}</td>
                    <td style={tdStyle} data-label="Trạng thái">
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: status.bg, color: status.color }}>
                        {status.text}
                      </span>
                    </td>
                    <td style={tdStyle} data-label="Nhập kho">
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: warehouse.bg, color: warehouse.color }}>
                        {warehouse.text}
                      </span>
                    </td>
                    <td style={tdStyle} data-label="Người tạo">{item.creator || '---'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compact Pagination */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 12px', background: '#fff', borderRadius: '10px',
          border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
        }}>
          <div style={{ color: '#64748B', fontSize: '0.75rem' }}>
            Hiển thị <b>{Math.min((currentPage - 1) * itemsPerPage + 1, total)}–{Math.min(currentPage * itemsPerPage, total)}</b> trên <b>{total}</b> đơn
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                style={{ ...pageBtnStyle, opacity: currentPage === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let start = Math.max(1, currentPage - 2);
                if (start + 4 > totalPages) start = Math.max(1, totalPages - 4);
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    style={{ ...pageBtnStyle, backgroundColor: currentPage === page ? '#5d3b32' : '#fff', color: currentPage === page ? '#fff' : '#444' }}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                style={{ ...pageBtnStyle, opacity: currentPage === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const thStyle = { padding: '12px 10px', textAlign: 'left', fontSize: '0.73rem', fontWeight: 700, whiteSpace: 'nowrap' };
const tdStyle = { padding: '12px 10px', fontSize: '0.76rem', color: '#334155' };
const pageBtnStyle = { padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', background: '#fff' };

export default PurchaseRequisitionList;
