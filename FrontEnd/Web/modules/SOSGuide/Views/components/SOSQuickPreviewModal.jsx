import React, { useState } from 'react';
import {
  X, FileText, CheckCircle2, ChevronRight, Calendar,
  User, ExternalLink, ZoomIn, ShieldCheck, Sparkles
} from 'lucide-react';
import { getFullImageUrl } from '@webShared/Services/api.service';
import { FormattedTextView } from '@shared/utils/textFormatter';

const THEME = {
  primary: '#7B5233',
  hover: '#5D3B32',
  bgLight: '#FAF6F0',
  borderLight: '#EADCC9'
};

const SOSQuickPreviewModal = ({ guide, onClose, onEdit }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

  if (!guide) return null;

  const steps = guide.steps || [];
  const currentStep = steps[activeStepIndex] || steps[0] || null;
  const currentImages = currentStep?.images || [];

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
        maxWidth: 1080,
        maxHeight: '92vh',
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
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: THEME.primary,
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: THEME.primary,
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: 11
                }}>
                  HƯỚNG DẪN THAO TÁC (SOS)
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
                <ExternalLink size={15} /> Chỉnh sửa SOS
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
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 480 }}>
          {/* Left: Step Navigator */}
          <div style={{
            width: 300,
            borderRight: '1px solid #E2E8F0',
            backgroundColor: '#FAFAFA',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0', fontSize: 12, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase' }}>
              Quy trình {steps.length} bước thao tác
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((step, idx) => {
                const isSelected = idx === activeStepIndex;
                return (
                  <div
                    key={step.id || idx}
                    onClick={() => setActiveStepIndex(idx)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: isSelected ? `2px solid ${THEME.primary}` : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? THEME.bgLight : '#FFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 4px 12px rgba(123, 82, 51, 0.12)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: isSelected ? THEME.primary : '#64748B'
                      }}>
                        BƯỚC {step.step_no || idx + 1}
                      </span>
                      {step.images && step.images.length > 0 && (
                        <span style={{ fontSize: 11, color: THEME.primary, fontWeight: 700, backgroundColor: THEME.bgLight, border: `1px solid ${THEME.borderLight}`, padding: '1px 6px', borderRadius: 4 }}>
                          {step.images.length} ảnh
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: isSelected ? THEME.primary : '#1E293B',
                      lineHeight: '1.4'
                    }}>
                      {step.title || 'Chưa đặt tên bước'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Step Content & Photos */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 24 }}>
            {currentStep ? (
              <div>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  backgroundColor: THEME.bgLight,
                  border: `1px solid ${THEME.borderLight}`,
                  marginBottom: 20
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase' }}>
                    Nội dung thao tác Bước {currentStep.step_no || activeStepIndex + 1}
                  </div>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: '#1E293B', fontWeight: 800 }}>
                    {currentStep.title || 'Chưa đặt tên bước'}
                  </h3>
                </div>

                {/* Content */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase', marginBottom: 8 }}>
                    Hướng dẫn chi tiết & Lưu ý an toàn lao động:
                  </h4>
                  <div style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #E2E8F0',
                    fontSize: 14.5,
                    lineHeight: '1.6',
                    color: '#334155'
                  }}>
                    {currentStep.content ? (
                      <FormattedTextView text={currentStep.content} />
                    ) : (
                      <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Chưa có nội dung mô tả chi tiết cho bước này.</span>
                    )}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase', marginBottom: 10 }}>
                    Hình ảnh minh họa thao tác chuẩn ({currentImages.length}):
                  </h4>
                  {currentImages.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 14
                    }}>
                      {currentImages.map((img, i) => (
                        <div
                          key={img.id || i}
                          onClick={() => setLightboxImg(img.image_url)}
                          style={{
                            borderRadius: 10,
                            overflow: 'hidden',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#000',
                            cursor: 'pointer',
                            position: 'relative',
                            aspectRatio: '4/3'
                          }}
                        >
                          <img
                            src={getFullImageUrl(img.image_url)}
                            alt={`Ảnh thao tác ${currentStep.step_no}`}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '4px 8px',
                            background: 'rgba(0,0,0,0.6)',
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
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: 20,
                      borderRadius: 10,
                      backgroundColor: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      textAlign: 'center',
                      color: '#94A3B8',
                      fontSize: 13
                    }}>
                      Chưa có hình ảnh minh họa cho bước thao tác này.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                Tài liệu này chưa có bước thao tác nào.
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
            src={getFullImageUrl(lightboxImg)}
            alt="Phóng to ảnh"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
};

export default SOSQuickPreviewModal;
