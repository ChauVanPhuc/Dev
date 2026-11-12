import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
  ReferenceLine
} from 'recharts';
import {
  Calendar,
  RotateCcw,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  Palette,
  X,
  Eye,
  Image as ImageIcon,
  Package,
  Clock,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  BarChart3,
  Table
} from 'lucide-react';
import '../styles/claim.css';
import claimService from '../services/claim.service';
import {
  getMonthYear,
  calculateTotalPenalty,
  formatPenaltyValue,
  getFullImagePath,
  resolveG7ErrorCode,
  resolveG7ErrorName,
  getClaimYearMonth,
  processContainerDelays
} from '../utils/claimHelpers';
import { DashboardExportModal } from '@webShared/Views/components/common/DashboardExportModal';

const formatLocalYmd = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const computeDynamicPresetDates = (newPreset) => {
  if (!newPreset || newPreset === 'all' || newPreset === 'custom') {
    return { start: '', end: '' };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (newPreset === 'today') {
    const s = formatLocalYmd(today);
    return { start: s, end: s };
  }
  if (newPreset === 'yesterday') {
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    const s = formatLocalYmd(yest);
    return { start: s, end: s };
  }
  if (newPreset === 'this_week') {
    const dow = today.getDay() === 0 ? 7 : today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dow - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: formatLocalYmd(mon), end: formatLocalYmd(sun) };
  }
  if (newPreset === 'last_week') {
    const dow = today.getDay() === 0 ? 7 : today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dow - 1) - 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: formatLocalYmd(mon), end: formatLocalYmd(sun) };
  }
  if (newPreset === 'this_month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: formatLocalYmd(first), end: formatLocalYmd(last) };
  }
  if (newPreset === 'last_month') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: formatLocalYmd(first), end: formatLocalYmd(last) };
  }
  if (newPreset === 'this_year') {
    const y = today.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  return { start: '', end: '' };
};

// Định dạng tiền gọn cho Datalabel ($950, $1.2k, $3.8k)
const formatCompactMoney = (v) => {
  if (!v || v === 0) return '';
  const num = Number(v);
  if (isNaN(num)) return '';
  if (num >= 1000) {
    const kVal = num / 1000;
    return `$${kVal >= 10 ? Math.round(kVal) : kVal.toFixed(1).replace('.0', '')}k`;
  }
  return `$${Math.round(num)}`;
};

// Chuẩn hóa tên hình thức phạt và định dạng tiền USD cho thẻ Claim trong popup ảnh minh chứng
export const getClaimPenaltyDisplay = (claim, cabinetPrices = []) => {
  if (!claim) return { typeName: 'Pay 50', formattedAmt: '—', label: 'Pay 50 · —', style: {} };

  const rawType = String(claim.penalty_type || claim.penalty || claim.action || '').trim();
  const lower = rawType.toLowerCase();

  let typeName = 'Pay 50';
  if (lower.includes('x2') || lower.includes('unit')) {
    typeName = 'Pay x2';
  } else if (lower.includes('full') || lower.includes('ful bc')) {
    typeName = 'Pay Full';
  } else if (lower.includes('50')) {
    typeName = 'Pay 50';
  } else if (rawType) {
    const cleaned = rawType.split(/[-·•]/)[0].trim();
    typeName = cleaned || 'Pay 50';
  }

  let amt = null;
  if (claim.penalty_amount !== undefined && claim.penalty_amount !== null && claim.penalty_amount !== '') {
    const parsed = Number(claim.penalty_amount);
    if (!isNaN(parsed) && parsed > 0) {
      amt = parsed;
    }
  }

  if (amt === null) {
    const calc = calculateTotalPenalty(claim, undefined, cabinetPrices);
    if (!isNaN(calc) && calc > 0) {
      amt = calc;
    }
  }

  let formattedAmt = '—';
  if (amt !== null && !isNaN(amt) && amt > 0) {
    const hasDecimals = amt % 1 !== 0;
    formattedAmt = `$${amt.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? (amt * 10 % 1 !== 0 ? 2 : 1) : 0,
      maximumFractionDigits: 2
    })}`;
  }

  let badgeStyle = {
    color: '#57534E',
    backgroundColor: '#F5F5F4',
    border: '1px solid #E7E5E4'
  };

  if (typeName === 'Pay x2') {
    badgeStyle = {
      color: '#991B1B',
      backgroundColor: '#FEF2F2',
      border: '1px solid #FECACA'
    };
  } else if (typeName === 'Pay Full') {
    badgeStyle = {
      color: '#795137',
      backgroundColor: '#FAF6F2',
      border: '1px solid #EADCC9'
    };
  }

  return {
    typeName,
    formattedAmt,
    label: `${typeName} · ${formattedAmt}`,
    style: badgeStyle
  };
};

// Tháng hiện tại động (MM-YYYY)
const computeDefaultMonth = () => {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
};

// Tính tháng liền trước của một chuỗi MM-YYYY
const computePreviousMonth = (monthStr) => {
  if (!monthStr || monthStr === 'all') return null;
  const parts = monthStr.split('-');
  if (parts.length !== 2) return null;
  let m = parseInt(parts[0], 10);
  let y = parseInt(parts[1], 10);
  if (m === 1) {
    m = 12;
    y -= 1;
  } else {
    m -= 1;
  }
  return `${String(m).padStart(2, '0')}-${y}`;
};

// Sinh danh sách 12 tháng kết thúc tại tháng được chọn (mặc định tháng hiện tại)
const get12MonthsEndingAt = (targetMonthStr) => {
  const now = new Date();
  let endM = now.getMonth() + 1;
  let endY = now.getFullYear();
  if (targetMonthStr && targetMonthStr !== 'all' && /^\d{2}-\d{4}$/.test(targetMonthStr)) {
    const parts = targetMonthStr.split('-').map(Number);
    endM = parts[0];
    endY = parts[1];
  }
  const result = [];
  for (let i = 11; i >= 0; i--) {
    let m = endM - i;
    let y = endY;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const mStr = String(m).padStart(2, '0');
    result.push(`${mStr}-${y}`);
  }
  return result;
};

// Các mốc thời gian chuẩn đồng bộ toàn hệ thống ERP G7
export const TIME_PRESETS = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'this_week', label: 'Tuần này' },
  { key: 'last_week', label: 'Tuần trước' },
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'this_year', label: 'Năm nay' },
  { key: 'custom', label: 'Tùy chọn' },
  { key: 'all', label: 'Tất cả' }
];

// Bảng ánh xạ tiền tố mã lỗi sang nhóm lỗi nghiệp vụ chuẩn ERP G7 (đồng bộ với bảng defect_categories và CATEGORY_LABELS backend)
const categoryMap = {
  PAI: 'Sơn & Bề mặt',
  STR: 'Kết cấu',
  MAT: 'Nguyên liệu',
  APP: 'Ngoại quan',
  OTH: 'Khác',
  paint: 'Sơn & Bề mặt',
  structure: 'Kết cấu',
  material: 'Nguyên liệu',
  visual: 'Ngoại quan',
  other: 'Khác',
  tracking: 'Theo dõi',
  // Backward compatibility aliases
  'Sơn & Hoàn thiện': 'Sơn & Bề mặt',
  'Kết cấu & Kích thước': 'Kết cấu',
  'Vật liệu & Gỗ': 'Nguyên liệu',
  'Phụ kiện & Ngoại quan': 'Ngoại quan',
  'Theo dõi QC': 'Theo dõi'
};

export const getClaimCategory = (c) => {
  if (!c) return 'Khác';
  if (c.company_error_group || c.error_group || c.category) {
    const rawCat = String(c.company_error_group || c.error_group || c.category).trim();
    return categoryMap[rawCat] || rawCat;
  }
  const code = String(c.company_error_code || c.defect_code || '').trim();
  const prefix = code.includes('-') ? code.split('-')[0] : code.slice(0, 3);
  return categoryMap[prefix] || (prefix ? `Nhóm ${prefix}` : 'Khác');
};

export const getClaimDefectName = (c) => {
  if (!c) return 'Lỗi chưa phân loại';
  return String(c.company_error_name || c.defect_name || c.company_error_code || c.order_code || 'Lỗi chưa phân loại').trim();
};

export const getClaimColor = (c) => {
  if (!c) return '---';
  const sku = String(c.sku || c.product_name || '').trim();
  const parts = sku.split('-');
  return parts.length > 1 ? parts[parts.length - 1].trim() : (c.color || '---');
};

export const getClaimProductLine = (c) => {
  if (!c) return '---';
  const sku = String(c.sku || c.product_name || '').trim();
  const parts = sku.split('-');
  return parts.length > 0 && parts[0] ? parts[0].trim() : '---';
};

// Trích xuất timestamp chính xác theo giờ địa phương từ thông tin ngày/kỳ của Claim
const getClaimTimestamp = (c) => {
  if (!c) return 0;
  const raw = c.date || c.period || c.created_at || c.export_date;
  if (!raw) return 0;
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(`${str.slice(0, 10)}T00:00:00`).getTime();
  }
  const mmYyyy = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmYyyy) {
    const m = parseInt(mmYyyy[1], 10);
    const y = parseInt(mmYyyy[2], 10);
    return new Date(y, m - 1, 15).getTime();
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.getTime();
  return 0;
};

// Định dạng ngày hiển thị (VD: 2026-10-15 -> 15/10/2026)
const formatClaimDate = (dateVal) => {
  if (!dateVal) return '---';
  if (typeof dateVal === 'string' && dateVal.includes('T')) {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  if (typeof dateVal === 'string' && dateVal.includes('-')) {
    const parts = dateVal.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    if (parts.length === 2) return `Tháng ${parts[0]}/${parts[1]}`;
  }
  return String(dateVal);
};

// Tooltip tiêu chuẩn phong cách Light Theme ERP G7
const CustomChartTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E2DC',
        borderRadius: '6px',
        padding: '6px 10px',
        boxShadow: '0 4px 12px rgba(41, 37, 36, 0.1)',
        fontSize: '0.74rem',
        lineHeight: 1.4,
        zIndex: 1000
      }}
    >
      {label && (
        <div style={{ fontWeight: 700, color: '#5B3924', marginBottom: '3px', borderBottom: '1px solid #F2ECE7', paddingBottom: '2px' }}>
          {label}
        </div>
      )}
      {payload.map((entry, idx) => (
        <div key={`item-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', color: '#292524' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: entry.color || entry.fill, display: 'inline-block' }} />
            <span style={{ color: '#78716C' }}>{entry.name}:</span>
          </span>
          <strong style={{ fontWeight: 700, color: '#292524' }}>
            {entry.name && entry.name.toLowerCase().includes('phạt')
              ? `$${Number(entry.value).toLocaleString('en-US')}`
              : `${Number(entry.value).toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`}
          </strong>
        </div>
      ))}
    </div>
  );
};

// Tooltip chuyên biệt cho biểu đồ Pareto
const ParetoCustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  const isOther = item.code === 'OTHER' || item.name === 'Khác';

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E2DC',
        borderRadius: '6px',
        padding: '8px 12px',
        boxShadow: '0 4px 14px rgba(41, 37, 36, 0.12)',
        fontSize: '0.74rem',
        lineHeight: 1.4,
        maxWidth: '300px',
        zIndex: 1000
      }}
    >
      <div style={{ fontWeight: 800, color: '#5B3924', borderBottom: '1px solid #F2ECE7', paddingBottom: '4px', marginBottom: '4px' }}>
        {item.name} {item.code && item.code !== 'OTHER' ? `(${item.code})` : ''}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#292524', marginTop: '2px' }}>
        <span style={{ color: '#78716C' }}>Số lượt Claim:</span>
        <strong style={{ color: '#5B3924', fontWeight: 800 }}>{item.count} vụ</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#292524', marginTop: '2px' }}>
        <span style={{ color: '#78716C' }}>Tỷ trọng riêng:</span>
        <strong style={{ color: '#5B3924', fontWeight: 800 }}>{item.percentage}%</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#292524', marginTop: '2px' }}>
        <span style={{ color: '#78716C' }}>Tỷ trọng tích lũy:</span>
        <strong style={{ color: '#DC2626', fontWeight: 800 }}>{item.cumPercentage}%</strong>
      </div>

      {isOther && item.subItems && item.subItems.length > 0 && (
        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #E8E2DC' }}>
          <div style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: 700, marginBottom: '2px' }}>
            Chi tiết các lỗi gộp trong nhóm Khác ({item.subItems.length} lỗi):
          </div>
          <div style={{ maxHeight: '90px', overflowY: 'auto' }}>
            {item.subItems.map((sub, sIdx) => (
              <div key={sIdx} style={{ fontSize: '0.68rem', color: '#57534E', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  • {sub.name} ({sub.code})
                </span>
                <span style={{ fontWeight: 700, color: '#292524', flexShrink: 0 }}>
                  {sub.count} vụ
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Tooltip chuyên biệt cho biểu đồ Phân tích độ trễ xuất Container
const ContainerDelayCustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #EADCC9',
        borderRadius: '8px',
        padding: '12px 14px',
        boxShadow: '0 8px 24px rgba(91, 57, 36, 0.16)',
        fontSize: '0.74rem',
        color: '#292524',
        minWidth: '230px',
        width: 'max-content',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <div
        style={{
          borderBottom: '1px solid #EADCC9',
          paddingBottom: '8px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '2px',
            backgroundColor: data.color || '#7B5233',
            display: 'inline-block',
            flexShrink: 0
          }}
        />
        <span style={{ fontWeight: 800, fontSize: '0.80rem', color: '#5B3924' }}>
          Tháng xuất Container: {data.groupName}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#57534E', whiteSpace: 'nowrap' }}>Số vụ Claim</span>
          <span style={{ fontWeight: 700, color: '#292524', textAlign: 'right', whiteSpace: 'nowrap' }}>
            {data.claimCount} vụ ({data.percentage}%)
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#57534E', whiteSpace: 'nowrap' }}>Số Container</span>
          <span style={{ fontWeight: 600, color: '#292524', textAlign: 'right', whiteSpace: 'nowrap' }}>
            {data.containerCount || 0} cont
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#57534E', whiteSpace: 'nowrap' }}>Độ trễ đến khi Claim</span>
          <span style={{ fontWeight: 700, color: data.color || '#79543D', textAlign: 'right', whiteSpace: 'nowrap' }}>
            {data.delayTooltipText || data.delayText}
          </span>
        </div>
      </div>
    </div>
  );
};

// Tooltip cho biểu đồ Chi tiết sản phẩm bị Claim (chế độ theo Sản phẩm)
const ProductCustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #EADCC9',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 8px 20px rgba(91, 57, 36, 0.15)',
        fontSize: '0.73rem',
        color: '#292524',
        minWidth: '180px',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <div style={{ fontWeight: 800, fontSize: '0.80rem', color: '#7B5233', borderBottom: '1px solid #FAF6F0', paddingBottom: '4px', marginBottom: '6px' }}>
        SKU: {data.sku}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {data.color && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#57534E' }}>• Màu sắc:</span>
            <span style={{ fontWeight: 600, color: '#44403C' }}>{data.color}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#57534E' }}>• Số vụ claim:</span>
          <span style={{ fontWeight: 700, color: '#303030' }}>{data.count} vụ</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#57534E' }}>• Tỷ trọng:</span>
          <span style={{ fontWeight: 700, color: '#79543D' }}>{data.percentage}%</span>
        </div>
      </div>
    </div>
  );
};

// Tooltip cho biểu đồ Chi tiết sản phẩm bị Claim (chế độ theo Màu sắc)
const ColorCustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #EADCC9',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 8px 20px rgba(91, 57, 36, 0.15)',
        fontSize: '0.73rem',
        color: '#292524',
        minWidth: '180px',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <div style={{ fontWeight: 800, fontSize: '0.80rem', color: '#7B5233', borderBottom: '1px solid #FAF6F0', paddingBottom: '4px', marginBottom: '6px' }}>
        Màu: {data.color}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#57534E' }}>• Số vụ claim:</span>
          <span style={{ fontWeight: 700, color: '#303030' }}>{data.count} vụ</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#57534E' }}>• Tỷ trọng:</span>
          <span style={{ fontWeight: 700, color: '#79543D' }}>{data.percentage}%</span>
        </div>
      </div>
    </div>
  );
};

// Tooltip cho biểu đồ Phân bổ theo phương án xử lý
const PenaltyActionCustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #EADCC9',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 8px 20px rgba(91, 57, 36, 0.15)',
        fontSize: '0.73rem',
        color: '#292524',
        minWidth: '200px',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <div style={{ fontWeight: 800, fontSize: '0.80rem', color: '#7B5233', borderBottom: '1px solid #FAF6F0', paddingBottom: '4px', marginBottom: '6px' }}>
        {data.action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#57534E' }}>• Số vụ claim:</span>
          <span style={{ fontWeight: 700, color: '#303030' }}>{data.count} vụ ({data.percentage}%)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#57534E' }}>• Tổng tiền phạt:</span>
          <span style={{ fontWeight: 700, color: '#79543D' }}>${data.totalAmount ? data.totalAmount.toLocaleString('en-US') : 0}</span>
        </div>
      </div>
    </div>
  );
};

export const ClaimDashboardView = ({
  claims: propClaims,
  customerPenalties: propCustomerPenalties,
  cabinetPrices: propCabinetPrices,
  isOffscreenExport = false,
  exportFilterOverride = null
}) => {
  // Dữ liệu nội bộ tải từ API khi không truyền props
  const [internalClaims, setInternalClaims] = useState([]);
  const [internalCabinetPrices, setInternalCabinetPrices] = useState([]);
  const [defectCatalog, setDefectCatalog] = useState([]);
  const [g7DefectTypes, setG7DefectTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const isFetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  // State modal xem ảnh & mở rộng ghi chú
  const [selectedProductPhotos, setSelectedProductPhotos] = useState(null);
  const [activeLightbox, setActiveLightbox] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});

  const toggleNoteExpand = (id) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Customer penalty per month state (từ localStorage - hỗ trợ cả key mới 'smartflow_customer_penalties' và legacy 'claim_customer_penalties')
  const [customerPenalties] = useState(() => {
    try {
      const saved = localStorage.getItem('smartflow_customer_penalties') || localStorage.getItem('claim_customer_penalties');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Lỗi đọc localStorage customer penalties:', e);
    }
    return {};
  });

  // Chế độ xem toàn Dashboard & phân tích Card 3
  const [dashboardViewMode, setDashboardViewMode] = useState(exportFilterOverride?.dashboardViewMode || 'chart');
  const [productAnalysisType, setProductAnalysisType] = useState(exportFilterOverride?.productAnalysisType || 'product');

  // Bộ lọc nghiệp vụ (mặc định 'all' để hiển thị toàn bộ dữ liệu thực trong DB)
  const [preset, setPreset] = useState(exportFilterOverride ? 'custom' : 'all');
  const [startDate, setStartDate] = useState(exportFilterOverride?.startDate !== undefined ? exportFilterOverride.startDate : '');
  const [endDate, setEndDate] = useState(exportFilterOverride?.endDate !== undefined ? exportFilterOverride.endDate : '');
  const [selectedCategory, setSelectedCategory] = useState(exportFilterOverride?.category || '');
  const [selectedDefect, setSelectedDefect] = useState(exportFilterOverride?.defect || '');
  const [selectedColor, setSelectedColor] = useState(exportFilterOverride?.color || '');
  const [selectedProductLine, setSelectedProductLine] = useState(exportFilterOverride?.productLine || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Refs & state Xuất Dashboard
  const dashboardContainerRef = useRef(null);
  const offscreenExportRef = useRef(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [customExportSnapshot, setCustomExportSnapshot] = useState(null);
  const trendBarsRef = useRef([]);

  // Debounce tìm kiếm (280ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Đồng bộ props nếu exportFilterOverride thay đổi động
  useEffect(() => {
    if (exportFilterOverride) {
      if (exportFilterOverride.startDate !== undefined) setStartDate(exportFilterOverride.startDate);
      if (exportFilterOverride.endDate !== undefined) setEndDate(exportFilterOverride.endDate);
      if (exportFilterOverride.category !== undefined) setSelectedCategory(exportFilterOverride.category);
      if (exportFilterOverride.defect !== undefined) setSelectedDefect(exportFilterOverride.defect);
      if (exportFilterOverride.color !== undefined) setSelectedColor(exportFilterOverride.color);
      if (exportFilterOverride.productLine !== undefined) setSelectedProductLine(exportFilterOverride.productLine);
      if (exportFilterOverride.dashboardViewMode !== undefined) setDashboardViewMode(exportFilterOverride.dashboardViewMode);
      if (exportFilterOverride.productAnalysisType !== undefined) setProductAnalysisType(exportFilterOverride.productAnalysisType);
    }
  }, [exportFilterOverride]);

  const activeCardModes = useMemo(() => {
    if (exportFilterOverride?.cardDisplayModes) return exportFilterOverride.cardDisplayModes;
    const defaultMode = exportFilterOverride?.dashboardViewMode || dashboardViewMode || 'chart';
    return {
      trend: defaultMode,
      pareto: defaultMode,
      products: defaultMode,
      container: defaultMode,
      penalty: defaultMode
    };
  }, [exportFilterOverride?.cardDisplayModes, exportFilterOverride?.dashboardViewMode, dashboardViewMode]);

  const handleCategoryChange = useCallback((newCat) => {
    setSelectedCategory(newCat);
    setSelectedDefect('');
  }, []);

  const handlePresetChange = useCallback((newPreset) => {
    setPreset(newPreset);
    if (newPreset === 'custom') return;
    const { start, end } = computeDynamicPresetDates(newPreset);
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleStartDateChange = useCallback((val) => {
    setStartDate(val);
    setPreset('custom');
  }, []);

  const handleEndDateChange = useCallback((val) => {
    setEndDate(val);
    setPreset('custom');
  }, []);

  // Tải dữ liệu thật từ Backend API (/claims/claims, /cabinet-prices, /client-defects, /defect-types)
  const fetchData = useCallback(async () => {
    if (isOffscreenExport) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setErrorMsg('');
    try {
      const needsClaims = !(propClaims && propClaims.length > 0);
      const needsPrices = !(propCabinetPrices && propCabinetPrices.length > 0);

      const [claimsRes, pricesRes, clientDefRes, defectTypesRes] = await Promise.all([
        needsClaims ? claimService.getClaims() : Promise.resolve(null),
        needsPrices ? claimService.getCabinetPrices({ size: 5000 }).catch((e) => {
          console.error('[ClaimDashboardView] Error fetching cabinet prices:', e);
          return [];
        }) : Promise.resolve(null),
        claimService.getDefects().catch((e) => {
          console.error('[ClaimDashboardView] Error fetching client defects:', e);
          return [];
        }),
        claimService.getDefectTypes().catch((e) => {
          console.error('[ClaimDashboardView] Error fetching defect types:', e);
          return [];
        })
      ]);

      if (needsClaims && claimsRes) {
        const list = Array.isArray(claimsRes)
          ? claimsRes
          : (Array.isArray(claimsRes?.items) ? claimsRes.items : (Array.isArray(claimsRes?.data) ? claimsRes.data : []));
        setInternalClaims(list);
      }
      if (needsPrices && pricesRes) {
        const pList = Array.isArray(pricesRes)
          ? pricesRes
          : (Array.isArray(pricesRes?.items) ? pricesRes.items : []);
        setInternalCabinetPrices(pList);
      }
      if (clientDefRes) {
        const cdList = Array.isArray(clientDefRes)
          ? clientDefRes
          : (Array.isArray(clientDefRes?.items) ? clientDefRes.items : []);
        setDefectCatalog(cdList);
      }
      if (defectTypesRes) {
        const gtList = Array.isArray(defectTypesRes)
          ? defectTypesRes
          : (Array.isArray(defectTypesRes?.items) ? defectTypesRes.items : []);
        setG7DefectTypes(gtList);
      }
    } catch (err) {
      console.error('[ClaimDashboardView] Error loading claims dashboard data:', err);
      setErrorMsg(err?.response?.data?.detail || 'Không thể tải dữ liệu khiếu nại khách hàng từ máy chủ.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [propClaims, propCabinetPrices, isOffscreenExport]);

  useEffect(() => {
    if (isOffscreenExport) return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchData();
    }
  }, [fetchData, isOffscreenExport]);

  const cabinetPrices = useMemo(() => {
    return (propCabinetPrices && propCabinetPrices.length > 0) ? propCabinetPrices : internalCabinetPrices;
  }, [propCabinetPrices, internalCabinetPrices]);

  // Chuẩn hóa & ánh xạ mã lỗi G7 từ CustomerClaim DB
  const activeClaims = useMemo(() => {
    const rawList = (propClaims && propClaims.length > 0) ? propClaims : internalClaims;
    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    return rawList.map((c) => {
      const custCode = c.order_code || c.defect_code || '';
      const resolvedCode = c.company_error_code || resolveG7ErrorCode(custCode, defectCatalog);
      const resolvedName = c.company_error_name || resolveG7ErrorName(resolvedCode, custCode, g7DefectTypes, defectCatalog);

      let resolvedGroup = c.company_error_group || c.error_group || c.category || '';
      if (!resolvedGroup && resolvedCode && Array.isArray(g7DefectTypes) && g7DefectTypes.length > 0) {
        const firstCode = String(resolvedCode).split(',')[0].trim().toLowerCase();
        const matchType = g7DefectTypes.find((gt) => String(gt.code || '').trim().toLowerCase() === firstCode);
        if (matchType?.category) {
          resolvedGroup = matchType.category;
        }
      }

      return {
        ...c,
        sku: c.sku || c.product_name || '',
        product_name: c.product_name || c.sku || '',
        cont: c.cont || c.container_no || '',
        container_no: c.container_no || c.cont || '',
        penalty: c.penalty || c.action || '',
        notes: c.notes || c.description || c.claim_description || '',
        description: c.description || c.claim_description || c.notes || '',
        order_code: custCode,
        company_error_code: resolvedCode || '',
        company_error_name: resolvedName || c.defect_name || resolvedCode || custCode || 'Lỗi chưa phân loại',
        company_error_group: resolvedGroup
      };
    });
  }, [propClaims, internalClaims, defectCatalog, g7DefectTypes]);

  // Danh sách các tùy chọn bộ lọc nghiệp vụ động từ dữ liệu thật
  const availableCategories = useMemo(() => {
    const set = new Set();
    activeClaims.forEach(c => {
      const cat = getClaimCategory(c);
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [activeClaims]);

  const availableDefects = useMemo(() => {
    const set = new Set();
    activeClaims.forEach(c => {
      if (!selectedCategory || getClaimCategory(c) === selectedCategory) {
        const d = getClaimDefectName(c);
        if (d && d !== 'Lỗi chưa phân loại') set.add(d);
      }
    });
    return Array.from(set).sort();
  }, [activeClaims, selectedCategory]);

  const availableColors = useMemo(() => {
    const set = new Set();
    activeClaims.forEach(c => {
      const col = getClaimColor(c);
      if (col && col !== '---') set.add(col);
    });
    return Array.from(set).sort();
  }, [activeClaims]);

  const availableProductLines = useMemo(() => {
    const set = new Set();
    activeClaims.forEach(c => {
      const line = getClaimProductLine(c);
      if (line && line !== '---') set.add(line);
    });
    return Array.from(set).sort();
  }, [activeClaims]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (preset !== 'all') count++;
    if (selectedCategory) count++;
    if (selectedDefect) count++;
    if (selectedColor) count++;
    if (selectedProductLine) count++;
    return count;
  }, [preset, selectedCategory, selectedDefect, selectedColor, selectedProductLine]);

  const resetAllFilters = useCallback(() => {
    handlePresetChange('all');
    setSelectedCategory('');
    setSelectedDefect('');
    setSelectedColor('');
    setSelectedProductLine('');
    setSearchQuery('');
    setDebouncedSearch('');
  }, [handlePresetChange]);

  const renderClaimCustomFilters = useCallback(({ customFilters, updateFilter }) => (
    <div className="filter" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Từ ngày:
        </label>
        <input
          type="date"
          value={customFilters.startDate || ''}
          onChange={(e) => updateFilter('startDate', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 6px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Đến ngày:
        </label>
        <input
          type="date"
          value={customFilters.endDate || ''}
          onChange={(e) => updateFilter('endDate', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 6px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Nhóm lỗi:
        </label>
        <select
          value={customFilters.category || ''}
          onChange={(e) => {
            updateFilter('category', e.target.value);
            updateFilter('defect', '');
          }}
          style={{ width: '100%', height: '26px', padding: '0 4px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        >
          <option value="">Tất cả nhóm lỗi</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Dòng tủ:
        </label>
        <select
          value={customFilters.productLine || ''}
          onChange={(e) => updateFilter('productLine', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 4px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        >
          <option value="">Tất cả dòng tủ</option>
          {availableProductLines.map((pl) => (
            <option key={pl} value={pl}>{pl}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Màu sắc:
        </label>
        <select
          value={customFilters.color || ''}
          onChange={(e) => updateFilter('color', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 4px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        >
          <option value="">Tất cả màu</option>
          {availableColors.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Lỗi cụ thể:
        </label>
        <select
          value={customFilters.defect || ''}
          onChange={(e) => updateFilter('defect', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 4px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        >
          <option value="">Tất cả lỗi</option>
          {availableDefects.map((def) => (
            <option key={def} value={def}>{def}</option>
          ))}
        </select>
      </div>
    </div>
  ), [availableCategories, availableProductLines, availableColors, availableDefects]);

  const handleExportCustom = useCallback(async ({ filters, filenamePrefix, timestamp, exportElement }) => {
    setCustomExportSnapshot({
      ...filters,
      dashboardViewMode: filters.dashboardViewMode || dashboardViewMode,
      productAnalysisType,
      cardDisplayModes: filters.cardDisplayModes
    });

    try {
      await new Promise((r) => setTimeout(r, 450));
      if (offscreenExportRef.current && typeof exportElement === 'function') {
        await exportElement(offscreenExportRef.current, `${filenamePrefix}_Custom_${timestamp}`);
      }
    } catch (err) {
      console.error('[ClaimDashboardView] Lỗi trong tiến trình kết xuất ngầm:', err);
      throw err;
    } finally {
      setCustomExportSnapshot(null);
    }
  }, [dashboardViewMode, productAnalysisType]);

  const modalInitialFilters = useMemo(() => ({
    startDate: startDate || '',
    endDate: endDate || '',
    category: selectedCategory || '',
    defect: selectedDefect || '',
    color: selectedColor || '',
    productLine: selectedProductLine || '',
    dashboardViewMode,
    productAnalysisType
  }), [startDate, endDate, selectedCategory, selectedDefect, selectedColor, selectedProductLine, dashboardViewMode, productAnalysisType]);

  const activePenaltiesMap = useMemo(() => {
    return propCustomerPenalties || customerPenalties;
  }, [propCustomerPenalties, customerPenalties]);

  // Tháng mới nhất có dữ liệu thực trong DB
  const latestDataMonth = useMemo(() => {
    const monthSet = new Set();
    activeClaims.forEach(c => {
      const m = getMonthYear(c);
      if (m && /^\d{2}-\d{4}$/.test(m)) {
        monthSet.add(m);
      }
    });
    const arr = Array.from(monthSet);
    if (arr.length === 0) return computeDefaultMonth();
    arr.sort((a, b) => {
      const [mA, yA] = a.split('-').map(Number);
      const [mB, yB] = b.split('-').map(Number);
      if (yB !== yA) return yB - yA;
      return mB - mA;
    });
    return arr[0];
  }, [activeClaims]);

  // Tháng đại diện đang chọn (phục vụ biểu đồ xu hướng 12 tháng)
  const activeTargetMonth = useMemo(() => {
    if (endDate && preset !== 'all') {
      const parts = endDate.split('-');
      if (parts.length >= 2) return `${parts[1]}-${parts[0]}`;
    }
    return latestDataMonth;
  }, [endDate, preset, latestDataMonth]);

  // ==================== 1. TÍNH DỮ LIỆU 4 THẺ KPI ====================
  const periodClaims = useMemo(() => {
    let filtered = activeClaims;

    if (preset !== 'all' && (startDate || endDate)) {
      const startTs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const endTs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity;

      filtered = filtered.filter(c => {
        const ts = getClaimTimestamp(c);
        if (!ts) return false;
        return ts >= startTs && ts <= endTs;
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(c => getClaimCategory(c) === selectedCategory);
    }
    if (selectedDefect) {
      filtered = filtered.filter(c => getClaimDefectName(c) === selectedDefect);
    }
    if (selectedColor) {
      filtered = filtered.filter(c => getClaimColor(c) === selectedColor);
    }
    if (selectedProductLine) {
      filtered = filtered.filter(c => getClaimProductLine(c) === selectedProductLine);
    }

    if (debouncedSearch && debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      filtered = filtered.filter(c => {
        const sku = (c.sku || c.product_sku || c.product_name || '').toLowerCase();
        const container = (c.container_no || c.container || c.cont || '').toLowerCase();
        const lpn = (c.lpn || c.lpn_no || '').toLowerCase();
        const claimNo = (c.claim_no || c.claim_code || String(c.id || '')).toLowerCase();
        const customer = (c.customer_name || c.customer || '').toLowerCase();
        const defect = (getClaimDefectName(c) || '').toLowerCase();
        const cat = (getClaimCategory(c) || '').toLowerCase();
        const color = (getClaimColor(c) || '').toLowerCase();
        const line = (getClaimProductLine(c) || '').toLowerCase();
        return (
          sku.includes(q) ||
          container.includes(q) ||
          lpn.includes(q) ||
          claimNo.includes(q) ||
          customer.includes(q) ||
          defect.includes(q) ||
          cat.includes(q) ||
          color.includes(q) ||
          line.includes(q)
        );
      });
    }

    return filtered;
  }, [activeClaims, preset, startDate, endDate, selectedCategory, selectedDefect, selectedColor, selectedProductLine, debouncedSearch]);

  const prevPeriodClaims = useMemo(() => {
    if (preset === 'all' || !startDate || !endDate) return [];
    const startTs = new Date(`${startDate}T00:00:00`).getTime();
    const endTs = new Date(`${endDate}T23:59:59`).getTime();
    const duration = endTs - startTs;

    let pClaims = [];
    const [sY, sM] = startDate.split('-').map(Number);
    const [eY, eM] = endDate.split('-').map(Number);
    if (sY === eY && sM === eM && startDate.endsWith('-01')) {
      const prevM = sM === 1 ? 12 : sM - 1;
      const prevY = sM === 1 ? sY - 1 : sY;
      const prevMStr = String(prevM).padStart(2, '0');
      const prevLastDay = new Date(prevY, prevM, 0).getDate();
      const pStart = new Date(`${prevY}-${prevMStr}-01T00:00:00`).getTime();
      const pEnd = new Date(`${prevY}-${prevMStr}-${prevLastDay}T23:59:59`).getTime();
      pClaims = activeClaims.filter(c => {
        const ts = getClaimTimestamp(c);
        return ts >= pStart && ts <= pEnd;
      });
    } else {
      const pEnd = startTs - 1000;
      const pStart = pEnd - duration;
      pClaims = activeClaims.filter(c => {
        const ts = getClaimTimestamp(c);
        return ts >= pStart && ts <= pEnd;
      });
    }

    if (selectedCategory) {
      pClaims = pClaims.filter(c => getClaimCategory(c) === selectedCategory);
    }
    if (selectedDefect) {
      pClaims = pClaims.filter(c => getClaimDefectName(c) === selectedDefect);
    }
    if (selectedColor) {
      pClaims = pClaims.filter(c => getClaimColor(c) === selectedColor);
    }
    if (selectedProductLine) {
      pClaims = pClaims.filter(c => getClaimProductLine(c) === selectedProductLine);
    }

    return pClaims;
  }, [activeClaims, preset, startDate, endDate, selectedCategory, selectedDefect, selectedColor, selectedProductLine]);

  const currentClaimCount = periodClaims.length;
  const prevClaimCount = prevPeriodClaims.length;
  const hasPrevPeriod = preset !== 'all' && Boolean(startDate && endDate);

  const claimCountDiffPct = useMemo(() => {
    if (!hasPrevPeriod || prevClaimCount === 0) return null;
    return Math.round(((currentClaimCount - prevClaimCount) / prevClaimCount) * 100);
  }, [hasPrevPeriod, currentClaimCount, prevClaimCount]);

  const hasBusinessFilter = Boolean(selectedCategory || selectedDefect || selectedColor || selectedProductLine);

  const currentPenaltyAmount = useMemo(() => {
    if (!hasBusinessFilter && preset !== 'all' && activePenaltiesMap[activeTargetMonth] !== undefined && startDate && endDate) {
      const [sY, sM] = startDate.split('-');
      const [eY, eM] = endDate.split('-');
      if (sY === eY && sM === eM) {
        return Number(activePenaltiesMap[activeTargetMonth]);
      }
    }
    return Math.round(
      periodClaims.reduce((sum, c) => {
        if (c.penalty_amount !== undefined && c.penalty_amount !== null) return sum + Number(c.penalty_amount);
        return sum + Number(calculateTotalPenalty(c, undefined, cabinetPrices) || 0);
      }, 0)
    );
  }, [hasBusinessFilter, preset, activeTargetMonth, activePenaltiesMap, startDate, endDate, periodClaims, cabinetPrices]);

  const prevPenaltyAmount = useMemo(() => {
    if (!hasPrevPeriod || prevPeriodClaims.length === 0) return 0;
    if (!hasBusinessFilter) {
      const prevMonth = computePreviousMonth(activeTargetMonth);
      if (prevMonth && activePenaltiesMap[prevMonth] !== undefined) {
        return Number(activePenaltiesMap[prevMonth]);
      }
    }
    return Math.round(
      prevPeriodClaims.reduce((sum, c) => {
        if (c.penalty_amount !== undefined && c.penalty_amount !== null) return sum + Number(c.penalty_amount);
        return sum + Number(calculateTotalPenalty(c, undefined, cabinetPrices) || 0);
      }, 0)
    );
  }, [hasPrevPeriod, hasBusinessFilter, prevPeriodClaims, activeTargetMonth, activePenaltiesMap, cabinetPrices]);

  const penaltyDiffPct = useMemo(() => {
    if (!hasPrevPeriod || prevPenaltyAmount === 0) return null;
    return Math.round(((currentPenaltyAmount - prevPenaltyAmount) / prevPenaltyAmount) * 100);
  }, [hasPrevPeriod, currentPenaltyAmount, prevPenaltyAmount]);

  // KPI 3: Lô tồn xuất cũ (dựa trên field export_date thực tế từ dữ liệu Claim)
  const oldBatchKpi = useMemo(() => {
    let oldBatchCount = 0;
    let claimsWithExportCount = 0;
    const countedClaimIds = new Set();
    const totalPeriodClaims = periodClaims.length;
    const currentYear = new Date().getFullYear();

    periodClaims.forEach((c) => {
      const claimId = c.id || c.claim_code || c.claim_no;
      if (!claimId || countedClaimIds.has(claimId)) return;
      countedClaimIds.add(claimId);

      const exportDate = c.export_date || '';
      if (!exportDate || !/^\d{4}/.test(String(exportDate))) return;

      claimsWithExportCount += 1;

      const expYear = parseInt(String(exportDate).split(/[-/]/)[0], 10);
      const claimYm = getClaimYearMonth(c);
      const claimYear = claimYm ? claimYm.year : currentYear;

      if (expYear < claimYear) {
        oldBatchCount += 1;
      }
    });

    const pctOnTotal = totalPeriodClaims > 0
      ? (oldBatchCount / totalPeriodClaims) * 100
      : 0;
    const percentage = pctOnTotal.toFixed(1).replace('.', ',');

    const pctOnExport = claimsWithExportCount > 0
      ? (oldBatchCount / claimsWithExportCount) * 100
      : 0;
    const percentageOnExport = pctOnExport.toFixed(1).replace('.', ',');

    return {
      count: oldBatchCount,
      claimsWithExportCount,
      totalPeriodClaims,
      percentage,
      percentageOnExport
    };
  }, [periodClaims]);

  // KPI 4: Lũy kế đến tháng MM/YYYY
  const cumulativeKpi = useMemo(() => {
    let endYear = 0;
    let endMonth = 0;

    if (preset !== 'all' && endDate && endDate.includes('-')) {
      const parts = endDate.split('-');
      endYear = parseInt(parts[0], 10);
      endMonth = parseInt(parts[1], 10);
    } else if (preset !== 'all' && startDate && startDate.includes('-')) {
      const parts = startDate.split('-');
      endYear = parseInt(parts[0], 10);
      endMonth = parseInt(parts[1], 10);
    }

    if (!endYear || !endMonth || isNaN(endYear) || isNaN(endMonth)) {
      activeClaims.forEach((c) => {
        const ym = getClaimYearMonth(c);
        if (ym) {
          if (ym.year > endYear || (ym.year === endYear && ym.month > endMonth)) {
            endYear = ym.year;
            endMonth = ym.month;
          }
        }
      });
    }

    if (!endYear || !endMonth) {
      const now = new Date();
      endYear = now.getFullYear();
      endMonth = now.getMonth() + 1;
    }

    const endMonthLabel = `${String(endMonth).padStart(2, '0')}/${endYear}`;
    const endMonthIndex = endYear * 12 + endMonth;

    let cumulativeList = activeClaims.filter((c) => {
      const ym = getClaimYearMonth(c);
      if (!ym) return true;
      return ym.monthIndex <= endMonthIndex;
    });

    if (selectedCategory) {
      cumulativeList = cumulativeList.filter((c) => getClaimCategory(c) === selectedCategory);
    }
    if (selectedDefect) {
      cumulativeList = cumulativeList.filter((c) => getClaimDefectName(c) === selectedDefect);
    }
    if (selectedColor) {
      cumulativeList = cumulativeList.filter((c) => getClaimColor(c) === selectedColor);
    }
    if (selectedProductLine) {
      cumulativeList = cumulativeList.filter((c) => getClaimProductLine(c) === selectedProductLine);
    }
    if (debouncedSearch && debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      cumulativeList = cumulativeList.filter((c) => {
        const sku = (c.sku || c.product_sku || c.product_name || '').toLowerCase();
        const container = (c.container_no || c.container || c.cont || '').toLowerCase();
        const lpn = (c.lpn || c.lpn_no || '').toLowerCase();
        const claimNo = (c.claim_no || c.claim_code || String(c.id || '')).toLowerCase();
        const customer = (c.customer_name || c.customer || '').toLowerCase();
        const defect = (getClaimDefectName(c) || '').toLowerCase();
        return (
          sku.includes(q) ||
          container.includes(q) ||
          lpn.includes(q) ||
          claimNo.includes(q) ||
          customer.includes(q) ||
          defect.includes(q)
        );
      });
    }

    const uniqueMap = new Map();
    cumulativeList.forEach((c, idx) => {
      const key = c.id || c.claim_code || c.claim_no || `row-${idx}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, c);
      }
    });
    const uniqueCumulativeClaims = Array.from(uniqueMap.values());

    const totalCount = uniqueCumulativeClaims.length;
    const totalPenalty = Math.round(
      uniqueCumulativeClaims.reduce((sum, c) => {
        if (c.penalty_amount !== undefined && c.penalty_amount !== null) return sum + Number(c.penalty_amount);
        return sum + Number(calculateTotalPenalty(c, undefined, cabinetPrices) || 0);
      }, 0)
    );

    return {
      endMonthLabel,
      totalCount,
      totalPenalty
    };
  }, [activeClaims, preset, endDate, startDate, selectedCategory, selectedDefect, selectedColor, selectedProductLine, debouncedSearch, cabinetPrices]);

  // Chuỗi nhãn động hiển thị cho kỳ đang chọn
  const selectedPeriodLabel = useMemo(() => {
    const now = new Date();
    if (preset === 'all') return 'Tất cả các kỳ';
    if (preset === 'today') return 'Hôm nay';
    if (preset === 'yesterday') return 'Hôm qua';
    if (preset === 'this_week') return 'Tuần này';
    if (preset === 'last_week') return 'Tuần trước';
    if (preset === 'this_month') {
      return `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }
    if (preset === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `Tháng ${String(prev.getMonth() + 1).padStart(2, '0')}/${prev.getFullYear()}`;
    }
    if (preset === 'this_year') return `Năm ${now.getFullYear()}`;
    if (startDate && endDate) {
      if (startDate === endDate) return formatClaimDate(startDate);
      const [sY, sM, sD] = startDate.split('-');
      const [eY, eM, eD] = endDate.split('-');
      if (sY === eY && sM === eM && sD === '01') {
        const lastDay = new Date(Number(sY), Number(sM), 0).getDate();
        if (Number(eD) === lastDay) {
          return `Tháng ${sM}/${sY}`;
        }
      }
      return `${formatClaimDate(startDate)} – ${formatClaimDate(endDate)}`;
    }
    return 'Kỳ phân tích';
  }, [preset, startDate, endDate]);

  // Biểu đồ xu hướng 12 tháng
  const trend12MonthsData = useMemo(() => {
    const months12 = get12MonthsEndingAt(activeTargetMonth);

    let baseClaims = activeClaims;
    if (selectedCategory) {
      baseClaims = baseClaims.filter(c => getClaimCategory(c) === selectedCategory);
    }
    if (selectedDefect) {
      baseClaims = baseClaims.filter(c => getClaimDefectName(c) === selectedDefect);
    }
    if (selectedColor) {
      baseClaims = baseClaims.filter(c => getClaimColor(c) === selectedColor);
    }
    if (selectedProductLine) {
      baseClaims = baseClaims.filter(c => getClaimProductLine(c) === selectedProductLine);
    }

    return months12.map(mStr => {
      const [m, y] = mStr.split('-');
      const monthClaims = baseClaims.filter(c => getMonthYear(c) === mStr);
      const claimCount = monthClaims.length;

      const g7Penalty = Math.round(
        monthClaims.reduce((sum, c) => {
          if (c.penalty_amount !== undefined && c.penalty_amount !== null) return sum + Number(c.penalty_amount);
          return sum + Number(calculateTotalPenalty(c, undefined, cabinetPrices) || 0);
        }, 0)
      );

      let customerPenalty = 0;
      if (!hasBusinessFilter && activePenaltiesMap[mStr] !== undefined) {
        customerPenalty = Number(activePenaltiesMap[mStr]);
      } else {
        customerPenalty = g7Penalty;
      }

      return {
        monthKey: mStr,
        monthLabel: `T${m}/${y.slice(2)}`,
        claimCount,
        g7Penalty,
        customerPenalty
      };
    });
  }, [activeTargetMonth, activeClaims, activePenaltiesMap, cabinetPrices, selectedCategory, selectedDefect, selectedColor, selectedProductLine, hasBusinessFilter]);

  useEffect(() => {
    trendBarsRef.current = [];
  }, [trend12MonthsData]);

  const maxTrendCount = useMemo(() => Math.max(...trend12MonthsData.map(d => d.claimCount || 0), 1), [trend12MonthsData]);
  const maxTrendPenalty = useMemo(() => Math.max(...trend12MonthsData.map(d => Math.max(d.g7Penalty || 0, d.customerPenalty || 0)), 1000), [trend12MonthsData]);
  const domainLeftMax = useMemo(() => Math.ceil(maxTrendCount * 1.45), [maxTrendCount]);
  const domainRightMax = useMemo(() => Math.ceil(maxTrendPenalty * 1.45), [maxTrendPenalty]);

  const renderTrendClaimCountLabel = useCallback((props) => {
    const { x, y, width, height, value, index } = props;
    if (index !== undefined) {
      if (!trendBarsRef.current[index]) trendBarsRef.current[index] = {};
      trendBarsRef.current[index].claim = { x, y, width, height, value };
    }
    if (!value || value <= 0) return null;
    const cx = (x || 0) + (width || 11) / 2;
    const cy = (y || 0) - 5;

    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fill="#5B3924"
        fontSize={11.5}
        fontWeight={600}
        stroke="#FFFFFF"
        strokeWidth={2}
        paintOrder="stroke"
      >
        {value}
      </text>
    );
  }, []);

  const renderTrendCustomerPenaltyLabel = useCallback((props) => {
    const { x, y, width, height, value, index } = props;
    if (index !== undefined) {
      if (!trendBarsRef.current[index]) trendBarsRef.current[index] = {};
      trendBarsRef.current[index].customer = { x, y, width, height, value };
    }
    if (!value || value <= 0) return null;
    const text = formatCompactMoney(value);
    if (!text) return null;

    const cx = (x || 0) + (width || 11) / 2 + 1.5;
    const cy = (y || 0) - 5;

    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fill="#C48750"
        fontSize={11}
        fontWeight={600}
        stroke="#FFFFFF"
        strokeWidth={2}
        paintOrder="stroke"
      >
        {text}
      </text>
    );
  }, []);

  const renderTrendG7PenaltyLabel = useCallback((props) => {
    const { x, y, width, height, value, index } = props;
    if (index !== undefined) {
      if (!trendBarsRef.current[index]) trendBarsRef.current[index] = {};
      trendBarsRef.current[index].g7 = { x, y, width, height, value };
    }
    if (!value || value <= 0) return null;
    const text = formatCompactMoney(value);
    if (!text) return null;

    const cx = (x || 0) + (width || 11) / 2 - 1.5;
    const defaultCy = (y || 0) - 5;

    const dataItem = trend12MonthsData[index];
    const custValue = dataItem?.customerPenalty || 0;
    const claimValue = dataItem?.claimCount || 0;

    let custY = null;
    const cachedCustBar = trendBarsRef.current[index]?.customer;
    if (cachedCustBar?.y !== undefined) {
      custY = cachedCustBar.y;
    } else if (custValue > 0) {
      if (custValue === value) {
        custY = y;
      } else if (value > 0 && height) {
        const scale = height / value;
        const yBottom = y + height;
        custY = yBottom - custValue * scale;
      }
    }

    const claimBar = trendBarsRef.current[index]?.claim;
    const claimY = claimBar?.y ?? null;

    const conflictsWithCust = custValue > 0 && custY !== null && Math.abs(defaultCy - (custY - 5)) < 14;
    const conflictsWithClaim = claimValue > 0 && claimY !== null && Math.abs(defaultCy - (claimY - 5)) < 14;

    let cy = defaultCy;
    if (conflictsWithCust || conflictsWithClaim) {
      let conflictPeak = y;
      if (conflictsWithCust && custY !== null) conflictPeak = Math.min(conflictPeak, custY);
      if (conflictsWithClaim && claimY !== null) conflictPeak = Math.min(conflictPeak, claimY);
      cy = conflictPeak - 19;

      if (!conflictsWithClaim && claimY !== null && Math.abs(cy - (claimY - 5)) < 13) {
        cy = Math.min(conflictPeak, claimY) - 19;
      }
      if (!conflictsWithCust && custY !== null && Math.abs(cy - (custY - 5)) < 13) {
        cy = Math.min(conflictPeak, custY) - 19;
      }
    }

    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fill="#356AB0"
        fontSize={11}
        fontWeight={600}
        stroke="#FFFFFF"
        strokeWidth={2}
        paintOrder="stroke"
      >
        {text}
      </text>
    );
  }, [trend12MonthsData]);

  // Khối 2: Cơ cấu lỗi G7 (Pareto 80%)
  const paretoData = useMemo(() => {
    if (!periodClaims || periodClaims.length === 0) return { chartItems: [], otherDetails: [] };

    const counts = {};
    const names = {};
    periodClaims.forEach(c => {
      const code = String(c.company_error_code || c.order_code || 'CHUA_PHAN_LOAI').trim() || 'CHUA_PHAN_LOAI';
      const name = String(c.company_error_name || c.defect_name || code).trim();
      counts[code] = (counts[code] || 0) + 1;
      if (!names[code]) names[code] = name;
    });

    const sorted = Object.entries(counts)
      .map(([code, count]) => ({
        code,
        name: names[code] || code,
        count
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.code.localeCompare(b.code);
      });

    const totalDefectClaims = sorted.reduce((sum, item) => sum + item.count, 0);
    if (totalDefectClaims === 0) return { chartItems: [], otherDetails: [] };

    let runningCum = 0;
    const mainItems = [];
    const otherItems = [];
    let reached80 = false;

    sorted.forEach(item => {
      const pct = (item.count / totalDefectClaims) * 100;
      runningCum += pct;
      const itemWithCum = {
        ...item,
        percentage: Math.round(pct * 10) / 10,
        cumPercentage: Math.min(100, Math.round(runningCum * 10) / 10)
      };

      if (!reached80) {
        mainItems.push({
          ...itemWithCum,
          color: '#795137'
        });
        if (runningCum >= 80) {
          reached80 = true;
        }
      } else {
        otherItems.push(itemWithCum);
      }
    });

    const chartItems = [...mainItems];

    if (otherItems.length > 0) {
      const otherCount = otherItems.reduce((sum, i) => sum + i.count, 0);
      const otherPct = Math.round((otherCount / totalDefectClaims) * 1000) / 10;
      chartItems.push({
        code: 'OTHER',
        name: 'Khác',
        displayName: 'Khác',
        count: otherCount,
        percentage: otherPct,
        cumPercentage: 100,
        color: '#C4A78D',
        subItems: otherItems
      });
    }

    return {
      chartItems: chartItems.map(item => ({
        ...item,
        displayName: item.displayName || (item.name.length > 18 ? `${item.name.slice(0, 16)}…` : item.name)
      })),
      otherDetails: otherItems
    };
  }, [periodClaims]);

  const renderParetoCumLabel = useCallback((props) => {
    const { x, y, value, index } = props;
    if (value === undefined || value === null || isNaN(value)) return null;

    const numVal = Math.round(Number(value));
    const text = `${numVal}%`;
    const total = paretoData.chartItems.length;
    const isLast = index === total - 1;
    const isFirst = index === 0;

    const boxW = numVal >= 100 ? 34 : 28;
    const boxH = 17;

    let cx = x || 0;
    let cy = (y || 0) - 13;

    if (numVal >= 76 && numVal <= 84) {
      cy = (y || 0) - 16;
      cx = isLast ? cx - 10 : cx + 6;
    }

    if (isLast) {
      cx = Math.max(cx - 12, boxW / 2 + 4);
      cy = (y || 0) - 12;
    } else if (isFirst) {
      cx = cx + 4;
    }

    const rectX = cx - boxW / 2;
    const rectY = cy - boxH / 2;

    return (
      <g key={`pareto-badge-${index}`} style={{ pointerEvents: 'none' }}>
        <rect
          x={rectX}
          y={rectY}
          width={boxW}
          height={boxH}
          rx={4}
          ry={4}
          fill="#FFFFFF"
          stroke="#D4C7BC"
          strokeWidth={1}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#79543D"
          fontSize={11}
          fontWeight={600}
        >
          {text}
        </text>
      </g>
    );
  }, [paretoData.chartItems.length]);

  // Khối 3: Chi tiết sản phẩm bị Claim
  const productClaimsData = useMemo(() => {
    if (!periodClaims || periodClaims.length === 0) return [];

    const productMap = {};
    periodClaims.forEach(c => {
      const sku = String(c.sku || c.product_name || 'UNKNOWN').trim();
      if (!productMap[sku]) {
        const parts = sku.split('-');
        const color = parts.length > 1 ? parts[parts.length - 1].trim() : (c.color || '---');
        productMap[sku] = {
          sku,
          color,
          name: c.product_name || sku,
          claims: []
        };
      }
      productMap[sku].claims.push(c);
    });

    return Object.values(productMap).map(p => {
      const uniqueErrors = Array.from(
        new Set(p.claims.map(c => getClaimDefectName(c)))
      );
      return {
        sku: p.sku,
        color: p.color,
        name: p.name,
        caseCount: p.claims.length,
        errors: uniqueErrors,
        claims: p.claims
      };
    }).sort((a, b) => b.caseCount - a.caseCount);
  }, [periodClaims]);

  // Khối 4: Phân bổ theo phương án xử lý (Bảng ma trận)
  const penaltyMatrixData = useMemo(() => {
    if (!periodClaims || periodClaims.length === 0) {
      return { rows: [], totalCases: 0, totalX2: 0, totalFull: 0, total50: 0, totalAmount: 0 };
    }

    const groupMap = {};
    periodClaims.forEach(c => {
      const errorName = getClaimDefectName(c) || 'Khác';
      if (!groupMap[errorName]) {
        groupMap[errorName] = {
          name: errorName,
          count: 0,
          x2: 0,
          full: 0,
          pay50: 0,
          totalAmount: 0
        };
      }
      const g = groupMap[errorName];
      g.count += 1;

      const amt = (c.penalty_amount !== undefined && c.penalty_amount !== null)
        ? Number(c.penalty_amount)
        : Number(calculateTotalPenalty(c, undefined, cabinetPrices) || 0);
      g.totalAmount += amt;

      const pt = String(c.penalty_type || '').toLowerCase();
      const raw = String(c.penalty || c.action || '').toLowerCase();

      if (pt === 'pay x2' || raw.includes('x2') || raw.includes('unit')) {
        g.x2 += 1;
      } else if (pt === 'pay full' || raw.includes('full') || raw.includes('ful bc')) {
        g.full += 1;
      } else if (pt === 'pay 50' || raw.includes('50')) {
        g.pay50 += 1;
      } else {
        g.pay50 += 1;
      }
    });

    const rows = Object.values(groupMap).sort((a, b) => b.totalAmount - a.totalAmount);

    const totalCases = rows.reduce((s, r) => s + r.count, 0);
    const totalX2 = rows.reduce((s, r) => s + r.x2, 0);
    const totalFull = rows.reduce((s, r) => s + r.full, 0);
    const total50 = rows.reduce((s, r) => s + r.pay50, 0);
    const totalAmount = rows.reduce((s, r) => s + r.totalAmount, 0);

    return {
      rows: rows.map((r, idx) => ({
        ...r,
        rank: idx + 1,
        percentage: totalAmount > 0 ? Math.round((r.totalAmount / totalAmount) * 100) : 0
      })),
      totalCases,
      totalX2,
      totalFull,
      total50,
      totalAmount
    };
  }, [periodClaims, cabinetPrices]);

  // Mốc tháng tham chiếu động cho biểu đồ độ trễ xuất container
  const referenceMonthYear = useMemo(() => {
    if (startDate && startDate.length >= 7) {
      return startDate.slice(0, 7);
    }
    const [m, y] = activeTargetMonth.split('-');
    if (m && y) return `${y}-${m}`;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [startDate, activeTargetMonth]);

  // Khối 5: Phân tích độ trễ xuất Container đến khi phát sinh Claim (chỉ tính trên export_date thực tế)
  const containerDelayData = useMemo(() => {
    return processContainerDelays(periodClaims, {}, referenceMonthYear);
  }, [periodClaims, referenceMonthYear]);

  const productChartData = useMemo(() => {
    const topProducts = productClaimsData.slice(0, 8);
    const total = currentClaimCount;
    return topProducts.map(p => ({
      sku: p.sku,
      displayName: p.sku.length > 12 ? `${p.sku.slice(0, 10)}…` : p.sku,
      color: p.color,
      count: p.caseCount,
      percentage: total > 0 ? ((p.caseCount / total) * 100).toFixed(1) : 0
    }));
  }, [productClaimsData, currentClaimCount]);

  const colorChartData = useMemo(() => {
    if (!periodClaims || periodClaims.length === 0) return [];
    const map = {};
    periodClaims.forEach(c => {
      let col = getClaimColor(c);
      if (!col || col === '---') col = 'Chưa rõ';
      map[col] = (map[col] || 0) + 1;
    });

    const total = currentClaimCount;
    return Object.entries(map)
      .map(([color, count]) => ({
        color,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [periodClaims, currentClaimCount]);

  const penaltyActionChartData = useMemo(() => {
    if (!periodClaims || periodClaims.length === 0) return [];

    const map = {};
    const totalClaims = periodClaims.length;

    periodClaims.forEach(c => {
      const pt = String(c.penalty_type || '').toLowerCase();
      const raw = String(c.penalty || c.action || '').toLowerCase();

      let actionKey = '';
      let defaultColor = '#79543D';

      if (pt === 'pay full' || raw.includes('full') || raw.includes('ful bc')) {
        actionKey = 'Pay Full BC';
        defaultColor = '#79543D';
      } else if (pt === 'pay 50' || raw.includes('50')) {
        actionKey = 'Pay $50';
        defaultColor = '#C48750';
      } else if (pt === 'pay x2' || raw.includes('x2') || raw.includes('unit')) {
        actionKey = 'Pay x2 Unit';
        defaultColor = '#8D6242';
      } else if (raw.includes('0') || raw.includes('free') || raw.includes('reject') || raw.includes('hủy') || raw.includes('bác bỏ')) {
        actionKey = 'Pay $0 / Bác bỏ';
        defaultColor = '#A8A29E';
      } else if (c.action && c.action.trim()) {
        actionKey = c.action.trim();
        defaultColor = '#633F25';
      } else if (c.penalty_type && c.penalty_type.trim()) {
        actionKey = c.penalty_type.trim();
        defaultColor = '#633F25';
      } else {
        actionKey = 'Khác';
        defaultColor = '#737373';
      }

      if (!map[actionKey]) {
        map[actionKey] = {
          action: actionKey,
          count: 0,
          totalAmount: 0,
          color: defaultColor
        };
      }

      map[actionKey].count += 1;
      const amt = (c.penalty_amount !== undefined && c.penalty_amount !== null)
        ? Number(c.penalty_amount)
        : Number(calculateTotalPenalty(c, undefined, cabinetPrices) || 0);
      map[actionKey].totalAmount += amt;
    });

    const orderPriority = {
      'Pay Full BC': 1,
      'Pay $50': 2,
      'Pay x2 Unit': 3,
      'Pay $0 / Bác bỏ': 4
    };

    return Object.values(map)
      .map(item => {
        const pctNum = totalClaims > 0 ? (item.count / totalClaims) * 100 : 0;
        const percentage = pctNum.toFixed(1).replace('.', ',');
        return {
          ...item,
          percentage,
          pctNum,
          label: `${item.count} vụ (${percentage}%)`
        };
      })
      .sort((a, b) => {
        const pA = orderPriority[a.action] || 99;
        const pB = orderPriority[b.action] || 99;
        if (pA !== pB) return pA - pB;
        return b.count - a.count;
      });
  }, [periodClaims, cabinetPrices]);

  return (
    <div
      ref={dashboardContainerRef}
      className="erp-claim-dashboard"
      data-dashboard-title="Khiếu nại khách hàng"
      data-report-period={`Kỳ báo cáo: ${selectedPeriodLabel}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        flex: 1,
        padding: isOffscreenExport ? '10px 14px' : '4px 8px 6px 8px',
        gap: '4px',
        backgroundColor: '#F8F9FB',
        boxSizing: 'border-box',
        overflow: isOffscreenExport ? 'visible' : 'hidden'
      }}
    >
      <style>{`
        .erp-claim-dashboard,
        .erp-claim-dashboard * {
          box-sizing: border-box;
        }
        .erp-claim-dashboard-grid {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 0px !important;
          min-height: 0 !important;
          height: 100% !important;
          gap: 6px !important;
          overflow: hidden !important;
          width: 100% !important;
        }
        .erp-claim-row-top {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          height: 50% !important;
          flex: 1 1 0px !important;
          min-height: 0 !important;
          gap: 6px !important;
          width: 100% !important;
          overflow: hidden !important;
        }
        .erp-claim-row-bottom {
          display: grid !important;
          grid-template-columns: minmax(0, 35fr) minmax(0, 35fr) minmax(0, 30fr) !important;
          height: 50% !important;
          flex: 1 1 0px !important;
          min-height: 0 !important;
          gap: 6px !important;
          width: 100% !important;
          overflow: hidden !important;
        }
        .erp-claim-dashboard .erp-chart-wrapper {
          height: 100% !important;
          max-height: 100% !important;
          min-height: 0 !important;
          min-width: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .erp-claim-dashboard .erp-chart-card {
          height: 100% !important;
          max-height: 100% !important;
          min-height: 0 !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          padding: 6px 10px !important;
          background-color: #FFFFFF !important;
          border: 1px solid #E8E2DC !important;
          border-radius: 6px !important;
        }
        .erp-claim-dashboard .erp-chart-body {
          flex: 1 1 0px !important;
          min-height: 0 !important;
          position: relative !important;
          overflow: hidden !important;
          width: 100% !important;
        }
        .erp-claim-dashboard .erp-chart-body-inner {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        .erp-claim-dashboard .erp-claim-table-header {
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
          background-color: #FAF6F0 !important;
        }
        .erp-claim-dashboard .erp-claim-table-header tr {
          background-color: #FAF6F0 !important;
          border-bottom: 1px solid #EADCC9 !important;
        }
        .erp-claim-dashboard .erp-claim-table-header th {
          background-color: #FAF6F0 !important;
          color: #7B5233 !important;
          font-weight: 700 !important;
          font-size: 0.71rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.3px !important;
          border-bottom: 1px solid #EADCC9 !important;
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
          white-space: nowrap !important;
          padding: 6px 6px !important;
        }
        @media (max-width: 1200px) {
          .erp-claim-row-bottom {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }
        }
        @media (max-width: 900px) {
          .erp-claim-row-top {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .erp-claim-row-bottom {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>

      {/* ── HEADER BÁO CÁO KHI XUẤT ── */}
      <div
        className="dashboard-export-header"
        style={{
          display: isOffscreenExport ? 'flex' : 'none',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          backgroundColor: '#FAF6F0',
          border: '1.5px solid #EADCC9',
          borderRadius: '6px',
          marginBottom: '6px',
          boxSizing: 'border-box',
          width: '100%',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#303030' }}>
          Khiếu nại khách hàng
        </span>
        <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#79543D' }}>
          Kỳ báo cáo: {selectedPeriodLabel}
        </span>
      </div>

      {!isOffscreenExport && (
        <div
          data-toolbar="true"
          data-no-export="true"
          className="no-export dashboard-toolbar-container"
          style={{ display: 'flex', flexDirection: 'column', width: '100%', flexShrink: 0 }}
        >
          {/* 1. Thanh công cụ chính */}
          <div className="exp-toolbar" data-toolbar="true" data-no-export="true">
            {/* Cụm trái: Ô tìm kiếm + Nút bật/tắt Bộ lọc */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
              <div className="exp-search-box filter">
                <Search size={15} color="#7B5233" />
                <input
                  type="text"
                  placeholder="Tìm SKU, Container, LPN, mã Claim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="page-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearch('');
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#8D6E63' }}
                    title="Xóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className={`exp-btn-icon page-btn ${isFilterOpen || activeFiltersCount > 0 ? 'active' : ''}`}
                onClick={() => setIsFilterOpen(prev => !prev)}
                title="Bộ lọc nâng cao"
              >
                <Filter size={15} />
                {activeFiltersCount > 0 && <span className="exp-badge-count">{activeFiltersCount}</span>}
              </button>
            </div>

            {/* Cụm phải: Switch Biểu đồ/Bảng & Nút Xuất Dashboard */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#F0ECE6',
                  borderRadius: '6px',
                  padding: '2px',
                  border: '1px solid #EADCC9'
                }}
              >
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setDashboardViewMode('chart')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.70rem',
                    fontWeight: dashboardViewMode === 'chart' ? 700 : 500,
                    color: dashboardViewMode === 'chart' ? '#FFFFFF' : '#795137',
                    backgroundColor: dashboardViewMode === 'chart' ? '#795137' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Chế độ xem Biểu đồ"
                >
                  <BarChart3 size={12} />
                  <span>Biểu đồ</span>
                </button>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setDashboardViewMode('table')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.70rem',
                    fontWeight: dashboardViewMode === 'table' ? 700 : 500,
                    color: dashboardViewMode === 'table' ? '#FFFFFF' : '#795137',
                    backgroundColor: dashboardViewMode === 'table' ? '#795137' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Chế độ xem Bảng dữ liệu chi tiết"
                >
                  <Table size={12} />
                  <span>Bảng</span>
                </button>
              </div>

              <button
                type="button"
                className="exp-btn-brown page-btn"
                onClick={() => setIsExportModalOpen(true)}
                title="Xuất báo cáo Dashboard (PNG/PDF)"
              >
                <Download size={14} />
                <span>Xuất Dashboard</span>
              </button>
            </div>
          </div>

          {/* 2. Vùng bộ lọc mở rộng */}
          {isFilterOpen && (
            <div className="exp-filter-inline-bar filter">
              <div className="exp-filter-item">
                <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Calendar size={12} />
                  Thời gian:
                </span>
                <select
                  value={preset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className={`exp-filter-select ${preset !== 'all' ? 'has-value' : ''}`}
                >
                  {TIME_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="exp-filter-item">
                <span className="exp-filter-item-label">Từ</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  disabled={preset === 'all'}
                  className="exp-filter-input exp-filter-date-input"
                  style={{ cursor: preset === 'all' ? 'not-allowed' : 'pointer' }}
                />
                <span className="exp-filter-item-label">Đến</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  disabled={preset === 'all'}
                  className="exp-filter-input exp-filter-date-input"
                  style={{ cursor: preset === 'all' ? 'not-allowed' : 'pointer' }}
                />
              </div>

              <div className="exp-filter-item">
                <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <AlertCircle size={12} />
                  Nhóm lỗi:
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={`exp-filter-select ${selectedCategory ? 'has-value' : ''}`}
                  style={{ minWidth: '100px' }}
                >
                  <option value="">Tất cả nhóm lỗi</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="exp-filter-item">
                <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <AlertTriangle size={12} />
                  Lỗi:
                </span>
                <select
                  value={selectedDefect}
                  onChange={(e) => setSelectedDefect(e.target.value)}
                  className={`exp-filter-select ${selectedDefect ? 'has-value' : ''}`}
                  style={{ minWidth: '90px', maxWidth: '140px' }}
                >
                  <option value="">Tất cả lỗi</option>
                  {availableDefects.map((def) => (
                    <option key={def} value={def}>
                      {def}
                    </option>
                  ))}
                </select>
              </div>

              <div className="exp-filter-item">
                <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Palette size={12} />
                  Màu:
                </span>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className={`exp-filter-select ${selectedColor ? 'has-value' : ''}`}
                  style={{ minWidth: '85px' }}
                >
                  <option value="">Tất cả màu</option>
                  {availableColors.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div className="exp-filter-item">
                <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Package size={12} />
                  Dòng tủ:
                </span>
                <select
                  value={selectedProductLine}
                  onChange={(e) => setSelectedProductLine(e.target.value)}
                  className={`exp-filter-select ${selectedProductLine ? 'has-value' : ''}`}
                  style={{ minWidth: '85px' }}
                >
                  <option value="">Tất cả dòng tủ</option>
                  {availableProductLines.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={resetAllFilters}
                className="exp-btn-reset page-btn"
                title="Đặt lại toàn bộ bộ lọc về mặc định"
              >
                <RotateCcw size={12} />
                <span>Đặt lại</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Banner lỗi kết nối API nếu có */}
      {errorMsg && (
        <div
          style={{
            margin: '2px 0',
            padding: '6px 12px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            fontSize: '0.74rem',
            color: '#991B1B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={15} />
            <span style={{ fontWeight: 700 }}>{errorMsg}</span>
          </div>
          <button
            type="button"
            className="page-btn"
            onClick={fetchData}
            style={{
              padding: '3px 10px',
              backgroundColor: '#795137',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.70rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={11} /> Thử lại
          </button>
        </div>
      )}

      {/* ── 4 THẺ KPI PHÍA TRÊN ── */}
      <div className="erp-kpi-grid-4" style={{ flexShrink: 0, height: '52px', minHeight: '52px' }}>
        {/* KPI 1: Tổng số Claim */}
        <div className="erp-kpi-card" style={{ height: '52px', minHeight: '52px' }}>
          <div className="erp-kpi-left">
            <span className="erp-kpi-title">Tổng số Claim</span>
            <div className="erp-kpi-delta">
              {claimCountDiffPct !== null ? (
                <>
                  <span
                    className="erp-kpi-delta-val"
                    style={{
                      color: claimCountDiffPct > 0 ? '#C54141' : claimCountDiffPct < 0 ? '#15803D' : '#737373',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    {claimCountDiffPct > 0 ? <TrendingUp size={11} /> : claimCountDiffPct < 0 ? <TrendingDown size={11} /> : null}
                    {claimCountDiffPct > 0 ? `+${claimCountDiffPct}%` : `${claimCountDiffPct}%`}
                  </span>
                  <span className="erp-kpi-delta-label">vs kỳ trước</span>
                </>
              ) : (
                <span className="erp-kpi-delta-label">
                  {loading ? 'Đang tải...' : (currentClaimCount === 0 ? 'Không có phát sinh' : 'Chưa có kỳ so sánh')}
                </span>
              )}
            </div>
          </div>
          <div className="erp-kpi-right">
            <span className="erp-kpi-value" style={{ color: '#303030' }}>{currentClaimCount}</span>
            <span className="erp-kpi-unit">vụ</span>
          </div>
        </div>

        {/* KPI 2: Tiền phạt khách hàng */}
        <div className="erp-kpi-card" style={{ height: '52px', minHeight: '52px' }}>
          <div className="erp-kpi-left">
            <span className="erp-kpi-title">Tiền phạt khách hàng</span>
            <div className="erp-kpi-delta">
              {penaltyDiffPct !== null ? (
                <>
                  <span
                    className="erp-kpi-delta-val"
                    style={{
                      color: penaltyDiffPct > 0 ? '#C54141' : penaltyDiffPct < 0 ? '#15803D' : '#737373',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    {penaltyDiffPct > 0 ? <TrendingUp size={11} /> : penaltyDiffPct < 0 ? <TrendingDown size={11} /> : null}
                    {penaltyDiffPct > 0 ? `+${penaltyDiffPct}%` : `${penaltyDiffPct}%`}
                  </span>
                  <span className="erp-kpi-delta-label">vs kỳ trước</span>
                </>
              ) : (
                <span className="erp-kpi-delta-label">
                  {currentPenaltyAmount === 0 ? 'Không có phát sinh' : 'Chưa có kỳ so sánh'}
                </span>
              )}
            </div>
          </div>
          <div className="erp-kpi-right">
            <span className="erp-kpi-value" style={{ color: '#5B3924' }}>
              ${currentPenaltyAmount.toLocaleString('en-US')}
            </span>
            <span className="erp-kpi-unit">USD</span>
          </div>
        </div>

        {/* KPI 3: Lô tồn xuất cũ */}
        <div className="erp-kpi-card" style={{ height: '52px', minHeight: '52px' }}>
          <div className="erp-kpi-left">
            <span
              className="erp-kpi-title"
              title={`Số khiếu nại phát sinh từ container xuất trước năm phát sinh Claim (ExportYear < ClaimYear): ${oldBatchKpi.count}/${oldBatchKpi.totalPeriodClaims} vụ (${oldBatchKpi.claimsWithExportCount} vụ có ngày xuất).`}
            >
              Lô tồn xuất cũ
            </span>
            <div className="erp-kpi-delta">
              <span className="erp-kpi-delta-label">
                {oldBatchKpi.claimsWithExportCount > 0 ? (
                  <>
                    <strong style={{ color: '#79543D' }}>{oldBatchKpi.percentage}%</strong> tổng Claim trong kỳ
                  </>
                ) : (
                  'Chưa có ngày xuất cont'
                )}
              </span>
            </div>
          </div>
          <div className="erp-kpi-right">
            <span className="erp-kpi-value" style={{ color: oldBatchKpi.count > 0 ? '#79543D' : '#303030' }}>
              {oldBatchKpi.count}
            </span>
            <span className="erp-kpi-unit">vụ</span>
          </div>
        </div>

        {/* KPI 4: Lũy kế đến tháng MM/YYYY */}
        <div className="erp-kpi-card" style={{ height: '52px', minHeight: '52px' }}>
          <div className="erp-kpi-left" style={{ overflow: 'hidden' }}>
            <span
              className="erp-kpi-title"
              title={`Tổng số vụ Claim và tổng tiền phạt lũy kế đến hết tháng ${cumulativeKpi.endMonthLabel}`}
            >
              Lũy kế đến {cumulativeKpi.endMonthLabel}
            </span>
            <div className="erp-kpi-delta" style={{ width: '100%' }}>
              <span
                className="erp-kpi-delta-label"
                style={{ color: '#5B3924', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                Tổng phạt: <strong style={{ color: '#A0301B' }}>${cumulativeKpi.totalPenalty.toLocaleString('en-US')}</strong>
              </span>
            </div>
          </div>
          <div className="erp-kpi-right" style={{ textAlign: 'right' }}>
            <span className="erp-kpi-value" style={{ color: '#5B3924' }}>
              {cumulativeKpi.totalCount}
            </span>
            <span className="erp-kpi-unit">vụ</span>
          </div>
        </div>
      </div>

      {/* ── BỐ CỤC 5 KHỐI NỘI DUNG CHÍNH ── */}
      <div className="erp-claim-dashboard-grid">
        {/* HÀNG 1 (2 CỘT: 50% / 50%) */}
        <div className="erp-claim-row-top">
          {/* HÀNG 1 – TRÁI: Xu hướng Claim & Tiền phạt theo tháng */}
          <div className="erp-chart-wrapper">
            <div className="erp-chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px', flexShrink: 0, height: '20px' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#303030' }}>
                  Xu hướng Claim &amp; Tiền phạt theo tháng
                </span>
                <span style={{ fontSize: '0.67rem', color: '#737373', backgroundColor: '#F8F9FB', padding: '1px 6px', borderRadius: '4px', border: '1px solid #E8E2DC' }}>
                  12 tháng gần nhất
                </span>
              </div>

              <div className="erp-chart-body">
                <div className="erp-chart-body-inner">
                  {activeCardModes.trend === 'table' ? (
                    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                        <thead className="erp-claim-table-header">
                          <tr>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Tháng</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Số Claim</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Phạt KH ($)</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Phạt G7 ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trend12MonthsData.map((row, idx) => (
                            <tr key={row.monthKey || idx} style={{ borderBottom: '1px solid #F0ECE6', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F6' }}>
                              <td style={{ padding: '5px 8px', fontWeight: 600, color: '#303030' }}>{row.monthKey.replace('-', '/')}</td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: '#79543D' }}>{row.claimCount} vụ</td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', color: '#C48750', fontWeight: 600 }}>{formatPenaltyValue(row.customerPenalty)}</td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', color: '#356AB0', fontWeight: 600 }}>{formatPenaltyValue(row.g7Penalty)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trend12MonthsData}
                        margin={{ top: 28, right: 10, left: 10, bottom: 2 }}
                        barCategoryGap="16%"
                        barGap={2}
                      >
                        <XAxis
                          dataKey="monthLabel"
                          tick={{ fontSize: 9.5, fill: '#737373' }}
                          interval={0}
                          height={18}
                          axisLine={{ stroke: '#E8E2DC' }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          hide={true}
                          domain={[0, () => domainLeftMax]}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          hide={true}
                          domain={[0, () => domainRightMax]}
                        />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend verticalAlign="top" height={18} wrapperStyle={{ fontSize: '0.69rem', paddingBottom: '2px' }} />

                        <Bar
                          yAxisId="left"
                          dataKey="claimCount"
                          name="Số lượng Claim (vụ)"
                          fill="#79543D"
                          radius={[2, 2, 0, 0]}
                          maxBarSize={11}
                        >
                          <LabelList dataKey="claimCount" content={renderTrendClaimCountLabel} />
                        </Bar>

                        <Bar
                          yAxisId="right"
                          dataKey="g7Penalty"
                          name="Tiền phạt G7 (USD)"
                          fill="#356AB0"
                          radius={[2, 2, 0, 0]}
                          maxBarSize={11}
                        >
                          <LabelList dataKey="g7Penalty" content={renderTrendG7PenaltyLabel} />
                        </Bar>

                        <Bar
                          yAxisId="right"
                          dataKey="customerPenalty"
                          name="Phạt KH (USD)"
                          fill="#C48750"
                          radius={[2, 2, 0, 0]}
                          maxBarSize={11}
                        >
                          <LabelList dataKey="customerPenalty" content={renderTrendCustomerPenaltyLabel} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* HÀNG 1 – PHẢI: Cơ cấu lỗi G7 (Pareto 80%) */}
          <div className="erp-chart-wrapper">
            <div className="erp-chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px', flexShrink: 0, height: '20px' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#303030' }}>
                  Cơ cấu lỗi G7 (Pareto 80%)
                </span>
              </div>

              <div className="erp-chart-body">
                <div className="erp-chart-body-inner">
                  {paretoData.chartItems.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#A8A29E', gap: '4px' }}>
                      <AlertCircle size={22} style={{ color: '#D6D3D1' }} />
                      <span style={{ fontSize: '0.74rem' }}>Không có phát sinh lỗi phù hợp với bộ lọc hiện tại</span>
                    </div>
                  ) : activeCardModes.pareto === 'table' ? (
                    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                        <thead className="erp-claim-table-header">
                          <tr>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Nhóm lỗi</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Số vụ</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Tỷ trọng</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Tích lũy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paretoData.chartItems.map((entry, idx) => (
                            <tr key={entry.code || idx} style={{ borderBottom: '1px solid #F0ECE6', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F6' }}>
                              <td style={{ padding: '5px 8px', fontWeight: 600, color: '#303030' }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, marginRight: 6 }} />
                                {entry.name || entry.displayName}
                              </td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: '#79543D' }}>{entry.count} vụ</td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', color: '#57534E', fontWeight: 600 }}>{entry.percentage}%</td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', color: '#C48750', fontWeight: 700 }}>{entry.cumPercentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={paretoData.chartItems} margin={{ top: 22, right: 14, left: 14, bottom: 20 }}>
                        <XAxis
                          dataKey="displayName"
                          tick={{ fontSize: 8.5, fill: '#737373' }}
                          interval={0}
                          angle={-12}
                          textAnchor="end"
                          height={24}
                        />
                        <YAxis yAxisId="left" hide={true} allowDecimals={false} />
                        <YAxis yAxisId="right" orientation="right" hide={true} domain={[0, 100]} />
                        <Tooltip content={<ParetoCustomTooltip />} />
                        <Legend verticalAlign="top" height={18} wrapperStyle={{ fontSize: '0.68rem', paddingBottom: '2px' }} />
                        <ReferenceLine
                          yAxisId="right"
                          y={80}
                          stroke="#AD8668"
                          strokeDasharray="4 4"
                          strokeWidth={1.2}
                          label={{ value: 'Mốc 80%', fill: '#79543D', fontSize: 9, fontWeight: 700, position: 'insideTopRight', offset: 6 }}
                        />
                        <Bar yAxisId="left" dataKey="count" name="Số lượt Claim (vụ)" radius={[2, 2, 0, 0]} maxBarSize={26}>
                          {paretoData.chartItems.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                          <LabelList dataKey="count" position="top" fill="#5B3924" fontSize={9} fontWeight={700} />
                        </Bar>
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="cumPercentage"
                          name="Tỷ trọng tích lũy (%)"
                          stroke="#C48750"
                          strokeWidth={2}
                          dot={{ r: 3.5, fill: '#C48750', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                          activeDot={{ r: 5, fill: '#C48750' }}
                        >
                          <LabelList dataKey="cumPercentage" content={renderParetoCumLabel} />
                        </Line>
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HÀNG 2 (3 CỘT: 35% / 35% / 30%) */}
        <div className="erp-claim-row-bottom">
          {/* HÀNG 2 – CỘT 1 (35%): Chi tiết sản phẩm bị Claim */}
          <div className="erp-chart-wrapper">
            <div className="erp-chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px', flexShrink: 0, height: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                  <Package size={13} style={{ color: '#79543D', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#303030', whiteSpace: 'nowrap' }}>
                    Chi tiết sản phẩm bị Claim
                  </span>
                </div>

                {activeCardModes.products === 'chart' && (
                  <div className="filter" style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <select
                      value={productAnalysisType}
                      onChange={(e) => setProductAnalysisType(e.target.value)}
                      title="Phân tích theo"
                      aria-label="Phân tích theo"
                      style={{
                        height: '21px',
                        padding: '0 6px',
                        border: '1px solid #E8E2DC',
                        borderRadius: '4px',
                        backgroundColor: '#F8F9FB',
                        fontSize: '0.67rem',
                        fontWeight: 600,
                        color: '#5B3924',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#795137'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8E2DC'; }}
                    >
                      <option value="product">Sản phẩm</option>
                      <option value="color">Màu sắc</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="erp-chart-body">
                {productClaimsData.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#A8A29E', gap: '4px' }}>
                    <AlertCircle size={22} style={{ color: '#D6D3D1' }} />
                    <span style={{ fontSize: '0.74rem' }}>Không có phát sinh sản phẩm bị khiếu nại phù hợp với bộ lọc hiện tại</span>
                  </div>
                ) : activeCardModes.products === 'table' ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: '100%',
                      height: '100%',
                      border: '1px solid #E8E2DC',
                      borderRadius: '5px',
                      backgroundColor: '#FFFFFF',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.70rem', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '27%' }} />
                          <col style={{ width: '16%' }} />
                          <col style={{ width: '14%' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '18%' }} />
                        </colgroup>
                        <thead className="erp-claim-table-header">
                          <tr>
                            <th style={{ textAlign: 'left' }}>SKU</th>
                            <th style={{ textAlign: 'center' }}>Màu</th>
                            <th style={{ textAlign: 'center' }}>Số ca</th>
                            <th style={{ textAlign: 'left' }}>Lỗi gì</th>
                            <th style={{ textAlign: 'center' }}>Xem ảnh</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productClaimsData.map((item, idx) => (
                            <tr
                              key={item.sku || idx}
                              style={{ borderBottom: '1px solid #F8F9FB', transition: 'background-color 0.15s ease' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F9FB'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <td style={{ padding: '5px 6px', fontFamily: 'monospace', fontWeight: 700, color: '#5B3924', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.sku}>
                                {item.sku}
                              </td>
                              <td style={{ padding: '5px 2px', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#FAF6F2', border: '1px solid #EADCC9', borderRadius: '4px', padding: '1px 4px', fontSize: '0.65rem', fontWeight: 700, color: '#795137' }}>
                                  {item.color}
                                </span>
                              </td>
                              <td style={{ padding: '5px 2px', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#FAF6F2', border: '1px solid #EADCC9', borderRadius: '10px', padding: '1px 6px', fontSize: '0.68rem', fontWeight: 700, color: '#79543D' }}>
                                  {item.caseCount}
                                </span>
                              </td>
                              <td style={{ padding: '5px 6px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  {item.errors.slice(0, 1).map((err, eIdx) => (
                                    <div key={eIdx} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#292524', lineHeight: 1.25 }}>
                                      <span style={{ color: '#795137', fontSize: '0.68rem', lineHeight: 1, flexShrink: 0 }}>•</span>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={err}>{err}</span>
                                    </div>
                                  ))}
                                  {item.errors.length > 1 && (
                                    <div
                                      style={{ fontSize: '0.63rem', color: '#B45309', fontWeight: 600, paddingLeft: '6px' }}
                                      title={item.errors.slice(1).join(', ')}
                                    >
                                      +{item.errors.length - 1} lỗi…
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '5px 2px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="page-btn"
                                  onClick={() => setSelectedProductPhotos(item)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid #E8E2DC',
                                    backgroundColor: '#FFFFFF',
                                    color: '#795137',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FAF6F2';
                                    e.currentTarget.style.borderColor = '#795137';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                    e.currentTarget.style.borderColor = '#E8E2DC';
                                  }}
                                >
                                  <Eye size={10} />
                                  <span>Ảnh ({item.claims?.length || item.caseCount})</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ flexShrink: 0, backgroundColor: '#FAF3EC', borderTop: '2px solid #795137', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.70rem' }}>
                      <span style={{ color: '#795137', fontWeight: 800 }}>
                        Sản phẩm: <strong>{productClaimsData.length}</strong>
                      </span>
                      <span style={{ color: '#795137', fontWeight: 800 }}>
                        Tổng: <strong style={{ color: '#79543D' }}>{currentClaimCount}</strong> vụ
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="erp-chart-body-inner">
                    {productAnalysisType === 'product' ? (
                      <ResponsiveContainer key={`prod-chart-${productAnalysisType}`} width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart
                          data={productChartData}
                          margin={{ top: 20, right: 10, left: 10, bottom: 22 }}
                          barCategoryGap="18%"
                        >
                          <XAxis
                            dataKey="displayName"
                            tick={{ fontSize: 8.5, fill: '#737373' }}
                            interval={0}
                            angle={-14}
                            textAnchor="end"
                            height={26}
                            axisLine={{ stroke: '#E8E2DC' }}
                            tickLine={false}
                          />
                          <YAxis
                            hide={true}
                            allowDecimals={false}
                            domain={[0, (dataMax) => Math.max(dataMax + 2, 4)]}
                          />
                          <Tooltip content={<ProductCustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
                          <Bar dataKey="count" fill="#79543D" radius={[3, 3, 0, 0]} maxBarSize={24}>
                            <LabelList
                              dataKey="count"
                              position="top"
                              fill="#5B3924"
                              fontSize={9}
                              fontWeight={700}
                              formatter={(v) => `${v} vụ`}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer key={`prod-chart-${productAnalysisType}`} width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart
                          data={colorChartData}
                          margin={{ top: 20, right: 10, left: 10, bottom: 22 }}
                          barCategoryGap="18%"
                        >
                          <XAxis
                            dataKey="color"
                            tick={{ fontSize: 9, fill: '#737373', fontWeight: 600 }}
                            interval={0}
                            height={22}
                            axisLine={{ stroke: '#E8E2DC' }}
                            tickLine={false}
                          />
                          <YAxis
                            hide={true}
                            allowDecimals={false}
                            domain={[0, (dataMax) => Math.max(dataMax + 2, 4)]}
                          />
                          <Tooltip content={<ColorCustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
                          <Bar dataKey="count" fill="#8D6242" radius={[3, 3, 0, 0]} maxBarSize={28}>
                            <LabelList
                              dataKey="count"
                              position="top"
                              fill="#5B3924"
                              fontSize={9}
                              fontWeight={700}
                              formatter={(v) => `${v} vụ`}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HÀNG 2 – CỘT 2 (35%): Phân tích độ trễ xuất Container */}
          <div className="erp-chart-wrapper">
            <div className="erp-chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px', flexShrink: 0, height: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} style={{ color: '#79543D' }} />
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#303030' }}>
                    Phân tích độ trễ xuất Container
                  </span>
                </div>
              </div>

              <div className="erp-chart-body">
                <div className="erp-chart-body-inner">
                  {containerDelayData.chartItems.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#A8A29E', gap: '4px' }}>
                      <AlertCircle size={22} style={{ color: '#D6D3D1' }} />
                      <span style={{ fontSize: '0.74rem' }}>Không có thông tin ngày xuất container trong kỳ này</span>
                    </div>
                  ) : activeCardModes.container === 'table' ? (
                    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                        <thead className="erp-claim-table-header">
                          <tr>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Tháng xuất</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Số vụ Claim</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Tỷ trọng</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Độ trễ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {containerDelayData.chartItems.map((entry, idx) => (
                            <tr key={entry.groupName || idx} style={{ borderBottom: '1px solid #F0ECE6', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F6' }}>
                              <td style={{ padding: '5px 8px', fontWeight: 600, color: '#303030' }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '2px', backgroundColor: entry.color, marginRight: 6 }} />
                                {entry.groupName}
                              </td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: '#79543D' }}>{entry.claimCount} vụ</td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', color: '#57534E', fontWeight: 600 }}>
                                {((entry.claimCount / (containerDelayData.totalValid || 1)) * 100).toFixed(1)}%
                              </td>
                              <td style={{ textAlign: 'right', padding: '5px 8px', color: '#79543D', fontWeight: 600 }}>
                                {entry.delayMonths > 0 ? `Trễ ${entry.delayMonths} tháng` : 'Trong tháng'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={containerDelayData.chartItems}
                        layout="vertical"
                        margin={{ top: 8, right: 125, left: 4, bottom: 4 }}
                        barCategoryGap="16%"
                      >
                        <XAxis
                          type="number"
                          hide={true}
                          domain={[0, (dataMax) => Math.max(Math.ceil(dataMax * 1.38), dataMax + 5, 8)]}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="groupName"
                          tick={{ fontSize: 9.5, fill: '#44403C', fontWeight: 700 }}
                          axisLine={{ stroke: '#E8E2DC' }}
                          tickLine={false}
                          width={54}
                        />
                        <Tooltip content={<ContainerDelayCustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
                        <Bar dataKey="claimCount" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {containerDelayData.chartItems.map((entry, index) => (
                            <Cell key={`delay-cell-${index}`} fill={entry.color} />
                          ))}
                          <LabelList
                            dataKey="delayDatalabel"
                            position="right"
                            fill="#5B3924"
                            fontSize={9.2}
                            fontWeight={700}
                            offset={8}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* HÀNG 2 – CỘT 3 (30%): Phân bổ theo phương án xử lý */}
          <div className="erp-chart-wrapper">
            <div className="erp-chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px', flexShrink: 0, height: '22px', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: '1 1 auto' }}>
                  <DollarSign size={13} style={{ color: '#79543D', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#303030',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title="Phân bổ theo phương án xử lý"
                  >
                    Phân bổ theo phương án xử lý
                  </span>
                </div>
              </div>

              <div className="erp-chart-body">
                {penaltyMatrixData.rows.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#A8A29E', gap: '4px' }}>
                    <DollarSign size={22} style={{ color: '#D6D3D1' }} />
                    <span style={{ fontSize: '0.74rem' }}>Không có phát sinh tiền phạt phù hợp với bộ lọc hiện tại</span>
                  </div>
                ) : activeCardModes.penalty === 'table' ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: '100%',
                      height: '100%',
                      border: '1px solid #E8E2DC',
                      borderRadius: '5px',
                      backgroundColor: '#FFFFFF',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.70rem', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '28px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '42px' }} />
                          <col style={{ width: '32px' }} />
                          <col style={{ width: '48px' }} />
                          <col style={{ width: '34px' }} />
                          <col style={{ width: '80px' }} />
                        </colgroup>
                        <thead className="erp-claim-table-header">
                          <tr>
                            <th style={{ textAlign: 'center' }}>STT</th>
                            <th style={{ textAlign: 'left' }}>Nhóm lỗi</th>
                            <th style={{ textAlign: 'center' }}>Số vụ</th>
                            <th style={{ textAlign: 'center' }}>X2</th>
                            <th style={{ textAlign: 'center' }}>Full BC</th>
                            <th style={{ textAlign: 'center' }}>$50</th>
                            <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {penaltyMatrixData.rows.map((row) => (
                            <tr
                              key={row.rank}
                              style={{ borderBottom: '1px solid #F8F9FB', transition: 'background-color 0.15s ease' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F9FB'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: 600, color: row.rank <= 3 ? '#79543D' : '#737373' }}>
                                {row.rank}
                              </td>
                              <td style={{ padding: '5px 6px', fontWeight: 600, color: '#303030', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.name}>
                                {row.name}
                              </td>
                              <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: 700, color: '#303030' }}>
                                {row.count}
                              </td>
                              <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: row.x2 > 0 ? 700 : 500, color: row.x2 > 0 ? '#C48750' : '#A8A29E' }}>
                                {row.x2 > 0 ? row.x2 : '—'}
                              </td>
                              <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: row.full > 0 ? 700 : 500, color: row.full > 0 ? '#79543D' : '#A8A29E' }}>
                                {row.full > 0 ? row.full : '—'}
                              </td>
                              <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: row.pay50 > 0 ? 700 : 500, color: row.pay50 > 0 ? '#737373' : '#A8A29E' }}>
                                {row.pay50 > 0 ? row.pay50 : '—'}
                              </td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#5B3924', whiteSpace: 'nowrap' }}>
                                ${row.totalAmount.toLocaleString('en-US')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ flexShrink: 0, backgroundColor: '#FAF6F2', borderTop: '2px solid #79543D' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.70rem', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '28px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '42px' }} />
                          <col style={{ width: '32px' }} />
                          <col style={{ width: '48px' }} />
                          <col style={{ width: '34px' }} />
                          <col style={{ width: '80px' }} />
                        </colgroup>
                        <tfoot>
                          <tr style={{ fontWeight: 700 }}>
                            <td style={{ padding: '5px 2px' }}></td>
                            <td style={{ padding: '5px 6px', color: '#79543D', fontWeight: 700, textAlign: 'left' }}>
                              Tổng
                            </td>
                            <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: 700, color: '#303030' }}>
                              {penaltyMatrixData.totalCases}
                            </td>
                            <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: 700, color: '#C48750' }}>
                              {penaltyMatrixData.totalX2}
                            </td>
                            <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: 700, color: '#79543D' }}>
                              {penaltyMatrixData.totalFull}
                            </td>
                            <td style={{ padding: '5px 2px', textAlign: 'center', fontWeight: 700, color: '#737373' }}>
                              {penaltyMatrixData.total50}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, color: '#5B3924', whiteSpace: 'nowrap' }}>
                              ${currentPenaltyAmount.toLocaleString('en-US')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="erp-chart-body-inner">
                    <ResponsiveContainer key="penalty-chart" width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart
                        data={penaltyActionChartData}
                        margin={{ top: 20, right: 10, left: 10, bottom: 22 }}
                        barCategoryGap="18%"
                      >
                        <XAxis
                          dataKey="action"
                          tick={{ fontSize: 9, fill: '#44403C', fontWeight: 600 }}
                          interval={0}
                          height={24}
                          axisLine={{ stroke: '#E8E2DC' }}
                          tickLine={false}
                        />
                        <YAxis
                          hide={true}
                          allowDecimals={false}
                          domain={[0, (dataMax) => Math.max(dataMax + 3, 5)]}
                        />
                        <Tooltip content={<PenaltyActionCustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
                          {penaltyActionChartData.map((entry, index) => (
                            <Cell key={`action-cell-${index}`} fill={entry.color} />
                          ))}
                          <LabelList
                            dataKey="label"
                            position="top"
                            fill="#5B3924"
                            fontSize={9}
                            fontWeight={700}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL XEM ẢNH MINH CHỨNG KHIẾU NẠI THEO SẢN PHẨM ── */}
      {selectedProductPhotos && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSelectedProductPhotos(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1.5px solid #E8E2DC',
              width: 'min(94vw, 920px)',
              maxHeight: 'min(88vh, 700px)',
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid #E8E2DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FAF6F2',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#EDE4DC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#795137' }}>
                  <Package size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#5B3924', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Ảnh minh chứng khiếu nại</span>
                    <span style={{ color: '#A8A29E' }}>–</span>
                    <span style={{ fontFamily: 'monospace', color: '#795137' }}>{selectedProductPhotos.sku}</span>
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#78716C', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>SKU: <strong style={{ color: '#292524', fontFamily: 'monospace' }}>{selectedProductPhotos.sku}</strong></span>
                    <span>|</span>
                    <span>Màu: <strong style={{ color: '#795137' }}>{selectedProductPhotos.color}</strong></span>
                    <span>|</span>
                    <span><strong style={{ color: '#B91C1C' }}>{selectedProductPhotos.caseCount}</strong> ca khiếu nại trong kỳ</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="page-btn"
                onClick={() => setSelectedProductPhotos(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#78716C',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E8E2DC';
                  e.currentTarget.style.color = '#292524';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#78716C';
                }}
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '14px' }}>
                {selectedProductPhotos.claims.map((claim, cIdx) => {
                  const errorName = getClaimDefectName(claim);
                  const claimImages = (Array.isArray(claim.image_paths) && claim.image_paths.filter(Boolean))
                    || (Array.isArray(claim.images) && claim.images.filter(Boolean))
                    || [];
                  const hasRealImages = claimImages.length > 0;
                  const penaltyInfo = getClaimPenaltyDisplay(claim, cabinetPrices);
                  const isExpanded = !!expandedNotes[claim.id || cIdx];
                  const claimNotes = String(claim.notes || claim.description || '').trim();

                  return (
                    <div
                      key={claim.id || cIdx}
                      style={{
                        border: '1px solid #E8E2DC',
                        borderRadius: '7px',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          height: '150px',
                          backgroundColor: '#F5F2EE',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {hasRealImages ? (
                          <div
                            style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer' }}
                            onClick={() => setActiveLightbox({
                              images: claimImages,
                              currentIndex: 0,
                              claimCode: claim.claim_code || `Ca #${cIdx + 1}`,
                              sku: claim.sku || selectedProductPhotos.sku,
                              errorName
                            })}
                          >
                            <img
                              src={getFullImagePath(claimImages[0])}
                              alt={errorName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(0,0,0,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.15s ease',
                                color: '#FFFFFF',
                                gap: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
                            >
                              <ZoomIn size={16} />
                              <span>Xem ảnh lớn</span>
                            </div>
                            {claimImages.length > 1 && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  backgroundColor: 'rgba(41, 37, 36, 0.8)',
                                  color: '#FFFFFF',
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backdropFilter: 'blur(2px)'
                                }}
                              >
                                +{claimImages.length - 1} ảnh
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              color: '#A8A29E',
                              backgroundColor: '#FAF8F6',
                              borderBottom: '1px dashed #E8E2DC'
                            }}
                          >
                            <ImageIcon size={26} style={{ color: '#D6CBC1' }} />
                            <span style={{ fontSize: '0.70rem', fontWeight: 600, color: '#78716C' }}>Chưa có ảnh minh chứng</span>
                          </div>
                        )}

                        <div
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            left: '6px',
                            backgroundColor: 'rgba(41, 37, 36, 0.8)',
                            color: '#FFFFFF',
                            fontSize: '0.64rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backdropFilter: 'blur(2px)'
                          }}
                        >
                          Ngày: {formatClaimDate(claim.created_at || claim.date || claim.period)}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#795137' }}>
                            {claim.claim_code || `Ca #${cIdx + 1}`}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              ...penaltyInfo.style,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            {penaltyInfo.label}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#292524', marginTop: '2px', lineHeight: 1.25 }}>
                          {errorName}
                        </div>

                        <div style={{ fontSize: '0.69rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>SKU:</span>
                          <strong style={{ fontFamily: 'monospace', color: '#5B3924' }}>{claim.sku || selectedProductPhotos.sku}</strong>
                        </div>

                        {claimNotes && (
                          <div style={{ fontSize: '0.68rem', color: '#57534E', backgroundColor: '#F8F9FA', border: '1px solid #F0ECE7', borderRadius: '4px', padding: '5px 7px', marginTop: '3px' }}>
                            <div style={{ lineHeight: 1.35 }}>
                              {isExpanded || claimNotes.length <= 80 ? claimNotes : `${claimNotes.slice(0, 80)}…`}
                            </div>
                            {claimNotes.length > 80 && (
                              <button
                                type="button"
                                className="page-btn"
                                onClick={() => toggleNoteExpand(claim.id || cIdx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  marginTop: '3px',
                                  color: '#795137',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                {isExpanded ? (
                                  <>Thu gọn <ChevronUp size={10} /></>
                                ) : (
                                  <>Xem thêm <ChevronDown size={10} /></>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XEM ẢNH LỚN (LIGHTBOX ZOOM KÈM PREV/NEXT) ── */}
      {activeLightbox && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 12, 10, 0.88)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
          onClick={() => setActiveLightbox(null)}
        >
          <div
            style={{
              width: 'min(92vw, 880px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#FFFFFF',
              marginBottom: '10px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#FCD34D', fontSize: '0.88rem' }}>
                {activeLightbox.claimCode}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#E7E5E4' }}>
                {activeLightbox.sku} · {activeLightbox.errorName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {activeLightbox.images.length > 1 && (
                <span style={{ fontSize: '0.75rem', color: '#D6D3D1', backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                  Ảnh {activeLightbox.currentIndex + 1} / {activeLightbox.images.length}
                </span>
              )}
              <button
                type="button"
                className="page-btn"
                onClick={() => setActiveLightbox(null)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Đóng xem ảnh lớn"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              maxWidth: 'min(92vw, 880px)',
              maxHeight: '75vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeLightbox.images.length > 1 && (
              <button
                type="button"
                className="page-btn"
                onClick={() => setActiveLightbox(prev => ({
                  ...prev,
                  currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
                }))}
                style={{
                  position: 'absolute',
                  left: '-48px',
                  background: 'rgba(255,255,255,0.22)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2
                }}
                title="Ảnh trước"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img
              src={getFullImagePath(activeLightbox.images[activeLightbox.currentIndex])}
              alt={activeLightbox.errorName || 'Ảnh minh chứng'}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '6px',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)'
              }}
            />

            {activeLightbox.images.length > 1 && (
              <button
                type="button"
                className="page-btn"
                onClick={() => setActiveLightbox(prev => ({
                  ...prev,
                  currentIndex: (prev.currentIndex + 1) % prev.images.length
                }))}
                style={{
                  position: 'absolute',
                  right: '-48px',
                  background: 'rgba(255,255,255,0.22)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2
                }}
                title="Ảnh tiếp theo"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL XUẤT DASHBOARD ── */}
      {!isOffscreenExport && (
        <DashboardExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          dashboardTitle="Dashboard Khiếu nại khách hàng"
          defaultFilenamePrefix="Dashboard_Claims"
          targetRef={dashboardContainerRef}
          currentPageId="page4"
          initialCustomFilters={modalInitialFilters}
          renderCustomFilters={renderClaimCustomFilters}
          onExportCustom={handleExportCustom}
        />
      )}

      {/* ── CONTAINER ẨN NGOÀI MÀN HÌNH ĐỂ XUẤT BÁO CÁO THEO BỘ LỌC TÙY CHỌN ── */}
      {customExportSnapshot && (
        <div
          ref={offscreenExportRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '1440px',
            height: '920px',
            backgroundColor: '#FAF8F6',
            zIndex: -99999,
            pointerEvents: 'none',
            overflow: 'hidden'
          }}
        >
          <ClaimDashboardView
            isOffscreenExport={true}
            exportFilterOverride={customExportSnapshot}
            claims={activeClaims}
            customerPenalties={propCustomerPenalties || customerPenalties}
            cabinetPrices={cabinetPrices}
          />
        </div>
      )}
    </div>
  );
};

export default ClaimDashboardView;

