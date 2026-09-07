import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { 
    ChevronLeft, 
    FileText, 
    Truck, 
    ClipboardCheck, 
    ShieldCheck,
    Calendar,
    User,
    Package,
    ArrowRight,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Eye,
    Clock,
    FileDown,
    X,
    Layers,
    Folder,
    Tag,
    Sliders,
    Building2,
    FileCheck,
    Info,
    Search,
    Filter
} from 'lucide-react';
import { qualityService } from '@modules/QualityRecords/Models/quality.service';
import { API_ROOT } from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import ExcelJS from 'exceljs';

const QualityRecordsDetailView = () => {
    const { id } = useParams(); // poCode
    const navigate = useNavigate();
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
    // Lấy metadata từ database
    const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/quality-records/:id');
    const [activeTab, setActiveTab] = useState('handover');
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [orderInfo, setOrderInfo] = useState(null);
    const [handoverData, setHandoverData] = useState([]);
    const [allInspectionsData, setAllInspectionsData] = useState([]);
    const [bomData, setBomData] = useState([]);
    
    // Filter States
    const [inspectionTypeFilter, setInspectionTypeFilter] = useState('all');
    const [bomStageFilter, setBomStageFilter] = useState('all');
    
    // Modal States
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    // State cho xuất file Excel
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedExportOption, setSelectedExportOption] = useState('all_tabs');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (screenCode && title) {
            if (setCustomTitle) setCustomTitle(title);
            if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
            if (setCustomScreenCode) setCustomScreenCode(screenCode);
        }
    }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

    // Fetch Data
    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const [order, handover, allInspections, bom] = await Promise.all([
                    qualityService.getOrderDetail(id).catch(() => null),
                    qualityService.getHandoverHistory(id).catch(() => []),
                    qualityService.getAllPOInspections(id).catch(() => []),
                    qualityService.getPOBOM(id).catch(() => [])
                ]);

                setOrderInfo(order);
                setHandoverData(handover || []);
                setAllInspectionsData(allInspections || []);
                setBomData(bom || []);
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu chi tiết hồ sơ:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [id]);

    // --- 5 TABS SETUP ---
    const tabs = [
        { id: 'handover', label: `Lịch sử bàn giao (${handoverData.length})`, icon: <Truck size={18} /> },
        { id: 'all_inspections', label: `Tất cả phiếu kiểm tra (${allInspectionsData.length})`, icon: <ClipboardCheck size={18} /> },
        { id: 'production_order', label: 'Lệnh sản xuất', icon: <FileText size={18} /> },
        { id: 'bom_drawings', label: `Bản vẽ / BOM (${bomData.length})`, icon: <Layers size={18} /> },
        { id: 'others', label: 'Khác', icon: <Folder size={18} /> }
    ];

    // Helper functions
    const formatDate = (dateStr) => {
        if (!dateStr) return "---";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "---";
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return "---";
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "";
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "";
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Hoàn thành':
            case 'Đã Nhận Hàng':
            case 'Pass':
            case 'Đạt':
                return { bg: '#E8F5E9', color: '#2E7D32' };
            case 'Chờ Nhận Hàng':
            case 'Chờ Xác Nhận':
            case 'Chờ':
                return { bg: '#FFF3E0', color: '#E65100' };
            case 'Lỗi':
            case 'Từ chối':
            case 'Fail':
            case 'Không đạt':
                return { bg: '#FFEBEE', color: '#C62828' };
            default:
                return { bg: '#F5F5F5', color: '#757575' };
        }
    };

    // Open item detail modal
    const handleOpenModal = (e, item, type) => {
        if (e) {
            if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
            e.preventDefault();
            e.stopPropagation();
        }
        setSelectedItem({ ...item, modalType: type });
        setIsModalOpen(true);
    };

    const handleCloseModal = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const renderImageGallery = (images) => {
        if (!images || images.length === 0) return null;
        
        const normalizedImages = images.map(img => 
            typeof img === 'string' ? img : img.image_path || img.url
        ).filter(Boolean);

        const displayImages = normalizedImages.slice(0, 3);
        if (displayImages.length === 0) return null;

        return (
            <div style={{ marginTop: '8px' }}>
                <div className="card-label">Ảnh minh chứng ({displayImages.length})</div>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '6px',
                    marginTop: '4px'
                }}>
                    {displayImages.map((path, i) => {
                        const fullUrl = path.startsWith('http') ? path : `${API_ROOT}${path.replace(/^\//, '')}`;
                        return (
                            <img 
                                key={i}
                                src={fullUrl} 
                                style={{ 
                                    width: '100%', 
                                    height: '70px', 
                                    objectFit: 'cover', 
                                    borderRadius: '6px', 
                                    border: '1px solid #EADCC9', 
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                alt={`Evidence ${i + 1}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImage(fullUrl);
                                    setImageZoom(1);
                                    setImagePan({ x: 0, y: 0 });
                                    setIsDragging(false);
                                    setImageModalOpen(true);
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.03)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- EXCEL EXPORT LOGIC ---
    const formatExcelHeader = (worksheet, headerTitle, columnsCount) => {
        worksheet.mergeCells(1, 1, 1, columnsCount);
        const titleCell = worksheet.getCell(1, 1);
        titleCell.value = headerTitle;
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B5233' } };
        worksheet.getRow(1).height = 40;

        worksheet.mergeCells(2, 1, 2, columnsCount);
        const subCell = worksheet.getCell(2, 1);
        subCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Hệ thống SmartFlow v2`;
        subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '4B301E' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAF6F0' } };
        worksheet.getRow(2).height = 24;
        worksheet.getRow(3).height = 15;
    };

    const styleTableHeaderRow = (worksheet, rowNumber, columnsCount) => {
        worksheet.views = [{ state: 'frozen', ySplit: rowNumber }];
        const row = worksheet.getRow(rowNumber);
        row.height = 26;
        for (let c = 1; c <= columnsCount; c++) {
            const cell = worksheet.getCell(rowNumber, c);
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B5233' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'EADCC9' } },
                bottom: { style: 'medium', color: { argb: '4B301E' } },
                left: { style: 'thin', color: { argb: 'EADCC9' } },
                right: { style: 'thin', color: { argb: 'EADCC9' } }
            };
        }
    };

    const applyDefaultBorders = (worksheet, startRow, endRow, colsCount) => {
        for (let r = startRow; r <= endRow; r++) {
            const row = worksheet.getRow(r);
            row.height = 20;
            const isEven = r % 2 === 0;
            for (let c = 1; c <= colsCount; c++) {
                const cell = worksheet.getCell(r, c);
                cell.font = { name: 'Arial', size: 10 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'EADCC9' } },
                    bottom: { style: 'thin', color: { argb: 'EADCC9' } },
                    left: { style: 'thin', color: { argb: 'EADCC9' } },
                    right: { style: 'thin', color: { argb: 'EADCC9' } }
                };
                if (isEven) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAF9F6' } };
                }
            }
        }
    };

    const triggerFileDownload = async (workbook, fileName) => {
        const safeFileName = fileName.replace(/[\/\\:*?"<>|]/g, '_');
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = safeFileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    };

    const fillHandoverSheet = (sheet, data) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Thời Gian Bàn Giao', key: 'time', width: 20 },
            { header: 'Linh Kiện / Sản Phẩm', key: 'part', width: 25 },
            { header: 'Công Đoạn Giao', key: 'stage_from', width: 20 },
            { header: 'Công Đoạn Nhận', key: 'stage_to', width: 20 },
            { header: 'Số Lượng Total', key: 'qty', width: 15 },
            { header: 'Số Lượng OK', key: 'qty_ok', width: 15 },
            { header: 'Số Lượng NG', key: 'qty_ng', width: 15 },
            { header: 'Người Giao', key: 'sender', width: 20 },
            { header: 'Người Nhận', key: 'receiver', width: 20 },
            { header: 'Trạng Thái', key: 'status', width: 15 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `LỊCH SỬ BÀN GIAO SẢN XUẤT - PO: ${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        data.forEach((item, idx) => {
            sheet.addRow({
                stt: idx + 1,
                time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---',
                part: item.part_name || item.product_name || '---',
                stage_from: item.delivery_stage || '---',
                stage_to: item.receiving_stage || '---',
                qty: item.quantity_total || 0,
                qty_ok: item.quantity_ok ?? item.quantity_total ?? 0,
                qty_ng: item.quantity_ng ?? 0,
                sender: item.sx_delivery_name || '---',
                receiver: item.sx_receipt_name || '---',
                status: item.status || '---'
            });
        });

        applyDefaultBorders(sheet, 5, data.length + 4, cols.length);
        for (let r = 5; r <= data.length + 4; r++) {
            sheet.getCell(r, 1).alignment = { horizontal: 'center' };
            sheet.getCell(r, 2).alignment = { horizontal: 'center' };
            sheet.getCell(r, 6).alignment = { horizontal: 'right' };
            sheet.getCell(r, 7).alignment = { horizontal: 'right' };
            sheet.getCell(r, 8).alignment = { horizontal: 'right' };
            sheet.getCell(r, 11).alignment = { horizontal: 'center' };
        }
    };

    const fillAllInspectionsSheet = (sheet, data) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Mã Phiếu', key: 'ticket_code', width: 15 },
            { header: 'Loại Phiếu QC', key: 'type_label', width: 22 },
            { header: 'Công Đoạn', key: 'stage', width: 18 },
            { header: 'Tên Linh Kiện / SP', key: 'part', width: 25 },
            { header: 'Quy Cách Kỹ Thuật', key: 'spec', width: 22 },
            { header: 'Người Kiểm Tra', key: 'inspector', width: 20 },
            { header: 'Kết Quả', key: 'result', width: 15 },
            { header: 'Thời Gian Tảo', key: 'time', width: 20 },
            { header: 'Ghi Chú', key: 'note', width: 25 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `TẤT CẢ PHIẾU KIỂM TRA QC - PO: ${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        data.forEach((item, idx) => {
            sheet.addRow({
                stt: idx + 1,
                ticket_code: item.ticket_code || `DA${item.id}`,
                type_label: item.type_label || item.inspection_type || 'Mẫu đầu tiên',
                stage: item.stage || '---',
                part: item.part_name || '---',
                spec: item.specification || '---',
                inspector: item.inspector_name || 'QC Staff',
                result: item.result || (item.is_pass ? 'ĐẠT' : 'LỖI'),
                time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---',
                note: item.note || '---'
            });
        });

        applyDefaultBorders(sheet, 5, data.length + 4, cols.length);
        for (let r = 5; r <= data.length + 4; r++) {
            sheet.getCell(r, 1).alignment = { horizontal: 'center' };
            sheet.getCell(r, 2).alignment = { horizontal: 'center' };
            sheet.getCell(r, 8).alignment = { horizontal: 'center' };
            sheet.getCell(r, 9).alignment = { horizontal: 'center' };
        }
    };

    const fillProductionOrderSheet = (sheet, order) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Mã SKU', key: 'sku', width: 20 },
            { header: 'Tên Sản Phẩm', key: 'name', width: 35 },
            { header: 'Quy Cách', key: 'spec', width: 25 },
            { header: 'Số Lượng Yêu Cầu', key: 'order_qty', width: 18 },
            { header: 'Vào Lệnh (S.X)', key: 'production_qty', width: 18 },
            { header: 'Bù Hao', key: 'loss_qty', width: 15 },
            { header: 'Tổng Số Lượng', key: 'total_qty', width: 18 },
            { header: 'Trạng Thái', key: 'status', width: 15 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `LỆNH SẢN XUẤT CHI TIẾT PO: ${id}`, cols.length);

        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        const prods = order?.products || [];
        prods.forEach((p, idx) => {
            sheet.addRow({
                stt: idx + 1,
                sku: p.sku || '---',
                name: p.name || '---',
                spec: p.specification || '---',
                order_qty: p.order_qty || p.quantity || 0,
                production_qty: p.production_qty || 0,
                loss_qty: p.loss_qty || 0,
                total_qty: p.total_qty || p.quantity || 0,
                status: p.status || 'Active'
            });
        });

        applyDefaultBorders(sheet, 5, prods.length + 4, cols.length);
        for (let r = 5; r <= prods.length + 4; r++) {
            sheet.getCell(r, 1).alignment = { horizontal: 'center' };
            sheet.getCell(r, 5).alignment = { horizontal: 'right' };
            sheet.getCell(r, 6).alignment = { horizontal: 'right' };
            sheet.getCell(r, 7).alignment = { horizontal: 'right' };
            sheet.getCell(r, 8).alignment = { horizontal: 'right' };
            sheet.getCell(r, 9).alignment = { horizontal: 'center' };
        }
    };

    const fillBOMSheet = (sheet, bData) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Tên Linh Kiện', key: 'part', width: 30 },
            { header: 'Kích Thước Quy Cách (D*R*C)', key: 'spec', width: 28 },
            { header: 'Công Đoạn Đầu Vào', key: 'in_stage', width: 22 },
            { header: 'Công Đoạn Đầu Ra', key: 'out_stage', width: 22 },
            { header: 'Đơn Vị', key: 'unit', width: 12 },
            { header: 'Định Mức / Qty', key: 'qty', width: 15 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `DANH MỤC BOM CHI TIẾT SẢN XUẤT - PO: ${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        bData.forEach((item, idx) => {
            const specStr = item.specification || (item.specs && item.specs[0]) || '---';
            sheet.addRow({
                stt: idx + 1,
                part: item.part_name || item.name || '---',
                spec: specStr,
                in_stage: item.input_stage || item.stage || '---',
                out_stage: item.output_stage || '---',
                unit: item.unit || 'Chiếc',
                qty: item.quantity || 1
            });
        });

        applyDefaultBorders(sheet, 5, bData.length + 4, cols.length);
        for (let r = 5; r <= bData.length + 4; r++) {
            sheet.getCell(r, 1).alignment = { horizontal: 'center' };
            sheet.getCell(r, 6).alignment = { horizontal: 'center' };
            sheet.getCell(r, 7).alignment = { horizontal: 'right' };
        }
    };

    const handleExportAllTabs = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet1 = workbook.addWorksheet('Lệnh Sản Xuất');
            fillProductionOrderSheet(sheet1, orderInfo);

            const sheet2 = workbook.addWorksheet('Lịch Sử Bàn Giao');
            fillHandoverSheet(sheet2, handoverData);

            const sheet3 = workbook.addWorksheet('Tất Cả Phiếu Kiểm Tra');
            fillAllInspectionsSheet(sheet3, allInspectionsData);

            const sheet4 = workbook.addWorksheet('Danh Mục BOM');
            fillBOMSheet(sheet4, bomData);

            await triggerFileDownload(workbook, `Ho_So_CL_Full_PO_${id}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi xuất Excel:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCurrentTab = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            if (activeTab === 'handover') {
                const sheet = workbook.addWorksheet('Lịch Sử Bàn Giao');
                fillHandoverSheet(sheet, handoverData);
            } else if (activeTab === 'all_inspections') {
                const sheet = workbook.addWorksheet('Tất Cả Phiếu Kiểm Tra');
                fillAllInspectionsSheet(sheet, allInspectionsData);
            } else if (activeTab === 'production_order') {
                const sheet = workbook.addWorksheet('Lệnh Sản Xuất');
                fillProductionOrderSheet(sheet, orderInfo);
            } else if (activeTab === 'bom_drawings') {
                const sheet = workbook.addWorksheet('BOM Chi Tiết');
                fillBOMSheet(sheet, bomData);
            }
            await triggerFileDownload(workbook, `Ho_So_CL_PO_${id}_${activeTab}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi xuất tab hiện tại:", error);
        } finally {
            setIsExporting(false);
        }
    };

    // Lọc danh sách phiếu kiểm tra cho Tab 2
    const filteredInspections = allInspectionsData.filter(item => {
        if (inspectionTypeFilter === 'all') return true;
        return item.type_label === inspectionTypeFilter || item.inspection_type === inspectionTypeFilter;
    });

    // Lọc danh sách BOM cho Tab 4
    const filteredBOM = bomData.filter(item => {
        if (bomStageFilter === 'all') return true;
        const stg = (item.input_stage || item.stage || '').toLowerCase();
        return stg.includes(bomStageFilter.toLowerCase());
    });

    return (
        <div className="quality-detail-container" style={{ padding: '1rem', width: '100%', boxSizing: 'border-box' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .detail-card {
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid #EADCC9;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(123, 82, 51, 0.05);
                }
                .tab-container {
                    display: flex;
                    gap: 10px;
                    border-bottom: 1px solid #EADCC9;
                    margin-bottom: 1.5rem;
                    overflow-x: auto;
                    scrollbar-width: none;
                    padding-bottom: 2px;
                }
                .tab-btn {
                    padding: 0.65rem 1.25rem;
                    border: 1px solid transparent;
                    border-radius: 8px 8px 0 0;
                    background: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #8D6E63;
                    font-weight: 700;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                    white-space: nowrap;
                    margin-bottom: -1px;
                }
                .tab-btn.active {
                    color: #7B5233;
                    background-color: #FAF6F0;
                    border: 1px solid #EADCC9;
                    border-bottom-color: #FAF6F0;
                }
                .tab-btn:hover:not(.active) {
                    background: #FAF6F0;
                    color: #7B5233;
                }

                .history-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 0.75rem;
                    padding: 0.5rem;
                }
                @media (min-width: 768px) {
                    .history-grid { grid-template-columns: repeat(3, 1fr); }
                }
                @media (min-width: 1280px) {
                    .history-grid { grid-template-columns: repeat(4, 1fr); }
                }

                .history-card {
                    background: #fff;
                    border: 1px solid #EADCC9;
                    border-radius: 10px;
                    padding: 0.85rem;
                    position: relative;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    cursor: pointer;
                }
                .history-card:hover {
                    border-color: #7B5233;
                    background-color: #FAF6F0;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(123, 82, 51, 0.08);
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 1px dashed #EADCC9;
                    padding-bottom: 0.4rem;
                }
                .card-label {
                    font-size: 0.65rem;
                    color: #8D6E63;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 1px;
                }
                .card-value {
                    font-size: 0.82rem;
                    color: #2D1A12;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .card-badge {
                    padding: 3px 9px;
                    border-radius: 20px;
                    font-size: 0.65rem;
                    font-weight: 800;
                }
                .card-row { display: flex; gap: 0.5rem; }
                .card-col { flex: 1; min-width: 0; }

                /* Filter Pill Bar */
                .filter-pill-bar {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 1rem;
                    overflow-x: auto;
                    padding-bottom: 4px;
                }
                .filter-pill {
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    border: 1px solid #EADCC9;
                    background: #fff;
                    color: #8D6E63;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }
                .filter-pill.active {
                    background: #7B5233;
                    color: #fff;
                    border-color: #7B5233;
                }

                /* Table Styling */
                .custom-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.88rem;
                }
                .custom-table th {
                    background: #FAF6F0;
                    color: #7B5233;
                    font-weight: 800;
                    padding: 10px 12px;
                    text-align: left;
                    border-bottom: 2px solid #EADCC9;
                }
                .custom-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #FAF6F0;
                    color: #2D1A12;
                }
                .custom-table tr:hover {
                    background: #FAF9F6;
                }

                /* Modal Overlay */
                .modal-overlay {
                    position: fixed !important;
                    top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.75) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 999999 !important;
                    padding: 20px !important;
                    backdrop-filter: blur(2px) !important;
                }
                .modal-content {
                    background: #ffffff !important;
                    border-radius: 16px !important;
                    width: 100% !important;
                    max-width: 650px !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    position: relative !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    border: 2px solid #7B5233 !important;
                }
                .modal-header {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #EADCC9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    background: #fff;
                    z-index: 10;
                }
                .modal-body { padding: 1.5rem; }
                .detail-row {
                    display: flex;
                    padding: 10px 0;
                    border-bottom: 1px solid #FAF6F0;
                }
                .detail-label {
                    flex: 0 0 160px;
                    font-size: 0.85rem;
                    color: #8D6E63;
                    font-weight: 700;
                }
                .detail-value {
                    flex: 1;
                    font-size: 0.9rem;
                    color: #2D1A12;
                    font-weight: 600;
                }
            `}} />

            {/* Header Info */}
            <div className="detail-card card-shadow">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>Đang tải thông tin đơn hàng...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>MÃ ĐƠN HÀNG / PO</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7B5233' }}>#{orderInfo?.order_code || id}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>KHÁCH HÀNG</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#2D1A12' }}>{orderInfo?.customer || '---'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>SẢN PHẨM SẢN XUẤT</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#2D1A12' }}>
                                {orderInfo?.products?.length || 0} loại ({orderInfo?.products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || 0} chiếc)
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowExportModal(true)}
                                style={{
                                    backgroundColor: '#7B5233',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(123, 82, 51, 0.1)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5D4037'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
                            >
                                <FileDown size={18} />
                                Xuất Excel PO
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs Bar */}
            <div className="tab-container">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            <div className="detail-card card-shadow" style={{ padding: '1.25rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải dữ liệu hồ sơ chất lượng...</div>
                ) : (
                    <>
                        {/* TAB 1: LỊCH SỬ BÀN GIAO (ID) */}
                        {activeTab === 'handover' && (
                            <div className="history-grid">
                                {handoverData.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                        <Truck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                        <p>Chưa có lịch sử bàn giao cho PO này.</p>
                                    </div>
                                ) : (
                                    handoverData.map((item, idx) => {
                                        const status = getStatusStyle(item.status);
                                        return (
                                            <div key={`${id}-h-${idx}`} className="history-card" onClick={(e) => handleOpenModal(e, item, 'handover')}>
                                                <div className="card-header">
                                                    <div>
                                                        <div className="card-label">Thời gian giao</div>
                                                        <div className="card-value">{formatDate(item.created_at)}</div>
                                                    </div>
                                                    <span className="card-badge" style={{ backgroundColor: status.bg, color: status.color }}>
                                                        {(item.status || 'Chờ').toUpperCase()}
                                                    </span>
                                                </div>
                                                
                                                <div>
                                                    <div className="card-label">Linh kiện / Sản phẩm</div>
                                                    <div className="card-value" style={{ color: '#7B5233', fontWeight: '700' }}>{item.part_name || item.product_name || '---'}</div>
                                                </div>

                                                <div className="card-row">
                                                    <div className="card-col">
                                                        <div className="card-label">Công đoạn</div>
                                                        <div className="card-value">{item.delivery_stage} → {item.receiving_stage}</div>
                                                    </div>
                                                </div>

                                                <div className="card-row">
                                                    <div className="card-col">
                                                        <div className="card-label">Số lượng bàn giao</div>
                                                        <div className="card-value" style={{ fontSize: '0.9rem', color: '#7B5233', fontWeight: '800' }}>{item.quantity_total} chiếc</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* TAB 2: TẤT CẢ PHIẾU KIỂM TRA (TỪ /production_v2/inspection/) */}
                        {activeTab === 'all_inspections' && (
                            <div>
                                {/* Filter bar */}
                                <div className="filter-pill-bar">
                                    {['all', 'Mẫu đầu tiên', 'Tái kiểm tra', 'Công đoạn', 'Thông số kỹ thuật'].map(filterKey => (
                                        <button 
                                            key={filterKey}
                                            className={`filter-pill ${inspectionTypeFilter === filterKey ? 'active' : ''}`}
                                            onClick={() => setInspectionTypeFilter(filterKey)}
                                        >
                                            {filterKey === 'all' ? 'Tất cả loại phiếu' : filterKey}
                                        </button>
                                    ))}
                                </div>

                                <div className="history-grid">
                                    {filteredInspections.length === 0 ? (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                            <ClipboardCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                            <p>Chưa có phiếu kiểm tra nào phù hợp cho PO này.</p>
                                        </div>
                                    ) : (
                                        filteredInspections.map((item, idx) => {
                                            const status = getStatusStyle(item.result);
                                            
                                            // Tách danh sách linh kiện & quy cách tương ứng
                                            const rawParts = item.part_name || '';
                                            const partsList = item.parts_list && item.parts_list.length > 0 
                                                ? item.parts_list 
                                                : rawParts.split(',').map(p => p.trim()).filter(Boolean);
                                            const isMultiPart = partsList.length > 1;

                                            const rawSpec = item.specification || 'N/A';
                                            const specsList = rawSpec.split(',').map(s => s.trim()).filter(Boolean);

                                            const partsWithSpecs = item.parts_with_specs || partsList.map((p, i) => ({
                                                name: p,
                                                spec: specsList[i] || specsList[0] || 'N/A'
                                            }));

                                            return (
                                                <div key={`${id}-ins-${idx}`} className="history-card" onClick={(e) => handleOpenModal(e, item, 'all_inspections')}>
                                                    {/* Card Header: Code + Type + Result Badge */}
                                                    <div className="card-header" style={{ borderBottom: '1px solid #FAF6F0', paddingBottom: '0.4rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: '800', color: '#7B5233', fontSize: '0.9rem' }}>{item.ticket_code}</span>
                                                            <span style={{ 
                                                                fontSize: '0.68rem', 
                                                                fontWeight: '700', 
                                                                padding: '2px 8px', 
                                                                borderRadius: '12px', 
                                                                backgroundColor: '#FAF6F0', 
                                                                color: '#7B5233',
                                                                border: '1px solid #EADCC9'
                                                            }}>
                                                                {item.type_label}
                                                            </span>
                                                        </div>
                                                        <span className="card-badge" style={{ backgroundColor: status.bg, color: status.color, fontSize: '0.72rem', padding: '3px 10px' }}>
                                                            {item.result}
                                                        </span>
                                                    </div>

                                                    {/* Linh kiện & Quy cách tương ứng */}
                                                    <div style={{ marginTop: '0.2rem' }}>
                                                        <div className="card-label">LINH KIỆN & QUY CÁCH ({partsList.length})</div>
                                                        {isMultiPart ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', backgroundColor: '#FAF6F0', padding: '6px 8px', borderRadius: '6px', border: '1px solid #EADCC9', marginTop: '2px' }}>
                                                                {partsWithSpecs.slice(0, 2).map((pItem, pIdx) => (
                                                                    <div key={pIdx} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                                                        <span style={{ fontWeight: '700', color: '#7B5233', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }} title={pItem.name}>
                                                                            • {pItem.name}
                                                                        </span>
                                                                        <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#2D1A12', fontSize: '0.7rem', backgroundColor: '#fff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #EADCC9', whiteSpace: 'nowrap' }}>
                                                                            {pItem.spec}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {partsWithSpecs.length > 2 && (
                                                                    <div style={{ fontSize: '0.68rem', color: '#8D6E63', fontStyle: 'italic', textAlign: 'right' }}>
                                                                        + {partsWithSpecs.length - 2} chi tiết khác (bấm để xem)...
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                                <div className="card-value" style={{ color: '#7B5233', fontWeight: '800', fontSize: '0.85rem', flex: 1 }} title={rawParts}>
                                                                    {rawParts}
                                                                </div>
                                                                <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#2D1A12', fontSize: '0.78rem', backgroundColor: '#FAF6F0', padding: '2px 6px', borderRadius: '4px', border: '1px solid #EADCC9', whiteSpace: 'nowrap' }}>
                                                                    {item.specification}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: '0.75rem', color: '#5D4037', fontWeight: '600', marginTop: '3px' }}>
                                                            Công đoạn: <span style={{ color: '#2D1A12', fontWeight: '700' }}>{item.stage || '---'}</span>
                                                        </div>
                                                    </div>

                                                    {/* HIGHLIGHTED METRICS: SỐ LƯỢNG MẪU & SỐ LƯỢNG LỖI */}
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        gap: '8px', 
                                                        backgroundColor: '#FAF6F0', 
                                                        padding: '6px 10px', 
                                                        borderRadius: '8px',
                                                        border: '1px solid #EADCC9',
                                                        marginTop: '2px'
                                                    }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.62rem', color: '#8D6E63', fontWeight: '700' }}>SỐ LƯỢNG MẪU</div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#7B5233' }}>
                                                                {item.sample_qty || (isMultiPart ? partsList.length : 1)} {isMultiPart ? 'chi tiết' : 'mẫu'}
                                                            </div>
                                                        </div>
                                                        <div style={{ flex: 1, borderLeft: '1px solid #EADCC9', paddingLeft: '8px' }}>
                                                            <div style={{ fontSize: '0.62rem', color: '#8D6E63', fontWeight: '700' }}>SỐ LƯỢNG LỖI</div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: (item.error_qty > 0 || !item.is_pass) ? '#C62828' : '#2E7D32' }}>
                                                                {item.error_qty || 0}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Người kiểm tra */}
                                                    <div className="card-row" style={{ marginTop: '2px' }}>
                                                        <div className="card-col">
                                                            <div className="card-label">NGƯỜI KIỂM TRA</div>
                                                            <div className="card-value" style={{ fontSize: '0.8rem' }}>
                                                                {item.inspector_name}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Footer Date */}
                                                    <div style={{ fontSize: '0.7rem', color: '#8D6E63', marginTop: '2px' }}>
                                                        Thời gian: {formatDate(item.created_at)} {formatTime(item.created_at)}
                                                    </div>

                                                    {renderImageGallery(item.images)}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: LỆNH SẢN XUẤT LIÊN QUAN ĐẾN ID */}
                        {activeTab === 'production_order' && (
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ background: '#FAF6F0', padding: '1rem', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>TỔNG SỐ LƯỢNG YÊU CẦU</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#7B5233' }}>
                                            {orderInfo?.products?.reduce((acc, p) => acc + (p.order_qty || p.quantity || 0), 0) || 0} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>chiếc</span>
                                        </div>
                                    </div>
                                    <div style={{ background: '#FAF6F0', padding: '1rem', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>SỐ LƯỢNG VÀO LỆNH SẢN XUẤT</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#2E7D32' }}>
                                            {orderInfo?.products?.reduce((acc, p) => acc + (p.production_qty || 0), 0) || 0} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>chiếc</span>
                                        </div>
                                    </div>
                                    <div style={{ background: '#FAF6F0', padding: '1rem', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>SỐ LƯỢNG BÙ HAO</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#E65100' }}>
                                            {orderInfo?.products?.reduce((acc, p) => acc + (p.loss_qty || 0), 0) || 0} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>chiếc</span>
                                        </div>
                                    </div>
                                    <div style={{ background: '#FAF6F0', padding: '1rem', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>KHỐI LƯỢNG TINH TỔNG</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1565C0' }}>
                                            {orderInfo?.products?.reduce((acc, p) => acc + (p.net_weight || 0), 0) || 0} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>kg</span>
                                        </div>
                                    </div>
                                </div>

                                <h4 style={{ color: '#7B5233', margin: '0 0 1rem 0' }}>Danh Mục Sản Phẩm Đặt Hàng</h4>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="custom-table">
                                        <thead>
                                            <tr>
                                                <th>STT</th>
                                                <th>Mã SKU</th>
                                                <th>Tên Sản Phẩm</th>
                                                <th>Quy Cách</th>
                                                <th>Đơn Vị</th>
                                                <th>S.Lg Đặt Hàng</th>
                                                <th>Vào Lệnh</th>
                                                <th>Bù Hao</th>
                                                <th>Trạng Thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(!orderInfo?.products || orderInfo.products.length === 0) ? (
                                                <tr>
                                                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#8D6E63' }}>Không có dữ liệu sản phẩm</td>
                                                </tr>
                                            ) : (
                                                orderInfo.products.map((p, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                        <td style={{ fontWeight: '700', color: '#7B5233' }}>{p.sku}</td>
                                                        <td style={{ fontWeight: '600' }}>{p.name}</td>
                                                        <td>{p.specification || '---'}</td>
                                                        <td style={{ textAlign: 'center' }}>{p.unit || 'Bộ'}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: '700' }}>{p.order_qty || p.quantity || 0}</td>
                                                        <td style={{ textAlign: 'right', color: '#2E7D32', fontWeight: '700' }}>{p.production_qty || 0}</td>
                                                        <td style={{ textAlign: 'right', color: '#E65100' }}>{p.loss_qty || 0}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: '700' }}>
                                                                {p.status || 'Active'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: BẢN VẼ / BOM LIÊN QUAN ĐẾN ID */}
                        {activeTab === 'bom_drawings' && (
                            <div>
                                {/* Filter bar */}
                                <div className="filter-pill-bar">
                                    {['all', 'Tạo phôi', 'Định hình', 'Lắp ráp', 'Sơn', 'Đóng gói'].map(stageKey => (
                                        <button 
                                            key={stageKey}
                                            className={`filter-pill ${bomStageFilter === stageKey ? 'active' : ''}`}
                                            onClick={() => setBomStageFilter(stageKey)}
                                        >
                                            {stageKey === 'all' ? 'Tất cả công đoạn BOM' : stageKey}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table className="custom-table">
                                        <thead>
                                            <tr>
                                                <th>STT</th>
                                                <th>Tên Linh Kiện</th>
                                                <th>Kích Thước Quy Cách (D*R*C mm)</th>
                                                <th>Công Đoạn Vào</th>
                                                <th>Công Đoạn Ra</th>
                                                <th>Số Lượng / Định Mức</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredBOM.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#8D6E63' }}>
                                                        Không tìm thấy linh kiện BOM cho công đoạn này.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredBOM.map((item, idx) => {
                                                    const specDisplay = item.specification || (item.specs && item.specs.join(', ')) || '---';
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                            <td style={{ fontWeight: '700', color: '#7B5233' }}>{item.part_name || item.name}</td>
                                                            <td style={{ fontWeight: '600' }}>{specDisplay}</td>
                                                            <td>
                                                                <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#FAF6F0', color: '#7B5233', fontSize: '0.8rem', fontWeight: '700' }}>
                                                                    {item.input_stage || item.stage || 'Sơ chế'}
                                                                </span>
                                                            </td>
                                                            <td>{item.output_stage || '---'}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: '700' }}>{item.quantity || 1} {item.unit || 'Chiếc'}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: KHÁC */}
                        {activeTab === 'others' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                <div style={{ background: '#FAF6F0', padding: '1.25rem', borderRadius: '10px', border: '1px solid #EADCC9' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#7B5233' }}>Tóm Tắt Hồ Sơ Chất Lượng PO</h4>
                                    <div className="detail-row">
                                        <div className="detail-label">Tổng số lượt bàn giao:</div>
                                        <div className="detail-value">{handoverData.length} lượt</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Tổng phiếu kiểm tra QC:</div>
                                        <div className="detail-value">{allInspectionsData.length} phiếu</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Tỷ lệ phiếu đạt:</div>
                                        <div className="detail-value" style={{ color: '#2E7D32', fontWeight: '800' }}>
                                            {allInspectionsData.length > 0 
                                                ? `${Math.round((allInspectionsData.filter(i => i.is_pass).length / allInspectionsData.length) * 100)}%` 
                                                : '100%'}
                                        </div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Lịch sử sự cố (CAPA):</div>
                                        <div className="detail-value" style={{ color: '#E65100' }}>0 sự cố ghi nhận</div>
                                    </div>
                                </div>

                                <div style={{ background: '#FAF6F0', padding: '1.25rem', borderRadius: '10px', border: '1px solid #EADCC9' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#7B5233' }}>Ghi Chú & Tài Liệu Đi Kèm</h4>
                                    <p style={{ fontSize: '0.85rem', color: '#8D6E63', lineHeight: '1.6' }}>
                                        Mọi dữ liệu kiểm soát chất lượng của PO #{id} được lưu trữ tập trung trên hệ thống SmartFlow. 
                                        Bộ phận QC và Quản lý Nhà máy có thể tra cứu lịch sử bàn giao, phiếu kiểm định từng công đoạn bất cứ lúc nào.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* DETAIL MODAL */}
            {isModalOpen && selectedItem && ReactDOM.createPortal(
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(e); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, color: '#2D1A12', fontSize: '1.1rem' }}>
                                Chi Tiết Hồ Sơ {selectedItem.modalType === 'handover' ? 'Bàn Giao' : 'Kiểm Tra QC'}
                            </h3>
                            <button className="modal-close" onClick={handleCloseModal} style={{ border: 'none', background: '#FAF6F0', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                                <X size={18} color="#7B5233" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <div className="detail-label">Thời gian</div>
                                <div className="detail-value">{formatDate(selectedItem.created_at)} {formatTime(selectedItem.created_at)}</div>
                            </div>
                            
                            {selectedItem.modalType === 'handover' && (
                                <>
                                    <div className="detail-row">
                                        <div className="detail-label">Linh kiện / SP</div>
                                        <div className="detail-value" style={{ color: '#7B5233', fontWeight: '800' }}>{selectedItem.part_name || selectedItem.product_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Công đoạn giao</div>
                                        <div className="detail-value">{selectedItem.delivery_stage}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Công đoạn nhận</div>
                                        <div className="detail-value">{selectedItem.receiving_stage}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Số lượng bàn giao</div>
                                        <div className="detail-value" style={{ fontSize: '1.1rem', color: '#7B5233', fontWeight: '800' }}>{selectedItem.quantity_total} chiếc</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Người giao</div>
                                        <div className="detail-value">{selectedItem.sx_delivery_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Người nhận</div>
                                        <div className="detail-value">{selectedItem.sx_receipt_name || '---'}</div>
                                    </div>
                                </>
                            )}

                            {selectedItem.modalType === 'all_inspections' && (
                                <>
                                    <div className="detail-row">
                                        <div className="detail-label">Mã phiếu QC</div>
                                        <div className="detail-value" style={{ fontWeight: '800', color: '#7B5233' }}>{selectedItem.ticket_code}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Loại phiếu kiểm tra</div>
                                        <div className="detail-value">{selectedItem.type_label}</div>
                                    </div>
                                    {/* Bảng Chi tiết Linh kiện & Quy cách tương ứng */}
                                    <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#8D6E63', fontWeight: '800', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                                            DANH SÁCH CHI TIẾT LINH KIỆN & QUY CÁCH KIỂM TRA ({selectedItem.parts_count || 1})
                                        </div>
                                        <div style={{ border: '1px solid #EADCC9', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                                                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#7B5233', fontWeight: '800', fontSize: '0.75rem' }}>STT</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#7B5233', fontWeight: '800', fontSize: '0.75rem' }}>Tên Chi Tiết Linh Kiện</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'right', color: '#7B5233', fontWeight: '800', fontSize: '0.75rem' }}>Quy Cách (mm)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(selectedItem.parts_with_specs || (selectedItem.parts_list ? selectedItem.parts_list.map(p => ({ name: p, spec: selectedItem.specification })) : [{ name: selectedItem.part_name, spec: selectedItem.specification }])).map((p, idx, arr) => (
                                                        <tr key={idx} style={{ borderBottom: idx < (arr.length - 1) ? '1px solid #F3EBE1' : 'none' }}>
                                                            <td style={{ padding: '6px 10px', color: '#8D6E63', fontWeight: '600', width: '36px' }}>{idx + 1}</td>
                                                            <td style={{ padding: '6px 10px', color: '#2D1A12', fontWeight: '700' }}>{p.name}</td>
                                                            <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', color: '#7B5233' }}>
                                                                <span style={{ backgroundColor: '#FAF6F0', padding: '2px 8px', borderRadius: '4px', border: '1px solid #EADCC9' }}>
                                                                    {p.spec || 'N/A'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Người kiểm tra</div>
                                        <div className="detail-value">{selectedItem.inspector_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Kết quả kiểm tra</div>
                                        <div className="detail-value">
                                            <span style={{ 
                                                padding: '4px 12px', 
                                                borderRadius: '12px', 
                                                fontWeight: '800',
                                                backgroundColor: selectedItem.is_pass ? '#E8F5E9' : '#FFEBEE',
                                                color: selectedItem.is_pass ? '#2E7D32' : '#C62828'
                                            }}>
                                                {selectedItem.result}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Số lượng mẫu kiểm</div>
                                        <div className="detail-value" style={{ color: '#7B5233', fontWeight: '800' }}>
                                            {selectedItem.sample_qty || 1} {selectedItem.parts_count > 1 ? 'chi tiết' : 'mẫu'}
                                        </div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Số lượng phát hiện lỗi</div>
                                        <div className="detail-value" style={{ color: selectedItem.error_qty > 0 ? '#C62828' : '#2E7D32', fontWeight: '800' }}>
                                            {selectedItem.error_qty || 0}
                                        </div>
                                    </div>
                                    {selectedItem.note && (
                                        <div className="detail-row">
                                            <div className="detail-label">Ghi chú QC</div>
                                            <div className="detail-value">{selectedItem.note}</div>
                                        </div>
                                    )}
                                    {renderImageGallery(selectedItem.images)}
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* LIGHTBOX IMAGE MODAL */}
            {imageModalOpen && selectedImage && ReactDOM.createPortal(
                <div 
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 9999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isDragging ? 'grabbing' : (imageZoom > 1 ? 'grab' : 'default')
                    }}
                    onClick={() => { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                >
                    <img 
                        src={selectedImage}
                        alt="Zoomed"
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            objectFit: 'contain',
                            transform: `scale(${imageZoom}) translate(${imagePan.x}px, ${imagePan.y}px)`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                        onClick={() => { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                        style={{
                            position: 'absolute', top: '20px', right: '20px',
                            background: 'rgba(255,255,255,0.2)', color: 'white',
                            border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                            cursor: 'pointer', fontSize: '24px'
                        }}
                    >
                        ×
                    </button>
                </div>,
                document.body
            )}

            {/* EXPORT OPTIONS MODAL */}
            {showExportModal && ReactDOM.createPortal(
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>Lựa chọn xuất Excel PO</h3>
                            <button onClick={() => setShowExportModal(false)} style={{ border: 'none', background: '#FAF6F0', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                                <X size={18} color="#7B5233" />
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            <div 
                                style={{
                                    border: `1.5px solid ${selectedExportOption === 'all_tabs' ? '#7B5233' : '#EADCC9'}`,
                                    backgroundColor: selectedExportOption === 'all_tabs' ? '#FAF6F0' : '#fff',
                                    borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', gap: '12px'
                                }}
                                onClick={() => setSelectedExportOption('all_tabs')}
                            >
                                <input type="radio" checked={selectedExportOption === 'all_tabs'} readOnly style={{ accentColor: '#7B5233' }} />
                                <div>
                                    <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất đầy đủ hồ sơ (5 Tabs)</div>
                                    <div style={{ fontSize: '0.78rem', color: '#8D6E63' }}>Tệp Excel chứa đầy đủ các Sheet: Lệnh sản xuất, Bàn giao, QC, BOM.</div>
                                </div>
                            </div>

                            <div 
                                style={{
                                    border: `1.5px solid ${selectedExportOption === 'current_tab' ? '#7B5233' : '#EADCC9'}`,
                                    backgroundColor: selectedExportOption === 'current_tab' ? '#FAF6F0' : '#fff',
                                    borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', gap: '12px'
                                }}
                                onClick={() => setSelectedExportOption('current_tab')}
                            >
                                <input type="radio" checked={selectedExportOption === 'current_tab'} readOnly style={{ accentColor: '#7B5233' }} />
                                <div>
                                    <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất Tab hiện tại</div>
                                    <div style={{ fontSize: '0.78rem', color: '#8D6E63' }}>Chỉ xuất dữ liệu của tab đang xem.</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    if (selectedExportOption === 'all_tabs') handleExportAllTabs();
                                    else if (selectedExportOption === 'current_tab') handleExportCurrentTab();
                                }}
                                disabled={isExporting}
                                style={{
                                    flex: 1, backgroundColor: '#7B5233', color: 'white', border: 'none',
                                    borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '0.9rem',
                                    cursor: isExporting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isExporting ? 'Đang xuất...' : 'Tải xuống File Excel'}
                            </button>
                            <button 
                                onClick={() => setShowExportModal(false)}
                                style={{ backgroundColor: '#FAF6F0', color: '#7B5233', border: '1px solid #EADCC9', borderRadius: '8px', padding: '10px 16px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default QualityRecordsDetailView;
