// unitOfMeasure.service.js - Service quản lý dữ liệu Đơn vị tính kết nối SQL Server Backend API
// SmartFlow ERP G7

import * as XLSX from 'xlsx';
import api from '@webShared/Services/api.service';
import {
  DEFAULT_UNITS_OF_MEASURE,
  STORAGE_KEY_UNITS,
} from '../types/unitOfMeasure.types';

class UnitOfMeasureService {
  constructor() {
    this._cache = null;
  }

  /**
   * Đồng bộ từ cache/localStorage phục vụ các kiểm tra tức thời (isCodeDuplicate, dropdown sync)
   */
  getUnits() {
    if (Array.isArray(this._cache) && this._cache.length > 0) {
      return this._cache;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UNITS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this._cache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.error('Lỗi đọc cache đơn vị tính:', e);
    }
    return [...DEFAULT_UNITS_OF_MEASURE];
  }

  /**
   * Tải danh sách Đơn vị tính thật từ SQL Server API
   */
  async fetchUnits(params = {}) {
    try {
      const res = await api.get('/units-of-measure/', { params });
      const list = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
      this._cache = list;
      try {
        localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(list));
      } catch (_) {}
      return list;
    } catch (err) {
      console.error('[UnitOfMeasureService] Lỗi tải ĐVT từ API:', err);
      throw err;
    }
  }

  getActiveUnits() {
    return this.getUnits().filter(u => u.status === 'ACTIVE');
  }

  _notifyUpdated(units) {
    this._cache = units;
    try {
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(units));
    } catch (_) {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartflow_units_updated', { detail: units }));
    }
  }

  getUnitById(id) {
    return this.getUnits().find(u => Number(u.id) === Number(id)) || null;
  }

  getUnitByCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toLowerCase();
    return this.getUnits().find(u => (u.code || '').trim().toLowerCase() === clean) || null;
  }

  isCodeDuplicate(code, excludeId = null) {
    if (!code) return false;
    const clean = String(code).trim().toLowerCase();
    return this.getUnits().some(u => {
      if (excludeId !== null && Number(u.id) === Number(excludeId)) {
        return false;
      }
      return (u.code || '').trim().toLowerCase() === clean;
    });
  }

  async createUnit(data) {
    const code = (data.code || '').trim();
    if (!code) {
      throw new Error('Tên đơn vị tính không được để trống!');
    }
    if (this.isCodeDuplicate(code)) {
      throw new Error(`Tên đơn vị tính "${code}" đã tồn tại trong hệ thống!`);
    }

    const precisionNum = Number(data.precision);
    if (isNaN(precisionNum) || precisionNum < 0 || !Number.isInteger(precisionNum)) {
      throw new Error('Độ chính xác phải là số nguyên không âm (≥ 0)!');
    }
    if (precisionNum > 6) {
      throw new Error('Độ chính xác tối đa được hỗ trợ là 6 chữ số thập phân!');
    }

    try {
      const created = await api.post('/units-of-measure/', {
        code,
        full_name: (data.full_name || '').trim(),
        precision: precisionNum,
        status: data.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      await this.fetchUnits();
      this._notifyUpdated(this.getUnits());
      return created;
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Lỗi tạo đơn vị tính!';
      throw new Error(msg);
    }
  }

  async updateUnit(id, data) {
    const code = (data.code || '').trim();
    if (!code) {
      throw new Error('Tên đơn vị tính không được để trống!');
    }
    if (this.isCodeDuplicate(code, id)) {
      throw new Error(`Tên đơn vị tính "${code}" đã bị trùng với một đơn vị khác!`);
    }

    const precisionNum = Number(data.precision);
    if (isNaN(precisionNum) || precisionNum < 0 || !Number.isInteger(precisionNum)) {
      throw new Error('Độ chính xác phải là số nguyên không âm (≥ 0)!');
    }
    if (precisionNum > 6) {
      throw new Error('Độ chính xác tối đa được hỗ trợ là 6 chữ số thập phân!');
    }

    try {
      const updated = await api.put(`/units-of-measure/${id}`, {
        code,
        full_name: (data.full_name || '').trim(),
        precision: precisionNum,
        status: data.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      await this.fetchUnits();
      this._notifyUpdated(this.getUnits());
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Lỗi cập nhật đơn vị tính!';
      throw new Error(msg);
    }
  }

  async toggleStatus(id) {
    const target = this.getUnitById(id);
    if (!target) {
      throw new Error('Không tìm thấy đơn vị tính!');
    }
    const newStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return await this.updateUnit(id, { ...target, status: newStatus });
  }

  checkUnitUsage(idOrCode) {
    let unit = null;
    if (typeof idOrCode === 'object' && idOrCode !== null) {
      unit = idOrCode;
    } else if (typeof idOrCode === 'number' || !isNaN(Number(idOrCode))) {
      unit = this.getUnitById(idOrCode);
    } else {
      unit = this.getUnitByCode(idOrCode);
    }

    if (!unit) {
      return { inUse: false, usageCount: 0, details: [] };
    }

    const targetCode = (unit.code || '').trim().toLowerCase();
    const details = [];
    let usageCount = 0;

    const legacyLockedCodes = ['m3', 'm2', 'kg', 'cái', 'tấm', 'bộ', 'lít', 'thùng', 'cuộn', 'm'];
    if (legacyLockedCodes.includes(targetCode)) {
      usageCount += 1;
      details.push('danh mục định mức sản xuất & vật tư nhà máy');
    }

    return {
      inUse: usageCount > 0,
      usageCount,
      details,
      reason: details.join(', ')
    };
  }

  async deleteUnit(id) {
    const unit = this.getUnitById(id);
    if (!unit) {
      throw new Error('Đơn vị tính không tồn tại!');
    }
    const check = this.checkUnitUsage(unit);
    if (check.inUse) {
      const err = new Error(
        `Không thể xóa đơn vị tính "${unit.code}" vì đã được sử dụng trong ${check.reason}. ` +
        `Vui lòng chuyển sang trạng thái "Ngừng hoạt động" để đảm bảo tính toàn vẹn của dữ liệu lịch sử.`
      );
      err.code = 'UNIT_IN_USE';
      err.unit = unit;
      err.details = check.details;
      throw err;
    }

    try {
      await api.delete(`/units-of-measure/${id}`);
      await this.fetchUnits();
      this._notifyUpdated(this.getUnits());
      return true;
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Lỗi khi xóa đơn vị tính!';
      throw new Error(msg);
    }
  }

  async importUnits(rows = []) {
    const currentUnits = this.getUnits();
    const existingCodeSet = new Set(currentUnits.map(u => (u.code || '').trim().toLowerCase()));
    const batchCodeSet = new Set();

    const validToInsert = [];
    const errors = [];

    rows.forEach((row, idx) => {
      const rowNum = row.rowNumber || idx + 2;
      const code = (row.code || row['Tên đơn vị tính'] || row['Mã ĐVT'] || '').trim();
      const fullName = (row.full_name || row['Tên đơn vị tính đầy đủ'] || row['Tên đầy đủ'] || '').trim();
      const rawPrecision = row.precision !== undefined ? row.precision : (row['Độ chính xác'] !== undefined ? row['Độ chính xác'] : 0);
      const rawStatus = (row.status || row['Trạng thái'] || 'ACTIVE').trim().toUpperCase();

      if (!code) {
        errors.push({ row: rowNum, code: '—', message: 'Tên đơn vị tính không được để trống' });
        return;
      }

      const lowerCode = code.toLowerCase();
      if (existingCodeSet.has(lowerCode)) {
        errors.push({ row: rowNum, code, message: `Tên đơn vị tính "${code}" đã tồn tại trong hệ thống` });
        return;
      }
      if (batchCodeSet.has(lowerCode)) {
        errors.push({ row: rowNum, code, message: `Tên đơn vị tính "${code}" bị lặp lại trong file tải lên` });
        return;
      }

      const prec = Number(rawPrecision);
      if (isNaN(prec) || prec < 0 || !Number.isInteger(prec) || prec > 6) {
        errors.push({ row: rowNum, code, message: 'Độ chính xác phải là số nguyên từ 0 đến 6' });
        return;
      }

      let status = 'ACTIVE';
      if (rawStatus.includes('NGỪNG') || rawStatus.includes('INACTIVE') || rawStatus === '0') {
        status = 'INACTIVE';
      }

      batchCodeSet.add(lowerCode);
      validToInsert.push({
        code,
        full_name: fullName,
        precision: prec,
        status,
      });
    });

    if (validToInsert.length > 0) {
      await api.post('/units-of-measure/import', { items: validToInsert });
      await this.fetchUnits();
      this._notifyUpdated(this.getUnits());
    }

    return {
      successCount: validToInsert.length,
      errorCount: errors.length,
      errors
    };
  }

  exportToExcel(units = [], fileName = '') {
    const dataToExport = units.map((u, index) => ({
      'STT': index + 1,
      'Tên đơn vị tính': u.code || '',
      'Tên đơn vị tính đầy đủ': u.full_name || '—',
      'Độ chính xác': u.precision !== undefined ? u.precision : 0,
      'Trạng thái': u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DonViTinh');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const actualFileName = fileName || `Danh_sach_don_vi_tinh_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, actualFileName);
    return actualFileName;
  }

  downloadTemplate() {
    const sampleRows = [
      { 'Tên đơn vị tính': 'm3', 'Tên đơn vị tính đầy đủ': 'Mét khối', 'Độ chính xác': 4, 'Trạng thái': 'Đang hoạt động' },
      { 'Tên đơn vị tính': 'gam', 'Tên đơn vị tính đầy đủ': 'Gram', 'Độ chính xác': 1, 'Trạng thái': 'Đang hoạt động' },
      { 'Tên đơn vị tính': 'hộp lớn', 'Tên đơn vị tính đầy đủ': 'Hộp lớn 50 cái', 'Độ chính xác': 0, 'Trạng thái': 'Đang hoạt động' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 16 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Nhap_DVT');
    XLSX.writeFile(workbook, 'Mau_nhap_don_vi_tinh_SmartFlow.xlsx');
  }
}

export const unitOfMeasureService = new UnitOfMeasureService();
export default unitOfMeasureService;
