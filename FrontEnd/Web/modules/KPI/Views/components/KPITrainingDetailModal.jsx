import React, { useState, useMemo } from 'react';
import { X, FileText, Calendar, User, Users, Download, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { getFullImageUrl } from '@webShared/Services/api.service';
import '@styles/components.css';

/**
 * KPITrainingDetailModal
 * - Hiển thị thông tin chi tiết kế hoạch đào tạo
 * - Nếu có file thật (fileUrl) → nhúng iframe xem trực tiếp nội dung file thật
 * - Nếu không có file → không hiển thị phần xem trước
 * - Nút "Mở trang riêng" → window.open file thật ra tab mới
 */
const KPITrainingDetailModal = ({ isOpen, onClose, planData }) => {
  if (!isOpen || !planData) return null;

  const [showPreview, setShowPreview] = useState(true);
  const rawFileUrl = planData.fileUrl || (planData.fileName ? (planData.fileName.startsWith('http') || planData.fileName.startsWith('/') ? planData.fileName : `/uploads/${planData.fileName}`) : null);

  const fileUrl = useMemo(() => {
    if (!rawFileUrl) return null;
    if (rawFileUrl.startsWith('data:') || rawFileUrl.startsWith('blob:')) return rawFileUrl;
    try {
      return getFullImageUrl(encodeURI(rawFileUrl));
    } catch (e) {
      return getFullImageUrl(rawFileUrl);
    }
  }, [rawFileUrl]);

  const hasRealFile = !!(planData.fileUrl || planData.fileName);

  // Determine preview type from file extension
  const fileExtension = useMemo(() => {
    const name = planData.fileName || '';
    const ext = name.split('.').pop()?.toLowerCase();
    return ext || 'pdf';
  }, [planData.fileName]);

  const canPreviewInBrowser = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp', 'txt', 'html'].includes(fileExtension);

  const handleOpenNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownload = () => {
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = planData.fileName || 'TaiLieu.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '12px', boxSizing: 'border-box'
    }} onClick={onClose}>
      
      <div style={{
        margin: 'auto',
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        width: '100%',
        maxWidth: hasRealFile && showPreview ? '920px' : '600px',
        maxHeight: '94vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'max-width 0.3s ease'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* ──── HEADER ──── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #EADCC9',
          backgroundColor: '#FAF6F0',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#5D3B32', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#5D3B32', fontWeight: '800' }}>
              Chi Tiết Kế Hoạch Đào Tạo
            </h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* ──── BODY ──── */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          
          {/* Course title + badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.73rem', fontWeight: '800', backgroundColor: '#5D3B32', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>
                {planData.code}
              </span>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1E293B', marginTop: '4px' }}>
                {planData.name || 'Chương trình đào tạo'}
              </div>
            </div>
            <span style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap',
              backgroundColor: planData.status === 'Đã hoàn thành' ? '#DCFCE7' : '#FEF3C7',
              color: planData.status === 'Đã hoàn thành' ? '#15803D' : '#B45309'
            }}>
              {planData.status || 'Sắp diễn ra'}
            </span>
          </div>

          {/* Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <InfoCard icon={<User size={13} />} label="Giảng viên" value={planData.teacher || '—'} />
            <InfoCard icon={<Calendar size={13} />} label="Thời gian" value={planData.time || '—'} />
            <InfoCard icon={<Users size={13} />} label="Đối tượng" value={planData.target || '—'} />
          </div>

          {/* ──── FILE SECTION ──── */}
          <div style={{
            backgroundColor: '#5D3B32', color: '#FFFFFF',
            padding: '10px 16px', borderRadius: '10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '800' }}>
              <FileText size={16} />
              <span>Tài Liệu:</span>
              <span style={{ color: '#FDE68A' }}>{planData.fileName || 'Chưa có file'}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

              {/* Toggle preview */}
              {hasRealFile && (
                <ToolbarBtn
                  icon={showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                  label={showPreview ? 'Ẩn xem trước' : 'Xem trước'}
                  bg={showPreview ? '#FFFFFF' : 'rgba(255,255,255,0.2)'}
                  color={showPreview ? '#5D3B32' : '#FFFFFF'}
                  onClick={() => setShowPreview(v => !v)}
                />
              )}

              {/* Open in new tab */}
              {hasRealFile && (
                <ToolbarBtn
                  icon={<ExternalLink size={14} />}
                  label="Mở trang riêng"
                  bg="#2563EB" color="#FFFFFF"
                  onClick={handleOpenNewTab}
                />
              )}

              {/* Download */}
              {hasRealFile && (
                <ToolbarBtn
                  icon={<Download size={14} />}
                  label="Tải file"
                  bg="#D97706" color="#FFFFFF"
                  onClick={handleDownload}
                />
              )}
            </div>
          </div>

          {/* ──── LIVE FILE PREVIEW (IFRAME) ──── */}
          {hasRealFile && showPreview && (
            <div style={{
              border: '1px solid #CBD5E1', borderRadius: '10px',
              overflow: 'hidden', backgroundColor: '#E2E8F0'
            }}>

              {/* Browser-like bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#1E293B', color: '#94A3B8',
                fontSize: '0.72rem', fontWeight: '700'
              }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22C55E' }} />
                </div>
                <div style={{
                  flex: 1, backgroundColor: '#334155', borderRadius: '4px',
                  padding: '3px 8px', fontSize: '0.7rem', color: '#94A3B8',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  📄 {planData.fileName}
                </div>
                <button
                  onClick={handleOpenNewTab}
                  style={{ border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                  title="Mở trong tab mới"
                >
                  <ExternalLink size={14} />
                </button>
              </div>

              {/* Iframe showing actual file content */}
              {canPreviewInBrowser ? (
                <iframe
                  src={fileUrl}
                  title={`Xem trước: ${planData.fileName}`}
                  style={{ width: '100%', height: '450px', border: 'none', display: 'block', backgroundColor: '#FFFFFF' }}
                />
              ) : (
                <div style={{
                  padding: '40px 20px', textAlign: 'center', backgroundColor: '#FFFFFF'
                }}>
                  <FileText size={48} style={{ color: '#CBD5E1', marginBottom: '12px' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#475569' }}>
                    Định dạng <strong>.{fileExtension}</strong> không hỗ trợ xem trước trực tiếp trong trình duyệt.
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                    Vui lòng bấm <strong>"Mở trang riêng"</strong> hoặc <strong>"Tải file"</strong> để xem nội dung.
                  </div>
                  <button
                    onClick={handleOpenNewTab}
                    style={{
                      marginTop: '12px', padding: '8px 20px',
                      backgroundColor: '#2563EB', color: '#FFFFFF',
                      border: 'none', borderRadius: '8px',
                      fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <ExternalLink size={15} /> Mở trong trang riêng
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No file attached message */}
          {!hasRealFile && (
            <div style={{
              padding: '24px', textAlign: 'center',
              backgroundColor: '#FEF3C7', borderRadius: '10px',
              border: '1px solid #FCD34D'
            }}>
              <FileText size={36} style={{ color: '#D97706', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#92400E' }}>
                Chưa có file tài liệu được đính kèm
              </div>
              <div style={{ fontSize: '0.78rem', color: '#A16207', marginTop: '2px' }}>
                Hãy bấm nút ✏️ Chỉnh sửa để upload file tài liệu PDF, DOCX hoặc hình ảnh.
              </div>
            </div>
          )}

        </div>

        {/* ──── FOOTER ──── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 20px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          flexShrink: 0
        }}>
          {hasRealFile ? (
            <button
              onClick={handleOpenNewTab}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 16px',
                backgroundColor: '#EFF6FF', color: '#2563EB',
                border: '1px solid #BFDBFE', borderRadius: '8px',
                fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer'
              }}
            >
              <ExternalLink size={15} /> Xem trên tab riêng
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            style={{
              padding: '7px 22px',
              backgroundColor: '#5D3B32', color: '#FFFFFF',
              border: 'none', borderRadius: '8px',
              fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer'
            }}
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

const InfoCard = ({ icon, label, value }) => (
  <div style={{ padding: '10px 12px', backgroundColor: '#FAF6F0', borderRadius: '8px', border: '1px solid #EADCC9' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#7B5233', fontWeight: '700' }}>
      {icon} {label}
    </div>
    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D3B32', marginTop: '3px' }}>
      {value}
    </div>
  </div>
);

const ToolbarBtn = ({ icon, label, bg, color, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '5px 12px',
      backgroundColor: bg, color: color,
      border: 'none', borderRadius: '6px',
      fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer'
    }}
  >
    {icon} {label}
  </button>
);

export default KPITrainingDetailModal;
