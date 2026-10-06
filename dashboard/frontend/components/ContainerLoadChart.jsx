import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList
} from 'recharts';

/**
 * Biểu đồ: Thời Gian Đóng Cont Phát Sinh Lỗi
 * - Có đường trung bình tham chiếu (Dashed line TB)
 * - Chữ 'TB: ...' đặt tại position='insideTopRight' không bao giờ bị khuất số
 * - Cột >= TB thì màu đậm (#7B5233), thấp hơn TB thì màu nhạt (#D7CCC8)
 */
export default function ContainerLoadChart({ data }) {
  const points = data?.points || [];
  const totalContainers = data?.total_containers || 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div className="dash-custom-tooltip" style={{ maxWidth: 260 }}>
          <div className="dash-tooltip-title">Tháng đóng cont: {label}</div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">Số container:</span>
            <span className="dash-tooltip-val" style={{ color: '#7B5233' }}>
              {row.container_count} cont
            </span>
          </div>
          <div className="dash-tooltip-row">
            <span className="dash-tooltip-label">Độ trễ xuất cont:</span>
            <span className="dash-tooltip-val" style={{ color: '#E28A43' }}>{row.lag_months} tháng trước</span>
          </div>
          {row.containers && row.containers.length > 0 && (
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #EADCC9' }}>
              <div style={{ fontSize: 11, color: '#8D6E63', marginBottom: 2 }}>Mã cont tiêu biểu:</div>
              <div style={{ fontSize: 11, color: '#2D1A12', fontWeight: 600, wordBreak: 'break-all' }}>
                {row.containers.slice(0, 4).join(', ')}{row.containers.length > 4 ? '...' : ''}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };



  return (
    <div className="dash-chart-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title">
          Thời Gian Đóng Cont Phát Sinh Lỗi
        </div>

        <div className="dash-panel-controls" style={{ display: 'flex', alignItems: 'center' }}>
          <span className="dash-badge" style={{ background: '#FAF6F0', color: '#7B5233', borderColor: '#EADCC9', fontWeight: 800 }}>
            Tổng: {totalContainers} cont
          </span>
        </div>
      </div>

      <div className="dash-chart-body">
        {points.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 100, color: '#8D6E63', fontSize: 13 }}>Không có dữ liệu container trong kỳ này</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 25, right: 20, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1E9DF" vertical={false} />
              <XAxis dataKey="loading_month" stroke="#8D6E63" tick={{ fill: '#8D6E63', fontSize: 11, fontWeight: 700 }} />
              <YAxis
                stroke="#8D6E63"
                tick={{ fill: '#8D6E63', fontSize: 11 }}
                allowDecimals={false}
                domain={[0, (dataMax) => Math.ceil(dataMax + 2)]}
              />
              <Tooltip content={<CustomTooltip />} />

              <Bar dataKey="container_count" name="Số container" fill="#7B5233" radius={[4, 4, 0, 0]} barSize={32}>
                <LabelList
                  dataKey="container_count"
                  position="top"
                  fill="#7B5233"
                  fontSize={11.5}
                  fontWeight={800}
                  dy={-2}
                  formatter={(v) => `${v} cont`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
