// UnitOfMeasureImportModal.jsx - Popup Nhập Excel Đơn vị tính (Xem trước, kiểm tra lỗi từng dòng, tải file mẫu)
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  X, 
  ArrowRight, 
  Layers 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import unitOfMeasureService from '../services/unitOfMeasure.service';

export const UnitOfMeasureImportModal = ({
  show = false,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!show) return null;

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setValidationResult(null);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  // Đọc và phân tích file Excel
  const processExcelFile = (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          setValidationResult({
            isValid: false,
            errors: [{ row: '—', message: 'File Excel không có dòng dữ liệu nào!' }],
            validCount: 0,
            rows: []
          });
          setIsProcessing(false);
          return;
        }

        // Kiểm tra dữ liệu và ánh xạ cột
        const currentUnits = unitOfMeasureService.getUnits();
        const existingCodes = new Set(currentUnits.map(u => (u.code || '').trim().toLowerCase()));
        const fileCodes = new Set();

        const errors = [];
        const validatedRows = [];

        jsonData.forEach((rawRow, idx) => {
          const rowNum = idx + 2; // Header ở dòng 1
          // Tìm cột code theo nhiều biến thể tên
          const code = (
            rawRow['Tên đơn vị tính'] || 
            rawRow['Mã ĐVT'] || 
            rawRow['Đơn vị tính'] || 
            rawRow['Code'] || 
            rawRow['code'] || 
            ''
          ).toString().trim();

          const fullName = (
            rawRow['Tên đơn vị tính đầy đủ'] || 
            rawRow['Tên đầy đủ'] || 
            rawRow['Full Name'] || 
            rawRow['full_name'] || 
            ''
          ).toString().trim();

          const rawPrec = rawRow['Độ chính xác'] !== undefined ? rawRow['Độ chính xác'] : rawRow['precision'];
          const rawStatus = (rawRow['Trạng thái'] || rawRow['status'] || 'ACTIVE').toString().trim().toUpperCase();

          const rowErrors = [];

          if (!code) {
            rowErrors.push('Thiếu tên đơn vị tính');
          } else {
            const lowerCode = code.toLowerCase();
            if (existingCodes.has(lowerCode)) {
              rowErrors.push(`Tên "${code}" đã tồn tại trong hệ thống`);
            } else if (fileCodes.has(lowerCode)) {
              rowErrors.push(`Tên "${code}" bị trùng lặp trong file`);
            } else {
              fileCodes.add(lowerCode);
            }
          }

          let precision = 0;
          if (rawPrec === '' || rawPrec === null || rawPrec === undefined) {
            precision = 0;
          } else {
            const num = Number(rawPrec);
            if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
              rowErrors.push('Độ chính xác phải là số nguyên ≥ 0');
            } else if (num > 6) {
              rowErrors.push('Độ chính xác tối đa là 6');
            } else {
              precision = num;
            }
          }

          let status = 'ACTIVE';
          if (rawStatus.includes('NGỪNG') || rawStatus.includes('INACTIVE') || rawStatus === '0') {
            status = 'INACTIVE';
          }

          const hasErr = rowErrors.length > 0;
          if (hasErr) {
            rowErrors.forEach(msg => {
              errors.push({ row: rowNum, code: code || '—', message: msg });
            });
          }

          validatedRows.push({
            rowNumber: rowNum,
            code,
            full_name: fullName,
            precision,
            status,
            isValid: !hasErr,
            error: rowErrors.join(', ')
          });
        });

        const validItems = validatedRows.filter(r => r.isValid);

        setParsedRows(validatedRows);
        setValidationResult({
          isValid: errors.length === 0,
          errors,
          validCount: validItems.length,
          totalCount: validatedRows.length
        });
      } catch (err) {
        console.error('Lỗi khi đọc file Excel:', err);
        setValidationResult({
          isValid: false,
          errors: [{ row: '—', message: 'Lỗi định dạng file: ' + err.message }],
          validCount: 0,
          rows: []
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      processExcelFile(files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processExcelFile(files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validCount === 0) return;

    try {
      const validRowsToImport = parsedRows.filter(r => r.isValid);
      const res = await unitOfMeasureService.importUnits(validRowsToImport);

      if (onSuccess) {
        onSuccess(res.successCount);
      }
      handleModalClose();
    } catch (err) {
      console.error('Lỗi import đơn vị tính:', err);
      alert(err?.message || 'Lỗi khi nhập danh sách đơn vị tính');
    }
  };

  return (
    <div className="exp-modal-overlay" onClick={handleModalClose}>
      <div 
        className="exp-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        {/* Header Modal */}
        <div className="exp-modal-header">
          <h3 className="exp-modal-title">
            <FileSpreadsheet size={18} color="#7B5233" />
            <span>Nhập danh sách đơn vị tính từ Excel</span>
          </h3>
          <button 
            type="button" 
            onClick={handleModalClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center' }}
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="exp-modal-body" style={{ maxHeight: '72vh' }}>
          {/* Nút tải file mẫu */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: '#FAF6F0',
            border: '1px solid #EADCC9',
            borderRadius: '8px',
            marginBottom: '14px'
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4A2E1B' }}>File mẫu Excel chuẩn</div>
              <div style={{ fontSize: '0.74rem', color: '#8D6E63' }}>
                Bao gồm các cột: Tên đơn vị tính, Tên đơn vị tính đầy đủ, Độ chính xác, Trạng thái
              </div>
            </div>
            <button
              type="button"
              className="exp-btn-brown"
              style={{ height: '30px', fontSize: '0.78rem', padding: '0 12px' }}
              onClick={() => unitOfMeasureService.downloadTemplate()}
            >
              <Download size={13} />
              <span>Tải file mẫu</span>
            </button>
          </div>

          {/* Vùng Dropzone */}
          {!file && (
            <div
              className={`uom-dropzone ${dragOver ? 'dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
              <Upload size={32} color="#7B5233" />
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#2D1A12' }}>
                Kéo thả file Excel vào đây hoặc <span style={{ color: '#7B5233', textDecoration: 'underline' }}>chọn file từ máy tính</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#8D6E63' }}>
                Hỗ trợ định dạng: .xlsx, .xls, .csv
              </div>
            </div>
          )}

          {/* File đã chọn và kết quả kiểm tra */}
          {file && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={18} color="#0284C7" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>{file.name}</span>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                  onClick={handleReset}
                  title="Chọn lại file khác"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Thông báo kết quả kiểm tra */}
              {validationResult && (
                <div style={{ marginBottom: '14px' }}>
                  {validationResult.errors.length > 0 ? (
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#991B1B'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '6px' }}>
                        <AlertCircle size={15} />
                        <span>Phát hiện {validationResult.errors.length} lỗi trong file:</span>
                      </div>
                      <div style={{ maxHeight: '100px', overflowY: 'auto', paddingLeft: '8px' }}>
                        {validationResult.errors.slice(0, 10).map((err, idx) => (
                          <div key={idx} style={{ marginBottom: '2px' }}>
                            • <strong>Dòng {err.row}</strong>: {err.message}
                          </div>
                        ))}
                        {validationResult.errors.length > 10 && (
                          <div style={{ fontStyle: 'italic', marginTop: '4px' }}>
                            ... và {validationResult.errors.length - 10} lỗi khác.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#065F46',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle size={16} />
                      <span>Toàn bộ <strong>{validationResult.validCount}</strong> dòng dữ liệu đều hợp lệ và sẵn sàng nhập vào hệ thống!</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bảng xem trước dữ liệu */}
              {parsedRows.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4A2E1B', marginBottom: '6px' }}>
                    Xem trước dữ liệu ({validationResult?.validCount} hợp lệ / {parsedRows.length} dòng):
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #EADCC9', borderRadius: '6px' }}>
                    <table className="uom-import-preview-table">
                      <thead>
                        <tr>
                          <th>Dòng</th>
                          <th>Tên ĐVT</th>
                          <th>Tên đầy đủ</th>
                          <th>Độ chính xác</th>
                          <th>Trạng thái</th>
                          <th>Kết quả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((r) => (
                          <tr key={r.rowNumber} className={!r.isValid ? 'has-error' : ''}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.rowNumber}</td>
                            <td style={{ fontWeight: 600 }}>{r.code || '—'}</td>
                            <td>{r.full_name || '—'}</td>
                            <td style={{ textAlign: 'center' }}>{r.precision}</td>
                            <td>{r.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'}</td>
                            <td>
                              {r.isValid ? (
                                <span style={{ color: '#059669', fontWeight: 600 }}>Hợp lệ</span>
                              ) : (
                                <span style={{ color: '#DC2626', fontWeight: 600 }}>{r.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="exp-modal-footer">
          <button
            type="button"
            className="exp-btn-secondary"
            onClick={handleModalClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="exp-btn-brown"
            disabled={!validationResult || validationResult.validCount === 0 || isProcessing}
            onClick={handleConfirmImport}
          >
            {validationResult?.validCount > 0 
              ? `Xác nhận nhập (${validationResult.validCount} bản ghi)` 
              : 'Xác nhận nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnitOfMeasureImportModal;
