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

/**
 * Component hiển thị văn bản định dạng phong phú:
 * - Dòng bắt đầu bằng '✓' hoặc '✔': Hiển thị dấu tick xanh và in đậm tiêu chí
 * - Dòng bắt đầu bằng '•' hoặc '-' hoặc '*': Hiển thị gạch đầu dòng căn lề chuẩn
 * - Nhận diện tiền tố nhãn (Ví dụ: "Đối với định hình:", "Lưu ý:") và tự động in đậm
 */
export const FormattedTextView = ({ text, style = {}, className = '' }) => {
  if (!text) return null;

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

export default FormattedTextView;
