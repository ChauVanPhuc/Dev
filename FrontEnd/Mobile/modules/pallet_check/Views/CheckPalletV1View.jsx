import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import { QRCodeCanvas } from 'qrcode.react';
import { PRODUCT_SKU_SET, matchCatalogSku, OPTICAL_COLOR_MAP } from '../constants/productCatalog';
import { formatCabinetSeriesTag } from '@modules/production_v2/utils/cabinetSeriesMapper';
import { 
  RotateCcw, 
  CheckCircle2, 
  History, 
  ScanLine, 
  Barcode,
  Layers,
  Package,
  Volume2,
  VolumeX,
  Check,
  X,
  XCircle,
  AlertTriangle,
  Trash2,
  Plus,
  Zap,
  ShieldAlert,
  Save,
  Clock,
  User,
  Printer,
  QrCode,
  Edit3,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  ArrowRight,
  CheckCheck,
  Boxes,
  Database,
  RefreshCw,
  Play
} from 'lucide-react';

/**
 * Tạo mã phiếu duy nhất cho từng tab khi lưu
 * Ví dụ: PLD-260925-1045 (Pallet đứng), PLN-260925-1046 (Pallet nóc)
 */
const generateContainerId = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  return `CONT-${yy}${mm}${dd}-${rand}`;
};

const generateRecordId = (prefix = 'PLD') => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
};

const DIGIT_WORDS_VI = {
  '0': 'không',
  '1': 'một',
  '2': 'hai',
  '3': 'ba',
  '4': 'bốn',
  '5': 'năm',
  '6': 'sáu',
  '7': 'bảy',
  '8': 'tám',
  '9': 'chín'
};

// Bảng phát âm chữ cái Series đầu tiên theo chuẩn Việt Nam
export const VIETNAMESE_SERIES_SPEECH = {
  'A': 'A',
  'B': 'bê',
  'C': 'xê',
  'D': 'đê',
  'K': 'ca',
  'L': 'e lờ',
  'P': 'pê',
  'R': 'e rờ',
  'S': 'ét',
  'T': 'tê',
  'T1': 'tê một',
  'T2': 'tê hai',
  'P1': 'pê một',
  'U': 'u',
  'V': 'vê',
  'X': 'ích',
  'Z': 'dét',
  'FILLER': 'phin lơ',
  'MIRROR': 'mi rơ'
};

// Bảng phát âm từng chữ cái tiếng Anh cho mã màu và LPN
export const ENGLISH_LETTERS_SPEECH = {
  'A': 'Ei',
  'B': 'Bi',
  'C': 'Si',
  'D': 'Đi',
  'E': 'I',
  'F': 'Ép',
  'G': 'Di',
  'H': 'Éch',
  'I': 'Ai',
  'J': 'Dê',
  'K': 'Kei',
  'L': 'EO',
  'M': 'Em',
  'N': 'End',
  'O': 'Ôu',
  'P': 'Pi',
  'Q': 'Kiu',
  'R': 'A',
  'S': 'Éts',
  'T': 'Ti',
  'U': 'Iu',
  'V': 'Vi',
  'W': 'Đắp liu',
  'X': 'Ech',
  'Y': 'Quai',
  'Z': 'Dét'
};

/**
 * Đọc từng chữ cái tiếng Anh (áp dụng cho mã màu, ký tự tiếng Anh, LPN)
 * Ví dụ: "WHT" -> "Đắp liu Éch Ti", "BLK" -> "Bi EO Kei"
 */
export const spellEnglishLetters = (str) => {
  if (!str) return '';
  return String(str)
    .toUpperCase()
    .split('')
    .map(c => ENGLISH_LETTERS_SPEECH[c] || c)
    .join(' ');
};

/**
 * Định dạng câu phát âm LPN:
 * "EO Pi End" + 4 số cuối đọc từng số
 * Ví dụ: "EO Pi End ba ba sáu năm"
 */
export const formatLpnForSpeech = (lpnCode) => {
  if (!lpnCode) return 'EO Pi End';
  const clean = String(lpnCode).replace(/\D/g, '');
  const last4 = clean.length >= 4 ? clean.slice(-4) : clean;
  const spelled = spellDigitsVietnamese(last4);
  return `EO Pi End ${spelled}`.trim();
};

/**
 * Định dạng câu phát âm SKU:
 * - Chữ cái đầu (Series): chuẩn tiếng Việt (Tê, Bê, Ca...)
 * - Kích thước ở giữa: giữ nguyên số (54, 60...)
 * - Mã màu ở đuôi: đọc từng chữ cái tiếng Anh (WHT -> Đắp liu Éch Ti, BLK -> Bi EO Kei...)
 * Ví dụ: "2-54-BLK" -> "Tê 54 Bi EO Kei"
 */
export const formatSkuForSpeech = (rawCode) => {
  if (!rawCode) return '';
  const str = String(rawCode).trim();
  if (str === '2') return 'tê';
  if (str === '1') return 'A';

  const mapped = formatCabinetSeriesTag(str) || str;
  const parts = mapped.split('-').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return mapped;

  // 1. Chữ cái đầu Series (chuẩn Việt Nam, ví dụ T -> tê)
  const prefix = parts[0].toUpperCase();
  const seriesSpeech = VIETNAMESE_SERIES_SPEECH[prefix] || prefix;

  if (parts.length === 1) {
    return seriesSpeech;
  }

  // 2. Mã màu ở cuối (chỉ khi có >= 3 phần và phần cuối là chữ cái 2-5 ký tự như WHT, BLK, BRO...)
  const lastPart = parts[parts.length - 1].toUpperCase();
  const isColor = parts.length >= 3 && /^[A-Z]{2,5}$/.test(lastPart);
  const colorSpeech = isColor ? spellEnglishLetters(lastPart) : '';

  // 3. Phần giữa (kích thước hoặc cánh L/R/BF)
  const middleParts = parts.slice(1, isColor ? parts.length - 1 : parts.length);
  const middleSpeech = middleParts.map(part => {
    const m = part.match(/^(\d+)([A-Z]+)$/i);
    if (m) {
      return `${m[1]} ${spellEnglishLetters(m[2])}`;
    }
    return part;
  }).join(' ');

  return [seriesSpeech, middleSpeech, colorSpeech].filter(Boolean).join(', ');
};

export const spellDigitsVietnamese = (digitsStr) => {
  if (!digitsStr) return '';
  return String(digitsStr)
    .replace(/\D/g, '')
    .split('')
    .map(d => DIGIT_WORDS_VI[d] || d)
    .join(' ');
};

// Chuẩn hóa mã quét về tiếng Anh ASCII không dấu
export const normalizeToEnglishBarcode = (raw) => {
  if (!raw) return '';
  let str = String(raw).trim();

  // Đổi ư/Ư thành W
  str = str.replace(/[ưƯừỪứỨửỬữỮựỰ]/g, 'W');

  // Đổi đ/Đ thành D
  str = str.replace(/[đĐ]/g, 'D');

  // Khử dấu tiếng Việt
  str = str
    .replace(/[àáạảãâầấậẩẫăằắặẳẵÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
    .replace(/[èéẹẻẽêềếệểễÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E')
    .replace(/[ìíịỉĩÌÍỊỈĨ]/g, 'I')
    .replace(/[òóọỏõôồốộổỗơờớợởỡÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O')
    .replace(/[ùúụủũÙÚỤỦŨ]/g, 'U')
    .replace(/[ỳýỵỷỹỲÝỴỶỸ]/g, 'Y');

  // Xóa dấu tổ hợp unicode
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Chuẩn hóa gạch ngang về '-'
  str = str.replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-');

  // Viết hoa và xóa khoảng trắng
  str = str.toUpperCase().replace(/[\s\r\n\t]/g, '');

  // Khử ký tự * bao quanh (start/stop character của chuẩn Code 39: *17-2621-WHT*)
  str = str.replace(/^\*+|\*+$/g, '');

  // Khử các tiền tố nhãn thông dụng (LPN:, LPN-, SKU:, ITEM:, CODE:, MÃ:, MA:, SP:)
  str = str.replace(/^(LPN|SKU|ITEM|CODE|MA|MÃ|SP)[:\s\-_]+/i, '');

  // Khử tiền tố lặp lại từ đuôi do bộ gõ
  const parts = str.split('-');
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1];
    if (tail.length >= 2) {
      const ghostRegex = new RegExp('^\\d*' + tail + '(?=[A-Z0-9]+-)');
      if (ghostRegex.test(str)) {
        str = str.replace(ghostRegex, '');
      }
    }
  }

  // Tự động phục hồi mã SKU có 2 dấu '-' nếu Code 39 bị mờ mất dấu '-'
  const hyphens = (str.match(/-/g) || []).length;
  if (hyphens === 1) {
    // Trường hợp 1: Nhòe '-2' thành '4' (ví dụ 174621-WHT -> 17-2621-WHT)
    const m1 = str.match(/^(\d{2})4(\d{3,4}-[A-Z0-9]+)$/);
    if (m1) {
      str = `${m1[1]}-2${m1[2]}`;
    } else {
      // Trường hợp 2: Nhòe '-' thành '7' (ví dụ 1772621-WHT -> 17-2621-WHT)
      const m2 = str.match(/^(\d{2})7(\d{4}-[A-Z0-9]+)$/);
      if (m2) {
        str = `${m2[1]}-${m2[2]}`;
      } else {
        // Trường hợp 3: Rụng mất dấu '-' giữa 2 số đầu và 4 số sau (ví dụ 172621-WHT -> 17-2621-WHT)
        const m3 = str.match(/^(\d{2})(\d{4})-([A-Z0-9]+)$/);
        if (m3) {
          str = `${m3[1]}-${m3[2]}-${m3[3]}`;
        } else {
          // Trường hợp 4: Rụng mất dấu '-' thứ 2 trước chữ màu (ví dụ 17-2621WHT -> 17-2621-WHT)
          const m4 = str.match(/^(\d{2})-(\d{4})([A-Z]{2,5})$/);
          if (m4) {
            str = `${m4[1]}-${m4[2]}-${m4[3]}`;
          }
        }
      }
    }
  } else if (hyphens === 0) {
    // Trường hợp 5: Rụng cả 2 dấu '-' nhưng -2 thành 4 (ví dụ 174621WHT -> 17-2621-WHT)
    const m0a = str.match(/^(\d{2})4(\d{3})([A-Z]{2,5})$/);
    if (m0a) {
      str = `${m0a[1]}-2${m0a[2]}-${m0a[3]}`;
    } else {
      // Trường hợp 6: Rụng cả 2 dấu '-' (ví dụ 172621WHT -> 17-2621-WHT)
      const m0b = str.match(/^(\d{2})(\d{4})([A-Z]{2,5})$/);
      if (m0b) {
        str = `${m0b[1]}-${m0b[2]}-${m0b[3]}`;
      }
    }
  }

  // Tự động phục hồi đuôi màu sơn nhòe quang học ở Code 39
  // (ví dụ 17-2621-W5T -> 17-2621-WHT, 17-2621-W5 -> 17-2621-WHT, 17-2621-8LK -> 17-2621-BLK)
  const barcodeParts = str.split('-');
  if (barcodeParts.length >= 2) {
    const rawTail = barcodeParts[barcodeParts.length - 1];
    if (OPTICAL_COLOR_MAP && OPTICAL_COLOR_MAP[rawTail]) {
      str = [...barcodeParts.slice(0, barcodeParts.length - 1), OPTICAL_COLOR_MAP[rawTail]].join('-');
    }
  }
  str = str
    .replace(/-W5T$/, '-WHT')
    .replace(/-W1T$/, '-WHT')
    .replace(/-W5$/, '-WHT')
    .replace(/-W1$/, '-WHT')
    .replace(/-8LK$/, '-BLK')
    .replace(/-6RY$/, '-GRY')
    .replace(/-E5P$/, '-ESP')
    .replace(/-W0A$/, '-WOA');

  // Khử các ký tự đặc biệt thừa ở đầu hoặc cuối mã (ngoại trừ chữ cái, số, dấu '-')
  str = str.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');

  return str;
};

// Phân loại mã quét là PALLET, LPN hay SKU theo chuẩn quy cách nhà máy G7:
// - Mã PALLET: Bắt đầu bằng PLD- hoặc PLN-
// - Mã LPN (Mã vận chuyển): Dãy số 8-14 chữ số liền (chuẩn kho hàng G7)
// - Mã SKU (Mã sản phẩm): Có trong Catalog, hoặc có 1-4 dấu '-', hoặc chuỗi mã sản phẩm
const classifyCode = (rawCode) => {
  if (!rawCode) return null;
  const code = normalizeToEnglishBarcode(rawCode);
  if (!code) return null;

  // 0. Mã Pallet lịch sử
  if (code.startsWith('PLD-') || code.startsWith('PLN-')) {
    return { type: 'PALLET', code };
  }

  // 1. Mã LPN: Chuẩn mã vận chuyển là chuỗi 8-14 chữ số liền (phổ biến nhất 9-10 số)
  if (/^\d{8,14}$/.test(code)) {
    return { type: 'LPN', code };
  }

  // 2. Tra cứu đối soát Danh mục sản phẩm chuẩn của công ty:
  const matchedSku = matchCatalogSku(code);
  if (matchedSku) {
    return { type: 'SKU', code: matchedSku };
  }

  // 3. Mã SKU theo cấu trúc chuẩn (1 đến 4 dấu '-', gồm các cụm chữ và số)
  // Ví dụ: 17-2621-WHT, APT-0102, 1-36L, 2-42-WOA-1
  if (/^[A-Z0-9]+(-[A-Z0-9]+){1,4}$/.test(code)) {
    return { type: 'SKU', code };
  }

  // 4. Mã SKU không dấu gạch ngang (dạng mã chữ và số kết hợp, độ dài >= 4)
  if (/^[A-Z0-9]{4,20}$/.test(code) && /[A-Z]/.test(code) && /\d/.test(code)) {
    return { type: 'SKU', code };
  }

  return null;
};

/**
 * So khớp mã SKU với Mã chuẩn SKU:
 * Hỗ trợ khớp chính xác, qua Catalog, hoặc biến thể quang học (ví dụ tiền tố APT-, v.v.)
 */
const isOpticalVariantOfSku = (scanned, standard) => {
  if (!scanned || !standard) return false;
  const sUpper = scanned.toUpperCase().trim();
  const stdUpper = standard.toUpperCase().trim();
  if (sUpper === stdUpper) return true;

  // Khớp nếu cả hai cùng quy đổi về một mã Series (ví dụ 2-54-BLK và T-54-BLK)
  const mappedS = formatCabinetSeriesTag(sUpper);
  const mappedStd = formatCabinetSeriesTag(stdUpper);
  if (mappedS && mappedStd && mappedS === mappedStd) {
    return true;
  }

  // Nếu cả 2 đều là mã hợp lệ độc lập trong danh mục sản phẩm (ví dụ 1-36L-WHT và 1-36R-WHT):
  // Chắc chắn là 2 sản phẩm khác nhau, không bao giờ là biến thể quang học của nhau!
  if (PRODUCT_SKU_SET.has(sUpper) && PRODUCT_SKU_SET.has(stdUpper)) {
    return false;
  }

  // Khớp bỏ qua tiền tố APT- (ví dụ: APT-17-2621-WHT khớp 17-2621-WHT)
  const stripApt = (s) => s.replace(/^APT-?/i, '');
  if (stripApt(sUpper) === stripApt(stdUpper)) return true;

  // Đối soát qua danh mục Master Data và bảng sửa quang học (không ép standardSku)
  const matchedScanned = matchCatalogSku(sUpper);
  if (matchedScanned && matchedScanned === stdUpper) {
    return true;
  }

  // So khớp sau khi chuẩn hóa gạch nối (chỉ khi 1 trong 2 không phải là mã danh mục khác)
  const sNorm = sUpper.replace(/[^A-Z0-9]/g, '');
  const stdNorm = stdUpper.replace(/[^A-Z0-9]/g, '');
  if (sNorm && sNorm === stdNorm) return true;

  return false;
};

const isOpticalVariantOfLpn = (scanned, standard) => {
  if (!scanned || !standard) return false;
  if (scanned === standard) return true;
  const cleanScanned = scanned.replace(/\D/g, '');
  const cleanStandard = standard.replace(/\D/g, '');
  return cleanScanned.length >= 8 && cleanStandard.length >= 8 && cleanScanned === cleanStandard;
};

/**
 * Kiểm tra xem chuỗi quét được có phải là mã hợp lệ hay không:
 * Tận dụng toàn diện logic classifyCode để đảm bảo đồng nhất 100%
 */
const isValidBarcodeCandidate = (code, standardSku = '') => {
  if (!code) return false;
  return classifyCode(code, standardSku) !== null;
};

// ─── QUY CHUẨN ĐÓNG GÓI PALLET THỰC TẾ (4 KIỆN ĐỨNG + 1 KIỆN TOP NÓC) ───
export const MAX_STANDING_KITS = 4; // Tối đa 4 kiện đứng
export const MAX_STANDING_SKU_PER_TYPE = 4; // Mỗi loại SKU đứng tối đa 4 cái
export const MAX_STANDING_SKUS_TOTAL = 8; // Tổng 8 SKU cho pallet đứng (2 loại x 4 cái)
export const MAX_STANDING_LPNS = 4; // 1 LPN quét lặp lại 4 lần

export const MAX_ROOF_KITS = 1; // Tối đa 1 kiện top nóc
export const MAX_ROOF_SKUS_TOTAL = 2; // Tối đa 2 cái SKU cho top nóc (1 kiện)
export const MAX_ROOF_LPNS = 1; // 1 mã LPN riêng cho top nóc

/**
 * Kiểm định tiêu chuẩn Container:
 * 1. Tất cả kiện top nóc phải là số chẵn theo từng mã LPN (2, 4, 6... kiện). Không được số lẻ (báo đỏ nếu lẻ).
 * 2. Mỗi Pallet phải đủ SKU và LPN:
 *    - Pallet 5 kiện (4 đứng + 1 nóc): Phải đủ 10 SKU (8 đứng + 2 nóc) và 5 LPN (4 đứng + 1 nóc).
 *    - Pallet 4 kiện (4 đứng, không nóc): Phải đủ 8 SKU và 4 LPN.
 *    - Thiếu bất kỳ mã nào -> Báo đỏ.
 */
export const validateContainerRules = (pallets = []) => {
  const palletErrors = [];
  const topLpnGroup = {}; // { [lpnCode]: { count: number, palletIndices: number[] } }

  // 1. Quét tìm tất cả các Pallet 2 kiện (4 SKU đứng, 2 LPN đứng, không kiện nóc)
  const twoBoxPalletIndices = [];
  (pallets || []).forEach((pallet) => {
    const standingSkus = pallet.standing?.skus?.length || 0;
    const standingLpns = pallet.standing?.lpns?.length || 0;
    const roofSkus = pallet.roof?.skus?.length || 0;
    const roofLpns = pallet.roof?.lpns?.length || 0;
    const hasRoof = Boolean(pallet.roof?.hasRoof) || (roofSkus > 0 || roofLpns > 0);

    if (!hasRoof && standingSkus === 4 && standingLpns === 2) {
      twoBoxPalletIndices.push(pallet.palletIndex);
    }
  });

  // Trong 1 Container chỉ cho phép DUY NHẤT 1 Pallet 2 kiện
  const allowedTwoBoxIndex = twoBoxPalletIndices.length > 0 ? twoBoxPalletIndices[0] : null;

  (pallets || []).forEach((pallet) => {
    const pIdx = pallet.palletIndex;
    const standingSkus = pallet.standing?.skus?.length || 0;
    const standingLpns = pallet.standing?.lpns?.length || 0;
    const roofSkus = pallet.roof?.skus?.length || 0;
    const roofLpns = pallet.roof?.lpns?.length || 0;
    const hasRoof = Boolean(pallet.roof?.hasRoof) || (roofSkus > 0 || roofLpns > 0);

    const isStandingOk = standingSkus === 8 && standingLpns === 4;
    let isRoofOk = true;
    let isPalletComplete = false;
    let isTwoBoxPallet = false;
    let errorReasons = [];

    // NGOẠI LỆ ĐẶC BIỆT: Pallet 2 kiện (4 SKU đứng + 2 LPN đứng, không nóc)
    if (!hasRoof && standingSkus === 4 && standingLpns === 2) {
      if (pIdx === allowedTwoBoxIndex) {
        // Hợp lệ: Duy nhất 1 Pallet 2 kiện trong container
        isPalletComplete = true;
        isTwoBoxPallet = true;
      } else {
        // Vượt quá số lượng: Container đã có 1 pallet 2 kiện khác
        isPalletComplete = false;
        errorReasons.push(`Chỉ được phép tối đa duy nhất 1 Pallet 2 kiện trong container (Đã có Pallet #${allowedTwoBoxIndex})`);
      }
    } else if (hasRoof) {
      // Pallet 5 kiện: Cần 8 + 2 = 10 SKU và 4 + 1 = 5 LPN
      isRoofOk = roofSkus === 2 && roofLpns === 1;
      isPalletComplete = isStandingOk && isRoofOk;

      if (!isStandingOk) {
        if (standingSkus < 8) errorReasons.push(`Thiếu SKU đứng (${standingSkus}/8)`);
        if (standingLpns < 4) errorReasons.push(`Thiếu LPN đứng (${standingLpns}/4)`);
      }
      if (!isRoofOk) {
        if (roofSkus < 2) errorReasons.push(`Thiếu SKU nóc (${roofSkus}/2)`);
        if (roofLpns < 1) errorReasons.push(`Thiếu LPN nóc (${roofLpns}/1)`);
      }

      // Gom nhóm kiện top nóc theo LPN để kiểm tra chẵn/lẻ
      const topLpnCode = pallet.roof?.standardLpn || pallet.roof?.lpns?.[0]?.code || 'CHƯA_CÓ_LPN';
      if (!topLpnGroup[topLpnCode]) {
        topLpnGroup[topLpnCode] = { count: 0, palletIndices: [] };
      }
      topLpnGroup[topLpnCode].count += 1;
      topLpnGroup[topLpnCode].palletIndices.push(pIdx);
    } else {
      // Pallet 4 kiện tiêu chuẩn: Cần 8 SKU và 4 LPN
      isPalletComplete = isStandingOk;
      if (!isStandingOk) {
        if (standingSkus < 8) errorReasons.push(`Thiếu SKU đứng (${standingSkus}/8)`);
        if (standingLpns < 4) errorReasons.push(`Thiếu LPN đứng (${standingLpns}/4)`);
      }
    }

    if (!isPalletComplete) {
      palletErrors.push({
        palletIndex: pIdx,
        palletId: pallet.palletId,
        hasRoof,
        isTwoBoxPallet,
        currentSkus: standingSkus + roofSkus,
        expectedSkus: hasRoof ? 10 : (isTwoBoxPallet ? 4 : 8),
        currentLpns: standingLpns + roofLpns,
        expectedLpns: hasRoof ? 5 : (isTwoBoxPallet ? 2 : 4),
        details: errorReasons.join(', ') || 'Chưa đủ số lượng mã'
      });
    }
  });

  // Kiểm tra số chẵn / lẻ của Kiện Top Nóc theo từng mã LPN
  const oddEntries = [];
  const evenEntries = [];

  Object.entries(topLpnGroup).forEach(([lpnCode, info]) => {
    if (info.count % 2 === 0) {
      evenEntries.push({
        lpnCode,
        count: info.count,
        palletIndices: info.palletIndices
      });
    } else {
      oddEntries.push({
        lpnCode,
        count: info.count,
        palletIndices: info.palletIndices
      });
    }
  });

  // Quy chuẩn ghép kiện nóc: Nếu có các mã lẻ (ví dụ 1 kiện lẻ + 3 kiện lẻ = 4 kiện chẵn)
  // mà tổng số kiện lẻ gộp lại là số CHẴN, thì vẫn đủ cặp ghép trên container, KHÔNG BÁO LỖI!
  const totalOddBoxes = oddEntries.reduce((sum, item) => sum + item.count, 0);
  const isOddCombinedEven = (oddEntries.length > 0) && (totalOddBoxes % 2 === 0);

  const oddTopLpnErrors = isOddCombinedEven ? [] : oddEntries;
  const pairedOddLpns = isOddCombinedEven ? oddEntries : [];

  const isValid = palletErrors.length === 0 && oddTopLpnErrors.length === 0;

  return {
    isValid,
    totalPallets: (pallets || []).length,
    palletErrors,
    oddTopLpnErrors,
    validTopLpns: evenEntries,
    pairedOddLpns,
    isOddCombinedEven,
    totalOddBoxes,
    topLpnGroup,
    twoBoxPalletIndices,
    hasTwoBoxPallet: twoBoxPalletIndices.length > 0
  };
};

const CheckPalletV1View = () => {
  // ─── TAB CHÍNH: 'scan' (Kiểm tra mới) | 'history' (Lịch sử) ───
  const [activeTab, setActiveTab] = useState('scan');

  // ─── PHÂN QUYỀN VÀ THÔNG TIN NGƯỜI DÙNG (ADMIN CHỈNH SỬA LỊCH SỬ) ───
  const { user } = useAuthStore();
  const operatorName = (user?.full_name || user?.username || '').trim() || 'Chưa xác định';
  const isAdmin = Boolean(
    user?.username === 'admin' ||
    user?.role_name === 'IT' ||
    user?.role_name === 'BGD' ||
    ['Quản lý', 'Admin', 'Trưởng phòng', 'Ban Giám Đốc', 'Tổ trưởng'].includes(user?.permission_level) ||
    (user?.screen_permissions && user.screen_permissions['/pallet-check-v1']?.includes('edit'))
  );

  // Modal chỉnh sửa thông tin Container trong Lịch sử (Admin)
  const [isEditHistoryContainerModalOpen, setIsEditHistoryContainerModalOpen] = useState(false);
  const [editHistoryContName, setEditHistoryContName] = useState('');
  const [editHistoryContInspector, setEditHistoryContInspector] = useState('');
  const [editHistoryContStatus, setEditHistoryContStatus] = useState('completed');

  // Modal chỉnh sửa Pallet chi tiết trong Lịch sử (Admin)
  const [isEditPalletModalOpen, setIsEditPalletModalOpen] = useState(false);
  const [editingPalletIndex, setEditingPalletIndex] = useState(null);
  const [editingPalletData, setEditingPalletData] = useState(null);
  const [editingPalletActiveTab, setEditingPalletActiveTab] = useState('standing'); // 'standing' | 'roof'



  // ─── TAB PHỤ: 'standing' (Pallet đứng) | 'roof' (Top nóc) ───
  const [palletTab, setPalletTab] = useState('standing'); // 'standing' | 'roof'

  // Bật / tắt âm thanh cảnh báo
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Trạng thái ô quét mã
  const [scanInputText, setScanInputText] = useState('');
  const scanInputRef = useRef(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Hiệu ứng nháy xanh khi vừa quét mã thành công
  const [lastScannedSuccess, setLastScannedSuccess] = useState(null);

  // Dữ liệu riêng biệt cho tab PALLET ĐỨNG
  const [standingData, setStandingData] = useState({
    lpns: [],          // [{ id, code, count, firstSeen, lastSeen }]
    skus: [],          // [{ id, code, count, firstSeen, lastSeen }]
    standardLpn: null, // Mã LPN chuẩn đầu tiên
    standardSku: null, // Mã SKU chuẩn đầu tiên
    isSaved: false,
    savedKey: null,
    totalScans: 0
  });

  // Dữ liệu riêng biệt cho tab TOP NÓC
  const [roofData, setRoofData] = useState({
    lpns: [],
    skus: [],
    standardLpn: null,
    standardSku: null,
    isSaved: false,
    savedKey: null,
    totalScans: 0
  });

  // Pop-up thông báo kết quả quét: Nhận (điền xuống) hoặc Không nhận (từ chối)
  const [scanPopup, setScanPopup] = useState(null);

  // ─── HỆ THỐNG ENGINE BẮT TIA MÁY QUÉT CHUẨN CÔNG NGHIỆP ───
  const hiddenScannerInputRef = useRef(null);
  const processHandlerRef = useRef(null);
  const scannerBufferRef = useRef('');
  const scannerTimerRef = useRef(null);
  const lastKeyTimeRef = useRef(0);
  const lastProcessedCodeRef = useRef('');
  const lastProcessedTimeRef = useRef(0);

  // ─── PHÂN HỆ QUẢN LÝ CONTAINER & PALLET ───
  const [activeContainer, setActiveContainer] = useState(() => {
    try {
      const saved = localStorage.getItem('g7_pallet_v1_active_container');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modal bắt buộc nhập tên Container khi mở trang hoặc tạo mới
  const [isStartContainerModalOpen, setIsStartContainerModalOpen] = useState(false);
  const [containerNameInput, setContainerNameInput] = useState('');
  const containerInputRef = useRef(null);

  // Modal chỉnh sửa tên Container hiện tại
  const [isEditContainerModalOpen, setIsEditContainerModalOpen] = useState(false);
  const [editContainerNameInput, setEditContainerNameInput] = useState('');

  // Trạng thái tải từ Database
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Tải danh sách Container từ Database SQL Server (kèm bảo toàn Container dở dang)
  const fetchContainersFromDb = useCallback(async () => {
    try {
      setIsLoadingDb(true);
      const res = await apiClient.get('/pallet-check/containers?limit=500');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const dbContainers = res.data.data;
        setHistoryContainers(prev => {
          const merged = [...dbContainers];
          // Bảo toàn các Container đang quét dở trên thiết bị nếu chưa có trên DB
          (prev || []).forEach(localCont => {
            if (localCont.status === 'in_progress' && !merged.some(c => c.id === localCont.id)) {
              merged.unshift(localCont);
            }
          });
          try {
            localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      }
    } catch (err) {
      console.warn('Không thể tải containers từ API, dùng dữ liệu lưu cục bộ:', err);
    } finally {
      setIsLoadingDb(false);
    }
  }, []);

  // Tự động tải từ CSDL khi khởi động
  useEffect(() => {
    fetchContainersFromDb();
  }, [fetchContainersFromDb]);

  // Tự động đồng bộ từ CSDL khi chuyển sang tab Lịch Sử
  useEffect(() => {
    if (activeTab === 'history') {
      fetchContainersFromDb();
    }
  }, [activeTab, fetchContainersFromDb]);

  // Phân trang danh sách lịch sử Container (Mỗi trang 10 Container)
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;

  // Lịch sử danh sách Container đã hoàn thành (Cấp 1)
  const [historyContainers, setHistoryContainers] = useState(() => {
    try {
      const saved = localStorage.getItem('g7_pallet_v1_containers');
      if (saved) return JSON.parse(saved);
      // Hỗ trợ tự động chuyển đổi từ dữ liệu cũ nếu có
      const legacy = localStorage.getItem('g7_pallet_v1_history');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [{
            id: 'CONT-LEGACY-01',
            name: 'Container (Dữ liệu trước)',
            createdAt: parsed[0]?.timestamp || new Date().toLocaleString('vi-VN'),
            updatedAt: parsed[0]?.timestamp || new Date().toLocaleString('vi-VN'),
            inspector: parsed[0]?.inspector || operatorName,
            status: 'completed',
            pallets: parsed.map((p, idx) => ({
              palletIndex: idx + 1,
              palletId: p.id,
              status: p.status || 'pass',
              timestamp: p.timestamp,
              standing: p.tabType === 'standing' ? { skus: p.skus || [], lpns: p.lpns || [], standardLpn: p.standardLpn, standardSku: p.standardSku } : { skus: [], lpns: [], standardLpn: null, standardSku: null },
              roof: p.tabType === 'roof' ? { skus: p.skus || [], lpns: p.lpns || [], standardLpn: p.standardLpn, standardSku: p.standardSku } : { skus: [], lpns: [], standardLpn: null, standardSku: null },
              totalScans: p.totalScans || 0
            }))
          }];
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Container đang được chọn để xem chi tiết trong Lịch sử (Cấp 2)
  const [selectedHistoryContainer, setSelectedHistoryContainer] = useState(null);
  // Pallet đang xem chi tiết (Cấp 3)
  const [selectedHistoryPallet, setSelectedHistoryPallet] = useState(null);
  // Pallet đang được mở rộng Accordion trong Container chi tiết
  const [expandedPalletIndex, setExpandedPalletIndex] = useState(null);

  // Lịch sử pallet đơn lẻ (legacy)
  const [historyList, setHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem('g7_pallet_v1_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [saveSuccessModal, setSaveSuccessModal] = useState({ isOpen: false, record: null });

  // Modal thông báo & xác nhận
  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // ─── THÔNG TIN MÃ VỪA QUÉT CHO HUD MÁY QUÉT SA 8972 ───
  const [lastScannedDetail, setLastScannedDetail] = useState(null);
  const audioCtxRef = useRef(null);

  // Refs đồng bộ trạng thái tươi mới nhất cho vòng lặp camera (triệt tiêu 100% stale closures)
  const palletTabRef = useRef(palletTab);
  const standingDataRef = useRef(standingData);
  const roofDataRef = useRef(roofData);
  const messageModalRef = useRef(messageModal);
  const confirmModalRef = useRef(confirmModal);

  useEffect(() => { palletTabRef.current = palletTab; }, [palletTab]);
  useEffect(() => { standingDataRef.current = standingData; }, [standingData]);
  useEffect(() => { roofDataRef.current = roofData; }, [roofData]);
  useEffect(() => { messageModalRef.current = messageModal; }, [messageModal]);
  useEffect(() => { confirmModalRef.current = confirmModal; }, [confirmModal]);

  // Tự động mở Popup nhập Container nếu chưa có Container nào đang active
  useEffect(() => {
    if (!activeContainer && activeTab === 'scan') {
      setContainerNameInput('');
      setIsStartContainerModalOpen(true);
    }
  }, [activeContainer, activeTab]);

  // Kích hoạt tiêu điểm và yêu cầu hiện bàn phím ảo hệ thống khi mở Modal Container
  useEffect(() => {
    if (isStartContainerModalOpen) {
      const timer = setTimeout(() => {
        if (containerInputRef.current) {
          containerInputRef.current.focus();
          if (typeof navigator !== 'undefined' && 'virtualKeyboard' in navigator) {
            try {
              navigator.virtualKeyboard.overlaysContent = true;
              navigator.virtualKeyboard.show();
            } catch (_) {}
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isStartContainerModalOpen]);

  // Tự động lưu activeContainer vào localStorage khi có thay đổi
  useEffect(() => {
    try {
      if (activeContainer) {
        localStorage.setItem('g7_pallet_v1_active_container', JSON.stringify(activeContainer));
      } else {
        localStorage.removeItem('g7_pallet_v1_active_container');
      }
    } catch (e) {
      console.warn('Không thể lưu activeContainer vào localStorage:', e);
    }
  }, [activeContainer]);

  // Tự động lưu danh sách Container lịch sử vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(historyContainers));
    } catch (e) {
      console.warn('Không thể lưu historyContainers vào localStorage:', e);
    }
  }, [historyContainers]);

  // Tự động lưu lịch sử pallet đơn lẻ (legacy)
  useEffect(() => {
    try {
      localStorage.setItem('g7_pallet_v1_history', JSON.stringify(historyList));
    } catch (e) {
      console.warn('Không thể lưu history vào localStorage:', e);
    }
  }, [historyList]);

  // Tự động đóng pop-up thông báo quét: 1s khi thành công để quét tiếp cực nhanh; 2s khi có báo động/lỗi
  useEffect(() => {
    if (!scanPopup) return;
    const isError = scanPopup.type === 'rejected';
    const duration = isError ? 2000 : 1000;
    const timer = setTimeout(() => {
      setScanPopup(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [scanPopup]);

  // Đồng bộ ref để camera tạm ngưng quét khi đang hiển thị cảnh báo lỗi/báo động
  const scanPopupRef = useRef(null);
  useEffect(() => {
    scanPopupRef.current = scanPopup;
  }, [scanPopup]);

  // Cap nhat thong tin ma quet gan nhat de hien thi tren HUD May quet SA 8972
  useEffect(() => {
    if (scanPopup && scanPopup.code) {
      setLastScannedDetail({
        code: scanPopup.code,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: scanPopup.type === 'accepted' ? 'success' : 'error',
        category: scanPopup.category || 'UNKNOWN',
        title: scanPopup.title || '',
        count: scanPopup.count || null,
        standardCode: scanPopup.standardCode || null
      });
    }
  }, [scanPopup]);

  // Kích hoạt nhận mã quét
  const executeScannedCode = useCallback((rawCode) => {
    // Xóa sạch buffer và input ngầm
    scannerBufferRef.current = '';
    lastKeyTimeRef.current = 0;
    if (hiddenScannerInputRef.current) {
      hiddenScannerInputRef.current.value = '';
    }
    if (scannerTimerRef.current) {
      clearTimeout(scannerTimerRef.current);
      scannerTimerRef.current = null;
    }

    // Xóa trễ để dọn ký tự sót
    setTimeout(() => {
      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
      scannerBufferRef.current = '';
    }, 40);
    setTimeout(() => {
      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
    }, 120);

    if (!rawCode) return;

    // Chuẩn hóa mã sang tiếng Anh
    const clean = normalizeToEnglishBarcode(rawCode);
    if (clean.length < 2) return;

    const now = Date.now();
    // Chống quét dội tia / đúp mã trong 350ms
    if (clean === lastProcessedCodeRef.current && now - lastProcessedTimeRef.current < 350) {
      return;
    }
    // Nếu đang hiển thị cảnh báo lỗi, chỉ chặn dội tia lặp lại trong 500ms thay vì khoá vĩnh viễn
    if (scanPopupRef.current?.type === 'rejected' && now - lastProcessedTimeRef.current < 500) {
      return;
    }
    lastProcessedCodeRef.current = clean;
    lastProcessedTimeRef.current = now;

    if (processHandlerRef.current) {
      processHandlerRef.current(clean);
    }
  }, []);


  // ─── HỆ THỐNG ÂM THANH & RUNG TÁI SỬ DỤNG AUDIOCONTEXT ───
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playSuccessBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60);
      }
    } catch (err) {
      console.warn('Không thể phát âm thanh thành công:', err);
    }
  }, [soundEnabled, getAudioContext]);

  const playAlertSound = useCallback((repeatTimes = 3) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      for (let i = 0; i < repeatTimes; i++) {
        const startTime = ctx.currentTime + (i * 0.28);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, startTime);
        osc.frequency.exponentialRampToValueAtTime(520, startTime + 0.18);

        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 150, 300, 150, 500]);
      }
    } catch (err) {
      console.warn('Không thể phát còi báo động:', err);
    }
  }, [soundEnabled, getAudioContext]);

  // ─── HỆ THỐNG GIỌNG NÓI TIẾNG VIỆT (TEXT-TO-SPEECH) ───
  const speakText = useCallback((text) => {
    if (!soundEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      console.log('[TTS Đang phát]:', text);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.92; // Tốc độ chuẩn vừa phải, phát âm tròn vành rõ chữ, không bị vội
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi') || (v.name && v.name.toLowerCase().includes('vietnam')));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Không thể phát giọng nói:', err);
    }
  }, [soundEnabled]);

  // ─── QUY CHUẨN ĐÓNG GÓI PALLET THỰC TẾ (4 KIỆN ĐỨNG + 1 KIỆN TOP NÓC) ───
  const MAX_STANDING_KITS = 4; // Tối đa 4 kiện đứng
  const MAX_STANDING_SKU_PER_TYPE = 4; // Mỗi loại SKU đứng tối đa 4 cái
  const MAX_STANDING_SKUS_TOTAL = 8; // Tổng 8 SKU cho pallet đứng (2 loại x 4 cái)
  const MAX_STANDING_LPNS = 4; // 1 LPN quét lặp lại 4 lần

  const MAX_ROOF_KITS = 1; // Tối đa 1 kiện top nóc
  const MAX_ROOF_SKUS_TOTAL = 2; // Tối đa 2 cái SKU cho top nóc (1 kiện)
  const MAX_ROOF_LPNS = 1; // 1 mã LPN riêng cho top nóc

  // ─── LOGIC QUÉT VÀ KIỂM TRA TỰ ĐỘNG THÔNG MINH ───
  const handleProcessScannedCode = useCallback((rawText) => {
    if (!rawText) return;
    const cleanRaw = normalizeToEnglishBarcode(rawText);
    if (!cleanRaw) return;

    // ─── 0. KIỂM TRA NẾU ĐÂY LÀ MÃ QR TEM PALLET ĐÃ KIỂM TRA (VD: PLD-260925-3914, PLN-...) ───
    const scannedUpper = cleanRaw.toUpperCase().trim();
    let matchedHistory = (historyList || []).find(it => 
      it.id && (it.id.toUpperCase() === scannedUpper || scannedUpper.includes(it.id.toUpperCase()))
    );

    if (!matchedHistory) {
      try {
        const saved = localStorage.getItem('g7_pallet_v1_history');
        if (saved) {
          const list = JSON.parse(saved);
          matchedHistory = list.find(it => 
            it.id && (it.id.toUpperCase() === scannedUpper || scannedUpper.includes(it.id.toUpperCase()))
          );
        }
      } catch (e) {}
    }

    if (matchedHistory) {
      playSuccessBeep();
      speakText('Đã mở lịch sử kiểm tra');
      setSelectedHistoryItem(matchedHistory);
      setScanPopup({
        type: 'accepted',
        code: matchedHistory.id,
        category: 'PALLET',
        title: 'ĐÃ MỞ LỊCH SỬ KIỂM TRA'
      });
      return;
    }

    if (scannedUpper.startsWith('PLD-') || scannedUpper.startsWith('PLN-')) {
      playAlertSound(2);
      speakText('Không tìm thấy lịch sử');
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'KHÔNG TÌM THẤY LỊCH SỬ',
        message: `Mã phiếu [${scannedUpper}] chưa được ghi nhận trong lịch sử thiết bị!`
      });
      return;
    }

    const currentTab = palletTabRef.current || palletTab;
    const standing = standingDataRef.current || standingData;
    const roof = roofDataRef.current || roofData;
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const classified = classifyCode(cleanRaw);
    if (!classified) {
      playAlertSound(3);
      speakText('Cảnh báo! Mã không hợp lệ');
      setScanPopup({
        type: 'rejected',
        code: cleanRaw,
        category: 'UNKNOWN',
        title: 'BÁO ĐỘNG — MÃ KHÔNG HỢP LỆ'
      });
      return;
    }

    const { type, code } = classified;

    // ═════════════════════════════════════════════════════════════════════════
    // 1. XỬ LÝ NẾU LÀ MÃ LPN (MÃ VẬN CHUYỂN: MỖI LẦN QUÉT LIST XUỐNG 1 DÒNG)
    // Quy chuẩn: Pallet Đứng = 1 mã duy nhất x4 | Top Nóc = 1 mã duy nhất x1
    // ═════════════════════════════════════════════════════════════════════════
    if (type === 'LPN') {
      const lpnVoiceText = formatLpnForSpeech(code);

      // ───────────────────────────────────────────────────────────
      // TRƯỜNG HỢP A: ĐANG Ở TAB PALLET ĐỨNG
      // ───────────────────────────────────────────────────────────
      if (currentTab === 'standing') {
        const standingLpns = standing.lpns || [];

        // A1: Pallet Đứng chưa có LPN nào
        if (!standing.standardLpn || standingLpns.length === 0) {
          const newStanding = {
            ...standing,
            isSaved: false,
            standardLpn: code,
            totalScans: standing.totalScans + 1,
            lpns: [{
              id: Date.now() + Math.random(),
              code: code,
              time: nowStr
            }]
          };
          standingDataRef.current = newStanding;
          setStandingData(newStanding);

          playSuccessBeep();
          speakText(lpnVoiceText);
          setScanPopup({
            type: 'accepted',
            code: code,
            category: 'LPN',
            count: 1,
            title: 'ĐÃ NHẬN MÃ VẬN CHUYỂN (PALLET ĐỨNG: 1/4 LPN)'
          });
          return;
        }

        // A2: Quét đúng mã LPN chuẩn của Pallet Đứng
        if (code === standing.standardLpn || isOpticalVariantOfLpn(code, standing.standardLpn)) {
          if (standingLpns.length >= 4) {
            playAlertSound(3);
            speakText('Cảnh báo! Pallet đứng đã đủ 4 kiện vận chuyển');
            setScanPopup({
              type: 'rejected',
              code: standing.standardLpn,
              category: 'LPN',
              title: 'BÁO ĐỘNG — ĐÃ ĐỦ 4 LPN PALLET ĐỨNG'
            });
            return;
          }

          const newCount = standingLpns.length + 1;
          const updatedLpns = [
            ...standingLpns,
            {
              id: Date.now() + Math.random(),
              code: standing.standardLpn,
              time: nowStr
            }
          ];

          const newStanding = {
            ...standing,
            isSaved: false,
            totalScans: standing.totalScans + 1,
            lpns: updatedLpns
          };
          standingDataRef.current = newStanding;
          setStandingData(newStanding);

          playSuccessBeep();
          speakText(lpnVoiceText);
          setScanPopup({
            type: 'accepted',
            code: standing.standardLpn,
            category: 'LPN',
            count: newCount,
            title: newCount === 4
              ? '✓ ĐÃ ĐỦ 4 LPN PALLET ĐỨNG (4/4 KIỆN)'
              : `ĐÃ GHI NHẬN MÃ VẬN CHUYỂN (${newCount}/4 KIỆN)`
          });
          return;
        }

        // A3: Trong lúc quét ra mã LPN KHÁC ➔ ⚡ MẶC ĐỊNH CHO QUA TOP NÓC, SAU ĐÓ TIẾP TỤC!
        const roofLpns = roof.lpns || [];
        if (roofLpns.length >= 1) {
          if (code === roof.standardLpn || isOpticalVariantOfLpn(code, roof.standardLpn)) {
            setPalletTab('roof');
            palletTabRef.current = 'roof';
            playAlertSound(3);
            speakText('Cảnh báo! Top nóc đã có mã vận chuyển');
            setScanPopup({
              type: 'rejected',
              code: code,
              category: 'LPN',
              title: 'BÁO ĐỘNG — TOP NÓC ĐÃ CÓ 1 LPN'
            });
            return;
          } else {
            playAlertSound(3);
            speakText('Cảnh báo! Top nóc chỉ có đúng 1 mã vận chuyển');
            setScanPopup({
              type: 'rejected',
              code: code,
              standardCode: roof.standardLpn,
              category: 'LPN',
              title: 'BÁO ĐỘNG — SAI MÃ VẬN CHUYỂN'
            });
            return;
          }
        }

        // Top Nóc chưa có LPN ➔ Tự động gán mã này làm LPN của Top Nóc!
        setPalletTab('roof');
        palletTabRef.current = 'roof';

        const newRoof = {
          ...roof,
          isSaved: false,
          standardLpn: code,
          totalScans: roof.totalScans + 1,
          lpns: [{
            id: Date.now() + Math.random(),
            code: code,
            time: nowStr
          }]
        };
        roofDataRef.current = newRoof;
        setRoofData(newRoof);

        playSuccessBeep();
        speakText(`${lpnVoiceText}, top nóc`);
        setScanPopup({
          type: 'accepted',
          code: code,
          category: 'LPN',
          count: 1,
          title: '⚡ TỰ ĐỘNG CHUYỂN TOP NÓC (LPN: 1/1)'
        });
        return;
      }

      // ───────────────────────────────────────────────────────────
      // TRƯỜNG HỢP B: ĐANG Ở TAB TOP NÓC
      // ───────────────────────────────────────────────────────────
      if (currentTab === 'roof') {
        const standingLpns = standing.lpns || [];

        // B1: Quét lại trúng mã LPN cũ (của Pallet Đứng) ➔ ↩️ TỰ ĐỘNG VỀ KIỆN ĐỨNG!
        if (standing.standardLpn && (code === standing.standardLpn || isOpticalVariantOfLpn(code, standing.standardLpn))) {
          if (standingLpns.length < 4) {
            setPalletTab('standing');
            palletTabRef.current = 'standing';

            const newCount = standingLpns.length + 1;
            const updatedLpns = [
              ...standingLpns,
              {
                id: Date.now() + Math.random(),
                code: standing.standardLpn,
                time: nowStr
              }
            ];

            const newStanding = {
              ...standing,
              isSaved: false,
              totalScans: standing.totalScans + 1,
              lpns: updatedLpns
            };
            standingDataRef.current = newStanding;
            setStandingData(newStanding);

            playSuccessBeep();
            speakText(`Tự chuyển về Pallet Đứng, ${lpnVoiceText}`);
            setScanPopup({
              type: 'accepted',
              code: standing.standardLpn,
              category: 'LPN',
              count: newCount,
              title: `↩️ TỰ ĐỘNG VỀ PALLET ĐỨNG (${newCount}/4 KIỆN)`
            });
            return;
          }

          // Pallet Đứng đã đủ 4 lần LPN
          playAlertSound(3);
          speakText('Cảnh báo! Pallet đứng đã đủ 4 kiện vận chuyển');
          setScanPopup({
            type: 'rejected',
            code: standing.standardLpn,
            category: 'LPN',
            title: 'BÁO ĐỘNG — ĐÃ ĐỦ 4 LPN PALLET ĐỨNG'
          });
          return;
        }

        // B2: Quét mã LPN của Top Nóc
        const roofLpns = roof.lpns || [];
        if (roofLpns.length === 0) {
          const newRoof = {
            ...roof,
            isSaved: false,
            standardLpn: code,
            totalScans: roof.totalScans + 1,
            lpns: [{
              id: Date.now() + Math.random(),
              code: code,
              time: nowStr
            }]
          };
          roofDataRef.current = newRoof;
          setRoofData(newRoof);

          playSuccessBeep();
          speakText(`${lpnVoiceText}, top nóc`);
          setScanPopup({
            type: 'accepted',
            code: code,
            category: 'LPN',
            count: 1,
            title: 'ĐÃ GHI NHẬN MÃ VẬN CHUYỂN TOP NÓC (1/1)'
          });
          return;
        }

        if (code === roof.standardLpn || isOpticalVariantOfLpn(code, roof.standardLpn)) {
          playAlertSound(3);
          speakText('Cảnh báo! Top nóc đã có mã vận chuyển');
          setScanPopup({
            type: 'rejected',
            code: code,
            category: 'LPN',
            title: 'BÁO ĐỘNG — TOP NÓC ĐÃ CÓ 1 LPN'
          });
          return;
        }

        // B3: Báo động sai mã nếu xuất hiện mã LPN thứ 3 lạ
        playAlertSound(3);
        speakText('Cảnh báo! Top nóc chỉ có đúng 1 mã vận chuyển');
        setScanPopup({
          type: 'rejected',
          code: code,
          standardCode: roof.standardLpn,
          category: 'LPN',
          title: 'BÁO ĐỘNG — SAI MÃ VẬN CHUYỂN'
        });
        return;
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. XỬ LÝ NẾU LÀ MÃ SKU (MÃ SẢN PHẨM: MỖI LẦN QUÉT LIST XUỐNG 1 DÒNG)
    // Quy chuẩn: Pallet Đứng = 1 mã duy nhất x8 | Top Nóc = 1 mã duy nhất x2
    // ═════════════════════════════════════════════════════════════════════════
    if (type === 'SKU') {
      const mappedSku = formatCabinetSeriesTag(code);
      const speechSku = formatSkuForSpeech(code);

      // ───────────────────────────────────────────────────────────
      // TRƯỜNG HỢP A: ĐANG Ở TAB PALLET ĐỨNG
      // ───────────────────────────────────────────────────────────
      if (currentTab === 'standing') {
        const standingSkus = standing.skus || [];

        // A1: Pallet Đứng chưa có mã SKU nào
        if (!standing.standardSku || standingSkus.length === 0) {
          const newStanding = {
            ...standing,
            isSaved: false,
            standardSku: code,
            totalScans: standing.totalScans + 1,
            skus: [{
              id: Date.now() + Math.random(),
              code: code,
              time: nowStr
            }]
          };
          standingDataRef.current = newStanding;
          setStandingData(newStanding);

          playSuccessBeep();
          speakText(`Sản phẩm, ${speechSku}`);
          setScanPopup({
            type: 'accepted',
            code: code,
            category: 'SKU',
            count: 1,
            title: mappedSku && mappedSku !== code
              ? `ĐÃ NHẬN SKU: ${mappedSku} (1/8 cái)`
              : 'ĐÃ NHẬN SKU PALLET ĐỨNG (1/8 cái)'
          });
          return;
        }

        // A2: Quét đúng mã SKU chuẩn của Pallet Đứng (hoặc biến thể quang học)
        if (code === standing.standardSku || isOpticalVariantOfSku(code, standing.standardSku)) {
          // Nếu chưa đủ 8 cái ➔ Thêm 1 dòng mới vào Pallet Đứng (list xuống: 1..8)
          if (standingSkus.length < 8) {
            const newCount = standingSkus.length + 1;
            const updatedSkus = [
              ...standingSkus,
              {
                id: Date.now() + Math.random(),
                code: standing.standardSku,
                time: nowStr
              }
            ];

            const newStanding = {
              ...standing,
              isSaved: false,
              totalScans: standing.totalScans + 1,
              skus: updatedSkus
            };
            standingDataRef.current = newStanding;
            setStandingData(newStanding);

            playSuccessBeep();
            speakText(`Sản phẩm, ${speechSku}`);
            setScanPopup({
              type: 'accepted',
              code: standing.standardSku,
              category: 'SKU',
              count: newCount,
              title: newCount === 8
                ? '✓ ĐÃ ĐỦ 8 SKU PALLET ĐỨNG (4 KIỆN)'
                : (mappedSku && mappedSku !== standing.standardSku
                    ? `ĐÃ GHI NHẬN SKU: ${mappedSku} (${newCount}/8 cái)`
                    : `ĐÃ GHI NHẬN SKU (${newCount}/8 cái)`)
            });
            return;
          }

          // ⚡ NẾU PALLET ĐỨNG ĐÃ ĐỦ 8 CÁI ➔ TỰ ĐỘNG TRÀN SANG TOP NÓC (ROOF OVERFLOW)!
          // (Kiện top nóc có thể trùng SKU luôn, nếu 4 kiện = 8 SKU rồi mà quét tiếp thì mặc định nằm ở top nóc)
          const roofSkus = roof.skus || [];

          if (!roof.standardSku || roofSkus.length === 0) {
            setPalletTab('roof');
            palletTabRef.current = 'roof';

            const newRoof = {
              ...roof,
              isSaved: false,
              standardSku: code,
              totalScans: roof.totalScans + 1,
              skus: [{
                id: Date.now() + Math.random(),
                code: code,
                time: nowStr
              }]
            };
            roofDataRef.current = newRoof;
            setRoofData(newRoof);

            playSuccessBeep();
            speakText(`Sản phẩm top nóc, ${speechSku}`);
            setScanPopup({
              type: 'accepted',
              code: code,
              category: 'SKU',
              count: 1,
              title: '⚡ TỰ CHUYỂN TOP NÓC (1/2 CÁI)'
            });
            return;
          }

          // Top Nóc đã có standardSku:
          if (code === roof.standardSku || isOpticalVariantOfSku(code, roof.standardSku)) {
            if (roofSkus.length < 2) {
              setPalletTab('roof');
              palletTabRef.current = 'roof';

              const newRoof = {
                ...roof,
                isSaved: false,
                totalScans: roof.totalScans + 1,
                skus: [
                  ...roofSkus,
                  {
                    id: Date.now() + Math.random(),
                    code: roof.standardSku,
                    time: nowStr
                  }
                ]
              };
              roofDataRef.current = newRoof;
              setRoofData(newRoof);

              playSuccessBeep();
              speakText(`Sản phẩm top nóc, ${speechSku}`);
              setScanPopup({
                type: 'accepted',
                code: code,
                category: 'SKU',
                count: 2,
                title: '⚡ ĐỦ SỐ LƯỢNG TOP NÓC (2/2 CÁI)'
              });
              return;
            } else {
              playAlertSound(3);
              speakText('Cảnh báo! Pallet đã đầy, top nóc chỉ có tối đa 2 cái');
              setScanPopup({
                type: 'rejected',
                code: code,
                category: 'SKU',
                title: 'BÁO ĐỘNG — PALLET ĐÃ ĐẦY (TOP NÓC ĐỦ 2 CÁI)'
              });
              return;
            }
          } else {
            playAlertSound(3);
            speakText('Cảnh báo! Top nóc chỉ có một mã sản phẩm duy nhất');
            setScanPopup({
              type: 'rejected',
              code: code,
              standardCode: roof.standardSku,
              category: 'SKU',
              title: 'BÁO ĐỘNG — TOP NÓC CHỈ CÓ 1 MÃ SKU (x2)'
            });
            return;
          }
        }

        // A3: TRONG LÚC QUÉT MÃ RA MÃ KHÁC (khác mã standardSku của Pallet Đứng)
        // ➔ ⚡ MẶC ĐỊNH CHO QUA TOP NÓC, SAU ĐÓ TIẾP TỤC!
        const roofSkus = roof.skus || [];

        if (!roof.standardSku || roofSkus.length === 0) {
          setPalletTab('roof');
          palletTabRef.current = 'roof';

          const newRoof = {
            ...roof,
            isSaved: false,
            standardSku: code,
            totalScans: roof.totalScans + 1,
            skus: [{
              id: Date.now() + Math.random(),
              code: code,
              time: nowStr
            }]
          };
          roofDataRef.current = newRoof;
          setRoofData(newRoof);

          playSuccessBeep();
          speakText(`Sản phẩm top nóc, ${speechSku}`);
          setScanPopup({
            type: 'accepted',
            code: code,
            category: 'SKU',
            count: 1,
            title: mappedSku && mappedSku !== code
              ? `⚡ TỰ CHUYỂN TOP NÓC: ${mappedSku} (1/2 CÁI)`
              : '⚡ TỰ CHUYỂN TOP NÓC (1/2 CÁI)'
          });
          return;
        }

        if (code === roof.standardSku || isOpticalVariantOfSku(code, roof.standardSku)) {
          if (roofSkus.length < 2) {
            setPalletTab('roof');
            palletTabRef.current = 'roof';

            const newRoof = {
              ...roof,
              isSaved: false,
              totalScans: roof.totalScans + 1,
              skus: [
                ...roofSkus,
                {
                  id: Date.now() + Math.random(),
                  code: roof.standardSku,
                  time: nowStr
                }
              ]
            };
            roofDataRef.current = newRoof;
            setRoofData(newRoof);

            playSuccessBeep();
            speakText(`Sản phẩm top nóc, ${speechSku}`);
            setScanPopup({
              type: 'accepted',
              code: code,
              category: 'SKU',
              count: 2,
              title: '⚡ ĐỦ SỐ LƯỢNG TOP NÓC (2/2 CÁI)'
            });
            return;
          } else {
            playAlertSound(3);
            speakText('Cảnh báo! Pallet đã đầy, top nóc chỉ có tối đa 2 cái');
            setScanPopup({
              type: 'rejected',
              code: code,
              category: 'SKU',
              title: 'BÁO ĐỘNG — PALLET ĐÃ ĐẦY (TOP NÓC ĐỦ 2 CÁI)'
            });
            return;
          }
        }

        // Mã lạ thứ 3
        playAlertSound(3);
        speakText('Cảnh báo! Top nóc chỉ có một mã sản phẩm duy nhất');
        setScanPopup({
          type: 'rejected',
          code: code,
          standardCode: roof.standardSku,
          category: 'SKU',
          title: 'BÁO ĐỘNG — TOP NÓC CHỈ CÓ 1 MÃ SKU (x2)'
        });
        return;
      }

      // ───────────────────────────────────────────────────────────
      // TRƯỜNG HỢP B: ĐANG Ở TAB TOP NÓC
      // ───────────────────────────────────────────────────────────
      if (currentTab === 'roof') {
        const standingSkus = standing.skus || [];

        // B1: QUÉT LẠI MÃ CŨ (MÃ CỦA KIỆN ĐỨNG) ➔ ↩️ TỰ ĐỘNG VÀO KIỆN ĐỨNG!
        if (standing.standardSku && (code === standing.standardSku || isOpticalVariantOfSku(code, standing.standardSku))) {
          if (standingSkus.length < 8) {
            setPalletTab('standing');
            palletTabRef.current = 'standing';

            const newCount = standingSkus.length + 1;
            const updatedSkus = [
              ...standingSkus,
              {
                id: Date.now() + Math.random(),
                code: standing.standardSku,
                time: nowStr
              }
            ];

            const newStanding = {
              ...standing,
              isSaved: false,
              totalScans: standing.totalScans + 1,
              skus: updatedSkus
            };
            standingDataRef.current = newStanding;
            setStandingData(newStanding);

            playSuccessBeep();
            speakText(`Tự chuyển về Pallet Đứng, sản phẩm, ${speechSku}`);
            setScanPopup({
              type: 'accepted',
              code: standing.standardSku,
              category: 'SKU',
              count: newCount,
              title: newCount === 8
                ? '✓ ĐÃ ĐỦ 8 SKU PALLET ĐỨNG (4 KIỆN)'
                : (mappedSku && mappedSku !== standing.standardSku
                    ? `↩️ VỀ PALLET ĐỨNG: ${mappedSku} (${newCount}/8 cái)`
                    : `↩️ TỰ ĐỘNG VỀ PALLET ĐỨNG (${newCount}/8 cái)`)
            });
            return;
          }
        }

        // B2: Xử lý cho Top Nóc (Quy chuẩn: 1 mã duy nhất x2)
        const roofSkus = roof.skus || [];

        if (!roof.standardSku || roofSkus.length === 0) {
          const newRoof = {
            ...roof,
            isSaved: false,
            standardSku: code,
            totalScans: roof.totalScans + 1,
            skus: [{
              id: Date.now() + Math.random(),
              code: code,
              time: nowStr
            }]
          };
          roofDataRef.current = newRoof;
          setRoofData(newRoof);

          playSuccessBeep();
          speakText(`Sản phẩm top nóc, ${speechSku}`);
          setScanPopup({
            type: 'accepted',
            code: code,
            category: 'SKU',
            count: 1,
            title: mappedSku && mappedSku !== code
              ? `ĐÃ NHẬN SKU TOP NÓC: ${mappedSku} (1/2 CÁI)`
              : 'ĐÃ GHI NHẬN SKU TOP NÓC (1/2 CÁI)'
          });
          return;
        }

        if (code === roof.standardSku || isOpticalVariantOfSku(code, roof.standardSku)) {
          if (roofSkus.length < 2) {
            const newRoof = {
              ...roof,
              isSaved: false,
              totalScans: roof.totalScans + 1,
              skus: [
                ...roofSkus,
                {
                  id: Date.now() + Math.random(),
                  code: roof.standardSku,
                  time: nowStr
                }
              ]
            };
            roofDataRef.current = newRoof;
            setRoofData(newRoof);

            playSuccessBeep();
            speakText(`Sản phẩm top nóc, ${speechSku}`);
            setScanPopup({
              type: 'accepted',
              code: code,
              category: 'SKU',
              count: 2,
              title: '✓ ĐỦ SỐ LƯỢNG TOP NÓC (2/2 CÁI)'
            });
            return;
          } else {
            playAlertSound(3);
            speakText('Cảnh báo! Pallet đã đầy, top nóc chỉ có tối đa 2 cái');
            setScanPopup({
              type: 'rejected',
              code: code,
              category: 'SKU',
              title: 'BÁO ĐỘNG — PALLET ĐÃ ĐẦY (TOP NÓC ĐỦ 2 CÁI)'
            });
            return;
          }
        }

        // Top Nóc đã có standardSku và mã này là mã lạ thứ 3
        playAlertSound(3);
        speakText('Cảnh báo! Top nóc chỉ có một mã sản phẩm duy nhất');
        setScanPopup({
          type: 'rejected',
          code: code,
          standardCode: roof.standardSku,
          category: 'SKU',
          title: 'BÁO ĐỘNG — TOP NÓC CHỈ CÓ 1 MÃ SKU (x2)'
        });
        return;
      }
    }
  }, [palletTab, standingData, roofData, playSuccessBeep, playAlertSound, speakText, historyList])

  // Đồng bộ handler xử lý quét mã luôn là phiên bản mới nhất
  useEffect(() => {
    processHandlerRef.current = handleProcessScannedCode;
  });

  // Kiểm tra xem người dùng có đang gõ tay vào bất kỳ ô input/textarea nào không
  const isUserTypingInField = useCallback(() => {
    const active = document.activeElement;
    if (!active) return false;
    if (active === hiddenScannerInputRef.current) return false;
    const tag = active.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || active.isContentEditable;
  }, []);

  const isAnyModalActive = Boolean(
    isStartContainerModalOpen || 
    isEditContainerModalOpen || 
    isEditHistoryContainerModalOpen || 
    isEditPalletModalOpen || 
    messageModal?.isOpen || 
    confirmModal?.isOpen || 
    selectedHistoryContainer || 
    selectedHistoryPallet
  );

  // Lắng nghe máy quét phần cứng (SA 8972)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Nếu có bất kỳ modal nào đang mở hoặc người dùng đang gõ vào input (tên container, ô tìm kiếm...), để gõ tự nhiên 100%!
      if (isAnyModalActive || isUserTypingInField()) return;

      const key = e.key;
      const keyCode = e.keyCode || e.which;

      // Phím kết thúc quét (Enter / Tab)
      if (key === 'Enter' || key === 'Tab' || keyCode === 13 || keyCode === 9) {
        if (scannerTimerRef.current) {
          clearTimeout(scannerTimerRef.current);
          scannerTimerRef.current = null;
        }

        // Lấy mã từ input ngầm hoặc buffer
        const inputVal = hiddenScannerInputRef.current ? hiddenScannerInputRef.current.value.trim() : '';
        const bufferVal = scannerBufferRef.current.trim();
        const code = inputVal || bufferVal;

        scannerBufferRef.current = '';
        lastKeyTimeRef.current = 0;
        if (hiddenScannerInputRef.current) {
          hiddenScannerInputRef.current.value = '';
          setTimeout(() => {
            if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
          }, 40);
        }

        if (code && code.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          executeScannedCode(code);
        }
        return;
      }

      // Xử lý phím Backspace
      if (key === 'Backspace' || keyCode === 8) {
        scannerBufferRef.current = scannerBufferRef.current.slice(0, -1);
        return;
      }

      // Nhận ký tự từ máy quét
      if (key && key.length === 1) {
        const now = Date.now();
        // Xóa buffer nếu cách nhau quá 400ms
        if (now - lastKeyTimeRef.current > 400) {
          scannerBufferRef.current = '';
          if (hiddenScannerInputRef.current) {
            hiddenScannerInputRef.current.value = '';
          }
        }
        lastKeyTimeRef.current = now;
        scannerBufferRef.current += key;

        // Tự kích hoạt nếu máy quét không gửi Enter (đợi 350ms để không bị cắt đuôi ký tự)
        if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
        scannerTimerRef.current = setTimeout(() => {
          const inputVal = hiddenScannerInputRef.current ? hiddenScannerInputRef.current.value.trim() : '';
          const code = (inputVal || scannerBufferRef.current).trim();
          scannerBufferRef.current = '';
          lastKeyTimeRef.current = 0;
          if (hiddenScannerInputRef.current) {
            hiddenScannerInputRef.current.value = '';
            setTimeout(() => {
              if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
            }, 40);
          }
          if (code && code.length >= 2) {
            executeScannedCode(code);
          }
        }, 350);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
    };
  }, [executeScannedCode, isAnyModalActive, isUserTypingInField]);

  // ─── GIỮ FOCUS NGẦM CHO SÚNG BẮT MÃ / MÁY QUÉT POS TRÊN TAB QUÉT ───
  useEffect(() => {
    if (activeTab === 'scan' && !isAnyModalActive) {
      const focusScanner = (e) => {
        // Tuyệt đối không cướp focus nếu người dùng đang thao tác trên bất kỳ ô nhập văn bản nào hoặc đang mở modal
        if (isAnyModalActive || isUserTypingInField()) return;
        if (e && e.target) {
          const tag = e.target.tagName?.toLowerCase();
          if (tag === 'input' || tag === 'textarea' || tag === 'button' || e.target.closest?.('input, textarea, button, [role="dialog"]')) {
            return;
          }
        }
        if (hiddenScannerInputRef.current && document.activeElement !== hiddenScannerInputRef.current) {
          try {
            hiddenScannerInputRef.current.focus({ preventScroll: true });
          } catch (_) {}
        }
      };

      const timer = setTimeout(focusScanner, 200);
      const interval = setInterval(focusScanner, 2000);
      window.addEventListener('click', focusScanner);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
        window.removeEventListener('click', focusScanner);
      };
    }
  }, [activeTab, isAnyModalActive, isUserTypingInField]);

  // ─── HÀM IN THẺ KIỂM TRA PALLET KHỔ 56MM ───
  const handlePrintThermalTicket = useCallback((record) => {
    if (!record) return;

    // Lấy QR Code dạng hình ảnh từ canvas ẩn
    let qrDataUrl = '';
    const canvas = document.getElementById(`qr-thermal-canvas-${record.id}`);
    if (canvas) {
      try {
        qrDataUrl = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('Không thể trích xuất dataUrl từ Canvas QR:', err);
      }
    }

    const skuLines = (record.skus && record.skus.length > 0)
      ? record.skus.map(s => `
          <div style="display:flex; justify-content:space-between; font-size:10.5px; padding:1.5px 0;">
            <span style="font-family:Consolas,monospace; font-weight:bold;">${s.code || s}</span>
            <span style="font-weight:bold;">${s.count || 1} cái</span>
          </div>
        `).join('')
      : '<div style="font-size:10px; font-style:italic; color:#666;">Chưa có SKU</div>';

    const lpnLines = (record.lpns && record.lpns.length > 0)
      ? record.lpns.map(l => `
          <div style="display:flex; justify-content:space-between; font-size:10.5px; padding:1.5px 0;">
            <span style="font-family:Consolas,monospace; font-weight:bold;">${l.code || l}</span>
            <span style="font-weight:bold;">${l.count || 1} cái</span>
          </div>
        `).join('')
      : '<div style="font-size:10px; font-style:italic; color:#666;">Chưa có LPN</div>';

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Thẻ kiểm tra - ${record.id}</title>
        <style>
          @page {
            size: 56mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            width: 56mm;
            margin: 0 auto;
            padding: 6px 4px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.3;
          }
          .tag-title {
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            color: #15803d;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .pallet-id {
            text-align: center;
            font-size: 12px;
            font-weight: 800;
            color: #111;
            font-family: Consolas, monospace;
          }
          .pallet-tab {
            text-align: center;
            font-size: 10.5px;
            font-weight: 700;
            color: #444;
            margin-bottom: 4px;
          }
          .dash-line {
            border-top: 1px dashed #666;
            margin: 4px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #333;
            margin: 1.5px 0;
          }
          .qr-container {
            text-align: center;
            margin: 5px 0 3px 0;
          }
          .qr-container img {
            width: 125px;
            height: 125px;
            display: block;
            margin: 0 auto;
          }
          .qr-subtext {
            text-align: center;
            font-size: 8.5px;
            color: #555;
            margin-top: 2px;
          }
          .sec-header {
            font-size: 10px;
            font-weight: 800;
            color: #222;
            text-transform: uppercase;
            margin: 3px 0 2px 0;
          }
          .footer-brand {
            text-align: center;
            font-size: 8.5px;
            color: #777;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="tag-title">ĐÃ KIỂM TRA</div>
        <div class="pallet-id">${record.id}</div>
        <div class="pallet-tab">${record.tabTitle || (record.tabType === 'roof' ? 'Top nóc' : 'Pallet đứng')}</div>

        <div class="dash-line"></div>

        <div class="meta-row">
          <span>Thời gian:</span>
          <strong>${record.timestamp || ''}</strong>
        </div>
        <div class="meta-row">
          <span>Người kiểm:</span>
          <strong>${record.inspector || operatorName}</strong>
        </div>

        <div class="dash-line"></div>

        <div class="qr-container">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : ''}
          <div class="qr-subtext">Quét mã QR để mở lại lịch sử kiểm tra</div>
        </div>

        <div class="dash-line"></div>

        <div class="sec-header">DANH SÁCH SKU:</div>
        ${skuLines}

        <div class="dash-line"></div>

        <div class="sec-header">DANH SÁCH LPN:</div>
        ${lpnLines}

        <div class="dash-line"></div>
        <div class="footer-brand">G7 SmartFlow • Kiểm Tra Pallet</div>
      </body>
      </html>
    `;

    // 1. Nếu trên máy POS/thiết bị cầm tay có cầu AndroidPrint
    if (window.AndroidPrint && window.AndroidPrint.printHtml) {
      window.AndroidPrint.printHtml(printHtml, `The_Kiem_Tra_${record.id}`);
      return;
    }

    // 2. Chế độ in iframe tiêu chuẩn cho Web & Mobile
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printHtml);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('Lỗi kích hoạt lệnh in:', e);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  }, []);

  const currentPalletIndex = (activeContainer?.pallets?.length || 0) + 1;

  // Bắt đầu Container mới (Lưu ngay vào Lịch Sử & SQL Server ở trạng thái in_progress)
  const handleStartNewContainer = (name) => {
    const finalName = (name || '').trim() || `CONT-${new Date().toLocaleDateString('vi-VN').replace(/\//g, '')}-01`;
    const newCont = {
      id: generateContainerId(),
      name: finalName,
      createdAt: new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toLocaleString('vi-VN'),
      inspector: operatorName,
      status: 'in_progress',
      pallets: []
    };
    setActiveContainer(newCont);
    setIsStartContainerModalOpen(false);

    // Cập nhật ngay vào danh sách Lịch Sử
    setHistoryContainers(prev => {
      const filtered = (prev || []).filter(c => c.id !== newCont.id);
      const updated = [newCont, ...filtered];
      try {
        localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Đồng bộ tức thì lên Database SQL Server
    try {
      apiClient.post('/pallet-check/containers', newCont)
        .then(() => console.log(`✓ Đã lưu khởi tạo Container [${finalName}] vào CSDL SQL Server`))
        .catch(err => console.warn('Lưu Container lên SQL Server thất bại (đã lưu tạm cục bộ):', err));
    } catch (e) {
      console.warn('Exception khi gọi API lưu Container:', e);
    }

    playSuccessBeep();
    speakText(`Đã tạo Container ${finalName}`);
  };

  // Cập nhật tên Container
  const handleUpdateContainerName = (newName) => {
    if (!newName || !newName.trim()) return;
    setActiveContainer(prev => ({
      ...(prev || { id: generateContainerId(), pallets: [] }),
      name: newName.trim(),
      updatedAt: new Date().toLocaleString('vi-VN')
    }));
    setIsEditContainerModalOpen(false);
    playSuccessBeep();
  };

  // Xóa toàn bộ dữ liệu Top Nóc khi người dùng xác nhận pallet không có tủ nóc
  const handleClearRoofData = () => {
    setRoofData({
      skus: [],
      lpns: [],
      standardLpn: null,
      standardSku: null,
      isSaved: false,
      savedKey: null,
      totalScans: 0
    });
    roofDataRef.current = {
      skus: [],
      lpns: [],
      standardLpn: null,
      standardSku: null,
      isSaved: false,
      savedKey: null,
      totalScans: 0
    };
    setPalletTab('standing');
    palletTabRef.current = 'standing';
    playSuccessBeep();
    speakText('Đã xóa dữ liệu Top Nóc, chuyển về Pallet Đứng');
  };

  // Chuyển sang Pallet Tiếp Theo (Next Pallet)
  // Chuyển sang Pallet Tiếp Theo trong cùng Container
  const handleNextPallet = () => {
    const standingTotal = (standingData.skus?.length || 0) + (standingData.lpns?.length || 0);
    const roofTotal = (roofData.skus?.length || 0) + (roofData.lpns?.length || 0);

    if (standingTotal === 0 && roofTotal === 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Chưa có dữ liệu Pallet',
        message: `Pallet #${currentPalletIndex} chưa có mã quét nào. Vui lòng quét ít nhất 1 mã trước khi chuyển Pallet!`
      });
      return;
    }

    // Pallet Đứng bắt buộc phải có ít nhất 1 mã SKU và 1 mã LPN
    if ((standingData.skus?.length || 0) === 0 || (standingData.lpns?.length || 0) === 0) {
      playAlertSound(3);
      speakText('Pallet đứng cần có ít nhất mã SKU và mã vận chuyển');
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'PALLET ĐỨNG CHƯA ĐỦ MÃ',
        message: `Pallet #${currentPalletIndex} cần có ít nhất 1 mã SKU và 1 mã LPN ở Pallet Đứng trước khi chuyển Pallet!`
      });
      return;
    }

    const standingTotalSkus = (standingData.skus || []).reduce((sum, s) => sum + (s.count || 1), 0);
    const standingSkuTypesCount = (standingData.skus || []).length;
    const standingTotalLpns = (standingData.lpns || []).reduce((sum, l) => sum + (l.count || 1), 0);
    const isStandingComplete = ((standingData.skus?.length || 0) === 8) && ((standingData.lpns?.length || 0) === 4);

    const roofTotalSkus = (roofData.skus || []).reduce((sum, s) => sum + (s.count || 1), 0);
    const roofTotalLpns = (roofData.lpns || []).reduce((sum, l) => sum + (l.count || 1), 0);
    const hasRoofData = roofTotalSkus > 0 || roofTotalLpns > 0;
    const isRoofComplete = ((roofData.skus?.length || 0) === 2) && ((roofData.lpns?.length || 0) === 1);

    const performSaveAndNext = (overrideNoRoof = false) => {
      const isRoofSkipped = overrideNoRoof || (!hasRoofData);
      const activeRoofData = isRoofSkipped ? {
        skus: [],
        lpns: [],
        standardSku: null,
        standardLpn: null,
        totalScans: 0
      } : roofData;

      const palletRecord = {
        palletIndex: currentPalletIndex,
        palletId: `PL-${(activeContainer?.name || 'CONT').replace(/[^A-Za-z0-9_-]/g, '')}-P${String(currentPalletIndex).padStart(2, '0')}`,
        status: 'pass',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        standing: {
          skus: [...standingData.skus],
          lpns: [...standingData.lpns],
          standardSku: standingData.standardSku,
          standardLpn: standingData.standardLpn
        },
        roof: isRoofSkipped ? {
          hasRoof: false,
          skus: [],
          lpns: [],
          standardSku: null,
          standardLpn: null
        } : {
          hasRoof: true,
          skus: [...activeRoofData.skus],
          lpns: [...activeRoofData.lpns],
          standardSku: activeRoofData.standardSku,
          standardLpn: activeRoofData.standardLpn
        },
        totalScans: standingData.totalScans + (isRoofSkipped ? 0 : activeRoofData.totalScans)
      };

      const updatedPallets = [...(activeContainer?.pallets || []), palletRecord];
      const currentInspector = (activeContainer?.inspector && activeContainer.inspector !== 'Nguyễn A')
        ? activeContainer.inspector
        : operatorName;
      const updatedContainer = {
        ...(activeContainer || { id: generateContainerId(), name: 'Container' }),
        inspector: currentInspector,
        updatedAt: new Date().toLocaleString('vi-VN'),
        pallets: updatedPallets
      };

      setActiveContainer(updatedContainer);

      // Cập nhật ngay vào danh sách Lịch Sử
      setHistoryContainers(prev => {
        const filtered = (prev || []).filter(c => c.id !== updatedContainer.id);
        const updated = [updatedContainer, ...filtered];
        try {
          localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      // Tự động đồng bộ tiến độ Pallet lên Database SQL Server
      try {
        apiClient.post('/pallet-check/containers', updatedContainer)
          .catch(e => console.warn('Lưu tiến độ Pallet lên server thất bại:', e));
      } catch (_) {}

      // Reset form để quét pallet tiếp theo
      setStandingData({
        skus: [],
        lpns: [],
        standardLpn: null,
        standardSku: null,
        isSaved: false,
        savedKey: null,
        totalScans: 0
      });
      standingDataRef.current = {
        skus: [],
        lpns: [],
        standardLpn: null,
        standardSku: null,
        isSaved: false,
        savedKey: null,
        totalScans: 0
      };
      setRoofData({
        skus: [],
        lpns: [],
        standardLpn: null,
        standardSku: null,
        isSaved: false,
        savedKey: null,
        totalScans: 0
      });
      roofDataRef.current = {
        skus: [],
        lpns: [],
        standardLpn: null,
        standardSku: null,
        isSaved: false,
        savedKey: null,
        totalScans: 0
      };
      setPalletTab('standing');
      palletTabRef.current = 'standing';

      // Xóa bộ đệm máy quét
      lastProcessedCodeRef.current = '';
      lastProcessedTimeRef.current = 0;
      scannerBufferRef.current = '';
      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';

      playSuccessBeep();
      speakText(`Đã lưu Pallet ${currentPalletIndex}, chuyển sang Pallet ${currentPalletIndex + 1}`);

      setMessageModal({
        isOpen: true,
        type: 'success',
        title: `ĐÃ LƯU PALLET #${currentPalletIndex}`,
        message: `Pallet #${currentPalletIndex} đã lưu thành công vào Container [${activeContainer?.name}]. Bạn đang ở Pallet #${currentPalletIndex + 1}.`
      });
    };

    // Kiểm tra nếu có dữ liệu Top Nóc dở dang
    if (hasRoofData && !isRoofComplete) {
      playAlertSound(3);
      speakText('Top nóc chưa đủ điều kiện, cần 2 mã sản phẩm và 1 mã vận chuyển');
      setConfirmModal({
        isOpen: true,
        title: 'TOP NÓC CHƯA ĐỦ ĐIỀU KIỆN (1 KIỆN)',
        message: `Pallet #${currentPalletIndex} đang có dữ liệu Top Nóc dở dang: Mới có ${roofTotalSkus}/2 SKU và ${roofTotalLpns}/1 LPN.\n\nQuy chuẩn 1 kiện Top Nóc gồm đúng 2 SKU và 1 LPN.\nNếu Pallet này KHÔNG CÓ Tủ Nóc, bạn có thể xóa Top Nóc và chuyển Pallet ngay!`,
        confirmText: '✕ Xóa Nóc & Chuyển Pallet',
        cancelText: 'Quay lại quét tiếp',
        onConfirm: () => {
          setRoofData({
            skus: [],
            lpns: [],
            standardLpn: null,
            standardSku: null,
            isSaved: false,
            savedKey: null,
            totalScans: 0
          });
          roofDataRef.current = {
            skus: [],
            lpns: [],
            standardLpn: null,
            standardSku: null,
            isSaved: false,
            savedKey: null,
            totalScans: 0
          };
          performSaveAndNext(true);
        }
      });
      return;
    }

    // Kiểm tra nếu Pallet Đứng chưa đủ 4 kiện
    if (!isStandingComplete) {
      const isTwoBoxCandidate = (!hasRoofData && standingTotalSkus === 4 && standingTotalLpns === 2);
      if (isTwoBoxCandidate) {
        setConfirmModal({
          isOpen: true,
          title: `XÁC NHẬN LƯU PALLET 2 KIỆN (NGOẠI LỆ)`,
          message: `Pallet #${currentPalletIndex} có đúng 2 kiện (4 mã SKU và 2 mã LPN).\n\nQuy chuẩn cho phép DUY NHẤT 1 Pallet 2 kiện trong container.\nBạn có muốn lưu thành Pallet 2 kiện và chuyển sang Pallet #${currentPalletIndex + 1} không?`,
          confirmText: '✓ Lưu Pallet 2 Kiện & Tiếp tục',
          cancelText: 'Quay lại quét tiếp',
          onConfirm: () => performSaveAndNext(false)
        });
        return;
      }

      setConfirmModal({
        isOpen: true,
        title: `PALLET ĐỨNG CHƯA ĐỦ 4 KIỆN`,
        message: `Pallet #${currentPalletIndex} mới có ${standingTotalSkus}/8 mã SKU và ${standingTotalLpns}/4 mã LPN.\n\nQuy chuẩn đóng gói xuất khẩu yêu cầu đủ 4 kiện đứng (8 mã SKU và 4 lần LPN).\nBạn có chắc chắn muốn lưu và chuyển sang Pallet #${currentPalletIndex + 1} không?`,
        confirmText: 'Vẫn lưu & Chuyển Pallet',
        cancelText: 'Quay lại quét tiếp',
        onConfirm: () => performSaveAndNext(false)
      });
      return;
    }

    performSaveAndNext(false);
  };

  // Hoàn thành Container & Lưu vào Lịch Sử với Kiểm Định Quy Chuẩn Toàn Diện
  const handleFinishContainer = () => {
    if (!activeContainer) return;
    const standingTotal = (standingData.skus?.length || 0) + (standingData.lpns?.length || 0);
    const roofTotal = (roofData.skus?.length || 0) + (roofData.lpns?.length || 0);
    const hasPendingPallet = (standingTotal > 0 || roofTotal > 0);

    const totalPalletsCount = (activeContainer.pallets?.length || 0) + (hasPendingPallet ? 1 : 0);

    if (totalPalletsCount === 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Container chưa có Pallet',
        message: 'Container hiện tại chưa có Pallet nào được ghi nhận. Vui lòng quét ít nhất 1 Pallet trước khi hoàn thành!'
      });
      return;
    }

    // Xây dựng candidate pallets bao gồm cả pallet đang quét dở (nếu có)
    let candidatePallets = [...(activeContainer.pallets || [])];
    if (hasPendingPallet) {
      candidatePallets.push({
        palletIndex: currentPalletIndex,
        palletId: `PL-${(activeContainer.name || 'CONT').replace(/[^A-Za-z0-9_-]/g, '')}-P${String(currentPalletIndex).padStart(2, '0')}`,
        status: 'pass',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        standing: {
          skus: [...standingData.skus],
          lpns: [...standingData.lpns],
          standardSku: standingData.standardSku,
          standardLpn: standingData.standardLpn
        },
        roof: (roofData.skus?.length > 0 || roofData.lpns?.length > 0) ? {
          hasRoof: true,
          skus: [...roofData.skus],
          lpns: [...roofData.lpns],
          standardSku: roofData.standardSku,
          standardLpn: roofData.standardLpn
        } : {
          hasRoof: false,
          skus: [],
          lpns: [],
          standardSku: null,
          standardLpn: null
        },
        totalScans: standingData.totalScans + roofData.totalScans
      });
    }

    const validation = validateContainerRules(candidatePallets);

    const performCompleteContainer = (overrideNoRoof = false) => {
      let finalPallets = [...(activeContainer.pallets || [])];
      if (hasPendingPallet) {
        const isRoofSkipped = overrideNoRoof || (!roofData.skus?.length && !roofData.lpns?.length);
        const activeRoofData = isRoofSkipped ? {
          skus: [],
          lpns: [],
          standardSku: null,
          standardLpn: null,
          totalScans: 0
        } : roofData;

        finalPallets.push({
          palletIndex: currentPalletIndex,
          palletId: `PL-${(activeContainer.name || 'CONT').replace(/[^A-Za-z0-9_-]/g, '')}-P${String(currentPalletIndex).padStart(2, '0')}`,
          status: 'pass',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          standing: {
            skus: [...standingData.skus],
            lpns: [...standingData.lpns],
            standardSku: standingData.standardSku,
            standardLpn: standingData.standardLpn
          },
          roof: isRoofSkipped ? {
            hasRoof: false,
            skus: [],
            lpns: [],
            standardSku: null,
            standardLpn: null
          } : {
            hasRoof: true,
            skus: [...activeRoofData.skus],
            lpns: [...activeRoofData.lpns],
            standardSku: activeRoofData.standardSku,
            standardLpn: activeRoofData.standardLpn
          },
          totalScans: standingData.totalScans + (isRoofSkipped ? 0 : activeRoofData.totalScans)
        });
      }

      const finalAudit = validateContainerRules(finalPallets);
      const finalInspector = (activeContainer.inspector && activeContainer.inspector !== 'Nguyễn A')
        ? activeContainer.inspector
        : operatorName;

      const completedCont = {
        ...activeContainer,
        inspector: finalInspector,
        status: finalAudit.isValid ? 'completed' : 'warning',
        auditResult: finalAudit,
        completedAt: new Date().toLocaleString('vi-VN'),
        pallets: finalPallets
      };

      const updatedHistory = [completedCont, ...historyContainers];
      setHistoryContainers(updatedHistory);
      try {
        localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(updatedHistory));
        localStorage.removeItem('g7_pallet_v1_active_container');
      } catch (e) {
        console.warn('Lỗi lưu history containers:', e);
      }

      // ─── ĐỒNG BỘ TRỰC TIẾP VÀO CƠ SỞ DỮ LIỆU SQL SERVER ───
      try {
        apiClient.post('/pallet-check/containers', completedCont)
          .then(res => {
            console.log('✓ Đã lưu Container vào SQL Server Database:', res.data);
            fetchContainersFromDb();
          })
          .catch(err => {
            console.warn('⚠️ Lỗi gửi Container lên Database máy chủ (đã lưu an toàn trên máy):', err);
          });
      } catch (e) {
        console.warn('Exception khi gọi API lưu container:', e);
      }

      setActiveContainer(null);
      setStandingData({ skus: [], lpns: [], standardLpn: null, standardSku: null, isSaved: false, savedKey: null, totalScans: 0 });
      standingDataRef.current = { skus: [], lpns: [], standardLpn: null, standardSku: null, isSaved: false, savedKey: null, totalScans: 0 };
      setRoofData({ skus: [], lpns: [], standardLpn: null, standardSku: null, isSaved: false, savedKey: null, totalScans: 0 });
      roofDataRef.current = { skus: [], lpns: [], standardLpn: null, standardSku: null, isSaved: false, savedKey: null, totalScans: 0 };
      setPalletTab('standing');
      palletTabRef.current = 'standing';

      if (finalAudit.isValid) {
        playSuccessBeep();
        speakText(`Đã hoàn thành Container ${activeContainer.name}`);
      } else {
        playAlertSound(2);
        speakText(`Đã lưu Container ${activeContainer.name} nhưng có cảnh báo vi phạm`);
      }

      setActiveTab('history');
      setSelectedHistoryContainer(completedCont);

      setMessageModal({
        isOpen: true,
        type: finalAudit.isValid ? 'success' : 'warning',
        title: finalAudit.isValid ? 'HOÀN THÀNH CONTAINER' : 'ĐÃ ĐÓNG CONTAINER (CÓ CẢNH BÁO)',
        message: finalAudit.isValid
          ? `Container [${activeContainer.name}] gồm ${finalPallets.length} Pallet đạt chuẩn 100% đã được lưu vào Lịch Sử!`
          : `Container [${activeContainer.name}] đã lưu vào Lịch Sử nhưng còn vi phạm tiêu chuẩn (có pallet thiếu mã hoặc top nóc số lẻ)!`
      });
    };

    // ─── KIỂM ĐỊNH NẾU PHÁT HIỆN LỖI VI PHẠM CONTAINER ───
    if (!validation.isValid) {
      playAlertSound(3);
      speakText('Cảnh báo! Container chưa đạt tiêu chuẩn');

      const errorMessages = [];
      if (validation.oddTopLpnErrors.length > 0) {
        errorMessages.push('• LỖI KIỆN TOP NÓC SỐ LẺ (Bắt buộc là số chẵn 2, 4, 6... kiện):');
        validation.oddTopLpnErrors.forEach(e => {
          errorMessages.push(`  - Mã LPN [${e.lpnCode}]: có ${e.count} kiện (Số lẻ) trên Pallet #${e.palletIndices.join(', #')}`);
        });
      }
      if (validation.palletErrors.length > 0) {
        errorMessages.push('\n• LỖI PALLET THIẾU MÃ:');
        validation.palletErrors.forEach(e => {
          errorMessages.push(`  - Pallet #${e.palletIndex}: ${e.hasRoof ? 'Pallet 5 kiện' : 'Pallet 4 kiện'} (${e.details})`);
        });
      }

      setConfirmModal({
        isOpen: true,
        title: '⚠️ CONTAINER CHƯA ĐẠT TIÊU CHUẨN XUẤT HÀNG',
        message: `Container [${activeContainer.name}] phát hiện các lỗi vi phạm sau:\n\n${errorMessages.join('\n')}\n\nBạn có muốn quay lại để quét bổ sung cho đủ tiêu chuẩn không?`,
        confirmText: 'Vẫn hoàn thành (Bỏ qua lỗi)',
        cancelText: 'Quay lại quét tiếp',
        onConfirm: () => performCompleteContainer(false)
      });
      return;
    }

    // Nếu Container hợp lệ 100%:
    setConfirmModal({
      isOpen: true,
      title: 'Hoàn Thành Container?',
      message: `Xác nhận hoàn thành Container [${activeContainer.name}] với tổng cộng ${totalPalletsCount} Pallet? Container đã ĐẠT CHUẨN 100% và sẽ được chuyển vào mục Lịch Sử.`,
      confirmText: 'Hoàn thành Container',
      cancelText: 'Quay lại',
      onConfirm: () => performCompleteContainer(false)
    });
  };

  // In Phiếu Tổng Hợp Container
  const handlePrintContainerSummary = useCallback((container) => {
    if (!container) return;
    const pallets = container.pallets || [];
    const totalPallets = pallets.length;

    const palletRows = pallets.map(p => {
      const standingSkus = (p.standing?.skus || []).map(s => `${s.code} (x${s.count})`).join(', ') || '-';
      const standingLpns = (p.standing?.lpns || []).map(l => l.code).join(', ') || '-';
      const hasRoof = Boolean(p.roof?.hasRoof) || ((p.roof?.skus?.length || 0) > 0 || (p.roof?.lpns?.length || 0) > 0);
      const roofSkus = (p.roof?.skus || []).map(s => `${s.code} (x${s.count})`).join(', ') || 'Không có';
      const roofLpns = (p.roof?.lpns || []).map(l => l.code).join(', ') || 'Không có';
      return `
        <div style="border-bottom: 1px dashed #777; padding: 4px 0; font-size: 10px;">
          <div style="display:flex; justify-content:space-between; font-weight:800;">
            <span>PALLET #${p.palletIndex} (${p.palletId})</span>
            <span style="color:#15803d;">ĐẠT</span>
          </div>
          <div style="font-size:9.5px; color:#333; margin-top:2px;">
            <div>• Đứng: SKU: ${standingSkus} | LPN: ${standingLpns}</div>
            <div>• Nóc: ${hasRoof ? `SKU: ${roofSkus} | LPN: ${roofLpns}` : 'Không có Tủ Nóc (0 SKU • 0 LPN)'}</div>
          </div>
        </div>
      `;
    }).join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Container ${container.name}</title>
        <style>
          @page { size: 56mm auto; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { width: 56mm; margin: 0 auto; padding: 6px 4px; font-family: -apple-system, sans-serif; font-size: 11px; line-height: 1.3; }
          .tag-title { text-align: center; font-size: 15px; font-weight: 900; color: #7b5233; text-transform: uppercase; }
          .cont-name { text-align: center; font-size: 13px; font-weight: 800; color: #111; margin-bottom: 4px; }
          .dash-line { border-top: 1px dashed #666; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="tag-title">PHIẾU CONTAINER</div>
        <div class="cont-name">${container.name}</div>
        <div style="font-size:9.5px; color:#444; text-align:center;">Mã: ${container.id}</div>
        <div class="dash-line"></div>
        <div style="display:flex; justify-content:space-between; font-size:9.5px;">
          <span>Thời gian:</span><strong>${container.createdAt || ''}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:9.5px;">
          <span>Tổng Pallet:</span><strong>${totalPallets} Pallet</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:9.5px;">
          <span>Người kiểm:</span><strong>${container.inspector || operatorName}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:9.5px;">
          <span>Kiểm định:</span><strong style="color:${(container.auditResult?.isValid ?? true) ? '#15803d' : '#dc2626'};">${(container.auditResult?.isValid ?? true) ? '✓ ĐẠT TIÊU CHUẨN' : '⚠️ CÓ CẢNH BÁO'}</strong>
        </div>
        <div class="dash-line"></div>
        <div style="font-weight:800; font-size:10px; margin-bottom:3px;">DANH SÁCH PALLET:</div>
        ${palletRows}
        <div class="dash-line"></div>
        <div style="text-align:center; font-size:8.5px; color:#777; margin-top:4px;">G7 SmartFlow • Kiểm Tra Container</div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printHtml);
    doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      try { iframe.contentWindow.print(); } catch (e) {}
      setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1500);
    }, 250);
  }, []);

  // ─── THAO TÁC LƯU ĐỘC LẬP TỪNG TAB ───
  const handleSaveActiveTab = () => {
    const isStanding = palletTab === 'standing';
    const currentData = isStanding ? standingData : roofData;
    const tabTitle = isStanding ? 'Pallet đứng' : 'Top nóc';
    const prefix = isStanding ? 'PLD' : 'PLN';

    if (currentData.lpns.length === 0 && currentData.skus.length === 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Chưa có dữ liệu quét',
        message: `Tab [${tabTitle}] chưa có mã tem nhãn nào được ghi nhận. Vui lòng quét ít nhất 1 mã trước khi lưu!`
      });
      return;
    }

    const recordId = generateRecordId(prefix);
    const nowStr = new Date().toLocaleString('vi-VN');

    const newRecord = {
      id: recordId,
      tabType: palletTab,
      tabTitle: tabTitle,
      standardLpn: currentData.standardLpn,
      standardSku: currentData.standardSku,
      lpns: [...currentData.lpns],
      skus: [...currentData.skus],
      totalScans: currentData.totalScans,
      timestamp: nowStr,
      source: 'Máy ảnh',
      inspector: operatorName,
      status: 'pass'
    };

    // Lưu vào lịch sử
    setHistoryList(prev => [newRecord, ...prev]);

    // Reset form sau khi lưu để sẵn sàng quét lượt mới
    const emptyState = {
      lpns: [],
      skus: [],
      standardLpn: null,
      standardSku: null,
      isSaved: false,
      savedKey: null,
      totalScans: 0
    };

    if (isStanding) {
      setStandingData(emptyState);
    } else {
      setRoofData(emptyState);
    }

    // Xóa bộ đệm máy quét
    lastProcessedCodeRef.current = '';
    lastProcessedTimeRef.current = 0;
    scannerBufferRef.current = '';
    if (hiddenScannerInputRef.current) {
      hiddenScannerInputRef.current.value = '';
    }

    playSuccessBeep();
    // Mở popup thông báo thành công kèm nút in thẻ kiểm tra 56mm
    setSaveSuccessModal({
      isOpen: true,
      record: newRecord
    });
  };

  const handleResetActiveTab = () => {
    const tabTitle = palletTab === 'standing' ? 'Pallet đứng' : 'Top nóc';
    const currentData = palletTab === 'standing' ? standingData : roofData;
    if (currentData.lpns.length === 0 && currentData.skus.length === 0) {
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: `Hủy quét ${tabTitle}?`,
      message: `Toàn bộ dữ liệu LPN và SKU đã quét của [${tabTitle}] sẽ bị hủy. Dữ liệu của tab kia vẫn được giữ nguyên. Bạn có chắc chắn muốn hủy không?`,
      onConfirm: () => {
        if (palletTab === 'standing') {
          setStandingData({
            lpns: [],
            skus: [],
            standardLpn: null,
            standardSku: null,
            isSaved: false,
            savedKey: null,
            totalScans: 0
          });
        } else {
          setRoofData({
            lpns: [],
            skus: [],
            standardLpn: null,
            standardSku: null,
            isSaved: false,
            savedKey: null,
            totalScans: 0
          });
        }
      }
    });
  };

  const handleDeleteCodeItem = (type, itemId) => {
    const isStanding = palletTab === 'standing';
    const setTarget = isStanding ? setStandingData : setRoofData;
    const targetRef = isStanding ? standingDataRef : roofDataRef;

    setTarget(prev => {
      const listKey = type === 'LPN' ? 'lpns' : 'skus';
      const updatedList = (prev[listKey] || []).filter(it => it.id !== itemId);
      const nextState = {
        ...prev,
        [listKey]: updatedList,
        [type === 'LPN' ? 'standardLpn' : 'standardSku']: updatedList.length > 0 ? prev[type === 'LPN' ? 'standardLpn' : 'standardSku'] : null
      };
      targetRef.current = nextState;
      return nextState;
    });
  };

  const currentTabState = palletTab === 'standing' ? standingData : roofData;

  const standingTotalSkus = (standingData.skus || []).reduce((sum, s) => sum + (s.count || 1), 0);
  const standingSkuTypesCount = (standingData.skus || []).length;
  const standingTotalLpns = (standingData.lpns || []).reduce((sum, l) => sum + (l.count || 1), 0);
  const isStandingComplete = ((standingData.skus?.length || 0) === 8) && ((standingData.lpns?.length || 0) === 4);

  const roofTotalSkus = (roofData.skus || []).reduce((sum, s) => sum + (s.count || 1), 0);
  const roofTotalLpns = (roofData.lpns || []).reduce((sum, l) => sum + (l.count || 1), 0);
  const hasRoofData = roofTotalSkus > 0 || roofTotalLpns > 0;
  const isRoofComplete = ((roofData.skus?.length || 0) === 2) && ((roofData.lpns?.length || 0) === 1);

  // Xóa Container khỏi Database và State
  const handleDeleteContainer = (containerId, containerName) => {
    setConfirmModal({
      isOpen: true,
      title: 'XÓA CONTAINER?',
      message: `Bạn có chắc chắn muốn xóa Container [${containerName || containerId}] và toàn bộ Pallet liên quan khỏi Database không?`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/pallet-check/containers/${containerId}`);
        } catch (err) {
          console.warn('Lỗi khi xóa Container trên Database:', err);
        }
        setHistoryContainers(prev => {
          const next = prev.filter(c => c.id !== containerId);
          try {
            localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(next));
          } catch (_) {}
          return next;
        });
        if (selectedHistoryContainer?.id === containerId) {
          setSelectedHistoryContainer(null);
        }
        setMessageModal({
          isOpen: true,
          type: 'success',
          title: 'ĐÃ XÓA CONTAINER',
          message: `Container [${containerName || containerId}] đã được xóa khỏi hệ thống.`
        });
      }
    });
  };

  // Tiếp tục quét một Container đã lưu từ Lịch Sử
  const handleResumeContainer = (containerToResume) => {
    if (!containerToResume) return;

    const performResume = () => {
      // 1. Gán Container làm activeContainer
      setActiveContainer(containerToResume);
      try {
        localStorage.setItem('g7_pallet_v1_active_container', JSON.stringify(containerToResume));
      } catch (_) {}

      // 2. Làm sạch dữ liệu Pallet mới chuẩn bị quét (để đón Pallet tiếp theo N+1)
      const emptyPallet = { skus: [], lpns: [], standardLpn: null, standardSku: null, isSaved: false, savedKey: null, totalScans: 0 };
      setStandingData(emptyPallet);
      standingDataRef.current = emptyPallet;
      setRoofData(emptyPallet);
      roofDataRef.current = emptyPallet;
      setPalletTab('standing');
      palletTabRef.current = 'standing';

      // 3. Đóng popup chi tiết và chuyển tab sang quét mới
      setSelectedHistoryContainer(null);
      setActiveTab('scan');

      const nextPalletNum = (containerToResume.pallets?.length || 0) + 1;
      playSuccessBeep();
      speakText(`Tiếp tục quét Container ${containerToResume.name}, bắt đầu Pallet số ${nextPalletNum}`);

      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'TIẾP TỤC QUÉT CONTAINER',
        message: `Đã mở lại Container [${containerToResume.name}].\nHiện có ${containerToResume.pallets?.length || 0} Pallet đã lưu trong hệ thống.\nBạn đang ở Pallet #${nextPalletNum} sẵn sàng quét mã!`
      });
    };

    // Nếu đang có một Container khác đang quét dở và có dữ liệu
    const standingTotal = (standingData.skus?.length || 0) + (standingData.lpns?.length || 0);
    const roofTotal = (roofData.skus?.length || 0) + (roofData.lpns?.length || 0);
    const isDifferentCont = activeContainer && activeContainer.id !== containerToResume.id;

    if (isDifferentCont && (standingTotal > 0 || roofTotal > 0 || (activeContainer.pallets?.length || 0) > 0)) {
      setConfirmModal({
        isOpen: true,
        title: 'ĐỔI CONTAINER ĐANG QUÉT?',
        message: `Bạn đang có Container [${activeContainer.name}] chưa đóng hoàn tất. Bạn có chắc chắn muốn chuyển sang tiếp tục quét Container [${containerToResume.name}] không?`,
        confirmText: 'Chuyển sang Cont này',
        cancelText: 'Hủy / Giữ nguyên',
        onConfirm: performResume
      });
      return;
    }

    performResume();
  };

  // ═════════════════════════════════════════════════════════════════════════
  // CÁC HÀM XỬ LÝ CHỈNH SỬA DÀNH CHO ADMIN TRONG TAB LỊCH SỬ
  // ═════════════════════════════════════════════════════════════════════════

  // Mở modal sửa thông tin chung của Container
  const handleOpenEditHistoryContainerModal = (cont) => {
    setEditHistoryContName(cont.name || '');
    setEditHistoryContInspector((cont.inspector && cont.inspector !== 'Nguyễn A') ? cont.inspector : operatorName);
    setEditHistoryContStatus(cont.status || 'completed');
    setIsEditHistoryContainerModalOpen(true);
  };

  // Lưu thông tin Container đã sửa
  const handleSaveHistoryContainerInfo = async () => {
    if (!editHistoryContName || !editHistoryContName.trim()) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'TÊN KHÔNG HỢP LỆ',
        message: 'Vui lòng nhập tên Container.'
      });
      return;
    }

    const updatedContainer = {
      ...selectedHistoryContainer,
      name: editHistoryContName.trim(),
      inspector: editHistoryContInspector.trim() || operatorName,
      status: editHistoryContStatus,
      updatedAt: new Date().toLocaleString('vi-VN')
    };

    setSelectedHistoryContainer(updatedContainer);
    setHistoryContainers(prev => {
      const next = prev.map(c => c.id === updatedContainer.id ? updatedContainer : c);
      try {
        localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    setIsEditHistoryContainerModalOpen(false);

    try {
      await apiClient.put(`/pallet-check/containers/${updatedContainer.id}`, updatedContainer);
      console.log(`✓ Đã cập nhật Container [${updatedContainer.name}] lên SQL Server`);
    } catch (err) {
      console.warn('Lỗi khi đồng bộ cập nhật Container lên SQL Server (đã lưu an toàn trên máy):', err);
    }

    playSuccessBeep();
    setMessageModal({
      isOpen: true,
      type: 'success',
      title: 'ĐÃ CẬP NHẬT CONTAINER',
      message: `Đã cập nhật thông tin Container [${updatedContainer.name}] thành công.`
    });
  };

  // Mở modal chỉnh sửa chi tiết Pallet (SKU & LPN)
  const handleOpenEditPalletModal = (pallet, pIdx) => {
    setEditingPalletIndex(pIdx);
    setEditingPalletActiveTab('standing');

    const stSkus = (pallet.standing?.skus || []).map(s => ({
      id: s.id || Math.random().toString(36).substr(2, 9),
      code: s.code || '',
      count: s.count || 1
    }));
    const stLpns = (pallet.standing?.lpns || []).map(l => ({
      id: l.id || Math.random().toString(36).substr(2, 9),
      code: l.code || '',
      count: l.count || 1
    }));
    const rfSkus = (pallet.roof?.skus || []).map(s => ({
      id: s.id || Math.random().toString(36).substr(2, 9),
      code: s.code || '',
      count: s.count || 1
    }));
    const rfLpns = (pallet.roof?.lpns || []).map(l => ({
      id: l.id || Math.random().toString(36).substr(2, 9),
      code: l.code || '',
      count: l.count || 1
    }));

    const hasRoof = Boolean(pallet.roof?.hasRoof) || (rfSkus.length > 0 || rfLpns.length > 0);

    setEditingPalletData({
      palletIndex: pallet.palletIndex,
      palletId: pallet.palletId,
      status: pallet.status || 'pass',
      timestamp: pallet.timestamp || new Date().toLocaleTimeString('vi-VN'),
      standing: {
        standardSku: pallet.standing?.standardSku || stSkus[0]?.code || '',
        standardLpn: pallet.standing?.standardLpn || stLpns[0]?.code || '',
        skus: stSkus,
        lpns: stLpns
      },
      roof: {
        hasRoof,
        standardSku: pallet.roof?.standardSku || rfSkus[0]?.code || '',
        standardLpn: pallet.roof?.standardLpn || rfLpns[0]?.code || '',
        skus: rfSkus,
        lpns: rfLpns
      }
    });

    setIsEditPalletModalOpen(true);
  };

  // Lưu Pallet sau khi Admin chỉnh sửa (TỰ ĐỘNG TÁI THẨM ĐỊNH LỖI)
  const handleSaveEditedPallet = async () => {
    if (!editingPalletData || editingPalletIndex === null || !selectedHistoryContainer) return;

    // Chuẩn hóa dữ liệu SKU và LPN đứng
    const cleanStandingSkus = (editingPalletData.standing?.skus || [])
      .filter(s => s && s.code && s.code.trim())
      .map(s => ({ ...s, code: s.code.trim(), count: Number(s.count) || 1 }));

    const cleanStandingLpns = (editingPalletData.standing?.lpns || [])
      .filter(l => l && l.code && l.code.trim())
      .map(l => ({ ...l, code: l.code.trim(), count: Number(l.count) || 1 }));

    const hasRoof = Boolean(editingPalletData.roof?.hasRoof);
    let cleanRoofSkus = [];
    let cleanRoofLpns = [];
    let roofStdSku = null;
    let roofStdLpn = null;

    if (hasRoof) {
      cleanRoofSkus = (editingPalletData.roof?.skus || [])
        .filter(s => s && s.code && s.code.trim())
        .map(s => ({ ...s, code: s.code.trim(), count: Number(s.count) || 1 }));

      cleanRoofLpns = (editingPalletData.roof?.lpns || [])
        .filter(l => l && l.code && l.code.trim())
        .map(l => ({ ...l, code: l.code.trim(), count: Number(l.count) || 1 }));

      roofStdSku = cleanRoofSkus[0]?.code || editingPalletData.roof?.standardSku || null;
      roofStdLpn = cleanRoofLpns[0]?.code || editingPalletData.roof?.standardLpn || null;
    }

    const updatedPallet = {
      ...((selectedHistoryContainer.pallets || [])[editingPalletIndex] || {}),
      palletIndex: editingPalletData.palletIndex,
      palletId: editingPalletData.palletId || `PL-${selectedHistoryContainer.id}-P${String(editingPalletData.palletIndex).padStart(2, '0')}`,
      status: editingPalletData.status || 'pass',
      timestamp: editingPalletData.timestamp || new Date().toLocaleTimeString('vi-VN'),
      totalScans: cleanStandingSkus.length + cleanStandingLpns.length + cleanRoofSkus.length + cleanRoofLpns.length,
      standing: {
        standardSku: cleanStandingSkus[0]?.code || editingPalletData.standing?.standardSku || null,
        standardLpn: cleanStandingLpns[0]?.code || editingPalletData.standing?.standardLpn || null,
        skus: cleanStandingSkus,
        lpns: cleanStandingLpns
      },
      roof: {
        hasRoof,
        standardSku: roofStdSku,
        standardLpn: roofStdLpn,
        skus: cleanRoofSkus,
        lpns: cleanRoofLpns
      }
    };

    const isNewPallet = editingPalletIndex >= (selectedHistoryContainer.pallets || []).length;
    const newPallets = [...(selectedHistoryContainer.pallets || [])];
    if (isNewPallet) {
      newPallets.push(updatedPallet);
    } else {
      newPallets[editingPalletIndex] = updatedPallet;
    }

    // TÁI THẨM ĐỊNH TOÀN BỘ CONTAINER (LIVE RE-VALIDATION)
    const updatedAudit = validateContainerRules(newPallets);

    let newTotalScans = 0;
    let newTotalBoxes = 0;
    newPallets.forEach(p => {
      newTotalScans += (p.totalScans || 0);
      const stCount = (p.standing?.skus || []).length;
      const rfCount = (p.roof?.skus || []).length;
      newTotalBoxes += Math.round((stCount + rfCount) / 2) || (p.standing?.lpns?.length + p.roof?.lpns?.length) || 5;
    });

    const updatedContainer = {
      ...selectedHistoryContainer,
      pallets: newPallets,
      totalPallets: newPallets.length,
      totalBoxes: newTotalBoxes,
      totalScans: newTotalScans,
      auditResult: updatedAudit,
      isValid: updatedAudit.isValid,
      status: updatedAudit.isValid ? 'completed' : 'warning',
      updatedAt: new Date().toLocaleString('vi-VN')
    };

    setSelectedHistoryContainer(updatedContainer);
    setHistoryContainers(prev => {
      const next = prev.map(c => c.id === updatedContainer.id ? updatedContainer : c);
      try {
        localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    setIsEditPalletModalOpen(false);
    setEditingPalletData(null);
    setEditingPalletIndex(null);

    // Gửi API cập nhật lên SQL Server
    try {
      await apiClient.put(`/pallet-check/containers/${updatedContainer.id}`, updatedContainer);
      console.log(`✓ Đã cập nhật Pallet #${updatedPallet.palletIndex} lên SQL Server`);
    } catch (err) {
      console.warn('Lỗi khi đồng bộ Pallet cập nhật lên SQL Server (đã lưu an toàn trên máy):', err);
    }

    playSuccessBeep();
    setMessageModal({
      isOpen: true,
      type: updatedAudit.isValid ? 'success' : 'warning',
      title: updatedAudit.isValid ? 'CẬP NHẬT THÀNH CÔNG (100% ĐẠT CHUẨN)' : 'ĐÃ CẬP NHẬT PALLET',
      message: updatedAudit.isValid
        ? `Pallet #${updatedPallet.palletIndex} đã được lưu. Container [${updatedContainer.name}] hiện đã ĐẠT 100% TIÊU CHUẨN XUẤT KHẨU!`
        : `Pallet #${updatedPallet.palletIndex} đã được cập nhật. Container vẫn còn điểm chưa hợp lệ, bạn có thể kiểm tra tiếp các Pallet khác.`
    });
  };

  // Xóa một Pallet khỏi Container
  const handleDeletePalletFromHistoryContainer = (palletIdxToDelete) => {
    const targetPallet = (selectedHistoryContainer?.pallets || [])[palletIdxToDelete];
    if (!targetPallet) return;

    setConfirmModal({
      isOpen: true,
      title: `XÓA PALLET #${targetPallet.palletIndex}?`,
      message: `Bạn có chắc chắn muốn xóa Pallet #${targetPallet.palletIndex} khỏi Container [${selectedHistoryContainer.name}] không? Số thứ tự các Pallet còn lại sẽ được tự động đánh lại.`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        const remaining = (selectedHistoryContainer.pallets || [])
          .filter((_, idx) => idx !== palletIdxToDelete)
          .map((p, idx) => ({
            ...p,
            palletIndex: idx + 1
          }));

        const updatedAudit = validateContainerRules(remaining);
        let newTotalScans = 0;
        let newTotalBoxes = 0;
        remaining.forEach(p => {
          newTotalScans += (p.totalScans || 0);
          const stCount = (p.standing?.skus || []).length;
          const rfCount = (p.roof?.skus || []).length;
          newTotalBoxes += Math.round((stCount + rfCount) / 2) || (p.standing?.lpns?.length + p.roof?.lpns?.length) || 5;
        });

        const updatedContainer = {
          ...selectedHistoryContainer,
          pallets: remaining,
          totalPallets: remaining.length,
          totalBoxes: newTotalBoxes,
          totalScans: newTotalScans,
          auditResult: updatedAudit,
          isValid: updatedAudit.isValid,
          status: updatedAudit.isValid ? 'completed' : 'warning',
          updatedAt: new Date().toLocaleString('vi-VN')
        };

        setSelectedHistoryContainer(updatedContainer);
        setHistoryContainers(prev => {
          const next = prev.map(c => c.id === updatedContainer.id ? updatedContainer : c);
          try {
            localStorage.setItem('g7_pallet_v1_containers', JSON.stringify(next));
          } catch (_) {}
          return next;
        });

        try {
          await apiClient.put(`/pallet-check/containers/${updatedContainer.id}`, updatedContainer);
        } catch (err) {
          console.warn('Lỗi khi đồng bộ xóa Pallet lên SQL Server:', err);
        }

        playSuccessBeep();
        setMessageModal({
          isOpen: true,
          type: 'success',
          title: 'ĐÃ XÓA PALLET',
          message: `Đã xóa Pallet và đánh lại thứ tự ${remaining.length} Pallet cho Container.`
        });
      }
    });
  };

  // Thêm Pallet mới vào Container
  const handleAddNewPalletToHistoryContainer = () => {
    const currentPallets = selectedHistoryContainer?.pallets || [];
    const nextIndex = currentPallets.length + 1;
    const newPalletId = `PL-${(selectedHistoryContainer.name || 'CONT').replace(/[^A-Za-z0-9_-]/g, '')}-P${String(nextIndex).padStart(2, '0')}`;

    setEditingPalletIndex(currentPallets.length);
    setEditingPalletActiveTab('standing');
    setEditingPalletData({
      palletIndex: nextIndex,
      palletId: newPalletId,
      status: 'pass',
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      standing: {
        standardSku: '',
        standardLpn: '',
        skus: [],
        lpns: []
      },
      roof: {
        hasRoof: false,
        standardSku: '',
        standardLpn: '',
        skus: [],
        lpns: []
      }
    });
    setIsEditPalletModalOpen(true);
  };

  return (
    <Layout>
      <PageHeader
        title="G7 - Smart Flow"
        subTitle="MB30 | Kiểm Tra Pallet v1"
      />

      <div style={{
        backgroundColor: '#f8f5ee',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        minHeight: 0,
        padding: '12px 12px 90px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%'
      }}>

        {/* ─── TAB CHUYỂN ĐỔI: KIỂM TRA MỚI / LỊCH SỬ ─── */}
        <div style={{
          display: 'flex',
          gap: '6px',
          backgroundColor: '#eae3d2',
          padding: '4px',
          borderRadius: '12px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'scan' ? '#ffffff' : 'transparent',
              color: activeTab === 'scan' ? '#4b301e' : '#7c6d5e',
              boxShadow: activeTab === 'scan' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <ScanLine size={15} />
            <span>Kiểm Tra Mới</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#4b301e' : '#7c6d5e',
              boxShadow: activeTab === 'history' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <History size={15} />
            <span>Lịch Sử ({historyContainers.length})</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MÀN HÌNH 1: KIỂM TRA MỚI (SCAN)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'scan' && (
          <>
            {/* ─── THANH THÔNG TIN CONTAINER & ĐIỀU HƯỚNG PALLET ─── */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '12px 14px',
              border: '1.5px solid #eadcc9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#7b5233',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Boxes size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '900', color: '#3a2113' }}>
                        {activeContainer?.name || 'Chưa đặt tên Container'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditContainerNameInput(activeContainer?.name || '');
                          setIsEditContainerModalOpen(true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#7b5233',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Đổi tên Container"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#786556' }}>
                      Mã: {activeContainer?.id || 'CONT-NEW'} • Đã đóng: <strong>{activeContainer?.pallets?.length || 0}</strong> Pallet
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleFinishContainer}
                    style={{
                      border: 'none',
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)'
                    }}
                    title="Hoàn thành và chốt toàn bộ Container này"
                  >
                    <CheckCheck size={13} />
                    <span>Hoàn thành Cont</span>
                  </button>
                </div>
              </div>

              {/* Thanh hiển thị tiến độ Pallet hiện tại */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#faf7f2',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #ede3d6',
                fontSize: '11px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '5px',
                    backgroundColor: '#7b5233',
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: '11px',
                    letterSpacing: '0.3px'
                  }}>
                    PALLET #{currentPalletIndex}
                  </span>
                  <span style={{ fontWeight: '700', color: '#5c3a21' }}>
                    (Đang quét)
                  </span>
                </div>

                <div style={{ color: '#786556', fontSize: '11px' }}>
                  Đứng: <strong>{(standingData.skus || []).reduce((sum, s) => sum + (s.count || 1), 0)} SKU</strong> • Nóc: <strong>{(roofData.skus || []).reduce((sum, s) => sum + (s.count || 1), 0)} SKU</strong>
                </div>
              </div>
            </div>

            {/* ─── CARD 1: THÔNG TIN MÁY QUÉT SA 8972 ─── */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #e8e1d5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  color: '#4e3629',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Barcode size={16} color="#7b5233" />
                  <span>MÁY QUÉT SA 8972 • TTS v1.5.8</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    border: 'none',
                    background: soundEnabled ? '#e8f5e9' : '#ffebee',
                    color: soundEnabled ? '#2e7d32' : '#c62828',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title={soundEnabled ? 'Đang bật âm thanh cảnh báo' : 'Đã tắt âm thanh cảnh báo'}
                >
                  {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  <span>{soundEnabled ? 'Còi & Giọng: BẬT' : 'Còi & Giọng: TẮT'}</span>
                </button>
              </div>

              {/* Input ngầm nhận tia quét tự động (máy POS / súng quét) */}
              <input
                ref={hiddenScannerInputRef}
                type="password"
                inputMode="none"
                autoComplete="new-password"
                tabIndex={-1}
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  pointerEvents: 'none',
                  zIndex: -1
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.keyCode === 13 || e.key === 'Tab' || e.keyCode === 9) {
                    e.preventDefault();
                    const val = (e.target.value || scannerBufferRef.current).trim();
                    e.target.value = '';
                    scannerBufferRef.current = '';
                    lastKeyTimeRef.current = 0;
                    setTimeout(() => {
                      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
                    }, 40);
                    if (val && val.length >= 2) {
                      executeScannedCode(val);
                    }
                  }
                }}
                onInput={(e) => {
                  const val = e.target.value;
                  if (val && (val.includes('\n') || val.includes('\r'))) {
                    const clean = val.replace(/[\r\n]/g, '').trim();
                    e.target.value = '';
                    scannerBufferRef.current = '';
                    lastKeyTimeRef.current = 0;
                    setTimeout(() => {
                      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
                    }, 40);
                    if (clean && clean.length >= 2) {
                      executeScannedCode(clean);
                    }
                  }
                }}
              />

              {/* ── BẢNG ĐIỀU KHIỂN & HUD MÁY QUÉT MÃ CODE SA 8972 (CHUYÊN BIỆT CHO SÚNG BẮN MÃ) ── */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#faf7f2',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #eadcc9'
              }}>
                <style>{`
                  @keyframes saPulseGlow {
                    0% { transform: scale(0.92); opacity: 0.8; box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
                    70% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
                    100% { transform: scale(0.92); opacity: 0.8; box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
                  }
                `}</style>

                {/* Header trạng thái máy quét SA 8972 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#16a34a',
                      animation: 'saPulseGlow 1.8s infinite ease-in-out'
                    }} />
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#15803d',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      MÁY QUÉT SA 8972: SẴN SÀNG NHẬN MÃ
                    </span>
                  </div>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#ede7de',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#634735'
                  }}>
                    <Zap size={11} color="#7b5233" />
                    <span>Tự động nhận Enter</span>
                  </div>
                </div>

                {/* Thẻ hiển thị kết quả quét gần nhất (Live Scanned Display Card) */}
                <div style={{
                  backgroundColor: lastScannedDetail 
                    ? (lastScannedDetail.status === 'success' ? '#f0fdf4' : '#fef2f2') 
                    : '#ffffff',
                  border: lastScannedDetail 
                    ? (lastScannedDetail.status === 'success' ? '1.5px solid #86efac' : '1.5px solid #fca5a5') 
                    : '1.5px dashed #d5c7b7',
                  borderRadius: '9px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: lastScannedDetail ? '0 3px 10px rgba(0,0,0,0.04)' : 'none'
                }}>
                  {lastScannedDetail ? (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        paddingBottom: '5px'
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: '800',
                          color: lastScannedDetail.status === 'success' ? '#15803d' : '#b91c1c'
                        }}>
                          {lastScannedDetail.status === 'success' ? (
                            <CheckCircle2 size={13} color="#15803d" />
                          ) : (
                            <XCircle size={13} color="#b91c1c" />
                          )}
                          {lastScannedDetail.title}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            color: '#64748b',
                            fontWeight: '600'
                          }}>
                            <Clock size={11} />
                            {lastScannedDetail.time}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLastScannedDetail(null)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Xóa hiển thị mã này"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Mã lớn nổi bật */}
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '18px',
                        fontWeight: '900',
                        color: '#1e293b',
                        letterSpacing: '0.8px',
                        padding: '3px 0'
                      }}>
                        {lastScannedDetail.code}
                      </div>

                      {/* Phân loại & số lần quét */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                        fontSize: '11px',
                        color: '#475569'
                      }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: lastScannedDetail.status === 'success' ? '#dcfce7' : '#fee2e2',
                          color: lastScannedDetail.status === 'success' ? '#166534' : '#991b1b',
                          fontWeight: '700',
                          fontSize: '10px'
                        }}>
                          {lastScannedDetail.category === 'SKU' ? 'MÃ SẢN PHẨM' : lastScannedDetail.category === 'LPN' ? 'MÃ VẬN CHUYỂN' : 'TEM PALLET'}
                        </span>
                        {lastScannedDetail.count && (
                          <span style={{ fontWeight: '700', color: '#7b5233' }}>
                            • Đã ghi nhận: {lastScannedDetail.count} lần
                          </span>
                        )}
                        {lastScannedDetail.standardCode && (
                          <span style={{ color: '#b91c1c', fontWeight: '600' }}>
                            (Mã chuẩn: {lastScannedDetail.standardCode})
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 0',
                      color: '#8c786a',
                      textAlign: 'center'
                    }}>
                      <ScanLine size={28} color="#7b5233" strokeWidth={1.8} />
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#4a240e' }}>
                        Sẵn sàng quét mã từ súng SA 8972
                      </span>
                      <span style={{ fontSize: '11px', color: '#8c786a', maxWidth: '280px' }}>
                        Chĩa máy quét SA 8972 vào tem thùng/pallet và bấm cò. Mã sẽ được xử lý tức thì.
                      </span>
                    </div>
                  )}
                </div>
              </div>

                {/* Ô NHẬP MÃ THỦ CÔNG: Chỉ mở bàn phím ảo khi người dùng chủ động chạm vào ô text này */}
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center',
                  backgroundColor: '#faf8f5',
                  padding: '6px 8px',
                  borderRadius: '10px',
                  border: '1px solid #eadcc9'
                }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      ref={scanInputRef}
                      type="text"
                      value={scanInputText}
                      onChange={(e) => setScanInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const clean = scanInputText.trim();
                          if (clean) {
                            executeScannedCode(clean);
                            setScanInputText('');
                          }
                        }
                      }}
                      placeholder="Chạm vào đây để nhập mã thủ công..."
                      style={{
                        width: '100%',
                        padding: '8px 28px 8px 10px',
                        borderRadius: '7px',
                        border: '1px solid #d5c7b7',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#2d1810',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {scanInputText && (
                      <button
                        type="button"
                        onClick={() => setScanInputText('')}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const clean = scanInputText.trim();
                      if (clean) {
                        executeScannedCode(clean);
                        setScanInputText('');
                      }
                    }}
                    style={{
                      backgroundColor: '#7b5233',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '8px 12px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Nhận mã
                  </button>
                </div>
            </div>

            {/* ─── CARD 2: HAI TAB [PALLET ĐỨNG] & [TOP NÓC] VÀ DỮ LIỆU ĐỌC ─── */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1px solid #EADCC9',
              boxShadow: '0 3px 12px rgba(123, 82, 51, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* THANH CHUYỂN ĐỔI 2 TAB: 1. PALLET ĐỨNG | 2. TOP NÓC (Chuẩn giao diện như hình tham chiếu) */}
              <div style={{
                display: 'flex',
                backgroundColor: '#FAF5EE',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #EADCC9',
                gap: '4px'
              }}>
                {/* TAB 1: PALLET ĐỨNG */}
                <button
                  type="button"
                  onClick={() => {
                    setPalletTab('standing');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    backgroundColor: palletTab === 'standing' ? '#ffffff' : 'transparent',
                    color: palletTab === 'standing' ? '#4b301e' : '#7c6d5e',
                    boxShadow: palletTab === 'standing' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Package size={15} color={palletTab === 'standing' ? '#4b301e' : '#7c6d5e'} />
                  <span>Pallet đứng</span>
                  {standingData.isSaved && (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      ✓ ĐÃ LƯU (ĐẠT)
                    </span>
                  )}
                </button>

                {/* TAB 2: TOP NÓC */}
                <button
                  type="button"
                  onClick={() => {
                    setPalletTab('roof');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    backgroundColor: palletTab === 'roof' ? '#ffffff' : 'transparent',
                    color: palletTab === 'roof' ? '#4b301e' : '#7c6d5e',
                    boxShadow: palletTab === 'roof' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Layers size={15} color={palletTab === 'roof' ? '#4b301e' : '#7c6d5e'} />
                  <span>Top nóc</span>
                  {roofData.skus.length === 0 && roofData.lpns.length === 0 ? (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      Không có (0 SKU • 0 LPN)
                    </span>
                  ) : (roofData.skus.length === 1 && (roofData.skus[0]?.count || 1) === 2 && roofData.lpns.length === 1) ? (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      ✓ Đạt (1 SKU x2 • 1 LPN)
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      ⚠️ {roofData.skus.length === 1 ? `${roofData.skus[0]?.count || 1}/2 cái` : `${roofData.skus.length}/1 SKU`} • {roofData.lpns.length}/1 LPN
                    </span>
                  )}
                </button>
              </div>

              {/* ─── BẢNG CHIA 2 BÊN: ĐỒNG BỘ 100% GIAO DIỆN KIỂM TRA PALLET (AI) ─── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                {/* CỘT 1: MÃ LPN (Chuẩn phong cách G7 Mobile AI) */}
                <div style={{
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  backgroundColor: '#FAF8F5',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0
                }}>
                  <div style={{
                    padding: '5px 8px',
                    backgroundColor: '#FAF8F5',
                    borderBottom: '1px solid #EADCC9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#4E3629', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      MÃ LPN {palletTab === 'roof' ? <span style={{ fontSize: '0.64rem', color: '#b45309', fontWeight: '900' }}>(1 MÃ x1)</span> : <span style={{ fontSize: '0.64rem', color: '#b45309', fontWeight: '900' }}>(1 MÃ x4)</span>}
                    </span>
                    <span style={{ fontSize: '0.67rem', color: '#7B5233', fontWeight: '700', backgroundColor: '#F4ECE1', padding: '1px 5px', borderRadius: '3px' }}>
                      {palletTab === 'roof' ? `${roofData.lpns?.length || 0}/1 LPN` : `${standingData.lpns?.length || 0}/4 LPN`}
                    </span>
                  </div>

                  <div style={{ padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                    {currentTabState.lpns.length === 0 ? (
                      <div style={{ padding: '16px 6px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        Chưa có mã LPN
                      </div>
                    ) : (
                      currentTabState.lpns.map((itemLpn, idx) => (
                        <div
                          key={itemLpn.id || idx}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #EADCC9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden', flex: 1 }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              backgroundColor: '#7B5233',
                              color: '#FFFFFF',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              flexShrink: 0
                            }}>
                              #{idx + 1}
                            </span>
                            <span style={{
                              fontFamily: 'Consolas, monospace',
                              fontSize: '0.80rem',
                              fontWeight: '800',
                              color: '#1F2937',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {itemLpn.code}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteCodeItem('LPN', itemLpn.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#9ca3af',
                                padding: '1px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Xóa lần quét này"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CỘT 2: MÃ SKU (Chuẩn phong cách G7 Mobile AI) */}
                <div style={{
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  backgroundColor: '#FAF8F5',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0
                }}>
                  <div style={{
                    padding: '5px 8px',
                    backgroundColor: '#FAF8F5',
                    borderBottom: '1px solid #EADCC9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#4E3629', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      MÃ SKU {palletTab === 'roof' ? <span style={{ fontSize: '0.64rem', color: '#b45309', fontWeight: '900' }}>(1 MÃ x2)</span> : <span style={{ fontSize: '0.64rem', color: '#b45309', fontWeight: '900' }}>(1 MÃ x8)</span>}
                    </span>
                    <span style={{ fontSize: '0.67rem', color: '#7B5233', fontWeight: '700', backgroundColor: '#F4ECE1', padding: '1px 5px', borderRadius: '3px' }}>
                      {palletTab === 'roof' ? `${roofData.skus?.length || 0}/2 cái` : `${standingData.skus?.length || 0}/8 cái`}
                    </span>
                  </div>

                  <div style={{ padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                    {currentTabState.skus.length === 0 ? (
                      <div style={{ padding: '16px 6px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        Chưa có mã SKU
                      </div>
                    ) : (
                      currentTabState.skus.map((itemSku, idx) => (
                        <div
                          key={itemSku.id || idx}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #EADCC9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden', flex: 1 }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              backgroundColor: '#7B5233',
                              color: '#FFFFFF',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              flexShrink: 0
                            }}>
                              #{idx + 1}
                            </span>
                            <span style={{
                              fontFamily: 'Consolas, monospace',
                              fontSize: '0.80rem',
                              fontWeight: '800',
                              color: '#1F2937',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {formatCabinetSeriesTag(itemSku.code) || itemSku.code}
                            </span>
                            {formatCabinetSeriesTag(itemSku.code) !== itemSku.code && (
                              <span style={{
                                fontSize: '0.65rem',
                                color: '#6B7280',
                                fontFamily: 'Consolas, monospace',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                ({itemSku.code})
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteCodeItem('SKU', itemSku.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#9ca3af',
                                padding: '1px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Xóa lần quét này"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* THANH THAO TÁC & TRẠNG THÁI TOP NÓC KHI ĐANG XEM TAB TOP NÓC */}
              {palletTab === 'roof' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px 10px',
                  backgroundColor: '#fef7ee',
                  borderRadius: '9px',
                  border: '1px solid #eadcc9',
                  marginTop: '2px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '11px', color: '#7b5233', fontWeight: '800' }}>
                      QUY CHUẨN TOP NÓC:
                    </span>
                    {(roofData.skus.length > 0 || roofData.lpns.length > 0) && (
                      <button
                        type="button"
                        onClick={handleClearRoofData}
                        style={{
                          border: '1px solid #fca5a5',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Trash2 size={11} />
                        <span>Xóa Top Nóc (Không có nóc)</span>
                      </button>
                    )}
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: '#634735',
                    lineHeight: '1.4'
                  }}>
                    {roofData.skus.length === 0 && roofData.lpns.length === 0 ? (
                      <span style={{ color: '#64748b' }}>
                        • Pallet này hiện <strong>không có Tủ Nóc</strong> (0 SKU • 0 LPN). Cả SKU và LPN đều không có là hoàn toàn hợp lệ, bạn có thể bấm <strong>"Pallet Tiếp Theo"</strong> luôn.
                      </span>
                    ) : (roofData.skus.length === 1 && (roofData.skus[0]?.count || 1) === 2 && roofData.lpns.length === 1) ? (
                      <span style={{ color: '#15803d', fontWeight: '700' }}>
                        ✓ Top Nóc ĐẠT CHUẨN: Đã đủ 1 mã SKU ({roofData.skus[0]?.code} x2 cái) và 1 LPN ({roofData.lpns[0]?.code}).
                      </span>
                    ) : (
                      <span style={{ color: '#b45309', fontWeight: '700' }}>
                        ⚠️ Đang quét dở: Cần đúng <strong>1 mã SKU (số lượng x2 cái)</strong> và <strong>1 mã LPN</strong> (Hiện có: {roofData.skus.length === 1 ? `${roofData.skus[0]?.count || 1}/2 cái` : `${roofData.skus.length}/1 SKU`}, {roofData.lpns.length}/1 LPN).
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

          </>
        )}

        {/* ─── THANH THAO TÁC CỐ ĐỊNH Ở DƯỚI CÙNG (FIXED BOTTOM BAR) ─── */}
        {activeTab === 'scan' && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '450px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #EADCC9',
            padding: '10px 14px',
            display: 'flex',
            gap: '10px',
            boxShadow: '0 -4px 16px rgba(75, 48, 30, 0.08)',
            zIndex: 990,
            boxSizing: 'border-box'
          }}>
            {/* Nút HỦY dữ liệu Pallet hiện tại */}
            <button
              type="button"
              onClick={handleResetActiveTab}
              disabled={(standingData.skus?.length === 0 && standingData.lpns?.length === 0) && (roofData.skus?.length === 0 && roofData.lpns?.length === 0)}
              style={{
                width: '46px',
                height: '46px',
                backgroundColor: '#FAF5EE',
                color: '#5C3A21',
                border: '1.5px solid #D5C7B7',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                flexShrink: 0
              }}
              title="Hủy dữ liệu quét của Pallet này"
            >
              <RotateCcw size={17} color="#7B5233" />
            </button>

            {/* Nút PALLET TIẾP THEO (NEXT PALLET) */}
            <button
              type="button"
              onClick={handleNextPallet}
              style={{
                flex: 1,
                height: '46px',
                background: 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0 16px',
                fontSize: '0.92rem',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(75, 48, 30, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Pallet Tiếp Theo #{currentPalletIndex + 1}</span>
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MÀN HÌNH 2: LỊCH SỬ CONTAINER & PALLET (3-TIER HIERARCHY)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: '#4a240e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Boxes size={16} color="#7b5233" />
                <span>Lịch sử Container ({historyContainers.length})</span>
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: '800',
                  color: '#15803d',
                  backgroundColor: '#dcfce7',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Database size={10} />
                  SQL Server
                </span>
              </span>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={fetchContainersFromDb}
                  disabled={isLoadingDb}
                  style={{
                    border: '1px solid #ebdccb',
                    backgroundColor: '#FAF5EE',
                    color: '#7b5233',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Tải lại từ Database"
                >
                  <RefreshCw size={12} className={isLoadingDb ? 'spin' : ''} />
                  <span>{isLoadingDb ? 'Đang nạp...' : 'Đồng bộ'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContainerNameInput('');
                    setIsStartContainerModalOpen(true);
                  }}
                  style={{
                    border: 'none',
                    background: '#7b5233',
                    color: '#ffffff',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} />
                  <span>Tạo Cont mới</span>
                </button>

                {historyContainers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Xóa toàn bộ lịch sử?',
                        message: 'Toàn bộ danh sách lịch sử Container và Pallet trên thiết bị này sẽ bị xóa. Bạn có chắc chắn không?',
                        onConfirm: () => {
                          setHistoryContainers([]);
                          localStorage.removeItem('g7_pallet_v1_containers');
                        }
                      });
                    }}
                    style={{
                      border: 'none',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const totalHistoryPages = Math.ceil((historyContainers?.length || 0) / HISTORY_PAGE_SIZE) || 1;
              const safeHistoryPage = Math.min(Math.max(1, historyPage), totalHistoryPages);
              const startIndex = (safeHistoryPage - 1) * HISTORY_PAGE_SIZE;
              const paginatedHistoryContainers = (historyContainers || []).slice(startIndex, startIndex + HISTORY_PAGE_SIZE);

              if (historyContainers.length === 0) {
                return (
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    border: '1.5px dashed #d5c7b7',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Boxes size={36} color="#cbd5e1" />
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#5c3a21' }}>
                      Chưa có Container nào trong Lịch sử
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#8c786a', maxWidth: '320px' }}>
                      Khi quét các Pallet hoặc tạo mới Container, hồ sơ Container kèm đầy đủ các Pallet, mã SKU và LPN sẽ hiển thị tại đây.
                    </span>
                  </div>
                );
              }

              return (
                <>
                  {paginatedHistoryContainers.map((cont, cIdx) => {
                    const pallets = cont.pallets || [];
                    const isInProgress = cont.status === 'in_progress';
                    const validation = cont.auditResult || validateContainerRules(pallets);
                    let totalBoxes = 0;
                    let totalScans = 0;
                    pallets.forEach(p => {
                      totalScans += (p.totalScans || 0);
                      const stCount = (p.standing?.skus || []).length;
                      const rfCount = (p.roof?.skus || []).length;
                      totalBoxes += Math.round((stCount + rfCount) / 2) || (p.standing?.lpns?.length + p.roof?.lpns?.length) || 5;
                    });

                    return (
                      <div
                        key={cont.id || cIdx}
                        onClick={() => {
                          setSelectedHistoryContainer(cont);
                          setExpandedPalletIndex(null);
                        }}
                        style={{
                          backgroundColor: isInProgress ? '#fffdfa' : validation.isValid ? '#ffffff' : '#fffbfa',
                          borderRadius: '14px',
                          padding: '14px',
                          border: isInProgress ? '1.5px solid #f59e0b' : validation.isValid ? '1.5px solid #eadcc9' : '2px solid #ef4444',
                          boxShadow: isInProgress ? '0 3px 10px rgba(245, 158, 11, 0.12)' : validation.isValid ? '0 3px 10px rgba(0,0,0,0.03)' : '0 3px 12px rgba(239, 68, 68, 0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Header Container */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #f3ece2',
                          paddingBottom: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: isInProgress ? '#d97706' : validation.isValid ? '#7b5233' : '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff'
                            }}>
                              <Boxes size={18} />
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '900', color: '#2d1810' }}>
                                {cont.name}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#786556', fontFamily: 'Consolas, monospace' }}>
                                {cont.id}
                              </div>
                            </div>
                          </div>

                          {isInProgress ? (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              color: '#b45309',
                              backgroundColor: '#fef3c7',
                              border: '1px solid #fde68a',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              ⚡ ĐANG KIỂM TRA
                            </span>
                          ) : validation.isValid ? (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              color: '#15803d',
                              backgroundColor: '#dcfce7',
                              padding: '3px 8px',
                              borderRadius: '5px'
                            }}>
                              ✓ ĐẠT CHUẨN CONTAINER
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              color: '#b91c1c',
                              backgroundColor: '#fee2e2',
                              border: '1px solid #fca5a5',
                              padding: '3px 8px',
                              borderRadius: '5px'
                            }}>
                              ❌ VI PHẠM ({[
                                validation.palletErrors?.length > 0 ? `${validation.palletErrors.length} Pallet thiếu` : '',
                                validation.oddTopLpnErrors?.length > 0 ? `${validation.oddTopLpnErrors.length} LPN nóc lẻ` : ''
                              ].filter(Boolean).join(' • ')})
                            </span>
                          )}
                        </div>

                        {/* Thống kê Container */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '6px',
                          backgroundColor: '#faf7f2',
                          padding: '8px 10px',
                          borderRadius: '9px',
                          fontSize: '11px',
                          textAlign: 'center'
                        }}>
                          <div>
                            <div style={{ color: '#8c786a', fontSize: '10px' }}>Tổng Pallet</div>
                            <strong style={{ color: '#7b5233', fontSize: '13px' }}>{pallets.length}</strong>
                          </div>
                          <div style={{ borderLeft: '1px solid #eadcc9', borderRight: '1px solid #eadcc9' }}>
                            <div style={{ color: '#8c786a', fontSize: '10px' }}>Ước tính Kiện</div>
                            <strong style={{ color: '#15803d', fontSize: '13px' }}>{totalBoxes}</strong>
                          </div>
                          <div>
                            <div style={{ color: '#8c786a', fontSize: '10px' }}>Lần Quét Mã</div>
                            <strong style={{ color: '#2563eb', fontSize: '13px' }}>{totalScans}</strong>
                          </div>
                        </div>

                        {/* Footer info: Thời gian & Người kiểm tra */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '10.5px',
                          color: '#8c7664'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {cont.completedAt || cont.createdAt}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeContainer(cont);
                              }}
                              style={{
                                border: isInProgress ? '1px solid #f59e0b' : '1px solid #ebdccb',
                                backgroundColor: isInProgress ? '#fef3c7' : '#FAF5EE',
                                color: isInProgress ? '#b45309' : '#7b5233',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '800',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                              }}
                              title={isInProgress ? "Tiếp tục kiểm tra Container này" : "Tiếp tục quét Container này"}
                            >
                              <Play size={10} fill={isInProgress ? "#b45309" : "#7b5233"} />
                              <span>{isInProgress ? 'Tiếp tục quét' : 'Quét tiếp'}</span>
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '700', color: '#7b5233' }}>
                              <span>Xem {pallets.length} Pallet</span>
                              <ChevronRight size={14} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Thanh Phân Trang 10 Mục / Trang (Gold Design System) */}
                  {historyContainers.length > HISTORY_PAGE_SIZE && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '6px',
                      padding: '12px 14px',
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #ebdccb'
                    }}>
                      <div style={{ fontSize: '11.5px', color: '#786556', fontWeight: '600' }}>
                        Hiển thị <strong>{startIndex + 1}</strong> - <strong>{Math.min(startIndex + HISTORY_PAGE_SIZE, historyContainers.length)}</strong> trong tổng số <strong>{historyContainers.length}</strong> Container
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          type="button"
                          disabled={safeHistoryPage === 1}
                          onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #ebdccb',
                            backgroundColor: safeHistoryPage === 1 ? '#f5f5f5' : '#FAF5EE',
                            color: safeHistoryPage === 1 ? '#a8a29e' : '#7b5233',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: safeHistoryPage === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Trước
                        </button>

                        {Array.from({ length: totalHistoryPages }, (_, idx) => idx + 1).map(pNum => (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => setHistoryPage(pNum)}
                            style={{
                              minWidth: '28px',
                              height: '28px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: pNum === safeHistoryPage ? 'none' : '1px solid #ebdccb',
                              backgroundColor: pNum === safeHistoryPage ? '#7b5233' : '#ffffff',
                              color: pNum === safeHistoryPage ? '#ffffff' : '#5c3a21',
                              fontSize: '11.5px',
                              fontWeight: '800',
                              cursor: 'pointer'
                            }}
                          >
                            {pNum}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={safeHistoryPage === totalHistoryPages}
                          onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #ebdccb',
                            backgroundColor: safeHistoryPage === totalHistoryPages ? '#f5f5f5' : '#FAF5EE',
                            color: safeHistoryPage === totalHistoryPages ? '#a8a29e' : '#7b5233',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: safeHistoryPage === totalHistoryPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>



      {/* ═══════════════════════════════════════════════════════════════
          MODAL XEM CHI TIẾT LỊCH SỬ
      ═══════════════════════════════════════════════════════════════ */}
      {selectedHistoryItem && (
        <div
          onClick={() => setSelectedHistoryItem(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 35px -10px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.1)',
              border: '1px solid #ebe5dc'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #ebdccb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#faf7f2'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: '#2d1810',
                  fontFamily: 'Consolas, monospace',
                  letterSpacing: '0.2px'
                }}>
                  {selectedHistoryItem.id}
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#5c3a21'
                }}>
                  - {selectedHistoryItem.tabTitle || (selectedHistoryItem.tabType === 'roof' ? 'Top nóc' : 'Pallet đứng')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handlePrintThermalTicket(selectedHistoryItem)}
                  style={{
                    border: '1px solid #ebdccb',
                    backgroundColor: '#ffffff',
                    color: '#15803d',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}
                  title="In thẻ kiểm tra khổ 56mm"
                >
                  <Printer size={13} color="#15803d" />
                  <span>In thẻ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHistoryItem(null)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Thẻ meta thông tin: Thời gian & Người kiểm tra */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '9px 12px',
                backgroundColor: '#faf8f5',
                borderRadius: '8px',
                border: '1px solid #eadcc9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="#8c7664" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: '#8c7664' }}>Thời gian lưu</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#2d1810', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedHistoryItem.timestamp}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="#8c7664" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: '#8c7664' }}>Người kiểm tra</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#2d1810', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedHistoryItem.inspector || selectedHistoryItem.checkedBy || operatorName}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Cột: LPN (Trái) & SKU (Phải) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                alignItems: 'start'
              }}>
                {/* Cột LPN */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #eadcc9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderBottom: '1px solid #f0e6d9'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#4b301e' }}>
                      MÃ LPN
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: '#f6f0e6',
                      color: '#4b301e',
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}>
                      {selectedHistoryItem.lpns?.length || 0} mã
                    </span>
                  </div>

                  {(!selectedHistoryItem.lpns || selectedHistoryItem.lpns.length === 0) ? (
                    <div style={{
                      padding: '24px 8px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '11.5px',
                      fontStyle: 'italic'
                    }}>
                      Chưa có mã LPN
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px',
                      maxHeight: '240px',
                      overflowY: 'auto'
                    }}>
                      {selectedHistoryItem.lpns.map((it, i) => (
                        <div key={i} style={{
                          backgroundColor: '#faf8f5',
                          border: '1px solid #eadcc9',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{
                            fontFamily: 'Consolas, monospace',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            color: '#2d1810',
                            wordBreak: 'break-all'
                          }}>
                            {it.code}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#4b301e',
                            backgroundColor: '#f4ece1',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            flexShrink: 0
                          }}>
                            {it.count} cái
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cột SKU */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #eadcc9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderBottom: '1px solid #f0e6d9'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#4b301e' }}>
                      MÃ SKU
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: '#f6f0e6',
                      color: '#4b301e',
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}>
                      {selectedHistoryItem.skus?.length || 0} mã
                    </span>
                  </div>

                  {(!selectedHistoryItem.skus || selectedHistoryItem.skus.length === 0) ? (
                    <div style={{
                      padding: '24px 8px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '11.5px',
                      fontStyle: 'italic'
                    }}>
                      Chưa có mã SKU
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px',
                      maxHeight: '240px',
                      overflowY: 'auto'
                    }}>
                      {selectedHistoryItem.skus.map((it, i) => (
                        <div key={i} style={{
                          backgroundColor: '#faf8f5',
                          border: '1px solid #eadcc9',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{
                            fontFamily: 'Consolas, monospace',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            color: '#2d1810',
                            wordBreak: 'break-all'
                          }}>
                            {it.code}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#4b301e',
                            backgroundColor: '#f4ece1',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            flexShrink: 0
                          }}>
                            {it.count} cái
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL THÔNG BÁO LƯU THÀNH CÔNG & IN THẺ KIỂM TRA 56MM
      ═══════════════════════════════════════════════════════════════ */}
      {saveSuccessModal.isOpen && saveSuccessModal.record && (
        <div
          onClick={() => setSaveSuccessModal({ isOpen: false, record: null })}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 20px 35px -10px rgba(0,0,0,0.25)',
              border: '1px solid #ebdccb'
            }}
          >
            {/* Icon thành công */}
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              border: '2px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
              color: '#15803d'
            }}>
              <CheckCircle2 size={30} />
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#15803d', margin: '0 0 3px 0' }}>
              ĐÃ LƯU THÀNH CÔNG!
            </h3>

            <div style={{
              fontSize: '13px',
              fontWeight: '800',
              color: '#2d1810',
              fontFamily: 'Consolas, monospace',
              marginBottom: '12px'
            }}>
              {saveSuccessModal.record.id} - {saveSuccessModal.record.tabTitle}
            </div>

            {/* Mã QR Code mẫu */}
            <div style={{
              backgroundColor: '#faf8f5',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #eadcc9',
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}>
              <QRCodeCanvas
                value={saveSuccessModal.record.id}
                size={110}
                level="M"
              />
              <span style={{ fontSize: '10px', color: '#8c7664', fontStyle: 'italic' }}>
                Quét mã này để mở lại lịch sử kiểm tra
              </span>
            </div>

            {/* Thông tin tóm tắt thẻ */}
            <div style={{
              width: '100%',
              backgroundColor: '#faf8f5',
              borderRadius: '8px',
              border: '1px solid #f0e6d9',
              padding: '8px 12px',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#786555' }}>Người kiểm tra:</span>
                <strong>{saveSuccessModal.record.inspector || operatorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#786555' }}>Mã SKU:</span>
                <strong>
                  {saveSuccessModal.record.skus?.length > 0 
                    ? `${saveSuccessModal.record.skus.map(s => s.code).join(', ')} (${saveSuccessModal.record.skus.reduce((a,b)=>a+(b.count||1),0)} cái)`
                    : 'Chưa có'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#786555' }}>Mã LPN:</span>
                <strong>
                  {saveSuccessModal.record.lpns?.length > 0 
                    ? `${saveSuccessModal.record.lpns.map(l => l.code).join(', ')} (${saveSuccessModal.record.lpns.reduce((a,b)=>a+(b.count||1),0)} cái)`
                    : 'Chưa có'}
                </strong>
              </div>
            </div>

            {/* Các nút thao tác */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handlePrintThermalTicket(saveSuccessModal.record)}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                }}
              >
                <Printer size={16} />
                <span>IN THẺ KIỂM TRA (56MM)</span>
              </button>

              <button
                type="button"
                onClick={() => setSaveSuccessModal({ isOpen: false, record: null })}
                style={{
                  width: '100%',
                  padding: '9px',
                  backgroundColor: '#f5f0e8',
                  color: '#4b301e',
                  border: '1px solid #e5dcce',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Đóng & Tiếp tục quét
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── HIDDEN QR CANVASES CHO LỆNH IN NHIỆT ─── */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {saveSuccessModal.record && (
          <QRCodeCanvas
            id={`qr-thermal-canvas-${saveSuccessModal.record.id}`}
            value={saveSuccessModal.record.id}
            size={180}
            level="M"
          />
        )}
        {selectedHistoryItem && (
          <QRCodeCanvas
            id={`qr-thermal-canvas-${selectedHistoryItem.id}`}
            value={selectedHistoryItem.id}
            size={180}
            level="M"
          />
        )}
      </div>

      {/* ─── POP-UP THÔNG BÁO KẾT QUẢ QUÉT ─── */}
      {scanPopup && (() => {
        const isRejected = scanPopup.type === 'rejected';

        // Bảng màu thân thiện, hiện đại: Đỏ dịu mắt khi lệch mã | Nâu be G7 khi ghi nhận thường
        const borderColor = isRejected ? '#fecaca' : '#eadcc9';
        const shadowColor = isRejected 
          ? '0 20px 45px -10px rgba(220, 38, 38, 0.22), 0 8px 16px -4px rgba(0,0,0,0.06)'
          : '0 20px 40px -10px rgba(123, 82, 51, 0.16), 0 8px 16px -4px rgba(0,0,0,0.04)';
        const headerBg = isRejected ? '#fff5f5' : '#faf6f0';
        const headerBorder = isRejected ? '#fee2e2' : '#eadcc9';
        const iconBg = isRejected ? '#fee2e2' : '#f0e5d6';
        const iconRing = isRejected ? '0 0 0 6px #fef2f2' : '0 0 0 6px #faf6f0';
        const titleColor = isRejected ? '#b91c1c' : '#4e3629';

        return (
          <div style={{
            position: 'fixed',
            ...(isRejected ? {
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 9999
            } : {
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '90%',
              maxWidth: '350px',
              pointerEvents: 'none'
            })
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '350px',
              overflow: 'hidden',
              boxShadow: shadowColor,
              border: `1.5px solid ${borderColor}`,
              animation: 'scaleUp 0.18s ease-out'
            }}>
              {/* Header nằm ngang gọn gàng: Icon/Emoji 1 bên, Tiêu đề 1 bên, nút X góc phải */}
              <div style={{
                backgroundColor: headerBg,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                borderBottom: `1px solid ${headerBorder}`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  minWidth: 0,
                  flex: 1
                }}>
                  {/* Icon/Emoji 1 bên */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isRejected ? (
                      <AlertTriangle size={17} color="#dc2626" strokeWidth={2.4} />
                    ) : (
                      <Barcode size={17} color="#7b5233" strokeWidth={2.2} />
                    )}
                  </div>

                  {/* Tiêu đề 1 bên */}
                  <span style={{
                    fontSize: '13.5px',
                    fontWeight: '800',
                    color: titleColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {scanPopup.title || (isRejected ? 'BÁO ĐỘNG — LỆCH MÃ' : 'ĐÃ GHI NHẬN MÃ')}
                  </span>
                </div>

                {/* Nút X đóng góc phải */}
                <button
                  type="button"
                  onClick={() => setScanPopup(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: isRejected ? '#ef4444' : '#a89a8c',
                    padding: '4px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Đóng"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Nội dung chi tiết: Mã vừa quét và Mã chuẩn cùng 1 dòng, không xuống hàng */}
              <div style={{ padding: '12px 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  backgroundColor: isRejected ? '#fff8f8' : '#faf8f5',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  border: isRejected ? '1px solid #fed7d7' : '1px solid #eadcc9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* Hàng 1: Mã vừa quét (Label 1 bên, mã 1 bên trên cùng 1 hàng) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '2px 0'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: isRejected ? '#7f1d1d' : '#6b482b',
                      whiteSpace: 'nowrap'
                    }}>
                      Mã vừa quét:
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, justifyContent: 'flex-end' }}>
                      <span style={{
                        fontFamily: 'Consolas, monospace',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        color: isRejected ? '#b91c1c' : '#2d1810',
                        backgroundColor: isRejected ? '#fee2e2' : '#f0e8dc',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {scanPopup.code}
                      </span>
                      {scanPopup.category && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          color: isRejected ? '#991b1b' : '#6b482b',
                          backgroundColor: isRejected ? '#fecaca' : '#e5d7c4',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {scanPopup.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hàng 2: Mã chuẩn (Nếu có lệch mã - Label 1 bên, mã chuẩn 1 bên cùng 1 hàng) */}
                  {scanPopup.standardCode && (
                    <div style={{
                      borderTop: isRejected ? '1px dashed #fecaca' : '1px dashed #eadcc9',
                      paddingTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingBottom: '2px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#6b7280',
                        whiteSpace: 'nowrap'
                      }}>
                        Mã chuẩn:
                      </span>
                      <span style={{
                        fontFamily: 'Consolas, monospace',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        color: '#1f2937',
                        backgroundColor: '#f3f4f6',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {scanPopup.standardCode}
                      </span>
                    </div>
                  )}
                </div>

                {/* Thông điệp cảnh báo ngắn gọn, thân thiện khi bị từ chối */}
                {isRejected && (
                  <div style={{
                    fontSize: '11.5px',
                    lineHeight: '1.45',
                    color: '#b91c1c',
                    fontWeight: '600',
                    textAlign: 'center',
                    padding: '0 4px'
                  }}>
                    ✕ Hệ thống từ chối và <strong>không ghi nhận</strong> mã này
                  </div>
                )}

                {/* Nút đóng / thử lại */}
                <button
                  type="button"
                  onClick={() => setScanPopup(null)}
                  style={{
                    width: '100%',
                    height: '38px',
                    background: isRejected 
                      ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                      : 'linear-gradient(135deg, #5c3a21 0%, #7b5233 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: isRejected 
                      ? '0 4px 12px rgba(220, 38, 38, 0.25)' 
                      : '0 4px 12px rgba(123, 82, 51, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isRejected ? 'Đã hiểu — Thử lại' : 'Đóng / Tiếp tục quét'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: BẮT BUỘC NHẬP TÊN CONTAINER KHI BẮT ĐẦU PHIÊN QUÉT
      ═══════════════════════════════════════════════════════════════ */}
      {isStartContainerModalOpen && (
        <div 
          onClick={() => {
            setIsStartContainerModalOpen(false);
            if (!activeContainer) {
              setActiveTab('history');
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '380px',
              width: '100%',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 25px 45px -12px rgba(0,0,0,0.35)',
              border: '1.5px solid #eadcc9'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#7b5233',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  <Boxes size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#2d1810' }}>
                    BẮT ĐẦU CONTAINER MỚI
                  </div>
                  <div style={{ fontSize: '11px', color: '#786556' }}>
                    Nhập mã hoặc tên Container để gom Pallet
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsStartContainerModalOpen(false);
                  if (!activeContainer) {
                    setActiveTab('history');
                  }
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#9c8a7d',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
                title="Bỏ qua (Xem lịch sử)"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#4a240e' }}>
                TÊN CONTAINER <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  ref={containerInputRef}
                  type="text"
                  value={containerNameInput}
                  onChange={(e) => setContainerNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleStartNewContainer(containerNameInput);
                    }
                  }}
                  autoFocus
                  placeholder="Ví dụ: CONT-01, CONT-02..."
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '2px solid #7b5233',
                    fontSize: '15px',
                    fontWeight: '800',
                    color: '#2d1810',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
                  }}
                />
                {containerNameInput && (
                  <button
                    type="button"
                    onClick={() => setContainerNameInput('')}
                    style={{
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      borderRadius: '8px',
                      padding: '0 12px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                    title="Xóa nhanh"
                  >
                    ✕
                  </button>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#8c786a' }}>
                Gợi ý: CONT-01, CONT-02, hoặc số seal/vận đơn thực tế
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsStartContainerModalOpen(false);
                  if (!activeContainer) {
                    setActiveTab('history');
                  }
                }}
                style={{
                  flex: 1,
                  height: '42px',
                  border: '1.5px solid #d5c7b7',
                  backgroundColor: '#ffffff',
                  color: '#786556',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {activeContainer ? 'Quay lại' : 'Bỏ qua'}
              </button>
              <button
                type="button"
                onClick={() => handleStartNewContainer(containerNameInput)}
                style={{
                  flex: 2,
                  height: '42px',
                  border: 'none',
                  backgroundColor: '#7b5233',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontWeight: '900',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(123, 82, 51, 0.3)'
                }}
              >
                Bắt đầu quét Container ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ADMIN SỬA THÔNG TIN CONTAINER TRONG LỊCH SỬ
      ═══════════════════════════════════════════════════════════════ */}
      {isEditHistoryContainerModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            maxWidth: '390px',
            width: '100%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 25px 45px -12px rgba(0,0,0,0.35)',
            border: '1.5px solid #eadcc9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#7b5233',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Edit3 size={16} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#2d1810' }}>
                  SỬA THÔNG TIN CONTAINER
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditHistoryContainerModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#5c3a21', display: 'block', marginBottom: '4px' }}>
                  TÊN CONTAINER:
                </label>
                <input
                  type="text"
                  value={editHistoryContName}
                  onChange={(e) => setEditHistoryContName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #d5c7b7',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#2d1810',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Ví dụ: CONT-261106-481..."
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#5c3a21', display: 'block', marginBottom: '4px' }}>
                  NGƯỜI KIỂM TRA:
                </label>
                <input
                  type="text"
                  value={editHistoryContInspector}
                  onChange={(e) => setEditHistoryContInspector(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #d5c7b7',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#2d1810',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Tên người kiểm tra..."
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#5c3a21', display: 'block', marginBottom: '4px' }}>
                  TRẠNG THÁI CONTAINER:
                </label>
                <select
                  value={editHistoryContStatus}
                  onChange={(e) => setEditHistoryContStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #d5c7b7',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: '#2d1810',
                    backgroundColor: '#FAF5EE',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="completed">Đã hoàn thành kiểm tra</option>
                  <option value="in_progress">Đang kiểm tra dở dang</option>
                  <option value="warning">Cảnh báo / Có lỗi</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsEditHistoryContainerModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveHistoryContainerInfo}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7b5233',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                ✓ Lưu Container
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ADMIN SỬA CHI TIẾT PALLET (SKU & LPN)
      ═══════════════════════════════════════════════════════════════ */}
      {isEditPalletModalOpen && editingPalletData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            maxWidth: '460px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 45px -12px rgba(0,0,0,0.35)',
            border: '1.5px solid #eadcc9',
            overflow: 'hidden'
          }}>
            {/* Header Modal Pallet */}
            <div style={{
              padding: '14px 16px',
              backgroundColor: '#FAF5EE',
              borderBottom: '1px solid #ebdccb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#7b5233',
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '12px'
                }}>
                  PALLET #{editingPalletData.palletIndex}
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#2d1810' }}>
                    Chỉnh sửa Pallet
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#786556', fontFamily: 'Consolas, monospace' }}>
                    Cont: {selectedHistoryContainer?.name}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditPalletModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mã Pallet ID */}
            <div style={{ padding: '10px 16px', backgroundColor: '#faf7f2', borderBottom: '1px solid #ebdccb', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#5c3a21', whiteSpace: 'nowrap' }}>Mã Pallet ID:</span>
              <input
                type="text"
                value={editingPalletData.palletId}
                onChange={(e) => setEditingPalletData(prev => ({ ...prev, palletId: e.target.value }))}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #d5c7b7',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  fontFamily: 'Consolas, monospace',
                  color: '#2d1810'
                }}
              />
            </div>

            {/* Tab Chuyển đổi: Pallet Đứng vs Tủ Top Nóc */}
            <div style={{ display: 'flex', padding: '8px 16px', gap: '6px', backgroundColor: '#FAF5EE' }}>
              <button
                type="button"
                onClick={() => setEditingPalletActiveTab('standing')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backgroundColor: editingPalletActiveTab === 'standing' ? '#7b5233' : '#e6dcce',
                  color: editingPalletActiveTab === 'standing' ? '#ffffff' : '#5c3a21',
                  transition: 'all 0.15s ease'
                }}
              >
                1. PALLET ĐỨNG ({editingPalletData.standing?.skus?.length || 0} SKU • {editingPalletData.standing?.lpns?.length || 0} LPN)
              </button>

              <button
                type="button"
                onClick={() => setEditingPalletActiveTab('roof')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backgroundColor: editingPalletActiveTab === 'roof' ? '#7b5233' : '#e6dcce',
                  color: editingPalletActiveTab === 'roof' ? '#ffffff' : '#5c3a21',
                  transition: 'all 0.15s ease'
                }}
              >
                2. TỦ TOP NÓC {editingPalletData.roof?.hasRoof ? '(BẬT)' : '(TẮT)'}
              </button>
            </div>

            {/* Body Nội Dung Cuộn */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* ──────────────── TAB 1: PALLET ĐỨNG ──────────────── */}
              {editingPalletActiveTab === 'standing' && (
                <>
                  {/* Khối SKU Đứng */}
                  <div style={{ backgroundColor: '#FAF5EE', borderRadius: '10px', padding: '12px', border: '1px solid #ebdccb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#4a240e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Package size={14} color="#7b5233" />
                        DANH SÁCH MÃ SKU ĐỨNG ({editingPalletData.standing?.skus?.length || 0}/8 SKU)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPalletData(prev => ({
                            ...prev,
                            standing: {
                              ...prev.standing,
                              skus: [
                                ...(prev.standing?.skus || []),
                                { id: Math.random().toString(36).substr(2, 9), code: prev.standing?.skus?.[0]?.code || '', count: 1 }
                              ]
                            }
                          }));
                        }}
                        style={{
                          border: 'none',
                          backgroundColor: '#7b5233',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '10.5px',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        + Thêm SKU
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(editingPalletData.standing?.skus || []).length === 0 ? (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>Chưa có mã SKU đứng</div>
                      ) : (
                        (editingPalletData.standing?.skus || []).map((item, idx) => (
                          <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: '#8c786a', width: '22px', textAlign: 'right' }}>#{idx + 1}</span>
                            <input
                              type="text"
                              value={item.code}
                              placeholder="Mã SKU (VD: 060094519)"
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingPalletData(prev => {
                                  const skus = [...(prev.standing?.skus || [])];
                                  skus[idx] = { ...skus[idx], code: val };
                                  return { ...prev, standing: { ...prev.standing, skus } };
                                });
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11.5px',
                                fontFamily: 'Consolas, monospace',
                                fontWeight: '700',
                                color: '#9a3412',
                                backgroundColor: '#ffffff'
                              }}
                            />
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={item.count || 1}
                              title="Số lượng tem"
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setEditingPalletData(prev => {
                                  const skus = [...(prev.standing?.skus || [])];
                                  skus[idx] = { ...skus[idx], count: val };
                                  return { ...prev, standing: { ...prev.standing, skus } };
                                });
                              }}
                              style={{
                                width: '45px',
                                padding: '6px 4px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11px',
                                textAlign: 'center',
                                fontWeight: '700'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPalletData(prev => ({
                                  ...prev,
                                  standing: {
                                    ...prev.standing,
                                    skus: (prev.standing?.skus || []).filter((_, i) => i !== idx)
                                  }
                                }));
                              }}
                              style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', padding: '6px', borderRadius: '5px', cursor: 'pointer' }}
                              title="Xóa dòng này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Khối LPN Đứng */}
                  <div style={{ backgroundColor: '#FAF5EE', borderRadius: '10px', padding: '12px', border: '1px solid #ebdccb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#4a240e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Barcode size={14} color="#7b5233" />
                        DANH SÁCH MÃ LPN ĐỨNG ({editingPalletData.standing?.lpns?.length || 0}/4 LPN)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPalletData(prev => ({
                            ...prev,
                            standing: {
                              ...prev.standing,
                              lpns: [
                                ...(prev.standing?.lpns || []),
                                { id: Math.random().toString(36).substr(2, 9), code: prev.standing?.lpns?.[0]?.code || '', count: 1 }
                              ]
                            }
                          }));
                        }}
                        style={{
                          border: 'none',
                          backgroundColor: '#7b5233',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '10.5px',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        + Thêm LPN
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(editingPalletData.standing?.lpns || []).length === 0 ? (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>Chưa có mã LPN đứng</div>
                      ) : (
                        (editingPalletData.standing?.lpns || []).map((item, idx) => (
                          <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: '#8c786a', width: '22px', textAlign: 'right' }}>#{idx + 1}</span>
                            <input
                              type="text"
                              value={item.code}
                              placeholder="Mã LPN"
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setEditingPalletData(prev => {
                                  const lpns = [...(prev.standing?.lpns || [])];
                                  lpns[idx] = { ...lpns[idx], code: val };
                                  return { ...prev, standing: { ...prev.standing, lpns } };
                                });
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11.5px',
                                fontFamily: 'Consolas, monospace',
                                fontWeight: '700',
                                color: '#1e40af',
                                backgroundColor: '#ffffff'
                              }}
                            />
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={item.count || 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setEditingPalletData(prev => {
                                  const lpns = [...(prev.standing?.lpns || [])];
                                  lpns[idx] = { ...lpns[idx], count: val };
                                  return { ...prev, standing: { ...prev.standing, lpns } };
                                });
                              }}
                              style={{
                                width: '45px',
                                padding: '6px 4px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11px',
                                textAlign: 'center',
                                fontWeight: '700'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPalletData(prev => ({
                                  ...prev,
                                  standing: {
                                    ...prev.standing,
                                    lpns: (prev.standing?.lpns || []).filter((_, i) => i !== idx)
                                  }
                                }));
                              }}
                              style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', padding: '6px', borderRadius: '5px', cursor: 'pointer' }}
                              title="Xóa dòng này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ──────────────── TAB 2: TỦ TOP NÓC ──────────────── */}
              {editingPalletActiveTab === 'roof' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Nút Toggle Bật/Tắt Tủ Nóc */}
                  <div style={{
                    backgroundColor: editingPalletData.roof?.hasRoof ? '#f0fdf4' : '#f8fafc',
                    borderRadius: '10px',
                    padding: '12px',
                    border: editingPalletData.roof?.hasRoof ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: editingPalletData.roof?.hasRoof ? '#166534' : '#475569' }}>
                        {editingPalletData.roof?.hasRoof ? '✓ Pallet này CÓ Tủ Top Nóc (Kiện #5)' : 'Pallet này KHÔNG CÓ Tủ Top Nóc (4 kiện)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {editingPalletData.roof?.hasRoof ? 'Yêu cầu: 2 tem SKU và 1 tem LPN nóc (quy chuẩn số chẵn toàn Cont)' : 'Chỉ có 4 kiện đứng (8 SKU / 4 LPN)'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextHasRoof = !editingPalletData.roof?.hasRoof;
                        setEditingPalletData(prev => ({
                          ...prev,
                          roof: {
                            ...prev.roof,
                            hasRoof: nextHasRoof,
                            skus: nextHasRoof && (!prev.roof?.skus || prev.roof.skus.length === 0)
                              ? [{ id: 'rs-1', code: prev.standing?.skus?.[0]?.code || '', count: 2 }]
                              : prev.roof?.skus || [],
                            lpns: nextHasRoof && (!prev.roof?.lpns || prev.roof.lpns.length === 0)
                              ? [{ id: 'rl-1', code: '', count: 1 }]
                              : prev.roof?.lpns || []
                          }
                        }));
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '7px',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        backgroundColor: editingPalletData.roof?.hasRoof ? '#15803d' : '#94a3b8',
                        color: '#ffffff'
                      }}
                    >
                      {editingPalletData.roof?.hasRoof ? 'Đang BẬT' : 'Bật Tủ Nóc'}
                    </button>
                  </div>

                  {editingPalletData.roof?.hasRoof && (
                    <div style={{ backgroundColor: '#FAF5EE', borderRadius: '10px', padding: '12px', border: '1px solid #ebdccb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Mã LPN Nóc & Live Counter kiểm tra số chẵn */}
                      <div>
                        <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#4a240e', display: 'block', marginBottom: '4px' }}>
                          MÃ LPN TOP NÓC (KIỂM TRA CHẴN/LẺ TOÀN CONT):
                        </label>
                        <input
                          type="text"
                          value={editingPalletData.roof?.lpns?.[0]?.code || editingPalletData.roof?.standardLpn || ''}
                          placeholder="Nhập mã LPN Top Nóc (VD: 060094519)"
                          onChange={(e) => {
                            const val = e.target.value.trim().toUpperCase();
                            setEditingPalletData(prev => ({
                              ...prev,
                              roof: {
                                ...prev.roof,
                                standardLpn: val,
                                lpns: [{ id: 'rl-1', code: val, count: 1 }]
                              }
                            }));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '7px',
                            border: '1.5px solid #2563eb',
                            fontSize: '13px',
                            fontWeight: '800',
                            fontFamily: 'Consolas, monospace',
                            color: '#1e40af',
                            backgroundColor: '#eff6ff',
                            boxSizing: 'border-box'
                          }}
                        />

                        {/* LIVE CHECK INDICATOR: Kiểm tra ngay mã LPN nóc này có số chẵn hay lẻ */}
                        {(() => {
                          const inputCode = (editingPalletData.roof?.lpns?.[0]?.code || editingPalletData.roof?.standardLpn || '').trim();
                          if (!inputCode) return null;

                          let otherContCount = 0;
                          (selectedHistoryContainer?.pallets || []).forEach((p, idx) => {
                            if (idx !== editingPalletIndex) {
                              const pCode = (p.roof?.standardLpn || p.roof?.lpns?.[0]?.code || '').trim();
                              if (pCode === inputCode) otherContCount++;
                            }
                          });
                          const totalWithThisPallet = otherContCount + 1;
                          const isEven = totalWithThisPallet % 2 === 0;

                          return (
                            <div style={{
                              marginTop: '6px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: isEven ? '#dcfce7' : '#fee2e2',
                              color: isEven ? '#15803d' : '#b91c1c',
                              border: isEven ? '1px solid #86efac' : '1px solid #fca5a5'
                            }}>
                              {isEven ? <CheckCircle2 size={14} color="#15803d" /> : <AlertTriangle size={14} color="#dc2626" />}
                              <span>
                                Toàn Cont sẽ có: <strong>{totalWithThisPallet} kiện</strong> mã [{inputCode}] 
                                ({isEven ? 'Số chẵn - HỢP LỆ' : 'Số lẻ - BÁO ĐỎ'})
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Mã SKU Nóc */}
                      <div>
                        <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#4a240e', display: 'block', marginBottom: '4px' }}>
                          MÃ SKU TOP NÓC (2 TEM / 1 KIỆN):
                        </label>
                        <input
                          type="text"
                          value={editingPalletData.roof?.skus?.[0]?.code || editingPalletData.roof?.standardSku || ''}
                          placeholder="Mã SKU Top Nóc"
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setEditingPalletData(prev => ({
                              ...prev,
                              roof: {
                                ...prev.roof,
                                standardSku: val,
                                skus: [{ id: 'rs-1', code: val, count: 2 }]
                              }
                            }));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '7px',
                            border: '1.5px solid #16a34a',
                            fontSize: '13px',
                            fontWeight: '800',
                            fontFamily: 'Consolas, monospace',
                            color: '#15803d',
                            backgroundColor: '#f0fdf4',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Modal Pallet */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FAF5EE',
              borderTop: '1px solid #ebdccb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <button
                type="button"
                onClick={() => setIsEditPalletModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveEditedPallet}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7b5233',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 3px 8px rgba(123, 82, 51, 0.25)'
                }}
              >
                <Save size={14} />
                <span>✓ Lưu Thay Đổi Pallet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: ĐỔI TÊN CONTAINER ĐANG QUÉT
      ═══════════════════════════════════════════════════════════════ */}
      {isEditContainerModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            maxWidth: '380px',
            width: '100%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 25px 45px -12px rgba(0,0,0,0.35)',
            border: '1.5px solid #eadcc9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#7b5233',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Edit3 size={16} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#2d1810' }}>
                  ĐỔI TÊN CONTAINER
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditContainerModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  padding: '4px',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={editContainerNameInput}
                  onChange={(e) => setEditContainerNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUpdateContainerName(editContainerNameInput);
                    }
                  }}
                  autoFocus
                  placeholder="Nhập tên mới..."
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '2px solid #7b5233',
                    fontSize: '15px',
                    fontWeight: '800',
                    color: '#2d1810',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
                  }}
                />
                {editContainerNameInput && (
                  <button
                    type="button"
                    onClick={() => setEditContainerNameInput('')}
                    style={{
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      borderRadius: '8px',
                      padding: '0 12px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                    title="Xóa nhanh"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsEditContainerModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d5c7b7',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleUpdateContainerName(editContainerNameInput)}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7b5233',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)'
                }}
              >
                Lưu tên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: XEM CHI TIẾT CONTAINER TRONG LỊCH SỬ (CẤP 2 & 3)
      ═══════════════════════════════════════════════════════════════ */}
      {selectedHistoryContainer && (
        <div
          onClick={() => setSelectedHistoryContainer(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '460px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 35px -10px rgba(0,0,0,0.3)',
              border: '1.5px solid #ebdccb'
            }}
          >
            {/* Header Modal Container (Thiết kế 3 tầng thông minh chuẩn Mobile ERP) */}
            <div style={{
              padding: '12px 14px',
              borderBottom: '1.5px solid #ebdccb',
              backgroundColor: '#FAF5EE',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '9px'
            }}>
              {/* Tầng 1: Icon + Tên Container + Nút Sửa Cont + Nút Đóng X */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#7b5233',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    <Boxes size={18} />
                  </div>

                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '15.5px',
                      fontWeight: '900',
                      color: '#2d1810',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.2px'
                    }}>
                      {selectedHistoryContainer.name}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditHistoryContainerModal(selectedHistoryContainer)}
                        style={{
                          border: '1px solid #d5c7b7',
                          backgroundColor: '#ffffff',
                          borderRadius: '6px',
                          padding: '2px 7px',
                          cursor: 'pointer',
                          color: '#7b5233',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10.5px',
                          fontWeight: '800',
                          whiteSpace: 'nowrap'
                        }}
                        title="Chỉnh sửa tên và thông tin Container"
                      >
                        <Edit3 size={11} />
                        <span>Sửa Cont</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Nút Đóng Modal tròn thanh lịch */}
                <button
                  type="button"
                  onClick={() => setSelectedHistoryContainer(null)}
                  style={{
                    border: 'none',
                    backgroundColor: '#e6dcce',
                    color: '#5c3a21',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Đóng chi tiết Container"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tầng 2: Thông tin Meta (Mã Cont, Số Pallet, Người kiểm tra) */}
              <div style={{
                fontSize: '11px',
                color: '#786556',
                fontFamily: 'Consolas, monospace',
                backgroundColor: '#ffffff',
                padding: '6px 10px',
                borderRadius: '7px',
                border: '1px solid #ebdccb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '4px'
              }}>
                <span>Mã: <strong>{selectedHistoryContainer.id}</strong> • {selectedHistoryContainer.pallets?.length || 0} Pallet</span>
                <span>Người kiểm: <strong style={{ color: '#2d1810' }}>{selectedHistoryContainer.inspector || operatorName}</strong></span>
              </div>

              {/* Tầng 3: Thanh công cụ hành động (3 nút cân xứng, không bao giờ vỡ chữ) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleResumeContainer(selectedHistoryContainer)}
                  style={{
                    border: 'none',
                    backgroundColor: '#7b5233',
                    color: '#ffffff',
                    cursor: 'pointer',
                    height: '34px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    boxShadow: '0 2px 6px rgba(123, 82, 51, 0.2)',
                    whiteSpace: 'nowrap'
                  }}
                  title="Tiếp tục quét thêm Pallet cho Container này"
                >
                  <Play size={12} fill="#ffffff" />
                  <span>Tiếp tục quét</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintContainerSummary(selectedHistoryContainer)}
                  style={{
                    border: '1px solid #86efac',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    cursor: 'pointer',
                    height: '34px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    whiteSpace: 'nowrap'
                  }}
                  title="In phiếu tổng hợp Container khổ 56mm"
                >
                  <Printer size={13} color="#15803d" />
                  <span>In Cont</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteContainer(selectedHistoryContainer.id, selectedHistoryContainer.name)}
                  style={{
                    border: '1px solid #fecaca',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    cursor: 'pointer',
                    height: '34px',
                    padding: '0 12px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    whiteSpace: 'nowrap'
                  }}
                  title="Xóa Container này khỏi Database"
                >
                  <Trash2 size={13} />
                  <span>Xóa</span>
                </button>
              </div>
            </div>

            {/* Body: Danh sách tất cả Pallet trong Container (Cấp 2 & 3) */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const validation = selectedHistoryContainer.auditResult || validateContainerRules(selectedHistoryContainer.pallets || []);
                return (
                  <>
                    {/* KHỐI BÁO CÁO KIỂM ĐỊNH TIÊU CHUẨN CONTAINER */}
                    <div style={{
                      backgroundColor: validation.isValid ? '#f0fdf4' : '#fef2f2',
                      borderRadius: '12px',
                      border: validation.isValid ? '1.5px solid #86efac' : '1.5px solid #f87171',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          {validation.isValid ? (
                            <CheckCircle2 size={18} color="#15803d" />
                          ) : (
                            <AlertTriangle size={18} color="#dc2626" />
                          )}
                          <span style={{
                            fontSize: '12.5px',
                            fontWeight: '900',
                            color: validation.isValid ? '#166534' : '#991b1b',
                            textTransform: 'uppercase'
                          }}>
                            {validation.isValid
                              ? '✓ CONTAINER ĐẠT TIÊU CHUẨN XUẤT KHẨU'
                              : '❌ PHÁT HIỆN LỖI VI PHẠM TIÊU CHUẨN CONTAINER'}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '800',
                          color: validation.isValid ? '#15803d' : '#b91c1c',
                          backgroundColor: validation.isValid ? '#dcfce7' : '#fee2e2',
                          padding: '2px 7px',
                          borderRadius: '5px'
                        }}>
                          {validation.isValid ? '100% HỢP LỆ' : 'BÁO ĐỎ'}
                        </span>
                      </div>

                      {!validation.isValid && (
                        <div style={{
                          fontSize: '11px',
                          color: '#7f1d1d',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px',
                          paddingTop: '6px',
                          borderTop: '1px dashed #fca5a5'
                        }}>
                          {validation.oddTopLpnErrors.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                              <span style={{ fontWeight: '800', color: '#dc2626' }}>• Lỗi Top Nóc số lẻ:</span>
                              <span>
                                {validation.oddTopLpnErrors.map(e => `Mã [${e.lpnCode}] có ${e.count} kiện lẻ trên Pallet #${e.palletIndices.join(', #')}`).join('; ')}
                              </span>
                            </div>
                          )}
                          {validation.palletErrors.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                              <span style={{ fontWeight: '800', color: '#dc2626' }}>• Lỗi Pallet thiếu mã:</span>
                              <span>
                                {validation.palletErrors.map(e => `Pallet #${e.palletIndex} (${e.details})`).join('; ')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* BẢNG KIỂM TRA KIỆN TOP NÓC TOÀN CONTAINER (QUY CHUẨN SỐ CHẴN) */}
                    <div style={{
                      backgroundColor: '#faf7f2',
                      borderRadius: '12px',
                      border: '1px solid #eadcc9',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#4a240e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Layers size={14} color="#7b5233" />
                          KIỂM TRA KIỆN TOP NÓC TOÀN CONT (SỐ CHẴN)
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#786556' }}>
                          Tổng mã nóc: <strong>{Object.keys(validation.topLpnGroup || {}).length}</strong>
                        </span>
                      </div>

                      {Object.keys(validation.topLpnGroup || {}).length === 0 ? (
                        <div style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontStyle: 'italic',
                          backgroundColor: '#f8fafc',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px dashed #cbd5e1'
                        }}>
                          Container không có Kiện Top Nóc nào (100% là Pallet 4 kiện đứng)
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {Object.entries(validation.topLpnGroup || {}).map(([lpnCode, info], idx) => {
                            const isSelfEven = info.count % 2 === 0;
                            const isOddCombinedEven = validation.isOddCombinedEven || (
                              !isSelfEven && (!validation.oddTopLpnErrors || validation.oddTopLpnErrors.length === 0)
                            );
                            const isOk = isSelfEven || isOddCombinedEven;

                            return (
                              <div
                                key={idx}
                                style={{
                                  backgroundColor: isOk ? '#ffffff' : '#fef2f2',
                                  borderRadius: '8px',
                                  border: isOk ? (isSelfEven ? '1px solid #e2e8f0' : '1.5px solid #86efac') : '1.5px solid #f87171',
                                  padding: '7px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  fontSize: '11px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: '800',
                                    color: isOk ? (isSelfEven ? '#1e40af' : '#15803d') : '#b91c1c'
                                  }}>
                                    {lpnCode}
                                  </span>
                                  <span style={{ color: '#64748b', fontSize: '10px' }}>
                                    (Pallet #{info.palletIndices.join(', #')})
                                  </span>
                                </div>

                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  backgroundColor: isOk ? '#dcfce7' : '#fee2e2',
                                  color: isOk ? '#15803d' : '#dc2626',
                                  border: isOk ? '1px solid #86efac' : '1px solid #fca5a5'
                                }}>
                                  {isSelfEven
                                    ? `✓ ${info.count} kiện (Chẵn - Hợp lệ)`
                                    : isOddCombinedEven
                                      ? `✓ ${info.count} kiện (Ghép chẵn ${validation.totalOddBoxes || ''} kiện - Hợp lệ)`
                                      : `❌ ${info.count} kiện (LẺ - BÁO ĐỎ)`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* DANH SÁCH PALLET HEADER */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0',
                gap: '8px'
              }}>
                <div>
                  <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#4a240e', textTransform: 'uppercase' }}>
                    DANH SÁCH PALLET ({selectedHistoryContainer.pallets?.length || 0})
                  </span>
                  <div style={{ fontSize: '10px', color: '#8c786a', marginTop: '1px' }}>
                    Chạm vào pallet để xem chi tiết mã
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAddNewPalletToHistoryContainer}
                    style={{
                      border: '1px solid #7b5233',
                      backgroundColor: '#FAF5EE',
                      color: '#7b5233',
                      padding: '5px 10px',
                      borderRadius: '7px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 1px 3px rgba(123, 82, 51, 0.12)',
                      whiteSpace: 'nowrap'
                    }}
                    title="Thêm một Pallet mới vào Container này"
                  >
                    <Plus size={13} />
                    <span>Thêm Pallet</span>
                  </button>
                )}
              </div>

              {(selectedHistoryContainer.pallets || []).map((pallet, pIdx) => {
                const isExpanded = expandedPalletIndex === pIdx;
                const standingSkus = pallet.standing?.skus || [];
                const standingLpns = pallet.standing?.lpns || [];
                const roofSkus = pallet.roof?.skus || [];
                const roofLpns = pallet.roof?.lpns || [];
                const hasRoof = Boolean(pallet.roof?.hasRoof) || (roofSkus.length > 0 || roofLpns.length > 0);

                const currentAudit = selectedHistoryContainer.auditResult || validateContainerRules(selectedHistoryContainer.pallets || []);
                const palletErr = (currentAudit.palletErrors || []).find(e => e.palletIndex === pallet.palletIndex);

                return (
                  <div
                    key={pallet.palletId || pIdx}
                    style={{
                      backgroundColor: palletErr ? '#fef2f2' : '#faf7f2',
                      borderRadius: '12px',
                      border: palletErr
                        ? '1.5px solid #ef4444'
                        : (isExpanded ? '1.5px solid #7b5233' : '1px solid #eadcc9'),
                      overflow: 'hidden',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Header Pallet (Thiết kế 2 tầng thoáng đãng, chống vỡ chữ trên di động) */}
                    <div
                      onClick={() => setExpandedPalletIndex(isExpanded ? null : pIdx)}
                      style={{
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        cursor: 'pointer',
                        backgroundColor: palletErr
                          ? (isExpanded ? '#fee2e2' : '#fff5f5')
                          : (isExpanded ? '#f3ece2' : 'transparent')
                      }}
                    >
                      {/* DÒNG 1: Badge PALLET #N + Badge Đạt/Lỗi + Nút Sửa + Chevron */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            backgroundColor: palletErr ? '#dc2626' : '#7b5233',
                            color: '#ffffff',
                            fontWeight: '900',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            PALLET #{pallet.palletIndex}
                          </span>

                          {palletErr ? (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap'
                            }}>
                              ❌ THIẾU MÃ ({palletErr.currentSkus}/{palletErr.expectedSkus})
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap'
                            }}>
                              ✓ ĐỦ: {hasRoof ? '10 SKU • 5 LPN' : (standingSkus.length === 4 && standingLpns.length === 2 ? '4 SKU • 2 LPN (2 Kiện)' : '8 SKU • 4 LPN')}
                            </span>
                          )}
                        </div>

                        {/* Phía phải: Nút Sửa nhanh + Mũi tên */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditPalletModal(pallet, pIdx);
                              }}
                              style={{
                                border: '1px solid #d5c7b7',
                                backgroundColor: '#ffffff',
                                color: '#7b5233',
                                padding: '2px 8px',
                                borderRadius: '5px',
                                fontSize: '10.5px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                              title="Sửa mã Pallet này"
                            >
                              <Edit3 size={11} />
                              <span>Sửa</span>
                            </button>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', color: '#7b5233' }}>
                            {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                          </div>
                        </div>
                      </div>

                      {/* DÒNG 2: Mã Pallet ID đầy đủ + Số lượng mã */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '10.5px' }}>
                        <span style={{
                          fontFamily: 'Consolas, monospace',
                          fontWeight: '700',
                          color: palletErr ? '#991b1b' : '#5c3a21',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '75%'
                        }} title={pallet.palletId}>
                          {pallet.palletId}
                        </span>

                        <span style={{ color: '#8c786a', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          ({standingSkus.length + roofSkus.length} SKU • {standingLpns.length + roofLpns.length} LPN)
                        </span>
                      </div>
                    </div>

                    {/* Nội dung chi tiết Pallet khi mở rộng (Cấp 3: SKU & LPN) */}
                    {isExpanded && (
                      <div style={{
                        padding: '12px 14px',
                        borderTop: '1px solid #eadcc9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        backgroundColor: '#ffffff'
                      }}>
                        {/* Chi tiết Pallet Đứng */}
                        <div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            color: '#5c3a21',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Package size={13} color="#7b5233" />
                            <span>PALLET ĐỨNG</span>
                          </div>

                          <div style={{
                            backgroundColor: '#faf7f2',
                            borderRadius: '8px',
                            padding: '8px',
                            fontSize: '11px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div>
                              <span style={{ color: '#64748b' }}>Mã SKU ({standingSkus.length}): </span>
                              {standingSkus.length > 0 ? (
                                standingSkus.map((s, idx) => (
                                  <span key={idx} style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: '700',
                                    color: '#9a3412',
                                    backgroundColor: '#ffedd5',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    marginRight: '4px',
                                    display: 'inline-block'
                                  }}>
                                    {s.code} (x{s.count})
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có SKU</span>
                              )}
                            </div>

                            <div>
                              <span style={{ color: '#64748b' }}>Mã LPN ({standingLpns.length}): </span>
                              {standingLpns.length > 0 ? (
                                standingLpns.map((l, idx) => (
                                  <span key={idx} style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: '700',
                                    color: '#1e40af',
                                    backgroundColor: '#dbeafe',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    marginRight: '4px',
                                    display: 'inline-block'
                                  }}>
                                    {l.code} (x{l.count})
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có LPN</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chi tiết Top Nóc */}
                        <div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            color: '#5c3a21',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Layers size={13} color="#7b5233" />
                              <span>TỦ TOP NÓC</span>
                            </div>
                            {(roofSkus.length === 0 && roofLpns.length === 0) ? (
                              <span style={{ fontSize: '9.5px', fontWeight: '700', backgroundColor: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '4px' }}>
                                Không có Tủ Nóc (0 SKU • 0 LPN)
                              </span>
                            ) : (
                              <span style={{ fontSize: '9.5px', fontWeight: '800', backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px' }}>
                                ✓ Đạt (1 SKU x2 • 1 LPN)
                              </span>
                            )}
                          </div>

                          {(roofSkus.length === 0 && roofLpns.length === 0) ? (
                            <div style={{
                              backgroundColor: '#f8fafc',
                              borderRadius: '8px',
                              padding: '7px 10px',
                              border: '1px dashed #cbd5e1',
                              fontSize: '10.5px',
                              color: '#64748b',
                              fontStyle: 'italic',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <CheckCircle2 size={13} color="#16a34a" />
                              <span>Pallet này không có Tủ Nóc — Cả SKU và LPN đều không có (Hợp lệ)</span>
                            </div>
                          ) : (
                            <div style={{
                              backgroundColor: '#faf7f2',
                              borderRadius: '8px',
                              padding: '8px',
                              fontSize: '11px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div>
                                <span style={{ color: '#64748b' }}>Mã SKU ({roofSkus.length === 1 ? `${roofSkus[0]?.count || 1}/2 cái` : `${roofSkus.length} SKU`}): </span>
                                {roofSkus.map((s, idx) => (
                                  <span key={idx} style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: '700',
                                    color: '#15803d',
                                    backgroundColor: '#dcfce7',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    marginRight: '4px',
                                    display: 'inline-block'
                                  }}>
                                    {s.code} (x{s.count})
                                  </span>
                                ))}
                              </div>

                              <div>
                                <span style={{ color: '#64748b' }}>Mã LPN ({roofLpns.length}/1): </span>
                                {roofLpns.map((l, idx) => (
                                  <span key={idx} style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: '700',
                                    color: '#1e40af',
                                    backgroundColor: '#dbeafe',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    marginRight: '4px',
                                    display: 'inline-block'
                                  }}>
                                    {l.code} (x{l.count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Các nút Thao tác cho Pallet (In / Sửa / Xóa) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
                          <div>
                            {isAdmin && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {selectedHistoryContainer.pallets?.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePalletFromHistoryContainer(pIdx)}
                                    style={{
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fee2e2',
                                      color: '#b91c1c',
                                      padding: '5px 9px',
                                      borderRadius: '7px',
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Xóa Pallet này khỏi Container"
                                  >
                                    <Trash2 size={12} />
                                    <span>Xóa Pallet</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPalletModal(pallet, pIdx)}
                                  style={{
                                    border: '1px solid #7b5233',
                                    backgroundColor: '#7b5233',
                                    color: '#ffffff',
                                    padding: '5px 12px',
                                    borderRadius: '7px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(123, 82, 51, 0.2)'
                                  }}
                                  title="Chỉnh sửa mã SKU và LPN trên Pallet này"
                                >
                                  <Edit3 size={12} color="#ffffff" />
                                  <span>Chỉnh sửa Pallet</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const palletPrintRecord = {
                                id: pallet.palletId,
                                tabTitle: `Pallet #${pallet.palletIndex}`,
                                timestamp: pallet.timestamp,
                                inspector: selectedHistoryContainer.inspector || operatorName,
                                skus: [...standingSkus, ...roofSkus],
                                lpns: [...standingLpns, ...roofLpns]
                              };
                              handlePrintThermalTicket(palletPrintRecord);
                            }}
                            style={{
                              border: '1px solid #ebdccb',
                              backgroundColor: '#FAF5EE',
                              color: '#7b5233',
                              padding: '5px 10px',
                              borderRadius: '7px',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Printer size={13} color="#7b5233" />
                            <span>In thẻ Pallet 56mm</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Nút Tiếp Tục Quét Cont Này ở cuối danh sách Pallet */}
              <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #eadcc9' }}>
                <button
                  type="button"
                  onClick={() => handleResumeContainer(selectedHistoryContainer)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#7b5233',
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)'
                  }}
                >
                  <Play size={15} fill="#ffffff" />
                  <span>TIẾP TỤC QUÉT PALLET #{(selectedHistoryContainer.pallets?.length || 0) + 1} CHO CONT NÀY ➔</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal & Confirm Modal */}
      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onConfirm={() => {
          setMessageModal(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => {
          setMessageModal(prev => ({ ...prev, isOpen: false }));
        }}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || 'Xác nhận'}
        cancelText={confirmModal.cancelText || 'Hủy'}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => {
          if (confirmModal.onCancel) confirmModal.onCancel();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </Layout>
  );
};

export default CheckPalletV1View;
