import React, { useState, useEffect } from 'react';
import deliveryService from '@modules/Delivery/Models/delivery.service';
import { 
    Search, Filter, Download, MoreHorizontal, 
    FileText, CheckCircle, Clock, AlertTriangle,
    ArrowUpRight, ArrowDownRight, ChevronRight,
    ChevronDown, RefreshCw
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
                                            <span style={{ fontSize: '13px', color: '#5D4037', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>Chi tiết</span>
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
        </div>
    );
};

export default DeliveryTracking;
