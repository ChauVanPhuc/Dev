import React, { useState, useEffect } from 'react';
import deliveryService from '@modules/Delivery/Models/delivery.service';
import { API_ROOT } from '@webShared/Services/api.service';
import { 
    Search, Filter, Download, MoreHorizontal, 
    FileText, CheckCircle, Clock, AlertTriangle,
    ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
    ChevronDown, X, User, Calendar, 
    MapPin, Activity, CheckCircle2, AlertCircle, 
    Undo2, Droplet, Maximize2, FileSpreadsheet, Layers, Info
} from 'lucide-react';
import '@styles/components.css';

const DeliveryTracking = () => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        error: 0
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedDeliveryStage, setSelectedDeliveryStage] = useState('all');
    const [selectedReceivingStage, setSelectedReceivingStage] = useState('all');

    // State for Details Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [deliveryDetail, setDeliveryDetail] = useState(null);
    const [qcDetail, setQcDetail] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalTab, setModalTab] = useState('handover'); // 'handover' or 'qc'
    const [activeImage, setActiveImage] = useState(null); // Lightbox popup image

    const handleOpenDetailModal = async (delivery) => {
        setSelectedDelivery(delivery);
        setIsDetailModalOpen(true);
        setModalLoading(true);
        setModalTab('handover');
        try {
            const detailData = await deliveryService.getDeliveryDetail(delivery.id);
            setDeliveryDetail(detailData);
            
            try {
                const qcData = await deliveryService.getQCDetailedResult(delivery.id);
                setQcDetail(qcData);
            } catch (qcErr) {
                console.error("Lỗi khi tải thông tin QC:", qcErr);
                setQcDetail(null);
            }
        } catch (err) {
            console.error("Lỗi khi tải chi tiết bàn giao:", err);
            setDeliveryDetail(null);
        } finally {
            setModalLoading(false);
        }
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedDelivery(null);
        setDeliveryDetail(null);
        setQcDetail(null);
        setActiveImage(null);
    };

    const getCategoryLabel = (tag) => {
        switch (tag) {
            case 'qc_moisture': return 'Độ ẩm';
            case 'qc_bend': return 'Độ cong';
            case 'qc_size': return 'Kích thước';
            case 'qc_structure': return 'Kết cấu';
            case 'qc_visual': return 'Bám dính sơn';
            case 'qc_accessories': return 'Phụ kiện';
            case 'qc_visual_ext': return 'Ngoại quan';
            case 'qc_functional': return 'Tính năng';
            case 'qc_general': return 'QC Chung';
            default: return tag ? tag.replace('qc_', '').toUpperCase() : 'Ảnh minh chứng';
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await deliveryService.getAllDeliveries();
            setDeliveries(data);

            // Tính toán thống kê từ dữ liệu thực
            const total = data.length;
            const completed = data.filter(d => d.status === 'Hoàn thành' || d.status === 'Đã Nhận Hàng').length;
            const pending = data.filter(d => d.status === 'Chờ Nhận Hàng' || d.status === 'Chờ Xác Nhận').length;
            const error = data.filter(d => d.quantity_returned > 0 || d.status === 'Lỗi').length;

            setStats({ total, completed, pending, error });
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu bàn giao:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Hoàn thành':
            case 'Đã Nhận Hàng':
                return { bg: '#E8F5E9', color: '#2E7D32', label: 'HOÀN THÀNH' };
            case 'Chờ Nhận Hàng':
            case 'Chờ Xác Nhận':
                return { bg: '#FFF3E0', color: '#E65100', label: 'CHỜ NHẬN' };
            case 'Lỗi':
            case 'Từ chối':
                return { bg: '#FFEBEE', color: '#C62828', label: 'LỖI/TRẢ' };
            default:
                return { bg: '#F5F5F5', color: '#757575', label: (status || 'KHÔNG RÕ').toUpperCase() };
        }
    };

    const getRowBgColor = (row) => {
        if (row.quantity_returned > 0 || row.status === 'Lỗi') return '#FFEBEE';
        if (row.status === 'Hoàn thành' || row.status === 'Đã Nhận Hàng') return '#E8F5E9';
        return '#FFFFFF';
    };

    const deliveryStages = ['all', ...new Set(deliveries.map(d => d.delivery_stage).filter(Boolean))];
    const receivingStages = ['all', ...new Set(deliveries.map(d => d.receiving_stage).filter(Boolean))];

    const filteredDeliveries = deliveries.filter(row => {
        // 1. Status Filter
        if (filterStatus !== 'all') {
            const statusInfo = getStatusStyle(row.status);
            if (filterStatus === 'completed' && statusInfo.label !== 'HOÀN THÀNH') return false;
            if (filterStatus === 'pending' && statusInfo.label !== 'CHỜ NHẬN') return false;
            if (filterStatus === 'error' && statusInfo.label !== 'LỖI/TRẢ') return false;
        }

        // 2. Delivery Stage Filter
        if (selectedDeliveryStage !== 'all' && row.delivery_stage !== selectedDeliveryStage) return false;

        // 3. Receiving Stage Filter
        if (selectedReceivingStage !== 'all' && row.receiving_stage !== selectedReceivingStage) return false;

        // 4. Search Term Filter
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            const matchId = `bg-${row.id}`.toLowerCase().includes(term);
            const matchPartName = (row.part_name || '').toLowerCase().includes(term);
            const matchStageIn = (row.delivery_stage || '').toLowerCase().includes(term);
            const matchStageOut = (row.receiving_stage || '').toLowerCase().includes(term);
            const matchSender = (row.sx_delivery_name || '').toLowerCase().includes(term);
            const matchReceiver = (row.sx_receipt_name || '').toLowerCase().includes(term);
            
            return matchId || matchPartName || matchStageIn || matchStageOut || matchSender || matchReceiver;
        }

        return true;
    });


    return (
        <div className="manufacture-plan-container">
            
            {/* ── STICKY TOP ZONE (Desktop: filters + stats-grid; Mobile: stats-strip + filters) ── */}
            <div className="sticky-top-zone">
                {/* Desktop/Mobile Toolbar filters */}
                <div className="mgmt-toolbar card" style={{ width: '100%', marginBottom: 0 }}>
                    <div className="toolbar-left" style={{ flex: 1 }}>
                        <div className="search-wrapper">
                            <Search size={16} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm phiếu, chi tiết..." 
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: '8px', border: '1px solid #EFEBE9', fontSize: '13px', outline: 'none' }}
                            />
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
                    </div>

                    {/* Tạm ẩn bộ lọc chặng theo yêu cầu */}
                    {/* <div className="toolbar-right desktop-only">
                        <div style={{ position: 'relative', minWidth: '160px' }}>
                            <select 
                                value={selectedDeliveryStage} 
                                onChange={(e) => { setSelectedDeliveryStage(e.target.value); setCurrentPage(1); }}
                                style={{ width: '100%', padding: '10px 30px 10px 15px', borderRadius: '12px', border: '1px solid #EFEBE9', background: '#FFFFFF', fontSize: '13px', fontWeight: '800', color: '#3E2723', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                            >
                                <option value="all">Chặng giao (Tất cả)</option>
                                {deliveryStages.filter(s => s !== 'all').map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63', pointerEvents: 'none' }} />
                        </div>

                        <div style={{ position: 'relative', minWidth: '160px' }}>
                            <select 
                                value={selectedReceivingStage} 
                                onChange={(e) => { setSelectedReceivingStage(e.target.value); setCurrentPage(1); }}
                                style={{ width: '100%', padding: '10px 30px 10px 15px', borderRadius: '12px', border: '1px solid #EFEBE9', background: '#FFFFFF', fontSize: '13px', fontWeight: '800', color: '#3E2723', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                            >
                                <option value="all">Chặng nhận (Tất cả)</option>
                                {receivingStages.filter(s => s !== 'all').map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63', pointerEvents: 'none' }} />
                        </div>
                    </div> */}
                </div>

                {/* Desktop Stats Grid */}
                <div className="stats-grid animate-card-entrance desktop-only" style={{ marginTop: '16px' }}>
                    {[
                        { id: 'all', label: 'TỔNG SỐ PHIẾU', value: `${stats.total} Phiếu`, sub: 'Cập nhật thời gian thực', bg: '#F5F5F5', color: '#424242' },
                        { id: 'completed', label: 'ĐÃ HOÀN THÀNH', value: stats.completed, sub: `${stats.total > 0 ? Math.round((stats.completed/stats.total)*100) : 0}% tổng số`, bg: '#E8F5E9', color: '#2E7D32' },
                        { id: 'pending', label: 'ĐANG CHỜ NHẬN', value: stats.pending, sub: 'Cần xác nhận', bg: '#FFF3E0', color: '#E65100' },
                        { id: 'error', label: 'PHIẾU LỖI/TRẢ', value: stats.error, sub: 'Cần xử lý gấp', bg: '#FFEBEE', color: '#C62828' },
                    ].map((stat, i) => {
                        const isActive = filterStatus === stat.id;
                        return (
                            <div 
                                key={i} 
                                className={`stat-card ${isActive ? 'active' : ''}`} 
                                style={{ 
                                    background: isActive ? stat.color : stat.bg, 
                                    color: isActive ? '#fff' : '#1e293b',
                                    boxShadow: isActive ? '0 4px 12px rgba(123, 82, 51, 0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: isActive ? `1px solid ${stat.color}` : '1px solid transparent'
                                }}
                                onClick={() => { setFilterStatus(stat.id); setCurrentPage(1); }}
                            >
                                <p className="stat-title" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : '#64748b' }}>{stat.label}</p>
                                <h3 className="stat-value" style={{ color: isActive ? '#fff' : stat.color }}>{stat.value}</h3>
                                <p style={{ margin: 0, fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.7)' : '#9E9E9E', fontWeight: '500' }}>{stat.sub}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Mobile Stats Strip */}
                <div className="stats-strip mobile-only">
                    {[
                        { id: 'all', label: 'TỔNG PHIẾU', value: stats.total, color: '#424242' },
                        { id: 'completed', label: 'HOÀN THÀNH', value: stats.completed, color: '#2E7D32' },
                        { id: 'pending', label: 'CHỜ NHẬN', value: stats.pending, color: '#E65100' },
                        { id: 'error', label: 'LỖI/TRẢ', value: stats.error, color: '#C62828' }
                    ].map((stat, idx) => {
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
                                    {stat.value}
                                </span>
                                <span className="strip-label" style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#8D6E63' }}>
                                    {stat.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Desktop list block */}
            <div className="admin-list-layout desktop-only">
                <div className="mgmt-table admin-table-card card-shadow" style={{ background: 'white' }}>
                    <div className="admin-table-scroll">
                        <table className="manufacture-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center' }}>STT</th>
                                    <th>Mã phiếu</th>
                                    <th>Tên chi tiết</th>
                                    <th>Công đoạn vào</th>
                                    <th>Công đoạn ra</th>
                                    <th>SL Giao</th>
                                    <th>SL Nhận</th>
                                    <th>SL Trả</th>
                                    <th>Trạng thái</th>
                                    <th>Thời gian</th>
                                    <th>Người giao</th>
                                    <th>Người nhận</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="13" style={{ padding: '50px', textAlign: 'center', color: '#757575' }}>Đang tải dữ liệu...</td></tr>
                                ) : filteredDeliveries.length === 0 ? (
                                    <tr><td colSpan="13" style={{ padding: '50px', textAlign: 'center', color: '#757575' }}>Không có dữ liệu bàn giao.</td></tr>
                                ) : filteredDeliveries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, idx) => {
                                    const statusInfo = getStatusStyle(row.status);
                                    return (
                                        <tr key={row.id} className="animate-card-entrance">
                                            <td data-label="STT" style={{ textAlign: 'center' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                            <td data-label="Mã phiếu" style={{ fontWeight: '700', color: '#3E2723' }}>BG-{row.id}</td>
                                            <td data-label="Tên chi tiết" style={{ color: '#424242' }}>{row.part_name || 'N/A'}</td>
                                            <td data-label="Công đoạn vào">{row.delivery_stage}</td>
                                            <td data-label="Công đoạn ra">{row.receiving_stage}</td>
                                            <td data-label="SL Giao" style={{ fontWeight: '800' }}>{row.quantity_total}</td>
                                            <td data-label="SL Nhận" style={{ fontWeight: '800', color: '#2E7D32' }}>{row.quantity_received}</td>
                                            <td data-label="SL Trả" style={{ color: row.quantity_returned > 0 ? '#C62828' : '#757575' }}>{row.quantity_returned}</td>
                                            <td data-label="Trạng thái">
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    borderRadius: '20px', 
                                                    fontSize: '11px', 
                                                    background: statusInfo.bg, 
                                                    color: statusInfo.color, 
                                                    fontWeight: '800' 
                                                }}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td data-label="Thời gian" style={{ fontSize: '12px', color: '#757575' }}>
                                                {row.created_at ? new Date(row.created_at).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : 'N/A'}
                                            </td>
                                            <td data-label="Người giao">{row.sx_delivery_name || 'N/A'}</td>
                                            <td data-label="Người nhận">{row.sx_receipt_name || '---'}</td>
                                            <td data-label="Thao tác">
                                                <span 
                                                    onClick={() => handleOpenDetailModal(row)}
                                                    style={{ fontSize: '13px', color: '#5D4037', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    Chi tiết
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="admin-pagination-desktop">
                        <div style={{ fontSize: '14px', color: '#424242' }}>
                            Hiển thị <b>{filteredDeliveries.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredDeliveries.length)}</b> trên <b>{filteredDeliveries.length}</b> kết quả
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                &lt; Trước
                            </button>
                            <button className="page-btn active">{currentPage}</button>
                            <button 
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                disabled={currentPage * itemsPerPage >= filteredDeliveries.length}
                            >
                                Sau &gt;
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile list view */}
            <div className="mobile-only manufacture-cards-scroll">
                <div className="manufacture-cards-container">
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu...</div>
                    ) : filteredDeliveries.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu bàn giao.</div>
                    ) : (
                        filteredDeliveries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row) => {
                            const statusInfo = getStatusStyle(row.status);
                            let cardStatusClass = 'pending';
                            if (statusInfo.label === 'HOÀN THÀNH') cardStatusClass = 'completed';
                            else if (statusInfo.label === 'LỖI/TRẢ') cardStatusClass = 'overdue';
                            
                            return (
                                <div 
                                    key={row.id} 
                                    className={`plan-mobile-card status-${cardStatusClass} card-shadow animate-card-entrance`} 
                                    onClick={() => handleOpenDetailModal(row)}
                                >
                                    <div className="card-header">
                                        <span className="card-khsx" style={{ fontWeight: '800' }}>BG-{row.id}</span>
                                        <span className="status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2D1A12' }}>
                                            {row.part_name || 'N/A'}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                            <span>Giao: {row.delivery_stage} ({row.quantity_total})</span>
                                            <span>Nhận: {row.receiving_stage} ({row.quantity_received})</span>
                                        </div>
                                        {row.quantity_returned > 0 && (
                                            <div style={{ fontSize: '0.8rem', color: '#C62828', fontWeight: '700', marginTop: '2px' }}>
                                                Trả lại: {row.quantity_returned} chiếc
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #FAF6F0', paddingTop: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#9E9E9E', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} color="#8D6E63" /> 
                                            {row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '---'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#7B5233', fontWeight: '700' }}>Chi tiết ›</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Mobile Sticky Pagination */}
            <div className="pagination-mobile-sticky mobile-only">
                <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                    <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {Math.ceil(filteredDeliveries.length / itemsPerPage) || 1}</span>
                <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredDeliveries.length / itemsPerPage)))} disabled={currentPage >= Math.ceil(filteredDeliveries.length / itemsPerPage)}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Modal Overlay / Backdrop - Desktop only */}
            {isDetailModalOpen && (
                <div 
                    className="modal-backdrop desktop-only" 
                    style={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        backgroundColor: 'rgba(45, 26, 18, 0.55)', 
                        backdropFilter: 'blur(5px)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        zIndex: 1100, 
                        padding: '20px' 
                    }}
                    onClick={handleCloseDetailModal}
                >
                    <div 
                        className="modal-container" 
                        style={{ 
                            background: '#FFFFFF', 
                            width: '1000px', 
                            maxWidth: '95%', 
                            height: '90vh', 
                            maxHeight: '900px', 
                            borderRadius: '20px', 
                            boxShadow: '0 25px 50px -12px rgba(45, 26, 18, 0.25)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            overflow: 'hidden' 
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ 
                            background: 'linear-gradient(135deg, #2D1A12 0%, #5D4037 100%)', 
                            padding: '16px 24px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            color: 'white' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ 
                                    padding: '4px 10px', 
                                    borderRadius: '8px', 
                                    background: 'rgba(255, 255, 255, 0.15)', 
                                    fontSize: '13px', 
                                    fontWeight: '800', 
                                    letterSpacing: '0.5px' 
                                }}>
                                    PHIẾU BG-{selectedDelivery?.id}
                                </span>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white' }}>
                                    {selectedDelivery?.part_name || 'Chi tiết bàn giao'}
                                </h3>
                            </div>
                            <button 
                                onClick={handleCloseDetailModal} 
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'white', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    padding: '6px', 
                                    borderRadius: '50%', 
                                    backgroundColor: 'rgba(255,255,255,0.1)', 
                                    transition: 'background 0.2s' 
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Tabs Bar */}
                        <div style={{ 
                            display: 'flex', 
                            borderBottom: '1px solid #EADCC9', 
                            background: '#FAF8F6', 
                            padding: '0 16px' 
                        }}>
                            <button 
                                onClick={() => setModalTab('handover')}
                                style={{ 
                                    padding: '16px 20px', 
                                    background: 'none', 
                                    border: 'none', 
                                    borderBottom: modalTab === 'handover' ? '3px solid #7B5233' : '3px solid transparent', 
                                    color: modalTab === 'handover' ? '#7B5233' : '#757575', 
                                    fontWeight: '700', 
                                    fontSize: '14px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Layers size={16} />
                                Bàn Giao & PO Đơn Hàng
                            </button>
                            <button 
                                onClick={() => setModalTab('qc')}
                                style={{ 
                                    padding: '16px 20px', 
                                    background: 'none', 
                                    border: 'none', 
                                    borderBottom: modalTab === 'qc' ? '3px solid #7B5233' : '3px solid transparent', 
                                    color: modalTab === 'qc' ? '#7B5233' : '#757575', 
                                    fontWeight: '700', 
                                    fontSize: '14px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <CheckCircle2 size={16} />
                                Kết Quả Kiểm Tra QC (Đầu Vào)
                            </button>
                        </div>

                        {/* Modal Body Container */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#FDFBF9' }}>
                            {modalLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                                    <div className="spinner"></div>
                                    <span style={{ fontSize: '13px', color: '#8D6E63', fontWeight: '700' }}>Đang tải thông tin chi tiết...</span>
                                </div>
                            ) : modalTab === 'handover' ? (
                                <div>
                                    {/* 1. General Info Grid */}
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                        THÔNG TIN CHUNG
                                    </h4>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                        gap: '16px', 
                                        marginBottom: '24px',
                                        background: 'white',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: '1px solid #EADCC9'
                                    }}>
                                        {[
                                            { label: 'Mã phiếu', value: `BG-${deliveryDetail?.id}`, icon: <FileText size={16} color="#8D6E63" /> },
                                            { label: 'Linh kiện/Tên chi tiết', value: deliveryDetail?.part_name || 'N/A', icon: <Layers size={16} color="#8D6E63" /> },
                                            { label: 'Quy cách kỹ thuật', value: deliveryDetail?.specification || '---', icon: <Info size={16} color="#8D6E63" /> },
                                            { label: 'Kế hoạch sản xuất', value: deliveryDetail?.plan_id ? `KH-${deliveryDetail.plan_id}` : '---', icon: <FileSpreadsheet size={16} color="#8D6E63" /> },
                                            { label: 'Công đoạn vận chuyển', value: `${deliveryDetail?.delivery_stage || '---'} ➔ ${deliveryDetail?.receiving_stage || '---'}`, icon: <MapPin size={16} color="#8D6E63" /> },
                                            { label: 'Thời gian lập', value: deliveryDetail?.created_at ? new Date(deliveryDetail.created_at).toLocaleString('vi-VN') : '---', icon: <Calendar size={16} color="#8D6E63" /> },
                                            { label: 'Người thực hiện giao', value: deliveryDetail?.sx_delivery_name || 'N/A', icon: <User size={16} color="#8D6E63" /> },
                                            { label: 'Người tiếp nhận', value: deliveryDetail?.sx_receipt_name || '---', icon: <User size={16} color="#8D6E63" /> },
                                            { label: 'Mã QR dự phòng', value: deliveryDetail?.backup_qr || 'Không có', icon: <Activity size={16} color="#8D6E63" /> },
                                        ].map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                <div style={{ marginTop: '3px' }}>{item.icon}</div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</div>
                                                    <div style={{ fontSize: '13px', color: '#2D1A12', fontWeight: '800', marginTop: '2px' }}>{item.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid #FAF6F0', paddingTop: '10px' }}>
                                            <div style={{ marginTop: '2px' }}><Info size={16} color="#8D6E63" /></div>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>Ghi chú bàn giao</div>
                                                <div style={{ fontSize: '13px', color: '#5D4037', fontWeight: '600', fontStyle: 'italic', marginTop: '2px' }}>
                                                    {deliveryDetail?.note || 'Không có ghi chú nào từ công đoạn giao.'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Quantities Grid */}
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                        SỐ LƯỢNG THỰC TẾ
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                                        {[
                                            { label: 'SL GIAO TỔNG', value: deliveryDetail?.quantity_total, color: '#7B5233', bg: '#FAF6F0' },
                                            { label: 'SL THỰC NHẬN', value: deliveryDetail?.quantity_received, color: '#2E7D32', bg: '#E8F5E9' },
                                            { label: 'SL TRẢ LẠI (QC)', value: deliveryDetail?.quantity_returned, color: '#C62828', bg: '#FFEBEE' },
                                            { label: 'SL LỖI (QC)', value: deliveryDetail?.quantity_error, color: '#EF6C00', bg: '#FFF3E0' },
                                            { label: 'SL THỰC KIỂM (QC)', value: deliveryDetail?.quantity_inspection || 0, color: '#1565C0', bg: '#E3F2FD' },
                                            { label: 'PHẾ PHẨM / DƯ', value: deliveryDetail?.residual || 0, color: '#616161', bg: '#F5F5F5' },
                                        ].map((qty, idx) => (
                                            <div key={idx} style={{ 
                                                background: qty.bg, 
                                                padding: '12px', 
                                                borderRadius: '10px', 
                                                textAlign: 'center',
                                                border: `1px solid ${qty.color}20`
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#757575', fontWeight: '800', letterSpacing: '0.5px' }}>{qty.label}</div>
                                                <div style={{ fontSize: '20px', fontWeight: '900', color: qty.color, marginTop: '5px' }}>{qty.value !== null ? qty.value : '---'}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 3. PO allocation details */}
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                        PHÂN BỔ ĐƠN HÀNG (FIFO / PO CHI TIẾT)
                                    </h4>
                                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', overflow: 'hidden', marginBottom: '24px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#FAF6F0', textAlign: 'left', borderBottom: '1px solid #EADCC9' }}>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800', width: '50px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Số PO đối tác</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Mã đơn hàng</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Lệnh sản xuất</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Khách hàng</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Sản phẩm đơn hàng</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800', textAlign: 'right' }}>Số lượng</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {!deliveryDetail?.details || deliveryDetail.details.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#8D6E63', fontWeight: '700', fontStyle: 'italic' }}>
                                                            Không có thông tin phân bổ PO cụ thể (Hàng dư thừa ngoài kế hoạch hoặc không liên kết đơn hàng).
                                                        </td>
                                                    </tr>
                                                ) : deliveryDetail.details.map((detail, dIdx) => (
                                                    <tr key={detail.id || dIdx} style={{ borderBottom: '1px solid #FAF6F0' }}>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'center' }}>{dIdx + 1}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '800', color: '#7B5233' }}>{detail.partner_po || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '700' }}>{detail.order_code || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px' }}>{detail.production_code || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px' }}>{detail.customer || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#555' }}>{detail.product_names || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '800', textAlign: 'right', color: '#2D1A12' }}>{detail.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* 4. Handover evidence images */}
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                        ẢNH MINH CHỨNG BÀN GIAO
                                    </h4>
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '12px', 
                                        flexWrap: 'wrap', 
                                        background: 'white', 
                                        padding: '16px', 
                                        borderRadius: '12px', 
                                        border: '1px solid #EADCC9' 
                                    }}>
                                        {!deliveryDetail?.images || deliveryDetail.images.filter(img => !img.description?.startsWith('qc_')).length === 0 ? (
                                            <span style={{ fontSize: '13px', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh bàn giao nào được tải lên.</span>
                                        ) : (
                                            deliveryDetail.images.filter(img => !img.description?.startsWith('qc_')).map((img, imgIdx) => {
                                                const url = `${API_ROOT}${img.image_path.replace(/^\//, '')}`;
                                                return (
                                                    <div 
                                                        key={imgIdx} 
                                                        onClick={() => setActiveImage(url)}
                                                        style={{ 
                                                            width: '120px', 
                                                            height: '90px', 
                                                            borderRadius: '8px', 
                                                            overflow: 'hidden', 
                                                            border: '1px solid #EADCC9', 
                                                            cursor: 'zoom-in',
                                                            position: 'relative',
                                                            transition: 'transform 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        <img src={url} alt={img.description || 'Handover Proof'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(45,26,18,0.75)', color: 'white', fontSize: '9px', textAlign: 'center', padding: '2px 0' }}>
                                                            {img.description || 'Ảnh giao'}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {/* Tab QC inspection results */}
                                    {!qcDetail || !qcDetail.qc_info ? (
                                        <div style={{ 
                                            background: '#FAF6F0', 
                                            border: '2px dashed #EADCC9', 
                                            borderRadius: '16px', 
                                            padding: '40px', 
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '15px'
                                        }}>
                                            <AlertCircle size={48} color="#D97706" />
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#5D4037' }}>
                                                Chưa có thông tin kiểm định chất lượng (QC)
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#8D6E63', maxWidth: '450px', lineHeight: '1.5' }}>
                                                Phiếu này chưa được QC tiếp nhận đo đạc chất lượng hoặc đang trong quá trình kiểm tra. Các số liệu độ ẩm, độ cong, kích thước và ảnh lỗi sẽ xuất hiện tại đây sau khi lưu.
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* 1. QC General Info */}
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                gap: '16px', 
                                                marginBottom: '24px',
                                                background: 'white',
                                                padding: '16px',
                                                borderRadius: '12px',
                                                border: '1px solid #EADCC9'
                                            }}>
                                                {[
                                                    { label: 'Người kiểm định QC', value: deliveryDetail?.qc_receipt_name || 'N/A', icon: <User size={16} color="#8D6E63" /> },
                                                    { label: 'Thời gian kiểm định', value: qcDetail.qc_info.created_at ? new Date(qcDetail.qc_info.created_at).toLocaleString('vi-VN') : '---', icon: <Calendar size={16} color="#8D6E63" /> },
                                                    { 
                                                        label: 'KẾT LUẬN QC CHUNG', 
                                                        value: (deliveryDetail?.quantity_returned > 0 || deliveryDetail?.status === 'Lỗi' || deliveryDetail?.status === 'Từ chối') ? 'KHÔNG ĐẠT / TRẢ HÀNG' : 'ĐẠT CHẤT LƯỢNG', 
                                                        color: (deliveryDetail?.quantity_returned > 0 || deliveryDetail?.status === 'Lỗi' || deliveryDetail?.status === 'Từ chối') ? '#C62828' : '#2E7D32',
                                                        icon: <Activity size={16} color="#8D6E63" /> 
                                                    },
                                                ].map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                        <div style={{ marginTop: '3px' }}>{item.icon}</div>
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</div>
                                                            <div style={{ fontSize: '13px', color: item.color || '#2D1A12', fontWeight: '800', marginTop: '2px' }}>{item.value}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid #FAF6F0', paddingTop: '10px' }}>
                                                    <div style={{ marginTop: '2px' }}><Info size={16} color="#8D6E63" /></div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>Ghi chú kiểm định QC</div>
                                                        <div style={{ fontSize: '13px', color: '#5D4037', fontWeight: '600', fontStyle: 'italic', marginTop: '2px' }}>
                                                            {qcDetail.qc_info.note || 'Không có ghi chú kiểm định chất lượng.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. Detailed QC Items Checklists */}
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                                CHI TIẾT CÁC HẠNG MỤC KIỂM TRA ĐẦU VÀO
                                            </h4>
                                            
                                            {(() => {
                                                let results = {};
                                                try {
                                                    results = typeof qcDetail.qc_info.results_json === 'string' 
                                                        ? JSON.parse(qcDetail.qc_info.results_json) 
                                                        : (qcDetail.qc_info.results_json || {});
                                                } catch (e) {
                                                    console.error("Lỗi khi parse results_json:", e);
                                                }

                                                const getPassBadge = (isPass) => {
                                                    if (isPass === null || isPass === undefined) return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: '#F5F5F5', color: '#757575', fontWeight: '700' }}>CHƯA KIỂM</span>;
                                                    return isPass ? (
                                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: '#E8F5E9', color: '#2E7D32', fontWeight: '800' }}>ĐẠT</span>
                                                    ) : (
                                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: '#FFEBEE', color: '#C62828', fontWeight: '800' }}>HỎNG/LỖI</span>
                                                    );
                                                };

                                                return (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                                        {/* Moisture */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6F0', paddingBottom: '6px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Droplet size={14} color="#7B5233" />
                                                                    1. Độ ẩm (Moisture)
                                                                </span>
                                                                {getPassBadge(results.moisture?.is_pass)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ ẩm tối thiểu đo được: <b>{results.moisture?.min ? `${results.moisture.min}%` : '---'}</b>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ ẩm tối đa đo được: <b>{results.moisture?.max ? `${results.moisture.max}%` : '---'}</b>
                                                            </div>
                                                        </div>

                                                        {/* Bend */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6F0', paddingBottom: '6px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Activity size={14} color="#7B5233" />
                                                                    2. Độ cong vênh (Bend)
                                                                </span>
                                                                {getPassBadge(results.bend?.is_pass)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ cong tối thiểu: <b>{results.bend?.min ? `${results.bend.min} mm` : '---'}</b>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ cong tối đa: <b>{results.bend?.max ? `${results.bend.max} mm` : '---'}</b>
                                                            </div>
                                                        </div>

                                                        {/* Size */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6F0', paddingBottom: '6px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Maximize2 size={14} color="#7B5233" />
                                                                    3. Kích thước (Size check)
                                                                </span>
                                                                {getPassBadge(results.size?.is_pass)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Chiều Dài: <b>{results.size?.long ? `${results.size.long} mm` : '---'}</b> | Chiều Rộng: <b>{results.size?.wide ? `${results.size.wide} mm` : '---'}</b>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Chiều Dày: <b>{results.size?.thick ? `${results.size.thick} mm` : '---'}</b>
                                                            </div>
                                                        </div>

                                                        {/* Structure */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6F0', paddingBottom: '6px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Layers size={14} color="#7B5233" />
                                                                    4. Kết cấu sản phẩm
                                                                </span>
                                                                {getPassBadge(results.structure?.is_pass)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ cong góc: <b>{results.structure?.bend ? `${results.structure.bend} mm` : '---'}</b>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Mặt Rộng: <b>{results.structure?.wide ? `${results.structure.wide} mm` : '---'}</b> | Mặt Cao: <b>{results.structure?.high ? `${results.structure.high} mm` : '---'}</b>
                                                            </div>
                                                        </div>

                                                        {/* Visual & Others */}
                                                        {[
                                                            { label: '5. Bám dính sơn (Visual)', isPass: results.visual?.is_pass },
                                                            { label: '6. Bộ phụ kiện đi kèm (Accessories)', isPass: results.accessories?.is_pass },
                                                            { label: '7. Ngoại quan bề mặt (Visual Ext)', isPass: results.visual_ext?.is_pass },
                                                            { label: '8. Tính năng sản phẩm (Functional)', isPass: results.functional?.is_pass },
                                                        ].map((extraCheck, ecIdx) => (
                                                            <div key={ecIdx} style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <CheckCircle2 size={14} color="#7B5233" />
                                                                    {extraCheck.label}
                                                                </span>
                                                                {getPassBadge(extraCheck.isPass)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                            {/* 3. QC Evidence Images */}
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                                ẢNH MINH CHỨNG KIỂM ĐỊNH (QC)
                                            </h4>
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: '12px', 
                                                flexWrap: 'wrap', 
                                                background: 'white', 
                                                padding: '16px', 
                                                borderRadius: '12px', 
                                                border: '1px solid #EADCC9' 
                                            }}>
                                                {!qcDetail.images || qcDetail.images.length === 0 ? (
                                                    <span style={{ fontSize: '13px', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh lỗi / kiểm QC nào được đính kèm.</span>
                                                ) : (
                                                    qcDetail.images.map((img, imgIdx) => {
                                                        const url = `${API_ROOT}${img.image_path.replace(/^\//, '')}`;
                                                        return (
                                                            <div 
                                                                key={imgIdx} 
                                                                onClick={() => setActiveImage(url)}
                                                                style={{ 
                                                                    width: '120px', 
                                                                    height: '90px', 
                                                                    borderRadius: '8px', 
                                                                    overflow: 'hidden', 
                                                                    border: '1px solid #EADCC9', 
                                                                    cursor: 'zoom-in',
                                                                    position: 'relative',
                                                                    transition: 'transform 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            >
                                                                <img src={url} alt={img.description || 'QC Proof'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(198,40,40,0.85)', color: 'white', fontSize: '9px', textAlign: 'center', padding: '2px 0', fontWeight: '700' }}>
                                                                    {getCategoryLabel(img.description)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{ 
                            padding: '12px 24px', 
                            borderTop: '1px solid #EADCC9', 
                            background: '#FAF6F0', 
                            display: 'flex', 
                            justifyContent: 'flex-end' 
                        }}>
                            <button 
                                onClick={handleCloseDetailModal}
                                style={{ 
                                    padding: '8px 18px', 
                                    background: '#7B5233', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    fontSize: '13px', 
                                    fontWeight: '700', 
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5D4037'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
                            >
                                Đóng lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Sheet Modal */}
            {isDetailModalOpen && (
                <div className="bottom-sheet-backdrop mobile-only" onClick={handleCloseDetailModal}>
                    <div className="bottom-sheet-container bottom-sheet-full" onClick={e => e.stopPropagation()} style={{ padding: '20px 16px' }}>
                        <div className="bottom-sheet-handle"></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f5f5f5', fontSize: '0.75rem', fontWeight: '800', color: '#5D4037' }}>
                                    BG-{selectedDelivery?.id}
                                </span>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#5D4037' }}>
                                    {selectedDelivery?.part_name || 'Chi tiết bàn giao'}
                                </h3>
                            </div>
                            <button onClick={handleCloseDetailModal} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
                        </div>

                        {/* Tabs bar */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #EADCC9', marginBottom: '16px' }}>
                            <button 
                                onClick={() => setModalTab('handover')}
                                style={{ 
                                    flex: 1, padding: '12px', background: 'none', border: 'none', 
                                    borderBottom: modalTab === 'handover' ? '2px solid #7B5233' : '2px solid transparent', 
                                    color: modalTab === 'handover' ? '#7B5233' : '#757575', fontWeight: '700', fontSize: '0.85rem' 
                                }}
                            >
                                Bàn Giao & PO
                            </button>
                            <button 
                                onClick={() => setModalTab('qc')}
                                style={{ 
                                    flex: 1, padding: '12px', background: 'none', border: 'none', 
                                    borderBottom: modalTab === 'qc' ? '2px solid #7B5233' : '2px solid transparent', 
                                    color: modalTab === 'qc' ? '#7B5233' : '#757575', fontWeight: '700', fontSize: '0.85rem' 
                                }}
                            >
                                Kiểm Tra QC
                            </button>
                        </div>

                        {modalLoading ? (
                            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                                <div style={{ fontSize: '0.8rem', color: '#8D6E63' }}>Đang tải...</div>
                            </div>
                        ) : modalTab === 'handover' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* General info */}
                                <div style={{ background: '#FAF8F6', padding: '12px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                    {[
                                        ['Người giao', deliveryDetail?.sx_delivery_name || 'N/A'],
                                        ['Người nhận', deliveryDetail?.sx_receipt_name || '---'],
                                        ['Thời gian', deliveryDetail?.created_at ? new Date(deliveryDetail.created_at).toLocaleString('vi-VN') : '---'],
                                        ['Chặng giao', `${deliveryDetail?.delivery_stage || '---'} ➔ ${deliveryDetail?.receiving_stage || '---'}`],
                                        ['Ghi chú', deliveryDetail?.note || 'Không có ghi chú']
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fcfcfc', fontSize: '0.8rem' }}>
                                            <span style={{ color: '#8D6E63' }}>{k}</span>
                                            <span style={{ fontWeight: '700', color: '#2D1A12' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Quantities */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {[
                                        ['GIAO', deliveryDetail?.quantity_total, '#7B5233', '#FAF6F0'],
                                        ['NHẬN', deliveryDetail?.quantity_received, '#2E7D32', '#E8F5E9'],
                                        ['TRẢ', deliveryDetail?.quantity_returned, '#C62828', '#FFEBEE']
                                    ].map(([lbl, val, col, bg]) => (
                                        <div key={lbl} style={{ background: bg, padding: '8px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${col}20` }}>
                                            <div style={{ fontSize: '0.65rem', color: '#757575', fontWeight: '800' }}>{lbl}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: col, marginTop: '2px' }}>{val !== null ? val : '---'}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* PO Allocations */}
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>PHÂN BỔ ĐƠN HÀNG</div>
                                    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden' }}>
                                        {!deliveryDetail?.details || deliveryDetail.details.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: '#8D6E63', fontStyle: 'italic' }}>Không có phân bổ PO.</div>
                                        ) : (
                                            deliveryDetail.details.map((detail, dIdx) => (
                                                <div key={dIdx} style={{ padding: '8px 12px', borderBottom: '1px solid #FAF6F0', fontSize: '0.75rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                                                        <span style={{ color: '#7B5233' }}>PO: {detail.partner_po || '---'}</span>
                                                        <span style={{ color: '#2D1A12' }}>SL: {detail.quantity}</span>
                                                    </div>
                                                    <div style={{ color: '#666', marginTop: '2px' }}>Đơn: {detail.order_code || '---'} | KH: {detail.customer || '---'}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Evidence Images */}
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>ẢNH MINH CHỨNG GIAO</div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {!deliveryDetail?.images || deliveryDetail.images.filter(img => !img.description?.startsWith('qc_')).length === 0 ? (
                                            <span style={{ fontSize: '0.75rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có ảnh.</span>
                                        ) : (
                                            deliveryDetail.images.filter(img => !img.description?.startsWith('qc_')).map((img, imgIdx) => {
                                                const url = `${API_ROOT}${img.image_path.replace(/^\//, '')}`;
                                                return (
                                                    <img key={imgIdx} src={url} alt="Proof" onClick={() => setActiveImage(url)} style={{ width: '70px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #EADCC9', cursor: 'zoom-in' }} />
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* QC Tab content */}
                                {!qcDetail || !qcDetail.qc_info ? (
                                    <div style={{ padding: '24px 12px', textAlign: 'center', background: '#FAF6F0', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '700' }}>Chưa có thông tin kiểm định QC</div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ background: '#FAF8F6', padding: '12px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                            {[
                                                ['QC kiểm tra', deliveryDetail?.qc_receipt_name || 'N/A'],
                                                ['Thời gian QC', qcDetail.qc_info.created_at ? new Date(qcDetail.qc_info.created_at).toLocaleString('vi-VN') : '---'],
                                                ['Kết luận', (deliveryDetail?.quantity_returned > 0 || deliveryDetail?.status === 'Lỗi') ? 'KHÔNG ĐẠT / TRẢ HÀNG' : 'ĐẠT CHẤT LƯỢNG']
                                            ].map(([k, v]) => (
                                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fcfcfc', fontSize: '0.8rem' }}>
                                                    <span style={{ color: '#8D6E63' }}>{k}</span>
                                                    <span style={{ fontWeight: '700', color: (k === 'Kết luận' && v.includes('KHÔNG')) ? '#C62828' : '#2E7D32' }}>{v}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Specs detailed list */}
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>THÔNG SỐ QC ĐO ĐẠC</div>
                                            {(() => {
                                                let results = {};
                                                try {
                                                    results = typeof qcDetail.qc_info.results_json === 'string' 
                                                        ? JSON.parse(qcDetail.qc_info.results_json) 
                                                        : (qcDetail.qc_info.results_json || {});
                                                } catch (e) {}

                                                const getPassText = (isPass) => {
                                                    if (isPass === null || isPass === undefined) return 'CHƯA KIỂM';
                                                    return isPass ? 'ĐẠT' : 'HỎNG/LỖI';
                                                };

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {[
                                                            ['1. Độ ẩm', results.moisture?.is_pass, `Min: ${results.moisture?.min || '---'}% | Max: ${results.moisture?.max || '---'}%`],
                                                            ['2. Độ cong vênh', results.bend?.is_pass, `Min: ${results.bend?.min || '---'}mm | Max: ${results.bend?.max || '---'}mm`],
                                                            ['3. Kích thước', results.size?.is_pass, `L: ${results.size?.long || '---'} | W: ${results.size?.wide || '---'} | T: ${results.size?.thick || '---'}`],
                                                            ['4. Kết cấu sản phẩm', results.structure?.is_pass, `Cong góc: ${results.structure?.bend || '---'} | Cao: ${results.structure?.high || '---'}`]
                                                        ].map(([lbl, pass, val]) => (
                                                            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 12px', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '0.75rem' }}>
                                                                <div>
                                                                    <div style={{ fontWeight: '700', color: '#5D4037' }}>{lbl}</div>
                                                                    <div style={{ color: '#666', marginTop: '2px' }}>{val}</div>
                                                                </div>
                                                                <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800', background: pass ? '#E8F5E9' : '#FFEBEE', color: pass ? '#2E7D32' : '#C62828' }}>
                                                                    {getPassText(pass)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* QC images */}
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>ẢNH KIỂM QC</div>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {!qcDetail.images || qcDetail.images.length === 0 ? (
                                                    <span style={{ fontSize: '0.75rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có ảnh QC.</span>
                                                ) : (
                                                    qcDetail.images.map((img, imgIdx) => {
                                                        const url = `${API_ROOT}${img.image_path.replace(/^\//, '')}`;
                                                        return (
                                                            <img key={imgIdx} src={url} alt="QC" onClick={() => setActiveImage(url)} style={{ width: '70px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #EADCC9', cursor: 'zoom-in' }} />
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        
                        <button className="btn btn-primary" onClick={handleCloseDetailModal} style={{ width: '100%', marginTop: '20px', padding: '12px' }}>
                            Đóng
                        </button>
                    </div>
                </div>
            )}

            {/* Lightbox Image Popup */}
            {activeImage && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20000,
                        cursor: 'zoom-out'
                    }}
                    onClick={() => setActiveImage(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <img src={activeImage} alt="Enlarged Proof" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                        <button 
                            onClick={() => setActiveImage(null)}
                            style={{ 
                                position: 'absolute', 
                                top: '-40px', 
                                right: '0px', 
                                background: 'white', 
                                border: 'none', 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={18} color="#000" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryTracking;
