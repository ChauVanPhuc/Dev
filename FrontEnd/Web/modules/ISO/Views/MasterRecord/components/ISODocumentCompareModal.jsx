import React from 'react';
import { 
  Columns, ZoomOut, ZoomIn, RotateCcw, X, Download, 
  RefreshCw, AlertTriangle, Check, FileEdit 
} from 'lucide-react';

const ISODocumentCompareModal = ({
  showCompareModal,
  setShowCompareModal,
  conversionState,
  acceptedDraft,
  detailRecord,
  selectedWordDoc,
  compareZoom,
  setCompareZoom,
  compareSyncScroll,
  setCompareSyncScroll,
  compareLeftPaneRef,
  compareRightPaneRef,
  handleLeftScroll,
  handleRightScroll,
  comparePages,
  handleDownloadFile,
  handleDownloadWorkingDraft,
  handleCancelConversion,
  handleAcceptConversion,
  handleOpenWordEditModal
}) => {
  if (!showCompareModal) return null;

  return (
    <div className="iso-compare-modal-overlay" onClick={() => setShowCompareModal(false)}>
      <div className="iso-compare-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header modal */}
        <div className="iso-compare-modal-header">
          <div className="iso-compare-modal-title-area">
            <div className="iso-compare-modal-title">
              <Columns size={18} color="#7B5233" />
              <span>So sánh Trước / Sau chuyển đổi (Before / After)</span>
            </div>
            <div className="iso-compare-diff-pills">
              <span className="iso-compare-pill">
                Mã hiệu: <b>{conversionState.data?.doc_code_old || detailRecord?.suggested_doc_code} → {conversionState.data?.doc_code_new || acceptedDraft?.doc_code_new}</b>
              </span>
              <span className="iso-compare-pill">
                Lần BH: <b>Lần {conversionState.data?.edition_old || detailRecord?.edition} → Lần {conversionState.data?.edition_new || acceptedDraft?.edition_new}</b>
              </span>
              <span className="iso-compare-pill">
                Ngày BH: <b>{conversionState.data?.issue_date_old || '---'} → {conversionState.data?.issue_date_new || acceptedDraft?.issue_date_new || '---'}</b>
              </span>
            </div>
          </div>

          <div className="iso-compare-header-controls">
            {/* Phóng to / Thu nhỏ */}
            <div className="iso-viewer-zoom-group">
              <button 
                type="button" 
                className="iso-viewer-zoom-btn" 
                onClick={() => setCompareZoom(prev => Math.max(50, prev - 10))}
                title="Thu nhỏ"
              >
                <ZoomOut size={13} />
              </button>
              <span className="iso-viewer-zoom-text">{compareZoom}%</span>
              <button 
                type="button" 
                className="iso-viewer-zoom-btn" 
                onClick={() => setCompareZoom(prev => Math.min(200, prev + 10))}
                title="Phóng to"
              >
                <ZoomIn size={13} />
              </button>
              <button 
                type="button" 
                className="iso-viewer-zoom-btn" 
                onClick={() => setCompareZoom(100)}
                title="100%"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <label className="iso-compare-sync-toggle" title="Đồng bộ cuộn trang giữa 2 tài liệu">
              <input 
                type="checkbox" 
                checked={compareSyncScroll} 
                onChange={(e) => setCompareSyncScroll(e.target.checked)} 
              />
              <span>Đồng bộ cuộn</span>
            </label>

            <button 
              type="button" 
              className="iso-viewer-close-btn" 
              onClick={() => setShowCompareModal(false)}
              title="Đóng popup so sánh"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body modal: 2 cột Side-by-side */}
        <div className="iso-compare-modal-body">
          {/* CỘT TRÁI: BEFORE (FILE NGUỒN GỐC) */}
          <div className="iso-compare-col">
            <div className="iso-compare-col-header">
              <div className="iso-compare-col-badge before">
                <span>TRƯỚC CHUYỂN ĐỔI</span>
              </div>
              <div className="iso-compare-col-filename" title={conversionState.data?.source_filename || acceptedDraft?.source_filename || selectedWordDoc?.file_name}>
                {conversionState.data?.source_filename || acceptedDraft?.source_filename || selectedWordDoc?.file_name || 'File nguồn'}
              </div>
              <button
                type="button"
                className="iso-btn-download-source"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                onClick={() => handleDownloadFile(selectedWordDoc)}
                title="Tải file nguồn"
              >
                <Download size={12} />
                <span>Tải nguồn</span>
              </button>
            </div>
            <div 
              className="iso-compare-pages-pane"
              ref={compareLeftPaneRef}
              onScroll={handleLeftScroll}
            >
              {comparePages.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', gap: '8px' }}>
                  <RefreshCw className="iso-spinner" size={24} />
                  <span style={{ fontSize: '0.82rem' }}>Đang nạp các trang Trước chuyển đổi...</span>
                </div>
              ) : comparePages.before && comparePages.before.length > 0 ? (
                <div className="iso-compare-pages-container">
                  {comparePages.before.map((pg) => {
                    const imgSrc = pg.image_base64 || pg.data_url;
                    const pageWrapperStyle = {
                      maxWidth: `${Math.round(850 * (compareZoom / 100))}px`
                    };
                    return (
                      <div 
                        key={pg.page_number} 
                        className={`iso-compare-page-wrapper ${!imgSrc ? 'iso-compare-page-failed' : ''}`}
                        style={pageWrapperStyle}
                      >
                        {imgSrc ? (
                          <img 
                            src={imgSrc} 
                            alt={`Trang ${pg.page_number}`} 
                            className="iso-compare-page-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const errBox = e.currentTarget.parentElement.querySelector('.iso-compare-page-error-box');
                              if (errBox) errBox.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="iso-compare-page-error-box" style={{ display: imgSrc ? 'none' : 'flex' }}>
                          <AlertTriangle size={24} color="#EF4444" />
                          <div className="iso-compare-page-error-text">Không tải được trang tài liệu ({pg.page_number})</div>
                          <div className="iso-compare-page-error-sub">Vui lòng kiểm tra lại đường dẫn file hoặc định dạng tệp tin.</div>
                        </div>
                        <div className="iso-compare-page-num-tag">Trang {pg.page_number}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                  <span>Không có trang xem trước</span>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: AFTER (DRAFT SAU CHUYỂN ĐỔI) */}
          <div className="iso-compare-col">
            <div className="iso-compare-col-header">
              <div className="iso-compare-col-badge after">
                <span>SAU CHUYỂN ĐỔI (DRAFT)</span>
              </div>
              <div className="iso-compare-col-filename" title={conversionState.data?.draft_filename || acceptedDraft?.draft_filename || 'Bản draft chuyển đổi'}>
                {conversionState.data?.draft_filename || acceptedDraft?.draft_filename || 'Bản draft chuyển đổi'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', flexShrink: 0 }}>
                {comparePages.after?.length > 0 ? `${comparePages.after.length} trang` : ''}
              </div>
              <button
                type="button"
                className="iso-btn-download-source"
                style={{ padding: '3px 8px', fontSize: '0.72rem', flexShrink: 0 }}
                onClick={handleDownloadWorkingDraft}
                title="Tải bản draft Word"
              >
                <Download size={12} />
                <span>Tải draft</span>
              </button>
            </div>
            <div 
              className="iso-compare-pages-pane"
              ref={compareRightPaneRef}
              onScroll={handleRightScroll}
            >
              {comparePages.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', gap: '8px' }}>
                  <RefreshCw className="iso-spinner" size={24} />
                  <span style={{ fontSize: '0.82rem' }}>Đang nạp các trang Sau chuyển đổi...</span>
                </div>
              ) : comparePages.after && comparePages.after.length > 0 ? (
                <div className="iso-compare-pages-container">
                  {comparePages.after.map((pg) => {
                    const imgSrc = pg.image_base64 || pg.data_url;
                    const pageWrapperStyle = {
                      maxWidth: `${Math.round(850 * (compareZoom / 100))}px`
                    };
                    return (
                      <div 
                        key={pg.page_number} 
                        className={`iso-compare-page-wrapper ${!imgSrc ? 'iso-compare-page-failed' : ''}`}
                        style={pageWrapperStyle}
                      >
                        {imgSrc ? (
                          <img 
                            src={imgSrc} 
                            alt={`Trang ${pg.page_number}`} 
                            className="iso-compare-page-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const errBox = e.currentTarget.parentElement.querySelector('.iso-compare-page-error-box');
                              if (errBox) errBox.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="iso-compare-page-error-box" style={{ display: imgSrc ? 'none' : 'flex' }}>
                          <AlertTriangle size={24} color="#EF4444" />
                          <div className="iso-compare-page-error-text">Không tải được trang tài liệu ({pg.page_number})</div>
                          <div className="iso-compare-page-error-sub">Vui lòng kiểm tra lại đường dẫn file hoặc định dạng tệp tin.</div>
                        </div>
                        <div className="iso-compare-page-num-tag">Trang {pg.page_number}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                  <span>Không có trang xem trước</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer modal: Các hành động */}
        <div className="iso-compare-modal-footer">
          <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
            Bản <b>BEFORE</b> đọc trực tiếp file nguồn. Bản <b>AFTER</b> là draft chuẩn hóa theo <i>Mẫu quy trình.docx</i>.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="iso-btn-cancel-conversion"
              onClick={handleCancelConversion}
              title="Hủy bỏ bản chuyển đổi"
            >
              <X size={14} />
              <span>Hủy bỏ draft</span>
            </button>
            {!acceptedDraft && (
              <button
                type="button"
                className="iso-btn-accept-conversion"
                onClick={handleAcceptConversion}
                title="Chấp nhận bản chuyển đổi làm bản làm việc mới"
              >
                <Check size={14} />
                <span>Chấp nhận bản chuyển đổi</span>
              </button>
            )}
            {acceptedDraft && (
              <button
                type="button"
                className="iso-btn-edit-word"
                onClick={() => {
                  setShowCompareModal(false);
                  handleOpenWordEditModal();
                }}
                title="Chuyển sang màn hình Chỉnh sửa Word"
              >
                <FileEdit size={14} />
                <span>Chỉnh sửa Word</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ISODocumentCompareModal;
