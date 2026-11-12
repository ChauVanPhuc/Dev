// unitOfMeasure.types.js - Định nghĩa cấu hình cột, trạng thái và dữ liệu ban đầu cho Quản lý đơn vị tính
// SmartFlow ERP G7 - Design System đồng bộ với module Đơn hàng xuất khẩu

/**
 * Danh sách cột bảng hiển thị Quản lý đơn vị tính
 * 1. STT: Số thứ tự theo danh sách
 * 2. Tên đơn vị tính: Ký hiệu / tên viết tắt (m3, Tấm, m2, cái, Kg...)
 * 3. Tên đơn vị tính đầy đủ: Tên chi tiết (Mét khối, Mét vuông...) hoặc '—' nếu chưa có
 * 4. Độ chính xác: Số chữ số thập phân cho phép (0 - 6)
 * 5. Trạng thái: Đang hoạt động / Ngừng hoạt động
 * 6. Thao tác: Menu ba chấm
 */
export const UNIT_COLUMNS = [
  { key: 'stt', label: 'STT', width: '60px', align: 'center', isCore: true },
  { key: 'code', label: 'Tên đơn vị tính', width: '180px', align: 'left', isCore: true },
  { key: 'full_name', label: 'Tên đơn vị tính đầy đủ', width: '260px', align: 'left', isCore: true },
  { key: 'precision', label: 'Độ chính xác', width: '130px', align: 'center', isCore: true },
  { key: 'status', label: 'Trạng thái', width: '160px', align: 'center', isCore: true },
  { key: 'actions', label: 'Thao tác', width: '90px', align: 'center', isCore: true }
];

/**
 * Cấu hình trạng thái Đơn vị tính theo Design System SmartFlow ERP G7
 */
export const UNIT_STATUSES = {
  ACTIVE: {
    key: 'ACTIVE',
    label: 'Đang hoạt động',
    bg: '#ECFDF5',
    color: '#059669',
    border: '#A7F3D0'
  },
  INACTIVE: {
    key: 'INACTIVE',
    label: 'Ngừng hoạt động',
    bg: '#F3F4F6',
    color: '#4B5563',
    border: '#E5E7EB'
  }
};

/**
 * Dữ liệu tham chiếu ban đầu từ hệ thống ERP cũ
 * Giữ nguyên chính xác tên, ký hiệu, độ chính xác.
 * Các đơn vị chưa có tên đầy đủ để chuỗi rỗng để hiển thị '—' (không tự suy đoán).
 */
export const DEFAULT_UNITS_OF_MEASURE = [
  { id: 1, code: 'm3', full_name: 'Mét khối', precision: 4, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 2, code: 'Tấm', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 3, code: 'm2', full_name: 'Mét vuông', precision: 2, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 4, code: 'cái', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 5, code: 'Kg', full_name: 'Kilogram', precision: 2, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 6, code: 'chai', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 7, code: 'm', full_name: 'Mét', precision: 2, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 8, code: 'cuộn', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 9, code: 'bộ', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 10, code: 'Tủ', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 11, code: 'thùng', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 12, code: 'Thanh', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 13, code: 'Lít', full_name: '', precision: 2, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 14, code: 'Con', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 15, code: 'bịch', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 16, code: 'Đôi', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 17, code: 'Cây', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 18, code: 'Tờ', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 19, code: 'múi', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 20, code: 'Hộp', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 21, code: 'Sợi', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 22, code: 'tuýp', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 23, code: 'ống', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 24, code: 'Hũ', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' },
  { id: 25, code: 'SET', full_name: '', precision: 0, status: 'ACTIVE', created_at: '2026-01-01T08:00:00' }
];

export const STORAGE_KEY_UNITS = 'smartflow_units_of_measure_v1';
