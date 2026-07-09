import api from '@webShared/Services/api.service';
import { API_URL } from '@webShared/Services/api.service';

/**
 * Service: Giao tiếp với API Backend của module Claim
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

  // --- CLAIM DEFECTS CATALOG (Shared with Inspection) ---
  getDefects: async (params = {}) => {
    return await api.get('/inspections/client-defects', { params });
  },
  
  getDefectById: async (id) => {
    return await api.get(`/inspections/client-defects/${id}`);
  },

  // --- CONTAINER SHIPMENTS ---
  getShipments: async (params = {}) => {
    return await api.get('/claims/shipments', { params });
  },
  
  getShipmentById: async (id) => {
    return await api.get(`/claims/shipments/${id}`);
  },
  
  createShipment: async (data) => {
    return await api.post('/claims/shipments', data);
  },
  
  updateShipment: async (id, data) => {
    return await api.put(`/claims/shipments/${id}`, data);
  },
  
  deleteShipment: async (id) => {
    return await api.delete(`/claims/shipments/${id}`);
  },

  // --- PDF CLAIMS INGESTION ---
  importPdf: async (formData) => {
    return await api.post('/claims/claims/import-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  parseCreditNote: async (formData) => {
    return await api.post('/claims/claims/parse-credit-note', formData, {
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

  /**
   * SSE streaming folder import - sends FormData and reads SSE progress events.
   * Uses native fetch (not axios) to support streaming response parsing.
   * @param {FormData} formData - with 'files' entries
   * @param {function} onProgress - callback(eventData) for each SSE event
   * @returns {Promise<object>} - the final result payload
   */
  importFolderStream: async (formData, onProgress) => {
    const url = `${API_URL}claims/claims/import-folder-stream`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let detail = 'Lỗi kết nối máy chủ.';
      try {
        const errorJson = JSON.parse(errorText);
        detail = errorJson.detail || detail;
      } catch {}
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
      
      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
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

    // Process remaining buffer
    if (buffer.startsWith('data: ')) {
      try {
        const eventData = JSON.parse(buffer.slice(6));
        if (eventData.type === 'result') {
          finalResult = eventData;
        }
        if (onProgress) {
          onProgress(eventData);
        }
      } catch {}
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
  },

  getImportedPdfs: async () => {
    return await api.get('/claims/claims/imported-pdfs');
  },
  
  deleteImportedPdf: async (filename) => {
    return await api.delete(`/claims/claims/imported-pdfs/${filename}`);
  },

  getImportBatch: async (batchId) => {
    return await api.get(`/claims/claims/imports/${batchId}`);
  },
  
  getImportBatches: async () => {
    return await api.get('/claims/claims/imports');
  },

  getClaimChatHistory: async (sessionId = 'default') => {
    try {
      const response = await api.get('/claims/chat/history', { params: { session_id: sessionId } });
      return response;
    } catch (err) {
      console.error('[Claim AI] get history error', err);
      throw err;
    }
  },

  clearClaimChatHistory: async (sessionId = 'default') => {
    try {
      const response = await api.delete('/claims/chat/history', { params: { session_id: sessionId } });
      return response;
    } catch (err) {
      console.error('[Claim AI] clear history error', err);
      throw err;
    }
  },

  sendClaimChatMessage: async (message, context = {}, history = [], sessionId = 'default') => {
    try {
      const response = await api.post('/claims/chat', { message, context, history, session_id: sessionId });
      return response;
    } catch (err) {
      console.error('[Claim AI] error', err);
      throw err;
    }
  },

  getChatSessions: async () => {
    try {
      return await api.get('/claims/chat/sessions');
    } catch (err) {
      console.error('[Claim AI] get sessions error', err);
      throw err;
    }
  },

  deleteChatSession: async (sessionId) => {
    try {
      return await api.delete(`/claims/chat/sessions/${sessionId}`);
    } catch (err) {
      console.error('[Claim AI] delete session error', err);
      throw err;
    }
  }
};
