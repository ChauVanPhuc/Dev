import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  LabelList
} from 'recharts';
import { Boxes } from 'lucide-react';

// Biểu đồ chất lượng theo dòng hàng (APT, ADV, FOL) từ API `product_line_breakdown`:
// - Cột: Tổng phiếu kiểm tra và sản phẩm lỗi
// - Đường: Tỷ lệ lỗi trên sản phẩm (%)
export const ProductLineDefectChart = ({ productLines = [] }) => {
  const chartData = useMemo(() => {
    if (!Array.isArray(productLines) || productLines.length === 0) {
      return [];
    }

    const orderMap = { APT: 1, ADV: 2, FOL: 3, OTHER: 4 };
    return [...productLines].sort(
      (a, b) => (orderMap[a.line_code] || 99) - (orderMap[b.line_code] || 99)
    );
  }, [productLines]);

  const hasData = chartData.length > 0;

  // Nhãn tỷ lệ lỗi dạng thẻ nền trắng viền cam sáng nổi bật, cách xa điểm marker
  const renderRatePillLabel = (props) => {
    const { x, y, value } = props;
    if (value === undefined || value === null) return null;
    const num = Number(value);
    const formatted = Number.isInteger(num) ? `${num}%` : `${num.toFixed(1)}%`;
    const labelY = Math.max(14, y - 20);
    return (
      <g key={`lbl-line-${x}-${y}`} style={{ pointerEvents: 'none' }}>
        <rect
          x={x - 22}
          y={labelY - 14}
          width={44}
          height={17}
          rx={4}
          fill="#FFFFFF"
          stroke="#EA580C"
          strokeWidth={1.3}
        />
        <text
          x={x}
          y={labelY - 2}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={800}
          fill="#EA580C"
        >
          {formatted}
        </text>
      </g>
    );
  };

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Boxes size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Chất lượng theo dòng hàng (APT · ADV · FOL)
          </span>
        </div>
        <span style={{ fontSize: '0.67rem', color: '#78716C', fontWeight: '600' }}>
          Tổng hợp phân khúc sản phẩm
        </span>
      </div>

      {/* Chú thích biểu đồ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.66rem',
          fontWeight: '700',
          marginBottom: '2px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#6B4226' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#6B4226', borderRadius: '2px' }} />
          <span>Tổng phiếu KT</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#DC2626' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#DC2626', borderRadius: '2px' }} />
          <span>SP lỗi</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#EA580C' }}>
          <span style={{ width: '12px', height: '2.5px', backgroundColor: '#EA580C' }} />
          <span>● Tỷ lệ lỗi trên SP (%)</span>
        </div>
      </div>

      {/* Nội dung biểu đồ */}
      <div className="erp-chart-body" style={{ flex: 1, minHeight: 0 }}>
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có dữ liệu dòng hàng
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 32, right: 28, left: 28, bottom: 4 }}
            >
              <XAxis
                dataKey="line_code"
                fontSize={9.5}
                fontWeight={800}
                stroke="#44403C"
                tickLine={false}
                axisLine={{ stroke: '#E8E2DC' }}
              />
              <YAxis
                yAxisId="qty"
                hide={true}
                domain={[0, (dataMax) => Math.max(Math.ceil(dataMax * 1.3), 10)]}
              />
              <YAxis
                yAxisId="rate"
                orientation="right"
                hide={true}
                domain={[0, (dataMax) => Math.max(Math.ceil(dataMax * 1.35), 5)]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E8E2DC',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                        fontSize: '0.70rem',
                        minWidth: '200px'
                      }}
                    >
                      <div style={{ fontWeight: '800', color: '#292524', marginBottom: '4px', borderBottom: '1px solid #E8E2DC', paddingBottom: '3px' }}>
                        {item.line_name} ({item.line_code})
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px', color: '#57534E' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '7px', height: '7px', backgroundColor: '#6B4226', borderRadius: '1px', flexShrink: 0 }} />
                          <span>Tổng phiếu kiểm tra:</span>
                        </span>
                        <strong style={{ color: '#6B4226' }}>{item.orders} phiếu</strong>

                        <span style={{ paddingLeft: '12px' }}>Phiếu đạt:</span>
                        <strong style={{ color: '#15803D' }}>{item.passed_orders} phiếu</strong>

                        <span style={{ paddingLeft: '12px' }}>Phiếu K.Đạt:</span>
                        <strong style={{ color: '#DC2626' }}>{item.failed_orders} phiếu</strong>

                        <span style={{ paddingLeft: '12px' }}>Tỷ lệ phiếu đạt:</span>
                        <strong style={{ color: item.pass_rate >= 70 ? '#15803D' : '#DC2626' }}>{item.pass_rate}%</strong>

                        <span style={{ paddingLeft: '12px' }}>SP kiểm định:</span>
                        <strong style={{ color: '#292524' }}>{Number(item.inspected_qty || 0).toLocaleString('vi-VN')} SP</strong>

                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '7px', height: '7px', backgroundColor: '#DC2626', borderRadius: '1px', flexShrink: 0 }} />
                          <span>Sản phẩm lỗi:</span>
                        </span>
                        <strong style={{ color: '#DC2626' }}>{item.defective_qty} SP</strong>

                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '10px', height: '2px', backgroundColor: '#EA580C', borderRadius: '1px', flexShrink: 0 }} />
                          <span>Tỷ lệ lỗi trên SP:</span>
                        </span>
                        <strong style={{ color: '#EA580C' }}>{item.defect_rate}%</strong>

                        <span style={{ paddingLeft: '12px' }}>Tỷ trọng lỗi xưởng:</span>
                        <strong style={{ color: '#6B4226' }}>{item.defect_share}%</strong>
                      </div>
                    </div>
                  );
                }}
              />

              <Bar
                yAxisId="qty"
                dataKey="orders"
                name="Tổng phiếu KT"
                fill="#6B4226"
                radius={[3, 3, 0, 0]}
                barSize={20}
              >
                <LabelList
                  dataKey="orders"
                  position="top"
                  fontSize={11.5}
                  fontWeight={800}
                  fill="#6B4226"
                  offset={5}
                />
              </Bar>

              <Bar
                yAxisId="qty"
                dataKey="defective_qty"
                name="SP lỗi"
                fill="#DC2626"
                radius={[3, 3, 0, 0]}
                barSize={20}
              >
                <LabelList
                  dataKey="defective_qty"
                  position="top"
                  fontSize={11.5}
                  fontWeight={800}
                  fill="#DC2626"
                  offset={5}
                />
              </Bar>

              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="defect_rate"
                name="Tỷ lệ lỗi trên SP (%)"
                stroke="#EA580C"
                strokeWidth={2.4}
                dot={{ r: 4, fill: '#EA580C', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                activeDot={{ r: 6, fill: '#EA580C' }}
                label={renderRatePillLabel}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ProductLineDefectChart;

