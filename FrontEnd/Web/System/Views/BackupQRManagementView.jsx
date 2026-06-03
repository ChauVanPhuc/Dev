import React, { useState, useEffect } from 'react';
import api from '@web/Shared/Services/api.service';
import { useOutletContext } from 'react-router-dom';
import { RefreshCw, Unlock, Plus, Printer, Search, X, CheckSquare, Square, Files } from 'lucide-react';

const BackupQRManagement = () => {
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = useOutletContext();
    const [qrCodes, setQrCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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


    const printQRsA5 = (items) => {
        if (items.length === 0) return alert('Không có mã nào để in.');
        
        const printWindow = window.open('', '_blank');
        const content = items.map((qr) => `
            <div class="page-a5">
                <div class="card">
                    <div class="system-label">HỆ THỐNG SMARTFLOW</div>
                    <div class="header">THẺ LUÂN CHUYỂN</div>
                    <div class="qr-container">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qr.code}" />
                    </div>
                    <div class="code-label">${qr.code}</div>
                    <div class="footer">Quét mã để tạo phiếu bàn giao</div>
                </div>
            </div>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>In Thẻ QR (A7 giữa giấy A5)</title>
                    <style>
                        @page { size: A5 portrait; margin: 0; }
                        body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
                        .page-a5 { 
                            width: 148mm; 
                            height: 210mm; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            box-sizing: border-box; 
                            overflow: hidden; 
                        }
                        .page-a5:not(:last-child) { page-break-after: always; }
                        .card { 
                            width: 74mm; /* Kích thước A7 */
                            height: 105mm; 
                            border: 2px dashed #94a3b8; 
                            border-radius: 8px; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: space-between; 
                            padding: 6mm; 
                            box-sizing: border-box; 
                            text-align: center;
                        }
                        .system-label { font-size: 10px; font-weight: 700; color: #333; margin-top: 2mm; }
                        .header { font-size: 16px; font-weight: 900; color: #000; letter-spacing: 0.5px; margin-top: 2mm; }
                        .qr-container { flex: 1; display: flex; align-items: center; justify-content: center; margin: 4px 0; }
                        .qr-container img { width: 45mm; height: 45mm; object-fit: contain; }
                        .code-label { font-size: 26px; font-weight: 900; color: #000; margin-bottom: 2mm; }
                        .footer { font-size: 9px; color: #555; margin-bottom: 2mm; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                            .page-a5 { page-break-after: always; }
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
                    onClick={() => printQRsA5(qrCodes)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                        backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px',
                        cursor: 'pointer', fontWeight: '700', fontSize: '13px'
                    }}
                >
                    <Files size={18} /> In toàn bộ A5 (Thẻ A7)
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
            setSelectedIds(filteredQRs.map(qr => qr.id));
        }
    };

    const filteredQRs = qrCodes.filter(qr => qr.code.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="backup-qr-page">
            {/* Thanh công cụ lọc và in - Đã đồng bộ style */}
            <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                backgroundColor: '#fff', padding: '16px 20px', borderRadius: '16px',
                marginBottom: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
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
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={() => printQRsA5(qrCodes.filter(qr => selectedIds.includes(qr.id)))}
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
                    padding: '12px 20px', borderRadius: '12px', marginBottom: '20px',
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

            {/* Bảng dữ liệu - Sử dụng khung card chuẩn */}
            <div className="page-card" style={{ padding: 0, overflow: 'hidden' }}>
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
                        {filteredQRs.map((qr) => (
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
                                            onClick={() => printQRsA5([qr])} 
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
