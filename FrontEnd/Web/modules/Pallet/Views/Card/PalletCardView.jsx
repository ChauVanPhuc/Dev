import React, { useState, useEffect } from 'react';
import deliveryService from '@modules/Delivery/Models/delivery.service';
import { 
    Search, Filter, RefreshCw, AlertTriangle, 
    AlertCircle, Eye, FileDown, CheckCircle, 
    ArrowRight, ArrowUpRight, ArrowDownRight, 
    X, ChevronLeft, ChevronRight, Info, Calendar,
    User, Clipboard, Image as ImageIcon, Layers, Undo2
} from 'lucide-react';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';

const ExceptionDeliveries = () => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // ALL, LETH_THIEU, LECH_THUA, TRA_HANG, LOI_QC
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [deliveryDetail, setDeliveryDetail] = useState(null);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        lechThieu: 0, // Nhận < Giao
        lechThua: 0,  // Giao < Nhận
        traHang: 0,   // quantity_returned > 0
        loiQC: 0      // quantity_error > 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await deliveryService.getExceptionDeliveries();
            setDeliveries(data);
            
            // Calculate statistics
            const total = data.length;
            const lechThieu = data.filter(d => d.quantity_received < d.quantity_total).length;
            const lechThua = data.filter(d => d.quantity_received > d.quantity_total).length;
            const traHang = data.filter(d => d.quantity_returned > 0).length;
            const loiQC = data.filter(d => d.status === 'Lỗi' || d.quantity_error > 0).length;

            setStats({ total, lechThieu, lechThua, traHang, loiQC });
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu phiếu ngoại lệ:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (delivery) => {
        setSelectedDelivery(delivery);
        setDetailLoading(true);
        try {
            const res = await deliveryService.getDeliveryDetail(delivery.id);
            setDeliveryDetail(res);
        } catch (error) {
            console.error("Lỗi khi tải chi tiết phiếu bàn giao:", error);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetailModal = () => {
        setSelectedDelivery(null);
        setDeliveryDetail(null);
    };

    // Filter and search logic
    const filteredDeliveries = deliveries.filter(item => {
        // Search filter
        const matchSearch = 
            (item.delivery_code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (item.part_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (item.note?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (item.id?.toString() || '').includes(searchQuery);

        if (!matchSearch) return false;

        // Exception type filter
        if (filterType === 'LECH_THIEU') {
            return item.quantity_received < item.quantity_total;
        }
        if (filterType === 'LECH_THUA') {
            return item.quantity_received > item.quantity_total;
        }
        if (filterType === 'TRA_HANG') {
            return item.quantity_returned > 0;
        }
        if (filterType === 'LOI_QC') {
            return item.status === 'Lỗi' || item.quantity_error > 0;
        }

        return true;
    });

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredDeliveries.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Get Exception Badges for a row
    const getExceptionBadges = (row) => {
        const badges = [];
        if (row.quantity_received < row.quantity_total) {
            badges.push({ text: 'Lệch Thiếu (Nhận < Giao)', color: '#EF4444', bg: '#FEE2E2', icon: <ArrowDownRight size={14} /> });
        }
        if (row.quantity_received > row.quantity_total) {
            badges.push({ text: 'Lệch Thừa (Giao < Nhận)', color: '#3B82F6', bg: '#DBEAFE', icon: <ArrowUpRight size={14} /> });
        }
        if (row.quantity_returned > 0) {
            badges.push({ text: 'Trả Hàng QC', color: '#D97706', bg: '#FEF3C7', icon: <AlertTriangle size={14} /> });
        }
        if (row.status === 'Lỗi' || row.quantity_error > 0) {
            badges.push({ text: 'Lỗi QC Đánh Giá', color: '#8B5CF6', bg: '#EDE9FE', icon: <AlertCircle size={14} /> });
        }
        return badges;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    };

    return (
        <div className="manufacture-plan-container" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Thống Kê Tổng Quan */}
            <div className="stats-grid five-cols animate-card-entrance" style={{ marginBottom: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                {[
                    { id: 'ALL', label: 'TỔNG SỐ NGOẠI LỆ', value: stats.total, iconBg: '#FAF6F0', iconColor: '#7B5233', themeColor: '#7B5233', activeBg: '#FAF6F0', Icon: Layers },
                    { id: 'LECH_THIEU', label: 'LỆCH THIỆU', value: stats.lechThieu, iconBg: '#FFF1F2', iconColor: '#EF4444', themeColor: '#EF4444', activeBg: '#FFF5F6', Icon: ArrowDownRight },
                    { id: 'LECH_THUA', label: 'LỆCH THỪA', value: stats.lechThua, iconBg: '#EBF5FF', iconColor: '#3B82F6', themeColor: '#3B82F6', activeBg: '#F4F9FF', Icon: ArrowUpRight },
                    { id: 'TRA_HANG', label: 'TRẢ HÀNG QC', value: stats.traHang, iconBg: '#FFFBEB', iconColor: '#D97706', themeColor: '#D97706', activeBg: '#FFFDF5', Icon: Undo2 },
                    { id: 'LOI_QC', label: 'LỖI ĐÁNH GIÁ QC', value: stats.loiQC, iconBg: '#F5F3FF', iconColor: '#8B5CF6', themeColor: '#8B5CF6', activeBg: '#FAF8FF', Icon: AlertCircle },
                ].map((stat) => {
                    const isActive = filterType === stat.id;
                    return (
                        <div 
                            key={stat.id} 
                            onClick={() => { setFilterType(stat.id); setCurrentPage(1); }}
                            className="kpi-card"
                            style={{ 
                                background: isActive ? stat.activeBg : '#fff', 
                                border: '1px solid ' + (isActive ? stat.themeColor : '#E2E8F0'),
                                padding: '8px 12px', 
                                borderRadius: '10px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                boxShadow: isActive ? `0 0 0 2px ${stat.themeColor}20` : '0 1px 2px rgba(0,0,0,0.01)',
                                cursor: 'pointer',
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

            {/* Bộ Lọc & Tìm Kiếm */}
            <PageToolbar
              searchValue={searchQuery}
              onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
              searchPlaceholder="Tìm phiếu ngoại lệ, linh kiện..."
              showFilter={true}
              isFilterOpen={isFilterBarOpen}
              onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
              activeFiltersCount={filterType !== 'ALL' ? 1 : 0}
              hasWritePermission={true}
              extraActions={[
                {
                  label: 'Làm mới dữ liệu',
                  icon: <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />,
                  onClick: fetchData
                }
              ]}
            />

            {/* INLINE EXPANDABLE FILTER BAR */}
            {isFilterBarOpen && (
              <div className="filter-inline-bar">
                {/* Loại ngoại lệ */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Loại ngoại lệ</label>
                  <select 
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="ALL">Tất cả ngoại lệ</option>
                    <option value="LECH_THIEU">Lệch Thiếu (Nhận &lt; Giao)</option>
                    <option value="LECH_THUA">Lệch Thừa (Giao &lt; Nhận)</option>
                    <option value="TRA_HANG">Trả Hàng QC</option>
                    <option value="LOI_QC">Lỗi Đánh Giá QC</option>
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
              </div>
            )}

            {/* Nội Dung Bảng */}
            <div className="admin-list-layout">
                <div className="mgmt-table card admin-table-card">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '16px' }}>
                        <RefreshCw size={36} className="animate-spin" style={{ color: '#7B5233' }} />
                        <span style={{ fontSize: '14px', color: '#8D6E63', fontWeight: '600' }}>Đang quét tìm phiếu giao ngoại lệ...</span>
                    </div>
                ) : filteredDeliveries.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px' }}>
                        <CheckCircle size={48} style={{ color: '#2E7D32' }} />
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#3E2723', margin: 0 }}>Tuyệt vời! Không phát hiện ngoại lệ nào</h4>
                        <p style={{ fontSize: '13px', color: '#8D6E63', margin: 0 }}>Mọi phiếu giao nhận đều khớp số lượng và đạt tiêu chuẩn chất lượng</p>
                    </div>
                ) : (
                    <div className="table-responsive admin-table-scroll">
                        <table className="manufacture-table data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Mã phiếu</th>
                                        <th>Linh kiện / Quy cách</th>
                                        <th>Hành trình</th>
                                        <th style={{ textAlign: 'center' }}>Giao / Nhận</th>
                                        <th style={{ textAlign: 'center' }}>Tỷ lệ</th>
                                        <th>Loại ngoại lệ</th>
                                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((item) => {
                                        const badges = getExceptionBadges(item);
                                        const diff = item.quantity_received - item.quantity_total;
                                        const diffPercent = item.quantity_total > 0 ? ((Math.abs(diff) / item.quantity_total) * 100).toFixed(0) : 0;
                                        const returnPercent = item.quantity_total > 0 ? ((item.quantity_returned / item.quantity_total) * 100).toFixed(0) : 0;

                                        return (
                                            <tr 
                                                key={item.id} 
                                                className="animate-card-entrance"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleViewDetail(item)}
                                            >
                                                <td data-label="ID" style={{ fontWeight: '700', color: '#8D6E63' }}>#{item.id}</td>
                                                <td data-label="Mã phiếu">
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#3E2723' }}>{item.delivery_code || `PL-${item.id}`}</div>
                                                    <div style={{ fontSize: '11px', color: '#8D6E63', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Calendar size={10} /> {formatDate(item.created_at)}
                                                    </div>
                                                </td>
                                                <td data-label="Linh kiện / Quy cách">
                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#3E2723' }}>{item.part_name || 'N/A'}</div>
                                                    {item.specification && (
                                                        <div style={{ fontSize: '11px', color: '#8D6E63', background: '#F5F5F5', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', marginTop: '4px' }}>
                                                            {item.specification}
                                                        </div>
                                                    )}
                                                </td>
                                                <td data-label="Hành trình">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#424242' }}>
                                                        <span style={{ color: '#7B5233' }}>{item.delivery_stage}</span>
                                                        <ArrowRight size={14} style={{ color: '#8D6E63' }} />
                                                        <span style={{ color: '#2E7D32' }}>{item.receiving_stage}</span>
                                                    </div>
                                                </td>
                                                <td data-label="Giao / Nhận" style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#424242' }}>
                                                        {item.quantity_total} <span style={{ color: '#8D6E63', fontWeight: '400', fontSize: '12px' }}>/</span> <span style={{ color: '#2E7D32' }}>{item.quantity_received}</span>
                                                    </div>
                                                </td>
                                                <td data-label="Tỷ lệ" style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        {diff !== 0 && (
                                                            <span style={{ 
                                                                fontSize: '12px', 
                                                                fontWeight: '800', 
                                                                color: diff < 0 ? '#EF4444' : '#3B82F6',
                                                                background: diff < 0 ? '#FEE2E2' : '#DBEAFE',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '2px'
                                                            }}>
                                                                {diff < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                                                {diff > 0 ? `+${diff}` : diff} ({diffPercent}%)
                                                            </span>
                                                        )}
                                                        {item.quantity_returned > 0 && (
                                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#D97706', marginTop: '2px' }}>
                                                                Trả: {item.quantity_returned} ({returnPercent}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td data-label="Loại ngoại lệ">
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {badges.map((badge, idx) => (
                                                            <span 
                                                                key={idx} 
                                                                style={{ 
                                                                    background: badge.bg, 
                                                                    color: badge.color, 
                                                                    fontSize: '11px', 
                                                                    fontWeight: '700', 
                                                                    padding: '4px 10px', 
                                                                    borderRadius: '8px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                {badge.icon}
                                                                {badge.text}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td data-label="Thao tác" style={{ textAlign: 'center' }}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); }}
                                                        style={{ 
                                                            background: '#FAF9F8', 
                                                            border: '1px solid #EFEBE9', 
                                                            borderRadius: '10px', 
                                                            padding: '8px 12px', 
                                                            color: '#7B5233', 
                                                            cursor: 'default',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: '700',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        Xác minh
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                    
                    {/* Phân Trang - Desktop */}
                    {totalPages > 1 && (
                        <div className="admin-pagination-desktop desktop-only">
                            <span style={{ fontSize: '13px', color: '#8D6E63', fontWeight: '600' }}>
                                Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredDeliveries.length)} trong tổng số {filteredDeliveries.length} dòng
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button 
                                    className="page-btn"
                                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    &lt; Trước
                                </button>
                                {[...Array(totalPages)].map((_, idx) => (
                                    <button 
                                        key={idx} 
                                        className={`page-btn ${currentPage === idx + 1 ? 'active' : ''}`}
                                        onClick={() => paginate(idx + 1)}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                                <button 
                                    className="page-btn"
                                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Sau &gt;
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Phân Trang - Mobile Sticky */}
                    {totalPages > 1 && (
                        <div className="pagination-mobile-sticky mobile-only">
                            <button className="page-btn" onClick={() => paginate(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {totalPages || 1}</span>
                            <button className="page-btn" onClick={() => paginate(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || totalPages <= 1}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                    </div>
                )}
                </div>
            </div>

            {/* Chi Tiết Phiếu Modal */}
            {selectedDelivery && (
                <div style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    background: 'rgba(62, 39, 35, 0.4)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={closeDetailModal}>
                    <div style={{ 
                        background: 'white', 
                        width: '100%', 
                        maxWidth: '750px', 
                        borderRadius: '24px', 
                        boxShadow: '0 10px 40px rgba(62, 39, 35, 0.15)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Header Modal */}
                        <div style={{ background: '#7B5233', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                                    CHI TIẾT PHIẾU BÀN GIAO NGOẠI LỆ
                                </span>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {selectedDelivery.delivery_code || `PL-${selectedDelivery.id}`}
                                </h3>
                            </div>
                            <button onClick={closeDetailModal} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                            {detailLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
                                    <RefreshCw size={32} className="animate-spin" style={{ color: '#7B5233' }} />
                                    <span style={{ fontSize: '13px', color: '#8D6E63', fontWeight: '600' }}>Đang nạp dữ liệu chi tiết phiếu...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Khung Thông Tin Hành Trình / Đăng Ký */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                        <div style={{ background: '#FAF9F8', padding: '16px', borderRadius: '16px', border: '1px solid #EFEBE9' }}>
                                            <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#3E2723', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                Thông tin hành trình giao nhận
                                            </h4>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <span style={{ color: '#8D6E63' }}>Công đoạn xuất phát:</span>
                                                    <strong style={{ color: '#7B5233' }}>{selectedDelivery.delivery_stage}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <span style={{ color: '#8D6E63' }}>Công đoạn tiếp nhận:</span>
                                                    <strong style={{ color: '#2E7D32' }}>{selectedDelivery.receiving_stage}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <span style={{ color: '#8D6E63' }}>Người thực hiện giao:</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: '#424242' }}>
                                                        <User size={12} /> {selectedDelivery.sx_delivery_name || 'N/A'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <span style={{ color: '#8D6E63' }}>Người tiếp nhận:</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: '#424242' }}>
                                                        <User size={12} /> {selectedDelivery.sx_receipt_name || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: '#FDF8F7', padding: '16px', borderRadius: '16px', border: '1px solid #F8EFEA', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#C62828', margin: '0 0 10px 0', textTransform: 'uppercase', textAlign: 'center' }}>
                                                Độ lệch số lượng
                                            </h4>
                                            <div style={{ textAlign: 'center' }}>
                                                <span style={{ 
                                                    fontSize: '32px', 
                                                    fontWeight: '900', 
                                                    color: (selectedDelivery.quantity_received - selectedDelivery.quantity_total) < 0 ? '#EF4444' : '#3B82F6'
                                                }}>
                                                    {selectedDelivery.quantity_received - selectedDelivery.quantity_total > 0 ? '+' : ''}
                                                    {selectedDelivery.quantity_received - selectedDelivery.quantity_total}
                                                </span>
                                                <div style={{ fontSize: '12px', color: '#8D6E63', fontWeight: '700', marginTop: '4px' }}>
                                                    Giao: {selectedDelivery.quantity_total} | Nhận: {selectedDelivery.quantity_received}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Khung Thông Tin QC Lỗi chất lượng */}
                                    {(selectedDelivery.quantity_returned > 0 || selectedDelivery.status === 'Lỗi' || (deliveryDetail && (deliveryDetail.moisture_min || deliveryDetail.curvature_min))) && (
                                        <div style={{ background: '#FFFDF9', padding: '16px', borderRadius: '16px', border: '1px solid #FEF3C7', marginBottom: '24px' }}>
                                            <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#D97706', margin: '0 0 12px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <AlertTriangle size={16} /> Chỉ số lỗi & Đánh giá QC
                                            </h4>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13px' }}>
                                                <div>
                                                    <span style={{ color: '#8D6E63', display: 'block', marginBottom: '4px' }}>Hàng trả QC:</span>
                                                    <strong style={{ fontSize: '16px', color: '#D97706' }}>{selectedDelivery.quantity_returned} chi tiết</strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#8D6E63', display: 'block', marginBottom: '4px' }}>Độ ẩm đo được:</span>
                                                    <strong style={{ fontSize: '14px', color: '#424242' }}>
                                                        {deliveryDetail?.moisture_min || 'N/A'}% - {deliveryDetail?.moisture_max || 'N/A'}%
                                                    </strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#8D6E63', display: 'block', marginBottom: '4px' }}>Độ cong vênh:</span>
                                                    <strong style={{ fontSize: '14px', color: '#424242' }}>
                                                        {deliveryDetail?.curvature_min || 'N/A'} mm - {deliveryDetail?.curvature_max || 'N/A'} mm
                                                    </strong>
                                                </div>
                                            </div>

                                            {selectedDelivery.note && (
                                                <div style={{ marginTop: '12px', borderTop: '1px solid #FEF3C7', paddingTop: '8px', fontSize: '13px', color: '#3E2723' }}>
                                                    <strong>Lý do/Ghi chú tiếp nhận:</strong> {selectedDelivery.note}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Chi Tiết Hàng Hóa */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#3E2723', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
                                            Danh sách chi tiết linh kiện
                                        </h4>
                                        <div style={{ background: '#FAF9F8', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EFEBE9' }}>
                                            {deliveryDetail?.details && deliveryDetail.details.length > 0 ? (
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                                    <thead>
                                                        <tr style={{ background: '#EFEBE9', borderBottom: '1px solid #D7CCC8' }}>
                                                            <th style={{ padding: '10px 14px', fontWeight: '800', color: '#3E2723' }}>Tên chi tiết/Linh kiện</th>
                                                            <th style={{ padding: '10px 14px', fontWeight: '800', color: '#3E2723', textAlign: 'right' }}>Số lượng</th>
                                                            <th style={{ padding: '10px 14px', fontWeight: '800', color: '#3E2723' }}>Liên kết Đơn hàng (PO)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {deliveryDetail.details.map((det) => (
                                                            <tr key={det.id} style={{ borderBottom: '1px solid #EFEBE9' }}>
                                                                <td style={{ padding: '10px 14px', fontWeight: '700', color: '#424242' }}>{det.part_name}</td>
                                                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#7B5233' }}>{det.quantity}</td>
                                                                <td style={{ padding: '10px 14px', color: '#8D6E63', fontWeight: '600' }}>
                                                                    {det.order_name || `PO-${det.order_id || 'N/A'}`}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div style={{ padding: '16px', textAlign: 'center', color: '#8D6E63', fontStyle: 'italic' }}>
                                                    Không có dữ liệu chi tiết linh kiện
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hình ảnh giao nhận/kiểm tra */}
                                    {deliveryDetail?.images && deliveryDetail.images.length > 0 && (
                                        <div>
                                            <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#3E2723', margin: '0 0 12px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <ImageIcon size={16} /> Hình ảnh đối chứng giao nhận
                                            </h4>
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                {deliveryDetail.images.map((img) => (
                                                    <div 
                                                        key={img.id} 
                                                        style={{ 
                                                            width: '120px', 
                                                            height: '120px', 
                                                            borderRadius: '12px', 
                                                            overflow: 'hidden', 
                                                            border: '1px solid #EFEBE9',
                                                            background: '#F5F5F5',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <img 
                                                            src={img.image_path.startsWith('http') ? img.image_path : `/api/v1/deliveries/image-proxy?path=${encodeURIComponent(img.image_path)}`} 
                                                            alt="Giao nhận đối chứng" 
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                        {img.is_inspection && (
                                                            <span style={{ 
                                                                position: 'absolute', 
                                                                bottom: '4px', 
                                                                left: '4px', 
                                                                background: '#EF4444', 
                                                                color: 'white', 
                                                                fontSize: '9px', 
                                                                fontWeight: '800', 
                                                                padding: '1px 4px', 
                                                                borderRadius: '4px' 
                                                            }}>
                                                                Ảnh QC Lỗi
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div style={{ background: '#FAF9F8', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #EFEBE9' }}>
                            <button 
                                onClick={closeDetailModal} 
                                style={{ 
                                    background: 'white', 
                                    border: '1px solid #EFEBE9', 
                                    borderRadius: '12px', 
                                    padding: '10px 24px', 
                                    color: '#3E2723', 
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#FAF9F8'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                            >
                                Đóng lại
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Custom Animations in Inline Styles */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.97); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />

        </div>
    );
};

export default ExceptionDeliveries;
