import React from 'react';
import { CheckCircle2, AlertTriangle, FileText, Check, X, Layers, AlertCircle, Sparkles, Hash, FileCheck } from 'lucide-react';

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
  const duplicateFiles = fileStats.filter(f => f.status === 'warning' || (f.mechanism && f.mechanism.name && f.mechanism.name.includes('Trùng lặp'))).length;
  const errorFiles = fileStats.filter(f => f.status === 'error').length;
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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
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
          width: 'min(96vw, 1180px)',
          maxHeight: 'min(92vh, 780px)',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(45, 26, 18, 0.28)',
          border: '1px solid #EADCC9',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#F4FBF7',
          borderBottom: '1px solid #D1E7DD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#D1E7DD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F5132'
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#0F5132', fontSize: '1.2rem', fontWeight: '700', lineHeight: 1.2 }}>
                Import & Bóc tách PDF thành công
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#4B5563', marginTop: '2px' }}>
                Đã xử lý và lưu trữ dữ liệu khiếu nại vào hệ thống
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6C757D',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body - 3 Columns Layout */}
        <div className="summary-modal-3col-grid" style={{
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: '290px 1.35fr 1.15fr',
          gap: '18px',
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
              color: '#7B5233',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              paddingBottom: '2px'
            }}>
              <FileCheck size={16} />
              <span>1. Tổng quan các file xử lý</span>
            </div>

            {/* Card 1: Mã lô (Batch ID) */}
            <div style={{
              backgroundColor: '#FCFAF7',
              border: '1px solid #EADCC9',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#8D6E63', fontWeight: '600' }}>
                Mã lô (Batch ID)
              </div>
              <div style={{ 
                fontSize: '0.92rem', 
                fontWeight: '700', 
                color: '#2D1A12', 
                fontFamily: 'monospace',
                backgroundColor: '#FFFFFF',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #EADCC9'
              }}>
                {batchId || 'N/A'}
              </div>
            </div>

            {/* Card 2: Số dòng đã trích xuất */}
            <div style={{
              backgroundColor: '#FCFAF7',
              border: '1px solid #EADCC9',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#8D6E63', fontWeight: '600' }}>
                Số dòng đã trích xuất
              </div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: '#065F46',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                padding: '2px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px'
              }}>
                {claimsCount}
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#047857' }}>dòng</span>
              </div>
            </div>

            {/* Card 3: Tổng số file PDF */}
            <div style={{
              backgroundColor: '#FCFAF7',
              border: '1px solid #EADCC9',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#8D6E63', fontWeight: '600' }}>
                Tổng số file PDF
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span>{totalFiles} file</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669' }}>
                  ({percentComplete}%)
                </span>
              </div>
            </div>

            {/* Card 4: Số cảnh báo / bỏ qua */}
            <div style={{
              backgroundColor: '#FCFAF7',
              border: '1px solid #EADCC9',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#8D6E63', fontWeight: '600' }}>
                Số cảnh báo / bỏ qua
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                {displayWarnings.length}
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>mục</span>
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
              color: '#7B5233',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} />
                <span>2. Danh sách file PDF ({totalFiles} file)</span>
              </div>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#065F46',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                padding: '2px 10px',
                borderRadius: '10px',
                textTransform: 'none',
                display: 'inline-flex',
                alignItems: 'center'
              }}>
                Tổng {claimsCount} dòng
              </span>
            </div>

            <div style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
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
                  const mechanismName = item.mechanism ? (item.mechanism.name || item.mechanism) : 'Cơ chế 1 (Standard)';
                  const isWarning = item.status === 'warning' || mechanismName.includes('Trùng lặp');
                  const isErr = item.status === 'error';

                  return (
                    <div 
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FFFFFF',
                        border: isErr ? '1px solid #FCA5A5' : isWarning ? '1px solid #FDE68A' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      {/* Tên file */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={15} style={{ color: isErr ? '#EF4444' : isWarning ? '#F59E0B' : '#7B5233', flexShrink: 0 }} />
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
                          borderRadius: '5px',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          backgroundColor: isErr ? '#FEE2E2' : isWarning ? '#FEF3C7' : mechanismName.includes('Mixed') ? '#EEF2FF' : '#E0E7FF',
                          color: isErr ? '#991B1B' : isWarning ? '#92400E' : mechanismName.includes('Mixed') ? '#3730A3' : '#3730A3'
                        }}>
                          {mechanismName}
                        </span>

                        <span style={{ 
                          fontWeight: '700', 
                          color: isErr ? '#DC2626' : isWarning ? '#D97706' : '#059669', 
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
              color: '#7B5233',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} style={{ color: displayWarnings.length > 0 ? '#D97706' : '#059669' }} />
                <span>3. Cảnh báo & Lưu ý</span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: '700',
                backgroundColor: displayWarnings.length > 0 ? '#FEF3C7' : '#D1E7DD',
                color: displayWarnings.length > 0 ? '#B45309' : '#0F5132'
              }}>
                {displayWarnings.length} mục
              </span>
            </div>

            <div style={{
              backgroundColor: displayWarnings.length > 0 ? '#FFFDF5' : '#F9FBF9',
              border: displayWarnings.length > 0 ? '1px solid #FCD34D' : '1px solid #D1E7DD',
              borderRadius: '10px',
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
                  color: '#0F5132',
                  height: '100%'
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#D1E7DD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px'
                  }}>
                    <Sparkles size={22} color="#0F5132" />
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '4px' }}>
                    Không có cảnh báo nào!
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#4B5563', lineHeight: 1.4 }}>
                    Toàn bộ các tệp PDF đã được bóc tách và trích xuất dữ liệu hoàn chỉnh, chuẩn xác 100%.
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
          padding: '12px 24px',
          backgroundColor: '#FCFAF7',
          borderTop: '1px solid #EADCC9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '0.78rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
            <span>Dữ liệu đã tự động đồng bộ vào danh sách khiếu nại.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 26px',
              backgroundColor: '#2D1A12',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(45, 26, 18, 0.2)',
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
