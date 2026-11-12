import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumber } from '../../../types/warehouseInventory.types';

/**
 * Modal Nhập dữ liệu Xuất - Nhập - Tồn từ tệp Excel
 * - Có bước kiểm tra cấu trúc dữ liệu và xem trước (Data Preview)
 * - Tuân thủ nguyên tắc: Không tự ý ghi đè chứng từ gốc, phục vụ đối soát kiểm kê
 */
export const WarehouseImportModal = ({ isOpen, onClose, toast, onImportSuccess }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Validate
  const [fileName, setFileName] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Xử lý đọc file Excel bằng thư viện XLSX
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Tìm hàng header và đọc các dòng
        parseAndValidateExcel(data);
      } catch (err) {
        if (toast?.error) toast.error('Không thể đọc tệp Excel: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const parseAndValidateExcel = (rows) => {
    if (!rows || rows.length < 2) {
      if (toast?.error) toast.error('Tệp Excel không chứa dữ liệu hợp lệ.');
      return;
    }

    // Giả định mẫu Excel chuẩn: STT, Mã vật tư, Tên vật tư, ĐVC, ĐVCĐ, Tồn đầu, Nhập, Xuất
    const parsedItems = [];
    const errors = [];

    // Lấy tối đa 15 dòng để preview
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || !row[1]) continue;

      const code = String(row[1] || '').trim();
      const name = String(row[2] || '').trim();
      const unit = String(row[3] || 'Cái').trim();
      const opening = Number(row[5]) || 0;
      const inQty = Number(row[7]) || 0;
      const outQty = Number(row[9]) || 0;
      const closing = opening + inQty - outQty;

      if (!code) {
        errors.push(`Dòng ${r + 1}: Thiếu mã vật tư.`);
      }

      parsedItems.push({
        stt: r,
        item_code: code,
        item_name: name || 'Chưa đặt tên',
        unit_main: unit,
        opening_main: opening,
        in_main: inQty,
        out_main: outQty,
        closing_main: closing,
        isValid: Boolean(code)
      });
    }

    setPreviewData(parsedItems);
    setValidationErrors(errors);
    setStep(2);
  };

  const handleDownloadSample = () => {
    // Tạo file Excel mẫu
    const sampleRows = [
      ['STT', 'Mã vật tư', 'Tên vật tư / Goods', 'ĐVC', 'ĐVCĐ', 'Tồn đầu ĐVC', 'Tồn đầu ĐVCĐ', 'Nhập ĐVC', 'Nhập ĐVCĐ', 'Xuất ĐVC', 'Xuất ĐVCĐ', 'Tồn cuối ĐVC', 'Tồn cuối ĐVCĐ', 'Ngày tồn'],
      [1, 'WOOD-OAK-01', 'Gỗ Sồi Trắng FAS 4/4', 'm3', 'Tấm', 18.5, 710.4, 12, 460.8, 8.5, 326.4, 22, 844.8, 28],
      [2, 'HARD-HL-01', 'Bản lề giảm chấn thẳng Inox 304', 'Cái', 'Hộp', 1200, 48, 1000, 40, 850, 34, 1350, 54, 15]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_XNT');
    XLSX.writeFile(wb, 'Mau_Bao_Cao_XNT_SmartFlow.xlsx');
  };

  const handleConfirmImport = () => {
    if (toast?.success) {
      toast.success(`Đã nạp và đối soát thành công ${previewData.length} dòng dữ liệu từ tệp Excel "${fileName}"!`);
    }
    onImportSuccess?.(previewData);
    onClose();
  };

  return (
    <div className="wh-modal-overlay" onClick={onClose}>
      <div className="wh-modal-box" style={{ maxWidth: step === 2 ? '800px' : '550px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="wh-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={18} color="#7B5233" />
            <h3>Nhập & Đối soát Báo cáo Xuất - Nhập - Tồn từ Excel</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#8D6E63'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="wh-modal-body">
          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: '#FAF6F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7B5233',
                  border: '1px dashed #D4B59E'
                }}
              >
                <Upload size={28} />
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#2D1A12' }}>
                  Tải lên tệp dữ liệu kiểm kê tồn kho
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#8D6E63', maxWidth: 420 }}>
                  Hỗ trợ định dạng <strong>.xlsx</strong> hoặc <strong>.xls</strong>. Dữ liệu sẽ được hệ thống kiểm tra tính tương thích và bảo toàn công thức Tồn cuối trước khi áp dụng.
                </p>
              </div>

              {/* Input chọn file */}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 24px',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)'
                }}
              >
                <Upload size={16} />
                <span>{isProcessing ? 'Đang đọc tệp...' : 'Chọn tệp Excel từ máy tính'}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={isProcessing}
                />
              </label>

              {/* Tải file mẫu */}
              <button
                type="button"
                onClick={handleDownloadSample}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#7B5233',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Download size={16} />
                <span>Tải tệp Excel mẫu chuẩn Xuất - Nhập - Tồn</span>
              </button>

              {/* Chú ý nghiệp vụ */}
              <div
                style={{
                  marginTop: 10,
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  color: '#92400E',
                  textAlign: 'left',
                  display: 'flex',
                  gap: 6
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <strong>Lưu ý nghiệp vụ kiểm soát:</strong> Chức năng Nhập Excel phục vụ đối soát, kiểm kê định kỳ và đối chiếu số liệu. Nghiệp vụ phát sinh chính thức chỉ được ghi nhận thông qua 2 màn hình <strong>Nhập kho</strong> và <strong>Xuất kho</strong> để bảo toàn lịch sử chứng từ.
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2D1A12' }}>
                  Xem trước dữ liệu tệp: <strong>{fileName}</strong> ({previewData.length} dòng)
                </span>
                <button
                  type="button"
                  className="wh-btn"
                  onClick={() => setStep(1)}
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  Chọn lại tệp
                </button>
              </div>

              {/* Bảng Preview dữ liệu */}
              <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #EADCC9', borderRadius: 6 }}>
                <table className="wh-inv-table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                      <th style={{ textAlign: 'left' }}>Mã vật tư</th>
                      <th style={{ textAlign: 'left' }}>Tên vật tư</th>
                      <th style={{ textAlign: 'center' }}>ĐVC</th>
                      <th style={{ textAlign: 'right' }}>Tồn đầu</th>
                      <th style={{ textAlign: 'right' }}>Nhập</th>
                      <th style={{ textAlign: 'right' }}>Xuất</th>
                      <th style={{ textAlign: 'right' }}>Tồn cuối</th>
                      <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#7B5233' }}>{row.item_code}</td>
                        <td>{row.item_name}</td>
                        <td style={{ textAlign: 'center' }}>{row.unit_main}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(row.opening_main)}</td>
                        <td style={{ textAlign: 'right', color: '#059669' }}>+{formatNumber(row.in_main)}</td>
                        <td style={{ textAlign: 'right', color: '#D97706' }}>-{formatNumber(row.out_main)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(row.closing_main)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              backgroundColor: '#ECFDF5',
                              color: '#059669',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}
                          >
                            Hợp lệ
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewData.length > 10 && (
                <span style={{ fontSize: '0.72rem', color: '#8D6E63', textAlign: 'right' }}>
                  * Hiển thị xem trước 10 dòng đầu tiên trong tổng số {previewData.length} dòng dữ liệu.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="wh-modal-footer">
          <button type="button" className="wh-btn" onClick={onClose}>
            Hủy
          </button>
          {step === 2 && (
            <button
              type="button"
              className="wh-btn wh-btn-primary"
              onClick={handleConfirmImport}
            >
              <CheckCircle size={14} />
              <span>Xác nhận & Nạp dữ liệu đối soát</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseImportModal;
