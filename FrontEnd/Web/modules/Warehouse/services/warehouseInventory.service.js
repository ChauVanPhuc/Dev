/**
 * warehouseInventory.service.js
 * Service quản lý dữ liệu Báo cáo Xuất - Nhập - Tồn (XNT) cho phân hệ Quản lý kho
 * Kết nối trực tiếp với Single Source of Truth: warehouseDataService
 * 
 * Đảm bảo các nguyên tắc nghiệp vụ cốt lõi:
 * 1. Công thức bảo toàn: Tồn cuối kỳ = Tồn đầu kỳ + Nhập trong kỳ - Xuất trong kỳ.
 * 2. Độc lập theo từng kho, từng mã vật tư và từng đơn vị (ĐVC, ĐVCĐ).
 * 3. Không cộng gộp số lượng của các vật tư có đơn vị tính khác nhau.
 * 4. Tính toán dòng Tổng cộng trên toàn bộ kết quả lọc, không chỉ trang hiện tại.
 * 5. Xuất Excel thật với cấu trúc 2 cấp header, định dạng số chuẩn xác bằng thư viện exceljs.
 */

import ExcelJS from 'exceljs';
import { formatDateVN } from '../types/warehouseInventory.types.js';
import { warehouseDataService } from './warehouseData.service.js';

export const warehouseInventoryService = {
  /**
   * Lấy toàn bộ danh sách dữ liệu kho từ Single Source of Truth
   */
  async getRawItems(params = {}) {
    return warehouseDataService.getRawItems(params);
  },

  /**
   * Lấy danh sách vật tư theo bộ lọc, tính toán KPI và dòng tổng cộng
   */
  async getInventoryReport(params = {}) {
    return warehouseDataService.getInventoryReport(params);
  },

  /**
   * Đếm số lượng mã vật tư theo từng kho để hiển thị badge trên các Tab kho
   */
  async getWarehouseCounts() {
    return warehouseDataService.getWarehouseCounts();
  },

  /**
   * Lấy chi tiết 1 vật tư theo mã vật tư và kho
   */
  async getMaterialByCode(itemCode, warehouseCode = 'ALL') {
    return warehouseDataService.getMaterialByCode(itemCode, warehouseCode);
  },

  /**
   * Xuất Excel chuyên nghiệp bằng thư viện ExcelJS
   * Định dạng 2 cấp header, định dạng phân cách hàng nghìn và border rõ ràng
   */
  async exportToExcel({ items = [], warehouseName = 'Tất cả các kho', fromDate = '', toDate = '', totals = {} }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartFlow ERP';
    workbook.lastModifiedBy = 'SmartFlow ERP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Xuat_Nhap_Ton', {
      pageSetup: { orientation: 'landscape', paperSize: 9 }
    });

    // 1. Tiêu đề báo cáo
    sheet.mergeCells('A1:P1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO TỔNG HỢP XUẤT - NHẬP - TỒN KHO';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF7B5233' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // 2. Phạm vi kho và thời gian
    sheet.mergeCells('A2:P2');
    const subCell = sheet.getCell('A2');
    const dateRangeStr = fromDate || toDate
      ? `Từ ngày: ${fromDate ? formatDateVN(fromDate) : '...'} đến ngày: ${toDate ? formatDateVN(toDate) : '...'}`
      : 'Toàn bộ kỳ theo dõi hiện tại';
    subCell.value = `Kho: ${warehouseName.toUpperCase()}  |  ${dateRangeStr}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // 3. Header 2 cấp (Hàng 4 & Hàng 5)
    sheet.getRow(3).height = 10; // Khoảng trống

    // Hàng 4: Cấp 1
    sheet.mergeCells('A4:A5'); sheet.getCell('A4').value = 'STT';
    sheet.mergeCells('B4:B5'); sheet.getCell('B4').value = 'Mã vật tư';
    sheet.mergeCells('C4:C5'); sheet.getCell('C4').value = 'Tên vật tư / Goods';
    sheet.mergeCells('D4:E4'); sheet.getCell('D4').value = 'ĐVT / Unit';
    sheet.mergeCells('F4:G4'); sheet.getCell('F4').value = 'Tồn đầu kỳ';
    sheet.mergeCells('H4:I4'); sheet.getCell('H4').value = 'Nhập trong kỳ';
    sheet.mergeCells('J4:K4'); sheet.getCell('J4').value = 'Xuất trong kỳ';
    sheet.mergeCells('L4:M4'); sheet.getCell('L4').value = 'Tồn cuối kỳ';
    sheet.mergeCells('N4:O4'); sheet.getCell('N4').value = 'Hàng trả về';
    sheet.mergeCells('P4:P5'); sheet.getCell('P4').value = 'Thời gian tồn (Ngày)';

    // Hàng 5: Cấp 2
    sheet.getCell('D5').value = 'ĐVC';
    sheet.getCell('E5').value = 'ĐVCĐ';
    sheet.getCell('F5').value = 'ĐVC';
    sheet.getCell('G5').value = 'ĐVCĐ';
    sheet.getCell('H5').value = 'ĐVC';
    sheet.getCell('I5').value = 'ĐVCĐ';
    sheet.getCell('J5').value = 'ĐVC';
    sheet.getCell('K5').value = 'ĐVCĐ';
    sheet.getCell('L5').value = 'ĐVC';
    sheet.getCell('M5').value = 'ĐVCĐ';
    sheet.getCell('N5').value = 'ĐVC';
    sheet.getCell('O5').value = 'ĐVCĐ';

    // Style Header
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5EDE4' } // Nền ấm sang trọng
    };
    const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2D1A12' } };
    const borderThin = {
      top: { style: 'thin', color: { argb: 'FFD5C3B2' } },
      left: { style: 'thin', color: { argb: 'FFD5C3B2' } },
      bottom: { style: 'thin', color: { argb: 'FFD5C3B2' } },
      right: { style: 'thin', color: { argb: 'FFD5C3B2' } }
    };

    ['A4', 'B4', 'C4', 'D4', 'F4', 'H4', 'J4', 'L4', 'N4', 'P4', 'D5', 'E5', 'F5', 'G5', 'H5', 'I5', 'J5', 'K5', 'L5', 'M5', 'N5', 'O5'].forEach((addr) => {
      const cell = sheet.getCell(addr);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    // Thêm border cho toàn bộ vùng header A4:P5
    for (let r = 4; r <= 5; r++) {
      sheet.getRow(r).height = 22;
      for (let c = 1; c <= 16; c++) {
        sheet.getRow(r).getCell(c).border = borderThin;
      }
    }

    // 4. Đổ dữ liệu các dòng
    let currentRowIdx = 6;
    items.forEach((item, idx) => {
      const row = sheet.getRow(currentRowIdx);
      row.height = 20;

      row.getCell(1).value = idx + 1; // STT
      row.getCell(2).value = item.item_code || '';
      row.getCell(3).value = item.item_name || '';
      row.getCell(4).value = item.unit_main || '';
      row.getCell(5).value = item.unit_conversion || '';

      row.getCell(6).value = Number(item.opening_main) || 0;
      row.getCell(7).value = Number(item.opening_conv) || 0;
      row.getCell(8).value = Number(item.in_main) || 0;
      row.getCell(9).value = Number(item.in_conv) || 0;
      row.getCell(10).value = Number(item.out_main) || 0;
      row.getCell(11).value = Number(item.out_conv) || 0;
      row.getCell(12).value = Number(item.closing_main) || 0;
      row.getCell(13).value = Number(item.closing_conv) || 0;
      row.getCell(14).value = Number(item.return_main) || 0;
      row.getCell(15).value = Number(item.return_conv) || 0;
      row.getCell(16).value = Number(item.inventory_days) || 0;

      // Định dạng số và căn lề
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      for (let c = 6; c <= 15; c++) {
        const numCell = row.getCell(c);
        numCell.numFmt = '#,##0.00';
        numCell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      row.getCell(16).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(16).numFmt = '#,##0';

      for (let c = 1; c <= 16; c++) {
        row.getCell(c).border = borderThin;
      }

      currentRowIdx++;
    });

    // 5. Dòng Tổng cộng
    const totalRow = sheet.getRow(currentRowIdx);
    totalRow.height = 24;
    sheet.mergeCells(`A${currentRowIdx}:C${currentRowIdx}`);
    const totalLabelCell = totalRow.getCell(1);
    totalLabelCell.value = `TỔNG CỘNG (${items.length} mã vật tư)`;
    totalLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2D1A12' } };
    totalLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };

    totalRow.getCell(4).value = totals?.unit_main_label || 'Đa đơn vị';
    totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(4).font = { bold: true };

    totalRow.getCell(5).value = totals?.unit_conversion_label || '—';
    totalRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    const colKeys = [
      'opening_main',
      'opening_conv',
      'in_main',
      'in_conv',
      'out_main',
      'out_conv',
      'closing_main',
      'closing_conv',
      'return_main',
      'return_conv'
    ];

    colKeys.forEach((key, kIdx) => {
      const colCell = totalRow.getCell(6 + kIdx);
      const summary = totals[key];
      if (summary && summary.status === 'single' && summary.sum !== null) {
        colCell.value = Number(summary.sum);
        colCell.numFmt = '#,##0.00';
        colCell.alignment = { horizontal: 'right', vertical: 'middle' };
        colCell.font = { bold: true };
      } else {
        colCell.value = '—';
        colCell.alignment = { horizontal: 'center', vertical: 'middle' };
        colCell.font = { color: { argb: 'FF8D6E63' } };
      }
    });

    // Thời gian tồn không cộng
    totalRow.getCell(16).value = '—';
    totalRow.getCell(16).alignment = { horizontal: 'center', vertical: 'middle' };

    // Fill nền dòng tổng cộng
    for (let c = 1; c <= 16; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEADCC9' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF7B5233' } },
        bottom: { style: 'double', color: { argb: 'FF7B5233' } },
        left: { style: 'thin', color: { argb: 'FFD5C3B2' } },
        right: { style: 'thin', color: { argb: 'FFD5C3B2' } }
      };
    }

    // Tự căn chỉnh chiều rộng cột
    sheet.columns = [
      { width: 7 },   // STT
      { width: 18 },  // Mã vật tư
      { width: 34 },  // Tên vật tư
      { width: 10 },  // ĐVC
      { width: 10 },  // ĐVCĐ
      { width: 14 },  // Tồn đầu ĐVC
      { width: 14 },  // Tồn đầu ĐVCĐ
      { width: 14 },  // Nhập ĐVC
      { width: 14 },  // Nhập ĐVCĐ
      { width: 14 },  // Xuất ĐVC
      { width: 14 },  // Xuất ĐVCĐ
      { width: 15 },  // Tồn cuối ĐVC
      { width: 15 },  // Tồn cuối ĐVCĐ
      { width: 14 },  // Hàng trả về ĐVC
      { width: 14 },  // Hàng trả về ĐVCĐ
      { width: 16 }   // Thời gian tồn
    ];

    // Tạo file và kích hoạt tải về trình duyệt
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    anchor.download = `Bao_Cao_XNT_${dateStamp}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
};

export default warehouseInventoryService;
