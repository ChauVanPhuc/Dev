import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Columns, X, ZoomIn, ZoomOut, Save, RefreshCw, FileText } from 'lucide-react';
import api from '@webShared/Services/api.service';
import useUiStore from '@shared/store/uiStore';
import { generateFlowchartSvgHtml } from '../FlowchartTable';
import { buildFormsTableFromSteps } from './canvasIsoTemplate';
import logoCty from '../utils/logoCty';

const MM_TO_PX = 96 / 25.4;

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
  applyIsoTemplate = true,
  faithfulPages = [],
  onSwitchToClassic,
  onOpenFlowchartModal
}) => {
  const { theme } = useUiStore();
  const iframeRef = useRef(null);
  const pendingBufferRef = useRef(null);
  const hasImportedWordDocRef = useRef(false);
  const loadedKeyRef = useRef(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const fillRevisionRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Trạng thái cho tính năng So sánh song song với Bản gốc
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [originalPages, setOriginalPages] = useState(faithfulPages || []);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [originalZoom, setOriginalZoom] = useState('fit');
  const [editorZoom, setEditorZoom] = useState(80);

  const handleOriginalZoomChange = useCallback((delta) => {
    setOriginalZoom(prev => {
      const base = typeof prev === 'number' ? prev : 80;
      return Math.max(30, Math.min(200, base + delta));
    });
  }, []);

  const applyEditorScale = useCallback((scalePercent) => {
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
      if (editor?.command?.executePageScale) {
        editor.command.executePageScale(scalePercent / 100);
      }
    } catch (e) {
      console.warn('Lỗi điều chỉnh scale editor:', e);
    }
  }, []);

  const handleEditorZoomChange = useCallback((delta) => {
    setEditorZoom(prev => {
      const next = Math.max(50, Math.min(150, prev + delta));
      applyEditorScale(next);
      return next;
    });
  }, [applyEditorScale]);

  const handleEditorZoomSet = useCallback((val) => {
    setEditorZoom(val);
    applyEditorScale(val);
  }, [applyEditorScale]);

  useEffect(() => {
    if (faithfulPages && faithfulPages.length > 0) {
      setOriginalPages(faithfulPages);
    }
  }, [faithfulPages]);

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
          const blob = await editor.command.executeExportDocx({
            fileName: formData.code || 'Quy_trinh',
            skipDownload: true
          });
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
              approver_name: (formData.document_level === 'Cấp công ty' || formData.approver_bgd) ? (formData.approver_bgd || formData.approver) : formData.approver,
              approver_bgd: formData.approver_bgd || '',
              document_level: formData.document_level || 'Cấp phòng',
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
          skipModal: true
        });
      }

      if (showFeedback) {
        showFeedback('success', 'Đã lưu tài liệu Canvas Editor thành công!');
      }
    } catch (err) {
      console.error('Lỗi khi lưu tài liệu Canvas Editor:', err);
    }
  }, [formData, handleSaveForm, setFormData, showFeedback]);

  // Hàm nạp an toàn ArrayBuffer/File/Blob vào Canvas Editor (xử lý Realm boundary giữa parent và iframe)
  const importBufferToCanvasEditor = useCallback(async (rawBuffer) => {
    try {
      if (!rawBuffer) return;
      pendingBufferRef.current = rawBuffer;
      hasImportedWordDocRef.current = true;

      const tryImport = async (retries = 35) => {
        const iframeWin = iframeRef.current?.contentWindow;
        const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
        if (!editor || typeof editor.command?.executeImportDocx !== 'function') {
          if (retries > 0) {
            setTimeout(() => tryImport(retries - 1), 150);
          }
          return;
        }

        pendingBufferRef.current = null;
        let buffer = rawBuffer;
        if (rawBuffer instanceof Blob || (typeof rawBuffer?.arrayBuffer === 'function' && !(rawBuffer instanceof ArrayBuffer))) {
          buffer = await rawBuffer.arrayBuffer();
        } else if (rawBuffer?.data instanceof ArrayBuffer) {
          buffer = rawBuffer.data;
        } else if (!(rawBuffer instanceof ArrayBuffer) && rawBuffer?.buffer instanceof ArrayBuffer) {
          buffer = rawBuffer.buffer;
        }

        if (!buffer || buffer.byteLength === 0) return;

        // KIỂM TRA ĐỊNH DẠNG: DOCX (ZIP archive bắt đầu bằng magic bytes PK: 0x50, 0x4B)
        const checkBytes = new Uint8Array(buffer.slice(0, 4));
        let isZip = checkBytes.length >= 2 && checkBytes[0] === 0x50 && checkBytes[1] === 0x4B;
        if (!isZip) {
          // File .doc (hoặc chưa chuẩn hóa) -> gửi lên server chuyển đổi tự động sang .docx
          try {
            const formDataDoc = new FormData();
            formDataDoc.append('file', new Blob([buffer], { type: 'application/msword' }), 'document.doc');
            const prepRes = await fetch('/api/v1/iso-master-records/preprocess-word-for-canvas', {
              method: 'POST',
              body: formDataDoc
            });
            if (prepRes.ok) {
              const convertedBuf = await prepRes.arrayBuffer();
              const convertedBytes = new Uint8Array(convertedBuf.slice(0, 4));
              if (convertedBytes.length >= 2 && convertedBytes[0] === 0x50 && convertedBytes[1] === 0x4B) {
                buffer = convertedBuf;
                isZip = true;
              }
            }
          } catch (convErr) {
            console.warn('Lỗi auto convert .doc sang .docx:', convErr);
          }
        }
        if (!isZip) {
          console.warn('Buffer nạp vào không phải file .docx (không có chữ ký ZIP PK), bỏ qua nạp docx vào Canvas Editor.');
          return;
        }

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

        await editor.command.executeImportDocx({ arrayBuffer: targetBuffer });
        setTimeout(() => {
          try {
            if (typeof iframeWin?.__formatCoverLogo__ === 'function') {
              iframeWin.__formatCoverLogo__();
            } else if (typeof iframeWin?.__formatCoverTable === 'function') {
              iframeWin.__formatCoverTable();
            }
          } catch (_) {}
          try {
            const autoBtn = iframeWin?.document?.querySelector('.catalog__header__auto');
            autoBtn?.click();
          } catch (_) {}
          if (typeof iframeWin?.updateCatalog === 'function') {
            iframeWin.updateCatalog();
          }
          if (typeof fillRevisionRef.current === 'function') {
            fillRevisionRef.current(formDataRef.current?.revision_logs || []);
          }
          setIsContentReady(true);
        }, 500);
      };

      await tryImport();
    } catch (importErr) {
      console.error('Lỗi khi nạp ArrayBuffer vào Canvas Editor:', importErr);
    }
  }, []);

  // 2. Hàm Tải file Word và Tự động ghép 2 trang đầu từ Mẩu quy trình.docx + phần từ Mục đích
  const handleUploadAndMergeWord = useCallback(async (file) => {
    if (!file) return;
    if (typeof window.__smartWordUpload__ === 'function') {
      await window.__smartWordUpload__(file);
      return;
    }
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
        approver_name: (formData.document_level === 'Cấp công ty' || formData.approver_bgd) ? (formData.approver_bgd || formData.approver) : formData.approver,
        approver_bgd: formData.approver_bgd || '',
        document_level: formData.document_level || 'Cấp phòng',
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
        const docSteps = (resData.steps && resData.steps.length > 0) ? resData.steps : [];
        if (setFormData) {
          setFormData(prev => ({
            ...prev,
            file_path: resData.file_path,
            file_name: resData.file_name || file.name,
            steps: docSteps.length > 0 ? docSteps : prev.steps,
            has_flowchart: docSteps.length > 0 ? true : prev.has_flowchart
          }));
        }

        // Tải ngay nội dung file đã ghép về và nạp vào Canvas Editor
        const fileRes = await api.get('/iso-master-records/file-stream', {
          params: { path: resData.file_path },
          responseType: 'arraybuffer'
        });

        const buffer = fileRes?.data || fileRes;
        await importBufferToCanvasEditor(buffer);

        const stepsToSync = docSteps.length > 0 ? docSteps : formData.steps;
        if (stepsToSync && stepsToSync.length > 0 && typeof window.__insertFlowchartIntoCanvasEditor__ === 'function') {
          setTimeout(() => {
            window.__insertFlowchartIntoCanvasEditor__(stepsToSync);
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
  // Đồng bộ bảng 4 cột Mục 6 (biểu mẫu) ăn theo các bước quy trình vào Canvas Editor
  const syncSection6TableIntoCanvas = useCallback((steps) => {
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
      if (!editor) return;

      const curVal = editor.command?.getValue ? editor.command.getValue() : null;
      const docData = curVal?.data;
      if (!docData || !Array.isArray(docData.main)) return;

      const main = docData.main;
      let sec6Idx = -1;
      for (let i = 0; i < main.length; i++) {
        const el = main[i];
        let txt = '';
        if (el.value) txt += String(el.value);
        if (el.valueList) txt += el.valueList.map(x => x.value || '').join('');
        if (/6\.\s*(?:danh\s*mục\s*)?biểu\s*mẫu/i.test(txt)) {
          sec6Idx = i;
          break;
        }
      }

      if (sec6Idx !== -1) {
        if (main[sec6Idx].valueList) {
          main[sec6Idx].valueList = [{ value: '6. Danh mục biểu mẫu và hồ sơ lưu trữ', bold: true, size: 13, font: 'Times New Roman' }];
        } else {
          main[sec6Idx].value = '6. Danh mục biểu mẫu và hồ sơ lưu trữ';
          main[sec6Idx].bold = true;
          main[sec6Idx].size = 13;
          main[sec6Idx].font = 'Times New Roman';
        }

        let endIdx = main.length;
        for (let j = sec6Idx + 1; j < main.length; j++) {
          const el = main[j];
          let txt = '';
          if (el.value) txt += String(el.value);
          if (el.valueList) txt += el.valueList.map(x => x.value || '').join('');
          if (/^(?:7\.|8\.|phụ\s*lục)/i.test(txt.trim())) {
            endIdx = j;
            break;
          }
        }

        const baseCode = formData.new_code || formData.code || 'G7.ISO.QT01';
        const tblEl = buildFormsTableFromSteps(steps, formData.related_templates || [], baseCode);
        const newElements = [
          { value: '\n' },
          tblEl,
          { value: '\n\n' }
        ];
        main.splice(sec6Idx + 1, endIdx - (sec6Idx + 1), ...newElements);
        editor.command.executeSetValue(docData);
      }
    } catch (e) {
      console.warn('Lỗi khi cập nhật Mục 6 trong Canvas Editor:', e);
    }
  }, [formData.new_code, formData.code, formData.related_templates]);

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

      // Cập nhật đồng bộ Mục 6: Danh mục biểu mẫu vào Canvas Editor
      syncSection6TableIntoCanvas(steps);

      if (showFeedback) {
        showFeedback('success', `Đã đồng bộ Sơ đồ lưu trình (${total} bước) và Danh mục biểu mẫu vào Canvas Editor thành công!`);
      }
    } catch (err) {
      console.error('Lỗi khi chèn Sơ đồ SVG vào Canvas Editor:', err);
    }
  }, [showFeedback, syncSection6TableIntoCanvas]);

  // Đăng ký các hàm toàn cục cho nút bên ngoài và iframe gọi
  useEffect(() => {
    window.__saveCanvasEditor__ = handleSaveDoc;
    window.__uploadAndMergeCanvasWord__ = handleUploadAndMergeWord;
    window.__importBufferToCanvasEditor__ = importBufferToCanvasEditor;
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
      delete window.__importBufferToCanvasEditor__;
      delete window.__insertFlowchartIntoCanvasEditor__;
      delete window.__openIsoFlowchartModal;
      window.removeEventListener('message', handleMessage);
    };
  }, [handleSaveDoc, handleUploadAndMergeWord, importBufferToCanvasEditor, insertFlowchartIntoCanvasEditor, onOpenFlowchartModal]);

  // Luôn luôn đảm bảo Logo trang bìa ở giữa khung 100% (cả ngang và dọc)
  const ensureCoverLogoCentered = useCallback((metaData = {}) => {
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin) return;
      if (typeof iframeWin.__formatCoverLogo__ === 'function') {
        iframeWin.__formatCoverLogo__(metaData || {});
      } else if (typeof iframeWin.__formatCoverTable === 'function') {
        iframeWin.__formatCoverTable(metaData || {});
      } else if (typeof iframeWin.__updateCoverMetadata__ === 'function') {
        iframeWin.__updateCoverMetadata__(metaData || {});
      }
    } catch (e) {
      console.warn('Lỗi ensureCoverLogoCentered:', e);
    }
  }, []);

  // Đồng bộ tiêu đề và thông tin bìa sang Canvas Editor (chỉ khi BẬT Áp mẫu ISO)
  const syncCoverMetadata = useCallback((metaData = {}) => {
    ensureCoverLogoCentered(metaData || {});
    if (!applyIsoTemplate) return;
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin) return;
      const cleanTitle = (metaData.name || metaData.title || '').trim().toUpperCase();
      const isCompanyLvl = (metaData.document_level || 'Cấp phòng') === 'Cấp công ty' || Boolean(metaData.approver_bgd);
      const effApprover = isCompanyLvl ? (metaData.approver_bgd || metaData.approver || '') : (metaData.approver || '');
      const validLogs = (metaData.revision_logs || []).filter(l => l && (l.content || l.rev_date || l.seq_no));
      const seqNums = validLogs.map(l => Number(l.seq_no)).filter(n => !isNaN(n) && n > 0);
      const maxSeq = seqNums.length > 0 ? Math.max(...seqNums) : validLogs.length;
      const effVer = maxSeq > 0 ? String(maxSeq).padStart(2, '0') : ((metaData.version || '01').trim() || '01');
      let effDate = metaData.issue_date || '';
      if (validLogs.length > 0) {
        const lastWithDate = [...validLogs].reverse().find(l => l.rev_date);
        if (lastWithDate?.rev_date) {
          effDate = lastWithDate.rev_date;
        }
      }
      const meta = {
        title: cleanTitle || 'QUY TRÌNH',
        code: metaData.new_code || metaData.code || '',
        version: effVer,
        issueDate: effDate,
        deptName: metaData.folder || metaData.department_name || '',
        issuer: metaData.issuer || metaData.editor || metaData.owner || '',
        approver: effApprover,
        approver_bgd: metaData.approver_bgd || '',
        document_level: metaData.document_level || 'Cấp phòng'
      };

      if (typeof iframeWin.__updateCoverMetadata__ === 'function') {
        iframeWin.__updateCoverMetadata__(meta);
      } else {
        iframeWin.postMessage({ type: 'UPDATE_COVER_METADATA', payload: meta }, '*');
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ metadata bìa sang Canvas Editor:', e);
    }
  }, [applyIsoTemplate, ensureCoverLogoCentered]);

  // Điền nhật ký sửa đổi (revision_logs từ CSDL) vào bảng "THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU" trong Canvas Editor
  const fillRevisionTable = useCallback((logs) => {
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
      if (!editor) return;

      const data = editor.command.getValue()?.data;
      const main = data?.main || [];
      const cellText = (td) => (td?.value || [])
        .map(v => (typeof v.value === 'string' ? v.value : ''))
        .join('')
        .replace(/[\u200B\n]/g, '')
        .trim();
      const tableText = (t) => (t.trList || [])
        .map(tr => (tr.tdList || []).map(cellText).join(' '))
        .join(' ')
        .toUpperCase();

      const tables = main.filter(el => el.type === 'table' && el.trList);
      if (tables.length === 0) return;

      const revTable = tables.find(el => {
        const txt = tableText(el);
        return /SỐ TT|SỐ THỨ TỰ|NGÀY SỬA|NỘI DUNG SỬA ĐỔI|NỘI DUNG/.test(txt);
      }) || (tables.length >= 2 ? tables[1] : tables[0]);

      if (!revTable || !revTable.trList || revTable.trList.length < 2) return;

      const formatDate = (d) => {
        const s = String(d || '').trim();
        return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10).split('-').reverse().join('/') : s;
      };
      const validLogs = Array.isArray(logs) ? logs.filter(l => l && (l.content || l.rev_date || l.seq_no)) : [];
      const sortedLogs = [...validLogs].sort((a, b) => (a.seq_no || 0) - (b.seq_no || 0));
      if (sortedLogs.length === 0) {
        sortedLogs.push({
          seq_no: 1,
          rev_date: formDataRef.current?.issue_date || '',
          content: 'Ban hành lần đầu',
          page_no: 'Toàn bộ'
        });
      }

      let changed = false;

      // Luôn đảm bảo bảng Theo dõi sửa đổi có tối thiểu 15 dòng (1 tiêu đề + 14 dòng dữ liệu)
      const targetRows = Math.min(16, Math.max(15, sortedLogs.length + 1));
      while (revTable.trList.length < targetRows) {
        const cloneRow = JSON.parse(JSON.stringify(revTable.trList[revTable.trList.length - 1]));
        delete cloneRow.id;
        cloneRow.height = 34;
        cloneRow.minHeight = 34;
        (cloneRow.tdList || []).forEach(td => {
          delete td.id;
          td.value = [{ value: '\u200B', size: 12, font: 'Times New Roman' }];
        });
        revTable.trList.push(cloneRow);
        changed = true;
      }

      // Giới hạn tối đa 16 hàng để không bao giờ tràn sang Trang 3
      while (revTable.trList.length > 16) {
        revTable.trList.pop();
        changed = true;
      }

      for (let i = 1; i < revTable.trList.length; i++) {
        const log = sortedLogs[i - 1];
        const rawPage = String(log?.page_no || '').trim();
        const effPage = (!rawPage || rawPage.toLowerCase() === 'tất cả') ? 'Toàn bộ' : rawPage;
        const values = log
          ? [String(i), formatDate(log.rev_date), log.content || '', effPage]
          : ['', '', '', ''];
        const tds = revTable.trList[i].tdList || [];
        values.forEach((txt, colIdx) => {
          const td = tds[colIdx];
          if (!td) return;
          const currentTxt = cellText(td);
          if (currentTxt === txt) return;
          td.value = [{
            value: txt || '\u200B',
            size: 12,
            font: 'Times New Roman',
            rowFlex: colIdx === 2 ? 'left' : 'center'
          }];
          changed = true;
        });
      }

      if (changed) {
        editor.command.executeSetValue(data);
      }
    } catch (err) {
      console.error('Lỗi điền bảng Theo dõi sửa đổi vào Canvas Editor:', err);
    }
  }, []);
  fillRevisionRef.current = fillRevisionTable;

  // Nạp nội dung tài liệu (snapshot JSON -> file Word -> mẫu mặc định) theo dữ liệu CSDL mới nhất
  const loadDocumentContent = useCallback(async (customFormData) => {
    const fd = customFormData || formDataRef.current || {};
    const iframeWin = iframeRef.current?.contentWindow;
    const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
    if (!editor) return;

    const finishLoad = (delay) => {
      setTimeout(() => {
        const latest = customFormData || formDataRef.current || {};
        syncCoverMetadata(latest);
        fillRevisionTable(latest.revision_logs || []);
        setIsContentReady(true);
      }, delay);
    };

    try {
      // Ưu tiên 1: Snapshot JSON đã lưu trong CSDL
      const rawSnapshot = fd.sections?.__canvas_editor_data__;
      if (rawSnapshot) {
        const parsed = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
        if (parsed && (parsed.main || Array.isArray(parsed))) {
          editor.command.executeSetValue(parsed);
          hasImportedWordDocRef.current = true;
          finishLoad(300);
          return;
        }
      }
    } catch (snapErr) {
      console.error('Lỗi đọc snapshot canvas-editor, chuyển sang nạp file Word:', snapErr);
    }

    const filePath = (fd.file_path || '').toLowerCase();
    if (filePath.endsWith('.docx') || filePath.endsWith('.doc')) {
      // Ưu tiên 2: File Word đã lưu trên server
      try {
        const res = await api.get('/iso-master-records/file-stream', {
          params: { path: fd.file_path, _t: Date.now() },
          responseType: 'arraybuffer'
        });
        await importBufferToCanvasEditor(res?.data || res);
        finishLoad(900);
        if (fd.steps && fd.steps.length > 0) {
          setTimeout(() => insertFlowchartIntoCanvasEditor(fd.steps), 1200);
        }
        return;
      } catch (fileErr) {
        console.error('Không thể nạp file Word từ server, dùng mẫu mặc định:', fileErr);
        if (showFeedback) showFeedback('error', 'Không tải được file Word đã lưu, đang hiển thị mẫu mặc định.');
      }
    }

    // Ưu tiên 3: Mẫu 2 trang mặc định
    try {
      const res = await api.get('/iso-master-records/default-template-docx', {
        params: {
          doc_title: fd.name || fd.title,
          doc_code: fd.code || fd.new_code,
          issuer_name: fd.issuer || fd.editor || fd.owner,
          approver_name: (fd.document_level === 'Cấp công ty' || fd.approver_bgd) ? (fd.approver_bgd || fd.approver) : fd.approver,
          approver_bgd: fd.approver_bgd || '',
          document_level: fd.document_level || 'Cấp phòng',
          dept_name: fd.folder || fd.department_name,
          version: fd.version || '01',
          issue_date: fd.issue_date,
          revision_logs: JSON.stringify(fd.revision_logs || []),
          _t: Date.now()
        },
        responseType: 'arraybuffer'
      });
      await importBufferToCanvasEditor(res?.data || res);
      finishLoad(900);
    } catch (tplErr) {
      console.error('Không thể nạp 2 trang template mặc định từ server:', tplErr);
      setIsContentReady(true);
    }
  }, [importBufferToCanvasEditor, insertFlowchartIntoCanvasEditor, syncCoverMetadata, fillRevisionTable, showFeedback]);

  // Chỉ nạp nội dung khi iframe đã sẵn sàng VÀ dữ liệu CSDL đã về (tránh nạp mẫu trống khi vào lại trang sửa)
  useEffect(() => {
    if (!isLoaded) return;
    const isEditRoute = /\/edit\/(?!new(?:\/|$))[^/]+/.test(window.location.pathname);
    if (isEditRoute && !formData.id) return;
    const key = formData.id ? `id_${formData.id}` : 'new';
    
    // Nếu key không đổi thì không cần nạp lại
    if (loadedKeyRef.current === key) return;

    // Nếu đây là lần nạp đầu tiên (loadedKeyRef.current === null)
    // VÀ đã có sẵn buffer do người dùng vừa upload trước khi iframe load:
    if (!loadedKeyRef.current && (hasImportedWordDocRef.current || pendingBufferRef.current)) {
      loadedKeyRef.current = key;
      return;
    }

    // Khi chuyển sang tài liệu khác (key khác):
    // Bắt buộc reset cờ import và nạp lại nội dung tài liệu mới vào Canvas Editor!
    hasImportedWordDocRef.current = false;
    pendingBufferRef.current = null;
    setIsContentReady(false);
    loadedKeyRef.current = key;
    loadDocumentContent(formData);
  }, [isLoaded, formData.id, loadDocumentContent, formData]);

  // Khi lịch sử sửa đổi thay đổi (sau khi lưu) -> cập nhật lại bảng trong Canvas Editor
  const revisionLogsKey = JSON.stringify(formData.revision_logs || []);
  useEffect(() => {
    if (!isLoaded || !isContentReady) return;
    const timer = setTimeout(() => fillRevisionTable(formDataRef.current?.revision_logs || []), 200);
    return () => clearTimeout(timer);
  }, [isLoaded, isContentReady, revisionLogsKey, fillRevisionTable]);

  // Lắng nghe thay đổi form (Tên tài liệu, mã, người duyệt...) và cập nhật ngay vào Trang bìa
  useEffect(() => {
    window.__ISO_LOGO__ = logoCty;
    const validLogs = (formData?.revision_logs || []).filter(l => l && (l.content || l.rev_date || l.seq_no));
    const seqNums = validLogs.map(l => Number(l.seq_no)).filter(n => !isNaN(n) && n > 0);
    const maxSeq = seqNums.length > 0 ? Math.max(...seqNums) : validLogs.length;
    const effVer = maxSeq > 0 ? String(maxSeq).padStart(2, '0') : ((formData?.version || '01').trim() || '01');

    window.__ISO_FORM_DATA__ = {
      ...formData,
      version: effVer,
      effective_version: effVer,
      apply_iso_template: applyIsoTemplate
    };
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      ensureCoverLogoCentered(formData || {});
      if (applyIsoTemplate) {
        syncCoverMetadata(formData || {});
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [
    isLoaded,
    applyIsoTemplate,
    formData,
    ensureCoverLogoCentered,
    syncCoverMetadata
  ]);

  // 2b. Đồng bộ giao diện Dark Obsidian vào Canvas Editor trong iframe
  const syncCanvasTheme = useCallback((currentTheme) => {
    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (!iframeDoc || !iframeDoc.head) return;

      let styleEl = iframeDoc.getElementById('smartflow-canvas-dark-theme-style');
      if (currentTheme === 'dark') {
        if (!styleEl) {
          styleEl = iframeDoc.createElement('style');
          styleEl.id = 'smartflow-canvas-dark-theme-style';
          iframeDoc.head.appendChild(styleEl);
        }
        styleEl.textContent = `
          body {
            background-color: #242220 !important;
            color: #F7F3EF !important;
          }
          .menu {
            background-color: #302D2A !important;
            border-bottom: 1px solid #4D4742 !important;
            color: #F7F3EF !important;
          }
          .menu-row {
            background-color: #302D2A !important;
          }
          .menu-item i {
            filter: invert(0.85) !important;
          }
          .menu-item span.select,
          .menu-item .select,
          .menu-item input,
          .menu-item select {
            color: #F7F3EF !important;
            background-color: #383431 !important;
            border-color: #544E49 !important;
          }
          .menu-item .options {
            background-color: #302D2A !important;
            border: 1px solid #4D4742 !important;
            color: #F7F3EF !important;
            box-shadow: 0 6px 18px rgba(0,0,0,0.4) !important;
          }
          .menu-item .options li {
            color: #F7F3EF !important;
          }
          .menu-item .options li:hover,
          .menu-item .options li.active {
            background-color: #403A36 !important;
            color: #D8B282 !important;
          }
          .menu-divider {
            background-color: #4D4742 !important;
          }
          .catalog {
            background-color: #302D2A !important;
            border-right: 1px solid #4D4742 !important;
            color: #F7F3EF !important;
          }
          .catalog__header {
            background-color: #383431 !important;
            border-bottom: 1px solid #4D4742 !important;
            color: #D8B282 !important;
          }
          .catalog__header i {
            filter: invert(0.85) !important;
          }
          .catalog__main {
            background-color: #302D2A !important;
            color: #DBD0C7 !important;
          }
          .catalog__main .catalog-item {
            color: #DBD0C7 !important;
          }
          .catalog__main .catalog-item:hover {
            color: #D8B282 !important;
          }
          .footer {
            background-color: #302D2A !important;
            border-top: 1px solid #4D4742 !important;
            color: #DBD0C7 !important;
          }
          .footer span, .footer div {
            color: #DBD0C7 !important;
          }
          .footer i {
            filter: invert(0.85) !important;
          }
          .comment-line-toggle {
            background-color: #302D2A !important;
            border: 1px solid #4D4742 !important;
            color: #DBD0C7 !important;
          }
          .editor {
            background-color: #22201E !important;
            background-image: radial-gradient(#3D3834 1px, transparent 1px) !important;
            background-size: 20px 20px !important;
          }
          .editor canvas {
            filter: invert(0.84) hue-rotate(180deg) brightness(1.08) contrast(0.95) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45) !important;
          }
          @media print {
            .editor canvas {
              filter: none !important;
            }
          }
        `;
      } else {
        if (styleEl) {
          styleEl.remove();
        }
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ dark theme vào iframe Canvas Editor:', e);
    }
  }, []);

  // Lắng nghe thay đổi theme và áp dụng ngay lập tức vào iframe
  useEffect(() => {
    syncCanvasTheme(theme);
    const handleThemeChange = (e) => {
      syncCanvasTheme(e.detail || theme);
    };
    window.addEventListener('smartflow-theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('smartflow-theme-changed', handleThemeChange);
    };
  }, [theme, isLoaded, syncCanvasTheme]);

  // 3. Nạp dữ liệu khi iframe hoàn tất tải (với polling thử lại để đảm bảo editor instance đã sẵn sàng)
  const handleIframeLoaded = () => {
    let attempts = 0;
    const maxAttempts = 35;

    const setupEditor = async () => {
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

        // Thiết lập khoảng cách 2 bên lề bìa là 1cm (~38px) chuẩn ISO theo yêu cầu
        try {
          if (typeof editor.command.executeSetPaperMargin === 'function') {
            editor.command.executeSetPaperMargin([100, 38, 100, 38]);
          }
        } catch (marginErr) {
          console.warn('Lỗi thiết lập lề 1cm cho Canvas Editor:', marginErr);
        }

        // Tự động đồng bộ khi người dùng bấm nút "Mở / Nhập file Word (.docx)" trong Ribbon
        try {
          const iframeDoc = iframeRef.current?.contentDocument || iframeWin?.document;
          const docxInput = iframeDoc?.querySelector('#docx-input');
          if (docxInput && !docxInput.__hasSmartUploadListener__) {
            docxInput.__hasSmartUploadListener__ = true;
            docxInput.addEventListener('change', async (e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                if (typeof window.__smartWordUpload__ === 'function') {
                  await window.__smartWordUpload__(selectedFile);
                } else if (typeof handleUploadAndMergeWord === 'function') {
                  await handleUploadAndMergeWord(selectedFile);
                }
              }
            });
          }
        } catch (docxBindErr) {
          console.warn('Lỗi bind sự kiện docx-input:', docxBindErr);
        }

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

        // Đảm bảo style cho nút So sánh bản gốc trong menu Ribbon luôn hoàn hảo
        try {
          const iframeDoc = iframeRef.current?.contentDocument || iframeWin?.document;
          if (iframeDoc && !iframeDoc.getElementById('ce-compare-btn-fix')) {
            const styleEl = iframeDoc.createElement('style');
            styleEl.id = 'ce-compare-btn-fix';
            styleEl.innerHTML = `
              #btn-compare-original,
              .menu-item #btn-compare-original,
              .menu-item > div#btn-compare-original,
              .menu-item .menu-item__compare-original,
              .menu-item > div.menu-item__compare-original,
              .menu-item__compare-original {
                width: auto !important;
                min-width: unset !important;
                max-width: unset !important;
                height: 28px !important;
                min-height: 28px !important;
                max-height: 28px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                position: static !important;
                top: auto !important;
                left: auto !important;
                right: auto !important;
                bottom: auto !important;
                white-space: nowrap !important;
                gap: 6px !important;
                padding: 0 10px !important;
                margin: 0 4px !important;
                border-radius: 5px !important;
                background-color: #FAF4EF !important;
                border: 1.5px solid #7B5233 !important;
                color: #7B5233 !important;
                box-sizing: border-box !important;
                flex-shrink: 0 !important;
                cursor: pointer !important;
                user-select: none !important;
                overflow: visible !important;
                transform: none !important;
                box-shadow: 0 1px 3px rgba(123, 82, 51, 0.12) !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                line-height: 1 !important;
                transition: all 0.2s ease !important;
                z-index: 10 !important;
              }
              #btn-compare-original:hover,
              .menu-item #btn-compare-original:hover,
              .menu-item > div#btn-compare-original:hover,
              .menu-item .menu-item__compare-original:hover,
              .menu-item > div.menu-item__compare-original:hover,
              .menu-item__compare-original:hover {
                background-color: #7B5233 !important;
                color: #FFFFFF !important;
                border-color: #7B5233 !important;
                box-shadow: 0 2px 6px rgba(123, 82, 51, 0.25) !important;
              }
              #btn-compare-original svg,
              .menu-item #btn-compare-original svg,
              .menu-item > div#btn-compare-original svg,
              .menu-item .menu-item__compare-original svg,
              .menu-item > div.menu-item__compare-original svg,
              .menu-item__compare-original svg {
                display: inline-block !important;
                width: 14px !important;
                min-width: 14px !important;
                max-width: 14px !important;
                height: 14px !important;
                min-height: 14px !important;
                max-height: 14px !important;
                position: static !important;
                stroke: currentColor !important;
                flex-shrink: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
              }
              #btn-compare-original span,
              .menu-item #btn-compare-original span,
              .menu-item > div#btn-compare-original span,
              .menu-item .menu-item__compare-original span,
              .menu-item > div.menu-item__compare-original span,
              .menu-item__compare-original span {
                display: inline-block !important;
                position: static !important;
                width: auto !important;
                min-width: unset !important;
                max-width: unset !important;
                height: auto !important;
                min-height: unset !important;
                max-height: unset !important;
                border: none !important;
                background: transparent !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                color: inherit !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                letter-spacing: 0.2px !important;
                margin: 0 !important;
                padding: 0 !important;
              }

              /* Sidebar Mục lục chuẩn Gold Design System - Tinh chỉnh gọn 200px */
              .catalog {
                width: 200px !important;
                position: fixed !important;
                left: 0 !important;
                top: 76px !important;
                bottom: 38px !important;
                padding: 10px 10px 16px 12px !important;
                background-color: #FAF7F2 !important;
                border-right: 1.5px solid #EADCC9 !important;
                box-shadow: 2px 0 10px rgba(123, 82, 51, 0.08) !important;
                box-sizing: border-box !important;
                z-index: 10 !important;
                overflow: hidden !important;
              }

              .catalog .catalog__header {
                height: 36px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                border-bottom: 1px solid #EADCC9 !important;
                margin-bottom: 6px !important;
                padding-bottom: 4px !important;
              }

              .catalog .catalog__header span {
                color: #7B5233 !important;
                font-size: 14px !important;
                font-weight: 700 !important;
                letter-spacing: 0.2px !important;
              }

              .catalog .catalog__header__actions {
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
              }

              .catalog .catalog__header__auto,
              .catalog .catalog__header__close {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 24px !important;
                height: 24px !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
              }

              .catalog .catalog__header__auto:hover,
              .catalog .catalog__header__close:hover {
                background: #EADCC9 !important;
              }

              .catalog__main {
                height: calc(100% - 46px) !important;
                padding: 4px 0 !important;
                overflow-y: auto !important;
              }

              .catalog__main .catalog-item {
                box-sizing: border-box !important;
                width: 100% !important;
                padding-left: 10px !important;
              }

              .catalog__main > .catalog-item {
                padding-left: 0 !important;
              }

              .catalog__main .catalog-item .catalog-item__content {
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
                width: 100% !important;
                overflow: hidden !important;
                border-radius: 4px !important;
                padding: 2px 4px !important;
                transition: background-color 0.15s ease !important;
              }

              .catalog__main .catalog-item .catalog-item__content:hover {
                background-color: #F5EBE1 !important;
              }

              .catalog__main .catalog-item .catalog-item__content span {
                color: #4A3525 !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                line-height: 24px !important;
                cursor: pointer !important;
                user-select: none !important;
                transition: color 0.15s ease !important;
              }

              .catalog__main .catalog-item .catalog-item__content:hover > span {
                color: #7B5233 !important;
              }

              /* Khi có Mục lục: Đẩy vùng chứa .editor sang phải 200px để không bị che, đồng thời trang (.editor > div) được căn giữa tuyệt đối trong phần không gian còn lại */
              body:has(.catalog:not([style*="display: none"])) .editor,
              body.has-catalog .editor,
              #app:has(.catalog:not([style*="display: none"])) .editor {
                margin-left: 200px !important;
                width: calc(100% - 200px) !important;
                box-sizing: border-box !important;
                transition: margin-left 0.2s ease, width 0.2s ease !important;
              }

              body:has(.catalog:not([style*="display: none"])) .editor > div,
              body:has(.catalog:not([style*="display: none"])) .editor .ce-page-container,
              body.has-catalog .editor > div,
              body.has-catalog .editor .ce-page-container,
              #app:has(.catalog:not([style*="display: none"])) .editor > div,
              #app:has(.catalog:not([style*="display: none"])) .editor .ce-page-container {
                margin: 85px auto 30px auto !important;
                transition: margin 0.2s ease !important;
              }

              body:not(.has-catalog) .editor,
              body:has(.catalog[style*="display: none"]) .editor,
              #app:has(.catalog[style*="display: none"]) .editor {
                margin-left: 0 !important;
                width: 100% !important;
                box-sizing: border-box !important;
                transition: margin-left 0.2s ease, width 0.2s ease !important;
              }

              .editor {
                overflow-x: auto !important;
              }

              /* Nút tab mở lại Mục lục khi đang đóng */
              #btn-catalog-tab-open {
                position: fixed !important;
                left: 0 !important;
                top: 90px !important;
                z-index: 9 !important;
                background-color: #FAF4EF !important;
                border: 1.5px solid #7B5233 !important;
                border-left: none !important;
                border-radius: 0 5px 5px 0 !important;
                color: #7B5233 !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                padding: 4px 8px !important;
                cursor: pointer !important;
                box-shadow: 1px 2px 6px rgba(123, 82, 51, 0.15) !important;
                display: none !important;
                user-select: none !important;
                transition: all 0.2s ease !important;
              }
              #btn-catalog-tab-open:hover {
                background-color: #7B5233 !important;
                color: #FFFFFF !important;
              }
              body:not(.has-catalog) #btn-catalog-tab-open,
              body:has(.catalog[style*="display: none"]) #btn-catalog-tab-open {
                display: block !important;
              }

              html, body, #app {
                overflow-x: auto !important;
              }
            `;
            iframeDoc.head.appendChild(styleEl);
          }
        } catch (styleErr) {
          console.warn('Lỗi inject style cho compare button:', styleErr);
        }

        // Đồng bộ giao diện Dark Obsidian vào iframe
        syncCanvasTheme(theme);

        // Khởi tạo tỷ lệ hiển thị vừa vặn trang A4 (80%)
        if (editor?.command?.executePageScale) {
          editor.command.executePageScale(0.8);
        }

        // Lắng nghe phím tắt Ctrl+S bên trong Canvas Editor
        if (editor.listener) {
          editor.listener.saved = () => {
            handleSaveDoc();
          };
        }

        // Ưu tiên cao nhất: Nạp file Word vừa tải lên (hoặc đang chờ tải)
        if (pendingBufferRef.current) {
          const pBuf = pendingBufferRef.current;
          pendingBufferRef.current = null;
          await importBufferToCanvasEditor(pBuf);
          setIsContentReady(true);
        }
        // Nạp nội dung từ CSDL được thực hiện trong useEffect (chờ dữ liệu formData về)
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

  // 4. Các hàm điều khiển Chế độ So Sánh Bản Gốc song song (Full-screen Split View)
  const handleOpenCompare = useCallback(async () => {
    setIsCompareMode(true);
    setOriginalZoom('fit');
    setEditorZoom(80);
    setTimeout(() => {
      applyEditorScale(80);
    }, 200);

    const targetPath = formDataRef.current?.original_file_path || formDataRef.current?.file_path;
    if (targetPath) {
      setLoadingOriginal(true);
      try {
        const res = await api.get('/iso-documents/onlyoffice/pages', {
          params: { file_path: targetPath, _t: Date.now() }
        });
        if (res?.pages && res.pages.length > 0) {
          setOriginalPages(res.pages);
        }
      } catch (err) {
        console.warn('Không thể nạp ảnh trang gốc:', err);
      } finally {
        setLoadingOriginal(false);
      }
    }
  }, [applyEditorScale]);

  const handleCloseCompare = useCallback(() => {
    setIsCompareMode(false);
    setEditorZoom(100);
    setTimeout(() => {
      try {
        const iframeWin = iframeRef.current?.contentWindow;
        const editor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
        if (editor?.command?.executePageScaleRecovery) {
          editor.command.executePageScaleRecovery();
        } else if (editor?.command?.executePageScale) {
          editor.command.executePageScale(1);
        }
        iframeWin?.dispatchEvent(new Event('resize'));
      } catch (e) {}
    }, 150);
  }, []);

  // Lắng nghe Message và Phím tắt Esc
  useEffect(() => {
    window.__openCompareMode__ = handleOpenCompare;

    const handleMessage = (e) => {
      if (e.data?.type === 'OPEN_COMPARE_MODE') {
        handleOpenCompare();
      }
    };
    window.addEventListener('message', handleMessage);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCompareMode) {
        handleCloseCompare();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (window.__openCompareMode__ === handleOpenCompare) {
        delete window.__openCompareMode__;
      }
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleOpenCompare, handleCloseCompare, isCompareMode]);

  // Kích hoạt re-center canvas khi chuyển đổi split mode & khóa cuộn trang nền
  useEffect(() => {
    if (isCompareMode) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        try {
          iframeRef.current?.contentWindow?.dispatchEvent(new Event('resize'));
        } catch (e) {}
      }, 150);
      return () => {
        document.body.style.overflow = prevOverflow;
        clearTimeout(timer);
      };
    }
  }, [isCompareMode]);

  return (
    <div style={isCompareMode ? {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 999999,
      backgroundColor: '#FAF7F2',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    } : {
      width: '100%',
      height: '100%',
      minHeight: '680px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Top Header khi ở chế độ So sánh toàn màn hình */}
      {isCompareMode && (
        <div style={{
          height: '46px',
          backgroundColor: '#7B5233',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          zIndex: 10,
          flexShrink: 0,
          boxSizing: 'border-box',
          width: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
            <Columns size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              SO SÁNH BẢN GỐC & BẢN HIỆN TẠI
            </span>
            <span style={{
              fontSize: '0.74rem',
              backgroundColor: 'rgba(255,255,255,0.18)',
              padding: '2px 8px',
              borderRadius: '4px',
              maxWidth: '220px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }} title={`${formData.code || formData.new_code || ''} ${formData.name ? `— ${formData.name}` : ''}`}>
              {formData.code || formData.new_code || ''} {formData.name ? `— ${formData.name}` : ''}
            </span>
          </div>

          {/* Nhóm điều khiển thu phóng: Cả bản gốc & Bản sửa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Phóng to/thu nhỏ bản gốc */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>Bản gốc:</span>
              <button
                type="button"
                onClick={() => handleOriginalZoomChange(-15)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Thu nhỏ bản gốc"
              >
                <ZoomOut size={12} />
              </button>
              <span style={{ fontSize: '0.76rem', fontWeight: 'bold', minWidth: '46px', textAlign: 'center' }}>
                {originalZoom === 'fit' ? 'Vừa vặn' : `${originalZoom}%`}
              </span>
              <button
                type="button"
                onClick={() => handleOriginalZoomChange(15)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Phóng to bản gốc"
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                onClick={() => setOriginalZoom('fit')}
                style={{
                  background: originalZoom === 'fit' ? '#FAF7F2' : 'rgba(255,255,255,0.2)',
                  color: originalZoom === 'fit' ? '#7B5233' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
                title="Vừa vặn theo chiều ngang cột"
              >
                Vừa vặn
              </button>
              <button
                type="button"
                onClick={() => setOriginalZoom(100)}
                style={{
                  background: originalZoom === 100 ? '#FAF7F2' : 'rgba(255,255,255,0.2)',
                  color: originalZoom === 100 ? '#7B5233' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
                title="Kích thước thực 100%"
              >
                100%
              </button>
            </div>

            <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.3)' }} />

            {/* Phóng to/thu nhỏ bản sửa (Editor) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>Bản sửa:</span>
              <button
                type="button"
                onClick={() => handleEditorZoomChange(-10)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Thu nhỏ bản sửa"
              >
                <ZoomOut size={12} />
              </button>
              <span style={{ fontSize: '0.76rem', fontWeight: 'bold', minWidth: '34px', textAlign: 'center' }}>
                {editorZoom}%
              </span>
              <button
                type="button"
                onClick={() => handleEditorZoomChange(10)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Phóng to bản sửa"
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                onClick={() => handleEditorZoomSet(80)}
                style={{
                  background: editorZoom === 80 ? '#FAF7F2' : 'rgba(255,255,255,0.2)',
                  color: editorZoom === 80 ? '#7B5233' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
                title="80% Vừa vặn khung chia đôi"
              >
                80%
              </button>
              <button
                type="button"
                onClick={() => handleEditorZoomSet(100)}
                style={{
                  background: editorZoom === 100 ? '#FAF7F2' : 'rgba(255,255,255,0.2)',
                  color: editorZoom === 100 ? '#7B5233' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
                title="100% Kích thước thực"
              >
                100%
              </button>
            </div>
          </div>

          {/* Nút hành động */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleSaveDoc}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                backgroundColor: '#15803D',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
              title="Lưu các chỉnh sửa hiện tại"
            >
              <Save size={13} />
              Lưu quy trình
            </button>
            <button
              type="button"
              onClick={handleCloseCompare}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              title="Đóng chế độ so sánh (Esc)"
            >
              <X size={14} />
              Đóng (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Cảnh báo lỗi kết nối */}
      {loadError && (
        <div style={{
          position: 'absolute',
          top: isCompareMode ? '46px' : 0,
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

      {/* Banner file PDF */}
      {!isCompareMode && formData.file_path && formData.file_path.toLowerCase().endsWith('.pdf') && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#FFFBEB',
          borderBottom: '1px solid #FDE68A',
          color: '#B45309',
          fontSize: '0.84rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <span>
            📄 Tài liệu gốc hiện tại là file <strong>PDF</strong> ({formData.file_path.split('/').pop()}). Nhấn <strong>[👁️ Xem bản gốc (100% Trung thực)]</strong> ở thanh trên để xem đầy đủ các trang gốc, hoặc bấm <strong>[⬆️ Cập nhật từ Word]</strong> để tải file Word (.docx) mới.
          </span>
          <button
            type="button"
            onClick={() => {
              if (typeof window.__openFaithfulViewer__ === 'function') {
                window.__openFaithfulViewer__();
              }
            }}
            style={{
              padding: '4px 10px',
              backgroundColor: '#B45309',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            👁️ Xem bản gốc ngay
          </button>
        </div>
      )}

      {/* Main Split-Screen Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        minHeight: 0,
        width: '100%',
        maxWidth: '100vw',
        height: isCompareMode ? 'calc(100vh - 46px)' : '100%',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* CỘT TRÁI: BẢN GỐC (CHỈ XEM - CUỘN ĐỘC LẬP) */}
        <div style={{
          flex: '0 0 50%',
          width: '50%',
          maxWidth: '50%',
          minWidth: 0,
          height: '100%',
          display: isCompareMode ? 'flex' : 'none',
          flexDirection: 'column',
          borderRight: '2px solid #EADCC9',
          backgroundColor: '#525659',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <div style={{
            height: '32px',
            backgroundColor: '#FAF4EF',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            color: '#7B5233',
            fontWeight: 'bold',
            fontSize: '0.78rem',
            flexShrink: 0
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              📌 BẢN GỐC (File gốc ban đầu — Chỉ xem, không sửa)
            </span>
            <span style={{ color: '#8A6A4F', fontWeight: '500' }}>
              {originalPages.length > 0 ? `${originalPages.length} trang` : ''}
            </span>
          </div>

          <div style={{
            flex: 1,
            minHeight: 0,
            height: 'calc(100% - 32px)',
            overflowY: 'auto',
            overflowX: 'auto',
            overscrollBehavior: 'contain',
            padding: '16px 16px 40px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {loadingOriginal && (
              <div style={{ color: '#ffffff', padding: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} className="animate-spin" />
                <span>Đang nạp và dựng từng trang file gốc trung thực 100%...</span>
              </div>
            )}
            {!loadingOriginal && originalPages.length === 0 && (
              <div style={{ color: '#EADCC9', padding: '40px', textAlign: 'center', fontSize: '0.85rem' }}>
                Chưa có bản render ảnh từng trang từ file gốc hoặc chưa tải lên file Word gốc.
              </div>
            )}
            {!loadingOriginal && originalPages.map((page) => {
              const isFit = originalZoom === 'fit';
              const numZoom = typeof originalZoom === 'number' ? originalZoom : 100;
              const w = isFit ? '100%' : `${Math.round(page.width_mm * MM_TO_PX * numZoom / 100)}px`;
              return (
                <div
                  key={page.page_number}
                  style={{
                    flex: '0 0 auto',
                    flexShrink: 0,
                    flexGrow: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                    backgroundColor: '#ffffff',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    width: isFit ? '100%' : w,
                    maxWidth: isFit ? '100%' : 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <img
                    src={page.data_url}
                    alt={`Bản gốc - Trang ${page.page_number}`}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      backgroundColor: '#fff'
                    }}
                    loading="lazy"
                  />
                  <div style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: '#64748b',
                    background: '#f8fafc',
                    width: '100%',
                    textAlign: 'center',
                    borderTop: '1px solid #e2e8f0',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}>
                    Trang {page.page_number}/{originalPages.length} • {page.width_mm}×{page.height_mm} mm • {page.orientation === 'landscape' ? 'Khổ ngang' : 'Khổ dọc'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI: BẢN HIỆN TẠI (SOẠN THẢO - CUỘN ĐỘC LẬP) */}
        <div style={{
          flex: isCompareMode ? '0 0 50%' : '1 1 100%',
          width: isCompareMode ? '50%' : '100%',
          maxWidth: isCompareMode ? '50%' : '100%',
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FAF8F5',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          {isCompareMode && (
            <div style={{
              height: '32px',
              backgroundColor: '#FAF4EF',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              color: '#7B5233',
              fontWeight: 'bold',
              fontSize: '0.78rem',
              flexShrink: 0
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                ✏️ BẢN HIỆN TẠI (Đang soạn thảo — Sửa bình thường)
              </span>
              <span style={{ color: '#15803D', fontWeight: '500', fontSize: '0.74rem' }}>
                Đầy đủ công cụ Ribbon & Thao tác
              </span>
            </div>
          )}

          <div style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            width: '100%',
            height: isCompareMode ? 'calc(100% - 32px)' : '100%'
          }}>
            <iframe
              ref={iframeRef}
              src="/canvas-editor/"
              title="Canvas Editor Full UI"
              onLoad={handleIframeLoaded}
              style={{
                width: '100%',
                height: '100%',
                minHeight: isCompareMode ? '100%' : '650px',
                border: 'none',
                display: 'block'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasISOEditor;
