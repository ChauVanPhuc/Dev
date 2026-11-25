// goodsReceipt.types.js - Định nghĩa cấu hình cột, trạng thái và dữ liệu cho phân hệ Nhập kho (Pure JS)

/**
 * Danh sách 14 cột nghiệp vụ hiển thị trong bảng dữ liệu Nhập kho
 * (kèm Checkbox và STT = 16 cột đầy đủ theo đúng yêu cầu đề bài)
 */
export const GOODS_RECEIPT_COLUMNS = [
  { key: 'voucher_no', label: 'Mã phiếu', width: '130px', align: 'left', isCore: true },
  { key: 'warehouse_name', label: 'Tên kho', width: '160px', align: 'left', isCore: false },
  { key: 'receipt_date', label: 'Ngày nhập kho', width: '120px', align: 'center', isCore: false },
  { key: 'deliverer_name', label: 'Người bàn giao', width: '150px', align: 'left', isCore: false },
  { key: 'customer_code', label: 'Mã khách', width: '110px', align: 'center', isCore: false },
  { key: 'customer_name', label: 'Tên khách', width: '200px', align: 'left', isCore: false },
  { key: 'department_name', label: 'Bộ phận', width: '130px', align: 'left', isCore: false },
  { key: 'content', label: 'Nội dung', width: '220px', align: 'left', isCore: false },
  { key: 'receipt_type', label: 'Loại phiếu', width: '140px', align: 'center', isCore: false },
  { key: 'status', label: 'Trạng thái', width: '130px', align: 'center', isCore: true },
  { key: 'ctgs', label: 'CTGS', width: '120px', align: 'center', isCore: false },
  { key: 'created_at', label: 'Ngày tạo', width: '120px', align: 'center', isCore: false },
  { key: 'created_by', label: 'Người tạo', width: '140px', align: 'left', isCore: false },
  { key: 'actions', label: 'Thao tác', width: '70px', align: 'center', isCore: true }
];

export const DEFAULT_VISIBLE_COLUMNS = {
  voucher_no: true,
  warehouse_name: true,
  receipt_date: true,
  deliverer_name: true,
  customer_code: true,
  customer_name: true,
  department_name: true,
  content: true,
  receipt_type: true,
  status: true,
  ctgs: true,
  created_at: true,
  created_by: true,
  actions: true
};

import { WAREHOUSE_TABS } from './warehouseInventory.types.js';

/**
 * Danh sách 6 loại kho chuẩn lấy trực tiếp từ cấu hình kho hiện có trong hệ thống:
 * 1. Kho thành phẩm
 * 2. Đóng gói - bao bì
 * 3. Kho hàng hóa
 * 4. Kho nguyên liệu chính
 * 5. Kho vật tư
 * 6. Kho sơn - dầu màu
 */
export const WAREHOUSE_LIST = WAREHOUSE_TABS.filter((t) => t.code !== 'ALL');
export const WAREHOUSE_OPTIONS = WAREHOUSE_LIST.map((t) => t.name);

/**
 * Danh sách 12 cột chuẩn trong bảng chi tiết phiếu nhập kho
 * (Sau khi loại bỏ 5 cột: Đơn giá 1, Đơn giá 2, Thành tiền, YC nhập kho, Mã kiện)
 */
export const GOODS_RECEIPT_DETAIL_COLUMNS = [
  { key: 'stt', label: 'STT', width: '45px', align: 'center' },
  { key: 'item_code', label: 'Mã mặt hàng', width: '130px', align: 'left' },
  { key: 'image', label: 'Hình ảnh', width: '65px', align: 'center' },
  { key: 'item_name', label: 'Tên mặt hàng', width: '220px', align: 'left' },
  { key: 'stock_qty', label: 'Số tồn', width: '85px', align: 'right' },
  { key: 'unit1', label: 'ĐVT1', width: '70px', align: 'center' },
  { key: 'quantity1', label: 'SL nhập 1', width: '90px', align: 'right' },
  { key: 'unit2', label: 'ĐVT2', width: '70px', align: 'center' },
  { key: 'quantity2', label: 'SL nhập 2', width: '90px', align: 'right' },
  { key: 'lsx', label: 'LSX', width: '100px', align: 'center' },
  { key: 'package_split', label: 'Phân kiện', width: '110px', align: 'left' },
  { key: 'notes', label: 'Ghi chú', width: '160px', align: 'left' }
];

/**
 * Danh sách loại phiếu nhập kho
 */
export const RECEIPT_TYPES = [
  'Nhập mua hàng',
  'Nhập thành phẩm sản xuất',
  'Nhập chuyển kho nội bộ',
  'Nhập thu hồi / Trả hàng',
  'Nhập gia công ngoài',
  'Nhập điều chỉnh kiểm kê'
];

/**
 * Danh sách cấu hình trạng thái phiếu nhập kho
 */
export const RECEIPT_STATUSES = {
  COMPLETED: { key: 'COMPLETED', label: 'Đã nhập kho', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  PENDING: { key: 'PENDING', label: 'Chờ nhập kho', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  PROCESSING: { key: 'PROCESSING', label: 'Đang kiểm đếm', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  DRAFT: { key: 'DRAFT', label: 'Bản nháp', bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' },
  CANCELLED: { key: 'CANCELLED', label: 'Đã hủy', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' }
};

/**
 * Danh sách bộ phận
 */
export const DEPARTMENT_OPTIONS = [
  'Xưởng Mộc 1',
  'Xưởng Mộc 2',
  'Xưởng Sơn',
  'Xưởng Lắp Ráp & Đóng Gói',
  'Phòng Cung Ứng Vật Tư',
  'Phòng Quản Lý Chất Lượng (QC)',
  'Kho Tổng Vận Hành'
];

/**
 * Helper format ngày tháng
 */
export const formatDate = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return val;
  }
};

/**
 * Helper format số
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('vi-VN');
};
