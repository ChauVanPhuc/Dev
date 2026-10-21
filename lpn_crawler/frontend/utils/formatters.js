// Format date & timestamp utilities for LPN Crawler - Định dạng Việt Nam Ngày/tháng/năm giờ

/**
 * Định dạng ngày theo chuẩn Việt Nam: DD/MM/YYYY
 */
export const formatDateDMY = (val) => {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str || str === '—' || str === 'None') return '—';

  // Dạng YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // Dạng X/Y/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, p1, p2, y] = slashMatch;
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);
    if (n2 > 12) {
      // p1 là tháng, p2 là ngày -> đổi sang ngày/tháng
      return `${p2.padStart(2, '0')}/${p1.padStart(2, '0')}/${y}`;
    } else if (n1 > 12) {
      // p1 là ngày, p2 là tháng -> đã là DD/MM/YYYY
      return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${y}`;
    } else {
      // Mặc định từ backend đã là DD/MM/YYYY
      return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${y}`;
    }
  }

  return str;
};

// Giữ alias tương thích
export const formatDateMDY = formatDateDMY;

/**
 * Định dạng thời gian theo chuẩn Việt Nam: Ngày/tháng/năm  giờ (DD/MM/YYYY hh:mm:ss AM/PM)
 */
export const formatTimestampVN = (val) => {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str || str === '—' || str === 'None') return '—';

  // Khớp chuỗi có ngày dạng X/Y/YYYY và phần giờ
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(.+)$/);
  if (slashMatch) {
    const [, p1, p2, y, timePart] = slashMatch;
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);
    if (n2 > 12) {
      // p1 là tháng, p2 là ngày -> chuyển thành DD/MM/YYYY
      return `${p2.padStart(2, '0')}/${p1.padStart(2, '0')}/${y} ${timePart}`;
    }
    // Đã là ngày ở trước hoặc n1 > 12
    return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${y} ${timePart}`;
  }

  // Khớp chuỗi ISO YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}:\d{2}(?::\d{2})?)/);
  if (isoMatch) {
    const [, y, m, d, timePart] = isoMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y} ${timePart}`;
  }

  return str;
};

