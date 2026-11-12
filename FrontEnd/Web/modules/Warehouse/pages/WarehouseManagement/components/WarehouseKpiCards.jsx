// WarehouseKpiCards.jsx - Thẻ KPI Quản lý kho
import React from 'react';
import { Package, Layers, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatNumber } from '../../../types/warehouseInventory.types';

export const WarehouseKpiCards = ({ kpis = {}, totalCount = 0 }) => {
  const {
    opening_main = {},
    in_main = {},
    out_main = {},
    itemsWithOpening = 0,
    itemsWithIn = 0,
    itemsWithOut = 0
  } = kpis;

  // Xử lý an toàn đơn vị:
  // Nếu tất cả cùng một đơn vị -> hiển thị tổng số lượng kèm đơn vị
  // Nếu có nhiều đơn vị khác nhau -> hiển thị số mã có phát sinh để không cộng sai đơn vị
  const isOpeningSingle = opening_main.status === 'single' && opening_main.sum !== null;
  const isInSingle = in_main.status === 'single' && in_main.sum !== null;
  const isOutSingle = out_main.status === 'single' && out_main.sum !== null;

  return (
    <div className="exp-stats-grid">
      {/* 1. Tổng mã vật tư */}
      <div className="exp-stat-card">
        <div className="exp-stat-info">
          <span className="exp-stat-title">Tổng mã vật tư</span>
          <span className="exp-stat-value">{formatNumber(totalCount)}</span>
        </div>
        <div className="exp-stat-icon" style={{ backgroundColor: '#FAF6F0', color: '#7B5233' }}>
          <Package size={18} />
        </div>
      </div>

      {/* 2. Tồn đầu kỳ */}
      <div className="exp-stat-card">
        <div className="exp-stat-info">
          <span className="exp-stat-title">Tồn đầu kỳ</span>
          <span className="exp-stat-value">
            {isOpeningSingle ? (
              `${formatNumber(opening_main.sum)} ${opening_main.unit}`
            ) : (
              `${formatNumber(itemsWithOpening)} mã có tồn`
            )}
          </span>
        </div>
        <div className="exp-stat-icon" style={{ backgroundColor: '#FAF6F0', color: '#7B5233' }}>
          <Layers size={18} />
        </div>
      </div>

      {/* 3. Nhập trong kỳ */}
      <div className="exp-stat-card">
        <div className="exp-stat-info">
          <span className="exp-stat-title">Nhập trong kỳ</span>
          <span className="exp-stat-value">
            {isInSingle ? (
              `${formatNumber(in_main.sum)} ${in_main.unit}`
            ) : (
              `${formatNumber(itemsWithIn)} mã nhập`
            )}
          </span>
        </div>
        <div className="exp-stat-icon" style={{ backgroundColor: '#F5EDE4', color: '#5D3D25' }}>
          <ArrowDownRight size={18} />
        </div>
      </div>

      {/* 4. Xuất trong kỳ */}
      <div className="exp-stat-card">
        <div className="exp-stat-info">
          <span className="exp-stat-title">Xuất trong kỳ</span>
          <span className="exp-stat-value">
            {isOutSingle ? (
              `${formatNumber(out_main.sum)} ${out_main.unit}`
            ) : (
              `${formatNumber(itemsWithOut)} mã xuất`
            )}
          </span>
        </div>
        <div className="exp-stat-icon" style={{ backgroundColor: '#FAF6F0', color: '#7B5233' }}>
          <ArrowUpRight size={18} />
        </div>
      </div>
    </div>
  );
};

export default WarehouseKpiCards;
