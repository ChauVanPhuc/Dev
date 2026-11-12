import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ClipboardList, ExternalLink } from 'lucide-react';

// Biểu đồ donut và bảng thống kê tình trạng xử lý sự cố & CAPA
const renderCapaLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
  if (!percentage || percentage < 6) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#FFFFFF"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={800}
      style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
    >
      {`${percentage}%`}
    </text>
  );
};

export const CapaStatusChart = ({ capaStatus = [], onViewActionItems }) => {
  const hasData = Array.isArray(capaStatus) && capaStatus.length > 0;
  const total = capaStatus.reduce((s, item) => s + (Number(item.count) || 0), 0);

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ClipboardList size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Tình trạng xử lý sự cố &amp; CAPA
          </span>
        </div>
        {onViewActionItems && (
          <button
            type="button"
            className="page-btn"
            onClick={onViewActionItems}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #E8E2DC',
              background: '#FFFFFF',
              color: '#795137',
              fontSize: '0.67rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <ExternalLink size={11} /> DS sự cố CAPA
          </button>
        )}
      </div>

      {/* Nội dung biểu đồ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minHeight: 0, width: '100%' }}>
        {/* Biểu đồ Donut */}
        <div style={{ width: '45%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasData && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                zIndex: 1
              }}
            >
              <div style={{ fontSize: '0.64rem', color: '#78716C', fontWeight: '700', lineHeight: 1.1 }}>
                Tổng CAPA
              </div>
              <div style={{ fontSize: '1.25rem', color: '#292524', fontWeight: '900', lineHeight: 1.1, marginTop: '2px' }}>
                {Number(total).toLocaleString('vi-VN')}
              </div>
            </div>
          )}

          {!hasData ? (
            <div style={{ color: '#78716C', fontSize: '0.72rem', textAlign: 'center' }}>
              Không có sự cố CAPA
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={capaStatus}
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="56%"
                  outerRadius="88%"
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="name"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  label={renderCapaLabel}
                  labelLine={false}
                >
                  {capaStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
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
                        <div style={{ fontWeight: '800', color: d.color }}>{d.name}</div>
                        <div style={{ color: '#292524', fontWeight: '700', marginTop: '2px' }}>
                          {d.count} vụ ({d.percentage}%)
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bảng phân loại trạng thái */}
        <div
          style={{
            width: '55%',
            height: '100%',
            minHeight: 0,
            border: '1px solid #E8E2DC',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 'auto' }} />
                <col style={{ width: '55px' }} />
                <col style={{ width: '55px' }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ backgroundColor: '#F8F9FB', borderBottom: '1px solid #E8E2DC' }}>
                  <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '6px 8px', color: '#78716C', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>
                    Trạng thái CAPA
                  </th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', color: '#78716C', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>
                    Số vụ
                  </th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', color: '#78716C', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>
                    Tỷ lệ
                  </th>
                </tr>
              </thead>
              <tbody>
                {!hasData ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '16px 8px', textAlign: 'center', color: '#78716C', fontSize: '0.72rem' }}>
                      Không có dữ liệu trạng thái
                    </td>
                  </tr>
                ) : (
                  capaStatus.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: '1px solid #F8F9FB' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F9FB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '6px 8px', color: '#292524', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', backgroundColor: item.color, borderRadius: '2px', flexShrink: 0 }} />
                        <strong style={{ fontSize: '0.72rem' }}>{item.name}</strong>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: item.color }}>
                        {Number(item.count || 0).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', color: '#795137' }}>
                        {item.percentage}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Dòng tổng cộng cố định ở cuối bảng */}
          <div style={{ flexShrink: 0, backgroundColor: '#FAF3EC', borderTop: '2px solid #795137' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 'auto' }} />
                <col style={{ width: '55px' }} />
                <col style={{ width: '55px' }} />
              </colgroup>
              <tfoot>
                <tr style={{ fontWeight: '800' }}>
                  <td style={{ padding: '6px 8px', color: '#795137', fontWeight: '900', textAlign: 'left' }}>
                    Tổng cộng toàn xưởng
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '900', color: '#795137' }}>
                    {Number(total).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: '#292524' }}>
                    {total > 0 ? '100.0%' : '0.0%'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapaStatusChart;

