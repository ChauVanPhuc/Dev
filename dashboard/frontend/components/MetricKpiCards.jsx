import React from 'react';

/**
 * 5 Thẻ KPI Tổng Hợp Chuẩn Giao Diện Bên Claim Khách Hàng:
 * - Bố cục ngang (flex justify-between items-center)
 * - Bên trái:
 *   + Tiêu đề chữ nâu (#7B5233, font-weight: bold, cỡ 0.85rem) kèm kỳ tháng
 *   + Dòng so sánh in nghiêng font-weight: 700 cỡ 0.72rem với mũi tên ↑/↓
 * - Bên phải:
 *   + Giá trị số lớn nổi bật (font-size: 1.55rem, font-weight: 800, #2D1A12)
 * - Bo góc 12px, viền #F3EAE0, bóng mờ nhẹ, không có dải màu dày trên đỉnh
 */
export default function MetricKpiCards({ data, mode, period = '08/2026' }) {
  if (!data) return null;

  const {
    total_claims = 0,
    claims_change_pct = 0,
    total_penalty_amount = 0,
    penalty_change_pct = 0,
    avg_penalty_per_claim = 0,
    avg_penalty_change = 0,
    total_containers = 0,
    containers_change_pct = 0,
    resolution_rate = 0,
    resolved_count = 0,
    comparison_label = '07/2026'
  } = data;

  // Lấy nhãn tháng trước đó để so sánh an toàn kể cả khi comparison_label là null hoặc undefined
  const prevMonthText = (typeof comparison_label === 'string' 
    ? comparison_label.replace(/so với /i, '').trim() 
    : '') || 'tháng trước';

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Helper tính trend text và màu chuẩn Claim
  const getTrendInfo = (val, isHigherBad = true, prefix = '', suffix = '%') => {
    if (mode === 'overview' || val === undefined) {
      return { text: 'Toàn bộ trước giờ', color: '#8D6E63' };
    }
    if (val === 0) {
      return { text: `→ 0${suffix} so với ${prevMonthText}`, color: '#8D6E63' };
    }

    const isUp = val > 0;
    const arrow = isUp ? '↑' : '↓';
    const sign = isUp ? '+' : '';
    // Nếu tăng là xấu (tiền, vụ, cont) -> màu đỏ mận #DC2626; nếu giảm là tốt -> xanh #16A34A
    const color = isHigherBad ? (isUp ? '#DC2626' : '#16A34A') : (isUp ? '#16A34A' : '#DC2626');

    return {
      text: `${arrow} ${sign}${val}${suffix} so với ${prevMonthText}`,
      color
    };
  };

  const claimsTrend = getTrendInfo(claims_change_pct, true);
  const penaltyTrend = getTrendInfo(penalty_change_pct, true);
  const avgPenaltyTrend = getTrendInfo(avg_penalty_change, true, '$', '$');
  const containerTrend = getTrendInfo(containers_change_pct, true);

  const cards = [
    {
      title: 'Tổng số vụ khiếu nại',
      trendText: claimsTrend.text,
      trendColor: claimsTrend.color,
      value: (total_claims || 0).toLocaleString(),
      unit: 'vụ'
    },
    {
      title: 'Tiền phạt',
      trendText: penaltyTrend.text,
      trendColor: penaltyTrend.color,
      value: formatCurrency(total_penalty_amount),
      unit: ''
    },
    {
      title: 'Chi phí TB / Vụ',
      trendText: avgPenaltyTrend.text,
      trendColor: avgPenaltyTrend.color,
      value: `$${(avg_penalty_per_claim || 0).toFixed(1)}`,
      unit: ''
    },
    {
      title: 'Số container bị lỗi',
      trendText: containerTrend.text,
      trendColor: containerTrend.color,
      value: (total_containers || 0).toLocaleString(),
      unit: 'cont'
    },
    {
      title: 'Tỷ lệ giải quyết',
      trendText: `${resolved_count}/${total_claims} vụ đã xử lý xong`,
      trendColor: '#16A34A',
      value: `${(resolution_rate || 0).toFixed(1)}%`,
      unit: ''
    }
  ];

  return (
    <div className="dash-kpi-grid">
      {cards.map((c, idx) => (
        <div key={idx} className="dash-kpi-card">
          <div className="dash-kpi-card-left">
            <span className="dash-kpi-title">{c.title}</span>
            <span
              className="dash-kpi-trend"
              style={{ color: c.trendColor }}
            >
              {c.trendText}
            </span>
          </div>
          <div className="dash-kpi-card-right">
            <span className="dash-kpi-value">{c.value}</span>
            {c.unit && <span className="dash-kpi-unit">{c.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
