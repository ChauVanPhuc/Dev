// Client API Service & SSE Listener cho Module LPN Crawler
const API_BASE = '/api/v1/lpn-crawler';

export const lpnCrawlerApi = {
  // Start job
  async startCrawlJob(force = false, mode = 'full') {
    try {
      const params = new URLSearchParams();
      if (force) params.append('force', 'true');
      if (mode) params.append('mode', mode);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const url = `${API_BASE}/jobs/start${queryString}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) {}
      if (!res.ok) {
        const errObj = new Error(data.detail?.message || data.detail || `Lỗi kết nối Backend (${res.status}). Vui lòng kiểm tra Server Backend (cổng 1111) đã bật chưa.`);
        errObj.status = res.status;
        errObj.detail = data.detail;
        throw errObj;
      }
      return data;
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Không thể kết nối đến máy chủ Backend (Cổng 1111). Vui lòng đảm bảo Backend (uvicorn) đã được khởi chạy.');
      }
      throw err;
    }
  },

  // Start Sync Job (Crawl đồng bộ cập nhật dữ liệu mới & bóc tách AI OCR real-time)
  async startSyncJob(force = false, mode = 'incremental') {
    try {
      const params = new URLSearchParams();
      if (force) params.append('force', 'true');
      if (mode) params.append('mode', mode);
      params.append('auto_ocr', 'true');
      const queryString = `?${params.toString()}`;
      const url = `${API_BASE}/jobs/start${queryString}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) {}
      if (!res.ok) {
        const errObj = new Error(data.detail?.message || data.detail || `Lỗi kết nối Backend (${res.status}). Vui lòng kiểm tra Server Backend (cổng 1111) đã bật chưa.`);
        errObj.status = res.status;
        errObj.detail = data.detail;
        throw errObj;
      }
      return data;
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Không thể kết nối đến máy chủ Backend (Cổng 1111). Vui lòng đảm bảo Backend (uvicorn) đã được khởi chạy.');
      }
      throw err;
    }
  },


  // Reset locks
  async resetLocks() {
    try {
      const res = await fetch(`${API_BASE}/jobs/reset-lock`, { method: 'POST' });
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // Stop job
  async stopCrawlJob(jobId) {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/stop`, { method: 'POST' });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) {}
      if (!res.ok) throw new Error(data.detail?.message || data.detail || 'Không thể dừng job');
      return data;
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Không thể kết nối đến máy chủ Backend (Cổng 1111).');
      }
      throw err;
    }
  },

  // Pause job
  async pauseCrawlJob(jobId) {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/pause`, { method: 'POST' });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) {}
      if (!res.ok) throw new Error(data.detail?.message || data.detail || 'Không thể tạm dừng job');
      return data;
    } catch (err) {
      throw err;
    }
  },

  // Resume job
  async resumeCrawlJob(jobId) {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/resume`, { method: 'POST' });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) {}
      if (!res.ok) throw new Error(data.detail?.message || data.detail || 'Không thể tiếp tục job');
      return data;
    } catch (err) {
      throw err;
    }
  },

  // Get current active job
  async getCurrentJob() {
    try {
      const res = await fetch(`${API_BASE}/jobs/current`);
      if (!res.ok) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch (e) {
      return null;
    }
  },

  // Get jobs list
  async getJobsList() {
    try {
      const res = await fetch(`${API_BASE}/jobs`);
      if (!res.ok) return [];
      const text = await res.text();
      return text ? JSON.parse(text) : [];
    } catch (e) {
      return [];
    }
  },

  // Get containers list with filters
  async getContainers(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.container_number) query.append('container_number', params.container_number);
      if (params.factory) query.append('factory', params.factory);
      if (params.operator_name) query.append('operator_name', params.operator_name);
      if (params.batch) query.append('batch', params.batch);
      if (params.sku) query.append('sku', params.sku);
      if (params.lpn) query.append('lpn', params.lpn);
      if (params.year) query.append('year', params.year);
      if (params.month) query.append('month', params.month);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.sort) query.append('sort', params.sort);
      if (params.page) query.append('page', params.page);

      const pageSizeVal = params.page_size === Infinity || params.page_size === 'all' ? 100000 : (params.page_size || 15);
      query.append('page_size', pageSizeVal);

      const res = await fetch(`${API_BASE}/containers?${query.toString()}`);
      if (!res.ok) return { items: [], total: 0 };
      const text = await res.text();
      return text ? JSON.parse(text) : { items: [], total: 0 };
    } catch (e) {
      console.error('getContainers fetch error:', e);
      return { items: [], total: 0 };
    }
  },

  // Lấy danh sách thẻ Container (Container Cards Grid View)
  async getContainerCards(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.container_number) query.append('container_number', params.container_number);
      if (params.factory) query.append('factory', params.factory);
      if (params.operator_name) query.append('operator_name', params.operator_name);
      if (params.batch) query.append('batch', params.batch);
      if (params.sku) query.append('sku', params.sku);
      if (params.lpn) query.append('lpn', params.lpn);
      if (params.year) query.append('year', params.year);
      if (params.month) query.append('month', params.month);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.sort) query.append('sort', params.sort);
      if (params.page) query.append('page', params.page);

      const pageSizeVal = params.page_size === Infinity || params.page_size === 'all' ? 100000 : (params.page_size || 24);
      query.append('page_size', pageSizeVal);

      const res = await fetch(`${API_BASE}/containers/cards?${query.toString()}`);
      if (!res.ok) return { items: [], total: 0 };
      const text = await res.text();
      return text ? JSON.parse(text) : { items: [], total: 0 };
    } catch (e) {
      console.error('getContainerCards fetch error:', e);
      return { items: [], total: 0 };
    }
  },

  // Lấy danh sách giá trị gợi ý cho bộ lọc (Containers, Batches, SKUs, LPNs, Factories, Operators)
  async getFilterOptions() {
    try {
      const res = await fetch(`${API_BASE}/filter-options`);
      if (!res.ok) return {};
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('getFilterOptions fetch error:', e);
      return {};
    }
  },

  // Batch delete items
  async batchDeleteItems(itemIds = []) {
    if (!itemIds || itemIds.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/items/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds })
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.detail?.message || data.detail || 'Không thể xóa các dòng đã chọn');
      return data;
    } catch (err) {
      throw err;
    }
  },
  // Delete all items in database
  async deleteAllItems() {
    try {
      const res = await fetch(`${API_BASE}/items/delete-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.detail?.message || data.detail || 'Không thể xóa toàn bộ dữ liệu');
      return data;
    } catch (err) {
      throw err;
    }
  },


  // Get single container detail
  async getContainerDetail(containerId) {
    try {
      const res = await fetch(`${API_BASE}/containers/${containerId}`);
      if (!res.ok) throw new Error('Không thể tải chi tiết container');
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch (e) {
      return null;
    }
  },

  // Get single item detail by item_id (dùng cho row detail action)
  async getItemDetail(itemId) {
    const res = await fetch(`${API_BASE}/items/${itemId}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => res.status);
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  // Get KPI Stats (4 KPI mới: total_containers, total_sku_rows, total_images, total_missing_rows)
  async getStats() {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) return { total_containers: 0, total_sku_rows: 0, total_images: 0, total_missing_rows: 0 };
      const text = await res.text();
      return text ? JSON.parse(text) : { total_containers: 0, total_sku_rows: 0, total_images: 0, total_missing_rows: 0 };
    } catch (e) {
      return { total_containers: 0, total_sku_rows: 0, total_images: 0, total_missing_rows: 0 };
    }
  },

  // Get Missing Rows list
  async getMissingRows(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.missing_type) query.append('missing_type', params.missing_type);
      if (params.page) query.append('page', params.page);
      if (params.page_size) query.append('page_size', params.page_size);

      if (params.tab) query.append('tab', params.tab);

      if (params.startDate || params.start_date) query.append('start_date', params.startDate || params.start_date);
      if (params.endDate || params.end_date) query.append('end_date', params.endDate || params.end_date);

      const res = await fetch(`${API_BASE}/missing-rows?${query.toString()}`);
      if (!res.ok) return { items: [], total: 0 };
      const text = await res.text();
      return text ? JSON.parse(text) : { items: [], total: 0 };
    } catch (e) {
      return { items: [], total: 0 };
    }
  },

  // Resolve item (Đã xử lý hoặc Không xử lý được)
  async resolveItem(itemId, status, note = '', resolvedBy = '') {
    try {
      const res = await fetch(`${API_BASE}/items/${itemId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note, resolved_by: resolvedBy })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.detail || 'Lỗi khi cập nhật trạng thái xử lý' };
      }
      return await res.json();
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  // Unresolve item (Đưa lại danh sách)
  async unresolveItem(itemId) {
    try {
      const res = await fetch(`${API_BASE}/items/${itemId}/unresolve`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.detail || 'Lỗi khi hủy trạng thái xử lý' };
      }
      return await res.json();
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  // Retry missing images and data
  async retryMissingData(itemIds = null) {
    try {
      const res = await fetch(`${API_BASE}/missing-rows/retry-missing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds })
      });
      if (!res.ok) return { success: false, message: 'Lỗi máy chủ khi bổ sung dữ liệu thiếu.' };
      return await res.json();
    } catch (e) {
      return { success: false, message: e.message };
    }
  },


  // Export Excel URL
  getExportExcelUrl(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.factory) query.append('factory', params.factory);
    return `${API_BASE}/export?${query.toString()}`;
  },


  // Get logs (Hỗ trợ phân trang Server-side, tìm kiếm và lọc không giới hạn số lượng log)
  async getLogs(paramsOrJobId = null, maybeLimit = null) {
    try {
      const params = new URLSearchParams();

      if (paramsOrJobId && typeof paramsOrJobId === 'object') {
        const { jobId, page, pageSize, search, level, limit } = paramsOrJobId;
        if (jobId) params.append('job_id', jobId);
        if (page !== null && page !== undefined) params.append('page', page);
        if (pageSize) params.append('page_size', pageSize);
        if (search && search.trim()) params.append('search', search.trim());
        if (level && level.trim()) params.append('level', level.trim());
        if (limit) params.append('limit', limit);
      } else {
        // Tương thích ngược kiểu gọi getLogs(jobId, limit)
        const validJobId = (typeof paramsOrJobId === 'number' && Number.isInteger(paramsOrJobId) && paramsOrJobId > 0) ? paramsOrJobId : null;
        if (validJobId) params.append('job_id', validJobId);
        if (maybeLimit) params.append('limit', maybeLimit);
      }

      const queryString = params.toString();
      const url = queryString ? `${API_BASE}/logs?${queryString}` : `${API_BASE}/logs`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      return text ? JSON.parse(text) : [];
    } catch (e) {
      console.error('[API] getLogs error:', e);
      return [];
    }
  },

  // Clear logs
  async clearLogs(jobId = null) {
    const url = jobId ? `${API_BASE}/logs?job_id=${jobId}` : `${API_BASE}/logs`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Lỗi khi xóa nhật ký log');
    }
    return await res.json();
  },

  // Subscribe SSE
  subscribeJobSSE(jobId, onProgress, onLog, onStatus, onDataUpdated, onSyncOcr) {
    let eventSource = null;
    let isClosedExplicitly = false;
    let reconnectTimeout = null;
    let retryDelay = 1500;

    const connect = () => {
      if (isClosedExplicitly) return;
      try {
        eventSource = new EventSource(`${API_BASE}/jobs/${jobId}/sse`);

        eventSource.onopen = () => {
          retryDelay = 1500;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'progress' && onProgress) {
              onProgress(data);
            } else if (data.type === 'log' && onLog) {
              onLog(data);
            } else if (data.type === 'status' && onStatus) {
              onStatus(data);
              // Khi gặp trạng thái kết thúc dứt điểm, không kết nối lại
              if (['completed', 'failed', 'cancelled', 'interrupted', 'auth_required', 'completed_with_errors'].includes(data.status)) {
                isClosedExplicitly = true;
                if (eventSource) {
                  try { eventSource.close(); } catch (e) {}
                }
              }
            } else if (data.type === 'data_updated' && onDataUpdated) {
              onDataUpdated(data);
            } else if (data.type === 'sync_ocr' && onSyncOcr) {
              onSyncOcr(data);
            }
          } catch (e) {
            console.error('SSE parse error', e);
          }
        };

        eventSource.onerror = (err) => {
          console.warn('SSE EventSource ngắt kết nối tạm thời, đang tự động thử kết nối lại...', err);
          if (eventSource) {
            try { eventSource.close(); } catch (e) {}
          }
          if (!isClosedExplicitly) {
            reconnectTimeout = setTimeout(() => {
              connect();
            }, retryDelay);
            retryDelay = Math.min(retryDelay * 1.5, 8000);
          }
        };
      } catch (err) {
        console.error('SSE connection initiation error:', err);
        if (!isClosedExplicitly) {
          reconnectTimeout = setTimeout(connect, retryDelay);
        }
      }
    };

    connect();

    return {
      close: () => {
        isClosedExplicitly = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (eventSource) {
          try { eventSource.close(); } catch (e) {}
        }
      }
    };
  },

  // Lấy lịch sử kết quả AI OCR theo Container từ CSDL để modal đồng bộ không bị rỗng danh sách khi thoát ra vào lại
  async getBatchScanResults(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.limit) query.append('limit', String(params.limit));
      if (params.status) query.append('status', params.status);
      if (params.container_number) query.append('container_number', params.container_number);
      const queryString = query.toString() ? `?${query.toString()}` : '';
      const res = await fetch(`${API_BASE}/ai-ocr/batch-scan-results${queryString}`);
      if (!res.ok) return { results: [], items: [], total_count: 0 };
      return await res.json();
    } catch (e) {
      console.error('[API] getBatchScanResults error:', e);
      return { results: [], items: [], total_count: 0 };
    }
  },

  // Lấy danh sách các mô hình AI OCR có sẵn
  async getAvailableModels() {
    try {
      let res = await fetch('/api/ai-ocr/models');
      if (!res.ok) res = await fetch('/api/v1/lpn-crawler/ai-ocr/models');
      if (!res.ok) return { success: false, models: [] };
      return await res.json();
    } catch (e) {
      return { success: false, models: [] };
    }
  }
};
