// Format date utility for LPN Crawler
export const formatDateMDY = (val) => {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str || str === '—') return '—';

  // If in YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
  }

  // If in MM/DD/YYYY or M/D/YYYY
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
  }

  return str;
};
