/**
 * Utility functions for formatting Vietnamese dates and times
 */

export const formatVietnameseDateTime = (dateInput) => {
  if (!dateInput || dateInput === '---') return '---';
  const str = String(dateInput).trim();
  if (!str) return '---';

  if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(str) || /^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?/);
  if (isoMatch) {
    const [, yyyy, mm, dd, hh, min] = isoMatch;
    if (hh !== undefined && min !== undefined) {
      return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }

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
  } catch (e) {}

  return str;
};

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
