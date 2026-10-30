import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ChevronLeft, ChevronRight, Download, Printer, 
  Edit, FileText, CheckCircle, Paperclip, ExternalLink 
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import logoCty from '../Views/Process/utils/logoCty';

/**
 * ISOProcessPreviewModal:
 * Modal xem trước tài liệu in (PDF Preview) theo chuẩn khổ giấy A4 cho phân hệ Quy trình ISO.
 * Hỗ trợ:
 * - Chuyển đổi qua lại các mẫu quy trình (Next / Prev / Phím mũi tên).
 * - Combobox chọn tài liệu / biểu mẫu liên quan để xem file gốc.
 * - In tài liệu chuẩn A4.
 * - Tải file Word / file gốc.
 * - Điều hướng mở trang chỉnh sửa chi tiết.
 * - Đã loại bỏ nút Xuất Excel theo yêu cầu.
 */
const ISOProcessPreviewModal = ({
  isOpen,
  doc,
  docList = [],
  currentIndex = 0,
  onSelectIndex,
  onClose,
  onEdit
}) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDocKey, setSelectedDocKey] = useState('main');

  // Lấy chi tiết tài liệu khi doc thay đổi
  useEffect(() => {
    if (!isOpen || !doc?.id) {
      setDetails(null);
      setSelectedDocKey('main');
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/iso-documents/processes/${doc.id}/details`);
        if (isMounted) {
          setDetails(res || doc);
          setSelectedDocKey('main');
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết quy trình để xem trước:', err);
        if (isMounted) {
          setDetails(doc);
          setSelectedDocKey('main');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, doc?.id]);

  // Điều hướng bằng phím mũi tên
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0 && onSelectIndex) {
          onSelectIndex(currentIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < docList.length - 1 && onSelectIndex) {
          onSelectIndex(currentIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, docList.length, onSelectIndex, onClose]);

  if (!isOpen || !doc) return null;

  // Dữ liệu hợp nhất từ summary và details
  const activeData = details || doc;
  const docCode = activeData.new_code || activeData.code || '---';
  const oldCode = activeData.code || '';
  const docName = activeData.name || '---';
  const version = activeData.version || activeData.effective_version || '01';
  const issueDate = activeData.issue_date || activeData.updated_at || '';
  const departmentName = activeData.department_name || activeData.folder || 'ISO';
  const documentLevel = activeData.document_level || 'Cấp công ty';

  // Danh sách tài liệu / biểu mẫu liên quan
  const attachedDocs = (activeData.documents && activeData.documents.length > 0)
    ? activeData.documents
    : ((activeData.related_templates && activeData.related_templates.length > 0) ? activeData.related_templates : []);

  // Tài liệu liên quan hiện đang chọn (nếu không phải main)
  const activeRelatedDoc = selectedDocKey !== 'main'
    ? attachedDocs.find((d, idx) => (d.id ? `doc_${d.id}` : `doc_${idx}`) === selectedDocKey)
    : null;

  // Xử lý in tài liệu
  const handlePrint = () => {
    window.print();
  };

  // Xử lý tải file Word / File gốc
  const handleDownload = () => {
    let filePath = '';
    let fileName = '';

    if (selectedDocKey === 'main') {
      filePath = activeData.original_file_path || activeData.file_path || doc.original_file_path || doc.file_path || '';
      fileName = activeData.original_file_name || `${docCode}_${docName}.docx`;
    } else if (activeRelatedDoc) {
      filePath = activeRelatedDoc.original_file_path || activeRelatedDoc.file_path || '';
      fileName = activeRelatedDoc.file_name || `${activeRelatedDoc.code || 'BieuMau'}_${activeRelatedDoc.name || activeRelatedDoc.title || 'TaiLieu'}.docx`;
    }

    if (filePath) {
      const serverBase = 'http://localhost:8000';
      const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const downloadUrl = filePath.startsWith('http') ? filePath : `${serverBase}/${cleanPath}`;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert('Không tìm thấy đường dẫn file gốc của tài liệu này trên máy chủ.');
    }
  };

  // Danh sách các dòng nhật ký sửa đổi (tối thiểu 18 dòng như form gốc)
  const revLogs = (activeData.revision_logs && activeData.revision_logs.length > 0)
    ? activeData.revision_logs
    : [];
  const displayLogs = Array.from({ length: Math.max(18, revLogs.length) }).map((_, idx) => {
    const existing = revLogs[idx];
    return existing || { seq_no: idx + 1, rev_date: '', content: '', page_no: '' };
  });

  // Sections nội dung
  const sections = activeData.sections || {};
  const sectionEntries = Object.entries(sections).filter(([k]) => !k.startsWith('__'));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* WRAPPER CHỨA MODAL VÀ 2 NÚT ĐIỀU HƯỚNG BÊN NGOÀI */}
      <div
        style={{
          position: 'relative',
          width: 'calc(100vw - 140px)',
          maxWidth: '1200px',
          height: '92vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* NÚT ĐIỀU HƯỚNG BÊN NGOÀI SƯỜN TRÁI (<) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectIndex && currentIndex > 0) onSelectIndex(currentIndex - 1);
          }}
          disabled={currentIndex <= 0}
          style={{
            position: 'absolute',
            right: 'calc(100% + 14px)',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10000,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: currentIndex <= 0 ? 'rgba(255, 255, 255, 0.12)' : '#7B5233',
            color: currentIndex <= 0 ? 'rgba(255, 255, 255, 0.3)' : '#FFFFFF',
            border: currentIndex <= 0 ? '1.5px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(255, 255, 255, 0.75)',
            boxShadow: currentIndex <= 0 ? 'none' : '0 6px 20px rgba(0, 0, 0, 0.45)',
            cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(4px)'
          }}
          onMouseEnter={(e) => {
            if (currentIndex > 0) {
              e.currentTarget.style.backgroundColor = '#93633e';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
              e.currentTarget.style.boxShadow = '0 8px 26px rgba(0, 0, 0, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentIndex > 0) {
              e.currentTarget.style.backgroundColor = '#7B5233';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.45)';
            }
          }}
          title="Mẫu trước (Phím mũi tên Trái)"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>

        {/* NÚT ĐIỀU HƯỚNG BÊN NGOÀI SƯỜN PHẢI (>) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectIndex && currentIndex < docList.length - 1) onSelectIndex(currentIndex + 1);
          }}
          disabled={currentIndex >= docList.length - 1}
          style={{
            position: 'absolute',
            left: 'calc(100% + 14px)',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10000,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: currentIndex >= docList.length - 1 ? 'rgba(255, 255, 255, 0.12)' : '#7B5233',
            color: currentIndex >= docList.length - 1 ? 'rgba(255, 255, 255, 0.3)' : '#FFFFFF',
            border: currentIndex >= docList.length - 1 ? '1.5px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(255, 255, 255, 0.75)',
            boxShadow: currentIndex >= docList.length - 1 ? 'none' : '0 6px 20px rgba(0, 0, 0, 0.45)',
            cursor: currentIndex >= docList.length - 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(4px)'
          }}
          onMouseEnter={(e) => {
            if (currentIndex < docList.length - 1) {
              e.currentTarget.style.backgroundColor = '#93633e';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
              e.currentTarget.style.boxShadow = '0 8px 26px rgba(0, 0, 0, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentIndex < docList.length - 1) {
              e.currentTarget.style.backgroundColor = '#7B5233';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.45)';
            }
          }}
          title="Mẫu tiếp theo (Phím mũi tên Phải)"
        >
          <ChevronRight size={28} strokeWidth={2.5} />
        </button>

        {/* MODAL DIALOG CONTAINER CHÍNH */}
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
        {/* MODAL TOOLBAR HEADER (MÀU ĐỒNG #7B5233) */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: '#7B5233',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            borderBottom: '1px solid #623f25',
            flexWrap: 'wrap'
          }}
        >
          {/* Cụm trái: Tiêu đề & Thông tin tài liệu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <FileText size={18} color="#FCE7D2" />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem', fontFamily: 'sans-serif' }}>
                  Xem trước tài liệu in (PDF Preview)
                </span>
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.4px'
                  }}
                >
                  {docCode}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: '#F5EBE1',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '380px'
                }}
                title={docName}
              >
                {docName}
              </span>
            </div>
          </div>

          {/* Cụm giữa: Điều hướng qua lại các mẫu quy trình & Combobox tài liệu liên quan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Bộ điều hướng mẫu */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.22)',
                borderRadius: '6px',
                padding: '2px 4px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <button
                type="button"
                onClick={() => onSelectIndex && onSelectIndex(currentIndex - 1)}
                disabled={currentIndex <= 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentIndex <= 0 ? 'rgba(255,255,255,0.35)' : '#FFFFFF',
                  cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
                title="Mẫu trước (Phím mũi tên Trái)"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ padding: '0 8px', fontSize: '0.78rem', fontWeight: 'bold', color: '#FCE7D2', minWidth: '55px', textAlign: 'center', userSelect: 'none' }}>
                {currentIndex + 1} / {docList.length}
              </span>
              <button
                type="button"
                onClick={() => onSelectIndex && onSelectIndex(currentIndex + 1)}
                disabled={currentIndex >= docList.length - 1}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentIndex >= docList.length - 1 ? 'rgba(255,255,255,0.35)' : '#FFFFFF',
                  cursor: currentIndex >= docList.length - 1 ? 'not-allowed' : 'pointer',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
                title="Mẫu tiếp theo (Phím mũi tên Phải)"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Combobox chọn tài liệu liên quan */}
            {attachedDocs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Paperclip size={14} color="#FCE7D2" />
                <select
                  value={selectedDocKey}
                  onChange={(e) => setSelectedDocKey(e.target.value)}
                  style={{
                    height: '30px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1.5px solid #FCE7D2',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '260px'
                  }}
                  title="Chọn tài liệu / biểu mẫu liên quan để xem"
                >
                  <option value="main">
                    📄 Quy trình chính ({docCode})
                  </option>
                  {attachedDocs.map((item, idx) => {
                    const optKey = item.id ? `doc_${item.id}` : `doc_${idx}`;
                    const optCode = item.code || item.symbol || `BM-${idx + 1}`;
                    const optName = item.name || item.title || 'Biểu mẫu';
                    return (
                      <option key={optKey} value={optKey}>
                        📎 {optCode}: {optName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Cụm phải: Các nút tác vụ (Word, In, Chỉnh sửa, Đóng) - ĐÃ BỎ XUẤT EXCEL */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="pdf-preview-toolbar-btn"
              onClick={handleDownload}
              style={{
                padding: '5px 12px',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                border: '1.5px solid #7B5233',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Tải file Word / File gốc về máy tính"
            >
              <Download size={14} />
              <span>{selectedDocKey === 'main' ? 'Tải file Word' : 'Tải file gốc'}</span>
            </button>

            <button
              type="button"
              className="pdf-preview-toolbar-btn"
              onClick={handlePrint}
              style={{
                padding: '5px 12px',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                border: '1.5px solid #7B5233',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="In trực tiếp tài liệu theo khổ A4"
            >
              <Printer size={14} />
              <span>In tài liệu</span>
            </button>

            {onEdit && (
              <button
                type="button"
                className="pdf-preview-toolbar-btn"
                onClick={() => {
                  onClose();
                  onEdit(doc);
                }}
                style={{
                  padding: '5px 12px',
                  backgroundColor: '#EFF6FF',
                  color: '#1E40AF',
                  border: '1.5px solid #93C5FD',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Mở sang trang chỉnh sửa quy trình"
              >
                <Edit size={14} />
                <span>Chỉnh sửa</span>
              </button>
            )}

            <button
              type="button"
              className="pdf-preview-toolbar-btn"
              onClick={onClose}
              style={{
                padding: '5px 14px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Đóng cửa sổ xem trước (Phím Esc)"
            >
              <X size={15} />
              <span>Đóng</span>
            </button>
          </div>
        </div>

        {/* VÙNG NỘI DUNG CUỘN (CHỨA CÁC TRANG A4 TRỰC QUAN) */}
        <div
          style={{
            flex: 1,
            padding: '24px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#E9E4DC',
            gap: '24px'
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#7B5233', gap: '10px' }}>
              <div className="iso-spinner" style={{ width: '24px', height: '24px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Đang tải nội dung tài liệu...</span>
            </div>
          ) : selectedDocKey !== 'main' && activeRelatedDoc ? (
            /* TRƯỜNG HỢP XEM TÀI LIỆU / BIỂU MẪU LIÊN QUAN */
            <div
              className="a4-page"
              style={{
                backgroundColor: '#FFFFFF',
                width: '210mm',
                minHeight: '297mm',
                padding: '20mm 15mm',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.16)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: '"Times New Roman", Times, serif',
                color: '#000000',
                lineHeight: '1.5',
                fontSize: '12pt'
              }}
            >
              {/* Header biểu mẫu liên quan */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid black',
                  marginBottom: '20px'
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: '30%',
                        textAlign: 'center',
                        padding: '10px',
                        verticalAlign: 'middle',
                        borderRight: '1.5px solid black'
                      }}
                    >
                      <img src={logoCty} alt="Logo" style={{ height: '52px', objectFit: 'contain' }} />
                    </td>
                    <td
                      style={{
                        width: '70%',
                        textAlign: 'center',
                        padding: '10px',
                        fontWeight: 'bold',
                        fontSize: '13pt',
                        textTransform: 'uppercase',
                        verticalAlign: 'middle'
                      }}
                    >
                      CÔNG TY CỔ PHẦN VINA G7
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: 'center', margin: '30px 0 20px 0' }}>
                <span style={{ fontSize: '11pt', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  TÀI LIỆU / BIỂU MẪU ĐÍNH KÈM QUY TRÌNH {docCode}
                </span>
                <h1
                  style={{
                    fontSize: '16pt',
                    fontWeight: 'bold',
                    margin: '12px 0',
                    textTransform: 'uppercase'
                  }}
                >
                  {activeRelatedDoc.name || activeRelatedDoc.title || 'BIỂU MẪU LIÊN QUAN'}
                </h1>
              </div>

              {/* Bảng chi tiết metadata biểu mẫu */}
              <table
                style={{
                  width: '90%',
                  margin: '0 auto 30px auto',
                  borderCollapse: 'collapse',
                  border: '1px solid black',
                  fontSize: '11pt'
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px 12px', fontWeight: 'bold', width: '35%', backgroundColor: '#F8FAFC' }}>
                      Mã tài liệu / Biểu mẫu:
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px 12px', width: '65%', fontWeight: '600', color: '#1E40AF' }}>
                      {activeRelatedDoc.code || activeRelatedDoc.symbol || '---'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px 12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>
                      Ký hiệu quy chuẩn:
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                      {activeRelatedDoc.symbol || '---'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px 12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>
                      Lần ban hành:
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                      v{activeRelatedDoc.version || '01'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px 12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>
                      Quy trình trực thuộc:
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                      {docCode} - {docName}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px 12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>
                      Trạng thái hiệu lực:
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                      {activeRelatedDoc.status || 'Hiệu lực'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px 12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>
                      Tên file lưu trữ:
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px 12px', wordBreak: 'break-all' }}>
                      {activeRelatedDoc.file_name || activeRelatedDoc.file_path || '---'}
                    </td>
                  </tr>
                  {activeRelatedDoc.note && (
                    <tr>
                      <td style={{ border: '1px solid black', padding: '8px 12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>
                        Phạm vi / Ghi chú:
                      </td>
                      <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                        {activeRelatedDoc.note}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Nút tải file gốc của biểu mẫu */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1.5px dashed #CBD5E1',
                  margin: 'auto 20px 20px 20px'
                }}
              >
                <FileText size={36} color="#7B5233" />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1E293B', marginBottom: '4px' }}>
                    Tài liệu gốc của biểu mẫu này đã sẵn sàng
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    Bạn có thể tải file Word gốc về máy tính để xem hoặc điền biểu mẫu.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#7B5233',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={16} />
                  <span>Tải file gốc của biểu mẫu này</span>
                </button>
              </div>

              {/* Footer trang */}
              <div
                style={{
                  borderTop: '1px solid black',
                  paddingTop: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10pt',
                  marginTop: 'auto'
                }}
              >
                <span>Mã hiệu: {activeRelatedDoc.code || docCode}</span>
                <span>Lần ban hành: v{activeRelatedDoc.version || '01'}</span>
                <span>Quy trình: {docCode}</span>
              </div>
            </div>
          ) : (
            /* TRƯỜNG HỢP XEM QUY TRÌNH CHÍNH (ĐẦY ĐỦ TRANG A4 NHƯ ẢNH 1) */
            <div
              id="iso-pdf-preview-root"
              className="print-document"
              style={{
                fontFamily: '"Times New Roman", Times, serif',
                color: 'black',
                lineHeight: '1.5',
                fontSize: '12pt',
                width: '210mm',
                boxSizing: 'border-box'
              }}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                .print-document, .print-document * {
                  font-family: "Times New Roman", Times, serif !important;
                }
                .a4-page {
                  background-color: white;
                  width: 210mm;
                  min-height: 297mm;
                  padding: 20mm 15mm;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  box-sizing: border-box;
                  margin-bottom: 24px;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                }
                .cover-border-box {
                  border: 2px solid black;
                  padding: 24px;
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  box-sizing: border-box;
                }
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #iso-pdf-preview-root, #iso-pdf-preview-root * {
                    visibility: visible;
                  }
                  #iso-pdf-preview-root {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100% !important;
                  }
                  .a4-page {
                    width: 100% !important;
                    min-height: unset !important;
                    height: auto !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    page-break-after: always !important;
                    break-after: page !important;
                  }
                  .a4-page:last-child {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                  }
                }
              ` }} />

              {/* TRANG 1: TRANG BÌA (COVER PAGE) */}
              <div className="a4-page">
                <div className="cover-border-box">
                  {/* Header Logo & Tên Công Ty */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1.5px solid black',
                      marginBottom: '20px'
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: '30%',
                            textAlign: 'center',
                            padding: '10px',
                            verticalAlign: 'middle',
                            borderRight: '1.5px solid black'
                          }}
                        >
                          <img src={logoCty} alt="Logo" style={{ height: '55px', objectFit: 'contain' }} />
                        </td>
                        <td
                          style={{
                            width: '70%',
                            textAlign: 'center',
                            padding: '10px',
                            fontWeight: 'bold',
                            fontSize: '14pt',
                            textTransform: 'uppercase',
                            verticalAlign: 'middle',
                            letterSpacing: '0.5px'
                          }}
                        >
                          CÔNG TY CỔ PHẦN VINA G7
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Phần giữa: Tiêu đề & Bảng mã hiệu */}
                  <div
                    style={{
                      textAlign: 'center',
                      margin: '40px 0',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                    <h1
                      style={{
                        fontSize: '18pt',
                        fontWeight: 'bold',
                        lineHeight: '1.4',
                        marginBottom: '30px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {docName}
                    </h1>

                    <table
                      style={{
                        width: '75%',
                        margin: '0 auto',
                        borderCollapse: 'collapse',
                        border: '1px dashed black',
                        fontSize: '11pt',
                        textAlign: 'left'
                      }}
                    >
                      <tbody>
                        <tr>
                          <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold', width: '45%' }}>Mã hiệu:</td>
                          <td style={{ border: '1px dashed black', padding: '8px', width: '55%' }}>{docCode}</td>
                        </tr>

                        <tr>
                          <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Lần ban hành:</td>
                          <td style={{ border: '1px dashed black', padding: '8px' }}>{version}</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Ngày ban hành:</td>
                          <td style={{ border: '1px dashed black', padding: '8px' }}>{issueDate || '---'}</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Bộ phận thực hiện:</td>
                          <td style={{ border: '1px dashed black', padding: '8px' }}>{departmentName}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Bảng phân công trách nhiệm phê duyệt 3 cấp */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1.5px solid black',
                      textAlign: 'center',
                      fontSize: '11pt',
                      marginTop: 'auto'
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                        <th style={{ border: '1.5px solid black', padding: '8px', width: '25%' }}>TRÁCH NHIỆM</th>
                        <th style={{ border: '1.5px solid black', padding: '8px', width: '30%' }}>HỌ TÊN</th>
                        <th style={{ border: '1.5px solid black', padding: '8px', width: '25%' }}>CHỨC VỤ</th>
                        <th style={{ border: '1.5px solid black', padding: '8px', width: '20%' }}>KÝ TÊN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>Biên soạn</td>
                        <td style={{ border: '1.5px solid black', padding: '10px' }}>{activeData.editor || activeData.issuer || activeData.owner || 'Ngô Diễm My'}</td>
                        <td style={{ border: '1.5px solid black', padding: '10px' }}>Nhân viên</td>
                        <td style={{ border: '1.5px solid black', padding: '10px', height: '40px' }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>Phê duyệt</td>
                        <td style={{ border: '1.5px solid black', padding: '10px' }}>
                          {(documentLevel === 'Cấp công ty' || activeData.approver_bgd)
                            ? (activeData.approver_bgd || 'Nguyễn Hòa')
                            : (activeData.approver || 'Nguyễn Hòa')}
                        </td>
                        <td style={{ border: '1.5px solid black', padding: '10px' }}>
                          'Ban Giám Đốc'
                        </td>
                        <td style={{ border: '1.5px solid black', padding: '10px', height: '40px' }}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TRANG 2: THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU (NHẬT KÝ SỬA ĐỔI) */}
              <div className="a4-page" style={{ justifyContent: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      margin: '0 0 16px 0',
                      textTransform: 'uppercase',
                      fontSize: '12pt',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  >
                    THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU
                  </h4>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid black',
                      marginBottom: '20px',
                      fontSize: '11pt',
                      textAlign: 'center'
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', height: '34px' }}>
                        <th style={{ border: '1px solid black', padding: '6px', width: '10%' }}>Số TT</th>
                        <th style={{ border: '1px solid black', padding: '6px', width: '20%' }}>Ngày Sửa</th>
                        <th style={{ border: '1px solid black', padding: '6px', width: '55%' }}>Nội Dung Sửa Đổi</th>
                        <th style={{ border: '1px solid black', padding: '6px', width: '15%' }}>Trang Số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLogs.map((log, index) => (
                        <tr key={index} style={{ height: '32px' }}>
                          <td style={{ border: '1px solid black', padding: '4px' }}>{index + 1}</td>
                          <td style={{ border: '1px solid black', padding: '4px' }}>{log.rev_date || ''}</td>
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', paddingLeft: '8px' }}>
                            {log.content || ''}
                          </td>
                          <td style={{ border: '1px solid black', padding: '4px' }}>{log.page_no || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Trang 2 */}
                <div
                  style={{
                    borderTop: '1px solid black',
                    paddingTop: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10pt',
                    marginTop: 'auto'
                  }}
                >
                  <span>Mã hiệu: {docCode}</span>
                  <span>Lần ban hành: {version}</span>
                  <span>Ngày ban hành: {issueDate || '---'}</span>
                  <span>Trang: 2</span>
                </div>
              </div>

              {/* TRANG 3+: CÁC PHẦN NỘI DUNG CHI TIẾT CỦA QUY TRÌNH */}
              {sectionEntries.length > 0 ? (
                sectionEntries.map(([secName, secHtml], sIdx) => (
                  <div key={secName} className="a4-page" style={{ justifyContent: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontSize: '13pt',
                          fontWeight: 'bold',
                          color: '#000000',
                          marginBottom: '14px',
                          borderBottom: '1px solid #E5E7EB',
                          paddingBottom: '6px'
                        }}
                      >
                        {secName}
                      </h3>
                      <div
                        className="iso-section-html-content"
                        style={{
                          fontSize: '11pt',
                          lineHeight: '1.6',
                          color: '#111827'
                        }}
                        dangerouslySetInnerHTML={{ __html: secHtml }}
                      />
                    </div>

                    {/* Footer trang nội dung */}
                    <div
                      style={{
                        borderTop: '1px solid black',
                        paddingTop: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10pt',
                        marginTop: 'auto'
                      }}
                    >
                      <span>Mã hiệu: {docCode}</span>
                      <span>Lần ban hành: {version}</span>
                      <span>Ngày: {issueDate || '---'}</span>
                      <span>Trang: {sIdx + 3}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="a4-page" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ flex: 1, padding: '20px 0' }}>
                    <h3 style={{ fontSize: '13pt', fontWeight: 'bold', marginBottom: '14px' }}>
                      NỘI DUNG QUY TRÌNH
                    </h3>
                    <p style={{ color: '#4B5563', fontStyle: 'italic' }}>
                      Quy trình chưa có nội dung văn bản bóc tách hoặc đang được quản lý trực tiếp bằng file Word gốc. Bạn có thể nhấn <strong>Tải file Word</strong> ở góc phải trên để xem toàn bộ nội dung gốc.
                    </p>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid black',
                      paddingTop: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10pt',
                      marginTop: 'auto'
                    }}
                  >
                    <span>Mã hiệu: {docCode}</span>
                    <span>Lần ban hành: {version}</span>
                    <span>Trang: 3</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default ISOProcessPreviewModal;
