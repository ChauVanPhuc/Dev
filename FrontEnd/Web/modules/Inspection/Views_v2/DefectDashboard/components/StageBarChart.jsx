import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';

/**
 * [Z2] Tỷ lệ lỗi theo công đoạn (Horizontal Bar Chart)
 * - Tối ưu độ dày thanh bar (20px), bố cục rộng rãi, thoáng mắt.
 * - Triệt tiêu hoàn toàn viền focus đen khi click vào thanh bar.
 */
export const StageBarChart = ({ stageChartData, activeCrossFilter, onStageClick }) => {
  // Hiển thị top 5 công đoạn cao nhất với tỉ lệ vừa vặn và thanh bar dày dặn
  const top5Stages = (stageChartData || []).slice(0, 5);

  return (
    <div className="erp-chart-card">
      <div className="erp-chart-header">
        <span className="erp-chart-title">Tỷ lệ lỗi theo công đoạn</span>
      </div>

      <div className="erp-chart-body" style={{ outline: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={top5Stages}
            layout="vertical"
            margin={{ top: 12, right: 48, left: 14, bottom: 2 }}
            style={{ outline: 'none' }}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#F1F5F9" />
            <XAxis
              type="number"
              domain={[0, 1.2]}
              ticks={[0, 0.3, 0.6, 0.9, 1.2]}
              fontSize={9}
              stroke="#94A3B8"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              dataKey="stage_name"
              type="category"
              fontSize={9.5}
              fontWeight={600}
              stroke="#334155"
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              width={85}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                if (e && e.value) onStageClick({ stage_name: e.value });
              }}
            />
            <Tooltip
              formatter={(val, name, props) => [
                `${val}% (${(props.payload.defect_count || 0).toLocaleString()} lỗi / ${(props.payload.product_count || 0).toLocaleString()} SP)`,
                'Tỷ lệ lỗi'
              ]}
              contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.72rem', padding: '6px 10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
            />
            <Bar
              dataKey="defect_rate"
              fill="#7B5233"
              radius={[0, 4, 4, 0]}
              barSize={24}
              cursor="pointer"
              style={{ outline: 'none' }}
              onClick={(entry) => {
                if (entry) onStageClick(entry);
              }}
            >
              <LabelList
                dataKey="defect_rate"
                position="right"
                offset={8}
                content={(props) => {
                  const { x, y, width, height, value, index } = props;
                  const entry = top5Stages[index];
                  const isFiltered = activeCrossFilter?.type === 'stage';
                  const isSelected = isFiltered && entry &&
                    (entry.stage_name?.toLowerCase() === activeCrossFilter?.value?.toLowerCase());
                  const opacity = isFiltered && !isSelected ? 0.25 : 1;
                  return (
                    <text
                      x={x + width + 8}
                      y={y + (height ? height / 2 : 12)}
                      dominantBaseline="central"
                      fill="#2D1A12"
                      fontSize="0.92rem"
                      fontWeight="900"
                      opacity={opacity}
                    >
                      {value}%
                    </text>
                  );
                }}
              />
              {top5Stages.map((entry, index) => {
                const isFiltered = activeCrossFilter?.type === 'stage';
                const isSelected = isFiltered &&
                  (entry.stage_name?.toLowerCase() === activeCrossFilter?.value?.toLowerCase());
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isSelected ? '#4B301E' : '#7B5233'}
                    opacity={isFiltered && !isSelected ? 0.22 : 1}
                    style={{ outline: 'none', cursor: 'pointer', transition: 'opacity 0.2s, fill 0.2s' }}
                    onClick={(e) => {
                      e?.stopPropagation?.();
                      onStageClick(entry);
                    }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StageBarChart;
