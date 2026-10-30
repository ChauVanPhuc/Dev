import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Maximize2, Minimize2, RefreshCw, FileText, CheckCircle2, 
  AlertTriangle, ExternalLink, HelpCircle, Copy, Check 
} from 'lucide-react';
import api from '@webShared/Services/api.service';

/**
 * Modal soạn thảo trực tiếp trên file Word (.docx) bằng ONLYOFFICE Document Server.
 * Giữ nguyên 100% định dạng, khổ giấy ngang/dọc, bảng biểu, hình ảnh, lưu đồ.
 * Khi lưu: ONLYOFFICE gửi callback ghi đè trực tiếp lên file gốc trên máy chủ.
 */
const OnlyOfficeEditorModal = ({
  isOpen,
  onClose,
  filePath,
  documentTitle = 'Tài liệu Word',
  onSaved
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isNotConfigured, setIsNotConfigured] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editorStatus, setEditorStatus] = useState('Đang khởi tạo...');

  const editorInstanceRef = useRef(null);
  const containerId = useRef(`onlyoffice_container_${Math.random().toString(36).substr(2, 9)}`).current;

  // Lấy cấu hình và nạp DocsAPI
  useEffect(() => {
    if (!isOpen || !filePath) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);
    setIsNotConfigured(false);
    setEditorStatus('Đang kết nối ONLYOFFICE Document Server...');

    const initEditor = async () => {
      try {
        const res = await api.get('/iso-documents/onlyoffice/config', {
          params: { file_path: filePath, mode: 'edit' }
        });

        if (!isMounted) return;
        const { server_url, config } = res;

        if (!server_url) {
          setIsNotConfigured(true);
          setLoading(false);
          return;
        }

        // Tải file api.js từ ONLYOFFICE server nếu chưa có
        const scriptId = 'onlyoffice_api_script';
        const loadScript = () => new Promise((resolve, reject) => {
          if (window.DocsAPI) {
            resolve();
            return;
          }
          let script = document.getElementById(scriptId);
          if (script) {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Không thể tải script ONLYOFFICE API'));
            return;
          }
          script = document.createElement('script');
          script.id = scriptId;
          script.src = `${server_url}/web-apps/apps/api/documents/api.js`;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Không thể kết nối đến ONLYOFFICE tại: ${server_url}`));
          document.head.appendChild(script);
        });

        await loadScript();

        if (!isMounted) return;

        // Khởi tạo DocsAPI.DocEditor
        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error('Không tìm thấy khung chứa editor');
        }

        // Hủy editor cũ nếu có
        if (editorInstanceRef.current && editorInstanceRef.current.destroyEditor) {
          try { editorInstanceRef.current.destroyEditor(); } catch (_) {}
        }

        const editorConfig = {
          ...config,
          width: '100%',
          height: '100%',
          events: {
            onAppReady: () => {
              if (isMounted) {
                setLoading(false);
                setEditorStatus('Sẵn sàng soạn thảo');
              }
            },
            onDocumentStateChange: (event) => {
              if (isMounted) {
                setEditorStatus(event.data ? 'Có thay đổi chưa lưu...' : 'Đã tự động lưu vào file gốc');
                if (!event.data && onSaved) onSaved();
              }
            },
            onError: (event) => {
              console.error('[ONLYOFFICE] Error:', event);
              if (isMounted) setErrorMsg(`Lỗi ONLYOFFICE: ${event.data || 'Không rõ nguyên nhân'}`);
            }
          }
        };

        editorInstanceRef.current = new window.DocsAPI.DocEditor(containerId, editorConfig);
      } catch (err) {
        console.error('[ONLYOFFICE] Init failed:', err);
        if (!isMounted) return;
        const msg = err.response?.data?.detail || err.message || 'Không thể mở trình soạn thảo ONLYOFFICE';
        if (err.response?.status === 503 || msg.includes('chưa cấu hình')) {
          setIsNotConfigured(true);
        } else {
          setErrorMsg(msg);
        }
        setLoading(false);
      }
    };

    initEditor();

    return () => {
      isMounted = false;
      if (editorInstanceRef.current && editorInstanceRef.current.destroyEditor) {
        try { editorInstanceRef.current.destroyEditor(); } catch (_) {}
        editorInstanceRef.current = null;
      }
    };
  }, [isOpen, filePath]);

  if (!isOpen) return null;

  const copyDockerCmd = () => {
    const cmd = 'docker run -i -t -d -p 8080:80 --restart=always -e JWT_ENABLED=false onlyoffice/documentserver';
    navigator.clipboard?.writeText(cmd);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(20, 15, 10, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: isFullscreen ? '100vw' : '95vw',
          height: isFullscreen ? '100vh' : '92vh',
          background: '#FFFFFF',
          borderRadius: isFullscreen ? '0' : '10px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          position: 'relative'
        }}
      >
        {/* Header Thanh điều khiển */}
        <div
          style={{
            height: '48px',
            background: '#FAF7F2',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <FileText size={18} color="#7B5233" />
            <strong style={{ fontSize: '0.9rem', color: '#7B5233', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {documentTitle}
            </strong>
            <span style={{ fontSize: '0.72rem', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
              Word Editor Trực Tiếp (100% Chuẩn Gốc)
            </span>
            <span style={{ fontSize: '0.74rem', color: '#8A6A4F', marginLeft: '6px' }}>
              • {editorStatus}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => setIsFullscreen(prev => !prev)}
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
              style={{ padding: '6px 10px', borderRadius: '4px' }}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={onClose}
              title="Đóng cửa sổ soạn thảo"
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                background: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FCA5A5',
                fontWeight: '600'
              }}
            >
              <X size={15} style={{ marginRight: '4px' }} />
              Đóng & Hoàn tất
            </button>
          </div>
        </div>

        {/* Thân Editor */}
        <div style={{ flex: 1, position: 'relative', width: '100%', height: 'calc(100% - 48px)', background: '#F3F4F6' }}>
          {/* Vùng gắn ONLYOFFICE iframe */}
          <div id={containerId} style={{ width: '100%', height: '100%' }} />

          {/* Loading Overlay */}
          {loading && !isNotConfigured && !errorMsg && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#FAF7F2',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                zIndex: 10
              }}
            >
              <RefreshCw size={36} color="#7B5233" style={{ animation: 'spin 1.2s linear infinite' }} />
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#7B5233' }}>
                Đang nạp bộ máy soạn thảo Word ONLYOFFICE...
              </div>
              <div style={{ fontSize: '0.82rem', color: '#8A6A4F' }}>
                Giữ nguyên 100% định dạng, khổ giấy, hình vẽ và lưu đồ gốc
              </div>
            </div>
          )}

          {/* Báo lỗi kết nối */}
          {errorMsg && !isNotConfigured && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#FAF7F2',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px',
                zIndex: 10
              }}
            >
              <AlertTriangle size={48} color="#DC2626" style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#DC2626' }}>Không thể khởi động ONLYOFFICE</h3>
              <p style={{ maxWidth: '600px', textAlign: 'center', color: '#4B5563', fontSize: '0.9rem', marginBottom: '16px' }}>
                {errorMsg}
              </p>
              <button
                type="button"
                className="iso-ribbon-btn"
                onClick={() => window.location.reload()}
                style={{ padding: '8px 18px', background: '#7B5233', color: '#FFF', borderRadius: '6px' }}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Hướng dẫn khi chưa cấu hình ONLYOFFICE */}
          {isNotConfigured && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#FAF7F2',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                zIndex: 10,
                overflowY: 'auto'
              }}
            >
              <div
                style={{
                  maxWidth: '720px',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '28px 32px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  border: '1px solid #EADCC9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <HelpCircle size={28} color="#7B5233" />
                  <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.25rem' }}>
                    Cần kết nối ONLYOFFICE Document Server để sửa Word 100% gốc
                  </h3>
                </div>

                <p style={{ fontSize: '0.88rem', color: '#4B5563', lineHeight: 1.6, marginBottom: '18px' }}>
                  Để có thể sửa <strong>trực tiếp trên file Word</strong> (giữ nguyên từng li từng tí trang ngang/dọc, bảng biểu phức tạp, text box và lưu đồ gốc), SmartFlow kết nối với <strong>ONLYOFFICE Document Server</strong> (miễn phí, mã nguồn mở).
                </p>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}>
                  <div style={{ fontWeight: '600', color: '#1E293B', marginBottom: '8px', fontSize: '0.85rem' }}>
                    🚀 Cách 1: Chạy bằng Docker (Khuyên dùng - 1 lệnh duy nhất):
                  </div>
                  <div style={{ position: 'relative', background: '#0F172A', color: '#38BDF8', padding: '12px 40px 12px 14px', borderRadius: '6px', fontFamily: 'Consolas, monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                    <code>docker run -i -t -d -p 8080:80 --restart=always -e JWT_ENABLED=false onlyoffice/documentserver</code>
                    <button
                      type="button"
                      onClick={copyDockerCmd}
                      title="Sao chép lệnh"
                      style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                    >
                      {copiedCode ? <Check size={16} color="#4ADE80" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: '600', color: '#1E293B', marginBottom: '8px', fontSize: '0.85rem' }}>
                    ⚙️ Cấu hình vào file <code>BackEnd/.env</code>:
                  </div>
                  <div style={{ background: '#0F172A', color: '#E2E8F0', padding: '12px 14px', borderRadius: '6px', fontFamily: 'Consolas, monospace', fontSize: '0.8rem' }}>
                    <div>ONLYOFFICE_URL=http://localhost:8080</div>
                    <div>ONLYOFFICE_JWT_SECRET=</div>
                    <div>ONLYOFFICE_BACKEND_URL=http://localhost:8000</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    className="iso-ribbon-btn"
                    onClick={onClose}
                    style={{ padding: '8px 18px', background: '#E2E8F0', color: '#334155', borderRadius: '6px', fontWeight: '500' }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OnlyOfficeEditorModal;
