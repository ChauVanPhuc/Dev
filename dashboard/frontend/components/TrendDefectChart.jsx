import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { MOCK_FALLBACK } from '../services/mockFallbackData';

// Custom DataLabel vẽ khung viền bo góc chữ nhật giống hệt hình mẫu
const CustomBadgeLabel = (props) => {
  const { x, y, value, index } = props;
  if (value === undefined || value === null) return null;

  // Hiển thị chọn lọc các mốc quan trọng (đỉnh, đáy, số 0 hoặc số cao)
  const isKeyPoint = [0, 2, 4, 7, 10, 13, 15, 17, 19, 20, 22, 24, 26, 28, 29].includes(index) || value > 200;
  if (!isKeyPoint) return null;

  const textStr = String(value);
  const width = Math.max(textStr.length * 7 + 12, 22);
  const height = 18;
  const rectX = x - width / 2;
  const rectY = y - height - 6;

  return (
    <g>
      <rect
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        rx={4}
        ry={4}
        fill="#FFFFFF"
        stroke="#2D1A12"
        strokeWidth={1.5}
      />
      <text
        x={x}
        y={rectY + 12.5}
        fill="#2D1A12"
        textAnchor="middle"
        fontSize={10.5}
        fontWeight="800"
        fontFamily="sans-serif"
      >
        {value}
      </text>
    </g>
  );
};

export default function TrendDefectChart({ periodLabel = 'Tháng 08/2026' }) {
  const [selectedDefect, setSelectedDefect] = useState('ALL');
  const defectOptions = MOCK_FALLBACK.trendDefectsList;

  // Tính toán dữ liệu theo defect được chọn
  const rawDaily = MOCK_FALLBACK.trendDaily;
  const chartData = rawDaily.map((item) => {
    let factor = 1.0;
    if (selectedDefect === 'DVA_01') factor = 0.45;
    else if (selectedDefect === 'DVB_02') factor = 0.3;
    else if (selectedDefect === 'STR_01') factor = 0.25;
    else if (selectedDefect === 'MAT_03') factor = 0.2;
    else if (selectedDefect !== 'ALL') factor = 0.15;

    return {
      day: item.day,
      count: Math.round(item.count * factor)
    };
  });

  // Tính trung bình
  const totalCount = chartData.reduce((acc, cur) => acc + cur.count, 0);
  const avg = chartData.length > 0 ? (totalCount / chartData.length).toFixed(1) : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="dash-custom-tooltip">
          <div className="dash-tooltip-title">Ngày: {label}</div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">Số lỗi phát sinh:</span>
            <span className="dash-tooltip-val" style={{ color: '#7B5233' }}>{payload[0].value} vụ</span>
          </div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">Mức trung bình:</span>
            <span className="dash-tooltip-val" style={{ color: '#D97706' }}>TB: {avg}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Badge cho đường trung bình TB: Không bao giờ bị khuất số hay cắt xén
  const renderAvgBadge = (props) => {
    const { viewBox } = props;
    if (!viewBox) return null;
    const x = viewBox.x + viewBox.width - 75;
    const y = viewBox.y - 8;
    return (
      <g>
        <rect
          x={x - 4}
          y={y - 10}
          width={72}
          height={16}
          rx={3}
          fill="#FFFBEB"
          stroke="#D97706"
          strokeWidth={1.2}
          filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.08))"
        />
        <text
          x={x + 32}
          y={y}
          fill="#B45309"
          fontSize={10.5}
          fontWeight="800"
          textAnchor="middle"
          dominantBaseline="central"
        >
          TB: {avg}
        </text>
      </g>
    );
  };

  return (
    <div className="dash-chart-panel">
      <div className="dash-panel-header" style={{ marginBottom: 4 }}>
        <div className="dash-panel-title">
          Biểu đồ lỗi theo thời gian
        </div>

        {/* Dropdown Tên Lỗi & Badge TB đặt ngoài biểu đồ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dash-badge" style={{ background: '#FFFBEB', color: '#D97706', borderColor: '#FDE68A', fontWeight: 800 }}>
            TB: {avg} vụ
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7B5233' }}>Tên lỗi</span>
          <select
            className="dash-filter-select"
            value={selectedDefect}
            onChange={(e) => setSelectedDefect(e.target.value)}
            style={{ minWidth: 150, height: 32, fontSize: 12 }}
          >
            {defectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dash-chart-body" style={{ height: 270 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 25, right: 30, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1E9DF" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#8D6E63"
              tick={{ fill: '#7B5233', fontSize: 10.5, fontWeight: 700 }}
              interval={1}
            />
            <YAxis
              stroke="#8D6E63"
              tick={{ fill: '#8D6E63', fontSize: 10.5 }}
              domain={[0, (dataMax) => Math.ceil(dataMax + 40)]}
              allowDataOverflow={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Đường trung bình tham chiếu - Nhãn đưa ra ngoài tiêu đề, không che số liệu */}
            <ReferenceLine
              y={Number(avg)}
              stroke="#D97706"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* Đường chi tiết dạng monotone uốn lượn mượt mà, KHÔNG BAO GIỜ bị võng xuống dưới số 0 */}
            <Line
              type="monotone"
              dataKey="count"
              stroke="#7B5233"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#7B5233' }}
              activeDot={{ r: 5 }}
              label={<CustomBadgeLabel />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
