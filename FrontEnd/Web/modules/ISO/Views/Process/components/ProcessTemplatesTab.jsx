import React, { useState } from 'react';
import api from '@webShared/Services/api.service';
import {
  Plus, Trash2, Edit, Upload, Eye, FileText, Settings, Download,
  X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, RefreshCw, AlertTriangle, FileSpreadsheet,
  Paperclip
} from 'lucide-react';
import '../../MasterRecord/isoMasterRecord.css';

const getExcelColName = (colIndex) => {
  let name = '';
  let num = colIndex;
  while (num >= 0) {
    name = String.fromCharCode((num % 26) + 65) + name;
    num = Math.floor(num / 26) - 1;
  }
  return name;
};

const ProcessTemplatesTab = ({ editor }) => {
  const {
    activeTab, formData, handleAddRelatedTemplate, handleDeleteAttachment,
    handleDeleteRelatedTemplate, handleOpenSystemTemplatesModal, handleUpdateRelatedTemplate, handleUploadAttachment,
    handleUploadChildFiles, handleDeleteChildFile,
    selectedTemplateId, setSelectedTemplateId, systemScreens,
  } = editor;

  // State cho Modal xem trước tài liệu đính kèm
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    item: null,
    loading: false,
    error: null,
    fileName: '',
    ext: '',
    downloadUrl: '',
    streamUrl: '',
    rawUrl: '',
    htmlContent: '',
    excelData: null,
    activeSheetIdx: 0,
    selectedCell: { r: 0, c: 0, address: 'A1', val: '' },
    zoom: 100,
  });

  // State phóng to hình ảnh lưu đồ / sơ đồ (Lightbox)
  const [lightboxImage, setLightboxImage] = useState(null);

  // Trợ giúp định dạng dung lượng file
  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Trợ giúp lấy icon và màu nhận diện định dạng file
  const getFileIconInfo = (ext) => {
    const e = (ext || '').toLowerCase().replace(/^\./, '');
    if (['doc', 'docx'].includes(e)) {
      return { icon: FileText, color: '#2563eb', bg: '#eff6ff', label: 'Word' };
    }
    if (['xls', 'xlsx', 'csv'].includes(e)) {
      return { icon: FileSpreadsheet, color: '#16a34a', bg: '#f0fdf4', label: 'Excel' };
    }
    if (['pdf'].includes(e)) {
      return { icon: FileText, color: '#dc2626', bg: '#fef2f2', label: 'PDF' };
    }
    if (['ppt', 'pptx'].includes(e)) {
      return { icon: FileText, color: '#ea580c', bg: '#fff7ed', label: 'PowerPoint' };
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(e)) {
      return { icon: Eye, color: '#9333ea', bg: '#faf5ff', label: 'Ảnh' };
    }
    return { icon: FileText, color: '#7B5233', bg: '#FAF6F0', label: e.toUpperCase() || 'TỆP' };
  };

  // Trợ giúp chuẩn hóa mã biểu mẫu đầy đủ có tiền tố
  const getFullTemplateCode = (code) => {
    const raw = (code || '').trim();
    if (!raw) return '';
    const baseCode = (formData.code || 'QT').trim();
    const regex = new RegExp(`^(${baseCode}[-_]|QT\\d+[-_])`, 'i');
    if (!regex.test(raw)) {
      return `${baseCode}-${raw.replace(/^[\s_-]+/, '')}`;
    }
    return raw.replace(/_/g, '-');
  };

  // Trợ giúp lấy tên hiển thị của tệp con có tiền tố biểu mẫu cha
  const getChildFileDisplayName = (parentT, childFile) => {
    if (!childFile) return '';
    const raw = childFile.file_name || childFile.original_file_name || '';
    if (!parentT || !parentT.code) return raw;
    const parentCode = getFullTemplateCode(parentT.code);
    if (raw && !raw.toUpperCase().startsWith(parentCode.toUpperCase())) {
      return `${parentCode} - ${raw}`;
    }
    return raw;
  };

  // Trợ giúp lấy tên thật của file biểu mẫu đính kèm (có đầy đủ tiền tố mã biểu mẫu)
  const getTemplateDisplayName = (item) => {
    if (!item) return '';
    const rawName = item.original_file_name || item.file_name || '';
    const rawPath = item.file_path || '';
    const ext = (rawPath.split('.').pop() || (rawName.split('.').pop() || '')).toLowerCase();
    const isUuid = /^[0-9a-fA-F-]{32,38}(\.[a-zA-Z0-9]+)?$/.test(rawName);

    let coreName = (rawName && !isUuid) ? rawName : (item.title || item.name || '');
    if (ext && !coreName.toLowerCase().endsWith(`.${ext}`)) {
      coreName = `${coreName}.${ext}`;
    }

    const code = getFullTemplateCode(item.code);
    if (code && coreName) {
      const codeRegex = new RegExp(`^${code.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[\\s_-]*`, 'i');
      if (!codeRegex.test(coreName)) {
        return `${code} - ${coreName}`;
      }
    }

    return coreName || rawPath.split('/').pop() || 'tai_lieu_dinh_kem';
  };

  // Trợ giúp tạo URL file
  const getFileUrls = (item) => {
    if (!item) return { downloadUrl: '', rawUrl: '', streamUrl: '', ext: '', fileName: '' };
    const rawPath = item.file_path || '';
    const fileName = item.is_child ? (item.file_name || item.original_file_name) : getTemplateDisplayName(item);
    const ext = (item.file_type || fileName.split('.').pop() || (rawPath.split('.').pop() || '')).toLowerCase();

    const apiBase = (api.defaults?.baseURL || '').replace(/\/$/, '');
    const serverHost = apiBase.replace(/\/api\/v1\/?$/, '');

    let downloadUrl = '';
    let rawUrl = '';
    if (item.doc_id) {
      downloadUrl = `${apiBase}/iso-documents/${item.doc_id}/download-raw`;
      rawUrl = downloadUrl;
    } else if (rawPath) {
      if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
        rawUrl = rawPath;
        downloadUrl = rawPath;
      } else {
        const cleanPath = rawPath.replace(/^\/+/, '');
        rawUrl = `${serverHost}/${cleanPath}`;
        downloadUrl = rawUrl;
      }
    }

    const streamUrl = rawPath
      ? `${apiBase}/iso-master-records/file-stream?path=${encodeURIComponent(rawPath)}`
      : rawUrl;

    return { downloadUrl, rawUrl, streamUrl, ext, fileName, serverHost };
  };

  // Mở xem trước tài liệu đính kèm
  const handlePreviewTemplateFile = async (item) => {
    if (!item) return;
    const { downloadUrl, rawUrl, streamUrl, ext, fileName, serverHost } = getFileUrls(item);

    if (!downloadUrl && !item.file_path) {
      alert('Tài liệu này chưa có file đính kèm để xem trước.');
      return;
    }

    setPreviewModal({
      isOpen: true,
      item,
      loading: true,
      error: null,
      fileName,
      ext,
      downloadUrl,
      streamUrl,
      rawUrl,
      htmlContent: '',
      excelData: null,
      activeSheetIdx: 0,
      selectedCell: { r: 0, c: 0, address: 'A1', val: '' },
      zoom: 100,
    });

    const isWord = ext === 'docx' || ext === 'doc';
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const isPdf = ext === 'pdf';
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);

    try {
      if (isWord) {
        // Gọi API trích xuất HTML cho file Word
        const res = await api.get('/iso-master-records/file-preview/docx', {
          params: { path: item.file_path || fileName }
        });
        const data = res?.data || res;
        if (data && data.success && data.html_content) {
          let html = data.html_content;
          if (serverHost) {
            html = html.replace(/src=["']\/(static\/[^"']+)["']/g, `src="${serverHost}/$1"`);
          }
          // Loại bỏ giới hạn max-height:85px nếu có ở ảnh trong bảng (ngoại trừ logo tiêu đề)
          html = html.replace(/class="iso-doc-inline-img"(?!\s+class="[^"]*iso-header-logo)[^>]*style="[^"]*max-height:\s*85px[^"]*"/g, (m) => {
            return m.replace(/max-height:\s*85px;?/g, 'max-height:none;');
          });
          setPreviewModal(prev => ({
            ...prev,
            loading: false,
            htmlContent: html
          }));
        } else {
          setPreviewModal(prev => ({
            ...prev,
            loading: false,
            error: data?.error || data?.detail || 'Không thể trích xuất nội dung Word dạng xem nhanh.'
          }));
        }
      } else if (isExcel) {
        // Gọi API trích xuất dữ liệu đa Sheet cho Excel
        const res = await api.get('/iso-master-records/file-preview/excel', {
          params: { path: item.file_path || fileName }
        });
        const data = res?.data || res;
        if (data && data.success && (data.sheets || data.sheet_names)) {
          setPreviewModal(prev => ({
            ...prev,
            loading: false,
            excelData: data
          }));
        } else {
          setPreviewModal(prev => ({
            ...prev,
            loading: false,
            error: data?.error || data?.detail || 'Không thể đọc cấu trúc bảng tính Excel.'
          }));
        }
      } else if (isPdf || isImage) {
        setPreviewModal(prev => ({
          ...prev,
          loading: false
        }));
      } else {
        setPreviewModal(prev => ({
          ...prev,
          loading: false
        }));
      }
    } catch (err) {
      console.warn('Lỗi xem trước file đính kèm:', err);
      setPreviewModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.detail || err.message || 'Không thể xem trước tệp tin này.'
      }));
    }
  };

  const handleClosePreviewModal = () => {
    setPreviewModal(prev => ({
      ...prev,
      isOpen: false,
      loading: false,
      error: null,
      htmlContent: '',
      excelData: null
    }));
    setLightboxImage(null);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '20px', minHeight: '520px', width: '100%' }}>
        
        {/* CỘT TRÁI: DANH SÁCH TÀI LIỆU LIÊN QUAN (RỘNG 22%) */}
        <div style={{
          width: '22%',
          backgroundColor: 'white',
          border: '1px solid #EADCC9',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(45, 26, 18, 0.02)'
        }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233', margin: '0 0 8px 0' }}>
            Danh sách tài liệu liên quan
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
            {(formData.related_templates || []).map((t) => {
              const isSelected = selectedTemplateId === t.id;
              const hasFile = Boolean(t.file_path || t.doc_id);
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                    color: isSelected ? '#7B5233' : '#64748b',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.82rem',
                    border: isSelected ? '1px solid #EADCC9' : '1px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '72%', overflow: 'hidden' }}>
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={`${getFullTemplateCode(t.code)} - ${t.title}`}
                    >
                      {getFullTemplateCode(t.code)} - {t.title}
                    </span>
                    {Array.isArray(t.sub_files) && t.sub_files.length > 0 && (
                      <span
                        title={`${t.sub_files.length} tệp con đính kèm`}
                        style={{
                          fontSize: '0.66rem',
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          padding: '1px 5px',
                          borderRadius: '10px',
                          fontWeight: '700',
                          flexShrink: 0
                        }}
                      >
                        +{t.sub_files.length}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {/* Nút Xem Trước (Icon Eye) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewTemplateFile(t);
                      }}
                      disabled={!hasFile}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: hasFile ? '#7B5233' : '#cbd5e1',
                        cursor: hasFile ? 'pointer' : 'not-allowed',
                        fontSize: '0.8rem',
                        padding: '2px 4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      title={hasFile ? `Xem trước "${t.file_name || t.title}"` : "Chưa có file đính kèm"}
                    >
                      <Eye size={15} />
                    </button>

                    {/* Nút Xóa (Dấu X) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Bạn có chắc muốn xóa tài liệu liên quan "${t.code} - ${t.title}"?`)) {
                          handleDeleteRelatedTemplate(t.id);
                        }
                      }}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '2px 4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Xóa tài liệu"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
            
            {(formData.related_templates || []).length === 0 && (
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                Chưa có tài liệu liên quan.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddRelatedTemplate}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px dashed #7B5233',
              color: '#7B5233',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={14} /> Thêm tài liệu mới
          </button>
        </div>

        {/* CỘT PHẢI: CHI TIẾT CẤU HÌNH TÀI LIỆU ĐANG CHỌN (RỘNG 78%) */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          border: '1px solid #EADCC9',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(45, 26, 18, 0.02)'
        }}>
          {(() => {
            const selectedT = (formData.related_templates || []).find(t => t.id === selectedTemplateId);
            if (!selectedT) {
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Vui lòng chọn hoặc thêm một tài liệu liên quan từ cột bên trái để bắt đầu cấu hình.
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Grid form inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                      Mã biểu mẫu <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {(() => {
                      const baseCode = formData.code || 'QT';
                      let matchedPrefix = '';
                      const possiblePrefixes = [
                        `${baseCode}-`,
                        `${baseCode}_`,
                        formData.new_code ? `${formData.new_code}-` : '',
                        formData.new_code ? `${formData.new_code}_` : '',
                      ].filter(Boolean);

                      for (const p of possiblePrefixes) {
                        if (selectedT.code && selectedT.code.startsWith(p)) {
                          matchedPrefix = p;
                          break;
                        }
                      }
                      // Mặc định dùng dấu '-' chuẩn ISO toàn hệ thống (ví dụ: QT34-)
                      const procCodePrefix = matchedPrefix || (formData.code ? `${formData.code}-` : 'QT-');

                      let currentSuffix = selectedT.code || '';
                      if (selectedT.code && selectedT.code.startsWith(procCodePrefix)) {
                        currentSuffix = selectedT.code.slice(procCodePrefix.length);
                      } else if (selectedT.code) {
                        const regex = new RegExp(`^(${baseCode}[-_]|QT\\d+[-_])`, 'i');
                        const m = selectedT.code.match(regex);
                        if (m) {
                          currentSuffix = selectedT.code.slice(m[0].length);
                        }
                      }

                      const handleSuffixChange = (e) => {
                        let val = e.target.value.replace(/^[\s_-]+/, '');
                        const newFullCode = `${procCodePrefix}${val}`;
                        handleUpdateRelatedTemplate(selectedT.id, 'code', newFullCode);
                      };

                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <span style={{
                              backgroundColor: '#FAF6F0',
                              color: '#7B5233',
                              padding: '8px 10px',
                              border: '1px solid #cbd5e1',
                              borderRight: 'none',
                              borderTopLeftRadius: '6px',
                              borderBottomLeftRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              userSelect: 'none',
                              whiteSpace: 'nowrap'
                            }}>
                              {procCodePrefix}
                            </span>
                            <input
                              type="text"
                              value={currentSuffix}
                              onChange={handleSuffixChange}
                              placeholder="BM01..."
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderTopRightRadius: '6px',
                                borderBottomRightRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#1e293b',
                                outline: 'none'
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                            Mã đầy đủ: <strong style={{ color: '#7B5233' }}>{selectedT.code || `${procCodePrefix}...`}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                      Tên biểu mẫu <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={selectedT.title || ''}
                      onChange={(e) => handleUpdateRelatedTemplate(selectedT.id, 'title', e.target.value)}
                      placeholder="Nhập tên biểu mẫu..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#1e293b',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                      Phạm vi áp dụng
                    </label>
                    <select
                      value={selectedT.scope || 'Tất cả'}
                      onChange={(e) => handleUpdateRelatedTemplate(selectedT.id, 'scope', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#1e293b',
                        backgroundColor: 'white',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Tất cả">Tất cả</option>
                      {(systemScreens || []).map(s => (
                        <option key={s.route_path} value={s.screen_name || s.title}>
                          {s.screen_name || s.title} ({s.route_path})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nơi lưu trữ & Thời hạn lưu (Mục 6) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                      Nơi lưu trữ (Bảng biểu mẫu Mục 6)
                    </label>
                    <input
                      type="text"
                      value={selectedT.storage_location || ''}
                      onChange={(e) => handleUpdateRelatedTemplate(selectedT.id, 'storage_location', e.target.value)}
                      placeholder="Ban Quản trị Chất lượng & ISO (QLCL)..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#1e293b',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                      Thời hạn lưu (Bảng biểu mẫu Mục 6)
                    </label>
                    <input
                      type="text"
                      value={selectedT.retention_period || '03 năm'}
                      onChange={(e) => handleUpdateRelatedTemplate(selectedT.id, 'retention_period', e.target.value)}
                      placeholder="03 năm, 05 năm..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#1e293b',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Ghi chú */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                    Ghi chú
                  </label>
                  <textarea
                    value={selectedT.note || ''}
                    onChange={(e) => handleUpdateRelatedTemplate(selectedT.id, 'note', e.target.value)}
                    placeholder="Nhập ghi chú thêm..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: '#1e293b',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* PHẦN 1: TÀI LIỆU ĐÍNH KÈM (TỆP CHÍNH) */}
                <div style={{
                  padding: '16px',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  backgroundColor: '#FDFAF7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#2d1a12', margin: 0 }}>
                        Tài liệu đính kèm (Tệp chính)
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        (Không bắt buộc)
                      </span>
                    </div>
                    {selectedT.file_path && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        color: '#15803d',
                        backgroundColor: '#dcfce7',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        Tệp chính
                      </span>
                    )}
                  </div>

                  {selectedT.file_path ? (
                    /* Khi đã có file chính */
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '1px solid #EADCC9',
                      borderRadius: '6px',
                      backgroundColor: 'white'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <FileText size={20} style={{ color: '#7B5233', flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 'bold',
                            color: '#2d1a12',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {getTemplateDisplayName(selectedT)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Đã tải lên hệ thống
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        {/* Nút Xem Trước */}
                        <button
                          type="button"
                          onClick={() => handlePreviewTemplateFile(selectedT)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#FAF6F0',
                            color: '#7B5233',
                            border: '1px solid #7B5233',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title="Xem trước tài liệu"
                        >
                          <Eye size={13} /> Xem trước
                        </button>

                        {/* Nút Tải xuống */}
                        <a
                          href={selectedT.doc_id 
                            ? `${api.defaults?.baseURL?.replace(/\/$/, '')}/iso-documents/${selectedT.doc_id}/download-raw`
                            : `${api.defaults?.baseURL?.replace('/api/v1', '')}/${selectedT.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          download={getTemplateDisplayName(selectedT)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#7B5233',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Download size={12} /> Tải xuống
                        </a>

                        {/* Nút Xóa file */}
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment && handleDeleteAttachment(selectedT.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            border: '1px solid #fee2e2',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ✕ Xóa file
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Nếu CHƯA có file chính - Vùng tải lên */
                    <div
                      onClick={() => document.getElementById(`main-file-upload-input-${selectedT.id}`).click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '6px',
                        padding: '16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: 'white',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <input
                        type="file"
                        id={`main-file-upload-input-${selectedT.id}`}
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleUploadAttachment && handleUploadAttachment(e, selectedT.id)}
                      />
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Upload size={15} style={{ color: '#7B5233' }} />
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
                          Tải tệp chính từ máy (Word, Excel, PDF, PPT, Ảnh...) hoặc kéo thả vào đây
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* PHẦN 2: TỆP CON ĐÍNH KÈM / PHỤ LỤC PHỤ THUỘC */}
                <div style={{
                  padding: '16px',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {/* Header của Phần tệp con */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Paperclip size={16} style={{ color: '#7B5233' }} />
                      <label style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#2d1a12', margin: 0 }}>
                        Tệp con đính kèm (Phụ lục phụ thuộc)
                      </label>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: (selectedT.sub_files || []).length > 0 ? '#7B5233' : '#94a3b8',
                        backgroundColor: (selectedT.sub_files || []).length > 0 ? '#FAF6F0' : '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        {(selectedT.sub_files || []).length} tệp con
                      </span>
                    </div>

                    {/* Nút bấm + Thêm file con */}
                    <button
                      type="button"
                      onClick={() => document.getElementById(`child-files-upload-input-${selectedT.id}`).click()}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#7B5233',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Plus size={14} /> Thêm file con
                    </button>

                    <input
                      type="file"
                      id={`child-files-upload-input-${selectedT.id}`}
                      style={{ display: 'none' }}
                      multiple
                      accept=".docx,.doc,.pdf,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.svg,.csv,.txt,.zip,.rar,.7z"
                      onChange={(e) => handleUploadChildFiles && handleUploadChildFiles(e, selectedT.id)}
                    />
                  </div>

                  {/* Danh sách các tệp con đã đính kèm */}
                  {Array.isArray(selectedT.sub_files) && selectedT.sub_files.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedT.sub_files.map((child, cIdx) => {
                        const childExt = (child.file_type || (child.file_name || '').split('.').pop() || '').toLowerCase();
                        const iconInfo = getFileIconInfo(childExt);
                        const IconComp = iconInfo.icon;
                        const childDisplayName = getChildFileDisplayName(selectedT, child);
                        const { downloadUrl } = getFileUrls({ ...child, is_child: true });

                        return (
                          <div
                            key={child.id || `child_${cIdx}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              border: '1px solid #f1f5f9',
                              borderRadius: '6px',
                              backgroundColor: '#f8fafc',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1, marginRight: '12px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30px',
                                height: '30px',
                                borderRadius: '6px',
                                backgroundColor: iconInfo.bg,
                                color: iconInfo.color,
                                flexShrink: 0
                              }}>
                                <IconComp size={16} />
                              </span>
                              <div style={{ overflow: 'hidden', flex: 1 }}>
                                <div style={{
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  color: '#1e293b',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }} title={childDisplayName}>
                                  {childDisplayName}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                  <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: '700',
                                    color: iconInfo.color,
                                    backgroundColor: iconInfo.bg,
                                    padding: '1px 5px',
                                    borderRadius: '3px'
                                  }}>
                                    {iconInfo.label}
                                  </span>
                                  {child.file_size ? <span>{formatFileSize(child.file_size)}</span> : null}
                                  {child.uploaded_at ? <span>• {child.uploaded_at}</span> : null}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                              {/* Nút Xem Trước tệp con */}
                              <button
                                type="button"
                                onClick={() => handlePreviewTemplateFile({ ...child, is_child: true })}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: 'white',
                                  color: '#7B5233',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '5px',
                                  fontSize: '0.73rem',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                title={`Xem trước "${childDisplayName}"`}
                              >
                                <Eye size={12} /> Xem trước
                              </button>

                              {/* Nút Tải xuống tệp con */}
                              <a
                                href={downloadUrl || `${api.defaults?.baseURL?.replace('/api/v1', '')}/${child.file_path}`}
                                target="_blank"
                                rel="noreferrer"
                                download={childDisplayName}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: '#FAF6F0',
                                  color: '#7B5233',
                                  border: '1px solid #EADCC9',
                                  borderRadius: '5px',
                                  fontSize: '0.73rem',
                                  fontWeight: '600',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer'
                                }}
                                title={`Tải xuống "${childDisplayName}"`}
                              >
                                <Download size={12} /> Tải xuống
                              </a>

                              {/* Nút Xóa tệp con */}
                              <button
                                type="button"
                                onClick={() => handleDeleteChildFile && handleDeleteChildFile(selectedT.id, child.id)}
                                style={{
                                  padding: '5px 8px',
                                  backgroundColor: '#fee2e2',
                                  color: '#ef4444',
                                  border: '1px solid #fee2e2',
                                  borderRadius: '5px',
                                  fontSize: '0.73rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                title="Xóa tệp con này"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Trạng thái chưa có tệp con */
                    <div style={{
                      padding: '16px',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '6px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      color: '#94a3b8',
                      fontSize: '0.78rem',
                      fontStyle: 'italic'
                    }}>
                      Chưa có tệp con nào được đính kèm. Bấm nút <strong>"+ Thêm file con"</strong> ở trên để tải lên 1 hoặc nhiều tệp phụ lục đi kèm.
                    </div>
                  )}

                  {/* Vùng Dropzone nhỏ bổ sung */}
                  <div
                    onClick={() => document.getElementById(`child-files-upload-input-${selectedT.id}`).click()}
                    style={{
                      border: '1px dashed #EADCC9',
                      borderRadius: '6px',
                      padding: '10px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#FDFAF7',
                      transition: 'all 0.15s ease',
                      marginTop: '4px'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#EADCC9'; e.currentTarget.style.backgroundColor = '#FDFAF7'; }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#7B5233', fontWeight: '500' }}>
                      + Kéo thả hoặc bấm vào đây để tải lên thêm 1 hoặc nhiều file con
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      </div>

      {/* MODAL XEM TRƯỚC TÀI LIỆU (PREVIEW MODAL) */}
      {previewModal.isOpen && (
        <div
          className="iso-doc-modal-overlay"
          onClick={handleClosePreviewModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="iso-doc-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '95vw',
              maxWidth: '1350px',
              height: '92vh',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #EADCC9'
            }}
          >
            {/* Header */}
            <div
              className="iso-doc-modal-header"
              style={{
                padding: '10px 20px',
                backgroundColor: '#FAF6F0',
                borderBottom: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <span style={{
                  backgroundColor: '#7B5233',
                  color: 'white',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  flexShrink: 0
                }}>
                  {previewModal.ext || 'FILE'}
                </span>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: '#2D1A12',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }} title={previewModal.fileName}>
                  {previewModal.item?.code ? `${previewModal.item.code} - ` : ''}{previewModal.item?.title || previewModal.fileName}
                </span>
                <span style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  flexShrink: 0
                }}>
                  Xem trước
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {/* Zoom controls */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  backgroundColor: '#F5EBE1',
                  border: '1px solid #DFD5CA',
                  borderRadius: '6px',
                  padding: '0 4px',
                  height: '32px'
                }}>
                  <button
                    type="button"
                    onClick={() => setPreviewModal(p => ({ ...p, zoom: Math.max(50, p.zoom - 10) }))}
                    style={{ background: 'transparent', border: 'none', color: '#7B5233', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="Thu nhỏ"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#7B5233', minWidth: '38px', textAlign: 'center' }}>
                    {previewModal.zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewModal(p => ({ ...p, zoom: Math.min(200, p.zoom + 10) }))}
                    style={{ background: 'transparent', border: 'none', color: '#7B5233', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="Phóng to"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModal(p => ({ ...p, zoom: 100 }))}
                    style={{ background: 'transparent', border: 'none', color: '#7B5233', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="Kích thước chuẩn (100%)"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>

                {/* Mở tab mới */}
                {(previewModal.streamUrl || previewModal.rawUrl) && (
                  <a
                    href={previewModal.streamUrl || previewModal.rawUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#FAF6F0',
                      color: '#7B5233',
                      border: '1px solid #EADCC9',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      height: '32px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      textDecoration: 'none',
                      boxSizing: 'border-box'
                    }}
                    title="Mở tài liệu trong tab mới của trình duyệt"
                  >
                    <ExternalLink size={13} /> Tab mới
                  </a>
                )}

                {/* Nút tải về */}
                {previewModal.downloadUrl && (
                  <a
                    href={previewModal.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={previewModal.fileName}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#7B5233',
                      color: '#FFFFFF',
                      border: '1px solid #7B5233',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      height: '32px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                      boxSizing: 'border-box'
                    }}
                    title="Tải tệp tin gốc về máy tính"
                  >
                    <Download size={13} /> Tải về
                  </a>
                )}

                {/* Nút đóng */}
                <button
                  type="button"
                  onClick={handleClosePreviewModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px'
                  }}
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', backgroundColor: '#FAF7F2' }}>
              <style>{`
                .iso-viewer-page {
                  background-color: #FFFFFF !important;
                  color: #1E293B !important;
                }
                .iso-viewer-page p, .iso-viewer-page span, .iso-viewer-page div, .iso-viewer-page li {
                  color: #1E293B;
                }
                .iso-viewer-page table, .iso-viewer-page table.iso-doc-table {
                  background-color: #FFFFFF !important;
                  color: #1E293B !important;
                  border: 1.5px solid #000000 !important;
                  border-collapse: collapse !important;
                  margin: 12px 0 !important;
                }
                .iso-viewer-page th {
                  background-color: #F8FAFC !important;
                  color: #0F172A !important;
                  font-weight: 700 !important;
                  border: 1px solid #000000 !important;
                  padding: 8px 10px !important;
                }
                .iso-viewer-page td {
                  background-color: #FFFFFF !important;
                  color: #1E293B !important;
                  border: 1px solid #000000 !important;
                  padding: 7px 10px !important;
                }
                .iso-viewer-page .iso-cell-paragraph {
                  color: #1E293B !important;
                  margin: 0 !important;
                }
                .iso-viewer-page .iso-doc-heading {
                  color: #7B5233 !important;
                }
                .iso-viewer-page table img.iso-doc-inline-img,
                .iso-viewer-page table td img,
                .iso-viewer-page .iso-cell-paragraph img {
                  max-height: none !important;
                  max-width: 100% !important;
                  width: auto !important;
                  min-width: 160px;
                  height: auto !important;
                  display: block !important;
                  margin: 8px auto !important;
                  object-fit: contain !important;
                  cursor: zoom-in;
                }
                .iso-viewer-page table[data-t-idx="0"] tr:first-child td:first-child img,
                .iso-viewer-page img.iso-header-logo {
                  max-height: 85px !important;
                  min-width: unset !important;
                  width: auto !important;
                  cursor: default;
                }
                .iso-viewer-page td.iso-flowchart-cell {
                  background-color: #FAFAFA !important;
                  text-align: center !important;
                  vertical-align: middle !important;
                  padding: 12px 8px !important;
                }
                .iso-viewer-page td.iso-flowchart-cell img {
                  width: 100% !important;
                  max-width: 100% !important;
                  height: auto !important;
                  min-width: 180px !important;
                  border-radius: 4px !important;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
                  cursor: zoom-in;
                }
              `}</style>
              {previewModal.loading ? (
                <div style={{ padding: '80px 20px', textAlign: 'center', color: '#7B5233', width: '100%', margin: 'auto' }}>
                  <RefreshCw className="iso-spinner" size={32} style={{ animation: 'isoSpin 1s linear infinite' }} />
                  <div style={{ marginTop: '12px', fontSize: '0.88rem', fontWeight: '600' }}>
                    Đang nạp dữ liệu xem trước tài liệu...
                  </div>
                </div>
              ) : previewModal.error ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#DC2626', margin: 'auto' }}>
                  <AlertTriangle size={36} style={{ margin: '0 auto 12px auto' }} />
                  <div style={{ fontSize: '0.92rem', fontWeight: '700' }}>{previewModal.error}</div>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    {previewModal.downloadUrl && (
                      <a
                        href={previewModal.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={previewModal.fileName}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#7B5233',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 'bold',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Download size={13} /> Tải file về máy
                      </a>
                    )}
                    {(previewModal.streamUrl || previewModal.rawUrl) && (
                      <a
                        href={previewModal.streamUrl || previewModal.rawUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#E2E8F0',
                          color: '#334155',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 'bold',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <ExternalLink size={13} /> Thử mở trong tab mới
                      </a>
                    )}
                  </div>
                </div>
              ) : (previewModal.ext === 'docx' || previewModal.ext === 'doc') ? (
                /* Word Document Preview */
                <div
                  className="iso-word-html-viewport"
                  onClick={(e) => {
                    if (e.target.tagName === 'IMG' && !e.target.classList.contains('iso-header-logo')) {
                      setLightboxImage(e.target.src);
                    }
                  }}
                  title="Nhấp vào hình ảnh lưu đồ để phóng to toàn màn hình"
                  style={{
                    flex: 1,
                    height: '100%',
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'auto',
                    backgroundColor: '#FAF7F2',
                    padding: '28px 16px 80px 16px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start'
                  }}
                >
                  <div
                    className="iso-viewer-page"
                    style={{
                      backgroundColor: '#FFFFFF',
                      width: '100%',
                      maxWidth: '880px',
                      minHeight: '1000px',
                      padding: '40px 50px',
                      boxShadow: '0 4px 20px rgba(45, 26, 18, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05)',
                      border: '1px solid #EADCC9',
                      borderRadius: '6px',
                      transform: previewModal.zoom !== 100 ? `scale(${previewModal.zoom / 100})` : 'none',
                      transformOrigin: 'top center',
                      fontFamily: '"Times New Roman", Times, serif, "Inter", sans-serif',
                      fontSize: '13pt',
                      lineHeight: '1.6',
                      color: '#1E293B',
                      boxSizing: 'border-box'
                    }}
                    dangerouslySetInnerHTML={{ __html: previewModal.htmlContent || '<p>Tài liệu trống</p>' }}
                  />
                </div>
              ) : (previewModal.ext === 'xlsx' || previewModal.ext === 'xls') ? (
                /* Excel Viewer */
                (() => {
                  const excelData = previewModal.excelData;
                  if (!excelData) {
                    return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', margin: 'auto' }}>Bảng tính không có dữ liệu</div>;
                  }
                  let sheetNames = [];
                  let currentSheet = null;
                  if (Array.isArray(excelData.sheets)) {
                    sheetNames = excelData.sheets.map((s, idx) => s.name || `Sheet ${idx + 1}`);
                    currentSheet = excelData.sheets[previewModal.activeSheetIdx] || excelData.sheets[0];
                  } else if (excelData.sheets && typeof excelData.sheets === 'object') {
                    sheetNames = excelData.sheet_names || Object.keys(excelData.sheets);
                    const sName = sheetNames[previewModal.activeSheetIdx] || sheetNames[0];
                    currentSheet = excelData.sheets[sName];
                  }

                  if (!currentSheet || !currentSheet.cells_grid || currentSheet.cells_grid.length === 0) {
                    return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', margin: 'auto' }}>Worksheet này không có dữ liệu</div>;
                  }

                  const colCount = currentSheet.total_cols || (currentSheet.cells_grid[0] ? currentSheet.cells_grid[0].length : 26);
                  const colHeaders = Array.from({ length: colCount }, (_, i) => getExcelColName(i));

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', backgroundColor: '#FFFFFF' }}>
                      {/* Formula Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1', flexShrink: 0 }}>
                        <div style={{ minWidth: '55px', textAlign: 'center', fontWeight: 'bold', background: '#FFF', border: '1px solid #CBD5E1', padding: '2px 6px', fontSize: '0.78rem', borderRadius: '4px' }}>
                          {previewModal.selectedCell?.address || 'A1'}
                        </div>
                        <div style={{ fontStyle: 'italic', fontWeight: 'bold', color: '#64748B', fontSize: '0.85rem' }}>fx</div>
                        <div style={{ flex: 1, background: '#FFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '3px 10px', fontSize: '0.8rem', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {previewModal.selectedCell?.val ?? ''}
                        </div>
                      </div>

                      {/* Table Grid */}
                      <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#F1F5F9', zoom: `${previewModal.zoom}%` }}>
                        <table style={{ borderCollapse: 'collapse', backgroundColor: '#FFF', minWidth: '100%', fontFamily: 'Segoe UI, Tahoma, sans-serif' }}>
                          <thead>
                            <tr>
                              <th style={{ backgroundColor: '#F1F5F9', width: '48px', minWidth: '48px', textAlign: 'center', position: 'sticky', top: 0, left: 0, zIndex: 3, border: '1px solid #CBD5E1', fontSize: '0.75rem', padding: '4px' }}>#</th>
                              {colHeaders.map((colName, cIdx) => (
                                <th key={cIdx} style={{ backgroundColor: '#F8FAFC', fontWeight: 'bold', color: '#475569', textAlign: 'center', position: 'sticky', top: 0, zIndex: 2, border: '1px solid #CBD5E1', padding: '4px 8px', fontSize: '0.78rem' }}>
                                  {colName}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentSheet.cells_grid.map((row, rIdx) => (
                              <tr key={rIdx}>
                                <td style={{ backgroundColor: '#F8FAFC', fontWeight: 'bold', color: '#64748B', textAlign: 'center', position: 'sticky', left: 0, zIndex: 1, width: '48px', minWidth: '48px', border: '1px solid #CBD5E1', fontSize: '0.75rem', padding: '4px' }}>
                                  {rIdx + 1}
                                </td>
                                {row.map((cell, cIdx) => {
                                  if (cell.h) return null;
                                  const isSelected = previewModal.selectedCell?.r === rIdx && previewModal.selectedCell?.c === cIdx;
                                  const colLetter = getExcelColName(cIdx);
                                  const address = `${colLetter}${rIdx + 1}`;
                                  return (
                                    <td
                                      key={cIdx}
                                      rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                                      colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                                      onClick={() => setPreviewModal(prev => ({
                                        ...prev,
                                        selectedCell: { r: rIdx, c: cIdx, address, val: cell.v ?? '' }
                                      }))}
                                      style={{
                                        border: '1px solid #CBD5E1',
                                        padding: '4px 8px',
                                        whiteSpace: 'nowrap',
                                        fontSize: '0.8rem',
                                        cursor: 'cell',
                                        backgroundColor: isSelected ? '#E0F2FE' : (cell.bg || '#FFFFFF'),
                                        color: cell.color || '#1E293B',
                                        fontWeight: cell.bold ? 'bold' : 'normal',
                                        textAlign: cell.align || 'left',
                                        outline: isSelected ? '2px solid #0284C7' : 'none',
                                        outlineOffset: '-2px'
                                      }}
                                    >
                                      {cell.v ?? ''}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Sheets Bar */}
                      {sheetNames.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', backgroundColor: '#F1F5F9', borderTop: '1px solid #CBD5E1', overflowX: 'auto', flexShrink: 0 }}>
                          {sheetNames.map((sName, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewModal(prev => ({ ...prev, activeSheetIdx: idx }))}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 14px',
                                borderRadius: '4px 4px 0 0',
                                border: '1px solid #CBD5E1',
                                borderBottom: 'none',
                                backgroundColor: previewModal.activeSheetIdx === idx ? '#FFFFFF' : '#E2E8F0',
                                color: previewModal.activeSheetIdx === idx ? '#166534' : '#475569',
                                fontWeight: previewModal.activeSheetIdx === idx ? 'bold' : '600',
                                fontSize: '0.78rem',
                                cursor: 'pointer'
                              }}
                            >
                              <FileSpreadsheet size={13} /> {sName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : previewModal.ext === 'pdf' ? (
                /* PDF Viewer */
                <div style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#FAF7F2' }}>
                  <iframe
                    src={`${previewModal.streamUrl || previewModal.rawUrl}#toolbar=1`}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: '#FFFFFF' }}
                    title={previewModal.fileName}
                  />
                </div>
              ) : ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(previewModal.ext) ? (
                /* Image Viewer */
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF7F2', padding: '20px', overflow: 'auto' }}>
                  <img
                    src={previewModal.streamUrl || previewModal.rawUrl}
                    alt={previewModal.fileName}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      boxShadow: '0 4px 16px rgba(45, 26, 18, 0.08)',
                      border: '1px solid #EADCC9',
                      transform: previewModal.zoom !== 100 ? `scale(${previewModal.zoom / 100})` : 'none',
                      transition: 'transform 0.15s ease'
                    }}
                  />
                </div>
              ) : (
                /* Generic File */
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', margin: 'auto' }}>
                  <FileText size={48} style={{ margin: '0 auto 12px auto', color: '#7B5233' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#2D1A12' }}>
                    {previewModal.fileName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '6px' }}>
                    Định dạng .{previewModal.ext} không hỗ trợ hiển thị trực tiếp trong khung xem nhanh.
                  </div>
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    {previewModal.downloadUrl && (
                      <a
                        href={previewModal.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={previewModal.fileName}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#7B5233',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Download size={14} /> Tải file về máy
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox phóng to ảnh lưu đồ / quy trình */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Toolbar */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              zIndex: 100001
            }}
          >
            <a
              href={lightboxImage}
              download="luu_do_quy_trinh.png"
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.35)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              <Download size={15} /> Tải ảnh gốc
            </a>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.85)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              title="Đóng (Esc / Click bên ngoài)"
            >
              <X size={20} />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              overflow: 'auto',
              borderRadius: '8px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              backgroundColor: '#FFFFFF',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={lightboxImage}
              alt="Lưu đồ quy trình phóng to"
              style={{
                maxWidth: '100%',
                maxHeight: '82vh',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
          <div style={{ marginTop: '12px', color: '#E2E8F0', fontSize: '0.82rem' }}>
            Nhấp chuột ra ngoài vùng ảnh hoặc bấm nút ✕ để đóng
          </div>
        </div>
      )}
    </>
  );
};

export default ProcessTemplatesTab;

