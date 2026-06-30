import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext } from 'react-router-dom';
import { Unlock, Plus, Printer, Search, X, CheckSquare, Square, Files, ChevronLeft, ChevronRight } from 'lucide-react';

const BackupQRManagement = () => {
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = useOutletContext();
    const [qrCodes, setQrCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [selectedIds, setSelectedIds] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [quantity, setQuantity] = useState(10);

    

    const fetchQRCodes = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/deliveries/backup-qrs/all`);
            setQrCodes(Array.isArray(data) ? data : []);
        } catch (error) {
            setMessage({ type: 'error', text: 'Không thể tải danh sách mã QR.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCustomScreenCode('AD11');
        setCustomTitle('Quản lý mã QR Dự Phòng');
        setCustomSubtitle('Hệ thống quản lý trạng thái luân chuyển của các thẻ QR cố định trên xưởng.');
        fetchQRCodes();
    }, []);


    const printQRsA4 = (items) => {
        if (items.length === 0) return alert('Không có mã nào để in.');
        
        // Chia các mã QR thành nhóm tối đa 4 mã trên 1 trang A4
        const chunks = [];
        for (let i = 0; i < items.length; i += 4) {
            chunks.push(items.slice(i, i + 4));
        }
        
        const printWindow = window.open('', '_blank');
        const content = chunks.map((chunk) => {
            const cardsHtml = chunk.map((qr) => `
                <div class="card">
                    <div class="system-label">HỆ THỐNG SMARTFLOW</div>
                    <div class="header">THẺ LUÂN CHUYỂN</div>
                    <div class="qr-container">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qr.code}" />
                    </div>
                    <div class="code-label">${qr.code}</div>
                    <div class="footer">Quét mã để tạo phiếu bàn giao</div>
                </div>
            `).join('');
            return `<div class="page-a4">${cardsHtml}</div>`;
        }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>In Thẻ QR (4 thẻ trên trang A4)</title>
                    <style>
                        @page { size: A4 portrait; margin: 0; }
                        body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
                        .page-a4 { 
                            width: 210mm; 
                            height: 297mm; 
                            display: grid; 
                            grid-template-columns: repeat(2, 1fr); 
                            grid-template-rows: repeat(2, 1fr); 
                            padding: 12mm; 
                            gap: 12mm; 
                            box-sizing: border-box; 
                            page-break-after: always; 
                        }
                        .page-a4:last-child { page-break-after: avoid; }
                        .card { 
                            border: 2px dashed #cbd5e1; 
                            border-radius: 12px; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: space-between; 
                            padding: 8mm; 
                            box-sizing: border-box; 
                            text-align: center;
                            height: 100%;
                            background: #fff;
                        }
                        .system-label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 2mm; }
                        .header { font-size: 18px; font-weight: 900; color: #1e293b; letter-spacing: 1px; margin-top: 2mm; }
                        .qr-container { flex: 1; display: flex; align-items: center; justify-content: center; margin: 6mm 0; }
                        .qr-container img { width: 55mm; height: 55mm; object-fit: contain; }
                        .code-label { font-size: 32px; font-weight: 900; color: #000; margin-bottom: 2mm; font-family: monospace; }
                        .footer { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2mm; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                            .page-a4 { page-break-after: always; }
                            .page-a4:last-child { page-break-after: avoid; }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                    <script>
                        window.onload = () => {
                            setTimeout(() => { 
                                window.print(); 
                                window.close(); 
                            }, 1000);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Cập nhật Header Extra (nút bấm ở thanh nav)
    useEffect(() => {
        setHeaderExtra(
            <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                    onClick={() => printQRsA4(qrCodes)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                        backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px',
                        cursor: 'pointer', fontWeight: '700', fontSize: '13px'
                    }}
                >
                    <Files size={18} /> In toàn bộ A4 (4 thẻ/tờ)
                </button>
                <button 
                    onClick={() => setShowAddModal(true)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                        backgroundColor: '#A0301B', color: '#fff', border: 'none', borderRadius: '8px',
                        cursor: 'pointer', fontWeight: '700', fontSize: '13px'
                    }}
                >
                    <Plus size={18} /> Thêm mã mới
                </button>
            </div>
        );
    }, [qrCodes]);

    const handleAddQR = async (e) => {
        e.preventDefault();
        if (quantity < 1) return;
        try {
            const data = await api.post(`/deliveries/backup-qrs`, null, { params: { quantity } });
            setMessage({ type: 'success', text: data.message });
            setQuantity(10);
            setShowAddModal(false);
            fetchQRCodes();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Lỗi khi thêm mã QR.' });
        }
    };

    const handleRelease = async (qrId, qrCode) => {
        if (!window.confirm(`Giải phóng mã ${qrCode}?`)) return;
        try {
            await api.post(`/deliveries/backup-qrs/${qrId}/release`);
            setMessage({ type: 'success', text: `Đã giải phóng mã ${qrCode}.` });
            fetchQRCodes();
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi khi giải phóng mã QR.' });
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredQRs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredQRs.slice((page - 1) * pageSize, page * pageSize).map(qr => qr.id));
        }
    };

    const filteredQRs = qrCodes.filter(qr => qr.code.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="manufacture-plan-container">
            <div className="sticky-top-zone">
                {/* Thanh công cụ lọc và in - Đã đồng bộ style */}
                <div className="mgmt-toolbar card" style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    backgroundColor: '#fff', padding: '16px 20px', borderRadius: '16px',
                    marginBottom: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0', width: '100%'
                }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
                        <div style={{ position: 'relative', maxWidth: '400px', flex: 1 }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm mã thẻ..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ 
                                    width: '100%', padding: '10px 15px 10px 42px', border: '1px solid #e2e8f0', 
                                    borderRadius: '10px', outline: 'none', fontSize: '14px',
                                    backgroundColor: '#f8fafc', transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#A0301B'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <select 
                            value={pageSize} 
                            onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                            className="page-size-select"
                        >
                            <option value={15}>15 dòng</option>
                            <option value={30}>30 dòng</option>
                            <option value={50}>50 dòng</option>
                            <option value={100}>100 dòng</option>
                        </select>

                        {selectedIds.length > 0 && (
                            <button 
                                onClick={() => printQRsA4(qrCodes.filter(qr => selectedIds.includes(qr.id)))}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                                    backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px',
                                    cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                }}
                            >
                                <Printer size={18} /> In thẻ đã chọn ({selectedIds.length})
                            </button>
                        )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginLeft: '20px' }}>
                        {filteredQRs.length} / {qrCodes.length} mã QR
                    </div>
                </div>

                {/* Thông báo */}
                {message.text && (
                    <div style={{ 
                        padding: '12px 20px', borderRadius: '12px', marginTop: '10px', marginBottom: 0,
                        backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        animation: 'slideDown 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {message.type === 'success' ? <CheckSquare size={18} /> : <X size={18} />}
                            <span style={{ fontWeight: '500' }}>{message.text}</span>
                        </div>
                        <X size={18} onClick={() => setMessage({type:'', text:''})} style={{ cursor: 'pointer', opacity: 0.5 }} />
                    </div>
                )}
            </div>

            {/* Bảng dữ liệu - Sử dụng admin-list-layout chuẩn */}
            <div className="admin-list-layout">
                <div className="mgmt-table admin-table-card page-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="admin-table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px 24px', width: '60px', textAlign: 'left' }}>
                                <div onClick={toggleSelectAll} style={{ cursor: 'pointer', display: 'flex' }}>
                                    {selectedIds.length === filteredQRs.length && filteredQRs.length > 0 ? <CheckSquare size={20} color="#A0301B" /> : <Square size={20} color="#cbd5e1" />}
                                </div>
                            </th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Mã QR</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Trạng thái</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Phiếu đang gán</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredQRs.slice((page - 1) * pageSize, page * pageSize).map((qr) => (
                            <tr key={qr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 24px' }}>
                                    <div onClick={() => toggleSelect(qr.id)} style={{ cursor: 'pointer' }}>
                                        {selectedIds.includes(qr.id) ? <CheckSquare size={22} color="#A0301B" /> : <Square size={22} color="#cbd5e1" />}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 24px' }}>
                                    <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '15px' }}>{qr.code}</span>
                                </td>
                                <td style={{ padding: '12px 24px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                                            backgroundColor: qr.status === 'Trống' ? '#dcfce7' : '#fee2e2',
                                            color: qr.status === 'Trống' ? '#15803d' : '#b91c1c',
                                        }}>
                                            {qr.status === 'Trống' ? 'SẴN SÀNG' : 'ĐANG DÙNG'}
                                        </span>
                                        {qr.status !== 'Trống' && qr.scheduled_release_at && (
                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                                                Tự mở: {new Date(qr.scheduled_release_at).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'})}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 24px' }}>
                                    {qr.current_delivery_id ? (
                                        <span style={{ color: '#0ea5e9', fontWeight: '700' }}>#{qr.current_delivery_id}</span>
                                    ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                </td>
                                <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button 
                                            onClick={() => printQRsA4([qr])} 
                                            style={{ padding: '6px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                                        >
                                            <Printer size={15} />
                                        </button>
                                        {qr.status === 'Đang Sử Dụng' && (
                                            <button 
                                                onClick={() => handleRelease(qr.id, qr.code)} 
                                                style={{ padding: '6px 12px', background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                <Unlock size={15} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Phân trang - Desktop */}
                <div className="admin-pagination-desktop desktop-only">
                    <span className="pagination-info">
                        Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredQRs.length)} / {filteredQRs.length} kết quả
                    </span>
                    <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                            className="page-btn"
                        >
                            &lt; Trước
                        </button>
                        {[...Array(Math.ceil(filteredQRs.length / pageSize))].map((_, i) => (
                            <button
                                key={i}
                                className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                                onClick={() => setPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button 
                            disabled={page >= Math.ceil(filteredQRs.length / pageSize)} 
                            onClick={() => setPage(prev => Math.min(prev + 1, Math.ceil(filteredQRs.length / pageSize)))} 
                            className="page-btn"
                        >
                            Sau &gt;
                        </button>
                    </div>
                </div>
                </div>
            </div>

            {/* Phân trang - Mobile Sticky */}
            {Math.ceil(filteredQRs.length / pageSize) > 1 && (
                <div className="pagination-mobile-sticky mobile-only">
                    <button className="page-btn" onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={page === 1}>
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {page} / {Math.ceil(filteredQRs.length / pageSize) || 1}</span>
                    <button className="page-btn" onClick={() => setPage(prev => Math.min(prev + 1, Math.ceil(filteredQRs.length / pageSize)))} disabled={page >= Math.ceil(filteredQRs.length / pageSize)}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', width: '350px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Khai báo mã mới</h3>
                            <X size={20} onClick={() => setShowAddModal(false)} style={{ cursor: 'pointer', color: '#94a3b8' }} />
                        </div>
                        <form onSubmit={handleAddQR}>
                            <input 
                                type="number" 
                                min="1" 
                                max="200" 
                                autoFocus 
                                value={quantity} 
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                style={{ 
                                    width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', 
                                    borderRadius: '12px', marginBottom: '20px', outline: 'none', 
                                    fontSize: '24px', fontWeight: '800', textAlign: 'center',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', textAlign: 'center', lineHeight: '1.4' }}>
                                Nhập số lượng mã QR dự phòng muốn sinh tự động. Hệ thống sẽ tự tăng số thứ tự tiếp theo (Ví dụ: DP-013, DP-014...).
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '14px', background: '#A0301B', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '16px', cursor: 'pointer' }}>
                                XÁC NHẬN THÊM
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BackupQRManagement;
