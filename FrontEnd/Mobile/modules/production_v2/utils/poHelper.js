/**
 * Utility chuẩn hóa và trích xuất mã PO gốc cho Mobile QC & Inspection.
 * Ví dụ:
 *   APT-0102-01 -> APT-0102
 *   APT-0078-84 -> APT-0078
 *   ADV-0406-01BS -> ADV-0406
 *   APT-0048-49-01 -> APT-0048-49
 *   ADV-0416-HATCH -> ADV-0416-HATCH
 *   FOL-0452 -> FOL-0452
 */
export const extractRootPo = (code) => {
  if (!code) return ''
  const clean = String(code).trim()
  
  // 1. Nhóm chuẩn (ví dụ APT-0102-01, APT-0048-49-01, ADV-0406-01BS)
  const m1 = clean.match(/^([A-Za-z0-9]+-\d+(?:-\d+)?)-(\d+[A-Za-z]*)$/)
  if (m1) return m1[1]
  
  // 2. Nhóm tổng quát: Chuỗi bất kỳ có từ 2 đoạn gạch nối trở lên và kết thúc bằng số phân đoạn kèm chữ
  const m2 = clean.match(/^(.*?)-(\d+[A-Za-z]*)$/)
  if (m2 && m2[1].split('-').length >= 2) return m2[1]
  
  return clean
}

/**
 * Lọc và khử trùng lặp danh sách mã PO thành danh sách mã PO gốc duy nhất
 */
export const deduplicatePoCodes = (codes = []) => {
  if (!Array.isArray(codes)) return []
  const seen = new Set()
  const result = []
  for (const c of codes) {
    const raw = typeof c === 'string' ? c : (c?.value || c?.po_code || c?.code || '')
    const root = extractRootPo(raw)
    if (root && !seen.has(root)) {
      seen.add(root)
      result.push(root)
    }
  }
  return result
}
