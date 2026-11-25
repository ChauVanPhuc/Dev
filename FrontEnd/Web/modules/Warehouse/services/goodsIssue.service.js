// goodsIssue.service.js - Service quản lý dữ liệu Phiếu Xuất Kho
import { WAREHOUSE_OPTIONS, ISSUE_TYPES, DEPARTMENT_OPTIONS } from '../types/goodsIssue.types.js';
import { warehouseDataService } from './warehouseData.service.js';

/**
 * Service Phiếu Xuất Kho - kết nối trực tiếp với Single Source of Truth
 */
export const goodsIssueService = {
  async getIssues() {
    return warehouseDataService.getIssues();
  },

  async filterIssues(params = {}) {
    return warehouseDataService.filterIssues(params);
  },

  async checkAvailableStock(warehouseName, itemCode) {
    return warehouseDataService.checkAvailableStock(warehouseName, itemCode);
  },

  validateIssuePayload(payload) {
    if (!payload) throw new Error('Dữ liệu phiếu xuất kho không hợp lệ.');
    if (!payload.warehouse_name || !payload.warehouse_name.trim()) {
      throw new Error('Vui lòng chọn Kho xuất kho.');
    }
    if (!payload.issue_date) {
      throw new Error('Ngày xuất kho không được để trống.');
    }
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Phiếu xuất kho phải có ít nhất một dòng mặt hàng.');
    }

    for (let i = 0; i < payload.items.length; i++) {
      const it = payload.items[i];
      const rowIdx = i + 1;

      const qRaw = it.quantity;
      if (qRaw === '' || qRaw === null || qRaw === undefined) {
        throw new Error(`Dòng số ${rowIdx}: Vui lòng nhập Số lượng xuất.`);
      }
      if (String(qRaw).trim().startsWith('-') || Number(qRaw) < 0) {
        throw new Error(`Dòng số ${rowIdx}: Số lượng không được âm.`);
      }
      const q = Number(qRaw);
      if (isNaN(q) || q <= 0) {
        throw new Error(`Dòng số ${rowIdx}: Số lượng xuất phải lớn hơn 0.`);
      }

      if (!it.item_code || !it.item_code.trim()) {
        throw new Error(`Dòng số ${rowIdx}: Mã mặt hàng không được để trống.`);
      }
      if (!it.item_name || !it.item_name.trim()) {
        throw new Error(`Dòng số ${rowIdx}: Tên mặt hàng không được để trống.`);
      }
      if (!it.unit || !it.unit.trim()) {
        throw new Error(`Dòng số ${rowIdx}: Đơn vị tính (ĐVT) không được để trống.`);
      }
    }
  },

  async createIssue(payload) {
    this.validateIssuePayload(payload);
    return warehouseDataService.createIssue(payload);
  },

  async updateIssue(id, payload) {
    this.validateIssuePayload(payload);
    return warehouseDataService.updateIssue(id, payload);
  },

  async deleteIssues(ids) {
    return warehouseDataService.deleteIssues(ids);
  },

  async exportToExcel(records = []) {
    const headers = [
      'STT',
      'Mã phiếu',
      'Tên kho',
      'Ngày xuất kho',
      'Người bàn giao',
      'Mã khách',
      'Tên khách',
      'Bộ phận',
      'Nội dung',
      'Loại phiếu',
      'Trạng thái',
      'CTGS',
      'Ngày tạo',
      'Người tạo',
      'Tổng dòng hàng',
      'Tổng số lượng xuất'
    ];

    const rows = records.map((r, i) => [
      i + 1,
      `"${r.voucher_no || ''}"`,
      `"${r.warehouse_name || ''}"`,
      `"${r.issue_date || ''}"`,
      `"${r.deliverer_name || ''}"`,
      `"${r.customer_code || ''}"`,
      `"${r.customer_name || ''}"`,
      `"${r.department_name || ''}"`,
      `"${(r.content || '').replace(/"/g, '""')}"`,
      `"${r.issue_type || ''}"`,
      `"${r.status || ''}"`,
      `"${r.ctgs || ''}"`,
      `"${r.created_at || ''}"`,
      `"${r.created_by || ''}"`,
      r.total_lines || (r.items ? r.items.length : 1),
      r.total_quantity || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_phieu_xuat_kho_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }
};

export default goodsIssueService;
