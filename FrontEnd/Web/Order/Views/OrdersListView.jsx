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
  Trash2
} from 'lucide-react';
import { orderService } from '@web/Order/Models/order.service';
import '@web/styles/Manufacture/Plan.css';

const Orders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await orderService.getAll();
                setOrders(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Lỗi khi tải đơn hàng:", error);
            } finally {
                setLoading(false);
            }
        };
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

    // Filter dữ liệu dựa trên Search
    const filteredOrders = useMemo(() => {
        const term = (searchTerm || '').toLowerCase();
        return orders.filter(o => 
            (o.customer || '').toLowerCase().includes(term) || 
            (o.order_code || '').toLowerCase().includes(term) ||
            ((o.products || o.items || []).some(p => (p.name || '').toLowerCase().includes(term)))
        );
    }, [orders, searchTerm]);

    // Tính toán dữ liệu cho trang hiện tại
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

    return (
        <div className="manufacture-plan-container" style={{ maxWidth: '1600px', margin: '0 auto', padding: '1rem' }}>
            
            {/* Header removed for Layout consistency */}

            {/* Toolbar */}
            <div className="action-bar card-shadow" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 auto' }}>
                    <div className="search-input-wrapper">
                        <Search size={16} style={{ color: '#94a3b8' }} />
                        <input type="text" placeholder="Tìm kiếm mã Đơn, sản phẩm..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
                    </div>
                    <button className="btn"><Filter size={18} /></button>
                    <button className="btn"><ArrowUpDown size={18} /></button>
                </div>
                
                <div className="action-buttons">
                    <button 
                        onClick={() => navigate('/manufacture/orders/create')} 
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={18} /> Thêm Đơn hàng
                    </button>
                    <div className="desktop-only" style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                    <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FileUp size={16} /> <span className="desktop-only">Nhập Excel</span>
                    </button>
                    <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FileDown size={16} /> <span className="desktop-only">Xuất Excel</span>
                    </button>
                </div>
            </div>

            {/* Data View: Desktop Table */}
            <div className="desktop-only card-shadow" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#fcfcfc', borderBottom: '1px solid #f1f5f9' }}>
                                {['STT', 'Mã Đơn hàng', 'Khách hàng', 'Sản phẩm', 'SL', 'Trạng thái', 'Thao tác'].map(h => (
                                    <th key={h} style={{ padding: '1rem', textAlign: 'left', color: '#64748B', fontWeight: '600' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu...</td></tr>
                            ) : currentOrders.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu hiển thị.</td></tr>
                            ) : (
                                currentOrders.map((order, idx) => {
                                    const prods = order.products || order.items || [];
                                    const status = getStatusDisplay(order);
                                    const stt = indexOfFirstItem + idx + 1;

                                    if (prods.length === 0) return (
                                        <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '1rem', color: '#64748B' }}>{stt}</td>
                                            <td style={{ padding: '1rem', fontWeight: '800', color: '#5d3b32' }}>{order.order_code}</td>
                                            <td style={{ padding: '1rem', color: '#475569' }}>{order.customer}</td>
                                            <td style={{ padding: '1rem', color: '#ccc' }}>Chưa có SP</td>
                                            <td style={{ padding: '1rem', fontWeight: '700' }}>0</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: status.bg, color: status.color }}>{status.text}</span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-icon" onClick={() => navigate(`/manufacture/orders/${order.id}`)} title="Xem chi tiết"><Eye size={16} /></button>
                                                    <button className="btn-icon" title="Chỉnh sửa"><Edit2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                    const orderRowSpan = prods.length;
                                    
                                    return prods.map((p, pIdx) => (
                                        <tr key={`${order.id}-${p.id || pIdx}`} className="table-row-hover" style={{ 
                                            borderBottom: pIdx === prods.length - 1 ? '1px solid #cbd5e1' : '1px dashed #e2e8f0',
                                            backgroundColor: pIdx % 2 !== 0 ? '#f8fafc' : '#fff'
                                        }}>
                                            {pIdx === 0 && <td rowSpan={orderRowSpan} style={{ padding: '1rem', color: '#64748B', borderRight: '1px solid #f1f5f9', verticalAlign: 'middle' }}>{stt}</td>}
                                            {pIdx === 0 && <td rowSpan={orderRowSpan} style={{ padding: '1rem', fontWeight: '800', color: '#5d3b32', borderRight: '1px solid #f1f5f9', verticalAlign: 'middle' }}>{order.order_code}</td>}
                                            {pIdx === 0 && <td rowSpan={orderRowSpan} style={{ padding: '1rem', color: '#475569', borderRight: '1px solid #f1f5f9', verticalAlign: 'middle' }}>{order.customer}</td>}
                                            
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{p.name}</div>
                                                {p.sku && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.sku}</div>}
                                            </td>
                                            <td style={{ padding: '1rem', fontWeight: '700', color: '#1e293b' }}>{p.quantity}</td>
                                            
                                            {pIdx === 0 && (
                                                <td rowSpan={orderRowSpan} style={{ padding: '1rem', verticalAlign: 'middle', borderLeft: '1px solid #f1f5f9' }}>
                                                    <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: status.bg, color: status.color, whiteSpace: 'nowrap' }}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                            )}
                                            {pIdx === 0 && (
                                                <td rowSpan={orderRowSpan} style={{ padding: '1rem', verticalAlign: 'middle', borderLeft: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
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
                                                </td>
                                            )}
                                        </tr>
                                    ));
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer với Phân trang */}
                <div style={{ 
                    padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#fcfcfc', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ color: '#1e293b', fontWeight: '600', fontSize: '0.9rem' }}>
                        Tổng cộng: {filteredOrders.length} Đơn hàng
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
                            
                            {[...Array(totalPages)].map((_, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    style={{ 
                                        padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', 
                                        backgroundColor: currentPage === i + 1 ? '#5d3b32' : '#fff', 
                                        color: currentPage === i + 1 ? '#fff' : '#444',
                                        fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                                    }}
                                >
                                    {i + 1}
                                </button>
                            ))}

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

            {/* Mobile Cards View */}
            <div className="mobile-only manufacture-cards-container">
                {currentOrders.map((order) => {
                    const status = getStatusDisplay(order);
                    const prods = order.products || order.items || [];
                    return (
                        <div key={order.id} className="plan-mobile-card card-shadow">
                            <div className="card-header">
                                <span className="card-khxs">{order.order_code}</span>
                                <span className="status-badge" style={{ backgroundColor: status.bg, color: status.color }}>
                                    {status.text}
                                </span>
                            </div>
                            <div className="card-body">
                                <div className="info-row">
                                    <span className="label">Khách hàng:</span>
                                    <span className="value">{order.customer || 'N/A'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Sản phẩm:</span>
                                    <span className="value">
                                        {prods.length} loại ({prods.reduce((acc, p) => acc + (p.quantity || 0), 0)} chiếc)
                                    </span>
                                </div>
                                <div className="info-row highlight">
                                    <span className="label">Ghi chú:</span>
                                    <span className="value" style={{ display: 'block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {order.note || '---'}
                                    </span>
                                </div>
                            </div>
                            <div className="card-footer">
                                <button className="btn-card-action" onClick={() => navigate(`/manufacture/orders/${order.id}`)}>
                                    Xem chi tiết
                                </button>
                                <button className="btn-card-action secondary">
                                    Cập nhật
                                </button>
                            </div>
                        </div>
                    );
                })}
                {currentOrders.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        Không có đơn hàng nào.
                    </div>
                )}
                
                {/* Pagination Mobile */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '10px 0' }}>
                         <button className="btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                             <ChevronLeft size={16} />
                         </button>
                         <span style={{ alignSelf: 'center', fontWeight: '700', fontSize: '0.9rem' }}>{currentPage} / {totalPages}</span>
                         <button className="btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                             <ChevronRight size={16} />
                         </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
