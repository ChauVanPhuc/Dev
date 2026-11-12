import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  Eye,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Loader2,
  ImageIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import ExcelJS from 'exceljs';
import {
  formatPenaltyValue,
  calculateTotalPenalty,
  getFullImagePath,
  resolveG7ErrorCode,
  resolveG7ErrorName
} from '../utils/claimHelpers';

/**
 * Danh sách 14 cột nghiệp vụ chuẩn hiển thị trên bảng Danh sách Khiếu nại và file Excel ERP G7.
 * Tuyệt đối không bao gồm cột "Mức độ", "Thao tác", checkbox, hoặc id kỹ thuật.
 */
export const CLAIM_BASE_COLUMNS = [
  { key: 'stt', label: 'STT', width: 8, align: 'center' },
  { key: 'dong_hang', label: 'Dòng hàng', width: 14, align: 'center' },
  { key: 'claim_code', label: 'Mã tham chiếu', width: 22, align: 'left' },
  { key: 'product_name', label: 'Tên sản phẩm', width: 24, align: 'left' },
  { key: 'description', label: 'Mô tả', width: 28, align: 'left' },
  { key: 'order_code', label: 'Mã lỗi KH', width: 16, align: 'center' },
  { key: 'company_error_code', label: 'Mã lỗi G7', width: 16, align: 'center' },
  { key: 'company_error_name', label: 'Tên lỗi G7', width: 24, align: 'center' },
  { key: 'status', label: 'Trạng thái', width: 16, align: 'center' },
  { key: 'penalty', label: 'Giá trị phạt', width: 16, align: 'center' },
  { key: 'total_penalty', label: 'Tổng tiền phạt', width: 18, align: 'right', isCurrency: true },
  { key: 'lpn', label: 'LPN', width: 16, align: 'center', isText: true },
  { key: 'cont', label: 'Container', width: 18, align: 'center', isText: true },
  { key: 'date', label: 'Thời gian Claim', width: 18, align: 'center' }
];

// Giữ tương thích ngược với code cũ import CLAIM_EXCEL_COLUMNS
export const CLAIM_EXCEL_COLUMNS = CLAIM_BASE_COLUMNS;

/**
 * Hàm chuyển số thứ tự cột 1-indexed sang chữ cái Excel (1 -> A, 14 -> N, 15 -> O, 27 -> AA,...)
 */
const getExcelColumnName = (colIndex) => {
  let temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter;
};

/**
 * Chuyển chuỗi tháng/năm sang số đại diện (year * 12 + month) để so sánh khoảng Thời gian Claim.
 * Công thức: ClaimYear * 12 + ClaimMonth.
 * Hỗ trợ các định dạng chuẩn của Thời gian Claim: 'MM/YYYY', 'MM-YYYY', 'YYYY-MM', 'YYYY/MM'.
 * Tuyệt đối không nhận diện các chuỗi timestamp kỹ thuật như created_at hay updated_at.
 */
export const parseMonthNumberValue = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str || str === 'N/A' || str === '—' || str === '-' || str.toLowerCase() === 'null') {
    return null;
  }

  // 1. Match MM/YYYY hoặc MM-YYYY (ví dụ: '09/2026', '9/2026', '10-2026')
  const mmYyyyMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmYyyyMatch) {
    const m = parseInt(mmYyyyMatch[1], 10);
    const y = parseInt(mmYyyyMatch[2], 10);
    if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return y * 12 + m;
    }
  }

  // 2. Match YYYY-MM hoặc YYYY/MM (như HTML5 input type="month" trả về '2026-09')
  const yyyyMmMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yyyyMmMatch) {
    const y = parseInt(yyyyMmMatch[1], 10);
    const m = parseInt(yyyyMmMatch[2], 10);
    if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return y * 12 + m;
    }
  }

  // 3. Match DD/MM/YYYY hoặc D/M/YYYY
  const ddMmYyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddMmYyyyMatch) {
    const m = parseInt(ddMmYyyyMatch[2], 10);
    const y = parseInt(ddMmYyyyMatch[3], 10);
    if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return y * 12 + m;
    }
  }

  // 4. Match YYYY-MM-DD
  const yyyyMmDdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyyMmDdMatch) {
    const y = parseInt(yyyyMmDdMatch[1], 10);
    const m = parseInt(yyyyMmDdMatch[2], 10);
    if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return y * 12 + m;
    }
  }

  return null;
};

/**
 * Format chuỗi thời gian Claim về chuẩn MM/YYYY.
 */
const formatClaimPeriod = (raw) => {
  if (!raw || raw === 'N/A' || raw === '—' || raw === '-' || raw === 'null') return '';
  const str = String(raw).trim();
  const mmYyyyMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmYyyyMatch) {
    const m = String(mmYyyyMatch[1]).padStart(2, '0');
    const y = mmYyyyMatch[2];
    return `${m}/${y}`;
  }
  const yyyyMmMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yyyyMmMatch) {
    const y = yyyyMmMatch[1];
    const m = String(yyyyMmMatch[2]).padStart(2, '0');
    return `${m}/${y}`;
  }
  return str;
};

/**
 * Format chuỗi YYYY-MM sang định dạng MM/YYYY hiển thị chuẩn ERP.
 */
export const formatYyyyMmToMmYyyy = (yyyyMm) => {
  if (!yyyyMm) return '';
  const str = String(yyyyMm).trim();
  const parts = str.split(/[-/]/);
  if (parts.length === 2) {
    if (parts[0].length === 4) {
      // YYYY-MM -> MM/YYYY
      return `${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    if (parts[1].length === 4) {
      // MM/YYYY
      return `${parts[0].padStart(2, '0')}/${parts[1]}`;
    }
  }
  return str;
};

/**
 * Tạo chuỗi hiển thị tóm tắt đồng bộ cho trường Tháng Claim từ Từ tháng và Đến tháng:
 * - Khi Từ = Đến (hoặc chỉ chọn 1 tháng): hiển thị 'MM/YYYY' (ví dụ '06/2026').
 * - Khi Từ != Đến: hiển thị khoảng 'MM/YYYY – MM/YYYY' (ví dụ '06/2026 – 08/2026').
 * - Khi chỉ có Từ tháng: hiển thị 'Từ MM/YYYY'.
 * - Khi chỉ có Đến tháng: hiển thị 'Đến MM/YYYY'.
 * - Khi cả hai rỗng: hiển thị rỗng để Month Picker dùng placeholder mặc định.
 */
export const getThangClaimDisplayText = (fromMonth, toMonth) => {
  const f = formatYyyyMmToMmYyyy(fromMonth);
  const t = formatYyyyMmToMmYyyy(toMonth);
  if (f && t) {
    if (f === t) return f;
    return `${f} – ${t}`;
  }
  if (f) return `Từ ${f}`;
  if (t) return `Đến ${t}`;
  return '';
};

/**
 * Hàm tải ảnh an toàn và chuyển đổi sang dạng Base64 để nhúng vào ExcelJS
 */
const loadImageForExcel = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const ext = blob.type.includes('png') ? 'png' : 'jpeg';
      return { base64, extension: ext };
    }
  } catch (e) {
    // Fallback qua Canvas
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 120;
        canvas.height = img.naturalHeight || img.height || 60;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ base64: dataUrl, extension: 'jpeg' });
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Component Month Picker chuyên dụng chuẩn ERP G7:
 * - Hỗ trợ chọn tháng/năm trực quan bằng popover lưới 12 tháng.
 * - Có nút chuyển năm [ < ] [ > ], chọn tháng hiện tại, xóa giá trị.
 * - Hiển thị nhãn định dạng MM/YYYY hoặc chuỗi tóm tắt khoảng thời gian ("06/2026 – 08/2026").
 * - Popover tự đóng khi click ra ngoài.
 */
export const G7MonthPicker = ({
  value = '',
  displayValue,
  placeholder = 'Chọn tháng (MM/YYYY)',
  onChange,
  onClear,
  hasError = false,
  title = '',
  highlightRange = null,
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Năm đang xem trong popover
  const initialYear = useMemo(() => {
    if (value && value.includes('-')) {
      const y = parseInt(value.split('-')[0], 10);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialYear);

  // Cập nhật viewYear khi value thay đổi
  useEffect(() => {
    if (value && value.includes('-')) {
      const y = parseInt(value.split('-')[0], 10);
      if (!isNaN(y)) setViewYear(y);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentYyyyMm = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const textToDisplay = displayValue !== undefined ? displayValue : (formatYyyyMmToMmYyyy(value) || '');

  const handleSelectMonth = (monthNum) => {
    const monthStr = String(monthNum).padStart(2, '0');
    const selected = `${viewYear}-${monthStr}`;
    if (onChange) onChange(selected);
    setIsOpen(false);
  };

  const handleSelectCurrent = () => {
    if (onChange) onChange(currentYyyyMm);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) onClear();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Ô hiển thị kích hoạt popover */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        title={title || textToDisplay || placeholder}
        style={{
          width: '100%',
          height: '28px',
          padding: '0 8px',
          border: hasError ? '1.5px solid #EF4444' : isOpen ? '1.5px solid #795137' : '1px solid #D6C7B2',
          borderRadius: '4px',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(121, 81, 55, 0.15)' : 'none'
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: textToDisplay ? 600 : 400,
            color: textToDisplay ? '#303030' : '#A8A29E',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}
        >
          {textToDisplay || placeholder}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          {textToDisplay && onClear && (
            <span
              onClick={handleClear}
              title="Xóa lựa chọn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                color: '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#9CA3AF';
              }}
            >
              <X size={11} />
            </span>
          )}
          <Calendar size={13} style={{ color: isOpen ? '#795137' : '#8D6E63', flexShrink: 0 }} />
          <ChevronDown
            size={12}
            style={{
              color: '#8D6E63',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
              flexShrink: 0
            }}
          />
        </div>
      </div>

      {/* Popover chọn Tháng / Năm */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1100,
            width: '230px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D6C7B2',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(41, 37, 36, 0.18)',
            padding: '10px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Thanh chuyển Năm */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '6px',
              borderBottom: '1px solid #F0EAE1'
            }}
          >
            <button
              type="button"
              onClick={() => setViewYear(prev => prev - 1)}
              style={{
                width: '24px',
                height: '24px',
                border: '1px solid #E8E2DC',
                borderRadius: '4px',
                backgroundColor: '#FAF8F5',
                color: '#5B3924',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Năm trước"
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#5B3924' }}>
              Năm {viewYear}
            </span>

            <button
              type="button"
              onClick={() => setViewYear(prev => prev + 1)}
              style={{
                width: '24px',
                height: '24px',
                border: '1px solid #E8E2DC',
                borderRadius: '4px',
                backgroundColor: '#FAF8F5',
                color: '#5B3924',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Năm sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Lưới 12 tháng (3 hàng x 4 cột) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '5px',
              marginBottom: '10px'
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const monthStr = String(m).padStart(2, '0');
              const cellYyyyMm = `${viewYear}-${monthStr}`;
              const isSelected = value === cellYyyyMm;
              const isCurrent = currentYyyyMm === cellYyyyMm;

              // Kiểm tra xem có nằm trong highlightRange không
              let inRange = false;
              if (highlightRange && highlightRange.from && highlightRange.to) {
                const fVal = parseMonthNumberValue(highlightRange.from);
                const tVal = parseMonthNumberValue(highlightRange.to);
                const cVal = viewYear * 12 + m;
                if (fVal !== null && tVal !== null && fVal <= tVal) {
                  inRange = cVal >= fVal && cVal <= tVal;
                }
              }

              let bgColor = '#FAF8F5';
              let textColor = '#44403C';
              let fontWeight = 500;
              let border = '1px solid #F0EAE1';

              if (isSelected) {
                bgColor = '#795137';
                textColor = '#FFFFFF';
                fontWeight = 700;
                border = '1px solid #795137';
              } else if (inRange) {
                bgColor = '#F5EBE1';
                textColor = '#5B3924';
                fontWeight = 600;
                border = '1px solid #E5D5C5';
              } else if (isCurrent) {
                border = '1px solid #795137';
                fontWeight = 700;
              }

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMonth(m)}
                  style={{
                    height: '28px',
                    padding: 0,
                    borderRadius: '4px',
                    border,
                    backgroundColor: bgColor,
                    color: textColor,
                    fontSize: '0.70rem',
                    fontWeight,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#EFE7DE';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = bgColor;
                    }
                  }}
                >
                  Thg {m}
                </button>
              );
            })}
          </div>

          {/* Thanh đáy: Tháng hiện tại & Xóa */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '6px',
              borderTop: '1px solid #F0EAE1',
              fontSize: '0.68rem'
            }}
          >
            <button
              type="button"
              onClick={handleSelectCurrent}
              style={{
                background: 'none',
                border: 'none',
                color: '#795137',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              Tháng này
            </button>
            {onClear && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
              >
                Xóa chọn
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * ClaimExcelExportModal
 * Popup chuẩn ERP G7:
 *  - Cố định kích thước 560px × 620px trên Desktop (responsive min(560px, 94vw) / min(620px, 90dvh))
 *  - Header cố định 48px: "Xuất Excel – Khiếu nại khách hàng"
 *  - Body cuộn độc lập: Chọn Chế độ xuất (Màn hình hiện tại vs Bộ lọc tùy chọn)
 *  - Footer cố định 54px: [ Hủy ] và [ Xem trước ]
 *  - Modal Xem trước rộng rãi min(1120px, 96vw) × min(760px, 94dvh) hiển thị 14 cột nghiệp vụ + N cột ảnh động
 *  - Tự động sinh N cột hình ảnh và nhúng ảnh thumbnail trực tiếp vào file .xlsx qua ExcelJS
 */
export const ClaimExcelExportModal = ({
  isOpen,
  onClose,
  claims = [],
  filteredClaims = [],
  selectedClaimIds = [],
  cabinetPrices = [],
  quickSearch = '',
  statusFilter = ''
}) => {
  // 1. Chế độ xuất: 'current' (Màn hình hiện tại) | 'custom' (Theo bộ lọc tùy chọn)
  const [exportMode, setExportMode] = useState('current');

  // Lựa chọn con trong 'current': 'all_filtered' | 'only_selected'
  const [currentSelectionMode, setCurrentSelectionMode] = useState(
    selectedClaimIds && selectedClaimIds.length > 0 ? 'only_selected' : 'all_filtered'
  );

  // 2. Bộ lọc tùy chọn khi người dùng chọn 'custom' (Thời gian Claim đồng bộ hai chiều qua fromMonth & toMonth)
  const [customFilters, setCustomFilters] = useState({
    fromMonth: '',   // YYYY-MM
    toMonth: '',     // YYYY-MM
    productLine: '', // APT, ADV, FOL...
    defectCode: '',
    status: '',
    keyword: ''
  });

  // 3. Trạng thái Xem trước trực tiếp, Phân trang Preview & Phóng to ảnh (Zoom Modal)
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PAGE_SIZE = 30;
  const [zoomedImage, setZoomedImage] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Đồng bộ trạng thái khi modal được mở
  useEffect(() => {
    if (isOpen) {
      setExportMode('current');
      setCurrentSelectionMode(
        selectedClaimIds && selectedClaimIds.length > 0 ? 'only_selected' : 'all_filtered'
      );
      setCustomFilters({
        fromMonth: '',
        toMonth: '',
        productLine: '',
        defectCode: '',
        status: statusFilter || '',
        keyword: ''
      });
      setPreviewPage(1);
      setZoomedImage(null);
      setErrorMessage('');
      setIsExporting(false);
    }
  }, [isOpen, selectedClaimIds, statusFilter]);

  // Reset trang Preview về 1 mỗi khi thay đổi chế độ hoặc bộ lọc
  useEffect(() => {
    setPreviewPage(1);
  }, [exportMode, currentSelectionMode, customFilters]);

  // Trích xuất danh sách dòng hàng và mã lỗi thực tế từ dữ liệu claims
  const availableProductLines = useMemo(() => {
    const lines = new Set();
    claims.forEach((c) => {
      const line = c.dong_hang || c.line || c.product_line || (c.product_name && c.product_name.includes('-') ? c.product_name.split('-')[0].trim() : '');
      if (line) lines.add(line);
    });
    return Array.from(lines).sort();
  }, [claims]);

  const availableDefectCodes = useMemo(() => {
    const codes = new Set();
    claims.forEach((c) => {
      const code = c.order_code || c.defect_code;
      if (code) codes.add(String(code).trim());
    });
    return Array.from(codes).sort();
  }, [claims]);

  // 4. Kiểm tra tính hợp lệ của khoảng thời gian (Từ tháng <= Đến tháng theo công thức ClaimYear * 12 + ClaimMonth)
  const isInvalidDateRange = useMemo(() => {
    if (
      exportMode === 'custom' &&
      customFilters.fromMonth &&
      customFilters.toMonth
    ) {
      const fromVal = parseMonthNumberValue(customFilters.fromMonth);
      const toVal = parseMonthNumberValue(customFilters.toMonth);
      if (fromVal !== null && toVal !== null && fromVal > toVal) {
        return true;
      }
    }
    return false;
  }, [exportMode, customFilters.fromMonth, customFilters.toMonth]);

  // 5. Tính toán danh sách bản ghi sẽ xuất
  const targetRecords = useMemo(() => {
    if (exportMode === 'current') {
      if (currentSelectionMode === 'only_selected' && Array.isArray(selectedClaimIds) && selectedClaimIds.length > 0) {
        return claims.filter((c) => selectedClaimIds.includes(c.id));
      }
      // Xuất toàn bộ kết quả phù hợp với bộ lọc hiện tại (không chỉ 30 dòng trang 1)
      return Array.isArray(filteredClaims) && filteredClaims.length > 0 ? filteredClaims : claims;
    }

    // exportMode === 'custom': Nếu khoảng thời gian ngược thì không trả về kết quả
    if (exportMode === 'custom' && isInvalidDateRange) {
      return [];
    }

    const hasFrom = !!customFilters.fromMonth;
    const hasTo = !!customFilters.toMonth;
    const fromVal = hasFrom ? parseMonthNumberValue(customFilters.fromMonth) : null;
    const toVal = hasTo ? parseMonthNumberValue(customFilters.toMonth) : null;

    return claims.filter((c) => {
      // 1. Khoảng Thời gian Claim (so sánh theo tháng/năm MM/YYYY, công thức ClaimYear * 12 + ClaimMonth)
      // Bao gồm cả tháng bắt đầu và tháng kết thúc (dùng chung logic lọc cho cả 2 chế độ).
      // Tuyệt đối không lấy created_at, updated_at, ngày import PDF hay thời gian container.
      const claimPeriodRaw = c.period || c.date;
      const claimVal = parseMonthNumberValue(claimPeriodRaw);

      if (hasFrom || hasTo) {
        // Nếu bộ lọc Thời gian Claim đang được thiết lập,
        // khiếu nại không có Thời gian Claim hợp lệ sẽ bị LOẠI (không tự suy diễn từ ngày tạo phiếu).
        if (claimVal === null) return false;

        if (fromVal !== null && claimVal < fromVal) return false;
        if (toVal !== null && claimVal > toVal) return false;
      }

      // 2. Dòng hàng
      if (customFilters.productLine) {
        const cLine = (c.dong_hang || c.line || c.product_line || (c.product_name && c.product_name.includes('-') ? c.product_name.split('-')[0].trim() : '')).toUpperCase();
        if (cLine !== customFilters.productLine.toUpperCase()) return false;
      }

      // 3. Mã lỗi KH
      if (customFilters.defectCode) {
        const code = String(c.order_code || c.defect_code || '').toLowerCase();
        if (!code.includes(customFilters.defectCode.toLowerCase())) return false;
      }

      // 4. Trạng thái
      if (customFilters.status) {
        if (c.status !== customFilters.status) return false;
      }

      // 5. Từ khóa tìm kiếm nhanh
      if (customFilters.keyword && customFilters.keyword.trim()) {
        const kw = customFilters.keyword.trim().toLowerCase();
        const sku = String(c.product_name || c.sku || '').toLowerCase();
        const code = String(c.claim_code || '').toLowerCase();
        const lpn = String(c.lpn || '').toLowerCase();
        const cont = String(c.cont || c.container_no || '').toLowerCase();
        if (!sku.includes(kw) && !code.includes(kw) && !lpn.includes(kw) && !cont.includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }, [exportMode, currentSelectionMode, selectedClaimIds, filteredClaims, claims, customFilters, isInvalidDateRange]);

  // 5. Tính toán số lượng ảnh lớn nhất (N) trong tập Claim xuất để sinh cột động
  const maxImages = useMemo(() => {
    if (!targetRecords || targetRecords.length === 0) return 0;
    return targetRecords.reduce((max, c) => {
      const imgs = (c.image_paths && Array.isArray(c.image_paths)) ? c.image_paths.filter(Boolean) : [];
      return Math.max(max, imgs.length);
    }, 0);
  }, [targetRecords]);

  // 6. Danh sách cột động (14 cột nghiệp vụ + N cột hình ảnh)
  const dynamicColumns = useMemo(() => {
    const cols = [...CLAIM_BASE_COLUMNS];
    for (let i = 1; i <= maxImages; i++) {
      cols.push({
        key: `image_${i}`,
        label: `Hình ảnh ${i}`,
        width: 22,
        align: 'center',
        isImage: true,
        imageIndex: i - 1
      });
    }
    return cols;
  }, [maxImages]);

  // 7. Tính toán phân trang cho vùng Preview (đảm bảo không ảnh hưởng đến số dòng xuất file Excel)
  const totalRecords = targetRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PREVIEW_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, previewPage), totalPages);
  const startIdx = (safePage - 1) * PREVIEW_PAGE_SIZE;
  const endIdx = Math.min(startIdx + PREVIEW_PAGE_SIZE, totalRecords);
  const paginatedPreviewRecords = useMemo(() => {
    return targetRecords.slice(startIdx, endIdx);
  }, [targetRecords, startIdx, endIdx]);

  if (!isOpen) return null;

  /**
   * Cơ chế đồng bộ hai chiều (Two-way Synchronization) cho Bộ lọc Thời gian Claim:
   * 1. Khi chọn Tháng Claim (handleThangClaimChange):
   *    - Tự động gán cả Từ tháng = val và Đến tháng = val.
   *    - Tháng Claim hiển thị định dạng 'MM/YYYY'.
   * 2. Khi chọn Từ tháng (handleFromMonthChange):
   *    - Cập nhật fromMonth = val.
   *    - Tháng Claim tự động đồng bộ hiển thị tóm tắt: 'MM/YYYY – MM/YYYY' (hoặc 'MM/YYYY' nếu Từ = Đến).
   * 3. Khi chọn Đến tháng (handleToMonthChange):
   *    - Cập nhật toMonth = val.
   *    - Tháng Claim tự động đồng bộ hiển thị tóm tắt khoảng thời gian mới.
   * 4. Khi xóa ở Tháng Claim (handleClearAllTimeFilter):
   *    - Xóa cả Từ tháng và Đến tháng (gán '').
   *    - Preview hiển thị toàn bộ Claim không giới hạn thời gian.
   * 5. Khi xóa Từ tháng hoặc Đến tháng:
   *    - Trường tương ứng được xóa, Tháng Claim hiển thị tóm tắt 'Từ...' hoặc 'Đến...'.
   */
  const handleThangClaimChange = (val) => {
    setCustomFilters((prev) => ({
      ...prev,
      fromMonth: val,
      toMonth: val
    }));
  };

  const handleFromMonthChange = (val) => {
    setCustomFilters((prev) => ({
      ...prev,
      fromMonth: val
    }));
  };

  const handleToMonthChange = (val) => {
    setCustomFilters((prev) => ({
      ...prev,
      toMonth: val
    }));
  };

  const handleClearAllTimeFilter = () => {
    setCustomFilters((prev) => ({
      ...prev,
      fromMonth: '',
      toMonth: ''
    }));
  };

  const handleClearFromMonth = () => {
    setCustomFilters((prev) => ({
      ...prev,
      fromMonth: ''
    }));
  };

  const handleClearToMonth = () => {
    setCustomFilters((prev) => ({
      ...prev,
      toMonth: ''
    }));
  };

  /**
   * Trích xuất và chuẩn hóa dữ liệu cho từng dòng claim
   */
  const extractClaimRowData = (claim, idx) => {
    let pLine = claim.dong_hang || claim.line || claim.product_line || claim.customer_name || '';
    if (!pLine && claim.product_name && claim.product_name.includes('-')) {
      pLine = claim.product_name.split('-')[0].trim();
    }

    let cabinetNo = String(claim.claim_code || claim.cabinet_no || '').trim();
    if (cabinetNo && !cabinetNo.toLowerCase().startsWith('cabinet')) {
      cabinetNo = `Cabinet #${cabinetNo.replace(/^#\s*/, '')}`;
    }

    const resolvedCode = claim.company_error_code || resolveG7ErrorCode(claim.order_code || claim.defect_code);
    const resolvedName = claim.company_error_name || resolveG7ErrorName(resolvedCode, claim.order_code || claim.defect_code);
    const totalPenaltyNum = Number(calculateTotalPenalty(claim, undefined, cabinetPrices) || 0);

    return {
      stt: idx + 1,
      dong_hang: pLine || '—',
      claim_code: cabinetNo,
      product_name: String(claim.product_name || claim.sku || '').trim(),
      description: String(claim.description || claim.claim_description || '').trim(),
      order_code: String(claim.order_code || claim.defect_code || '').trim(),
      company_error_code: String(resolvedCode || '').trim(),
      company_error_name: String(resolvedName || '').trim(),
      status: String(claim.status || 'Mới').trim(),
      penalty: String(claim.penalty || claim.action || '').trim(),
      total_penalty: totalPenaltyNum,
      lpn: String(claim.lpn || '').trim(),
      cont: String(claim.cont || claim.container_no || '').trim(),
      date: formatClaimPeriod(claim.period || claim.date),
      image_paths: Array.isArray(claim.image_paths) ? claim.image_paths.filter(Boolean) : []
    };
  };

  /**
   * Tạo tên file Excel chuẩn hóa
   */
  const generateFilename = () => {
    let suffix = '';
    if (exportMode === 'current') {
      if (currentSelectionMode === 'only_selected') {
        suffix = `DaChon_${targetRecords.length}`;
      } else {
        suffix = `HienTai_${targetRecords.length}`;
      }
    } else {
      if (customFilters.fromMonth && customFilters.toMonth) {
        if (customFilters.fromMonth === customFilters.toMonth) {
          suffix = `Thang_${customFilters.fromMonth.replace('-', '_')}`;
        } else {
          suffix = `${customFilters.fromMonth.replace('-', '_')}_den_${customFilters.toMonth.replace('-', '_')}`;
        }
      } else if (customFilters.fromMonth) {
        suffix = `Tu_${customFilters.fromMonth.replace('-', '_')}`;
      } else if (customFilters.toMonth) {
        suffix = `Den_${customFilters.toMonth.replace('-', '_')}`;
      } else {
        suffix = `TuyChon_${targetRecords.length}`;
      }
    }
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `Danh_sach_Claim_${suffix}_${dateStr}.xlsx`;
  };

  /**
   * Thực hiện tải file XLSX sử dụng ExcelJS và nhúng hình ảnh minh chứng
   */
  const handleDownloadExcel = async () => {
    if (isInvalidDateRange) {
      setErrorMessage('Thời gian Claim – Từ tháng không được lớn hơn Đến tháng. Vui lòng kiểm tra lại.');
      return;
    }

    if (!targetRecords || targetRecords.length === 0) {
      setErrorMessage('Không có dữ liệu khiếu nại để xuất file Excel.');
      return;
    }

    setIsExporting(true);
    setErrorMessage('');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ERP G7 - SmartFlow';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Danh sách Khiếu nại');

      // 1. Freeze hàng tiêu đề row 1
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      // 2. Khai báo 14 cột nghiệp vụ + N cột ảnh động
      worksheet.columns = dynamicColumns.map((col) => ({
        header: col.label,
        key: col.key,
        width: col.width
      }));

      // 3. Định dạng hàng Header màu nâu ERP G7 (#5B3924)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5B3924' }
        };
        cell.font = {
          name: 'Segoe UI',
          size: 11,
          bold: true,
          color: { argb: 'FFFFFFFF' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFEADCC9' } },
          left: { style: 'thin', color: { argb: 'FFEADCC9' } },
          bottom: { style: 'medium', color: { argb: 'FF3D2214' } },
          right: { style: 'thin', color: { argb: 'FFEADCC9' } }
        };
      });

      // 4. Bật AutoFilter cho toàn bộ cột (14 cột + N cột ảnh)
      const lastColLetter = getExcelColumnName(dynamicColumns.length);
      worksheet.autoFilter = `A1:${lastColLetter}1`;

      // 5. Thêm dữ liệu các dòng và nhúng hình ảnh minh chứng
      for (let idx = 0; idx < targetRecords.length; idx++) {
        const claim = targetRecords[idx];
        const data = extractClaimRowData(claim, idx);

        const rowValues = {
          stt: data.stt,
          dong_hang: data.dong_hang === '—' ? '' : data.dong_hang,
          claim_code: data.claim_code,
          product_name: data.product_name,
          description: data.description,
          order_code: data.order_code,
          company_error_code: data.company_error_code,
          company_error_name: data.company_error_name,
          status: data.status,
          penalty: data.penalty,
          total_penalty: data.total_penalty, // Kiểu số thực USD
          lpn: data.lpn,
          cont: data.cont,
          date: data.date
        };

        const row = worksheet.addRow(rowValues);
        // Thiết lập chiều cao dòng: 56px nếu có cột ảnh để hiển thị ảnh rõ nét, ngược lại 22px
        row.height = maxImages > 0 ? 56 : 22;

        // Căn lề & định dạng 14 cột nghiệp vụ chuẩn
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };

        // Cột 11: Tổng tiền phạt định dạng tiền tệ USD ($#,##0.00)
        const penaltyCell = row.getCell(11);
        penaltyCell.numFmt = '"$"#,##0.00';
        penaltyCell.alignment = { vertical: 'middle', horizontal: 'right' };

        // Cột 12: LPN (Định dạng text @)
        const lpnCell = row.getCell(12);
        lpnCell.numFmt = '@';
        lpnCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Cột 13: Container (Định dạng text @)
        const contCell = row.getCell(13);
        contCell.numFmt = '@';
        contCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Cột 14: Thời gian Claim
        row.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' };

        // Kẻ viền nhẹ cho toàn bộ các ô (bao gồm các ô ảnh)
        for (let colIdx = 1; colIdx <= dynamicColumns.length; colIdx++) {
          const cell = row.getCell(colIdx);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFF3F4F6' } },
            left: { style: 'thin', color: { argb: 'FFF3F4F6' } },
            bottom: { style: 'thin', color: { argb: 'FFF3F4F6' } },
            right: { style: 'thin', color: { argb: 'FFF3F4F6' } }
          };
          if (colIdx > 14) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }

        // Nhúng hình ảnh minh chứng thực tế vào các cột Hình ảnh 1..N
        const images = data.image_paths;
        for (let imgIdx = 0; imgIdx < images.length && imgIdx < maxImages; imgIdx++) {
          const imgPath = images[imgIdx];
          if (!imgPath) continue;
          const fullImgUrl = getFullImagePath(imgPath);
          try {
            const imgData = await loadImageForExcel(fullImgUrl);
            if (imgData && imgData.base64) {
              const imageId = workbook.addImage({
                base64: imgData.base64,
                extension: imgData.extension || 'jpeg'
              });
              // 0-indexed: cột 15 là index 14; hàng row.number là index row.number - 1
              worksheet.addImage(imageId, {
                tl: { col: 14 + imgIdx + 0.12, row: row.number - 1 + 0.08 },
                ext: { width: 100, height: 50 },
                editAs: 'oneCell'
              });
            }
          } catch (err) {
            console.warn(`[ClaimExcelExportModal] Bỏ qua ảnh lỗi [${fullImgUrl}]:`, err);
          }
        }
      }

      // 6. Ghi file và kích hoạt tải về
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // preview is now integrated inline
      onClose();
    } catch (err) {
      console.error('[ClaimExcelExportModal] Lỗi khi tạo file Excel:', err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi tạo file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* ── MODAL XUẤT EXCEL CHUẨN ERP G7 VỚI XEM TRƯỚC TRỰC TIẾP (min(1500px, 96vw) × min(90vh, 90dvh)) ── */}
      <div
        className="claim-export-modal-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.60)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isExporting) onClose();
        }}
      >
        <div
          className="claim-export-modal-dialog"
          style={{
            width: 'min(1500px, 96vw)',
            height: 'min(90vh, 90dvh)',
            minWidth: 'min(1500px, 96vw)',
            maxWidth: 'min(1500px, 96vw)',
            minHeight: 'min(90vh, 90dvh)',
            maxHeight: 'min(90vh, 90dvh)',
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.28)',
            border: '1.5px solid #EADCC9',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            margin: 'auto'
          }}
        >
          {/* Header cố định 48px */}
          <div
            style={{
              height: '48px',
              minHeight: '48px',
              maxHeight: '48px',
              padding: '0 20px',
              backgroundColor: '#FAF6F0',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={18} style={{ color: '#79543D' }} />
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#303030' }}>
                Xuất Excel – Khiếu nại khách hàng
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              style={{
                background: 'none',
                border: 'none',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                color: '#A8A29E',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body chia 2 cột: Cột Trái (~28-30% cấu hình) + Cột Phải (~70-72% Preview trực tiếp) */}
          <div
            style={{
              flex: '1 1 0px',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'row',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          >
            {/* ── CỘT TRÁI (28% - 30%): CHẾ ĐỘ XUẤT & BỘ LỌC ── */}
            <div
              style={{
                width: '320px',
                minWidth: '300px',
                maxWidth: '350px',
                backgroundColor: '#FDFBF9',
                borderRight: '1px solid #EADCC9',
                padding: '16px 18px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                flexShrink: 0,
                boxSizing: 'border-box'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#5B3924', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  CHẾ ĐỘ XUẤT
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Lựa chọn 1: Màn hình hiện tại - Hàng gọn gàng không mô tả dài */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '36px',
                      minHeight: '36px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: exportMode === 'current' ? '1.5px solid #79543D' : '1px solid #E8E2DC',
                      backgroundColor: exportMode === 'current' ? '#FAF6F2' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                  >
                    <input
                      type="radio"
                      name="claimExportMode"
                      value="current"
                      checked={exportMode === 'current'}
                      onChange={() => setExportMode('current')}
                      style={{ accentColor: '#79543D', cursor: 'pointer', margin: 0 }}
                    />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#303030' }}>
                      Màn hình hiện tại
                    </span>
                  </label>

                  {/* Lựa chọn 2: Theo bộ lọc tùy chọn - Hàng gọn gàng cùng chiều cao */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '36px',
                      minHeight: '36px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: exportMode === 'custom' ? '1.5px solid #79543D' : '1px solid #E8E2DC',
                      backgroundColor: exportMode === 'custom' ? '#FAF6F2' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                  >
                    <input
                      type="radio"
                      name="claimExportMode"
                      value="custom"
                      checked={exportMode === 'custom'}
                      onChange={() => setExportMode('custom')}
                      style={{ accentColor: '#79543D', cursor: 'pointer', margin: 0 }}
                    />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#303030' }}>
                      Theo bộ lọc tùy chọn
                    </span>
                  </label>
                </div>
              </div>

              {/* Tùy chọn phạm vi khi ở Màn hình hiện tại và có dòng được tích chọn */}
              {exportMode === 'current' && selectedClaimIds && selectedClaimIds.length > 0 && (
                <div
                  style={{
                    padding: '8px 10px',
                    backgroundColor: '#FAF6F2',
                    border: '1px solid #EADCC9',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#79543D' }}>
                    Phạm vi dữ liệu đang chọn:
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#303030', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="selectionScope"
                      value="only_selected"
                      checked={currentSelectionMode === 'only_selected'}
                      onChange={() => setCurrentSelectionMode('only_selected')}
                      style={{ accentColor: '#79543D' }}
                    />
                    <span>Chỉ xuất <strong>{selectedClaimIds.length}</strong> dòng đã tích chọn</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#303030', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="selectionScope"
                      value="all_filtered"
                      checked={currentSelectionMode === 'all_filtered'}
                      onChange={() => setCurrentSelectionMode('all_filtered')}
                      style={{ accentColor: '#79543D' }}
                    />
                    <span>Xuất tất cả <strong>{filteredClaims.length}</strong> dòng theo bộ lọc</span>
                  </label>
                </div>
              )}

              {/* Các trường bộ lọc khi chọn 'Theo bộ lọc tùy chọn' */}
              {exportMode === 'custom' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {/* Nhóm THỜI GIAN CLAIM: Đồng bộ hai chiều giữa Tháng Claim, Từ tháng và Đến tháng */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#FAF8F5',
                      border: '1px solid #EADCC9',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#5B3924', textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                      THỜI GIAN CLAIM
                    </label>

                    {/* Hàng 1: Tháng Claim (Chọn 1 tháng cụ thể hoặc tóm tắt khoảng thời gian) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                        Tháng Claim
                      </label>
                      <G7MonthPicker
                        value={customFilters.fromMonth === customFilters.toMonth ? customFilters.fromMonth : ''}
                        displayValue={getThangClaimDisplayText(customFilters.fromMonth, customFilters.toMonth)}
                        placeholder="Tất cả các tháng (MM/YYYY)"
                        title="Chọn một tháng cụ thể hoặc xem tóm tắt khoảng thời gian"
                        onChange={handleThangClaimChange}
                        onClear={handleClearAllTimeFilter}
                        highlightRange={{ from: customFilters.fromMonth, to: customFilters.toMonth }}
                      />
                    </div>

                    {/* Hàng 2: Từ tháng và Đến tháng (Hiển thị song song đồng thời) */}
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                            Từ tháng
                          </label>
                          <G7MonthPicker
                            value={customFilters.fromMonth}
                            placeholder="Từ tháng"
                            title="Chọn tháng bắt đầu (MM/YYYY)"
                            onChange={handleFromMonthChange}
                            onClear={handleClearFromMonth}
                            hasError={isInvalidDateRange}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                            Đến tháng
                          </label>
                          <G7MonthPicker
                            value={customFilters.toMonth}
                            placeholder="Đến tháng"
                            title="Chọn tháng kết thúc (MM/YYYY)"
                            onChange={handleToMonthChange}
                            onClear={handleClearToMonth}
                            hasError={isInvalidDateRange}
                          />
                        </div>
                      </div>

                      {/* Cảnh báo đỏ khi Từ tháng > Đến tháng */}
                      {isInvalidDateRange && (
                        <div style={{ fontSize: '0.68rem', color: '#B91C1C', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>Thời gian Claim – Từ tháng không được lớn hơn Đến tháng.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dòng hàng & Trạng thái */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                        Dòng hàng:
                      </label>
                      <select
                        value={customFilters.productLine}
                        onChange={(e) => setCustomFilters((prev) => ({ ...prev, productLine: e.target.value }))}
                        style={{
                          width: '100%',
                          height: '26px',
                          padding: '0 4px',
                          border: '1px solid #E8E2DC',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          background: '#FFFFFF',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">Tất cả dòng hàng</option>
                        {availableProductLines.map((line) => (
                          <option key={line} value={line}>{line}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                        Trạng thái:
                      </label>
                      <select
                        value={customFilters.status}
                        onChange={(e) => setCustomFilters((prev) => ({ ...prev, status: e.target.value }))}
                        style={{
                          width: '100%',
                          height: '26px',
                          padding: '0 4px',
                          border: '1px solid #E8E2DC',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          background: '#FFFFFF',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">Tất cả trạng thái</option>
                        <option value="Mới">Mới</option>
                        <option value="Đang xem xét">Đang xem xét</option>
                        <option value="Đã xử lý">Đã xử lý</option>
                      </select>
                    </div>
                  </div>

                  {/* Mã lỗi KH & Tìm kiếm nhanh */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                        Mã lỗi KH:
                      </label>
                      <input
                        type="text"
                        placeholder="Nhập mã lỗi..."
                        value={customFilters.defectCode}
                        onChange={(e) => setCustomFilters((prev) => ({ ...prev, defectCode: e.target.value }))}
                        style={{
                          width: '100%',
                          height: '26px',
                          padding: '0 6px',
                          border: '1px solid #E8E2DC',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          background: '#FFFFFF',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                        Tìm kiếm nhanh:
                      </label>
                      <input
                        type="text"
                        placeholder="SKU, LPN, Cont..."
                        value={customFilters.keyword}
                        onChange={(e) => setCustomFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                        style={{
                          width: '100%',
                          height: '26px',
                          padding: '0 6px',
                          border: '1px solid #E8E2DC',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          background: '#FFFFFF',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.70rem', color: isInvalidDateRange ? '#B91C1C' : '#79543D', fontWeight: 600 }}>
                    {isInvalidDateRange ? (
                      '• Khoảng Thời gian Claim không hợp lệ (Từ tháng > Đến tháng). Vui lòng điều chỉnh lại.'
                    ) : (
                      <>• Tìm thấy <strong>{targetRecords.length}</strong> khiếu nại phù hợp với bộ lọc tùy chọn.</>
                    )}
                  </div>
                </div>
              )}

              {/* Thông báo lỗi nếu có */}
              {errorMessage && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '6px 10px', borderRadius: '5px', fontSize: '0.70rem', color: '#B91C1C' }}>
                  {errorMessage}
                </div>
              )}
            </div>

            {/* ── CỘT PHẢI (70% - 72%): XEM TRƯỚC EXCEL TRỰC TIẾP ── */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF'
              }}
            >
              {/* Header phụ của vùng Preview: Tinh gọn chỉ giữ Tiêu đề và Số lượng Claim */}
              <div
                style={{
                  height: '42px',
                  minHeight: '42px',
                  maxHeight: '42px',
                  padding: '0 16px',
                  backgroundColor: '#FAF6F0',
                  borderBottom: '1px solid #EADCC9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '12px',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#303030', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  XEM TRƯỚC EXCEL
                </span>
                <span style={{ fontSize: '0.70rem', backgroundColor: '#EFE7DE', color: '#5B3924', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {targetRecords.length} Claim
                </span>
              </div>

              {/* Vùng Bảng dữ liệu Preview cuộn dọc và ngang */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                  padding: '12px 16px',
                  backgroundColor: '#F8F6F4'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D6C7B2',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    minWidth: 'max-content'
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.72rem',
                      textAlign: 'left'
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#5B3924', color: '#FFFFFF', position: 'sticky', top: 0, zIndex: 10 }}>
                        {dynamicColumns.map((col) => (
                          <th
                            key={col.key}
                            style={{
                              padding: '9px 11px',
                              fontWeight: 700,
                              textAlign: col.align,
                              borderRight: '1px solid rgba(255,255,255,0.15)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPreviewRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={dynamicColumns.length}
                            style={{
                              padding: '40px 20px',
                              textAlign: 'center',
                              color: '#78716C',
                              fontSize: '0.76rem'
                            }}
                          >
                            {isInvalidDateRange ? (
                              <span style={{ color: '#B91C1C', fontWeight: 600 }}>
                                Khoảng Thời gian Claim không hợp lệ (Từ tháng &gt; Đến tháng). Vui lòng điều chỉnh lại bộ lọc.
                              </span>
                            ) : (
                              'Không tìm thấy khiếu nại nào phù hợp với bộ lọc đã chọn.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        paginatedPreviewRecords.map((claim, idx) => {
                          const absoluteIdx = startIdx + idx;
                          const data = extractClaimRowData(claim, absoluteIdx);

                          return (
                            <tr
                              key={claim.id || absoluteIdx}
                              style={{
                                backgroundColor: absoluteIdx % 2 === 0 ? '#FFFFFF' : '#FAF8F5',
                                borderBottom: '1px solid #EFEAE4'
                              }}
                            >
                              {/* 1. STT */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', color: '#78716C', fontWeight: 600 }}>
                                {data.stt}
                              </td>
                              {/* 2. Dòng hàng */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', color: '#44403C', fontWeight: 600 }}>
                                {data.dong_hang}
                              </td>
                              {/* 3. Mã tham chiếu */}
                              <td style={{ padding: '7px 9px', fontWeight: 700, color: '#303030' }}>
                                {data.claim_code}
                              </td>
                              {/* 4. Tên sản phẩm */}
                              <td style={{ padding: '7px 9px', color: '#1C1917', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={data.product_name}>
                                {data.product_name}
                              </td>
                              {/* 5. Mô tả */}
                              <td style={{ padding: '7px 9px', color: '#57534E', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={data.description}>
                                {data.description}
                              </td>
                              {/* 6. Mã lỗi KH */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', fontWeight: 600, color: '#991B1B' }}>
                                {data.order_code}
                              </td>
                              {/* 7. Mã lỗi G7 */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', fontWeight: 600, color: '#79543D' }}>
                                {data.company_error_code}
                              </td>
                              {/* 8. Tên lỗi G7 */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', color: '#44403C' }}>
                                {data.company_error_name}
                              </td>
                              {/* 9. Trạng thái */}
                              <td style={{ padding: '7px 9px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    backgroundColor:
                                      data.status === 'Đã xử lý' ? '#DCFCE7' :
                                      data.status === 'Đang xem xét' ? '#FEF3C7' : '#FEE2E2',
                                    color:
                                      data.status === 'Đã xử lý' ? '#166534' :
                                      data.status === 'Đang xem xét' ? '#92400E' : '#991B1B'
                                  }}
                                >
                                  {data.status}
                                </span>
                              </td>
                              {/* 10. Giá trị phạt */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', color: '#57534E', fontSize: '0.70rem' }}>
                                {data.penalty}
                              </td>
                              {/* 11. Tổng tiền phạt */}
                              <td style={{ padding: '7px 9px', textAlign: 'right', fontWeight: 700, color: '#B91C1C' }}>
                                {data.total_penalty !== '' ? `$${data.total_penalty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                              </td>
                              {/* 12. LPN */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', fontFamily: 'monospace', color: '#44403C' }}>
                                {data.lpn}
                              </td>
                              {/* 13. Container */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', fontFamily: 'monospace', color: '#44403C' }}>
                                {data.cont}
                              </td>
                              {/* 14. Thời gian Claim */}
                              <td style={{ padding: '7px 9px', textAlign: 'center', fontWeight: 600, color: '#79543D' }}>
                                {data.date}
                              </td>

                              {/* N Cột ảnh động (Hình ảnh 1..N) */}
                              {Array.from({ length: maxImages }).map((_, imgIdx) => {
                                const rawPath = (data.image_paths && data.image_paths[imgIdx]) || null;
                                const imgUrl = rawPath ? getFullImagePath(rawPath) : null;

                                return (
                                  <td
                                    key={`img_${imgIdx}`}
                                    style={{
                                      padding: '5px 8px',
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                      width: '76px',
                                      minWidth: '76px'
                                    }}
                                  >
                                    {imgUrl ? (
                                      <div
                                        onClick={() => setZoomedImage(imgUrl)}
                                        title="Bấm để phóng to ảnh minh chứng"
                                        style={{
                                          position: 'relative',
                                          width: '44px',
                                          height: '44px',
                                          margin: '0 auto',
                                          borderRadius: '4px',
                                          overflow: 'hidden',
                                          border: '1px solid #D6C7B2',
                                          cursor: 'pointer',
                                          backgroundColor: '#FAF8F5'
                                        }}
                                      >
                                        <img
                                          src={imgUrl}
                                          alt={`Ảnh ${imgIdx + 1}`}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                          }}
                                          loading="lazy"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                        <div
                                          style={{
                                            position: 'absolute',
                                            inset: 0,
                                            backgroundColor: 'rgba(91, 57, 36, 0.4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0,
                                            transition: 'opacity 0.15s ease'
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                                        >
                                          <Eye size={15} color="#FFFFFF" />
                                        </div>
                                      </div>
                                    ) : (
                                      <span style={{ color: '#D6D3D1', fontSize: '0.68rem' }}>—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Footer của bảng Preview: Chuyển cụm phân trang xuống cố định dưới bảng */}
              <div
                style={{
                  height: '38px',
                  minHeight: '38px',
                  maxHeight: '38px',
                  padding: '0 16px',
                  backgroundColor: '#FAF6F0',
                  borderTop: '1px solid #EADCC9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                  fontSize: '0.72rem',
                  color: '#57534E',
                  boxSizing: 'border-box'
                }}
              >
                {/* Bên trái: Hiển thị 1–30 trên 421 Claim */}
                <div style={{ fontWeight: 600, color: '#57534E' }}>
                  {totalRecords === 0
                    ? '0 Claim'
                    : `Hiển thị ${startIdx + 1}–${endIdx} trên ${totalRecords} Claim`}
                </div>

                {/* Bên phải: [‹] Trang 1 / 15 [›] */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safePage <= 1 || isExporting}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      border: '1px solid #D6D3D1',
                      borderRadius: '4px',
                      backgroundColor: safePage <= 1 ? '#F5F5F4' : '#FFFFFF',
                      cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                      color: safePage <= 1 ? '#A8A29E' : '#303030',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Trang trước"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontWeight: 700, padding: '0 4px', fontSize: '0.72rem', color: '#303030' }}>
                    Trang {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={safePage >= totalPages || isExporting}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      border: '1px solid #D6D3D1',
                      borderRadius: '4px',
                      backgroundColor: safePage >= totalPages ? '#F5F5F4' : '#FFFFFF',
                      cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                      color: safePage >= totalPages ? '#A8A29E' : '#303030',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Trang sau"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer cố định 54px của Popup */}
          <div
            style={{
              height: '54px',
              minHeight: '54px',
              maxHeight: '54px',
              padding: '0 20px',
              backgroundColor: '#FAF6F0',
              borderTop: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              flexShrink: 0,
              boxSizing: 'border-box'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              style={{
                padding: '6px 16px',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#57534E',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D6D3D1',
                borderRadius: '5px',
                cursor: isExporting ? 'not-allowed' : 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExporting || targetRecords.length === 0 || isInvalidDateRange}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 22px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: (isExporting || targetRecords.length === 0 || isInvalidDateRange) ? '#A8A29E' : '#79543D',
                border: 'none',
                borderRadius: '5px',
                cursor: (isExporting || targetRecords.length === 0 || isInvalidDateRange) ? 'not-allowed' : 'pointer',
                boxShadow: (isExporting || targetRecords.length === 0 || isInvalidDateRange) ? 'none' : '0 2px 4px rgba(91, 57, 36, 0.2)'
              }}
            >
              {isExporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang tải ảnh và tạo file Excel...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Xuất Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL PHÓNG TO ẢNH MINH CHỨNG KHI XEM TRƯỚC ── */}
      {zoomedImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(3px)',
            zIndex: 10005,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setZoomedImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomedImage}
              alt="Phóng to ảnh minh chứng"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)'
              }}
            />
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                backgroundColor: '#FFFFFF',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                color: '#303030'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ClaimExcelExportModal;
