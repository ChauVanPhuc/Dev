import React from 'react';
import { Upload, X } from 'lucide-react';

const ISOImportExcelModal = ({
  show,
  onClose,
  uploadFile,
  setUploadFile,
  uploadMode,
  setUploadMode,
  uploading,
  onSubmit
}) => {
  if (!show) return null;

  return (
    <div className="iso-modal-overlay" onClick={onClose}>
      <div className="iso-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="iso-modal-header">
          <h3 className="iso-modal-title">
            <Upload size={18} />
            <span>Nhập dữ liệu Master List từ Excel</span>
          </h3>
          <button 
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280' }}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="iso-modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233' }}>
                Chọn tệp Excel (.xlsx, .xls)
              </label>
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={(e) => setUploadFile(e.target.files[0])}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px dashed #7B5233',
                  backgroundColor: '#FAF6F0'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#8D6E63' }}>
                Tự động nhận diện sheet <b>MASTER LIST</b> với đủ 23 cột tiêu chuẩn.
              </span>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233' }}>
                  Chế độ nạp dữ liệu:
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="uploadMode"
                    value="append"
                    checked={uploadMode === 'append'}
                    onChange={() => setUploadMode('append')}
                    style={{ accentColor: '#7B5233' }}
                  />
                  <span>Bổ sung bản ghi mới (Append)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="uploadMode"
                    value="replace"
                    checked={uploadMode === 'replace'}
                    onChange={() => setUploadMode('replace')}
                    style={{ accentColor: '#7B5233' }}
                  />
                  <span>Ghi đè làm mới toàn bộ (Replace)</span>
                </label>
              </div>
            </div>
          </div>
          <div className="iso-modal-footer">
            <button 
              type="button" 
              className="iso-page-btn" 
              onClick={onClose}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="iso-btn-brown" 
              disabled={uploading}
            >
              {uploading ? 'Đang phân tích...' : 'Bắt đầu nạp dữ liệu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ISOImportExcelModal;
