import React, { useState } from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Loader2, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Maximize2, 
  X 
} from 'lucide-react';
import SopStandardRenderer, { getCleanStepNote, getCleanStepTitle } from './SopStandardRenderer';

/**
 * Bảng hiển thị các bước kiểm tra SOP được thiết kế gọn gàng, thẩm mỹ và trực quan.
 * Mặc định ở trạng thái THU GỌN (defaultExpanded = false), người dùng nhấn "Xem chi tiết" để mở rộng xem các bước.
 */
export const SopStepsTable = ({
  steps = [],
  loading = false,
  emptyMessage = 'Phiếu kiểm tra này không có danh sách các bước SOP chi tiết.',
  maxHeight = '340px',
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#F8FAFC',
        borderRadius: '8px',
        border: '1px dashed #CBD5E1',
        color: '#64748B',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '12px',
        marginBottom: '12px'
      }}>
        <Loader2 size={16} className="animate-spin" color="#64748B" />
        <span style={{ fontWeight: 600 }}>Đang nạp danh sách các bước kiểm tra SOP...</span>
      </div>
    );
  }

  const hasSteps = Array.isArray(steps) && steps.length > 0;
  const failedSteps = hasSteps
    ? steps.filter(s => s.result === 'fail' || s.result === 'Lỗi' || s.status === 'FAIL')
    : [];
  const isAllPassed = hasSteps && failedSteps.length === 0;

  if (!hasSteps) {
    return (
      <div style={{
        marginTop: '12px',
        marginBottom: '12px',
        padding: '10px 14px',
        backgroundColor: '#F8FAFC',
        borderRadius: '8px',
        border: '1px dashed #CBD5E1',
        color: '#64748B',
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Info size={14} color="#94A3B8" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  // Component render nội dung bảng
  const renderTableContent = (customMaxHeight = maxHeight) => (
    <div className="sop-standard-scroll" style={{
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      maxHeight: customMaxHeight,
      overflowY: 'auto',
      backgroundColor: '#FFFFFF'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{
            backgroundColor: '#F8FAFC',
            borderBottom: '1.5px solid #E2E8F0',
            position: 'sticky',
            top: 0,
            zIndex: 2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <th style={{
              padding: '8px 6px',
              textAlign: 'center',
              color: '#475569',
              fontWeight: 800,
              fontSize: '0.72rem',
              width: '48px',
              letterSpacing: '0.4px'
            }}>
              BƯỚC
            </th>
            <th style={{
              padding: '8px 12px',
              textAlign: 'left',
              color: '#475569',
              fontWeight: 800,
              fontSize: '0.72rem',
              width: '180px',
              minWidth: '140px',
              letterSpacing: '0.4px'
            }}>
              HẠNG MỤC / MÔ TẢ
            </th>
            <th style={{
              padding: '8px 12px',
              textAlign: 'left',
              color: '#475569',
              fontWeight: 800,
              fontSize: '0.72rem',
              letterSpacing: '0.4px'
            }}>
              TIÊU CHUẨN KỸ THUẬT
            </th>
            <th style={{
              padding: '8px 10px',
              textAlign: 'center',
              color: '#475569',
              fontWeight: 800,
              fontSize: '0.72rem',
              width: '95px',
              letterSpacing: '0.4px'
            }}>
              KẾT QUẢ
            </th>
          </tr>
        </thead>
        <tbody>
          {steps.map((st, idx) => {
            const stepNo = st.step_no || st.step || idx + 1;
            const rawTitle = st.title || st.name || st.description || `Bước ${stepNo}`;
            const cleanTitle = getCleanStepTitle(rawTitle, stepNo);
            const standard = st.standard || st.content || '';
            const isFail = st.result === 'fail' || st.result === 'Lỗi' || st.status === 'FAIL';
            const cleanNote = getCleanStepNote(st.note, standard, st.content, rawTitle);

            return (
              <tr
                key={idx}
                style={{
                  borderBottom: idx < steps.length - 1 ? '1px solid #F1F5F9' : 'none',
                  backgroundColor: isFail ? '#FFF7F7' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD'),
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isFail ? '#FEE2E2' : '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isFail ? '#FFF7F7' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD')}
              >
                {/* CỘT 1: SỐ THỨ TỰ BƯỚC */}
                <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'top' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: isFail ? '#FEE2E2' : '#F1F5F9',
                    color: isFail ? '#DC2626' : '#475569',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    border: `1px solid ${isFail ? '#FECDD3' : '#E2E8F0'}`
                  }}>
                    {String(stepNo).padStart(2, '0')}
                  </span>
                </td>

                {/* CỘT 2: TIÊU ĐỀ BƯỚC + GHI CHÚ (NẾU CÓ) */}
                <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                  <div style={{
                    fontWeight: 600,
                    color: isFail ? '#991B1B' : '#0F172A',
                    fontSize: '0.82rem',
                    lineHeight: 1.4
                  }}>
                    {cleanTitle}
                  </div>
                  {cleanNote && (
                    <div style={{
                      marginTop: '4px',
                      display: 'inline-flex',
                      alignItems: 'flex-start',
                      gap: '4px',
                      padding: '2px 6px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      color: '#475569',
                      border: '1px solid #E2E8F0',
                      lineHeight: 1.35
                    }}>
                      <FileText size={11} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{cleanNote}</span>
                    </div>
                  )}
                </td>

                {/* CỘT 3: TIÊU CHUẨN KỸ THUẬT */}
                <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                  <SopStandardRenderer standard={standard} />
                </td>

                {/* CỘT 4: KẾT QUẢ ĐẠT / KHÔNG ĐẠT */}
                <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: isFail ? '#FFF1F2' : '#ECFDF5',
                    color: isFail ? '#E11D48' : '#059669',
                    border: `1px solid ${isFail ? '#FECDD3' : '#A7F3D0'}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    whiteSpace: 'nowrap'
                  }}>
                    {isFail ? (
                      <>
                        <XCircle size={12} strokeWidth={2.5} color="#E11D48" />
                        <span>Không đạt</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} strokeWidth={2.5} color="#059669" />
                        <span>Đạt</span>
                      </>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Component render dạng danh sách thẻ tối ưu cho Mobile (dễ nhìn, dễ đọc)
  const renderMobileCards = () => (
    <div style={{ padding: '10px 10px 4px 10px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#FAF8F5' }}>
      {steps.map((st, idx) => {
        const stepNo = st.step_no || st.step || idx + 1;
        const rawTitle = st.title || st.name || st.description || `Bước ${stepNo}`;
        const cleanTitle = getCleanStepTitle(rawTitle, stepNo);
        const standard = st.standard || st.content || '';
        const isFail = st.result === 'fail' || st.result === 'Lỗi' || st.status === 'FAIL';
        const cleanNote = getCleanStepNote(st.note, standard, st.content, rawTitle);

        return (
          <div
            key={idx}
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${isFail ? '#FECDD3' : '#EADCC9'}`,
              borderRadius: '10px',
              padding: '10px 12px',
              boxShadow: '0 1px 3px rgba(45, 26, 18, 0.04)'
            }}
          >
            {/* Header: Số thứ tự + Hạng mục + Kết quả Đạt/Không đạt */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: standard ? '8px' : '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: isFail ? '#FEE2E2' : '#F5EFE8',
                  color: isFail ? '#DC2626' : '#5D4037',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  border: `1px solid ${isFail ? '#FECDD3' : '#D8CCC0'}`,
                  flexShrink: 0
                }}>
                  {String(stepNo).padStart(2, '0')}
                </span>
                <span style={{
                  fontWeight: 700,
                  color: isFail ? '#991B1B' : '#2D1A12',
                  fontSize: '0.86rem'
                }}>
                  {cleanTitle}
                </span>
              </div>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: isFail ? '#FFF1F2' : '#ECFDF5',
                color: isFail ? '#E11D48' : '#059669',
                border: `1px solid ${isFail ? '#FECDD3' : '#A7F3D0'}`,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                {isFail ? (
                  <>
                    <XCircle size={12} strokeWidth={2.5} color="#E11D48" />
                    <span>Không đạt</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} strokeWidth={2.5} color="#059669" />
                    <span>Đạt</span>
                  </>
                )}
              </span>
            </div>

            {/* Khối Tiêu chuẩn kỹ thuật: Trải rộng 100% chiều ngang màn hình, không bị bóp chữ */}
            {standard && (
              <div style={{
                backgroundColor: isFail ? '#FEF2F2' : '#FAF7F2',
                border: `1px solid ${isFail ? '#FEE2E2' : '#EFEAE3'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '0.82rem',
                lineHeight: 1.55,
                color: isFail ? '#7F1D1D' : '#3E2723'
              }}>
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: isFail ? '#DC2626' : '#8D7B6F',
                  marginBottom: '4px',
                  letterSpacing: '0.3px'
                }}>
                  Tiêu chuẩn kỹ thuật:
                </div>
                <SopStandardRenderer standard={standard} />
              </div>
            )}

            {/* Ghi chú bước (nếu có) */}
            {cleanNote && (
              <div style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '5px',
                padding: '5px 8px',
                backgroundColor: '#FFFDF7',
                borderRadius: '6px',
                fontSize: '0.74rem',
                color: '#B45309',
                border: '1px solid #FDE68A',
                lineHeight: 1.4
              }}>
                <FileText size={12} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{cleanNote}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ marginTop: '14px', marginBottom: '14px' }}>
      {/* Scoped Responsive Style đảm bảo trên thiết bị di động luôn hiển thị dạng thẻ đẹp mắt, không bị ép chữ */}
      <style>{`
        @media (max-width: 768px) {
          .sop-table-desktop { display: none !important; }
          .sop-cards-mobile { display: flex !important; flex-direction: column !important; }
        }
        @media (min-width: 769px) {
          .sop-table-desktop { display: block !important; }
          .sop-cards-mobile { display: none !important; }
        }
      `}</style>

      {/* KHỐI BANNER HEADER THU GỌN / MỞ RỘNG */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: isExpanded ? '#F5EFE8' : '#FAF7F2',
          borderRadius: isExpanded ? '10px 10px 0 0' : '10px',
          border: '1px solid #E5DDD3',
          borderBottom: isExpanded ? '1px solid #E5DDD3' : '1px solid #E5DDD3',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(93, 64, 55, 0.04)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5EFE8'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isExpanded ? '#F5EFE8' : '#FAF7F2'}
        title={isExpanded ? 'Nhấn để thu gọn bảng bước kiểm tra SOP' : 'Nhấn để xem chi tiết các bước kiểm tra SOP'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            backgroundColor: '#EFEAE3',
            border: '1px solid #D8CCC0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ClipboardList size={15} color="#8B5E3C" />
          </div>

          <span style={{
            fontSize: '0.82rem',
            color: '#5D4037',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.4px'
          }}>
            Hướng dẫn kiểm tra SOP
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            backgroundColor: '#EFEAE3',
            color: '#5D4037',
            border: '1px solid #D8CCC0'
          }}>
            {steps.length} bước
          </span>

          {/* Badge kết quả tổng thể */}
          {isAllPassed ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0'
            }}>
              <CheckCircle2 size={12} strokeWidth={2.5} />
              <span>{steps.length}/{steps.length} đạt tiêu chuẩn</span>
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA'
            }}>
              <AlertCircle size={12} strokeWidth={2.5} />
              <span>{failedSteps.length} bước không đạt</span>
            </span>
          )}
        </div>

        {/* NÚT THAO TÁC XEM CHI TIẾT / THU GỌN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                color: '#5D4037',
                border: '1px solid #D8CCC0',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Mở toàn màn hình trong cửa sổ riêng"
            >
              <Maximize2 size={12} />
              <span>Cửa sổ</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(prev => !prev);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              color: '#5D4037',
              border: '1px solid #D8CCC0',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                <span>Thu gọn</span>
              </>
            ) : (
              <>
                <Eye size={14} color="#8B5E3C" />
                <span>Xem chi tiết</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* BẢNG BƯỚC KIỂM TRA (KHI ĐƯỢC MỞ RỘNG) */}
      {isExpanded && (
        <div style={{
          border: '1px solid #E2E8F0',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          {/* Desktop: Bảng 4 cột chuẩn máy tính */}
          <div className="sop-table-desktop desktop-only">
            {renderTableContent(maxHeight)}
          </div>

          {/* Mobile: Danh sách thẻ hiển thị tiêu chuẩn full-width, cực kỳ dễ đọc */}
          <div className="sop-cards-mobile mobile-only">
            {renderMobileCards()}
          </div>

          {/* FOOTER THANH DƯỚI CÙNG KHI MỞ BẢNG */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 12px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            fontSize: '0.74rem',
            color: '#64748B'
          }}>
            <span>Đang hiển thị <b>{steps.length}</b> bước kiểm tra tiêu chuẩn</span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ChevronUp size={12} />
              <span>Thu gọn lại</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL PHÓNG TO XEM TOÀN BỘ CÁC BƯỚC SOP */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              width: '1000px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1.5px solid #E2E8F0',
              overflow: 'hidden'
            }}
          >
            {/* Header Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClipboardList size={18} color="#475569" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                    Chi tiết các bước kiểm tra SOP ({steps.length} bước)
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
                    Tiêu chuẩn kỹ thuật chi tiết theo công đoạn kiểm định
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Nội dung bảng trong Modal */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', WebkitOverflowScrolling: 'touch' }}>
              <div className="sop-table-desktop desktop-only" style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                {renderTableContent('60vh')}
              </div>
              <div className="sop-cards-mobile mobile-only">
                {renderMobileCards()}
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #E2E8F0'
            }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SopStepsTable;
