// services/mobileWarehouseService.js - API client đồng bộ 100% với SQL Server Web Warehouse
import apiClient from '@shared/services/api';

let cachedMeta = null;
let cachedMetaPromise = null;

/**
 * Nén ảnh phía client (canvas resize <= 1280px, JPEG 0.78) trước khi upload lên Backend.
 */
export const compressImageFile = (file, maxDimension = 1280, quality = 0.78) => {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const name = (file.name || 'photo.jpg').replace(/\.[^.]+$/, '.jpg');
            resolve(new File([blob], name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export const mobileWarehouseService = {
  async getMobileMeta(force = false) {
    if (cachedMeta && !force) return cachedMeta;
    if (cachedMetaPromise && !force) return cachedMetaPromise;

    cachedMetaPromise = apiClient
      .get('/warehouses/mobile-meta')
      .then((res) => {
        cachedMeta = res.data || {};
        cachedMetaPromise = null;
        return cachedMeta;
      })
      .catch((err) => {
        cachedMetaPromise = null;
        console.error('[mobileWarehouseService] Lỗi tải metadata kho từ DB:', err);
        throw new Error(err?.response?.data?.detail || 'Không thể tải dữ liệu danh mục từ máy chủ.');
      });
    return cachedMetaPromise;
  },

  async getRawMaterials(params = {}) {
    const res = await apiClient.get('/warehouses/raw-items', { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async searchCatalog({ search = '', warehouseCode = 'ALL', limit = 60 } = {}) {
    try {
      const res = await apiClient.get('/warehouses/catalog-search', {
        params: { search, warehouseCode, limit },
      });
      return Array.isArray(res.data?.items) ? res.data.items : [];
    } catch (err) {
      console.error('[mobileWarehouseService] Lỗi tìm kiếm danh mục vật tư từ DB:', err);
      throw err;
    }
  },

  async checkStock(warehouseName, itemCode) {
    if (!warehouseName || !itemCode) return { available: 0, available_stock: 0, unit: '', item_name: '' };
    const res = await apiClient.get('/warehouses/check-stock', {
      params: { warehouse_name: warehouseName, item_code: itemCode },
    });
    return res.data || { available: 0, available_stock: 0, unit: '', item_name: '' };
  },

  async getSubPoCodes({ search = '', limit = 100 } = {}) {
    try {
      const res = await apiClient.get('/warehouses/sub-po-codes', {
        params: { search, limit },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.warn('[mobileWarehouseService] Lỗi tìm kiếm mã phân đoạn PO:', err);
      return [];
    }
  },

  async getPoMaterials(poCodeOrList, warehouseName = '') {
    if (Array.isArray(poCodeOrList)) {
      const cleaned = poCodeOrList.map((c) => String(c || '').trim()).filter(Boolean);
      if (cleaned.length === 0) return null;
      const res = await apiClient.get('/warehouses/po-materials', {
        params: { po_codes: cleaned.join(','), warehouse_name: warehouseName },
      });
      return res.data;
    }
    const cleanSingle = String(poCodeOrList || '').trim();
    if (!cleanSingle) return null;
    const res = await apiClient.get('/warehouses/po-materials', {
      params: { po_code: cleanSingle, warehouse_name: warehouseName },
    });
    return res.data;
  },

  async getPurchasePoCodes({ search = '', warehouseName = '', limit = 80 } = {}) {
    try {
      const res = await apiClient.get('/warehouses/purchase-po-codes', {
        params: { search, warehouse_name: warehouseName || undefined, limit },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.warn('[mobileWarehouseService] Lỗi tìm kiếm Mã PO đặt hàng:', err);
      return [];
    }
  },

  async getPurchasePoItems(poCode) {
    if (!poCode) return null;
    const res = await apiClient.get('/warehouses/purchase-po-items', {
      params: { po_code: poCode },
    });
    return res.data;
  },

  async uploadImage(file) {
    const compressed = await compressImageFile(file);
    const formData = new FormData();
    formData.append('image', compressed);
    const res = await apiClient.post('/warehouses/upload-image', formData);
    return res.data?.url || '';
  },

  // ── 1. PHIẾU NHẬP KHO ───────────────────────────────────────────
  async listReceipts(params = {}) {
    const res = await apiClient.get('/warehouses/receipts', {
      params: {
        search: params.search || '',
        warehouse: params.warehouse || 'ALL',
        status: params.status || 'ALL',
        createdChannel: params.createdChannel || 'ALL',
        fromDate: params.fromDate || '',
        toDate: params.toDate || '',
        page: params.page || 1,
        pageSize: params.pageSize || 30,
        sortBy: params.sortBy || 'receipt_date',
        sortDir: params.sortDir || 'desc',
      },
    });
    return res.data || { data: [], totalCount: 0, stats: {} };
  },

  async getReceiptById(id) {
    const res = await apiClient.get(`/warehouses/receipts/${id}`);
    return res.data;
  },

  async createReceipt(payload) {
    const res = await apiClient.post('/warehouses/receipts', {
      ...payload,
      created_channel: 'Mobile',
    });
    return res.data;
  },

  async updateReceipt(id, payload) {
    const res = await apiClient.put(`/warehouses/receipts/${id}`, payload);
    return res.data;
  },

  async confirmReceipt(id, payload = {}) {
    const res = await apiClient.patch(`/warehouses/receipts/${id}/confirm`, payload);
    return res.data;
  },

  // ── 2. PHIẾU BÀN GIAO (XUẤT KHO / GIAO XƯỞNG) ──────────────────
  async listHandovers(params = {}) {
    const res = await apiClient.get('/warehouses/issues', {
      params: {
        search: params.search || '',
        warehouse: params.warehouse || 'ALL',
        status: params.status || 'ALL',
        createdBy: params.createdBy || 'ALL',
        createdChannel: params.createdChannel || 'ALL',
        fromDate: params.fromDate || '',
        toDate: params.toDate || '',
        factoryId: params.factoryId || undefined,
        factoryName: params.factoryName || undefined,
        page: params.page || 1,
        pageSize: params.pageSize || 30,
        sortBy: params.sortBy || 'issue_date',
        sortDir: params.sortDir || 'desc',
      },
    });
    return res.data || { data: [], totalCount: 0, stats: {} };
  },

  async getMyFactoryHandovers() {
    const res = await apiClient.get('/warehouses/my-factory-handovers');
    return res.data || {
      factory: { factory_id: null, factory_name: '', factory_code: '' },
      has_factory: false,
      vouchers: [],
    };
  },

  async getHandoverById(id) {
    const res = await apiClient.get(`/warehouses/issues/${id}`);
    return res.data;
  },

  async createHandover(payload) {
    const res = await apiClient.post('/warehouses/issues', {
      ...payload,
      created_channel: 'Mobile',
    });
    return res.data;
  },

  async updateHandover(id, payload) {
    const res = await apiClient.put(`/warehouses/issues/${id}`, payload);
    return res.data;
  },

  async confirmHandover(id, payload = {}) {
    const res = await apiClient.patch(`/warehouses/issues/${id}/confirm`, payload);
    return res.data;
  },

  // ── 3. PHIẾU TRẢ VỀ (HÀNG LOẠI & HOÀN KHO) ─────────────────────
  async listReturns(params = {}) {
    const res = await apiClient.get('/warehouses/rejected-goods', {
      params: {
        warehouseCode: params.warehouseCode || 'ALL',
        sourceType: params.sourceType || 'ALL',
        status: params.status || 'ALL',
        resolution: params.resolution || 'ALL',
        createdChannel: params.createdChannel || 'ALL',
        search: params.search || '',
        fromDate: params.fromDate || '',
        toDate: params.toDate || '',
        page: params.page || 1,
        pageSize: params.pageSize || 15,
      },
    });
    return res.data || { data: [], stats: {} };
  },

  async getReturnById(id) {
    const res = await apiClient.get(`/warehouses/rejected-goods/${id}`);
    return res.data;
  },

  async createReturn(payload) {
    const res = await apiClient.post('/warehouses/rejected-goods', {
      ...payload,
      created_channel: 'Mobile',
    });
    return res.data;
  },

  async resolveReturn(id, payload) {
    const res = await apiClient.patch(`/warehouses/rejected-goods/${id}/resolve`, payload);
    return res.data;
  },

  async cancelReturn(id, reason = '') {
    const res = await apiClient.patch(`/warehouses/rejected-goods/${id}/cancel`, { reason });
    return res.data;
  },
};

export default mobileWarehouseService;

