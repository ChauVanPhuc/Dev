import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, ReferenceLine, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { BarChart3 } from 'lucide-react';

// Biểu đồ Pareto nguyên nhân lỗi (nguyên tắc 80/20):
// - Cột: Số lượng lỗi của từng nguyên nhân
// - Đường: Tỷ lệ lũy kế (%) và đường tham chiếu 80%
export const ParetoDefectChart = ({
  paretoList = [],
  allDefects = [],
  onDefectClick
}) => {
  const [viewMode, setViewMode] = useState('top10'); // 'top10' | 'all'

  // Chuẩn bị dữ liệu hiển thị theo chế độ
  const chartData = useMemo(() => {
    if (viewMode === 'top10') {
      return paretoList.slice(0, 10);
    }

    // Chế độ xem toàn bộ nguyên nhân (tính lũy kế đạt 100%)
    const source = allDefects && allDefects.length > 0 ? allDefects : paretoList;
    const totalCount = source.reduce((s, d) => s + (Number(d.count) || 0), 0);
    let cum = 0;

    return source.map((d, idx) => {
      cum += Number(d.count || 0);
      const cumPct = totalCount > 0 ? Math.round((cum / totalCount) * 1000) / 10 : 0.0;
      const pct = totalCount > 0 ? Math.round((d.count / totalCount) * 1000) / 10 : 0.0;
      return {
        ...d,
        rank: idx + 1,
        percentage: pct,
        cumulative_percentage: Math.min(100.0, cumPct)
      };
    });
  }, [viewMode, paretoList, allDefects]);

  const hasData = Array.isArray(chartData) && chartData.length > 0;
  const maxCount = Math.max(...chartData.map((p) => Number(p.count || 0)), 10);
  const leftYMax = Math.ceil(maxCount * 1.28);

  // Tìm các mốc lũy kế thực tế: ~20%, ~40%, ~60%, ~80%, mốc đầu và mốc cuối kỳ
  const milestoneIndices = useMemo(() => {
    if (!chartData || chartData.length === 0) return new Set();
    const indices = new Set();
    const targets = [20, 40, 60, 80];

    targets.forEach((target) => {
      const idx = chartData.findIndex((d) => Number(d.cumulative_percentage) >= target);
      if (idx !== -1) indices.add(idx);
    });

    indices.add(0);
    indices.add(chartData.length - 1);

    return indices;
  }, [chartData]);

  // Nhãn tỷ lệ lũy kế (%)
  const renderCumulativeLabel = (props) => {
    const { x, y, value, index } = props;
    if (value === undefined || value === null) return null;

    if (!milestoneIndices.has(index)) return null;

    const isAbove80 = Number(value) >= 80;

    return (
      <g key={`cum-label-${index}`} style={{ pointerEvents: 'none' }}>
        <rect
          x={x - 21}
          y={y - 20}
          width={42}
          height={16}
          rx={4}
          fill={isAbove80 ? '#FEF2F2' : '#FFFFFF'}
          stroke={isAbove80 ? '#DC2626' : '#D97706'}
          strokeWidth={1}
          opacity={0.96}
        />
        <text
          x={x}
          y={y - 8}
          fill={isAbove80 ? '#DC2626' : '#D97706'}
          fontSize={11}
          fontWeight={800}
          textAnchor="middle"
        >
          {`${value}%`}
        </text>
      </g>
    );
  };

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Pareto nguyên nhân lỗi (Nguyên tắc 80/20)
          </span>
        </div>

        {/* Nút chuyển chế độ xem: Top 10 vs Toàn bộ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className="page-btn"
            onClick={() => setViewMode('top10')}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: viewMode === 'top10' ? '#795137' : '#E8E2DC',
              backgroundColor: viewMode === 'top10' ? '#795137' : '#FFFFFF',
              color: viewMode === 'top10' ? '#FFFFFF' : '#57534E',
              fontSize: '0.66rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Top 10 lỗi
          </button>
          <button
            type="button"
            className="page-btn"
            onClick={() => setViewMode('all')}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: viewMode === 'all' ? '#795137' : '#E8E2DC',
              backgroundColor: viewMode === 'all' ? '#795137' : '#FFFFFF',
              color: viewMode === 'all' ? '#FFFFFF' : '#57534E',
              fontSize: '0.66rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Toàn bộ
          </button>
        </div>
      </div>

      {/* Nội dung biểu đồ */}
      <div className="erp-chart-body">
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có phát sinh lỗi trong phạm vi lọc
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 24, right: 14, left: 14, bottom: 18 }}
            >
              <XAxis
                dataKey="defect_name"
                fontSize={8}
                stroke="#78716C"
                tickLine={false}
                axisLine={{ stroke: '#E8E2DC' }}
                interval={0}
                tick={({ x, y, payload }) => {
                  const label = payload.value || '';
                  const maxChars = viewMode === 'top10' ? 12 : 7;
                  const short = label.length > maxChars ? `${label.substring(0, maxChars - 1)}..` : label;
                  return (
                    <text
                      x={x}
                      y={y + 10}
                      fill="#292524"
                      fontSize={viewMode === 'top10' ? 8.5 : 7.5}
                      fontWeight={600}
                      textAnchor="middle"
                    >
                      {short}
                    </text>
                  );
                }}
              />
              <YAxis yAxisId="left" hide={true} domain={[0, leftYMax]} />
              <YAxis yAxisId="right" orientation="right" hide={true} domain={[0, 100]} />
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
                        padding: '8px 10px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ fontWeight: '800', color: '#292524', marginBottom: '2px' }}>
                        {item.defect_name}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#78716C', marginBottom: '4px' }}>
                        Mã lỗi: <strong>{item.defect_code || '---'}</strong>
                      </div>
                      <div style={{ color: '#78716C' }}>
                        Số lượng lỗi: <strong style={{ color: '#795137' }}>{Number(item.count).toLocaleString('vi-VN')} lỗi</strong>
                      </div>
                      <div style={{ color: '#78716C' }}>
                        Tỷ trọng: <strong>{item.percentage}%</strong>
                      </div>
                      <div style={{ color: '#D97706', marginTop: '2px', borderTop: '1px dashed #E8E2DC', paddingTop: '3px' }}>
                        % Lũy kế: <strong>{item.cumulative_percentage}%</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                yAxisId="right"
                y={80}
                stroke="#DC2626"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: '80%', position: 'top', fill: '#DC2626', fontSize: 9.5, fontWeight: '800' }}
              />
              <Bar
                yAxisId="left"
                dataKey="count"
                name="Số lỗi"
                fill="#795137"
                barSize={viewMode === 'top10' ? 22 : 11}
                radius={[3, 3, 0, 0]}
                cursor="pointer"
                onClick={(entry) => onDefectClick && onDefectClick(entry)}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill="#795137" cursor="pointer" />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  fontSize={viewMode === 'top10' ? 11.5 : 9.5}
                  fontWeight={800}
                  fill="#5B3924"
                  offset={4}
                />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative_percentage"
                name="% Lũy kế"
                stroke="#D97706"
                strokeWidth={2.4}
                dot={{ r: 3.5, fill: '#D97706', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                activeDot={{ r: 5.5, fill: '#DC2626', stroke: '#FFFFFF', strokeWidth: 2 }}
                label={renderCumulativeLabel}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ParetoDefectChart;
