import React, { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export const Section1ProductKpi = ({ kpiData, onEditKpi }) => {
  // Checkbox chuyển đổi: false = 2 đường riêng Vanity & Furniture, true = chỉ 1 đường Tổng quan
  const [isOverallOnly, setIsOverallOnly] = useState(false);

  // Bảng 2 màu chuẩn so sánh theo theme Walnut & Warm Cream: Vanity (#70452D Gỗ Óc chó) & Furniture (#C58A4B Gỗ Teak vàng ấm)
  const COLOR_VANITY = '#70452D';
  const COLOR_FURNITURE = '#C58A4B';

  const defaultRadarData = [
    {
      title: '1. Tỷ lệ Claim KH',
      displaySubject: 'Tỷ lệ Claim KH (0.85%)\nFur 1.2% - Van 0.5%',
      scoreAvg: 92,
      scoreVanity: 95,
      scoreFurniture: 88,
      avgText: '0.85% (▼ 0.15%)',
      furnitureText: '1.2% (▼ 0.2%)',
      vanityText: '0.5% (▼ 0.1%)',
      fullMark: 100
    },
    {
      title: '2. Tỷ lệ đạt lần 1 (FPY)',
      displaySubject: 'Tỷ lệ đạt lần 1 (FPY) (90%)\nFur 88% - Van 92%',
      scoreAvg: 90,
      scoreVanity: 92,
      scoreFurniture: 88,
      avgText: '90% (▲ 1.8%)',
      furnitureText: '88% (▲ 1.5%)',
      vanityText: '92% (▲ 2.0%)',
      fullMark: 100
    },
    {
      title: '3. Hiệu suất làm việc',
      displaySubject: 'Hiệu suất làm việc (89.5%)\nFur 87% - Van 92%',
      scoreAvg: 89.5,
      scoreVanity: 92,
      scoreFurniture: 87,
      avgText: '89.5% (▲ 0.8%)',
      furnitureText: '87% (▼ 1.0%)',
      vanityText: '92% (▲ 2.5%)',
      fullMark: 100
    },
    {
      title: '4. Hành động khắc phục',
      displaySubject: 'Hành động khắc phục (94%)\nFur 93% - Van 95%',
      scoreAvg: 94,
      scoreVanity: 95,
      scoreFurniture: 93,
      avgText: '94% (▲ 2.2%)',
      furnitureText: '93% (▲ 1.5%)',
      vanityText: '95% (▲ 3.0%)',
      fullMark: 100
    },
    {
      title: '5. Tỷ lệ đào tạo',
      displaySubject: 'Tỷ lệ đào tạo (96%)\nFur 94% - Van 98%',
      scoreAvg: 96,
      scoreVanity: 98,
      scoreFurniture: 94,
      avgText: '96% (▲ 3.0%)',
      furnitureText: '94% (▲ 2.0%)',
      vanityText: '98% (▲ 4.0%)',
      fullMark: 100
    },
    {
      title: '6. Tỷ lệ nghỉ phép',
      displaySubject: 'Tỷ lệ nghỉ phép (2.4%)\nFur 2.7% - Van 2.1%',
      scoreAvg: 88,
      scoreVanity: 92,
      scoreFurniture: 84,
      avgText: '2.4% (▼ 0.1%)',
      furnitureText: '2.7% (▲ 0.3%)',
      vanityText: '2.1% (▼ 0.4%)',
      fullMark: 100
    }
  ];

  const kpiCards = kpiData?.kpiCards || [];
  const vanityLabel = kpiCards[0]?.vanityLabel || 'Vanity';
  const furnitureLabel = kpiCards[0]?.furnitureLabel || 'Furniture';

  const getShortLabel = (label) => {
    if (!label) return '';
    if (label.length <= 4) return label;
    return label.substring(0, 3);
  };
  const vShort = getShortLabel(vanityLabel);
  const fShort = getShortLabel(furnitureLabel);

  const rawRadarData = kpiData?.radarData && kpiData.radarData.length > 0 ? kpiData.radarData : (kpiData ? [] : defaultRadarData);

  const radarData = rawRadarData.map((rItem, idx) => {
    const card = kpiCards[idx];
    if (!card) return rItem;

    const vVal = card.vanityVal || '';
    const fVal = card.furnitureVal || '';
    const vLbl = card.vanityLabel || vanityLabel;
    const fLbl = card.furnitureLabel || furnitureLabel;
    const vS = getShortLabel(vLbl);
    const fS = getShortLabel(fLbl);

    const lines = (rItem.displaySubject || rItem.title || '').split('\n');
    const firstLine = lines[0] || rItem.title;
    const updatedDisplaySubject = (vVal && fVal) 
      ? `${firstLine}\n${fS} ${fVal} - ${vS} ${vVal}`
      : (rItem.displaySubject || rItem.title);

    return {
      ...rItem,
      displaySubject: updatedDisplaySubject,
      vanityText: vVal ? `${vVal} (${card.vanityChange || ''})` : rItem.vanityText,
      furnitureText: fVal ? `${fVal} (${card.furnitureChange || ''})` : rItem.furnitureText
    };
  });

  const defectLineData = kpiData ? (kpiData.defectLineData || []) : [
    { month: 'T6', fullName: '06/2026', vanity: 1.03, furniture: 1.51 },
    { month: 'T7', fullName: '07/2026', vanity: 0.90, furniture: 1.33 },
    { month: 'T8', fullName: '08/2026', vanity: 0.66, furniture: 0.98 },
    { month: 'T9', fullName: '09/2026', vanity: 0.69, furniture: 1.01 }
  ];

  const reworkLineData = kpiData ? (kpiData.reworkLineData || []) : [
    { month: 'T6', fullName: '06/2026', vanity: 1.44, furniture: 2.11 },
    { month: 'T7', fullName: '07/2026', vanity: 1.26, furniture: 1.86 },
    { month: 'T8', fullName: '08/2026', vanity: 0.92, furniture: 1.37 },
    { month: 'T9', fullName: '09/2026', vanity: 0.97, furniture: 1.41 }
  ];

  const claimLineData = kpiData ? (kpiData.claimLineData || []) : [
    { month: 'T6', fullName: '06/2026', vanity: 0.36, furniture: 0.83 },
    { month: 'T7', fullName: '07/2026', vanity: 0.32, furniture: 0.73 },
    { month: 'T8', fullName: '08/2026', vanity: 0.23, furniture: 0.54 },
    { month: 'T9', fullName: '09/2026', vanity: 0.24, furniture: 0.56 }
  ];

  const periodTitle = kpiData?.periodTitle 
    ? (kpiData.periodTitle.startsWith('(') ? kpiData.periodTitle : `(${kpiData.periodTitle})`)
    : '(T06/2026 - T09/2026)';

  // Custom Tooltip khi hover vào các đỉnh Radar Chart: Hiển thị Trung bình và nhãn Dòng hàng động
  const CustomRadarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#FFFDFC',
          border: '1px solid #E4DDD5',
          borderRadius: '6px',
          padding: '6px 10px',
          boxShadow: '0 4px 12px rgba(91, 57, 36, 0.15)',
          fontSize: '0.72rem',
          color: '#302820',
          minWidth: '160px'
        }}>
          <div style={{ fontWeight: '800', color: '#5B3924', borderBottom: '1px solid #E4DDD5', paddingBottom: '3px', marginBottom: '5px' }}>
            {data.title}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '3px', fontWeight: '800', color: '#302820' }}>
            <span>Trung bình:</span>
            <span style={{ color: '#5B3924' }}>{data.avgText}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px', color: COLOR_FURNITURE, fontWeight: '700' }}>
            <span>{furnitureLabel}:</span>
            <span>{data.furnitureText}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: COLOR_VANITY, fontWeight: '700' }}>
            <span>{vanityLabel}:</span>
            <span>{data.vanityText}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Render nhãn các đỉnh của Radar thành 2 dòng to, rõ nét, dễ đọc:
  // Dòng 1 (9.5px, bold 900): Tên KPI (Trung bình)
  // Dòng 2 (8.4px, bold 800): Fur XX% - Van YY%
  const renderPolarAngleTick = ({ payload, x, y, cx, cy }) => {
    const lines = (payload.value || '').split('\n');
    return (
      <text
        x={x}
        y={y}
        textAnchor={x > cx + 8 ? 'start' : x < cx - 8 ? 'end' : 'middle'}
        dominantBaseline="central"
      >
        {lines.map((line, idx) => (
          <tspan
            key={idx}
            x={x}
            dy={idx === 0 ? -(lines.length - 1) * 6.5 : 13.5}
            fill={idx === 1 ? '#70452D' : '#302820'}
            fontWeight={idx === 1 ? 800 : 900}
            fontSize={idx === 1 ? 8.4 : 9.5}
            letterSpacing={-0.1}
          >
            {line}
          </tspan>
        ))}
      </text>
    );
  };

  // Hàm tính màu theo quy tắc chuẩn: >=90 xanh lá rêu (#3F7D58), 60-89 cam ochre (#C58A4B), <60 đỏ gạch (#B94A3D)
  const getKpiBadgeStyle = (score) => {
    if (score >= 90) return { bg: '#3F7D58', text: '#FFFDFC' };
    if (score >= 60) return { bg: '#C58A4B', text: '#FFFDFC' };
    return { bg: '#B94A3D', text: '#FFFDFC' };
  };

  // Tự động tính toán Điểm tổng quan "Mục tiêu chất lượng" ăn theo các thẻ KPI hiện tại
  const calculateTotalScore = () => {
    const activeCards = (kpiData?.kpiCards && kpiData.kpiCards.length > 0) ? kpiData.kpiCards : kpiCards;
    if (!activeCards || activeCards.length === 0) {
      return kpiData?.score ?? 88;
    }

    const parseNum = (str) => {
      if (str === null || str === undefined || str === '') return null;
      const clean = String(str).replace('%', '').trim();
      const val = parseFloat(clean);
      return isNaN(val) ? null : val;
    };

    const scores = activeCards.map((card) => {
      const v = parseNum(card.vanityVal);
      const f = parseNum(card.furnitureVal);
      if (v === null && f === null) return null;
      if (v === null) return f;
      if (f === null) return v;
      const avg = (v + f) / 2;

      // Nếu là Claim KH (id 1): % thấp là tốt, score = 100 - % * 10
      if (card.id === 1 || card.kpiKey === 'claim_rate') {
        return Math.max(0, Math.min(100, 100 - avg * 10));
      }
      // Nếu là Nghỉ phép (id 6): % thấp là tốt, score = 100 - %
      if (card.id === 6 || card.kpiKey === 'leave_rate') {
        return Math.max(0, Math.min(100, 100 - avg));
      }
      // FPY, Efficiency, CAPA, Training: score chính là tỷ lệ %
      return Math.max(0, Math.min(100, avg));
    }).filter(s => s !== null);

    if (scores.length === 0) return kpiData?.score ?? 88;

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avgScore * 10) / 10;
  };

  const totalScore = calculateTotalScore();
  const badgeStyle = getKpiBadgeStyle(totalScore);

  return (
    <div className="qd-section-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="qd-section-header">
        <span>1. Chỉ số chất lượng sản phẩm (KPI)</span>
      </div>

      <div className="qd-section-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Hàng trên: Radar Chart (trái) + Cụm KPI tổng hợp (phải) */}
        <div className="qd-sec1-top">
          {/* Cột trái: Radar Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* Header Radar: Chú thích màu + Checkbox Tổng quan */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 4px',
              marginBottom: '2px',
              flexShrink: 0
            }}>
              {/* Chú thích màu động theo chế độ xem */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem', fontWeight: '800' }}>
                {isOverallOnly ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#5B3924' }}>
                    <span style={{ width: '8px', height: '3px', backgroundColor: '#5B3924', borderRadius: '1px' }}></span>
                    Tổng quan
                  </span>
                ) : (
                  <>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: COLOR_VANITY }}>
                      <span style={{ width: '8px', height: '3px', backgroundColor: COLOR_VANITY, borderRadius: '1px' }}></span>
                      {vanityLabel}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: COLOR_FURNITURE }}>
                      <span style={{ width: '8px', height: '3px', backgroundColor: COLOR_FURNITURE, borderRadius: '1px' }}></span>
                      {furnitureLabel}
                    </span>
                  </>
                )}
              </div>

              {/* Checkbox Tổng quan */}
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.68rem',
                fontWeight: '800',
                color: isOverallOnly ? '#5B3924' : '#786B61',
                cursor: 'pointer',
                userSelect: 'none',
                backgroundColor: isOverallOnly ? '#EADCC9' : '#F7F4F0',
                border: '1px solid #E4DDD5',
                padding: '2px 6px',
                borderRadius: '4px',
                transition: 'all 0.15s ease'
              }}>
                <input
                  type="checkbox"
                  checked={isOverallOnly}
                  onChange={(e) => setIsOverallOnly(e.target.checked)}
                  style={{
                    cursor: 'pointer',
                    accentColor: '#5B3924',
                    width: '12px',
                    height: '12px',
                    margin: 0
                  }}
                />
                <span>Tổng quan</span>
              </label>
            </div>

            <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="58%" data={radarData}>
                  <PolarGrid stroke="#E4DDD5" />
                  <PolarAngleAxis
                    dataKey="displaySubject"
                    tick={renderPolarAngleTick}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  
                  {/* Tooltip khi rê chuột vào các đỉnh: hiển thị Trung bình, Furniture và Vanity */}
                  <Tooltip content={<CustomRadarTooltip />} />

                  {/* Render 1 đường Tổng quan khi tick, hoặc 2 đường Vanity & Furniture khi bỏ tick */}
                  {isOverallOnly ? (
                    <Radar
                      name="Tổng quan"
                      dataKey="scoreAvg"
                      stroke="#5B3924"
                      fill="#5B3924"
                      fillOpacity={0.28}
                      strokeWidth={2.4}
                      dot={{ r: 4, fill: '#5B3924', stroke: '#FFFDFC', strokeWidth: 1.8 }}
                      activeDot={{ r: 6, fill: '#302820', stroke: '#FFFDFC', strokeWidth: 2 }}
                    />
                  ) : (
                    <>
                      <Radar
                        name="Vanity"
                        dataKey="scoreVanity"
                        stroke={COLOR_VANITY}
                        fill={COLOR_VANITY}
                        fillOpacity={0.22}
                        strokeWidth={2.2}
                        dot={{ r: 3.8, fill: COLOR_VANITY, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                        activeDot={{ r: 5.5, fill: COLOR_VANITY, stroke: '#FFFDFC', strokeWidth: 2 }}
                      />
                      <Radar
                        name="Furniture"
                        dataKey="scoreFurniture"
                        stroke={COLOR_FURNITURE}
                        fill={COLOR_FURNITURE}
                        fillOpacity={0.22}
                        strokeWidth={2.2}
                        dot={{ r: 3.8, fill: COLOR_FURNITURE, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                        activeDot={{ r: 5.5, fill: COLOR_FURNITURE, stroke: '#FFFDFC', strokeWidth: 2 }}
                      />
                    </>
                  )}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cột phải: KPI Cluster */}
          <div className="qd-kpi-cluster">
            {/* Box Mục tiêu chất lượng */}
            <div className="qd-kpi-summary-box">
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: '900', color: '#302820', letterSpacing: '0.2px' }}>
                  Mục tiêu chất lượng
                </div>
                <div style={{ fontSize: '0.7rem', color: '#786B61', fontWeight: '700', marginTop: '1px' }}>
                  Mục tiêu: &gt;=90/100
                </div>
              </div>

              {/* Tag màu tự động theo điểm */}
              <div style={{
                backgroundColor: badgeStyle.bg,
                color: badgeStyle.text,
                padding: '4px 14px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'baseline',
                gap: '3px',
                boxShadow: '0 1px 3px rgba(91, 57, 36, 0.12)'
              }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', lineHeight: 1 }}>{totalScore}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', opacity: 0.95 }}>/100</span>
              </div>
            </div>

            {/* 6 KPI Cards (2 hàng x 3 cột) theo danh sách & quy tắc màu */}
            <div className="qd-kpi-grid-6">
              {(kpiData?.kpiCards && kpiData.kpiCards.length > 0 ? kpiData.kpiCards : [
                { id: 1, title: 'Tỷ lệ Claim KH', vanityVal: '0.5%', vanityChange: '▼ 0.1%', furnitureVal: '1.2%', furnitureChange: '▼ 0.2%' },
                { id: 2, title: 'Tỷ lệ đạt lần 1 (FPY)', vanityVal: '92%', vanityChange: '▲ 2.0%', furnitureVal: '88%', furnitureChange: '▲ 1.5%' },
                { id: 3, title: 'Hiệu suất làm việc', vanityVal: '92%', vanityChange: '▲ 2.5%', furnitureVal: '87%', furnitureChange: '▼ 1.0%' },
                { id: 4, title: 'Hành động khắc phục', vanityVal: '95%', vanityChange: '▲ 3.0%', furnitureVal: '93%', furnitureChange: '▲ 1.5%' },
                { id: 5, title: 'Tỷ lệ đào tạo', vanityVal: '98%', vanityChange: '▲ 4.0%', furnitureVal: '94%', furnitureChange: '▲ 2.0%' },
                { id: 6, title: 'Tỷ lệ nghỉ phép', vanityVal: '2.1%', vanityChange: '▼ 0.4%', furnitureVal: '2.7%', furnitureChange: '▲ 0.3%' }
              ]).map((kpi, idx) => {
                const isIncreaseVanity = kpi.vanityChange ? kpi.vanityChange.includes('▲') : false;
                const isIncreaseFurn = kpi.furnitureChange ? kpi.furnitureChange.includes('▲') : false;
                return (
                  <div 
                    key={kpi.id || idx} 
                    className="qd-kpi-item-card"
                    style={{ position: 'relative', cursor: onEditKpi ? 'pointer' : 'default' }}
                    onClick={() => onEditKpi && onEditKpi(kpi)}
                    title={onEditKpi ? "Nhấn vào đây để tùy chỉnh dữ liệu thẻ KPI này" : ""}
                  >
                    {/* Tiêu đề Thẻ KPI */}
                    <div className="qd-kpi-item-title">
                      <span style={{
                        minWidth: '15px',
                        width: '15px',
                        height: '15px',
                        borderRadius: '50%',
                        background: '#5B3924',
                        color: '#FFFDFC',
                        fontSize: '9px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: '800'
                      }}>
                        {kpi.title}
                      </span>
                    </div>

                    {/* Hàng Giá trị số Vanity & Furniture */}
                    <div className="qd-kpi-item-num-row">
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div className="qd-brand-label">{kpi.vanityLabel || 'Vanity'}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', whiteSpace: 'nowrap' }}>
                          <span className="qd-brand-value" style={{ color: COLOR_VANITY }}>{kpi.vanityVal}</span>
                          {kpi.vanityChange && (
                            <span style={{
                              fontSize: '0.62rem',
                              color: isIncreaseVanity ? '#3F7D58' : '#B94A3D',
                              fontWeight: '800',
                              whiteSpace: 'nowrap',
                              display: 'inline-block'
                            }}>
                              {kpi.vanityChange}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                        <div className="qd-brand-label">{kpi.furnitureLabel || 'Furniture'}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                          <span className="qd-brand-value" style={{ color: COLOR_FURNITURE }}>{kpi.furnitureVal}</span>
                          {kpi.furnitureChange && (
                            <span style={{
                              fontSize: '0.62rem',
                              color: isIncreaseFurn ? '#3F7D58' : '#B94A3D',
                              fontWeight: '800',
                              whiteSpace: 'nowrap',
                              display: 'inline-block'
                            }}>
                              {kpi.furnitureChange}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hàng dưới: 3 Biểu đồ ĐƯỜNG (Line Charts) – Xu hướng lỗi, Xu hướng Rework, Xu hướng Claim KH */}
        <div className="qd-sec1-bottom" style={{ flex: 1, minHeight: 0 }}>
          {/* Mini Chart 1: Line Chart Xu hướng lỗi */}
          <div className="qd-mini-chart-card">
            <div className="qd-mini-chart-title">Xu hướng lỗi {periodTitle}</div>
            <div style={{ flex: 1, minHeight: 0, height: '100%', width: '100%' }}>
              {defectLineData && defectLineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={defectLineData} margin={{ top: 14, right: 14, left: -22, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E4DDD5" />
                    <XAxis dataKey="month" fontSize={7.8} stroke="#786B61" tickLine={false} />
                    <YAxis domain={['auto', 'auto']} fontSize={7.5} stroke="#786B61" tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, name === 'vanity' ? vanityLabel : furnitureLabel]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #E4DDD5', backgroundColor: '#FFFDFC', color: '#302820', padding: '3px 6px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="vanity"
                      name="vanity"
                      stroke={COLOR_VANITY}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: COLOR_VANITY, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      label={{ position: 'bottom', fontSize: 8.5, fill: COLOR_VANITY, fontWeight: 900, offset: 4, formatter: (v) => `${v}%` }}
                    />
                    <Line
                      type="monotone"
                      dataKey="furniture"
                      name="furniture"
                      stroke={COLOR_FURNITURE}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: COLOR_FURNITURE, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      label={{ position: 'top', fontSize: 8.5, fill: COLOR_FURNITURE, fontWeight: 900, offset: 4, formatter: (v) => `${v}%` }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A89F91', fontSize: '0.72rem', fontStyle: 'italic' }}>
                  Không có dữ liệu trong khoảng thời gian này
                </div>
              )}
            </div>
          </div>

          {/* Mini Chart 2: Line Chart Xu hướng Rework */}
          <div className="qd-mini-chart-card">
            <div className="qd-mini-chart-title">Xu hướng Rework {periodTitle}</div>
            <div style={{ flex: 1, minHeight: 0, height: '100%', width: '100%' }}>
              {reworkLineData && reworkLineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reworkLineData} margin={{ top: 14, right: 14, left: -22, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E4DDD5" />
                    <XAxis dataKey="month" fontSize={7.8} stroke="#786B61" tickLine={false} />
                    <YAxis domain={['auto', 'auto']} fontSize={7.5} stroke="#786B61" tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, name === 'vanity' ? vanityLabel : furnitureLabel]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #E4DDD5', backgroundColor: '#FFFDFC', color: '#302820', padding: '3px 6px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="vanity"
                      name="vanity"
                      stroke={COLOR_VANITY}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: COLOR_VANITY, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      label={{ position: 'bottom', fontSize: 8.5, fill: COLOR_VANITY, fontWeight: 900, offset: 4, formatter: (v) => `${v}%` }}
                    />
                    <Line
                      type="monotone"
                      dataKey="furniture"
                      name="furniture"
                      stroke={COLOR_FURNITURE}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: COLOR_FURNITURE, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      label={{ position: 'top', fontSize: 8.5, fill: COLOR_FURNITURE, fontWeight: 900, offset: 4, formatter: (v) => `${v}%` }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A89F91', fontSize: '0.72rem', fontStyle: 'italic' }}>
                  Không có dữ liệu trong khoảng thời gian này
                </div>
              )}
            </div>
          </div>

          {/* Mini Chart 3: Line Chart Xu hướng Claim KH */}
          <div className="qd-mini-chart-card">
            <div className="qd-mini-chart-title">Xu hướng Claim KH {periodTitle}</div>
            <div style={{ flex: 1, minHeight: 0, height: '100%', width: '100%' }}>
              {claimLineData && claimLineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={claimLineData} margin={{ top: 14, right: 14, left: -22, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E4DDD5" />
                    <XAxis dataKey="month" fontSize={7.8} stroke="#786B61" tickLine={false} />
                    <YAxis domain={['auto', 'auto']} fontSize={7.5} stroke="#786B61" tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, name === 'vanity' ? vanityLabel : furnitureLabel]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #E4DDD5', backgroundColor: '#FFFDFC', color: '#302820', padding: '3px 6px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="vanity"
                      name="vanity"
                      stroke={COLOR_VANITY}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: COLOR_VANITY, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      label={{ position: 'bottom', fontSize: 8.5, fill: COLOR_VANITY, fontWeight: 900, offset: 4, formatter: (v) => `${v}%` }}
                    />
                    <Line
                      type="monotone"
                      dataKey="furniture"
                      name="furniture"
                      stroke={COLOR_FURNITURE}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: COLOR_FURNITURE, stroke: '#FFFDFC', strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      label={{ position: 'top', fontSize: 8.5, fill: COLOR_FURNITURE, fontWeight: 900, offset: 4, formatter: (v) => `${v}%` }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A89F91', fontSize: '0.72rem', fontStyle: 'italic' }}>
                  Không có dữ liệu trong khoảng thời gian này
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Section1ProductKpi;
