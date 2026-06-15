import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Calendar
} from 'lucide-react';
import { orderService } from '@modules/Order/Models/order.service';

const Orders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [filterStatus, setFilterStatus] = useState('all');

    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await orderService.getAll();
            setOrders(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Lỗi khi tải đơn hàng:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

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
        const total = orders.length;
        const production = orders.filter(o => getStatusDisplay(o).text === 'Đang sản xuất').length;
        const completed = orders.filter(o => getStatusDisplay(o).text === 'Hoàn thành').length;
        const overdue = orders.filter(o => getStatusDisplay(o).text === 'Quá hạn').length;

        return [
            { id: 'all', label: 'TỔNG ĐƠN HÀNG', value: `${total} Đơn`, bg: '#F5F5F5', color: '#424242' },
            { id: 'production', label: 'ĐANG SẢN XUẤT', value: `${production} Đơn`, bg: '#eff6ff', color: '#3b82f6' },
            { id: 'completed', label: 'ĐÃ HOÀN THÀNH', value: `${completed} Đơn`, bg: '#ecfdf5', color: '#10b981' },
            { id: 'overdue', label: 'QUÁ HẠN', value: `${overdue} Đơn`, bg: '#fef2f2', color: '#ef4444' },
        ];
    }, [orders]);

    // Filter dữ liệu dựa trên Search và Status
    const filteredOrders = useMemo(() => {
        const term = (searchTerm || '').toLowerCase();
        let result = orders.filter(o => 
            (o.customer || '').toLowerCase().includes(term) || 
            (o.order_code || '').toLowerCase().includes(term) ||
            ((o.products || o.items || []).some(p => (p.name || '').toLowerCase().includes(term)))
        );

        if (filterStatus !== 'all') {
            result = result.filter(o => {
                const s = getStatusDisplay(o);
                if (filterStatus === 'production') return s.text === 'Đang sản xuất';
                if (filterStatus === 'completed') return s.text === 'Hoàn thành';
                if (filterStatus === 'overdue') return s.text === 'Quá hạn';
                return true;
            });
        }
        return result;
    }, [orders, searchTerm, filterStatus]);

    // Tính toán dữ liệu cho trang hiện tại
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;

    return (
        <div className="manufacture-plan-container">
            
            {/* ── STICKY TOP ZONE (Desktop: stats-grid; Mobile: stats-strip + toolbar) ── */}
            <div className="sticky-top-zone">
                {/* Desktop stats grid */}
                <div className="stats-grid animate-card-entrance desktop-only" style={{ padding: '16px 16px 0' }}>
                    {stats.map((stat, idx) => {
                        const isActive = filterStatus === stat.id;
                        return (
                            <div 
                                key={idx} 
                                className="stat-card" 
                                style={{ 
                                    backgroundColor: isActive ? stat.color : stat.bg, 
                                    color: isActive ? '#fff' : '#1e293b',
                                    border: isActive ? `1px solid ${stat.color}` : '1px solid rgba(226, 232, 240, 0.8)', 
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => { setFilterStatus(stat.id); setCurrentPage(1); }}
                            >
                                <p className="stat-title" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : '#64748b', transition: 'all 0.2s' }}>{stat.label}</p>
                                <h3 className="stat-value" style={{ color: isActive ? '#fff' : stat.color, transition: 'all 0.2s' }}>{stat.value}</h3>
                            </div>
                        );
                    })}
                </div>
                {/* Mobile compact stats strip */}
                <div className="stats-strip">
                    {stats.map((stat, idx) => {
                        const isActive = filterStatus === stat.id;
                        return (
                            <div 
                                key={idx} 
                                className={`stats-strip-item ${isActive ? 'active' : ''}`}
                                style={{ 
                                    backgroundColor: isActive ? stat.color : '#fff',
                                    cursor: 'pointer'
                                }}
                                onClick={() => { setFilterStatus(stat.id); setCurrentPage(1); }}
                            >
                                <span className="strip-value" style={{ color: isActive ? '#fff' : stat.color }}>
                                    {stat.value.replace(' Đơn', '')}
                                </span>
                                <span className="strip-label" style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#8D6E63' }}>
                                    {stat.label.replace('TỔNG ĐƠN HÀNG', 'TỔNG ĐƠN').replace('ĐANG ', '').replace('ĐÃ ', '')}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Toolbar */}
                <div className="mgmt-toolbar card" style={{ marginBottom: 0 }}>
                    <div className="toolbar-left" style={{ flex: 1 }}>
                        <div className="search-wrapper">
                            <Search className="search-icon" size={18} />
                            <input type="text" placeholder="Tìm khách hàng, mã PO, tên SP..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
                        </div>
                        
                        <select 
                            value={itemsPerPage} 
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className="page-size-select"
                        >
                            <option value={15}>15 dòng</option>
                            <option value={30}>30 dòng</option>
                            <option value={50}>50 dòng</option>
                            <option value={100}>100 dòng</option>
                        </select>

                        <div style={{ position: 'relative' }}>
                            <button 
                                className="btn" 
                                style={{ 
                                    padding: '0.5rem', 
                                    background: filterStatus !== 'all' ? '#FDF2F2' : 'white', 
                                    borderColor: filterStatus !== 'all' ? '#5d3b32' : '#E5E7EB',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                                onClick={() => { setFilterStatus(filterStatus === 'all' ? 'production' : 'all'); setCurrentPage(1); }}
                            >
                                <Filter size={18} color={filterStatus !== 'all' ? '#5d3b32' : '#64748b'} />
                                {filterStatus !== 'all' && <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#5d3b32' }}>ON</span>}
                            </button>
                        </div>
                        <button className="btn desktop-only"><ArrowUpDown size={18} /></button>
                    </div>
                    
                    <div className="toolbar-right">
                        <button 
                            onClick={() => navigate('/manufacture/orders/create')} 
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Plus size={18} />
                            <span className="btn-text-desktop">Thêm Đơn hàng</span>
                            <span className="btn-text-mobile">Thêm</span>
                        </button>
                        <div className="desktop-only" style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                        <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FileUp size={16} /> 
                            <span className="btn-text-desktop">Nhập Excel</span>
                            <span className="btn-text-mobile">Nhập</span>
                        </button>
                        <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FileDown size={16} /> 
                            <span className="btn-text-desktop">Xuất Excel</span>
                            <span className="btn-text-mobile">Xuất</span>
                        </button>
                    </div>
                </div>
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
                                            <button className="btn-icon" onClick={() => navigate(`/manufacture/orders/${order.id}`)} title="Xem chi tiết">
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
                    <div style={{ color: '#1e293b', fontWeight: '600', fontSize: '0.9rem' }}>
                        Hiển thị <b>{indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredOrders.length)}</b> trên <b>{filteredOrders.length}</b> Đơn hàng
                    </div>
                    
                    {/* Nút bấm Phân trang */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                                <ChevronLeft size={16} />
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
                                            onClick={() => setCurrentPage(i)}
                                            style={{ 
                                                padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', 
                                                backgroundColor: currentPage === i ? '#5d3b32' : '#fff', 
                                                color: currentPage === i ? '#fff' : '#444',
                                                fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                                            }}
                                        >
                                            {i}
                                        </button>
                                    );
                                }
                                return pages;
                            })()}

                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                            >
                                <ChevronRight size={16} />
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
                            <div key={order.id} className={`plan-mobile-card status-${cardStatusClass} card-shadow animate-card-entrance`} onClick={() => navigate(`/manufacture/orders/${order.id}`)}>
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
