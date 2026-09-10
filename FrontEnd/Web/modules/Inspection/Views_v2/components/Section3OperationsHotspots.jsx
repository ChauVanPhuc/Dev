import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export const Section3OperationsHotspots = ({ data }) => {
  // Bảng màu chuẩn: Vanity (#70452D Gỗ Óc chó), Furniture (#C58A4B Gỗ Teak vàng) & Đường lũy kế (#A95545 Đỏ đất Terracotta trầm ấm, sang trọng)
  const COLOR_VANITY = '#70452D';
  const COLOR_FURNITURE = '#C58A4B';
  const COLOR_LINE = '#A95545';

  // Dữ liệu Pareto lỗi trọng yếu từ Database
  const paretoData = Array.isArray(data) ? data : [];

  const maxVal = paretoData.length > 0 ? Math.max(...paretoData.map(d => (d.vanity || 0) + (d.furniture || 0)), 50) : 50;
  const yAxisMax = Math.ceil((maxVal * 1.15) / 50) * 50;

  // Custom Data Label cho Đường Lũy Kế có khung viền màu Terracotta nền trắng ngà đồng bộ
  const renderCumulativeLabel = (props) => {
    const { x, y, value } = props;
    if (value === undefined || value === null) return null;
    const text = `${value}%`;
    const badgeWidth = 32;
    const badgeHeight = 14;
    return (
      <g transform={`translate(${x - badgeWidth / 2}, ${y - badgeHeight - 4})`}>
        <rect
          width={badgeWidth}
          height={badgeHeight}
          rx={3}
          fill="#FFFDFC"
          stroke={COLOR_LINE}
          strokeWidth={1.2}
          filter="drop-shadow(0px 1px 2px rgba(91, 57, 36, 0.12))"
        />
        <text
          x={badgeWidth / 2}
          y={badgeHeight / 2 + 3.5}
          textAnchor="middle"
          fill={COLOR_LINE}
          fontSize={8.5}
          fontWeight={900}
        >
          {text}
        </text>
      </g>
    );
  };

  // Custom Data Label cho số liệu Vanity trên cột (có background sáng nổi bật)
  const renderVanityLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value || height < 10) return null;
    const badgeW = 18;
    const badgeH = 12;
    return (
      <g transform={`translate(${x + width / 2 - badgeW / 2}, ${y + height / 2 - badgeH / 2})`}>
        <rect width={badgeW} height={badgeH} rx={2} fill="#FFFDFC" opacity={0.95} stroke="#E4DDD5" strokeWidth={0.5} />
        <text x={badgeW / 2} y={badgeH / 2 + 3.5} textAnchor="middle" fill={COLOR_VANITY} fontSize={8.5} fontWeight={900}>
          {value}
        </text>
      </g>
    );
  };

  // Custom Data Label cho số liệu Furniture trên cột (có background sáng nổi bật)
  const renderFurnitureLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value || height < 10) return null;
    const badgeW = 18;
    const badgeH = 12;
    return (
      <g transform={`translate(${x + width / 2 - badgeW / 2}, ${y + height / 2 - badgeH / 2})`}>
        <rect width={badgeW} height={badgeH} rx={2} fill="#FFFDFC" opacity={0.95} stroke="#E4DDD5" strokeWidth={0.5} />
        <text x={badgeW / 2} y={badgeH / 2 + 3.5} textAnchor="middle" fill={COLOR_FURNITURE} fontSize={8.5} fontWeight={900}>
          {value}
        </text>
      </g>
    );
  };

  return (
    <div className="qd-section-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="qd-section-header">
        <span>3. Pareto các lỗi trọng yếu</span>
      </div>

      <div className="qd-section-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 8px' }}>
        {/* Biểu đồ Pareto Lỗi Trọng Yếu đặt trong khung nền #F7F4F0 cao cấp */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          height: '100%',
          background: '#F7F4F0',
          border: '1px solid #E4DDD5',
          borderRadius: '5px',
          padding: '6px 8px'
        }}>
          {/* Legend biểu đồ Pareto */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.68rem', fontWeight: '800' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: COLOR_VANITY }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: COLOR_VANITY, borderRadius: '2px' }}></span> Vanity
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: COLOR_FURNITURE }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: COLOR_FURNITURE, borderRadius: '2px' }}></span> Furniture
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: COLOR_LINE }}>
                <span style={{ width: '12px', height: '2.5px', backgroundColor: COLOR_LINE, borderRadius: '1px' }}></span> Tỷ lệ lũy kế (%)
              </span>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
            {paretoData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#786B61', fontSize: '0.78rem', fontWeight: '600' }}>
                Không có dữ liệu lỗi ghi nhận trong khoảng thời gian này
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData} margin={{ top: 22, right: 18, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E4DDD5" />
                <XAxis
                  dataKey="defect"
                  fontSize={7.8}
                  stroke="#786B61"
                  fontWeight={700}
                  tickLine={false}
                  interval={0}
                />
                
                {/* Trục Y trái: Số lượng lỗi */}
                <YAxis
                  yAxisId="left"
                  domain={[0, yAxisMax]}
                  fontSize={7.8}
                  stroke="#786B61"
                  tickLine={false}
                  tickFormatter={(v) => `${v}`}
                />

                {/* Trục Y phải: Tỷ lệ lũy kế (%) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  fontSize={7.8}
                  stroke={COLOR_LINE}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />

                <Tooltip
                  formatter={(value, name) => [
                    name === 'Tỷ lệ tích lũy (%)' || name === 'cumulative' ? `${value}%` : `${value} lỗi`,
                    name === 'vanity' ? 'Vanity' : name === 'furniture' ? 'Furniture' : name === 'cumulative' ? 'Lũy kế Pareto' : name
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  contentStyle={{
                    backgroundColor: '#FFFDFC',
                    border: '1px solid #E4DDD5',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#302820',
                    boxShadow: '0 4px 12px rgba(91, 57, 36, 0.1)',
                    padding: '4px 8px'
                  }}
                />

                {/* Cột riêng cho Vanity */}
                <Bar
                  yAxisId="left"
                  dataKey="vanity"
                  name="vanity"
                  stackId="a"
                  fill={COLOR_VANITY}
                  barSize={28}
                  label={renderVanityLabel}
                />

                {/* Cột riêng cho Furniture */}
                <Bar
                  yAxisId="left"
                  dataKey="furniture"
                  name="furniture"
                  stackId="a"
                  fill={COLOR_FURNITURE}
                  barSize={28}
                  radius={[3, 3, 0, 0]}
                  label={renderFurnitureLabel}
                />

                {/* Đường biểu diễn tỷ lệ tích lũy lũy kế màu Terracotta trầm sang trọng */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  name="cumulative"
                  stroke={COLOR_LINE}
                  strokeWidth={2.4}
                  dot={{ r: 3.5, fill: COLOR_LINE, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                  activeDot={{ r: 5.5 }}
                  label={renderCumulativeLabel}
                />
              </ComposedChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Section3OperationsHotspots;
