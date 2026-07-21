import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileText,
  X,
  RotateCcw,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Download
} from 'lucide-react';
import api, { API_ROOT } from '@webShared/Services/api.service';
import ExcelJS from 'exceljs';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const getInspectionTypeLabel = (type) => {
  switch (type) {
    case 'bam-dinh': return 'Bám dính';
    case 'sau-dong-goi': return 'Sau đóng gói';
    case 'phu-kien': return 'Phụ kiện';
    case 'quy-trinh': return 'Quy trình';
    case 'do-am': return 'Độ ẩm / Kích thước';
    case 'mau-dau-tien': return 'Mẫu đầu tiên';
    default: return type || 'N/A';
  }
};

const InspectionReports = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/inspection-reports');
  
  // Tab control: 'stage' | 'input' | 'daily' | 'process'
  const [activeTab, setActiveTab] = useState('stage');
  
  // Data lists
  const [stageInspections, setStageInspections] = useState([]);
  const [dailyInspections, setDailyInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Detail Modal state
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedDaily, setSelectedDaily] = useState(null);
  const [selectedInbound, setSelectedInbound] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportOption, setSelectedExportOption] = useState('current'); // 'current' | 'po' | 'summary'
  const [exportPoCode, setExportPoCode] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Search & Filter state for Stage Inspections & Process Inspections (shared or separate)
  const [stageSearch, setStageSearch] = useState('');
  const [stageTypeFilter, setStageTypeFilter] = useState('all');
  const [stageStatusFilter, setStageStatusFilter] = useState('all');
  const [stageStartDate, setStageStartDate] = useState('');
  const [stageEndDate, setStageEndDate] = useState('');
  const [stageSort, setStageSort] = useState('date_desc');

  // Search & Filter state for Incoming/Input Inspections
  const [inboundSearch, setInboundSearch] = useState('');
  const [inboundStatusFilter, setInboundStatusFilter] = useState('all'); // 'all' | 'pass' | 'fail'
  const [inboundStartDate, setInboundStartDate] = useState('');
  const [inboundEndDate, setInboundEndDate] = useState('');
  const [inboundSort, setInboundSort] = useState('date_desc');

  // Search & Filter state for Daily Defects
  const [dailySearch, setDailySearch] = useState('');
  const [dailyStartDate, setDailyStartDate] = useState('');
  const [dailyEndDate, setDailyEndDate] = useState('');
  const [dailySort, setDailySort] = useState('date_desc');

  // Pagination states
  const [stagePage, setStagePage] = useState(1);
  const [stageLimit, setStageLimit] = useState(15);
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundLimit, setInboundLimit] = useState(15);
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(15);

  // Set Header Title / Subtitle
  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Load all data on mount / refresh
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch up to 1000 items to support rich frontend search/filter/pagination
      const [stageRes, dailyRes] = await Promise.all([
        api.get('/inspections/stage?limit=1000'),
        api.get('/inspections/daily?limit=1000')
      ]);
      
      setStageInspections(Array.isArray(stageRes) ? stageRes : []);
      setDailyInspections(Array.isArray(dailyRes) ? dailyRes : []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu kiểm tra:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Unique PO codes in system for selector in export popup
  const uniquePoList = useMemo(() => {
    const pos = stageInspections.map(i => i.batch_no).filter(Boolean);
    return Array.from(new Set(pos)).sort();
  }, [stageInspections]);

  // Initialize selected PO code for export once list is loaded
  useEffect(() => {
    if (uniquePoList.length > 0 && !exportPoCode) {
      setExportPoCode(uniquePoList[0]);
    }
  }, [uniquePoList, exportPoCode]);

  // --- FILTERING & SORTING STAGE INSPECTIONS (Excludes 'quy-trinh', 'mau-dau-tien', and 'do-am') ---
  const filteredStageList = useMemo(() => {
    // Filter out quy-trinh, mau-dau-tien, and do-am
    let result = stageInspections.filter(item => item.inspection_type !== 'quy-trinh' && item.inspection_type !== 'mau-dau-tien' && item.inspection_type !== 'do-am');

    // Search filter (PO, SKU, Inspector)
    if (stageSearch.trim()) {
      const term = stageSearch.toLowerCase().trim();
      result = result.filter(item => 
        (item.batch_no || '').toLowerCase().includes(term) ||
        (item.product_sku || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term) ||
        getInspectionTypeLabel(item.inspection_type).toLowerCase().includes(term)
      );
    }

    // Type filter
    if (stageTypeFilter !== 'all') {
      result = result.filter(item => item.inspection_type === stageTypeFilter);
    }

    // Conclusion/Status filter
    if (stageStatusFilter !== 'all') {
      result = result.filter(item => item.conclusion === stageStatusFilter);
    }

    // Date range filter
    if (stageStartDate) {
      const start = new Date(stageStartDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.inspection_date) >= start);
    }
    if (stageEndDate) {
      const end = new Date(stageEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.inspection_date) <= end);
    }

    // Sort logic
    if (stageSort === 'date_desc') {
      result.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
    } else if (stageSort === 'date_asc') {
      result.sort((a, b) => new Date(a.inspection_date) - new Date(b.inspection_date));
    } else if (stageSort === 'po_asc') {
      result.sort((a, b) => (a.batch_no || '').localeCompare(b.batch_no || ''));
    } else if (stageSort === 'po_desc') {
      result.sort((a, b) => (b.batch_no || '').localeCompare(a.batch_no || ''));
    }

    return result;
  }, [stageInspections, stageSearch, stageTypeFilter, stageStatusFilter, stageStartDate, stageEndDate, stageSort]);

  // --- FILTERING & SORTING PROCESS INSPECTIONS (Only 'quy-trinh') ---
  const filteredProcessList = useMemo(() => {
    let result = stageInspections.filter(item => item.inspection_type === 'quy-trinh');

    // Search filter (PO, SKU, Inspector)
    if (stageSearch.trim()) {
      const term = stageSearch.toLowerCase().trim();
      result = result.filter(item => 
        (item.batch_no || '').toLowerCase().includes(term) ||
        (item.product_sku || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term)
      );
    }

    // Conclusion/Status filter
    if (stageStatusFilter !== 'all') {
      result = result.filter(item => item.conclusion === stageStatusFilter);
    }

    // Date range filter
    if (stageStartDate) {
      const start = new Date(stageStartDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.inspection_date) >= start);
    }
    if (stageEndDate) {
      const end = new Date(stageEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.inspection_date) <= end);
    }

    // Sort logic
    if (stageSort === 'date_desc') {
      result.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
    } else if (stageSort === 'date_asc') {
      result.sort((a, b) => new Date(a.inspection_date) - new Date(b.inspection_date));
    } else if (stageSort === 'po_asc') {
      result.sort((a, b) => (a.batch_no || '').localeCompare(b.batch_no || ''));
    } else if (stageSort === 'po_desc') {
      result.sort((a, b) => (b.batch_no || '').localeCompare(a.batch_no || ''));
    }

    return result;
  }, [stageInspections, stageSearch, stageStatusFilter, stageStartDate, stageEndDate, stageSort]);

  // --- FILTERING & SORTING FIRST ARTICLE INSPECTIONS (mau-dau-tien) ---
  const filteredInboundList = useMemo(() => {
    let result = stageInspections.filter(item => item.inspection_type === 'mau-dau-tien');

    // Search filter (PO, SKU, Inspector)
    if (inboundSearch.trim()) {
      const term = inboundSearch.toLowerCase().trim();
      result = result.filter(item => 
        (item.batch_no || '').toLowerCase().includes(term) ||
        (item.product_sku || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term)
      );
    }

    // Conclusion/Status filter
    if (inboundStatusFilter !== 'all') {
      result = result.filter(item => item.conclusion === inboundStatusFilter);
    }

    // Date range filter
    if (inboundStartDate) {
      const start = new Date(inboundStartDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.inspection_date) >= start);
    }
    if (inboundEndDate) {
      const end = new Date(inboundEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.inspection_date) <= end);
    }

    // Sort logic
    if (inboundSort === 'date_desc') {
      result.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
    } else if (inboundSort === 'date_asc') {
      result.sort((a, b) => new Date(a.inspection_date) - new Date(b.inspection_date));
    } else if (inboundSort === 'part_asc') {
      result.sort((a, b) => (a.product_sku || '').localeCompare(b.product_sku || ''));
    } else if (inboundSort === 'part_desc') {
      result.sort((a, b) => (b.product_sku || '').localeCompare(a.product_sku || ''));
    }

    return result;
  }, [stageInspections, inboundSearch, inboundStatusFilter, inboundStartDate, inboundEndDate, inboundSort]);

  // --- FILTERING & SORTING DAILY DEFECTS ---
  const filteredDailyList = useMemo(() => {
    let result = [...dailyInspections];

    // Search filter (Stage, Inspector)
    if (dailySearch.trim()) {
      const term = dailySearch.toLowerCase().trim();
      result = result.filter(item => 
        (item.stage_name || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term)
      );
    }

    // Date range filter
    if (dailyStartDate) {
      const start = new Date(dailyStartDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.inspection_date) >= start);
    }
    if (dailyEndDate) {
      const end = new Date(dailyEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.inspection_date) <= end);
    }

    // Sort logic
    if (dailySort === 'date_desc') {
      result.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
    } else if (dailySort === 'date_asc') {
      result.sort((a, b) => new Date(a.inspection_date) - new Date(b.inspection_date));
    } else if (dailySort === 'defects_desc') {
      result.sort((a, b) => (b.total_defects || 0) - (a.total_defects || 0));
    } else if (dailySort === 'defects_asc') {
      result.sort((a, b) => (a.total_defects || 0) - (b.total_defects || 0));
    }

    return result;
  }, [dailyInspections, dailySearch, dailyStartDate, dailyEndDate, dailySort]);

  // Pagination helper slices
  const paginatedStageList = useMemo(() => {
    const startIdx = (stagePage - 1) * stageLimit;
    return filteredStageList.slice(startIdx, startIdx + stageLimit);
  }, [filteredStageList, stagePage, stageLimit]);

  const paginatedProcessList = useMemo(() => {
    const startIdx = (stagePage - 1) * stageLimit; // Reuse stagePage and stageLimit for process audit
    return filteredProcessList.slice(startIdx, startIdx + stageLimit);
  }, [filteredProcessList, stagePage, stageLimit]);

  const paginatedInboundList = useMemo(() => {
    const startIdx = (inboundPage - 1) * inboundLimit;
    return filteredInboundList.slice(startIdx, startIdx + inboundLimit);
  }, [filteredInboundList, inboundPage, inboundLimit]);

  const paginatedDailyList = useMemo(() => {
    const startIdx = (dailyPage - 1) * dailyLimit;
    return filteredDailyList.slice(startIdx, startIdx + dailyLimit);
  }, [filteredDailyList, dailyPage, dailyLimit]);

  const totalStagePages = Math.ceil(filteredStageList.length / stageLimit) || 1;
  const totalProcessPages = Math.ceil(filteredProcessList.length / stageLimit) || 1;
  const totalInboundPages = Math.ceil(filteredInboundList.length / inboundLimit) || 1;
  const totalDailyPages = Math.ceil(filteredDailyList.length / dailyLimit) || 1;

  // Format Helpers
  const formatDisplayDateTime = (dtStr) => {
    if (!dtStr) return 'N/A';
    const date = new Date(dtStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDisplayDate = (dStr) => {
    if (!dStr) return 'N/A';
    const date = new Date(dStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Safe Image URL getter
  const getImageUrl = (path) => {
    if (!path) return '';
    if (typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;

    let cleanPath = path.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.slice(1);
    }
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = `static/${cleanPath}`;
    }

    const root = API_ROOT ? (API_ROOT.endsWith('/') ? API_ROOT : `${API_ROOT}/`) : '/';
    return `${root}${cleanPath}`;
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
  };

  // Reset all filters
  const handleResetFilters = () => {
    setStageSearch('');
    setStageTypeFilter('all');
    setStageStatusFilter('all');
    setStageStartDate('');
    setStageEndDate('');
    setStagePage(1);

    setInboundSearch('');
    setInboundStatusFilter('all');
    setInboundStartDate('');
    setInboundEndDate('');
    setInboundPage(1);

    setDailySearch('');
    setDailyStartDate('');
    setDailyEndDate('');
    setDailyPage(1);
  };


  // ----------------------------------------------------
  // EXPORT LOGIC: EXCEL FORMATTING HELPERS
  // ----------------------------------------------------
  const formatExcelHeader = (worksheet, title, columnsCount) => {
    // Merge cell A1 to columnsCount for Title
    worksheet.mergeCells(1, 1, 1, columnsCount);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '7B5233' } // Dark brown
    };
    worksheet.getRow(1).height = 40;

    // Merge A2 to columnsCount for Metadata
    worksheet.mergeCells(2, 1, 2, columnsCount);
    const subCell = worksheet.getCell(2, 1);
    subCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Hệ thống SmartFlow`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '4B301E' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FAF6F0' } // Beige background
    };
    worksheet.getRow(2).height = 24;

    // Empty row
    worksheet.getRow(3).height = 15;
  };

  const styleTableHeaderRow = (worksheet, rowNumber, columnsCount) => {
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
      // Zebra striping
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

  // ----------------------------------------------------
  // EXPORT FUNCTION 1: CURRENT LIST (STAGE OR DAILY)
  // ----------------------------------------------------
  const handleExportCurrentList = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      
      if (activeTab === 'stage') {
        const sheet = workbook.addWorksheet('Phiếu Kiểm Tra Công Đoạn');
        const cols = [
          { header: 'STT', key: 'stt', width: 8 },
          { header: 'Ngày Kiểm Tra', key: 'date', width: 22 },
          { header: 'Mã PO / Batch No', key: 'po', width: 22 },
          { header: 'Mã Sản Phẩm / Công Đoạn', key: 'sku', width: 26 },
          { header: 'Loại Công Đoạn', key: 'type', width: 20 },
          { header: 'QC Thực Hiện', key: 'inspector', width: 24 },
          { header: 'Kết Luận', key: 'conclusion', width: 14 },
          { header: 'Ghi Chú', key: 'notes', width: 35 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, 'BÁO CÁO PHIẾU KIỂM TRA CHẤT LƯỢNG CÔNG ĐOẠN', cols.length);

        // Add header names in row 4
        cols.forEach((col, idx) => {
          sheet.getCell(4, idx + 1).value = col.header;
        });
        styleTableHeaderRow(sheet, 4, cols.length);

        filteredStageList.forEach((item, index) => {
          const rowData = {
            stt: index + 1,
            date: formatDisplayDateTime(item.inspection_date),
            po: item.batch_no || 'N/A',
            sku: item.product_sku || 'N/A',
            type: getInspectionTypeLabel(item.inspection_type),
            inspector: item.inspector_name || 'N/A',
            conclusion: item.conclusion === 'pass' ? 'Đạt' : 'Lỗi',
            notes: item.notes || ''
          };
          const addedRow = sheet.addRow(rowData);
          // Highlight conclusion cells
          const conclusionCell = addedRow.getCell(7);
          if (item.conclusion === 'pass') {
            conclusionCell.font = { color: { argb: '059669' }, bold: true };
          } else {
            conclusionCell.font = { color: { argb: 'DC2626' }, bold: true };
          }
        });

        applyDefaultBorders(sheet, 5, filteredStageList.length + 4, cols.length);
        
        await triggerFileDownload(workbook, `Bao_Cao_Kiem_Tra_Cong_Doan_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else if (activeTab === 'input') {
        const sheet = workbook.addWorksheet('Kiểm Tra Đầu Vào');
        const cols = [
          { header: 'STT', key: 'stt', width: 8 },
          { header: 'Ngày Kiểm Tra', key: 'date', width: 22 },
          { header: 'Mã PO / Batch No', key: 'po', width: 22 },
          { header: 'Mã Sản Phẩm / Công Đoạn', key: 'sku', width: 26 },
          { header: 'QC Thực Hiện', key: 'inspector', width: 24 },
          { header: 'Kết Luận', key: 'conclusion', width: 14 },
          { header: 'Ghi Chú', key: 'notes', width: 35 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, 'BÁO CÁO KIỂM TRA ĐẦU VÀO (MẪU ĐẦU TIÊN)', cols.length);

        cols.forEach((col, idx) => {
          sheet.getCell(4, idx + 1).value = col.header;
        });
        styleTableHeaderRow(sheet, 4, cols.length);

        filteredInboundList.forEach((item, index) => {
          const rowData = {
            stt: index + 1,
            date: formatDisplayDateTime(item.inspection_date),
            po: item.batch_no || 'N/A',
            sku: item.product_sku || 'N/A',
            inspector: item.inspector_name || 'N/A',
            conclusion: item.conclusion === 'pass' ? 'Đạt' : 'Lỗi',
            notes: item.notes || ''
          };
          const addedRow = sheet.addRow(rowData);
          const conclusionCell = addedRow.getCell(6);
          if (item.conclusion === 'pass') {
            conclusionCell.font = { color: { argb: '059669' }, bold: true };
          } else {
            conclusionCell.font = { color: { argb: 'DC2626' }, bold: true };
          }
        });

        applyDefaultBorders(sheet, 5, filteredInboundList.length + 4, cols.length);
        
        await triggerFileDownload(workbook, `Bao_Cao_Kiem_Tra_Dau_Vao_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else if (activeTab === 'process') {
        const sheet = workbook.addWorksheet('Kiểm Tra Quy Trình');
        const cols = [
          { header: 'STT', key: 'stt', width: 8 },
          { header: 'Ngày Kiểm Tra', key: 'date', width: 22 },
          { header: 'Mã PO / Batch No', key: 'po', width: 22 },
          { header: 'Mã Sản Phẩm / Công Đoạn', key: 'sku', width: 26 },
          { header: 'QC Thực Hiện', key: 'inspector', width: 24 },
          { header: 'Kết Luận', key: 'conclusion', width: 14 },
          { header: 'Ghi Chú', key: 'notes', width: 35 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, 'BÁO CÁO PHIẾU KIỂM TRA QUY TRÌNH', cols.length);

        cols.forEach((col, idx) => {
          sheet.getCell(4, idx + 1).value = col.header;
        });
        styleTableHeaderRow(sheet, 4, cols.length);

        filteredProcessList.forEach((item, index) => {
          const rowData = {
            stt: index + 1,
            date: formatDisplayDateTime(item.inspection_date),
            po: item.batch_no || 'N/A',
            sku: item.product_sku || 'N/A',
            inspector: item.inspector_name || 'N/A',
            conclusion: item.conclusion === 'pass' ? 'Đạt' : 'Lỗi',
            notes: item.notes || ''
          };
          const addedRow = sheet.addRow(rowData);
          const conclusionCell = addedRow.getCell(6);
          if (item.conclusion === 'pass') {
            conclusionCell.font = { color: { argb: '059669' }, bold: true };
          } else {
            conclusionCell.font = { color: { argb: 'DC2626' }, bold: true };
          }
        });

        applyDefaultBorders(sheet, 5, filteredProcessList.length + 4, cols.length);
        
        await triggerFileDownload(workbook, `Bao_Cao_Kiem_Tra_Quy_Trinh_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        const sheet = workbook.addWorksheet('Ghi Nhận Lỗi Hàng Ngày');
        const cols = [
          { header: 'STT', key: 'stt', width: 8 },
          { header: 'Ngày Ghi Nhận', key: 'date', width: 18 },
          { header: 'Tên Công Đoạn', key: 'stage', width: 26 },
          { header: 'QC Thực Hiện', key: 'inspector', width: 24 },
          { header: 'Tổng SP Kiểm', key: 'total_products', width: 16 },
          { header: 'Tổng Số Lỗi', key: 'total_defects', width: 16 },
          { header: 'Tỉ Lệ Lỗi (%)', key: 'defect_rate', width: 16 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, 'BÁO CÁO GHI NHẬN LỖI HÀNG NGÀY', cols.length);

        cols.forEach((col, idx) => {
          sheet.getCell(4, idx + 1).value = col.header;
        });
        styleTableHeaderRow(sheet, 4, cols.length);

        filteredDailyList.forEach((item, index) => {
          const rowData = {
            stt: index + 1,
            date: formatDisplayDate(item.inspection_date),
            stage: item.stage_name || 'N/A',
            inspector: item.inspector_name || 'N/A',
            total_products: item.total_products || 0,
            total_defects: item.total_defects || 0,
            defect_rate: `${(item.defect_rate || 0).toFixed(2)}%`
          };
          const addedRow = sheet.addRow(rowData);
          // Highlight defect rate
          const rateCell = addedRow.getCell(7);
          rateCell.font = { bold: true };
          if (item.total_defects > 0) {
            rateCell.font = { color: { argb: 'D97706' }, bold: true };
          } else {
            rateCell.font = { color: { argb: '059669' }, bold: true };
          }
        });

        applyDefaultBorders(sheet, 5, filteredDailyList.length + 4, cols.length);

        await triggerFileDownload(workbook, `Bao_Cao_Ghi_Nhan_Loi_Hang_Ngay_${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      setShowExportModal(false);
    } catch (err) {
      console.error("Lỗi khi xuất excel:", err);
      alert("Đã xảy ra lỗi khi tạo tệp Excel: " + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  // ----------------------------------------------------
  // EXPORT FUNCTION 2: DETAILED PO REPORT (MULTI-SHEET)
  // ----------------------------------------------------
  const handleExportDetailedPO = async () => {
    if (!exportPoCode) return;
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Fetch all stage inspections for this PO
      const poInspections = stageInspections.filter(i => i.batch_no === exportPoCode);

      // --- SHEET 1: GENERAL OVERVIEW OF PO ---
      const sheetOverview = workbook.addWorksheet('Tổng Quan Lệnh SX');
      const colsOverview = [
        { header: 'STT', width: 8 },
        { header: 'Ngày Kiểm Tra', width: 22 },
        { header: 'Mã Sản Phẩm / Công Đoạn', width: 26 },
        { header: 'Loại Công Đoạn', width: 20 },
        { header: 'QC Thực Hiện', width: 24 },
        { header: 'Kết Luận Chung', width: 15 }
      ];
      formatExcelHeader(sheetOverview, `BÁO CÁO CHẤT LƯỢNG CHI TIẾT PO: ${exportPoCode}`, colsOverview.length);
      
      // Style column headers
      colsOverview.forEach((col, idx) => {
        sheetOverview.getCell(4, idx + 1).value = col.header;
        sheetOverview.getColumn(idx + 1).width = col.width;
      });
      styleTableHeaderRow(sheetOverview, 4, colsOverview.length);

      poInspections.forEach((item, index) => {
        const addedRow = sheetOverview.addRow([
          index + 1,
          formatDisplayDateTime(item.inspection_date),
          item.product_sku || 'N/A',
          getInspectionTypeLabel(item.inspection_type),
          item.inspector_name || 'N/A',
          item.conclusion === 'pass' ? 'Đạt' : 'Lỗi'
        ]);
        const conclusionCell = addedRow.getCell(6);
        if (item.conclusion === 'pass') {
          conclusionCell.font = { color: { argb: '059669' }, bold: true };
        } else {
          conclusionCell.font = { color: { argb: 'DC2626' }, bold: true };
        }
      });
      applyDefaultBorders(sheetOverview, 5, poInspections.length + 4, colsOverview.length);

      // --- SHEET 2: DETAILED ADHESION (BÁM DÍNH) ---
      const adhesionInspections = poInspections.filter(i => i.inspection_type === 'bam-dinh');
      if (adhesionInspections.length > 0) {
        const sheetAdh = workbook.addWorksheet('Chi Tiết Bám Dính');
        const colsAdh = [
          { header: 'QC Thực Hiện', width: 22 },
          { header: 'Ngày Đánh Giá', width: 22 },
          { header: 'Tên Linh Kiện / Phụ Kiện', width: 35 },
          { header: 'Đánh Giá Chi Tiết', width: 16 }
        ];
        formatExcelHeader(sheetAdh, `KẾT QUẢ ĐÁNH GIÁ BÁM DÍNH CÁC LINH KIỆN - PO: ${exportPoCode}`, colsAdh.length);
        colsAdh.forEach((col, idx) => {
          sheetAdh.getCell(4, idx + 1).value = col.header;
          sheetAdh.getColumn(idx + 1).width = col.width;
        });
        styleTableHeaderRow(sheetAdh, 4, colsAdh.length);

        let rowCount = 5;
        adhesionInspections.forEach(item => {
          let parsed = {};
          try { parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {}); } catch(e){}
          if (Array.isArray(parsed.detailsList)) {
            parsed.detailsList.forEach(det => {
              const addedRow = sheetAdh.addRow([
                item.inspector_name || 'N/A',
                formatDisplayDateTime(item.inspection_date),
                det.name || 'N/A',
                det.conclusion === 'pass' ? 'Đạt' : 'Lỗi'
              ]);
              const cellVal = addedRow.getCell(4);
              if (det.conclusion === 'pass') {
                cellVal.font = { color: { argb: '059669' }, bold: true };
              } else {
                cellVal.font = { color: { argb: 'DC2626' }, bold: true };
              }
              rowCount++;
            });
          }
        });
        applyDefaultBorders(sheetAdh, 5, rowCount - 1, colsAdh.length);
      }

      // --- SHEET 3: MOISTURE & DIMENSIONS (ĐỘ ẨM & KÍCH THƯỚC) ---
      const moistureInspections = poInspections.filter(i => i.inspection_type === 'do-am');
      if (moistureInspections.length > 0) {
        const sheetMoist = workbook.addWorksheet('Độ Ẩm & Kích Thước Gỗ');
        const colsMoist = [
          { header: 'QC Thực Hiện', width: 22 },
          { header: 'Ngày Kiểm', width: 22 },
          { header: 'Sản Phẩm', width: 20 },
          { header: 'Mẫu Số', width: 10 },
          { header: 'Các Lần Đo Độ Ẩm (%)', width: 28 },
          { header: 'Kích Thước (Dày x Rộng x Dài mm)', width: 32 },
          { header: 'Kết Quả Mẫu', width: 16 }
        ];
        formatExcelHeader(sheetMoist, `GHI NHẬN KÍCH THƯỚC & ĐỘ ẨM MẪU GỖ - PO: ${exportPoCode}`, colsMoist.length);
        colsMoist.forEach((col, idx) => {
          sheetMoist.getCell(4, idx + 1).value = col.header;
          sheetMoist.getColumn(idx + 1).width = col.width;
        });
        styleTableHeaderRow(sheetMoist, 4, colsMoist.length);

        let rowCount = 5;
        moistureInspections.forEach(item => {
          let parsed = {};
          try { parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {}); } catch(e){}
          if (Array.isArray(parsed.samples)) {
            parsed.samples.forEach(s => {
              const moistVals = s.moisture?.values ? s.moisture.values.map(v => `${v}%`).join(', ') : 'Chưa đo';
              const sizeVal = s.size?.thickness ? `${s.size.thickness} x ${s.size.width} x ${s.size.length} mm` : 'Chưa đo';
              const addedRow = sheetMoist.addRow([
                item.inspector_name || 'N/A',
                formatDisplayDateTime(item.inspection_date),
                item.product_sku || 'N/A',
                s.stt,
                moistVals,
                sizeVal,
                s.result === 'pass' ? 'Đạt' : s.result === 'fail' ? 'Lỗi' : 'Chưa đo'
              ]);
              const resCell = addedRow.getCell(7);
              if (s.result === 'pass') {
                resCell.font = { color: { argb: '059669' }, bold: true };
              } else if (s.result === 'fail') {
                resCell.font = { color: { argb: 'DC2626' }, bold: true };
              }
              rowCount++;
            });
          }
        });
        applyDefaultBorders(sheetMoist, 5, rowCount - 1, colsMoist.length);
      }

      // --- SHEET 4: DETAILED PROCESS AUDIT (KIỂM TRA QUY TRÌNH) ---
      const processInspections = poInspections.filter(i => i.inspection_type === 'quy-trinh');
      if (processInspections.length > 0) {
        const sheetProc = workbook.addWorksheet('Chi Tiết Quy Trình');
        const colsProc = [
          { header: 'QC Thực Hiện', width: 22 },
          { header: 'Ngày Đánh Giá', width: 22 },
          { header: 'Bước Kiểm Tra', width: 30 },
          { header: 'Giá Trị Đo', width: 16 },
          { header: 'Kết Quả', width: 16 }
        ];
        formatExcelHeader(sheetProc, `KẾT QUẢ ĐÁNH GIÁ QUY TRÌNH SẢN XUẤT - PO: ${exportPoCode}`, colsProc.length);
        colsProc.forEach((col, idx) => {
          sheetProc.getCell(4, idx + 1).value = col.header;
          sheetProc.getColumn(idx + 1).width = col.width;
        });
        styleTableHeaderRow(sheetProc, 4, colsProc.length);

        let rowCount = 5;
        processInspections.forEach(item => {
          let parsed = {};
          try { parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {}); } catch(e){}
          if (parsed.steps) {
            Object.entries(parsed.steps).forEach(([stepKey, val]) => {
              const addedRow = sheetProc.addRow([
                item.inspector_name || 'N/A',
                formatDisplayDateTime(item.inspection_date),
                stepKey.split('_').slice(1, -1).join(' ') || stepKey,
                val.value || 'N/A',
                val.result === 'pass' ? 'Đạt' : 'Lỗi'
              ]);
              const resCell = addedRow.getCell(5);
              if (val.result === 'pass') {
                resCell.font = { color: { argb: '059669' }, bold: true };
              } else {
                resCell.font = { color: { argb: 'DC2626' }, bold: true };
              }
              rowCount++;
            });
          }
        });
        applyDefaultBorders(sheetProc, 5, rowCount - 1, colsProc.length);
      }

      // --- SHEET 5: FIRST ARTICLE INSPECTION (MẪU ĐẦU TIÊN) ---
      const firstArticleInspections = poInspections.filter(i => i.inspection_type === 'mau-dau-tien');
      if (firstArticleInspections.length > 0) {
        const sheetFA = workbook.addWorksheet('Mẫu Đầu Tiên');
        const colsFA = [
          { header: 'QC Thực Hiện', width: 22 },
          { header: 'Ngày Đánh Giá', width: 22 },
          { header: 'Công Đoạn', width: 20 },
          { header: 'Máy', width: 20 },
          { header: 'SL Sản Xuất', width: 14 },
          { header: 'SL Kiểm Mẫu', width: 14 },
          { header: 'SL Lỗi', width: 14 },
          { header: 'Kết Luận', width: 14 }
        ];
        formatExcelHeader(sheetFA, `KẾT QUẢ KIỂM MẪU ĐẦU TIÊN - PO: ${exportPoCode}`, colsFA.length);
        colsFA.forEach((col, idx) => {
          sheetFA.getCell(4, idx + 1).value = col.header;
          sheetFA.getColumn(idx + 1).width = col.width;
        });
        styleTableHeaderRow(sheetFA, 4, colsFA.length);

        let rowCount = 5;
        firstArticleInspections.forEach(item => {
          let parsed = {};
          try { parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {}); } catch(e){}
          const addedRow = sheetFA.addRow([
            item.inspector_name || 'N/A',
            formatDisplayDateTime(item.inspection_date),
            parsed.stage || 'N/A',
            parsed.machine_name ? `${parsed.machine_name} (${parsed.machine_code})` : 'N/A',
            parsed.quantity_produced || 0,
            parsed.quantity_sampled || 0,
            parsed.quantity_rejected || 0,
            item.conclusion === 'pass' ? 'Đạt' : 'Lỗi'
          ]);
          const resCell = addedRow.getCell(8);
          if (item.conclusion === 'pass') {
            resCell.font = { color: { argb: '059669' }, bold: true };
          } else {
            resCell.font = { color: { argb: 'DC2626' }, bold: true };
          }
          rowCount++;
        });
        applyDefaultBorders(sheetFA, 5, rowCount - 1, colsFA.length);
      }

      await triggerFileDownload(workbook, `Bao_Cao_Chi_Tiet_PO_${exportPoCode.replace(/\//g, '_')}.xlsx`);
      setShowExportModal(false);
    } catch (err) {
      console.error("Lỗi khi xuất excel PO:", err);
      alert("Đã xảy ra lỗi khi tạo tệp Excel PO: " + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  // ----------------------------------------------------
  // EXPORT FUNCTION 3: QUALITY SUMMARY REPORT (DATE RANGE)
  // ----------------------------------------------------
  const handleExportQualitySummary = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Tỉ lệ đạt lỗi công đoạn');
      
      // Calculate start and end date text
      const dateText = (stageStartDate || stageEndDate)
        ? `Từ ngày ${stageStartDate || 'đầu'} đến ngày ${stageEndDate || 'nay'}`
        : 'Tất cả thời gian';

      // --- SHEET 1: PASS/FAIL RATE BY INSPECTION TYPE ---
      const cols = [
        { header: 'STT', width: 8 },
        { header: 'Tên Công Đoạn', width: 30 },
        { header: 'Tổng Lượt Kiểm Tra', width: 22 },
        { header: 'Số Lượt Đạt (Pass)', width: 22 },
        { header: 'Số Lượt Lỗi (Fail)', width: 22 },
        { header: 'Tỉ Lệ Đạt (%)', width: 20 }
      ];
      formatExcelHeader(sheet, `BÁO CÁO PHÂN TÍCH TỈ LỆ ĐẠT CÔNG ĐOẠN\n(${dateText.toUpperCase()})`, cols.length);
      
      cols.forEach((col, idx) => {
        sheet.getCell(4, idx + 1).value = col.header;
        sheet.getColumn(idx + 1).width = col.width;
      });
      styleTableHeaderRow(sheet, 4, cols.length);

      // Aggregate data by type
      const aggData = {};
      const inspectionTypes = ['bam-dinh', 'sau-dong-goi', 'phu-kien', 'quy-trinh', 'do-am'];
      inspectionTypes.forEach(t => {
        aggData[t] = { total: 0, pass: 0, fail: 0 };
      });

      filteredStageList.forEach(item => {
        const type = item.inspection_type;
        if (aggData[type]) {
          aggData[type].total++;
          if (item.conclusion === 'pass') {
            aggData[type].pass++;
          } else {
            aggData[type].fail++;
          }
        }
      });

      inspectionTypes.forEach((type, index) => {
        const stats = aggData[type];
        const passRate = stats.total > 0 ? (stats.pass / stats.total * 100) : 100;
        
        const addedRow = sheet.addRow([
          index + 1,
          getInspectionTypeLabel(type),
          stats.total,
          stats.pass,
          stats.fail,
          `${passRate.toFixed(2)}%`
        ]);

        const rateCell = addedRow.getCell(6);
        rateCell.font = { bold: true };
        if (passRate >= 95) {
          rateCell.font = { color: { argb: '059669' }, bold: true };
        } else if (passRate >= 80) {
          rateCell.font = { color: { argb: 'D97706' }, bold: true };
        } else {
          rateCell.font = { color: { argb: 'DC2626' }, bold: true };
        }
      });

      applyDefaultBorders(sheet, 5, inspectionTypes.length + 4, cols.length);

      // --- SHEET 2: TOP DEFECTS ---
      const sheetDefects = workbook.addWorksheet('Top Lỗi Hàng Ngày');
      const colsDef = [
        { header: 'Hạng', width: 8 },
        { header: 'Mã Lỗi (Defect ID)', width: 22 },
        { header: 'Số Lần Ghi Nhận Lỗi', width: 26 }
      ];
      formatExcelHeader(sheetDefects, `BÁO CÁO THỐNG KÊ TẦN SUẤT LỖI GHI NHẬN HÀNG NGÀY\n(${dateText.toUpperCase()})`, colsDef.length);

      colsDef.forEach((col, idx) => {
        sheetDefects.getCell(4, idx + 1).value = col.header;
        sheetDefects.getColumn(idx + 1).width = col.width;
      });
      styleTableHeaderRow(sheetDefects, 4, colsDef.length);

      // Aggregate defect frequency from filteredDailyList
      const defectFreq = {};
      filteredDailyList.forEach(item => {
        if (Array.isArray(item.defects)) {
          item.defects.forEach(def => {
            const defId = def.defect_id;
            defectFreq[defId] = (defectFreq[defId] || 0) + (def.quantity || 0);
          });
        }
      });

      const sortedDefects = Object.entries(defectFreq)
        .map(([id, qty]) => ({ id, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 15);

      sortedDefects.forEach((item, index) => {
        sheetDefects.addRow([
          index + 1,
          `Mã lỗi #${item.id}`,
          item.qty
        ]);
      });

      applyDefaultBorders(sheetDefects, 5, sortedDefects.length + 4, colsDef.length);

      await triggerFileDownload(workbook, `Bao_Cao_Tong_Hop_Chat_Luong_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportModal(false);
    } catch (err) {
      console.error("Lỗi khi xuất excel tổng hợp:", err);
      alert("Đã xảy ra lỗi khi tạo tệp Excel tổng hợp: " + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="quality-records-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .inspection-tabs {
          display: flex;
          border-bottom: 2px solid #EADCC9;
          margin-bottom: 16px;
          gap: 8px;
        }
        .inspection-tab-item {
          padding: 10px 24px;
          font-weight: 700;
          font-size: 0.95rem;
          color: #7B5233;
          border: none;
          background: transparent;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .inspection-tab-item.active {
          color: #2D1A12;
        }
        .inspection-tab-item.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background-color: #7B5233;
          border-radius: 3px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .status-badge.pass {
          background-color: #ECFDF5;
          color: #10B981;
          border: 1px solid #A7F3D0;
        }
        .status-badge.fail {
          background-color: #FEF2F2;
          color: #EF4444;
          border: 1px solid #FCA5A5;
        }
        .grid-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px;
          margin-top: 8px;
        }
        .gallery-thumb {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #EADCC9;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .gallery-thumb:hover {
          transform: scale(1.05);
          border-color: #7B5233;
        }
        .detail-grid-info {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (min-width: 768px) {
          .detail-grid-info {
            grid-template-columns: 1fr 1fr;
          }
        }
        .detail-row-item {
          display: flex;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px dashed #EADCC9;
          font-size: 0.9rem;
        }
        .detail-row-item span:first-child {
          color: #8D6E63;
          font-weight: 600;
        }
        .detail-row-item span:last-child {
          color: #2D1A12;
          font-weight: 700;
        }
        .detail-sub-section {
          background: #FAF6F0;
          border: 1px solid #EADCC9;
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
        }
        .detail-sub-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #7B5233;
          margin: 0 0 12px 0;
          border-left: 3px solid #7B5233;
          padding-left: 8px;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-container {
          background-color: white;
          border-radius: 20px;
          width: 92%;
          max-width: 700px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          padding: 24px;
        }
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

      {/* Tabs Selection */}
      <div className="inspection-tabs">
        <button 
          className={`inspection-tab-item ${activeTab === 'stage' ? 'active' : ''}`}
          onClick={() => { setActiveTab('stage'); handleResetFilters(); }}
        >
          Phiếu kiểm tra công đoạn
        </button>
        <button 
          className={`inspection-tab-item ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => { setActiveTab('input'); handleResetFilters(); }}
        >
          Kiểm tra đầu vào
        </button>
        <button 
          className={`inspection-tab-item ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => { setActiveTab('daily'); handleResetFilters(); }}
        >
          Ghi nhận lỗi hàng ngày
        </button>
        <button 
          className={`inspection-tab-item ${activeTab === 'process' ? 'active' : ''}`}
          onClick={() => { setActiveTab('process'); handleResetFilters(); }}
        >
          Kiểm tra quy trình
        </button>
      </div>

      {/* TOOLBAR: Search & Filters */}
      <PageToolbar
        searchValue={
          activeTab === 'stage' || activeTab === 'process'
            ? stageSearch
            : activeTab === 'input'
              ? inboundSearch
              : dailySearch
        }
        onSearchChange={(val) => {
          if (activeTab === 'stage' || activeTab === 'process') {
            setStageSearch(val);
            setStagePage(1);
          } else if (activeTab === 'input') {
            setInboundSearch(val);
            setInboundPage(1);
          } else {
            setDailySearch(val);
            setDailyPage(1);
          }
        }}
        searchPlaceholder={
          activeTab === 'stage' || activeTab === 'process'
            ? "Tìm PO, sản phẩm, QC..." 
            : activeTab === 'input'
              ? "Tìm chi tiết, cont, QC..."
              : "Tìm công đoạn, QC..."
        }
        showSort={true}
        sortOptions={
          activeTab === 'stage' || activeTab === 'process'
            ? [
                { value: 'date_desc', label: 'Ngày: Mới nhất' },
                { value: 'date_asc', label: 'Ngày: Cũ nhất' },
                { value: 'po_asc', label: 'Mã PO: A-Z' },
                { value: 'po_desc', label: 'Mã PO: Z-A' }
              ]
            : activeTab === 'input'
              ? [
                  { value: 'date_desc', label: 'Ngày: Mới nhất' },
                  { value: 'date_asc', label: 'Ngày: Cũ nhất' },
                  { value: 'part_asc', label: 'Tên chi tiết: A-Z' },
                  { value: 'part_desc', label: 'Tên chi tiết: Z-A' }
                ]
              : [
                  { value: 'date_desc', label: 'Ngày: Mới nhất' },
                  { value: 'date_asc', label: 'Ngày: Cũ nhất' },
                  { value: 'defects_desc', label: 'Số lỗi: Nhiều nhất' },
                  { value: 'defects_asc', label: 'Số lỗi: Ít nhất' }
                ]
        }
        sortValue={
          activeTab === 'stage' || activeTab === 'process'
            ? stageSort 
            : activeTab === 'input'
              ? inboundSort
              : dailySort
        }
        onSortChange={(val) => {
          if (activeTab === 'stage' || activeTab === 'process') {
            setStageSort(val);
            setStagePage(1);
          } else if (activeTab === 'input') {
            setInboundSort(val);
            setInboundPage(1);
          } else {
            setDailySort(val);
            setDailyPage(1);
          }
        }}
        showFilter={true}
        isFilterOpen={isFilterBarOpen}
        onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
        activeFiltersCount={
          (activeTab === 'stage' && stageTypeFilter !== 'all' ? 1 : 0) +
          ((activeTab === 'stage' || activeTab === 'process' || activeTab === 'input') &&
          (activeTab === 'input' ? inboundStatusFilter : stageStatusFilter) !== 'all' ? 1 : 0) +
          (
            (activeTab === 'stage' || activeTab === 'process' ? stageStartDate : activeTab === 'input' ? inboundStartDate : dailyStartDate) ? 1 : 0
          ) +
          (
            (activeTab === 'stage' || activeTab === 'process' ? stageEndDate : activeTab === 'input' ? inboundEndDate : dailyEndDate) ? 1 : 0
          )
        }
        onExport={() => setShowExportModal(true)}
        hasWritePermission={true}
      />

      {/* INLINE EXPANDABLE FILTER BAR */}
      {isFilterBarOpen && (
        <div className="filter-inline-bar">
          {activeTab === 'stage' && (
            <div className="filter-field-group">
              <label className="filter-field-label">Loại công đoạn</label>
              <select
                value={stageTypeFilter}
                onChange={(e) => { setStageTypeFilter(e.target.value); setStagePage(1); }}
              >
                <option value="all">Tất cả</option>
                <option value="bam-dinh">Bám dính</option>
                <option value="sau-dong-goi">Sau đóng gói</option>
                <option value="phu-kien">Phụ kiện</option>
              </select>
            </div>
          )}

          {(activeTab === 'stage' || activeTab === 'process' || activeTab === 'input') && (
            <div className="filter-field-group">
              <label className="filter-field-label">Kết luận</label>
              <select
                value={activeTab === 'input' ? inboundStatusFilter : stageStatusFilter}
                onChange={(e) => { 
                  if (activeTab === 'input') {
                    setInboundStatusFilter(e.target.value);
                    setInboundPage(1);
                  } else {
                    setStageStatusFilter(e.target.value);
                    setStagePage(1);
                  }
                }}
              >
                <option value="all">Tất cả</option>
                <option value="pass">Đạt (Pass)</option>
                <option value="fail">Lỗi (Fail)</option>
              </select>
            </div>
          )}

          <div className="filter-field-group">
            <label className="filter-field-label">Từ ngày</label>
            <input 
              type="date"
              value={
                activeTab === 'stage' || activeTab === 'process'
                  ? stageStartDate 
                  : activeTab === 'input'
                    ? inboundStartDate
                    : dailyStartDate
              }
              onChange={(e) => {
                if (activeTab === 'stage' || activeTab === 'process') {
                  setStageStartDate(e.target.value);
                  setStagePage(1);
                } else if (activeTab === 'input') {
                  setInboundStartDate(e.target.value);
                  setInboundPage(1);
                } else {
                  setDailyStartDate(e.target.value);
                  setDailyPage(1);
                }
              }}
              className="filter-dropdown-input"
            />
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Đến ngày</label>
            <input 
              type="date"
              value={
                activeTab === 'stage' || activeTab === 'process'
                  ? stageEndDate 
                  : activeTab === 'input'
                    ? inboundEndDate
                    : dailyEndDate
              }
              onChange={(e) => {
                if (activeTab === 'stage' || activeTab === 'process') {
                  setStageEndDate(e.target.value);
                  setStagePage(1);
                } else if (activeTab === 'input') {
                  setInboundEndDate(e.target.value);
                  setInboundPage(1);
                } else {
                  setDailyEndDate(e.target.value);
                  setDailyPage(1);
                }
              }}
              className="filter-dropdown-input"
            />
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Số dòng hiển thị</label>
            <select 
              value={
                activeTab === 'stage' || activeTab === 'process'
                  ? stageLimit 
                  : activeTab === 'input'
                    ? inboundLimit
                    : dailyLimit
              } 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (activeTab === 'stage' || activeTab === 'process') {
                  setStageLimit(val);
                  setStagePage(1);
                } else if (activeTab === 'input') {
                  setInboundLimit(val);
                  setInboundPage(1);
                } else {
                  setDailyLimit(val);
                  setDailyPage(1);
                }
              }}
            >
              <option value={15}>15 dòng</option>
              <option value={30}>30 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={handleResetFilters}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #EADCC9',
                backgroundColor: '#fff',
                color: '#7B5233',
                fontSize: '0.8rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} /> Xóa lọc
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className="spinner"></div>
                <span>Đang tải dữ liệu kiểm tra...</span>
              </div>
            </div>
          ) : activeTab === 'stage' ? (
            // TAB 1: KIỂM TRA CÔNG ĐOẠN TABLE
            paginatedStageList.length === 0 ? (
              <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                  <span>Không tìm thấy phiếu kiểm tra công đoạn nào phù hợp.</span>
                </div>
              </div>
            ) : (
              <>
                <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '150px' }}>Ngày kiểm tra</th>
                        <th>Mã PO</th>
                        <th>Mã sản phẩm / Công đoạn</th>
                        <th>Loại công đoạn</th>
                        <th>Người kiểm QC</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Kết luận</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStageList.map((item, idx) => {
                        const stt = (stagePage - 1) * stageLimit + idx + 1;
                        const isPass = item.conclusion === 'pass';
                        return (
                          <tr key={item.id} onClick={() => setSelectedInspection(item)} style={{ cursor: 'pointer' }}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                            <td style={{ fontWeight: '600' }}>{formatDisplayDateTime(item.inspection_date)}</td>
                            <td style={{ color: '#7B5233', fontWeight: 'bold' }}>{item.batch_no || 'N/A'}</td>
                            <td style={{ fontWeight: '700' }}>{item.product_sku || 'N/A'}</td>
                            <td style={{ fontWeight: '500' }}>{getInspectionTypeLabel(item.inspection_type)}</td>
                            <td>{item.inspector_name || 'N/A'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                                {isPass ? 'Đạt' : 'Lỗi'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="action-btn"
                                onClick={() => setSelectedInspection(item)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7B5233' }}
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card Grid */}
                <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                  {paginatedStageList.map((item, idx) => {
                    const stt = (stagePage - 1) * stageLimit + idx + 1;
                    const isPass = item.conclusion === 'pass';
                    return (
                      <div 
                        key={item.id} 
                        className="mgmt-card animate-card-entrance" 
                        style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #EADCC9', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
                        onClick={() => setSelectedInspection(item)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</span>
                          <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                            {isPass ? 'ĐẠT' : 'LỖI'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                          PO: {item.batch_no || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#2D1A12', marginBottom: '4px' }}>
                          Sản phẩm: <strong>{item.product_sku || 'N/A'}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                          <span>QC: {item.inspector_name || 'N/A'}</span>
                          <span>{formatDisplayDate(item.inspection_date)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #EADCC9', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{paginatedStageList.length}</b> trên <b>{filteredStageList.length}</b> phiếu kiểm tra
                  </div>
                  {totalStagePages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button 
                        className="page-btn" 
                        onClick={() => setStagePage(prev => Math.max(prev - 1, 1))} 
                        disabled={stagePage === 1}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: stagePage === 1 ? 'not-allowed' : 'pointer', opacity: stagePage === 1 ? 0.5 : 1 }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, stagePage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalStagePages, start + maxVisible - 1);
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }
                        for (let p = start; p <= end; p++) {
                          pages.push(
                            <button
                              key={p}
                              onClick={() => setStagePage(p)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                backgroundColor: stagePage === p ? '#7B5233' : '#FAF6F0',
                                color: stagePage === p ? '#fff' : '#7B5233',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              {p}
                            </button>
                          );
                        }
                        return pages;
                      })()}
                      <button 
                        className="page-btn" 
                        onClick={() => setStagePage(prev => Math.min(prev + 1, totalStagePages))} 
                        disabled={stagePage === totalStagePages}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: stagePage === totalStagePages ? 'not-allowed' : 'pointer', opacity: stagePage === totalStagePages ? 0.5 : 1 }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )
          ) : activeTab === 'stage' ? (
            // TAB 1: KIỂM TRA CÔNG ĐOẠN TABLE
            paginatedStageList.length === 0 ? (
              <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                  <span>Không tìm thấy phiếu kiểm tra công đoạn nào phù hợp.</span>
                </div>
              </div>
            ) : (
              <>
                <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '150px' }}>Ngày kiểm tra</th>
                        <th>Mã PO</th>
                        <th>Mã sản phẩm / Công đoạn</th>
                        <th>Loại công đoạn</th>
                        <th>Người kiểm QC</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Kết luận</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStageList.map((item, idx) => {
                        const stt = (stagePage - 1) * stageLimit + idx + 1;
                        const isPass = item.conclusion === 'pass';
                        return (
                          <tr key={item.id} onClick={() => setSelectedInspection(item)} style={{ cursor: 'pointer' }}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                            <td style={{ fontWeight: '600' }}>{formatDisplayDateTime(item.inspection_date)}</td>
                            <td style={{ color: '#7B5233', fontWeight: 'bold' }}>{item.batch_no || 'N/A'}</td>
                            <td style={{ fontWeight: '700' }}>{item.product_sku || 'N/A'}</td>
                            <td style={{ fontWeight: '500' }}>{getInspectionTypeLabel(item.inspection_type)}</td>
                            <td>{item.inspector_name || 'N/A'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                                {isPass ? 'Đạt' : 'Lỗi'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="action-btn"
                                onClick={() => setSelectedInspection(item)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7B5233' }}
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card Grid */}
                <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                  {paginatedStageList.map((item, idx) => {
                    const stt = (stagePage - 1) * stageLimit + idx + 1;
                    const isPass = item.conclusion === 'pass';
                    return (
                      <div 
                        key={item.id} 
                        className="mgmt-card animate-card-entrance" 
                        style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #EADCC9', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
                        onClick={() => setSelectedInspection(item)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</span>
                          <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                            {isPass ? 'ĐẠT' : 'LỖI'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                          PO: {item.batch_no || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#2D1A12', marginBottom: '4px' }}>
                          Sản phẩm: <strong>{item.product_sku || 'N/A'}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                          <span>QC: {item.inspector_name || 'N/A'}</span>
                          <span>{formatDisplayDate(item.inspection_date)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #EADCC9', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{paginatedStageList.length}</b> trên <b>{filteredStageList.length}</b> phiếu kiểm tra
                  </div>
                  {totalStagePages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button 
                        className="page-btn" 
                        onClick={() => setStagePage(prev => Math.max(prev - 1, 1))} 
                        disabled={stagePage === 1}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: stagePage === 1 ? 'not-allowed' : 'pointer', opacity: stagePage === 1 ? 0.5 : 1 }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, stagePage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalStagePages, start + maxVisible - 1);
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }
                        for (let p = start; p <= end; p++) {
                          pages.push(
                            <button
                              key={p}
                              onClick={() => setStagePage(p)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                backgroundColor: stagePage === p ? '#7B5233' : '#FAF6F0',
                                color: stagePage === p ? '#fff' : '#7B5233',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              {p}
                            </button>
                          );
                        }
                        return pages;
                      })()}
                      <button 
                        className="page-btn" 
                        onClick={() => setStagePage(prev => Math.min(prev + 1, totalStagePages))} 
                        disabled={stagePage === totalStagePages}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: stagePage === totalStagePages ? 'not-allowed' : 'pointer', opacity: stagePage === totalStagePages ? 0.5 : 1 }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )
          ) : activeTab === 'input' ? (
            // TAB 2: KIỂM TRA ĐẦU VÀO TABLE (Mẫu đầu tiên - first article)
            paginatedInboundList.length === 0 ? (
              <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                  <span>Không tìm thấy phiếu kiểm tra đầu vào (mẫu đầu tiên) nào phù hợp.</span>
                </div>
              </div>
            ) : (
              <>
                <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '150px' }}>Ngày kiểm tra</th>
                        <th>Mã PO</th>
                        <th>Mã sản phẩm / Công đoạn</th>
                        <th>Người kiểm QC</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Kết luận</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInboundList.map((item, idx) => {
                        const stt = (inboundPage - 1) * inboundLimit + idx + 1;
                        const isPass = item.conclusion === 'pass';
                        return (
                          <tr key={item.id} onClick={() => setSelectedInspection(item)} style={{ cursor: 'pointer' }}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                            <td style={{ fontWeight: '600' }}>{formatDisplayDateTime(item.inspection_date)}</td>
                            <td style={{ color: '#7B5233', fontWeight: 'bold' }}>{item.batch_no || 'N/A'}</td>
                            <td style={{ fontWeight: '700' }}>{item.product_sku || 'N/A'}</td>
                            <td>{item.inspector_name || 'N/A'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                                {isPass ? 'Đạt' : 'Lỗi'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="action-btn"
                                onClick={() => setSelectedInspection(item)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7B5233' }}
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card Grid */}
                <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                  {paginatedInboundList.map((item, idx) => {
                    const stt = (inboundPage - 1) * inboundLimit + idx + 1;
                    const isPass = item.conclusion === 'pass';
                    return (
                      <div 
                        key={item.id} 
                        className="mgmt-card animate-card-entrance" 
                        style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #EADCC9', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
                        onClick={() => setSelectedInspection(item)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</span>
                          <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                            {isPass ? 'ĐẠT' : 'LỖI'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                          PO: {item.batch_no || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#2D1A12', marginBottom: '4px' }}>
                          Sản phẩm: <strong>{item.product_sku || 'N/A'}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                          <span>QC: {item.inspector_name || 'N/A'}</span>
                          <span>{formatDisplayDate(item.inspection_date)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #EADCC9', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{paginatedInboundList.length}</b> trên <b>{filteredInboundList.length}</b> phiếu kiểm tra
                  </div>
                  {totalInboundPages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button 
                        className="page-btn" 
                        onClick={() => setInboundPage(prev => Math.max(prev - 1, 1))} 
                        disabled={inboundPage === 1}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: inboundPage === 1 ? 'not-allowed' : 'pointer', opacity: inboundPage === 1 ? 0.5 : 1 }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, inboundPage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalInboundPages, start + maxVisible - 1);
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }
                        for (let p = start; p <= end; p++) {
                          pages.push(
                            <button
                              key={p}
                              onClick={() => setInboundPage(p)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                backgroundColor: inboundPage === p ? '#7B5233' : '#FAF6F0',
                                color: inboundPage === p ? '#fff' : '#7B5233',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              {p}
                            </button>
                          );
                        }
                        return pages;
                      })()}
                      <button 
                        className="page-btn" 
                        onClick={() => setInboundPage(prev => Math.min(prev + 1, totalInboundPages))} 
                        disabled={inboundPage === totalInboundPages}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: inboundPage === totalInboundPages ? 'not-allowed' : 'pointer', opacity: inboundPage === totalInboundPages ? 0.5 : 1 }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )
          ) : activeTab === 'daily' ? (
            // TAB 3: GHI NHẬN LỖI HÀNG NGÀY TABLE
            paginatedDailyList.length === 0 ? (
              <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                  <span>Không tìm thấy ghi nhận lỗi hàng ngày nào phù hợp.</span>
                </div>
              </div>
            ) : (
              <>
                <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '150px' }}>Ngày ghi nhận</th>
                        <th>Tên công đoạn</th>
                        <th>Người ghi QC</th>
                        <th style={{ textAlign: 'right', paddingRight: '20px' }}>Tổng SP kiểm</th>
                        <th style={{ textAlign: 'right', paddingRight: '20px' }}>Tổng số lỗi</th>
                        <th style={{ textAlign: 'right', paddingRight: '20px' }}>Tỉ lệ lỗi (%)</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDailyList.map((item, idx) => {
                        const stt = (dailyPage - 1) * dailyLimit + idx + 1;
                        return (
                          <tr key={item.id} onClick={() => setSelectedDaily(item)} style={{ cursor: 'pointer' }}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                            <td style={{ fontWeight: '600' }}>{formatDisplayDate(item.inspection_date)}</td>
                            <td style={{ color: '#7B5233', fontWeight: 'bold' }}>{item.stage_name || 'N/A'}</td>
                            <td>{item.inspector_name || 'N/A'}</td>
                            <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: '600' }}>{item.total_products?.toLocaleString() || 0}</td>
                            <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: '700', color: '#EF4444' }}>{item.total_defects?.toLocaleString() || 0}</td>
                            <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: '700', color: item.defect_rate > 0 ? '#F59E0B' : '#10B981' }}>{item.defect_rate?.toFixed(2) || '0.00'}%</td>
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="action-btn"
                                onClick={() => setSelectedDaily(item)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7B5233' }}
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card Grid for Daily Defects */}
                <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                  {paginatedDailyList.map((item, idx) => {
                    const stt = (dailyPage - 1) * dailyLimit + idx + 1;
                    return (
                      <div 
                        key={item.id} 
                        className="mgmt-card animate-card-entrance" 
                        style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #EADCC9', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
                        onClick={() => setSelectedDaily(item)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</span>
                          <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '0.85rem' }}>{item.total_defects} lỗi</span>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                          {item.stage_name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                          <span>QC: {item.inspector_name || 'N/A'}</span>
                          <span>{formatDisplayDate(item.inspection_date)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #EADCC9', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{paginatedDailyList.length}</b> trên <b>{filteredDailyList.length}</b> ghi nhận lỗi
                  </div>
                  {totalDailyPages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button 
                        className="page-btn" 
                        onClick={() => setDailyPage(prev => Math.max(prev - 1, 1))} 
                        disabled={dailyPage === 1}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: dailyPage === 1 ? 'not-allowed' : 'pointer', opacity: dailyPage === 1 ? 0.5 : 1 }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, dailyPage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalDailyPages, start + maxVisible - 1);
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }
                        for (let p = start; p <= end; p++) {
                          pages.push(
                            <button
                              key={p}
                              onClick={() => setDailyPage(p)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                backgroundColor: dailyPage === p ? '#7B5233' : '#FAF6F0',
                                color: dailyPage === p ? '#fff' : '#7B5233',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              {p}
                            </button>
                          );
                        }
                        return pages;
                      })()}
                      <button 
                        className="page-btn" 
                        onClick={() => setDailyPage(prev => Math.min(prev + 1, totalDailyPages))} 
                        disabled={dailyPage === totalDailyPages}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: dailyPage === totalDailyPages ? 'not-allowed' : 'pointer', opacity: dailyPage === totalDailyPages ? 0.5 : 1 }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            // TAB 4: KIỂM TRA QUY TRÌNH TABLE (quy-trinh stage inspections)
            paginatedProcessList.length === 0 ? (
              <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                  <span>Không tìm thấy phiếu kiểm tra quy trình nào phù hợp.</span>
                </div>
              </div>
            ) : (
              <>
                <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '150px' }}>Ngày kiểm tra</th>
                        <th>Mã PO</th>
                        <th>Mã sản phẩm / Công đoạn</th>
                        <th>Người kiểm QC</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Kết luận</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProcessList.map((item, idx) => {
                        const stt = (stagePage - 1) * stageLimit + idx + 1; // Reusing stagePage
                        const isPass = item.conclusion === 'pass';
                        return (
                          <tr key={item.id} onClick={() => setSelectedInspection(item)} style={{ cursor: 'pointer' }}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                            <td style={{ fontWeight: '600' }}>{formatDisplayDateTime(item.inspection_date)}</td>
                            <td style={{ color: '#7B5233', fontWeight: 'bold' }}>{item.batch_no || 'N/A'}</td>
                            <td style={{ fontWeight: '700' }}>{item.product_sku || 'N/A'}</td>
                            <td>{item.inspector_name || 'N/A'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                                {isPass ? 'Đạt' : 'Lỗi'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="action-btn"
                                onClick={() => setSelectedInspection(item)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7B5233' }}
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card Grid */}
                <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                  {paginatedProcessList.map((item, idx) => {
                    const stt = (stagePage - 1) * stageLimit + idx + 1;
                    const isPass = item.conclusion === 'pass';
                    return (
                      <div 
                        key={item.id} 
                        className="mgmt-card animate-card-entrance" 
                        style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #EADCC9', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
                        onClick={() => setSelectedInspection(item)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</span>
                          <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                            {isPass ? 'ĐẠT' : 'LỖI'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                          PO: {item.batch_no || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#2D1A12', marginBottom: '4px' }}>
                          Sản phẩm: <strong>{item.product_sku || 'N/A'}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                          <span>QC: {item.inspector_name || 'N/A'}</span>
                          <span>{formatDisplayDate(item.inspection_date)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #EADCC9', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{paginatedProcessList.length}</b> trên <b>{filteredProcessList.length}</b> phiếu kiểm tra
                  </div>
                  {totalProcessPages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button 
                        className="page-btn" 
                        onClick={() => setStagePage(prev => Math.max(prev - 1, 1))} 
                        disabled={stagePage === 1}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: stagePage === 1 ? 'not-allowed' : 'pointer', opacity: stagePage === 1 ? 0.5 : 1 }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, stagePage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalProcessPages, start + maxVisible - 1);
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }
                        for (let p = start; p <= end; p++) {
                          pages.push(
                            <button
                              key={p}
                              onClick={() => setStagePage(p)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                backgroundColor: stagePage === p ? '#7B5233' : '#FAF6F0',
                                color: stagePage === p ? '#fff' : '#7B5233',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              {p}
                            </button>
                          );
                        }
                        return pages;
                      })()}
                      <button 
                        className="page-btn" 
                        onClick={() => setStagePage(prev => Math.min(prev + 1, totalProcessPages))} 
                        disabled={stagePage === totalProcessPages}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: stagePage === totalProcessPages ? 'not-allowed' : 'pointer', opacity: stagePage === totalProcessPages ? 0.5 : 1 }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )
          )}

        </div>
      </div>

      {/* EXPORT OPTIONS MODAL */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <button 
              onClick={() => setShowExportModal(false)} 
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: '0 0 20px 0' }}>Lựa chọn xuất báo cáo Excel</h3>
            
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
                    Xuất các dòng hiện tại của tab {activeTab === 'stage' ? 'Kiểm tra công đoạn' : activeTab === 'input' ? 'Kiểm tra đầu vào' : activeTab === 'process' ? 'Kiểm tra quy trình' : 'Lỗi hàng ngày'} theo các bộ lọc đang chọn ({activeTab === 'stage' ? filteredStageList.length : activeTab === 'input' ? filteredInboundList.length : activeTab === 'process' ? filteredProcessList.length : filteredDailyList.length} dòng).
                  </span>
                </div>
              </div>

              {/* Option 2 */}
              <div 
                className={`export-option-card ${selectedExportOption === 'po' ? 'active' : ''}`}
                onClick={() => setSelectedExportOption('po')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input type="radio" checked={selectedExportOption === 'po'} readOnly style={{ accentColor: '#7B5233' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất chi tiết theo mã PO / Lệnh SX</span>
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63', marginBottom: '6px' }}>
                    Kết xuất tệp gồm nhiều Sheet chi tiết (Bám dính, Độ ẩm, Quy trình...) của một PO xác định.
                  </span>
                  {selectedExportOption === 'po' && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '4px' }}>
                      <select 
                        value={exportPoCode} 
                        onChange={(e) => setExportPoCode(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #EADCC9',
                          backgroundColor: '#FAF6F0',
                          color: '#2D1A12',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      >
                        {uniquePoList.map(po => (
                          <option key={po} value={po}>{po}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Option 3 */}
              <div 
                className={`export-option-card ${selectedExportOption === 'summary' ? 'active' : ''}`}
                onClick={() => setSelectedExportOption('summary')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input type="radio" checked={selectedExportOption === 'summary'} readOnly style={{ accentColor: '#7B5233' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Báo cáo tổng hợp chất lượng theo thời gian</span>
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                    Tổng hợp tỉ lệ đạt/lỗi của từng công đoạn và thống kê xếp hạng 15 lỗi xảy ra nhiều nhất dựa trên khoảng thời gian lọc hiện tại.
                  </span>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  if (selectedExportOption === 'current') handleExportCurrentList();
                  else if (selectedExportOption === 'po') handleExportDetailedPO();
                  else if (selectedExportOption === 'summary') handleExportQualitySummary();
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
                <Download size={16} /> {isExporting ? 'Đang xuất file...' : 'Tải xuống Báo cáo'}
              </button>
              <button 
                onClick={() => setShowExportModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: STAGE INSPECTION DETAIL POPUP */}
      {selectedInspection && (() => {
        const item = selectedInspection;
        let parsedData = {};
        try {
          parsedData = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
        } catch (e) {
          console.error('Failed to parse details data_json', e);
        }

        // Aggregate all image URLs
        const imagesList = [];
        // Add step images (quy-trinh)
        if (parsedData.steps) {
          Object.values(parsedData.steps).forEach(st => {
            if (st.photo) imagesList.push(st.photo);
          });
        }
        // Add detail detailsList images (bam-dinh)
        if (Array.isArray(parsedData.detailsList)) {
          parsedData.detailsList.forEach(det => {
            if (det.image) imagesList.push(det.image);
          });
        }
        // Add samples images (do-am)
        if (Array.isArray(parsedData.samples)) {
          parsedData.samples.forEach(s => {
            if (s.moisture?.photo) imagesList.push(s.moisture.photo);
            if (s.size?.photo) imagesList.push(s.size.photo);
          });
        }
        // Add checklist images (mau-dau-tien)
        if (Array.isArray(parsedData.checklist_results)) {
          parsedData.checklist_results.forEach(res => {
            if (Array.isArray(res.images)) imagesList.push(...res.images);
            if (Array.isArray(res.steps)) {
              res.steps.forEach(st => {
                if (Array.isArray(st.images)) imagesList.push(...st.images);
              });
            }
          });
        }
        // Add general images (images_json)
        let generalImages = [];
        try {
          const parsedImages = typeof item.images_json === 'string' ? JSON.parse(item.images_json || '{}') : (item.images_json || {});
          Object.values(parsedImages).forEach(val => {
            if (Array.isArray(val)) generalImages.push(...val);
            else if (typeof val === 'string') generalImages.push(val);
          });
        } catch(e){}
        const finalImages = Array.from(new Set([...imagesList, ...generalImages])).filter(Boolean);

        return (
          <div className="modal-overlay">
            <div className="modal-container">
              {/* Close Button */}
              <button 
                onClick={() => setSelectedInspection(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7B5233', margin: '0 0 20px 0' }}>Chi tiết phiếu kiểm tra công đoạn</h3>

              {/* General details grid */}
              <div className="detail-grid-info">
                <div>
                  <div className="detail-row-item">
                    <span>Mã PO/Batch:</span>
                    <span>{item.batch_no || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Sản phẩm / Công đoạn:</span>
                    <span>{item.product_sku || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Loại công đoạn:</span>
                    <span>{getInspectionTypeLabel(item.inspection_type)}</span>
                  </div>
                </div>
                <div>
                  <div className="detail-row-item">
                    <span>QC thực hiện:</span>
                    <span>{item.inspector_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Ngày kiểm tra:</span>
                    <span>{formatDisplayDateTime(item.inspection_date)}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Kết luận chung:</span>
                    <span style={{ color: item.conclusion === 'pass' ? '#10B981' : '#EF4444' }}>
                      {item.conclusion === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '12px', border: '1px solid #EADCC9', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <strong style={{ color: '#7B5233', display: 'block', marginBottom: '4px' }}>Ghi chú chung:</strong>
                  <span style={{ color: '#2D1A12' }}>{item.notes}</span>
                </div>
              )}

              {/* DYNAMIC DETAIL PARSING BY INSPECTION TYPE */}
              {/* Type 1: bám dính */}
              {item.inspection_type === 'bam-dinh' && Array.isArray(parsedData.detailsList) && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả bám dính chi tiết</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #EADCC9', color: '#8D6E63', textAlign: 'left', fontWeight: 'bold' }}>
                        <th style={{ padding: '8px 0' }}>Tên linh kiện/phụ kiện</th>
                        <th style={{ padding: '8px 0', textAlign: 'center', width: '80px' }}>Kết quả</th>
                        <th style={{ padding: '8px 0', textAlign: 'center', width: '100px' }}>Minh chứng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.detailsList.map((det, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', fontWeight: 'bold' }}>{det.name}</td>
                          <td style={{ padding: '8px 0', textAlign: 'center' }}>
                            <span style={{ color: det.conclusion === 'pass' ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                              {det.conclusion === 'pass' ? 'Đạt' : 'Lỗi'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'center' }}>
                            {det.image ? (
                              <img 
                                src={getImageUrl(det.image)} 
                                alt="Evidence" 
                                className="gallery-thumb"
                                style={{ width: '36px', height: '36px', borderRadius: '4px', margin: 0 }}
                                onClick={() => setLightboxImage(det.image)}
                                onError={handleImageError}
                              />
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.action && (
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>
                      Phương án xử lý: <span style={{ color: '#2D1A12' }}>{parsedData.action === 'luu-kho' ? 'Lưu kho thành phẩm' : parsedData.action === 'tra-ve' ? 'Trả về xưởng' : 'Cách ly'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Type 2: quy trình / tần suất */}
              {item.inspection_type === 'quy-trinh' && parsedData.steps && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả các bước quy trình kiểm soát</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(parsedData.steps).map(([stepKey, val]) => (
                      <div key={stepKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#2D1A12' }}>
                            Bước: {stepKey.split('_').slice(1, -1).join(' ') || stepKey}
                          </strong>
                          {val.value && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Giá trị đo: {val.value}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: val.result === 'pass' ? '#10B981' : '#EF4444' }}>
                            {val.result === 'pass' ? 'Đạt' : 'Lỗi'}
                          </span>
                          {val.photo && (
                            <img 
                              src={getImageUrl(val.photo)} 
                              alt="Step" 
                              className="gallery-thumb"
                              style={{ width: '36px', height: '36px', borderRadius: '4px', margin: 0 }}
                              onClick={() => setLightboxImage(val.photo)}
                              onError={handleImageError}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {parsedData.general_notes && (
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                      Ghi chú quy trình: {parsedData.general_notes}
                    </div>
                  )}
                </div>
              )}

              {/* Type 6: Kiểm tra mẫu đầu tiên (mau-dau-tien) */}
              {item.inspection_type === 'mau-dau-tien' && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả kiểm tra mẫu đầu tiên</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>SL SẢN XUẤT</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{parsedData.quantity_produced || 0}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>SL KIỂM MẪU</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{parsedData.quantity_sampled || 0}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>SL LỖI/HỦY</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#EF4444', marginTop: '4px' }}>{parsedData.quantity_rejected || 0}</div>
                    </div>
                  </div>

                  {parsedData.machine_name && (
                    <div style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#2D1A12' }}>
                      Máy thực hiện: <b>{parsedData.machine_name} ({parsedData.machine_code})</b>
                    </div>
                  )}

                  {Array.isArray(parsedData.checklist_results) && parsedData.checklist_results.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#7B5233', display: 'block', marginBottom: '8px' }}>Kết quả kiểm tra checklist:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {parsedData.checklist_results.map((res, i) => (
                          <div key={i} style={{ padding: '10px', background: '#fff', border: '1px solid #EADCC9', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '0.85rem', color: '#2D1A12' }}>Mẫu #{res.sampleNum}: {res.title}</strong>
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: res.status === 'pass' ? '#10B981' : '#EF4444' }}>
                                {res.status === 'pass' ? 'Đạt' : 'Lỗi'}
                              </span>
                            </div>
                            {res.note && <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Ghi chú: {res.note}</div>}
                            
                            {/* Steps under checklist */}
                            {Array.isArray(res.steps) && res.steps.length > 0 && (
                              <div style={{ marginLeft: '12px', borderLeft: '2px solid #EADCC9', paddingLeft: '8px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {res.steps.map((s, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#4A5568' }}>
                                    <span>{s.step}: {s.title}</span>
                                    <span style={{ fontWeight: '600', color: s.status === 'pass' ? '#10B981' : '#EF4444' }}>{s.status === 'pass' ? 'Đạt' : 'Lỗi'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Defects list */}
                  {Array.isArray(parsedData.defects) && parsedData.defects.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#7B5233', display: 'block', marginBottom: '8px' }}>Danh sách lỗi ghi nhận:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {parsedData.defects.map((def, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#fff', border: '1px solid #EADCC9', borderRadius: '6px', fontSize: '0.8rem' }}>
                            <span>{def.defect_name} (Mã #{def.defect_id})</span>
                            <span style={{ color: '#EF4444', fontWeight: 'bold' }}>Số lượng: {def.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Type 3: độ ẩm / kích thước */}
              {item.inspection_type === 'do-am' && Array.isArray(parsedData.samples) && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả đo mẫu gỗ (Độ ẩm & Kích thước)</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #EADCC9', color: '#8D6E63', textAlign: 'left', fontWeight: 'bold' }}>
                        <th style={{ padding: '8px 0', textAlign: 'center', width: '50px' }}>Mẫu</th>
                        <th style={{ padding: '8px 0' }}>Kết quả đo độ ẩm (%)</th>
                        <th style={{ padding: '8px 0', textAlign: 'center' }}>Kích thước (Dày x Rộng x Dài mm)</th>
                        <th style={{ padding: '8px 0', textAlign: 'center', width: '80px' }}>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.samples.map((s) => (
                        <tr key={s.stt} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 'bold' }}>#{s.stt}</td>
                          <td style={{ padding: '8px 0' }}>
                            {s.moisture?.values && s.moisture.values.length > 0 ? (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {s.moisture.values.map((v, i) => (
                                  <span key={i} style={{ padding: '2px 6px', background: '#F1F5F9', borderRadius: '4px', fontWeight: '600' }}>{v}%</span>
                                ))}
                              </div>
                            ) : 'Chưa đo'}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: '600' }}>
                            {s.size?.thickness ? `${s.size.thickness} x ${s.size.width} x ${s.size.length} mm` : 'Chưa đo'}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'center' }}>
                            <span style={{ color: s.result === 'pass' ? '#10B981' : s.result === 'fail' ? '#EF4444' : '#94A3B8', fontWeight: 'bold' }}>
                              {s.result === 'pass' ? 'Đạt' : s.result === 'fail' ? 'Lỗi' : 'Chưa đo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.85rem' }}>
                    <span>Tổng số lượng kiểm: <b>{parsedData.inspected_qty || 0}</b></span>
                    <span style={{ color: '#EF4444' }}>Số lượng lỗi: <b>{parsedData.failed_qty || 0}</b></span>
                    <span>Phương án xử lý: <b>{parsedData.action === 'luu-kho' ? 'Lưu kho' : 'Trả về/Cách ly'}</b></span>
                  </div>
                </div>
              )}

              {/* Type 4 & 5: sau-dong-goi, phu-kien */}
              {(item.inspection_type === 'sau-dong-goi' || item.inspection_type === 'phu-kien') && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả kiểm tra chi tiết</h4>
                  {parsedData.check_type && (
                    <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                      Hình thức kiểm: <b>{parsedData.check_type}</b>
                    </div>
                  )}
                  {parsedData.intended_use && (
                    <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                      Mục đích sử dụng: <b>{parsedData.intended_use}</b>
                    </div>
                  )}
                  {Array.isArray(parsedData.checklist) && parsedData.checklist.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#7B5233', display: 'block', marginBottom: '8px' }}>Danh sách tiêu chí đánh giá:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {parsedData.checklist.map((c, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#fff', border: '1px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem' }}>
                            <span>{c.name || c.criterion}</span>
                            <span style={{ fontWeight: 'bold', color: c.status === 'pass' || c.result === 'pass' ? '#10B981' : '#EF4444' }}>
                              {c.status === 'pass' || c.result === 'pass' ? 'Đạt' : 'Lỗi'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IMAGE GALLERY */}
              {finalImages.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#7B5233', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={18} /> Thư viện hình ảnh ({finalImages.length} ảnh)
                  </h4>
                  <div className="grid-gallery">
                    {finalImages.map((img, index) => (
                      <img 
                        key={index}
                        src={getImageUrl(img)} 
                        alt="Inspection Attachment"
                        className="gallery-thumb"
                        onClick={() => setLightboxImage(img)}
                        onError={handleImageError}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* MODAL 2: DAILY DEFECT DETAIL POPUP */}
      {selectedDaily && (() => {
        const item = selectedDaily;
        return (
          <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '500px' }}>
              <button 
                onClick={() => setSelectedDaily(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7B5233', margin: '0 0 20px 0' }}>Chi tiết ghi nhận lỗi hàng ngày</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <div className="detail-row-item">
                  <span>Ngày ghi nhận:</span>
                  <span>{formatDisplayDate(item.inspection_date)}</span>
                </div>
                <div className="detail-row-item">
                  <span>Tên công đoạn:</span>
                  <span>{item.stage_name || 'N/A'}</span>
                </div>
                <div className="detail-row-item">
                  <span>QC ghi nhận:</span>
                  <span>{item.inspector_name || 'N/A'}</span>
                </div>
                <div className="detail-row-item">
                  <span>Tổng sản phẩm đã kiểm:</span>
                  <span>{item.total_products?.toLocaleString() || 0}</span>
                </div>
                <div className="detail-row-item">
                  <span>Tổng số lượng lỗi:</span>
                  <span style={{ color: '#EF4444' }}>{item.total_defects || 0} lỗi</span>
                </div>
                <div className="detail-row-item">
                  <span>Tỉ lệ lỗi (%):</span>
                  <span style={{ color: item.defect_rate > 0 ? '#F59E0B' : '#10B981' }}>{item.defect_rate?.toFixed(2) || '0.00'}%</span>
                </div>
              </div>

              {/* Renders list of defects if populated */}
              {Array.isArray(item.defects) && item.defects.length > 0 ? (
                <div className="detail-sub-section" style={{ marginTop: 0 }}>
                  <h4 className="detail-sub-title">Danh sách chi tiết các lỗi</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {item.defects.map((def, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #EADCC9', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#7B5233' }}>Mã lỗi #{def.defect_id}</span>
                        <span style={{ color: '#EF4444', fontWeight: 'bold' }}>Số lượng: {def.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px', border: '1px dashed #EADCC9', borderRadius: '8px', textAlign: 'center', color: '#8D6E63', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Không có danh sách chi tiết lỗi đính kèm.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: INCOMING/INPUT INSPECTION DETAIL POPUP */}
      {selectedInbound && (() => {
        const item = selectedInbound;
        const imagesList = [item.image_path_1, item.image_path_2, item.image_path_3].filter(Boolean);
        const isPass = item.result === 'Đạt';

        return (
          <div className="modal-overlay">
            <div className="modal-container">
              {/* Close Button */}
              <button 
                onClick={() => setSelectedInbound(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7B5233', margin: '0 0 20px 0' }}>Chi tiết phiếu kiểm tra đầu vào (IQC)</h3>

              {/* General details grid */}
              <div className="detail-grid-info">
                <div>
                  <div className="detail-row-item">
                    <span>Tên chi tiết / Linh kiện:</span>
                    <span>{item.part_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Quy cách linh kiện:</span>
                    <span>{item.specification || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Container / PO:</span>
                    <span>{item.cont_name || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <div className="detail-row-item">
                    <span>QC thực hiện:</span>
                    <span>{item.inspector_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Ngày kiểm tra:</span>
                    <span>{formatDisplayDateTime(item.inspected_at)}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Kết luận chung:</span>
                    <span style={{ color: isPass ? '#10B981' : '#EF4444' }}>
                      {isPass ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {item.note && (
                <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '12px', border: '1px solid #EADCC9', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <strong style={{ color: '#7B5233', display: 'block', marginBottom: '4px' }}>Ghi chú kiểm tra:</strong>
                  <span style={{ color: '#2D1A12' }}>{item.note}</span>
                </div>
              )}

              {/* Dimensions Section */}
              <div className="detail-sub-section" style={{ marginTop: 0 }}>
                <h4 className="detail-sub-title">Kết quả đo kích thước chi tiết (mm)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU DÀI</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_length != null ? `${item.measured_length} mm` : '---'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU RỘNG</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_width != null ? `${item.measured_width} mm` : '---'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU DÀY</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_height != null ? `${item.measured_height} mm` : '---'}</div>
                  </div>
                </div>
              </div>

              {/* IMAGE GALLERY */}
              {imagesList.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#7B5233', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={18} /> Thư viện hình ảnh minh chứng ({imagesList.length} ảnh)
                  </h4>
                  <div className="grid-gallery">
                    {imagesList.map((img, index) => (
                      <img 
                        key={index}
                        src={getImageUrl(img)} 
                        alt="IQC Evidence"
                        className="gallery-thumb"
                        onClick={() => setLightboxImage(img)}
                        onError={handleImageError}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX / FULL IMAGE VIEW */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={getImageUrl(lightboxImage)} 
            alt="Full Preview"
            onError={handleImageError}
            style={{
              maxWidth: '95%',
              maxHeight: '95%',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
          <button 
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
        </div>
      )}

    </div>
  );
};

export default InspectionReports;
