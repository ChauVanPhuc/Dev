import React from 'react';
import { Search } from 'lucide-react';

export const ClaimPdfFolderModal = ({
  isOpen,
  onClose,
  importedPdfs = [],
  pdfSearchQuery,
  setPdfSearchQuery,
  selectedPdfForPreview,
  setSelectedPdfForPreview,
  pdfActionMenuId,
  setPdfActionMenuId,
  hasWritePermission = true,
  onDeletePdf,
  getFullPdfUrl
}) => {
  if (!isOpen && !selectedPdfForPreview) return null;

  return (
    <>
      {/* POPUP THƯ MỤC PDF */}
      {isOpen && (
        <div className="add-claim-backdrop" style={{ zIndex: 1998 }} onClick={onClose}>
          <div className="form-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="add-claim-modal" style={{ width: 'min(95vw, 850px)', display: 'flex', flexDirection: 'column', height: '80vh', border: '1px solid #EADCC9', borderRadius: '12px', boxShadow: '0 20px 50px rgba(123, 82, 51, 0.15)', overflow: 'hidden' }}>
              
              {/* Header */}
              <div className="add-claim-header" style={{ padding: '16px 24px', borderBottom: '1px solid #EADCC9', backgroundColor: '#FFFDFB' }}>
                <h2 className="add-claim-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7B5233', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#7B5233' }}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Thư mục PDF đã nhập ({importedPdfs.length})</span>
                </h2>
                <button
                  type="button"
                  className="add-claim-icon-btn"
                  title="Đóng"
                  onClick={onClose}
                  style={{ fontSize: '1.6rem', padding: '0 6px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                >
                  &times;
                </button>
              </div>

              {/* Sub-header with Search */}
              <div style={{ padding: '12px 24px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #F0E6D8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-wrapper" style={{ margin: 0, width: '320px', height: '32px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} className="search-icon" style={{ position: 'absolute', left: '10px', color: '#A1887F' }} />
                  <input
                    type="text"
                    placeholder="Tìm nhanh tên file PDF..."
                    value={pdfSearchQuery}
                    onChange={(e) => setPdfSearchQuery(e.target.value)}
                    style={{ fontSize: '0.82rem', width: '100%', height: '100%', padding: '0 12px 0 32px', border: '1px solid #EADCC9', borderRadius: '6px', outline: 'none', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>

              {/* Body (Table List) */}
              <div className="add-claim-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', backgroundColor: '#FFFFFF' }}>
                {importedPdfs.filter(pdf => pdf.original_name.toLowerCase().includes((pdfSearchQuery || '').toLowerCase())).length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8D6E63', gap: '12px' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Chưa có file PDF nào được lưu trữ hoặc tìm thấy.</span>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #EADCC9', color: '#7B5233', fontWeight: 'bold', textAlign: 'left' }}>
                        <th style={{ padding: '10px 8px' }}>Tên file gốc</th>
                        <th style={{ padding: '10px 8px', width: '120px' }}>Dung lượng</th>
                        <th style={{ padding: '10px 8px', width: '160px' }}>Thời gian import</th>
                        <th style={{ padding: '10px 8px', width: '80px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedPdfs
                        .filter(pdf => pdf.original_name.toLowerCase().includes((pdfSearchQuery || '').toLowerCase()))
                        .map((pdf) => (
                          <tr 
                            key={pdf.filename} 
                            style={{ borderBottom: '1px solid #F0E6D8', color: '#2D1A12', transition: 'background-color 0.15s', cursor: 'pointer' }} 
                            className="table-row-hover"
                            onClick={(e) => {
                              if (e.target.closest('.pdf-action-menu-container') || e.target.closest('.action-menu')) {
                                return;
                              }
                              setSelectedPdfForPreview(pdf);
                            }}
                          >
                            <td style={{ padding: '12px 8px', fontWeight: '500', wordBreak: 'break-all' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedPdfForPreview(pdf)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: 0,
                                  margin: 0,
                                  color: '#7B5233',
                                  fontWeight: '600',
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#A0301B'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#7B5233'; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                <span>{pdf.original_name.replace(/_/g, ' ')}</span>
                              </button>
                            </td>
                            <td style={{ padding: '12px 8px', color: '#5D4037' }}>
                              {pdf.size ? (pdf.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px', color: '#5D4037' }}>
                              {pdf.created_at}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', position: 'relative' }} className="pdf-action-menu-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPdfActionMenuId(pdfActionMenuId === pdf.filename ? null : pdf.filename);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#7B5233',
                                  padding: '4px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="2"/>
                                  <circle cx="12" cy="12" r="2"/>
                                  <circle cx="12" cy="19" r="2"/>
                                </svg>
                              </button>
                              {pdfActionMenuId === pdf.filename && (
                                <div
                                  className="action-menu"
                                  style={{
                                    position: 'absolute',
                                    right: '24px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #EADCC9',
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 12px rgba(123, 82, 51, 0.15)',
                                    padding: '4px',
                                    zIndex: 1000,
                                    minWidth: '130px',
                                    display: 'flex',
                                    flexDirection: 'column'
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="action-menu-item"
                                    onClick={() => {
                                      setPdfActionMenuId(null);
                                      setSelectedPdfForPreview(pdf);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.8rem', border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#2D1A12', fontWeight: '500' }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                      <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    <span>Xem trước</span>
                                  </button>
                                  <a
                                    href={getFullPdfUrl(pdf.url)}
                                    download={pdf.original_name}
                                    className="action-menu-item"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.8rem', textDecoration: 'none', color: '#2D1A12', fontWeight: '500' }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                      <polyline points="7 10 12 15 17 10"></polyline>
                                      <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    <span>Tải về</span>
                                  </a>
                                  {hasWritePermission && (
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => onDeletePdf(pdf.filename)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.8rem', border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#DC2626', fontWeight: '500' }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                      <span>Xóa file</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="add-claim-actions-row" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#FFFDFB', margin: 0 }}>
                <button type="button" className="add-claim-btn-cancel" onClick={onClose}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP XEM TRƯỚC PDF */}
      {selectedPdfForPreview && (
        <div className="add-claim-backdrop" style={{ zIndex: 1999 }} onClick={() => setSelectedPdfForPreview(null)}>
          <div className="form-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="add-claim-modal" style={{ width: 'min(95vw, 1000px)', display: 'flex', flexDirection: 'column', height: '90vh', border: '1px solid #EADCC9', borderRadius: '12px', boxShadow: '0 20px 50px rgba(123, 82, 51, 0.15)', overflow: 'hidden' }}>
              
              {/* Header */}
              <div className="add-claim-header" style={{ padding: '16px 24px', borderBottom: '1px solid #EADCC9', backgroundColor: '#FFFDFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="add-claim-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7B5233', fontSize: '1.1rem', fontWeight: 'bold', margin: 0, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span>Xem trước: {selectedPdfForPreview.original_name.replace(/_/g, ' ')}</span>
                </h2>
                
                {/* Header Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <a
                    href={getFullPdfUrl(selectedPdfForPreview.url)}
                    download={selectedPdfForPreview.original_name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#7B5233',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Tải về máy</span>
                  </a>
                  <button
                    type="button"
                    className="add-claim-icon-btn"
                    title="Đóng"
                    onClick={() => setSelectedPdfForPreview(null)}
                    style={{ fontSize: '1.6rem', padding: '0 6px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Body (Iframe view) */}
              <div className="add-claim-body" style={{ flex: 1, padding: 0, backgroundColor: '#525659', display: 'flex', flexDirection: 'column' }}>
                <iframe
                  src={getFullPdfUrl(selectedPdfForPreview.url)}
                  title="PDF Preview"
                  width="100%"
                  height="100%"
                  style={{ border: 'none', flex: 1 }}
                />
              </div>

              {/* Footer */}
              <div className="add-claim-actions-row" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#FFFDFB', margin: 0 }}>
                <button type="button" className="add-claim-btn-cancel" onClick={() => setSelectedPdfForPreview(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
