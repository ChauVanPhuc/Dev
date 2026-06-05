import React, { useState, useEffect } from 'react';
import deliveryService from '@modules/Delivery/Models/delivery.service';
import { API_ROOT } from '@webShared/Services/api.service';
import { 
    Search, Filter, Download, MoreHorizontal, 
    FileText, CheckCircle, Clock, AlertTriangle,
    ArrowUpRight, ArrowDownRight, ChevronRight,
    ChevronDown, RefreshCw, X, User, Calendar, 
    MapPin, Activity, CheckCircle2, AlertCircle, 
    Undo2, Droplet, Maximize2, FileSpreadsheet, Layers, Info
} from 'lucide-react';


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
    const itemsPerPage = 50;

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


    return (
        <div style={{ padding: '20px', background: '#FAF9F8', minHeight: '100vh' }}>
            {/* Filter Bar - Cập nhật Action */}
            <div style={{ 
                background: 'white', 
                padding: '12px 20px', 
                borderRadius: '16px', 
                marginBottom: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '15px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                border: '1px solid #F0F0F0'
            }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                    <select style={{ width: '100%', padding: '10px 15px', borderRadius: '12px', border: '1px solid #EFEBE9', background: '#FFFFFF', fontSize: '13px', fontWeight: '800', color: '#3E2723', outline: 'none', appearance: 'none' }}>
                        <option>KHSX</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63', pointerEvents: 'none' }} />
                </div>
                <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                    <select style={{ width: '100%', padding: '10px 15px', borderRadius: '12px', border: '1px solid #EFEBE9', background: '#FFFFFF', fontSize: '13px', fontWeight: '800', color: '#3E2723', outline: 'none', appearance: 'none' }}>
                        <option>Công đoạn giao</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63', pointerEvents: 'none' }} />
                </div>
                <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                    <select style={{ width: '100%', padding: '10px 15px', borderRadius: '12px', border: '1px solid #EFEBE9', background: '#FFFFFF', fontSize: '13px', fontWeight: '800', color: '#3E2723', outline: 'none', appearance: 'none' }}>
                        <option>Công đoạn nhận</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63', pointerEvents: 'none' }} />
                </div>
                <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                    <select style={{ width: '100%', padding: '10px 15px', borderRadius: '12px', border: '1px solid #EFEBE9', background: '#FFFFFF', fontSize: '13px', fontWeight: '800', color: '#3E2723', outline: 'none', appearance: 'none' }}>
                        <option>Thời gian</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63', pointerEvents: 'none' }} />
                </div>
                <button onClick={fetchData} style={{ background: '#7B5233', border: 'none', borderRadius: '10px', padding: '10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>


            {/* Stats Cards - Chuẩn hóa đồng bộ toàn hệ thống */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                {[
                    { label: 'TỔNG SỐ PHIẾU', value: `${stats.total} Phiếu`, sub: 'Cập nhật thời gian thực', bg: '#F5F5F5', color: '#424242' },
                    { label: 'ĐÃ HOÀN THÀNH', value: stats.completed, sub: `${stats.total > 0 ? Math.round((stats.completed/stats.total)*100) : 0}% tổng số`, bg: '#E8F5E9', color: '#2E7D32' },
                    { label: 'ĐANG CHỜ NHẬN', value: stats.pending, sub: 'Cần xác nhận', bg: '#FFF3E0', color: '#E65100' },
                    { label: 'PHIẾU LỖI/TRẢ', value: stats.error, sub: 'Cần xử lý gấp', bg: '#FFEBEE', color: '#C62828' },
                ].map((stat, i) => (
                    <div key={i} style={{ 
                        background: stat.bg, 
                        padding: '20px 15px', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        textAlign: 'center',
                        minHeight: '120px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '700', color: '#757575', letterSpacing: '0.5px' }}>{stat.label}</p>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', fontWeight: '800', color: stat.color }}>{stat.value}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#9E9E9E', fontWeight: '500' }}>{stat.sub}</p>
                    </div>
                ))}
            </div>





            {/* Table Section */}
            <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {/* Table Toolbar */}
                <div style={{ padding: '20px 25px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{ position: 'relative', width: '380px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#A0A0A0' }} />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm mã Đơn, sản phẩm..." 
                                style={{ width: '100%', padding: '12px 45px 12px 40px', borderRadius: '12px', border: '1px solid #EFEBE9', fontSize: '13px', outline: 'none' }}
                            />
                            <Filter size={16} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63' }} />
                        </div>
                        <button style={{ background: 'white', border: '1.5px solid #EFEBE9', borderRadius: '12px', padding: '10px', color: '#8D6E63', cursor: 'pointer' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 5h10M11 9h7M11 13h4"></path>
                                <path d="M3 17l3 3 3-3M6 18V4"></path>
                            </svg>
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {['Thêm trực tiếp', 'Nhập Excel', 'Xuất Excel', 'Xuất PDF'].map((btn, i) => (
                            <button key={i} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '10px 18px', 
                                background: 'white', 
                                border: '1px solid #EFEBE9', 
                                borderRadius: '12px', 
                                fontSize: '13px', 
                                fontWeight: '700', 
                                color: '#4E342E' 
                            }}>
                                {i < 2 ? <FileText size={16} /> : <Download size={16} />}
                                {btn}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1600px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: '#F5F7F2' }}>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800', textAlign: 'center' }}>STT</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Mã phiếu</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Tên chi tiết</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Công đoạn vào</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Công đoạn ra</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>SL Giao</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>SL Nhận</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>SL Trả</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Trạng thái</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Thời gian</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Người giao</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Người nhận</th>
                                <th style={{ padding: '18px 12px', fontSize: '13px', color: '#3E2723', fontWeight: '800' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="13" style={{ padding: '50px', textAlign: 'center', color: '#757575' }}>Đang tải dữ liệu...</td></tr>
                            ) : deliveries.length === 0 ? (
                                <tr><td colSpan="13" style={{ padding: '50px', textAlign: 'center', color: '#757575' }}>Không có dữ liệu bàn giao.</td></tr>
                            ) : deliveries.map((row, idx) => {
                                const statusInfo = getStatusStyle(row.status);
                                return (
                                    <tr key={row.id} style={{ 
                                        borderBottom: '1px solid #F0F0F0', 
                                        background: getRowBgColor(row)
                                    }}>
                                        <td style={{ padding: '18px 12px', fontSize: '13px', textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px', fontWeight: '700', color: '#3E2723' }}>BG-{row.id}</td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px', color: '#424242' }}>{row.part_name || 'N/A'}</td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px' }}>{row.delivery_stage}</td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px' }}>{row.receiving_stage}</td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px', fontWeight: '800' }}>{row.quantity_total}</td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px', fontWeight: '800', color: '#2E7D32' }}>{row.quantity_received}</td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px', color: row.quantity_returned > 0 ? '#C62828' : '#757575' }}>{row.quantity_returned}</td>
                                        <td style={{ padding: '18px 12px' }}>
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
                                        <td style={{ padding: '18px 12px', fontSize: '12px', color: '#757575' }}>
                                            {row.created_at ? new Date(row.created_at).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : 'N/A'}
                                        </td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px' }}>{row.sx_delivery_name || 'N/A'}</td>
                                        <td style={{ padding: '18px 12px', fontSize: '13px' }}>{row.sx_receipt_name || '---'}</td>
                                        <td style={{ padding: '18px 12px' }}>
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

                {/* Pagination - Số liệu thực */}
                <div style={{ 
                    padding: '20px 30px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderTop: '1px solid #F5F5F5'
                }}>
                    <div style={{ fontSize: '14px', color: '#424242' }}>
                        Hiển thị <b>{deliveries.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, deliveries.length)}</b> trên <b>{deliveries.length}</b> kết quả
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #EFEBE9', background: 'white', color: currentPage === 1 ? '#BDBDBD' : '#424242', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}
                        >
                            Trước
                        </button>
                        
                        <button style={{ width: '40px', height: '40px', borderRadius: '10px', border: 'none', background: '#7B5233', color: 'white', fontWeight: '800', cursor: 'pointer' }}>{currentPage}</button>
                        
                        <button 
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            disabled={currentPage * itemsPerPage >= deliveries.length}
                            style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #EFEBE9', background: 'white', color: currentPage * itemsPerPage >= deliveries.length ? '#BDBDBD' : '#424242', cursor: currentPage * itemsPerPage >= deliveries.length ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}
                        >
                            Tiếp
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Overlay / Backdrop */}
            {isDetailModalOpen && (
                <div 
                    className="modal-backdrop" 
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
                        zIndex: 1200,
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
