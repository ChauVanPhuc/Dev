import React from 'react';
import { ClipboardList, CheckCircle2, XCircle, AlertCircle, FileText, Loader2, Info } from 'lucide-react';
import SopStandardRenderer, { getCleanStepNote, getCleanStepTitle } from './SopStandardRenderer';

/**
 * Bảng hiển thị các bước kiểm tra SOP được thiết kế gọn gàng, thẩm mỹ và trực quan
 */
export const SopStepsTable = ({
  steps = [],
  loading = false,
  emptyMessage = 'Phiếu kiểm tra này không có danh sách các bước SOP chi tiết.',
  maxHeight = '320px'
}) => {
  if (loading) {
    return (
      <div style={{
        padding: '14px 16px',
        backgroundColor: '#F8FAFC',
        borderRadius: '10px',
        border: '1px dashed #CBD5E1',
        color: '#78350F',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '12px',
        marginBottom: '12px'
      }}>
        <Loader2 size={16} className="animate-spin" color="#78350F" />
        <span style={{ fontWeight: 600 }}>Đang nạp danh sách các bước kiểm tra SOP theo công đoạn...</span>
      </div>
    );
  }

  const hasSteps = Array.isArray(steps) && steps.length > 0;

  // Thống kê kết quả bước kiểm tra
  const failedSteps = hasSteps
    ? steps.filter(s => s.result === 'fail' || s.result === 'Lỗi' || s.status === 'FAIL')
    : [];
  const isAllPassed = hasSteps && failedSteps.length === 0;

  return (
    <div style={{ marginTop: '14px', marginBottom: '14px' }}>
      {/* HEADER: Tiêu đề + Thống kê tổng số bước và kết quả */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{
          fontSize: '0.8rem',
          color: '#78350F',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <ClipboardList size={14} color="#B45309" />
          </div>
          <span>Hướng dẫn kiểm tra SOP</span>
          {hasSteps && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A'
            }}>
              {steps.length} bước
            </span>
          )}
        </div>

        {/* Tóm tắt nhanh: Tất cả đạt / X bước không đạt */}
        {hasSteps && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isAllPassed ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
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
                fontWeight: 700,
                backgroundColor: '#FFF1F2',
                color: '#E11D48',
                border: '1px solid #FECDD3'
              }}>
                <AlertCircle size={12} strokeWidth={2.5} />
                <span>{failedSteps.length} bước không đạt</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* BẢNG BƯỚC KIỂM TRA SOP */}
      {hasSteps ? (
        <div className="sop-standard-scroll" style={{
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          maxHeight,
          overflowY: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
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
                  width: '200px',
                  minWidth: '150px',
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
      ) : (
        <div style={{
          padding: '12px 14px',
          backgroundColor: '#F8FAFC',
          borderRadius: '10px',
          border: '1px dashed #CBD5E1',
          color: '#64748B',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Info size={15} color="#94A3B8" />
          <span>{emptyMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SopStepsTable;
