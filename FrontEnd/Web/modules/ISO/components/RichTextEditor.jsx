import React from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, Quote, Link, Image, Grid, Smile, Undo, Redo 
} from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder, style = {}, minHeight }) => {
  const editorRef = React.useRef(null);

  const initialCleanedRef = React.useRef(false);

  const cleanHtml = (html) => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const allowedTags = new Set(['p','br','b','strong','i','em','u','s','strike','ul','ol','li','h1','h2','h3','h4','h5','h6','a','img','table','thead','tbody','tr','td','th','pre','blockquote','span','font','sup','sub']);
    const allowedStyles = new Set(['color', 'background-color']);

    const filterStyle = (styleStr) => {
      if (!styleStr) return '';
      return styleStr
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          const prop = s.split(':')[0]?.trim().toLowerCase();
          return allowedStyles.has(prop);
        })
        .join(';');
    };

    const cleanNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(false);
      if (node.nodeType === Node.COMMENT_NODE) return null;
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const tag = node.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'title' || tag === 'link' || tag === 'head') return null;
      if (!allowedTags.has(tag)) {
        const fragment = document.createDocumentFragment();
        node.childNodes.forEach(child => {
          const cleaned = cleanNode(child);
          if (cleaned) fragment.appendChild(cleaned);
        });
        return fragment;
      }
      const el = document.createElement(tag);
      if (tag === 'a' && node.getAttribute('href')) el.setAttribute('href', node.getAttribute('href'));
      if ((tag === 'img' || tag === 'image') && node.getAttribute('src')) {
        el.setAttribute('src', node.getAttribute('src'));
        if (node.getAttribute('alt')) el.setAttribute('alt', node.getAttribute('alt'));
      }
      if ((tag === 'td' || tag === 'th')) {
        const colspan = node.getAttribute('colspan');
        const rowspan = node.getAttribute('rowspan');
        if (colspan) el.setAttribute('colspan', colspan);
        if (rowspan) el.setAttribute('rowspan', rowspan);
      }
      const style = filterStyle(node.getAttribute('style'));
      if (style) el.setAttribute('style', style);
      const colorAttr = node.getAttribute('color');
      if ((tag === 'font' || tag === 'span') && colorAttr) el.setAttribute('color', colorAttr);
      node.childNodes.forEach(child => {
        const cleaned = cleanNode(child);
        if (cleaned) el.appendChild(cleaned);
      });
      if ((tag === 'span' || tag === 'font' || tag === 'div') && !el.hasAttributes()) {
        const fragment = document.createDocumentFragment();
        while (el.firstChild) fragment.appendChild(el.firstChild);
        return fragment;
      }
      if (el.childNodes.length === 0 && (tag === 'p' || tag === 'div')) return null;
      return el;
    };

    const fragment = document.createDocumentFragment();
    doc.body.childNodes.forEach(child => {
      const cleaned = cleanNode(child);
      if (cleaned) fragment.appendChild(cleaned);
    });
    const wrapper = document.createElement('div');
    wrapper.appendChild(fragment);
    return wrapper.innerHTML;
  };

  React.useEffect(() => {
    if (!editorRef.current) return;
    const desired = cleanHtml(value || '');
    if (editorRef.current.innerHTML !== desired) {
      editorRef.current.innerHTML = desired;
    }
    if (value && value !== desired && !initialCleanedRef.current) {
      onChange(desired);
      initialCleanedRef.current = true;
    }
  }, [value, onChange, cleanHtml]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      // Strip font-family khác, ép Times New Roman trước khi clean HTML
      let fontFixedHtml = html
        .replace(/font-family\s*:\s*[^;"'}]+;?/gi, 'font-family: "Times New Roman", Times, serif;')
        .replace(/<font[^>]*\sface="[^"]*"/gi, (match) => match.replace(/face="[^"]*"/, 'face="Times New Roman"'));
      document.execCommand('insertHTML', false, cleanHtml(fontFixedHtml));
    } else if (text) {
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, `<span style="font-family: 'Times New Roman', Times, serif;">${escaped}</span>`);
    }
    handleInput();
  };

  const executeCommand = (e, command, val = null) => {
    e.preventDefault();
    document.execCommand(command, false, val);
    handleInput();
  };

  // Khi focus vào editor, đảm bảo font mặc định là Times New Roman
  const handleFocus = () => {
    try {
      document.execCommand('fontName', false, 'Times New Roman');
    } catch (_) {}
  };

  const handleColorChange = (e, command) => {
    document.execCommand(command, false, e.target.value);
    handleInput();
  };

  const insertLink = (e) => {
    e.preventDefault();
    const url = prompt("Nhập đường dẫn URL:");
    if (url) {
      document.execCommand('createLink', false, url);
      handleInput();
    }
  };

  const insertImage = (e) => {
    e.preventDefault();
    const url = prompt("Nhập URL của ảnh:");
    if (url) {
      document.execCommand('insertImage', false, url);
      handleInput();
    }
  };

  const insertTable = (e) => {
    e.preventDefault();
    const tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.85rem;" border="1">
        <thead>
          <tr style="background-color: #FAF6F0; border: 1px solid #7B5233;">
            <th style="padding: 8px; border: 1px solid #7B5233; text-align: left; font-weight: bold;">Tiêu đề 1</th>
            <th style="padding: 8px; border: 1px solid #7B5233; text-align: left; font-weight: bold;">Tiêu đề 2</th>
            <th style="padding: 8px; border: 1px solid #7B5233; text-align: left; font-weight: bold;">Tiêu đề 3</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border: 1px solid #EADCC9;">
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 1</td>
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 2</td>
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 3</td>
          </tr>
          <tr style="border: 1px solid #EADCC9;">
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 4</td>
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 5</td>
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 6</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand('insertHTML', false, tableHTML);
    handleInput();
  };

  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#475569',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
  };

  const selectStyle = {
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.8rem',
    color: '#334155',
    backgroundColor: 'white',
    outline: 'none',
    cursor: 'pointer',
    height: '32px'
  };

  const dividerStyle = {
    width: '1px',
    height: '20px',
    backgroundColor: '#e2e8f0',
    margin: '0 4px',
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white', display: 'flex', flexDirection: 'column', ...style }}>
      {/* Modern Ribbon/Excel toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '8px 12px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        alignItems: 'center',
        userSelect: 'none'
      }}>
        {/* Paragraph Block Selection */}
        <select 
          onChange={(e) => executeCommand(e, 'formatBlock', e.target.value)}
          defaultValue="p"
          style={{ ...selectStyle, width: '110px' }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="pre">Code Block</option>
        </select>

        {/* Font Family Selection */}
        <select 
          onChange={(e) => executeCommand(e, 'fontName', e.target.value)}
          defaultValue="Times New Roman"
          style={{ ...selectStyle, width: '130px' }}
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>

        {/* Font Size Selection */}
        <select 
          onChange={(e) => executeCommand(e, 'fontSize', e.target.value)}
          defaultValue="3"
          style={{ ...selectStyle, width: '56px' }}
        >
          <option value="1">10</option>
          <option value="2">12</option>
          <option value="3">14</option>
          <option value="4">16</option>
          <option value="5">18</option>
          <option value="6">24</option>
          <option value="7">32</option>
        </select>

        <span style={dividerStyle} />

        {/* Basic styles */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'bold')} style={btnStyle} title="Đậm (B)">
          <Bold size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'italic')} style={btnStyle} title="Nghiêng (I)">
          <Italic size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'underline')} style={btnStyle} title="Gạch chân (U)">
          <Underline size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'strikeThrough')} style={btnStyle} title="Gạch ngang (S)">
          <Strikethrough size={15} />
        </button>

        {/* Color picker */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '28px', height: '28px', cursor: 'pointer' }} title="Màu chữ">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1', color: '#334155' }}>A</span>
            <div style={{ width: '12px', height: '3px', backgroundColor: '#e11d48', marginTop: '1px' }} />
          </div>
          <input 
            type="color" 
            onChange={(e) => handleColorChange(e, 'foreColor')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }} 
          />
        </div>

        {/* Highlight Color */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '28px', height: '28px', cursor: 'pointer' }} title="Tô màu nền chữ">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1', color: '#334155' }}>✎</span>
            <div style={{ width: '12px', height: '3px', backgroundColor: '#eab308', marginTop: '1px' }} />
          </div>
          <input 
            type="color" 
            onChange={(e) => handleColorChange(e, 'backColor')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }} 
          />
        </div>

        <span style={dividerStyle} />

        {/* Lists */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'insertUnorderedList')} style={btnStyle} title="Danh sách ký hiệu">
          <List size={16} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'insertOrderedList')} style={btnStyle} title="Danh sách số">
          <ListOrdered size={16} />
        </button>

        <span style={dividerStyle} />

        {/* Alignments */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyLeft')} style={btnStyle} title="Căn trái">
          <AlignLeft size={16} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyCenter')} style={btnStyle} title="Căn giữa">
          <AlignCenter size={16} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyRight')} style={btnStyle} title="Căn phải">
          <AlignRight size={16} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyFull')} style={btnStyle} title="Căn đều">
          <AlignJustify size={16} />
        </button>

        <span style={dividerStyle} />

        {/* Quote & Inserts */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'formatBlock', 'blockquote')} style={btnStyle} title="Trích dẫn">
          <Quote size={15} />
        </button>
        <button type="button" onMouseDown={insertLink} style={btnStyle} title="Chèn liên kết">
          <Link size={15} />
        </button>
        <button type="button" onMouseDown={insertImage} style={btnStyle} title="Chèn ảnh">
          <Image size={15} />
        </button>
        <button type="button" onMouseDown={insertTable} style={btnStyle} title="Chèn bảng">
          <Grid size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'insertHTML', '😊')} style={btnStyle} title="Emoji">
          <Smile size={16} />
        </button>

        <span style={dividerStyle} />

        {/* Undo/Redo */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'undo')} style={btnStyle} title="Hoàn tác">
          <Undo size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'redo')} style={btnStyle} title="Làm lại">
          <Redo size={15} />
        </button>
      </div>

      {/* Editor Canvas */}
      <style>{`
        .rich-editor-canvas:empty:before {
          content: attr(placeholder);
          color: #94a3b8;
          font-style: italic;
          pointer-events: none;
        }
      `}</style>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={handleFocus}
        className="rich-editor-canvas"
        style={{
          minHeight: minHeight ? (typeof minHeight === 'number' ? `${minHeight}px` : minHeight) : (style.minHeight ? (typeof style.minHeight === 'number' ? `${style.minHeight}px` : style.minHeight) : '200px'),
          padding: '12px 16px',
          outline: 'none',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          fontFamily: '"Times New Roman", Times, serif',
          color: '#000000',
          overflowY: 'auto'
        }}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
