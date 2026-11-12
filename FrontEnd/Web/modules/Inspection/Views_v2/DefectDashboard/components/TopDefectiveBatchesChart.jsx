import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Cell } from 'recharts';
import { PackageX } from 'lucide-react';

// Biểu đồ cột ngang Top 10 lô hàng có nhiều sản phẩm lỗi nhất
const getBatchBrownGradientColor = (val, minVal, maxVal) => {
  if (maxVal <= minVal) return '#795137';
  const ratio = (val - minVal) / (maxVal - minVal);
  if (ratio <= 0.2) return '#C4A78D';
  if (ratio <= 0.4) return '#B89B82';
  if (ratio <= 0.6) return '#AD8057';
  if (ratio <= 0.8) return '#795137';
  return '#5B3924';
};

export const TopDefectiveBatchesChart = ({ batches = [] }) => {
  const hasData = Array.isArray(batches) && batches.length > 0;
  const chartData = batches;

  const minVal = hasData ? Math.min(...chartData.map(b => Number(b.defective_products || 0))) : 0;
  const maxVal = hasData ? Math.max(...chartData.map(b => Number(b.defective_products || 0))) : 0;

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PackageX size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Top 10 lô hàng nhiều sản phẩm lỗi
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: '600' }}>
          Đơn vị: Sản phẩm lỗi
        </span>
      </div>

      {/* Nội dung biểu đồ */}
      <div className="erp-chart-body">
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có lô hàng phát sinh lỗi
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 6, bottom: 4 }}
            >
              {/* Ẩn trục X số và lưới dọc, giữ nhãn danh mục Y và datalabel cuối thanh */}
              <XAxis
                type="number"
                hide={true}
              />
              <YAxis
                dataKey="batch_no"
                type="category"
                fontSize={8.5}
                fontWeight={700}
                stroke="#78716C"
                tickLine={false}
                axisLine={{ stroke: '#E8E2DC' }}
                width={120}
                tick={({ x, y, payload }) => {
                  const label = payload.value || '';
                  return (
                    <text
                      x={x}
                      y={y + 3}
                      fill="#292524"
                      fontSize={8.5}
                      fontWeight={600}
                      textAnchor="end"
                    >
                      {label}
                    </text>
                  );
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
                        fontSize: '0.74rem',
                        color: '#292524'
                      }}
                    >
                      <div style={{ fontWeight: '800', color: '#292524', marginBottom: '4px' }}>
                        Lô: {item.batch_no} ({item.pallet_code || '---'})
                      </div>
                      <div style={{ color: '#795137', fontWeight: '800' }}>
                        Sản phẩm lỗi: {item.defective_products} / {item.total_products} SP ({item.defect_rate}%)
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="defective_products"
                fill="#795137"
                radius={[0, 4, 4, 0]}
                barSize={14}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.batch_no}`}
                    fill={getBatchBrownGradientColor(entry.defective_products, minVal, maxVal)}
                  />
                ))}
                <LabelList
                  dataKey="defective_products"
                  position="right"
                  fontSize={11.5}
                  fontWeight={800}
                  fill="#5B3924"
                  offset={4}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TopDefectiveBatchesChart;

