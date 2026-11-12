/**
 * warehouseInventory.types.js
 * Định nghĩa cấu hình cột, danh mục kho, nhóm vật tư và hằng số cho trang Quản lý kho (Xuất - Nhập - Tồn)
 * Phân hệ Quản lý Kho - SmartFlow ERP G7
 */

/**
 * Danh sách 7 nhóm kho chuẩn theo yêu cầu:
 * 1. Tất cả (ALL)
 * 2. Kho thành phẩm (KTP)
 * 3. Đóng gói - bao bì (KDG)
 * 4. Kho hàng hóa (KHH)
 * 5. Kho nguyên liệu chính (KNLC)
 * 6. Kho vật tư (KVT)
 * 7. Kho sơn - dầu màu (KSON)
 */
export const WAREHOUSE_TABS = [
  { code: 'ALL', name: 'Tất cả', desc: 'Toàn bộ các kho lưu trữ trong nhà máy' },
  { code: 'KTP', name: 'Kho thành phẩm', desc: 'Bàn, ghế, tủ, giường đồ gỗ hoàn thiện' },
  { code: 'KDG', name: 'Đóng gói - bao bì', desc: 'Thùng carton, màng PE, pallet, xốp bảo vệ' },
  { code: 'KHH', name: 'Kho hàng hóa', desc: 'Hàng hóa mua ngoài, thiết bị phụ trợ lắp ráp' },
  { code: 'KNLC', name: 'Kho nguyên liệu chính', desc: 'Gỗ Sồi, Tần bì, Óc chó, ván MDF, Plywood' },
  { code: 'KVT', name: 'Kho vật tư', desc: 'Bản lề, ray trượt, ốc vít, keo ghép, nhám' },
  { code: 'KSON', name: 'Kho sơn - dầu màu', desc: 'Sơn PU, sơn lót, chất đóng rắn, dung môi' }
];

const _formatLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const _computeTimePresets = () => {
  const now = new Date();
  const threeDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
  const dow = now.getDay();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dow === 0 ? 6 : dow - 1));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  return [
    { value: 'THREE_DAYS', label: '3 ngày gần nhất', fromDate: _formatLocalISO(threeDaysAgo), toDate: _formatLocalISO(now) },
    { value: 'TODAY', label: 'Hôm nay', fromDate: _formatLocalISO(now), toDate: _formatLocalISO(now) },
    { value: 'THIS_WEEK', label: 'Tuần này', fromDate: _formatLocalISO(monday), toDate: _formatLocalISO(now) },
    { value: 'THIS_MONTH', label: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`, fromDate: _formatLocalISO(monthStart), toDate: _formatLocalISO(monthEnd) },
    { value: 'LAST_MONTH', label: `Tháng ${prevStart.getMonth() + 1}/${prevStart.getFullYear()}`, fromDate: _formatLocalISO(prevStart), toDate: _formatLocalISO(prevEnd) },
    { value: 'ALL', label: 'Toàn bộ thời gian', fromDate: '', toDate: '' },
    { value: 'CUSTOM', label: 'Tùy chọn...' }
  ];
};

/**
 * Danh sách Preset thời gian động theo ngày hệ thống (Single Source of Truth)
 */
export const TIME_PRESETS = _computeTimePresets();

/**
 * Danh mục nhóm vật tư
 */
export const ITEM_CATEGORIES = [
  { value: 'ALL', label: 'Tất cả nhóm vật tư' },
  { value: 'GO_NGUYEN_LIEU', label: 'Gỗ tự nhiên & Ván công nghiệp' },
  { value: 'PHU_KIEN_KIM_KHI', label: 'Phụ kiện kim khí & Cơ khí' },
  { value: 'SON_HOA_CHAT', label: 'Sơn & Hóa chất hoàn thiện' },
  { value: 'BAO_BI_DONG_GOI', label: 'Vật liệu đóng gói & Bao bì' },
  { value: 'THANH_PHAM', label: 'Thành phẩm đồ gỗ' },
  { value: 'HANG_HOA_THUONG_MAI', label: 'Hàng hóa thương mại' }
];

/**
 * Chuẩn hóa ký hiệu đơn vị tính để so sánh chính xác tuyệt đối,
 * không phụ thuộc vào chữ hoa/thường, dấu tiếng Việt hoặc cách viết tắt.
 */
export const normalizeUnitCode = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val).trim().toLowerCase();
  if (s === 'm³' || s === 'm3' || s === 'mét khối' || s === 'met khoi') return 'm3';
  if (s === 'm²' || s === 'm2' || s === 'mét vuông' || s === 'met vuong') return 'm2';
  if (s === 'm' || s === 'mét' || s === 'met') return 'm';
  if (s === 'cái' || s === 'cai' || s === 'chiếc' || s === 'chiec') return 'cái';
  if (s === 'thùng' || s === 'thung') return 'thùng';
  if (s === 'hộp' || s === 'hop') return 'hộp';
  if (s === 'tấm' || s === 'tam') return 'tấm';
  if (s === 'cuộn' || s === 'cuon') return 'cuộn';
  if (s === 'bộ' || s === 'bo') return 'bộ';
  if (s === 'kg' || s === 'kilogram' || s === 'kí' || s === 'ki') return 'kg';
  if (s === 'lít' || s === 'lit' || s === 'l') return 'lít';
  if (s === 'can') return 'can';
  if (s === 'cây' || s === 'cay') return 'cây';
  if (s === 'thanh') return 'thanh';
  if (s === 'tờ' || s === 'to') return 'tờ';
  if (s === 'kiện' || s === 'kien') return 'kiện';
  if (s === 'chồng' || s === 'chong') return 'chồng';
  if (s === 'bó' || s === 'bo') return 'bó';
  return s;
};

/**
 * Kiểm tra khớp đơn vị tính giữa dữ liệu vật tư và giá trị lọc
 * @param {string|number} itemUnit - Đơn vị tính của vật tư
 * @param {string|number} filterUnit - Giá trị được chọn trên bộ lọc
 */
export const isUnitMatch = (itemUnit, filterUnit) => {
  if (!filterUnit || filterUnit === 'ALL') return true;
  if (!itemUnit) return false;
  return normalizeUnitCode(itemUnit) === normalizeUnitCode(filterUnit);
};

/**
 * Danh sách Đơn vị tính phong phú và đầy đủ - Đồng bộ với Danh mục Quản lý đơn vị tính
 */
export const STANDARD_UNITS = [
  { code: 'm3', label: 'm³ (Mét khối)' },
  { code: 'm2', label: 'm² (Mét vuông)' },
  { code: 'm', label: 'Mét (m)' },
  { code: 'Cái', label: 'Cái' },
  { code: 'Bộ', label: 'Bộ' },
  { code: 'Tấm', label: 'Tấm' },
  { code: 'Thùng', label: 'Thùng' },
  { code: 'Hộp', label: 'Hộp' },
  { code: 'Kg', label: 'Kg' },
  { code: 'Lít', label: 'Lít' },
  { code: 'Cuộn', label: 'Cuộn' },
  { code: 'Can', label: 'Can' },
  { code: 'Cây', label: 'Cây' },
  { code: 'Thanh', label: 'Thanh' },
  { code: 'Tờ', label: 'Tờ' },
  { code: 'Kiện', label: 'Kiện' },
  { code: 'Chồng', label: 'Chồng' },
  { code: 'Bó', label: 'Bó' }
];

export const getUnitOptionsList = (defaultLabel = 'Tất cả ĐVT') => {
  const map = new Map();
  map.set('ALL', { value: 'ALL', label: defaultLabel });

  // Nạp từ chuẩn
  STANDARD_UNITS.forEach(u => {
    const key = normalizeUnitCode(u.code);
    if (!map.has(key)) {
      map.set(key, { value: u.code, label: u.label });
    }
  });

  // Nạp thêm từ localStorage nếu có
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('smartflow_units_of_measure_v1') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.filter(u => u.status === 'ACTIVE').forEach(u => {
          const key = normalizeUnitCode(u.code);
          if (!map.has(key)) {
            map.set(key, {
              value: u.code,
              label: u.full_name ? `${u.code} (${u.full_name})` : u.code
            });
          }
        });
      }
    }
  } catch (e) {}

  return Array.from(map.values());
};

export const UNIT_OPTIONS = getUnitOptionsList('Tất cả ĐVC');
export const UNIT_CONV_OPTIONS = getUnitOptionsList('Tất cả ĐVCĐ');

/**
 * Tình trạng tồn kho
 */
export const STOCK_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả tình trạng' },
  { value: 'IN_STOCK', label: 'Còn tồn (Tồn cuối > 0)' },
  { value: 'OUT_OF_STOCK', label: 'Hết tồn (Tồn cuối = 0)' }
];

/**
 * Thời gian tồn kho (Aging)
 */
export const INVENTORY_DAYS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả thời gian tồn' },
  { value: 'LT30', label: 'Dưới 30 ngày' },
  { value: '30TO60', label: 'Từ 30 đến 60 ngày' },
  { value: '60TO90', label: 'Từ 60 đến 90 ngày' },
  { value: 'GT90', label: 'Trên 90 ngày (Cảnh báo chậm luân chuyển)' }
];

/**
 * Cấu trúc các nhóm cột và cột con cho Bảng 2 cấp Xuất - Nhập - Tồn
 */
export const INVENTORY_COLUMN_GROUPS = [
  {
    key: 'item_info',
    label: 'Thông tin vật tư / Goods',
    isFixedGroup: true,
    columns: [
      { key: 'item_code', label: 'Mã vật tư', isCore: true, defaultWidth: 140, align: 'left' },
      { key: 'item_name', label: 'Tên vật tư / Goods', isCore: true, defaultWidth: 260, align: 'left' }
    ]
  },
  {
    key: 'unit_group',
    label: 'ĐVT / Unit',
    columns: [
      { key: 'unit_main', label: 'ĐVC', parentKey: 'unit_group', defaultWidth: 70, align: 'center', desc: 'Đơn vị chính' },
      { key: 'unit_conversion', label: 'ĐVCĐ', parentKey: 'unit_group', defaultWidth: 70, align: 'center', desc: 'Đơn vị chuyển đổi' }
    ]
  },
  {
    key: 'opening_group',
    label: 'Tồn đầu kỳ',
    columns: [
      { key: 'opening_main', label: 'ĐVC', parentKey: 'opening_group', defaultWidth: 105, align: 'right', desc: 'Tồn đầu - Đơn vị chính' },
      { key: 'opening_conv', label: 'ĐVCĐ', parentKey: 'opening_group', defaultWidth: 105, align: 'right', desc: 'Tồn đầu - Đơn vị chuyển đổi' }
    ]
  },
  {
    key: 'in_group',
    label: 'Nhập trong kỳ',
    columns: [
      { key: 'in_main', label: 'ĐVC', parentKey: 'in_group', defaultWidth: 105, align: 'right', desc: 'Nhập - Đơn vị chính' },
      { key: 'in_conv', label: 'ĐVCĐ', parentKey: 'in_group', defaultWidth: 105, align: 'right', desc: 'Nhập - Đơn vị chuyển đổi' }
    ]
  },
  {
    key: 'out_group',
    label: 'Xuất trong kỳ',
    columns: [
      { key: 'out_main', label: 'ĐVC', parentKey: 'out_group', defaultWidth: 105, align: 'right', desc: 'Xuất - Đơn vị chính' },
      { key: 'out_conv', label: 'ĐVCĐ', parentKey: 'out_group', defaultWidth: 105, align: 'right', desc: 'Xuất - Đơn vị chuyển đổi' }
    ]
  },
  {
    key: 'closing_group',
    label: 'Tồn cuối kỳ',
    columns: [
      { key: 'closing_main', label: 'ĐVC', parentKey: 'closing_group', defaultWidth: 110, align: 'right', desc: 'Tồn cuối - Đơn vị chính' },
      { key: 'closing_conv', label: 'ĐVCĐ', parentKey: 'closing_group', defaultWidth: 110, align: 'right', desc: 'Tồn cuối - Đơn vị chuyển đổi' }
    ]
  },
  {
    key: 'return_group',
    label: 'Hàng trả về',
    columns: [
      { key: 'return_main', label: 'ĐVC', parentKey: 'return_group', defaultWidth: 105, align: 'right', desc: 'Hàng trả về / Hàng loại - Đơn vị chính' },
      { key: 'return_conv', label: 'ĐVCĐ', parentKey: 'return_group', defaultWidth: 105, align: 'right', desc: 'Hàng trả về / Hàng loại - Đơn vị chuyển đổi' }
    ]
  },
  {
    key: 'aging_group',
    label: 'Thời gian tồn (Ngày)',
    columns: [
      { key: 'inventory_days', label: 'Ngày', parentKey: 'aging_group', defaultWidth: 95, align: 'right', desc: 'Số ngày tồn kho thực tế' }
    ]
  }
];

/**
 * Cấu hình hiển thị mặc định của tất cả các cột
 */
export const DEFAULT_INVENTORY_VISIBLE_COLUMNS = {
  item_code: true,
  item_name: true,
  unit_main: true,
  unit_conversion: true,
  opening_main: true,
  opening_conv: true,
  in_main: true,
  in_conv: true,
  out_main: true,
  out_conv: true,
  closing_main: true,
  closing_conv: true,
  return_main: true,
  return_conv: true,
  inventory_days: true
};

/**
 * Chiều rộng tối thiểu cho từng cột (px) theo tiêu chuẩn
 */
export const COLUMN_MIN_WIDTHS = {
  stt: 50,
  item_code: 110,
  item_name: 200,
  unit_main: 70,
  unit_conversion: 70,
  opening_main: 90,
  opening_conv: 90,
  in_main: 90,
  in_conv: 90,
  out_main: 90,
  out_conv: 90,
  closing_main: 90,
  closing_conv: 90,
  return_main: 90,
  return_conv: 90,
  inventory_days: 110
};

/**
 * Chiều rộng mặc định cho từng cột (px)
 */
export const DEFAULT_COLUMN_WIDTHS = {
  stt: 50,
  item_code: 140,
  item_name: 260,
  unit_main: 75,
  unit_conversion: 75,
  opening_main: 110,
  opening_conv: 110,
  in_main: 110,
  in_conv: 110,
  out_main: 110,
  out_conv: 110,
  closing_main: 115,
  closing_conv: 115,
  return_main: 105,
  return_conv: 105,
  inventory_days: 110
};

/**
 * Hàm định dạng số có phân cách hàng nghìn và độ chính xác thập phân phù hợp
 * @param {number|string} val - Giá trị số
 * @param {number} maxDecimals - Số chữ số thập phân tối đa (mặc định 2)
 */
export const formatNumber = (val, maxDecimals = 2) => {
  if (val == null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';

  // Nếu là số nguyên -> không hiển thị phần thập phân
  if (Math.abs(num - Math.round(num)) < 0.0001) {
    return Math.round(num).toLocaleString('en-US');
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
};

/**
 * Format ngày tháng DD/MM/YYYY
 */
export const formatDateVN = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

/**
 * Chuẩn hóa nhãn và màu sắc trạng thái chứng từ kho sang tiếng Việt 100%
 */
export const getVoucherStatusInfo = (status, type = 'IN') => {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'COMPLETED':
    case 'POSTED':
    case 'EXPORTED':
      return {
        label: type === 'IN' ? 'Đã nhập' : 'Đã xuất',
        className: 'wh-status-intact',
        bg: '#DCFCE7',
        color: '#166534',
        border: '#BBF7D0'
      };
    case 'PROCESSING':
      return {
        label: 'Đang xử lý',
        className: 'wh-status-partial',
        bg: '#FEF3C7',
        color: '#B45309',
        border: '#FDE68A'
      };
    case 'APPROVED':
      return {
        label: 'Đã duyệt',
        className: 'wh-status-intact',
        bg: '#EFF6FF',
        color: '#1D4ED8',
        border: '#BFDBFE'
      };
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return {
        label: 'Chờ duyệt',
        className: 'wh-status-partial',
        bg: '#FFF7ED',
        color: '#C2410C',
        border: '#FFEDD5'
      };
    case 'DRAFT':
      return {
        label: 'Nháp',
        className: 'wh-status-partial',
        bg: '#F3F4F6',
        color: '#4B5563',
        border: '#E5E7EB'
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        className: 'wh-status-partial',
        bg: '#FEE2E2',
        color: '#991B1B',
        border: '#FECACA'
      };
    default:
      return {
        label: s || 'Chưa xác định',
        className: 'wh-status-partial',
        bg: '#F3F4F6',
        color: '#4B5563',
        border: '#E5E7EB'
      };
  }
};
