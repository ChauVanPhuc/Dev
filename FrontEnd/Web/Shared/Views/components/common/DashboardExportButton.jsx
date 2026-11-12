import React from 'react';
import { Download } from 'lucide-react';

/**
 * DashboardExportButton
 * Nút bấm chuẩn ERP G7 kích hoạt chức năng "Xuất Dashboard".
 * Tự động mang class "no-export" để không bị chụp vào bản xuất ảnh/PDF.
 */
export const DashboardExportButton = ({
  onClick,
  title = 'Xuất Dashboard sang hình ảnh hoặc PDF',
  label = 'Xuất Dashboard',
  style = {}
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-export page-btn"
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        height: '25px',
        padding: '0 9px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E2DC',
        borderRadius: '5px',
        color: '#795137',
        fontSize: '0.72rem',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#FAF6F2';
        e.currentTarget.style.borderColor = '#795137';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#FFFFFF';
        e.currentTarget.style.borderColor = '#E8E2DC';
      }}
    >
      <Download size={13} style={{ color: '#795137' }} />
      <span>{label}</span>
    </button>
  );
};

export default DashboardExportButton;
