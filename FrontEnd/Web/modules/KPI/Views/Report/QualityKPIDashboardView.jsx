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
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';

{/* Component thanh điều khiển chuẩn hóa: Ô Tìm kiếm + Icon A-Z Sort + Icon Filter + Nút Nâu [↑] Xuất dữ liệu */}
// Default Datasets for complete functional fallback
const defaultKpiTargets = [
  { id: 1, code: 'KPI-01', name: 'Tỷ lệ sản xuất đúng quy trình Sơn QC', target: '>= 98%', weight: '25%', unit: 'Hàng ngày', standard: 'Tiêu chuẩn ISO-9001', status: 'Áp dụng' },
  { id: 2, code: 'KPI-02', name: 'Kiểm soát tỷ lệ hàng lỗi Đóng gói', target: '<= 1.5%', weight: '20%', unit: 'Hàng tuần', standard: 'Đạt chuẩn 100%', status: 'Áp dụng' },
  { id: 3, code: 'KPI-03', name: 'Độ chính xác kiểm định Cưa xẻ phôi', target: '100%', weight: '20%', unit: 'Hàng ngày', standard: 'Sai số < 0.5mm', status: 'Áp dụng' },
  { id: 4, code: 'KPI-04', name: 'Thời gian xử lý Biên bản khắc phục (BBCH)', target: '<= 24h', weight: '15%', unit: 'Hàng tháng', standard: 'Phản hồi tức thì', status: 'Áp dụng' },
  { id: 5, code: 'KPI-05', name: 'Tỷ lệ hoàn thành Đào tạo An toàn & Chất lượng', target: '100%', weight: '20%', unit: 'Hàng tháng', standard: 'Chứng chỉ QA', status: 'Áp dụng' }
];

const defaultWorkIndicators = [
  { id: 1, code: 'KPI-IND-01', name: 'Kiểm soát tỷ lệ lỗi sơn UV & phủ bóng', dept: 'Tổ QC Sơn', target: '>= 98%', weight: '25%', unit: 'Hàng ngày', standard: 'Sai số < 1.0%', score: 98, status: 'Áp dụng' },
  { id: 2, code: 'KPI-IND-02', name: 'Tỷ lệ dán nhãn niêm phong & tem PASS đóng gói', dept: 'Tổ Đóng Gói', target: '100%', weight: '20%', unit: 'Hàng ngày', standard: 'Không bỏ sót kiện', score: 95, status: 'Áp dụng' },
  { id: 3, code: 'KPI-IND-03', name: 'Kiểm định kích thước & độ ẩm phôi gỗ cưa phôi', dept: 'Tổ Cưa Xẻ', target: '100%', weight: '20%', unit: 'Theo lô', standard: 'Độ ẩm 10-12%', score: 92, status: 'Áp dụng' },
  { id: 4, code: 'KPI-IND-04', name: 'Thời gian xử lý & nghiệm thu biên bản khắc phục BBCH', dept: 'Phòng QA/QC', target: '<= 24h', weight: '15%', unit: 'Hàng tuần', standard: 'Phản hồi tức thì', score: 88, status: 'Áp dụng' },
  { id: 5, code: 'KPI-IND-05', name: 'Tuân thủ quy trình kiểm định 5S & An toàn thiết bị', dept: 'Tổ QC Lắp Ráp', target: '>= 95%', weight: '20%', unit: 'Hàng tháng', standard: 'Đạt chuẩn 5S', score: 85, status: 'Áp dụng' }
];

const defaultChecklists = [
  { id: 1, code: 'CL-01', content: 'Kiểm tra độ ẩm gỗ trước khi vào lò sấy', frequency: 'Hàng ngày', status_today: 'Đã hoàn thành', last_run: '08:00 Today', result: 'Đạt (12% độ ẩm)', status: 'Đã hoàn thành' },
  { id: 2, code: 'CL-02', content: 'Kiểm tra độ bám dính lớp sơn phủ bóng', frequency: 'Hàng ngày', status_today: 'Đang thực hiện', last_run: '10:30 Today', result: 'Đang test Cross-cut', status: 'Chưa làm' },
  { id: 3, code: 'CL-03', content: 'Đo kích thước ván mộc cắt quy cách', frequency: 'Hàng tuần', status_today: 'Chưa làm', last_run: 'Hôm qua', result: 'Chờ kiểm định', status: 'Chưa làm' },
  { id: 4, code: 'CL-04', content: 'Vệ sinh và hiệu chuẩn thước kẹp Palmer', frequency: 'Hàng tuần', status_today: 'Đã hoàn thành', last_run: '07:30 Today', result: 'Đạt chuẩn 0.01mm', status: 'Đã hoàn thành' }
];

const defaultViolations = [
  { id: 1, code: 'VP-001', emp: 'Bùi Công Sự', rule: 'Bỏ qua bước đo độ ẩm phôi gỗ', score: -15, date: '01/09/2026', reporter: 'QC Lead', status: 'Đã duyệt' },
  { id: 2, code: 'VP-002', emp: 'Nguyễn Văn Nam', rule: 'Không dán tem PASS lên kiện đóng gói', score: -10, date: '31/08/2026', reporter: 'Trưởng ca Sơn', status: 'Chờ duyệt' },
  { id: 3, code: 'VP-003', emp: 'Trần Văn Hải', rule: 'Sai số kích thước khoan vượt ngưỡng 1mm', score: -20, date: '30/08/2026', reporter: 'Giám sát QA', status: 'Đã duyệt' }
];

const defaultTrainingPlans = [
  { id: 1, code: 'KH-DT01', name: 'Đào tạo Quy chuẩn Kiểm soát Sơn UV', target: 'Toàn bộ QC Sơn', time: '05/09/2026', teacher: 'Nguyễn Văn Minh (Trưởng QA)', fileName: 'Quy_trinh_Son_UV.pdf', status: 'Chờ xử lý' },
  { id: 2, code: 'KH-DT02', name: 'Hướng dẫn Sử dụng Máy đo độ ẩm Gỗ', target: 'Tổ QC Cưa phôi', time: '01/09/2026', teacher: 'Trần Thu Hà', fileName: 'Huong_dan_may_do_am.pdf', status: 'Đã hoàn thành' }
];

const defaultStaffEvaluations = [
  { id: 1, code: 'DG-2026-01', emp: 'Nguyễn Văn A', dept: 'Tổ QC Sơn', manager_note: 'Thực hiện xuất sắc quy trình kiểm định', eval_score: 95, bbch_code: 'BBCH-01', date: '01/09/2026', status: 'Đã phê duyệt' },
  { id: 2, code: 'DG-2026-02', emp: 'Trần Thị B', dept: 'Tổ Đóng Gói', manager_note: 'Cần chú ý tem nhãn niêm phong', eval_score: 85, bbch_code: 'BBCH-02', date: '30/08/2026', status: 'Chờ phê duyệt' }
];

const defaultAlertsList = [
  { id: 1, code: 'ALT-01', title: 'Hiển thị thông báo mới', content: "Bùi Công Sự đã giao 'APT8-48-GRY' (SL: 12). Mời bộ phận Sản xuất công đoạn Đóng Gói tiếp nhận.", channel: 'Mobile App Banner', receiver: 'Tổ Đóng Gói', date: '31/08/2026 08:30', status: 'Đã duyệt' },
  { id: 2, code: 'ALT-02', title: 'Cảnh báo vi phạm điểm KPI', content: 'Hệ thống ghi nhận 2 nhân sự có điểm vi phạm > 15 điểm trong tháng 8.', channel: 'App Mobile & Push Email', receiver: 'Ban Giám Đốc, Trưởng QC', date: '30/08/2026 16:45', status: 'Chờ xử lý' }
];

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
    <div style={{
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
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={13} style={{ position: 'absolute', left: '10px', color: '#94A3B8' }} />
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue || ''}
          onChange={onSearchChange}
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
        cleanRow[keyMap[key] || key] = item[key];
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
      ['1. Tổng Số Mục Tiêu Chất Lượng (KPI Targets)', defaultKpiTargets.length, 'Mục tiêu', 'Áp dụng 100%'],
      ['2. Tổng Số Nhân Sự Được Đánh Giá KPI', defaultWorkIndicators.length, 'Nhân sự', 'Đã duyệt 95%'],
      ['3. Tổng Số Công Việc Checklist Chất Lượng', defaultChecklists.length, 'Nhiệm vụ', 'Đang thực hiện'],
      ['4. Tổng Số Vi Phạm Ghi Nhận Từ Mobile App', defaultViolations.length, 'Biên bản', 'Chờ xử lý'],
      ['5. Tổng Kế Hoạch Đào Tạo An Toàn & QC', defaultTrainingPlans.length, 'Kế hoạch', 'Đã hoàn thành'],
      ['6. Tổng Báo Cáo Đánh Giá & BBCH Khắc Phục', defaultStaffEvaluations.length, 'Báo cáo', 'Phê duyệt 92%'],
      ['7. Tổng Cảnh Báo Phát Đến Mobile Banner', defaultAlertsList.length, 'Thông báo', 'Đã phát']
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
      { name: '🎯 Mục Tiêu KPI', data: defaultKpiTargets, suffix: 'Muc_Tieu_Chat_Luong', title: '1. BÁO CÁO MỤC TIÊU CHẤT LƯỢNG (KPI TARGETS)' },
      { name: '📊 Chỉ Số Nhân Sự', data: defaultWorkIndicators, suffix: 'Chi_So_Cong_Viec', title: '2. BÁO CÁO CHỈ SỐ CÔNG VIỆC NHÂN SỰ KPI' },
      { name: '📝 Checklist QC', data: defaultChecklists, suffix: 'Checklist_Cong_Viec', title: '3. CHECKLIST CÔNG VIỆC CHẤT LƯỢNG' },
      { name: '⚠️ Vi Phạm Mobile', data: defaultViolations, suffix: 'Danh_Sach_Vi_Pham', title: '4. DANH SÁCH VI PHẠM TỪ MOBILE APP' },
      { name: '🎓 Đào Tạo QC', data: defaultTrainingPlans, suffix: 'Ke_Hoach_Dao_Tao', title: '5. KẾ HOẠCH ĐÀO TẠO CHẤT LƯỢNG' },
      { name: '📋 Báo Cáo BBCH', data: defaultStaffEvaluations, suffix: 'Bao_Cao_BBCH', title: '6. BÁO CÁO ĐÁNH GIÁ & BIÊN BẢN KHẮC PHỤC (BBCH)' },
      { name: '🔔 Cảnh Báo Banner', data: defaultAlertsList, suffix: 'Thiet_Lap_Canh_Bao', title: '7. DỊCH VỤ CẢNH BÁO & PUSH MOBILE BANNER' }
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

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [checklistFormData, setChecklistFormData] = useState({ content: '', frequency: 'Hàng ngày', employee_id: 'NV_QLCL_004', status_today: 'Chưa làm' });

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

  // FETCH REAL DATA FROM DATABASE APIS
  const fetchDatabaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Violations from Mobile `/awards-discipline` in DB
      const awardsResp = await api.get('/awards-discipline/').catch(() => null);
      if (awardsResp && Array.isArray(awardsResp) && awardsResp.length > 0) {
        const mapped = awardsResp.map((v, idx) => ({
          id: v.id || idx + 1,
          code: v.code || `VP-2026-${String(v.id || idx + 1).padStart(3, '0')}`,
          emp: v.staff_name || v.employee_name || 'Nhân sự QC',
          dept: v.department || 'Tổ Sản Xuất',
          rule: v.issue || v.content || 'Lỗi quy trình QC',
          score: -Math.abs(v.points || 5),
          fine: v.fine_amount || (v.points ? v.points * 20000 : 100000),
          reporter: v.created_by || 'QC Mobile App',
          date: v.created_at || v.date || '25/08/2026',
          status: v.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'
        }));
        setViolations(mapped);

        // Update stats from DB if records exist
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
      if (kpiPoolResp && Array.isArray(kpiPoolResp) && kpiPoolResp.length > 0) {
        const mappedKpis = kpiPoolResp.map((k, idx) => ({
          id: k.id || idx + 1,
          code: k.kpi_code || `KPI${String(11 - idx).padStart(2, '0')}`,
          name: k.content,
          dept: 'Phòng QA/QC',
          target: k.target || '>= 98%',
          weight: '20%',
          unit: '%',
          status: 'Áp dụng'
        }));
        setKpiTargets(mappedKpis);
      }

      // 3. Fetch Staff Evaluations from DB `/staff-evaluation`
      const evalResp = await api.get('/staff-evaluation/').catch(() => null);
      if (evalResp && Array.isArray(evalResp) && evalResp.length > 0) {
        const mappedEvals = evalResp.map((e, idx) => ({
          id: e.id || idx + 1,
          code: `DG-2026-${String(e.id || idx + 1).padStart(2, '0')}`,
          emp: e.employee_name || e.staff_name || 'Nhân sự',
          dept: e.department || 'Phòng QA/QC',
          manager_note: e.note || e.content || 'Hoàn thành tốt nhiệm vụ',
          eval_score: e.score || 90,
          bbch_code: e.bbch_code || `BBCH-2026-0${idx + 1}`,
          date: e.date || '28/08/2026',
          status: 'Đã phê duyệt'
        }));
        setStaffEvaluations(mappedEvals);
      }

      // 4. Fetch Checklists / Training Plans from DB `/kpi-management/checklists`
      const checklistResp = await api.get('/kpi-management/checklists?employee_id=admin').catch(() => null);
      if (checklistResp && Array.isArray(checklistResp) && checklistResp.length > 0) {
        const mappedPlans = checklistResp.map((c, idx) => ({
          id: c.id !== undefined && c.id !== null ? c.id : idx + 1,
          code: c.task_code || `KH-ĐT-${String(idx + 1).padStart(2, '0')}`,
          name: c.content,
          target: 'Nhân viên QC & Tổ trưởng',
          time: c.last_performed || '15/09/2026',
          teacher: 'Phòng Đào Tạo',
          fileName: c.result || 'TaiLieu_DaoTao_QC.pdf',
          fileUrl: c.result ? (c.result.startsWith('http') ? c.result : getFullImageUrl(`/uploads/${c.result}`)) : null,
          status: c.status_today || 'Sắp diễn ra'
        }));
        setTrainingPlans(mappedPlans);
      }

      // 4b. Fetch All Checklists for Tab Checklist Công Việc
      const allChecklistsResp = await api.get('/kpi-management/checklists').catch(() => null);
      if (allChecklistsResp && Array.isArray(allChecklistsResp) && allChecklistsResp.length > 0) {
        setAllChecklists(allChecklistsResp);
      } else {
        setAllChecklists([
          { id: 1, task_code: 'CL-001', content: 'Kiểm tra 5S khu vực bàn kiểm định QC', frequency: 'Hàng ngày', status_today: 'Hoàn thành', perform_count: 5, last_performed: '31/08/2026', result: 'Đạt 100%', employee_id: 'admin' },
          { id: 2, task_code: 'CL-002', content: 'Đối chiếu tem nhãn với lệnh sản xuất ISO', frequency: 'Theo ca', status_today: 'Đang thực hiện', perform_count: 2, last_performed: '31/08/2026', result: 'Đạt yêu cầu', employee_id: 'admin' },
          { id: 3, task_code: 'CL-003', content: 'Kiểm tra thông số kỹ thuật máy đo kích thước', frequency: 'Hàng tuần', status_today: 'Hoàn thành', perform_count: 12, last_performed: '28/08/2026', result: 'Đạt chuẩn', employee_id: 'admin' }
        ]);
      }

      // 5. Fetch Notifications / Alerts from DB `/notifications/?all=true`
      let notifResp = await api.get('/notifications/?all=true').catch(() => null);

      if (notifResp && Array.isArray(notifResp) && notifResp.length > 0) {
        const mappedNotifs = notifResp.map((n, idx) => {
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
            status: 'Đang phát'
          };
        });
        setAlertsList(mappedNotifs);
      } else {
        setAlertsList([]);
      }

    } catch (err) {
      console.error('Error fetching DB data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseData();
  }, []);

  // Open Modal CL03.2
  const handleOpenDetailModal = (violation) => {
    setSelectedTaskData({
      employee_id: violation.code || 'VP-2026-081',
      employee_name: violation.emp || 'Nguyễn Văn A',
      position: violation.dept || 'Tổ Sơn Mạ',
      score_prev_month: 120,
      score_current: 95
    });
    setIsDetailModalOpen(true);
  };

  // CRUD Handlers for Tab 2 (Persisted directly to Backend DB API `/kpi-management/kpi-pool`)
  const handleSaveKpiTarget = async (targetItem) => {
    try {
      if (editingTarget) {
        await api.put(`/kpi-management/kpi-pool/${targetItem.id}`, {
          kpi_code: targetItem.code,
          content: targetItem.name,
          calc_method: targetItem.dept,
          target: targetItem.target
        }).catch(() => null);
        setKpiTargets(prev => prev.map(t => t.id === targetItem.id ? targetItem : t));
      } else {
        const createRes = await api.post('/kpi-management/kpi-pool', {
          kpi_code: targetItem.code,
          content: targetItem.name,
          calc_method: targetItem.dept,
          target: targetItem.target
        }).catch(() => null);
        
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
      let fileName = newPlan.fileName || 'TaiLieu.pdf';
      if (newPlan.fileObject) {
        const formData = new FormData();
        formData.append('file', newPlan.fileObject);
        const uploadRes = await api.post('/kpi-management/upload-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(err => console.error('Upload file error:', err));
        if (uploadRes && uploadRes.fileName) {
          fileName = uploadRes.fileName;
        }
      }

      if (editingTrainingPlan) {
        // Edit mode
        await api.put(`/kpi-management/checklists/${editingTrainingPlan.id}`, {
          employee_id: 'admin',
          task_code: newPlan.code,
          content: newPlan.name,
          frequency: 'Đào tạo',
          status_today: newPlan.status || 'Sắp diễn ra',
          perform_count: 1,
          last_performed: newPlan.time || '15/09/2026',
          result: fileName
        }).catch(() => null);
        setTrainingPlans(prev => prev.map(p => p.id === newPlan.id ? { ...newPlan, fileName, fileUrl: `/uploads/${fileName}` } : p));
      } else {
        // Create mode
        await api.post('/kpi-management/checklists', {
          employee_id: 'admin',
          task_code: newPlan.code,
          content: newPlan.name,
          frequency: 'Đào tạo',
          status_today: newPlan.status || 'Sắp diễn ra',
          perform_count: 1,
          last_performed: newPlan.time || '15/09/2026',
          result: fileName
        }).catch(() => null);

        setTrainingPlans(prev => [...prev, { ...newPlan, fileName, fileUrl: `/uploads/${fileName}`, id: Date.now() }]);
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
          await api.delete(`/kpi-management/checklists/${item.id}`).catch(err => console.error('Delete checklist error:', err));
        }
        setTrainingPlans(prev => prev.filter(p => p.id !== item.id));
      } else if (deleteConfirmState.isAlert) {
        if (item.id !== undefined && item.id !== null) {
          await api.delete(`/notifications/${item.id}`).catch(err => console.error('Delete alert error:', err));
        }
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
      setDeleteConfirmState({ isOpen: false, itemToDelete: null, isTrainingPlan: false, isAlert: false });
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

      if (editingAlert && editingAlert.id) {
        // 1. Cập nhật ngay trên Giao diện Web (Optimistic UI Update)
        setAlertsList(prev => prev.map(item => 
          item.id === editingAlert.id 
            ? {
                ...item,
                title: alertPayload.title || 'Hiển thị thông báo mới',
                content: alertPayload.content,
                receiver: alertPayload.receiver || 'Bộ phận Sản xuất',
                date: updatedDate
              }
            : item
        ));

        // 2. Gửi request PUT lên Backend CSDL
        await api.put(`/notifications/${editingAlert.id}`, {
          content: payloadContent,
          target_group: alertPayload.receiver || 'Bộ phận Sản xuất',
          target_stage: 'MOBILE_BANNER',
          priority_status: `BANNER:${alertPayload.title || 'Hiển thị thông báo mới'}`
        }).catch(err => console.error('Error updating notification:', err));
      } else {
        // Create mode
        await api.post('/notifications/', {
          content: payloadContent,
          target_group: alertPayload.receiver || 'Bộ phận Sản xuất',
          target_stage: 'MOBILE_BANNER',
          priority_status: `BANNER:${alertPayload.title || 'Hiển thị thông báo mới'}`
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
    setChecklistFormData({ content: '', frequency: 'Hàng ngày', employee_id: 'NV_QLCL_004', status_today: 'Chưa làm' });
    setIsChecklistModalOpen(true);
  };

  const handleEditDashboardChecklist = (item) => {
    setEditingChecklist(item);
    setChecklistFormData({
      content: item.content || '',
      frequency: item.frequency || 'Hàng ngày',
      employee_id: item.employee_id || 'NV_QLCL_004',
      status_today: item.status_today || 'Đang thực hiện'
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
          result: editingChecklist.result || 'Đã cập nhật'
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
          result: 'Mới tạo'
        });
      }
      setIsChecklistModalOpen(false);
      await fetchDatabaseData();
    } catch (err) {
      console.error('Error saving checklist:', err);
    }
  };

  const handleDeleteDashboardChecklist = async (item) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa công việc checklist "${item.content}"?`)) {
      try {
        await api.delete(`/kpi-management/checklists/${item.id}`);
        await fetchDatabaseData();
      } catch (e) {
        console.error('Error deleting checklist:', e);
      }
    }
  };

  return (
    <div style={{ padding: '12px 14px', backgroundColor: '#FAF6F0', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* 7 MAIN TAB BUTTONS (CLEAN TEXT-ONLY, COMPACT DESIGN) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #EADCC9',
        marginBottom: '14px',
        overflowX: 'auto',
        paddingBottom: '2px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {[
            { id: 'quality_targets', label: 'Mục tiêu chất lượng' },
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
                  padding: '6px 14px',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #5D3B32' : '2px solid transparent',
                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#5D3B32' : '#64748B',
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.8rem',
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Live DB Indicator & Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={fetchDatabaseData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#5D3B32', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            {loading ? 'Tải DB...' : 'Làm mới DB'}
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div>

        {/* ========================================================================= */}
        {/* TAB 1: MỤC TIÊU CHẤT LƯỢNG                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'quality_targets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* TOP 2 CARDS matching Mockup Screen 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
              
              {/* CARD 1: Tỉ lệ đạt lỗi định kỳ (Monthly defect rate chart) */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#5D3B32', marginBottom: '8px' }}>
                  Tỉ lệ đạt lỗi định kỳ
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '85px', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9' }}>
                  {[
                    { label: 'T1', height: '40%' },
                    { label: 'T2', height: '65%' },
                    { label: 'T3', height: '50%' },
                    { label: 'T4', height: '80%' },
                    { label: 'T5', height: '70%' },
                    { label: 'T6', height: '95%', isPeak: true },
                    { label: 'T7', height: '60%' },
                    { label: 'T8', height: '45%' },
                    { label: 'T9', height: '75%' },
                    { label: 'T10', height: '55%' },
                    { label: 'T11', height: '85%' },
                    { label: 'T12', height: '40%' }
                  ].map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                      <div style={{
                        width: '14px', height: m.height,
                        backgroundColor: m.isPeak ? '#7B5233' : '#5D3B32',
                        borderRadius: '3px 3px 0 0', opacity: m.isPeak ? 1 : 0.85
                      }}></div>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748B' }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 2: Điểm KPI Trung bình & 3 Progress status bars */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #EADCC9', display: 'flex', gap: '14px', alignItems: 'center' }}>
                
                {/* Left side: Big score */}
                <div style={{ flex: '1', borderRight: '1px solid #F1F5F9', paddingRight: '12px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748B' }}>
                    Điểm KPI Trung bình
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '6px' }}>
                    <span style={{ fontSize: '2.0rem', fontWeight: '900', color: '#5D3B32', lineHeight: 1 }}>25</span>
                    <span style={{ fontSize: '1.0rem', fontWeight: '700', color: '#94A3B8' }}>/ 100</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '25%', height: '100%', backgroundColor: '#D97706', borderRadius: '3px' }}></div>
                  </div>
                </div>

                {/* Right side: 3 bars */}
                <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '800', color: '#5D3B32', marginBottom: '2px' }}>
                      <span>Đạt chỉ tiêu</span>
                      <span>100/100</span>
                    </div>
                    <div style={{ width: '100%', height: '16px', backgroundColor: '#7B5233', borderRadius: '4px', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px' }}>
                      100/100
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '800', color: '#5D3B32', marginBottom: '2px' }}>
                      <span>Cần cải thiện</span>
                      <span>50/100</span>
                    </div>
                    <div style={{ width: '100%', height: '16px', backgroundColor: '#7B5233', borderRadius: '4px', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px' }}>
                      50/100
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '800', color: '#5D3B32', marginBottom: '2px' }}>
                      <span>Lỗi nghiêm trọng</span>
                      <span>50/100</span>
                    </div>
                    <div style={{ width: '100%', height: '16px', backgroundColor: '#7B5233', borderRadius: '4px', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px' }}>
                      50/100
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* TABLE: Danh sách Mục tiêu chất lượng */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div style={{ padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableControlToolbar
                  searchValue={targetSearch}
                  onSearchChange={(e) => setTargetSearch(e.target.value)}
                  placeholder="Tìm kiếm mục tiêu..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(kpiTargets.length > 0 ? kpiTargets : defaultKpiTargets, targetSearch), 'Muc_Tieu_Chat_Luong')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => { setEditingTarget(null); setIsTargetModalOpen(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Thêm Mục tiêu mới
                </button>
              </div>

              {filterOpen && (
                <div style={{ padding: '6px 14px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#92400E' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid #F59E0B',
                        backgroundColor: filterStatus === opt ? '#F59E0B' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#92400E',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '40px' }}>STT</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '100px' }}>Mã công việc</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Tên công việc / Mục tiêu</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '110px' }}>Mức độ ưu tiên</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '80px' }}>Tỷ trọng</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '100px' }}>Tần suất</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '110px' }}>Tiêu chuẩn</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '110px' }}>Hạn hoàn thành</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '100px' }}>Tiến độ</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '80px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filterAndSortData(kpiTargets.length > 0 ? kpiTargets : defaultKpiTargets, targetSearch).map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}
                    >
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.code || `MT-${String(idx + 1).padStart(2, '0')}`}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1E293B' }}>{item.name}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                          backgroundColor: idx % 3 === 0 ? '#FEE2E2' : idx % 3 === 1 ? '#FEF3C7' : '#DCFCE7',
                          color: idx % 3 === 0 ? '#DC2626' : idx % 3 === 1 ? '#B45309' : '#15803D'
                        }}>
                          {idx % 3 === 0 ? 'Cao' : idx % 3 === 1 ? 'Trung bình' : 'Thấp'}
                        </span>
                      </td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: '800', color: '#5D3B32' }}>{item.weight || '20%'}</td>
                      <td style={{ padding: '5px 10px', color: '#475569' }}>{item.unit || 'Hàng tháng'}</td>
                      <td style={{ padding: '5px 10px', color: '#15803D', fontWeight: '700' }}>{item.target || '100%'}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', color: '#64748B' }}>31/12/2026</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ flex: 1, height: '5px', backgroundColor: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${80 - (idx % 5) * 10}%`, height: '100%', backgroundColor: '#5D3B32' }}></div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#5D3B32' }}>{80 - (idx % 5) * 10}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => { setEditingTarget(item); setIsTargetModalOpen(true); }}
                            style={{ border: 'none', background: '#E0F2FE', color: '#0369A1', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Sửa"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteConfirm(item)}
                            style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Xóa"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CHỈ SỐ CÔNG VIỆC                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'work_indicators' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* TOP 4 CARDS matching Mockup Screen 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.3fr 1.3fr', gap: '10px' }}>
              
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

            {/* TABLE: Danh mục Chỉ số KPI công việc */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div style={{ padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableControlToolbar
                  searchValue={indicatorSearch}
                  onSearchChange={(e) => setIndicatorSearch(e.target.value)}
                  placeholder="Tìm kiếm chỉ số KPI công việc..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(workIndicators.length > 0 ? workIndicators : defaultWorkIndicators, indicatorSearch), 'Chi_So_Cong_Viec')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => { setEditingTarget(null); setIsTargetModalOpen(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Thêm chỉ số KPI mới
                </button>
              </div>

              {filterOpen && (
                <div style={{ padding: '6px 14px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#92400E' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid #F59E0B',
                        backgroundColor: filterStatus === opt ? '#F59E0B' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#92400E',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '40px' }}>STT</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '110px' }}>Mã Chỉ Số KPI</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Tên Chỉ Số KPI Công Việc</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '130px' }}>Phòng Ban / Bộ Phận</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '80px' }}>Tỷ Trọng</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '110px' }}>Mục Tiêu Đạt</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '100px' }}>Tần Suất</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '100px' }}>Trạng Thái</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '80px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filterAndSortData(workIndicators.length > 0 ? workIndicators : defaultWorkIndicators, indicatorSearch).map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}
                    >
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.code || `KPI-IND-${String(idx + 1).padStart(2, '0')}`}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1E293B' }}>{item.name}</td>
                      <td style={{ padding: '5px 10px', color: '#475569', fontWeight: '600' }}>{item.dept || 'Tổ QC Sơn'}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: '800', color: '#5D3B32' }}>{item.weight || '20%'}</td>
                      <td style={{ padding: '5px 10px', color: '#15803D', fontWeight: '700' }}>{item.target || item.standard || '>= 98%'}</td>
                      <td style={{ padding: '5px 10px', color: '#475569' }}>{item.unit || 'Hàng ngày'}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                          backgroundColor: '#ECFDF5', color: '#059669'
                        }}>
                          {item.status || 'Áp dụng'}
                        </span>
                      </td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => { setEditingTarget(item); setIsTargetModalOpen(true); }}
                            style={{ border: 'none', background: '#E0F2FE', color: '#0369A1', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Sửa"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteConfirm(item)}
                            style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Xóa"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CHECKLIST CÔNG VIỆC                                                */}
        {/* ========================================================================= */}
        {activeTab === 'checklist_work' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* TOP 3 CARDS matching Mockup Screen 3 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.6fr', gap: '10px' }}>
              
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

            {/* TABLE AREA WITH SEARCH & FILTER */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div style={{ padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableControlToolbar
                  searchValue={checklistSearch}
                  onSearchChange={(e) => setChecklistSearch(e.target.value)}
                  placeholder="Tìm kiếm checklist..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(allChecklists.length > 0 ? allChecklists : defaultChecklists, checklistSearch), 'Checklist_Cong_Viec')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={handleAddDashboardChecklist}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Thêm Checklist mới
                </button>
              </div>

              {filterOpen && (
                <div style={{ padding: '6px 14px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#92400E' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid #F59E0B',
                        backgroundColor: filterStatus === opt ? '#F59E0B' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#92400E',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '40px' }}>STT</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '100px' }}>Mã công việc</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Tên công việc</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '120px' }}>Tần suất thực hiện</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '120px' }}>Trạng thái hôm nay</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '120px' }}>Lần thực hiện cuối</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '110px' }}>Kết quả</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '80px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filterAndSortData(allChecklists.length > 0 ? allChecklists : defaultChecklists, checklistSearch).map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}
                    >
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.task_code || item.code || `CL-00${idx + 1}`}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1E293B' }}>{item.content}</td>
                      <td style={{ padding: '5px 10px', color: '#475569' }}>{item.frequency || 'Hàng ngày'}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                          backgroundColor: (item.status_today === 'Đã hoàn thành' || item.status === 'Đã hoàn thành') ? '#DCFCE7' : item.status_today === 'Đang thực hiện' ? '#E0F2FE' : '#FEF3C7',
                          color: (item.status_today === 'Đã hoàn thành' || item.status === 'Đã hoàn thành') ? '#15803D' : item.status_today === 'Đang thực hiện' ? '#0369A1' : '#B45309'
                        }}>
                          {item.status_today || item.status || 'Chưa làm'}
                        </span>
                      </td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', color: '#64748B' }}>{item.last_performed || item.last_run || 'Hôm nay'}</td>
                      <td style={{ padding: '5px 10px', color: '#16A34A', fontWeight: '700' }}>{item.result || 'Đạt yêu cầu'}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEditDashboardChecklist(item)}
                            style={{ border: 'none', background: '#E0F2FE', color: '#0369A1', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Sửa"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteDashboardChecklist(item)}
                            style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Xóa"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DANH SÁCH VI PHẠM                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'violations_list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* TOP 2 CARDS matching Mockup Screen 4 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px' }}>
              
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

            {/* TABLE AREA WITH SEARCH & FILTER */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div style={{ padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableControlToolbar
                  searchValue={violationSearch}
                  onSearchChange={(e) => setViolationSearch(e.target.value)}
                  placeholder="Tìm vi phạm..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(violations.length > 0 ? violations : defaultViolations, violationSearch), 'Danh_Sach_Vi_Pham')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => handleOpenDetailModal(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Thêm mới
                </button>
              </div>

              {filterOpen && (
                <div style={{ padding: '6px 14px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#92400E' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid #F59E0B',
                        backgroundColor: filterStatus === opt ? '#F59E0B' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#92400E',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '40px' }}>STT</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Mã NV / Họ tên</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Hành vi vi phạm</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '110px' }}>Mức độ vi phạm</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '80px' }}>Điểm trừ</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '100px' }}>Ngày vi phạm</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Người ghi nhận</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '80px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filterAndSortData(violations.length > 0 ? violations : defaultViolations, violationSearch).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
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
                      <td style={{ padding: '5px 10px', textAlign: 'center', color: '#64748B' }}>{item.date}</td>
                      <td style={{ padding: '5px 10px', color: '#475569' }}>{item.reporter}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenDetailModal(item)}
                          style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Xem chi tiết"
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: KẾ HOẠCH ĐÀO TẠO                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'training_plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div style={{ padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableControlToolbar
                  searchValue={trainingSearch}
                  onSearchChange={(e) => setTrainingSearch(e.target.value)}
                  placeholder="Tìm khóa đào tạo..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(trainingPlans.length > 0 ? trainingPlans : defaultTrainingPlans, trainingSearch), 'Ke_Hoach_Dao_Tao')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => setIsTrainingModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Tạo kế hoạch đào tạo
                </button>
              </div>

              {filterOpen && (
                <div style={{ padding: '6px 14px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#92400E' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid #F59E0B',
                        backgroundColor: filterStatus === opt ? '#F59E0B' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#92400E',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '40px' }}>STT</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Mã Khóa</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Tên Chương Trình Đào Tạo</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Đối Tượng Tham Gia</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center' }}>Thời Gian</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Giảng Viên</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Tài Liệu Đính Kèm (File)</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '90px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filterAndSortData(trainingPlans.length > 0 ? trainingPlans : defaultTrainingPlans, trainingSearch).map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      onClick={() => handleOpenTrainingDetail(item)}
                      style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.code}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1E293B' }}>{item.name}</td>
                      <td style={{ padding: '5px 10px', color: '#475569' }}>{item.target}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', color: '#64748B' }}>{item.time}</td>
                      <td style={{ padding: '5px 10px', color: '#334155' }}>{item.teacher}</td>
                      <td style={{ padding: '5px 10px' }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.fileUrl) {
                              window.open(item.fileUrl, '_blank');
                            } else {
                              handleOpenTrainingDetail(item);
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563EB', fontWeight: '700', cursor: 'pointer' }}
                          title={item.fileUrl ? 'Nhấn để mở file trên trang riêng' : 'Nhấn để xem chi tiết'}
                        >
                          <ExternalLink size={12} /> {item.fileName}
                        </div>
                      </td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                          backgroundColor: item.status === 'Đã hoàn thành' ? '#DCFCE7' : '#FEF3C7',
                          color: item.status === 'Đã hoàn thành' ? '#15803D' : '#B45309'
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenTrainingDetail(item); }}
                            style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Xem chi tiết"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditTrainingPlan(item); }}
                            style={{ border: 'none', background: '#FEF3C7', color: '#D97706', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenDeleteTrainingConfirm(item); }}
                            style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Xóa khóa học"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: BÁO CÁO VÀ BBCH                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'reports_bbch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div style={{ padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableControlToolbar
                  searchValue={reportSearch}
                  onSearchChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Tìm báo cáo..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(staffEvaluations.length > 0 ? staffEvaluations : defaultReports, reportSearch), 'Bao_Cao_BBCH')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#16A34A' }}>
                  ✓ Đồng bộ tự động qua API /staff-evaluation
                </span>
              </div>

              {filterOpen && (
                <div style={{ padding: '6px 14px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#92400E' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid #F59E0B',
                        backgroundColor: filterStatus === opt ? '#F59E0B' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#92400E',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '40px' }}>STT</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Mã Báo Cáo</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Nhân Viên</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Bộ Phận</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Nhận Xét Đánh Giá Quản Lý</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center' }}>Điểm Đánh Giá</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Mã BBCH Khắc Phục</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center' }}>Ngày Lập</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filterAndSortData(staffEvaluations.length > 0 ? staffEvaluations : defaultReports, reportSearch).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.code || `BC_${String(idx + 1).padStart(2, '0')}`}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1E293B' }}>{item.emp || item.name}</td>
                      <td style={{ padding: '5px 10px', color: '#475569' }}>{item.dept || 'Phòng QA/QC'}</td>
                      <td style={{ padding: '5px 10px', color: '#334155' }}>{item.manager_note || item.note || 'Hoàn thành nhiệm vụ được giao'}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: '900', color: '#15803D' }}>{item.eval_score || item.score || 92} điểm</td>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#0284C7' }}>{item.bbch_code || `BBCH-2026-${String(idx + 1).padStart(2, '0')}`}</td>
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
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: THIẾT LẬP CẢNH BÁO                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'alerts_setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div style={{ padding: '8px 14px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableControlToolbar
                  searchValue={alertSearch}
                  onSearchChange={(e) => setAlertSearch(e.target.value)}
                  placeholder="Tìm cảnh báo..."
                  onSort={() => setSortAsc(prev => !prev)}
                  onFilter={() => setFilterOpen(prev => !prev)}
                  onExport={() => handleExportExcel(filterAndSortData(alertsList.length > 0 ? alertsList : defaultAlerts, alertSearch), 'Thiet_Lap_Canh_Bao')}
                  sortAsc={sortAsc}
                  isFilterActive={filterOpen}
                />
                <button
                  onClick={() => { setEditingAlert(null); setIsAlertModalOpen(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <Send size={13} /> Bắn thông báo mới đến Mobile
                </button>
              </div>

              {filterOpen && (
                <div style={{ padding: '6px 14px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: '800', color: '#92400E' }}>Bộ lọc trạng thái:</span>
                  {['Tất cả', 'Đã duyệt / Đạt', 'Chờ xử lý / Cần làm'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilterStatus(opt)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        border: '1px solid #F59E0B',
                        backgroundColor: filterStatus === opt ? '#F59E0B' : '#FFFFFF',
                        color: filterStatus === opt ? '#FFFFFF' : '#92400E',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', fontWeight: '700', width: '40px' }}>STT</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Mã Cảnh Báo</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Tiêu Đề Thông Báo</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Nội Dung Phát Đến Banner Mobile App</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700' }}>Đối Tượng Nhận</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center' }}>Thời Gian Phát</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ padding: '6px 10px', fontWeight: '700', textAlign: 'center', width: '80px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filterAndSortData(alertsList.length > 0 ? alertsList : defaultAlerts, alertSearch).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '800', color: '#5D3B32' }}>{item.code || `CB_${String(idx + 1).padStart(2, '0')}`}</td>
                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1E293B' }}>{item.title || item.name}</td>
                      <td style={{ padding: '5px 10px', color: '#0F172A', fontWeight: '600', maxWidth: '320px' }}>{item.content}</td>
                      <td style={{ padding: '5px 10px', color: '#475569' }}>{item.receiver || 'Tất cả nhân sự'}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', color: '#64748B' }}>{item.date || 'Hôm nay'}</td>
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
                  ))}
                </tbody>
              </table>
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

      {/* 5. Custom Project Delete Confirmation Modal (BeautifulConfirmModal) */}
      <BeautifulConfirmModal
        isOpen={deleteConfirmState.isOpen}
        type="danger"
        title={
          deleteConfirmState.isTrainingPlan ? "Xác nhận xóa kế hoạch đào tạo"
          : deleteConfirmState.isAlert ? "Xác nhận xóa thông báo cảnh báo"
          : "Xác nhận xóa chỉ số KPI"
        }
        message={
          deleteConfirmState.isTrainingPlan 
            ? `Bạn có chắc chắn muốn xóa kế hoạch đào tạo "${deleteConfirmState.itemToDelete?.name || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi hệ thống không?`
            : deleteConfirmState.isAlert
            ? `Bạn có chắc chắn muốn xóa thông báo "${deleteConfirmState.itemToDelete?.title || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi hệ thống không?`
            : `Bạn có chắc chắn muốn xóa chỉ số KPI "${deleteConfirmState.itemToDelete?.name || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi Database hệ thống không?`
        }
        confirmText="Xóa dữ liệu"
        cancelText="Hủy bỏ"
        onConfirm={handleGeneralConfirmDelete}
        onClose={() => setDeleteConfirmState({ isOpen: false, itemToDelete: null, isTrainingPlan: false, isAlert: false })}
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
                    Cách theo dõi
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
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Mã nhân sự phụ trách
                  </label>
                  <input
                    type="text"
                    value={checklistFormData.employee_id}
                    onChange={(e) => setChecklistFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Trạng thái
                </label>
                <select
                  value={checklistFormData.status_today}
                  onChange={(e) => setChecklistFormData(prev => ({ ...prev, status_today: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Đang thực hiện">Đang thực hiện</option>
                  <option value="Chưa làm">Chưa làm</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
