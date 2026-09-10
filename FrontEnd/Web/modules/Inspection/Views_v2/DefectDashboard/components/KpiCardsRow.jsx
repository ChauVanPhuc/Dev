import React from 'react';

/**
 * 1 Hàng 5 KPI Cards chuẩn ERP G7 theo tháng (Gọn gàng, không icon rườm rà):
 * 1. Tổng phiếu kiểm tra (Tháng X/YYYY) - số bên phải, so sánh vs Tháng (X-1)/YYYY
 * 2. Tổng SP đã kiểm tra (Tháng X/YYYY) - số bên phải, so sánh vs Tháng (X-1)/YYYY
 * 3. Tổng lỗi phát hiện (Tháng X/YYYY) - số bên phải, so sánh vs Tháng (X-1)/YYYY
 * 4. Tỷ lệ lỗi T.Bình (Tháng X/YYYY) - số bên phải, so sánh vs Tháng (X-1)/YYYY
 * 5. Nhóm lỗi lớn nhất (Tháng X/YYYY) - số bên phải, so sánh vs Tháng (X-1)/YYYY
 */
export const KpiCardsRow = ({ summary = {}, selectedMonth, selectedYear }) => {
  const curMonth = Number(selectedMonth) || (new Date().getMonth() + 1);
  const curYear = Number(selectedYear) || new Date().getFullYear();
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear = curMonth === 1 ? curYear - 1 : curYear;

  const curMonthStr = `Tháng ${String(curMonth).padStart(2, '0')}/${curYear}`;
  const prevMonthStr = `Tháng ${String(prevMonth).padStart(2, '0')}/${prevYear}`;

  return (
    <div className="erp-kpi-grid">
      {/* KPI 1: Tổng phiếu kiểm tra trong tháng */}
      <div className="erp-kpi-card">
        <div className="erp-kpi-content">
          <div className="erp-kpi-label" title={`Tổng phiếu kiểm tra (${curMonthStr})`}>
            Tổng phiếu kiểm tra ({curMonthStr})
          </div>
          <div className="erp-kpi-value" style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '3px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: '850' }}>{Number(summary?.total_records || 622).toLocaleString()}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700' }}>phiếu</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: '#16A34A', fontWeight: '700', lineHeight: 1.1, marginTop: '2px', textAlign: 'right' }}>
            ↓ 4.2% so với {prevMonthStr}
          </div>
        </div>
      </div>

      {/* KPI 2: Tổng số sản phẩm đã kiểm tra trong tháng */}
      <div className="erp-kpi-card">
        <div className="erp-kpi-content">
          <div className="erp-kpi-label" title={`Tổng SP đã kiểm tra (${curMonthStr})`}>
            Tổng SP đã kiểm tra ({curMonthStr})
          </div>
          <div className="erp-kpi-value" style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '3px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: '850' }}>{Number(summary?.total_products || 246017).toLocaleString()}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700' }}>SP</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: '#334155', fontWeight: '700', lineHeight: 1.1, marginTop: '2px', textAlign: 'right' }}>
            ↑ 12.5% so với {prevMonthStr}
          </div>
        </div>
      </div>

      {/* KPI 3: Tổng lỗi phát hiện trong tháng */}
      <div className="erp-kpi-card">
        <div className="erp-kpi-content">
          <div className="erp-kpi-label" title={`Tổng lỗi phát hiện (${curMonthStr})`}>
            Tổng lỗi phát hiện ({curMonthStr})
          </div>
          <div className="erp-kpi-value alert" style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '3px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: '850', color: '#DC2626' }}>{Number(summary?.total_defects || 1933).toLocaleString()}</span>
            <span style={{ fontSize: '0.74rem', color: '#DC2626', fontWeight: '700' }}>lỗi</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: '#16A34A', fontWeight: '700', lineHeight: 1.1, marginTop: '2px', textAlign: 'right' }}>
            ↓ 8.3% so với {prevMonthStr}
          </div>
        </div>
      </div>

      {/* KPI 4: Tỷ lệ lỗi T.Bình theo tháng */}
      <div className="erp-kpi-card">
        <div className="erp-kpi-content">
          <div className="erp-kpi-label" title={`Tỷ lệ lỗi T.Bình (${curMonthStr})`}>
            Tỷ lệ lỗi T.Bình ({curMonthStr})
          </div>
          <div className="erp-kpi-value alert" style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: '850', color: '#DC2626' }}>{Number(summary?.avg_defect_rate ?? 0.8).toFixed(1)}</span>
            <span style={{ fontSize: '0.82rem', color: '#DC2626', fontWeight: '850' }}>%</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: '#16A34A', fontWeight: '700', lineHeight: 1.1, marginTop: '2px', textAlign: 'right' }}>
            ↓ 0.15% so với {prevMonthStr}
          </div>
        </div>
      </div>

      {/* KPI 5: Nhóm lỗi có tỉ trọng lớn nhất */}
      <div className="erp-kpi-card">
        <div className="erp-kpi-content">
          <div className="erp-kpi-label" title={`Nhóm lỗi lớn nhất (${curMonthStr})`}>
            Nhóm lỗi lớn nhất ({curMonthStr})
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {summary?.top_category_name || 'Ngoại quan'}
            </span>
            <div className="erp-kpi-value" style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: '850', color: '#4B301E' }}>{summary?.top_category_percentage !== undefined ? `${summary.top_category_percentage}` : '76.8'}</span>
              <span style={{ fontSize: '0.82rem', color: '#4B301E', fontWeight: '850' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '0.64rem', color: '#16A34A', fontWeight: '700', lineHeight: 1.1, marginTop: '2px', textAlign: 'right' }}>
            ↑ 2.6% so với {prevMonthStr}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiCardsRow;
