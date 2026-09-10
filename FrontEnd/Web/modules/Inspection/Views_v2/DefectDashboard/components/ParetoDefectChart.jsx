import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

/**
 * Custom Label cho đường % Lũy kế:
 * Tự động phân luồng tránh đè chữ:
 * - Khi ở các cột có đường cắt ngang gần đỉnh cột (như Cong vênh, Sứt mẻ): Thẻ % đặt PHÍA DƯỚI điểm nút (y + 10).
 * - Khi ở các cột khác: Thẻ % đặt PHÍA TRÊN điểm nút (y - 18).
 * => Đảm bảo số lượng cột màu đen ở trên đỉnh cột và thẻ % không bao giờ chạm nhau!
 */
const renderSmartParetoLineLabel = (props) => {
  const { x, y, value, index } = props;
  if (value === undefined || value === null) return null;

  // Cột 3 và 4 (Trầy xước, Cong vênh) là điểm giao thoa gần đỉnh cột -> Đặt thẻ % ở PHÍA DƯỚI điểm nút
  const isCrossover = index === 2 || index === 3;
  const rectY = isCrossover ? y + 10 : y - 18;
  const textY = isCrossover ? y + 19 : y - 9;

  return (
    <g>
      <rect
        x={x - 20}
        y={rectY - 2}
        width={40}
        height={18}
        rx={3.5}
        fill="#FFFFFF"
        stroke="#DC2626"
        strokeWidth={1.2}
      />
      <text
        x={x}
        y={textY}
        fill="#DC2626"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="900"
      >
        {`${value}%`}
      </text>
    </g>
  );
};

/**
 * [Z3] Pareto lỗi trọng yếu (Composed Chart)
 * - Tương tác click liên kết biểu đồ (Cross-filter theo loại lỗi).
 * - Số lượng màu đen nằm phía trên đỉnh cột rõ ràng, chuẩn đẹp.
 * - Thanh cột to khỏe (barSize 32px), bề rộng thoáng mát.
 */
export const ParetoDefectChart = ({ paretoList, activeCrossFilter, onDefectClick }) => {
  const paretoData = paretoList || [];

  // Tính max count để set domain cho trục Y bên trái linh hoạt
  const maxCount = Math.max(...paretoData.map(p => p.count || 0), 100);
  const leftMax = Math.ceil(maxCount / 50) * 50;

  const renderBarTopLabel = (props) => {
    const { x, width, y, value, index } = props;
    if (!value) return null;
    const entry = paretoData[index];
    const isFiltered = activeCrossFilter?.type === 'defect';
    const isSelected = isFiltered && entry &&
      (entry.defect_name?.toLowerCase() === activeCrossFilter?.value?.toLowerCase());
    const opacity = isFiltered && !isSelected ? 0.22 : 1;
    return (
      <text
        x={x + width / 2}
        y={y - 9}
        fill="#0F172A"
        textAnchor="middle"
        fontSize="12"
        fontWeight="900"
        opacity={opacity}
      >
        {Number(value).toLocaleString()}
      </text>
    );
  };

  return (
    <div className="erp-chart-card">
      <div className="erp-chart-header">
        <span className="erp-chart-title">Pareto lỗi trọng yếu</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.68rem', fontWeight: '700' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4B301E' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#7B5233', borderRadius: '1px', display: 'inline-block' }}></span>
            Số lượng lỗi
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626' }}>
            <span style={{ width: '12px', height: '2px', backgroundColor: '#DC2626', display: 'inline-block' }}></span>
            % Lũy kế
          </span>
        </div>
      </div>

      <div className="erp-chart-body" style={{ outline: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={paretoData}
            margin={{ top: 26, right: 16, left: -14, bottom: 4 }}
            style={{ outline: 'none' }}
            onClick={(state) => {
              if (state && state.activePayload && state.activePayload.length > 0 && onDefectClick) {
                onDefectClick(state.activePayload[0].payload.defect_name);
              }
            }}
          >
            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="defect_name"
              fontSize={8.5}
              stroke="#475569"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              interval={0}
              angle={paretoData.length > 6 ? -15 : 0}
              textAnchor={paretoData.length > 6 ? 'end' : 'middle'}
              height={paretoData.length > 6 ? 26 : 18}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[0, leftMax]}
              stroke="#94A3B8"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              stroke="#DC2626"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value, name) => [name === '% Lũy kế' ? `${value}%` : `${Number(value).toLocaleString()} lỗi`, name]}
              contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.72rem', padding: '6px 10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
            />
            <Bar
              yAxisId="left"
              dataKey="count"
              name="Số lượng lỗi"
              fill="#7B5233"
              radius={[4, 4, 0, 0]}
              barSize={32}
              label={renderBarTopLabel}
              cursor="pointer"
            >
              {paretoData.map((entry, index) => {
                const isFiltered = activeCrossFilter?.type === 'defect';
                const isSelected = isFiltered &&
                  (entry.defect_name?.toLowerCase() === activeCrossFilter?.value?.toLowerCase());
                return (
                  <Cell
                    key={`pareto-cell-${index}`}
                    fill={isSelected ? '#4B301E' : index === 0 ? '#5C3D24' : '#7B5233'}
                    opacity={isFiltered && !isSelected ? 0.22 : 1}
                    style={{ outline: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
                    onClick={(e) => {
                      e?.stopPropagation?.();
                      if (onDefectClick) onDefectClick(entry.defect_name);
                    }}
                  />
                );
              })}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative_percentage"
              name="% Lũy kế"
              stroke="#DC2626"
              strokeWidth={2.2}
              dot={{ r: 3.5, fill: '#DC2626', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 5.5, fill: '#DC2626', stroke: '#FFFFFF', strokeWidth: 2 }}
              label={renderSmartParetoLineLabel}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ParetoDefectChart;
