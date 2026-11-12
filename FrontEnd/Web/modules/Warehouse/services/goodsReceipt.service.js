// goodsReceipt.service.js - Service quản lý dữ liệu Phiếu Nhập Kho
import { WAREHOUSE_OPTIONS, RECEIPT_TYPES, DEPARTMENT_OPTIONS } from '../types/goodsReceipt.types.js';
import { warehouseDataService } from './warehouseData.service.js';

/**
 * Service Phiếu Nhập Kho - kết nối trực tiếp với Single Source of Truth
 */
export const goodsReceiptService = {
  async getReceipts() {
    return warehouseDataService.getReceipts();
  },

  async filterReceipts(params = {}) {
    return warehouseDataService.filterReceipts(params);
  },

  validateReceiptPayload(payload) {
    if (!payload) throw new Error('Dữ liệu phiếu nhập kho không hợp lệ.');
    if (!payload.warehouse_name || !payload.warehouse_name.trim()) {
      throw new Error('Vui lòng chọn Kho nhập kho.');
    }
    if (!payload.receipt_date) {
      throw new Error('Vui lòng chọn Ngày nhập kho.');
    }
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Phiếu nhập kho phải có ít nhất một dòng mặt hàng.');
    }

    for (let i = 0; i < payload.items.length; i++) {
      const it = payload.items[i];
      const rowIdx = i + 1;

      const q1Raw = it.quantity1 !== undefined ? it.quantity1 : it.quantity;
      if (q1Raw === '' || q1Raw === null || q1Raw === undefined) {
        throw new Error(`Dòng số ${rowIdx}: Vui lòng nhập SL nhập 1.`);
      }
      if (String(q1Raw).trim().startsWith('-') || Number(q1Raw) < 0) {
        throw new Error(`Dòng số ${rowIdx}: Số lượng không được âm.`);
      }
      const q1 = Number(q1Raw);
      if (isNaN(q1) || q1 <= 0) {
        throw new Error(`Dòng số ${rowIdx}: SL nhập 1 phải lớn hơn 0.`);
      }

      if (it.quantity2 !== undefined && it.quantity2 !== '' && it.quantity2 !== null) {
        if (String(it.quantity2).trim().startsWith('-') || Number(it.quantity2) < 0) {
          throw new Error(`Dòng số ${rowIdx}: SL nhập 2 không được âm.`);
        }
      }

      if (!it.item_code || !it.item_code.trim()) {
        throw new Error(`Dòng số ${rowIdx}: Mã mặt hàng không được để trống.`);
      }
      if (!it.item_name || !it.item_name.trim()) {
        throw new Error(`Dòng số ${rowIdx}: Tên mặt hàng không được để trống.`);
      }
      if (!it.unit1 && !it.unit) {
        throw new Error(`Dòng số ${rowIdx}: Đơn vị tính (ĐVT1) không được để trống.`);
      }
    }
  },

  async createReceipt(payload) {
    this.validateReceiptPayload(payload);
    return warehouseDataService.createReceipt(payload);
  },

  async updateReceipt(id, payload) {
    this.validateReceiptPayload(payload);
    return warehouseDataService.updateReceipt(id, payload);
  },

  async deleteReceipts(ids) {
    return warehouseDataService.deleteReceipts(ids);
  },

  async exportToExcel(records = []) {
    const headers = [
      'STT',
      'Mã phiếu',
      'Kho nhập',
      'Ngày nhập kho',
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
      'Tổng số lượng'
    ];

    const rows = records.map((r, i) => [
      i + 1,
      `"${r.voucher_no || ''}"`,
      `"${r.warehouse_name || ''}"`,
      `"${r.receipt_date || ''}"`,
      `"${r.deliverer_name || ''}"`,
      `"${r.customer_code || ''}"`,
      `"${r.customer_name || ''}"`,
      `"${r.department_name || ''}"`,
      `"${(r.content || '').replace(/"/g, '""')}"`,
      `"${r.receipt_type || ''}"`,
      `"${r.status || ''}"`,
      `"${r.ctgs || ''}"`,
      `"${r.created_at || ''}"`,
      `"${r.created_by || ''}"`,
      r.total_lines || (r.items ? r.items.length : 1),
      r.total_quantity || 0
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_phieu_nhap_kho_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }
};

export default goodsReceiptService;
