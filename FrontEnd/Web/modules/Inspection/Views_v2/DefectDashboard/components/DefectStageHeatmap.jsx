import React, { useMemo } from 'react';
import { Grid, Eye } from 'lucide-react';

// Biểu đồ nhiệt (Heatmap) thể hiện phân bố nguyên nhân lỗi theo từng công đoạn
export const DefectStageHeatmap = ({
  heatmapData = [],
  stages = [],
  onCellClick,
  onViewDetailTable
}) => {
  // Dùng danh sách công đoạn từ API `heatmap_stages`; fallback lấy từ chính các dòng dữ liệu thực
  const resolvedStages = useMemo(() => {
    if (Array.isArray(stages) && stages.length > 0) {
      return stages;
    }
    const keysSet = new Set();
    if (Array.isArray(heatmapData)) {
      heatmapData.forEach((row) => {
        if (row?.stages && typeof row.stages === 'object') {
          Object.keys(row.stages).forEach((k) => {
            if (k) keysSet.add(k);
          });
        }
      });
    }
    return Array.from(keysSet).map((name, i) => ({ code: `STG-${i + 1}`, name }));
  }, [stages, heatmapData]);

  const getHeatmapColor = (val) => {
    if (!val || val === 0) return { bg: '#FAF8F6', text: '#A8A29E' };
    if (val <= 3) return { bg: '#F0E7DF', text: '#795137' };
    if (val <= 7) return { bg: '#D9C3B0', text: '#523624' };
    if (val <= 14) return { bg: '#AD8057', text: '#FFFFFF' };
    return { bg: '#795137', text: '#FFFFFF' };
  };

  const hasData = Array.isArray(heatmapData) && heatmapData.length > 0;

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Grid size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Heatmap nguyên nhân lỗi × Công đoạn
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.66rem', color: '#78716C' }}>
            <span>Thấp</span>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#F0E7DF', borderRadius: '2px' }} title="1 - 3 lỗi" />
            <span style={{ width: '10px', height: '10px', backgroundColor: '#D9C3B0', borderRadius: '2px' }} title="4 - 7 lỗi" />
            <span style={{ width: '10px', height: '10px', backgroundColor: '#AD8057', borderRadius: '2px' }} title="8 - 14 lỗi" />
            <span style={{ width: '10px', height: '10px', backgroundColor: '#795137', borderRadius: '2px' }} title="≥ 15 lỗi" />
            <span>Cao</span>
          </div>
          {onViewDetailTable && (
            <button
              type="button"
              className="page-btn"
              onClick={onViewDetailTable}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #E8E2DC',
                background: '#FFFFFF',
                color: '#795137',
                fontSize: '0.67rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Xem bảng thống kê toàn bộ nguyên nhân lỗi"
            >
              <Eye size={11} /> Bảng chi tiết
            </button>
          )}
        </div>
      </div>

      {/* Ma trận phân bố lỗi theo công đoạn */}
      <div className="erp-chart-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', border: '1px solid #E8E2DC', borderRadius: '6px' }}>
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có dữ liệu phân bố lỗi theo công đoạn
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.70rem' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ backgroundColor: '#FAF3EC', borderBottom: '1.2px solid #E8E2DC' }}>
                <th style={{ textAlign: 'left', padding: '5px 8px', color: '#78716C', fontWeight: '700', minWidth: '120px' }}>
                  Nguyên nhân lỗi
                </th>
                {resolvedStages.map((s) => (
                  <th
                    key={s.code || s.name}
                    style={{
                      textAlign: 'center',
                      padding: '5px 4px',
                      color: '#78716C',
                      fontWeight: '700',
                      fontSize: '0.68rem',
                      minWidth: '55px'
                    }}
                    title={s.name}
                  >
                    {s.name.length > 8 ? `${s.name.slice(0, 7)}.` : s.name}
                  </th>
                ))}
                <th style={{ textAlign: 'right', padding: '5px 6px', color: '#78716C', fontWeight: '700', minWidth: '45px' }}>
                  Tổng
                </th>
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row, rIdx) => (
                <tr key={row.defect_id || rIdx} style={{ borderBottom: '1px solid #F8F9FB' }}>
                  <td
                    style={{
                      padding: '4px 8px',
                      fontWeight: '700',
                      color: '#292524',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      maxWidth: '130px'
                    }}
                    title={`${row.defect_name} (${row.defect_code})`}
                  >
                    {row.defect_name}
                  </td>
                  {resolvedStages.map((s) => {
                    const val = row.stages ? row.stages[s.name] || 0 : 0;
                    const c = getHeatmapColor(val);
                    return (
                      <td
                        key={s.code || s.name}
                        onClick={() => val > 0 && onCellClick && onCellClick(row, s.name)}
                        style={{
                          textAlign: 'center',
                          padding: '4px 2px',
                          backgroundColor: c.bg,
                          color: c.text,
                          fontWeight: val > 0 ? '800' : '500',
                          cursor: val > 0 ? 'pointer' : 'default',
                          transition: 'opacity 0.1s ease',
                          border: '1px solid #FFFFFF'
                        }}
                        title={`${row.defect_name} tại công đoạn ${s.name}: ${val} lỗi`}
                      >
                        {val > 0 ? val : '—'}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'right', padding: '4px 6px', fontWeight: '800', color: '#795137' }}>
                    {row.total_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DefectStageHeatmap;

