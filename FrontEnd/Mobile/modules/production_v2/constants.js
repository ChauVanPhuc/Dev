export const ROUTES = {
  TRANSFER_LIST: '/production_v2/transfer-list',
  TRANSFER_CREATE: '/production_v2/transfer',
  INSPECTION_LIST: '/production_v2/inspection-list',
  INSPECTION_CREATE: '/production_v2/inspection',
  INSPECTION_FIRST_SAMPLE: '/production_v2/inspection/first-sample',
  INSPECTION_RE_INSPECT: '/production_v2/inspection/re-inspect',
  INSPECTION_PARAMETER: '/production_v2/inspection/parameter',
  INSPECTION_PROCESS: '/production_v2/inspection/process',
  INSPECTION_QA: '/production_v2/inspection/qa',
}

export const PERMISSIONS = {
  TRANSFER_LIST: 'mobile_production_v2_transfer_list',
  TRANSFER_CREATE: 'mobile_production_v2_transfer_create',
  INSPECTION_LIST: 'mobile_production_v2_inspection_list',
  INSPECTION_CREATE: 'mobile_production_v2_inspection_create',
}

export const TRANSFER_STATUS = {
  PENDING: 'pending',
  DELIVERING: 'delivering',
  DONE: 'done',
  CANCELLED: 'cancelled',
}

export const TRANSFER_STATUS_CONFIG = {
  pending: { label: 'Chờ xác nhận', className: 'pv2-status--pending' },
  delivering: { label: 'Đang giao', className: 'pv2-status--delivering' },
  done: { label: 'Đã xong', className: 'pv2-status--done' },
  cancelled: { label: 'Đã hủy', className: 'pv2-status--cancelled' },
}

export const VERSION_CONFIG = {
  V1: { label: 'V1', className: 'pv2-version--v1' },
  V2: { label: 'V2', className: 'pv2-version--v2' },
}

export const TRANSFER_TABS = {
  PENDING: 'pending',
  HISTORY: 'history',
}

export const INSPECTION_TABS = {
  PENDING: 'pending',
  HISTORY: 'history',
}

export const INSPECT_MODES = {
  FIRST_SAMPLE: 'first_sample',
  RE_INSPECT: 're_inspect',
  PARAMETER: 'parameter',
  PROCESS: 'process',
  QA: 'qa',
}

export const MODE_TO_ROUTE = {
  first_sample: ROUTES.INSPECTION_FIRST_SAMPLE,
  re_inspect: ROUTES.INSPECTION_RE_INSPECT,
  parameter: ROUTES.INSPECTION_PARAMETER,
  process: ROUTES.INSPECTION_PROCESS,
  qa: ROUTES.INSPECTION_QA,
}

export const INSPECT_MODE_OPTIONS = [
  { value: 'first_sample', label: 'Kiểm tra mẫu lần đầu' },
  { value: 're_inspect', label: 'Kiểm tra lại' },
  { value: 'parameter', label: 'Kiểm tra thông số' },
  { value: 'process', label: 'Kiểm tra quy trình' },
  { value: 'qa', label: 'Vấn đáp' },
]

export const INSPECT_RESULT = {
  PASS: 'pass',
  FAIL: 'fail',
  EXCELLENT: 'excellent',
}

export const MONTH_OPTIONS = [
  { value: '1', label: 'Tháng 1' },
  { value: '2', label: 'Tháng 2' },
  { value: '3', label: 'Tháng 3' },
  { value: '4', label: 'Tháng 4' },
  { value: '5', label: 'Tháng 5' },
  { value: '6', label: 'Tháng 6' },
  { value: '7', label: 'Tháng 7' },
  { value: '8', label: 'Tháng 8' },
  { value: '9', label: 'Tháng 9' },
  { value: '10', label: 'Tháng 10' },
  { value: '11', label: 'Tháng 11' },
  { value: '12', label: 'Tháng 12' },
]

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'delivering', label: 'Đang giao' },
  { value: 'done', label: 'Đã xong' },
  { value: 'cancelled', label: 'Đã hủy' },
]

export const TICKET_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'V1', label: 'V1' },
  { value: 'V2', label: 'V2' },
]

export const STANDARD_BOM_STAGES = [
  'Đầu vào',
  'Tạo Phôi',
  'Định Hình',
  'Lắp Ráp',
  'Sơn',
  'Đóng Gói',
  'Lưu Kho',
]

export const BOM_STAGE_OPTIONS = [
  { value: '', label: 'Chọn công đoạn' },
  { value: 'Đầu vào', label: 'Đầu vào' },
  { value: 'Tạo Phôi', label: 'Tạo Phôi' },
  { value: 'Định Hình', label: 'Định Hình' },
  { value: 'Lắp Ráp', label: 'Lắp Ráp' },
  { value: 'Sơn', label: 'Sơn' },
  { value: 'Đóng Gói', label: 'Đóng Gói' },
  { value: 'Lưu Kho', label: 'Lưu Kho' },
]

export const DEFAULT_PARAMETER_OPTIONS = [
  { value: 'do_am', label: 'Độ ẩm' },
  { value: 'nhiet_do', label: 'Nhiệt độ' },
  { value: 'anh_sang', label: 'Ánh sáng' },
  { value: 'do_bong', label: 'Độ bóng sơn' },
  { value: 'do_day', label: 'Độ dày màng sơn' },
]

export const PAGE_SIZE = 10

