import React, { useRef, useEffect, useState, useCallback } from 'react';
import api from '@webShared/Services/api.service';
import { generateFlowchartSvgHtml } from '../FlowchartTable';

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
  onSwitchToClassic,
  onOpenFlowchartModal
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

        if (formData.steps && formData.steps.length > 0 && typeof window.__insertFlowchartIntoCanvasEditor__ === 'function') {
          setTimeout(() => {
            window.__insertFlowchartIntoCanvasEditor__(formData.steps);
          }, 500);
        }

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

  // Chèn hoặc cập nhật Sơ đồ SVG chuẩn ISO vào Canvas Editor
  const insertFlowchartIntoCanvasEditor = useCallback((steps) => {
    if (!steps || steps.length === 0) return;
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin) return;

      const svgString = generateFlowchartSvgHtml(steps);
      if (!svgString) return;

      const total = steps.length;
      const rowH = total <= 4 ? 115 : (total === 5 ? 108 : (total === 6 ? 100 : (total === 7 ? 92 : (total === 8 ? 84 : 76))));
      const svgHeight = 36 + total * rowH + 15;
      const svgWidth = 620;

      const encodedSvg = encodeURIComponent(svgString);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

      const payload = {
        svgDataUrl,
        width: svgWidth,
        height: svgHeight,
        stepCount: total
      };

      if (typeof iframeWin.__insertFlowchartSvg__ === 'function') {
        iframeWin.__insertFlowchartSvg__(payload);
      } else {
        iframeWin.postMessage({ type: 'INSERT_FLOWCHART_SVG', payload }, '*');
      }

      if (showFeedback) {
        showFeedback('success', `Đã đồng bộ Sơ đồ lưu trình (${total} bước) vào Canvas Editor thành công!`);
      }
    } catch (err) {
      console.error('Lỗi khi chèn Sơ đồ SVG vào Canvas Editor:', err);
    }
  }, [showFeedback]);

  // Đăng ký các hàm toàn cục cho nút bên ngoài và iframe gọi
  useEffect(() => {
    window.__saveCanvasEditor__ = handleSaveDoc;
    window.__uploadAndMergeCanvasWord__ = handleUploadAndMergeWord;
    window.__insertFlowchartIntoCanvasEditor__ = insertFlowchartIntoCanvasEditor;
    window.__openIsoFlowchartModal = () => {
      if (typeof onOpenFlowchartModal === 'function') {
        onOpenFlowchartModal();
      }
    };

    const handleMessage = (event) => {
      if (event.data?.type === 'OPEN_ISO_FLOWCHART_DESIGNER') {
        if (typeof onOpenFlowchartModal === 'function') {
          onOpenFlowchartModal();
        }
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      delete window.__saveCanvasEditor__;
      delete window.__uploadAndMergeCanvasWord__;
      delete window.__insertFlowchartIntoCanvasEditor__;
      delete window.__openIsoFlowchartModal;
      window.removeEventListener('message', handleMessage);
    };
  }, [handleSaveDoc, handleUploadAndMergeWord, insertFlowchartIntoCanvasEditor, onOpenFlowchartModal]);

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

        // Đảm bảo style cho nút "Vẽ Sơ đồ" trong menu Ribbon luôn hoàn hảo và không bị bể CSS
        try {
          const iframeDoc = iframeRef.current?.contentDocument || iframeWin?.document;
          if (iframeDoc && !iframeDoc.getElementById('ce-flowchart-btn-fix')) {
            const styleEl = iframeDoc.createElement('style');
            styleEl.id = 'ce-flowchart-btn-fix';
            styleEl.innerHTML = `
              .menu-item .menu-item__flowchart,
              .menu-item > div.menu-item__flowchart {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                width: auto !important;
                min-width: unset !important;
                max-width: unset !important;
                height: 28px !important;
                padding: 0 10px !important;
                margin: 0 4px !important;
                background-color: #FAF4EF !important;
                border: 1.5px solid #7B5233 !important;
                border-radius: 5px !important;
                color: #7B5233 !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                line-height: 1 !important;
                cursor: pointer !important;
                box-shadow: 0 1px 3px rgba(123, 82, 51, 0.12) !important;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                flex-shrink: 0 !important;
                box-sizing: border-box !important;
                white-space: nowrap !important;
                overflow: visible !important;
              }
              .menu-item .menu-item__flowchart:hover,
              .menu-item > div.menu-item__flowchart:hover {
                background-color: #7B5233 !important;
                color: #FFFFFF !important;
                border-color: #7B5233 !important;
                box-shadow: 0 2px 6px rgba(123, 82, 51, 0.25) !important;
                transform: translateY(-0.5px);
              }
              .menu-item .menu-item__flowchart:active,
              .menu-item > div.menu-item__flowchart:active {
                transform: translateY(0);
              }
              .menu-item .menu-item__flowchart i,
              .menu-item > div.menu-item__flowchart i {
                display: inline-block !important;
                width: 15px !important;
                height: 15px !important;
                min-width: 15px !important;
                min-height: 15px !important;
                background-image: url("data:image/svg+xml,%3csvg%20width='16'%20height='16'%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3e%3cg%20fill='%237B5233'%3e%3crect%20x='5'%20y='1'%20width='6'%20height='3'%20rx='0.8'/%3e%3crect%20x='1'%20y='11'%20width='5'%20height='3.5'%20rx='0.8'/%3e%3cpolygon%20points='12,10%2015,12.5%2012,15%209,12.5'/%3e%3cpath%20d='M8%204v3.5h-4.5v3.5h1v-2.5h7v1.5h1V7.5H8V4z'/%3e%3c/g%3e%3c/svg%3e") !important;
                background-size: contain !important;
                background-repeat: no-repeat !important;
                background-position: center !important;
                flex-shrink: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                transition: filter 0.2s ease !important;
              }
              .menu-item .menu-item__flowchart:hover i,
              .menu-item > div.menu-item__flowchart:hover i {
                filter: brightness(0) invert(1) !important;
              }
              .menu-item .menu-item__flowchart span,
              .menu-item > div.menu-item__flowchart span,
              .menu-item .menu-item__flowchart .flowchart-btn-label,
              .menu-item > div.menu-item__flowchart .flowchart-btn-label {
                display: inline-block !important;
                width: auto !important;
                min-width: unset !important;
                max-width: unset !important;
                height: auto !important;
                min-height: unset !important;
                max-height: unset !important;
                border: none !important;
                background: transparent !important;
                color: inherit !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                line-height: normal !important;
                padding: 0 !important;
                margin: 0 !important;
                white-space: nowrap !important;
                user-select: none !important;
                text-decoration: none !important;
              }
            `;
            iframeDoc.head.appendChild(styleEl);
          }
        } catch (styleErr) {
          console.warn('Lỗi inject style cho flowchart button:', styleErr);
        }

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
            if (formData.steps && formData.steps.length > 0) {
              setTimeout(() => {
                insertFlowchartIntoCanvasEditor(formData.steps);
              }, 500);
            }
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
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '680px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
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

      <div style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', height: '100%' }}>
        <iframe
          ref={iframeRef}
          src="/canvas-editor/"
          title="Canvas Editor Full UI"
          onLoad={handleIframeLoaded}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '650px',
            border: 'none',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
};

export default CanvasISOEditor;
