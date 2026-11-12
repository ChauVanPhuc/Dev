import React from 'react';
import { RotateCcw, Clock, CheckCircle2, AlertOctagon } from 'lucide-react';
import { formatNumber } from '../../../types/goodsReceipt.types';

export const RejectedGoodsKPIs = ({ stats = {} }) => {
  const {
    total_vouchers = 0,
    total_quantity = 0,
    pending_count = 0,
    resolved_count = 0,
    reused_count = 0,
    scrap_count = 0,
    return_vendor_count = 0
  } = stats;

  return (
    <div className="rg-kpi-grid">
      {/* KPI 1: Tổng số phiếu */}
      <div className="rg-kpi-card">
        <div className="rg-kpi-icon-wrapper blue">
          <RotateCcw size={20} />
        </div>
        <div className="rg-kpi-content">
          <span className="rg-kpi-label">Tổng phiếu hàng loại</span>
          <span className="rg-kpi-value">{formatNumber(total_vouchers)}</span>
          <span className="rg-kpi-subtext">QC đầu vào &amp; Trả về sản xuất</span>
        </div>
      </div>

      {/* KPI 2: Chờ xử lý */}
      <div className="rg-kpi-card">
        <div className="rg-kpi-icon-wrapper amber">
          <Clock size={20} />
        </div>
        <div className="rg-kpi-content">
          <span className="rg-kpi-label">Chờ thẩm định / Xử lý</span>
          <span className="rg-kpi-value" style={{ color: '#D97706' }}>
            {formatNumber(pending_count)}
          </span>
          <span className="rg-kpi-subtext">Đang cách ly ngoài tồn khả dụng</span>
        </div>
      </div>

      {/* KPI 3: Đã giải quyết */}
      <div className="rg-kpi-card">
        <div className="rg-kpi-icon-wrapper green">
          <CheckCircle2 size={20} />
        </div>
        <div className="rg-kpi-content">
          <span className="rg-kpi-label">Đã hoàn tất xử lý</span>
          <span className="rg-kpi-value" style={{ color: '#059669' }}>
            {formatNumber(resolved_count)}
          </span>
          <span className="rg-kpi-subtext" title={`Tái sử dụng: ${reused_count} | Xuất hủy: ${scrap_count} | Trả NCC: ${return_vendor_count}`}>
            Tái SD: {reused_count} | Hủy: {scrap_count} | Trả NCC: {return_vendor_count}
          </span>
        </div>
      </div>

      {/* KPI 4: Tổng SL hàng loại */}
      <div className="rg-kpi-card">
        <div className="rg-kpi-icon-wrapper purple">
          <AlertOctagon size={20} />
        </div>
        <div className="rg-kpi-content">
          <span className="rg-kpi-label">Tổng khối lượng loại (ĐVC)</span>
          <span className="rg-kpi-value">{formatNumber(total_quantity)}</span>
          <span className="rg-kpi-subtext">Theo dõi độc lập kho cách ly</span>
        </div>
      </div>
    </div>
  );
};

