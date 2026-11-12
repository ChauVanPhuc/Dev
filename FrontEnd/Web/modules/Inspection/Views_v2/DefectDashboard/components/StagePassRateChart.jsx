import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, LabelList, Cell } from 'recharts';
import { CheckCircle2 } from 'lucide-react';

// Biểu đồ so sánh tỷ lệ đạt (%) của các công đoạn với mục tiêu 95%
export const StagePassRateChart = ({ stagePassRates = [], onStageClick }) => {
  const hasData = Array.isArray(stagePassRates) && stagePassRates.length > 0;

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Tỷ lệ sản phẩm đạt theo công đoạn
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.67rem', color: '#78716C' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#795137', borderRadius: '2px' }} />
            Đạt ≥ 95%
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#AD8057', borderRadius: '2px' }} />
            Dưới 95%
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '1.5px', borderTop: '1.5px dashed #B91C1C' }} />
            Mục tiêu (95%)
          </span>
        </div>
      </div>

      {/* Nội dung biểu đồ */}
      <div className="erp-chart-body">
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có dữ liệu kiểm tra công đoạn
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stagePassRates}
              margin={{ top: 20, right: 12, left: 12, bottom: 20 }}
            >
              <XAxis
                dataKey="stage"
                fontSize={8.5}
                stroke="#78716C"
                tickLine={false}
                axisLine={{ stroke: '#E8E2DC' }}
                interval={0}
                tick={({ x, y, payload }) => {
                  const label = payload.value || '';
                  const short = label.length > 10 ? `${label.substring(0, 9)}...` : label;
                  return (
                    <text
                      x={x}
                      y={y + 10}
                      fill="#292524"
                      fontSize={8.5}
                      fontWeight={600}
                      textAnchor="middle"
                    >
                      {short}
                    </text>
                  );
                }}
              />
              <YAxis
                domain={[0, 100]}
                hide={true}
              />
              <ReferenceLine
                y={95}
                stroke="#B91C1C"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: 'Target: 95%',
                  position: 'top',
                  fill: '#B91C1C',
                  fontSize: 8.5,
                  fontWeight: 700
                }}
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
                        boxShadow: '0 4px 14px rgba(41, 37, 36, 0.08)',
                        fontSize: '0.74rem'
                      }}
                    >
                      <div style={{ fontWeight: '800', color: '#292524', marginBottom: '3px' }}>
                        {item.stage}
                      </div>
                      <div style={{ color: item.pass_rate >= 95 ? '#15803D' : '#B91C1C', fontWeight: '800' }}>
                        Tỷ lệ đạt: {item.pass_rate}%
                      </div>
                      <div style={{ color: '#78716C', fontSize: '0.68rem', marginTop: '2px' }}>
                        SP đạt: {Number(item.passed_products || 0).toLocaleString()} / {Number(item.total_products || 0).toLocaleString()} SP
                      </div>
                      <div style={{ color: '#78716C', fontSize: '0.66rem' }}>
                        Phiếu đạt / lỗi: {item.passed_lots} / {item.failed_lots} (Tổng {item.total_lots} phiếu)
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="pass_rate"
                radius={[4, 4, 0, 0]}
                barSize={24}
                cursor="pointer"
                onClick={(entry) => onStageClick && onStageClick(entry.stage)}
              >
                {stagePassRates.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pass_rate >= 95 ? '#795137' : '#AD8057'}
                  />
                ))}
                <LabelList
                  dataKey="pass_rate"
                  position="top"
                  fontSize={11.5}
                  fontWeight={800}
                  fill="#292524"
                  offset={4}
                  formatter={(v) => `${v}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default StagePassRateChart;

