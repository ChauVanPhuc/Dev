import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, FileText } from 'lucide-react';

/**
 * Trình xem trang trung thực: hiển thị từng trang của file Word gốc với đúng
 * khổ giấy, hướng trang (dọc/ngang), bảng, hình, lưu đồ như file người dùng upload.
 * pages: [{ page_number, width_mm, height_mm, orientation, data_url }]
 */
const MM_TO_PX = 96 / 25.4;

const FaithfulPageViewer = ({ pages = [], title = 'Bản gốc đúng định dạng', onClose }) => {
  const [zoom, setZoom] = useState(100);

  const landscapeCount = pages.filter(p => p.orientation === 'landscape').length;

  const handleZoomChange = (delta) => setZoom(prev => Math.min(200, Math.max(40, prev + delta)));

  return createPortal(
    <div
      id="faithful-page-viewer"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(30, 20, 12, 0.55)',
        display: 'flex', flexDirection: 'column'
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px',
        background: '#FAF7F2', borderBottom: '1px solid #EADCC9', color: '#7B5233'
      }}>
        <FileText size={18} />
        <strong style={{ fontSize: '0.95rem' }}>{title}</strong>
        <span style={{ fontSize: '0.8rem', color: '#8A6A4F' }}>
          {pages.length} trang{landscapeCount > 0 ? ` • ${landscapeCount} trang ngang` : ''}
        </span>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <button type="button" className="iso-ribbon-btn" onClick={() => handleZoomChange(-10)} title="Thu nhỏ"><ZoomOut size={14} /></button>
          <span style={{ minWidth: '44px', textAlign: 'center', fontSize: '0.8rem' }}>{zoom}%</span>
          <button type="button" className="iso-ribbon-btn" onClick={() => handleZoomChange(10)} title="Phóng to"><ZoomIn size={14} /></button>
          <button type="button" className="iso-ribbon-btn" onClick={onClose} title="Đóng"><X size={16} /></button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#E9E4DC' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {pages.length === 0 && (
            <div style={{ color: '#7B5233', padding: '40px' }}>
              Chưa có bản render. Cần cài Microsoft Word hoặc LibreOffice trên máy chủ để xem đúng định dạng.
            </div>
          )}
          {pages.map(p => {
            const w = Math.round(p.width_mm * MM_TO_PX * zoom / 100);
            const h = Math.round(p.height_mm * MM_TO_PX * zoom / 100);
            return (
              <div key={p.page_number} style={{ textAlign: 'center' }}>
                <img
                  src={p.data_url}
                  alt={`Trang ${p.page_number}`}
                  width={w}
                  height={h}
                  style={{ display: 'block', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
                />
                <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#7B5233' }}>
                  Trang {p.page_number}/{pages.length} • {p.width_mm}×{p.height_mm} mm • {p.orientation === 'landscape' ? 'Ngang' : 'Dọc'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FaithfulPageViewer;
