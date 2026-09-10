import React, { useState, useMemo } from 'react';

export const Section4QualityTrends = ({ groupsData }) => {
  // Trạng thái nhóm đang chọn để drill-down chi tiết: null (Tất cả nhóm) hoặc 'ngoai_quan' | 'ket_cau' | 'nguyen_lieu' | 'khac'
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [hoveredSubId, setHoveredSubId] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Bảng màu đồng bộ theo các sắc độ tông Nâu Gỗ / Walnut chuẩn ERP
  const WOOD_GROUP_COLORS = {
    visual: '#5B3924',
    ngoai_quan: '#5B3924',
    structure: '#7D5233',
    ket_cau: '#7D5233',
    material: '#A67449',
    nguyen_lieu: '#A67449',
    paint: '#70452D',
    khac: '#C59B73',
    other: '#C59B73'
  };

  // Bảng màu giảm dần sắc độ theo họ Nâu Gỗ cho các lỗi con khi xem chi tiết
  const GROUP_SHADE_PALETTES = {
    visual: ['#3D2415', '#5B3924', '#7D5233', '#A67449', '#C59B73'],
    ngoai_quan: ['#3D2415', '#5B3924', '#7D5233', '#A67449', '#C59B73'],
    structure:  ['#55341D', '#7D5233', '#9A6B44', '#BD8D63', '#DEBCA0'],
    ket_cau:    ['#55341D', '#7D5233', '#9A6B44', '#BD8D63', '#DEBCA0'],
    material:   ['#6B4527', '#A67449', '#BD8D63', '#D3AB87', '#EBD2BC'],
    nguyen_lieu:['#6B4527', '#A67449', '#BD8D63', '#D3AB87', '#EBD2BC'],
    other:      ['#875D3B', '#C59B73', '#D3AB87', '#E4C9AF', '#F0DFD0'],
    khac:       ['#875D3B', '#C59B73', '#D3AB87', '#E4C9AF', '#F0DFD0']
  };

  // Dữ liệu Nhóm lỗi và các lỗi con chi tiết từ Database
  const rootGroupsData = useMemo(() => {
    return Array.isArray(groupsData) ? groupsData : [];
  }, [groupsData]);

  // Nhóm đang chọn hiện tại (nếu có)
  const currentGroup = useMemo(() => {
    return rootGroupsData.find(g => g.id === selectedGroupId) || null;
  }, [rootGroupsData, selectedGroupId]);

  // Danh sách các item hiển thị trên 2 biểu đồ và bảng:
  // - Nếu chưa chọn nhóm: Hiển thị 4 Nhóm chính
  // - Nếu đã chọn 1 nhóm: Hiển thị 4-5 lỗi con chi tiết của nhóm đó
  const activeItems = useMemo(() => {
    if (!currentGroup) {
      return rootGroupsData.map(g => ({
        id: g.id,
        name: g.name,
        onSite: g.onSite,
        complaints: g.complaints,
        total: g.total,
        color: g.color
      }));
    } else {
      const shades = GROUP_SHADE_PALETTES[currentGroup.id] || GROUP_SHADE_PALETTES.ngoai_quan;
      return currentGroup.subDefects.map((sub, idx) => ({
        id: sub.id,
        name: sub.name,
        onSite: sub.onSite,
        complaints: sub.complaints,
        total: sub.total,
        color: shades[idx % shades.length]
      }));
    }
  }, [currentGroup, rootGroupsData]);

  // Tổng số lượng của cấp đang xem
  const activeTotalOnSite = useMemo(() => activeItems.reduce((sum, item) => sum + item.onSite, 0), [activeItems]);
  const activeTotalComplaints = useMemo(() => activeItems.reduce((sum, item) => sum + item.complaints, 0), [activeItems]);

  // ─── TÍNH TOÁN HÌNH HỌC CHO 2 HÌNH TRÒN ───
  // ViewBox: 340 x 175
  const cx1 = 80;
  const cy1 = 78;
  const r1 = 56; // Tròn lớn (Khiếu nại KH)

  const cx2 = 248;
  const cy2 = 78;
  const r2 = 44; // Tròn nhỏ (Hiện trường)

  const rad = Math.PI / 180;

  // 1. Lát cắt cho Hình tròn lớn (Khiếu nại KH)
  const complaintsSlices = useMemo(() => {
    let currentAngle = -90; // Bắt đầu từ 12h
    return activeItems.map((item) => {
      const span = activeTotalComplaints > 0 ? (item.complaints / activeTotalComplaints) * 360 : 0;
      const start = currentAngle;
      const end = currentAngle + span;
      const mid = (start + end) / 2;
      currentAngle = end;

      return {
        ...item,
        startAngle: start,
        endAngle: end,
        midAngle: mid,
        value: item.complaints,
        pct: activeTotalComplaints > 0 ? ((item.complaints / activeTotalComplaints) * 100).toFixed(1) : '0'
      };
    });
  }, [activeItems, activeTotalComplaints]);

  // 2. Lát cắt cho Hình tròn nhỏ (Hiện trường)
  const onSiteSlices = useMemo(() => {
    let currentAngle = -90; // Bắt đầu từ 12h
    return activeItems.map((item) => {
      const span = activeTotalOnSite > 0 ? (item.onSite / activeTotalOnSite) * 360 : 0;
      const start = currentAngle;
      const end = currentAngle + span;
      const mid = (start + end) / 2;
      currentAngle = end;

      return {
        ...item,
        startAngle: start,
        endAngle: end,
        midAngle: mid,
        value: item.onSite,
        pct: activeTotalOnSite > 0 ? ((item.onSite / activeTotalOnSite) * 100).toFixed(1) : '0'
      };
    });
  }, [activeItems, activeTotalOnSite]);

  // 3. Tính 2 đường tiếp tuyến chung ngoài của 2 hình tròn (Top & Bottom Tangents)
  const tangentCoords = useMemo(() => {
    const d = cx2 - cx1;
    const deltaR = r1 - r2;
    if (d <= deltaR) return null;

    const sinA = deltaR / d;
    const cosA = Math.sqrt(1 - sinA * sinA);

    // Điểm tiếp xúc tiếp tuyến trên
    const pTop = {
      x: cx1 + r1 * sinA,
      y: cy1 - r1 * cosA
    };
    const sTop = {
      x: cx2 + r2 * sinA,
      y: cy2 - r2 * cosA
    };

    // Điểm tiếp xúc tiếp tuyến dưới
    const pBot = {
      x: cx1 + r1 * sinA,
      y: cy1 + r1 * cosA
    };
    const sBot = {
      x: cx2 + r2 * sinA,
      y: cy2 + r2 * cosA
    };

    return { pTop, sTop, pBot, sBot };
  }, [cx1, cy1, r1, cx2, cy2, r2]);

  // Helper hàm tạo SVG Path cho hình cánh quạt tròn
  const getSlicePath = (cx, cy, r, startDeg, endDeg) => {
    const startR = startDeg * rad;
    const endR = endDeg * rad;
    const x1 = cx + r * Math.cos(startR);
    const y1 = cy + r * Math.sin(startR);
    const x2 = cx + r * Math.cos(endR);
    const y2 = cy + r * Math.sin(endR);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // Xử lý khi click vào 1 nhóm lỗi để drill-down
  const handleItemClick = (id) => {
    if (!selectedGroupId) {
      setSelectedGroupId(id);
    }
  };

  return (
    <div className="qd-section-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Section */}
      <div className="qd-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>4. Cơ cấu theo nhóm lỗi</span>
          {currentGroup && (
            <span style={{ fontSize: '0.72rem', background: 'rgba(255, 253, 252, 0.22)', padding: '1px 7px', borderRadius: '4px', fontWeight: '700' }}>
              / Chi tiết: {currentGroup.name}
            </span>
          )}
        </div>
        {selectedGroupId && (
          <button
            onClick={() => setSelectedGroupId(null)}
            style={{
              background: '#FFFDFC',
              color: '#5B3924',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.68rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(91, 57, 36, 0.15)'
            }}
          >
            ‹ Tất cả nhóm
          </button>
        )}
      </div>

      <div className="qd-section-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 8px' }}>
        {rootGroupsData.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#786B61',
            fontSize: '0.78rem',
            fontWeight: '600',
            background: '#F7F4F0',
            border: '1px solid #E4DDD5',
            borderRadius: '5px',
            minHeight: '160px'
          }}>
            Không có dữ liệu cơ cấu nhóm lỗi trong khoảng thời gian này
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '50fr 50fr',
            gap: '8px',
            alignItems: 'stretch',
            flex: 1,
            minHeight: 0,
            height: '100%'
          }}>
          {/* CỘT TRÁI: 2 HÌNH TRÒN (TRÒN LỚN KHIẾU NẠI KH, TRÒN NHỎ HIỆN TRƯỜNG) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            background: '#F7F4F0',
            border: '1px solid #E4DDD5',
            borderRadius: '5px',
            padding: '4px 6px',
            position: 'relative'
          }}>
            {/* Header ghi chú 2 hình tròn */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', fontWeight: '800', color: '#5B3924', marginBottom: '2px', flexShrink: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#5B3924' }}></span>
                Tròn lớn: Khiếu nại KH ({activeTotalComplaints})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8C5E3B' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#8C5E3B' }}></span>
                Tròn nhỏ: Hiện trường ({activeTotalOnSite})
              </span>
            </div>

            {/* Canvas SVG 2 hình tròn + 2 đường tiếp tuyến */}
            <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
              <svg
                viewBox="0 0 340 175"
                style={{ width: '100%', height: '100%', display: 'block' }}
              >
                {/* ── 1. 2 ĐƯỜNG TIẾP TUYẾN CHUNG NGOÀI (Common External Tangents) ── */}
                {tangentCoords && (
                  <g>
                    {/* Vùng bóng mờ tiếp tuyến bao quanh nối 2 hình tròn */}
                    <path
                      d={`M ${tangentCoords.pTop.x} ${tangentCoords.pTop.y} L ${tangentCoords.sTop.x} ${tangentCoords.sTop.y} L ${tangentCoords.sBot.x} ${tangentCoords.sBot.y} L ${tangentCoords.pBot.x} ${tangentCoords.pBot.y} Z`}
                      fill="#7D5233"
                      fillOpacity={0.07}
                      stroke="none"
                    />
                    {/* Tiếp tuyến trên */}
                    <line
                      x1={tangentCoords.pTop.x}
                      y1={tangentCoords.pTop.y}
                      x2={tangentCoords.sTop.x}
                      y2={tangentCoords.sTop.y}
                      stroke="#7D5233"
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                      strokeOpacity={0.75}
                    />
                    {/* Tiếp tuyến dưới */}
                    <line
                      x1={tangentCoords.pBot.x}
                      y1={tangentCoords.pBot.y}
                      x2={tangentCoords.sBot.x}
                      y2={tangentCoords.sBot.y}
                      stroke="#7D5233"
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                      strokeOpacity={0.75}
                    />
                  </g>
                )}

                {/* ── 2. HÌNH TRÒN LỚN: KHIẾU NẠI KH ── */}
                <g>
                  {complaintsSlices.map((slice) => {
                    if (slice.value === 0) return null;
                    const isHovered = hoveredSubId === slice.id;
                    const slicePath = getSlicePath(cx1, cy1, r1, slice.startAngle, slice.endAngle);

                    const labelR = r1 * 0.62;
                    const labelX = cx1 + labelR * Math.cos(slice.midAngle * rad);
                    const labelY = cy1 + labelR * Math.sin(slice.midAngle * rad);

                    return (
                      <g
                        key={`comp-${slice.id}`}
                        onClick={() => handleItemClick(slice.id)}
                        onMouseEnter={() => {
                          setHoveredSubId(slice.id);
                          setHoveredSlice({ ...slice, source: 'Khiếu nại KH' });
                        }}
                        onMouseLeave={() => {
                          setHoveredSubId(null);
                          setHoveredSlice(null);
                        }}
                        style={{ cursor: selectedGroupId ? 'default' : 'pointer' }}
                      >
                        <path
                          d={slicePath}
                          fill={slice.color}
                          stroke="#FFFDFC"
                          strokeWidth={isHovered ? 2 : 1}
                          style={{
                            transition: 'all 0.2s ease',
                            filter: isHovered ? 'drop-shadow(0 1px 4px rgba(0,0,0,0.3))' : 'none'
                          }}
                        />
                        {/* Data label % */}
                        {(slice.endAngle - slice.startAngle) >= 22 && (
                          <text
                            x={labelX}
                            y={labelY}
                            fill="#FFFDFC"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="9"
                            fontWeight="900"
                            style={{
                              pointerEvents: 'none',
                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
                            }}
                          >
                            {Math.round(slice.pct)}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* ── 3. HÌNH TRÒN NHỎ: HIỆN TRƯỜNG ── */}
                <g>
                  {onSiteSlices.map((slice) => {
                    if (slice.value === 0) return null;
                    const isHovered = hoveredSubId === slice.id;
                    const slicePath = getSlicePath(cx2, cy2, r2, slice.startAngle, slice.endAngle);

                    const labelR = r2 * 0.62;
                    const labelX = cx2 + labelR * Math.cos(slice.midAngle * rad);
                    const labelY = cy2 + labelR * Math.sin(slice.midAngle * rad);

                    return (
                      <g
                        key={`site-${slice.id}`}
                        onClick={() => handleItemClick(slice.id)}
                        onMouseEnter={() => {
                          setHoveredSubId(slice.id);
                          setHoveredSlice({ ...slice, source: 'Hiện trường' });
                        }}
                        onMouseLeave={() => {
                          setHoveredSubId(null);
                          setHoveredSlice(null);
                        }}
                        style={{ cursor: selectedGroupId ? 'default' : 'pointer' }}
                      >
                        <path
                          d={slicePath}
                          fill={slice.color}
                          stroke="#FFFDFC"
                          strokeWidth={isHovered ? 2 : 1}
                          style={{
                            transition: 'all 0.2s ease',
                            filter: isHovered ? 'drop-shadow(0 1px 4px rgba(0,0,0,0.3))' : 'none'
                          }}
                        />
                        {/* Data label % */}
                        {(slice.endAngle - slice.startAngle) >= 22 && (
                          <text
                            x={labelX}
                            y={labelY}
                            fill="#FFFDFC"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="8.5"
                            fontWeight="900"
                            style={{
                              pointerEvents: 'none',
                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
                            }}
                          >
                            {Math.round(slice.pct)}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* Tiêu đề dưới 2 hình tròn */}
                <text
                  x={cx1}
                  y={166}
                  fill="#5B3924"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                >
                  Khiếu nại KH ({activeTotalComplaints})
                </text>
                <text
                  x={cx2}
                  y={166}
                  fill="#5B3924"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                >
                  Hiện trường ({activeTotalOnSite})
                </text>
              </svg>

              {/* Tooltip nổi tương tác */}
              {hoveredSlice && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#FFFDFC',
                  border: '1px solid #E4DDD5',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  color: '#302820',
                  boxShadow: '0 2px 8px rgba(91, 57, 36, 0.15)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 10
                }}>
                  <span style={{ color: hoveredSlice.color, fontWeight: '800' }}>● {hoveredSlice.name} ({hoveredSlice.source}): </span>
                  <span>{hoveredSlice.value} lỗi ({hoveredSlice.pct}%)</span>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG CHI TIẾT (ĐỒNG BỘ 100% VỚI 2 BIỂU ĐỒ) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            border: '1px solid #E4DDD5',
            borderRadius: '5px',
            background: '#FFFDFC'
          }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table className="qd-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '42%' }}>
                      {currentGroup ? `Chi tiết: ${currentGroup.name}` : 'Nhóm lỗi'}
                    </th>
                    <th style={{ width: '29%', textAlign: 'center' }}>Khiếu nại KH</th>
                    <th style={{ width: '29%', textAlign: 'center' }}>Hiện trường</th>
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((item) => {
                    const onSitePct = activeTotalOnSite > 0 ? ((item.onSite / activeTotalOnSite) * 100).toFixed(1) : 0;
                    const compPct = activeTotalComplaints > 0 ? ((item.complaints / activeTotalComplaints) * 100).toFixed(1) : 0;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        onMouseEnter={() => setHoveredSubId(item.id)}
                        onMouseLeave={() => setHoveredSubId(null)}
                        style={{
                          cursor: selectedGroupId ? 'default' : 'pointer',
                          transition: 'background-color 0.15s',
                          backgroundColor: hoveredSubId === item.id ? '#F7F4F0' : 'transparent'
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color, flexShrink: 0 }}></span>
                            <span style={{ fontWeight: '700', color: '#302820' }}>{item.name}</span>
                            {!selectedGroupId && (
                              <span style={{ fontSize: '0.62rem', color: '#786B61', marginLeft: 'auto', opacity: 0.7 }}>›</span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '800', color: '#302820' }}>{item.complaints}</span>
                          <span style={{ fontSize: '0.64rem', color: '#786B61', marginLeft: '3px' }}>({compPct}%)</span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '800', color: '#302820' }}>{item.onSite}</span>
                          <span style={{ fontSize: '0.64rem', color: '#786B61', marginLeft: '3px' }}>({onSitePct}%)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td>
                      <span style={{ fontWeight: '900', color: '#302820' }}>
                        {currentGroup ? 'Tổng nhóm' : 'Tổng cộng'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: '900', color: '#302820' }}>{activeTotalComplaints}</span>
                      <span style={{ fontSize: '0.64rem', color: '#786B61', marginLeft: '3px' }}>(100%)</span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: '900', color: '#302820' }}>{activeTotalOnSite}</span>
                      <span style={{ fontSize: '0.64rem', color: '#786B61', marginLeft: '3px' }}>(100%)</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default Section4QualityTrends;
