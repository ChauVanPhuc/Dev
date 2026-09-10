import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const DONUT_COLORS = ['#4B301E', '#8C5E3C', '#C49A70', '#EADCC9', '#6B4226', '#A67C52'];

/**
 * [Z4] Cơ cấu theo nhóm lỗi (Donut Chart + Bảng mini legend)
 * - Tinh chỉnh tỉ lệ vàng, đối xứng và thẩm mỹ cao.
 * - Triệt tiêu viền outline đen khi click.
 */
export const CategoryDonutChart = ({
  distributionList = [],
  totalDefects,
  activeCrossFilter,
  onCategoryClick
}) => {
  const list = Array.isArray(distributionList) ? distributionList : [];

  return (
    <div className="erp-chart-card">
      <div className="erp-chart-header">
        <span className="erp-chart-title">Cơ cấu theo nhóm lỗi</span>
      </div>

      <div className="erp-chart-body" style={{ display: 'flex', alignItems: 'center', gap: '14px', outline: 'none' }}>
        {/* Donut Chart with Center Text (Left ~45%) */}
        <div style={{ width: '45%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={list}
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="86%"
                paddingAngle={2}
                dataKey="value"
                nameKey="label"
                onClick={(entry) => onCategoryClick && onCategoryClick(entry?.category)}
                cursor="pointer"
                style={{ outline: 'none' }}
              >
                {list.map((entry, index) => {
                  const isFiltered = activeCrossFilter?.type === 'category';
                  const isSelected = isFiltered &&
                    (entry.category?.toLowerCase() === activeCrossFilter?.value?.toLowerCase() ||
                     entry.label?.toLowerCase() === activeCrossFilter?.value?.toLowerCase());
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                      opacity={isFiltered && !isSelected ? 0.22 : 1}
                      stroke="#FFFFFF"
                      strokeWidth={isSelected ? 3 : 2}
                      style={{ outline: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
                      onClick={(e) => {
                        e?.stopPropagation?.();
                        onCategoryClick(entry.category);
                      }}
                    />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(val, name, props) => [`${Number(val).toLocaleString()} lỗi (${props.payload.percentage || 0}%)`, name]}
                contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.72rem', padding: '6px 10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Text in Donut (To rõ nét, nổi bật chuẩn ERP) */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.1 }}>
              TỔNG LỖI
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0F172A', lineHeight: 1.1, marginTop: '3px' }}>
              {(totalDefects || 1933).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Mini Legend Table on Right (~55%) */}
        <div style={{ width: '55%', flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: '0.74rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', textAlign: 'left', fontSize: '0.7rem' }}>
                <th style={{ padding: '4px 6px', fontWeight: '600' }}>Nhóm lỗi</th>
                <th style={{ padding: '4px 6px', fontWeight: '600', textAlign: 'right' }}>Số lượng</th>
                <th style={{ padding: '4px 6px', fontWeight: '600', textAlign: 'right' }}>Tỷ lệ %</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item, idx) => {
                const isFiltered = activeCrossFilter?.type === 'category';
                const isSelected = isFiltered &&
                  (item.category?.toLowerCase() === activeCrossFilter?.value?.toLowerCase() ||
                   item.label?.toLowerCase() === activeCrossFilter?.value?.toLowerCase());
                return (
                  <tr
                    key={idx}
                    onClick={() => onCategoryClick && onCategoryClick(item.category)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#F5EBE1' : 'transparent',
                      fontWeight: isSelected ? '700' : 'normal',
                      opacity: isFiltered && !isSelected ? 0.3 : 1,
                      transition: 'background-color 0.15s, opacity 0.2s'
                    }}
                  >
                    <td style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '2px',
                          backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                          display: 'inline-block',
                          flexShrink: 0
                        }}
                      />
                      <span style={{ color: '#1E293B' }}>{item.label}</span>
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '600', color: '#334155' }}>
                      {Number(item.value).toLocaleString()}
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '700', color: '#1E293B' }}>
                      {item.percentage}%
                    </td>
                  </tr>
                );
              })}
              {/* Dòng Tổng */}
              <tr style={{ borderTop: '1px solid #E2E8F0', fontWeight: '800', color: '#1E293B' }}>
                <td style={{ padding: '5px 6px' }}>Tổng</td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>{(totalDefects || 1933).toLocaleString()}</td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryDonutChart;
