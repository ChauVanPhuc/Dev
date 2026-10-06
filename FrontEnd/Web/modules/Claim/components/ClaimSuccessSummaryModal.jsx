import React from 'react';
import { CheckCircle2, FileText, X } from 'lucide-react';

export const ClaimSuccessSummaryModal = ({
  isOpen,
  onClose,
  batchId = '',
  claimsCount = 0,
  warningsCount = 0,
  warnings = [],
  fileStats = []
}) => {
  if (!isOpen) return null;

  const totalFiles = fileStats.length || 1;
  const successFiles = fileStats.filter(f => f.status === 'success' || !f.status || f.claims_count > 0).length;
  const displayWarnings = warnings || [];
  const percentComplete = totalFiles > 0 ? Math.round((successFiles / totalFiles) * 100) : 100;

  return (
    <div 
      className="add-claim-backdrop" 
      style={{ 
        zIndex: 2050,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }} 
      onClick={onClose}
    >
      <div 
        className="form-modal-wrapper" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(96vw, 1140px)',
          maxHeight: 'min(92vh, 740px)',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.15)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={19} color="#059669" />
            <h3 style={{ margin: 0, color: '#111827', fontSize: '1.05rem', fontWeight: '700' }}>
              Import & Bóc tách PDF thành công
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease'
            }}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body - 3 Columns Layout */}
        <div className="summary-modal-3col-grid" style={{
          padding: '18px 20px',
          display: 'grid',
          gridTemplateColumns: '280px 1.35fr 1.15fr',
          gap: '16px',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto'
        }}>
          {/* CỘT 1: TỔNG QUAN CÁC FILE XỬ LÝ */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: 0
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#374151',
              paddingBottom: '2px'
            }}>
              1. Tổng quan các file xử lý
            </div>

            {/* Card 1: Mã lô (Batch ID) */}
            <div style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.82rem', color: '#4B5563' }}>
                Mã lô (Batch ID)
              </div>
              <div style={{ 
                fontSize: '0.88rem', 
                fontWeight: '600', 
                color: '#111827', 
                fontFamily: 'monospace'
              }}>
                {batchId || 'N/A'}
              </div>
            </div>

            {/* Card 2: Số dòng đã trích xuất */}
            <div style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.82rem', color: '#4B5563' }}>
                Số dòng đã trích xuất
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: '#111827',
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px'
              }}>
                <span>{claimsCount}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500', color: '#6B7280' }}>dòng</span>
              </div>
            </div>

            {/* Card 3: Tổng số file PDF */}
            <div style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.82rem', color: '#4B5563' }}>
                Tổng số file PDF
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span>{totalFiles} file</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500', color: '#6B7280' }}>
                  ({percentComplete}%)
                </span>
              </div>
            </div>

            {/* Card 4: Số cảnh báo / bỏ qua */}
            <div style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.82rem', color: '#4B5563' }}>
                Số cảnh báo / bỏ qua
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span>{displayWarnings.length}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500', color: '#6B7280' }}>mục</span>
              </div>
            </div>
          </div>

          {/* CỘT 2: DANH SÁCH FILE PDF ĐÃ XỬ LÝ */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: 0
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '2px'
            }}>
              <span>2. Danh sách file PDF ({totalFiles} file)</span>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: '600',
                color: '#6B7280'
              }}>
                Tổng {claimsCount} dòng
              </span>
            </div>

            <div style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              flex: 1,
              maxHeight: '430px',
              minHeight: '260px',
              overflowY: 'auto',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {fileStats.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#6B7280' }}>
                  Đã hoàn tất trích xuất dữ liệu.
                </div>
              ) : (
                fileStats.map((item, idx) => {
                  const rawFilename = item.original_name || item.filename || `File_${idx + 1}.pdf`;
                  const filename = rawFilename.split('/').pop().split('\\').pop();
                  const mechanismName = item.mechanism ? (item.mechanism.name || item.mechanism) : 'Cơ chế 1';
                  const isWarning = item.status === 'warning' || mechanismName.includes('Trùng lặp');
                  const isErr = item.status === 'error';

                  return (
                    <div 
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FFFFFF',
                        border: isErr ? '1px solid #FCA5A5' : isWarning ? '1px solid #FDE68A' : '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      {/* Tên file */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={15} style={{ color: isErr ? '#EF4444' : isWarning ? '#F59E0B' : '#4B5563', flexShrink: 0 }} />
                        <span 
                          style={{ 
                            fontWeight: '600', 
                            color: '#1F2937', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            flex: 1
                          }} 
                          title={rawFilename}
                        >
                          {filename}
                        </span>
                      </div>

                      {/* Thông tin cơ chế & số dòng */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: '500',
                          backgroundColor: isErr ? '#FEE2E2' : isWarning ? '#FEF3C7' : '#F3F4F6',
                          color: isErr ? '#991B1B' : isWarning ? '#92400E' : '#374151'
                        }}>
                          {mechanismName}
                        </span>

                        <span style={{ 
                          fontWeight: '600', 
                          color: isErr ? '#DC2626' : isWarning ? '#D97706' : '#111827', 
                          fontSize: '0.8rem' 
                        }}>
                          {item.claims_count || 0} dòng {item.period ? `(${item.period})` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CỘT 3: CHI TIẾT CẢNH BÁO & LƯU Ý */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: 0
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '2px'
            }}>
              <span>3. Cảnh báo & Lưu ý</span>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: '600',
                color: '#6B7280'
              }}>
                {displayWarnings.length} mục
              </span>
            </div>

            <div style={{
              backgroundColor: displayWarnings.length > 0 ? '#FFFDF5' : '#FAFAFA',
              border: displayWarnings.length > 0 ? '1px solid #FCD34D' : '1px solid #E5E7EB',
              borderRadius: '8px',
              flex: 1,
              maxHeight: '430px',
              minHeight: '260px',
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {displayWarnings.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '30px 16px',
                  textAlign: 'center',
                  height: '100%'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#111827', marginBottom: '6px' }}>
                    Không có cảnh báo nào
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.4, maxWidth: '240px' }}>
                    Toàn bộ các tệp PDF đã được bóc tách và trích xuất dữ liệu hoàn chỉnh, chuẩn xác.
                  </div>
                </div>
              ) : (
                displayWarnings.map((w, i) => (
                  <div 
                    key={i}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #FDE68A',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: '#92400E',
                      lineHeight: '1.4',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px'
                    }}
                  >
                    <span style={{ color: '#D97706', fontWeight: '800', flexShrink: 0 }}>•</span>
                    <span style={{ wordBreak: 'break-word' }}>{w}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 24px',
              backgroundColor: '#2D1A12',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '7px',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'background-color 0.2s ease'
            }}
          >
            Đồng ý
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 992px) {
          .summary-modal-3col-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </div>
  );
};
