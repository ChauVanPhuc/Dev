import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext } from 'react-router-dom';
import { Unlock, Plus, Printer, Search, X, CheckSquare, Square, Files, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const BackupQRManagement = () => {
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = useOutletContext() || {};

    // Lấy metadata từ database thay vì hardcode
    const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/backup-qrs');
    const [qrCodes, setQrCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const { toast } = useToast();
    const setMessage = (msg) => {
        if (msg && msg.text) {
            toast(msg.type, msg.text);
        }
    };

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
        fetchQRCodes();
    }, []);

    useEffect(() => {
        if (screenCode && title) {
            if (setCustomTitle) setCustomTitle(title);
            if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
            if (setCustomScreenCode) setCustomScreenCode(screenCode);
        }
    }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);


    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printItems, setPrintItems] = useState([]);
    const [cardsPerPage, setCardsPerPage] = useState(10); // 10 hoặc 8 hoặc 4

    const openPrintDialog = (items = qrCodes) => {
        if (items.length === 0) return toast('warning', 'Không có mã nào để in.');
        setPrintItems(items);
        setShowPrintModal(true);
    };

    const printQRsA4 = (items, perPage = 10) => {
        if (items.length === 0) return toast('warning', 'Không có mã nào để in.');

        // Chia các mã QR thành nhóm perPage (10, 8 hoặc 4) trên 1 trang A4
        const chunks = [];
        for (let i = 0; i < items.length; i += perPage) {
            chunks.push(items.slice(i, i + perPage));
        }

        const printWindow = window.open('', '_blank');
        const content = chunks.map((chunk) => {
            const cardsHtml = chunk.map((qr) => {
                if (perPage === 4) {
                    return `
                    <div class="card card-4">
                        <div class="system-label">HỆ THỐNG SMARTFLOW</div>
                        <div class="header">THẺ LUÂN CHUYỂN</div>
                        <div class="qr-container">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qr.code}" />
                        </div>
                        <div class="code-label">${qr.code}</div>
                        <div class="footer">Quét mã để tạo phiếu bàn giao</div>
                    </div>
                    `;
                }

                // Layout ngang cho 8 và 10 thẻ / trang A4 (cực kỳ rõ nét, QR to, mã số to rõ)
                const qrSize = perPage === 8 ? '44mm' : '36mm';
                return `
                <div class="card card-compact">
                    <div class="card-left">
                        <div class="system-label">HỆ THỐNG SMARTFLOW</div>
                        <div class="header">THẺ LUÂN CHUYỂN</div>
                        <div class="code-label">${qr.code}</div>
                        <div class="footer">Quét mã để tạo phiếu bàn giao</div>
                    </div>
                    <div class="qr-container">
                        <img style="width: ${qrSize}; height: ${qrSize}; object-fit: contain;" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qr.code}" />
                    </div>
                </div>
                `;
            }).join('');
            return `<div class="page-a4 page-a4-${perPage}">${cardsHtml}</div>`;
        }).join('');

        const gridRows = perPage === 10 ? 'repeat(5, 1fr)' : (perPage === 8 ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)');
        const pagePadding = perPage === 10 ? '5mm 6mm' : (perPage === 8 ? '7mm 8mm' : '12mm');
        const pageGap = perPage === 10 ? '3mm 4mm' : (perPage === 8 ? '5mm 6mm' : '12mm');
        const codeSize = perPage === 10 ? '22px' : (perPage === 8 ? '26px' : '32px');
        const headerSize = perPage === 10 ? '12px' : (perPage === 8 ? '14px' : '18px');

        printWindow.document.write(`
            <html>
                <head>
                    <title>In Thẻ QR (${perPage} thẻ trên trang A4)</title>
                    <style>
                        @page { size: A4 portrait; margin: 0; }
                        * { box-sizing: border-box; }
                        body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .page-a4 { 
                            width: 210mm; 
                            height: 297mm; 
                            display: grid; 
                            grid-template-columns: repeat(2, 1fr); 
                            grid-template-rows: ${gridRows}; 
                            padding: ${pagePadding}; 
                            gap: ${pageGap}; 
                            box-sizing: border-box; 
                            page-break-after: always; 
                        }
                        .page-a4:last-child { page-break-after: avoid; }
                        .card { 
                            border: 1.5px dashed #64748b; 
                            border-radius: 8px; 
                            display: flex; 
                            align-items: center; 
                            justify-content: space-between; 
                            padding: 3mm 5mm; 
                            box-sizing: border-box; 
                            height: 100%;
                            background: #fff;
                        }
                        .card-4 { 
                            flex-direction: column; 
                            padding: 8mm; 
                            text-align: center;
                        }
                        .card-compact {
                            flex-direction: row;
                        }
                        .card-left {
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            text-align: left;
                            gap: 2px;
                        }
                        .system-label { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                        .header { font-size: ${headerSize}; font-weight: 900; color: #1e293b; letter-spacing: 0.5px; }
                        .code-label { font-size: ${codeSize}; font-weight: 900; color: #000; font-family: monospace; letter-spacing: 0.5px; line-height: 1.2; margin: 2px 0; }
                        .footer { font-size: 8px; color: #475569; font-weight: 600; }
                        .qr-container { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
                            }, 800);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Cập nhật Header Extra (nút bấm ở thanh nav)
    useEffect(() => {
        if (typeof setHeaderExtra === 'function') {
            setHeaderExtra(
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => openPrintDialog(qrCodes)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                            backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '700', fontSize: '13px'
                        }}
                    >
                        <Files size={18} /> In thẻ A4 (8 - 10 thẻ/tờ)
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
        }
        return () => {
            if (typeof setHeaderExtra === 'function') {
                setHeaderExtra(null);
            }
        };
    }, [qrCodes, setHeaderExtra]);

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

    const filteredQRs = qrCodes.filter(qr => {
        const matchesSearch = qr.code.toLowerCase().includes(searchTerm.toLowerCase());
        if (statusFilter === 'ready') return matchesSearch && qr.status === 'Trống';
        if (statusFilter === 'in_use') return matchesSearch && qr.status !== 'Trống';
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredQRs.length / pageSize) || 1;

    return (
        <div className="gold-layout">
            <div className="sticky-top-zone">
                {/* Thanh công cụ lọc và in - Đồng bộ chuẩn hệ thống */}
                <PageToolbar
                    searchValue={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); setPage(1); }}
                    searchPlaceholder="Tìm kiếm mã thẻ..."
                    showFilter={true}
                    isFilterOpen={isFilterBarOpen}
                    onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
                    activeFiltersCount={statusFilter !== 'all' ? 1 : 0}
                    extraActions={selectedIds.length > 0 ? [
                        {
                            label: `In thẻ đã chọn (${selectedIds.length})`,
                            icon: <Printer size={14} />,
                            onClick: () => openPrintDialog(qrCodes.filter(qr => selectedIds.includes(qr.id)))
                        }
                    ] : []}
                    hasWritePermission={true}
                />

                {isFilterBarOpen && (
                    <div className="filter-inline-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '14px 20px', backgroundColor: '#FAF6F0', borderRadius: '12px', border: '1.5px solid #EADCC9', marginBottom: '12px', alignItems: 'flex-end' }}>
                        {/* Trạng thái sử dụng */}
                        <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Trạng thái sử dụng</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '180px' }}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="ready">SẴN SÀNG (Trống)</option>
                                <option value="in_use">ĐANG DÙNG (Đang sử dụng)</option>
                            </select>
                        </div>

                        {/* Hiển thị số dòng */}
                        <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Hiển thị số dòng</label>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '120px' }}
                            >
                                <option value={15}>15 dòng</option>
                                <option value={30}>30 dòng</option>
                                <option value={50}>50 dòng</option>
                                <option value={100}>100 dòng</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Bảng dữ liệu - Sử dụng admin-list-layout chuẩn gold-layout */}
            <div className="admin-list-layout">
                <div className="mgmt-table admin-table-card card-shadow" style={{ position: 'relative', backgroundColor: 'white' }}>
                    <div className="table-responsive admin-table-scroll">
                        <table className="manufacture-table data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px', textAlign: 'center' }}>
                                        <div onClick={toggleSelectAll} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {selectedIds.length === filteredQRs.length && filteredQRs.length > 0 ? <CheckSquare size={18} color="#7B5233" /> : <Square size={18} color="#cbd5e1" />}
                                        </div>
                                    </th>
                                    <th style={{ textAlign: 'left' }}>MÃ QR</th>
                                    <th style={{ textAlign: 'left' }}>TRẠNG THÁI</th>
                                    <th style={{ textAlign: 'left' }}>PHIẾU ĐANG GÁN</th>
                                    <th style={{ textAlign: 'center', width: '120px' }}>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px 24px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                <span>Đang tải danh sách mã QR...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredQRs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                            Không tìm thấy mã QR nào phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQRs.slice((page - 1) * pageSize, page * pageSize).map((qr) => (
                                        <tr key={qr.id}>
                                            <td style={{ textAlign: 'center' }}>
                                                <div onClick={() => toggleSelect(qr.id)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {selectedIds.includes(qr.id) ? <CheckSquare size={18} color="#7B5233" /> : <Square size={18} color="#cbd5e1" />}
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px', fontFamily: 'monospace' }}>{qr.code}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                    {qr.status === 'Trống' ? (
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '700',
                                                            backgroundColor: '#D1FAE5', color: '#065F46', display: 'inline-flex', alignItems: 'center', gap: '5px'
                                                        }}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }} />
                                                            SẴN SÀNG
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '700',
                                                            backgroundColor: '#FEE2E2', color: '#991B1B', display: 'inline-flex', alignItems: 'center', gap: '5px'
                                                        }}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
                                                            ĐANG DÙNG
                                                        </span>
                                                    )}
                                                    {qr.status !== 'Trống' && qr.scheduled_release_at && (
                                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                                                            Tự mở: {new Date(qr.scheduled_release_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {qr.current_delivery_id ? (
                                                    <span style={{ color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                                                        #{qr.current_delivery_id}
                                                    </span>
                                                ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => openPrintDialog([qr])}
                                                        title="In mã QR này"
                                                        style={{ padding: '5px 10px', background: '#FAF8F6', border: '1px solid #EADCC9', color: '#7B5233', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                    {qr.status === 'Đang Sử Dụng' && (
                                                        <button
                                                            onClick={() => handleRelease(qr.id, qr.code)}
                                                            title="Giải phóng mã"
                                                            style={{ padding: '5px 10px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Unlock size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Phân trang - Desktop chuẩn Gold Layout */}
                    <div className="admin-pagination-desktop desktop-only">
                        <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                            Hiển thị <b>{filteredQRs.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, filteredQRs.length)}</b> trên <b>{filteredQRs.length}</b> mã QR
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                    className="page-btn"
                                    title="Trang trước"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                {(() => {
                                    const pages = [];
                                    const delta = 2;
                                    for (let i = 1; i <= totalPages; i++) {
                                        if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                                            pages.push(i);
                                        } else if (pages[pages.length - 1] !== '...') {
                                            pages.push('...');
                                        }
                                    }
                                    return pages.map((p, idx) => {
                                        if (p === '...') {
                                            return (
                                                <span key={`ell-${idx}`} style={{ padding: '0 4px', color: '#8D6E63', fontWeight: '700' }}>
                                                    ...
                                                </span>
                                            );
                                        }
                                        return (
                                            <button
                                                key={p}
                                                className={`page-btn ${page === p ? 'active' : ''}`}
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </button>
                                        );
                                    });
                                })()}
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                    className="page-btn"
                                    title="Trang tiếp"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Phân trang - Mobile Sticky */}
            {totalPages > 1 && (
                <div className="pagination-mobile-sticky mobile-only">
                    <button className="page-btn" onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={page === 1}>
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {page} / {totalPages}</span>
                    <button className="page-btn" onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} disabled={page >= totalPages}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Modal Tùy chọn In A4 (10 / 8 / 4 thẻ) */}
            {showPrintModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: '#fff', padding: '28px', borderRadius: '20px', width: '420px', maxWidth: '92vw', boxShadow: '0 25px 35px -5px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#A0301B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Printer size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Tùy chọn in Thẻ QR A4</h3>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Đang chọn <b>{printItems.length}</b> thẻ để in</span>
                                </div>
                            </div>
                            <X size={20} onClick={() => setShowPrintModal(false)} style={{ cursor: 'pointer', color: '#94a3b8' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Chọn số thẻ trên 1 tờ giấy A4:</label>
                            
                            {/* Lựa chọn 10 thẻ/tờ */}
                            <div
                                onClick={() => setCardsPerPage(10)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                                    border: cardsPerPage === 10 ? '2px solid #A0301B' : '1.5px solid #e2e8f0',
                                    backgroundColor: cardsPerPage === 10 ? '#fff7ed' : '#f8fafc'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: '800', fontSize: '14px', color: cardsPerPage === 10 ? '#9a3412' : '#1e293b' }}>
                                        ⚡ 10 thẻ / tờ A4 (2 cột x 5 hàng)
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        Tiết kiệm giấy tối đa (Dự kiến {Math.ceil(printItems.length / 10)} trang A4)
                                    </span>
                                </div>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: cardsPerPage === 10 ? '5px solid #A0301B' : '2px solid #cbd5e1' }} />
                            </div>

                            {/* Lựa chọn 8 thẻ/tờ */}
                            <div
                                onClick={() => setCardsPerPage(8)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                                    border: cardsPerPage === 8 ? '2px solid #A0301B' : '1.5px solid #e2e8f0',
                                    backgroundColor: cardsPerPage === 8 ? '#fff7ed' : '#f8fafc'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: '800', fontSize: '14px', color: cardsPerPage === 8 ? '#9a3412' : '#1e293b' }}>
                                        📄 8 thẻ / tờ A4 (2 cột x 4 hàng)
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        Cân đối, mã to rõ nét (Dự kiến {Math.ceil(printItems.length / 8)} trang A4)
                                    </span>
                                </div>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: cardsPerPage === 8 ? '5px solid #A0301B' : '2px solid #cbd5e1' }} />
                            </div>

                            {/* Lựa chọn 4 thẻ/tờ */}
                            <div
                                onClick={() => setCardsPerPage(4)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                                    border: cardsPerPage === 4 ? '2px solid #A0301B' : '1.5px solid #e2e8f0',
                                    backgroundColor: cardsPerPage === 4 ? '#fff7ed' : '#f8fafc'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: '800', fontSize: '14px', color: cardsPerPage === 4 ? '#9a3412' : '#1e293b' }}>
                                        🔲 4 thẻ / tờ A4 (2 cột x 2 hàng)
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        Kích thước thẻ lớn (Dự kiến {Math.ceil(printItems.length / 4)} trang A4)
                                    </span>
                                </div>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: cardsPerPage === 4 ? '5px solid #A0301B' : '2px solid #cbd5e1' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setShowPrintModal(false)}
                                style={{ flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPrintModal(false);
                                    printQRsA4(printItems, cardsPerPage);
                                }}
                                style={{ flex: 2, padding: '12px', border: 'none', backgroundColor: '#A0301B', color: '#fff', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Printer size={18} /> BẮT ĐẦU IN ({cardsPerPage} THẺ/TỜ)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Thêm mã mới */}
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
