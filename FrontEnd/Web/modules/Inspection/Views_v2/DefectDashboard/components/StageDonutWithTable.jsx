import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Layers, ArrowLeft } from 'lucide-react';
import api from '@webShared/Services/api.service';

// 8 màu nâu, sắp xếp từ đậm đến nhạt
const STAGE_MONO_PALETTE = [
  '#55331F',
  '#70452C',
  '#88593B',
  '#A0704D',
  '#B58A67',
  '#CAA385',
  '#D9B99F',
  '#E8D0BA'
];

// Nhãn tỷ lệ trên lát cắt donut (>= 5%)
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage, index }) => {
  if (!percentage || percentage < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const isLight = index >= 5;
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

// Nhãn tỷ lệ khi xem chi tiết nguyên nhân lỗi (>= 6%)
const renderCauseLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage, index }) => {
  if (!percentage || percentage < 6) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const isLight = index >= 5;
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

// Biểu đồ donut và bảng cơ cấu lỗi theo công đoạn
export const StageDonutWithTable = ({
  stageBreakdown = [],
  selectedStage = '',
  onStageClick,
  preset = 'all',
  startDate = '',
  endDate = '',
  category = '',
  aqlClass = ''
}) => {
  const [detailStage, setDetailStage] = useState(null);
  const [stageDetailData, setStageDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const prevSelectedStageRef = useRef(selectedStage);

  useEffect(() => {
    if (prevSelectedStageRef.current && !selectedStage) {
      setDetailStage(null);
    }
    prevSelectedStageRef.current = selectedStage;
  }, [selectedStage]);

  // Tải chi tiết nguyên nhân lỗi cho công đoạn được chọn từ Backend API
  useEffect(() => {
    if (!detailStage) {
      setStageDetailData(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    let isMounted = true;
    const fetchStageCauses = async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const params = {
          stage_name: detailStage,
          preset: preset || 'all'
        };
        if (preset !== 'all' && startDate) params.start_date = startDate;
        if (preset !== 'all' && endDate) params.end_date = endDate;
        if (category && category !== 'all') params.category = category;
        if (aqlClass && aqlClass !== 'all') params.aql_class = aqlClass;

        const res = await api.get('/inspections/daily/stage-causes', { params });
        if (!isMounted) return;
        const causes = Array.isArray(res?.causes)
          ? [...res.causes].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
          : [];
        setStageDetailData({
          stage_name: res?.stage_name || detailStage,
          totalStageDefects: Number(res?.totalStageDefects || 0),
          causes
        });
      } catch (err) {
        console.error('[StageDonutWithTable] Error fetching stage causes:', err);
        if (isMounted) {
          setStageDetailData(null);
          setDetailError('Không thể tải chi tiết nguyên nhân lỗi của công đoạn.');
        }
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    };

    fetchStageCauses();
    return () => { isMounted = false; };
  }, [detailStage, preset, startDate, endDate, category, aqlClass]);

  const hasData = Array.isArray(stageBreakdown) && stageBreakdown.length > 0;
  const totalDefects = stageBreakdown.reduce((sum, item) => sum + (Number(item.defect_count) || 0), 0);

  // Sắp xếp công đoạn theo số lỗi giảm dần
  const sortedStageBreakdown = useMemo(() => {
    const list = [...stageBreakdown].sort((a, b) => (Number(b.defect_count) || 0) - (Number(a.defect_count) || 0));
    return list.map((item, idx) => ({
      ...item,
      color: STAGE_MONO_PALETTE[idx % STAGE_MONO_PALETTE.length]
    }));
  }, [stageBreakdown]);

  // Quay lại danh sách công đoạn ban đầu
  const handleBack = () => {
    setDetailStage(null);
    setStageDetailData(null);
    setDetailError('');
    if (onStageClick) onStageClick('');
  };

  const isDrillDown = Boolean(detailStage);

  const chartData = useMemo(() => {
    if (isDrillDown) {
      const causes = stageDetailData?.causes || [];
      return causes.map((c, idx) => ({
        ...c,
        name: c.defect_name,
        color: STAGE_MONO_PALETTE[idx % STAGE_MONO_PALETTE.length]
      }));
    }
    return sortedStageBreakdown;
  }, [isDrillDown, stageDetailData, sortedStageBreakdown]);

  const centerLabel = isDrillDown ? detailStage : 'Tổng lỗi';
  const centerCount = isDrillDown ? (stageDetailData?.totalStageDefects || 0) : totalDefects;
  const activeStage = detailStage || selectedStage;

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            {isDrillDown ? `Chi tiết lỗi công đoạn: ${detailStage}` : 'Cơ cấu lỗi theo công đoạn'}
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: '600' }}>
          Đơn vị: Số lỗi phát sinh
        </span>
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
              Không có dữ liệu công đoạn
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
                  dataKey={isDrillDown ? 'count' : 'defect_count'}
                  nameKey={isDrillDown ? 'defect_name' : 'stage'}
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="56%"
                  outerRadius="88%"
                  paddingAngle={chartData.length > 1 ? (isDrillDown ? 1.5 : 2) : 0}
                  labelLine={false}
                  label={isDrillDown ? renderCauseLabel : renderCustomizedLabel}
                  cursor="pointer"
                  onClick={(entry) => {
                    if (!isDrillDown && entry?.stage) {
                      setDetailStage(entry.stage);
                      if (onStageClick) onStageClick(entry.stage);
                    }
                  }}
                >
                  {chartData.map((entry, idx) => {
                    const isSelected = !isDrillDown && activeStage === entry.stage;
                    return (
                      <Cell
                        key={`stage-cell-${entry.defect_code || entry.stage || idx}`}
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
                          <div style={{ fontWeight: '800', color: d.color }}>{d.defect_name} ({d.defect_code})</div>
                          <div style={{ color: '#292524', fontWeight: '700', marginTop: '2px' }}>
                            {d.count} lỗi ({d.percentage}%)
                          </div>
                          <div style={{ color: '#78716C', fontSize: '0.66rem', marginTop: '1px' }}>
                            Mức AQL: <strong style={{ color: d.aql_class === 'Critical' ? '#5C381E' : (d.aql_class === 'Major' ? '#9A6946' : '#8D6442') }}>{d.aql_class}</strong>
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
                        <div style={{ fontWeight: '800', color: d.color }}>{d.stage}</div>
                        <div style={{ color: '#292524', fontWeight: '700' }}>
                          {d.defect_count} lỗi ({d.percentage}%)
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bảng chi tiết */}
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
            <span style={{ fontSize: '0.70rem', fontWeight: '800', color: isDrillDown ? '#795137' : '#292524' }}>
              {isDrillDown
                ? `Chi tiết: ${detailStage} (${stageDetailData?.totalStageDefects || 0} lỗi)`
                : 'Công đoạn (Giảm dần)'
              }
            </span>

            {isDrillDown && (
              <button
                type="button"
                className="page-btn"
                onClick={handleBack}
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
              /* Danh sách công đoạn */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.70rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '50px' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FAF3EC', zIndex: 2 }}>
                  <tr style={{ borderBottom: '1px solid #E8E2DC', color: '#78716C' }}>
                    <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '6px 6px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Công đoạn</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Số lỗi</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStageBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#78716C' }}>
                        Không có dữ liệu công đoạn
                      </td>
                    </tr>
                  ) : (
                    sortedStageBreakdown.map((row) => (
                      <tr
                        key={row.stage}
                        onClick={() => {
                          setDetailStage(row.stage);
                          if (onStageClick) onStageClick(row.stage);
                        }}
                        style={{
                          borderBottom: '1px solid #F2ECE7',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease',
                          backgroundColor: activeStage === row.stage ? '#FAF3EC' : '#FFFFFF'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF3EC'; }}
                        onMouseLeave={(e) => { if (activeStage !== row.stage) e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                      >
                        <td style={{ padding: '5px 6px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: row.color, flexShrink: 0 }} />
                            <strong style={{ color: '#292524' }}>{row.stage}</strong>
                          </span>
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '800', color: '#795137' }}>
                          {row.defect_count}
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '700', color: '#57534E' }}>
                          {row.percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              /* Danh sách nguyên nhân lỗi */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.69rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '22px' }} />
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '55px' }} />
                  <col style={{ width: '45px' }} />
                  <col style={{ width: '42px' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FAF3EC', zIndex: 2 }}>
                  <tr style={{ borderBottom: '1px solid #E8E2DC', color: '#78716C' }}>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 2px', fontWeight: '700', backgroundColor: '#FAF3EC' }}>#</th>
                    <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '6px 5px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Nguyên nhân lỗi</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Mức AQL</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Số lỗi</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25, backgroundColor: '#FAF3EC' }}>Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#78716C' }}>
                        Đang tải nguyên nhân lỗi...
                      </td>
                    </tr>
                  ) : detailError ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#B91C1C' }}>
                        {detailError}
                      </td>
                    </tr>
                  ) : (!stageDetailData || !stageDetailData.causes || stageDetailData.causes.length === 0) ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#78716C' }}>
                        Không có nguyên nhân lỗi phát sinh
                      </td>
                    </tr>
                  ) : (
                    stageDetailData.causes.map((item, idx) => (
                      <tr
                        key={item.defect_code || idx}
                        style={{
                          borderBottom: '1px solid #F2ECE7',
                          backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FDFBF9'
                        }}
                      >
                        <td style={{ padding: '4px 3px', textAlign: 'center', color: '#78716C' }}>{idx + 1}</td>
                        <td style={{ padding: '4px 5px', fontWeight: '600', color: '#292524' }}>
                          <div>{item.defect_name}</div>
                          <div style={{ fontSize: '0.62rem', color: '#78716C' }}>{item.defect_code}</div>
                        </td>
                        <td style={{ padding: '4px 5px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: '700',
                              color: item.aql_class === 'Critical' ? '#5C381E' : (item.aql_class === 'Major' ? '#9A6946' : '#8D6442')
                            }}
                          >
                            {item.aql_class}
                          </span>
                        </td>
                        <td style={{ padding: '4px 5px', textAlign: 'right', fontWeight: '800', color: '#795137' }}>
                          {item.count}
                        </td>
                        <td style={{ padding: '4px 5px', textAlign: 'right', color: '#57534E' }}>
                          {item.percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Tổng cộng cố định ở đáy bảng */}
          <div className="aql-table-footer" style={{ flexShrink: 0, backgroundColor: '#FAF3EC', borderTop: '2px solid #795137' }}>
            {!isDrillDown ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.70rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '50px' }} />
                </colgroup>
                <tfoot>
                  <tr style={{ fontWeight: '800' }}>
                    <td style={{ padding: '5px 6px', color: '#795137', fontWeight: '900', textAlign: 'left' }}>
                      Tổng cộng toàn xưởng
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '900', color: '#795137' }}>
                      {totalDefects}
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '800', color: '#292524' }}>
                      {totalDefects > 0 ? '100.0%' : '0.0%'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.69rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '22px' }} />
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '55px' }} />
                  <col style={{ width: '45px' }} />
                  <col style={{ width: '42px' }} />
                </colgroup>
                <tfoot>
                  <tr style={{ fontWeight: '800' }}>
                    <td colSpan={3} style={{ padding: '5px 6px', color: '#795137', fontWeight: '900', textAlign: 'left' }}>
                      Tổng cộng ({detailStage})
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '900', color: '#795137' }}>
                      {stageDetailData?.totalStageDefects || 0}
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '800', color: '#292524' }}>
                      {(stageDetailData?.totalStageDefects || 0) > 0 ? '100.0%' : '0.0%'}
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

export default StageDonutWithTable;

