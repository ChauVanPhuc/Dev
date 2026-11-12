import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ShieldAlert } from 'lucide-react';

export const SeverityStackedBarChart = ({
  severityByCategory = [],
  selectedCategory = '',
  onCategoryClick
}) => {
  const hasData = Array.isArray(severityByCategory) && severityByCategory.length > 0;

  return (
    <div className="erp-chart-card">
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldAlert size={15} style={{ color: '#5B3924' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1E293B' }}>
            Lỗi theo mức độ nghiêm trọng (AQL Class)
          </span>
        </div>
        {selectedCategory && (
          <button
            type="button"
            className="page-btn"
            onClick={() => onCategoryClick && onCategoryClick('')}
            style={{
              fontSize: '0.68rem',
              color: '#5B3924',
              backgroundColor: '#FAF3EC',
              border: '1px solid #EADCC9',
              borderRadius: '4px',
              padding: '1px 6px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Nhấn để bỏ lọc nhóm lỗi"
          >
            Đang lọc: {selectedCategory} (Xóa)
          </button>
        )}
      </div>

      {/* Nội dung biểu đồ */}
      <div className="erp-chart-body">
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: '0.78rem' }}>
            Không có dữ liệu nhóm lỗi
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={severityByCategory}
              layout="vertical"
              margin={{ top: 8, right: 20, left: 10, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#F1F5F9" />
              <XAxis
                type="number"
                fontSize={9}
                stroke="#64748B"
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                dataKey="category_name"
                type="category"
                fontSize={9.5}
                fontWeight={700}
                stroke="#334155"
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                width={85}
                cursor="pointer"
                onClick={(e) => {
                  if (e && e.value) {
                    const match = severityByCategory.find(s => s.category_name === e.value);
                    if (match && onCategoryClick) onCategoryClick(match.category);
                  }
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
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ fontWeight: '800', color: '#1E293B', marginBottom: '4px' }}>
                        Nhóm: {item.category_name} (Tổng: {Number(item.total).toLocaleString('vi-VN')} lỗi)
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8C6547', margin: '2px 0' }}>
                        <span style={{ width: '8px', height: '8px', backgroundColor: '#8C6547', borderRadius: '2px' }} />
                        <span>Minor (Lỗi nhẹ): <strong>{Number(item.minor).toLocaleString('vi-VN')}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#C58A4B', margin: '2px 0' }}>
                        <span style={{ width: '8px', height: '8px', backgroundColor: '#C58A4B', borderRadius: '2px' }} />
                        <span>Major (Lỗi nặng): <strong>{Number(item.major).toLocaleString('vi-VN')}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B91C1C', margin: '2px 0' }}>
                        <span style={{ width: '8px', height: '8px', backgroundColor: '#B91C1C', borderRadius: '2px' }} />
                        <span>Critical (Nghiêm trọng): <strong>{Number(item.critical).toLocaleString('vi-VN')}</strong></span>
                      </div>
                      {item.unclassified > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', margin: '2px 0' }}>
                          <span style={{ width: '8px', height: '8px', backgroundColor: '#94A3B8', borderRadius: '2px' }} />
                          <span>Chưa phân loại: <strong>{Number(item.unclassified).toLocaleString('vi-VN')}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconSize={8}
                wrapperStyle={{ fontSize: '0.68rem', paddingBottom: '4px' }}
              />
              <Bar dataKey="minor" name="Minor (Nhẹ)" stackId="a" fill="#8C6547" barSize={16} radius={[0, 0, 0, 0]} />
              <Bar dataKey="major" name="Major (Nặng)" stackId="a" fill="#C58A4B" barSize={16} radius={[0, 0, 0, 0]} />
              <Bar dataKey="critical" name="Critical (Nghiêm trọng)" stackId="a" fill="#B91C1C" barSize={16} radius={[0, 3, 3, 0]} />
              <Bar dataKey="unclassified" name="Chưa phân loại" stackId="a" fill="#CBD5E1" barSize={16} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SeverityStackedBarChart;

