import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { WAREHOUSE_ROUTES } from '../types/warehouse.types';

/**
 * @deprecated Legacy staging placeholder component.
 */
export const WarehouseStagingArea = ({
  iconName = 'Boxes',
  areaTitle = 'Khu vực dữ liệu',
  stagingTitle,
  stagingDescription,
  blueprintItems = [],
  currentRoute = ''
}) => {
  const MainIcon = Icons[iconName] || Icons.Boxes;

  return (
    <div className="warehouse-work-area">
      <div className="warehouse-work-header">
        <div className="warehouse-work-title-group">
          <MainIcon size={18} color="#7B5233" />
          <h2 className="warehouse-work-title">{areaTitle}</h2>
          <span className="warehouse-work-tag">Giai đoạn khởi tạo</span>
        </div>
      </div>

      <div className="warehouse-staging-placeholder">
        <div className="warehouse-staging-icon-wrapper">
          <MainIcon size={36} strokeWidth={1.8} />
        </div>
        <h3 className="warehouse-staging-title">{stagingTitle}</h3>
        <p className="warehouse-staging-desc">{stagingDescription}</p>

        {blueprintItems.length > 0 && (
          <div className="warehouse-blueprint-grid">
            {blueprintItems.map((item, idx) => {
              const ItemIcon = Icons[item.icon] || Icons.CheckCircle2;
              return (
                <div key={idx} className="warehouse-blueprint-card">
                  <div className="warehouse-blueprint-icon">
                    <ItemIcon size={18} strokeWidth={2} />
                  </div>
                  <div className="warehouse-blueprint-content">
                    <h4 className="warehouse-blueprint-title">{item.title}</h4>
                    <p className="warehouse-blueprint-desc">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="warehouse-quick-nav">
          <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: '600', marginRight: '4px' }}>
            Điều hướng nhanh phân hệ:
          </span>
          <Link
            to={WAREHOUSE_ROUTES.GOODS_RECEIPT}
            className={`warehouse-nav-btn ${currentRoute === WAREHOUSE_ROUTES.GOODS_RECEIPT ? 'active' : ''}`}
          >
            <Icons.PackagePlus size={15} />
            <span>Nhập kho</span>
          </Link>
          <Link
            to={WAREHOUSE_ROUTES.GOODS_ISSUE}
            className={`warehouse-nav-btn ${currentRoute === WAREHOUSE_ROUTES.GOODS_ISSUE ? 'active' : ''}`}
          >
            <Icons.PackageMinus size={15} />
            <span>Xuất kho</span>
          </Link>
          <Link
            to={WAREHOUSE_ROUTES.WAREHOUSE_MANAGEMENT}
            className={`warehouse-nav-btn ${currentRoute === WAREHOUSE_ROUTES.WAREHOUSE_MANAGEMENT ? 'active' : ''}`}
          >
            <Icons.Boxes size={15} />
            <span>Quản lý kho</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WarehouseStagingArea;
