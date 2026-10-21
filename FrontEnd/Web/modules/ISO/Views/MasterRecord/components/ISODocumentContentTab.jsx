import React, { useRef, useState } from 'react';
import { 
  FileText, Search, X, Check, ChevronDown, ChevronRight, Layers, ZoomIn, ZoomOut, RotateCcw, 
  Settings, RefreshCw, Sparkles, Columns, FileEdit, Download, Upload, 
  Save, AlertTriangle, List, Folder, CheckCircle2,
  Undo, Redo, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ListOrdered, Table as TableIcon, Link2
} from 'lucide-react';

export const ISODocumentContentTab = ({
  selectedWordDoc,
  setSelectedWordDoc,
  uniqueWordDocs = [],
  filteredWordDocs = [],
  docSearchTerm = '',
  setDocSearchTerm,
  docDropdownOpen,
  setDocDropdownOpen,
  hasDuplicateDocName,
  getDocFolderContext,
  loadTab2Doc,
  loadingRealFiles,
  acceptedDraft,
  // Zoom
  docViewerZoom = 100,
  setDocViewerZoom,
  // Direct Word edit mode
  isWordEditMode = false,
  setIsWordEditMode,
  isWordEditorDirty = false,
  setIsWordEditorDirty,
  savingWordDirect = false,
  handleCancelWordEdit,
  handleSaveDirectWordContent,
  wordEditorRef,
  wordEditorFont = 'Times New Roman',
  setWordEditorFont,
  wordEditorFontSize = '3',
  setWordEditorFontSize,
  wordEditorStyle = 'p',
  setWordEditorStyle,
  wordEditorZoom = 100,
  handleExecWordCmd,
  handleInsertTable,
  // Conversion
  conversionState = {},
  conversionStatus = 'IDLE',
  conversionError = null,
  handleSwitchConversionTab,
  handleStartConversion,
  handleRetryConversion,
  handleAcceptConversion,
  handleCancelConversion,
  handleOpenCompareModal,
  handleOpenDirectWordEditor,
  handleDownloadWorkingDraft,
  // Actions
  wordInputRef,
  handleUploadWordInTab2,
  handleDownloadFile,
  downloadingFile,
  uploadingWord,
  tab2DocContent = {},
  activeHeadingId,
  scrollToHeading,
  toast
}) => {
  const docDropdownRef = useRef(null);
  const docActionMenuRef = useRef(null);
  const [isDocActionMenuOpen, setIsDocActionMenuOpen] = useState(false);

  // Ribbon toolbar cho editor trực tiếp
  const renderWordRibbonToolbar = () => (
    <div className="iso-word-ribbon inline-ribbon">
      {/* Undo / Redo */}
      <div className="iso-ribbon-group">
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('undo')} title="Hoàn tác (Ctrl+Z)">
          <Undo size={14} />
        </button>
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('redo')} title="Làm lại (Ctrl+Y)">
          <Redo size={14} />
        </button>
      </div>

      {/* Font & Size */}
      <div className="iso-ribbon-group">
        <select
          className="iso-ribbon-select font-family"
          value={wordEditorFont}
          onChange={(e) => {
            setWordEditorFont(e.target.value);
            handleExecWordCmd('fontName', e.target.value);
          }}
          title="Phông chữ"
        >
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
          <option value="Calibri">Calibri</option>
          <option value="Roboto">Roboto</option>
          <option value="Segoe UI">Segoe UI</option>
        </select>

        <select
          className="iso-ribbon-select font-size"
          value={wordEditorFontSize}
          onChange={(e) => {
            setWordEditorFontSize(e.target.value);
            handleExecWordCmd('fontSize', e.target.value);
          }}
          title="Cỡ chữ"
        >
          <option value="1">10 pt</option>
          <option value="2">11 pt</option>
          <option value="3">12 pt (Chuẩn)</option>
          <option value="4">14 pt</option>
          <option value="5">18 pt</option>
          <option value="6">24 pt</option>
          <option value="7">36 pt</option>
        </select>
      </div>

      {/* Style formats */}
      <div className="iso-ribbon-group">
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('bold')} title="In đậm (Ctrl+B)">
          <Bold size={14} />
        </button>
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('italic')} title="In nghiêng (Ctrl+I)">
          <Italic size={14} />
        </button>
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('underline')} title="Gạch chân (Ctrl+U)">
          <Underline size={14} />
        </button>
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('strikeThrough')} title="Gạch ngang chữ">
          <Strikethrough size={14} />
        </button>
      </div>

      {/* Heading block */}
      <div className="iso-ribbon-group">
        <select
          className="iso-ribbon-select heading-style"
          value={wordEditorStyle}
          onChange={(e) => {
            setWordEditorStyle(e.target.value);
            handleExecWordCmd('formatBlock', `<${e.target.value}>`);
          }}
          title="Định dạng đoạn / Tiêu đề"
        >
          <option value="p">Đoạn văn (Normal)</option>
          <option value="h1">Heading 1 (Mục lớn)</option>
          <option value="h2">Heading 2 (Mục con)</option>
          <option value="h3">Heading 3 (Tiểu mục)</option>
        </select>
      </div>

      {/* Alignment */}
      <div className="iso-ribbon-group">
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('justifyLeft')} title="Căn trái">
          <AlignLeft size={14} />
        </button>
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('justifyCenter')} title="Căn giữa">
          <AlignCenter size={14} />
        </button>
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('justifyRight')} title="Căn phải">
          <AlignRight size={14} />
        </button>
        <button type="button" className="iso-ribbon-btn" onClick={() => handleExecWordCmd('justifyFull')} title="Căn đều hai bên">
          <AlignJustify size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="iso-ribbon-group">
        <button type="button" className="iso-ribbon-btn" onClick={handleInsertTable} title="Chèn bảng">
          <TableIcon size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      
      {/* Input ẩn phục vụ tải lên Word */}
      <input 
        type="file" 
        ref={wordInputRef} 
        style={{ display: 'none' }} 
        accept=".docx, .doc" 
        onChange={handleUploadWordInTab2}
      />

      {/* Thanh công cụ 1 hàng cố định */}
      <div className="iso-doc-selector-bar">
        {isWordEditMode ? (
          /* KHI Ở CHẾ ĐỘ CHỈNH SỬA WORD TRỰC TIẾP */
          <div className="iso-word-edit-topbar-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div className="iso-word-edit-indicator">
              <FileEdit size={16} color="#7B5233" />
              <span className="iso-word-edit-title">Đang chỉnh sửa Word (Trực tiếp):</span>
              <span className="iso-word-edit-filename" title={selectedWordDoc?.file_name}>
                {selectedWordDoc?.file_name || 'Tài liệu Word'}
              </span>
              <span className="iso-word-edit-badge">Chế độ soạn thảo</span>
              {isWordEditorDirty && (
                <span className="iso-word-unsaved-dot" title="Có thay đổi chưa lưu">• Chưa lưu</span>
              )}
            </div>
            <div className="iso-word-edit-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="iso-btn-word-cancel"
                onClick={handleCancelWordEdit}
                disabled={savingWordDirect}
                title="Hủy bỏ các thay đổi và quay lại xem tài liệu"
              >
                <X size={14} />
                <span>Hủy chỉnh sửa</span>
              </button>
              <button
                type="button"
                className="iso-btn-word-save"
                onClick={handleSaveDirectWordContent}
                disabled={savingWordDirect}
                title="Lưu các thay đổi trực tiếp vào tài liệu Word"
              >
                {savingWordDirect ? (
                  <>
                    <RefreshCw size={14} className="iso-spinner" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Lưu tài liệu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* KHI ĐANG Ở CHẾ ĐỘ CONVERSION */}
            {conversionState.active ? (
              <div className="iso-conversion-tabs">
                <button
                  type="button"
                  className={`iso-conversion-tab-btn ${conversionState.mode === 'before' ? 'active' : ''}`}
                  onClick={() => handleSwitchConversionTab('before')}
                  title="Xem tệp tin nguồn ban đầu (không sửa đổi)"
                >
                  Trước chuyển đổi
                </button>
                <button
                  type="button"
                  className={`iso-conversion-tab-btn ${conversionState.mode === 'after' ? 'active' : ''}`}
                  onClick={() => handleSwitchConversionTab('after')}
                  title="Xem bản nháp vừa tạo theo chuẩn Mẫu quy trình.docx"
                >
                  Sau chuyển đổi
                </button>
              </div>
            ) : (
              /* KHI Ở CHẾ ĐỘ BÌNH THƯỜNG */
              <div className="iso-doc-selector-bar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <div className="iso-doc-dropdown-wrapper" ref={docDropdownRef}>
                  <button
                    type="button"
                    className={`iso-doc-dropdown-btn ${docDropdownOpen ? 'open' : ''}`}
                    onClick={() => {
                      if (uniqueWordDocs.length > 0) {
                        setDocDropdownOpen(prev => !prev);
                      }
                    }}
                    disabled={uniqueWordDocs.length === 0}
                    title={selectedWordDoc ? (selectedWordDoc.relative_path || selectedWordDoc.file_name) : 'Chọn tài liệu Word'}
                  >
                    <FileText size={15} color="#7B5233" style={{ flexShrink: 0 }} />

                    <span className="iso-doc-dropdown-name">
                      {loadingRealFiles ? (
                        'Đang tải danh sách tài liệu...'
                      ) : selectedWordDoc ? (
                        selectedWordDoc.file_name
                      ) : uniqueWordDocs.length > 0 ? (
                        'Chọn tài liệu Word'
                      ) : (
                        'Chưa có tài liệu Word nào'
                      )}
                    </span>

                    {uniqueWordDocs.length > 1 && (
                      <ChevronDown 
                        size={14} 
                        className={`iso-doc-dropdown-arrow ${docDropdownOpen ? 'rotated' : ''}`} 
                      />
                    )}
                  </button>

                  {/* Dropdown Menu xổ xuống */}
                  {docDropdownOpen && uniqueWordDocs.length > 0 && (
                    <div className="iso-doc-dropdown-menu">
                      {uniqueWordDocs.length >= 3 && (
                        <div className="iso-doc-dropdown-search">
                          <Search size={14} color="#8D6E63" style={{ flexShrink: 0 }} />
                          <input
                            type="text"
                            placeholder="Tìm kiếm tài liệu Word theo tên hoặc thư mục..."
                            value={docSearchTerm}
                            onChange={(e) => setDocSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          {docSearchTerm && (
                            <button
                              type="button"
                              className="iso-doc-search-clear"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocSearchTerm('');
                              }}
                              title="Xóa tìm kiếm"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="iso-doc-dropdown-list">
                        {filteredWordDocs.length > 0 ? (
                          filteredWordDocs.map((docItem, idx) => {
                            const isSelected = (selectedWordDoc?.file_id && docItem?.file_id) 
                              ? selectedWordDoc.file_id === docItem.file_id 
                              : ((selectedWordDoc?.clean_rel_path || selectedWordDoc?.relative_path) && (docItem?.clean_rel_path || docItem?.relative_path))
                                ? String(selectedWordDoc.clean_rel_path || selectedWordDoc.relative_path || '').replace(/\\/g, '/').toLowerCase() === String(docItem.clean_rel_path || docItem.relative_path || '').replace(/\\/g, '/').toLowerCase()
                                : selectedWordDoc?.file_name === docItem.file_name;

                            const isDuplicateName = hasDuplicateDocName && hasDuplicateDocName(docItem.file_name);
                            const folderContext = getDocFolderContext ? getDocFolderContext(docItem) : '';

                            return (
                              <div
                                key={docItem.file_id || docItem.clean_rel_path || docItem.relative_path || docItem.raw_path || idx}
                                className={`iso-doc-dropdown-item ${isSelected ? 'selected' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWordDoc(docItem);
                                  loadTab2Doc(docItem);
                                  setDocDropdownOpen(false);
                                  setDocSearchTerm('');
                                }}
                              >
                                <div className="iso-doc-item-left">
                                  <FileText 
                                    size={15} 
                                    color={isSelected ? '#7B5233' : '#64748B'} 
                                    style={{ flexShrink: 0 }}
                                  />
                                  <div className="iso-doc-item-info">
                                    <div className="iso-doc-item-name" title={docItem.file_name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docItem.file_name}</span>
                                      {docItem.usage_status === 'NOT_IN_USE' && (
                                        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: 600, flexShrink: 0 }}>
                                          Bản phụ
                                        </span>
                                      )}
                                      {docItem.usage_status === 'IN_USE' && (
                                        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 600, flexShrink: 0 }}>
                                          Đang dùng
                                        </span>
                                      )}
                                    </div>
                                    {(isDuplicateName || folderContext) && (
                                      <div className="iso-doc-item-sub" title={docItem.relative_path}>
                                        {folderContext}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="iso-doc-item-right">
                                  {isSelected && (
                                    <Check size={16} color="#7B5233" strokeWidth={2.5} />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="iso-doc-dropdown-empty">
                            Không tìm thấy tài liệu phù hợp với "{docSearchTerm}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {uniqueWordDocs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedWordDoc(null)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #D9C7B6',
                      backgroundColor: '#FFFFFF',
                      color: '#7B5233',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}
                    title="Mở bảng chọn biểu mẫu để chuyển sang biểu mẫu khác"
                  >
                    <Layers size={13} color="#7B5233" />
                    <span>Đổi biểu mẫu</span>
                  </button>
                )}

                {acceptedDraft && (
                  <span className="iso-conversion-working-badge" title="Tài liệu đang làm việc từ bản chuyển đổi">
                    <CheckCircle2 size={13} />
                    <span>Bản làm việc (Sau chuyển đổi)</span>
                  </span>
                )}
              </div>
            )}

            {/* BÊN PHẢI: Zoom + Thao tác */}
            <div className="iso-doc-selector-bar-right">
              {/* Nhóm Thu phóng */}
              <div className="iso-viewer-zoom-group">
                <button 
                  type="button" 
                  className="iso-viewer-zoom-btn" 
                  onClick={() => setDocViewerZoom(prev => Math.max(50, prev - 10))}
                  title="Thu nhỏ"
                >
                  <ZoomOut size={13} />
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
                  <ZoomIn size={13} />
                </button>
                <button 
                  type="button" 
                  className="iso-viewer-zoom-btn" 
                  onClick={() => setDocViewerZoom(100)}
                  title="Kích thước chuẩn (100%)"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              {/* Menu Thao tác */}
              <div className="iso-action-dropdown-wrapper" ref={docActionMenuRef}>
                <button
                  type="button"
                  className="iso-btn-action-dropdown"
                  onClick={() => setIsDocActionMenuOpen(prev => !prev)}
                  title="Menu thao tác với tài liệu"
                >
                  <Settings size={14} />
                  <span>Thao tác</span>
                  <ChevronDown size={14} className={`iso-action-arrow ${isDocActionMenuOpen ? 'open' : ''}`} />
                </button>

                {isDocActionMenuOpen && (
                  <div className="iso-action-dropdown-menu">
                    {conversionStatus === 'CONVERTING' ? (
                      <div className="iso-action-item disabled" style={{ color: '#8D6E63', opacity: 0.85, cursor: 'default' }}>
                        <RefreshCw size={14} className="iso-spinner" />
                        <span>Đang chuẩn hóa tài liệu...</span>
                      </div>
                    ) : conversionState.active ? (
                      <>
                        <button
                          type="button"
                          className="iso-action-item highlight"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleOpenCompareModal();
                          }}
                        >
                          <Columns size={14} color="#2563EB" />
                          <span>So sánh Before / After</span>
                        </button>
                        <button
                          type="button"
                          className="iso-action-item"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleAcceptConversion();
                          }}
                        >
                          <span>Chấp nhận bản chuyển đổi</span>
                        </button>
                        <button
                          type="button"
                          className="iso-action-item danger"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleCancelConversion();
                          }}
                        >
                          <span>Hủy bản chuyển đổi</span>
                        </button>
                      </>
                    ) : acceptedDraft ? (
                      <>
                        <button
                          type="button"
                          className="iso-action-item highlight"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleOpenDirectWordEditor();
                          }}
                        >
                          <FileEdit size={14} color="#7B5233" />
                          <span>Chỉnh sửa Word (Trực tiếp)</span>
                        </button>
                        <button
                          type="button"
                          className="iso-action-item"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleOpenCompareModal();
                          }}
                        >
                          <Columns size={14} color="#2563EB" />
                          <span>So sánh Before / After</span>
                        </button>
                        <div className="iso-action-divider" />
                        <button
                          type="button"
                          className="iso-action-item"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleDownloadWorkingDraft();
                          }}
                        >
                          <Download size={14} />
                          <span>Tải bản làm việc (.docx)</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="iso-action-item highlight"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleStartConversion();
                          }}
                          disabled={conversionState.loading}
                        >
                          <Sparkles size={14} color="#7B5233" />
                          <span>{conversionState.loading ? 'Đang chuyển đổi...' : 'Chuyển đổi theo Mẫu quy trình.docx'}</span>
                        </button>
                        <button
                          type="button"
                          className="iso-action-item"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleOpenDirectWordEditor();
                          }}
                        >
                          <FileEdit size={14} color="#475569" />
                          <span>Chỉnh sửa Word (Trực tiếp)</span>
                        </button>
                        <button
                          type="button"
                          className="iso-action-item"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            handleOpenCompareModal();
                          }}
                        >
                          <Columns size={14} />
                          <span>So sánh Before / After</span>
                        </button>
                        <div className="iso-action-divider" />
                        <button
                          type="button"
                          className="iso-action-item"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            if (selectedWordDoc) handleDownloadFile(selectedWordDoc);
                          }}
                          disabled={downloadingFile || !selectedWordDoc}
                        >
                          <Download size={14} />
                          <span>Tải file gốc (.docx)</span>
                        </button>
                        <button
                          type="button"
                          className="iso-action-item"
                          onClick={() => {
                            setIsDocActionMenuOpen(false);
                            wordInputRef.current?.click();
                          }}
                        >
                          <Upload size={14} />
                          <span>Tải lên Word</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Word Ribbon Toolbar khi ở chế độ chỉnh sửa trực tiếp */}
      {isWordEditMode && renderWordRibbonToolbar()}

      {/* Banners */}
      {!isWordEditMode && conversionStatus === 'CONVERTING' && (
        <div className="iso-conversion-status-banner converting">
          <RefreshCw size={15} className="iso-spinner" />
          <span>Đã tải file. Đang chuẩn hóa tài liệu theo chuẩn Mẫu quy trình.docx...</span>
        </div>
      )}

      {!isWordEditMode && conversionStatus === 'CONVERSION_FAILED' && (
        <div className="iso-conversion-status-banner failed">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
            <span><strong>Tải file thành công nhưng chuyển đổi chưa hoàn tất:</strong> {conversionError || 'Có lỗi xảy ra.'}</span>
          </div>
          <button type="button" className="iso-btn-retry-conv" onClick={handleRetryConversion}>
            <RefreshCw size={12} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Body */}
      {isWordEditMode ? (
        <div className="iso-word-inline-editor-pane">
          <div className="iso-word-workspace inline-workspace">
            <div
              className="iso-word-a4-page"
              ref={wordEditorRef}
              contentEditable="true"
              suppressContentEditableWarning={true}
              onInput={() => setIsWordEditorDirty(true)}
              style={{
                fontFamily: wordEditorFont,
                transform: `scale(${wordEditorZoom / 100})`,
                transformOrigin: 'top center'
              }}
            />
          </div>
          <div className="iso-word-statusbar inline-statusbar">
            <div className="iso-word-status-left">
              <span>{isWordEditorDirty ? '● Có thay đổi chưa lưu' : '✓ Đã lưu tất cả thay đổi'}</span>
              <span className="iso-word-status-sep">|</span>
              <span>Khổ A4 (210 x 297 mm)</span>
            </div>
            <div className="iso-word-status-right">
              <span>Thu phóng: {wordEditorZoom}%</span>
              <span className="iso-word-status-sep">|</span>
              <span>Chỉnh sửa Word trực tiếp trên SmartFlow</span>
            </div>
          </div>
        </div>
      ) : uniqueWordDocs.length === 0 && !loadingRealFiles ? (
        <div className="iso-empty-word-pane">
          <Folder size={46} color="#CBD5E1" style={{ margin: '0 auto 14px auto', display: 'block' }} />
          <div style={{ fontSize: '0.98rem', fontWeight: '700', color: '#475569' }}>
            Chưa có tài liệu Word được liên kết với hồ sơ này
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '8px', lineHeight: '1.5', maxWidth: '480px' }}>
            Bạn có thể tải lên tài liệu Word (.docx, .doc) từ máy tính để hệ thống tự động trích xuất Mục lục (Heading) và hiển thị nội dung nguyên bản chuẩn A4.
          </div>
          <button
            type="button"
            className="iso-btn-brown"
            onClick={() => wordInputRef.current?.click()}
            disabled={uploadingWord}
            style={{ marginTop: '16px', padding: '8px 20px', fontSize: '0.84rem' }}
          >
            <Upload size={15} />
            <span>{uploadingWord ? 'Đang tải lên...' : 'Tải lên tài liệu Word (.docx)'}</span>
          </button>
        </div>
      ) : uniqueWordDocs.length >= 2 && !selectedWordDoc ? (
        <div className="iso-empty-word-pane" style={{ maxWidth: '680px', margin: '30px auto', padding: '28px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #EADCC9', boxShadow: '0 8px 24px rgba(45, 26, 18, 0.08)', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #FAF0E6', paddingBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FAF7F2', border: '1px solid #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={22} color="#7B5233" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#2D1A12' }}>
                Chọn biểu mẫu để thao tác
              </h4>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Quy trình này có <strong>{uniqueWordDocs.length} biểu mẫu</strong>. Vui lòng bấm chọn biểu mẫu bạn muốn xem và thao tác bên dưới:
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {uniqueWordDocs.map((docItem, idx) => (
              <div
                key={docItem.file_id || docItem.relative_path || idx}
                onClick={() => {
                  setSelectedWordDoc(docItem);
                  loadTab2Doc(docItem);
                }}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7B5233';
                  e.currentTarget.style.backgroundColor = '#FAF7F2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#EADCC9';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <FileText size={18} color="#7B5233" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#FAF7F2',
                        border: '1px solid #EADCC9',
                        color: '#7B5233',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}>
                        {docItem.code || docItem.source_code || 'BIỂU MẪU'}
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {docItem.document_name || docItem.file_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '3px' }}>
                      Phiên bản: {docItem.version ? `v${docItem.version}` : 'v01'} • Tệp tin: {docItem.file_name}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="iso-btn-brown"
                  style={{ padding: '7px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Mở thao tác</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="iso-viewer-split" style={{ flex: 1, minHeight: 0 }}>
          {/* Cột trái: Mục lục */}
          <div className="iso-viewer-toc">
            <div className="iso-viewer-toc-title">
              <List size={14} color="#7B5233" />
              <span>MỤC LỤC TÀI LIỆU</span>
            </div>

            {tab2DocContent.headings && tab2DocContent.headings.length > 0 ? (
              tab2DocContent.headings.map((heading) => (
                <div
                  key={heading.id}
                  className={`iso-viewer-toc-item level-${heading.level} ${activeHeadingId === heading.id ? 'active' : ''}`}
                  onClick={() => scrollToHeading(heading.id)}
                  title={heading.title}
                >
                  {heading.title}
                </div>
              ))
            ) : (
              <div style={{ padding: '24px 12px', fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' }}>
                Tài liệu không có tiêu đề phân cấp Heading
              </div>
            )}
          </div>

          {/* Cột phải: Nội dung Word */}
          <div className="iso-viewer-doc-pane iso-document-viewer">
            {tab2DocContent.loading ? (
              <div style={{ padding: '100px 20px', textAlign: 'center', color: '#8D6E63' }}>
                <RefreshCw className="iso-spinner" size={32} />
                <div style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: '600' }}>
                  Đang tải nội dung tài liệu Word...
                </div>
              </div>
            ) : tab2DocContent.error ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#DC2626' }}>
                <AlertTriangle size={36} style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontSize: '0.92rem', fontWeight: '700' }}>{tab2DocContent.error}</div>
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="iso-page-btn"
                    onClick={() => loadTab2Doc(selectedWordDoc)}
                    style={{ fontSize: '0.78rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <RefreshCw size={13} />
                    <span>Thử lại</span>
                  </button>
                  {selectedWordDoc && (
                    <button
                      type="button"
                      className="iso-btn-download-source"
                      onClick={() => handleDownloadFile(selectedWordDoc)}
                      disabled={downloadingFile}
                    >
                      <Download size={13} />
                      <span>Tải file gốc</span>
                    </button>
                  )}
                </div>
              </div>
            ) : tab2DocContent.preview_pdf_url ? (
              <div className="iso-pdf-viewport">
                <div className="iso-a4-preview-wrapper">
                  <iframe
                    src={`${tab2DocContent.preview_pdf_url}#toolbar=1&navpanes=0&zoom=${docViewerZoom}`}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    title="Word Document Preview"
                  />
                </div>
              </div>
            ) : tab2DocContent.html_content ? (
              <div 
                className="iso-word-html-viewport" 
                style={{ 
                  flex: 1, 
                  height: '100%', 
                  minHeight: 0, 
                  overflowY: 'auto', 
                  overflowX: 'auto', 
                  padding: '28px 16px 80px 16px', 
                  backgroundColor: '#FAF7F2', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'flex-start' 
                }}
              >
                <div 
                  className="iso-viewer-page"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#1E293B',
                    boxShadow: '0 4px 20px rgba(45, 26, 18, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #EADCC9',
                    borderRadius: '6px',
                    padding: '40px 48px',
                    margin: '0 auto',
                    maxWidth: '860px',
                    width: '100%',
                    boxSizing: 'border-box',
                    transform: docViewerZoom !== 100 ? `scale(${docViewerZoom / 100})` : 'none',
                    transformOrigin: 'top center'
                  }}
                  dangerouslySetInnerHTML={{ __html: tab2DocContent.html_content }}
                />
              </div>
            ) : (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: '#94A3B8' }}>
                Chưa có nội dung hiển thị
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
export default ISODocumentContentTab;
