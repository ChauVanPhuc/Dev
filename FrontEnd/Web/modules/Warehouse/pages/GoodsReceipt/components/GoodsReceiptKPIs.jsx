// GoodsReceiptKPIs.jsx - 3 thẻ KPI đầu trang danh sách Nhập kho
import React from 'react';
import { ClipboardList, Layers, Package } from 'lucide-react';
import { formatNumber } from '../../../types/goodsReceipt.types';

export const GoodsReceiptKPIs = ({ stats = {}, totalCount = 0 }) => {
  return (
    <div className="wh-stats-grid">
      {/* KPI 1: Tổng phiếu nhập kho */}
      <div className="wh-stat-card">
        <div className="wh-stat-info">
          <span className="wh-stat-title">Tổng phiếu nhập kho</span>
          <span className="wh-stat-value">{formatNumber(stats.total_vouchers ?? totalCount ?? 0)}</span>
        </div>
        <div className="wh-stat-icon" style={{ backgroundColor: '#FAF6F0', color: '#7B5233' }}>
          <ClipboardList size={18} />
        </div>
      </div>

      {/* KPI 2: Tổng dòng hàng */}
      <div className="wh-stat-card">
        <div className="wh-stat-info">
          <span className="wh-stat-title">Tổng dòng hàng</span>
          <span className="wh-stat-value" style={{ color: '#1E40AF' }}>
            {formatNumber(stats.total_lines ?? 0)}
          </span>
        </div>
        <div className="wh-stat-icon" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
          <Layers size={18} />
        </div>
      </div>

      {/* KPI 3: Tổng số lượng nhập */}
      <div className="wh-stat-card">
        <div className="wh-stat-info">
          <span className="wh-stat-title">Tổng số lượng nhập</span>
          <span className="wh-stat-value" style={{ color: '#B45309' }}>
            {formatNumber(stats.total_quantity ?? 0)}
          </span>
        </div>
        <div className="wh-stat-icon" style={{ backgroundColor: '#FFFBEB', color: '#B45309' }}>
          <Package size={18} />
        </div>
      </div>
    </div>
  );
};

export default GoodsReceiptKPIs;
