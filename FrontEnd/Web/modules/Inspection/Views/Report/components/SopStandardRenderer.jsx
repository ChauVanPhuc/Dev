import React from 'react';
import DOMPurify from 'dompurify';

/**
 * Làm sạch và chuẩn hóa chuỗi HTML tiêu chuẩn kỹ thuật
 */
export function cleanSopStandardHtml(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  if (!str) return '';

  const hasTags = /<[a-z][\s\S]*>/i.test(str);
  if (!hasTags) return str;

  // 1. Loại bỏ toàn bộ style="..." nội tuyến (như font-size, màu var(--O42jJQ), font-family...)
  // để typography và CSS class của bảng kiểm tra kiểm soát đồng bộ, gọn gàng.
  str = str.replace(/\s*style="[^"]*"/gi, '');

  // 2. Tháo gỡ các thẻ span rỗng hoặc lồng ghép thừa từ rich text editor
  str = str.replace(/<\/?span[^>]*>/gi, '');

  // 3. Tối ưu cấu trúc danh sách lồng nhau thừa thãi từ editor: <ul><li><ul><li> -> <ul><li>
  str = str.replace(/<ul>\s*<li>\s*<ul>/gi, '<ul>');
  str = str.replace(/<\/ul>\s*<\/li>\s*<\/ul>/gi, '</ul>');
  str = str.replace(/<ol>\s*<li>\s*<ol>/gi, '<ol>');
  str = str.replace(/<\/ol>\s*<\/li>\s*<\/ol>/gi, '</ol>');

  // 4. Lặp loại bỏ các thẻ rỗng hoặc chỉ chứa khoảng trắng / thẻ xuống dòng <br>
  let prev;
  do {
    prev = str;
    str = str.replace(/<p[^>]*>(\s*|<br\s*\/?>|&nbsp;)*<\/p>/gi, '');
    str = str.replace(/<div[^>]*>(\s*|<br\s*\/?>|&nbsp;)*<\/div>/gi, '');
    str = str.replace(/<li[^>]*>(\s*|<br\s*\/?>|&nbsp;)*<\/li>/gi, '');
    str = str.replace(/<ul>(\s*|<br\s*\/?>|&nbsp;)*<\/ul>/gi, '');
    str = str.replace(/<ol>(\s*|<br\s*\/?>|&nbsp;)*<\/ol>/gi, '');
  } while (str !== prev);

  // 5. Sanitize với DOMPurify
  let clean = str;
  if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
    clean = DOMPurify.sanitize(str, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code'],
      ALLOWED_ATTR: ['href', 'target']
    });
  }

  // 6. Kiểm tra nếu chỉ toàn khoảng trắng hoặc rỗng sau khi bóc tách thẻ
  const textContent = clean.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (!textContent) return '';

  return clean;
}

/**
 * Trích xuất và làm sạch ghi chú bước kiểm tra (nếu có)
 * Loại bỏ mã HTML rác, loại bỏ trường hợp ghi chú bị copy trùng với tiêu chuẩn kỹ thuật
 */
export function getCleanStepNote(note, standard, content, title) {
  if (!note || typeof note !== 'string') return '';
  const cleanNote = note.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (!cleanNote) return '';

  // So sánh với nội dung của standard hoặc content
  const cleanStd = (standard || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const cleanContent = (content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const cleanTitle = (title || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  // Nếu ghi chú hoàn toàn trùng với standard, content hoặc title thì bỏ qua
  if (cleanNote === cleanStd || cleanNote === cleanContent || cleanNote === cleanTitle) {
    return '';
  }

  // Nếu ghi chú là một đoạn nằm trọn trong tiêu chuẩn kỹ thuật dài thì cũng là bản copy thừa
  if (cleanStd && cleanStd.includes(cleanNote) && cleanNote.length > 25) {
    return '';
  }

  return cleanNote;
}

/**
 * Tinh giản tiêu đề bước kiểm tra (loại bỏ lặp lại "Bước 1: " khi đã có cột STT)
 */
export function getCleanStepTitle(title, stepNo) {
  if (!title) return `Bước ${stepNo}`;
  const regex = /^bước\s*\d+[\s:.-]+/i;
  const stripped = title.replace(regex, '').trim();
  if (stripped) return stripped;
  return title;
}

/**
 * Component hiển thị Tiêu chuẩn kỹ thuật SOP đẹp mắt, chuẩn typography
 */
export const SopStandardRenderer = ({ standard, fallbackText = 'Theo quy chuẩn kỹ thuật chung' }) => {
  const cleaned = cleanSopStandardHtml(standard);

  if (!cleaned) {
    return (
      <span style={{
        color: '#94A3B8',
        fontStyle: 'italic',
        fontSize: '0.78rem',
        display: 'inline-flex',
        alignItems: 'center'
      }}>
        {fallbackText}
      </span>
    );
  }

  const hasTags = /<[a-z][\s\S]*>/i.test(cleaned);

  if (hasTags) {
    return (
      <div
        className="sop-standard-html-content"
        style={{
          color: '#334155',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          wordBreak: 'break-word'
        }}
        dangerouslySetInnerHTML={{ __html: cleaned }}
      />
    );
  }

  return (
    <div style={{
      color: '#334155',
      fontSize: '0.8rem',
      lineHeight: 1.5,
      whiteSpace: 'pre-line',
      wordBreak: 'break-word'
    }}>
      {cleaned}
    </div>
  );
};

export default SopStandardRenderer;
