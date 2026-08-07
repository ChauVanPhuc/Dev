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

export const MOCK_FACTORIES = [
  { value: '', label: 'Tất cả nhà máy' },
  { value: 'vanity01', label: 'Vanity 01' },
  { value: 'vanity02', label: 'Vanity 02' },
]

export const MOCK_STAGES = [
  { value: '', label: 'Tất cả công đoạn' },
  { value: 'dinh_hinh', label: 'Định hình' },
  { value: 'lap_rap_1', label: 'Lắp ráp 1' },
  { value: 'lap_rap_2', label: 'Lắp ráp 2' },
  { value: 'dong_goi', label: 'Đóng gói' },
  { value: 'kiem_tra', label: 'Kiểm tra' },
]

export const MOCK_STAGE_OPTIONS = [
  { value: 'dinh_hinh', label: 'Định hình' },
  { value: 'lap_rap_1', label: 'Lắp ráp 1' },
  { value: 'lap_rap_2', label: 'Lắp ráp 2' },
  { value: 'dong_goi', label: 'Đóng gói' },
]

export const MOCK_PALLETS = [
  { value: 'SD19U0', label: 'SD19U0', totalQty: 134 },
  { value: 'SD20A1', label: 'SD20A1', totalQty: 98 },
  { value: 'DA7819', label: 'DA7819', totalQty: 200 },
]

export const MOCK_PRODUCTS = [
  { value: 'thanh_a', label: 'Thanh A', specs: [{ value: '1', label: 'QC-01' }, { value: '2', label: 'QC-02' }] },
  { value: 'thanh_b', label: 'Thanh B', specs: [{ value: '3', label: 'QC-03' }] },
]

export const MOCK_PO_OPTIONS = [
  { value: 'APT007', label: 'APT007' },
  { value: 'APT008', label: 'APT008' },
  { value: 'APT009', label: 'APT009' },
]

export const MOCK_PARAMETER_OPTIONS = [
  { value: 'do_am', label: 'Độ ẩm' },
  { value: 'nhiet_do', label: 'Nhiệt độ' },
  { value: 'anh_sang', label: 'Ánh sáng' },
]

export const MOCK_PROCESS_OPTIONS = [
  { value: 'quy_trinh_1', label: 'Quy trình 1' },
  { value: 'quy_trinh_2', label: 'Quy trình 2' },
]

export const MOCK_AREA_OPTIONS = [
  { value: 'khu_a', label: 'Khu A' },
  { value: 'khu_b', label: 'Khu B' },
  { value: 'khu_c', label: 'Khu C' },
]

export const MOCK_STAFF_OPTIONS = [
  { value: 'nva', label: 'Nguyễn Văn A' },
  { value: 'nvb', label: 'Nguyễn Văn B' },
  { value: 'ttc', label: 'Trần Thị C' },
]

export const MOCK_TRANSFER_TICKETS = [
  {
    id: 1, code: 'LC01', version: 'V1', status: 'pending',
    fromStage: 'Định hình 1', toStage: 'Lắp ráp 1',
    date: '22/1/2026', time: '16:40', creator: 'Nguyễn Văn A',
    poCode: 'APT007', palletCode: 'SD19U0', totalQty: 134,
    items: [
      { id: 1, detail: 'Thanh A', spec: '1', qty: 0, total: 40 },
      { id: 2, detail: 'Thanh A', spec: '2', qty: 12, total: 40 },
    ],
  },
  {
    id: 2, code: 'LC03', version: 'V2', status: 'pending',
    fromStage: 'Lắp ráp 1', toStage: 'Định hình 1',
    date: '22/1/2026', time: '16:45', creator: 'Nguyễn Văn A',
    poCode: 'APT008', palletCode: 'SD20A1', totalQty: 98,
    items: [
      { id: 1, detail: 'Thanh A', spec: '1', qty: 5, total: 50 },
    ],
  },
  {
    id: 3, code: 'LC04', version: 'V1', status: 'delivering',
    fromStage: 'Định hình', toStage: 'Đóng gói',
    date: '22/1/2026', time: '17:00', creator: 'Nguyễn Văn A',
    poCode: 'APT009', palletCode: 'SD19U0', totalQty: 134,
    items: [
      { id: 1, detail: 'Thanh A', spec: '1', qty: 0, total: 40 },
      { id: 2, detail: 'Thanh A', spec: '2', qty: 12, total: 40 },
    ],
  },
]

export const MOCK_INSPECTION_TICKETS = [
  {
    id: 1, code: 'KT01', status: 'pending',
    poCode: 'APT007', date: '22/1/2026', time: '16:40',
    creator: 'Nguyễn Văn A', stage: 'Định hình',
    mode: 'first_sample',
  },
  {
    id: 2, code: 'KT03', status: 'pending',
    poCode: 'APT008', date: '22/1/2026', time: '16:45',
    creator: 'Nguyễn Văn A', stage: 'Lắp ráp 1',
    mode: 're_inspect',
  },
  {
    id: 3, code: 'KT04', status: 'delivering',
    poCode: 'APT009', date: '22/1/2026', time: '17:00',
    creator: 'Nguyễn Văn A', stage: 'Đóng gói',
    mode: 'first_sample',
  },
]

export const MOCK_INSPECTION_STEPS = [
  { id: 1, step: 1, description: 'Kiểm tra bề mặt', standard: 'Không có vết nứt', qty: 10, result: 'pass' },
  { id: 2, step: 2, description: 'Kiểm tra kích thước', standard: '±0.5mm', qty: 10, result: 'fail' },
]

export const MOCK_ERROR_TYPES = [
  { value: 'nut_tet', label: 'Nứt tét' },
  { value: 'bong_trom', label: 'Bong trốc' },
  { value: 'bien_dang', label: 'Biến dạng' },
  { value: 'mau_sac', label: 'Màu sắc sai' },
]

export const PAGE_SIZE = 10
