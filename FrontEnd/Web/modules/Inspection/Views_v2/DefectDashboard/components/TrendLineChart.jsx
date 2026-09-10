import React from 'react';
import { ResponsiveContainer, LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MoreVertical } from 'lucide-react';

/**
 * Custom Data Label thông minh dạng Thẻ Badge (có nền trắng + viền rõ nét):
 * 1. Số to rõ hơn (font 10px, fontWeight 800), có background che đường lưới chống chìm số.
 * 2. Điểm VƯỢT TRUNG BÌNH (> avgRate): Viền đỏ + chữ đỏ nổi bật.
 * 3. Điểm bình thường/đáy: Viền xám + chữ đen đậm nét.
 * 4. Không hiển thị ở điểm cuối để tránh đè vào nhãn "TB: ...".
 */
const createSmartTrendLabelRenderer = (data, avgRate, activeCrossFilter) => {
  if (!data || data.length === 0) return () => null;

  const validRates = data.map(d => Number(d.defect_rate || 0));
  const minVal = Math.min(...validRates);
  const totalPoints = data.length;

  return (props) => {
    const { x, y, value, index } = props;
    if (value === undefined || value === null) return null;

    const item = data[index];
    const isDateFiltered = activeCrossFilter?.type === 'date';
    const isSelected = isDateFiltered && (
      activeCrossFilter?.value === item?.displayDate ||
      activeCrossFilter?.value === item?.date
    );

    // Khi đang chọn 1 ngày: Chỉ hiện thẻ của ngày đó, hoặc làm mờ các ngày khác
    if (isDateFiltered && !isSelected) return null;

    const numVal = Number(value);
    const isExceeded = numVal > avgRate;
    const isMin = numVal === minVal;
    const isSampled = index % 4 === 0;
    const isLast = index === totalPoints - 1;

    // Không hiển thị ở điểm cuối cùng để tránh rối mắt (trừ khi đang chọn đúng điểm đó)
    if (isLast && !isSelected) return null;

    // Chỉ hiển thị: Điểm vượt TB, hoặc điểm đáy Min, hoặc điểm mốc cách 4 ngày (hoặc đang được chọn)
    if (!isSelected && !isExceeded && !isMin && !isSampled) return null;

    // Màu sắc: Vượt TB -> Màu ĐỎ (#DC2626); Đang chọn -> Màu Nâu đậm (#4B301E); Bình thường -> Viền xám, chữ đen (#0F172A)
    const strokeColor = isSelected ? '#4B301E' : (isExceeded ? '#DC2626' : '#CBD5E1');
    const textColor = isSelected ? '#4B301E' : (isExceeded ? '#DC2626' : '#0F172A');
    const fillColor = isExceeded && !isSelected ? '#FFF5F5' : '#FFFFFF';
    const badgeWidth = 46;
    const badgeHeight = 20;

    return (
      <g>
        {/* Background Badge trắng viền sắc nét, chống chìm màu */}
        <rect
          x={x - badgeWidth / 2}
          y={y - 25}
          width={badgeWidth}
          height={badgeHeight}
          rx={4}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected || isExceeded ? 1.8 : 1.2}
        />
        {/* Chữ số to rõ nét */}
        <text
          x={x}
          y={y - 14}
          fill={textColor}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="12"
          fontWeight="900"
        >
          {`${value}%`}
        </text>
      </g>
    );
  };
};

/**
 * Custom Label cho đường Trung bình (TB):
 * Đặt hoàn toàn ở lề ngoài bên phải (x + width + 4), tách biệt 100% không bao giờ dính vào đường biểu đồ!
 */
const renderAvgReferenceLabel = (avgRate) => (props) => {
  const { viewBox } = props;
  if (!viewBox) return null;
  const { x, y, width } = viewBox;

  const text = `TB: ${avgRate}%`;
  const badgeWidth = 46;
  const badgeHeight = 16;
  // Đặt ở vùng lề phải bên ngoài vùng vẽ đường
  const badgeX = x + width + 4;
  const badgeY = y - badgeHeight / 2;

  return (
    <g>
      <rect
        x={badgeX}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        rx={3.5}
        fill="#FFFFFF"
        stroke="#DC2626"
        strokeWidth={1.2}
      />
      <text
        x={badgeX + badgeWidth / 2}
        y={badgeY + badgeHeight / 2}
        fill="#DC2626"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        fontWeight="800"
      >
        {text}
      </text>
    </g>
  );
};

/**
 * [Z1] Xu hướng tỷ lệ lỗi theo thời gian (Line Chart)
 * - Legend hiển thị rõ ràng: "Tỷ lệ lỗi" & "Trung bình (0.79%)".
 * - Data label có background trắng, số to rõ 12px.
 * - Nhãn "TB: 0.79%" đặt ở lề ngoài bên phải, tách biệt hoàn toàn không dính vào đường vẽ.
 */
export const TrendLineChart = ({ trendChartData, activeCrossFilter, avgRate = 0.8, onDateClick }) => {
  const smartLabelRenderer = createSmartTrendLabelRenderer(trendChartData, avgRate, activeCrossFilter);

  return (
    <div className="erp-chart-card">
      <div className="erp-chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="erp-chart-title">Xu hướng tỷ lệ lỗi theo thời gian</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MoreVertical size={14} style={{ color: '#94A3B8', cursor: 'pointer' }} />
        </div>
      </div>

      <div className="erp-chart-body" style={{ outline: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendChartData}
            margin={{ top: 26, right: 54, left: -20, bottom: 0 }}
            style={{ outline: 'none', cursor: 'pointer' }}
            onClick={(state) => {
              if (state && state.activePayload && state.activePayload.length > 0 && onDateClick) {
                onDateClick(state.activePayload[0].payload);
              }
            }}
          >
            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="displayDate"
              fontSize={9}
              stroke="#94A3B8"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              domain={[0, 1.2]}
              ticks={[0, 0.3, 0.6, 0.9, 1.2]}
              fontSize={9}
              stroke="#94A3B8"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value, name, props) => [
                `${value}% (${(props.payload.defect_count || 0).toLocaleString()} lỗi / ${(props.payload.product_count || 0).toLocaleString()} SP)`,
                'Tỷ lệ lỗi'
              ]}
              labelFormatter={(lbl) => `Ngày ${lbl}`}
              contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.72rem', padding: '6px 10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
            />

            {/* Đường trung bình màu đỏ nét đứt + Nhãn TB đặt ở lề ngoài bên phải */}
            <ReferenceLine
              y={avgRate}
              stroke="#DC2626"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={renderAvgReferenceLabel(avgRate)}
            />

            <Line
              type="monotone"
              dataKey="defect_rate"
              name="Tỷ lệ lỗi (%)"
              stroke="#7B5233"
              strokeWidth={2.4}
              dot={(dotProps) => {
                const isFiltered = activeCrossFilter?.type === 'date';
                const isSelected = isFiltered &&
                  (activeCrossFilter?.value === dotProps.payload?.displayDate || activeCrossFilter?.value === dotProps.payload?.date);
                const isExceeded = Number(dotProps.payload?.defect_rate || 0) > avgRate;

                const dotColor = isSelected ? '#4B301E' : (isExceeded ? '#DC2626' : '#7B5233');
                const dotRadius = isSelected ? 6 : (isExceeded ? 4.5 : 3.5);

                return (
                  <circle
                    key={`dot-${dotProps.index}`}
                    cx={dotProps.cx}
                    cy={dotProps.cy}
                    r={dotRadius}
                    fill={dotColor}
                    opacity={isFiltered && !isSelected ? 0.22 : 1}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected || isExceeded ? 2 : 1.5}
                    style={{ cursor: 'pointer', transition: 'r 0.15s, opacity 0.2s' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDateClick) onDateClick(dotProps.payload);
                    }}
                  />
                );
              }}
              activeDot={{
                r: 6.5,
                fill: '#4B301E',
                stroke: '#FFFFFF',
                strokeWidth: 2,
                cursor: 'pointer',
                onClick: (e, payload) => {
                  if (payload && payload.payload && onDateClick) onDateClick(payload.payload);
                }
              }}
              label={smartLabelRenderer}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendLineChart;
