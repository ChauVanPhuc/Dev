import React, { useState, useEffect } from 'react';
import { KeyRound, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, X } from 'lucide-react';
import chatbotService from '../services/chatbot.service';

const GeminiCookieModal = ({ isOpen, onClose, onUpdated }) => {
  const [statusData, setStatusData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [saveToEnv, setSaveToEnv] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'warning', text }

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await chatbotService.getGeminiCookieStatus();
      setStatusData(res);
    } catch (err) {
      console.error('[GeminiCookieModal] Error fetching cookie status:', err);
      setStatusData({ status: 'error', message: err.response?.data?.detail || 'Không kiểm tra được trạng thái.' });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const raw = cookieInput.trim();
    if (!raw) {
      setFeedback({ type: 'error', text: 'Vui lòng dán chuỗi Cookie từ trình duyệt.' });
      return;
    }
    if (!raw.includes('__Secure-1PSID=')) {
      setFeedback({
        type: 'error',
        text: 'Chuỗi Cookie thiếu trường __Secure-1PSID. Vui lòng copy toàn bộ giá trị mục Cookie trong Request Headers.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await chatbotService.updateGeminiCookie(raw, saveToEnv);
      setFeedback({
        type: res.hot_reloaded ? 'success' : 'warning',
        text: res.message + (res.warning && !res.hot_reloaded ? ` (${res.warning})` : ''),
      });
      setCookieInput('');
      await fetchStatus();
      if (onUpdated) onUpdated(res);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Cập nhật Cookie thất bại.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chatbot-cookie-modal-backdrop" onClick={onClose}>
      <div className="chatbot-cookie-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chatbot-cookie-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <KeyRound size={18} />
            <span>Cập nhật Cookie Gemini Web</span>
          </div>
          <button type="button" className="claim-chat-header-btn" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="chatbot-cookie-modal-body">
          {/* Live Status Card */}
          <div
            className={`chatbot-cookie-status-box ${
              statusData?.status === 'online'
                ? 'is-online'
                : statusData?.status === 'cookie_expired'
                ? 'is-expired'
                : 'is-offline'
            }`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                {statusData?.status === 'online' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>
                  {loadingStatus
                    ? 'Đang kiểm tra...'
                    : statusData?.status === 'online'
                    ? 'Phiên Gemini đang hoạt động'
                    : statusData?.status === 'cookie_expired'
                    ? 'Cookie đã hết hạn / không hợp lệ'
                    : 'Dịch vụ Gemini Web Proxy chưa bật'}
                </span>
              </div>
              <button
                type="button"
                className="chatbot-cookie-refresh-btn"
                onClick={fetchStatus}
                disabled={loadingStatus}
              >
                <RefreshCw size={13} className={loadingStatus ? 'spin' : ''} /> Kiểm tra lại
              </button>
            </div>
            {statusData?.message && <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{statusData.message}</div>}
            {statusData?.updated_at && (
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                Cập nhật gần nhất: {new Date(statusData.updated_at).toLocaleString('vi-VN')}
              </div>
            )}
          </div>

          {/* 3-Step Guide */}
          <div className="chatbot-cookie-guide">
            <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Hướng dẫn lấy Cookie mới (3 bước):</span>
              <a
                href="https://gemini.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#7B5233', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                Mở gemini.google.com <ExternalLink size={12} />
              </a>
            </div>
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', lineHeight: 1.55 }}>
              <li>Mở <strong>gemini.google.com</strong> (đã đăng nhập) → nhấn <strong>F12</strong> → chọn tab <strong>Network</strong> → tải lại trang (<strong>F5</strong>) hoặc gửi 1 tin nhắn ngắn.</li>
              <li>Ô lọc (Filter) gõ <code>batchexecute?rpcids=otAQ7b</code> → bấm vào request <strong><code>batchexecute?rpcids=otAQ7b</code></strong> → tab <strong>Headers</strong> → tìm mục <strong>Request Headers → Cookie</strong>.</li>
              <li>Copy toàn bộ giá trị sau chữ <code>Cookie:</code> (có chứa <code>__Secure-1PSID=...</code>) và dán vào ô bên dưới rồi bấm <strong>Kiểm tra &amp; Cập nhật ngay</strong>.</li>
            </ol>
          </div>

          {/* Cookie Form */}
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#4E3629', marginBottom: '6px' }}>
              Chuỗi Cookie mới:
            </label>
            <textarea
              className="chatbot-cookie-textarea"
              rows={4}
              placeholder="Dán toàn bộ chuỗi Cookie tại đây (VD: __Secure-1PSID=...; __Secure-1PSIDTS=...)"
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', margin: '8px 0 12px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveToEnv}
                onChange={(e) => setSaveToEnv(e.target.checked)}
              />
              <span>Đồng thời lưu vào file <code>AI/gemini-web-to-api/.env</code> (giữ lại khi khởi động lại server)</span>
            </label>

            {feedback && (
              <div className={`chatbot-cookie-feedback is-${feedback.type}`}>
                {feedback.text}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="chatbot-btn-secondary" onClick={onClose}>
                Đóng
              </button>
              <button type="submit" className="chatbot-btn-primary" disabled={submitting}>
                {submitting ? 'Đang xác thực với Google...' : 'Kiểm tra & Cập nhật ngay'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GeminiCookieModal;

