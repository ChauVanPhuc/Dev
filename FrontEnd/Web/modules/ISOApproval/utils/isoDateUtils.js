/**
 * Utility functions for formatting Vietnamese dates and times
 */

/**
 * Định dạng chuỗi ngày giờ theo chuẩn tiếng Việt:
 * - Có cả giờ phút và ngày tháng năm: "HH:mm DD/MM/YYYY" (ví dụ: "11:04 11/09/2026")
 * - Chỉ có ngày tháng năm: "DD/MM/YYYY" (ví dụ: "11/09/2026")
 * 
 * @param {string|Date|null|undefined} dateInput 
 * @returns {string} Chuỗi ngày giờ định dạng tiếng Việt hoặc '---'
 */
export const formatVietnameseDateTime = (dateInput) => {
  if (!dateInput || dateInput === '---') return '---';
  const str = String(dateInput).trim();
  if (!str) return '---';

  // Nếu chuỗi đã đúng định dạng "HH:mm DD/MM/YYYY" hoặc "DD/MM/YYYY"
  if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(str) || /^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Regex nhận diện chuỗi ISO: YYYY-MM-DD hoặc YYYY-MM-DD HH:mm:ss hoặc YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?/);
  if (isoMatch) {
    const [, yyyy, mm, dd, hh, min] = isoMatch;
    if (hh !== undefined && min !== undefined) {
      return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }

  // Fallback qua JavaScript Date object
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      if (str.includes(':')) {
        return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
      }
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch (e) {
    // Không phân tích được thì trả về chuỗi gốc
  }

  return str;
};

/**
 * Định dạng chỉ ngày tháng năm: "DD/MM/YYYY"
 */
export const formatVietnameseDate = (dateInput) => {
  if (!dateInput || dateInput === '---') return '---';
  const formatted = formatVietnameseDateTime(dateInput);
  if (formatted === '---') return '---';
  const match = formatted.match(/\d{2}\/\d{2}\/\d{4}$/);
  return match ? match[0] : formatted;
};

export default {
  formatVietnameseDateTime,
  formatVietnameseDate
};
