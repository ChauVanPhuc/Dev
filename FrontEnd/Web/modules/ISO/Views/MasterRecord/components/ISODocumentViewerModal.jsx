import React from 'react';
import { 
  ZoomOut, ZoomIn, RotateCcw, Download, X, 
  RefreshCw, AlertTriangle, List, FileSpreadsheet, FileText 
} from 'lucide-react';
import { getExcelColName } from './isoMasterRecordUtils';

const ISODocumentViewerModal = ({
  docViewerModal,
  setDocViewerModal,
  docViewerZoom,
  setDocViewerZoom,
  handleDownloadFile,
  downloadingFile,
  openDocumentViewer,
  closeDocViewerModal
}) => {
  if (!docViewerModal.show) return null;

  return (
    <div 
      className="iso-doc-modal-overlay"
      onClick={closeDocViewerModal}
    >
      <div 
        className="iso-doc-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header duy nhất: Tên file bên trái, Zoom + Tải về + Đóng bên phải */}
        <div className="iso-doc-modal-header">
          <div className="iso-doc-modal-header-left">
            <span className={`iso-file-badge ${(docViewerModal.file?.ext || '').toLowerCase()}`}>
              {(docViewerModal.file?.ext || 'FILE').toUpperCase()}
            </span>
            <span className="iso-doc-modal-title" title={docViewerModal.file?.file_name}>
              {docViewerModal.file?.file_name}
            </span>
            <span className="iso-doc-modal-readonly-badge">
              Read-only
            </span>
          </div>

          <div className="iso-doc-modal-header-right">
            {/* Zoom controls (cho Word, PDF và Excel) */}
            <div className="iso-viewer-zoom-group">
              <button 
                type="button" 
                className="iso-viewer-zoom-btn" 
                onClick={() => setDocViewerZoom(prev => Math.max(50, prev - 10))}
                title="Thu nhỏ"
              >
                <ZoomOut size={14} />
              </button>
              <span className="iso-viewer-zoom-text">
                {docViewerZoom}%
              </span>
              <button 
                type="button" 
                className="iso-viewer-zoom-btn" 
                onClick={() => setDocViewerZoom(prev => Math.min(200, prev + 10))}
                title="Phóng to"
              >
                <ZoomIn size={14} />
              </button>
              <button 
                type="button" 
                className="iso-viewer-zoom-btn" 
                onClick={() => setDocViewerZoom(100)}
                title="Kích thước chuẩn (100%)"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            {/* Nút Tải về duy nhất (tải file gốc) */}
            <button
              type="button"
              className="iso-doc-modal-download-btn"
              onClick={() => handleDownloadFile(docViewerModal.file)}
              disabled={downloadingFile}
              title="Tải tệp tin gốc về máy tính"
            >
              <Download size={14} />
              <span>{downloadingFile ? 'Đang tải...' : 'Tải về'}</span>
            </button>

            {/* Nút đóng X riêng biệt */}
            <button
              type="button"
              className="iso-doc-modal-close-btn"
              onClick={closeDocViewerModal}
              title="Đóng cửa sổ xem tài liệu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Document Viewer */}
        <div className="iso-doc-modal-body">
          {docViewerModal.loading ? (
            <div style={{ padding: '100px 20px', textAlign: 'center', color: '#8D6E63', width: '100%' }}>
              <RefreshCw className="iso-spinner" size={32} />
              <div style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: '600' }}>
                Đang tải nội dung tệp tin thực tế...
              </div>
            </div>
          ) : docViewerModal.error ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#DC2626', width: '100%', margin: 'auto' }}>
              <AlertTriangle size={36} style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>{docViewerModal.error}</div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="iso-page-btn"
                  style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => openDocumentViewer(docViewerModal.file)}
                >
                  <RefreshCw size={14} />
                  <span>Thử lại</span>
                </button>
                <button
                  type="button"
                  className="iso-btn-brown"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleDownloadFile(docViewerModal.file)}
                >
                  <Download size={14} />
                  <span>Tải file gốc về máy tính</span>
                </button>
              </div>
            </div>
          ) : (docViewerModal.file?.ext === 'docx' || docViewerModal.file?.ext === 'doc') ? (
            /* WORD VIEWER CHUẨN A4 ĐỘ NÉT CAO (ĐỒNG BỘ MỤC LỤC HEADINGS) */
            <div className="iso-viewer-split" style={{ height: '100%' }}>
              {docViewerModal.docContent?.headings && docViewerModal.docContent.headings.length > 0 && (
                <div className="iso-viewer-toc" style={{ borderRight: '1px solid var(--iso-border)' }}>
                  <div className="iso-viewer-toc-title">
                    <List size={14} color="#7B5233" />
                    <span>MỤC LỤC TÀI LIỆU</span>
                  </div>
                  {docViewerModal.docContent.headings.map(h => (
                    <div
                      key={h.id}
                      className={`iso-viewer-toc-item level-${h.level}`}
                      onClick={() => {
                        const el = document.getElementById(h.id);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      title={h.title}
                    >
                      {h.title}
                    </div>
                  ))}
                </div>
              )}
              <div className="iso-viewer-doc-pane" style={{ display: 'flex', flexDirection: 'column' }}>
                {docViewerModal.docContent?.preview_pdf_url ? (
                  <div className="iso-pdf-viewport">
                    <div className="iso-a4-preview-wrapper">
                      <iframe
                        src={`${docViewerModal.docContent.preview_pdf_url}#toolbar=1&navpanes=1&zoom=${docViewerZoom}`}
                        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                        title="Word Document Preview"
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '80px 20px', textAlign: 'center', color: '#94A3B8' }}>
                    Chưa có nội dung hiển thị
                  </div>
                )}
              </div>
            </div>
          ) : (docViewerModal.file?.ext === 'xlsx' || docViewerModal.file?.ext === 'xls') ? (
            /* SPREADSHEET VIEWER CHUẨN EXCEL (BẢO TOÀN MERGED CELLS, COLUMN WIDTH, MÀU SẮC, FONT, NGÀY THÁNG) */
            <div className="iso-excel-container">
              {(() => {
                const excelData = docViewerModal.excelData;
                if (!excelData) {
                  return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Bảng tính không có dữ liệu</div>;
                }

                let sheetNames = [];
                let currentSheet = null;

                if (Array.isArray(excelData.sheets)) {
                  sheetNames = excelData.sheets.map((s, idx) => s.name || `Sheet ${idx + 1}`);
                  currentSheet = excelData.sheets[docViewerModal.activeSheetIdx] || excelData.sheets[0];
                } else if (excelData.sheets && typeof excelData.sheets === 'object') {
                  sheetNames = excelData.sheet_names || Object.keys(excelData.sheets);
                  const sName = sheetNames[docViewerModal.activeSheetIdx] || sheetNames[0];
                  currentSheet = excelData.sheets[sName];
                }

                if (!currentSheet || !currentSheet.cells_grid || currentSheet.cells_grid.length === 0) {
                  return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Worksheet này không có dữ liệu</div>;
                }

                const colCount = currentSheet.total_cols || (currentSheet.cells_grid[0] ? currentSheet.cells_grid[0].length : 26);
                const colHeaders = Array.from({ length: colCount }, (_, i) => getExcelColName(i));

                return (
                  <>
                    {/* 1. Formula Bar */}
                    <div className="iso-excel-formula-bar">
                      <div className="iso-excel-name-box">
                        {docViewerModal.selectedCell?.address || 'A1'}
                      </div>
                      <div className="iso-excel-fx-icon">fx</div>
                      <div className="iso-excel-formula-input" title="Nội dung ô hiện tại">
                        {docViewerModal.selectedCell?.val ?? ''}
                      </div>
                    </div>

                    {/* 2. Interactive Spreadsheet Table Grid */}
                    <div className="iso-excel-table-wrapper" style={{ zoom: `${docViewerZoom}%` }}>
                      <table className="iso-excel-table">
                        <thead>
                          <tr>
                            <th className="iso-excel-th-corner">#</th>
                            {colHeaders.map((colName, cIdx) => {
                              const width = currentSheet.col_widths?.[cIdx] ? `${currentSheet.col_widths[cIdx]}px` : undefined;
                              return (
                                <th key={cIdx} className="iso-excel-th-col" style={{ width, minWidth: width }}>
                                  {colName}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSheet.cells_grid.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="iso-excel-td-row-num">{rIdx + 1}</td>
                              {row.map((cell, cIdx) => {
                                if (cell.h) return null;

                                const isSelected = docViewerModal.selectedCell?.r === rIdx && docViewerModal.selectedCell?.c === cIdx;
                                const colLetter = getExcelColName(cIdx);
                                const cellAddr = `${colLetter}${rIdx + 1}`;

                                const cellStyle = {
                                  textAlign: cell.al || 'left',
                                  verticalAlign: cell.va || 'middle',
                                  fontWeight: cell.b ? 'bold' : 'normal',
                                  fontStyle: cell.i ? 'italic' : 'normal',
                                  fontSize: cell.s ? `${Math.min(18, Math.max(9, cell.s))}px` : '0.8rem',
                                  color: cell.color || '#1e293b',
                                  backgroundColor: cell.bg || (isSelected ? '#F0FDF4' : '#FFFFFF'),
                                  outline: isSelected ? '2px solid #16A34A' : undefined,
                                  outlineOffset: isSelected ? '-2px' : undefined,
                                  cursor: 'cell',
                                  border: cell.bd ? '1px solid #CBD5E1' : '1px solid #E2E8F0'
                                };

                                return (
                                  <td
                                    key={cIdx}
                                    rowSpan={cell.r > 1 ? cell.r : undefined}
                                    colSpan={cell.c > 1 ? cell.c : undefined}
                                    style={cellStyle}
                                    onClick={() => {
                                      setDocViewerModal(prev => ({
                                        ...prev,
                                        selectedCell: { r: rIdx, c: cIdx, address: cellAddr, val: cell.v ?? '' }
                                      }));
                                    }}
                                    title={cell.v ? `${cellAddr}: ${cell.v}` : cellAddr}
                                  >
                                    {cell.v !== null && cell.v !== undefined ? cell.v : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 3. Sheet tabs bar */}
                    {sheetNames.length > 0 && (
                      <div className="iso-excel-sheets-bar">
                        {sheetNames.map((sName, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            className={`iso-excel-tab-btn ${docViewerModal.activeSheetIdx === sIdx ? 'active' : ''}`}
                            onClick={() => {
                              const targetSheet = Array.isArray(excelData.sheets) ? excelData.sheets[sIdx] : excelData.sheets[sName];
                              const v0 = targetSheet?.cells_grid?.[0]?.[0]?.v || '';
                              setDocViewerModal(prev => ({
                                ...prev,
                                activeSheetIdx: sIdx,
                                selectedCell: { r: 0, c: 0, address: 'A1', val: v0 }
                              }));
                            }}
                          >
                            <FileSpreadsheet size={13} />
                            <span>{sName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (docViewerModal.file?.ext === 'pdf') ? (
            /* PDF VIEWER TRỰC TIẾP */
            <div className="iso-viewer-split" style={{ height: '100%' }}>
              {docViewerModal.docContent?.bookmarks && docViewerModal.docContent.bookmarks.length > 0 && (
                <div className="iso-viewer-toc" style={{ borderRight: '1px solid var(--iso-border)' }}>
                  <div className="iso-viewer-toc-title">
                    <List size={14} color="#7B5233" />
                    <span>MỤC LỤC & BOOKMARKS</span>
                  </div>
                  {docViewerModal.docContent.bookmarks.map((bm, bIdx) => (
                    <div
                      key={bIdx}
                      className={`iso-viewer-toc-item level-${bm.level || 1}`}
                      onClick={() => {
                        if (bm.page) {
                          setDocViewerModal(prev => ({
                            ...prev,
                            docContent: {
                              ...prev.docContent,
                              preview_pdf_url: `${prev.docContent.preview_pdf_url.split('#')[0]}#page=${bm.page}`
                            }
                          }));
                        }
                      }}
                      title={`Trang ${bm.page}: ${bm.title}`}
                    >
                      <span style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden' }}>{bm.title}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginLeft: '6px' }}>Tr. {bm.page}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="iso-viewer-doc-pane" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="iso-pdf-viewport">
                  <div className="iso-a4-preview-wrapper">
                    <iframe
                      src={`${docViewerModal.docContent?.preview_pdf_url || ''}#toolbar=1&navpanes=1&zoom=${docViewerZoom}`}
                      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                      title="PDF Viewer"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', width: '100%', margin: 'auto' }}>
              <FileText size={40} style={{ margin: '0 auto 12px auto' }} />
              <div>Định dạng không được hỗ trợ xem trực tiếp.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ISODocumentViewerModal;
