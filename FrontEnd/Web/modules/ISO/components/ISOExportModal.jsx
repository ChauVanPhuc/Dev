import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileSpreadsheet, FolderArchive, Download, CheckCircle2, Loader2, Layers, AlertCircle } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

/**
 * ISOExportModal - Modal tùy chọn Xuất dữ liệu Quy trình ISO
 * Hỗ trợ 2 định dạng:
 * 1. Bảng tính Excel (.xlsx) phân tầng chuẩn 3 cấp (Cấp 1 Mục, Cấp 2 Gốc, Cấp 3 Đính kèm).
 * 2. Gói thư mục ZIP Hồ Sơ G7 (.zip) chứa cây thư mục Hồ Sơ G7/[Mã] Tên/ (File chính .docx + tất cả đính kèm).
 */
const ISOExportModal = ({
  isOpen,
  onClose,
  currentPageProcesses = [],
  totalProcessesCount = 0,
  selectedProcesses = [],
  activeFilters = {}
}) => {
  const { toast } = useToast();
  const selectedCount = selectedProcesses.length;
  const currentPageCount = currentPageProcesses.length;
  const [exportFormat, setExportFormat] = useState('excel'); // 'excel' | 'zip'
  const [exportScope, setExportScope] = useState(() => (selectedCount > 0 ? 'selected' : 'current_page'));
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const isExcel = exportFormat === 'excel';
      const endpoint = isExcel 
        ? '/iso-documents/processes/export-excel'
        : '/iso-documents/processes/export-folder-zip';

      const payload = {
        scope: exportScope,
        process_ids: exportScope === 'selected' 
          ? selectedProcesses.map(p => p.id)
          : exportScope === 'current_page' 
            ? currentPageProcesses.map(p => p.id) 
            : undefined,
        search: activeFilters.search || undefined,
        doc_type: activeFilters.docType || undefined,
        department_name: activeFilters.department || undefined,
        status: activeFilters.status || undefined,
        document_level: activeFilters.level || undefined
      };

      const res = await api.post(endpoint, payload, {
        responseType: 'blob'
      });

      // Tạo đường dẫn tải về từ Blob
      const blob = new Blob([res.data || res], {
        type: isExcel 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/zip'
      });

      const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const defaultFilename = isExcel 
        ? `Danh_Muc_Quy_Trinh_ISO_${nowStr}.xlsx`
        : `Ho_So_G7_${nowStr}.zip`;

      // Đọc filename từ Content-Disposition header nếu có
      let downloadFilename = defaultFilename;
      const disposition = res.headers?.['content-disposition'] || '';
      if (disposition && disposition.includes('filename*=')) {
        try {
          const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
          if (match && match[1]) {
            downloadFilename = decodeURIComponent(match[1]);
          }
        } catch (_) {}
      } else if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) {
          downloadFilename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      if (toast?.success) {
        toast.success(`Đã xuất và tải xuống thành công: ${downloadFilename}`);
      }
      onClose();
    } catch (err) {
      console.error('Lỗi khi xuất dữ liệu ISO:', err);
      if (toast?.error) {
        toast.error(err.response?.data?.detail || 'Không thể xuất dữ liệu. Vui lòng thử lại sau.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #EADCC9',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FAF7F2',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#F5EBE1',
                border: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233'
              }}
            >
              <Download size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#543821' }}>
                Xuất dữ liệu Quy trình ISO
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                Hỗ trợ bảng tính Excel phân tầng 3 cấp & gói thư mục Hồ Sơ G7
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Chọn định dạng xuất */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '10px'
              }}
            >
              1. Chọn định dạng xuất:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Card Excel */}
              <div
                onClick={() => setExportFormat('excel')}
                style={{
                  border: exportFormat === 'excel' ? '2px solid #7B5233' : '1.5px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: exportFormat === 'excel' ? '#FAF7F2' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: exportFormat === 'excel' ? '#7B5233' : '#F1F5F9',
                      color: exportFormat === 'excel' ? '#FFFFFF' : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FileSpreadsheet size={19} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: exportFormat === 'excel' ? '#7B5233' : '#1E293B' }}>
                      Bảng tính Excel (.xlsx)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                      Phân tầng 3 cấp: Cấp 1 Mục, Cấp 2 Tài liệu gốc, Cấp 3 File đính kèm.
                    </div>
                  </div>
                </div>
                {exportFormat === 'excel' && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#7B5233' }}>
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </div>

              {/* Card Thư mục ZIP */}
              <div
                onClick={() => setExportFormat('zip')}
                style={{
                  border: exportFormat === 'zip' ? '2px solid #7B5233' : '1.5px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: exportFormat === 'zip' ? '#FAF7F2' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: exportFormat === 'zip' ? '#7B5233' : '#F1F5F9',
                      color: exportFormat === 'zip' ? '#FFFFFF' : '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FolderArchive size={19} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: exportFormat === 'zip' ? '#7B5233' : '#1E293B' }}>
                      Thư mục ZIP Hồ Sơ G7
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                      Cây thư mục <code>Hồ Sơ G7/</code> &gt; <code>[Mã] Tên/</code> gồm file chính + đính kèm.
                    </div>
                  </div>
                </div>
                {exportFormat === 'zip' && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#7B5233' }}>
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Chọn phạm vi xuất */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '10px'
              }}
            >
              2. Chọn phạm vi xuất:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Option 1: Tài liệu đã chọn */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: exportScope === 'selected' ? '1.5px solid #7B5233' : '1px solid #E2E8F0',
                  backgroundColor: exportScope === 'selected' ? '#FDFBF9' : '#FFFFFF',
                  cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedCount > 0 ? 1 : 0.65
                }}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="selected"
                  checked={exportScope === 'selected'}
                  disabled={selectedCount === 0}
                  onChange={() => setExportScope('selected')}
                  style={{ accentColor: '#7B5233', width: '16px', height: '16px', cursor: selectedCount > 0 ? 'pointer' : 'not-allowed' }}
                />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: exportScope === 'selected' ? '#7B5233' : '#1E293B' }}>
                      Các tài liệu đã tích chọn
                    </span>
                    {selectedCount === 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        (Vui lòng tick chọn ô vuông ở đầu các dòng trên bảng danh sách)
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: selectedCount > 0 ? '#DCFCE7' : '#F1F5F9',
                      color: selectedCount > 0 ? '#15803D' : '#94A3B8',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}
                  >
                    {selectedCount} tài liệu
                  </span>
                </div>
              </label>

              {/* Danh sách các tài liệu đã chọn hiển thị tóm tắt khi chọn mục này */}
              {exportScope === 'selected' && selectedCount > 0 && (
                <div style={{
                  maxHeight: '90px',
                  overflowY: 'auto',
                  backgroundColor: '#FAF7F2',
                  borderRadius: '6px',
                  border: '1px solid #EADCC9',
                  padding: '6px 10px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '5px'
                }}>
                  {selectedProcesses.map((p, idx) => (
                    <span
                      key={p.id || idx}
                      style={{
                        fontSize: '0.72rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <strong style={{ color: '#7B5233' }}>{p.new_code || p.code || `#${p.id}`}</strong>
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Option 2: Trang hiện tại */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: exportScope === 'current_page' ? '1.5px solid #7B5233' : '1px solid #E2E8F0',
                  backgroundColor: exportScope === 'current_page' ? '#FDFBF9' : '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="current_page"
                  checked={exportScope === 'current_page'}
                  onChange={() => setExportScope('current_page')}
                  style={{ accentColor: '#7B5233', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>
                    Trang hiện tại (Theo bộ lọc đang áp dụng)
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: '#E2E8F0',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}
                  >
                    {currentPageCount} tài liệu
                  </span>
                </div>
              </label>

              {/* Option 3: Tất cả */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: exportScope === 'all' ? '1.5px solid #7B5233' : '1px solid #E2E8F0',
                  backgroundColor: exportScope === 'all' ? '#FDFBF9' : '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="all"
                  checked={exportScope === 'all'}
                  onChange={() => setExportScope('all')}
                  style={{ accentColor: '#7B5233', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>
                    Tất cả tài liệu (Toàn bộ danh sách)
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}
                  >
                    {totalProcessesCount} tài liệu
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Banner lưu ý */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#FAF7F2',
              borderRadius: '8px',
              border: '1px dashed #EADCC9',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.76rem',
              color: '#543821',
              lineHeight: 1.4
            }}
          >
            <Layers size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#7B5233' }} />
            <div>
              {exportFormat === 'excel' ? (
                <>
                  File Excel tự động tạo cấu trúc <strong>Outline 3 Cấp</strong>: Cấp 1 là Mã mục (CS, QT, HD...), Cấp 2 là Tài liệu gốc đang soạn thảo, Cấp 3 là các file/biểu mẫu đính kèm.
                </>
              ) : (
                <>
                  Gói ZIP tự động đóng gói thư mục <code>Hồ Sơ G7/</code> chứa các thư mục con <code>[Mã] Tên/</code> gồm <strong>File chính (.docx) đang soạn thảo</strong> và toàn bộ tài liệu đính kèm.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#FAF7F2',
            borderTop: '1px solid #EADCC9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: isExporting ? 'not-allowed' : 'pointer'
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              opacity: isExporting ? 0.75 : 1
            }}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                Đang đóng gói &amp; tải xuống...
              </>
            ) : (
              <>
                <Download size={16} />
                Tải xuống ngay
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ISOExportModal;

