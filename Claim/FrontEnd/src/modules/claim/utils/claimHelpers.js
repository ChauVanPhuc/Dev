/**
 * Utility helper functions for Frontend Claim module
 */

export const getBaseURL = () => {
  if (typeof window === 'undefined') return '';
  const { hostname, port } = window.location;

  if (hostname.includes('smartflowq7.cloud') || hostname.includes('smartflowg7.cloud')) {
    return window.location.origin;
  }

  if (port === '5173' || port === '5174' || port === '5175' || port === '3000' || port === '1222' || port === '1333') {
    const resolvedHost = (hostname === 'localhost' || hostname === '::1') ? '127.0.0.1' : hostname;
    return `http://${resolvedHost}:8000`;
  }
  
  return window.location.origin;
};

export const API_ROOT = `${getBaseURL()}/`;
const API_BASE_URL = `${API_ROOT}api/v1`;

export const normalizePenaltyValue = (val) => {
  if (!val) return '';
  let clean = String(val).trim();

  // Custom case-insensitive mappings:
  const lower = clean.toLowerCase();

  if (lower === 'x2 unit') {
    return 'X2 Unit';
  }
  if (lower === 'full bc' || lower === 'ful bc') {
    return 'Full BC';
  }
  if (lower === 'repair, full bc' || lower === 'repair, ful bc') {
    return 'Repair, Full BC';
  }
  if (lower === 'repair, $50') {
    return 'Repair, $50';
  }

  // General fallback: title case but keep BC uppercase
  let words = clean.split(/\s+/);
  let titleCasedWords = words.map(w => {
    if (w.toUpperCase() === 'BC' || w.toUpperCase() === 'BC,') {
      return w.toUpperCase();
    }
    let hasComma = w.endsWith(',');
    let base = hasComma ? w.slice(0, -1) : w;

    let capitalizedBase = base;
    if (base.length > 0) {
      if (base.startsWith('$')) {
        capitalizedBase = base;
      } else {
        capitalizedBase = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
      }
    }
    return capitalizedBase + (hasComma ? ',' : '');
  });

  let result = titleCasedWords.join(' ');
  result = result.replace(/\bFul\b/g, 'Full');
  result = result.replace(/\bx2\b/g, 'X2');
  result = result.replace(/\bbc\b/gi, 'BC');
  return result;
};

export const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('-');
  if (parts.length === 2) {
    const month = parseInt(parts[0], 10) - 1;
    const year = parseInt(parts[1], 10);
    return new Date(year, month, 1);
  }
  return new Date(dateStr);
};

export const getFullImagePath = (path) => {
  if (!path) return '';
  let cleanPath = typeof path === 'string' ? path.trim() : '';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(cleanPath)) {
    cleanPath = cleanPath.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
  }
  if (cleanPath.startsWith('blob:') || cleanPath.startsWith('data:') || cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }
  const baseUrl = getBaseURL() || (typeof window !== 'undefined' ? window.location.origin : '');
  const root = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const finalUrl = `${root}${normalizedPath}`;
  console.log('[SmartFlow Image Path]', { input: path, output: finalUrl });
  return finalUrl;
};

export const formatPenaltyValue = (number) => {
  if (!number || isNaN(number)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
};

export const extractMultiplierFromPenalty = (penaltyStr) => {
  if (!penaltyStr) return 2;
  const str = String(penaltyStr).toLowerCase();
  const match = str.match(/x\s*(\d+)|(\d+)\s*x/i);
  if (match) {
    const val = parseFloat(match[1] || match[2]);
    return isNaN(val) ? 2 : val;
  }
  return 2;
};

export const getCabinetSalePrice = (sku, cabinetPrices = []) => {
  if (!sku) return 0;
  const cleanSku = String(sku).trim().toLowerCase();
  if (cabinetPrices instanceof Map) {
    return cabinetPrices.get(cleanSku) || 0;
  }
  if (Array.isArray(cabinetPrices)) {
    const match = cabinetPrices.find(p => 
      (p.cabinet_code && String(p.cabinet_code).trim().toLowerCase() === cleanSku) ||
      (p.cabinet_name && String(p.cabinet_name).trim().toLowerCase() === cleanSku)
    );
    if (match) return match.sale_price || 0;
  }
  return 0;
};

export const calculateTotalPenalty = (claim, customMultiplier, cabinetPrices = []) => {
  const p = normalizePenaltyValue(claim.penalty || claim.action || 'Không có');
  const lower = p.toLowerCase();
  const sku = claim.product_name || claim.sku;
  let val = 0;

  let multiplier = customMultiplier;
  if (multiplier === undefined || multiplier === null || isNaN(multiplier) || multiplier === '') {
    multiplier = claim.penalty_multiplier !== undefined ? claim.penalty_multiplier : extractMultiplierFromPenalty(p);
  } else {
    multiplier = parseFloat(multiplier);
  }
  if (isNaN(multiplier) || multiplier < 1) {
    multiplier = 1;
  } else if (multiplier > 100) {
    multiplier = 100;
  }

  if (lower.includes('unit')) {
    const salePrice = getCabinetSalePrice(sku, cabinetPrices);
    val = salePrice * multiplier;
  } else if (lower.includes('x2 unit') || lower.includes('x2unit') || lower.includes('2x unit') || lower.includes('x2')) {
    const salePrice = getCabinetSalePrice(sku, cabinetPrices);
    val = salePrice * multiplier;
  } else if (lower.includes('full bc') || lower.includes('ful bc')) {
    const salePrice = getCabinetSalePrice(sku, cabinetPrices);
    val = salePrice;
  } else {
    const parsed = parseFloat(String(p).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) {
      val = parsed;
    }
  }
  return val;
};

export const getClaimTimeValue = (claim) => {
  if (!claim) return 0;
  const raw = claim.date || claim.period || claim.export_date;
  if (raw) {
    const str = String(raw).trim();
    // Match MM-YYYY or MM/YYYY or M-YYYY
    const mmYyyyMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
    if (mmYyyyMatch) {
      const month = parseInt(mmYyyyMatch[1], 10);
      const year = parseInt(mmYyyyMatch[2], 10);
      return new Date(year, month - 1, 1).getTime();
    }
    // Match YYYY-MM or YYYY/MM
    const yyyyMmMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
    if (yyyyMmMatch) {
      const year = parseInt(yyyyMmMatch[1], 10);
      const month = parseInt(yyyyMmMatch[2], 10);
      return new Date(year, month - 1, 1).getTime();
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }
  if (claim.created_at) {
    const d = new Date(claim.created_at);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }
  return 0;
};

export const getMonthYear = (claim) => {
  if (!claim) return 'Khác';
  const raw = claim.date || claim.period || claim.export_date || claim.created_at;
  if (!raw) return 'Khác';

  if (/^\d{1,2}-\d{4}$/.test(String(raw).trim())) {
    const parts = String(raw).trim().split('-');
    return `${parts[0].padStart(2, '0')}-${parts[1]}`;
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${m}-${y}`;
  }

  return 'Khác';
};

export const getMonthNumber = (monthStr) => {
  if (!monthStr) return null;
  const m = String(monthStr).toLowerCase().trim();
  const map = {
    'tháng 1': 1, 'tháng 01': 1, 'tháng 2': 2, 'tháng 02': 2,
    'tháng 3': 3, 'tháng 03': 3, 'tháng 4': 4, 'tháng 04': 4,
    'tháng 5': 5, 'tháng 05': 5, 'tháng 6': 6, 'tháng 06': 6,
    'tháng 7': 7, 'tháng 07': 7, 'tháng 8': 8, 'tháng 08': 8,
    'tháng 9': 9, 'tháng 09': 9, 'tháng 10': 10, 'tháng 11': 11, 'tháng 12': 12
  };
  return map[m] || parseInt(m.replace(/\D/g, ''), 10) || null;
};

/**
 * Resolves G7 Error Code from Customer Defect Code using client_defects catalog.
 * Supports single code (e.g. 'DVA_01') or comma-separated codes (e.g. 'DVA_01, DVA_05').
 */
export const resolveG7ErrorCode = (custCode, clientDefects = []) => {
  if (!custCode || !Array.isArray(clientDefects) || clientDefects.length === 0) return '';

  const codes = String(custCode).split(',').map(c => c.trim()).filter(Boolean);
  const resolved = codes.map(code => {
    const clean = code.toLowerCase();
    const match = clientDefects.find(cd => {
      const cdCode = (cd.code || cd.client_defect_code || '').trim().toLowerCase();
      return cdCode && cdCode === clean;
    });
    return match ? (match.g7_code || '') : '';
  }).filter(Boolean);

  return Array.from(new Set(resolved)).join(', ');
};

/**
 * Resolves G7 Error Name from G7 Error Code or Customer Defect Code using defect_types and client_defects catalogs.
 * Supports single code or comma-separated codes.
 */
export const resolveG7ErrorName = (g7Code, custCode, g7DefectTypes = [], clientDefects = []) => {
  let targetG7Codes = [];

  if (g7Code) {
    targetG7Codes = String(g7Code).split(',').map(c => c.trim()).filter(Boolean);
  }

  if (targetG7Codes.length === 0 && custCode && Array.isArray(clientDefects) && clientDefects.length > 0) {
    const resolvedCodeStr = resolveG7ErrorCode(custCode, clientDefects);
    if (resolvedCodeStr) {
      targetG7Codes = resolvedCodeStr.split(',').map(c => c.trim()).filter(Boolean);
    }
  }

  if (targetG7Codes.length === 0 || !Array.isArray(g7DefectTypes) || g7DefectTypes.length === 0) return '';

  const names = targetG7Codes.map(code => {
    const clean = code.toLowerCase();
    const match = g7DefectTypes.find(gt => {
      const gtCode = (gt.code || '').trim().toLowerCase();
      return gtCode && gtCode === clean;
    });
    return match ? (match.name || match.short_description || '') : '';
  }).filter(Boolean);

  return Array.from(new Set(names)).join(', ');
};

export const formatMonthYear = (val) => {
  if (!val) return '';
  const s = String(val).trim();
  const parts = s.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[1].padStart(2, '0')}/${parts[0]}`;
    } else {
      // MM/DD/YYYY
      return `${parts[0].padStart(2, '0')}/${parts[2]}`;
    }
  }
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}/${parts[1]}`;
  }
  return s;
};

/**
 * Chuẩn hóa chuỗi/mảng công đoạn (stage) của lỗi G7 thành dạng hiển thị.
 */
export const formatStageTag = (stageVal) => {
  if (!stageVal) return null;
  if (Array.isArray(stageVal)) return stageVal.join(', ');
  if (typeof stageVal === 'string') {
    const cleaned = stageVal.trim();
    if (cleaned.startsWith('[')) {
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch (err) {
        console.warn('[claimHelpers] Invalid JSON stage array:', cleaned, err);
      }
    }
    return cleaned.replace(/^\["|"]$/g, '').replace(/","/g, ', ').replace(/"/g, '');
  }
  return String(stageVal);
};
