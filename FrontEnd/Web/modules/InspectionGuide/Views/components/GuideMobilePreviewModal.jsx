import React, { useState } from 'react';
import { X, Smartphone, ChevronLeft, ChevronRight, CheckCircle2, Circle, Image as ImageIcon } from 'lucide-react';

const GuideMobilePreviewModal = ({ isOpen, onClose, guide }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [checkedSubSteps, setCheckedSubSteps] = useState({});

  if (!isOpen || !guide) return null;

  const steps = guide.steps || [];
  const currentStep = steps[currentStepIdx] || null;

  const toggleCheck = (id) => {
    setCheckedSubSteps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9995,
      padding: 20,
      animation: 'fadeIn 0.25s ease-out'
    }} onClick={onClose}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 380,
          marginBottom: 12,
          color: '#FFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={20} color="#EADCC9" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Mô phỏng Giao diện Mobile QC</span>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Phone Mockup Frame */}
        <div style={{
          width: 380,
          height: 680,
          backgroundColor: '#1E1E1E',
          borderRadius: 44,
          padding: 12,
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.1)',
          position: 'relative'
        }}>
          {/* Inner Screen */}
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#FAF8F6',
            borderRadius: 34,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            fontFamily: 'Inter, sans-serif'
          }}>
            {/* Phone Notch / Status Bar */}
            <div style={{
              height: 28,
              backgroundColor: '#7B5233',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              color: '#FFF',
              fontSize: 11,
              fontWeight: 600
            }}>
              <span>09:41</span>
              <div style={{
                width: 80,
                height: 14,
                backgroundColor: '#1E1E1E',
                borderRadius: 10,
                marginTop: -4
              }} />
              <span>5G 100%</span>
            </div>

            {/* Mobile App Header */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#7B5233',
              color: '#FFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Hướng dẫn SOP • {guide.code}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {guide.name}
              </div>
            </div>

            {/* Step Pills Navigator */}
            {steps.length > 0 && (
              <div style={{
                display: 'flex',
                gap: 6,
                padding: '8px 12px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #EADCC9',
                overflowX: 'auto',
                scrollbarWidth: 'none'
              }}>
                {steps.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    onClick={() => setCurrentStepIdx(idx)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: 'none',
                      backgroundColor: currentStepIdx === idx ? '#7B5233' : '#F1F5F9',
                      color: currentStepIdx === idx ? '#FFF' : '#64748B',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}
                  >
                    Bước {s.step_no || idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Mobile Screen Body */}
            <div style={{
              flex: 1,
              padding: 14,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              {steps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#9CA3AF', fontSize: 13 }}>
                  Chưa có bước kiểm tra nào trong SOP.
                </div>
              ) : currentStep ? (
                <>
                  {/* Step Card */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    padding: 14,
                    border: '1px solid #EADCC9',
                    boxShadow: '0 2px 6px rgba(123, 82, 51, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: '#7B5233',
                        color: '#FFF',
                        fontSize: 12,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {currentStep.step_no || currentStepIdx + 1}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#2D1A12' }}>
                        {currentStep.title}
                      </div>
                    </div>

                    {currentStep.content && (
                      <div style={{
                        fontSize: 12.5,
                        color: '#4B5563',
                        lineHeight: '1.5',
                        backgroundColor: '#FAF8F6',
                        padding: '8px 10px',
                        borderRadius: 6,
                        borderLeft: '3px solid #7B5233',
                        whiteSpace: 'pre-line'
                      }}>
                        {currentStep.content}
                      </div>
                    )}
                  </div>

                  {/* Interactive Sub-steps Checklist */}
                  {currentStep.sub_steps && currentStep.sub_steps.length > 0 && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      padding: 12,
                      border: '1px solid #EADCC9'
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 8 }}>
                        Các bước nhỏ / Tiêu chí ({currentStep.sub_steps.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {currentStep.sub_steps.map((sub, sIdx) => {
                          const isDone = Boolean(checkedSubSteps[sub.id || sIdx]);
                          return (
                            <div
                              key={sub.id || sIdx}
                              onClick={() => toggleCheck(sub.id || sIdx)}
                              style={{
                                padding: '10px 12px',
                                backgroundColor: isDone ? '#ECFDF5' : '#F9FAFB',
                                borderRadius: 10,
                                border: isDone ? '1.5px solid #10B981' : '1px solid #E5E7EB',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                {isDone ? (
                                  <CheckCircle2 size={18} color="#059669" style={{ marginTop: 1, flexShrink: 0 }} />
                                ) : (
                                  <Circle size={18} color="#9CA3AF" style={{ marginTop: 1, flexShrink: 0 }} />
                                )}
                                <div style={{ flex: 1 }}>
                                  <span style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: isDone ? '#065F46' : '#1F2937',
                                    lineHeight: '1.4',
                                    textDecoration: isDone ? 'line-through' : 'none'
                                  }}>
                                    <strong style={{ marginRight: 6 }}>{currentStep.step_no}.{sub.sub_step_no || sIdx + 1}</strong>
                                    {sub.title || sub.content}
                                  </span>
                                </div>
                              </div>

                              {sub.content && sub.title && (
                                <div style={{
                                  marginLeft: 26,
                                  fontSize: 12,
                                  color: isDone ? '#047857' : '#4B5563',
                                  lineHeight: '1.45',
                                  whiteSpace: 'pre-line',
                                  padding: '6px 8px',
                                  backgroundColor: isDone ? '#D1FAE5' : '#FFFFFF',
                                  borderRadius: 6,
                                  borderLeft: '2px solid #059669',
                                  opacity: isDone ? 0.85 : 1
                                }}>
                                  {sub.content}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Images Horizontal Carousel */}
                  {currentStep.images && currentStep.images.length > 0 && (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      padding: 12,
                      border: '1px solid #EADCC9'
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#7B5233', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ImageIcon size={13} /> Hình ảnh mẫu ({currentStep.images.length})
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        paddingBottom: 4
                      }}>
                        {currentStep.images.map((img, imgIdx) => (
                          <div
                            key={img.id || imgIdx}
                            style={{
                              width: 140,
                              height: 140,
                              borderRadius: 8,
                              overflow: 'hidden',
                              flexShrink: 0,
                              border: '1px solid #E5E7EB'
                            }}
                          >
                            <img
                              src={img.image_url}
                              alt={img.file_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Mobile Bottom Step Navigation */}
            {steps.length > 1 && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#FFFFFF',
                borderTop: '1px solid #EADCC9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  disabled={currentStepIdx === 0}
                  onClick={() => setCurrentStepIdx(p => Math.max(0, p - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFF',
                    color: currentStepIdx === 0 ? '#9CA3AF' : '#374151',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: currentStepIdx === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7B5233' }}>
                  {currentStepIdx + 1} / {steps.length}
                </span>
                <button
                  disabled={currentStepIdx === steps.length - 1}
                  onClick={() => setCurrentStepIdx(p => Math.min(steps.length - 1, p + 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: currentStepIdx === steps.length - 1 ? '#E5E7EB' : '#7B5233',
                    color: currentStepIdx === steps.length - 1 ? '#9CA3AF' : '#FFF',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: currentStepIdx === steps.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  Tiếp <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideMobilePreviewModal;
