import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList
} from 'recharts';

// Badge nhãn dữ liệu nền trắng viền cam đồng nhất 100% với Combo Chart
const CumulativePctBadgeLabel = (props) => {
  const { x, y, value } = props;
  if (value === undefined || value === null) return null;
  const formatted = `${Math.round(value)}%`;
  const width = Math.max(formatted.length * 7 + 10, 34);
  const height = 18;
  const rectX = x - width / 2;
  const rectY = y - height - 7;

  return (
    <g>
      <rect
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        rx={3}
        ry={3}
        fill="#FFFFFF"
        stroke="#E28A43"
        strokeWidth={1.5}
        filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.12))"
      />
      <text
        x={x}
        y={rectY + 12.5}
        fill="#C05621"
        textAnchor="middle"
        fontSize={10.5}
        fontWeight="800"
      >
        {formatted}
      </text>
    </g>
  );
};

/**
 * Biểu đồ 1: Pareto Top 10 Lỗi
 * - Thống nhất màu Cột (#7B5233) và Đường (#E28A43) với Combo chart
 * - DataLabel dạng Badge nền trắng viền cam đồng nhất 100%
 */
export default function ParetoDefectChart({ data }) {
  const [metric, setMetric] = useState('count');
  const items = data?.items || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="dash-custom-tooltip">
          <div className="dash-tooltip-title">{label} - {item.name}</div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">Số vụ:</span>
            <span className="dash-tooltip-val">{item.count} vụ ({item.percentage}%)</span>
          </div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">Bồi thường:</span>
            <span className="dash-tooltip-val">${item.amount?.toLocaleString()}</span>
          </div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">% Tích lũy:</span>
            <span className="dash-tooltip-val" style={{ color: '#E28A43' }}>{item.cumulative_pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dash-chart-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title">
          Top 10 Lỗi Khiếu Nại (Pareto)
        </div>

        <div className="dash-panel-controls">
          <div className="dash-micro-switch">
            <button
              type="button"
              className={`dash-micro-btn ${metric === 'count' ? 'active' : ''}`}
              onClick={() => setMetric('count')}
            >
              Số vụ
            </button>
            <button
              type="button"
              className={`dash-micro-btn ${metric === 'amount' ? 'active' : ''}`}
              onClick={() => setMetric('amount')}
            >
              Tiền ($)
            </button>
          </div>
        </div>
      </div>

      <div className="dash-chart-body">
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 100, color: '#8D6E63', fontSize: 13 }}>Không có dữ liệu lỗi</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={items} margin={{ top: 20, right: 10, left: -15, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1E9DF" vertical={false} />
              <XAxis
                dataKey="code"
                stroke="#8D6E63"
                tick={{ fill: '#7B5233', fontSize: 11, fontWeight: 700 }}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                yAxisId="left"
                stroke="#8D6E63"
                tick={{ fill: '#8D6E63', fontSize: 11 }}
                domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]}
                tickFormatter={(val) => (metric === 'amount' ? `$${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}` : val)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#8D6E63"
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                tick={{ fill: '#E28A43', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Cột thống nhất màu #7B5233 */}
              <Bar
                yAxisId="left"
                dataKey={metric}
                name={metric === 'count' ? 'Số vụ' : 'Tiền ($)'}
                fill="#7B5233"
                radius={[4, 4, 0, 0]}
                barSize={22}
              >
                <LabelList
                  dataKey={metric}
                  position="insideTop"
                  fill="#FFFFFF"
                  fontSize={11.5}
                  fontWeight={900}
                  dy={12}
                  formatter={(v) => (metric === 'amount' ? `$${v}` : v)}
                />
              </Bar>

              {/* Đường thống nhất màu #E28A43 - Đi kèm Badge nền trắng viền cam đồng nhất với Combo Chart */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative_pct"
                name="% Tích lũy"
                stroke="#E28A43"
                strokeWidth={2.5}
                dot={{ r: 4.5, fill: '#E28A43', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                label={<CumulativePctBadgeLabel />}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
