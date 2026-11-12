// constants/warehouseConstants.js - Quy chuẩn trạng thái, màu sắc, định dạng dùng chung cho Kho Mobile
// Đồng bộ 100% với Web Module Kho (goodsReceipt.types.js, goodsIssue.types.js, rejectedGoods.types.js)

export const RECEIPT_STATUSES = {
  COMPLETED: { key: 'COMPLETED', label: 'Đã nhập kho', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  PENDING: { key: 'PENDING', label: 'Chờ nhập kho', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  PROCESSING: { key: 'PROCESSING', label: 'Đang kiểm đếm', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  DRAFT: { key: 'DRAFT', label: 'Bản nháp', bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' },
  CANCELLED: { key: 'CANCELLED', label: 'Đã hủy', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
};

export const HANDOVER_STATUSES = {
  COMPLETED: { key: 'COMPLETED', label: 'Đã bàn giao', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  PENDING: { key: 'PENDING', label: 'Chờ nhận bàn giao', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  PROCESSING: { key: 'PROCESSING', label: 'Đang chuẩn bị hàng', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  DRAFT: { key: 'DRAFT', label: 'Bản nháp', bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' },
  CANCELLED: { key: 'CANCELLED', label: 'Đã hủy', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
};

export const RETURN_STATUSES = {
  PENDING: { key: 'PENDING', label: 'Chờ kho xử lý', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  RESOLVED: { key: 'RESOLVED', label: 'Đã xử lý', bg: '#DCFCE7', color: '#15803D', border: '#A7F3D0' },
  CANCELLED: { key: 'CANCELLED', label: 'Đã hủy', bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' },
};

export const RETURN_MODES = [
  { key: 'PROD_DEFECT', source_type: 'PROD_RETURN', return_mode: 'DEFECTIVE', label: 'Sản xuất trả hàng lỗi', desc: 'Hàng hư hỏng, lỗi kỹ thuật phát hiện tại xưởng trả về kho cách ly' },
  { key: 'GOOD_EXCESS', source_type: 'PROD_RETURN', return_mode: 'GOOD_EXCESS', label: 'Hoàn trả vật tư tốt thừa', desc: 'Vật tư tốt dùng thừa tại xưởng trả nhập lại tồn kho khả dụng' },
  { key: 'QC_INCOMING', source_type: 'QC_INCOMING', return_mode: 'DEFECTIVE', label: 'QC đầu vào loại hàng NCC', desc: 'Hàng nhập từ nhà cung cấp không đạt tiêu chuẩn IQC' },
];

export const RETURN_RESOLUTIONS = {
  PENDING: { key: 'PENDING', label: 'Chờ thẩm định', color: '#6B7280', bg: '#F3F4F6' },
  REUSE: { key: 'REUSE', label: 'Tái sử dụng / Nhập lại kho', color: '#1D4ED8', bg: '#DBEAFE' },
  SCRAP: { key: 'SCRAP', label: 'Xuất hủy', color: '#DC2626', bg: '#FEE2E2' },
  RETURN_VENDOR: { key: 'RETURN_VENDOR', label: 'Trả nhà cung cấp', color: '#B45309', bg: '#FEF3C7' },
};

export const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDateVN = (val) => {
  if (!val) return '—';
  const s = String(val).trim().split('T')[0];
  const parts = s.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return s;
};

export const formatNumberVN = (num) => {
  if (num === null || num === undefined || num === '' || isNaN(num)) return '0';
  return Number(num).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
};

export const getStatusBadge = (map, key) => {
  return map[key] || { key, label: key || 'Chưa rõ', bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
};

export const hasWarehouseAction = (permissions, user, candidateKeys = [], action = 'read') => {
  const authStr = `${user?.role_name || ''} | ${user?.permission_name || ''} | ${user?.permission_level || ''} | ${user?.username || ''}`.toLowerCase();
  if (
    authStr.includes('admin') ||
    authStr.includes('it') ||
    authStr.includes('bgd') ||
    authStr.includes('toàn quyền hệ thống')
  ) {
    return true;
  }
  if (!permissions || Object.keys(permissions).length === 0) return true;
  for (const key of candidateKeys) {
    const val = permissions[key];
    if (val !== undefined) {
      if (val === 'none' || val === '') return false;
      const list = String(val).split(',').map((s) => s.trim());
      if (list.includes(action) || list.includes('export_import') || (action === 'read' && list.length > 0)) {
        return true;
      }
    }
  }
  return false;
};

