// GoodsReceiptImportModal.jsx - Modal Nhập danh sách Phiếu Nhập Kho từ file Excel thật (XLSX)
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { warehouseDataService } from '../../../services/warehouseData.service';

export const GoodsReceiptImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const parseExcelFile = async (file) => {
    setErrorMsg('');
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        setErrorMsg('Tệp Excel không chứa dòng dữ liệu nào.');
        setPreviewRows([]);
        return;
      }

      // Gom nhóm các dòng có cùng Mã phiếu thành 1 chứng từ hoàn chỉnh
      const groupedMap = new Map();
      const todayStr = new Date().toISOString().split('T')[0];

      rawRows.forEach((row, idx) => {
        const voucherNo = String(row['Mã phiếu'] || row['voucher_no'] || `PNK-IMP-${idx + 1}`).trim();
        const whName = String(row['Kho nhập'] || row['Tên kho'] || row['warehouse_name'] || 'Kho nguyên liệu chính').trim();
        let receiptDate = row['Ngày nhập kho'] || row['Ngày nhập kho (YYYY-MM-DD)'] || row['receipt_date'] || todayStr;
        if (receiptDate instanceof Date) {
          receiptDate = receiptDate.toISOString().split('T')[0];
        } else {
          receiptDate = String(receiptDate).trim().split('T')[0] || todayStr;
        }

        const itemCode = String(row['Mã mặt hàng'] || row['Mã vật tư'] || row['item_code'] || '').trim();
        const itemName = String(row['Tên mặt hàng'] || row['Tên vật tư'] || row['item_name'] || itemCode).trim();
        const unit1 = String(row['ĐVT1'] || row['ĐVT'] || row['unit1'] || 'Cái').trim();
        const qty1 = Number(row['SL nhập 1'] || row['Số lượng'] || row['quantity1'] || 0);
        const unit2 = String(row['ĐVT2'] || row['unit2'] || '').trim();
        const qty2 = Number(row['SL nhập 2'] || row['quantity2'] || 0);

        if (!itemCode || isNaN(qty1) || qty1 <= 0) {
          return;
        }

        if (!groupedMap.has(voucherNo)) {
          groupedMap.set(voucherNo, {
            voucher_no: voucherNo,
            warehouse_name: whName,
            receipt_date: receiptDate,
            deliverer_name: String(row['Người bàn giao'] || row['deliverer_name'] || '').trim(),
            customer_code: String(row['Mã khách'] || row['customer_code'] || '').trim(),
            customer_name: String(row['Tên khách'] || row['Khách hàng/NCC'] || row['customer_name'] || '').trim(),
            department_name: String(row['Bộ phận'] || row['department_name'] || '').trim(),
            content: String(row['Nội dung'] || row['content'] || '').trim(),
            receipt_type: String(row['Loại phiếu'] || row['receipt_type'] || 'Nhập mua hàng').trim(),
            status: 'COMPLETED',
            ctgs: String(row['CTGS'] || row['ctgs'] || '').trim(),
            items: [],
            total_quantity: 0
          });
        }

        const voucher = groupedMap.get(voucherNo);
        voucher.items.push({
          line_no: voucher.items.length + 1,
          item_code: itemCode,
          item_name: itemName,
          unit1,
          quantity1: qty1,
          unit2,
          quantity2: qty2 || qty1,
          lsx: String(row['LSX'] || row['lsx'] || '').trim(),
          notes: String(row['Ghi chú'] || row['notes'] || '').trim()
        });
        voucher.total_quantity += qty1;
      });

      const vouchers = Array.from(groupedMap.values());
      if (vouchers.length === 0) {
        setErrorMsg('Không tìm thấy dòng mặt hàng hợp lệ (yêu cầu cột "Mã mặt hàng" và "SL nhập 1" > 0).');
      }
      setPreviewRows(vouchers);
    } catch (err) {
      console.error('[GoodsReceiptImportModal] Lỗi đọc Excel:', err);
      setErrorMsg('Không thể đọc tệp Excel: ' + (err.message || 'Định dạng không hợp lệ'));
      setPreviewRows([]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      parseExcelFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Mã phiếu': 'PNK-2604-001',
        'Kho nhập': 'Kho nguyên liệu chính',
        'Ngày nhập kho (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
        'Người bàn giao': 'Trần Văn Hải',
        'Mã khách': 'NCC-GO01',
        'Tên khách': 'Công ty Gỗ An Cường',
        'Bộ phận': 'Phòng Cung Ứng Vật Tư',
        'Nội dung': 'Nhập ván MDF chống ẩm E1',
        'Loại phiếu': 'Nhập mua hàng',
        'CTGS': 'CTGS-1112',
        'Mã mặt hàng': 'BOARD-MDF-01',
        'Tên mặt hàng': 'Ván MDF chống ẩm E1 18mm (1220x2440)',
        'ĐVT1': 'Tấm',
        'SL nhập 1': 50,
        'ĐVT2': 'm2',
        'SL nhập 2': 148.8,
        'LSX': 'LSX-1112',
        'Ghi chú': ''
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Phieu_Nhap_Kho');
    XLSX.writeFile(wb, 'Mau_nhap_lieu_phieu_nhap_kho.xlsx');
  };

  const handleStartImport = async () => {
    if (!selectedFile || previewRows.length === 0) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      await warehouseDataService.importReceipts(previewRows);
      onImportSuccess?.(previewRows);
      onClose();
    } catch (err) {
      console.error('[GoodsReceiptImportModal] Lỗi lưu CSDL:', err);
      setErrorMsg(err.message || 'Không thể lưu phiếu nhập kho lên máy chủ.');
    } finally {
      setIsUploading(false);
    }
  };

  const modalContent = (
    <div className="wh-modal-overlay" onClick={onClose}>
      <div className="wh-modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="wh-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={20} color="#7B5233" />
            <h3 className="wh-modal-title">Nhập danh sách Phiếu Nhập Kho từ Excel</h3>
          </div>
          <button type="button" className="wh-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="wh-modal-body">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#FAF6F0',
              border: '1px solid #EADCC9',
              borderRadius: '8px',
              marginBottom: '14px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4A2E1B' }}>
                Định dạng tệp Excel chuẩn
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                Hỗ trợ tệp định dạng .xlsx, .xls, .csv. Hãy tải file mẫu để đảm bảo đúng cột.
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #7B5233',
                color: '#7B5233',
                fontSize: '0.76rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Download size={13} />
              <span>Tải file mẫu</span>
            </button>
          </div>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              border: '2px dashed #C4B5A5',
              borderRadius: '8px',
              backgroundColor: '#FDFBF7',
              cursor: 'pointer',
              marginBottom: '14px',
              transition: 'all 0.15s ease'
            }}
          >
            <Upload size={32} color="#7B5233" style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#2D1A12' }}>
              {selectedFile ? selectedFile.name : 'Nhấp hoặc kéo thả tệp Excel vào đây'}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#8D6E63', marginTop: '4px' }}>
              Dung lượng tối đa: 15MB (.xlsx, .xls, .csv)
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', marginBottom: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', color: '#DC2626', fontSize: '0.78rem', fontWeight: '600' }}>
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {previewRows.length > 0 && (
            <div style={{ borderTop: '1px solid #EADCC9', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4A2E1B', marginBottom: '6px' }}>
                Xem trước {previewRows.length} phiếu nhập kho sẽ nạp vào CSDL:
              </div>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #EADCC9', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead style={{ backgroundColor: '#FAF6F0' }}>
                    <tr>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Mã phiếu</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Tên kho</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Khách/NCC</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Số dòng</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Tổng SL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F0E6D8' }}>
                        <td style={{ padding: '4px 6px', fontWeight: '600', color: '#7B5233' }}>{r.voucher_no}</td>
                        <td style={{ padding: '4px 6px' }}>{r.warehouse_name}</td>
                        <td style={{ padding: '4px 6px' }}>{r.customer_name || '—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{r.items.length}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '600' }}>{r.total_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="wh-modal-footer">
          <button
            type="button"
            className="wh-btn-brown"
            style={{ backgroundColor: '#FFFFFF', color: '#4A2E1B', border: '1px solid #D5C7B7' }}
            onClick={onClose}
          >
            <span>Hủy bỏ</span>
          </button>

          <button
            type="button"
            className="wh-btn-primary"
            disabled={!selectedFile || previewRows.length === 0 || isUploading}
            onClick={handleStartImport}
          >
            <CheckCircle size={15} />
            <span>{isUploading ? 'Đang nạp...' : 'Tiến hành nhập dữ liệu'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default GoodsReceiptImportModal;
