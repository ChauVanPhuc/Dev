import React, { useState, useEffect } from 'react';
import deliveryService from '@modules/Delivery/Models/delivery.service';
import { 
    Search, Filter, RefreshCw, AlertTriangle, 
    AlertCircle, Eye, FileDown, CheckCircle, 
    ArrowRight, ArrowUpRight, ArrowDownRight, 
    X, ChevronLeft, ChevronRight, Info, Calendar,
    User, Clipboard, Image as ImageIcon
} from 'lucide-react';

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
    const itemsPerPage = 15;

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
        <div style={{ padding: '20px', background: '#FAF9F8', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#3E2723', margin: 0 }}>QUẢN LÝ PHIẾU NGOẠI LỆ</h1>
                    <p style={{ fontSize: '13px', color: '#8D6E63', marginTop: '4px', marginBottom: 0 }}>
                        Hệ thống tự động phát hiện và cảnh báo các phiếu bàn giao sai lệch số lượng hoặc có lỗi chất lượng
                    </p>
                </div>
                <button 
                    onClick={fetchData} 
                    style={{ 
                        background: '#7B5233', 
                        border: 'none', 
                        borderRadius: '12px', 
                        padding: '10px 16px', 
                        color: 'white', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        boxShadow: '0 2px 6px rgba(123, 82, 51, 0.2)',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#644128'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#7B5233'}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Làm mới dữ liệu
                </button>
            </div>

            {/* Thống Kê Tổng Quan */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div 
                    onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
                    style={{ 
                        background: filterType === 'ALL' ? '#7B5233' : 'white', 
                        color: filterType === 'ALL' ? 'white' : '#3E2723',
                        padding: '16px', 
                        borderRadius: '16px', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        border: filterType === 'ALL' ? '1px solid #7B5233' : '1px solid #EFEBE9',
                        transition: 'all 0.2s'
                    }}
                >
                    <p style={{ fontSize: '12px', fontWeight: '700', color: filterType === 'ALL' ? '#EFEBE9' : '#8D6E63', margin: 0, textTransform: 'uppercase' }}>TỔNG SỐ NGOẠI LỆ</p>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 0 0' }}>{stats.total} <span style={{ fontSize: '14px', fontWeight: '400' }}>Phiếu</span></h3>
                </div>

                <div 
                    onClick={() => { setFilterType('LECH_THIEU'); setCurrentPage(1); }}
                    style={{ 
                        background: filterType === 'LECH_THIEU' ? '#EF4444' : 'white', 
                        color: filterType === 'LECH_THIEU' ? 'white' : '#3E2723',
                        padding: '16px', 
                        borderRadius: '16px', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        border: filterType === 'LECH_THIEU' ? '1px solid #EF4444' : '1px solid #FEE2E2',
                        transition: 'all 0.2s'
                    }}
                >
                    <p style={{ fontSize: '12px', fontWeight: '700', color: filterType === 'LECH_THIEU' ? '#FEE2E2' : '#EF4444', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowDownRight size={14} /> LỆCH THIẾU (NHẬN &lt; GIAO)
                    </p>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 0 0' }}>{stats.lechThieu} <span style={{ fontSize: '14px', fontWeight: '400' }}>Phiếu</span></h3>
                </div>

                <div 
                    onClick={() => { setFilterType('LECH_THUA'); setCurrentPage(1); }}
                    style={{ 
                        background: filterType === 'LECH_THUA' ? '#3B82F6' : 'white', 
                        color: filterType === 'LECH_THUA' ? 'white' : '#3E2723',
                        padding: '16px', 
                        borderRadius: '16px', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        border: filterType === 'LECH_THUA' ? '1px solid #3B82F6' : '1px solid #DBEAFE',
                        transition: 'all 0.2s'
                    }}
                >
                    <p style={{ fontSize: '12px', fontWeight: '700', color: filterType === 'LECH_THUA' ? '#DBEAFE' : '#3B82F6', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpRight size={14} /> LỆCH THỪA (GIAO &lt; NHẬN)
                    </p>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 0 0' }}>{stats.lechThua} <span style={{ fontSize: '14px', fontWeight: '400' }}>Phiếu</span></h3>
                </div>

                <div 
                    onClick={() => { setFilterType('TRA_HANG'); setCurrentPage(1); }}
                    style={{ 
                        background: filterType === 'TRA_HANG' ? '#D97706' : 'white', 
                        color: filterType === 'TRA_HANG' ? 'white' : '#3E2723',
                        padding: '16px', 
                        borderRadius: '16px', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        border: filterType === 'TRA_HANG' ? '1px solid #D97706' : '1px solid #FEF3C7',
                        transition: 'all 0.2s'
                    }}
                >
                    <p style={{ fontSize: '12px', fontWeight: '700', color: filterType === 'TRA_HANG' ? '#FEF3C7' : '#D97706', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={14} /> TRẢ HÀNG QC
                    </p>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 0 0' }}>{stats.traHang} <span style={{ fontSize: '14px', fontWeight: '400' }}>Phiếu</span></h3>
                </div>

                <div 
                    onClick={() => { setFilterType('LOI_QC'); setCurrentPage(1); }}
                    style={{ 
                        background: filterType === 'LOI_QC' ? '#8B5CF6' : 'white', 
                        color: filterType === 'LOI_QC' ? 'white' : '#3E2723',
                        padding: '16px', 
                        borderRadius: '16px', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        border: filterType === 'LOI_QC' ? '1px solid #8B5CF6' : '1px solid #EDE9FE',
                        transition: 'all 0.2s'
                    }}
                >
                    <p style={{ fontSize: '12px', fontWeight: '700', color: filterType === 'LOI_QC' ? '#EDE9FE' : '#8B5CF6', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} /> LỖI ĐÁNH GIÁ QC
                    </p>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0 0 0' }}>{stats.loiQC} <span style={{ fontSize: '14px', fontWeight: '400' }}>Phiếu</span></h3>
                </div>
            </div>

            {/* Bộ Lọc & Tìm Kiếm */}
            <div style={{ 
                background: 'white', 
                padding: '16px 20px', 
                borderRadius: '16px', 
                marginBottom: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.01)',
                border: '1px solid #EFEBE9'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63' }} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm theo mã phiếu, tên chi tiết, ghi chú..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        style={{ 
                            width: '100%', 
                            padding: '10px 15px 10px 42px', 
                            borderRadius: '12px', 
                            border: '1px solid #EFEBE9', 
                            background: '#FAF9F8', 
                            fontSize: '14px', 
                            color: '#3E2723', 
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#7B5233'}
                        onBlur={(e) => e.target.style.borderColor = '#EFEBE9'}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#8D6E63' }}>Loại ngoại lệ:</span>
                    <select 
                        value={filterType}
                        onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                        style={{ 
                            padding: '10px 16px', 
                            borderRadius: '12px', 
                            border: '1px solid #EFEBE9', 
                            background: '#FFFFFF', 
                            fontSize: '13px', 
                            fontWeight: '700', 
                            color: '#3E2723', 
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">Tất cả ngoại lệ</option>
                        <option value="LECH_THIEU">Lệch Thiếu (Nhận &lt; Giao)</option>
                        <option value="LECH_THUA">Lệch Thừa (Giao &lt; Nhận)</option>
                        <option value="TRA_HANG">Trả Hàng QC</option>
                        <option value="LOI_QC">Lỗi Đánh Giá QC</option>
                    </select>
                </div>
            </div>

            {/* Nội Dung Bảng */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #EFEBE9', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
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
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#FAF9F8', borderBottom: '1px solid #EFEBE9' }}>
                                        <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: '#3E2723', width: '80px' }}>ID</th>
                                        <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: '#3E2723' }}>Mã phiếu</th>
                                        <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: '#3E2723' }}>Linh kiện / Quy cách</th>
                                        <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: '#3E2723' }}>Hành trình</th>
                                        <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: '#3E2723', textAlign: 'center' }}>Giao / Nhận</th>
                                        <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: '#3E2723', textAlign: 'center' }}>Tỷ lệ</th>
                                        <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: '#3E2723' }}>Loại ngoại lệ</th>
                                        <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: '#3E2723', textAlign: 'center' }}>Thao tác</th>
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
                                                style={{ borderBottom: '1px solid #F5F5F5', transition: 'all 0.15s', cursor: 'pointer' }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#FAF9F8'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                                onClick={() => handleViewDetail(item)}
                                            >
                                                <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '700', color: '#8D6E63' }}>#{item.id}</td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#3E2723' }}>{item.delivery_code || `PL-${item.id}`}</div>
                                                    <div style={{ fontSize: '11px', color: '#8D6E63', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Calendar size={10} /> {formatDate(item.created_at)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#3E2723' }}>{item.part_name || 'N/A'}</div>
                                                    {item.specification && (
                                                        <div style={{ fontSize: '11px', color: '#8D6E63', background: '#F5F5F5', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', marginTop: '4px' }}>
                                                            {item.specification}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#424242' }}>
                                                        <span style={{ color: '#7B5233' }}>{item.delivery_stage}</span>
                                                        <ArrowRight size={14} style={{ color: '#8D6E63' }} />
                                                        <span style={{ color: '#2E7D32' }}>{item.receiving_stage}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#424242' }}>
                                                        {item.quantity_total} <span style={{ color: '#8D6E63', fontWeight: '400', fontSize: '12px' }}>/</span> <span style={{ color: '#2E7D32' }}>{item.quantity_received}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
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
                                                <td style={{ padding: '14px 20px' }}>
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
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
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
                        </div>

                        {/* Phân Trang */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #EFEBE9', background: '#FAF9F8' }}>
                                <span style={{ fontSize: '13px', color: '#8D6E63', fontWeight: '600' }}>
                                    Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredDeliveries.length)} trong tổng số {filteredDeliveries.length} dòng
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button 
                                        onClick={() => paginate(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        style={{ 
                                            background: 'white', 
                                            border: '1px solid #EFEBE9', 
                                            borderRadius: '8px', 
                                            padding: '6px 10px', 
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            opacity: currentPage === 1 ? 0.5 : 1
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {[...Array(totalPages)].map((_, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => paginate(idx + 1)}
                                            style={{ 
                                                background: currentPage === idx + 1 ? '#7B5233' : 'white', 
                                                color: currentPage === idx + 1 ? 'white' : '#3E2723', 
                                                border: '1px solid #EFEBE9', 
                                                borderRadius: '8px', 
                                                width: '32px',
                                                height: '32px',
                                                fontWeight: '700',
                                                fontSize: '13px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        style={{ 
                                            background: 'white', 
                                            border: '1px solid #EFEBE9', 
                                            borderRadius: '8px', 
                                            padding: '6px 10px', 
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                            opacity: currentPage === totalPages ? 0.5 : 1
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
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
