import React from 'react';

// 6 thẻ chỉ số KPI cho Trang 1: Tổng quan chất lượng
export const KpiCardsRow = ({ summary = {} }) => {
  const comparison = summary?.comparison || {};
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

  const totalRecords = Number(summary?.total_records ?? 0);
  const passRate = Number(summary?.pass_rate ?? 0);
  const totalProducts = Number(summary?.total_products ?? 0);
  const defectiveProducts = Number(summary?.defective_products ?? 0);
  const totalDefects = Number(summary?.total_defects ?? 0);
  const avgDefectRate = Number(summary?.avg_defect_rate ?? 0);

  const cards = [
    {
      title: 'Lượt kiểm tra',
      value: totalRecords.toLocaleString('vi-VN'),
      unit: 'lượt',
      kpiData: summary?.kpi_records,
      tooltip: summary?.kpi_records?.tooltip || 'Tổng số lượt kiểm tra ghi nhận trong phạm vi lọc.'
    },
    {
      title: 'Tỷ lệ sản phẩm đạt',
      value: passRate.toFixed(1),
      unit: '%',
      valueColor: passRate >= 90 ? '#15803D' : (passRate >= 70 ? '#AD8057' : '#B91C1C'),
      kpiData: summary?.kpi_pass_rate,
      tooltip: summary?.kpi_pass_rate?.tooltip || 'Tỷ lệ sản phẩm đạt tiêu chuẩn chất lượng trong kỳ.'
    },
    {
      title: 'SP kiểm tra',
      value: totalProducts.toLocaleString('vi-VN'),
      unit: 'SP',
      kpiData: summary?.kpi_products,
      tooltip: summary?.kpi_products?.tooltip || 'Tổng số lượng sản phẩm được QC lấy mẫu kiểm tra trong kỳ.'
    },
    {
      title: 'SP lỗi',
      value: defectiveProducts.toLocaleString('vi-VN'),
      unit: 'SP',
      valueColor: defectiveProducts > 0 ? '#B91C1C' : '#292524',
      kpiData: summary?.kpi_defective_products,
      tooltip: summary?.kpi_defective_products?.tooltip || 'Số sản phẩm phát hiện có lỗi trong kỳ.'
    },
    {
      title: 'Tổng lỗi phát sinh',
      value: totalDefects.toLocaleString('vi-VN'),
      unit: 'lỗi',
      valueColor: totalDefects > 0 ? '#B91C1C' : '#292524',
      kpiData: summary?.kpi_defects,
      tooltip: summary?.kpi_defects?.tooltip || 'Tổng số lượng lỗi phát hiện trong kỳ.'
    },
    {
      title: 'Tỷ lệ lỗi',
      value: avgDefectRate.toFixed(2),
      unit: '%',
      valueColor: avgDefectRate > 3.0 ? '#B91C1C' : (avgDefectRate > 1.5 ? '#C58A4B' : '#292524'),
      kpiData: summary?.kpi_defect_rate,
      tooltip: summary?.kpi_defect_rate?.tooltip || 'Tỷ lệ lỗi bình quân = Tổng số lỗi / Tổng SP kiểm tra × 100%.'
    }
  ];

  return (
    <div className="erp-kpi-grid">
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
            {renderDeltaLine(c.kpiData)}
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

export default KpiCardsRow;
