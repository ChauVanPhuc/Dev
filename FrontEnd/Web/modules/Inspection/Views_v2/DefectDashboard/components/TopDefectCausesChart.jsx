import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { AlertTriangle } from 'lucide-react';

// Biểu đồ cột ngang Top 10 nguyên nhân lỗi phát sinh nhiều nhất
const getBrownGradientColor = (count, minCount, maxCount) => {
  if (maxCount <= minCount) return '#795137';
  const ratio = (count - minCount) / (maxCount - minCount);
  if (ratio <= 0.15) return '#C4A78D';
  if (ratio <= 0.40) return '#B89B82';
  if (ratio <= 0.65) return '#AD8057';
  if (ratio <= 0.85) return '#795137';
  return '#5B3924';
};

export const TopDefectCausesChart = ({ topDefectCauses = [], onDefectClick }) => {
  const hasData = Array.isArray(topDefectCauses) && topDefectCauses.length > 0;
  // Dữ liệu sắp xếp tăng dần từ thấp đến cao để hiển thị từ trên xuống
  const chartData = topDefectCauses;

  const minCount = hasData ? Math.min(...chartData.map((d) => Number(d.count || 0))) : 0;
  const maxCount = hasData ? Math.max(...chartData.map((d) => Number(d.count || 0))) : 0;

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Top 10 nguyên nhân lỗi phát sinh
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: '600' }}>
          Đơn vị: Số lỗi
        </span>
      </div>

      {/* Nội dung biểu đồ */}
      <div className="erp-chart-body">
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có dữ liệu lỗi trong phạm vi lọc
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 6, bottom: 4 }}
            >
              <XAxis type="number" hide={true} />
              <YAxis
                dataKey="defect_name"
                type="category"
                interval={0}
                fontSize={8.5}
                fontWeight={600}
                stroke="#78716C"
                tickLine={false}
                axisLine={{ stroke: '#E8E2DC' }}
                width={130}
                tick={({ x, y, payload }) => {
                  const label = payload.value || '';
                  const short = label.length > 20 ? `${label.substring(0, 19)}...` : label;
                  return (
                    <text
                      x={x}
                      y={y + 3}
                      fill="#292524"
                      fontSize={8.5}
                      fontWeight={600}
                      textAnchor="end"
                    >
                      {short}
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
                        fontSize: '0.74rem'
                      }}
                    >
                      <div style={{ fontWeight: '800', color: '#292524', marginBottom: '3px' }}>
                        {item.defect_name} ({item.defect_code})
                      </div>
                      <div style={{ color: '#795137', fontWeight: '800' }}>
                        Số lỗi: {item.count} ({item.percentage}%)
                      </div>
                      <div style={{ color: '#78716C', fontSize: '0.68rem', marginTop: '2px' }}>
                        Mức AQL: <strong style={{ color: item.aql_class === 'Critical' ? '#B91C1C' : '#795137' }}>{item.aql_class}</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="count"
                fill="#795137"
                radius={[0, 4, 4, 0]}
                barSize={14}
                cursor="pointer"
                onClick={(entry) => onDefectClick && onDefectClick(entry)}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.defect_code}`}
                    fill={getBrownGradientColor(entry.count, minCount, maxCount)}
                  />
                ))}
                <LabelList
                  dataKey="count"
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

export default TopDefectCausesChart;

