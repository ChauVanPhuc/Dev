import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts';
import { Calendar } from 'lucide-react';

// Biểu đồ diễn biến chất lượng theo ngày từ API `daily_breakdown`:
// - Vùng trên: Số lượng phiếu và sản phẩm (cột)
// - Vùng dưới: Tỷ lệ đạt và tỷ lệ lỗi (đường)
export const DailyQualityTrendComboChart = ({ dailyBreakdown = [] }) => {
  // Chuẩn hóa tối đa 7 ngày gần nhất theo thứ tự thời gian tăng dần
  const chartData = useMemo(() => {
    if (!Array.isArray(dailyBreakdown) || dailyBreakdown.length === 0) return [];

    const sorted = [...dailyBreakdown].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const list = sorted.length > 7 ? sorted.slice(-7) : sorted;

    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const shortDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return list.map((d) => {
      const dateStr = String(d.date || '');
      const dateObj = dateStr.length >= 10 ? new Date(`${dateStr.slice(0, 10)}T00:00:00`) : new Date(dateStr);
      const dayIdx = !isNaN(dateObj.getTime()) ? dateObj.getDay() : 0;
      const dayOfWeek = dayNames[dayIdx] || '';
      const shortDay = shortDays[dayIdx] || '';
      const dayMonth = dateStr.length >= 10 ? `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}` : dateStr;
      const xAxisLabel = `${shortDay} ${dayMonth}`;
      const fullLabel = `${dayOfWeek} (${dayMonth})`;

      const status = d.pass_rate >= 80 ? 'Đạt' : (d.pass_rate >= 65 ? 'Kiểm soát' : 'Cần lưu ý');

      return {
        ...d,
        xAxisLabel,
        fullLabel,
        status,
        failed_orders: d.failed_orders ?? Math.max(0, (d.total_orders || 0) - (d.passed_orders || 0))
      };
    });
  }, [dailyBreakdown]);

  const hasData = chartData.length > 0;
  const maxDefectRate = useMemo(() => {
    if (!hasData) return 20;
    return Math.max(20, Math.ceil(Math.max(...chartData.map((d) => Number(d.defect_rate || 0))) * 1.25));
  }, [hasData, chartData]);

  // Nhãn tỷ lệ đạt (%) trên đường biểu đồ
  const renderPassRateLabel = (props) => {
    const { x, y, value } = props;
    if (value === undefined || value === null) return null;
    const num = Number(value);
    const formatted = Number.isInteger(num) ? `${num}%` : `${num.toFixed(1)}%`;
    const labelY = Math.max(14, y - 16);

    return (
      <g key={`lbl-pass-${x}-${y}`} style={{ pointerEvents: 'none' }}>
        <rect
          x={x - 22}
          y={labelY - 12}
          width={44}
          height={15}
          rx={3}
          fill="#FFFFFF"
          stroke="#15803D"
          strokeWidth={1}
          opacity={0.96}
        />
        <text
          x={x}
          y={labelY - 1}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={800}
          fill="#15803D"
        >
          {formatted}
        </text>
      </g>
    );
  };

  // Nhãn tỷ lệ lỗi (%) trên đường biểu đồ
  const renderDefectRateLabel = (props) => {
    const { x, y, value } = props;
    if (value === undefined || value === null) return null;

    const num = Number(value);
    const formatted = Number.isInteger(num) ? `${num}%` : `${num.toFixed(1)}%`;
    const labelY = Math.max(14, y - 16);

    return (
      <g key={`lbl-defect-${x}-${y}`} style={{ pointerEvents: 'none' }}>
        <rect
          x={x - 22}
          y={labelY - 12}
          width={44}
          height={15}
          rx={3}
          fill="#FFFFFF"
          stroke="#DC2626"
          strokeWidth={1}
          opacity={0.96}
        />
        <text
          x={x}
          y={labelY - 1}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={800}
          fill="#DC2626"
        >
          {formatted}
        </text>
      </g>
    );
  };

  // Tooltip hiển thị thông tin chi tiết các chỉ tiêu
  const renderDailyTooltip = ({ active, payload }) => {
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
          fontSize: '0.73rem',
          minWidth: '210px',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            fontWeight: '800',
            color: '#292524',
            marginBottom: '6px',
            borderBottom: '1px solid #E8E2DC',
            paddingBottom: '4px'
          }}
        >
          {item.fullLabel}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#57534E' }}>
              <span style={{ width: '7px', height: '7px', backgroundColor: '#795137', borderRadius: '1px', flexShrink: 0 }} />
              <span>Tổng phiếu:</span>
            </span>
            <strong style={{ color: '#795137' }}>{item.total_orders} phiếu</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#57534E' }}>
              <span style={{ width: '7px', height: '7px', backgroundColor: '#AD8057', borderRadius: '1px', flexShrink: 0 }} />
              <span>Đạt:</span>
            </span>
            <strong style={{ color: '#AD8057' }}>{item.passed_orders} phiếu</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#57534E' }}>
              <span style={{ width: '7px', height: '7px', backgroundColor: '#EADFD7', border: '1px solid #C4A78D', borderRadius: '1px', flexShrink: 0 }} />
              <span>Mẫu kiểm (SP):</span>
            </span>
            <strong style={{ color: '#8C705B' }}>{Number(item.total_products || 0).toLocaleString()} SP</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#57534E' }}>
              <span style={{ width: '7px', height: '7px', backgroundColor: '#B91C1C', borderRadius: '1px', flexShrink: 0 }} />
              <span>SP lỗi:</span>
            </span>
            <strong style={{ color: '#B91C1C' }}>{item.defective_products} SP</strong>
          </div>

          <div style={{ height: '1px', backgroundColor: '#F0ECE8', margin: '2px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#57534E' }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: '#15803D', borderRadius: '1px', flexShrink: 0 }} />
              <span>Tỷ lệ đạt (%):</span>
            </span>
            <strong style={{ color: '#15803D' }}>{item.pass_rate}%</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#57534E' }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: '#DC2626', borderRadius: '1px', flexShrink: 0 }} />
              <span>Tỷ lệ lỗi (%):</span>
            </span>
            <strong style={{ color: '#DC2626' }}>{item.defect_rate}%</strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="erp-chart-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }}
    >
      {/* Tiêu đề biểu đồ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexShrink: 0 }}>
        <Calendar size={15} style={{ color: '#795137' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
          Diễn biến chất lượng chi tiết theo ngày
        </span>
      </div>

      {/* Chú thích biểu đồ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '0.64rem',
          fontWeight: '700',
          marginBottom: '3px',
          flexWrap: 'wrap',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#795137' }}>
            <span style={{ width: '7px', height: '7px', backgroundColor: '#795137', borderRadius: '1px' }} />
            Tổng phiếu
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#AD8057' }}>
            <span style={{ width: '7px', height: '7px', backgroundColor: '#AD8057', borderRadius: '1px' }} />
            Đạt
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#8C705B' }}>
            <span style={{ width: '7px', height: '7px', backgroundColor: '#EADFD7', border: '1px solid #C4A78D', borderRadius: '1px' }} />
            Mẫu kiểm (SP)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#B91C1C' }}>
            <span style={{ width: '7px', height: '7px', backgroundColor: '#B91C1C', borderRadius: '1px' }} />
            SP lỗi
          </span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#15803D' }}>
            <span style={{ width: '12px', height: '2px', backgroundColor: '#15803D' }} />
            ● Tỷ lệ đạt (%)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#DC2626' }}>
            <span style={{ width: '12px', height: '2px', backgroundColor: '#DC2626' }} />
            ● Tỷ lệ lỗi (%)
          </span>
        </div>
      </div>

      {/* Nội dung biểu đồ */}
      <div className="erp-chart-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có dữ liệu nhật ký kiểm tra
          </div>
        ) : (
          <>
            {/* Vùng trên: Biểu đồ cột */}
            <div style={{ flex: '65 1 0', minHeight: 0, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 2px',
                  fontSize: '0.62rem',
                  color: '#78716C',
                  fontWeight: '700',
                  flexShrink: 0,
                  lineHeight: 1.2
                }}
              >
                <span style={{ color: '#57534E' }}>I. SỐ LƯỢNG KIỂM ĐỊNH (PHIẾU & SẢN PHẨM)</span>
                <span>Trục trái: <strong style={{ color: '#795137' }}>Phiếu</strong> | Trục phải: <strong style={{ color: '#8C705B' }}>SP</strong></span>
              </div>

              <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    syncId="dailyQualitySync"
                    data={chartData}
                    margin={{ top: 16, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#EAECEF" />
                    <XAxis
                      dataKey="xAxisLabel"
                      tick={false}
                      tickLine={false}
                      axisLine={{ stroke: '#E8E2DC' }}
                      height={2}
                    />
                    <YAxis
                      yAxisId="orders"
                      width={32}
                      domain={[0, (dataMax) => Math.max(10, Math.ceil((dataMax || 0) * 1.35))]}
                      fontSize={8.5}
                      stroke="#795137"
                      tickLine={false}
                      axisLine={{ stroke: '#E8E2DC' }}
                      tickFormatter={(v) => `${v}`}
                    />
                    <YAxis
                      yAxisId="products"
                      orientation="right"
                      width={38}
                      domain={[0, (dataMax) => Math.max(100, Math.ceil((dataMax || 0) * 1.25))]}
                      fontSize={8.5}
                      stroke="#8C705B"
                      tickLine={false}
                      axisLine={{ stroke: '#E8E2DC' }}
                      tickFormatter={(v) => Number(v).toLocaleString()}
                    />
                    <Tooltip content={renderDailyTooltip} />

                    <Bar yAxisId="orders" dataKey="total_orders" name="Tổng phiếu" fill="#795137" radius={[2, 2, 0, 0]} barSize={8}>
                      <LabelList dataKey="total_orders" position="top" fontSize={11} fontWeight={800} fill="#795137" offset={3} formatter={(v) => Math.round(Number(v || 0))} />
                    </Bar>
                    <Bar yAxisId="orders" dataKey="passed_orders" name="Đạt" fill="#AD8057" radius={[2, 2, 0, 0]} barSize={8}>
                      <LabelList dataKey="passed_orders" position="top" fontSize={11} fontWeight={800} fill="#AD8057" offset={3} formatter={(v) => Math.round(Number(v || 0))} />
                    </Bar>
                    <Bar yAxisId="products" dataKey="total_products" name="Mẫu kiểm" fill="#EADFD7" stroke="#C4A78D" strokeWidth={1} radius={[2, 2, 0, 0]} barSize={8}>
                      <LabelList dataKey="total_products" position="top" fontSize={11} fontWeight={800} fill="#8C705B" offset={3} formatter={(v) => Number(v || 0).toLocaleString()} />
                    </Bar>
                    <Bar yAxisId="products" dataKey="defective_products" name="SP lỗi" fill="#B91C1C" radius={[2, 2, 0, 0]} barSize={8} minPointSize={3}>
                      <LabelList dataKey="defective_products" position="top" fontSize={11} fontWeight={800} fill="#B91C1C" offset={3} formatter={(v) => Math.round(Number(v || 0))} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vùng dưới: Biểu đồ đường */}
            <div style={{ flex: '35 1 0', minHeight: 0, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '2px 2px 0 2px',
                  fontSize: '0.62rem',
                  color: '#78716C',
                  fontWeight: '700',
                  flexShrink: 0,
                  borderTop: '1px dashed #E8E2DC',
                  lineHeight: 1.2
                }}
              >
                <span style={{ color: '#57534E' }}>II. TỶ LỆ CHẤT LƯỢNG THEO NGÀY (%)</span>
                <span>Trục trái: <strong style={{ color: '#15803D' }}>% Đạt (0–100%)</strong> | Trục phải: <strong style={{ color: '#DC2626' }}>% Lỗi (0–{maxDefectRate}%)</strong></span>
              </div>

              <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    syncId="dailyQualitySync"
                    data={chartData}
                    margin={{ top: 16, right: 10, left: -10, bottom: 2 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#EAECEF" />
                    <XAxis
                      dataKey="xAxisLabel"
                      fontSize={8.5}
                      fontWeight={700}
                      stroke="#78716C"
                      tickLine={false}
                      axisLine={{ stroke: '#E8E2DC' }}
                      height={18}
                    />
                    <YAxis
                      yAxisId="passRate"
                      width={32}
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      fontSize={8}
                      stroke="#15803D"
                      tickLine={false}
                      axisLine={{ stroke: '#E8E2DC' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      yAxisId="defectRate"
                      orientation="right"
                      width={38}
                      domain={[0, maxDefectRate]}
                      fontSize={8}
                      stroke="#DC2626"
                      tickLine={false}
                      axisLine={{ stroke: '#E8E2DC' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={renderDailyTooltip} />

                    <Line
                      yAxisId="passRate"
                      type="monotone"
                      dataKey="pass_rate"
                      name="Tỷ lệ đạt (%)"
                      stroke="#15803D"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#15803D', strokeWidth: 1, stroke: '#FFFFFF' }}
                      activeDot={{ r: 5 }}
                      label={renderPassRateLabel}
                    />

                    <Line
                      yAxisId="defectRate"
                      type="monotone"
                      dataKey="defect_rate"
                      name="Tỷ lệ lỗi (%)"
                      stroke="#DC2626"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#DC2626', strokeWidth: 1, stroke: '#FFFFFF' }}
                      activeDot={{ r: 5 }}
                      label={renderDefectRateLabel}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DailyQualityTrendComboChart;

