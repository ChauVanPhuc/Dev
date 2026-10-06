import React from 'react';
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

// Custom Badge cho nhãn Tiền Phạt ($k): Luôn có nền trắng viền cam, không bao giờ bị đè nền hay chìm vào cột/đường
const AmountBadgeLabel = (props) => {
  const { x, y, value } = props;
  if (value === undefined || value === null) return null;

  const formatted = `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`;
  const width = formatted.length * 7 + 10;
  const height = 18;
  const rectX = x - width / 2;
  const rectY = y - height - 5;

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
        y={rectY + 12}
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
 * Biểu đồ: Tương Quan Số Vụ & Tiền Phạt
 * - Giải quyết triệt để vấn đề đè nền:
 *   + Trục Y1 (Số vụ) nới domain lên 1.4x để cột nằm gọn ở nửa dưới
 *   + Trục Y2 (Tiền phạt) domain 1.15x để đường nằm ở nửa trên thoáng đãng
 *   + Số vụ: Đặt insideTop thân cột với chữ trắng đậm #FFFFFF
 *   + Tiền phạt: Đóng badge nền trắng viền cam #E28A43 nổi bật 100%
 */
export default function ComboCasesAmountChart({ data }) {
  const chartData = data?.data || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div className="dash-custom-tooltip">
          <div className="dash-tooltip-title">Kỳ: {label}</div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label" style={{ color: '#7B5233' }}>Số vụ khiếu nại:</span>
            <span className="dash-tooltip-val">{row.cases} vụ</span>
          </div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label" style={{ color: '#E28A43' }}>Tiền bồi thường:</span>
            <span className="dash-tooltip-val">${row.amount?.toLocaleString()}</span>
          </div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">Chi phí TB / vụ:</span>
            <span className="dash-tooltip-val" style={{ color: '#8D6E63' }}>
              ${row.cases > 0 ? (row.amount / row.cases).toFixed(1) : 0}
            </span>
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
          Tương Quan Số Vụ & Tiền Phạt
        </div>
      </div>

      <div className="dash-chart-body">
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 100, color: '#8D6E63', fontSize: 13 }}>Không có dữ liệu tương quan</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 22, right: 12, left: -15, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1E9DF" vertical={false} />
              <XAxis dataKey="period" stroke="#8D6E63" tick={{ fill: '#8D6E63', fontSize: 11 }} />

              {/* Trục Y1 (Trái): Số vụ - Thang đo 1.15x cân đối, không dư khoảng trắng */}
              <YAxis
                yAxisId="left"
                stroke="#7B5233"
                tick={{ fill: '#7B5233', fontSize: 11, fontWeight: 700 }}
                domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]}
              />

              {/* Trục Y2 (Phải): Tiền ($) - Thang đo 1.15x vừa khít */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#E28A43"
                tick={{ fill: '#E28A43', fontSize: 11, fontWeight: 700 }}
                domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Cột: Số vụ - Nằm lọt bên trong thân cột, chữ trắng nổi bật */}
              <Bar
                yAxisId="left"
                dataKey="cases"
                name="Số vụ khiếu nại"
                fill="#7B5233"
                radius={[4, 4, 0, 0]}
                barSize={22}
              >
                <LabelList
                  dataKey="cases"
                  position="insideTop"
                  fill="#FFFFFF"
                  fontSize={11.5}
                  fontWeight={900}
                  dy={14}
                />
              </Bar>

              {/* Đường: Tiền bồi thường - Đi kèm Badge nền trắng viền cam không bao giờ bị đè nền */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="amount"
                name="Tiền bồi thường ($)"
                stroke="#E28A43"
                strokeWidth={2.5}
                dot={{ r: 4.5, fill: '#E28A43', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                label={<AmountBadgeLabel />}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
