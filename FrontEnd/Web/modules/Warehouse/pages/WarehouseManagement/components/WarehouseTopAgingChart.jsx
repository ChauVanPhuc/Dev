import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { formatNumber } from '../../../types/warehouseInventory.types';

/**
 * WarehouseTopAgingChart
 * Biểu đồ cột dọc (Vertical Column Chart) hiển thị Top 10 vật tư tồn lâu nhất:
 * - Trục X: Mã vật tư (xoay góc nghiêng & rút gọn tinh tế để không chồng chéo text).
 * - Trục Y: Số ngày tồn kho.
 * - Sắp xếp giảm dần từ trái sang phải (cột đầu tiên là vật tư tồn lâu nhất).
 * - Chiều cao cột tương ứng với số ngày tồn; hiển thị giá trị số ngày trên đầu cột.
 * - Tông màu nâu ERP G7; cột cao nhất nhấn sắc độ nâu đậm hơn một chút.
 * - Khi nhấn vào cột: Mở popup Chi tiết vật tư tương ứng.
 */
export const WarehouseTopAgingChart = ({
  items = [],
  selectedWarehouse = 'ALL',
  toDate = '',
  
}) => {
  // 1. Lọc và xếp hạng Top 10 vật tư tồn lâu nhất từ toàn bộ dữ liệu đang lọc
  const top10Items = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];

    // Chỉ lấy vật tư có tồn cuối kỳ > 0 và có số ngày tồn xác định hợp lệ
    const eligible = items.filter((it) => {
      const closing = Number(it.closing_main || 0);
      if (closing <= 0) return false;

      const days = it.inventory_days;
      if (days === null || days === undefined || days === 'Chưa xác định') return false;
      const numDays = Number(days);
      return !isNaN(numDays) && numDays >= 0;
    });

    // Sắp xếp giảm dần theo số ngày tồn; nếu bằng nhau dùng mã vật tư để sắp xếp phụ
    eligible.sort((a, b) => {
      const diff = Number(b.inventory_days || 0) - Number(a.inventory_days || 0);
      if (diff !== 0) return diff;
      return String(a.item_code || '').localeCompare(String(b.item_code || ''));
    });

    // Lấy tối đa 10 vật tư
    return eligible.slice(0, 10);
  }, [items]);

  // Tìm số ngày lớn nhất để tính tỷ lệ trục Y
  const maxDays = useMemo(() => {
    if (top10Items.length === 0) return 100;
    const highest = Number(top10Items[0].inventory_days || 0);
    return Math.max(highest, 1);
  }, [top10Items]);

  // Cấu hình tọa độ SVG cho biểu đồ cột dọc (viewBox: 440 x 195 - Tỷ lệ tối ưu cho card 38% gọn gàng)
  const svgConfig = useMemo(() => {
    const width = 440;
    const height = 195;
    const leftMargin = 28;
    const rightMargin = 8;
    const topMargin = 16;
    const bottomMargin = 38;

    const plotWidth = width - leftMargin - rightMargin;
    const plotHeight = height - topMargin - bottomMargin;
    const yBaseline = topMargin + plotHeight;

    const getY = (val) => {
      const ratio = Math.max(0, val) / maxDays;
      return yBaseline - ratio * plotHeight;
    };

    const count = Math.max(top10Items.length, 1);
    const slotWidth = plotWidth / count;
    // Bề rộng cột thon gọn vừa vặn tỷ lệ card 38%
    const colWidth = Math.min(18, Math.max(11, slotWidth * 0.44));

    const columns = top10Items.map((item, idx) => {
      const days = Number(item.inventory_days || 0);
      const slotCenter = leftMargin + slotWidth * (idx + 0.5);
      const x = slotCenter - colWidth / 2;
      const barHeight = maxDays > 0 ? (days / maxDays) * plotHeight : 0;
      const barY = yBaseline - barHeight;

      // Cột đầu tiên (cao nhất) nhấn nâu đậm hơn (#543118), các cột còn lại dùng nâu G7 chủ đạo (#7B5233)
      const barColor = idx === 0 ? '#543118' : '#7B5233';

      // Mã rút gọn nếu quá 10 ký tự để xoay nghiêng không bị đè chữ
      const code = String(item.item_code || '');
      const displayCode = code.length > 10 ? code.slice(0, 9) + '…' : code;

      return {
        item,
        days,
        slotCenter,
        x,
        barY,
        barHeight,
        colWidth,
        barColor,
        displayCode,
        fullCode: code
      };
    });

    const midVal = Math.round(maxDays / 2);

    return {
      width,
      height,
      leftMargin,
      rightMargin,
      topMargin,
      bottomMargin,
      plotWidth,
      plotHeight,
      yBaseline,
      maxVal: maxDays,
      midVal,
      getY,
      columns
    };
  }, [top10Items, maxDays]);

  return (
    <div className="wh-chart-card">
      {/* ── HEADER CARD ── */}
      <div className="wh-chart-card-header">
        <div className="wh-chart-card-header-left">
          <div className="wh-chart-icon-box" title="Top 10 vật tư tồn lâu nhất">
            <Clock size={16} color="#7B5233" />
          </div>
          <h3 className="wh-chart-title">Top 10 vật tư tồn lâu nhất</h3>
        </div>
      </div>

      {/* ── NỘI DUNG BIỂU ĐỒ CỘT DỌC (COLUMN CHART) ── */}
      <div className="wh-chart-card-body">
        {top10Items.length === 0 ? (
          <div className="wh-chart-empty-state">
            <span>Không có vật tư còn tồn kho trong phạm vi bộ lọc đang chọn.</span>
          </div>
        ) : (
          <div className="wh-aging-column-stage">
            <svg
              className="wh-aging-svg"
              viewBox={`0 0 ${svgConfig.width} ${svgConfig.height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* 1. Các đường lưới ngang & Nhãn trục Y (Số ngày) */}
              <g className="wh-svg-gridlines">
                {/* Đường mức cao nhất */}
                <line
                  x1={svgConfig.leftMargin}
                  y1={svgConfig.getY(svgConfig.maxVal)}
                  x2={svgConfig.width - svgConfig.rightMargin}
                  y2={svgConfig.getY(svgConfig.maxVal)}
                  stroke="#EADCC9"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={svgConfig.leftMargin - 6}
                  y={svgConfig.getY(svgConfig.maxVal) + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#A1887F"
                  fontWeight="500"
                >
                  {formatNumber(svgConfig.maxVal)}
                </text>

                {/* Đường mức 50% */}
                <line
                  x1={svgConfig.leftMargin}
                  y1={svgConfig.getY(svgConfig.midVal)}
                  x2={svgConfig.width - svgConfig.rightMargin}
                  y2={svgConfig.getY(svgConfig.midVal)}
                  stroke="#EADCC9"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={svgConfig.leftMargin - 6}
                  y={svgConfig.getY(svgConfig.midVal) + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#A1887F"
                  fontWeight="500"
                >
                  {formatNumber(svgConfig.midVal)}
                </text>

                {/* Đường đáy 0 */}
                <line
                  x1={svgConfig.leftMargin}
                  y1={svgConfig.yBaseline}
                  x2={svgConfig.width - svgConfig.rightMargin}
                  y2={svgConfig.yBaseline}
                  stroke="#D5C3B2"
                  strokeWidth="1.2"
                />
                <text
                  x={svgConfig.leftMargin - 6}
                  y={svgConfig.yBaseline + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#A1887F"
                  fontWeight="600"
                >
                  0
                </text>
              </g>

              {/* 2. Các cột dọc Top 10 (Column Bars, Value on Top & Rotated X Labels) */}
              <g className="wh-svg-columns">
                {svgConfig.columns.map((col) => {
                  const tooltipText = `Mã vật tư: ${col.item.item_code}\nTên vật tư: ${col.item.item_name || '—'}\nThời gian tồn: ${col.days} ngày\nTồn cuối kỳ: ${formatNumber(col.item.closing_main)} ${col.item.unit_main || ''}${selectedWarehouse && selectedWarehouse !== 'ALL' ? `\nKho: ${selectedWarehouse}` : ''}`;
                  const textY = Math.max(12, col.barY - 4);

                  return (
                    <g
                      key={col.item.id || col.item.item_code}
                      className="wh-aging-col-group"
                      >
                      <title>{tooltipText}</title>

                      {/* Giá trị số ngày hiển thị trên đầu cột */}
                      <text
                        x={col.slotCenter}
                        y={textY}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fill="#4A2E1B"
                      >
                        {col.days}
                      </text>

                      {/* Thân cột đứng */}
                      {col.barHeight > 0 && (
                        <rect
                          x={col.x}
                          y={col.barY}
                          width={col.colWidth}
                          height={col.barHeight}
                          rx={2.5}
                          fill={col.barColor}
                          className="wh-aging-col-rect"
                        />
                      )}

                      {/* Nhãn mã vật tư dưới trục X (xoay nghiêng -36 độ thon gọn, không đè nhau) */}
                      <text
                        x={col.slotCenter}
                        y={svgConfig.yBaseline + 5}
                        textAnchor="end"
                        transform={`rotate(-36, ${col.slotCenter}, ${svgConfig.yBaseline + 5})`}
                        fontSize="8"
                        fontWeight="600"
                        fill="#5D4037"
                        className="wh-aging-col-label"
                      >
                        {col.displayCode}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseTopAgingChart;
