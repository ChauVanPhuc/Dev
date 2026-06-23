/**
 * Utility helper functions for Frontend Claim module
 */

export const normalizePenaltyValue = (val) => {
  if (!val) return '';
  let clean = String(val).trim();
  
  // Custom case-insensitive mappings:
  const lower = clean.toLowerCase();
  
  if (lower === 'x2 unit') {
    return 'X2 Unit';
  }
  if (lower === 'full bc' || lower === 'ful bc') {
    return 'Full BC';
  }
  if (lower === 'repair, full bc' || lower === 'repair, ful bc') {
    return 'Repair, Full BC';
  }
  if (lower === 'repair, $50') {
    return 'Repair, $50';
  }
  
  // General fallback: title case but keep BC uppercase
  let words = clean.split(/\s+/);
  let titleCasedWords = words.map(w => {
    if (w.toUpperCase() === 'BC' || w.toUpperCase() === 'BC,') {
      return w.toUpperCase();
    }
    let hasComma = w.endsWith(',');
    let base = hasComma ? w.slice(0, -1) : w;
    
    let capitalizedBase = base;
    if (base.length > 0) {
      if (base.startsWith('$')) {
        capitalizedBase = base;
      } else {
        capitalizedBase = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
      }
    }
    return capitalizedBase + (hasComma ? ',' : '');
  });
  
  let result = titleCasedWords.join(' ');
  result = result.replace(/\bFul\b/g, 'Full');
  result = result.replace(/\bx2\b/g, 'X2');
  result = result.replace(/\bbc\b/gi, 'BC');
  return result;
};

export const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('-');
  if (parts.length === 2) {
    const month = parseInt(parts[0], 10) - 1;
    const year = parseInt(parts[1], 10);
    return new Date(year, month, 1);
  }
  return new Date(dateStr);
};
