import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search, FileDown, FileUp,
  ChevronRight, ChevronLeft, CheckCircle, Clock, AlertCircle,
  Package, Layers, X, ChevronDown, ChevronUp, Eye,
  Calendar, User, ShoppingBag
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

const formatNumber = (value) => {
  if (!value && value !== 0) return '---';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
};

const getStatusDisplay = (status) => {
  switch (status) {
    case 'Đã duyệt': return { text: 'Đã duyệt', bg: '#ecfdf5', color: '#10b981' };
    case 'Đã kiểm tra': return { text: 'Đã kiểm tra', bg: '#eff6ff', color: '#3b82f6' };
    case 'Chưa duyệt': return { text: 'Chưa duyệt', bg: '#fffbeb', color: '#f59e0b' };
    default: return { text: status || '---', bg: '#f1f5f9', color: '#64748b' };
  }
};

const PurchaseOrderItemList = () => {
  const navigate = useNavigate();
  const { startGlobalUpload } = useOutletContext() || {};
  const fileInputRef = useRef(null);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  const [stats, setStats] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedPO, setExpandedPO] = useState({});
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
      };
      const result = await purchasingService.getOrderItems(params);
      setData(result.items || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Lỗi tải đơn mua hàng:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await purchasingService.getOrderItemStats();
      setStats(result);
    } catch (error) {
      console.error('Lỗi tải thống kê:', error);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchData(); }, [currentPage, itemsPerPage, searchTerm, filterStatus]);

  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  const statCards = useMemo(() => {
    if (!stats) return [];
    const byStatus = stats.by_status || {};
    return [
      { label: 'TỔNG MẶT HÀNG', value: stats.total || 0, iconBg: '#EEF2FF', iconColor: '#4F46E5', Icon: Layers },
      { label: 'ĐÃ DUYỆT', value: byStatus['Đã duyệt'] || 0, iconBg: '#ECFDF4', iconColor: '#10B981', Icon: CheckCircle },
      { label: 'ĐÃ KIỂM TRA', value: byStatus['Đã kiểm tra'] || 0, iconBg: '#EFF6FF', iconColor: '#3B82F6', Icon: Eye },
      { label: 'CHƯA DUYỆT', value: byStatus['Chưa duyệt'] || 0, iconBg: '#FFFBEB', iconColor: '#F59E0B', Icon: Clock },
    ];
  }, [stats]);

  // Group items by PO code
  const groupedData = useMemo(() => {
    const groups = {};
    data.forEach(item => {
      const key = item.po_code || 'N/A';
      if (!groups[key]) {
        groups[key] = {
          po_code: key,
          po_date: item.po_date,
          supplier_name: item.supplier_name,
          supplier_code: item.supplier_code,
          status: item.status,
          creator: item.creator,
          items: [],
          total_vnd: 0,
        };
      }
      groups[key].items.push(item);
      groups[key].total_vnd += (item.subtotal_vnd || 0);
      if (item.po_date && !groups[key].po_date) groups[key].po_date = item.po_date;
      if (item.supplier_name && !groups[key].supplier_name) groups[key].supplier_name = item.supplier_name;
    });
    return Object.values(groups);
  }, [data]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (startGlobalUpload) {
        await startGlobalUpload(
          file,
          '/purchase-order-items/import-excel',
          () => {
            fetchData();
            fetchStats();
          }
        );
      } else {
        setImportLoading(true);
        const result = await purchasingService.importOrderItemsExcel(file);
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
    purchasingService.exportOrderItemsExcel({
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchTerm || undefined,
    });
  };

  const togglePO = (poCode) => {
    setExpandedPO(prev => ({ ...prev, [poCode]: !prev[poCode] }));
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-layout:has(.poi-compact-container) {
          height: 100vh !important;
          overflow: hidden !important;
        }
        .admin-main:has(.poi-compact-container) {
          height: 100vh !important;
          overflow: hidden !important;
          margin-left: 260px !important;
          width: calc(100% - 260px) !important;
          max-width: none !important;
        }
        @media (min-width: 993px) {
          .admin-main.sidebar-collapsed:has(.poi-compact-container) {
            margin-left: 80px !important;
            width: calc(100% - 80px) !important;
          }
        }
        @media (max-width: 992px) {
          .admin-main:has(.poi-compact-container) {
            margin-left: 80px !important;
            width: calc(100% - 80px) !important;
          }
        }
        @media (max-width: 768px) {
          .admin-main:has(.poi-compact-container) {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
          }
        }
        .dashboard-content:has(.poi-compact-container) {
          height: calc(100vh - 60px) !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          padding: 8px 12px !important;
          box-sizing: border-box !important;
        }
        .admin-main:has(.poi-compact-container) .admin-header {
          padding: 6px 12px !important;
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        @media (max-width: 768px) {
          .poi-card-header-wrapper {
            flex-wrap: wrap !important;
            gap: 8px 12px !important;
          }
          .poi-col-code {
            width: auto !important;
            flex-shrink: 0 !important;
            order: 1 !important;
          }
          .poi-col-status {
            width: auto !important;
            flex-shrink: 0 !important;
            margin-left: auto !important;
            order: 2 !important;
          }
          .poi-col-supplier {
            width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            order: 3 !important;
            padding: 6px 0 !important;
            border-top: 1px dashed #EADCC9 !important;
            border-bottom: 1px dashed #EADCC9 !important;
          }
          .poi-col-date {
            width: auto !important;
            order: 4 !important;
          }
          .poi-col-creator {
            width: auto !important;
            order: 5 !important;
            margin-left: 6px !important;
          }
          .poi-col-items {
            width: auto !important;
            order: 6 !important;
            margin-left: auto !important;
          }
        }
      `}} />
      <div className="mgmt-container poi-compact-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', maxWidth: '100%', margin: '0', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
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
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>
                  {new Intl.NumberFormat('vi-VN').format(stat.value)}
                </div>
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
            {/* Row 1: Search, Status filter, Page Limit */}
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                  <Search size={12} />
                </span>
                <input
                  type="text" placeholder="Tìm mã PO, NCC..."
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
                <option value="Đã duyệt">Đã duyệt</option>
                <option value="Đã kiểm tra">Đã K.tra</option>
                <option value="Chưa duyệt">Chưa duyệt</option>
              </select>
              <select value={itemsPerPage} onChange={e => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                style={{ height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.74rem', padding: '0 6px', cursor: 'pointer', color: '#334155', width: '75px', flexShrink: 0 }}>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
                <option value={200}>200 dòng</option>
              </select>
            </div>

            {/* Row 2: Excel Import/Export Buttons */}
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
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
                type="text" placeholder="Tìm mã PO, mã MH, tên MH, NCC..."
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
              <option value="Đã duyệt">Đã duyệt</option>
              <option value="Đã kiểm tra">Đã kiểm tra</option>
              <option value="Chưa duyệt">Chưa duyệt</option>
            </select>

            <select value={itemsPerPage} onChange={e => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              style={{ height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem', padding: '0 8px', cursor: 'pointer', color: '#334155' }}>
              <option value={30}>30 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
              <option value={200}>200 dòng</option>
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

        {/* Cards Container - fills remaining space */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: '12px',
          backgroundColor: '#FAF8F5',
          borderRadius: '12px',
          border: '1px solid #EADCC9',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#7B5233', fontWeight: '600' }}>Đang tải dữ liệu...</div>
          ) : groupedData.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#8C7B72', fontWeight: '500' }}>Không có dữ liệu hiển thị.</div>
          ) : (
            <>
              {groupedData.map((group) => {
                const isExpanded = !!expandedPO[group.po_code];
                const status = getStatusDisplay(group.status);
                return (
                  <div key={group.po_code} style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EADCC9',
                    borderRadius: '12px',
                    boxShadow: '0 4px 10px rgba(123, 82, 51, 0.02)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}>
                    {/* PO Header Row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', background: 'linear-gradient(90deg, #FCFAF7 0%, #FFFFFF 100%)',
                      borderBottom: isExpanded ? '1px solid #F5EDE4' : 'none',
                      cursor: 'pointer', transition: 'background 0.15s', fontSize: '0.78rem',
                      userSelect: 'none'
                    }} onClick={() => togglePO(group.po_code)}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      
                      {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', padding: '4px 0' }}>
                          {/* Row 1: PO Code & Status */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#F5EDE4',
                                color: '#7B5233',
                                transition: 'transform 0.2s',
                                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                flexShrink: 0
                              }}>
                                <ChevronDown size={12} />
                              </div>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                backgroundColor: '#7B5233',
                                color: '#FFFFFF',
                                borderRadius: '6px',
                                fontWeight: '800',
                                fontSize: '0.75rem',
                                letterSpacing: '0.02em',
                                boxShadow: '0 2px 4px rgba(123, 82, 51, 0.15)'
                              }}>{group.po_code}</span>
                            </div>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '30px',
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              backgroundColor: status.bg,
                              color: status.color,
                              border: `1px solid ${status.color}30`,
                              letterSpacing: '0.02em'
                            }}>
                              {status.text}
                            </span>
                          </div>

                          {/* Row 2: Supplier */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.75rem', color: '#5D4037', fontWeight: '700', borderTop: '1px dashed #F5EDE4', paddingTop: '6px' }}>
                            <ShoppingBag size={12} style={{ color: '#A37F61', flexShrink: 0, marginTop: '2px' }} />
                            <span style={{ wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.3' }}>{group.supplier_name || '---'}</span>
                          </div>

                          {/* Row 3: Date, Creator & Items count */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: '0.68rem', color: '#8C7B72', fontWeight: '600', borderTop: '1px dashed #F5EDE4', paddingTop: '6px', marginTop: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={11} style={{ flexShrink: 0 }} />
                              <span>{formatDate(group.po_date)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7B5233', backgroundColor: '#FDF8F2', padding: '1px 5px', borderRadius: '4px', border: '1px solid #F5EDE4' }}>
                              <Package size={11} style={{ flexShrink: 0 }} />
                              <span>{group.items.length} mặt hàng</span>
                            </div>
                            {group.creator && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={11} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{group.creator}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="poi-card-header-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                          {/* Column 1: PO Code */}
                          <div className="poi-col-code" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '170px', flexShrink: 0 }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#F5EDE4',
                              color: '#7B5233',
                              transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                              flexShrink: 0
                            }}>
                              <ChevronDown size={14} />
                            </div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 8px',
                              backgroundColor: '#7B5233',
                              color: '#FFFFFF',
                              borderRadius: '6px',
                              fontWeight: '800',
                              fontSize: '0.78rem',
                              letterSpacing: '0.02em',
                              boxShadow: '0 2px 4px rgba(123, 82, 51, 0.15)',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }}>{group.po_code}</span>
                          </div>
                          
                          {/* Column 2: Date */}
                          <div className="poi-col-date" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: '#8C7B72', fontWeight: '600', width: '100px', flexShrink: 0 }}>
                            <Calendar size={13} style={{ flexShrink: 0 }} />
                            <span>{formatDate(group.po_date)}</span>
                          </div>
                          
                          {/* Column 3: Supplier */}
                          <div className="poi-col-supplier" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#5D4037', fontWeight: '700', flex: 1, minWidth: '150px', overflow: 'hidden' }}>
                            <ShoppingBag size={13} style={{ color: '#A37F61', flexShrink: 0 }} />
                            <span title={group.supplier_name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.supplier_name || '---'}</span>
                          </div>
                          
                          {/* Column 4: Status */}
                          <div className="poi-col-status" style={{ width: '110px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '30px',
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: status.bg,
                              color: status.color,
                              border: `1px solid ${status.color}30`,
                              letterSpacing: '0.02em',
                              display: 'inline-block',
                              textAlign: 'center',
                              minWidth: '85px',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }}>
                              {status.text}
                            </span>
                          </div>

                          {/* Column 5: Items Count */}
                          <div className="poi-col-items" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.74rem',
                            color: '#7B5233',
                            backgroundColor: '#FDF8F2',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #F5EDE4',
                            fontWeight: '700',
                            width: '110px',
                            flexShrink: 0,
                            boxSizing: 'border-box'
                          }}>
                            <Package size={13} style={{ flexShrink: 0 }} />
                            <span>{group.items.length} mặt hàng</span>
                          </div>

                          {/* Column 6: Creator */}
                          <div className="poi-col-creator" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#8C7B72', fontWeight: '500', width: '130px', flexShrink: 0 }}>
                            {group.creator ? (
                              <>
                                <User size={12} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.creator}</span>
                              </>
                            ) : (
                              <span style={{ color: '#C8B1A6' }}>---</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Items Table */}
                    {isExpanded && (
                      isMobile ? (
                        <div style={{
                          padding: '10px 12px',
                          backgroundColor: '#FDFCFB',
                          borderTop: '1px solid #F5EDE4',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          {group.items.map((item, itemIdx) => (
                            <div key={item.id} style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #EADCC9',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              boxShadow: '0 2px 4px rgba(123, 82, 51, 0.02)'
                            }}>
                              {/* Row 1: STT + Item Code & Order Code */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#8C7B72', fontWeight: '800' }}>#{itemIdx + 1}</span>
                                  <span style={{
                                    fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace',
                                    fontWeight: '700',
                                    color: '#7B5233',
                                    backgroundColor: '#FAF6F0',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontSize: '0.68rem',
                                    border: '1px solid #F5EDE4'
                                  }}>{item.item_code || '---'}</span>
                                </div>
                                {item.order_code && (
                                  <span style={{
                                    fontSize: '0.68rem',
                                    color: '#5D4037',
                                    fontWeight: '700',
                                    backgroundColor: '#FAF6F0',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #F5EDE4'
                                  }}>
                                    ĐH: {item.order_code}
                                  </span>
                                )}
                              </div>

                              {/* Row 2: Item Name */}
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#2D1A12',
                                lineHeight: '1.4',
                                wordBreak: 'break-word',
                                whiteSpace: 'normal'
                              }}>
                                {item.item_name || '---'}
                              </div>

                              {/* Row 3: Unit & Quantity */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: '1px dashed #FAF6F0',
                                paddingTop: '6px',
                                marginTop: '2px'
                              }}>
                                <span style={{ fontSize: '0.7rem', color: '#8C7B72', fontWeight: '600' }}>
                                  ĐVT: <span style={{ color: '#2D1A12', fontWeight: '700' }}>{item.unit || '---'}</span>
                                </span>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#7B5233' }}>
                                  SL: <span style={{ color: '#2D1A12' }}>{formatNumber(item.quantity)}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', backgroundColor: '#FFFFFF', borderTop: '1px solid #F5EDE4' }}>
                          {/* Custom Header Row */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 16px',
                            backgroundColor: '#FDFBF9',
                            borderBottom: '1.5px solid #F5EDE4',
                            fontWeight: '700',
                            minWidth: '720px'
                          }}>
                            <div style={{ ...subThStyle, width: '50px', textAlign: 'center', boxSizing: 'border-box' }}>#</div>
                            <div style={{ ...subThStyle, width: '120px', boxSizing: 'border-box' }}>Mã MH</div>
                            <div style={{ ...subThStyle, flex: 1, paddingLeft: '8px', boxSizing: 'border-box' }}>Tên mặt hàng</div>
                            <div style={{ ...subThStyle, width: '140px', boxSizing: 'border-box' }}>Mã ĐH</div>
                            <div style={{ ...subThStyle, width: '90px', textAlign: 'center', boxSizing: 'border-box' }}>ĐVT</div>
                            <div style={{ ...subThStyle, width: '110px', textAlign: 'right', paddingRight: '16px', boxSizing: 'border-box' }}>Số lượng</div>
                          </div>

                          {/* Custom Body Rows */}
                          <div style={{ minWidth: '720px' }}>
                            {group.items.map((item, itemIdx) => (
                              <div
                                key={item.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '10px 16px',
                                  borderBottom: '1px solid #FAF6F0',
                                  backgroundColor: itemIdx % 2 === 0 ? '#FFFFFF' : '#FDFDFD',
                                  transition: 'background-color 0.15s ease'
                                }}
                                className="poi-item-row-div"
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FCFAF7'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = itemIdx % 2 === 0 ? '#FFFFFF' : '#FDFDFD'}
                              >
                                <div style={{ ...subTdStyle, width: '50px', justifyContent: 'center', color: '#8C7B72', fontWeight: '600', boxSizing: 'border-box' }}>
                                  {itemIdx + 1}
                                </div>
                                <div style={{ ...subTdStyle, width: '120px', boxSizing: 'border-box' }}>
                                  <span style={{
                                    fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace',
                                    fontWeight: '700',
                                    color: '#7B5233',
                                    backgroundColor: '#FAF6F0',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    border: '1px solid #F5EDE4'
                                  }}>{item.item_code || '---'}</span>
                                </div>
                                <div style={{
                                  ...subTdStyle,
                                  flex: 1,
                                  fontWeight: '500',
                                  color: '#2D1A12',
                                  paddingLeft: '8px',
                                  paddingRight: '12px',
                                  fontSize: '0.75rem',
                                  lineHeight: '1.3',
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                  boxSizing: 'border-box'
                                }}>
                                  {item.item_name || '---'}
                                </div>
                                <div style={{ ...subTdStyle, width: '140px', color: '#5D4037', fontWeight: '600', boxSizing: 'border-box' }}>
                                  {item.order_code || '---'}
                                </div>
                                <div style={{ ...subTdStyle, width: '90px', justifyContent: 'center', color: '#8C7B72', fontWeight: '600', boxSizing: 'border-box' }}>
                                  {item.unit || '---'}
                                </div>
                                <div style={{
                                  ...subTdStyle,
                                  width: '110px',
                                  justifyContent: 'flex-end',
                                  fontWeight: '800',
                                  color: '#2D1A12',
                                  paddingRight: '16px',
                                  fontSize: '0.78rem',
                                  boxSizing: 'border-box'
                                }}>
                                  {formatNumber(item.quantity)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Compact Pagination */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 12px', background: '#fff', borderRadius: '10px',
          border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
        }}>
          <div style={{ color: '#64748B', fontSize: '0.75rem' }}>
            Hiển thị <b>{Math.min((currentPage - 1) * itemsPerPage + 1, total)}–{Math.min(currentPage * itemsPerPage, total)}</b> trên <b>{total}</b> mặt hàng
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

const subThStyle = { textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, color: '#8C7B72', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
const subTdStyle = { fontSize: '0.75rem', color: '#334155', display: 'flex', alignItems: 'center' };
const pageBtnStyle = { padding: '4px 10px', borderRadius: '6px', border: '1px solid #eadcc9', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', background: '#fff' };

export default PurchaseOrderItemList;
