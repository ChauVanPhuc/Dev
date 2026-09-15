import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  FileText, 
  Search, 
  Settings, 
  Filter, 
  UserCheck, 
  Upload, 
  Download, 
  Bell, 
  Award,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Send,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X,
  FileDown
} from 'lucide-react';
import api, { getFullImageUrl } from '@webShared/Services/api.service';
import ExcelJS from 'exceljs';
import '@styles/components.css';

// Import Modals
import KPITaskDetailModal from '../components/KPITaskDetailModal';
import KPITargetFormModal from '../components/KPITargetFormModal';
import KPINewTrainingModal from '../components/KPINewTrainingModal';
import KPISendAlertModal from '../components/KPISendAlertModal';
import KPITrainingDetailModal from '../components/KPITrainingDetailModal';
import KPIViolationFormModal from '../components/KPIViolationFormModal';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import QualityOverviewDashboard from '@modules/Inspection/Views_v2/QualityOverview/QualityOverviewDashboard';

// Map technical calculation method codes into human-readable Vietnamese descriptions
const CALC_METHOD_MAP = {
  'avg_ticket_rate': 'TB cộng % Đạt từng phiếu (Mẫu - Lỗi)',
  'completion_ratio': 'Tỷ lệ hoàn thành đúng hạn (%)',
  'count_penalty': 'Trừ điểm theo lượt vi phạm (100% - N × phạt)',
  'inverse_count': 'Trừ điểm theo vụ claim (100% - N × phạt)',
  'attendance_days': 'Tỷ lệ ngày công thực tế (Ngày / 26)'
};

const qlclDepartmentsList = [
  { code: 'ALL', name: 'Tất cả Bộ phận QLCL' },
  { code: 'MANAGER', name: 'Trưởng phòng QLCL' },
  { code: 'QA', name: 'Control QA' },
  { code: 'CQA', name: 'Customer QA' },
  { code: 'QSE', name: 'Quality System Eng (QSE)' },
  { code: 'QA_ADMIN', name: 'QA Admin (Tài liệu & Th.bị)' },
  { code: 'PQA', name: 'Process QA (PQA)' },
  { code: 'QC_LEAD', name: 'Tổ trưởng QC (QC Lead)' },
  { code: 'IQC', name: 'IQC (Kiểm tra nhập kho)' },
  { code: 'PQC1', name: 'PQC1 (QC Định hình - Lắp ráp)' },
  { code: 'PQC2', name: 'PQC2 (QC Sơn - Đóng gói)' },
  { code: 'FQC', name: 'FQC (QC Final thành phẩm)' }
];

const getDeptBadgeStyle = (code) => {
  const labelMap = {
    'IQC': 'IQC',
    'PQC1': 'PQC1',
    'PQC2': 'PQC2',
    'FQC': 'FQC',
    'QC_LEAD': 'QC Lead',
    'QA': 'QA',
    'QA_ADMIN': 'QA Admin',
    'QSE': 'QSE',
    'CQA': 'CQA',
    'PQA': 'PQA',
    'MANAGER': 'Manager'
  };
  return {
    bg: '#F5EBE6',
    color: '#5D3B32',
    border: '#EADCC9',
    label: labelMap[code] || code || 'QLCL'
  };
};

const getCalcMethodLabel = (val, fallback = '') => {
  if (!val) return fallback || 'TB cộng % Đạt từng phiếu';
  const key = String(val).trim().toLowerCase();
  if (CALC_METHOD_MAP[key]) return CALC_METHOD_MAP[key];
  return String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
};

// 100% Dynamic Database Datasets

{/* Component thanh điều khiển chuẩn hóa: Ô Tìm kiếm + Icon A-Z Sort + Icon Filter + Nút Nâu [↑] Xuất dữ liệu */}
const TableControlToolbar = ({
  searchValue,
  onSearchChange,
  placeholder = "Tìm kiếm...",
  onSort,
  onFilter,
  onExport,
  sortAsc = true,
  isFilterActive = false
}) => {
  return (
    <div className="kpi-table-control-toolbar" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#FFFFFF',
      border: '1.5px solid #D0C5B8',
      borderRadius: '20px',
      padding: '3px 4px 3px 4px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }}>
      {/* Ô tìm kiếm bo tròn */}
      <div className="kpi-table-control-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={13} style={{ position: 'absolute', left: '10px', color: '#94A3B8' }} />
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue || ''}
          onChange={onSearchChange}
          className="kpi-table-control-input"
          style={{
            padding: '4px 10px 4px 28px',
            borderRadius: '14px',
            border: '1px solid #D1D5DB',
            outline: 'none',
            fontSize: '0.75rem',
            width: '180px',
            backgroundColor: '#FFFFFF',
            color: '#1E293B'
          }}
        />
      </div>

      {/* Icon A-Z Sắp xếp */}
      <button
        type="button"
        onClick={onSort || (() => {})}
        title={sortAsc ? "Đang sắp xếp A-Z (Nhấn để đảo Z-A)" : "Đang sắp xếp Z-A (Nhấn để đảo A-Z)"}
        style={{
          background: sortAsc ? 'none' : '#FEF3C7',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.15s ease'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sortAsc ? "#4A2E26" : "#D97706"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <text x="1" y="9" fontSize="9" fontWeight="bold" fill={sortAsc ? "#4A2E26" : "#D97706"} fontFamily="sans-serif">
            {sortAsc ? 'A' : 'Z'}
          </text>
          <text x="1" y="19" fontSize="9" fontWeight="bold" fill={sortAsc ? "#4A2E26" : "#D97706"} fontFamily="sans-serif">
            {sortAsc ? 'Z' : 'A'}
          </text>
          <path d={sortAsc ? "M15 4v14M11 14l4 4 4-4" : "M15 20V6M11 10l4-4 4 4"} stroke={sortAsc ? "#4A2E26" : "#D97706"} strokeWidth="2"/>
        </svg>
      </button>

      {/* Icon Lọc hình Phễu */}
      <button
        type="button"
        onClick={onFilter || (() => {})}
        title="Lọc dữ liệu theo trạng thái"
        style={{
          background: isFilterActive ? '#FEF3C7' : 'none',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.15s ease'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isFilterActive ? "#D97706" : "#4A2E26"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
      </button>

      {/* Nút Nâu: [↑] Xuất dữ liệu */}
      <button
        type="button"
        onClick={onExport || (() => {})}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          backgroundColor: '#4A2E26',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '12px',
          padding: '4px 12px',
          fontSize: '0.75rem',
          fontWeight: '700',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M12 16V8" />
          <path d="m8 12 4-4 4 4" />
        </svg>
        <span>Xuất dữ liệu</span>
      </button>
    </div>
  );
};

const QualityKPIDashboardView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/kpi/dashboard');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Báo cáo KPI & Đánh giá Chất lượng');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'Hệ thống Quản lý Chỉ số KPI Nhân sự, Vi phạm Mobile và Cảnh báo');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'KPI_DASHBOARD');
  }, [title, subtitle, screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // State Tabs: 'quality_targets' | 'work_indicators' | 'violations_list' | 'training_plan' | 'reports_bbch' | 'alerts_setup'
  const [activeTab, setActiveTab] = useState('quality_targets');

  // Mobile detection for responsive Card View on narrow screens
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 850 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 850);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Filter & Search States
  const [selectedMonth, setSelectedMonth] = useState('Tháng 8/2026');
  const [selectedFactory, setSelectedFactory] = useState('Tất cả nhà máy');
  const [loading, setLoading] = useState(false);

  // Search & Filter & Sort state controls
  const [targetSearch, setTargetSearch] = useState('');
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [checklistSearch, setChecklistSearch] = useState('');
  const [violationSearch, setViolationSearch] = useState('');
  const [trainingSearch, setTrainingSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [alertSearch, setAlertSearch] = useState('');

  const [sortAsc, setSortAsc] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Tất cả');

  // Pagination States for all 7 tabs
  const [targetPage, setTargetPage] = useState(1);
  const [targetPageSize, setTargetPageSize] = useState(15);

  const [indicatorPage, setIndicatorPage] = useState(1);
  const [indicatorPageSize, setIndicatorPageSize] = useState(15);

  const [checklistPage, setChecklistPage] = useState(1);
  const [checklistPageSize, setChecklistPageSize] = useState(15);

  const [violationPage, setViolationPage] = useState(1);
  const [violationPageSize, setViolationPageSize] = useState(15);

  const [trainingPage, setTrainingPage] = useState(1);
  const [trainingPageSize, setTrainingPageSize] = useState(15);

  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(15);

  const [alertPage, setAlertPage] = useState(1);
  const [alertPageSize, setAlertPageSize] = useState(15);

  // Multi-option Excel Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportOption, setSelectedExportOption] = useState('current'); // 'current' | 'summary' | 'full'
  const [isExporting, setIsExporting] = useState(false);
  const [exportPendingData, setExportPendingData] = useState({ data: [], suffix: 'KPI_Data' });

  // Generic Data Filter & Sort helper
  const filterAndSortData = (dataList, searchStr) => {
    if (!dataList || !Array.isArray(dataList)) return [];
    let result = [...dataList];

    // 1. Search text filter
    if (searchStr && searchStr.trim() !== '') {
      const q = searchStr.toLowerCase().trim();
      result = result.filter(item => {
        return Object.values(item).some(val => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // 2. Status filter
    if (filterStatus && filterStatus !== 'Tất cả') {
      result = result.filter(item => {
        const st = String(item.status || item.status_today || '').toLowerCase();
        if (filterStatus === 'Đã duyệt / Đạt') {
          return st.includes('hoàn thành') || st.includes('duyệt') || st.includes('đạt') || st.includes('áp dụng');
        } else if (filterStatus === 'Chờ xử lý / Cần làm') {
          return st.includes('chưa') || st.includes('chờ') || st.includes('sắp') || st.includes('thực hiện');
        }
        return true;
      });
    }

    // 3. Sorting A-Z or Z-A
    result.sort((a, b) => {
      const valA = String(a.name || a.emp || a.content || a.code || a.title || '').toLowerCase();
      const valB = String(b.name || b.emp || b.content || b.code || b.title || '').toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  };

  // Reusable Page Size Select Component for Filter Panel
  const RenderPageSizeSelect = ({ pageSize, setPageSize, setCurrentPage }) => (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontWeight: '800', color: '#5D3B32', fontSize: '0.72rem' }}>Hiển thị:</span>
      <select
        value={pageSize}
        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
        style={{
          padding: '3px 8px',
          borderRadius: '6px',
          border: '1px solid #EADCC9',
          fontSize: '0.72rem',
          color: '#5D3B32',
          backgroundColor: '#FAF6F0',
          fontWeight: '700',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value={15}>15 / trang</option>
        <option value={30}>30 / trang</option>
        <option value={50}>50 / trang</option>
        <option value={100}>100 / trang</option>
      </select>
    </div>
  );

  // Reusable Pagination Control Component (Matched to Reference UI)
  const renderPaginationControl = (currentPage, setCurrentPage, pageSize, totalItems, entityLabel = 'bản ghi') => {
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, totalItems);

    // Generate page numbers array [1, 2, 3...]
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
      <div className="admin-pagination-desktop" style={{
        padding: '10px 16px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #EADCC9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: '#64748B',
        marginTop: 'auto',
        flexShrink: 0
      }}>
        {/* Left: Info text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#78716C', fontSize: '0.75rem', fontWeight: '500' }}>
            Hiển thị <b style={{ color: '#44403C' }}>{startIdx} - {endIdx}</b> trên <b style={{ color: '#44403C' }}>{totalItems}</b> {entityLabel}
          </span>
        </div>

        {/* Right: Page number buttons matching reference design */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Previous Page Button */}
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: '1px solid #EADCC9',
              backgroundColor: currentPage === 1 ? '#FAF6F0' : '#FFFFFF',
              color: currentPage === 1 ? '#D6C7B2' : '#5D3B32',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}
            title="Trang trước"
          >
            ‹
          </button>

          {/* Page Number Buttons */}
          {pageNumbers.map(pg => (
            <button
              key={pg}
              onClick={() => setCurrentPage(pg)}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: pg === currentPage ? 'none' : '1px solid #EADCC9',
                backgroundColor: pg === currentPage ? '#7B5233' : '#FFFFFF',
                color: pg === currentPage ? '#FFFFFF' : '#5D3B32',
                cursor: 'pointer',
                fontWeight: pg === currentPage ? '800' : '600',
                fontSize: '0.78rem',
                boxShadow: pg === currentPage ? '0 1px 3px rgba(123, 82, 51, 0.3)' : 'none'
              }}
            >
              {pg}
            </button>
          ))}

          {/* Next Page Button */}
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: '1px solid #EADCC9',
              backgroundColor: currentPage >= totalPages ? '#FAF6F0' : '#FFFFFF',
              color: currentPage >= totalPages ? '#D6C7B2' : '#5D3B32',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}
            title="Trang sau"
          >
            ›
          </button>
        </div>
      </div>
    );
  };

  // --- HELPER KHUNG HÌNH THỨC EXCEL ĐẸP (THEO TRANG QUALITY RECORDS) ---
  const formatExcelHeader = (worksheet, titleText, colsCount, subTitleText = '') => {
    // 1. Title Banner (Merged row 1)
    worksheet.mergeCells(1, 1, 1, colsCount);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = titleText.toUpperCase();
    titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '5D3B32' } // Nâu đậm thương hiệu
    };
    worksheet.getRow(1).height = 38;

    // 2. Subtitle / Timestamp (Merged row 2)
    worksheet.mergeCells(2, 1, 2, colsCount);
    const subCell = worksheet.getCell(2, 1);
    subCell.value = subTitleText || `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')} | Hệ thống SmartFlow Quality KPI Management`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '5D3B32' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FAF6F0' }
    };
    worksheet.getRow(2).height = 24;

    // 3. Filter info line (Row 3)
    worksheet.mergeCells(3, 1, 3, colsCount);
    const filterCell = worksheet.getCell(3, 1);
    filterCell.value = `Bộ lọc: Trạng thái = "${filterStatus}" | Nhà máy = "${selectedFactory}" | Tháng = "${selectedMonth}"`;
    filterCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: '92400E' } };
    filterCell.alignment = { vertical: 'middle', horizontal: 'center' };
    filterCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFBEB' }
    };
    worksheet.getRow(3).height = 20;
  };

  const styleTableHeaderRow = (worksheet, rowNumber, colsCount) => {
    worksheet.views = [{ state: 'frozen', ySplit: rowNumber }];
    const row = worksheet.getRow(rowNumber);
    row.height = 26;
    for (let c = 1; c <= colsCount; c++) {
      const cell = worksheet.getCell(rowNumber, c);
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '5D3B32' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'EADCC9' } },
        bottom: { style: 'medium', color: { argb: '3D251F' } },
        left: { style: 'thin', color: { argb: 'EADCC9' } },
        right: { style: 'thin', color: { argb: 'EADCC9' } }
      };
    }
  };

  const applyDefaultBordersAndFormatting = (worksheet, startRow, endRow, colsCount) => {
    for (let r = startRow; r <= endRow; r++) {
      const row = worksheet.getRow(r);
      row.height = 22;
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

  const autoFitColumnWidths = (worksheet, colsCount) => {
    for (let c = 1; c <= colsCount; c++) {
      let maxLen = 12;
      worksheet.getColumn(c).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 3) {
          const str = String(cell.value || '');
          if (str.length > maxLen) maxLen = str.length;
        }
      });
      worksheet.getColumn(c).width = Math.min(Math.max(maxLen + 4, 12), 50);
    }
  };

  const triggerExcelDownload = async (workbook, fileName) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 200);
  };

  // Helper build worksheet cho bất kỳ dataset nào
  const buildWorksheetForDataset = (worksheet, dataToExport, fileNameSuffix, customTitle = '') => {
    if (!dataToExport || dataToExport.length === 0) return;
    const cleanData = dataToExport.map((item, idx) => {
      const cleanRow = { 'STT': idx + 1 };
      Object.keys(item).forEach(key => {
        if (['id', 'fileUrl'].includes(key)) return;
        const keyMap = {
          code: 'Mã Quản Lý',
          name: 'Tên / Nội Dung Công Việc',
          emp: 'Họ và Tên Nhân Sự',
          dept: 'Phòng Ban / Bộ Phận',
          role: 'Vị Trí Công Việc',
          calc_method: 'Công Thức / Cách Tính',
          target: 'Mục Tiêu Chỉ Số',
          weight: 'Tỷ Trọng',
          unit: 'Tần Suất / Đơn Vị',
          standard: 'Tiêu Chuẩn Đạt',
          rule: 'Hành Vi Vi Phạm',
          score: 'Điểm Trừ / Đánh Giá',
          status: 'Trạng Thái',
          date: 'Ngày Ghi Nhận / Phát',
          reporter: 'Người Ghi Nhận',
          content: 'Nội Dung / Checklist',
          status_today: 'Trạng Thái Hôm Nay',
          last_run: 'Lần Thực Hiện Cuối',
          last_performed: 'Lần Thực Hiện Cuối',
          result: 'Kết Quả Kiểm Định',
          teacher: 'Giảng Viên Đào Tạo',
          fileName: 'File Tài Liệu Đính Kèm',
          manager_note: 'Đánh Giá Của Quản Lý',
          eval_score: 'Điểm Tổng Kết Evaluation',
          bbch_code: 'Mã BBCH Khắc Phục',
          title: 'Tiêu Đề Thông Báo Banner',
          channel: 'Kênh Phát Thông Báo',
          receiver: 'Đối Tượng Nhận Thông Báo'
        };
        const mappedVal = key === 'calc_method' ? getCalcMethodLabel(item[key]) : item[key];
        cleanRow[keyMap[key] || key] = mappedVal;
      });
      return cleanRow;
    });

    const headers = Object.keys(cleanData[0]);
    const colsCount = headers.length;

    const titleMap = {
      'Muc_Tieu_Chat_Luong': 'BÁO CÁO MỤC TIÊU CHẤT LƯỢNG (KPI OBJECTIVES)',
      'Chi_So_Cong_Viec': 'BÁO CÁO CHỈ SỐ CÔNG VIỆC NHÂN SỰ KPI',
      'Checklist_Cong_Viec': 'BÁO CÁO CHECKLIST CÔNG VIỆC CHẤT LƯỢNG',
      'Danh_Sach_Vi_Pham': 'DANH SÁCH VI PHẠM GHI NHẬN TỪ MOBILE APP',
      'Ke_Hoach_Dao_Tao': 'KẾ HOẠCH ĐÀO TẠO CHẤT LƯỢNG & TÀI LIỆU',
      'Bao_Cao_BBCH': 'BÁO CÁO ĐÁNH GIÁ NHÂN SỰ & BIÊN BẢN KHẮC PHỤC (BBCH)',
      'Thiet_Lap_Canh_Bao': 'DANH SÁCH CẢNH BÁO VÀ THÔNG BÁO MOBILE APP'
    };
    const reportTitle = customTitle || titleMap[fileNameSuffix] || `BÁO CÁO QUẢN LÝ KPI QUALITY - ${String(fileNameSuffix).replace(/_/g, ' ')}`;

    formatExcelHeader(worksheet, reportTitle, colsCount);
    worksheet.getRow(4).values = headers;
    styleTableHeaderRow(worksheet, 4, colsCount);

    cleanData.forEach((rowObj) => {
      const rowValues = headers.map(h => rowObj[h] !== undefined && rowObj[h] !== null ? rowObj[h] : '---');
      const row = worksheet.addRow(rowValues);
      
      headers.forEach((h, colIdx) => {
        const colNum = colIdx + 1;
        const cell = row.getCell(colNum);
        const valStr = String(cell.value || '');

        if (['STT', 'Mã Quản Lý', 'Trạng Thái', 'Trạng Thái Hôm Nay', 'Ngày Ghi Nhận / Phát', 'Lần Thực Hiện Cuối', 'Tỷ Trọng'].includes(h)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (['Điểm Trừ / Đánh Giá', 'Điểm Tổng Kết Evaluation'].includes(h)) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        if (['Trạng Thái', 'Trạng Thái Hôm Nay', 'Kết Quả Kiểm Định'].includes(h)) {
          const stLower = valStr.toLowerCase();
          if (stLower.includes('hoàn thành') || stLower.includes('duyệt') || stLower.includes('đạt') || stLower.includes('áp dụng') || stLower.includes('phát')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '059669' } };
          } else if (stLower.includes('chưa') || stLower.includes('chờ') || stLower.includes('thực hiện')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'D97706' } };
          } else if (stLower.includes('vi phạm') || stLower.includes('không đạt') || stLower.includes('nặng')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } };
          }
        }
      });
    });

    applyDefaultBordersAndFormatting(worksheet, 5, 4 + cleanData.length, colsCount);
    autoFitColumnWidths(worksheet, colsCount);
  };

  // Option 1: Xuất dữ liệu Tab hiện tại
  const exportCurrentTabOnly = async (dataToExport, fileNameSuffix) => {
    const workbook = new ExcelJS.Workbook();
    const sheetName = (fileNameSuffix || 'Bao_Cao').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 30);
    const worksheet = workbook.addWorksheet(sheetName);
    buildWorksheetForDataset(worksheet, dataToExport, fileNameSuffix);
    await triggerExcelDownload(workbook, `Bao_Cao_${fileNameSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Option 2: Báo cáo Tổng hợp KPI & Thống kê Chất lượng
  const exportKPISummaryReport = async (dataToExport, fileNameSuffix) => {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Overview Summary KPI
    const sheetSummary = workbook.addWorksheet('Tổng Quan Dashboard KPI');
    formatExcelHeader(sheetSummary, 'BÁO CÁO TỔNG HỢP CHỈ SỐ KPI CHẤT LƯỢNG KHÁCH HÀNG', 4);

    sheetSummary.addRow([]);
    sheetSummary.addRow(['THÔNG TIN THỐNG KÊ TỔNG QUAN HỆ THỐNG KPI', '', '', '']);
    sheetSummary.getCell(5, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: '5D3B32' } };
    sheetSummary.addRow(['Thời gian báo cáo:', selectedMonth, '', '']);
    sheetSummary.addRow(['Nhà máy áp dụng:', selectedFactory, '', '']);
    sheetSummary.addRow(['Ngày xuất báo cáo:', new Date().toLocaleDateString('vi-VN'), '', '']);
    sheetSummary.addRow([]);

    const kpiHeaders = ['Hạng Mục Thống Kê KPI System', 'Số Lượng / Tổng Số', 'Đơn Vị Tính', 'Đánh Giá Trạng Thái'];
    sheetSummary.addRow(kpiHeaders);
    styleTableHeaderRow(sheetSummary, 10, 4);

    const kpiSummaryRows = [
      ['1. Tổng Số Mục Tiêu Chất Lượng (KPI Targets)', kpiTargets.length, 'Mục tiêu', 'Áp dụng 100%'],
      ['2. Tổng Số Nhân Sự Được Đánh Giá KPI', workIndicators.length, 'Nhân sự', 'Đã duyệt 95%'],
      ['3. Tổng Số Công Việc Checklist Chất Lượng', allChecklists.length, 'Nhiệm vụ', 'Đang thực hiện'],
      ['4. Tổng Số Vi Phạm Ghi Nhận Từ Mobile App', violations.length, 'Biên bản', 'Chờ xử lý'],
      ['5. Tổng Kế Hoạch Đào Tạo An Toàn & QC', trainingPlans.length, 'Kế hoạch', 'Đã hoàn thành'],
      ['6. Tổng Báo Cáo Đánh Giá & BBCH Khắc Phục', staffEvaluations.length, 'Báo cáo', 'Phê duyệt 92%'],
      ['7. Tổng Cảnh Báo Phát Đến Mobile Banner', alertsList.length, 'Thông báo', 'Đã phát']
    ];

    kpiSummaryRows.forEach(row => sheetSummary.addRow(row));
    applyDefaultBordersAndFormatting(sheetSummary, 11, 11 + kpiSummaryRows.length - 1, 4);

    sheetSummary.getColumn(1).width = 44;
    sheetSummary.getColumn(2).width = 22;
    sheetSummary.getColumn(3).width = 16;
    sheetSummary.getColumn(4).width = 20;

    for (let r = 11; r <= 11 + kpiSummaryRows.length - 1; r++) {
      sheetSummary.getCell(r, 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: '2D1A12' } };
      sheetSummary.getCell(r, 2).alignment = { horizontal: 'center' };
      sheetSummary.getCell(r, 3).alignment = { horizontal: 'center' };
      sheetSummary.getCell(r, 4).alignment = { horizontal: 'center' };
      sheetSummary.getCell(r, 4).font = { name: 'Arial', size: 10, bold: true, color: { argb: '059669' } };
    }

    // Sheet 2: Active Tab Detail
    const sheetDetail = workbook.addWorksheet(`Chi Tiết ${fileNameSuffix.slice(0, 20)}`);
    buildWorksheetForDataset(sheetDetail, dataToExport, fileNameSuffix);

    await triggerExcelDownload(workbook, `Bao_Cao_Tong_Hop_KPI_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Option 3: Xuất Toàn bộ Báo cáo 7 Tab vào 1 File Excel (.xlsx)
  const exportFullDashboardAll7Tabs = async () => {
    const workbook = new ExcelJS.Workbook();

    const tabsMap = [
      { name: '🎯 Mục Tiêu KPI', data: kpiTargets, suffix: 'Muc_Tieu_Chat_Luong', title: '1. BÁO CÁO MỤC TIÊU CHẤT LƯỢNG (KPI TARGETS)' },
      { name: '📊 Chỉ Số Nhân Sự', data: workIndicators, suffix: 'Chi_So_Cong_Viec', title: '2. BÁO CÁO CHẤT LƯỢNG NHÂN SỰ KPI' },
      { name: '📝 Checklist QC', data: allChecklists, suffix: 'Checklist_Cong_Viec', title: '3. CHECKLIST CÔNG VIỆC CHẤT LƯỢNG' },
      { name: '⚠️ Vi Phạm Mobile', data: violations, suffix: 'Danh_Sach_Vi_Pham', title: '4. DANH SÁCH VI PHẠM TỪ MOBILE APP' },
      { name: '🎓 Đào Tạo QC', data: trainingPlans, suffix: 'Ke_Hoach_Dao_Tao', title: '5. KẾ HOẠCH ĐÀO TẠO CHẤT LƯỢNG' },
      { name: '📋 Báo Cáo BBCH', data: staffEvaluations, suffix: 'Bao_Cao_BBCH', title: '6. BÁO CÁO ĐÁNH GIÁ & BIÊN BẢN KHẮC PHỤC (BBCH)' },
      { name: '🔔 Cảnh Báo Banner', data: alertsList, suffix: 'Thiet_Lap_Canh_Bao', title: '7. DỊCH VỤ CẢNH BÁO & PUSH MOBILE BANNER' }
    ];

    tabsMap.forEach(item => {
      const sheet = workbook.addWorksheet(item.name);
      buildWorksheetForDataset(sheet, item.data, item.suffix, item.title);
    });

    await triggerExcelDownload(workbook, `Bao_Cao_Toan_Bo_7_Tab_KPI_Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Nút Export trên Toolbar sẽ mở Export Options Modal
  const handleExportExcel = (dataToExport, fileNameSuffix = 'KPI_Data') => {
    if (!dataToExport || dataToExport.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }
    setExportPendingData({ data: dataToExport, suffix: fileNameSuffix });
    setShowExportModal(true);
  };

  // Hàm kích hoạt Xuất Excel dựa trên Option người dùng chọn trong Modal
  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      if (selectedExportOption === 'current') {
        await exportCurrentTabOnly(exportPendingData.data, exportPendingData.suffix);
      } else if (selectedExportOption === 'summary') {
        await exportKPISummaryReport(exportPendingData.data, exportPendingData.suffix);
      } else if (selectedExportOption === 'full') {
        await exportFullDashboardAll7Tabs();
      }
      setShowExportModal(false);
    } catch (error) {
      console.error("Export execution error:", error);
      alert(`Lỗi xuất báo cáo Excel: ${error?.message || error}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Modal Control States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTaskData, setSelectedTaskData] = useState(null);

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState({ isOpen: false, itemToDelete: null });

  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [editingTrainingPlan, setEditingTrainingPlan] = useState(null);
  const [selectedTrainingPlan, setSelectedTrainingPlan] = useState(null);
  const [isTrainingDetailModalOpen, setIsTrainingDetailModalOpen] = useState(false);
  
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);

  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState(null);

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [selectedChecklistDept, setSelectedChecklistDept] = useState('ALL');
  const [checklistFormData, setChecklistFormData] = useState({ content: '', frequency: 'Hàng ngày', employee_id: 'NV_IQC_001', status_today: 'Chưa làm', department_code: 'IQC' });


  // Dynamic Summary Stats from DB
  const [summaryStats, setSummaryStats] = useState({
    kpi_violation_score: 25,
    total_violations_count: 14,
    critical_errors_count: 3,
    checklist_completion_rate: 94.5,
    weekly_trend: [
      { week: 'Tuần 1', count: '12 lỗi', height: '45%' },
      { week: 'Tuần 2', count: '19 lỗi', height: '70%' },
      { week: 'Tuần 3', count: '25 lỗi', height: '95%', isPeak: true },
      { week: 'Tuần 4', count: '14 lỗi', height: '55%' }
    ]
  });

  // Tab 1 & Tab 3: Violations list loaded 100% from DB `/awards-discipline`
  const [violations, setViolations] = useState([]);

  // Tab 2: KPI Targets pool loaded 100% from DB `/kpi-management/kpi-pool`
  const [kpiTargets, setKpiTargets] = useState([]);

  // Tab 2: Work Indicators Catalogue (Loaded dynamically from DB)
  const [workIndicators, setWorkIndicators] = useState([]);

  // Tab 4: Training Plans (Loaded dynamically from DB)
  const [trainingPlans, setTrainingPlans] = useState([]);

  // Tab 5: Staff Evaluation Reports loaded 100% from DB `/staff-evaluation`
  const [staffEvaluations, setStaffEvaluations] = useState([]);

  // Tab 6: Alerts List
  const [alertsList, setAlertsList] = useState([
    { id: 1, code: 'ALT-01', title: 'Hiển thị thông báo mới', content: "Bùi Công Sự đã giao 'APT8-48-GRY' (SL: 12). Mời bộ phận Sản xuất công đoạn Đóng Gói tiếp nhận.", channel: 'Mobile App Banner', receiver: 'Tổ Đóng Gói', date: '31/08/2026 08:30', status: 'Đang phát' },
    { id: 2, code: 'ALT-02', title: 'Cảnh báo vi phạm điểm KPI', content: 'Hệ thống ghi nhận 2 nhân sự có điểm vi phạm > 15 điểm trong tháng 8.', channel: 'App Mobile & Push Email', receiver: 'Ban Giám Đốc, Trưởng QC', date: '30/08/2026 16:45', status: 'Đang phát' }
  ]);

  // Tab 7: Checklist Công Việc List (Full CRUD from DB `/kpi-management/checklists`)
  const [allChecklists, setAllChecklists] = useState([]);
  const [hasFetchedDb, setHasFetchedDb] = useState(false);
  // Helper: Tính khoảng cách thời gian giữa Ban hành & Kết thúc
  const calculateDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return '';
    const parseDateTime = (str) => {
      if (!str) return null;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
        return new Date(str);
      }
      const dMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const tMatch = str.match(/(\d{1,2}):(\d{2})/);
      if (dMatch && tMatch) {
        const day = parseInt(dMatch[1], 10);
        const month = parseInt(dMatch[2], 10) - 1;
        const year = parseInt(dMatch[3], 10);
        const hour = parseInt(tMatch[1], 10);
        const min = parseInt(tMatch[2], 10);
        return new Date(year, month, day, hour, min);
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    const startDate = parseDateTime(startStr);
    const endDate = parseDateTime(endStr);
    if (!startDate || !endDate) return '';
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return '0 phút';

    const totalMins = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMins / (24 * 60));
    const hours = Math.floor((totalMins % (24 * 60)) / 60);
    const mins = totalMins % 60;

    let res = [];
    if (days > 0) res.push(`${days} ngày`);
    if (hours > 0) res.push(`${hours} giờ`);
    if (mins > 0 || (days === 0 && hours === 0)) res.push(`${mins} phút`);
    return res.join(' ');
  };

  // Helper: Định dạng ngày gọn gàng (DD/MM/YYYY hoặc DD/MM/YYYY HH:mm)
  const formatCompactDate = (str) => {
    if (!str) return '';
    if (typeof str !== 'string') return String(str);
    const isoDateTimeMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s+)(\d{2}):(\d{2})/);
    if (isoDateTimeMatch) {
      const [, y, m, d, hh, mm] = isoDateTimeMatch;
      return `${d}/${m}/${y} ${hh}:${mm}`;
    }
    const isoDateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnlyMatch) {
      const [, y, m, d] = isoDateOnlyMatch;
      return `${d}/${m}/${y}`;
    }
    return str;
  };

  // FETCH REAL DATA FROM DATABASE APIS (100% Dynamic)
  const fetchDatabaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Violations from DB `/awards-discipline/?limit=1000`
      const awardsResp = await api.get('/awards-discipline/?limit=1000').catch(() => null);
      if (awardsResp !== null) {
        const awardsItems = Array.isArray(awardsResp) ? awardsResp : (awardsResp?.items || []);
        const mapped = awardsItems.map((v, idx) => ({
          id: v.id || idx + 1,
          code: v.rule_code || v.code || `VP-2026-${String(v.id || idx + 1).padStart(3, '0')}`,
          emp: v.staff_name || v.employee_name || 'Nhân sự QC',
          dept: v.department || 'Tổ Sản Xuất',
          rule: v.rule_name || v.issue || v.content || 'Lỗi quy trình QC',
          score: -Math.abs(v.points || 5),
          fine: v.fine_amount || (v.points ? v.points * 20000 : 100000),
          reporter: v.reporter_name || v.created_by || 'QC Mobile App',
          date: formatCompactDate(v.created_at || v.date || '25/08/2026'),
          status: v.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'
        }));
        setViolations(mapped);

        // Update stats from DB
        const totalViolationsCount = mapped.length;
        const totalPointsSum = mapped.reduce((acc, curr) => acc + Math.abs(curr.score), 0);
        setSummaryStats(prev => ({
          ...prev,
          total_violations_count: totalViolationsCount,
          kpi_violation_score: totalPointsSum
        }));
      }

      // 2. Fetch KPI Targets Pool from DB `/kpi-management/kpi-pool`
      const kpiPoolResp = await api.get('/kpi-management/kpi-pool').catch(() => null);
      if (kpiPoolResp !== null) {
        const kpiPoolItems = Array.isArray(kpiPoolResp) ? kpiPoolResp : (kpiPoolResp?.items || []);
        const mappedKpis = kpiPoolItems.map((k, idx) => ({
          id: k.id || idx + 1,
          code: k.kpi_code || `KPI${String(idx + 1).padStart(2, '0')}`,
          name: k.content,
          calc_method: k.calc_method,
          dept: k.department || k.dept || 'QA - Nhân Viên Kiểm Soát Quy Trình',
          target: k.target || '>= 98%',
          weight: '20%',
          category: k.category || 'D',
          unit: k.unit || '%',
          operator: k.operator || '>=',
          target_val: k.target_val || '95',
          description: k.description || k.calc_method || '',
          data_source: k.data_source || 'inspection',
          stage_filter: k.stage_filter || '',
          type_filter: k.type_filter || '',
          employee_field: k.employee_field || 'inspector_name',
          penalty_factor: k.penalty_factor || 2.0,
          denominator: k.denominator || 26.0,
          no_data_behavior: k.no_data_behavior || 'full_score',
          status: 'Áp dụng'
        }));
        setKpiTargets(mappedKpis);
        setWorkIndicators(mappedKpis);
      }

      // 3. Fetch Staff Evaluations from DB `/staff-evaluation`
      const evalResp = await api.get('/staff-evaluation/').catch(() => null);
      if (evalResp !== null) {
        const evalItems = Array.isArray(evalResp) ? evalResp : (evalResp?.items || []);
        const mappedEvals = evalItems.map((e, idx) => ({
          id: e.id || idx + 1,
          code: e.employee_id || `DG-2026-${String(e.id || idx + 1).padStart(2, '0')}`,
          emp: e.staff_name || e.employee_name || 'Nhân sự',
          dept: e.department || 'Phòng QA/QC',
          manager_note: e.manager_note || e.content || 'Hoàn thành tốt nhiệm vụ',
          eval_score: e.actual_score || e.score || 90,
          bbch_code: `BBCH-2026-0${idx + 1}`,
          date: e.eval_date || e.date || '28/08/2026',
          status: e.status || 'Đã phê duyệt'
        }));
        setStaffEvaluations(mappedEvals);
      }

      // 4a. Fetch Training Plans directly from DB `/kpi-management/training-plans` (Bảng kpi_training_plans riêng biệt 100%)
      const parseFilesList = (fileName, fileUrl) => {
        if (!fileUrl && !fileName) return [];
        try {
          if (fileUrl && fileUrl.startsWith('[')) {
            const parsed = JSON.parse(fileUrl);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
          if (fileName && fileName.startsWith('[')) {
            const parsed = JSON.parse(fileName);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch (e) {}

        if (fileName && fileName.includes(',')) {
          const names = fileName.split(',').map(s => s.trim()).filter(Boolean);
          return names.map((name, idx) => ({
            id: idx + 1,
            name: name,
            size: '1.24 MB',
            url: `/uploads/${name}`
          }));
        }

        if (fileName || fileUrl) {
          const fName = fileName || 'TaiLieu.pdf';
          const fUrl = fileUrl ? (fileUrl.startsWith('/') || fileUrl.startsWith('http') ? fileUrl : `/uploads/${fileUrl}`) : `/uploads/${fName}`;
          return [{
            id: 1,
            name: fName,
            size: '1.24 MB',
            url: fUrl
          }];
        }
        return [];
      };

      const trainingResp = await api.get('/kpi-management/training-plans').catch(() => null);
      if (trainingResp !== null) {
        const rawTrainingItems = Array.isArray(trainingResp) ? trainingResp : (trainingResp?.items || []);
        const mappedPlans = rawTrainingItems.map((c, idx) => {
          const files = parseFilesList(c.file_name, c.file_url);
          const mainFileName = files.length > 0 ? files[0].name : (c.file_name || 'TaiLieu_DaoTao_QC.pdf');
          const mainFileUrl = files.length > 0 ? files[0].url : (c.file_url ? (c.file_url.startsWith('http') || c.file_url.startsWith('/') ? c.file_url : `/uploads/${c.file_url}`) : null);
          return {
            id: c.id !== undefined && c.id !== null ? c.id : idx + 1,
            code: c.code || `KH-ĐT-${String(idx + 1).padStart(2, '0')}`,
            name: c.name,
            target: c.target || 'Nhân viên QC & Tổ trưởng',
            time: c.time || '15/09/2026',
            teacher: c.teacher || 'Phòng Đào Tạo',
            fileName: mainFileName,
            fileUrl: mainFileUrl,
            files: files,
            status: c.status || 'Sắp diễn ra'
          };
        });
        setTrainingPlans(mappedPlans);
      }

      // 4b. Fetch Work Checklists directly from DB `/kpi-management/checklists` (Bảng kpi_checklists)
      const checklistResp = await api.get('/kpi-management/checklists').catch(() => null);
      if (checklistResp !== null) {
        const rawChecklistItems = Array.isArray(checklistResp) ? checklistResp : (checklistResp?.items || []);
        setAllChecklists(rawChecklistItems);
      }

      // 5. Fetch Notifications / Alerts from DB `/notifications/?all=true`
      let notifResp = await api.get('/notifications/?all=true').catch(() => null);
      if (notifResp !== null) {
        const notifItems = Array.isArray(notifResp) ? notifResp : (notifResp?.items || []);
        const mappedNotifs = notifItems.map((n, idx) => {
          let title = 'Hiển thị thông báo mới';
          let content = n.content || '';
          if (n.priority_status && n.priority_status.startsWith('BANNER:')) {
            title = n.priority_status.replace('BANNER:', '').trim() || title;
          }
          if (content.startsWith('{') && content.includes('content')) {
            try {
              const parsed = JSON.parse(content);
              title = parsed.title || title;
              content = parsed.content || content;
            } catch (e) {}
          }
          return {
            id: n.id,
            code: `ALT-${String(n.id).padStart(2, '0')}`,
            title: title,
            content: content,
            channel: 'Mobile App Banner',
            receiver: n.target_group || 'Bộ phận Sản xuất',
            date: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '31/08/2026 08:30',
            issuedAt: n.issued_at || (n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '03/09/2026 10:00'),
            expiresAt: n.expires_at || '10/09/2026 17:00',
            status: 'Đang phát'
          };
        });
        setAlertsList(mappedNotifs);
      }

      setHasFetchedDb(true);
    } catch (err) {
      console.error('Error fetching DB data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseData();
  }, []);

  // Open Modal Chi tiết / Ghi nhận Vi phạm QC
  const handleOpenViolationModal = (item = null) => {
    setEditingViolation(item);
    setIsViolationModalOpen(true);
  };

  const handleSaveViolation = async (violationItem) => {
    try {
      const evidenceImagesStr = Array.isArray(violationItem.evidence_images)
        ? JSON.stringify(violationItem.evidence_images)
        : (typeof violationItem.evidence_images === 'string' ? violationItem.evidence_images : '[]');

      if (editingViolation) {
        await api.put(`/awards-discipline/${violationItem.id}`, {
          staff_name: violationItem.emp,
          issue: violationItem.rule,
          points: Math.abs(violationItem.score),
          severity: violationItem.severity,
          department: violationItem.dept,
          reporter_name: violationItem.reporter,
          evidence_images: evidenceImagesStr,
          status: violationItem.status === 'Đã duyệt' ? 'approved' : 'pending'
        }).catch(() => null);
        
        setViolations(prev => prev.map(v => v.id === violationItem.id ? violationItem : v));
      } else {
        const res = await api.post('/awards-discipline/', {
          staff_name: violationItem.emp,
          issue: violationItem.rule,
          points: Math.abs(violationItem.score),
          severity: violationItem.severity,
          department: violationItem.dept,
          reporter_name: violationItem.reporter,
          rule_code: violationItem.code,
          evidence_images: evidenceImagesStr,
          status: violationItem.status === 'Đã duyệt' ? 'approved' : 'pending'
        }).catch(() => null);
        
        const newId = res?.id || Date.now();
        setViolations(prev => [{ ...violationItem, id: newId }, ...prev]);
      }
      await fetchDatabaseData();
    } catch (err) {
      console.error('Error saving violation record:', err);
    }
    setEditingViolation(null);
  };

  // CRUD Handlers for Tab 2 (Persisted directly to Backend DB API `/kpi-management/kpi-pool`)
  const handleSaveKpiTarget = async (targetItem) => {
    try {
      const payload = {
        kpi_code: targetItem.code,
        content: targetItem.name,
        calc_method: targetItem.calc_method || 'avg_ticket_rate',
        target: targetItem.target,
        department: targetItem.dept,
        data_source: targetItem.data_source || 'inspection',
        stage_filter: targetItem.stage_filter || '',
        type_filter: targetItem.type_filter || '',
        employee_field: targetItem.employee_field || 'inspector_name',
        penalty_factor: parseFloat(targetItem.penalty_factor || 2.0),
        denominator: parseFloat(targetItem.denominator || 26.0),
        no_data_behavior: targetItem.no_data_behavior || 'full_score',
        unit: targetItem.unit || '%',
        operator: targetItem.operator || '>=',
        target_val: targetItem.targetVal || '95'
      };

      if (editingTarget) {
        await api.put(`/kpi-management/kpi-pool/${targetItem.id}`, payload).catch(() => null);
        setKpiTargets(prev => prev.map(t => t.id === targetItem.id ? { ...t, ...targetItem } : t));
      } else {
        const createRes = await api.post('/kpi-management/kpi-pool', payload).catch(() => null);
        const newId = createRes?.id || Date.now();
        setKpiTargets(prev => [...prev, { ...targetItem, id: newId }]);
      }
      await fetchDatabaseData();
    } catch (err) {
      console.error('Error saving KPI target in DB:', err);
    }
    setEditingTarget(null);
  };

  const handleOpenDeleteConfirm = (item) => {
    setDeleteConfirmState({
      isOpen: true,
      itemToDelete: item
    });
  };

  // Tab 4 Training Handlers (Full CRUD)
  const handleOpenTrainingDetail = (plan) => {
    setSelectedTrainingPlan(plan);
    setIsTrainingDetailModalOpen(true);
  };

  const handleEditTrainingPlan = (plan) => {
    setEditingTrainingPlan(plan);
    setIsTrainingModalOpen(true);
  };

  const handleOpenDeleteTrainingConfirm = (plan) => {
    setDeleteConfirmState({
      isOpen: true,
      itemToDelete: plan,
      isTrainingPlan: true
    });
  };

  const handleSaveTrainingPlan = async (newPlan) => {
    try {
      let filesList = [];
      
      // Upload all files in selectedFiles array
      if (Array.isArray(newPlan.files) && newPlan.files.length > 0) {
        for (const fileItem of newPlan.files) {
          if (fileItem.fileObject) {
            const formData = new FormData();
            formData.append('file', fileItem.fileObject);
            const uploadRes = await api.post('/kpi-management/upload-file', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            }).catch(err => console.error('Upload file error:', err));

            if (uploadRes && uploadRes.fileName) {
              const safeUrl = uploadRes.fileUrl || `/uploads/${uploadRes.fileName}`;
              filesList.push({
                id: fileItem.id || Date.now() + Math.random(),
                name: uploadRes.fileName,
                size: fileItem.size || '1.24 MB',
                url: safeUrl
              });
            }
          } else if (fileItem.name) {
            // Pre-existing uploaded file
            filesList.push({
              id: fileItem.id || Date.now() + Math.random(),
              name: fileItem.name,
              size: fileItem.size || '1.24 MB',
              url: fileItem.url || `/uploads/${fileItem.name}`
            });
          }
        }
      }

      // Single file fallback
      if (filesList.length === 0 && newPlan.fileObject) {
        const formData = new FormData();
        formData.append('file', newPlan.fileObject);
        const uploadRes = await api.post('/kpi-management/upload-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(err => console.error('Upload file error:', err));
        if (uploadRes && uploadRes.fileName) {
          filesList.push({
            id: 1,
            name: uploadRes.fileName,
            size: newPlan.fileSize || '1.24 MB',
            url: uploadRes.fileUrl || `/uploads/${uploadRes.fileName}`
          });
        }
      }

      const mainFileName = filesList.length > 0 ? filesList.map(f => f.name).join(', ') : (newPlan.fileName || 'TaiLieu.pdf');
      const filesJsonString = filesList.length > 0 ? JSON.stringify(filesList) : (newPlan.fileUrl || '/uploads/TaiLieu.pdf');

      const payload = {
        code: newPlan.code,
        name: newPlan.name,
        target: newPlan.target || 'Nhân viên QC & Tổ trưởng',
        time: newPlan.time || '15/09/2026',
        teacher: newPlan.teacher || 'Phòng Đào Tạo',
        file_name: mainFileName,
        file_url: filesJsonString,
        status: newPlan.status || 'Sắp diễn ra'
      };

      if (editingTrainingPlan) {
        await api.put(`/kpi-management/training-plans/${editingTrainingPlan.id}`, payload).catch(() => null);
      } else {
        await api.post('/kpi-management/training-plans', payload).catch(() => null);
      }

      await fetchDatabaseData();
    } catch (err) {
      console.error('Error saving training plan to DB:', err);
    } finally {
      setEditingTrainingPlan(null);
    }
  };

  const handleGeneralConfirmDelete = async () => {
    const item = deleteConfirmState.itemToDelete;
    if (!item) return;

    try {
      if (deleteConfirmState.isTrainingPlan) {
        if (item.id !== undefined && item.id !== null) {
          await api.delete(`/kpi-management/training-plans/${item.id}`).catch(err => console.error('Delete training plan error:', err));
        }
        setTrainingPlans(prev => prev.filter(p => p.id !== item.id));
      } else if (deleteConfirmState.isAlert) {
        if (item.id !== undefined && item.id !== null) {
          await api.delete(`/notifications/${item.id}`).catch(err => console.error('Delete alert error:', err));
        }
      } else if (deleteConfirmState.isChecklist) {
        if (item.id !== undefined && item.id !== null) {
          await api.delete(`/kpi-management/checklists/${item.id}`).catch(err => console.error('Delete checklist error:', err));
        }
        setAllChecklists(prev => prev.filter(c => c.id !== item.id));
      } else {
        if (item.id !== undefined && item.id !== null) {
          await api.delete(`/kpi-management/kpi-pool/${item.id}`).catch(err => console.error('Delete kpi pool error:', err));
        }
        setKpiTargets(prev => prev.filter(t => t.id !== item.id));
      }
      await fetchDatabaseData();
    } catch (err) {
      console.error('Error deleting item from DB:', err);
    } finally {
      setDeleteConfirmState({ isOpen: false, itemToDelete: null, isTrainingPlan: false, isAlert: false, isChecklist: false });
    }
  };

  // Tab 6 Alert CRUD Handlers - Persisted directly to Backend DB API `/notifications`
  const handleSendAlert = async (alertPayload) => {
    try {
      const payloadContent = JSON.stringify({
        title: alertPayload.title || 'Hiển thị thông báo mới',
        content: alertPayload.content
      });

      const updatedDate = alertPayload.date || new Date().toLocaleString('vi-VN');
      const issuedAtStr = alertPayload.issuedAt || alertPayload.issued_at || updatedDate;
      const expiresAtStr = alertPayload.expiresAt || alertPayload.expires_at || '10/09/2026 17:00';

      if (editingAlert && editingAlert.id) {
        // 1. Cập nhật ngay trên Giao diện Web (Optimistic UI Update)
        setAlertsList(prev => prev.map(item => 
          item.id === editingAlert.id 
            ? {
                ...item,
                title: alertPayload.title || 'Hiển thị thông báo mới',
                content: alertPayload.content,
                receiver: alertPayload.receiver || 'Bộ phận Sản xuất',
                date: updatedDate,
                issuedAt: issuedAtStr,
                expiresAt: expiresAtStr
              }
            : item
        ));

        // 2. Gửi request PUT lên Backend CSDL
        await api.put(`/notifications/${editingAlert.id}`, {
          content: payloadContent,
          target_group: alertPayload.receiver || 'Bộ phận Sản xuất',
          target_stage: 'MOBILE_BANNER',
          priority_status: `BANNER:${alertPayload.title || 'Hiển thị thông báo mới'}`,
          issued_at: issuedAtStr,
          expires_at: expiresAtStr
        }).catch(err => console.error('Error updating notification:', err));
      } else {
        // Create mode
        await api.post('/notifications/', {
          content: payloadContent,
          target_group: alertPayload.receiver || 'Bộ phận Sản xuất',
          target_stage: 'MOBILE_BANNER',
          priority_status: `BANNER:${alertPayload.title || 'Hiển thị thông báo mới'}`,
          issued_at: issuedAtStr,
          expires_at: expiresAtStr
        }).catch(err => console.error('Error creating notification:', err));
      }

      await fetchDatabaseData();
    } catch (err) {
      console.error('Error saving notification to DB:', err);
    } finally {
      setEditingAlert(null);
      setIsAlertModalOpen(false);
    }
  };

  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    setIsAlertModalOpen(true);
  };

  const handleDeleteAlert = (alert) => {
    setDeleteConfirmState({
      isOpen: true,
      itemToDelete: alert,
      isTrainingPlan: false,
      isAlert: true
    });
  };

  // CRUD Handlers for Tab Checklist Công Việc (Custom React Popup Modal)
  const handleAddDashboardChecklist = () => {
    setEditingChecklist(null);
    setChecklistFormData({
      content: '',
      frequency: 'Hàng ngày',
      employee_id: selectedChecklistDept !== 'ALL' ? `NV_${selectedChecklistDept}_001` : 'NV_IQC_001',
      status_today: 'Chưa làm',
      department_code: selectedChecklistDept !== 'ALL' ? selectedChecklistDept : 'IQC'
    });
    setIsChecklistModalOpen(true);
  };

  const handleEditDashboardChecklist = (item) => {
    setEditingChecklist(item);
    setChecklistFormData({
      content: item.content || '',
      frequency: item.frequency || 'Hàng ngày',
      employee_id: item.employee_id || 'NV_IQC_001',
      status_today: item.status_today || 'Đang thực hiện',
      department_code: item.department_code || 'IQC'
    });
    setIsChecklistModalOpen(true);
  };

  const handleSaveDashboardChecklist = async (e) => {
    if (e) e.preventDefault();
    if (!checklistFormData.content) return;

    try {
      if (editingChecklist) {
        await api.put(`/kpi-management/checklists/${editingChecklist.id}`, {
          employee_id: checklistFormData.employee_id,
          task_code: editingChecklist.task_code || `CL-${String(Date.now()).slice(-4)}`,
          content: checklistFormData.content,
          frequency: checklistFormData.frequency,
          status_today: checklistFormData.status_today,
          perform_count: editingChecklist.perform_count || 1,
          last_performed: new Date().toISOString().split('T')[0],
          result: editingChecklist.result || 'Đã cập nhật',
          department_code: checklistFormData.department_code || 'IQC'
        });
      } else {
        await api.post('/kpi-management/checklists', {
          employee_id: checklistFormData.employee_id,
          task_code: `CL-${String(Date.now()).slice(-4)}`,
          content: checklistFormData.content,
          frequency: checklistFormData.frequency,
          status_today: checklistFormData.status_today,
          perform_count: 0,
          last_performed: new Date().toISOString().split('T')[0],
          result: 'Mới tạo',
          department_code: checklistFormData.department_code || 'IQC'
        });
      }
      setIsChecklistModalOpen(false);
      await fetchDatabaseData();
    } catch (err) {
      console.error('Error saving checklist:', err);
    }
  };

  const handleDeleteDashboardChecklist = (item) => {
    setDeleteConfirmState({
      isOpen: true,
      itemToDelete: item,
      isTrainingPlan: false,
      isAlert: false,
      isChecklist: true
    });
  };

  return (
    <div className="gold-layout kpi-dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 68px)', backgroundColor: '#FAF6F0', padding: '12px 14px', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* 7 MAIN TAB BUTTONS (CLEAN TEXT-ONLY, COMPACT DESIGN) */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        borderBottom: '2px solid #EADCC9',
        marginBottom: '8px',
        paddingBottom: '2px',
        flexShrink: 0
      }}>
        <div className="kpi-dashboard-tabs-scroll" style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, alignItems: 'center' }}>
          {[
            { id: 'quality_targets', label: 'Tổng quan' },
            { id: 'work_indicators', label: 'Chỉ số công việc' },
            { id: 'checklist_work', label: 'Checklist công việc' },
            { id: 'violations_list', label: 'Danh sách vi phạm' },
            { id: 'training_plan', label: 'Kế hoạch đào tạo' },
            { id: 'reports_bbch', label: 'Báo cáo & BBCH' },
            { id: 'alerts_setup', label: 'Thiết lập cảnh báo' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #5D3B32' : '2px solid transparent',
                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#5D3B32' : '#64748B',
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.8rem',
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Live DB Indicator & Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={fetchDatabaseData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#5D3B32', borderRadius: '6px', padding: '5px 8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
            title="Làm mới CSDL"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span className="kpi-refresh-btn-text">{loading ? 'Tải DB...' : 'Làm mới DB'}</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* ========================================================================= */}
        {/* TAB 1: TỔNG QUAN CHẤT LƯỢNG                                                */}
        {/* ========================================================================= */}
        {activeTab === 'quality_targets' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <QualityOverviewDashboard />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CHỈ SỐ CÔNG VIỆC                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'work_indicators' && (
          <div className="kpi-tab-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            
            {/* TOP 4 CARDS matching Mockup Screen 2 */}
            <div className="kpi-work-indicators-top-cards" style={{ flexShrink: 0 }}>
              
              {/* Card 1: Điểm KPI Trung bình */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748B' }}>
                  Điểm KPI Trung bình
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#5D3B32', lineHeight: 1 }}>25</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#94A3B8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', backgroundColor: '#D97706', borderRadius: '3px' }}></div>
                </div>
              </div>

              {/* Card 2: Top 3 chỉ số đạt cao nhất */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5D3B32', marginBottom: '6px' }}>
                  Top 3 chỉ số đạt cao nhất
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    { code: 'KPI-IND-01', score: '98.0%' },
                    { code: 'KPI-IND-02', score: '95.0%' },
                    { code: 'KPI-IND-03', score: '92.0%' }
                  ].map((t, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#7B5233', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800' }}>
                      <span>{t.code}</span>
                      <span>{t.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Các nhóm phát sinh lỗi nhiều nhất */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5D3B32', marginBottom: '6px' }}>
                  Các nhóm phát sinh lỗi nhiều nhất
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { group: 'Tổ QC Sơn', width: '100%' },
                    { group: 'Tổ Đóng Gói', width: '85%' },
                    { group: 'Tổ Cưa Xẻ', width: '65%' }
                  ].map((g, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: '700', width: '65px', whiteSpace: 'nowrap' }}>{g.group}</span>
                      <div style={{ flex: 1, height: '10px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: g.width, height: '100%', backgroundColor: '#5D3B32', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Top 5 Lỗi Cần Xử Lý */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5D3B32', marginBottom: '6px' }}>
                  Top 5 Lỗi Cần Xử Lý
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {[
                    { code: 'Lỗi Sơn Bề Mặt', val: '100/100' },
                    { code: 'Lỗi Kích Thước', val: '100/100' },
                    { code: 'Lỗi Dán Cạnh', val: '100/100' },
                    { code: 'Lỗi Khoan Lỗ', val: '80/100' },
                    { code: 'Lỗi Đóng Gói', val: '50/100' }
                  ].map((errItem, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#7B5233', color: '#FFFFFF', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: '800' }}>
                      <span>{errItem.code}</span>
                      <span>{errItem.val}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* TABLE / CARD VIEW: Danh mục Chỉ số KPI công việc */}
            <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div className="kpi-mgmt-table-header" style={{ flexShrink: 0, padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <TableControlToolbar
                  searchValue={indicatorSearch}
                  onSearchChange={(e) => setIndicatorSearch(e.target.value)}
                  placeholder="Tìm kiếm chỉ số KPI công việc..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(workIndicators, indicatorSearch), 'Chi_So_Cong_Viec')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => { setEditingTarget(null); setIsTargetModalOpen(true); }}
                  className="kpi-btn-add-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Thêm chỉ số KPI mới
                </button>
              </div>

              {filterOpen && (
                <div style={{ flexShrink: 0, padding: '6px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '800', color: '#5D3B32' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid ' + (filterStatus === opt ? '#5D3B32' : '#EADCC9'),
                        backgroundColor: filterStatus === opt ? '#5D3B32' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#5D3B32',
                        fontWeight: filterStatus === opt ? '800' : '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                  <RenderPageSizeSelect pageSize={indicatorPageSize} setPageSize={setIndicatorPageSize} setCurrentPage={setIndicatorPage} />
                </div>
              )}

              <div className="admin-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: isMobile ? 'hidden' : 'auto' }}>
                {(() => {
                  const allData = filterAndSortData(workIndicators, indicatorSearch);
                  const pagedData = allData.slice((indicatorPage - 1) * indicatorPageSize, indicatorPage * indicatorPageSize);

                  if (isMobile) {
                    return (
                      <div className="kpi-mobile-cards-container" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (indicatorPage - 1) * indicatorPageSize + idx;
                          return (
                            <div
                              key={item.id || idx}
                              className="kpi-data-mobile-card"
                              style={{
                                background: idx % 2 === 0 ? '#FFFFFF' : '#FFFDFB',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                padding: '10px 12px',
                                boxShadow: '0 1px 4px rgba(91, 57, 36, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              {/* Header: STT + Code + Status + Actions */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    background: '#5D3B32',
                                    color: '#FFFFFF',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {globalIdx + 1}
                                  </span>
                                  <span style={{ fontWeight: '800', color: '#5D3B32', fontSize: '0.82rem' }}>
                                    {item.code || `KPI${String(globalIdx + 1).padStart(2, '0')}`}
                                  </span>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.65rem',
                                    fontWeight: '800',
                                    backgroundColor: '#ECFDF5',
                                    color: '#059669',
                                    border: '1px solid #A7F3D0'
                                  }}>
                                    {item.status || 'Áp dụng'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => { setEditingTarget(item); setIsTargetModalOpen(true); }}
                                    style={{ border: 'none', background: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: '700' }}
                                    title="Sửa"
                                  >
                                    <Edit2 size={12} /> Sửa
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeleteConfirm(item)}
                                    style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: '700' }}
                                    title="Xóa"
                                  >
                                    <Trash2 size={12} /> Xóa
                                  </button>
                                </div>
                              </div>

                              {/* Title */}
                              <div style={{ fontWeight: '800', color: '#1E293B', fontSize: '0.86rem', lineHeight: '1.4' }}>
                                {item.name}
                              </div>

                              {/* Calc Method */}
                              <div style={{
                                backgroundColor: '#FAF6F0',
                                border: '1px solid #EADCC9',
                                color: '#5D3B32',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                lineHeight: '1.35'
                              }}>
                                <span style={{ fontWeight: '800', color: '#7B5233' }}>Cách tính: </span>
                                {getCalcMethodLabel(item.calc_method || item.description)}
                              </div>

                              {/* Key Metrics */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1.3fr 1fr',
                                gap: '6px',
                                paddingTop: '6px',
                                borderTop: '1px dashed #EADCC9',
                                alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: '700' }}>Tỷ Trọng</div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#5D3B32' }}>{item.weight || '20%'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: '700' }}>Mục Tiêu Đạt</div>
                                  <span style={{
                                    backgroundColor: '#F0FDF4',
                                    border: '1px solid #BBF7D0',
                                    color: '#15803D',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '800',
                                    display: 'inline-block',
                                    fontSize: '0.72rem'
                                  }}>
                                    {item.target || item.standard || '>= 98%'}
                                  </span>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: '700' }}>Tần Suất</div>
                                  <span style={{
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    color: '#475569',
                                    display: 'inline-block'
                                  }}>
                                    {item.unit && item.unit !== '%' ? item.unit : 'Hàng tháng'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', tableLayout: 'fixed' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ backgroundColor: '#FAF6F0', color: '#5D3B32', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                          <th style={{ padding: '8px 6px', fontWeight: '800', width: '40px', textAlign: 'center' }}>STT</th>
                          <th style={{ padding: '8px 8px', fontWeight: '800', width: '80px', textAlign: 'center' }}>Mã KPI</th>
                          <th style={{ padding: '8px 12px', fontWeight: '800', width: '32%' }}>Tên Chỉ Số KPI Công Việc</th>
                          <th style={{ padding: '8px 12px', fontWeight: '800', width: '38%' }}>Công Thức / Cách Tính</th>
                          <th style={{ padding: '8px 6px', fontWeight: '800', textAlign: 'center', width: '75px' }}>Tỷ Trọng</th>
                          <th style={{ padding: '8px 8px', fontWeight: '800', textAlign: 'center', width: '100px' }}>Mục Tiêu Đạt</th>
                          <th style={{ padding: '8px 8px', fontWeight: '800', textAlign: 'center', width: '95px' }}>Tần Suất</th>
                          <th style={{ padding: '8px 8px', fontWeight: '800', textAlign: 'center', width: '95px' }}>Trạng Thái</th>
                          <th style={{ padding: '8px 6px', fontWeight: '800', textAlign: 'center', width: '80px' }}>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (indicatorPage - 1) * indicatorPageSize + idx;
                          return (
                            <tr
                              key={item.id || idx}
                              style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}
                            >
                              <td style={{ padding: '8px 6px', fontWeight: '700', color: '#64748B', textAlign: 'center' }}>{globalIdx + 1}</td>
                              <td style={{ padding: '8px 8px', fontWeight: '800', color: '#5D3B32', textAlign: 'center' }}>{item.code || `KPI${String(globalIdx + 1).padStart(2, '0')}`}</td>
                              <td style={{ padding: '8px 12px', fontWeight: '700', color: '#1E293B', wordBreak: 'break-word', lineHeight: '1.4' }}>{item.name}</td>
                              <td style={{ padding: '8px 12px', color: '#334155', fontWeight: '500', lineHeight: '1.45', wordBreak: 'break-word' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: '#FAF6F0',
                                  border: '1px solid #EADCC9',
                                  color: '#5D3B32',
                                  padding: '4px 9px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: '700'
                                }}>
                                  {getCalcMethodLabel(item.calc_method || item.description)}
                                </span>
                              </td>
                              <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '800', color: '#5D3B32' }}>{item.weight || '20%'}</td>
                              <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', display: 'inline-block', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                  {item.target || item.standard || '>= 98%'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 8px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>
                                <span style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                  {item.unit && item.unit !== '%' ? item.unit : 'Hàng tháng'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '800',
                                  backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', whiteSpace: 'nowrap', display: 'inline-block'
                                }}>
                                  {item.status || 'Áp dụng'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => { setEditingTarget(item); setIsTargetModalOpen(true); }}
                                    style={{ border: 'none', background: '#E0F2FE', color: '#0369A1', padding: '4px 7px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    title="Sửa"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeleteConfirm(item)}
                                    style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 7px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    title="Xóa"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {renderPaginationControl(indicatorPage, setIndicatorPage, indicatorPageSize, filterAndSortData(workIndicators, indicatorSearch).length, 'chỉ số')}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CHECKLIST CÔNG VIỆC                                                */}
        {/* ========================================================================= */}
        {activeTab === 'checklist_work' && (
          <div className="kpi-tab-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            
            {/* TOP 3 CARDS matching Mockup Screen 3 */}
            <div className="kpi-checklist-top-cards" style={{ flexShrink: 0 }}>
              
              {/* Card 1: Điểm KPI Trung bình */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748B' }}>
                  Điểm KPI Trung bình
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#5D3B32', lineHeight: 1 }}>25</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#94A3B8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', backgroundColor: '#D97706', borderRadius: '3px' }}></div>
                </div>
              </div>

              {/* Card 2: Lỗi vi phạm mới nhất */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5D3B32', marginBottom: '6px' }}>
                  Lỗi vi phạm mới nhất
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    { label: 'Tăng ca', score: '100/100' },
                    { label: 'Về sớm', score: '100/100' },
                    { label: 'Vào trễ', score: '100/100' }
                  ].map((err, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#7B5233', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800' }}>
                      <span>{err.label}</span>
                      <span>{err.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Tổng số lỗi phát sinh trong năm */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5D3B32', marginBottom: '6px' }}>
                  Tổng số lỗi phát sinh trong năm
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '55px', paddingBottom: '2px' }}>
                  {[
                    { m: 'T1', h: '40%' }, { m: 'T2', h: '60%' }, { m: 'T3', h: '50%' },
                    { m: 'T4', h: '75%' }, { m: 'T5', h: '45%' }, { m: 'T6', h: '90%' },
                    { m: 'T7', h: '65%' }, { m: 'T8', h: '35%' }, { m: 'T9', h: '80%' },
                    { m: 'T10', h: '50%' }, { m: 'T11', h: '70%' }, { m: 'T12', h: '95%' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flex: 1 }}>
                      <div style={{ width: '10px', height: item.h, backgroundColor: '#5D3B32', borderRadius: '2px 2px 0 0' }}></div>
                      <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: '700' }}>{item.m}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* TABLE / CARD VIEW WITH SEARCH & FILTER */}
            <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div className="kpi-mgmt-table-header" style={{ flexShrink: 0, padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <TableControlToolbar
                  searchValue={checklistSearch}
                  onSearchChange={(e) => setChecklistSearch(e.target.value)}
                  placeholder="Tìm nội dung checklist..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(allChecklists, checklistSearch).filter(item => selectedChecklistDept === 'ALL' || item.department_code === selectedChecklistDept), 'Checklist_Cong_Viec')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={handleAddDashboardChecklist}
                  className="kpi-btn-add-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Thêm Checklist mới
                </button>
              </div>

              {/* BAR BỘ LỌC BỘ PHẬN QLCL - NẰM TRONG BỘ LỌC PHỄU (filterOpen) - COMPACT GỖ NÂU */}
              {filterOpen && (
                <div style={{ flexShrink: 0, padding: '6px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '800', color: '#5D3B32' }}>Bộ phận phụ trách:</span>
                  <select
                    value={selectedChecklistDept}
                    onChange={(e) => { setSelectedChecklistDept(e.target.value); setChecklistPage(1); }}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      border: '1px solid #EADCC9',
                      backgroundColor: '#FFFFFF',
                      color: '#5D3B32',
                      fontWeight: '700',
                      fontSize: '0.72rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {qlclDepartmentsList.map(dept => (
                      <option key={dept.code} value={dept.code}>{dept.name}</option>
                    ))}
                  </select>
                  <RenderPageSizeSelect pageSize={checklistPageSize} setPageSize={setChecklistPageSize} setCurrentPage={setChecklistPage} />
                </div>
              )}

              <div className="admin-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: isMobile ? 'hidden' : 'auto' }}>
                {(() => {
                  const filtered = filterAndSortData(allChecklists, checklistSearch)
                    .filter(item => selectedChecklistDept === 'ALL' || item.department_code === selectedChecklistDept);
                  const paged = filtered.slice((checklistPage - 1) * checklistPageSize, checklistPage * checklistPageSize);

                  if (isMobile) {
                    return (
                      <div className="kpi-mobile-cards-container" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {paged.map((item, idx) => {
                          const globalIdx = (checklistPage - 1) * checklistPageSize + idx;
                          const badge = getDeptBadgeStyle(item.department_code);
                          return (
                            <div
                              key={item.id || idx}
                              className="kpi-data-mobile-card"
                              style={{
                                background: idx % 2 === 0 ? '#FFFFFF' : '#FFFDFB',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                padding: '10px 12px',
                                boxShadow: '0 1px 4px rgba(91, 57, 36, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              {/* Header: STT + Task Code + Dept Badge + Actions */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    background: '#5D3B32',
                                    color: '#FFFFFF',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {globalIdx + 1}
                                  </span>
                                  <span style={{ fontWeight: '800', color: '#5D3B32', fontSize: '0.82rem' }}>
                                    {item.task_code || item.code || `CL-00${globalIdx + 1}`}
                                  </span>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    backgroundColor: badge.bg,
                                    color: badge.color,
                                    border: `1px solid ${badge.border}`
                                  }}>
                                    {badge.label}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => handleEditDashboardChecklist(item)}
                                    style={{
                                      border: '1px solid #EADCC9',
                                      background: '#FFFFFF',
                                      color: '#5D3B32',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontWeight: '700',
                                      fontSize: '0.72rem'
                                    }}
                                    title="Chỉnh sửa"
                                  >
                                    <Edit2 size={12} /> Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDashboardChecklist(item)}
                                    style={{
                                      border: '1px solid #FCA5A5',
                                      background: '#FEF2F2',
                                      color: '#DC2626',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontWeight: '700',
                                      fontSize: '0.72rem'
                                    }}
                                    title="Xóa công việc"
                                  >
                                    <Trash2 size={12} /> Xóa
                                  </button>
                                </div>
                              </div>

                              {/* Body: Nội dung Checklist công việc */}
                              <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '0.85rem', lineHeight: '1.45' }}>
                                {item.content}
                              </div>

                              {/* Footer: Tần suất thực hiện */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '6px',
                                borderTop: '1px dashed #EADCC9',
                                fontSize: '0.72rem'
                              }}>
                                <span style={{ color: '#64748B', fontWeight: '600' }}>Tần suất thực hiện:</span>
                                <span style={{
                                  backgroundColor: '#FAF6F0',
                                  border: '1px solid #EADCC9',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                  color: '#5D3B32'
                                }}>
                                  {item.frequency || 'Hàng ngày'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ backgroundColor: '#FAF6F0', color: '#5D3B32', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '50px', textAlign: 'center' }}>STT</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '100px' }}>Mã CV</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '110px' }}>Bộ phận</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800' }}>Nội dung Checklist công việc</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '140px' }}>Tần suất thực hiện</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '110px' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((item, idx) => {
                          const globalIdx = (checklistPage - 1) * checklistPageSize + idx;
                          const badge = getDeptBadgeStyle(item.department_code);
                          return (
                            <tr
                              key={item.id || idx}
                              style={{ borderBottom: '1px solid #EADCC9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}
                            >
                              <td style={{ padding: '8px 10px', fontWeight: '700', color: '#64748B', textAlign: 'center' }}>{globalIdx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.task_code || item.code || `CL-00${globalIdx + 1}`}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700',
                                  backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`
                                }}>
                                  {badge.label}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#1E293B', fontSize: '0.82rem' }}>{item.content}</td>
                              <td style={{ padding: '8px 10px', color: '#475569', fontWeight: '600' }}>{item.frequency || 'Hàng ngày'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleEditDashboardChecklist(item)}
                                    style={{ border: '1px solid #EADCC9', background: '#FFFFFF', color: '#5D3B32', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600', fontSize: '0.7rem' }}
                                    title="Chỉnh sửa"
                                  >
                                    <Edit2 size={12} /> Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDashboardChecklist(item)}
                                    style={{ border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600', fontSize: '0.7rem' }}
                                    title="Xóa công việc"
                                  >
                                    <Trash2 size={12} /> Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {renderPaginationControl(checklistPage, setChecklistPage, checklistPageSize, filterAndSortData(allChecklists, checklistSearch).filter(item => selectedChecklistDept === 'ALL' || item.department_code === selectedChecklistDept).length, 'checklists')}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DANH SÁCH VI PHẠM                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'violations_list' && (
          <div className="kpi-tab-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            
            {/* TOP 2 CARDS matching Mockup Screen 4 */}
            <div className="kpi-violations-top-cards" style={{ flexShrink: 0 }}>
              
              {/* Card 1: Số vụ vi phạm trong tháng */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748B' }}>
                  Số vụ vi phạm trong tháng
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', margin: '6px 0' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#5D3B32', lineHeight: 1 }}>25</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#94A3B8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', backgroundColor: '#D97706', borderRadius: '3px' }}></div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.7rem', fontWeight: '800', color: '#5D3B32' }}>
                  <span>12 Lỗi nặng</span>
                  <span>76 (80.5%)</span>
                </div>
              </div>

              {/* Card 2: Tỉ lệ vi phạm qua các tháng */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5D3B32', marginBottom: '8px' }}>
                  Tỉ lệ vi phạm qua các tháng
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '65px', paddingBottom: '2px' }}>
                  {[
                    { m: 'Thg 1', h: '85%' }, { m: 'Thg 2', h: '60%' }, { m: 'Thg 3', h: '75%' },
                    { m: 'Thg 4', h: '40%' }, { m: 'Thg 5', h: '80%' }, { m: 'Thg 6', h: '30%' },
                    { m: 'Thg 7', h: '65%' }, { m: 'Thg 8', h: '85%' }, { m: 'Thg 9', h: '90%' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                      <div style={{ width: '14px', height: item.h, backgroundColor: '#5D3B32', borderRadius: '2px 2px 0 0' }}></div>
                      <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: '700' }}>{item.m}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* TABLE / CARD VIEW WITH SEARCH & FILTER */}
            <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div className="kpi-mgmt-table-header" style={{ flexShrink: 0, padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <TableControlToolbar
                  searchValue={violationSearch}
                  onSearchChange={(e) => setViolationSearch(e.target.value)}
                  placeholder="Tìm vi phạm..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(violations, violationSearch), 'Danh_Sach_Vi_Pham')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => handleOpenViolationModal(null)}
                  className="kpi-btn-add-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Thêm mới
                </button>
              </div>

              {filterOpen && (
                <div style={{ flexShrink: 0, padding: '6px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '800', color: '#5D3B32' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid ' + (filterStatus === opt ? '#5D3B32' : '#EADCC9'),
                        backgroundColor: filterStatus === opt ? '#5D3B32' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#5D3B32',
                        fontWeight: filterStatus === opt ? '800' : '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                  <RenderPageSizeSelect pageSize={violationPageSize} setPageSize={setViolationPageSize} setCurrentPage={setViolationPage} />
                </div>
              )}

              <div className="admin-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: isMobile ? 'hidden' : 'auto' }}>
                {(() => {
                  const allData = filterAndSortData(violations, violationSearch);
                  const pagedData = allData.slice((violationPage - 1) * violationPageSize, violationPage * violationPageSize);

                  if (isMobile) {
                    return (
                      <div className="kpi-mobile-cards-container" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (violationPage - 1) * violationPageSize + idx;
                          const isSevere = Math.abs(item.score) >= 15;
                          return (
                            <div
                              key={item.id || idx}
                              className="kpi-data-mobile-card"
                              style={{
                                background: idx % 2 === 0 ? '#FFFFFF' : '#FFFDFB',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                padding: '10px 12px',
                                boxShadow: '0 1px 4px rgba(91, 57, 36, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    background: '#5D3B32',
                                    color: '#FFFFFF',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {globalIdx + 1}
                                  </span>
                                  <span style={{ fontWeight: '800', color: '#5D3B32', fontSize: '0.82rem' }}>
                                    {item.code} • {item.emp}
                                  </span>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: '800',
                                    backgroundColor: isSevere ? '#FEE2E2' : '#FEF3C7',
                                    color: isSevere ? '#DC2626' : '#B45309'
                                  }}>
                                    {isSevere ? 'Nặng' : 'Vừa'}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleOpenViolationModal(item)}
                                  style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: '700' }}
                                >
                                  <Eye size={12} /> Chi tiết
                                </button>
                              </div>

                              <div style={{ color: '#DC2626', fontWeight: '700', fontSize: '0.85rem' }}>
                                {item.rule}
                              </div>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '6px',
                                borderTop: '1px dashed #EADCC9',
                                fontSize: '0.72rem'
                              }}>
                                <span style={{ fontWeight: '900', color: '#DC2626' }}>Điểm trừ: {item.score} điểm</span>
                                <span style={{ color: '#64748B', fontWeight: '600' }}>{formatCompactDate(item.date)}</span>
                                <span style={{ color: '#475569' }}>{item.reporter}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ backgroundColor: '#FAF6F0', color: '#5D3B32', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '140px', whiteSpace: 'nowrap' }}>Mã NV / Họ tên</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '180px', whiteSpace: 'nowrap' }}>Hành vi vi phạm</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '110px', whiteSpace: 'nowrap' }}>Mức độ vi phạm</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '85px', whiteSpace: 'nowrap' }}>Điểm trừ</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '105px', whiteSpace: 'nowrap' }}>Ngày vi phạm</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '130px', whiteSpace: 'nowrap' }}>Người ghi nhận</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '80px', whiteSpace: 'nowrap' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (violationPage - 1) * violationPageSize + idx;
                          return (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                              <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{globalIdx + 1}</td>
                              <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.code} • {item.emp}</td>
                              <td style={{ padding: '5px 10px', color: '#DC2626', fontWeight: '600' }}>{item.rule}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                                  backgroundColor: Math.abs(item.score) >= 15 ? '#FEE2E2' : '#FEF3C7',
                                  color: Math.abs(item.score) >= 15 ? '#DC2626' : '#B45309'
                                }}>
                                  {Math.abs(item.score) >= 15 ? 'Nặng' : 'Vừa'}
                                </span>
                              </td>
                              <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: '900', color: '#DC2626' }}>{item.score} điểm</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center', color: '#64748B', whiteSpace: 'nowrap', fontWeight: '600' }}>{formatCompactDate(item.date)}</td>
                              <td style={{ padding: '5px 10px', color: '#475569' }}>{item.reporter}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleOpenViolationModal(item)}
                                  style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                  title="Xem chi tiết / Chỉnh sửa"
                                >
                                  <Eye size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {renderPaginationControl(violationPage, setViolationPage, violationPageSize, filterAndSortData(violations, violationSearch).length, 'vi phạm')}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: KẾ HOẠCH ĐÀO TẠO                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'training_plan' && (
          <div className="kpi-tab-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            
            <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div className="kpi-mgmt-table-header" style={{ flexShrink: 0, padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <TableControlToolbar
                  searchValue={trainingSearch}
                  onSearchChange={(e) => setTrainingSearch(e.target.value)}
                  placeholder="Tìm khóa đào tạo..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(trainingPlans, trainingSearch), 'Ke_Hoach_Dao_Tao')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => setIsTrainingModalOpen(true)}
                  className="kpi-btn-add-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Tạo kế hoạch đào tạo
                </button>
              </div>

              {filterOpen && (
                <div style={{ flexShrink: 0, padding: '6px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '800', color: '#5D3B32' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid ' + (filterStatus === opt ? '#5D3B32' : '#EADCC9'),
                        backgroundColor: filterStatus === opt ? '#5D3B32' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#5D3B32',
                        fontWeight: filterStatus === opt ? '800' : '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                  <RenderPageSizeSelect pageSize={trainingPageSize} setPageSize={setTrainingPageSize} setCurrentPage={setTrainingPage} />
                </div>
              )}

              <div className="admin-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: isMobile ? 'hidden' : 'auto' }}>
                {(() => {
                  const allData = filterAndSortData(trainingPlans, trainingSearch);
                  const pagedData = allData.slice((trainingPage - 1) * trainingPageSize, trainingPage * trainingPageSize);

                  if (isMobile) {
                    return (
                      <div className="kpi-mobile-cards-container" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (trainingPage - 1) * trainingPageSize + idx;
                          return (
                            <div
                              key={item.id || idx}
                              onClick={() => handleOpenTrainingDetail(item)}
                              className="kpi-data-mobile-card"
                              style={{
                                background: idx % 2 === 0 ? '#FFFFFF' : '#FFFDFB',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                padding: '10px 12px',
                                boxShadow: '0 1px 4px rgba(91, 57, 36, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    background: '#5D3B32',
                                    color: '#FFFFFF',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {globalIdx + 1}
                                  </span>
                                  <span style={{ fontWeight: '800', color: '#5D3B32', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                    {item.code}
                                  </span>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '800',
                                    backgroundColor: item.status === 'Đã hoàn thành' ? '#DCFCE7' : '#FEF3C7',
                                    color: item.status === 'Đã hoàn thành' ? '#15803D' : '#B45309',
                                    display: 'inline-flex', alignItems: 'center', gap: '3px'
                                  }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.status === 'Đã hoàn thành' ? '#15803D' : '#D97706' }} />
                                    {item.status}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenTrainingDetail(item); }}
                                    style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Xem chi tiết"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditTrainingPlan(item); }}
                                    style={{ border: 'none', background: '#FEF3C7', color: '#D97706', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Chỉnh sửa"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenDeleteTrainingConfirm(item); }}
                                    style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Xóa khóa học"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              <div style={{ fontWeight: '800', color: '#1E293B', fontSize: '0.86rem' }}>
                                {item.name}
                              </div>

                              <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                <span style={{ fontWeight: '700', color: '#5D3B32' }}>Đối tượng: </span>
                                {item.target || 'Tất cả nhân sự QLCL'}
                              </div>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '6px',
                                borderTop: '1px dashed #EADCC9',
                                fontSize: '0.72rem'
                              }}>
                                <span><strong style={{ color: '#5D3B32' }}>Thời gian:</strong> {formatCompactDate(item.time)}</span>
                                <span><strong style={{ color: '#5D3B32' }}>GV:</strong> {item.teacher}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ backgroundColor: '#FAF6F0', color: '#5D3B32', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '110px', whiteSpace: 'nowrap' }}>Mã Khóa</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '160px', whiteSpace: 'nowrap' }}>Tên Chương Trình Đào Tạo</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '190px', whiteSpace: 'nowrap' }}>Đối Tượng Tham Gia</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '105px', whiteSpace: 'nowrap' }}>Thời Gian</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '140px', whiteSpace: 'nowrap' }}>Giảng Viên</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '180px', whiteSpace: 'nowrap' }}>Tài Liệu Đính Kèm</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '115px', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '95px', whiteSpace: 'nowrap' }}>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (trainingPage - 1) * trainingPageSize + idx;
                          return (
                            <tr
                              key={item.id || idx}
                              onClick={() => handleOpenTrainingDetail(item)}
                              style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0', cursor: 'pointer' }}
                            >
                              <td style={{ padding: '6px 10px', fontWeight: '700', color: '#64748B', textAlign: 'center', whiteSpace: 'nowrap' }}>{globalIdx + 1}</td>
                              <td style={{ padding: '6px 10px', fontWeight: '800', color: '#5D3B32', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{item.code}</td>
                              <td style={{ padding: '6px 10px', fontWeight: '700', color: '#1E293B' }}>{item.name}</td>
                              <td style={{ padding: '6px 10px', color: '#475569', fontWeight: '500' }}>
                                {(() => {
                                  if (!item.target) return 'Tất cả nhân sự QLCL';
                                  const list = item.target.split(',').map(s => s.trim()).filter(Boolean);
                                  if (list.length <= 2) return item.target;
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span>{list[0]}, {list[1]}</span>
                                      <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700', border: '1px solid #BFDBFE', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                        +{list.length - 2} nhân sự khác
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748B', whiteSpace: 'nowrap', fontWeight: '600' }}>{formatCompactDate(item.time)}</td>
                              <td style={{ padding: '6px 10px', color: '#334155', whiteSpace: 'nowrap', fontWeight: '600' }}>{item.teacher}</td>
                              <td style={{ padding: '6px 10px' }}>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTrainingDetail(item);
                                  }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563EB', fontWeight: '700', cursor: 'pointer', maxWidth: '280px' }}
                                  title="Nhấn để xem danh sách tài liệu"
                                >
                                  <ExternalLink size={12} style={{ flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {(() => {
                                      const filesArr = Array.isArray(item.files) && item.files.length > 0 ? item.files : (item.fileName ? item.fileName.split(',').map(n => ({ name: n.trim() })) : []);
                                      if (filesArr.length === 0) return 'Chưa có file';
                                      if (filesArr.length === 1) return filesArr[0].name;
                                      return `${filesArr[0].name} (+${filesArr.length - 1} file đính kèm)`;
                                    })()}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800',
                                  backgroundColor: item.status === 'Đã hoàn thành' ? '#DCFCE7' : '#FEF3C7',
                                  color: item.status === 'Đã hoàn thành' ? '#15803D' : '#B45309',
                                  display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                                }}>
                                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.status === 'Đã hoàn thành' ? '#15803D' : '#D97706' }} />
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenTrainingDetail(item); }}
                                    style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Xem chi tiết"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditTrainingPlan(item); }}
                                    style={{ border: 'none', background: '#FEF3C7', color: '#D97706', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Chỉnh sửa"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenDeleteTrainingConfirm(item); }}
                                    style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Xóa khóa học"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {renderPaginationControl(trainingPage, setTrainingPage, trainingPageSize, filterAndSortData(trainingPlans, trainingSearch).length, 'khóa học')}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: BÁO CÁO VÀ BBCH                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'reports_bbch' && (
          <div className="kpi-tab-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            
            <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div className="kpi-mgmt-table-header" style={{ flexShrink: 0, padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <TableControlToolbar
                  searchValue={reportSearch}
                  onSearchChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Tìm báo cáo..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(staffEvaluations, reportSearch), 'Bao_Cao_BBCH')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#16A34A' }}>
                  ✓ Đồng bộ tự động qua API /staff-evaluation
                </span>
              </div>

              {filterOpen && (
                <div style={{ flexShrink: 0, padding: '6px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#5D3B32' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid ' + (filterStatus === opt ? '#5D3B32' : '#EADCC9'),
                        backgroundColor: filterStatus === opt ? '#5D3B32' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#5D3B32',
                        fontWeight: filterStatus === opt ? '800' : '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                  <RenderPageSizeSelect pageSize={reportPageSize} setPageSize={setReportPageSize} setCurrentPage={setReportPage} />
                </div>
              )}

              <div className="admin-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: isMobile ? 'hidden' : 'auto' }}>
                {(() => {
                  const allData = filterAndSortData(staffEvaluations, reportSearch);
                  const pagedData = allData.slice((reportPage - 1) * reportPageSize, reportPage * reportPageSize);

                  if (isMobile) {
                    return (
                      <div className="kpi-mobile-cards-container" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (reportPage - 1) * reportPageSize + idx;
                          return (
                            <div
                              key={item.id || idx}
                              className="kpi-data-mobile-card"
                              style={{
                                background: idx % 2 === 0 ? '#FFFFFF' : '#FFFDFB',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                padding: '10px 12px',
                                boxShadow: '0 1px 4px rgba(91, 57, 36, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    background: '#5D3B32',
                                    color: '#FFFFFF',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {globalIdx + 1}
                                  </span>
                                  <span style={{ fontWeight: '800', color: '#5D3B32', fontSize: '0.82rem' }}>
                                    {item.code || `BC_${String(globalIdx + 1).padStart(2, '0')}`}
                                  </span>
                                  <span style={{ fontWeight: '700', color: '#1E293B', fontSize: '0.82rem' }}>
                                    • {item.emp || item.name}
                                  </span>
                                </div>
                                <span style={{ fontWeight: '900', color: '#15803D', fontSize: '0.82rem' }}>
                                  {item.eval_score || item.score || 92} điểm
                                </span>
                              </div>

                              <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                                <span style={{ fontWeight: '700', color: '#5D3B32' }}>Bộ phận: </span>{item.dept || 'Phòng QA/QC'}
                              </div>

                              <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: '500', lineHeight: '1.4' }}>
                                {item.manager_note || item.note || 'Hoàn thành nhiệm vụ được giao'}
                              </div>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '6px',
                                borderTop: '1px dashed #EADCC9',
                                fontSize: '0.72rem'
                              }}>
                                <span style={{ fontWeight: '700', color: '#0284C7' }}>{item.bbch_code || `BBCH-2026-${String(globalIdx + 1).padStart(2, '0')}`}</span>
                                <span style={{ color: '#64748B' }}>{item.date || '01/03/2026'}</span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800',
                                  backgroundColor: (item.status === 'Đã phê duyệt' || item.status === 'Hoàn thành') ? '#DCFCE7' : '#FEF3C7',
                                  color: (item.status === 'Đã phê duyệt' || item.status === 'Hoàn thành') ? '#15803D' : '#B45309'
                                }}>
                                  {item.status || 'Đã phê duyệt'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ backgroundColor: '#FAF6F0', color: '#5D3B32', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '110px', whiteSpace: 'nowrap' }}>Mã Báo Cáo</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '130px', whiteSpace: 'nowrap' }}>Nhân Viên</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '120px', whiteSpace: 'nowrap' }}>Bộ Phận</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '200px', whiteSpace: 'nowrap' }}>Nhận Xét Đánh Giá Quản Lý</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '110px', whiteSpace: 'nowrap' }}>Điểm Đánh Giá</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '140px', whiteSpace: 'nowrap' }}>Mã BBCH Khắc Phục</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '105px', whiteSpace: 'nowrap' }}>Ngày Lập</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '110px', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (reportPage - 1) * reportPageSize + idx;
                          return (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                              <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{globalIdx + 1}</td>
                              <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.code || `BC_${String(globalIdx + 1).padStart(2, '0')}`}</td>
                              <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1E293B' }}>{item.emp || item.name}</td>
                              <td style={{ padding: '5px 10px', color: '#475569' }}>{item.dept || 'Phòng QA/QC'}</td>
                              <td style={{ padding: '5px 10px', color: '#334155' }}>{item.manager_note || item.note || 'Hoàn thành nhiệm vụ được giao'}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: '900', color: '#15803D' }}>{item.eval_score || item.score || 92} điểm</td>
                              <td style={{ padding: '5px 10px', fontWeight: '700', color: '#0284C7' }}>{item.bbch_code || `BBCH-2026-${String(globalIdx + 1).padStart(2, '0')}`}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center', color: '#64748B' }}>{item.date || '01/03/2026'}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                                  backgroundColor: (item.status === 'Đã phê duyệt' || item.status === 'Hoàn thành') ? '#DCFCE7' : '#FEF3C7',
                                  color: (item.status === 'Đã phê duyệt' || item.status === 'Hoàn thành') ? '#15803D' : '#B45309'
                                }}>
                                  {item.status || 'Đã phê duyệt'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {renderPaginationControl(reportPage, setReportPage, reportPageSize, filterAndSortData(staffEvaluations, reportSearch).length, 'báo cáo')}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: THIẾT LẬP CẢNH BÁO                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'alerts_setup' && (
          <div className="kpi-tab-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            
            <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div className="kpi-mgmt-table-header" style={{ flexShrink: 0, padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <TableControlToolbar
                  searchValue={alertSearch}
                  onSearchChange={(e) => setAlertSearch(e.target.value)}
                  placeholder="Tìm cảnh báo..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(alertsList, alertSearch), 'Thiet_Lap_Canh_Bao')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => { setEditingAlert(null); setIsAlertModalOpen(true); }}
                  className="kpi-btn-add-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Send size={13} /> Bắn thông báo mới đến Mobile
                </button>
              </div>

              {filterOpen && (
                <div style={{ flexShrink: 0, padding: '6px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#5D3B32' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid ' + (filterStatus === opt ? '#5D3B32' : '#EADCC9'),
                        backgroundColor: filterStatus === opt ? '#5D3B32' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#5D3B32',
                        fontWeight: filterStatus === opt ? '800' : '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                  <RenderPageSizeSelect pageSize={alertPageSize} setPageSize={setAlertPageSize} setCurrentPage={setAlertPage} />
                </div>
              )}

              <div className="admin-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: isMobile ? 'hidden' : 'auto' }}>
                {(() => {
                  const allData = filterAndSortData(alertsList, alertSearch);
                  const pagedData = allData.slice((alertPage - 1) * alertPageSize, alertPage * alertPageSize);

                  if (isMobile) {
                    return (
                      <div className="kpi-mobile-cards-container" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (alertPage - 1) * alertPageSize + idx;
                          return (
                            <div
                              key={item.id || idx}
                              className="kpi-data-mobile-card"
                              style={{
                                background: idx % 2 === 0 ? '#FFFFFF' : '#FFFDFB',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                padding: '10px 12px',
                                boxShadow: '0 1px 4px rgba(91, 57, 36, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    background: '#5D3B32',
                                    color: '#FFFFFF',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {globalIdx + 1}
                                  </span>
                                  <span style={{ fontWeight: '800', color: '#5D3B32', fontSize: '0.82rem' }}>
                                    {item.code || `CB_${String(globalIdx + 1).padStart(2, '0')}`}
                                  </span>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800',
                                    backgroundColor: '#DCFCE7', color: '#15803D'
                                  }}>
                                    {item.status || 'Đã phát'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={() => handleEditAlert(item)}
                                    style={{ border: 'none', background: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', fontWeight: '700' }}
                                    title="Sửa"
                                  >
                                    <Edit2 size={12} /> Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAlert(item)}
                                    style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', fontWeight: '700' }}
                                    title="Xóa"
                                  >
                                    <Trash2 size={12} /> Xóa
                                  </button>
                                </div>
                              </div>

                              <div style={{ fontWeight: '800', color: '#1E293B', fontSize: '0.86rem' }}>
                                {item.title || item.name}
                              </div>

                              <div style={{ color: '#334155', fontSize: '0.75rem', lineHeight: '1.4' }}>
                                {item.content}
                              </div>

                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                <strong style={{ color: '#5D3B32' }}>Đối tượng:</strong> {item.receiver || 'Tất cả nhân sự'}
                              </div>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '6px',
                                borderTop: '1px dashed #EADCC9',
                                fontSize: '0.7rem',
                                color: '#64748B'
                              }}>
                                <span>{item.issuedAt || '03/09/2026 10:00'} → {item.expiresAt || '10/09/2026 17:00'}</span>
                                <span style={{ color: '#15803D', fontWeight: '800' }}>{calculateDuration(item.issuedAt, item.expiresAt) || '7 ngày'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ backgroundColor: '#FAF6F0', color: '#5D3B32', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', width: '110px', whiteSpace: 'nowrap' }}>Mã Cảnh Báo</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '150px', whiteSpace: 'nowrap' }}>Tiêu Đề Thông Báo</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '220px', whiteSpace: 'nowrap' }}>Nội Dung Phát Đến Banner Mobile App</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', minWidth: '130px', whiteSpace: 'nowrap' }}>Đối Tượng Nhận</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '115px', whiteSpace: 'nowrap' }}>Thời Gian Ban Hành</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '115px', whiteSpace: 'nowrap' }}>Thời Gian Kết Thúc</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '100px', whiteSpace: 'nowrap' }}>Tổng Thời Gian</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '105px', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                          <th style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'center', width: '80px', whiteSpace: 'nowrap' }}>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedData.map((item, idx) => {
                          const globalIdx = (alertPage - 1) * alertPageSize + idx;
                          return (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                              <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{globalIdx + 1}</td>
                              <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.code || `CB_${String(globalIdx + 1).padStart(2, '0')}`}</td>
                              <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1E293B' }}>{item.title || item.name}</td>
                              <td style={{ padding: '5px 10px', color: '#0F172A', fontWeight: '600', maxWidth: '320px' }}>{item.content}</td>
                              <td style={{ padding: '5px 10px', color: '#475569' }}>{item.receiver || 'Tất cả nhân sự'}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center', color: '#5D3B32', fontWeight: '700' }}>{item.issuedAt || item.date || '03/09/2026 10:00'}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center', color: '#DC2626', fontWeight: '700' }}>{item.expiresAt || '10/09/2026 17:00'}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center', color: '#15803D', fontWeight: '800' }}>{calculateDuration(item.issuedAt, item.expiresAt) || '7 ngày'}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center', color: '#16A34A', fontWeight: '800' }}>{item.status || 'Đã phát'}</td>
                              <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleEditAlert(item)}
                                    style={{ border: 'none', background: '#FEF3C7', color: '#D97706', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Chỉnh sửa"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAlert(item)}
                                    style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Xóa thông báo"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {renderPaginationControl(alertPage, setAlertPage, alertPageSize, filterAndSortData(alertsList, alertSearch).length, 'cảnh báo')}
            </div>

          </div>
        )}

      </div>

      {/* MODALS INTEGRATION */}
      
      {/* 1. Modal CL03.2 (KPITaskDetailModal) */}
      <KPITaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        taskData={selectedTaskData}
      />

      {/* 2. Modal CRUD KPI Target (KPITargetFormModal) */}
      <KPITargetFormModal
        isOpen={isTargetModalOpen}
        onClose={() => { setIsTargetModalOpen(false); setEditingTarget(null); }}
        targetData={editingTarget}
        onSave={handleSaveKpiTarget}
      />

      {/* 3. Modal Create/Edit Training Plan + Upload File (KPINewTrainingModal) */}
      <KPINewTrainingModal
        isOpen={isTrainingModalOpen}
        onClose={() => { setIsTrainingModalOpen(false); setEditingTrainingPlan(null); }}
        planData={editingTrainingPlan}
        onSave={handleSaveTrainingPlan}
      />

      {/* 3b. Modal View Detail Training Plan */}
      <KPITrainingDetailModal
        isOpen={isTrainingDetailModalOpen}
        onClose={() => { setIsTrainingDetailModalOpen(false); setSelectedTrainingPlan(null); }}
        planData={selectedTrainingPlan}
      />

      {/* 4. Modal Broadcast Alert to Mobile Banner (KPISendAlertModal) */}
      <KPISendAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => { setIsAlertModalOpen(false); setEditingAlert(null); }}
        alertData={editingAlert}
        onSend={handleSendAlert}
      />

      {/* 4b. Modal Form Ghi nhận / Xem chi tiết Biên bản Vi phạm QC (KPIViolationFormModal) */}
      <KPIViolationFormModal
        isOpen={isViolationModalOpen}
        onClose={() => { setIsViolationModalOpen(false); setEditingViolation(null); }}
        violationData={editingViolation}
        onSave={handleSaveViolation}
      />

      {/* 5. Custom Project Delete Confirmation Modal (BeautifulConfirmModal) */}
      <BeautifulConfirmModal
        isOpen={deleteConfirmState.isOpen}
        type="danger"
        title={
          deleteConfirmState.isTrainingPlan ? "Xác nhận xóa kế hoạch đào tạo"
          : deleteConfirmState.isAlert ? "Xác nhận xóa thông báo cảnh báo"
          : deleteConfirmState.isChecklist ? "Xác nhận xóa công việc checklist"
          : "Xác nhận xóa chỉ số KPI"
        }
        message={
          deleteConfirmState.isTrainingPlan 
            ? `Bạn có chắc chắn muốn xóa kế hoạch đào tạo "${deleteConfirmState.itemToDelete?.name || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi hệ thống không?`
            : deleteConfirmState.isAlert
            ? `Bạn có chắc chắn muốn xóa thông báo "${deleteConfirmState.itemToDelete?.title || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi hệ thống không?`
            : deleteConfirmState.isChecklist
            ? `Bạn có chắc chắn muốn xóa công việc checklist "${deleteConfirmState.itemToDelete?.content || ''}" khỏi hệ thống không?`
            : `Bạn có chắc chắn muốn xóa chỉ số KPI "${deleteConfirmState.itemToDelete?.name || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi Database hệ thống không?`
        }
        confirmText="Xóa dữ liệu"
        cancelText="Hủy bỏ"
        onConfirm={handleGeneralConfirmDelete}
        onClose={() => setDeleteConfirmState({ isOpen: false, itemToDelete: null, isTrainingPlan: false, isAlert: false, isChecklist: false })}
      />

      {/* 6. Custom Checklist React Modal Popup */}
      {isChecklistModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            width: '450px',
            maxWidth: '90%',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
              {editingChecklist ? 'Cập Nhật Công Việc Checklist' : 'Thêm Công Việc Checklist Mới'}
            </h3>

            <form onSubmit={handleSaveDashboardChecklist}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Nội dung / Nhiệm vụ Checklist <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kiểm tra 5S khu vực kiểm định..."
                  value={checklistFormData.content}
                  onChange={(e) => setChecklistFormData(prev => ({ ...prev, content: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Bộ phận / Vị trí phụ trách
                  </label>
                  <select
                    value={checklistFormData.department_code || 'IQC'}
                    onChange={(e) => setChecklistFormData(prev => ({ ...prev, department_code: e.target.value, employee_id: `NV_${e.target.value}_001` }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {qlclDepartmentsList.filter(d => d.code !== 'ALL').map(d => (
                      <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Cách theo dõi (Tần suất)
                  </label>
                  <select
                    value={checklistFormData.frequency}
                    onChange={(e) => setChecklistFormData(prev => ({ ...prev, frequency: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="Hàng ngày">Hàng ngày</option>
                    <option value="Theo ca">Theo ca</option>
                    <option value="Hàng tuần">Hàng tuần</option>
                    <option value="Hàng tháng">Hàng tháng</option>
                    <option value="Khi phát sinh">Khi phát sinh</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#7B5233', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  {editingChecklist ? 'Cập Nhật Database' : 'Tạo Mới Về Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Export Options Modal (Multi-option Excel Export) */}
      {showExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '500px',
            maxWidth: '95%',
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
                color: '#5D3B32',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#5D3B32', margin: '0 0 16px 0', borderBottom: '1px solid #EADCC9', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Lựa chọn xuất báo cáo Excel (.xlsx)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>

              {/* Option 1 */}
              <div
                onClick={() => setSelectedExportOption('current')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: selectedExportOption === 'current' ? '2px solid #5D3B32' : '1px solid #E2E8F0',
                  backgroundColor: selectedExportOption === 'current' ? '#FAF6F0' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input type="radio" checked={selectedExportOption === 'current'} readOnly style={{ marginTop: '3px', accentColor: '#5D3B32' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#1E293B', fontSize: '0.85rem' }}>1. Xuất danh sách hiện tại (Tab đang chọn)</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Xuất file Excel chứa dữ liệu của Tab hiện tại ({exportPendingData.data?.length || 0} bản ghi đã lọc).
                  </span>
                </div>
              </div>

              {/* Option 2 */}
              <div
                onClick={() => setSelectedExportOption('summary')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: selectedExportOption === 'summary' ? '2px solid #5D3B32' : '1px solid #E2E8F0',
                  backgroundColor: selectedExportOption === 'summary' ? '#FAF6F0' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input type="radio" checked={selectedExportOption === 'summary'} readOnly style={{ marginTop: '3px', accentColor: '#5D3B32' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#1E293B', fontSize: '0.85rem' }}>2. Báo cáo Tổng hợp KPI & Thống kê</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Tạo 2 Worksheets: Sheet 1 chứa Bảng Thống kê Tổng quan KPI + Sheet 2 chứa Chi tiết Tab hiện tại.
                  </span>
                </div>
              </div>

              {/* Option 3 */}
              <div
                onClick={() => setSelectedExportOption('full')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: selectedExportOption === 'full' ? '2px solid #5D3B32' : '1px solid #E2E8F0',
                  backgroundColor: selectedExportOption === 'full' ? '#FAF6F0' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input type="radio" checked={selectedExportOption === 'full'} readOnly style={{ marginTop: '3px', accentColor: '#5D3B32' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#1E293B', fontSize: '0.85rem' }}>3. Xuất toàn bộ Báo cáo (Tích hợp 7 Tab vào 1 File)</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Tải về 1 file Master Excel duy nhất chứa đầy đủ 7 Worksheets tương ứng với 7 Tab trên Dashboard.
                  </span>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleExecuteExport}
                disabled={isExporting}
                style={{
                  flex: 1,
                  backgroundColor: '#5D3B32',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  opacity: isExporting ? 0.7 : 1
                }}
              >
                <Download size={16} />
                {isExporting ? 'Đang khởi tạo file Excel...' : 'Tải xuống Báo cáo Excel'}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                style={{
                  backgroundColor: '#FAF6F0',
                  color: '#5D3B32',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontWeight: '700',
                  fontSize: '0.82rem',
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

export default QualityKPIDashboardView;
