import React from 'react';
import * as Icons from 'lucide-react';

/**
 * @deprecated Legacy standalone header (hiện tại các trang sử dụng setCustomTitle từ Layout và chuẩn Master Container).
 */
export const WarehouseHeader = ({
  title,
  subtitle,
  iconName = 'Warehouse',
  screenCode,
  badgeText = 'Phân hệ Kho'
}) => {
  const IconComponent = Icons[iconName] || Icons.Warehouse;

  return (
    <div className="warehouse-header-card">
      <div className="warehouse-header-left">
        <div className="warehouse-header-icon">
          <IconComponent size={26} strokeWidth={2} />
        </div>
        <div className="warehouse-header-info">
          <div className="warehouse-header-badge">
            <span className="warehouse-status-dot" style={{ backgroundColor: '#7B5233' }}></span>
            {badgeText} {screenCode ? `• ${screenCode}` : ''}
          </div>
          <h1 className="warehouse-header-title">{title}</h1>
          <p className="warehouse-header-desc">{subtitle}</p>
        </div>
      </div>
      <div className="warehouse-header-actions">
        <div className="warehouse-status-pill status-ready">
          <span className="warehouse-status-dot"></span>
          <span>Khung giao diện sẵn sàng</span>
        </div>
      </div>
    </div>
  );
};

export default WarehouseHeader;
