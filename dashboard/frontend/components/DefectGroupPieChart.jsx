import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';

// Bảng màu gỗ ấm chuẩn SmartFlow cho các phân nhóm lỗi
const DEFECT_GROUP_COLORS = [
  '#4A2E1B', // Nâu gỗ sẫm
  '#8C5A3C', // Nâu gỗ ấm
  '#C05621', // Nâu cam đậm
  '#B58E6F', // Nâu sáng
  '#5D3D25'  // Nâu cà phê
];

/**
 * Biểu đồ: Cơ Cấu Lỗi Theo Phân Nhóm
 * - Biểu đồ tròn Donut + DataLabel % rõ ràng, tâm hiển thị 'Tổng lỗi' & số lớn
 * - Không có bảng, chỉ hiển thị đúng 3 dòng phân nhóm (số lượng & %) gọn gàng
 */
export default function DefectGroupPieChart({ data }) {
  const groups = data?.groups || [];
  const calculatedTotal = groups.reduce((acc, cur) => acc + (cur.count || 0), 0);
  const totalCount = data?.total_count || calculatedTotal;

  // Render DataLabel trực tiếp chỉ ra từ từng lát cắt của PieChart (Callout Lines + Text)
  const renderCalloutLabel = (props) => {
    const { cx, cy, midAngle, outerRadius, percentage, index } = props;
    const g = groups[index];
    if (!g || percentage < 3) return null;

    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);

    // Điểm bắt đầu từ mép ngoài lát cắt
    const sx = cx + (outerRadius + 3) * cos;
    const sy = cy + (outerRadius + 3) * sin;

    // Điểm bẻ góc
    const mx = cx + (outerRadius + 14) * cos;
    const my = cy + (outerRadius + 14) * sin;

    // Điểm kết thúc theo phương ngang
    const isRight = cos >= 0;
    const ex = mx + (isRight ? 1 : -1) * 14;
    const ey = my;

    const textX = ex + (isRight ? 4 : -4);
    const textAnchor = isRight ? 'start' : 'end';
    const color = DEFECT_GROUP_COLORS[index % DEFECT_GROUP_COLORS.length];
    const pct = typeof percentage === 'number' ? Math.round(percentage) : g.percentage;

    return (
      <g>
        {/* Đường dẫn Callout Line */}
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={color}
          strokeWidth={1.2}
          fill="none"
          opacity={0.85}
        />
        {/* Chấm tròn nhỏ tại điểm xuất phát */}
        <circle cx={sx} cy={sy} r={2} fill={color} />

        {/* Nhãn DataLabel: Dòng 1 Tên phân nhóm, Dòng 2 Số vụ & % */}
        <text
          x={textX}
          y={ey - 3}
          textAnchor={textAnchor}
          fontSize={11}
          fontWeight={700}
          fill="#2D1A12"
        >
          {g.group_name}
        </text>
        <text
          x={textX}
          y={ey + 11}
          textAnchor={textAnchor}
          fontSize={10.5}
          fontWeight={800}
          fill={color}
        >
          {`${g.count} vụ (${pct}%)`}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const g = payload[0].payload;
      return (
        <div className="dash-custom-tooltip">
          <div className="dash-tooltip-title" style={{ color: '#7B5233' }}>{g.group_name}</div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">Số vụ lỗi:</span>
            <span className="dash-tooltip-val">{g.count} vụ ({g.percentage}%)</span>
          </div>
          {g.amount ? (
            <div className="dash-tooltip-row">
              <span className="dash-tooltip-label">Chi phí phạt:</span>
              <span className="dash-tooltip-val">${g.amount?.toLocaleString()}</span>
            </div>
          ) : null}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dash-chart-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title">
          Cơ Cấu Lỗi Theo Phân Nhóm
        </div>
      </div>

      <div className="dash-chart-body">
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: '#8D6E63', fontSize: 13, width: '100%' }}>
            Không có dữ liệu phân nhóm lỗi
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 15, right: 35, bottom: 15, left: 35 }}>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={groups}
                  dataKey="count"
                  nameKey="group_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={96}
                  paddingAngle={2.5}
                  labelLine={false}
                  label={renderCalloutLabel}
                >
                  {groups.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DEFECT_GROUP_COLORS[index % DEFECT_GROUP_COLORS.length]}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Tâm Donut: 'Tổng lỗi' + Số tổng to rõ */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#7E8B9B', lineHeight: 1.1 }}>
                Tổng lỗi
              </span>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#1B2A4A', lineHeight: 1.15, marginTop: 2 }}>
                {totalCount}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
