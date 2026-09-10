import React, { useState } from 'react';
import { Folder, UploadCloud, FileText, X } from 'lucide-react';

export const FolderImportChoiceModal = ({
  isOpen,
  onClose,
  onSelectFiles,
  onSelectFolderNative,
  onDropFiles
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const pdfFiles = [];
    const traverseFileTree = (entry) => {
      return new Promise((resolve) => {
        if (!entry) return resolve();
        if (entry.isFile) {
          entry.file((file) => {
            if (file && file.name.toLowerCase().endsWith('.pdf')) {
              pdfFiles.push(file);
            }
            resolve();
          }, () => resolve());
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          dirReader.readEntries(async (entries) => {
            const promises = [];
            for (let i = 0; i < entries.length; i++) {
              promises.push(traverseFileTree(entries[i]));
            }
            await Promise.all(promises);
            resolve();
          }, () => resolve());
        } else {
          resolve();
        }
      });
    };

    const promises = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          promises.push(traverseFileTree(entry));
        } else {
          const file = item.getAsFile();
          if (file && file.name.toLowerCase().endsWith('.pdf')) {
            pdfFiles.push(file);
          }
        }
      }
    }
    await Promise.all(promises);

    if (pdfFiles.length > 0 && onDropFiles) {
      onDropFiles(pdfFiles);
      onClose();
    }
  };

  return (
    <div className="add-claim-backdrop" style={{ zIndex: 1999 }} onClick={onClose}>
      <div className="form-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div 
          className="add-claim-modal" 
          style={{ 
            width: 'min(92vw, 560px)', 
            borderRadius: '14px', 
            border: '1px solid #EADCC9', 
            boxShadow: '0 20px 50px rgba(123, 82, 51, 0.2)', 
            overflow: 'hidden',
            backgroundColor: '#FFFFFF'
          }}
        >
          {/* Modal Header */}
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #EADCC9', backgroundColor: '#FFFDFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.15rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Folder size={22} style={{ color: '#7B5233' }} />
              <span>Nhập dữ liệu thư mục PDF khiếu nại</span>
            </h3>
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1.4rem', lineHeight: 1 }}
            >
              &times;
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragOver ? '#7B5233' : '#CBD5E1'}`,
                borderRadius: '10px',
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: isDragOver ? '#FAF6F0' : '#FCFAF7',
                transition: 'all 0.2s ease'
              }}
            >
              <UploadCloud size={40} style={{ color: isDragOver ? '#7B5233' : '#A1887F', marginBottom: '10px' }} />
              <div style={{ fontWeight: 'bold', color: '#2D1A12', fontSize: '0.98rem', marginBottom: '4px' }}>
                Kéo & Thả thư mục hoặc các file PDF vào đây
              </div>
              <div style={{ fontSize: '0.82rem', color: '#7B5233' }}>
                Tự động trích xuất tất cả các file PDF khiếu nại
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#EADCC9' }}></div>
              <span style={{ padding: '0 12px', fontSize: '0.78rem', color: '#8D6E63', fontWeight: '600' }}>HOẶC CHỌN TỪ MÁY TÍNH</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#EADCC9' }}></div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Select PDF Files */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectFiles && onSelectFiles();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  border: '1px solid #7B5233',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <FileText size={18} />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div>Chọn danh sách tệp PDF trong thư mục</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.9 }}>Mở cửa sổ chọn file PDF trong thư mục (Khuyên dùng)</div>
                </div>
              </button>

              {/* Option 2: Select Native Folder */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectFolderNative && onSelectFolderNative();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#FFFFFF',
                  color: '#4A2E1B',
                  fontWeight: 'bold',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <Folder size={18} style={{ color: '#7B5233' }} />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div>Chọn trực tiếp cả Thư mục (System Folder)</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#8D6E63' }}>Sử dụng bộ chọn thư mục nguyên bản của Windows</div>
                </div>
              </button>
            </div>

          </div>

          {/* Modal Footer */}
          <div style={{ padding: '12px 22px', backgroundColor: '#FAF6F0', borderTop: '1px solid #F0E6D8', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Đóng
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
