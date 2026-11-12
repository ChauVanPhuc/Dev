import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import api from '@webShared/Services/api.service';

// Bảng màu theo 3 mức độ AQL
const AQL_SEVERITY_PALETTE = {
  Critical: '#5C381E',
  Major: '#9A6946',
  Minor: '#D4B89B'
};

// Nhãn tỷ lệ trên lát cắt donut (>= 5%)
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage, aql_class }) => {
  if (!percentage || percentage < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const isLight = aql_class === 'Minor';
  const textColor = isLight ? '#3D2415' : '#FFFFFF';
  const textShadow = isLight ? 'none' : '0 1px 2px rgba(0,0,0,0.55)';

  return (
    <text
      x={x}
      y={y}
      fill={textColor}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={800}
      style={{ pointerEvents: 'none', textShadow }}
    >
      {`${percentage}%`}
    </text>
  );
};

// Nhãn tỷ lệ khi xem chi tiết nguyên nhân lỗi (>= 5%)
const renderCauseCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
  if (!percentage || percentage < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#FFFFFF"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={800}
      style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.65)' }}
    >
      {`${percentage}%`}
    </text>
  );
};

// Biểu đồ donut và bảng cơ cấu lỗi theo mức độ AQL
export const AqlSeverityDonutChart = ({
  aqlBreakdown = [],
  preset = 'all',
  startDate = '',
  endDate = '',
  stage = '',
  category = ''
}) => {
  const [selectedAqlDetail, setSelectedAqlDetail] = useState(null);
  const [aqlDetailData, setAqlDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Tải chi tiết nguyên nhân lỗi theo mức AQL từ Backend API
  useEffect(() => {
    if (!selectedAqlDetail) {
      setAqlDetailData(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    let isMounted = true;
    const fetchAqlBreakdown = async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const params = {
          aql_class: selectedAqlDetail,
          preset: preset || 'all'
        };
        if (preset !== 'all' && startDate) params.start_date = startDate;
        if (preset !== 'all' && endDate) params.end_date = endDate;
        if (stage && stage !== 'all') params.stage = stage;
        if (category && category !== 'all') params.category = category;

        const res = await api.get('/inspections/daily/aql-breakdown', { params });
        if (!isMounted) return;
        setAqlDetailData({
          aql_class: res?.aql_class || selectedAqlDetail,
          totalAqlDefects: Number(res?.totalAqlDefects || 0),
          totalPrevDefects: res?.totalPrevDefects ?? null,
          totalDiff: res?.totalDiff ?? null,
          totalDiffStr: res?.totalDiffStr ?? '—',
          hasComparison: Boolean(res?.hasComparison),
          tableRows: Array.isArray(res?.tableRows) ? res.tableRows : []
        });
      } catch (err) {
        console.error('[AqlSeverityDonutChart] Error fetching AQL breakdown:', err);
        if (isMounted) {
          setAqlDetailData(null);
          setDetailError('Không thể tải chi tiết nguyên nhân lỗi theo mức AQL.');
        }
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    };

    fetchAqlBreakdown();
    return () => { isMounted = false; };
  }, [selectedAqlDetail, preset, startDate, endDate, stage, category]);

  const hasData = Array.isArray(aqlBreakdown) && aqlBreakdown.length > 0;
  const totalDefects = aqlBreakdown.reduce((s, item) => s + (Number(item.count) || 0), 0);

  // Gán màu theo mức AQL
  const coloredAqlBreakdown = useMemo(() => {
    return aqlBreakdown.map((item) => ({
      ...item,
      color: AQL_SEVERITY_PALETTE[item.aql_class] || item.color || '#B88955'
    }));
  }, [aqlBreakdown]);

  const activeAqlColor = selectedAqlDetail ? (AQL_SEVERITY_PALETTE[selectedAqlDetail] || '#795137') : '#795137';

  const isDrillDown = Boolean(selectedAqlDetail);
  const chartData = isDrillDown ? (aqlDetailData?.tableRows || []) : coloredAqlBreakdown;
  const centerLabel = isDrillDown ? `Lỗi ${selectedAqlDetail}` : 'Tổng lỗi';
  const centerCount = isDrillDown ? (aqlDetailData?.totalAqlDefects || 0) : totalDefects;

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldAlert size={15} style={{ color: activeAqlColor }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            {isDrillDown ? `Cơ cấu lỗi ${selectedAqlDetail} theo nguyên nhân` : 'Cơ cấu lỗi theo mức độ AQL'}
          </span>
        </div>
      </div>

      {/* Biểu đồ Donut (trái) và Bảng (phải) */}
      <div className="erp-chart-body aql-detail-content" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 45fr) minmax(0, 55fr)', gap: '10px', flex: '1 1 0px', minHeight: 0, width: '100%', overflow: 'hidden' }}>
        <div style={{ height: '100%', minHeight: 0, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {/* Tổng số lỗi ở tâm Donut */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            <div style={{ fontSize: '0.66rem', color: '#78716C', fontWeight: '700', lineHeight: 1.1 }}>
              {centerLabel}
            </div>
            <div style={{ fontSize: '1.25rem', color: '#292524', fontWeight: '900', lineHeight: 1.1, marginTop: '2px' }}>
              {detailLoading ? '...' : Number(centerCount).toLocaleString()}
            </div>
          </div>

          {!isDrillDown && !hasData ? (
            <div style={{ color: '#78716C', fontSize: '0.72rem', textAlign: 'center' }}>
              Không có dữ liệu AQL
            </div>
          ) : isDrillDown && detailLoading ? (
            <div style={{ color: '#78716C', fontSize: '0.72rem', textAlign: 'center' }}>
              Đang tải chi tiết...
            </div>
          ) : isDrillDown && chartData.length === 0 ? (
            <div style={{ color: '#78716C', fontSize: '0.72rem', textAlign: 'center' }}>
              {detailError || 'Không có nguyên nhân lỗi'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey={isDrillDown ? 'curr_count' : 'count'}
                  nameKey={isDrillDown ? 'defect_name' : 'aql_class'}
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="56%"
                  outerRadius="88%"
                  paddingAngle={chartData.length > 1 ? (isDrillDown ? 1.5 : 3) : 0}
                  labelLine={false}
                  label={isDrillDown ? renderCauseCustomizedLabel : renderCustomizedLabel}
                  cursor="pointer"
                  onClick={(entry) => {
                    if (!isDrillDown && entry?.aql_class) {
                      setSelectedAqlDetail(entry.aql_class);
                    }
                  }}
                >
                  {chartData.map((entry, idx) => {
                    const isSelected = !isDrillDown && selectedAqlDetail === entry.aql_class;
                    return (
                      <Cell
                        key={`cell-${entry.defect_code || entry.aql_class || idx}`}
                        fill={entry.color}
                        stroke={isSelected ? '#292524' : '#FFFFFF'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    if (isDrillDown) {
                      return (
                        <div
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E8E2DC',
                            borderRadius: '6px',
                            padding: '6px 9px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            fontSize: '0.70rem'
                          }}
                        >
                          <div style={{ fontWeight: '800', color: d.color }}>
                            {d.defect_name} ({d.defect_code})
                          </div>
                          <div style={{ color: '#292524', fontWeight: '700', marginTop: '2px' }}>
                            Số lỗi: {d.curr_count} ({d.percentage}%)
                          </div>
                          <div style={{ color: '#78716C', fontSize: '0.66rem', marginTop: '1px' }}>
                            Biến động so với kỳ trước: <strong style={{ color: d.diff > 0 ? '#B91C1C' : (d.diff < 0 ? '#15803D' : '#78716C') }}>{d.diff_str}</strong>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E8E2DC',
                          borderRadius: '6px',
                          padding: '6px 9px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          fontSize: '0.70rem'
                        }}
                      >
                        <div style={{ fontWeight: '800', color: d.color }}>{d.aql_class}</div>
                        <div style={{ color: '#292524', fontWeight: '700' }}>
                          {d.count} lỗi ({d.percentage}%)
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CỘT PHẢI (55%): BẢNG DỮ LIỆU ĐỒNG BỘ CÓ VÙNG CUỘN ĐỘC LẬP */}
        <div
          className="aql-table-panel"
          style={{
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #E8E2DC',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden'
          }}
        >
          <div
            className="aql-table-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 8px',
              backgroundColor: '#F8F9FB',
              borderBottom: '1px solid #E8E2DC',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '0.70rem', fontWeight: '800', color: isDrillDown ? activeAqlColor : '#292524' }}>
              {isDrillDown
                ? `Chi tiết: ${selectedAqlDetail} (${aqlDetailData?.totalAqlDefects || 0} lỗi)`
                : 'Phân loại AQL'
              }
            </span>

            {isDrillDown && (
              <button
                type="button"
                className="page-btn"
                onClick={() => {
                  setSelectedAqlDetail(null);
                  setAqlDetailData(null);
                  setDetailError('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 7px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8E2DC',
                  borderRadius: '4px',
                  color: '#795137',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                <ArrowLeft size={10} /> Quay lại
              </button>
            )}
          </div>

          <div
            className="aql-table-scroll"
            style={{
              flex: '1 1 0px',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehaviorY: 'contain'
            }}
          >
            {!isDrillDown ? (
              /* Danh sách mức AQL */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '55px' }} />
                  <col style={{ width: '55px' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FAF3EC', zIndex: 2 }}>
                  <tr style={{ borderBottom: '1px solid #E8E2DC', color: '#78716C' }}>
                    <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '6px 6px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Mức AQL</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Số lỗi</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {coloredAqlBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#78716C' }}>
                        Không có dữ liệu AQL
                      </td>
                    </tr>
                  ) : (
                    coloredAqlBreakdown.map((row) => (
                      <tr
                        key={row.aql_class}
                        onClick={() => setSelectedAqlDetail(row.aql_class)}
                        style={{
                          borderBottom: '1px solid #F2ECE7',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease',
                          backgroundColor: '#FFFFFF'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF3EC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                      >
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: row.color, flexShrink: 0 }} />
                            <strong style={{ color: '#292524' }}>{row.aql_class}</strong>
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: row.color }}>
                          {row.count}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', color: '#57534E' }}>
                          {row.percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              /* Danh sách nguyên nhân lỗi */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.70rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '48px' }} />
                  <col style={{ width: '68px' }} />
                  <col style={{ width: '50px' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FAF3EC', zIndex: 2 }}>
                  <tr style={{ borderBottom: '1px solid #E8E2DC', color: '#78716C' }}>
                    <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '6px 6px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Tên nguyên nhân lỗi</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Kỳ này</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Biến động</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLoading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#78716C' }}>
                        Đang tải nguyên nhân lỗi...
                      </td>
                    </tr>
                  ) : detailError ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#B91C1C' }}>
                        {detailError}
                      </td>
                    </tr>
                  ) : (!aqlDetailData || !aqlDetailData.tableRows || aqlDetailData.tableRows.length === 0) ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#78716C' }}>
                        Không có nguyên nhân lỗi phát sinh
                      </td>
                    </tr>
                  ) : (
                    aqlDetailData.tableRows.map((item, idx) => {
                      const hasComp = item.diff_str !== '—' && item.diff !== null && item.diff !== undefined;
                      const isUp = hasComp && item.diff > 0;
                      const isDown = hasComp && item.diff < 0;
                      const diffColor = isUp ? '#B91C1C' : (isDown ? '#15803D' : '#78716C');

                      return (
                        <tr
                          key={item.defect_code || idx}
                          style={{
                            borderBottom: '1px solid #F2ECE7',
                            backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FDFBF9'
                          }}
                        >
                          <td style={{ padding: '4px 6px', fontWeight: '600', color: '#292524' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: item.color, flexShrink: 0 }} />
                              <span>{item.defect_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '800', color: activeAqlColor }}>
                            {item.curr_count}
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '700', color: diffColor }}>
                            {item.diff_str}
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', color: '#57534E', fontWeight: '600' }}>
                            {item.percentage}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Tổng cộng cố định ở đáy bảng */}
          <div className="aql-table-footer" style={{ flexShrink: 0, backgroundColor: '#FAF3EC', borderTop: '2px solid #795137' }}>
            {!isDrillDown ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '55px' }} />
                  <col style={{ width: '55px' }} />
                </colgroup>
                <tfoot>
                  <tr style={{ fontWeight: '800' }}>
                    <td style={{ padding: '6px 8px', color: '#795137', fontWeight: '900', textAlign: 'left' }}>
                      Tổng cộng toàn xưởng
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '900', color: '#795137' }}>
                      {totalDefects}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: '#292524' }}>
                      {totalDefects > 0 ? '100.0%' : '0.0%'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.70rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '48px' }} />
                  <col style={{ width: '68px' }} />
                  <col style={{ width: '50px' }} />
                </colgroup>
                <tfoot>
                  <tr style={{ fontWeight: '800' }}>
                    <td style={{ padding: '5px 6px', color: '#795137', fontWeight: '900', textAlign: 'left' }}>
                      Tổng cộng ({selectedAqlDetail})
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '900', color: activeAqlColor }}>
                      {aqlDetailData?.totalAqlDefects || 0}
                    </td>
                    <td style={{
                      padding: '5px 6px',
                      textAlign: 'right',
                      fontWeight: '800',
                      color: aqlDetailData?.totalDiffStr !== '—' && (aqlDetailData?.totalDiff || 0) > 0
                        ? '#B91C1C'
                        : (aqlDetailData?.totalDiffStr !== '—' && (aqlDetailData?.totalDiff || 0) < 0 ? '#15803D' : '#78716C')
                    }}>
                      {aqlDetailData?.totalDiffStr ?? '—'}
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '800', color: '#292524' }}>
                      {(aqlDetailData?.totalAqlDefects || 0) > 0 ? '100.0%' : '0.0%'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AqlSeverityDonutChart;

