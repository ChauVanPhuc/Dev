import React, { useEffect, useState, useCallback } from 'react';
import { 
  FileEdit, X, RefreshCw, Save, Undo, Redo, Bold, Italic, 
  Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, List, ListOrdered, ChevronLeft, ChevronRight, 
  Table as TableIcon, ZoomOut, ZoomIn, RotateCcw, BookOpen 
} from 'lucide-react';

const ISODirectWordEditorModal = ({
  showDirectWordEditorModal,
  handleCloseDirectWordEditor,
  savingWordDirect,
  handleSaveDirectWordContent,
  acceptedDraft,
  conversionState,
  selectedWordDoc,
  isWordEditorDirty,
  setIsWordEditorDirty,
  wordEditorRef,
  handleExecWordCmd,
  wordEditorFont,
  setWordEditorFont,
  wordEditorFontSize,
  setWordEditorFontSize,
  wordEditorStyle,
  setWordEditorStyle,
  handleInsertWordTable,
  wordEditorZoom,
  setWordEditorZoom,
  initialHtml
}) => {
  const [showNavPane, setShowNavPane] = useState(true);
  const [docHeadings, setDocHeadings] = useState([]);

  // Quét danh sách các tiêu đề (Heading) đang có trên trang soạn thảo
  const updateDocHeadings = useCallback(() => {
    if (!wordEditorRef?.current) return;
    const headingEls = wordEditorRef.current.querySelectorAll('h1, h2, h3, h4, .iso-doc-heading');
    const list = [];
    headingEls.forEach((el, idx) => {
      if (!el.id) {
        el.id = `editor-heading-${idx + 1}`;
      }
      const tag = el.tagName.toLowerCase();
      let level = 1;
      if (tag === 'h1') level = 1;
      else if (tag === 'h2') level = 2;
      else if (tag === 'h3') level = 3;
      else if (tag === 'h4') level = 4;
      else if (el.classList.contains('level-2')) level = 2;
      else if (el.classList.contains('level-3')) level = 3;

      const title = el.innerText?.trim();
      if (title) {
        list.push({ id: el.id, title, level, el });
      }
    });
    setDocHeadings(list);
  }, [wordEditorRef]);

  // Nhận diện kiểu đoạn văn (p, h1, h2, h3...) tại vị trí con trỏ chuột
  const detectCurrentBlockStyle = useCallback(() => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !wordEditorRef?.current) return;
      let node = sel.anchorNode;
      while (node && node !== wordEditorRef.current) {
        const tag = node.nodeName?.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'p'].includes(tag)) {
          setWordEditorStyle(tag);
          return;
        }
        node = node.parentNode;
      }
      setWordEditorStyle('p');
    } catch (_) {}
  }, [wordEditorRef, setWordEditorStyle]);

  useEffect(() => {
    if (showDirectWordEditorModal && wordEditorRef?.current) {
      wordEditorRef.current.innerHTML = initialHtml || '<p>Tài liệu trống</p>';
      if (setIsWordEditorDirty) {
        setIsWordEditorDirty(false);
      }
      setTimeout(updateDocHeadings, 150);
    }
  }, [showDirectWordEditorModal, initialHtml, updateDocHeadings, setIsWordEditorDirty]);

  if (!showDirectWordEditorModal) return null;

  return (
    <div className="iso-word-editor-modal-overlay">
      <div className="iso-word-editor-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header: Tiêu đề, Tên file, Trạng thái & Các nút Lưu/Hủy */}
        <div className="iso-word-editor-header">
          <div className="iso-word-editor-title-group">
            <FileEdit size={18} color="#7B5233" />
            <span className="iso-word-editor-title">Chỉnh sửa tài liệu Word</span>
            <span className="iso-word-editor-badge">Bản làm việc</span>
            <span className="iso-word-editor-filename" title={acceptedDraft?.draft_filename || conversionState.data?.draft_filename || selectedWordDoc?.file_name}>
              {acceptedDraft?.draft_filename || conversionState.data?.draft_filename || selectedWordDoc?.file_name || 'Document.docx'}
            </span>
            {isWordEditorDirty && (
              <span className="iso-word-unsaved-dot" title="Có thay đổi chưa lưu">• Chưa lưu</span>
            )}
          </div>
          <div className="iso-word-editor-header-actions">
            <button
              type="button"
              className="iso-word-btn-cancel"
              onClick={handleCloseDirectWordEditor}
              disabled={savingWordDirect}
            >
              <X size={14} />
              <span>Hủy</span>
            </button>
            <button
              type="button"
              className="iso-word-btn-save"
              onClick={handleSaveDirectWordContent}
              disabled={savingWordDirect}
            >
              {savingWordDirect ? (
                <>
                  <RefreshCw className="iso-spinner" size={14} />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Lưu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Word Ribbon Toolbar */}
        <div className="iso-word-ribbon">
          {/* Nhóm 1: Undo / Redo */}
          <div className="iso-ribbon-group">
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('undo')}
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('redo')}
              title="Làm lại (Ctrl+Y)"
            >
              <Redo size={14} />
            </button>
          </div>

          {/* Nhóm 2: Font & Cỡ chữ */}
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

          {/* Nhóm 3: Định dạng chữ (Bold, Italic, Underline, Strikethrough) */}
          <div className="iso-ribbon-group">
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('bold')}
              title="In đậm (Ctrl+B)"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('italic')}
              title="In nghiêng (Ctrl+I)"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('underline')}
              title="Gạch chân (Ctrl+U)"
            >
              <Underline size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('strikeThrough')}
              title="Gạch ngang chữ"
            >
              <Strikethrough size={14} />
            </button>
          </div>

          {/* Nhóm 4: Heading / Kiểu đoạn */}
          <div className="iso-ribbon-group">
            <select
              className="iso-ribbon-select heading-style"
              value={wordEditorStyle}
              onChange={(e) => {
                const newStyle = e.target.value;
                setWordEditorStyle(newStyle);
                handleExecWordCmd('formatBlock', `<${newStyle}>`);
                if (setIsWordEditorDirty) setIsWordEditorDirty(true);
                setTimeout(updateDocHeadings, 120);
              }}
              title="Định dạng đoạn / Tiêu đề"
            >
              <option value="p">Đoạn văn (Normal)</option>
              <option value="h1">Heading 1 (Mục lớn)</option>
              <option value="h2">Heading 2 (Mục con)</option>
              <option value="h3">Heading 3 (Tiểu mục)</option>
              <option value="h4">Heading 4</option>
            </select>
          </div>

          {/* Nhóm Điều hướng / Mục lục */}
          <div className="iso-ribbon-group">
            <button
              type="button"
              className={`iso-ribbon-btn ${showNavPane ? 'active' : ''}`}
              onClick={() => setShowNavPane(prev => !prev)}
              title="Hiện / Ẩn thanh mục lục (Navigation Pane)"
              style={showNavPane ? { backgroundColor: '#e2e8f0', color: '#1e293b' } : {}}
            >
              <BookOpen size={14} />
              <span style={{ fontSize: '0.74rem', marginLeft: '4px' }}>Mục lục</span>
            </button>
          </div>

          {/* Nhóm 5: Căn lề */}
          <div className="iso-ribbon-group">
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('justifyLeft')}
              title="Căn trái"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('justifyCenter')}
              title="Căn giữa"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('justifyRight')}
              title="Căn phải"
            >
              <AlignRight size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('justifyFull')}
              title="Căn đều 2 bên"
            >
              <AlignJustify size={14} />
            </button>
          </div>

          {/* Nhóm 6: Danh sách & Thụt lề */}
          <div className="iso-ribbon-group">
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('insertUnorderedList')}
              title="Danh sách gạch đầu dòng (Bullets)"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('insertOrderedList')}
              title="Danh sách số (Numbering)"
            >
              <ListOrdered size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('outdent')}
              title="Giảm thụt lề (Outdent)"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => handleExecWordCmd('indent')}
              title="Tăng thụt lề (Indent)"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Nhóm 7: Bảng biểu */}
          <div className="iso-ribbon-group">
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={handleInsertWordTable}
              title="Chèn bảng biểu"
            >
              <TableIcon size={14} />
              <span style={{ fontSize: '0.74rem', marginLeft: '3px' }}>Bảng</span>
            </button>
          </div>

          {/* Nhóm 8: Thu phóng */}
          <div className="iso-ribbon-group zoom-group" style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => setWordEditorZoom(prev => Math.max(50, prev - 10))}
              title="Thu nhỏ"
            >
              <ZoomOut size={13} />
            </button>
            <span className="iso-ribbon-zoom-text">{wordEditorZoom}%</span>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => setWordEditorZoom(prev => Math.min(200, prev + 10))}
              title="Phóng to"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => setWordEditorZoom(100)}
              title="100%"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* Thân cửa sổ soạn thảo: Bao gồm Mục lục bên trái (nếu bật) và Trang giấy A4 */}
        <div className="iso-word-editor-body">
          {showNavPane && (
            <div className="iso-word-nav-pane">
              <div className="iso-word-nav-header">
                <span>Mục lục ({docHeadings.length})</span>
                <button
                  type="button"
                  onClick={() => setShowNavPane(false)}
                  title="Đóng mục lục"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748B' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="iso-word-nav-list">
                {docHeadings.length === 0 ? (
                  <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.78rem', textAlign: 'center' }}>
                    Chưa có Heading nào trong tài liệu
                  </div>
                ) : (
                  docHeadings.map((h, idx) => (
                    <div
                      key={h.id || idx}
                      className={`iso-word-nav-item level-${h.level}`}
                      onClick={() => {
                        if (h.el) {
                          const ws = h.el.closest('.iso-word-workspace');
                          if (ws) {
                            const wsRect = ws.getBoundingClientRect();
                            const elRect = h.el.getBoundingClientRect();
                            const offset = elRect.top - wsRect.top + ws.scrollTop - 30;
                            ws.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
                          } else {
                            h.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                      }}
                      title={h.title}
                    >
                      {h.title}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Vùng soạn thảo giấy A4 (Word Canvas) */}
          <div className="iso-word-workspace">
            <div
              className="iso-word-a4-page"
              ref={wordEditorRef}
              contentEditable="true"
              suppressContentEditableWarning={true}
              onKeyUp={detectCurrentBlockStyle}
              onMouseUp={detectCurrentBlockStyle}
              onInput={() => {
                if (setIsWordEditorDirty) setIsWordEditorDirty(true);
                updateDocHeadings();
              }}
              onPaste={(e) => {
                e.preventDefault();
                const html = e.clipboardData.getData('text/html');
                const text = e.clipboardData.getData('text/plain');
                if (html) {
                  let cleanedHtml = html
                    .replace(/font-family\s*:\s*[^;"'}]+;?/gi, 'font-family: "Times New Roman", Times, serif;')
                    .replace(/<font[^>]*\sface="[^"]*"/gi, (match) => match.replace(/face="[^"]*"/, 'face="Times New Roman"'));
                  document.execCommand('insertHTML', false, cleanedHtml);
                } else if (text) {
                  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                  document.execCommand('insertHTML', false, `<span style="font-family: 'Times New Roman', Times, serif;">${escaped}</span>`);
                }
                if (setIsWordEditorDirty) setIsWordEditorDirty(true);
                updateDocHeadings();
              }}
              style={{
                fontFamily: wordEditorFont,
                transform: `scale(${wordEditorZoom / 100})`,
                transformOrigin: 'top center'
              }}
            />
          </div>
        </div>

        {/* Thanh trạng thái chân Word */}
        <div className="iso-word-statusbar">
          <div className="iso-word-status-left">
            <span>{isWordEditorDirty ? 'Có thay đổi chưa lưu' : 'Đã lưu tất cả thay đổi'}</span>
            <span className="iso-word-status-sep">|</span>
            <span>Khổ A4 (210 x 297 mm)</span>
          </div>
          <div className="iso-word-status-right">
            <span>Thu phóng: {wordEditorZoom}%</span>
            <span className="iso-word-status-sep">|</span>
            <span>Chỉnh sửa trực tiếp bản làm việc</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ISODirectWordEditorModal;
