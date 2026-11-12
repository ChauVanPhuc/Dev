import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';
import { TrendingUp } from 'lucide-react';

export const TrendLineChart = ({ trendChartData = [] }) => {
  const hasData = Array.isArray(trendChartData) && trendChartData.length > 0;

  // Định dạng ngày hiển thị (VD: YYYY-MM-DD -> DD/MM)
  const formattedData = useMemo(() => {
    return trendChartData.map((item) => {
      let label = item.date;
      if (typeof item.date === 'string' && item.date.includes('-')) {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          label = `${parts[2]}/${parts[1]}`;
        } else if (parts.length === 2) {
          label = `T${parts[1]}/${parts[0]}`;
        }
      }
      return {
        ...item,
        displayDate: label
      };
    });
  }, [trendChartData]);

  const rates = formattedData.map((d) => Number(d.defect_rate || 0));
  let minIdx = 0;
  let maxIdx = 0;
  rates.forEach((val, i) => {
    if (val < rates[minIdx]) minIdx = i;
    if (val > rates[maxIdx]) maxIdx = i;
  });

  const maxRate = Math.max(...rates, 1);
  const yDomainMax = Math.ceil(maxRate * 1.38 * 10) / 10;

  // Vị trí hiển thị nhãn: điểm đầu, điểm cuối, điểm cao nhất, thấp nhất và các điểm trung gian
  const labelIndices = useMemo(() => {
    const n = formattedData.length;
    if (n === 0) return new Set();
    const set = new Set();
    set.add(0);
    set.add(n - 1);
    set.add(maxIdx);
    set.add(minIdx);

    const step = n >= 20 ? 4 : (n >= 10 ? 3 : 2);
    for (let i = step; i < n - 1; i += step) {
      if (Math.abs(i - maxIdx) > 1 && Math.abs(i - minIdx) > 1) {
        set.add(i);
      }
    }
    return set;
  }, [formattedData.length, maxIdx, minIdx]);

  // Nhãn tỷ lệ lỗi trên đường biểu đồ
  const renderCustomLabel = (props) => {
    const { x, y, value, index } = props;
    if (value === undefined || value === null) return null;
    if (!labelIndices.has(index)) return null;

    const isMin = index === minIdx;
    const numVal = Number(value).toFixed(2);

    return (
      <g key={`trend-lbl-${index}`} style={{ pointerEvents: 'none' }}>
        <rect
          x={x - 22}
          y={isMin ? y + 8 : y - 25}
          width={44}
          height={17}
          rx={4}
          fill="#FFFFFF"
          stroke="#E8E2DC"
          strokeWidth={1}
          opacity={0.96}
        />
        <text
          x={x}
          y={isMin ? y + 20 : y - 13}
          fill="#795137"
          fontSize={11}
          fontWeight={800}
          textAnchor="middle"
        >
          {`${numVal}%`}
        </text>
      </g>
    );
  };

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Xu hướng tỷ lệ lỗi theo thời gian
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: '600' }}>
          Đơn vị: %
        </span>
      </div>

      {/* Nội dung biểu đồ */}
      <div className="erp-chart-body" style={{ flex: 1, minHeight: 0 }}>
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có dữ liệu kiểm tra trong phạm vi lọc
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 26, right: 18, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#EAECEF" />
              <XAxis
                dataKey="displayDate"
                fontSize={9}
                stroke="#78716C"
                tickLine={false}
                axisLine={{ stroke: '#E8E2DC' }}
              />
              <YAxis
                domain={[0, yDomainMax]}
                fontSize={9}
                stroke="#78716C"
                tickLine={false}
                axisLine={{ stroke: '#E8E2DC' }}
                tickFormatter={(v) => `${v}%`}
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
                      <div style={{ fontWeight: '800', color: '#292524', marginBottom: '4px', borderBottom: '1px solid #E8E2DC', paddingBottom: '3px' }}>
                        Thời gian: {item.date}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px', color: '#57534E' }}>
                        <span>Sản phẩm kiểm tra:</span>
                        <strong style={{ color: '#292524' }}>{Number(item.product_count || 0).toLocaleString()} SP</strong>

                        <span>Tổng lỗi ghi nhận:</span>
                        <strong style={{ color: '#B91C1C' }}>{Number(item.defect_count || 0).toLocaleString()} lỗi</strong>

                        <span>Tỷ lệ lỗi:</span>
                        <strong style={{ color: '#795137', fontSize: '0.8rem' }}>{Number(item.defect_rate || 0).toFixed(2)}%</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="defect_rate"
                name="Tỷ lệ lỗi"
                stroke="#795137"
                strokeWidth={2.2}
                dot={{ r: 3, fill: '#795137', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                activeDot={{ r: 5, fill: '#B91C1C', stroke: '#FFFFFF', strokeWidth: 2 }}
              >
                <LabelList content={renderCustomLabel} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TrendLineChart;
