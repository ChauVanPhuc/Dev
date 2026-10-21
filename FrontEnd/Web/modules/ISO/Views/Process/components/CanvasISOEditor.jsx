import React, { useRef, useEffect, useState, useCallback } from 'react';
import api from '@webShared/Services/api.service';

/**
 * CanvasISOEditor - Nhúng trực tiếp toàn bộ giao diện Canvas Editor từ C:\Tool\WS\canvas-editor
 * qua iframe chuẩn cùng domain (Vite proxy /canvas-editor/).
 * Đảm bảo 100% giống giao diện gốc của canvas-editor:
 * - Đầy đủ Ribbon Menu phía trên
 * - Khung Mục lục bên trái
 * - Khổ giấy A4 soạn thảo trực tiếp ở giữa
 * - Nút Chỉ dẫn bên phải
 * - Chân trang trạng thái (Số trang, số từ, thu phóng, chế độ)
 */
const CanvasISOEditor = ({
  formData = {},
  setFormData,
  handleSaveForm,
  showFeedback,
  onSwitchToClassic
}) => {
  const iframeRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Hàm lưu dữ liệu từ Canvas Editor vào CSDL và Server
  const handleSaveDoc = useCallback(async () => {
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
      if (!editor) return;

      // Trích xuất dữ liệu JSON snapshot
      const resVal = editor.command.getValue();
      const jsonDataStr = JSON.stringify(resVal.data);

      if (setFormData) {
        setFormData(prev => ({
          ...prev,
          sections: {
            ...(prev.sections || {}),
            '__canvas_editor_data__': jsonDataStr
          }
        }));
      }

      // Xuất file docx blob và upload lên server tự động ghép 2 trang đầu chuẩn
      if (typeof editor.command.executeExportDocx === 'function') {
        try {
          const blob = await editor.command.executeExportDocx();
          if (blob) {
            const fileName = `${formData.code || 'Quy_trinh'}.docx`;
            const uploadPayload = new FormData();
            uploadPayload.append('file', blob, fileName);
            if (formData.id) uploadPayload.append('record_id', formData.id);

            const params = {
              record_id: formData.id || undefined,
              doc_title: formData.name || formData.title,
              doc_code: formData.code || formData.new_code,
              issuer_name: formData.issuer || formData.editor || formData.owner,
              approver_name: formData.approver,
              dept_name: formData.folder || formData.department_name,
              version: formData.version || '01',
              issue_date: formData.issue_date,
              revision_logs: JSON.stringify(formData.revision_logs || [])
            };

            const res = await api.post('/iso-master-records/upload-and-merge-word', uploadPayload, {
              params,
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            const resData = res?.data || res;
            if (resData && resData.file_path && setFormData) {
              setFormData(prev => ({
                ...prev,
                file_path: resData.file_path,
                file_name: resData.file_name || fileName
              }));
            }
          }
        } catch (docxErr) {
          console.warn('Lỗi xuất docx blob:', docxErr);
        }
      }

      // Kích hoạt lưu CSDL form
      if (handleSaveForm) {
        await handleSaveForm({
          stayOnPage: true,
          skipModal: true,
          revisionNote: 'Cập nhật từ Canvas Editor',
          revisionPageNo: 'Toàn bộ'
        });
      }

      if (showFeedback) {
        showFeedback('success', 'Đã lưu tài liệu Canvas Editor thành công!');
      }
    } catch (err) {
      console.error('Lỗi khi lưu tài liệu Canvas Editor:', err);
    }
  }, [formData, handleSaveForm, setFormData, showFeedback]);

  // Hàm nạp an toàn ArrayBuffer vào Canvas Editor (xử lý Realm boundary giữa parent và iframe)
  const importBufferToCanvasEditor = useCallback(async (rawBuffer) => {
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
      if (!editor || !rawBuffer) return;

      // Trích xuất buffer gốc
      let buffer = rawBuffer instanceof ArrayBuffer ? rawBuffer : (rawBuffer.data instanceof ArrayBuffer ? rawBuffer.data : rawBuffer);
      if (!(buffer instanceof ArrayBuffer) && buffer?.buffer instanceof ArrayBuffer) {
        buffer = buffer.buffer;
      }

      if (!buffer || buffer.byteLength === 0) return;

      // Chuyển đổi sang ArrayBuffer thuộc Realm của iframe
      let targetBuffer = buffer;
      if (iframeWin && iframeWin.ArrayBuffer && !(buffer instanceof iframeWin.ArrayBuffer)) {
        try {
          const realmBuf = new iframeWin.ArrayBuffer(buffer.byteLength);
          new iframeWin.Uint8Array(realmBuf).set(new Uint8Array(buffer));
          targetBuffer = realmBuf;
        } catch (e) {
          console.warn('Realm copy fallback:', e);
        }
      }

      if (typeof editor.command?.executeImportDocx === 'function') {
        await editor.command.executeImportDocx({ arrayBuffer: targetBuffer });
      }
    } catch (importErr) {
      console.error('Lỗi khi nạp ArrayBuffer vào Canvas Editor:', importErr);
    }
  }, []);

  // 2. Hàm Tải file Word và Tự động ghép 2 trang đầu từ Mẩu quy trình.docx + phần từ Mục đích
  const handleUploadAndMergeWord = useCallback(async (file) => {
    if (!file) return;
    try {
      if (showFeedback) {
        showFeedback('info', 'Đang tải lên và ghép 2 trang đầu Mẫu quy trình chuẩn VINA G7...');
      }

      const uploadData = new FormData();
      uploadData.append('file', file);

      const params = {
        record_id: formData.id || undefined,
        doc_title: formData.name || formData.title,
        doc_code: formData.code || formData.new_code,
        issuer_name: formData.issuer || formData.editor || formData.owner,
        approver_name: formData.approver,
        dept_name: formData.folder || formData.department_name,
        version: formData.version || '01',
        issue_date: formData.issue_date,
        revision_logs: JSON.stringify(formData.revision_logs || [])
      };

      const res = await api.post('/iso-master-records/upload-and-merge-word', uploadData, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const resData = res?.data || res;
      if (resData && resData.success && resData.file_path) {
        if (setFormData) {
          setFormData(prev => ({
            ...prev,
            file_path: resData.file_path,
            file_name: resData.file_name || file.name
          }));
        }

        // Tải ngay nội dung file đã ghép về và nạp vào Canvas Editor
        const fileRes = await api.get('/iso-master-records/file-stream', {
          params: { path: resData.file_path },
          responseType: 'arraybuffer'
        });

        const buffer = fileRes?.data || fileRes;
        await importBufferToCanvasEditor(buffer);

        if (showFeedback) {
          showFeedback('success', 'Đã ghép 2 trang đầu Mẫu quy trình và nối nội dung từ Mục đích thành công!');
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải và ghép file Word:', err);
      if (showFeedback) {
        showFeedback('error', 'Lỗi khi tải và ghép file Word: ' + (err?.response?.data?.detail || err.message));
      }
    }
  }, [formData, setFormData, showFeedback, importBufferToCanvasEditor]);

  // Đăng ký các hàm toàn cục cho nút bên ngoài và iframe gọi
  useEffect(() => {
    window.__saveCanvasEditor__ = handleSaveDoc;
    window.__uploadAndMergeCanvasWord__ = handleUploadAndMergeWord;
    return () => {
      delete window.__saveCanvasEditor__;
      delete window.__uploadAndMergeCanvasWord__;
    };
  }, [handleSaveDoc, handleUploadAndMergeWord]);

  // Đồng bộ tiêu đề và thông tin bìa sang Canvas Editor
  const syncCoverMetadata = useCallback((metaData) => {
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin) return;
      const cleanTitle = (metaData.name || metaData.title || '').trim().toUpperCase();
      const meta = {
        title: cleanTitle || 'QUY TRÌNH',
        code: metaData.new_code || metaData.code || '',
        version: metaData.version || '01',
        issueDate: metaData.issue_date || '',
        deptName: metaData.folder || metaData.department_name || '',
        issuer: metaData.issuer || metaData.editor || metaData.owner || '',
        approver: metaData.approver || ''
      };

      if (typeof iframeWin.__updateCoverMetadata__ === 'function') {
        iframeWin.__updateCoverMetadata__(meta);
      } else {
        iframeWin.postMessage({ type: 'UPDATE_COVER_METADATA', payload: meta }, '*');
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ metadata bìa sang Canvas Editor:', e);
    }
  }, []);

  // Lắng nghe thay đổi form (Tên tài liệu, mã, người duyệt...) và cập nhật ngay vào Trang bìa
  useEffect(() => {
    window.__ISO_FORM_DATA__ = formData;
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      syncCoverMetadata(formData);
    }, 120);
    return () => clearTimeout(timer);
  }, [
    isLoaded,
    formData.name,
    formData.title,
    formData.code,
    formData.new_code,
    formData.version,
    formData.issue_date,
    formData.folder,
    formData.department_name,
    formData.issuer,
    formData.editor,
    formData.owner,
    formData.approver,
    syncCoverMetadata
  ]);

  // 3. Nạp dữ liệu khi iframe hoàn tất tải (với polling thử lại để đảm bảo editor instance đã sẵn sàng)
  const handleIframeLoaded = () => {
    let attempts = 0;
    const maxAttempts = 35;

    const setupEditor = () => {
      attempts++;
      try {
        const iframeWin = iframeRef.current?.contentWindow;
        const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
        if (!editor) {
          if (attempts < maxAttempts) {
            setTimeout(setupEditor, 150);
          } else {
            setIsLoading(false);
            setLoadError(true);
          }
          return;
        }

        setIsLoaded(true);
        setIsLoading(false);
        setLoadError(false);

        // Ưu tiên 1: Nạp snapshot JSON từ CSDL
        if (formData.sections && formData.sections.__canvas_editor_data__) {
          try {
            const rawData = formData.sections.__canvas_editor_data__;
            const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            if (parsed && (parsed.main || Array.isArray(parsed))) {
              editor.command.executeSetValue(parsed);
              setTimeout(() => syncCoverMetadata(formData), 250);
            }
          } catch (e) {
            console.warn('Lỗi đọc snapshot canvas-editor:', e);
          }
        } else if (formData.file_path) {
          // Ưu tiên 2: Nạp từ file Word (.docx) đã lưu trên server
          api.get('/iso-master-records/file-stream', {
            params: { path: formData.file_path },
            responseType: 'arraybuffer'
          }).then(async res => {
            const buffer = res?.data || res;
            await importBufferToCanvasEditor(buffer);
            setTimeout(() => syncCoverMetadata(formData), 300);
          }).catch(err => {
            console.warn('Không thể nạp file Word từ server:', err);
          });
        } else {
          // Ưu tiên 3 (TẠO MỚI QUY TRÌNH / CHƯA CÓ FILE): Luôn luôn nạp 2 trang mặc định từ Mẩu quy trình.docx
          api.get('/iso-master-records/default-template-docx', {
            params: {
              doc_title: formData.name || formData.title,
              doc_code: formData.code || formData.new_code,
              issuer_name: formData.issuer || formData.editor || formData.owner,
              approver_name: formData.approver,
              dept_name: formData.folder || formData.department_name,
              version: formData.version || '01',
              issue_date: formData.issue_date,
              revision_logs: JSON.stringify(formData.revision_logs || [])
            },
            responseType: 'arraybuffer'
          }).then(async res => {
            const buffer = res?.data || res;
            await importBufferToCanvasEditor(buffer);
            setTimeout(() => syncCoverMetadata(formData), 300);
          }).catch(err => {
            console.warn('Không thể nạp 2 trang template mặc định từ server:', err);
          });
        }

        // Lắng nghe phím tắt Ctrl+S bên trong Canvas Editor
        if (editor.listener) {
          editor.listener.saved = () => {
            handleSaveDoc();
          };
        }
      } catch (e) {
        if (attempts < maxAttempts) {
          setTimeout(setupEditor, 150);
        } else {
          setIsLoading(false);
          setLoadError(true);
        }
      }
    };

    setupEditor();
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '680px', position: 'relative', overflow: 'hidden' }}>
      {/* Cảnh báo lỗi kết nối */}
      {loadError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FEF2F2',
          borderBottom: '1px solid #FCA5A5',
          padding: '10px 16px',
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)'
        }}>
          <span style={{ fontSize: '0.88rem', color: '#991B1B', fontWeight: '500' }}>
            ⚠️ Chưa thể tải Trình soạn thảo Canvas Editor. Bạn có thể thử bấm "Thử tải lại".
          </span>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                setLoadError(false);
                setIsLoading(true);
                if (iframeRef.current) iframeRef.current.src = '/canvas-editor/?t=' + Date.now();
              }}
              style={{
                padding: '5px 12px',
                backgroundColor: '#DC2626',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 'bold'
              }}
            >
              🔄 Thử tải lại
            </button>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src="/canvas-editor/"
        title="Canvas Editor Full UI"
        onLoad={handleIframeLoaded}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '680px',
          border: 'none',
          display: 'block'
        }}
      />
    </div>
  );
};

export default CanvasISOEditor;
