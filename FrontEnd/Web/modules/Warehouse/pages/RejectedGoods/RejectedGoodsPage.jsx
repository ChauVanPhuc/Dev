import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import ExcelJS from 'exceljs';
import warehouseDataService from '../../services/warehouseData.service';
import { RejectedGoodsKPIs } from './components/RejectedGoodsKPIs';
import { RejectedGoodsToolbar } from './components/RejectedGoodsToolbar';
import { RejectedGoodsFilterBar } from './components/RejectedGoodsFilterBar';
import { RejectedGoodsTable } from './components/RejectedGoodsTable';
import { RejectedGoodsCreateModal } from './components/RejectedGoodsCreateModal';
import { RejectedGoodsDetailModal } from './components/RejectedGoodsDetailModal';
import { GoodsReceiptPagination } from '../GoodsReceipt/components/GoodsReceiptPagination';
import { GoodsReceiptDetailModal } from '../GoodsReceipt/components/GoodsReceiptDetailModal';
import { GoodsIssueDetailModal } from '../GoodsIssue/components/GoodsIssueDetailModal';
import '../../styles/rejectedGoods.css';

export const RejectedGoodsPage = () => {
  const { toast } = useToast() || {};
  const { setCustomTitle, setCustomSubtitle } = useOutletContext() || {};

  // Cập nhật tiêu đề PortalLayout
  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Quản lý hàng loại / Hàng trả về');
    if (setCustomSubtitle) setCustomSubtitle('Theo dõi độc lập hàng không đạt tiêu chuẩn QC đầu vào & hàng trả về từ sản xuất');
  }, [setCustomTitle, setCustomSubtitle]);

  // Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [status, setStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const [defectCategory, setDefectCategory] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Phân trang
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Dữ liệu bảng & thống kê
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Modals xem chứng từ gốc
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [viewingIssue, setViewingIssue] = useState(null);

  // Nạp dữ liệu
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseDataService.filterRejectedGoods({
        search,
        warehouse,
        sourceType,
        status,
        resolution,
        defectCategory,
        fromDate,
        toDate,
        page,
        pageSize
      });

      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : []);
      setItems(list);
      setTotalCount(typeof res?.totalCount === 'number' ? res.totalCount : list.length);
      setTotalPages(typeof res?.totalPages === 'number' ? res.totalPages : 1);
      setStats(res?.stats || {});
    } catch (err) {
      setItems([]);
      setTotalCount(0);
      setTotalPages(1);
      setStats({});
      if (toast?.error) toast.error('Lỗi khi tải danh sách hàng loại: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, warehouse, sourceType, status, resolution, defectCategory, fromDate, toDate, page, pageSize, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Đăng ký nhận sự kiện dữ liệu kho thay đổi
  useEffect(() => {
    const unsubscribe = warehouseDataService.subscribe(() => {
      fetchData();
    });
    return () => unsubscribe();
  }, [fetchData]);

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearch('');
    setWarehouse('');
    setSourceType('');
    setStatus('');
    setResolution('');
    setDefectCategory('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // Mở chứng từ gốc
  const handleOpenOriginVoucher = async (originVoucherNo) => {
    if (!originVoucherNo) return;
    if (originVoucherNo.startsWith('PNK')) {
      const receipts = await warehouseDataService.getReceipts();
      const match = receipts.find((r) => r.voucher_no === originVoucherNo);
      if (match) {
        setViewingReceipt(match);
      } else {
        if (toast?.info) toast.info(`Phiếu nhập kho ${originVoucherNo} không tìm thấy.`);
      }
    } else {
      const issues = await warehouseDataService.getIssues();
      const match = issues.find((i) => i.voucher_no === originVoucherNo);
      if (match) {
        setViewingIssue(match);
      } else {
        if (toast?.info) toast.info(`Phiếu xuất kho ${originVoucherNo} không tìm thấy.`);
      }
    }
  };

  // Xuất file Excel
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SmartFlow ERP';
      const sheet = workbook.addWorksheet('Hang_Loai_Tra_Ve', {
        pageSetup: { orientation: 'landscape', paperSize: 9 }
      });

      // Tiêu đề
      sheet.mergeCells('A1:L1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'DANH SÁCH THEO DÕI HÀNG LOẠI & HÀNG TRẢ VỀ';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF7B5233' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 28;

      sheet.mergeCells('A2:L2');
      const subCell = sheet.getCell('A2');
      subCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Tổng số bản ghi: ${items.length}`;
      subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 18;

      // Header bảng
      const headers = [
        'STT',
        'Mã phiếu',
        'Ngày phát sinh',
        'Nguồn phát sinh',
        'Chứng từ gốc',
        'Kho lưu trữ',
        'Mã vật tư',
        'Tên vật tư',
        'SL Loại (ĐVC)',
        'SL Loại (ĐVCĐ)',
        'Lý do lỗi',
        'Hướng xử lý'
      ];
      const headerRow = sheet.getRow(4);
      headerRow.height = 24;
      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2D1A12' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5EDE4' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD5C3B2' } },
          bottom: { style: 'thin', color: { argb: 'FFD5C3B2' } },
          left: { style: 'thin', color: { argb: 'FFD5C3B2' } },
          right: { style: 'thin', color: { argb: 'FFD5C3B2' } }
        };
      });

      // Dữ liệu dòng
      let rIdx = 5;
      items.forEach((item, idx) => {
        const row = sheet.getRow(rIdx);
        row.height = 20;
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = item.voucher_no || '';
        row.getCell(3).value = item.created_date || '';
        row.getCell(4).value = item.source_type === 'QC_INCOMING' ? 'QC đầu vào' : 'Sản xuất trả về';
        row.getCell(5).value = item.origin_voucher_no || '';
        row.getCell(6).value = item.warehouse_name || '';
        row.getCell(7).value = item.item_code || '';
        row.getCell(8).value = item.item_name || '';
        row.getCell(9).value = Number(item.quantity_main) || 0;
        row.getCell(10).value = item.quantity_conv !== null ? Number(item.quantity_conv) : '';
        row.getCell(11).value = item.defect_reason || '';
        row.getCell(12).value =
          item.resolution === 'REUSE'
            ? 'Tái sử dụng'
            : item.resolution === 'SCRAP'
            ? 'Xuất hủy'
            : item.resolution === 'RETURN_VENDOR'
            ? 'Trả NCC'
            : 'Chờ thẩm định';

        // Căn lề
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(9).numFmt = '#,##0.00';
        row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(10).numFmt = '#,##0.00';
        row.getCell(11).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

        for (let c = 1; c <= 12; c++) {
          row.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
          };
        }
        rIdx++;
      });

      sheet.columns = [
        { width: 6 },
        { width: 18 },
        { width: 14 },
        { width: 18 },
        { width: 18 },
        { width: 22 },
        { width: 16 },
        { width: 28 },
        { width: 14 },
        { width: 14 },
        { width: 30 },
        { width: 18 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_Sach_Hang_Loai_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      if (toast?.success) toast.success('Đã xuất file Excel thành công!');
    } catch (err) {
      if (toast?.error) toast.error('Lỗi xuất file Excel: ' + err.message);
    }
  };

  return (
    <div className="rg-master-container">
      {/* 1. KPIs Tổng quan */}
      <RejectedGoodsKPIs stats={stats} />

      {/* 2. Thanh công cụ tìm kiếm và thao tác */}
      <RejectedGoodsToolbar
        search={search}
        setSearch={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onRefresh={fetchData}
        onExportExcel={handleExportExcel}
        onCreate={() => setIsCreateOpen(true)}
        loading={loading}
      />

      {/* 3. Bộ lọc chuyên sâu */}
      <RejectedGoodsFilterBar
        warehouse={warehouse}
        setWarehouse={(val) => {
          setWarehouse(val);
          setPage(1);
        }}
        sourceType={sourceType}
        setSourceType={(val) => {
          setSourceType(val);
          setPage(1);
        }}
        status={status}
        setStatus={(val) => {
          setStatus(val);
          setPage(1);
        }}
        resolution={resolution}
        setResolution={(val) => {
          setResolution(val);
          setPage(1);
        }}
        defectCategory={defectCategory}
        setDefectCategory={(val) => {
          setDefectCategory(val);
          setPage(1);
        }}
        fromDate={fromDate}
        setFromDate={(val) => {
          setFromDate(val);
          setPage(1);
        }}
        toDate={toDate}
        setToDate={(val) => {
          setToDate(val);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* 4. Bảng danh sách hàng loại (12 cột) */}
      <RejectedGoodsTable
        items={items}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onViewDetail={(row) => {
          setSelectedVoucher(row);
          setIsDetailOpen(true);
        }}
        onResolve={(row) => {
          setSelectedVoucher(row);
          setIsDetailOpen(true);
        }}
        onCancel={async (row) => {
          const reason = window.prompt(`Xác nhận hủy phiếu ${row.voucher_no}? Nhập lý do:`, 'Lập sai thông tin');
          if (reason === null) return;
          try {
            await warehouseDataService.cancelRejectedVoucher(row.id, reason);
            if (toast?.success) toast.success(`Đã hủy phiếu ${row.voucher_no}!`);
            fetchData();
          } catch (err) {
            if (toast?.error) toast.error('Lỗi khi hủy phiếu: ' + err.message);
          }
        }}
        onOpenOriginVoucher={handleOpenOriginVoucher}
      />

      {/* 5. Phân trang */}
      <GoodsReceiptPagination
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        itemsLength={items.length}
      />

      {/* 6. Modal Tạo mới phiếu hàng loại */}
      <RejectedGoodsCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(created) => {
          if (toast?.success) toast.success(`Đã tạo thành công phiếu hàng loại ${created.voucher_no}!`);
          fetchData();
        }}
      />

      {/* 7. Modal Chi tiết & Thẩm định */}
      <RejectedGoodsDetailModal
        voucher={selectedVoucher}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedVoucher(null);
        }}
        onUpdated={(updated) => {
          if (toast?.success) toast.success(`Đã cập nhật xử lý cho phiếu ${updated.voucher_no}!`);
          fetchData();
        }}
        onOpenOriginVoucher={handleOpenOriginVoucher}
      />

      {/* 8. Modal xem chứng từ gốc nếu người dùng click liên kết */}
      {viewingReceipt && (
        <GoodsReceiptDetailModal
          isOpen={!!viewingReceipt}
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          onSave={() => setViewingReceipt(null)}
          isEditing={false}
        />
      )}

      {viewingIssue && (
        <GoodsIssueDetailModal
          isOpen={!!viewingIssue}
          issue={viewingIssue}
          onClose={() => setViewingIssue(null)}
          onSave={() => setViewingIssue(null)}
          isEditing={false}
        />
      )}
    </div>
  );
};

export default RejectedGoodsPage;

