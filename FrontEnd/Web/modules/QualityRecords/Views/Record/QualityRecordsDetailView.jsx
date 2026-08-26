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
    X
} from 'lucide-react';
import { qualityService } from '@modules/QualityRecords/Models/quality.service';
import { API_ROOT } from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import ExcelJS from 'exceljs';

const QualityRecordsDetailView = () => {
    const { id } = useParams(); // poCode
    const navigate = useNavigate();
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/quality-records/:id');
    const [activeTab, setActiveTab] = useState('handover');
    const [loading, setLoading] = useState(true);
    const [orderInfo, setOrderInfo] = useState(null);
    const [handoverData, setHandoverData] = useState([]);
    const [inboundData, setInboundData] = useState([]);
    const [qcData, setQcData] = useState([]);
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
    const [selectedExportOption, setSelectedExportOption] = useState('all_tabs'); // 'all_tabs' | 'current_tab'
    const [isExporting, setIsExporting] = useState(false);
    
    const hasSetTitle = React.useRef(false);


    useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

    // 2. Logic Fetch Data
    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const [order, handover, inbound, qc] = await Promise.all([
                    qualityService.getOrderDetail(id).catch(() => null),
                    qualityService.getHandoverHistory(id).catch(() => []),
                    qualityService.getInboundHistory(id).catch(() => []),
                    qualityService.getQCReceivingHistory(id).catch(() => [])
                ]);

                setOrderInfo(order);
                setHandoverData(handover || []);
                setInboundData(inbound || []);
                setQcData(qc || []);
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu chi tiết hồ sơ:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [id]); 

    // --- CÁC HÀM TRỢ GIÚP ĐỊNH DẠNG EXCEL ---
    const formatExcelHeader = (worksheet, title, columnsCount) => {
        worksheet.mergeCells(1, 1, 1, columnsCount);
        const titleCell = worksheet.getCell(1, 1);
        titleCell.value = title;
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '7B5233' }
        };
        worksheet.getRow(1).height = 40;

        worksheet.mergeCells(2, 1, 2, columnsCount);
        const subCell = worksheet.getCell(2, 1);
        subCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Hệ thống SmartFlow`;
        subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '4B301E' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        subCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FAF6F0' }
        };
        worksheet.getRow(2).height = 24;
        worksheet.getRow(3).height = 15;
    };

    const styleTableHeaderRow = (worksheet, rowNumber, columnsCount) => {
        // Luôn cố định (Freeze Panes) các dòng tiêu đề phía trên để khi cuộn dữ liệu tiêu đề không bị trôi
        worksheet.views = [
            { state: 'frozen', ySplit: rowNumber }
        ];
        const row = worksheet.getRow(rowNumber);
        row.height = 26;
        for (let c = 1; c <= columnsCount; c++) {
            const cell = worksheet.getCell(rowNumber, c);
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '7B5233' }
            };
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
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FAF9F6' }
                    };
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
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 100);
    };

    // Hàm điền dữ liệu cho các sheet
    const fillHandoverSheet = (sheet, data) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Thời Gian Bàn Giao', key: 'time', width: 20 },
            { header: 'Linh Kiện / Sản Phẩm', key: 'part', width: 25 },
            { header: 'Công Đoạn Giao', key: 'stage_from', width: 20 },
            { header: 'Công Đoạn Nhận', key: 'stage_to', width: 20 },
            { header: 'Số Lượng', key: 'qty', width: 15 },
            { header: 'Người Giao', key: 'sender', width: 20 },
            { header: 'Người Nhận', key: 'receiver', width: 20 },
            { header: 'Trạng Thái', key: 'status', width: 15 },
            { header: 'Ghi Chú', key: 'note', width: 20 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `NHẬT KÝ BÀN GIAO CHI TIẾT PO: ${id}`, cols.length);
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
                sender: item.sx_delivery_name || '---',
                receiver: item.sx_receipt_name || '---',
                status: item.status || '---',
                note: item.note || '---'
            });
        });

        applyDefaultBorders(sheet, 5, data.length + 4, cols.length);
        for (let r = 5; r <= data.length + 4; r++) {
            sheet.getCell(r, 1).alignment = { horizontal: 'center' };
            sheet.getCell(r, 2).alignment = { horizontal: 'center' };
            sheet.getCell(r, 6).alignment = { horizontal: 'right' };
            sheet.getCell(r, 6).numFmt = '#,##0';
            sheet.getCell(r, 9).alignment = { horizontal: 'center' };
        }
    };

    const fillInboundSheet = (sheet, data) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Thời Gian Kiểm Tra', key: 'time', width: 20 },
            { header: 'Linh Kiện', key: 'part', width: 25 },
            { header: 'Kích Thước/Quy Cách', key: 'spec', width: 25 },
            { header: 'Người Kiểm Tra', key: 'inspector', width: 20 },
            { header: 'Kết Quả', key: 'result', width: 15 },
            { header: 'Ghi Chú', key: 'note', width: 25 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `NHẬT KÝ KIỂM TRA ĐẦU VÀO PO: ${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        data.forEach((item, idx) => {
            sheet.addRow({
                stt: idx + 1,
                time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---',
                part: item.part_name || '---',
                spec: item.specification || '---',
                inspector: item.inspector_name || '---',
                result: item.result === 'Pass' ? 'ĐẠT' : 'KHÔNG ĐẠT',
                note: item.note || '---'
            });
        });

        applyDefaultBorders(sheet, 5, data.length + 4, cols.length);
        for (let r = 5; r <= data.length + 4; r++) {
            sheet.getCell(r, 1).alignment = { horizontal: 'center' };
            sheet.getCell(r, 2).alignment = { horizontal: 'center' };
            sheet.getCell(r, 7).alignment = { horizontal: 'center' };
        }
    };

    const fillQCSheet = (sheet, data) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Thời Gian QC', key: 'time', width: 20 },
            { header: 'Nhân Viên QC', key: 'inspector', width: 20 },
            { header: 'Độ Ẩm (%)', key: 'moisture', width: 15 },
            { header: 'Độ Cong (mm)', key: 'bend', width: 15 },
            { header: 'Ngoại Quan', key: 'visual', width: 18 },
            { header: 'Kết Cấu', key: 'structure', width: 18 },
            { header: 'Kích Thước', key: 'size', width: 18 },
            { header: 'Kết Luận QC', key: 'result', width: 18 },
            { header: 'Ghi Chú', key: 'note', width: 25 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `NHẬT KÝ KIỂM TRA CHẤT LƯỢNG QC PO: ${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        data.forEach((item, idx) => {
            const resData = item.results_data || {};
            const renderQCSubValue = (value) => {
                if (value === null || value === undefined) return '---';
                if (typeof value === 'object') {
                    if (value.value !== undefined) return value.value;
                    return value.is_pass ? 'Đạt' : 'Lỗi';
                }
                return value;
            };

            const sizeObj = resData.size;
            let sizeStr = '---';
            if (sizeObj && typeof sizeObj === 'object') {
                if (sizeObj.long || sizeObj.wide || sizeObj.thick) {
                    sizeStr = `${sizeObj.long || 0}x${sizeObj.wide || 0}x${sizeObj.thick || 0} mm`;
                }
                if (sizeObj.is_pass !== undefined) {
                    sizeStr += ` (${sizeObj.is_pass ? 'Đạt' : 'Lỗi'})`;
                }
            }

            sheet.addRow({
                stt: idx + 1,
                time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---',
                inspector: item.qc_inspector_name || '---',
                moisture: renderQCSubValue(resData.moisture ?? item.moisture),
                bend: renderQCSubValue(resData.bend ?? item.bend),
                visual: resData.visual?.is_pass === undefined ? '---' : (resData.visual.is_pass ? 'Đạt' : 'Lỗi'),
                structure: resData.structure?.is_pass === undefined ? '---' : (resData.structure.is_pass ? 'Đạt' : 'Lỗi'),
                size: sizeStr,
                result: item.result?.toUpperCase() || '---',
                note: item.note || '---'
            });
        });

        applyDefaultBorders(sheet, 5, data.length + 4, cols.length);
        for (let r = 5; r <= data.length + 4; r++) {
            sheet.getCell(r, 1).alignment = { horizontal: 'center' };
            sheet.getCell(r, 2).alignment = { horizontal: 'center' };
            sheet.getCell(r, 4).alignment = { horizontal: 'right' };
            sheet.getCell(r, 5).alignment = { horizontal: 'right' };
            sheet.getCell(r, 6).alignment = { horizontal: 'center' };
            sheet.getCell(r, 7).alignment = { horizontal: 'center' };
            sheet.getCell(r, 8).alignment = { horizontal: 'center' };
            sheet.getCell(r, 9).alignment = { horizontal: 'center' };
        }
    };

    // --- LOGIC XUẤT EXCEL CHO CHI TIẾT ---
    const handleExportAllTabs = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();

            // --- Sheet 1: Tổng quan ---
            const sheetOverview = workbook.addWorksheet('Tổng Quan PO');
            formatExcelHeader(sheetOverview, `HỒ SƠ CHẤT LƯỢNG PO: ${id}`, 4);

            sheetOverview.addRow([]);
            sheetOverview.addRow(['Mã Đơn Hàng / PO:', id]);
            sheetOverview.addRow(['Khách Hàng:', orderInfo?.customer || '---']);
            sheetOverview.addRow(['Tổng Số Lượng Yêu Cầu:', `${(orderInfo?.products || []).reduce((acc, p) => acc + (p.quantity || 0), 0)} chiếc`]);
            sheetOverview.addRow([]);

            const prodHeaders = ['STT', 'Mã SKU', 'Tên Sản Phẩm', 'Số Lượng Yêu Cầu'];
            sheetOverview.addRow(prodHeaders);
            styleTableHeaderRow(sheetOverview, 8, prodHeaders.length);

            (orderInfo?.products || []).forEach((p, idx) => {
                sheetOverview.addRow([idx + 1, p.sku || '---', p.name || '---', p.quantity || 0]);
            });

            applyDefaultBorders(sheetOverview, 9, (orderInfo?.products || []).length + 8, prodHeaders.length);
            for (let r = 9; r <= (orderInfo?.products || []).length + 8; r++) {
                sheetOverview.getCell(r, 1).alignment = { horizontal: 'center' };
                sheetOverview.getCell(r, 4).alignment = { horizontal: 'right' };
                sheetOverview.getCell(r, 4).numFmt = '#,##0';
            }
            sheetOverview.getColumn(1).width = 10;
            sheetOverview.getColumn(2).width = 25;
            sheetOverview.getColumn(3).width = 35;
            sheetOverview.getColumn(4).width = 20;

            // --- Sheet 2: Bàn giao ---
            const sheetHandover = workbook.addWorksheet('Lịch Sử Bàn Giao');
            fillHandoverSheet(sheetHandover, handoverData);

            // --- Sheet 3: Đầu vào ---
            const sheetInbound = workbook.addWorksheet('Kiểm Tra Đầu Vào');
            fillInboundSheet(sheetInbound, inboundData);

            // --- Sheet 4: QC ---
            const sheetQC = workbook.addWorksheet('QC Kiểm Tra Hàng');
            fillQCSheet(sheetQC, qcData);

            await triggerFileDownload(workbook, `Ho_So_CL_PO_${id}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi khi xuất đầy đủ hồ sơ PO:", error);
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
            } else if (activeTab === 'inbound') {
                const sheet = workbook.addWorksheet('Kiểm Tra Đầu Vào');
                fillInboundSheet(sheet, inboundData);
            } else if (activeTab === 'qc') {
                const sheet = workbook.addWorksheet('QC Kiểm Tra Hàng');
                fillQCSheet(sheet, qcData);
            }
            await triggerFileDownload(workbook, `Ho_So_CL_PO_${id}_${activeTab}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi khi xuất tab hiện tại:", error);
        } finally {
            setIsExporting(false);
        }
    }; 

    // Hàm mở modal an toàn
    const handleOpenModal = (e, item, type) => {
        if (e) {
            if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
            e.preventDefault();
            e.stopPropagation();
        }
        setSelectedItem({ ...item, type });
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

    const tabs = [
        { id: 'handover', label: 'Lịch sử bàn giao', icon: <Truck size={18} /> },
        { id: 'inbound', label: 'Kiểm tra đầu vào', icon: <ClipboardCheck size={18} /> },
        { id: 'qc', label: 'QC kiểm tra hàng', icon: <ShieldCheck size={18} /> }
    ];

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

    const renderQCValue = (value) => {
        if (value === null || value === undefined) return "---";
        if (typeof value === 'object') {
            // Trường hợp dữ liệu dạng { min, max, is_pass, value } hoặc tương tự
            if (value.value !== undefined) return value.value;
            if (value.min !== undefined && value.max !== undefined) return `${value.min} - ${value.max}`;
            return JSON.stringify(value);
        }
        return value;
    };

    const renderImageGallery = (images) => {
        if (!images || images.length === 0) return null;
        
        // Normalize image paths (có thể là mảng chuỗi hoặc mảng object)
        const normalizedImages = images.map(img => 
            typeof img === 'string' ? img : img.image_path
        );

        // Giới hạn tối đa 3 ảnh
        const displayImages = normalizedImages.slice(0, 3);

        return (
            <div style={{ marginTop: '10px' }}>
                <div className="card-label">Ảnh minh chứng ({displayImages.length}/3)</div>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '8px',
                    marginTop: '4px'
                }}>
                    {displayImages.map((path, i) => (
                        <img 
                            key={i}
                            src={`${API_ROOT}${path.replace(/^\//, '')}`} 
                            style={{ 
                                width: '100%', 
                                height: '120px', 
                                objectFit: 'cover', 
                                borderRadius: '8px', 
                                border: '1px solid #EADCC9', 
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            alt={`Evidence ${i + 1}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(`${API_ROOT}${path.replace(/^\//, '')}`);
                                setImageZoom(1);
                                setImagePan({ x: 0, y: 0 });
                                setIsDragging(false);
                                setImageModalOpen(true);
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Hoàn thành':
            case 'Đã Nhận Hàng':
                return { bg: '#E8F5E9', color: '#2E7D32' };
            case 'Chờ Nhận Hàng':
            case 'Chờ Xác Nhận':
                return { bg: '#FFF3E0', color: '#E65100' };
            case 'Lỗi':
            case 'Từ chối':
                return { bg: '#FFEBEE', color: '#C62828' };
            default:
                return { bg: '#F5F5F5', color: '#757575' };
        }
    };

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
                    padding: 0.6rem 1.25rem;
                    border: 1px solid transparent;
                    border-radius: 8px 8px 0 0;
                    background: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #8D6E63;
                    font-weight: 700;
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

                /* Mobile-First Card Design */
                .history-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 0.75rem;
                    padding: 0.5rem;
                }
                @media (min-width: 768px) {
                    .history-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (min-width: 1280px) {
                    .history-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
                @media (min-width: 1536px) {
                    .history-grid {
                        grid-template-columns: repeat(5, 1fr);
                    }
                }

                .history-card {
                    background: #fff;
                    border: 1px solid #EADCC9;
                    border-radius: 10px;
                    padding: 0.75rem;
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
                    font-size: 0.8rem;
                    color: #2D1A12;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .card-badge {
                    padding: 2px 8px;
                    border-radius: 20px;
                    font-size: 0.6rem;
                    font-weight: 800;
                }
                .card-row {
                    display: flex;
                    gap: 0.5rem;
                }
                .card-col {
                    flex: 1;
                    min-width: 0; /* Cho phép text-overflow hoạt động */
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
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
                    max-width: 600px !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    position: relative !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    border: 2px solid #7B5233 !important;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
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
                .modal-body {
                    padding: 1.5rem;
                }
                .modal-close {
                    background: #F5F5F5;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #5D4037;
                    transition: all 0.2s;
                }
                .modal-close:hover {
                    background: #FFEBEE;
                    color: #C62828;
                }
                .detail-row {
                    display: flex;
                    padding: 10px 0;
                    border-bottom: 1px solid #FAF6F0;
                }
                .detail-label {
                    flex: 0 0 140px;
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

                /* Hộp thoại & Tuỳ chọn Xuất Excel */
                .export-option-card {
                    border: 1.5px solid #EADCC9;
                    border-radius: 12px;
                    padding: 14px;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background-color: #fff;
                    text-align: left;
                }
                .export-option-card:hover {
                    border-color: #7B5233;
                    background-color: #FAF6F0;
                }
                .export-option-card.active {
                    border-color: #7B5233;
                    background-color: #FAF6F0;
                    box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1);
                }
            `}} />

            {/* Header Info */}
            <div className="detail-card card-shadow">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>Đang tải thông tin đơn hàng...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>MÃ ĐƠN HÀNG</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7B5233' }}>#{orderInfo?.order_code || id}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>KHÁCH HÀNG</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#2D1A12' }}>{orderInfo?.customer || '---'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>SẢN PHẨM</div>
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
                                Xuất Excel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
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

            {/* Tab Content */}
            <div className="detail-card card-shadow" style={{ padding: '1rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải lịch sử...</div>
                ) : (
                    <>
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
                                                        <div className="card-label">Thời gian</div>
                                                        <div className="card-value">{formatDate(item.created_at)}</div>
                                                    </div>
                                                    <span className="card-badge" style={{ backgroundColor: status.bg, color: status.color }}>
                                                        {(item.status || 'Chờ').toUpperCase()}
                                                    </span>
                                                </div>
                                                
                                                <div className="card-row">
                                                    <div className="card-col">
                                                        <div className="card-label">Linh kiện</div>
                                                        <div className="card-value" style={{ color: '#7B5233' }}>{item.part_name || item.product_name || '---'}</div>
                                                    </div>
                                                </div>

                                                <div className="card-row">
                                                    <div className="card-col">
                                                        <div className="card-label">Công đoạn</div>
                                                        <div className="card-value">{item.delivery_stage} → {item.receiving_stage}</div>
                                                    </div>
                                                </div>

                                                <div className="card-row">
                                                    <div className="card-col">
                                                        <div className="card-label">Số lượng</div>
                                                        <div className="card-value" style={{ fontSize: '0.9rem', color: '#7B5233' }}>{item.quantity_total} chiếc</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {activeTab === 'inbound' && (
                            <div className="history-grid">
                                {inboundData.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                        <ClipboardCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                        <p>Chưa có lịch sử kiểm tra đầu vào cho PO này.</p>
                                    </div>
                                ) : (
                                    inboundData.map((item, idx) => (
                                        <div key={`${id}-i-${idx}`} className="history-card" onClick={(e) => handleOpenModal(e, item, 'inbound')}>
                                            <div className="card-header">
                                                <div>
                                                    <div className="card-label">Thời gian</div>
                                                    <div className="card-value">{formatDate(item.created_at)}</div>
                                                </div>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: item.result === 'Pass' ? '#E8F5E9' : '#FFEBEE'
                                                }}>
                                                    {item.result === 'Pass' ? (
                                                        <CheckCircle2 size={14} color="#2E7D32" />
                                                    ) : (
                                                        <AlertCircle size={14} color="#C62828" />
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="card-label">Linh kiện</div>
                                                <div className="card-value" style={{ color: '#7B5233' }}>{item.part_name}</div>
                                            </div>

                                            <div className="card-row">
                                                <div className="card-col">
                                                    <div className="card-label">Kích thước</div>
                                                    <div className="card-value">
                                                        {item.specification || '---'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="card-row">
                                                <div className="card-col">
                                                    <div className="card-label">Kết quả</div>
                                                    <div className="card-value" style={{
                                                        color: item.result === 'Pass' ? '#2E7D32' : '#C62828',
                                                        fontWeight: '700'
                                                    }}>
                                                        {item.result === 'Pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'qc' && (
                            <div className="history-grid">
                                {qcData.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                        <ShieldCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                        <p>Chưa có dữ liệu QC kiểm tra hàng cho PO này.</p>
                                    </div>
                                ) : (
                                    qcData.map((item, idx) => (
                                        <div key={`${id}-q-${idx}`} className="history-card" onClick={(e) => handleOpenModal(e, item, 'qc')}>
                                            <div className="card-header">
                                                <div>
                                                    <div className="card-label">Thời gian</div>
                                                    <div className="card-value">{formatDate(item.created_at)}</div>
                                                </div>
                                                <span className="card-badge" style={{ 
                                                    backgroundColor: item.result === 'Đạt' ? '#E8F5E9' : '#FFEBEE',
                                                    color: item.result === 'Đạt' ? '#2E7D32' : '#C62828'
                                                }}>
                                                    {(item.result || '---').toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="card-row">
                                                <div className="card-col">
                                                    <div className="card-label">Độ ẩm</div>
                                                    <div className="card-value" style={{ color: '#2E7D32' }}>{renderQCValue(item.results_data?.moisture ?? item.moisture)}%</div>
                                                </div>
                                                <div className="card-col">
                                                    <div className="card-label">Độ cong</div>
                                                    <div className="card-value" style={{ color: '#1565C0' }}>{renderQCValue(item.results_data?.bend ?? item.bend)}mm</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {isModalOpen && selectedItem && ReactDOM.createPortal(
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(e); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, color: '#2D1A12', fontSize: '1.1rem' }}>Chi tiết hồ sơ</h3>
                            <button className="modal-close" onClick={handleCloseModal}>
                                <ChevronLeft size={20} style={{ transform: 'rotate(-90deg)' }} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <div className="detail-label">Thời gian</div>
                                <div className="detail-value">{formatDate(selectedItem.created_at)} {formatTime(selectedItem.created_at)}</div>
                            </div>
                            
                            {selectedItem.type === 'handover' && (
                                <>
                                    <div className="detail-row">
                                        <div className="detail-label">Mã bàn giao</div>
                                        <div className="detail-value" style={{ fontWeight: '800', color: '#7B5233' }}>{selectedItem.delivery_id || selectedItem.id || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">PO Code</div>
                                        <div className="detail-value">{selectedItem.po_code || id}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Linh kiện</div>
                                        <div className="detail-value" style={{ color: '#7B5233', fontWeight: '600' }}>{selectedItem.part_name || selectedItem.product_name || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Trạng thái</div>
                                        <div className="detail-value">
                                            <span style={{ 
                                                padding: '4px 12px', 
                                                borderRadius: '12px', 
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                backgroundColor: selectedItem.status === 'Hoàn thành' ? '#E8F5E9' : '#FFF3E0',
                                                color: selectedItem.status === 'Hoàn thành' ? '#2E7D32' : '#E65100'
                                            }}>
                                                {selectedItem.status || 'Chờ'}
                                            </span>
                                        </div>
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
                                        <div className="detail-label">Số lượng tổng</div>
                                        <div className="detail-value" style={{ color: '#7B5233', fontSize: '1.1rem' }}>{selectedItem.quantity_total} chiếc</div>
                                    </div>
                                    {selectedItem.quantity_ok !== undefined && (
                                        <div className="detail-row">
                                            <div className="detail-label">Số lượng OK</div>
                                            <div className="detail-value" style={{ color: '#2E7D32' }}>{selectedItem.quantity_ok} chiếc</div>
                                        </div>
                                    )}
                                    {selectedItem.quantity_ng !== undefined && (
                                        <div className="detail-row">
                                            <div className="detail-label">Số lượng NG</div>
                                            <div className="detail-value" style={{ color: '#C62828' }}>{selectedItem.quantity_ng} chiếc</div>
                                        </div>
                                    )}
                                    <div className="detail-row">
                                        <div className="detail-label">Người giao</div>
                                        <div className="detail-value">{selectedItem.sx_delivery_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Người nhận</div>
                                        <div className="detail-value">{selectedItem.sx_receipt_name || '---'}</div>
                                    </div>
                                    {selectedItem.receipt_time && (
                                        <div className="detail-row">
                                            <div className="detail-label">Thời gian nhận</div>
                                            <div className="detail-value">{formatDate(selectedItem.receipt_time)} {formatTime(selectedItem.receipt_time)}</div>
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedItem.type === 'inbound' && (
                                <>
                                    <div className="detail-row">
                                        <div className="detail-label">Mã kiểm tra</div>
                                        <div className="detail-value" style={{ fontWeight: '800', color: '#7B5233' }}>{selectedItem.id || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">PO Code</div>
                                        <div className="detail-value">{selectedItem.po_code || id}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Linh kiện</div>
                                        <div className="detail-value" style={{ color: '#7B5233' }}>{selectedItem.part_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Kích thước</div>
                                        <div className="detail-value">{selectedItem.specification || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Người kiểm tra</div>
                                        <div className="detail-value">{selectedItem.inspector_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Kết quả</div>
                                        <div className="detail-value">
                                            <span style={{ color: selectedItem.result === 'Pass' ? '#2E7D32' : '#C62828', fontWeight: '800' }}>
                                                {selectedItem.result === 'Pass' ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT (FAIL)'}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedItem.check_time && (
                                        <div className="detail-row">
                                            <div className="detail-label">Thời gian kiểm</div>
                                            <div className="detail-value">{formatDate(selectedItem.check_time)} {formatTime(selectedItem.check_time)}</div>
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedItem.type === 'qc' && (
                                <>
                                    <div className="detail-row">
                                        <div className="detail-label">Mã QC</div>
                                        <div className="detail-value" style={{ fontWeight: '800', color: '#7B5233' }}>{selectedItem.id || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">PO Code</div>
                                        <div className="detail-value">{selectedItem.po_code || id}</div>
                                    </div>
                                    {/* Hiển thị results_data (dữ liệu chi tiết từ kết quả kiểm tra) */}
                                    {selectedItem.results_data && typeof selectedItem.results_data === 'object' && Object.keys(selectedItem.results_data).length > 0 ? (
                                        <>
                                            {Object.entries(selectedItem.results_data).map(([key, value]) => {
                                                // Map nhãn tiếng Việt
                                                const labelMap = {
                                                    size: 'Kích thước',
                                                    structure: 'Kết cấu',
                                                    visual: 'Ngoại quan',
                                                    moisture: 'Độ ẩm',
                                                    bend: 'Độ cong',
                                                    accessories: 'Phụ kiện',
                                                    visual_ext: 'Ngoại quan mở rộng',
                                                    functional: 'Chức năng'
                                                };
                                                const label = labelMap[key] || key;

                                                // Hàm render badge trạng thái đạt/không đạt
                                                const renderStatusBadge = (isPass) => {
                                                    if (isPass === null || isPass === undefined) return null;
                                                    return (
                                                        <span style={{ 
                                                            marginLeft: '12px', 
                                                            color: isPass ? '#2E7D32' : '#C62828', 
                                                            fontWeight: '800',
                                                            fontSize: '0.9rem',
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            gap: '6px',
                                                            padding: '2px 10px',
                                                            borderRadius: '6px',
                                                            backgroundColor: isPass ? '#E8F5E9' : '#FFEBEE',
                                                            border: `1.5px solid ${isPass ? '#2E7D32' : '#C62828'}`
                                                        }}>
                                                            {isPass ? '✓ ĐẠT' : '✗ LỖI'}
                                                        </span>
                                                    );
                                                };

                                                // Trường hợp 1: Dữ liệu kích thước (long, wide, thick)
                                                if (typeof value === 'object' && value !== null && ('long' in value || 'wide' in value || 'thick' in value)) {
                                                    const hasData = value.long || value.wide || value.thick;
                                                    return (
                                                        <div className="detail-row" key={key}>
                                                            <div className="detail-label">{label}</div>
                                                            <div className="detail-value">
                                                                {hasData ? (
                                                                    <span style={{ fontWeight: '600' }}>{value.long || 0} x {value.wide || 0} x {value.thick || 0} mm</span>
                                                                ) : (
                                                                    <span style={{ color: '#9E9E9E', fontStyle: 'italic' }}>---</span>
                                                                )}
                                                                {renderStatusBadge(value.is_pass)}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Trường hợp 2: Các object có is_pass khác
                                                if (typeof value === 'object' && value !== null && value.is_pass !== undefined) {
                                                    const displayVal = value.value !== undefined ? value.value : '';
                                                    const unit = key === 'moisture' ? '%' : (key === 'bend' ? ' mm' : '');
                                                    return (
                                                        <div className="detail-row" key={key}>
                                                            <div className="detail-label">{label}</div>
                                                            <div className="detail-value">
                                                                {displayVal ? (
                                                                    <span style={{ fontWeight: '600' }}>{displayVal}{unit}</span>
                                                                ) : (
                                                                    <span style={{ color: '#9E9E9E', fontStyle: 'italic' }}>---</span>
                                                                )}
                                                                {renderStatusBadge(value.is_pass)}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Trường hợp 3: String hoặc Number đơn thuần
                                                if (typeof value === 'string' || typeof value === 'number') {
                                                    if (value === '') return null;
                                                    const unit = key === 'moisture' ? '%' : (key === 'bend' ? ' mm' : '');
                                                    return (
                                                        <div className="detail-row" key={key}>
                                                            <div className="detail-label">{label}</div>
                                                            <div className="detail-value" style={{ fontWeight: '600' }}>{value}{unit}</div>
                                                        </div>
                                                    );
                                                }

                                                return null;
                                            })}
                                        </>
                                    ) : (
                                        /* Hiển thị moisture/bend từ cấu trúc cũ nếu results_data trống */
                                        <>
                                            {selectedItem.moisture !== undefined && (
                                                <div className="detail-row">
                                                    <div className="detail-label">Độ ẩm</div>
                                                    <div className="detail-value" style={{ color: '#2E7D32', fontWeight: '600' }}>{renderQCValue(selectedItem.moisture)}%</div>
                                                </div>
                                            )}
                                            {selectedItem.bend !== undefined && (
                                                <div className="detail-row">
                                                    <div className="detail-label">Độ cong</div>
                                                    <div className="detail-value" style={{ color: '#1565C0', fontWeight: '600' }}>{renderQCValue(selectedItem.bend)} mm</div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    <div className="detail-row" style={{ marginTop: '8px', borderTop: '1px dashed #E0E0E0', paddingTop: '8px' }}>
                                        <div className="detail-label">Nhân viên QC</div>
                                        <div className="detail-value" style={{ fontWeight: '600' }}>{selectedItem.qc_inspector_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Kết luận tổng quát</div>
                                        <div className="detail-value">
                                            <span style={{ 
                                                color: selectedItem.result === 'Đạt' ? '#2E7D32' : '#C62828', 
                                                fontWeight: '900',
                                                fontSize: '1.2rem',
                                                textDecoration: 'underline'
                                            }}>
                                                {selectedItem.result?.toUpperCase() || 'CHƯA CÓ'}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedItem.created_at && (
                                        <div className="detail-row">
                                            <div className="detail-label">Thời gian QC</div>
                                            <div className="detail-value" style={{ color: '#616161' }}>{formatDate(selectedItem.created_at)} {formatTime(selectedItem.created_at)}</div>
                                        </div>
                                    )}
                                </>
                            )}

                            {(selectedItem.note || selectedItem.remark) && (
                                <div className="detail-row">
                                    <div className="detail-label">Ghi chú</div>
                                    <div className="detail-value" style={{ fontStyle: 'italic' }}>{selectedItem.note || selectedItem.remark}</div>
                                </div>
                            )}

                            <div style={{ marginTop: '1.5rem' }}>
                                {renderImageGallery(selectedItem.images)}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Image Modal */}
            {imageModalOpen && selectedImage && ReactDOM.createPortal(
                <div 
                    className="modal-overlay" 
                    onClick={() => { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }
                        if (e.key === '+' || e.key === '=') setImageZoom(prev => Math.min(5, prev + 0.2));
                        if (e.key === '-' || e.key === '_') setImageZoom(prev => Math.max(0.5, prev - 0.2));
                        if (e.key === '0') { setImageZoom(1); setImagePan({ x: 0, y: 0 }); }
                    }}
                    tabIndex={0}
                    style={{ outline: 'none' }}
                >
                    <div 
                        className="modal-content" 
                        style={{ 
                            maxWidth: '95vw', 
                            maxHeight: '95vh', 
                            padding: '0',
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }} 
                        onClick={e => e.stopPropagation()}
                    >
                        <div 
                            style={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                overflow: 'hidden',
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                cursor: imageZoom > 1 ? 'grab' : 'default',
                                position: 'relative'
                            }}
                            onMouseDown={(e) => {
                                if (imageZoom > 1) {
                                    setIsDragging(true);
                                    setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
                                }
                            }}
                            onMouseMove={(e) => {
                                if (isDragging && imageZoom > 1) {
                                    setImagePan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                                }
                            }}
                            onMouseUp={() => setIsDragging(false)}
                            onMouseLeave={() => setIsDragging(false)}
                        >
                            <img 
                                src={selectedImage} 
                                alt="Full size" 
                                style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '90vh', 
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
                                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                                    userSelect: 'none',
                                    pointerEvents: 'none'
                                }}
                                onWheel={(e) => {
                                    e.preventDefault();
                                    const delta = e.deltaY > 0 ? -0.15 : 0.15;
                                    setImageZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
                                }}
                                onDoubleClick={() => {
                                    setImageZoom(prev => prev === 1 ? 2 : 1);
                                    if (imageZoom === 1) setImagePan({ x: 0, y: 0 });
                                }}
                            />
                        </div>

                        {/* Floating Control Panel */}
                        <div style={{
                            position: 'absolute',
                            bottom: '30px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '12px 20px',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'center',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <button 
                                onClick={() => setImageZoom(prev => Math.max(0.5, prev - 0.25))}
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    fontWeight: '300'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                                title="Zoom Out (-)"
                            >
                                −
                            </button>
                            
                            <div style={{
                                color: 'white',
                                fontSize: '15px',
                                fontWeight: '600',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                minWidth: '70px',
                                textAlign: 'center',
                                fontFamily: 'monospace'
                            }}>
                                {Math.round(imageZoom * 100)}%
                            </div>
                            
                            <button 
                                onClick={() => setImageZoom(prev => Math.min(5, prev + 0.25))}
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    fontWeight: '300'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                                title="Zoom In (+)"
                            >
                                +
                            </button>

                            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

                            <button 
                                onClick={() => { setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                                title="Reset (0)"
                            >
                                ⟲
                            </button>
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={() => { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                backdropFilter: 'blur(10px)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                width: '44px',
                                height: '44px',
                                cursor: 'pointer',
                                fontSize: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
                                e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
                                e.target.style.transform = 'scale(1)';
                            }}
                            title="Close (ESC)"
                        >
                            ×
                        </button>

                        {/* Keyboard Hints */}
                        <div style={{
                            position: 'absolute',
                            bottom: '100px',
                            left: '20px',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontFamily: 'monospace',
                            lineHeight: '1.6'
                        }}>
                            <div>Scroll / +/- : Zoom</div>
                            <div>Double-click : Toggle</div>
                            <div>Drag : Pan (zoomed)</div>
                            <div>ESC : Close</div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* EXPORT OPTIONS MODAL */}
            {showExportModal && ReactDOM.createPortal(
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: '20px',
                    backdropFilter: 'blur(3px)'
                }}>
                    <div className="modal-container" style={{
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '480px',
                        padding: '24px',
                        position: 'relative',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1.5px solid #EADCC9',
                        boxSizing: 'border-box',
                        animation: 'modalFadeIn 0.3s ease-out'
                    }}>
                        <button 
                            onClick={() => setShowExportModal(false)} 
                            style={{ 
                                position: 'absolute', 
                                top: '16px', 
                                right: '16px', 
                                border: 'none', 
                                background: '#F5F5F5', 
                                cursor: 'pointer', 
                                borderRadius: '50%', 
                                width: '32px', 
                                height: '32px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: '#5D4037',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFEBEE'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                        >
                            <X size={18} />
                        </button>

                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: '0 0 20px 0', borderBottom: '1px solid #EADCC9', paddingBottom: '10px' }}>Lựa chọn xuất Excel PO</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            
                            {/* Option 1 */}
                            <div 
                                className={`export-option-card ${selectedExportOption === 'all_tabs' ? 'active' : ''}`}
                                onClick={() => setSelectedExportOption('all_tabs')}
                            >
                                <div style={{ marginTop: '2px' }}>
                                    <input type="radio" checked={selectedExportOption === 'all_tabs'} readOnly style={{ accentColor: '#7B5233' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất hồ sơ PO đầy đủ (Tất cả tabs)</span>
                                    <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                                        Xuất tệp Excel gồm 4 sheet: thông tin chung, lịch sử bàn giao, kiểm tra đầu vào và QC của PO này.
                                    </span>
                                </div>
                            </div>

                            {/* Option 2 */}
                            <div 
                                className={`export-option-card ${selectedExportOption === 'current_tab' ? 'active' : ''}`}
                                onClick={() => setSelectedExportOption('current_tab')}
                            >
                                <div style={{ marginTop: '2px' }}>
                                    <input type="radio" checked={selectedExportOption === 'current_tab'} readOnly style={{ accentColor: '#7B5233' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất dữ liệu Tab hiện tại</span>
                                    <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                                        Chỉ xuất dữ liệu của tab {activeTab === 'handover' ? 'Lịch sử bàn giao' : activeTab === 'inbound' ? 'Kiểm tra đầu vào' : 'QC kiểm tra hàng'} đang xem.
                                    </span>
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
                                    flex: 1,
                                    backgroundColor: '#7B5233',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    cursor: isExporting ? 'not-allowed' : 'pointer',
                                    opacity: isExporting ? 0.7 : 1
                                }}
                            >
                                <FileDown size={18} />
                                {isExporting ? 'Đang xuất file...' : 'Tải xuống File Excel'}
                            </button>
                            <button 
                                onClick={() => setShowExportModal(false)}
                                disabled={isExporting}
                                style={{
                                    backgroundColor: '#FAF6F0',
                                    color: '#7B5233',
                                    border: '1px solid #EADCC9',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    cursor: isExporting ? 'not-allowed' : 'pointer'
                                }}
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
