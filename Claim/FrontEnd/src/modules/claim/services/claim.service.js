import api, { API_URL } from '@/shared/services/api.service';

/**
 * Service: Giao tiếp với API Backend của module Claim V2
 */
export const claimService = {
  // --- CUSTOMER CLAIMS ---
  getClaims: async (params = {}) => {
    return await api.get('/claims/claims', { params });
  },

  getClaimById: async (id) => {
    return await api.get(`/claims/claims/${id}`);
  },

  createClaim: async (data) => {
    return await api.post('/claims/claims', data);
  },

  updateClaim: async (id, data) => {
    return await api.put(`/claims/claims/${id}`, data);
  },

  deleteClaim: async (id) => {
    return await api.delete(`/claims/claims/${id}`);
  },

  deleteBatchClaims: async (ids) => {
    const results = [];
    for (const id of ids) {
      try {
        await api.delete(`/claims/claims/${id}`);
        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }
    return results;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/claims/claims/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  patchClaimStatus: async (id, status) => {
    return await api.patch(`/claims/claims/${id}/status`, { status });
  },

  // --- CABINET PRICES ---
  getCabinetPrices: async (params = {}) => {
    return await api.get('/claims/cabinet-prices', { params });
  },

  getCabinetPriceById: async (id) => {
    return await api.get(`/claims/cabinet-prices/${id}`);
  },

  createCabinetPrice: async (data) => {
    return await api.post('/claims/cabinet-prices', data);
  },

  updateCabinetPrice: async (id, data) => {
    return await api.put(`/claims/cabinet-prices/${id}`, data);
  },

  deleteCabinetPrice: async (id) => {
    return await api.delete(`/claims/cabinet-prices/${id}`);
  },

  saveCabinetPricesTemp: async (prices) => {
    return await api.post('/claims/cabinet-prices/temp', prices);
  },

  // --- CLAIM DEFECTS CATALOG (Shared with Inspection/Defect) ---
  getDefects: async (params = {}) => {
    return await api.get('/inspections/client-defects', { params });
  },

  getDefectTypes: async (params = {}) => {
    return await api.get('/inspections/defect-types', { params });
  },

  getImportBatches: async () => {
    return [];
  },

  getImportBatch: async () => {
    return null;
  },

  // --- PDF CLAIMS INGESTION ---
  importPdf: async (formData) => {
    return await api.post('/claims/claims/import-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  importFolder: async (formData) => {
    return await api.post('/claims/claims/import-folder', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // --- PARSE CREDIT NOTE PDF ---
  parseCreditNote: async (formData) => {
    return await api.post('/claims/claims/parse-credit-note', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  parseCreditNotes: async (formData) => {
    return await api.post('/claims/claims/parse-credit-notes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * SSE streaming folder import
   */
  importFolderStream: async (formData, onProgress) => {
    const url = `${API_URL}claims/claims/import-folder-stream`;

    let token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      token = 'system_auto_token';
      localStorage.setItem('token', token);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let detail = 'Lỗi kết nối máy chủ.';
      try {
        const errorJson = JSON.parse(errorText);
        detail = errorJson.detail || detail;
      } catch { }
      throw new Error(detail);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let finalResult = null;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            if (eventData.type === 'result') {
              finalResult = eventData;
            }
            if (onProgress) {
              onProgress(eventData);
            }
          } catch (e) {
            // Skip malformed events
          }
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      try {
        const eventData = JSON.parse(buffer.slice(6));
        if (eventData.type === 'result') {
          finalResult = eventData;
        }
        if (onProgress) {
          onProgress(eventData);
        }
      } catch { }
    }

    if (!finalResult) {
      throw new Error('Không nhận được kết quả từ máy chủ.');
    }

    return finalResult;
  },

  exportExcel: async (claimsData) => {
    return await api.post('/claims/claims/export-excel', claimsData, {
      responseType: 'blob'
    });
  }
};

export default claimService;
