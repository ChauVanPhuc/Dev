/**
 * rejectedGoods.types.js
 * Định nghĩa hằng số, trạng thái, danh mục và cấu hình cột cho module Quản lý hàng loại / Hàng trả về
 * SmartFlow ERP - Phân hệ Quản lý Kho
 */

export const REJECTED_SOURCE_TYPES = {
  QC_INCOMING: {
    code: 'QC_INCOMING',
    label: 'QC đầu vào',
    badgeClass: 'wh-badge-source-qc',
    desc: 'Hàng không đạt tiêu chuẩn chất lượng khi kiểm tra nhập kho từ nhà cung cấp'
  },
  PROD_RETURN: {
    code: 'PROD_RETURN',
    label: 'Sản xuất trả về',
    badgeClass: 'wh-badge-source-prod',
    desc: 'Hàng lỗi, hỏng hoặc không đạt quy cách phát hiện trong quá trình sản xuất trả lại kho'
  }
};

export const REJECTED_STATUSES = {
  PENDING: {
    code: 'PENDING',
    label: 'Chờ xử lý',
    color: '#D97706',
    bgColor: '#FEF3C7',
    desc: 'Hàng loại đang lưu kho cách ly chờ hội đồng thẩm định'
  },
  RESOLVED: {
    code: 'RESOLVED',
    label: 'Đã xử lý',
    color: '#059669',
    bgColor: '#D1FAE5',
    desc: 'Đã hoàn tất hướng xử lý (Tái sử dụng, tiêu hủy hoặc trả NCC)'
  },
  CANCELLED: {
    code: 'CANCELLED',
    label: 'Đã hủy',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    desc: 'Phiếu ghi nhận sai hoặc đã bị hủy bỏ'
  }
};

export const REJECTED_RESOLUTIONS = {
  PENDING: {
    code: 'PENDING',
    label: 'Chờ thẩm định',
    color: '#6B7280',
    desc: 'Chưa có quyết định xử lý chính thức'
  },
  REUSE: {
    code: 'REUSE',
    label: 'Phê duyệt tái sử dụng',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    desc: 'Chuyển về kho khả dụng sau khi gia công/sửa chữa hoặc hạ cấp sử dụng'
  },
  SCRAP: {
    code: 'SCRAP',
    label: 'Xuất hủy',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    desc: 'Thanh lý phế liệu hoặc tiêu hủy không thể tận dụng'
  },
  RETURN_VENDOR: {
    code: 'RETURN_VENDOR',
    label: 'Trả nhà cung cấp',
    color: '#D97706',
    bgColor: '#FEF3C7',
    desc: 'Xuất trả lại nhà cung cấp để đổi mới hoặc giảm trừ công nợ'
  }
};

export const DEFECT_CATEGORIES = [
  'Cong vênh / Nứt nẻ',
  'Mọt / Mốc / Ẩm ướt',
  'Sai kích thước / Độ dày',
  'Trầy xước bề mặt',
  'Lỗi phủ melamine / Veneer',
  'Rỉ sét / Bị oxy hóa',
  'Sai màu sắc / Chênh tông',
  'Bao bì rách / Hư hỏng',
  'Lỗi ren / Lỗi cơ khí',
  'Khác'
];

export const getRejectedResultInfo = (rej) => {
  if (!rej) return { label: '—', bg: '#F3F4F6', color: '#6B7280' };

  if (rej.status === 'CANCELLED') {
    return { label: 'Đã hủy', bg: '#FEE2E2', color: '#DC2626' };
  }

  const res = String(rej.resolution || '').toUpperCase();
  const isResolved = rej.status === 'RESOLVED';

  if (res === 'RETURN_SUPPLIER' || res === 'RETURN_VENDOR') {
    return {
      label: isResolved ? 'Đã trả NCC' : 'Chờ trả NCC',
      bg: isResolved ? '#DCFCE7' : '#FEF3C7',
      color: isResolved ? '#166534' : '#B45309'
    };
  }
  if (res === 'SCRAP') {
    return {
      label: isResolved ? 'Đã loại bỏ' : 'Chờ loại bỏ',
      bg: isResolved ? '#FEE2E2' : '#FEF3C7',
      color: isResolved ? '#991B1B' : '#B45309'
    };
  }
  if (res === 'REUSE') {
    return {
      label: isResolved ? 'Đã tái sử dụng' : 'Chờ tái sử dụng',
      bg: isResolved ? '#EFF6FF' : '#FEF3C7',
      color: isResolved ? '#1D4ED8' : '#B45309'
    };
  }
  if (res === 'REWORK') {
    return {
      label: isResolved ? 'Đã xử lý' : 'Đang xử lý',
      bg: isResolved ? '#DCFCE7' : '#FEF3C7',
      color: isResolved ? '#166534' : '#B45309'
    };
  }

  if (isResolved) {
    return { label: 'Đã xử lý', bg: '#DCFCE7', color: '#166534' };
  }
  if (rej.status === 'PENDING' || !rej.status) {
    return { label: 'Chờ xử lý', bg: '#FEF3C7', color: '#B45309' };
  }

  return { label: rej.resolution || 'Chưa cập nhật', bg: '#F3F4F6', color: '#6B7280' };
};

export const REJECTED_GOODS_COLUMNS = [
  { key: 'stt', label: 'STT', width: 50, align: 'center' },
  { key: 'voucher_no', label: 'Mã phiếu', width: 140, align: 'left' },
  { key: 'created_date', label: 'Ngày phát sinh', width: 110, align: 'center' },
  { key: 'source_type', label: 'Nguồn phát sinh', width: 140, align: 'center' },
  { key: 'origin_voucher_no', label: 'Chứng từ gốc', width: 140, align: 'left' },
  { key: 'warehouse_name', label: 'Kho lưu trữ', width: 160, align: 'left' },
  { key: 'item_code', label: 'Mã vật tư', width: 130, align: 'left' },
  { key: 'item_name', label: 'Tên vật tư', width: 220, align: 'left' },
  { key: 'quantity_main', label: 'SL Loại (ĐVC)', width: 110, align: 'right' },
  { key: 'quantity_conv', label: 'SL Loại (ĐVCĐ)', width: 110, align: 'right' },
  { key: 'defect_reason', label: 'Lý do lỗi', width: 180, align: 'left' },
  { key: 'resolution', label: 'Hướng xử lý', width: 160, align: 'center' },
  { key: 'status', label: 'Trạng thái', width: 120, align: 'center' },
  { key: 'actions', label: 'Thao tác', width: 100, align: 'center' }
];

