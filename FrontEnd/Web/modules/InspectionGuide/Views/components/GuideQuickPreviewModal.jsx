import React, { useState } from 'react';
import { X, BookOpen, CheckSquare, Image as ImageIcon, Layers, ExternalLink, FileDown } from 'lucide-react';
import api, { getFullImageUrl } from '@webShared/Services/api.service';
import { FormattedTextView } from '@shared/utils/textFormatter';

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
};

const GuideQuickPreviewModal = ({ isOpen = true, onClose, guide, onEdit }) => {
  const [activeImage, setActiveImage] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExportWord = async () => {
    if (!guide) return;
    setExporting(true);
    try {
      const res = await api.get(`/inspection-guides/${guide.id}/export-docx`, { responseType: 'blob' });
      const safeCode = (guide.code || `HD_${guide.id}`).replace(/[\\/*?:"<>|]/g, '_').trim();
      const safeName = (guide.name || 'Tai_lieu').replace(/[\\/*?:"<>|]/g, '_').trim().slice(0, 80);
      const filename = `${safeCode}_${safeName}.docx`;

      const blob = new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Lỗi tải file Word:', err);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen || !guide) return null;

  const totalSubSteps = (guide.steps || []).reduce((acc, s) => acc + (s.sub_steps?.length || 0), 0);
  const totalImages = (guide.steps || []).reduce((acc, s) => acc + (s.images?.length || 0), 0);

  const isSOS = guide.doc_type === 'SOS';
  const isCTQ = guide.doc_type === 'CTQ';
  const themeColor = isSOS ? '#0284C7' : isCTQ ? '#E11D48' : '#7B5233';
  const themeBg = isSOS ? '#F0F9FF' : isCTQ ? '#FFF1F2' : '#FAF6F0';
  const themeBorder = isSOS ? '#BAE6FD' : isCTQ ? '#FECDD3' : '#EADCC9';
  const typeLabel = isSOS ? 'Hướng dẫn thao tác (SOS)' : isCTQ ? 'Lỗi cần chú ý (CTQ)' : 'Hướng dẫn kiểm tra (HDKT)';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9990,
      padding: 24,
      animation: 'fadeIn 0.25s ease-out'
    }} onClick={onClose}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          width: '100%',
          maxWidth: 920,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${themeBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: themeBg
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: themeColor,
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 10px ${themeColor}35`
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  backgroundColor: '#FFFFFF',
                  color: themeColor,
                  border: `1px solid ${themeBorder}`,
                  fontFamily: 'monospace'
                }}>
                  {guide.code}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  backgroundColor: themeColor,
                  color: '#FFFFFF'
                }}>
                  {typeLabel}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: guide.is_active ? '#D1FAE5' : '#FEE2E2',
                  color: guide.is_active ? '#065F46' : '#991B1B'
                }}>
                  {guide.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
              </div>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: '#2D1A12', fontWeight: 800 }}>
                {guide.name}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleExportWord}
              disabled={exporting}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                color: themeColor,
                border: `1px solid ${themeBorder}`,
                fontSize: 13,
                fontWeight: 700,
                cursor: exporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                opacity: exporting ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              title="Xuất tài liệu này ra file Word (.docx) chuẩn ISO"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = themeBg}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              <FileDown size={15} /> {exporting ? 'Đang xuất...' : 'Xuất file Word'}
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(guide.id);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: themeColor,
                  color: '#FFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                  boxShadow: `0 2px 8px ${themeColor}30`
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              >
                <ExternalLink size={15} /> Soạn thảo {guide.doc_type || 'tài liệu'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#F1F5F9',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Meta Badges */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          fontSize: 13,
          color: '#64748B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={15} color="#7B5233" />
            <span><strong>{(guide.steps || []).length}</strong> bước lớn</span>
          </div>
          {totalSubSteps > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckSquare size={15} color="#059669" />
              <span><strong>{totalSubSteps}</strong> bước nhỏ / tiêu chí</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ImageIcon size={15} color="#2563EB" />
            <span><strong>{totalImages}</strong> ảnh minh họa</span>
          </div>
          {guide.description && (
            <div style={{ width: '100%', marginTop: 4, color: '#4B5563', fontStyle: 'italic', fontSize: 13.5 }}>
              "{stripHtml(guide.description)}"
            </div>
          )}
        </div>

        {/* Steps Content Scrollable */}
        <div style={{
          padding: 24,
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          backgroundColor: '#FAF8F6'
        }}>
          {(!guide.steps || guide.steps.length === 0) ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: '#FFF',
              borderRadius: 12,
              border: '1px dashed #D1D5DB',
              color: '#9CA3AF'
            }}>
              <BookOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Tài liệu này chưa có bước kiểm tra nào.</p>
            </div>
          ) : (
            guide.steps.map((step, idx) => (
              <div
                key={step.id || idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 20,
                  border: '1px solid #EADCC9',
                  boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)'
                }}
              >
                {/* Step Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: themeColor,
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {step.step_no || idx + 1}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#2D1A12', fontWeight: 700 }}>
                    {step.title}
                  </h3>
                </div>

                {/* Step Description */}
                {step.content && (
                  <div style={{
                    margin: '0 0 16px 0',
                    backgroundColor: '#FAF8F6',
                    padding: '10px 14px',
                    borderRadius: 8,
                    borderLeft: `3.5px solid ${themeColor}`
                  }}>
                    <FormattedTextView text={step.content} />
                  </div>
                )}

                {/* Sub-steps checklist */}
                {step.sub_steps && step.sub_steps.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#059669', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckSquare size={14} /> Các bước nhỏ / Tiêu chí & Phân nhánh ({step.sub_steps.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {step.sub_steps.map((sub, sIdx) => (
                        <div
                          key={sub.id || sIdx}
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: 10,
                            border: '1px solid #F3F4F6',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              fontSize: 11,
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              flexShrink: 0
                            }}>
                              {step.step_no}.{sub.sub_step_no || sIdx + 1}
                            </span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1F2937' }}>
                              {sub.title || sub.content}
                            </span>
                          </div>

                          {sub.content && sub.title && (
                            <div style={{
                              marginLeft: 26,
                              padding: '6px 10px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: 6,
                              borderLeft: '2.5px solid #059669'
                            }}>
                              <FormattedTextView text={sub.content} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step Images Grid */}
                {step.images && step.images.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: themeColor, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ImageIcon size={14} /> Ảnh minh họa tiêu chuẩn ({step.images.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                      {step.images.map((img, imgIdx) => (
                        <div
                          key={img.id || imgIdx}
                          onClick={() => setActiveImage(img)}
                          style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: 8,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '1.5px solid #E5E7EB',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = themeColor;
                            e.currentTarget.style.transform = 'scale(1.03)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#E5E7EB';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <img
                            src={getFullImageUrl(img.image_url)}
                            alt={img.file_name || `Ảnh ${imgIdx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                            padding: '12px 6px 4px 6px',
                            color: '#FFF',
                            fontSize: 10,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {img.file_name || `Ảnh #${imgIdx + 1}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #EADCC9',
          backgroundColor: '#FAF8F6',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFF',
              color: '#374151',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Lightbox zoom image modal */}
      {activeImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 30,
            animation: 'fadeIn 0.2s'
          }}
          onClick={() => setActiveImage(null)}
        >
          <button
            onClick={() => setActiveImage(null)}
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <img
              src={getFullImageUrl(activeImage.image_url)}
              alt={activeImage.file_name}
              style={{
                maxWidth: '100%',
                maxHeight: '82vh',
                borderRadius: 10,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
            />
            <p style={{ color: '#E5E7EB', marginTop: 12, fontSize: 14, fontWeight: 600 }}>
              {activeImage.file_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideQuickPreviewModal;
