import React from 'react';

// 4 thẻ chỉ số KPI cho Trang 2: Lỗi Critical, Major, Minor và Tỷ trọng Top 4 nguyên nhân lỗi
export const Page2KpiRow = ({ kpiPareto = {}, totalDefects = 0 }) => {
  const comparison = kpiPareto?.comparison || {};
  const hasComp = comparison?.has_comparison;

  const renderDeltaLine = (kpi) => {
    if (!hasComp || !kpi || kpi.trend === 'no_data' || (kpi.diff_pct === null && kpi.diff_pts === null && kpi.trend !== 'neutral')) {
      return (
        <span className="erp-kpi-delta-label" style={{ fontStyle: 'italic' }}>
          Chưa có kỳ trước
        </span>
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

  const criticalDefects = Number(kpiPareto?.critical_defects ?? 0);
  const majorDefects = Number(kpiPareto?.major_defects ?? 0);
  const minorDefects = Number(kpiPareto?.minor_defects ?? 0);
  const pareto80Ratio = Number(kpiPareto?.pareto_80_ratio ?? 0);

  const cards = [
    {
      title: 'Lỗi Critical',
      value: criticalDefects.toLocaleString('vi-VN'),
      unit: 'lỗi',
      valueColor: criticalDefects > 0 ? '#B91C1C' : '#292524',
      isCritical: criticalDefects > 0,
      kpiData: kpiPareto?.kpi_critical,
      tooltip: kpiPareto?.kpi_critical?.tooltip || 'Tổng số lỗi phân loại Critical theo tiêu chuẩn AQL.'
    },
    {
      title: 'Lỗi Major',
      value: majorDefects.toLocaleString('vi-VN'),
      unit: 'lỗi',
      valueColor: '#292524',
      kpiData: kpiPareto?.kpi_major,
      tooltip: kpiPareto?.kpi_major?.tooltip || 'Tổng số lỗi phân loại Major làm suy giảm công năng hoặc ngoại quan rõ rệt.'
    },
    {
      title: 'Lỗi Minor',
      value: minorDefects.toLocaleString('vi-VN'),
      unit: 'lỗi',
      valueColor: '#292524',
      kpiData: kpiPareto?.kpi_minor,
      tooltip: kpiPareto?.kpi_minor?.tooltip || 'Tổng số lỗi phân loại Minor về ngoại quan nhỏ.'
    },
    {
      title: 'Tỷ trọng Top 4 nguyên nhân lỗi',
      value: pareto80Ratio.toFixed(1),
      unit: '%',
      valueColor: '#795137',
      staticSubLabel: totalDefects > 0 ? `Trên tổng ${Number(totalDefects).toLocaleString('vi-VN')} lỗi` : 'Chưa có dữ liệu lỗi',
      tooltip: 'Tỷ trọng 4 nguyên nhân lỗi phát sinh nhiều nhất trong kỳ (Tổng 4 nguyên nhân cao nhất / Tổng lỗi × 100%).'
    }
  ];

  return (
    <div className="erp-kpi-grid-4" style={{ marginBottom: '4px' }}>
      {cards.map((c, idx) => (
        <div
          key={idx}
          className={`erp-kpi-card ${c.isCritical ? 'erp-kpi-card-critical' : ''}`}
          title={c.tooltip}
        >
          {/* Tên chỉ số và so sánh kỳ trước */}
          <div className="erp-kpi-left">
            <span
              className="erp-kpi-title"
              style={c.isCritical ? { color: '#B91C1C' } : undefined}
            >
              {c.title}
            </span>
            {c.kpiData !== undefined ? (
              renderDeltaLine(c.kpiData)
            ) : c.staticSubLabel ? (
              <div className="erp-kpi-delta">
                <span className="erp-kpi-delta-label">{c.staticSubLabel}</span>
              </div>
            ) : null}
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

export default Page2KpiRow;

