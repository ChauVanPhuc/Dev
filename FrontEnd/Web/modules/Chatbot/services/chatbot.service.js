import api, { API_URL } from '@webShared/Services/api.service';

/**
 * SmartFlow ChatBot v2 Service (`/api/v1/chatbot/*`)
 */
export const chatbotService = {
  sendMessage: async (message, context = {}, history = [], sessionId = 'default') => {
    return await api.post('/chatbot/chat', {
      message,
      context,
      history,
      session_id: sessionId,
    });
  },

  /**
   * SSE Streaming: nhận realtime trạng thái bước xử lý (`status`), nội dung (`token`), và kết quả cuối (`done`).
   */
  streamMessage: async (message, context = {}, history = [], sessionId = 'default', callbacks = {}) => {
    const token = localStorage.getItem('token');
    const url = `${API_URL}chatbot/chat/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && token !== 'null' && token !== 'undefined' ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        context,
        history,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        detail = errJson.detail || detail;
      } catch {
        // ignore parse error
      }
      throw new Error(detail);
    }

    if (!response.body) {
      throw new Error('Trình duyệt không hỗ trợ streaming.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalPayload = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const dataLine = block
          .split('\n')
          .find((l) => l.startsWith('data: '));
        if (!dataLine) continue;

        try {
          const evt = JSON.parse(dataLine.slice(6));
          if (evt.type === 'status' && callbacks.onStatus) {
            callbacks.onStatus(evt.message || '');
          } else if (evt.type === 'token' && callbacks.onToken) {
            callbacks.onToken(evt.content || '');
          } else if (evt.type === 'done') {
            finalPayload = evt.payload;
            if (callbacks.onDone) callbacks.onDone(evt.payload);
          } else if (evt.type === 'error') {
            throw new Error(evt.message || 'Lỗi từ máy chủ AI.');
          }
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) {
            console.error('[Chatbot SSE] Parse error:', parseErr);
          } else {
            throw parseErr;
          }
        }
      }
    }

    return finalPayload;
  },

  getSessions: async () => {
    const res = await api.get('/chatbot/sessions');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.sessions)) return res.sessions;
    return [];
  },

  deleteSession: async (sessionId) => {
    return await api.delete(`/chatbot/sessions/${encodeURIComponent(sessionId)}`);
  },

  getHistory: async (sessionId = 'default') => {
    const res = await api.get('/chatbot/history', { params: { session_id: sessionId } });
    return Array.isArray(res) ? res : [];
  },

  clearHistory: async (sessionId = 'default') => {
    return await api.delete('/chatbot/history', { params: { session_id: sessionId } });
  },

  submitFeedback: async (payload) => {
    return await api.post('/chatbot/feedback', payload);
  },

  getHealth: async () => {
    return await api.get('/chatbot/health');
  },

  getGeminiCookieStatus: async () => {
    return await api.get('/chatbot/admin/gemini-cookie/status');
  },

  updateGeminiCookie: async (cookies, saveToEnv = true) => {
    return await api.post('/chatbot/admin/gemini-cookie', {
      cookies,
      save_to_env: saveToEnv,
    });
  },
};

export default chatbotService;

