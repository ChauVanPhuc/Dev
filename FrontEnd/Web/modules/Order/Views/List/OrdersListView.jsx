import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileDown, 
  FileUp, 
  Plus,
  Clock,
  ChevronRight,
  ChevronLeft,
  Eye,
  Edit2,
  Trash2,
  Package,
  ShoppingBag,
  Calendar,
  Layers,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { orderService } from '@modules/Order/Models/order.service';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const Orders = () => {
    const navigate = useNavigate();
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
    const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/orders');

    useEffect(() => {
      if (screenCode && title) {
        if (setCustomTitle) setCustomTitle(title);
        if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
        if (setCustomScreenCode) setCustomScreenCode(screenCode);
      }
    }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [filterStatus, setFilterStatus] = useState('all');

    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);
    const [totalCount, setTotalCount] = useState(0);
    const [statsData, setStatsData] = useState({ all: 0, production: 0, completed: 0, overdue: 0 });
    const [uniqueCustomers, setUniqueCustomers] = useState([]);
    const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
    const [filterCustomer, setFilterCustomer] = useState('all');
    const [filterDeadline, setFilterDeadline] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await orderService.getAll(
                currentPage,
                itemsPerPage,
                searchTerm,
                filterStatus,
                filterCustomer,
                filterDeadline,
                'desc'
            );
            if (res && res.items) {
                setOrders(res.items || []);
                setTotalCount(res.total_count || 0);
                if (res.stats) {
                    setStatsData(res.stats);
                }
                if (res.unique_customers) {
                    setUniqueCustomers(res.unique_customers);
                }
            } else {
                setOrders(Array.isArray(res) ? res : []);
                setTotalCount(Array.isArray(res) ? res.length : 0);
            }
        } catch (error) {
            console.error("Lỗi khi tải đơn hàng:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [currentPage, itemsPerPage, searchTerm, filterStatus, filterCustomer, filterDeadline]);

    const getStatusDisplay = (order) => {
        const statusNum = order.order_status;
        const isOverdue = order.deadline && new Date(order.deadline) < new Date() && statusNum !== 3; // Giả sử 3 là hoàn thành
        
        if (isOverdue) return { text: 'Quá hạn', bg: '#fef2f2', color: '#ef4444' };

        switch (statusNum) {
            case 3: return { text: 'Hoàn thành', bg: '#ecfdf5', color: '#10b981' };
            case 2: return { text: 'Đang sản xuất', bg: '#eff6ff', color: '#3b82f6' };
            case 1: 
            case 0:
            default: return { text: 'Chờ sản xuất', bg: '#fffbeb', color: '#f59e0b' };
        }
    };

    const stats = useMemo(() => {
        return [
            { id: 'all', label: 'TỔNG ĐƠN HÀNG', value: statsData.all, bg: '#F5F5F5', color: '#424242', iconBg: '#FAF6F0', iconColor: '#7B5233', Icon: Layers, themeColor: '#7B5233', activeBg: '#FAF6F0' },
            { id: 'production', label: 'ĐANG SẢN XUẤT', value: statsData.production, bg: '#eff6ff', color: '#3b82f6', iconBg: '#FFFBEB', iconColor: '#F59E0B', Icon: Clock, themeColor: '#F59E0B', activeBg: '#FFFBEB' },
            { id: 'completed', label: 'ĐÃ HOÀN THÀNH', value: statsData.completed, bg: '#ecfdf5', color: '#10b981', iconBg: '#ECFDF4', iconColor: '#10B981', Icon: CheckCircle, themeColor: '#10B981', activeBg: '#ECFDF4' },
            { id: 'overdue', label: 'QUÁ HẠN', value: statsData.overdue, bg: '#fef2f2', color: '#ef4444', iconBg: '#FEF2F2', iconColor: '#EF4444', Icon: AlertCircle, themeColor: '#EF4444', activeBg: '#FEF2F2' },
        ];
    }, [statsData]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = orders;
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

    return (
        <div className="gold-layout">
            
            {/* ── STICKY TOP ZONE (Desktop: stats-grid; Mobile: stats-strip + toolbar) ── */}
            <div className="sticky-top-zone">
                {/* Desktop stats grid */}
                <div className="stats-grid animate-card-entrance desktop-only" style={{ padding: '16px 16px 0' }}>
                    {stats.map((stat, idx) => {
                        return (
                            <div 
                                key={idx} 
                                className="kpi-card" 
                                style={{ 
                                    background: '#fff', 
                                    border: '1px solid #E2E8F0',
                                    padding: '8px 12px', 
                                    borderRadius: '10px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '8px',
                                    backgroundColor: stat.iconBg,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: stat.iconColor, 
                                    flexShrink: 0
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
                        );
                    })}
                </div>
                {/* Mobile compact stats strip */}
                <div className="stats-strip">
                    {stats.map((stat, idx) => {
                        return (
                            <div 
                                key={idx} 
                                className="stats-strip-item"
                                style={{ 
                                    backgroundColor: '#fff',
                                    border: '1px solid #E2E8F0'
                                }}
                            >
                                <span className="strip-value" style={{ color: stat.iconColor }}>
                                    {new Intl.NumberFormat('vi-VN').format(stat.value)}
                                </span>
                                <span className="strip-label" style={{ color: '#64748B' }}>
                                    {stat.label.replace('TỔNG ĐƠN HÀNG', 'TỔNG ĐƠN').replace('ĐANG ', '').replace('ĐÃ ', '')}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Toolbar */}
                <PageToolbar
                    searchValue={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
                    searchPlaceholder="Tìm khách hàng, mã PO, tên SP..."
                    showFilter={true}
                    isFilterOpen={isFilterBarOpen}
                    onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
                    activeFiltersCount={(filterStatus !== 'all' ? 1 : 0) + (filterCustomer !== 'all' ? 1 : 0) + (filterDeadline !== 'all' ? 1 : 0) + (filterPriority !== 'all' ? 1 : 0)}
                    onCreate={() => navigate('/admin/orders/create')}
                    createLabel="Thêm Đơn hàng"
                    hasWritePermission={true}
                />

                {isFilterBarOpen && (
                    <div className="filter-inline-bar" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Trạng thái */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Trạng thái</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="production">Đang sản xuất</option>
                                <option value="completed">Đã hoàn thành</option>
                                <option value="overdue">Quá hạn</option>
                            </select>
                        </div>

                        {/* Khách hàng */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Khách hàng</label>
                            <select
                                value={filterCustomer}
                                onChange={(e) => { setFilterCustomer(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">Tất cả khách hàng</option>
                                {uniqueCustomers.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Hạn giao hàng */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Hạn giao hàng</label>
                            <select
                                value={filterDeadline}
                                onChange={(e) => { setFilterDeadline(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">Tất cả thời hạn</option>
                                <option value="this_week">Trong vòng 7 ngày tới</option>
                                <option value="overdue">Quá hạn chưa hoàn thành</option>
                            </select>
                        </div>

                        {/* Mức độ ưu tiên */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Mức độ ưu tiên</label>
                            <select
                                value={filterPriority}
                                onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">Tất cả ưu tiên</option>
                                <option value="high">Khẩn cấp / Cao</option>
                                <option value="normal">Bình thường</option>
                            </select>
                        </div>

                        {/* Hiển thị số dòng */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Hiển thị số dòng</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            >
                                <option value={15}>15 dòng</option>
                                <option value={30}>30 dòng</option>
                                <option value={50}>50 dòng</option>
                                <option value={100}>100 dòng</option>
                            </select>
                        </div>

                        {(filterStatus !== 'all' || filterCustomer !== 'all' || filterDeadline !== 'all' || filterPriority !== 'all' || itemsPerPage !== 15) && (
                            <div className="filter-field-group">
                                <button
                                    type="button"
                                    className="page-btn"
                                    onClick={() => {
                                        setFilterStatus('all');
                                        setFilterCustomer('all');
                                        setFilterDeadline('all');
                                        setFilterPriority('all');
                                        setItemsPerPage(15);
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        height: '36px',
                                        padding: '0 12px',
                                        fontSize: '0.8rem',
                                        backgroundColor: '#FAF6F0',
                                        color: '#7B5233',
                                        border: '1px solid #EADCC9',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="admin-list-layout desktop-only">
                <div className="mgmt-table admin-table-card card-shadow" style={{ background: '#F8F9FA' }}>
                    <div className="admin-table-scroll" style={{ padding: '16px' }}>
                        <div className="orders-card-list">
                {loading ? (
                    <div className="card-shadow" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '16px' }}>Đang tải dữ liệu...</div>
                ) : currentOrders.length === 0 ? (
                    <div className="card-shadow" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '16px' }}>Không có dữ liệu hiển thị.</div>
                ) : (
                    currentOrders.map((order, idx) => {
                        const prods = order.products || order.items || [];
                        const status = getStatusDisplay(order);
                        const stt = indexOfFirstItem + idx + 1;

                        return (
                            <div key={order.id} className="order-desktop-card card-shadow animate-card-entrance">
                                <div className="order-card-header">
                                    <div className="header-left">
                                        <span className="stt-badge">#{stt}</span>
                                        <span className="order-code">{order.order_code}</span>
                                        <span className="customer-name">{order.customer}</span>
                                    </div>
                                    <div className="header-right">
                                        <span className="status-badge-wood" style={{ backgroundColor: status.bg, color: status.color }}>
                                            {status.text}
                                        </span>
                                        <div className="order-actions">
                                            <button className="btn-icon" onClick={() => navigate(`/admin/orders/${order.id}`)} title="Xem chi tiết">
                                                <Eye size={16} />
                                            </button>
                                            <button className="btn-icon" title="Chỉnh sửa">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-icon" style={{ color: '#ef4444' }} title="Xóa">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="order-card-body">
                                    <table className="order-products-table">
                                        <thead>
                                            <tr>
                                                <th>Tên sản phẩm</th>
                                                <th>Mã SKU</th>
                                                <th style={{ textAlign: 'right' }}>Số lượng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prods.map((p, pIdx) => (
                                                <tr key={p.id || pIdx}>
                                                    <td>
                                                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{p.name}</div>
                                                    </td>
                                                    <td>{p.sku || '---'}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>{p.quantity}</td>
                                                </tr>
                                            ))}
                                            {prods.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="empty-products">Chưa có sản phẩm</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                )}
                </div>
                </div>

                {/* Footer với Phân trang */}
                <div className="admin-pagination-desktop">
                    <div style={{ color: '#8D6E63', fontWeight: '600', fontSize: '0.8rem' }}>
                        Hiển thị <b>{totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalCount)}</b> trên <b>{totalCount}</b> Đơn hàng
                    </div>
                    
                    {/* Nút bấm Phân trang */}
                    {totalPages > 1 && (
                        <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <button 
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            
                            {(() => {
                                const pages = [];
                                const maxVisible = 5;
                                let start = Math.max(1, currentPage - 2);
                                let end = Math.min(totalPages, start + maxVisible - 1);
                                if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

                                for (let i = start; i <= end; i++) {
                                    pages.push(
                                        <button 
                                            key={i}
                                            className={`page-btn ${currentPage === i ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(i)}
                                        >
                                            {i}
                                        </button>
                                    );
                                }
                                return pages;
                            })()}

                            <button 
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
                </div>
            </div>

            {/* Mobile Cards View - Scrollable */}
            <div className="mobile-only manufacture-cards-scroll">
                <div className="manufacture-cards-container">
                    {currentOrders.map((order) => {
                        const status = getStatusDisplay(order);
                        const prods = order.products || order.items || [];
                        
                        let cardStatusClass = 'pending';
                        if (status.text === 'Hoàn thành') cardStatusClass = 'completed';
                        else if (status.text === 'Đang sản xuất') cardStatusClass = 'production';
                        else if (status.text === 'Quá hạn') cardStatusClass = 'overdue';

                        return (
                            <div key={order.id} className={`plan-mobile-card status-${cardStatusClass} card-shadow animate-card-entrance`} onClick={() => navigate(`/admin/orders/${order.id}`)}>
                                <div className="card-header">
                                    <span className="card-khsx">{order.order_code}</span>
                                    <span className="status-badge" style={{ backgroundColor: status.bg, color: status.color }}>
                                        {status.text}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Package size={14} color="#8D6E63" /> {order.customer || '---'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <ShoppingBag size={14} color="#8D6E63" /> {prods.length} loại ({prods.reduce((acc, p) => acc + (p.quantity || 0), 0)} chiếc)
                                    </span>
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>Nhấn để xem chi tiết ›</div>
                            </div>
                        );
                    })}
                    {currentOrders.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                            Không có đơn hàng nào.
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Mobile - Sticky */}
            <div className="pagination-mobile-sticky mobile-only">
                 <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                     <ChevronLeft size={16} />
                 </button>
                 <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {totalPages || 1}</span>
                 <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages <= 1}>
                     <ChevronRight size={16} />
                 </button>
            </div>
        </div>
    );
};

export default Orders;
