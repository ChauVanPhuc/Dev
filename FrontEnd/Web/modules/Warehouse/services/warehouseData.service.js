/**
 * warehouseData.service.js
 * Single Source of Truth - Service dữ liệu hạt nhân liên thông 3 phân hệ Kho với SQL Server API:
 * 1. Nhập kho (Goods Receipt)
 * 2. Xuất kho (Goods Issue)
 * 3. Quản lý kho / Xuất - Nhập - Tồn & Hàng loại (Warehouse Management)
 */

import api from '@webShared/Services/api.service';

export const EVENT_WAREHOUSE_SYNC = 'smartflow_warehouse_data_changed';
export const EVENT_WAREHOUSE_SYNC_COLON = 'smartflow:warehouse_data_sync';

class WarehouseDataService {
  constructor() {
    this._receipts = [];
    this._issues = [];
    this._rejected = [];
    this._rejectedLoaded = false;
    this._loadingRejectedPromise = null;
    this._receiptsLoaded = false;
    this._issuesLoaded = false;
    this._metaCache = null;
    this._metaPromise = null;
    this._listeners = new Set();
  }

  _notifyChange(action = 'UPDATE', payload = null) {
    if (typeof window !== 'undefined') {
      const detail = { action, payload, timestamp: Date.now() };
      window.dispatchEvent(new CustomEvent(EVENT_WAREHOUSE_SYNC, { detail }));
      window.dispatchEvent(new CustomEvent(EVENT_WAREHOUSE_SYNC_COLON, { detail }));
    }
    this._listeners.forEach((cb) => {
      try {
        cb({ action, payload });
      } catch (e) {
        console.warn('[WarehouseDataService] Listener error:', e);
      }
    });
  }

  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    this._listeners.add(callback);
    return () => {
      this._listeners.delete(callback);
    };
  }

  async syncFromDatabase() {
    this._receiptsLoaded = false;
    this._issuesLoaded = false;
    this._rejectedLoaded = false;
    this._metaCache = null;
    await Promise.all([
      this.fetchRejectedGoods(),
      this.getReceipts(),
      this.getIssues(),
      this.getWarehouseMeta(true),
    ]);
    this._notifyChange('SYNC', null);
    return true;
  }

  async getWarehouseMeta(force = false) {
    if (this._metaCache && !force) return this._metaCache;
    if (this._metaPromise && !force) return this._metaPromise;

    this._metaPromise = api
      .get('/warehouses/meta')
      .then((res) => {
        const data = res?.warehouses ? res : (res?.data || {});
        this._metaCache = data;
        this._metaPromise = null;
        return data;
      })
      .catch((err) => {
        this._metaPromise = null;
        console.error('[WarehouseDataService] Lỗi tải danh mục nền kho từ Database:', err);
        throw err;
      });
    return this._metaPromise;
  }

  async searchCatalog({ search = '', warehouseCode = 'ALL', limit = 80 } = {}) {
    try {
      const res = await api.get('/warehouses/catalog-search', {
        params: { search, warehouseCode, limit },
      });
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.data?.items)) return res.data.items;
      return [];
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi tìm kiếm danh mục vật tư từ Database:', err);
      throw err;
    }
  }

  // ==========================================
  // 1. NHẬP KHO (GOODS RECEIPTS)
  // ==========================================
  async getReceipts() {
    try {
      const res = await api.get('/warehouses/receipts', { params: { page: 1, pageSize: 5000 } });
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      this._receipts = data;
      this._receiptsLoaded = true;
      return data;
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi tải danh sách phiếu nhập kho:', err);
      return this._receipts;
    }
  }

  getReceiptsSync() {
    if (!this._receiptsLoaded) {
      this.getReceipts().then(() => this._notifyChange('RECEIPTS_LOADED'));
    }
    return this._receipts;
  }

  async filterReceipts(params = {}) {
    try {
      const res = await api.get('/warehouses/receipts', {
        params: {
          search: params.search || '',
          warehouse: params.warehouse || 'ALL',
          receiptType: params.receiptType || 'ALL',
          status: params.status || 'ALL',
          department: params.department || 'ALL',
          createdBy: params.createdBy || 'ALL',
          customer: params.customer || '',
          fromDate: params.fromDate || '',
          toDate: params.toDate || '',
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          sortBy: params.sortBy || 'receipt_date',
          sortDir: params.sortDir || 'desc',
        }
      });
      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : []);
      this._receipts = list;
      this._receiptsLoaded = true;
      return {
        ...(res && typeof res === 'object' ? res : {}),
        items: list,
        data: list,
        totalCount: typeof res?.totalCount === 'number' ? res.totalCount : list.length,
        totalPages: typeof res?.totalPages === 'number' ? res.totalPages : 1,
        stats: res?.stats || {},
      };
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi lọc phiếu nhập kho:', err);
      throw new Error(err?.response?.data?.detail || 'Không thể tải danh sách phiếu nhập kho.');
    }
  }

  async createReceipt(payload) {
    try {
      const created = await api.post('/warehouses/receipts', payload);
      this._rejectedLoaded = false;
      this._notifyChange('CREATE_RECEIPT', created);
      return created;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể tạo phiếu nhập kho.');
    }
  }

  async updateReceipt(id, payload) {
    try {
      const updated = await api.put(`/warehouses/receipts/${id}`, payload);
      this._notifyChange('UPDATE_RECEIPT', updated);
      return updated;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể cập nhật phiếu nhập kho.');
    }
  }

  async deleteReceipts(ids = []) {
    try {
      const res = await api.post('/warehouses/receipts/batch-delete', { ids });
      this._notifyChange('DELETE_RECEIPTS', ids);
      return res;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể xóa phiếu nhập kho.');
    }
  }

  async importReceipts(payloads = []) {
    try {
      const res = await api.post('/warehouses/receipts/import', payloads);
      this._notifyChange('IMPORT_RECEIPTS', res);
      return res;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Lỗi khi nhập hàng loạt phiếu nhập kho.');
    }
  }

  // ==========================================
  // 2. XUẤT KHO (GOODS ISSUES)
  // ==========================================
  async getIssues() {
    try {
      const res = await api.get('/warehouses/issues', { params: { page: 1, pageSize: 5000 } });
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      this._issues = data;
      this._issuesLoaded = true;
      return data;
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi tải danh sách phiếu xuất kho:', err);
      return this._issues;
    }
  }

  getIssuesSync() {
    if (!this._issuesLoaded) {
      this.getIssues().then(() => this._notifyChange('ISSUES_LOADED'));
    }
    return this._issues;
  }

  async filterIssues(params = {}) {
    try {
      const res = await api.get('/warehouses/issues', {
        params: {
          search: params.search || '',
          warehouse: params.warehouse || 'ALL',
          issueType: params.issueType || 'ALL',
          status: params.status || 'ALL',
          department: params.department || 'ALL',
          createdBy: params.createdBy || 'ALL',
          customer: params.customer || '',
          fromDate: params.fromDate || '',
          toDate: params.toDate || '',
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          sortBy: params.sortBy || 'issue_date',
          sortDir: params.sortDir || 'desc',
        }
      });
      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : []);
      this._issues = list;
      this._issuesLoaded = true;
      return {
        ...(res && typeof res === 'object' ? res : {}),
        items: list,
        data: list,
        totalCount: typeof res?.totalCount === 'number' ? res.totalCount : list.length,
        totalPages: typeof res?.totalPages === 'number' ? res.totalPages : 1,
        stats: res?.stats || {},
      };
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi lọc phiếu xuất kho:', err);
      throw new Error(err?.response?.data?.detail || 'Không thể tải danh sách phiếu xuất kho.');
    }
  }

  async createIssue(payload) {
    try {
      const created = await api.post('/warehouses/issues', payload);
      this._notifyChange('CREATE_ISSUE', created);
      return created;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể tạo phiếu xuất kho.');
    }
  }

  async updateIssue(id, payload) {
    try {
      const updated = await api.put(`/warehouses/issues/${id}`, payload);
      this._notifyChange('UPDATE_ISSUE', updated);
      return updated;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể cập nhật phiếu xuất kho.');
    }
  }

  async deleteIssues(ids = []) {
    try {
      const res = await api.post('/warehouses/issues/batch-delete', { ids });
      this._notifyChange('DELETE_ISSUES', ids);
      return res;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể xóa phiếu xuất kho.');
    }
  }

  async importIssues(payloads = []) {
    try {
      const res = await api.post('/warehouses/issues/import', payloads);
      this._notifyChange('IMPORT_ISSUES', res);
      return res;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Lỗi khi nhập hàng loạt phiếu xuất kho.');
    }
  }

  // ==========================================
  // 3. HÀNG LOẠI / HÀNG TRẢ VỀ (REJECTED GOODS)
  // ==========================================
  async fetchRejectedGoods(params = {}) {
    if (this._loadingRejectedPromise && Object.keys(params).length === 0) {
      return this._loadingRejectedPromise;
    }
    const runner = (async () => {
      try {
        const res = await api.get('/warehouses/rejected-goods', { params });
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (Object.keys(params).length === 0) {
          this._rejected = list;
          this._rejectedLoaded = true;
          this._notifyChange('REJECTED_LOADED', list);
        }
        return list;
      } catch (err) {
        console.error('[WarehouseDataService] Lỗi tải danh sách hàng loại:', err);
        return this._rejected;
      } finally {
        this._loadingRejectedPromise = null;
      }
    })();

    if (Object.keys(params).length === 0) {
      this._loadingRejectedPromise = runner;
    }
    return runner;
  }

  getRejectedGoods() {
    if (!this._rejectedLoaded && !this._loadingRejectedPromise) {
      this.fetchRejectedGoods();
    }
    return this._rejected;
  }

  async filterRejectedGoods(params = {}) {
    try {
      const whFilter = params.warehouseCode || params.warehouse || 'ALL';
      const res = await api.get('/warehouses/rejected-goods', {
        params: {
          warehouseCode: whFilter,
          sourceType: params.sourceType || 'ALL',
          status: params.status || 'ALL',
          resolution: params.resolution || 'ALL',
          defectCategory: params.defectCategory || 'ALL',
          search: params.search || '',
          fromDate: params.fromDate || '',
          toDate: params.toDate || '',
          page: params.page || 1,
          pageSize: params.pageSize || 25,
        }
      });
      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : []);
      if (!params.search && whFilter === 'ALL') {
        this._rejected = list;
        this._rejectedLoaded = true;
      }
      return {
        ...(res && typeof res === 'object' ? res : {}),
        items: list,
        data: list,
        totalCount: typeof res?.totalCount === 'number' ? res.totalCount : list.length,
        totalPages: typeof res?.totalPages === 'number' ? res.totalPages : 1,
        stats: res?.stats || {},
      };
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi lọc hàng loại:', err);
      throw new Error(err?.response?.data?.detail || 'Không thể tải danh sách hàng loại.');
    }
  }

  async createRejectedVoucher(payload) {
    try {
      const created = await api.post('/warehouses/rejected-goods', payload);
      await this.fetchRejectedGoods();
      this._notifyChange('CREATE_REJECTED', created);
      return created;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể tạo phiếu hàng loại.');
    }
  }

  async resolveRejectedVoucher(id, resolution, notes = '', resolutionDate = '') {
    try {
      const updated = await api.patch(`/warehouses/rejected-goods/${id}/resolve`, {
        resolution,
        notes,
        resolution_date: resolutionDate || null,
      });
      await this.fetchRejectedGoods();
      this._notifyChange('RESOLVE_REJECTED', updated);
      return updated;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể xử lý phiếu hàng loại.');
    }
  }

  async cancelRejectedVoucher(id, reason = '') {
    try {
      const updated = await api.patch(`/warehouses/rejected-goods/${id}/cancel`, { reason });
      await this.fetchRejectedGoods();
      this._notifyChange('CANCEL_REJECTED', updated);
      return updated;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Không thể hủy phiếu hàng loại.');
    }
  }

  // ==========================================
  // 4. TỒN KHO KHẢ DỤNG & BÁO CÁO XNT
  // ==========================================
  async checkAvailableStock(warehouseName, itemCode) {
    try {
      return await api.get('/warehouses/check-stock', {
        params: { warehouse_name: warehouseName, item_code: itemCode }
      });
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi kiểm tra tồn khả dụng:', err);
      return { available: 0, available_stock: 0, unit: '', item_name: '' };
    }
  }

  async getRawItems({ fromDate = '', toDate = '' } = {}) {
    try {
      const res = await api.get('/warehouses/raw-items', { params: { fromDate, toDate } });
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi tải raw items XNT:', err);
      throw new Error(err?.response?.data?.detail || 'Không thể tải dữ liệu tồn kho.');
    }
  }

  async getInventoryReport(params = {}) {
    try {
      const res = await api.get('/warehouses/inventory-report', {
        params: {
          warehouse: params.warehouse || params.warehouseCode || 'ALL',
          search: params.search || '',
          category: params.category || 'ALL',
          unitMain: params.unitMain || 'ALL',
          unitConv: params.unitConv || 'ALL',
          stockStatus: params.stockStatus || 'ALL',
          inventoryDays: params.inventoryDays || 'ALL',
          fromDate: params.fromDate || '',
          toDate: params.toDate || '',
          page: params.page || 1,
          pageSize: params.pageSize || 25,
          sortBy: params.sortBy || 'item_code',
          sortDir: params.sortDir || 'asc',
        }
      });
      return res;
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi tải báo cáo XNT:', err);
      throw new Error(err?.response?.data?.detail || 'Không thể tải báo cáo Xuất - Nhập - Tồn.');
    }
  }

  async getWarehouseCounts() {
    try {
      return await api.get('/warehouses/counts');
    } catch (err) {
      console.error('[WarehouseDataService] Lỗi đếm số lượng theo kho:', err);
      return { ALL: 0, KTP: 0, KDG: 0, KHH: 0, KNLC: 0, KVT: 0, KSON: 0 };
    }
  }

  async getMaterialByCode(itemCode, warehouseCode = 'ALL') {
    const rawItems = await this.getRawItems();
    const cleanCode = String(itemCode || '').trim().toLowerCase();
    if (warehouseCode && warehouseCode !== 'ALL') {
      const match = rawItems.find(
        (it) => it.item_code.toLowerCase() === cleanCode && it.warehouse_code === warehouseCode
      );
      if (match) return match;
    }
    return rawItems.find((it) => it.item_code.toLowerCase() === cleanCode) || null;
  }

  async importMaterials(items = []) {
    try {
      const res = await api.post('/warehouses/materials/import', items);
      this._notifyChange('IMPORT_MATERIALS', res);
      return res;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      throw new Error(detail || err.message || 'Lỗi khi nhập danh mục vật tư từ Excel.');
    }
  }
}

export const warehouseDataService = new WarehouseDataService();
export default warehouseDataService;
