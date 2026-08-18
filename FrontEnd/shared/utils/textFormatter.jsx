import React from 'react';
import { Check } from 'lucide-react';

/**
 * Hàm chuẩn hóa và chuyển đổi các ký tự Symbol/Wingdings từ Microsoft Word, Excel, PDF
 * sang ký tự Unicode chuẩn (✓, •, v.v.), tránh bị hiển thị thành ô vuông lỗi [□].
 */
export const cleanWordClipboardText = (text) => {
  if (!text || typeof text !== 'string') return text || '';

  let cleaned = text
    // 1. Chuyển đổi ký tự checkmark của Wingdings/Symbol (Word PUA) sang dấu ✓ chuẩn
    .replace(/[\uF0FC\uF0FE\uF0DE\uF0FB\u2713\u2714\u221A]/g, '✓ ')
    // 2. Chuyển đổi các ký tự bullet tròn/vuông/tam giác của Word sang bullet • chuẩn
    .replace(/[\uF0B7\uF0A7\uF0A8\uF0A9\uF0D8\uF06F\uF0E0\uF076\uF06E\uF070\u2022\u25CF\u25AA\u25AB\u25A0\u25A1\u25FB\u25FC\u25FD\u25FE]/g, '• ')
    // 3. Chuyển đổi ký tự mũi tên của Wingdings sang › chuẩn
    .replace(/[\uF0D2\uF0E8\u203A\u276F]/g, '› ')
    // 4. Xóa/thay thế các ký tự Private Use Area (PUA) khác từ Word Font
    .replace(/[\uE000-\uF8FF]/g, '')
    // 5. Thay thế khoảng trắng đặc biệt (Non-breaking space, zero-width space)
    .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    // 6. Chuẩn hóa khoảng trắng kép sau ký tự đặc biệt
    .replace(/✓\s+/g, '✓ ')
    .replace(/•\s+/g, '• ')
    .replace(/›\s+/g, '› ');

  return cleaned;
};

/**
 * Xử lý sự kiện onPaste trên thẻ input / textarea để tự động chuẩn hóa văn bản
 */
export const handlePasteCleanText = (e, onUpdate) => {
  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData) return;

  const rawText = clipboardData.getData('text/plain');
  if (!rawText) return;

  const cleaned = cleanWordClipboardText(rawText);
  if (cleaned !== rawText) {
    e.preventDefault();
    const target = e.target;
    const start = target.selectionStart !== undefined ? target.selectionStart : target.value.length;
    const end = target.selectionEnd !== undefined ? target.selectionEnd : target.value.length;
    const currentValue = target.value || '';
    const nextValue = currentValue.substring(0, start) + cleaned + currentValue.substring(end);

    if (onUpdate) {
      onUpdate(nextValue);
    }

    setTimeout(() => {
      if (target.setSelectionRange) {
        const newPos = start + cleaned.length;
        target.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }
};

const ALLOWED_TAGS = new Set(['p','br','b','strong','i','em','u','s','strike','ul','ol','li','h1','h2','h3','h4','h5','h6','a','img','table','thead','tbody','tr','td','th','pre','blockquote','span','font','sup','sub']);
const ALLOWED_STYLES = new Set(['color', 'background-color']);

const filterStyle = (styleStr) => {
  if (!styleStr) return '';
  return styleStr
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      const prop = s.split(':')[0]?.trim().toLowerCase();
      return ALLOWED_STYLES.has(prop);
    })
    .join(';');
};

const cleanHtml = (html) => {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(false);
    if (node.nodeType === Node.COMMENT_NODE) return null;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'title' || tag === 'link' || tag === 'head') return null;

    if (!ALLOWED_TAGS.has(tag)) {
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

const isHtml = (text) => new RegExp('<\\/?(p|span|div|font|b|i|u|s|strong|em|ul|ol|li|table|tr|td|th|a|img|h[1-6]|br|hr|pre|blockquote)', 'i').test(text);

/**
 * Component hiển thị văn bản định dạng phong phú:
 * - Dòng bắt đầu bằng '✓' hoặc '✔': Hiển thị dấu tick xanh và in đậm tiêu chí
 * - Dòng bắt đầu bằng '•' hoặc '-' hoặc '*': Hiển thị gạch đầu dòng căn lề chuẩn
 * - Nhận diện tiền tố nhãn (Ví dụ: "Đối với định hình:", "Lưu ý:") và tự động in đậm
 */
export const FormattedTextView = ({ text, style = {}, className = '' }) => {
  if (!text) return null;

  if (isHtml(text)) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '13.5px',
          lineHeight: '1.6',
          color: '#374151',
          ...style
        }}
        dangerouslySetInnerHTML={{ __html: cleanHtml(text) }}
      />
    );
  }

  // Làm sạch ký tự trước khi render
  const sanitizedText = cleanWordClipboardText(text);
  const lines = sanitizedText.split('\n');

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '13.5px',
        lineHeight: '1.6',
        color: '#374151',
        ...style
      }}
    >
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} style={{ height: '6px' }} />;
        }

        // 1. Kiểm tra dòng bắt đầu bằng checkmark ✓
        if (/^[✓✔]/.test(trimmed)) {
          const contentAfterCheck = trimmed.replace(/^[✓✔]\s*/, '');
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginTop: '2px',
                fontWeight: 700,
                color: '#1F2937'
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  fontSize: '13px',
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: '2px'
                }}
              >
                ✓
              </span>
              <div style={{ flex: 1 }}>{renderLineWithBoldLabels(contentAfterCheck)}</div>
            </div>
          );
        }

        // 2. Kiểm tra dòng bắt đầu bằng bullet • hoặc - hoặc * hoặc ›
        if (/^[•\-*›]/.test(trimmed)) {
          const contentAfterBullet = trimmed.replace(/^[•\-*›]\s*/, '');
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginLeft: '16px',
                color: '#374151'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#4B5563',
                  flexShrink: 0,
                  marginTop: '8px'
                }}
              />
              <div style={{ flex: 1 }}>{renderLineWithBoldLabels(contentAfterBullet)}</div>
            </div>
          );
        }

        // 3. Dòng thông thường (Đoạn văn bản mở đầu hoặc hướng dẫn tổng quát)
        return (
          <div key={idx} style={{ color: '#374151' }}>
            {renderLineWithBoldLabels(trimmed)}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Tự động tìm và in đậm các nhãn có dấu hai chấm ":" ở đầu (VD: "Đối với định hình:", "Bước 1:")
 */
const renderLineWithBoldLabels = (text) => {
  if (!text) return null;

  // Regex tìm tiền tố: "Đối với định hình:", "Kiểm tra kích thước:", "Lưu ý:", "Tiêu chuẩn:"...
  const match = text.match(/^((?:\d+\.\s*)?[^:–—]{2,35}[:–—])\s*(.*)$/);
  if (match) {
    return (
      <>
        <strong style={{ fontWeight: 700, color: '#111827' }}>{match[1]}</strong>{' '}
        <span>{match[2]}</span>
      </>
    );
  }

  return <span>{text}</span>;
};

/**
 * Loại bỏ tất cả thẻ HTML và chuẩn hóa khoảng trắng để hiển thị text tóm tắt thuần túy
 */
export const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return html || '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.textContent || doc.body.innerText || '').replace(/\s+/g, ' ').trim();
};

export default FormattedTextView;
