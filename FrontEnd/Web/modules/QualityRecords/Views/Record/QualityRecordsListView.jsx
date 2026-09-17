import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    FileDown,
    Calendar,
    ChevronRight,
    ChevronLeft,
    Eye,
    FileText,
    CheckCircle2,
    X,
    RotateCcw
} from 'lucide-react';
import { planService } from '@modules/Plan/Models/plan.service';
import { qualityService } from '@modules/QualityRecords/Models/quality.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import ExcelJS from 'exceljs';

const QualityRecordsListView = () => {
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
    const navigate = useNavigate();

    // Lấy metadata từ database thay vì hardcode
    const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/quality-records');

    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState({ id: 'all', name: 'Tất cả KHSX', month: null, year: null });
    const [selectedPlanId, setSelectedPlanId] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('has_data'); // all, has_data, no_data

    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);
    const [totalCount, setTotalCount] = useState(0);
    const [statsData, setStatsData] = useState({ all: 0, has_data: 0, no_data: 0 });
    const [uniqueProductNames, setUniqueProductNames] = useState([]);
    const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
    const [filterProduct, setFilterProduct] = useState('all');

    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [showSortPanel, setShowSortPanel] = useState(false);
    const [sortBy, setSortBy] = useState('none');
    const [actionMenuId, setActionMenuId] = useState(null);

    // State cho xuất file Excel
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedExportOption, setSelectedExportOption] = useState('current'); // 'current' | 'summary' | 'full'
    const [isExporting, setIsExporting] = useState(false);

    const filterRef = useRef(null);
    const sortRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilterPanel(false);
            }
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setShowSortPanel(false);
            }
            setActionMenuId(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Cập nhật Title và Subtitle lên Header - Lấy từ database
    useEffect(() => {
        if (screenCode && title) {
            if (setCustomTitle) setCustomTitle(title);
            if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
            if (setCustomScreenCode) setCustomScreenCode(screenCode);
        }
    }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

    // Lấy danh sách KHSX - Mặc định luôn là "Tất cả KHSX"
    useEffect(() => {
        const fetchPlans = async () => {
            setLoading(true);
            try {
                const data = await planService.getPlans();
                const plansData = Array.isArray(data) ? data : [];
                setPlans(plansData);

                // Mặc định luôn chọn "Tất cả KHSX"
                setSelectedPlanId('all');
                setSelectedMonth('');
                setSelectedPlan({ id: 'all', name: 'Tất cả KHSX', month: null, year: null });
            } catch (error) {
                console.error("Lỗi khi tải kế hoạch sản xuất:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    // Lấy chi tiết PO của KHSX đã chọn (Phân trang Server-side)
    const fetchPlanDetails = async () => {
        if (!selectedPlanId) return;

        setLoading(true);
        try {
            const res = await qualityService.getPlanDetails(
                selectedPlanId,
                currentPage,
                itemsPerPage,
                searchTerm,
                statusFilter,
                filterProduct,
                sortBy
            );
            if (res && res.items) {
                setOrders(res.items || []);
                setTotalCount(res.total_count || 0);
                if (res.stats) {
                    setStatsData(res.stats);
                }
                if (res.unique_products) {
                    setUniqueProductNames(res.unique_products);
                }
            } else {
                setOrders(res.orders || []);
                setTotalCount(res.orders ? res.orders.length : 0);
            }
            const currentPlan = selectedPlanId === 'all'
                ? { id: 'all', name: 'Tất cả KHSX', month: null, year: null }
                : plans.find(p => p.id === parseInt(selectedPlanId));
            setSelectedPlan(currentPlan);
        } catch (error) {
            console.error("Lỗi khi tải chi tiết đơn hàng:", error);
            setOrders([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlanDetails();
    }, [selectedPlanId, currentPage, itemsPerPage, searchTerm, statusFilter, filterProduct, sortBy, plans]);

    // Tính toán phân trang
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = orders;
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

    const monthOptions = useMemo(() => {
        return plans.map(p => {
            const monthLabel = p.month && p.year ? `Tháng ${p.month}/${p.year}` : `KHSX #${p.id}`;
            const planDesc = p.name ? ` (${p.name})` : (p.code ? ` (${p.code})` : '');
            return {
                ...p,
                planId: p.id.toString(),
                label: `${monthLabel}${planDesc}`
            };
        }).sort((a, b) => {
            if (parseInt(b.year || 0) !== parseInt(a.year || 0)) return parseInt(b.year || 0) - parseInt(a.year || 0);
            if (parseInt(b.month || 0) !== parseInt(a.month || 0)) return parseInt(b.month || 0) - parseInt(a.month || 0);
            return b.id - a.id;
        });
    }, [plans]);

    const handlePlanChange = (e) => {
        const planId = e.target.value;
        if (!planId || planId === 'all') {
            setSelectedPlanId('all');
            setSelectedMonth('');
        } else {
            setSelectedPlanId(planId);
            const target = plans.find(p => p.id.toString() === planId);
            setSelectedMonth(target && target.month && target.year ? `${target.month}-${target.year}` : '');
        }
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSelectedPlanId('all');
        setSelectedMonth('');
        setStatusFilter('has_data');
        setFilterProduct('all');
        setItemsPerPage(15);
        setSearchTerm('');
        setSortBy('none');
        setCurrentPage(1);
    };

    const isPlanFiltered = Boolean(selectedPlanId && selectedPlanId !== 'all');
    const isFiltered = isPlanFiltered || statusFilter !== 'all' || filterProduct !== 'all' || itemsPerPage !== 15 || Boolean(searchTerm) || sortBy !== 'none';

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

    const applyDefaultBorders = (worksheet, startRow, endRow, colsCount, autoHeight = false) => {
        for (let r = startRow; r <= endRow; r++) {
            const row = worksheet.getRow(r);
            if (!autoHeight) row.height = 20;
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

    // --- LOGIC XUẤT EXCEL CÁC TÙY CHỌN ---
    const handleExportCurrentList = async () => {
        setIsExporting(true);
        try {
            const res = await qualityService.getPlanDetails(
                selectedPlanId,
                1,
                10000,
                searchTerm,
                statusFilter,
                filterProduct,
                sortBy
            );
            const listToExport = res?.items || [];

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Danh Sách PO');

            const planName = selectedPlan?.name || `Kế hoạch #${selectedPlanId}`;
            const planMonth = selectedPlan?.month ? `Tháng ${selectedPlan.month}/${selectedPlan.year}` : '';
            const filterLabel = statusFilter === 'has_data' ? 'Đã có dữ liệu' : statusFilter === 'no_data' ? 'Chưa có dữ liệu' : 'Tất cả';

            // Cột: STT | Mã PO | Khách Hàng | Tên SP | SKU | Số Lượng | Trạng Thái
            const cols = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Mã PO / Đơn Hàng', key: 'po', width: 22 },
                { header: 'Khách Hàng', key: 'customer', width: 28 },
                { header: 'Tên Sản Phẩm', key: 'product_name', width: 40 },
                { header: 'Mã SKU', key: 'sku', width: 20 },
                { header: 'Số Lượng (Chiếc)', key: 'qty', width: 18 },
                { header: 'Trạng Thái Dữ Liệu', key: 'status', width: 22 }
            ];

            sheet.columns = cols;
            formatExcelHeader(sheet, `DANH SÁCH HỒ SƠ CHẤT LƯỢNG PO — ${planName} ${planMonth}`, cols.length);

            // Dòng thông tin bộ lọc
            sheet.mergeCells(3, 1, 3, cols.length);
            const filterInfoCell = sheet.getCell(3, 1);
            filterInfoCell.value = `Bộ lọc: Trạng thái = "${filterLabel}" | Sản phẩm = "${filterProduct === 'all' ? 'Tất cả' : filterProduct}" | Tổng: ${listToExport.length} PO`;
            filterInfoCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: '6B4226' } };
            filterInfoCell.alignment = { horizontal: 'center', vertical: 'middle' };
            filterInfoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5EDE3' } };
            sheet.getRow(3).height = 18;

            sheet.getRow(4).values = cols.map(c => c.header);
            styleTableHeaderRow(sheet, 4, cols.length);

            let currentDataRow = 5;
            listToExport.forEach((order, idx) => {
                const items = order.products || [];
                const hasData = order.has_data || order.order_status > 0;
                const totalQty = items.reduce((acc, p) => acc + (p.quantity || 0), 0);

                if (items.length === 0) {
                    // PO không có sản phẩm
                    const row = sheet.addRow({
                        stt: idx + 1,
                        po: order.name || '---',
                        customer: order.customer || '---',
                        product_name: '(Chưa có sản phẩm)',
                        sku: '---',
                        qty: 0,
                        status: hasData ? 'Đã có dữ liệu' : 'Chưa có dữ liệu'
                    });
                    row.height = 20;
                    const sc = row.getCell(7);
                    sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasData ? 'ECFDF5' : 'FEF2F2' } };
                    sc.font = { name: 'Arial', size: 10, bold: true, color: { argb: hasData ? '059669' : 'DC2626' } };
                    currentDataRow++;
                } else {
                    items.forEach((p, pIdx) => {
                        const row = sheet.addRow({
                            stt: pIdx === 0 ? idx + 1 : '',
                            po: pIdx === 0 ? (order.name || '---') : '',
                            customer: pIdx === 0 ? (order.customer || '---') : '',
                            product_name: p.name || p.product_name || '---',
                            sku: p.sku || '---',
                            qty: p.quantity || 0,
                            status: pIdx === 0 ? (hasData ? 'Đã có dữ liệu' : 'Chưa có dữ liệu') : ''
                        });
                        row.height = 20;

                        if (pIdx === 0) {
                            const sc = row.getCell(7);
                            sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasData ? 'ECFDF5' : 'FEF2F2' } };
                            sc.font = { name: 'Arial', size: 10, bold: true, color: { argb: hasData ? '059669' : 'DC2626' } };
                        }

                        // Đường kẻ nhẹ giữa các sản phẩm cùng PO
                        if (pIdx > 0) {
                            for (let c = 1; c <= cols.length; c++) {
                                const cell = row.getCell(c);
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAFA' } };
                            }
                        }
                        currentDataRow++;
                    });

                    // Vẽ đường kẻ dưới nhóm PO
                    const lastPORow = sheet.getRow(currentDataRow - 1);
                    for (let c = 1; c <= cols.length; c++) {
                        lastPORow.getCell(c).border = {
                            ...lastPORow.getCell(c).border,
                            bottom: { style: 'medium', color: { argb: 'EADCC9' } }
                        };
                    }
                }
            });

            // Áp dụng border và font cho tất cả data rows
            const lastRow = currentDataRow - 1;
            applyDefaultBorders(sheet, 5, lastRow, cols.length);
            for (let r = 5; r <= lastRow; r++) {
                sheet.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.getCell(r, 2).alignment = { horizontal: 'left', vertical: 'middle' };
                sheet.getCell(r, 3).alignment = { horizontal: 'left', vertical: 'middle' };
                sheet.getCell(r, 4).alignment = { horizontal: 'left', vertical: 'middle' };
                sheet.getCell(r, 5).alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.getCell(r, 6).alignment = { horizontal: 'right', vertical: 'middle' };
                sheet.getCell(r, 6).numFmt = '#,##0';
                sheet.getCell(r, 7).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            await triggerFileDownload(workbook, `Danh_Sach_Ho_So_CL_${planName.replace(/\s+/g, '_')}_T${selectedPlan?.month || ''}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi khi xuất danh sách PO:", error);
            alert(`Lỗi xuất dữ liệu: ${error?.message || error}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportQualitySummary = async () => {
        setIsExporting(true);
        try {
            const res = await qualityService.getPlanDetails(selectedPlanId, 1, 10000, '', 'all', 'all', 'none');
            const allOrders = res?.items || [];

            const stats = res?.stats || { all: 0, has_data: 0, no_data: 0 };
            const totalPlanQty = allOrders.reduce((acc, o) => {
                const items = o.products || [];
                return acc + items.reduce((sum, p) => sum + (p.quantity || 0), 0);
            }, 0);
            const completionRate = stats.all > 0 ? (stats.has_data / stats.all) * 100 : 0;
            const planName = selectedPlan?.name || `Kế hoạch #${selectedPlanId}`;
            const planMonth = selectedPlan?.month ? `Tháng ${selectedPlan.month}/${selectedPlan.year}` : '';

            const workbook = new ExcelJS.Workbook();

            // ========== SHEET 1: Tổng Quan KPI ==========
            const sheetOverview = workbook.addWorksheet('Tổng Quan KPI');
            formatExcelHeader(sheetOverview, `BÁO CÁO TỔNG HỢP CHẤT LƯỢNG — ${planName} ${planMonth}`, 4);

            sheetOverview.addRow([]);
            sheetOverview.addRow(['THÔNG TIN KẾ HOẠCH', '', '', '']);
            sheetOverview.getCell(4, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: '7B5233' } };
            sheetOverview.addRow(['Tên kế hoạch:', planName, '', '']);
            sheetOverview.addRow(['Tháng/Năm:', planMonth || '---', '', '']);
            sheetOverview.addRow(['Ngày xuất báo cáo:', new Date().toLocaleDateString('vi-VN'), '', '']);
            sheetOverview.addRow([]);

            const kpiHeaders = ['Chỉ Số KPI', 'Giá Trị', 'Đơn Vị', 'Tỉ Lệ %'];
            sheetOverview.addRow(kpiHeaders);
            styleTableHeaderRow(sheetOverview, 9, kpiHeaders.length);

            const kpiRows = [
                ['Tổng Số Đơn Hàng (PO)', stats.all, 'PO', '100%'],
                ['Tổng Sản Lượng Kế Hoạch', totalPlanQty, 'Chiếc', '---'],
                ['PO Đã Có Dữ Liệu Chất Lượng', stats.has_data, 'PO', `${completionRate.toFixed(1)}%`],
                ['PO Chưa Có Dữ Liệu', stats.no_data, 'PO', `${(100 - completionRate).toFixed(1)}%`],
                ['Tỉ Lệ Hoàn Thành Hồ Sơ', `${completionRate.toFixed(1)}%`, '---', '---'],
            ];

            kpiRows.forEach(row => sheetOverview.addRow(row));
            applyDefaultBorders(sheetOverview, 10, 10 + kpiRows.length - 1, kpiHeaders.length);

            const rateRow = sheetOverview.getRow(10 + kpiRows.length - 1);
            for (let c = 1; c <= 4; c++) {
                rateRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
                rateRow.getCell(c).font = { name: 'Arial', size: 10, bold: true, color: { argb: '059669' } };
            }

            for (let r = 10; r <= 10 + kpiRows.length - 1; r++) {
                sheetOverview.getCell(r, 1).font = { name: 'Arial', size: 10, bold: true };
                sheetOverview.getCell(r, 2).alignment = { horizontal: 'right' };
                sheetOverview.getCell(r, 2).numFmt = '#,##0';
                sheetOverview.getCell(r, 3).alignment = { horizontal: 'center' };
                sheetOverview.getCell(r, 4).alignment = { horizontal: 'right' };
            }

            sheetOverview.getColumn(1).width = 35;
            sheetOverview.getColumn(2).width = 20;
            sheetOverview.getColumn(3).width = 15;
            sheetOverview.getColumn(4).width = 15;

            // ========== SHEET 2: Chi Tiết PO (mỗi SP 1 dòng) ==========
            const sheetDetails = workbook.addWorksheet('Chi Tiết Từng PO');
            const detailCols = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Mã PO / Đơn Hàng', key: 'po', width: 22 },
                { header: 'Khách Hàng', key: 'customer', width: 28 },
                { header: 'Tên Sản Phẩm', key: 'product_name', width: 40 },
                { header: 'Mã SKU', key: 'sku', width: 20 },
                { header: 'Số Lượng (Chiếc)', key: 'qty', width: 18 },
                { header: 'Trạng Thái Dữ Liệu', key: 'status', width: 22 }
            ];
            sheetDetails.columns = detailCols;
            formatExcelHeader(sheetDetails, `CHI TIẾT TRẠNG THÁI HỒ SƠ PO — ${planName} ${planMonth}`, detailCols.length);
            sheetDetails.getRow(4).values = detailCols.map(c => c.header);
            styleTableHeaderRow(sheetDetails, 4, detailCols.length);

            let detailRow = 5;
            allOrders.forEach((order, idx) => {
                const items = order.products || [];
                const hasData = order.has_data || order.order_status > 0;

                if (items.length === 0) {
                    const row = sheetDetails.addRow({
                        stt: idx + 1, po: order.name || '---', customer: order.customer || '---',
                        product_name: '(Chưa có sản phẩm)', sku: '---', qty: 0,
                        status: hasData ? 'Đã có dữ liệu' : 'Chưa có dữ liệu'
                    });
                    row.height = 20;
                    const sc = row.getCell(7);
                    sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasData ? 'ECFDF5' : 'FEF2F2' } };
                    sc.font = { name: 'Arial', size: 10, bold: true, color: { argb: hasData ? '059669' : 'DC2626' } };
                    detailRow++;
                } else {
                    items.forEach((p, pIdx) => {
                        const row = sheetDetails.addRow({
                            stt: pIdx === 0 ? idx + 1 : '',
                            po: pIdx === 0 ? (order.name || '---') : '',
                            customer: pIdx === 0 ? (order.customer || '---') : '',
                            product_name: p.name || p.product_name || '---',
                            sku: p.sku || '---',
                            qty: p.quantity || 0,
                            status: pIdx === 0 ? (hasData ? 'Đã có dữ liệu' : 'Chưa có dữ liệu') : ''
                        });
                        row.height = 20;
                        if (pIdx === 0) {
                            const sc = row.getCell(7);
                            sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasData ? 'ECFDF5' : 'FEF2F2' } };
                            sc.font = { name: 'Arial', size: 10, bold: true, color: { argb: hasData ? '059669' : 'DC2626' } };
                        } else {
                            for (let c = 1; c <= detailCols.length; c++) {
                                sheetDetails.getCell(detailRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAFA' } };
                            }
                        }
                        detailRow++;
                    });
                    // Kẻ đường dưới nhóm PO
                    for (let c = 1; c <= detailCols.length; c++) {
                        sheetDetails.getCell(detailRow - 1, c).border = {
                            bottom: { style: 'medium', color: { argb: 'EADCC9' } },
                            top: { style: 'thin', color: { argb: 'EADCC9' } },
                            left: { style: 'thin', color: { argb: 'EADCC9' } },
                            right: { style: 'thin', color: { argb: 'EADCC9' } }
                        };
                    }
                }
            });

            applyDefaultBorders(sheetDetails, 5, detailRow - 1, detailCols.length);
            for (let r = 5; r <= detailRow - 1; r++) {
                sheetDetails.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
                sheetDetails.getCell(r, 2).alignment = { horizontal: 'left', vertical: 'middle' };
                sheetDetails.getCell(r, 3).alignment = { horizontal: 'left', vertical: 'middle' };
                sheetDetails.getCell(r, 4).alignment = { horizontal: 'left', vertical: 'middle' };
                sheetDetails.getCell(r, 5).alignment = { horizontal: 'center', vertical: 'middle' };
                sheetDetails.getCell(r, 6).alignment = { horizontal: 'right', vertical: 'middle' };
                sheetDetails.getCell(r, 6).numFmt = '#,##0';
                sheetDetails.getCell(r, 7).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            await triggerFileDownload(workbook, `Bao_Cao_Tong_Hop_CL_${planName.replace(/\s+/g, '_')}_T${selectedPlan?.month || ''}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi khi xuất báo cáo tổng hợp chất lượng:", error);
            alert(`Lỗi xuất dữ liệu: ${error?.message || error}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportFullDetailedPOs = async (exportAllPlans = false) => {
        setIsExporting(true);
        try {
            const planIdToUse = exportAllPlans ? 'all' : selectedPlanId;
            const [ordersRes, handoverRes, inboundRes, qcRes] = await Promise.all([
                qualityService.getPlanDetails(planIdToUse, 1, 10000, '', 'all', 'all', 'none').catch(() => ({ items: [] })),
                qualityService.getHandoverHistoryByPlan(planIdToUse).catch((e) => { console.warn('handover err', e); return []; }),
                qualityService.getInboundHistoryByPlan(planIdToUse).catch((e) => { console.warn('inbound err', e); return []; }),
                qualityService.getQCReceivingHistoryByPlan(planIdToUse).catch((e) => { console.warn('qc err', e); return []; })
            ]);

            // Normalize: API có thể trả về array hoặc object có items/data
            const allOrders = ordersRes?.items || [];
            const handoverData = Array.isArray(handoverRes) ? handoverRes : (handoverRes?.items || handoverRes?.data || []);
            const inboundData = Array.isArray(inboundRes) ? inboundRes : (inboundRes?.items || inboundRes?.data || []);
            const qcData = Array.isArray(qcRes) ? qcRes : (qcRes?.items || qcRes?.data || []);

            const planName = exportAllPlans ? 'TOÀN HỆ THỐNG' : (selectedPlan?.name || `Kế hoạch #${selectedPlanId}`);
            const planMonth = exportAllPlans ? '' : (selectedPlan?.month ? `Tháng ${selectedPlan.month}/${selectedPlan.year}` : '');
            const workbook = new ExcelJS.Workbook();

            // ========== SHEET 1: Danh Sách PO & Pallet (mỗi SP 1 dòng) ==========
            const sheetOrders = workbook.addWorksheet('Danh Sách PO');
            const ordersCols = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Mã PO / Đơn Hàng', key: 'po', width: 22 },
                { header: 'Khách Hàng', key: 'customer', width: 28 },
                { header: 'Tên Sản Phẩm', key: 'product_name', width: 40 },
                { header: 'Mã SKU', key: 'sku', width: 20 },
                { header: 'Số Lượng (Chiếc)', key: 'qty', width: 18 },
                { header: 'Trạng Thái', key: 'status', width: 20 }
            ];
            sheetOrders.columns = ordersCols;
            formatExcelHeader(sheetOrders, `DANH SÁCH PO KẾ HOẠCH — ${planName} ${planMonth}`, ordersCols.length);
            sheetOrders.getRow(4).values = ordersCols.map(c => c.header);
            styleTableHeaderRow(sheetOrders, 4, ordersCols.length);

            let ordersRow = 5;
            allOrders.forEach((o, idx) => {
                const items = o.products || [];
                const hasData = o.has_data || o.order_status > 0;
                const poName = o.name || o.order_code || '---';
                if (items.length === 0) {
                    const row = sheetOrders.addRow({ stt: idx + 1, po: poName, customer: o.customer || '---', product_name: '(Chưa có chi tiết SP)', sku: '---', qty: 0, status: hasData ? 'Đã có dữ liệu' : 'Chưa có dữ liệu' });
                    row.height = 20;
                    const sc = row.getCell(7); sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasData ? 'ECFDF5' : 'FEF2F2' } }; sc.font = { name: 'Arial', size: 10, bold: true, color: { argb: hasData ? '059669' : 'DC2626' } };
                    ordersRow++;
                } else {
                    items.forEach((p, pIdx) => {
                        const row = sheetOrders.addRow({ stt: pIdx === 0 ? idx + 1 : '', po: pIdx === 0 ? poName : '', customer: pIdx === 0 ? (o.customer || '---') : '', product_name: p.name || p.product_name || '---', sku: p.sku || '---', qty: p.quantity || 0, status: pIdx === 0 ? (hasData ? 'Đã có dữ liệu' : 'Chưa có dữ liệu') : '' });
                        row.height = 20;
                        if (pIdx === 0) { const sc = row.getCell(7); sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasData ? 'ECFDF5' : 'FEF2F2' } }; sc.font = { name: 'Arial', size: 10, bold: true, color: { argb: hasData ? '059669' : 'DC2626' } }; }
                        else { for (let c = 1; c <= ordersCols.length; c++) { sheetOrders.getCell(ordersRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAFA' } }; } }
                        ordersRow++;
                    });
                    for (let c = 1; c <= ordersCols.length; c++) { sheetOrders.getCell(ordersRow - 1, c).border = { bottom: { style: 'medium', color: { argb: 'EADCC9' } }, top: { style: 'thin', color: { argb: 'EADCC9' } }, left: { style: 'thin', color: { argb: 'EADCC9' } }, right: { style: 'thin', color: { argb: 'EADCC9' } } }; }
                }
            });
            if (ordersRow > 5) {
                applyDefaultBorders(sheetOrders, 5, ordersRow - 1, ordersCols.length);
                for (let r = 5; r <= ordersRow - 1; r++) {
                    sheetOrders.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
                    sheetOrders.getCell(r, 2).alignment = { horizontal: 'left', vertical: 'middle' };
                    sheetOrders.getCell(r, 3).alignment = { horizontal: 'left', vertical: 'middle' };
                    sheetOrders.getCell(r, 4).alignment = { horizontal: 'left', vertical: 'middle' };
                    sheetOrders.getCell(r, 5).alignment = { horizontal: 'center', vertical: 'middle' };
                    sheetOrders.getCell(r, 6).alignment = { horizontal: 'right', vertical: 'middle' };
                    sheetOrders.getCell(r, 6).numFmt = '#,##0';
                    sheetOrders.getCell(r, 7).alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }

            // ========== SHEET 2: Nhật Ký Bàn Giao ==========
            const sheetHandover = workbook.addWorksheet('Nhật Ký Bàn Giao');
            const handoverCols = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Thời Gian', key: 'time', width: 22 },
                { header: 'Mã PO / Đơn Hàng', key: 'po', width: 20 },
                { header: 'Mã Bàn Giao / Pallet', key: 'deliv_id', width: 22 },
                { header: 'Linh Kiện / SP', key: 'part', width: 30 },
                { header: 'Quy Cách', key: 'spec', width: 20 },
                { header: 'Công Đoạn Giao', key: 'stage_from', width: 20 },
                { header: 'Công Đoạn Nhận', key: 'stage_to', width: 20 },
                { header: 'Số Lượng', key: 'qty', width: 14 },
                { header: 'Số Lượng OK', key: 'qty_ok', width: 14 },
                { header: 'Số Lượng Lỗi', key: 'qty_ng', width: 14 },
                { header: 'Người Giao', key: 'sender', width: 20 },
                { header: 'Người Nhận', key: 'receiver', width: 20 },
                { header: 'QC Xác Nhận', key: 'qc_name', width: 20 },
                { header: 'Trạng Thái', key: 'status', width: 15 },
                { header: 'Ghi Chú', key: 'note', width: 25 }
            ];
            sheetHandover.columns = handoverCols;
            formatExcelHeader(sheetHandover, `NHẬT KÝ BÀN GIAO — ${planName} ${planMonth}`, handoverCols.length);
            sheetHandover.getRow(4).values = handoverCols.map(c => c.header);
            styleTableHeaderRow(sheetHandover, 4, handoverCols.length);
            handoverData.forEach((item, idx) => {
                sheetHandover.addRow({
                    stt: idx + 1,
                    time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---',
                    po: item.po_code || '---',
                    deliv_id: item.delivery_id || '---',
                    part: item.part_name || '---',
                    spec: item.specification || '---',
                    stage_from: item.delivery_stage || '---',
                    stage_to: item.receiving_stage || '---',
                    qty: item.quantity_total || 0,
                    qty_ok: item.quantity_ok || (item.quantity_total || 0),
                    qty_ng: item.quantity_ng || item.quantity_error || 0,
                    sender: item.sx_delivery_name || '---',
                    receiver: item.sx_receipt_name || '---',
                    qc_name: item.qc_receipt_name || '---',
                    status: item.status || '---',
                    note: item.note || '---'
                });
            });
            if (handoverData.length > 0) {
                applyDefaultBorders(sheetHandover, 5, handoverData.length + 4, handoverCols.length);
                for (let r = 5; r <= handoverData.length + 4; r++) {
                    sheetHandover.getCell(r, 1).alignment = { horizontal: 'center' };
                    sheetHandover.getCell(r, 2).alignment = { horizontal: 'center' };
                    sheetHandover.getCell(r, 3).alignment = { horizontal: 'center' };
                    sheetHandover.getCell(r, 9).alignment = { horizontal: 'right' };
                    sheetHandover.getCell(r, 9).numFmt = '#,##0';
                    sheetHandover.getCell(r, 10).alignment = { horizontal: 'right' };
                    sheetHandover.getCell(r, 10).numFmt = '#,##0';
                    sheetHandover.getCell(r, 11).alignment = { horizontal: 'right' };
                    sheetHandover.getCell(r, 11).numFmt = '#,##0';
                    sheetHandover.getCell(r, 15).alignment = { horizontal: 'center' };
                }
            }

            // ========== SHEET 3: Kiểm Tra Đầu Vào ==========
            const sheetInbound = workbook.addWorksheet('Kiểm Tra Đầu Vào');
            const inboundCols = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Thời Gian', key: 'time', width: 22 },
                { header: 'Mã PO / Đơn Hàng', key: 'po', width: 20 },
                { header: 'Linh Kiện / Phôi Gỗ', key: 'part', width: 30 },
                { header: 'Kích Thước/Quy Cách', key: 'spec', width: 25 },
                { header: 'Số Mẫu Kiểm', key: 'sample_qty', width: 14 },
                { header: 'Số Lỗi', key: 'error_qty', width: 12 },
                { header: 'Tỉ Lệ Lỗi (%)', key: 'rate', width: 14 },
                { header: 'Kết Quả', key: 'result', width: 14 },
                { header: 'Người Kiểm Tra', key: 'inspector', width: 20 },
                { header: 'Ghi Chú Kỹ Thuật', key: 'note', width: 28 }
            ];
            sheetInbound.columns = inboundCols;
            formatExcelHeader(sheetInbound, `NHẬT KÝ KIỂM TRA ĐẦU VÀO — ${planName} ${planMonth}`, inboundCols.length);
            sheetInbound.getRow(4).values = inboundCols.map(c => c.header);
            styleTableHeaderRow(sheetInbound, 4, inboundCols.length);
            inboundData.forEach((item, idx) => {
                const sQty = item.sample_qty || 35;
                const eQty = item.error_qty || 0;
                const rate = item.defect_rate || ((eQty / sQty) * 100).toFixed(2);
                sheetInbound.addRow({
                    stt: idx + 1,
                    time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---',
                    po: item.cont_name || item.po_code || '---',
                    part: item.part_name || '---',
                    spec: item.specification || '---',
                    sample_qty: sQty,
                    error_qty: eQty,
                    rate: `${rate}%`,
                    result: (item.result === 'Pass' || item.result === 'Đạt') ? 'ĐẠT' : 'KHÔNG ĐẠT',
                    inspector: item.inspector_name || 'Đặng Quý Hải',
                    note: item.note || '---'
                });
            });
            if (inboundData.length > 0) {
                applyDefaultBorders(sheetInbound, 5, inboundData.length + 4, inboundCols.length);
                for (let r = 5; r <= inboundData.length + 4; r++) {
                    sheetInbound.getCell(r, 1).alignment = { horizontal: 'center' };
                    sheetInbound.getCell(r, 2).alignment = { horizontal: 'center' };
                    sheetInbound.getCell(r, 3).alignment = { horizontal: 'center' };
                    sheetInbound.getCell(r, 6).alignment = { horizontal: 'right' };
                    sheetInbound.getCell(r, 7).alignment = { horizontal: 'right' };
                    sheetInbound.getCell(r, 8).alignment = { horizontal: 'right' };
                    sheetInbound.getCell(r, 9).alignment = { horizontal: 'center' };
                    const resCell = sheetInbound.getCell(r, 9);
                    if (resCell.value === 'ĐẠT') {
                        resCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '059669' } };
                    } else {
                        resCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } };
                    }
                }
            }

            // ========== SHEET 4: QC Kiểm Tra ==========
            const sheetQC = workbook.addWorksheet('QC Kiểm Tra Hàng');
            const qcCols = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Thời Gian', key: 'time', width: 22 },
                { header: 'Mã PO / Đơn Hàng', key: 'po', width: 20 },
                { header: 'Công Đoạn', key: 'stage', width: 18 },
                { header: 'Linh Kiện / Chi Tiết', key: 'part', width: 28 },
                { header: 'Nhân Viên QC', key: 'inspector', width: 20 },
                { header: 'Độ Ẩm (%)', key: 'moisture', width: 14 },
                { header: 'Độ Cong (mm)', key: 'bend', width: 15 },
                { header: 'Số Mẫu Kiểm', key: 'sample_qty', width: 14 },
                { header: 'Số Lỗi', key: 'error_qty', width: 12 },
                { header: 'Kết Luận QC', key: 'result', width: 16 },
                { header: 'Chi Tiết Lỗi', key: 'defects', width: 25 },
                { header: 'Ghi Chú', key: 'note', width: 25 }
            ];
            sheetQC.columns = qcCols;
            formatExcelHeader(sheetQC, `NHẬT KÝ KIỂM TRA CHẤT LƯỢNG QC — ${planName} ${planMonth}`, qcCols.length);
            sheetQC.getRow(4).values = qcCols.map(c => c.header);
            styleTableHeaderRow(sheetQC, 4, qcCols.length);
            qcData.forEach((item, idx) => {
                const resData = item.results_data || {};
                const defectsStr = (item.defects || []).map(d => `${d.name || d.code}: ${d.quantity || 1}`).join('; ') || (item.error_qty > 0 ? 'Có lỗi ngoại quan' : 'Không có');
                const isPass = (item.result === 'Đạt' || item.result === 'Pass' || item.error_qty === 0);

                sheetQC.addRow({
                    stt: idx + 1,
                    time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---',
                    po: item.po_code || '---',
                    stage: item.stage_name || resData.stage || '---',
                    part: item.part_name || '---',
                    inspector: item.qc_inspector_name || '---',
                    moisture: item.moisture ? `${item.moisture}%` : (resData.moisture ? `${resData.moisture}%` : '---'),
                    bend: item.bend ? `${item.bend}mm` : (resData.bend ? `${resData.bend}mm` : '---'),
                    sample_qty: item.sample_qty || 35,
                    error_qty: item.error_qty || 0,
                    result: isPass ? 'ĐẠT' : 'KHÔNG ĐẠT',
                    defects: defectsStr,
                    note: item.note || '---'
                });
            });
            if (qcData.length > 0) {
                applyDefaultBorders(sheetQC, 5, qcData.length + 4, qcCols.length);
                for (let r = 5; r <= qcData.length + 4; r++) {
                    sheetQC.getCell(r, 1).alignment = { horizontal: 'center' };
                    sheetQC.getCell(r, 2).alignment = { horizontal: 'center' };
                    sheetQC.getCell(r, 3).alignment = { horizontal: 'center' };
                    sheetQC.getCell(r, 7).alignment = { horizontal: 'center' };
                    sheetQC.getCell(r, 8).alignment = { horizontal: 'center' };
                    sheetQC.getCell(r, 9).alignment = { horizontal: 'right' };
                    sheetQC.getCell(r, 10).alignment = { horizontal: 'right' };
                    sheetQC.getCell(r, 11).alignment = { horizontal: 'center' };
                    const resCell = sheetQC.getCell(r, 11);
                    if (resCell.value === 'ĐẠT') {
                        resCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '059669' } };
                    } else {
                        resCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } };
                    }
                }
            }

            const fileNamePrefix = exportAllPlans ? 'Bao_Cao_Chi_Tiet_Toan_Bo_PO_He_Thong' : `Bao_Cao_Chi_Tiet_PO_${planName.replace(/\s+/g, '_')}_T${selectedPlan?.month || ''}`;
            await triggerFileDownload(workbook, `${fileNamePrefix}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi khi xuất chi tiết tất cả các PO:", error);
            alert(`Lỗi xuất đầy đủ dữ liệu: ${error?.message || error}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="gold-layout">
            <style dangerouslySetInnerHTML={{
                __html: `
                .quality-records-container {
                    width: 100%;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                
                @media (min-width: 1024px) {
                    .quality-records-container {
                        height: calc(100vh - 100px); /* Fit within desktop viewport */
                        padding: 0;
                        overflow: hidden;
                    }
                }

                .qr-grid-scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem 0.25rem;
                }
                
                @media (max-width: 1023px) {
                    .qr-grid-scroll-area {
                        overflow-y: visible;
                        padding: 0.5rem 0; /* Add top margin for mobile gap */
                    }
                }
                .qr-grid {
                    display: grid;
                    grid-template-columns: repeat(1, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                @media (min-width: 640px) { .qr-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (min-width: 1024px) { .qr-grid { grid-template-columns: repeat(3, 1fr); } }
                @media (min-width: 1280px) { .qr-grid { grid-template-columns: repeat(4, 1fr); } }
                @media (min-width: 1536px) { .qr-grid { grid-template-columns: repeat(5, 1fr); } }

                .qr-toolbar {
                    padding: 0.75rem 1rem;
                    margin-bottom: 0.75rem;
                    background-color: #fff;
                    border-radius: 12px;
                    border: 1px solid #EADCC9;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    position: sticky;
                    top: 60px;
                    z-index: 100;
                    box-shadow: 0 4px 12px rgba(123, 82, 51, 0.08);
                }
                @media (min-width: 1024px) {
                    .qr-toolbar {
                        position: relative;
                        top: 0;
                        left: auto;
                        right: auto;
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        padding: 1rem 1.25rem;
                        z-index: 10;
                        margin-bottom: 1rem;
                        box-shadow: none;
                        border: 1px solid #EADCC9;
                        border-radius: 12px;
                    }
                }
                @media (max-width: 767px) {
                    .qr-toolbar {
                        padding: 0.5rem 0.75rem;
                    }
                }
                
                .qr-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    width: 100%;
                }
                @media (min-width: 1024px) {
                    .qr-controls {
                        flex-direction: row;
                        align-items: center;
                        width: auto;
                    }
                }
                
                .qr-mobile-row {
                    display: flex;
                    gap: 8px;
                    width: 100%;
                    align-items: center;
                }
                @media (min-width: 1024px) {
                    .qr-mobile-row {
                        width: auto;
                        gap: 12px;
                    }
                }

                .qr-search-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                }
                @media (min-width: 1024px) {
                    .qr-search-wrapper {
                        min-width: 350px;
                        width: auto;
                    }
                }
                
                .qr-export-btn {
                    width: 100%;
                }
                @media (min-width: 1024px) {
                    .qr-export-btn {
                        width: auto;
                    }
                }

                .qr-khsx-select {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                @media (min-width: 1024px) {
                    .qr-khsx-select {
                        min-width: 200px;
                        width: auto;
                    }
                }

                .qr-khsx-select option {
                    white-space: normal;
                    word-wrap: break-word;
                }
                .qr-pagination-container {
                    padding: 0.5rem 1rem;
                    background-color: #fff;
                    border-radius: 12px;
                    border: 1px solid #EADCC9;
                    display: flex;
                    justify: space-between;
                    align-items: center;
                }
                @media (min-width: 1024px) {
                    .qr-pagination-container {
                        position: relative;
                        bottom: auto;
                        left: auto;
                        right: auto;
                        margin-top: 1rem;
                        box-shadow: none;
                        flex-direction: row;
                        justify-content: space-between;
                        padding: 1rem 1.25rem;
                        border: 1px solid #EADCC9;
                    }
                }
                @media (min-width: 768px) {
                    .qr-pagination-container {
                        flex-direction: row;
                        justify-content: space-between;
                    }
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

            {/* ── STICKY TOP ZONE ── */}
            <div className="sticky-top-zone">
                <PageToolbar
                    searchValue={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
                    searchPlaceholder="Tìm kiếm theo Mã PO..."
                    showSort={true}
                    sortOptions={[
                        { value: 'none', label: 'Sắp xếp: Dữ liệu mới nhất (Mặc định)' },
                        { value: 'po_asc', label: 'Mã PO (A-Z)' },
                        { value: 'po_desc', label: 'Mã PO (Z-A)' },
                        { value: 'qty_asc', label: 'Sản lượng (Tăng dần)' },
                        { value: 'qty_desc', label: 'Sản lượng (Giảm dần)' },
                        { value: 'oldest_data', label: 'Dữ liệu phát sinh cũ nhất' }
                    ]}
                    sortValue={sortBy}
                    onSortChange={(val) => { setSortBy(val); setCurrentPage(1); }}
                    showFilter={true}
                    isFilterOpen={isFilterBarOpen}
                    onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
                    activeFiltersCount={(statusFilter !== 'all' ? 1 : 0) + (isPlanFiltered ? 1 : 0) + (filterProduct !== 'all' ? 1 : 0) + (sortBy !== 'none' ? 1 : 0)}
                    onExport={() => setShowExportModal(true)}
                    isExporting={isExporting}
                    hasWritePermission={true}
                />

                {/* INLINE EXPANDABLE FILTER BAR */}
                {isFilterBarOpen && (
                    <div className="filter-inline-bar" style={{ alignItems: 'flex-end' }}>
                        {/* KHSX Tháng */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Tháng / KHSX</label>
                            <select
                                className="qr-khsx-select"
                                value={selectedPlanId === 'all' || !selectedPlanId ? 'all' : selectedPlanId}
                                onChange={handlePlanChange}
                            >
                                <option value="all">Tất cả KHSX</option>
                                {monthOptions.map(m => (
                                    <option key={m.planId} value={m.planId}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Trạng thái dữ liệu */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Trạng thái dữ liệu</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">Tất cả PO</option>
                                <option value="has_data">Đã có dữ liệu chất lượng</option>
                                <option value="no_data">Chưa có dữ liệu chất lượng</option>
                            </select>
                        </div>

                        {/* Tên sản phẩm */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Tên Sản Phẩm</label>
                            <select
                                value={filterProduct}
                                onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">Tất cả sản phẩm</option>
                                {uniqueProductNames.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
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

                        <div className="filter-field-group" style={{ minWidth: 'auto', alignSelf: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                style={{
                                    height: '38px',
                                    padding: '0 14px',
                                    fontSize: '0.85rem',
                                    backgroundColor: '#FAF6F0',
                                    color: '#7B5233',
                                    border: '1.5px solid #EADCC9',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxSizing: 'border-box',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F5EDE4';
                                    e.currentTarget.style.borderColor = '#D8C7B8';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FAF6F0';
                                    e.currentTarget.style.borderColor = '#EADCC9';
                                }}
                            >
                                <RotateCcw size={14} />
                                <span>Xóa bộ lọc</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bảng dữ liệu */}
            <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <div className="spinner"></div>
                                <span>Đang tải dữ liệu hồ sơ...</span>
                            </div>
                        </div>
                    ) : currentOrders.length === 0 ? (
                        <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                                <span>Không tìm thấy hồ sơ PO nào cho {selectedPlanId === 'all' ? 'tất cả kế hoạch' : (monthOptions.find(m => m.planId === selectedPlanId)?.label || selectedPlan?.name || 'kế hoạch này')}.</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Bảng Desktop */}
                            <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                                <table className="data-table" style={{ minWidth: '1000px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '80px', textAlign: 'center' }}>STT</th>
                                            <th>Mã PO</th>
                                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Số lượng sản phẩm</th>
                                            <th style={{ width: '200px', textAlign: 'center' }}>Trạng thái</th>
                                            <th style={{ width: '150px', textAlign: 'center' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentOrders.map((order, idx) => {
                                            const stt = indexOfFirstItem + idx + 1;
                                            const items = order.products || order.items || [];
                                            const totalQty = items.reduce((acc, p) => acc + (p.quantity || 0), 0);
                                            const hasData = order.has_data || order.order_status > 0;

                                            return (
                                                <tr
                                                    key={order.id}
                                                    style={{
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        zIndex: actionMenuId === order.id ? 30 : 1
                                                    }}
                                                    onClick={() => navigate(`/admin/quality-records/${order.order_code || order.name}`)}
                                                >
                                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                                                    <td className="font-bold" style={{ color: '#7B5233', fontWeight: 'bold' }}>
                                                        <div>{order.name || order.order_code}</div>
                                                        {order.last_activity && (
                                                            <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: '500', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                                                                Hoạt động: {new Date(order.last_activity.replace(' ', 'T')).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: '600' }}>
                                                        {totalQty.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 'normal' }}>sản phẩm</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                backgroundColor: hasData ? '#ECFDF5' : '#FEF2F2',
                                                                color: hasData ? '#10B981' : '#EF4444',
                                                                border: `1px solid ${hasData ? '#A7F3D0' : '#FCA5A5'}`,
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {hasData ? 'Đã có dữ liệu' : 'Chưa có dữ liệu'}
                                                        </span>
                                                    </td>
                                                    <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === order.id ? 40 : 1 }} onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            className="action-btn"
                                                            onClick={() => setActionMenuId(actionMenuId === order.id ? null : order.id)}
                                                        ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></button>
                                                        {actionMenuId === order.id && (
                                                            <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                                                                <button
                                                                    className="action-menu-item"
                                                                    onClick={() => {
                                                                        setActionMenuId(null);
                                                                        navigate(`/admin/quality-records/${order.order_code || order.name}`);
                                                                    }}
                                                                >
                                                                    Xem chi tiết
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View - Cards list */}
                            <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                                {currentOrders.map((order, idx) => {
                                    const stt = indexOfFirstItem + idx + 1;
                                    const items = order.products || order.items || [];
                                    const totalQty = items.reduce((acc, p) => acc + (p.quantity || 0), 0);
                                    const hasData = order.has_data || order.order_status > 0;

                                    return (
                                        <div key={order.id} className="mgmt-card animate-card-entrance" style={{
                                            backgroundColor: '#fff',
                                            borderRadius: '10px',
                                            border: '1px solid #EADCC9',
                                            padding: '12px',
                                            marginBottom: '10px',
                                            cursor: 'pointer'
                                        }}
                                            onClick={() => navigate(`/admin/quality-records/${order.order_code || order.name}`)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</span>
                                                <span
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                        backgroundColor: hasData ? '#ECFDF5' : '#FEF2F2',
                                                        color: hasData ? '#10B981' : '#EF4444',
                                                        border: `1px solid ${hasData ? '#A7F3D0' : '#FCA5A5'}`
                                                    }}
                                                >
                                                    {hasData ? 'ĐÃ CÓ DỮ LIỆU' : 'CHƯA CÓ DỮ LIỆU'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '2px' }}>
                                                {order.name || order.order_code}
                                            </div>
                                            {order.last_activity && (
                                                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                                                    Hoạt động: {new Date(order.last_activity.replace(' ', 'T')).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                                Số lượng: <strong>{totalQty}</strong> sản phẩm
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Phân trang - Desktop */}
                            <div className="admin-pagination-desktop desktop-only">
                                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600', textAlign: 'center' }}>
                                    Hiển thị <b>{totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalCount)}</b> trên <b>{totalCount}</b> hồ sơ
                                </div>

                                {totalPages > 1 && (
                                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <button
                                            className="page-btn"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft size={14} />
                                        </button>

                                        {/* Optimized Pagination Window */}
                                        {(() => {
                                            const pages = [];
                                            const maxVisible = 3;
                                            let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                            let end = Math.min(totalPages, start + maxVisible - 1);

                                            if (end - start + 1 < maxVisible) {
                                                start = Math.max(1, end - maxVisible + 1);
                                            }

                                            if (start > 1) {
                                                pages.push(
                                                    <button key={1} className={`page-btn ${currentPage === 1 ? 'active' : ''}`} onClick={() => setCurrentPage(1)}>1</button>
                                                );
                                                if (start > 2) pages.push(<span key="dots-start" style={{ color: '#8D6E63', fontSize: '0.7rem' }}>...</span>);
                                            }

                                            for (let i = start; i <= end; i++) {
                                                if (i < 1) continue;
                                                pages.push(
                                                    <button
                                                        key={i}
                                                        className={`page-btn ${currentPage === i ? 'active' : ''}`}
                                                        onClick={() => setCurrentPage(i)}
                                                    >
                                                        {i}
                                                    </button>
                                                );
                                            }

                                            if (end < totalPages) {
                                                if (end < totalPages - 1) pages.push(<span key="dots-end" style={{ color: '#8D6E63', fontSize: '0.7rem' }}>...</span>);
                                                pages.push(
                                                    <button key={totalPages} className={`page-btn ${currentPage === totalPages ? 'active' : ''}`} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                                                );
                                            }
                                            return pages;
                                        })()}

                                        <button
                                            className="page-btn"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Phân trang - Mobile Sticky */}
            {totalPages > 1 && (
                <div className="pagination-mobile-sticky mobile-only">
                    <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {totalPages || 1}</span>
                    <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages <= 1}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* EXPORT OPTIONS MODAL */}
            {showExportModal && (
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
                    zIndex: 99999,
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
                        boxSizing: 'border-box'
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

                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: '0 0 20px 0', borderBottom: '1px solid #EADCC9', paddingBottom: '10px' }}>Lựa chọn xuất báo cáo Excel</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>

                            {/* Option 1 */}
                            <div
                                className={`export-option-card ${selectedExportOption === 'current' ? 'active' : ''}`}
                                onClick={() => setSelectedExportOption('current')}
                            >
                                <div style={{ marginTop: '2px' }}>
                                    <input type="radio" checked={selectedExportOption === 'current'} readOnly style={{ accentColor: '#7B5233' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất danh sách đang hiển thị</span>
                                    <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                                        Xuất danh sách PO hiện tại theo các bộ lọc đang chọn ({totalCount} dòng).
                                    </span>
                                </div>
                            </div>

                            {/* Option 2 */}
                            <div
                                className={`export-option-card ${selectedExportOption === 'summary' ? 'active' : ''}`}
                                onClick={() => setSelectedExportOption('summary')}
                            >
                                <div style={{ marginTop: '2px' }}>
                                    <input type="radio" checked={selectedExportOption === 'summary'} readOnly style={{ accentColor: '#7B5233' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Báo cáo tổng hợp chất lượng kế hoạch</span>
                                    <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                                        Tổng hợp các chỉ số KPI chất lượng của kế hoạch cùng danh sách tổng quan.
                                    </span>
                                </div>
                            </div>

                            {/* Option 3 */}
                            <div
                                className={`export-option-card ${selectedExportOption === 'full' ? 'active' : ''}`}
                                onClick={() => setSelectedExportOption('full')}
                            >
                                <div style={{ marginTop: '2px' }}>
                                    <input type="radio" checked={selectedExportOption === 'full'} readOnly style={{ accentColor: '#7B5233' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất chi tiết toàn bộ PO (Kế hoạch này)</span>
                                    <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                                        Đầy đủ 4 Sheet: Danh sách PO, Nhật ký Bàn giao, Kiểm tra đầu vào IQC, QC kiểm tra hàng.
                                    </span>
                                </div>
                            </div>

                            {/* Option 4 */}
                            <div
                                className={`export-option-card ${selectedExportOption === 'all_plans' ? 'active' : ''}`}
                                onClick={() => setSelectedExportOption('all_plans')}
                            >
                                <div style={{ marginTop: '2px' }}>
                                    <input type="radio" checked={selectedExportOption === 'all_plans'} readOnly style={{ accentColor: '#7B5233' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất chi tiết tất cả PO (Toàn hệ thống)</span>
                                    <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                                        Tổng hợp chi tiết 4 Sheet của tất cả các PO trên toàn bộ các Kế hoạch sản xuất.
                                    </span>
                                </div>
                            </div>

                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    if (selectedExportOption === 'current') handleExportCurrentList();
                                    else if (selectedExportOption === 'summary') handleExportQualitySummary();
                                    else if (selectedExportOption === 'full') handleExportFullDetailedPOs(false);
                                    else if (selectedExportOption === 'all_plans') handleExportFullDetailedPOs(true);
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
                                {isExporting ? 'Đang xuất file...' : 'Tải xuống Báo cáo'}
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
                </div>
            )}
        </div>
    );
};

export default QualityRecordsListView;
