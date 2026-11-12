import React from 'react';

// 4 thẻ chỉ số KPI cho Trang 3: Tổng sự cố CAPA, Tỷ lệ giải quyết, Đang xử lý, Cảnh báo quá hạn
export const Page3KpiRow = ({ kpiAction = {} }) => {
  const comparison = kpiAction?.comparison || {};
  const hasComp = comparison?.has_comparison;

  const renderDeltaLine = (kpi, fallbackLabel) => {
    if (!hasComp || !kpi || kpi.trend === 'no_data' || (kpi.diff_pct === null && kpi.diff_pts === null && kpi.trend !== 'neutral')) {
      return (
        <div className="erp-kpi-delta">
          <span className="erp-kpi-delta-label" style={{ fontStyle: 'italic' }}>
            {fallbackLabel || 'Chưa có kỳ trước'}
          </span>
        </div>
      );
    }

    const { diff_pct, diff_pts, trend, is_favorable, unit_type, label = 'so với kỳ trước' } = kpi;

    if (trend === 'neutral') {
      const zeroText = unit_type === 'pts' ? '0.0 điểm %' : '0%';
      return (
        <div className="erp-kpi-delta">
          <span className="erp-kpi-delta-val" style={{ color: '#78716C' }}>
            — {zeroText}
          </span>
          <span className="erp-kpi-delta-label">
            {label}
          </span>
        </div>
      );
    }

    const deltaValue = unit_type === 'pts' ? `${diff_pts} điểm %` : `${diff_pct}%`;
    const isGood = is_favorable === true;
    const isBad = is_favorable === false;
    const deltaColor = isGood ? '#15803D' : (isBad ? '#B91C1C' : '#78716C');
    const arrow = trend === 'up' ? '↑' : '↓';

    return (
      <div className="erp-kpi-delta">
        <span className="erp-kpi-delta-val" style={{ color: deltaColor }}>
          {arrow} {deltaValue}
        </span>
        <span className="erp-kpi-delta-label">
          {label}
        </span>
      </div>
    );
  };

  const totalCapa = Number(kpiAction?.total_capa ?? 0);
  const resolutionRate = Number(kpiAction?.resolution_rate ?? 0);
  const inProgressCapa = Number(kpiAction?.in_progress_capa ?? 0);
  const overdueCapa = Number(kpiAction?.overdue_capa ?? 0);

  const cards = [
    {
      title: 'Tổng sự cố CAPA',
      value: totalCapa.toLocaleString('vi-VN'),
      unit: 'vụ',
      valueColor: '#292524',
      kpiData: kpiAction?.kpi_total_capa,
      fallbackLabel: totalCapa > 0 ? 'Tổng hợp trong kỳ' : 'Chưa có sự cố',
      tooltip: kpiAction?.kpi_total_capa?.tooltip || `Tổng số hành động khắc phục phòng ngừa (CAPA) phát sinh (${totalCapa} vụ).`
    },
    {
      title: 'Tỷ lệ giải quyết',
      value: resolutionRate.toFixed(1),
      unit: '%',
      valueColor: resolutionRate >= 70 ? '#15803D' : (totalCapa > 0 ? '#795137' : '#292524'),
      kpiData: kpiAction?.kpi_resolution_rate,
      fallbackLabel: totalCapa > 0 ? `Tỷ lệ đóng ${resolutionRate.toFixed(1)}%` : 'Chưa có dữ liệu',
      tooltip: kpiAction?.kpi_resolution_rate?.tooltip || `Tỷ lệ các phiếu CAPA đã nghiệm thu khắc phục thành công và đóng hồ sơ (${resolutionRate.toFixed(1)}%).`
    },
    {
      title: 'CAPA đang xử lý',
      value: inProgressCapa.toLocaleString('vi-VN'),
      unit: 'vụ',
      valueColor: '#292524',
      staticDeltaVal: null,
      staticDeltaColor: '#78716C',
      staticDeltaLabel: inProgressCapa > 0 ? 'Trong hạn cam kết SLA' : 'Không có sự cố tồn đọng',
      tooltip: `Các sự cố đang trong quá trình phân tích nguyên nhân gốc hoặc triển khai biện pháp khắc phục (${inProgressCapa} vụ).`
    },
    {
      title: 'Cảnh báo quá hạn',
      value: overdueCapa.toLocaleString('vi-VN'),
      unit: 'vụ',
      isWarning: overdueCapa > 0,
      valueColor: overdueCapa > 0 ? '#B91C1C' : '#292524',
      staticDeltaVal: overdueCapa > 0 ? 'Cần can thiệp' : null,
      staticDeltaColor: '#B91C1C',
      staticDeltaLabel: overdueCapa > 0 ? 'Quá hạn SLA 7 ngày' : 'Không có sự cố quá hạn',
      tooltip: `Các sự cố CAPA vượt quá thời hạn cam kết xử lý 7 ngày, cần lãnh đạo chất lượng can thiệp (${overdueCapa} vụ).`
    }
  ];

  return (
    <div className="erp-kpi-grid-4" style={{ marginBottom: '4px' }}>
      {cards.map((c, idx) => (
        <div
          key={idx}
          className={`erp-kpi-card ${c.isWarning ? 'erp-kpi-card-critical' : ''}`}
          title={c.tooltip}
        >
          {/* Tên chỉ số và so sánh kỳ trước */}
          <div className="erp-kpi-left">
            <span
              className="erp-kpi-title"
              style={c.isWarning ? { color: '#B91C1C' } : undefined}
            >
              {c.title}
            </span>
            {c.kpiData !== undefined ? (
              renderDeltaLine(c.kpiData, c.fallbackLabel)
            ) : (
              <div className="erp-kpi-delta">
                {c.staticDeltaVal && (
                  <span className="erp-kpi-delta-val" style={{ color: c.staticDeltaColor }}>
                    {c.staticDeltaVal}
                  </span>
                )}
                <span className="erp-kpi-delta-label">
                  {c.staticDeltaLabel}
                </span>
              </div>
            )}
          </div>

          {/* Giá trị và đơn vị */}
          <div className="erp-kpi-right">
            <span
              className="erp-kpi-value"
              style={c.valueColor ? { color: c.valueColor } : undefined}
            >
              {c.value}
            </span>
            {c.unit && (
              <span className="erp-kpi-unit">
                {c.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Page3KpiRow;

