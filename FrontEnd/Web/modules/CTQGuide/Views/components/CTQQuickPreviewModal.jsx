import React, { useState } from 'react';
import {
  X, AlertTriangle, ExternalLink, ZoomIn, Image as ImageIcon
} from 'lucide-react';
import { getFullImageUrl } from '@webShared/Services/api.service';
import { FormattedTextView } from '@shared/utils/textFormatter';

const THEME = {
  primary: '#7B5233',
  hover: '#5D3B32',
  bgLight: '#FAF6F0',
  borderLight: '#EADCC9'
};

const parseStageAndDesc = (description) => {
  if (!description) return { stage: '', cleanDesc: '' };
  const match = description.match(/^\[Công đoạn:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return {
      stage: match[1].trim(),
      cleanDesc: match[2].trim()
    };
  }
  return { stage: '', cleanDesc: description };
};

const CTQQuickPreviewModal = ({ guide, onClose, onEdit }) => {
  const [lightboxImg, setLightboxImg] = useState(null);

  if (!guide) return null;

  const { stage, cleanDesc } = parseStageAndDesc(guide.description);
  const images = (guide.steps || []).reduce((acc, st) => [...acc, ...(st.images || [])], []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 880,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(123, 82, 51, 0.25)',
        border: `1.5px solid ${THEME.borderLight}`,
        overflow: 'hidden'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: `1.5px solid ${THEME.borderLight}`,
          backgroundColor: THEME.bgLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: THEME.primary,
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(123, 82, 51, 0.2)'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: '#FFFFFF',
                  color: THEME.primary,
                  border: `1px solid ${THEME.borderLight}`,
                  fontWeight: 800,
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}>
                  {guide.code}
                </span>
                {stage && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    fontWeight: 700,
                    fontSize: 11.5
                  }}>
                    ⚙️ {stage}
                  </span>
                )}
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: THEME.primary,
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: 11
                }}>
                  LỖI CẦN CHÚ Ý (CTQ)
                </span>
              </div>
              <h2 style={{ margin: '3px 0 0 0', fontSize: '1.25rem', color: '#1E293B', fontWeight: 800 }}>
                {guide.name}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(guide);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: THEME.primary,
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.hover}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = THEME.primary}
              >
                <ExternalLink size={15} /> Chỉnh sửa CTQ
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${THEME.borderLight}`,
                backgroundColor: '#FFF',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Content Description */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase', marginBottom: 8 }}>
              Hiện tượng lỗi, Nguyên nhân & Tiêu chuẩn xử lý phòng ngừa:
            </h4>
            <div style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: '#FAFAFA',
              border: '1px solid #E2E8F0',
              fontSize: 14,
              lineHeight: '1.6',
              color: '#334155'
            }}>
              {cleanDesc ? (
                <FormattedTextView text={cleanDesc} />
              ) : (
                <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Chưa có nội dung mô tả chi tiết cho lỗi này.</span>
              )}
            </div>
          </div>

          {/* Images */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ImageIcon size={18} style={{ color: THEME.primary }} />
              <h4 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase' }}>
                Thư viện Ảnh mẫu đối chứng ({images.length} ảnh):
              </h4>
            </div>

            {images.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 14
              }}>
                {images.map((img, i) => {
                  const fullUrl = getFullImageUrl(img.image_url);
                  return (
                    <div
                      key={img.id || i}
                      onClick={() => setLightboxImg(fullUrl)}
                      style={{
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1.5px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        cursor: 'pointer',
                        position: 'relative',
                        aspectRatio: '4/3',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                      }}
                    >
                      <img
                        src={fullUrl}
                        alt={`Ảnh mẫu CTQ #${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '4px 8px',
                        background: 'rgba(0,0,0,0.65)',
                        color: '#FFF',
                        fontSize: 11,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>Ảnh #{i + 1}</span>
                        <ZoomIn size={13} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: 24,
                borderRadius: 10,
                backgroundColor: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: 13
              }}>
                Chưa có hình ảnh đối chứng cho lỗi này.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={lightboxImg}
            alt="Phóng to ảnh"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
};

export default CTQQuickPreviewModal;
