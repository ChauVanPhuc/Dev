/**
 * warehouseFifo.service.js
 * Service tính toán tuổi kho theo nguyên tắc FIFO (First In, First Out)
 * và tổng hợp lịch sử giao dịch phiếu nhập / phiếu xuất cho chi tiết vật tư.
 * 
 * Tuân thủ tuyệt đối các nguyên tắc:
 * 1. Nhập trước, xuất trước: Xuất hàng phân bổ cho các lô nhập cũ nhất trước.
 * 2. Tồn cuối kỳ = 0 -> Thời gian tồn = 0 ngày.
 * 3. Xuất hết lô cũ, còn lô mới -> Tuổi tồn tính từ lô cũ nhất CÒN TỒN đến ngày chốt báo cáo.
 * 4. Tồn đầu kỳ từ lô cũ giữ nguyên ngày nhập gốc của lô (không lấy ngày đầu kỳ thay thế).
 * 5. Không đủ lịch sử lô -> Hiển thị "Chưa xác định" (không tự gán 0 ngày).
 * 6. Phiếu nháp / đã hủy bị loại trừ khỏi phép tính tồn kho thực tế.
 */

import { goodsReceiptService } from './goodsReceipt.service.js';
import { goodsIssueService } from './goodsIssue.service.js';
import { warehouseDataService } from './warehouseData.service.js';
import { formatDateVN } from '../types/warehouseInventory.types.js';

// Map chuẩn hóa tên kho <-> mã kho
const WAREHOUSE_CODE_TO_NAME = {
  ALL: 'Tất cả các kho',
  KTP: 'Kho thành phẩm',
  KDG: 'Đóng gói - bao bì',
  KHH: 'Kho hàng hóa',
  KNLC: 'Kho nguyên liệu chính',
  KVT: 'Kho vật tư',
  KSON: 'Kho sơn - dầu màu'
};

const WAREHOUSE_NAME_TO_CODE = {
  'Kho thành phẩm': 'KTP',
  'Đóng gói - bao bì': 'KDG',
  'Kho hàng hóa': 'KHH',
  'Kho nguyên liệu chính': 'KNLC',
  'Kho vật tư': 'KVT',
  'Kho sơn - dầu màu': 'KSON',
  // Tên cũ
  'Kho Nguyên Vật Liệu (NVL)': 'KNLC',
  'Kho Bán Thành Phẩm (BTP)': 'KTP',
  'Kho Thành Phẩm Gỗ (TP)': 'KTP',
  'Kho Sơn & Hóa Chất': 'KSON',
  'Kho Phụ Liệu Cơ Kim Khí': 'KVT',
  'Kho Bao Bì Đóng Gói': 'KDG'
};

export const normalizeWarehouseCode = (input) => {
  if (!input || input === 'ALL') return 'ALL';
  if (WAREHOUSE_CODE_TO_NAME[input]) return input;
  if (WAREHOUSE_NAME_TO_CODE[input]) return WAREHOUSE_NAME_TO_CODE[input];
  return input;
};

export const getWarehouseDisplayName = (codeOrName) => {
  if (!codeOrName || codeOrName === 'ALL') return 'Tất cả các kho';
  const code = normalizeWarehouseCode(codeOrName);
  return WAREHOUSE_CODE_TO_NAME[code] || codeOrName;
};

/**
 * Tính số ngày chênh lệch giữa ngày nhập và ngày chốt
 */
export const calculateDayDifference = (receiptDateStr, asOfDateStr) => {
  if (!receiptDateStr || !asOfDateStr) return null;
  try {
    const rDate = new Date(receiptDateStr.split('T')[0]);
    const cDate = new Date(asOfDateStr.split('T')[0]);
    if (isNaN(rDate.getTime()) || isNaN(cDate.getTime())) return null;

    const diffTime = cDate.getTime() - rDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (e) {
    return null;
  }
};

export const warehouseFifoService = {
  /**
   * Lấy lịch sử phiếu nhập kho của một vật tư cụ thể
   */
  async getReceiptLines({
    itemCode,
    item,
    warehouseCode = 'ALL',
    fromDate = '',
    toDate = ''
  }) {
    const code = itemCode || item?.item_code;
    if (!code) return [];
    const cleanCode = String(code).trim().toLowerCase();
    const targetWhCode = normalizeWarehouseCode(warehouseCode);

    const allReceipts = await goodsReceiptService.getReceipts();
    const matchingLines = [];

    allReceipts.forEach((rcp) => {
      // Bỏ qua phiếu nháp hoặc đã hủy
      if (rcp.status === 'CANCELLED' || rcp.status === 'DRAFT') return;

      // Lọc theo kho nếu có chọn kho cụ thể
      if (targetWhCode !== 'ALL') {
        const rcpWhCode = normalizeWarehouseCode(rcp.warehouse_name);
        if (rcpWhCode !== targetWhCode) return;
      }

      // Lọc theo khoảng thời gian
      const rDate = rcp.receipt_date || rcp.created_at || '';
      if (fromDate && rDate && rDate < fromDate) return;
      if (toDate && rDate && rDate > toDate) return;

      // Tìm các dòng thuộc vật tư này trong phiếu nhập
      if (Array.isArray(rcp.items)) {
        rcp.items.forEach((line, lineIdx) => {
          if (String(line.item_code || '').trim().toLowerCase() === cleanCode) {
            matchingLines.push({
              voucher_id: rcp.id,
              voucher_no: rcp.voucher_no || `PNK-${rcp.id}`,
              line_id: line.id || `${rcp.id}-${lineIdx}`,
              receipt_date: rDate,
              warehouse_name: rcp.warehouse_name,
              warehouse_code: normalizeWarehouseCode(rcp.warehouse_name),
              item_code: line.item_code,
              item_name: line.item_name,
              unit_main: line.unit1 || line.unit || '',
              quantity_main: Number(line.quantity1 !== undefined ? line.quantity1 : (line.quantity || 0)),
              unit_conversion: line.unit2 || '',
              quantity_conversion: line.quantity2 !== undefined ? Number(line.quantity2) : null,
              status: rcp.status || 'COMPLETED',
              rawVoucher: rcp
            });
          }
        });
      }
    });

    // Sắp xếp mặc định theo ngày mới nhất
    matchingLines.sort((a, b) => {
      const cmp = String(b.receipt_date || '').localeCompare(String(a.receipt_date || ''));
      if (cmp !== 0) return cmp;
      return String(b.voucher_no || '').localeCompare(String(a.voucher_no || ''));
    });

    return matchingLines;
  },

  /**
   * Lấy lịch sử phiếu xuất kho của một vật tư cụ thể
   */
  async getIssueLines({
    itemCode,
    item,
    warehouseCode = 'ALL',
    fromDate = '',
    toDate = ''
  }) {
    const code = itemCode || item?.item_code;
    if (!code) return [];
    const cleanCode = String(code).trim().toLowerCase();
    const targetWhCode = normalizeWarehouseCode(warehouseCode);

    const allIssues = await goodsIssueService.getIssues();
    const matchingLines = [];

    allIssues.forEach((iss) => {
      // Bỏ qua phiếu nháp hoặc đã hủy
      if (iss.status === 'CANCELLED' || iss.status === 'DRAFT') return;

      // Lọc theo kho nếu có chọn kho cụ thể
      if (targetWhCode !== 'ALL') {
        const issWhCode = normalizeWarehouseCode(iss.warehouse_name);
        if (issWhCode !== targetWhCode) return;
      }

      // Lọc theo khoảng thời gian
      const iDate = iss.issue_date || iss.created_at || '';
      if (fromDate && iDate && iDate < fromDate) return;
      if (toDate && iDate && iDate > toDate) return;

      // Tìm các dòng thuộc vật tư này trong phiếu xuất
      if (Array.isArray(iss.items)) {
        iss.items.forEach((line, lineIdx) => {
          if (String(line.item_code || '').trim().toLowerCase() === cleanCode) {
            matchingLines.push({
              voucher_id: iss.id,
              voucher_no: iss.voucher_no || `PXK-${iss.id}`,
              line_id: line.id || `${iss.id}-${lineIdx}`,
              issue_date: iDate,
              warehouse_name: iss.warehouse_name,
              warehouse_code: normalizeWarehouseCode(iss.warehouse_name),
              item_code: line.item_code,
              item_name: line.item_name,
              unit_main: line.unit || '',
              quantity_main: Number(line.quantity || 0),
              unit_conversion: line.unit2 || '',
              quantity_conversion: line.quantity2 !== undefined ? Number(line.quantity2) : null,
              status: iss.status || 'COMPLETED',
              rawVoucher: iss
            });
          }
        });
      }
    });

    // Sắp xếp mặc định theo ngày mới nhất
    matchingLines.sort((a, b) => {
      const cmp = String(b.issue_date || '').localeCompare(String(a.issue_date || ''));
      if (cmp !== 0) return cmp;
      return String(b.voucher_no || '').localeCompare(String(a.voucher_no || ''));
    });

    return matchingLines;
  },

  /**
   * Tính toán phân bổ FIFO và xác định tuổi tồn kho
   * @param {Object} params
   * @param {Object} params.item - Thông tin vật tư
   * @param {string} params.warehouseCode - Kho cần lọc ('ALL' hoặc mã kho cụ thể)
   * @param {string} params.asOfDate - Ngày chốt báo cáo (YYYY-MM-DD)
   * @param {string} params.fromDate - Từ ngày (nếu xem theo kỳ)
   */
  async calculateFifoOverview({
    item,
    warehouseCode = 'ALL',
    asOfDate = '',
    fromDate = ''
  }) {
    if (!item) return null;

    // Ngày chốt báo cáo: nếu không truyền thì lấy ngày hiện tại (múi giờ địa phương)
    const closingDate = asOfDate || new Date().toISOString().split('T')[0];
    const targetWhCode = (warehouseCode === 'ALL' || !warehouseCode) && item.warehouse_code
      ? normalizeWarehouseCode(item.warehouse_code)
      : normalizeWarehouseCode(warehouseCode);

    // 1. Thu thập tất cả các lô nhập (Incoming Batches)
    // Bao gồm:
    // a. Tồn đầu kỳ (nếu có): coi như một lớp tồn có nguồn gốc xác định
    // b. Các phiếu nhập kho hợp lệ tính đến ngày chốt
    const batches = [];
    const conversionRate = Number(item.conversion_rate) || 1;

    // A. Lớp tồn đầu kỳ
    const openingMain = Number(item.opening_main) || 0;
    if (openingMain > 0) {
      // Kiểm tra xem tồn đầu kỳ có ngày nhập gốc tin cậy không
      // Trường hợp 5: nếu item.has_unreliable_opening === true hoặc không có ngày nhập gốc
      const isUnreliable = !!item.has_unreliable_opening;
      const initialDate = item.initial_receipt_date || item.last_receipt_date || null;

      batches.push({
        id: `batch-opening-${item.id || item.item_code}`,
        voucher_no: 'Tồn đầu kỳ',
        receipt_date: isUnreliable ? null : initialDate,
        has_reliable_date: !isUnreliable && !!initialDate,
        quantity_in: openingMain,
        quantity_conv_in: Number(item.opening_conv) || (openingMain * conversionRate),
        allocated_out: 0,
        remaining_qty: openingMain,
        remaining_conv: Number(item.opening_conv) || (openingMain * conversionRate),
        days_in_inventory: 0,
        is_opening: true
      });
    }

    // B. Lấy các phiếu nhập thực tế
    const receiptLines = await this.getReceiptLines({
      itemCode: item.item_code,
      warehouseCode: targetWhCode,
      fromDate: fromDate || '',
      toDate: closingDate
    });

    // Thêm các dòng nhập thực tế vào danh sách lô
    // Lưu ý: Đảo ngược từ newest-first sang oldest-first để phân bổ FIFO
    receiptLines.slice().reverse().forEach((r, idx) => {
      const qMain = Number(r.quantity_main) || 0;
      const qConv = r.quantity_conversion !== null
        ? Number(r.quantity_conversion)
        : Math.round(qMain * conversionRate * 100) / 100;

      batches.push({
        id: `batch-rcp-${r.voucher_id}-${idx}`,
        voucher_no: r.voucher_no,
        voucher_id: r.voucher_id,
        receipt_date: r.receipt_date,
        has_reliable_date: !!r.receipt_date,
        quantity_in: qMain,
        quantity_conv_in: qConv,
        allocated_out: 0,
        remaining_qty: qMain,
        remaining_conv: qConv,
        days_in_inventory: 0,
        is_opening: false
      });
    });

    // 2. Thu thập tổng số lượng xuất phát sinh đến ngày chốt
    const issueLines = await this.getIssueLines({
      itemCode: item.item_code,
      warehouseCode: targetWhCode,
      fromDate: fromDate || '',
      toDate: closingDate
    });

    let totalOutMain = issueLines.reduce((sum, line) => sum + (Number(line.quantity_main) || 0), 0);

    // Nếu không có phiếu xuất phát sinh trong bảng phiếu nhưng item có out_main (từ XNT)
    // thì đảm bảo tổng lượng xuất phản ánh đầy đủ nghiệp vụ
    if (totalOutMain === 0 && Number(item.out_main) > 0) {
      totalOutMain = Number(item.out_main);
    }

    // 3. Phân bổ FIFO: Nhập trước, xuất trước
    // Sắp xếp các lô theo thứ tự thời gian tăng dần (cũ nhất đứng trước)
    // Tuyệt đối không dùng ngày giả định của dòng tồn đầu kỳ đè lên các lô nhập gốc
    batches.sort((a, b) => {
      const dateA = a.receipt_date || (a.is_opening ? '1970-01-01' : '9999-99-99');
      const dateB = b.receipt_date || (b.is_opening ? '1970-01-01' : '9999-99-99');
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      if (a.is_opening && !b.is_opening) return -1;
      if (!a.is_opening && b.is_opening) return 1;
      return String(a.voucher_no || '').localeCompare(String(b.voucher_no || ''));
    });

    let remainingToAllocate = totalOutMain;

    batches.forEach((batch) => {
      if (remainingToAllocate <= 0) {
        batch.allocated_out = 0;
        batch.remaining_qty = batch.quantity_in;
      } else if (remainingToAllocate >= batch.quantity_in) {
        batch.allocated_out = batch.quantity_in;
        batch.remaining_qty = 0;
        remainingToAllocate -= batch.quantity_in;
      } else {
        batch.allocated_out = remainingToAllocate;
        batch.remaining_qty = Math.round((batch.quantity_in - remainingToAllocate) * 1000) / 1000;
        remainingToAllocate = 0;
      }

      // Tính số lượng tồn ĐVCĐ theo tỷ lệ còn lại
      batch.remaining_conv = Math.round(batch.remaining_qty * conversionRate * 100) / 100;

      // Tính số ngày tồn cho từng lô
      if (batch.remaining_qty <= 0) {
        batch.days_in_inventory = 0;
      } else {
        if (!batch.has_reliable_date || !batch.receipt_date) {
          batch.days_in_inventory = null; // Chưa xác định
        } else {
          const diffDays = calculateDayDifference(batch.receipt_date, closingDate);
          batch.days_in_inventory = diffDays !== null ? diffDays : null;
        }
      }
    });

    // 4. Tính toán kết quả tổng hợp
    const totalRemaining = batches.reduce((sum, b) => sum + b.remaining_qty, 0);
    const totalRemainingConv = Math.round(totalRemaining * conversionRate * 100) / 100;

    let finalInventoryDays = 0;

    if (totalRemaining <= 0) {
      // Trường hợp 1: Tồn cuối kỳ = 0 -> luôn hiển thị 0 ngày
      finalInventoryDays = 0;
    } else {
      // Tìm lô cũ nhất thực sự CÒN TỒN (lô đầu tiên có remaining_qty > 0)
      const oldestRemainingBatch = batches.find((b) => b.remaining_qty > 0);

      if (oldestRemainingBatch) {
        if (oldestRemainingBatch.days_in_inventory === null) {
          // Trường hợp 5: Không đủ dữ liệu lịch sử lô tin cậy -> hiển thị 'Chưa xác định'
          finalInventoryDays = 'Chưa xác định';
        } else {
          // Trường hợp 2 & 3: Tuổi tồn là số ngày của lô cũ nhất thực sự còn tồn
          finalInventoryDays = oldestRemainingBatch.days_in_inventory;
        }
      }
    }

    // Tổng nhập trong kỳ từ các phiếu nhập
    const totalInMain = batches.filter((b) => !b.is_opening).reduce((sum, b) => sum + b.quantity_in, 0);
    const totalInConv = Math.round(totalInMain * conversionRate * 100) / 100;
    const totalOutConv = Math.round(totalOutMain * conversionRate * 100) / 100;

    return {
      item,
      warehouseCode: targetWhCode,
      warehouseName: getWarehouseDisplayName(targetWhCode),
      closingDate,
      closingDateVN: formatDateVN(closingDate),
      // Bảng XNT
      opening_main: openingMain,
      opening_conv: Number(item.opening_conv) || (openingMain * conversionRate),
      in_main: totalInMain || Number(item.in_main || 0),
      in_conv: totalInConv || Number(item.in_conv || 0),
      out_main: totalOutMain || Number(item.out_main || 0),
      out_conv: totalOutConv || Number(item.out_conv || 0),
      closing_main: totalRemaining > 0 ? totalRemaining : Math.max(0, (openingMain + (totalInMain || Number(item.in_main || 0)) - (totalOutMain || Number(item.out_main || 0)))),
      closing_conv: totalRemainingConv > 0 ? totalRemainingConv : Math.max(0, (Number(item.opening_conv || 0) + (totalInConv || Number(item.in_conv || 0)) - (totalOutConv || Number(item.out_conv || 0)))),
      return_main: Number(item.return_main || 0),
      return_conv: Number(item.return_conv || 0),
      inventory_days: finalInventoryDays,
      // Lô FIFO chi tiết (nếu cần tra cứu ngầm)
      batches
    };
  },

  /**
   * Tổng hợp lịch sử biến động tồn kho (Stock Movement Ledger)
   * Hiển thị các giao dịch nhập / xuất / hàng loại / trả về và tồn sau giao dịch theo trình tự thời gian
   */
  async getInventoryLedger({
    item,
    warehouseCode = 'ALL',
    fromDate = '',
    toDate = ''
  }) {
    if (!item) return { rows: [], totalIn: 0, totalOut: 0, totalReturn: 0, finalBalance: 0 };

    const targetWhCode = (warehouseCode === 'ALL' || !warehouseCode) && item.warehouse_code
      ? normalizeWarehouseCode(item.warehouse_code)
      : normalizeWarehouseCode(warehouseCode);
    const closingDate = toDate || new Date().toISOString().split('T')[0];

    // 1. Lấy tất cả phiếu nhập và phiếu xuất trong phạm vi lọc
    const [rcps, isss] = await Promise.all([
      this.getReceiptLines({
        itemCode: item.item_code,
        warehouseCode: targetWhCode,
        fromDate,
        toDate: closingDate
      }),
      this.getIssueLines({
        itemCode: item.item_code,
        warehouseCode: targetWhCode,
        fromDate,
        toDate: closingDate
      })
    ]);

    // 1b. Lấy các phiếu hàng loại / trả về liên quan đến vật tư và kho này
    const allRejected = await warehouseDataService.fetchRejectedGoods();
    const cleanItemCode = String(item.item_code).trim().toLowerCase();
    const relevantRejected = allRejected.filter((rg) => {
      if (rg.status === 'CANCELLED') return false;
      if (String(rg.item_code).trim().toLowerCase() !== cleanItemCode) return false;
      if (targetWhCode !== 'ALL' && normalizeWarehouseCode(rg.warehouse_name) !== targetWhCode) return false;
      const rDate = rg.created_date || '';
      if (fromDate && rDate && rDate < fromDate) return false;
      if (closingDate && rDate && rDate > closingDate) return false;
      return true;
    });

    const qcRejectMapByOrigin = {};
    relevantRejected.forEach((rg) => {
      // Chỉ trừ số lượng QC khỏi phiếu nhập nếu phiếu QC đó đã ghi sổ chính thức (không phải demo chưa ghi sổ)
      if (rg.source_type === 'QC_INCOMING' && !rg.is_demo && !rg.isDemo && rg.status !== 'DRAFT') {
        qcRejectMapByOrigin[rg.origin_voucher_id] = (qcRejectMapByOrigin[rg.origin_voucher_id] || 0) + Number(rg.quantity_main || 0);
      }
    });

    // 2. Chuyển đổi thành các dòng giao dịch chuẩn
    const transactions = [];

    rcps.forEach((r) => {
      const rawQty = Number(r.quantity_main || 0);
      const qcRejectQty = qcRejectMapByOrigin[r.voucher_id] || 0;
      const usableQty = Math.max(0, rawQty - qcRejectQty);

      transactions.push({
        id: `tx-rcp-${r.line_id}`,
        voucher_id: r.voucher_id,
        voucher_no: r.voucher_no,
        date: r.receipt_date,
        type: 'IN',
        description: qcRejectQty > 0
          ? `${r.rawVoucher?.content || r.rawVoucher?.receipt_type || 'Nhập kho'} (Đạt QC: ${usableQty}/${rawQty})`
          : (r.rawVoucher?.content || r.rawVoucher?.receipt_type || 'Nhập kho'),
        warehouse_name: r.warehouse_name,
        qty_in: usableQty,
        qty_out: 0,
        qty_return: 0,
        qty_in_conv: r.quantity_conversion,
        qty_out_conv: null,
        status: r.status,
        affectsBalance: true
      });
    });

    isss.forEach((i) => {
      transactions.push({
        id: `tx-iss-${i.line_id}`,
        voucher_id: i.voucher_id,
        voucher_no: i.voucher_no,
        date: i.issue_date,
        type: 'OUT',
        description: i.rawVoucher?.content || i.rawVoucher?.issue_type || 'Xuất kho',
        warehouse_name: i.warehouse_name,
        qty_in: 0,
        qty_out: Number(i.quantity_main || 0),
        qty_return: 0,
        qty_in_conv: null,
        qty_out_conv: i.quantity_conversion,
        status: i.status,
        affectsBalance: true
      });
    });

    // Thêm các chứng từ hàng loại / trả về vào sổ kho
    relevantRejected.forEach((rg) => {
      const q = Number(rg.quantity_main || 0);
      const isDemoTag = (rg.is_demo || rg.isDemo) ? ' [Demo - Chưa ghi sổ]' : '';
      if (rg.source_type === 'QC_INCOMING') {
        transactions.push({
          id: `tx-rej-qc-${rg.id}`,
          voucher_id: rg.id,
          voucher_no: rg.voucher_no,
          origin_voucher_no: rg.origin_voucher_no,
          date: rg.created_date,
          type: 'QC_REJECT',
          description: `QC đầu vào: ${rg.defect_reason} (Phiếu gốc: ${rg.origin_voucher_no})${isDemoTag}`,
          warehouse_name: rg.warehouse_name,
          qty_in: 0,
          qty_out: 0,
          qty_return: q,
          status: rg.status,
          affectsBalance: false
        });
      } else if (rg.source_type === 'PROD_RETURN') {
        transactions.push({
          id: `tx-rej-prod-${rg.id}`,
          voucher_id: rg.id,
          voucher_no: rg.voucher_no,
          origin_voucher_no: rg.origin_voucher_no,
          date: rg.created_date,
          type: 'PROD_RETURN',
          description: `Sản xuất trả về: ${rg.defect_reason} (Phiếu xuất gốc: ${rg.origin_voucher_no})${isDemoTag}`,
          warehouse_name: rg.warehouse_name,
          qty_in: 0,
          qty_out: 0,
          qty_return: q,
          status: rg.status,
          affectsBalance: false
        });
      }

      // Nếu phiếu được phê duyệt tái sử dụng -> tăng tồn kho khả dụng
      if (rg.status === 'RESOLVED' && rg.resolution === 'REUSE') {
        const reuseDate = rg.resolution_date || rg.created_date;
        transactions.push({
          id: `tx-reuse-${rg.id}`,
          voucher_id: rg.id,
          voucher_no: `QD-TSD-${rg.voucher_no}`,
          origin_voucher_no: rg.voucher_no,
          date: reuseDate,
          type: 'REUSE',
          description: `Phê duyệt tái sử dụng từ ${rg.voucher_no}: ${rg.resolution_notes || 'Nhập lại kho khả dụng'}`,
          warehouse_name: rg.warehouse_name,
          qty_in: q,
          qty_out: 0,
          qty_return: 0,
          status: 'COMPLETED',
          affectsBalance: true
        });
      }
    });

    // 3. Sắp xếp theo trình tự thời gian tăng dần (cũ nhất -> mới nhất)
    transactions.sort((a, b) => {
      const cmpDate = String(a.date || '').localeCompare(String(b.date || ''));
      if (cmpDate !== 0) return cmpDate;
      // Cùng ngày: Nhập kho trước -> QC Reject -> Xuất kho -> Prod Return -> Reuse
      const priority = { IN: 1, QC_REJECT: 2, OUT: 3, PROD_RETURN: 4, REUSE: 5 };
      const pA = priority[a.type] || 9;
      const pB = priority[b.type] || 9;
      if (pA !== pB) return pA - pB;
      return String(a.voucher_no || '').localeCompare(String(b.voucher_no || ''));
    });

    // 4. Tính toán lũy kế tồn sau giao dịch
    const openingStock = Number(item.opening_main || 0);
    let runningBalance = openingStock;
    let totalIn = 0;
    let totalOut = 0;
    let totalReturn = 0;

    const rows = [];

    // Dòng tồn đầu kỳ nếu kỳ bắt đầu khi đã có tồn kho
    if (openingStock > 0 || !fromDate) {
      rows.push({
        stt: '—',
        is_opening: true,
        date: fromDate ? fromDate : (item.initial_receipt_date || '—'),
        voucher_no: '—',
        description: 'Số dư tồn đầu kỳ',
        qty_in: null,
        qty_out: null,
        qty_return: null,
        balance: openingStock
      });
    }

    transactions.forEach((tx, idx) => {
      totalIn += (tx.qty_in || 0);
      totalOut += (tx.qty_out || 0);
      totalReturn += (tx.qty_return || 0);
      if (tx.affectsBalance) {
        runningBalance = Math.round((runningBalance + (tx.qty_in || 0) - (tx.qty_out || 0)) * 1000) / 1000;
      }

      rows.push({
        ...tx,
        stt: idx + 1,
        is_opening: false,
        balance: runningBalance
      });
    });

    // Nếu không có phiếu thực tế nhưng item có in_main hoặc out_main từ XNT
    if (transactions.length === 0 && (Number(item.in_main) > 0 || Number(item.out_main) > 0)) {
      if (Number(item.in_main) > 0) {
        totalIn += Number(item.in_main);
        runningBalance += Number(item.in_main);
        rows.push({
          stt: rows.length + 1,
          is_opening: false,
          date: item.last_receipt_date || fromDate || closingDate,
          voucher_no: 'PNK-TỔNG-HỢP',
          description: 'Tổng nhập phát sinh trong kỳ',
          qty_in: Number(item.in_main),
          qty_out: 0,
          qty_return: 0,
          balance: runningBalance
        });
      }
      if (Number(item.out_main) > 0) {
        totalOut += Number(item.out_main);
        runningBalance -= Number(item.out_main);
        rows.push({
          stt: rows.length + 1,
          is_opening: false,
          date: item.last_issue_date || toDate || closingDate,
          voucher_no: 'PXK-TỔNG-HỢP',
          description: 'Tổng xuất phát sinh trong kỳ',
          qty_in: 0,
          qty_out: Number(item.out_main),
          qty_return: 0,
          balance: runningBalance
        });
      }
    }

    const finalClosing = Number(item.closing_main !== undefined ? item.closing_main : runningBalance);

    return {
      rows,
      openingStock,
      totalIn: Math.round(totalIn * 1000) / 1000,
      totalOut: Math.round(totalOut * 1000) / 1000,
      totalReturn: Math.round(totalReturn * 1000) / 1000,
      finalBalance: Math.round(runningBalance * 1000) / 1000,
      closingExpected: finalClosing
    };
  }
};

export default warehouseFifoService;
