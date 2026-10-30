/**
 * Tiện ích chuyển đổi mã dòng tủ (Cabinet Series Mapper)
 * Ánh xạ chữ số đầu tiên trong mã SKU sang ký tự đại diện Series cho giao diện Mobile
 * Quy chuẩn: plan_replace_cabinet_series_codes.md
 */

export const PREFIX_MAP = {
  '1': 'A',        // Series A (Cambridge)
  '2': 'T',        // Series T (Hepburn)
  '7': 'K',        // Series Kelly
  '8': 'B',        // Series Monroe
  '9': 'S',        // Series Magnolia
  '10': 'R',       // Series Bayhill
  '11': 'P',       // Series Milan
  '12': 'L',       // Series Lucia
  '13': 'A',       // Linen Closet Series A
  '14': 'T',       // Linen Closet Series T
  '15': 'P',       // Linen Closet Series P
  '16': 'T1',      // Wall Cabinet Hepburn T1
  '17': 'T2',      // Wall Cabinet Hepburn T2
  '18': 'P1',      // Wall Cabinet Milan P1
  '19': 'X',       // Series West
  '20': 'MIRROR',  // Series Mirror
  '21': 'Z',       // Series Loren
  '22': 'FILLER',  // Thanh Filler tủ
  '23': 'L',       // Linen Closet Series L
  '24': 'X',       // Linen Closet Series X
}

// Bảng tra ngược từ ký tự Series sang các số cũ tương ứng
export const REVERSE_PREFIX_MAP = Object.entries(PREFIX_MAP).reduce((acc, [num, char]) => {
  if (!acc[char]) acc[char] = []
  acc[char].push(num)
  return acc
}, {})

/**
 * Làm sạch mã tủ gốc: Bỏ tiền tố PO (APT-0102-01 | ...), bỏ ngoặc lặp
 * Giữ nguyên mã số gốc (ví dụ: "APT-0102-01 | 1-60-BRO (APT1-60-BRO)" -> "1-60-BRO")
 */
export const cleanCabinetRawTag = (rawTag, fallback = '') => {
  if (!rawTag) return fallback
  let cleaned = String(rawTag).trim()
  if (!cleaned) return fallback

  // 1. Cắt bỏ tiền tố mã PO như "APT-0102-01 | ", "APT-0090-38 | ", "PO-... | "
  cleaned = cleaned.replace(/^[A-Za-z0-9]+-\d+(?:-[A-Za-z0-9]+)?\s*\|\s*/i, '').trim()

  // 2. Bỏ phần trong ngoặc nếu lặp (ví dụ: "1-60-BRO (APT1-60-BRO)" -> "1-60-BRO")
  const mParen = cleaned.match(/^([^(]+?)\s*\(([^)]+)\)$/)
  if (mParen) {
    const c1 = mParen[1].replace(/^APT[-_]?/i, '').trim().toLowerCase()
    const c2 = mParen[2].replace(/^APT[-_]?/i, '').trim().toLowerCase()
    if (c1 === c2) {
      cleaned = mParen[1].trim()
    }
  }

  return cleaned || fallback
}

/**
 * Định dạng một mã tủ đơn lẻ sang ký hiệu Series mới
 */
const formatSingleTag = (tag) => {
  if (!tag) return ''
  const cleaned = cleanCabinetRawTag(tag)
  if (!cleaned) return ''

  // 1. Khung U / V: APTU60-BF-BLK -> U-60-BF-BLK, APTV60-BF-BLK -> V-60-BF-BLK
  if (/^APTU/i.test(cleaned)) {
    return cleaned.replace(/^APTU[-_]?/i, 'U-')
  }
  if (/^APTV/i.test(cleaned)) {
    return cleaned.replace(/^APTV[-_]?/i, 'V-')
  }

  // 2. Bóc tách chữ số đầu: ví dụ "1-60-BRO", "APT1-60-BRO", "APT-1-60-BRO", "APT 1-60-BRO"
  const m = cleaned.match(/^(?:APT[\s-_]*)?(\d+)[\s-_]+(.+)$/i)
  if (m && PREFIX_MAP[m[1]]) {
    const seriesChar = PREFIX_MAP[m[1]]
    let rest = m[2].trim()
    // Tránh trùng lặp từ như "22-FILLER-BRO" -> "FILLER-BRO" thay vì "FILLER-FILLER-BRO"
    const dupRegex = new RegExp(`^${seriesChar}[-_\\s]?`, 'i')
    if (dupRegex.test(rest)) {
      rest = rest.replace(dupRegex, '').trim()
    }
    return rest ? `${seriesChar}-${rest}` : seriesChar
  }

  return cleaned
}

/**
 * Định dạng chuỗi tag mã tủ (hỗ trợ cả chuỗi đơn hoặc chuỗi gồm nhiều mã cách nhau bởi dấu phẩy)
 * Ví dụ: "1-60-BRO, 1-66-BRO, 1-72D-BRO" -> "A-60-BRO, A-66-BRO, A-72D-BRO"
 */
export const formatCabinetSeriesTag = (rawTag, fallback = '') => {
  if (!rawTag) return fallback
  const str = String(rawTag).trim()
  if (!str) return fallback

  // Hỗ trợ trường hợp chuỗi chứa nhiều tag ngăn cách bởi dấu phẩy
  if (str.includes(',')) {
    const parts = str.split(',').map((s) => s.trim()).filter(Boolean)
    const formattedParts = parts.map(formatSingleTag).filter(Boolean)
    return formattedParts.length > 0 ? formattedParts.join(', ') : fallback
  }

  const result = formatSingleTag(str)
  return result || fallback
}

/**
 * Kiểm tra tìm kiếm thông minh 2 chiều:
 * - Khớp theo label / rawSpec / badge (mã chữ mới) / rawBadge (mã số cũ)
 * - Không phân biệt dấu gạch nối hay dấu cách (ví dụ gõ 'A60' hay 'A-60' hay '1-60' hay '160' đều khớp)
 */
export const matchesCabinetOption = (opt, searchStr) => {
  if (!searchStr) return true
  const s = searchStr.toLowerCase().trim()
  if (!s) return true

  const label = String(opt.label || '').toLowerCase()
  const rawSpec = String(opt.rawSpec || '').toLowerCase()
  const badge = String(opt.badge || '').toLowerCase()
  const rawBadge = String(opt.rawBadge || '').toLowerCase()
  const productLabel = String(opt.productLabel || opt.product_label || '').toLowerCase()
  const rawProductLabel = String(opt.rawProductLabel || '').toLowerCase()
  const valStr = String(opt.value || '').toLowerCase()

  // 1. Kiểm tra trực tiếp includes
  if (
    label.includes(s) ||
    rawSpec.includes(s) ||
    badge.includes(s) ||
    rawBadge.includes(s) ||
    productLabel.includes(s) ||
    rawProductLabel.includes(s) ||
    valStr.includes(s)
  ) {
    return true
  }

  // 2. Kiểm tra bỏ dấu phân cách (- _ / khoảng trắng) để gõ nhanh
  const cleanSearch = s.replace(/[-\s_]/g, '')
  if (cleanSearch) {
    const cleanBadge = badge.replace(/[-\s_]/g, '')
    const cleanRawBadge = rawBadge.replace(/[-\s_]/g, '')
    const cleanProd = productLabel.replace(/[-\s_]/g, '')
    const cleanRawProd = rawProductLabel.replace(/[-\s_]/g, '')

    if (
      cleanBadge.includes(cleanSearch) ||
      cleanRawBadge.includes(cleanSearch) ||
      cleanProd.includes(cleanSearch) ||
      cleanRawProd.includes(cleanSearch)
    ) {
      return true
    }
  }

  return false
}
