import React, { useState } from 'react';
import MiniSparkline from './MiniSparkline';

export const Section5TopDefectsTable = ({ defectsData: propDefects, linesData: propLines }) => {
  // 'defects' = Top lỗi thường gặp | 'lines' = Top line/bộ phận có tỷ lệ lỗi cao
  const [activeTab, setActiveTab] = useState('defects');

  const defectsData = Array.isArray(propDefects) ? propDefects : [];
  const linesData = Array.isArray(propLines) ? propLines : [];

  const totalDefectsCount = defectsData.reduce((acc, d) => acc + (d.count || 0), 0);
  
  // Tính tổng sparkline trend và độ tăng giảm so với tháng trước của Tổng Top 5
  const totalDefectsTrend = defectsData.length > 0 && defectsData[0].trend
    ? defectsData[0].trend.map((_, i) => defectsData.reduce((sum, d) => sum + (d.trend ? (d.trend[i] || 0) : 0), 0))
    : [0, 0, 0, 0, 0, totalDefectsCount];

  const hasMonthlyComparison = defectsData.some(d => d.change && d.change !== '—');
  const prevMonthTotal = totalDefectsTrend.length >= 2 ? totalDefectsTrend[totalDefectsTrend.length - 2] : 0;
  const currentMonthTotal = totalDefectsTrend.length >= 1 ? totalDefectsTrend[totalDefectsTrend.length - 1] : totalDefectsCount;
  const totalDiff = currentMonthTotal - prevMonthTotal;
  const totalChangeStr = hasMonthlyComparison 
    ? (totalDiff > 0 ? `▲ ${totalDiff.toLocaleString()}` : (totalDiff < 0 ? `▼ ${Math.abs(totalDiff).toLocaleString()}` : '— 0'))
    : '—';
  const isTotalWorse = totalDiff > 0;

  return (
    <div className="qd-section-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header có nút Switch chuyển đổi giữa Top lỗi và Top line */}
      <div className="qd-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{activeTab === 'defects' ? '5. Top lỗi thường gặp' : '5. Top line/bộ phận'}</span>
        </div>

        {/* Switch Buttons */}
        <div style={{
          display: 'inline-flex',
          background: 'rgba(255, 253, 252, 0.22)',
          padding: '2px',
          borderRadius: '4px',
          gap: '2px'
        }}>
          <button
            onClick={() => setActiveTab('defects')}
            style={{
              padding: '2px 8px',
              fontSize: '0.68rem',
              fontWeight: activeTab === 'defects' ? '800' : '600',
              color: activeTab === 'defects' ? '#5B3924' : '#FFFDFC',
              background: activeTab === 'defects' ? '#FFFDFC' : 'transparent',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'defects' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            Top lỗi
          </button>
          <button
            onClick={() => setActiveTab('lines')}
            style={{
              padding: '2px 8px',
              fontSize: '0.68rem',
              fontWeight: activeTab === 'lines' ? '800' : '600',
              color: activeTab === 'lines' ? '#5B3924' : '#FFFDFC',
              background: activeTab === 'lines' ? '#FFFDFC' : 'transparent',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'lines' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            Top line
          </button>
        </div>
      </div>

      <div className="qd-section-body qd-sec5-table-box" style={{ padding: '0', overflowY: 'auto', overflowX: 'auto', flex: 1, minHeight: 0 }}>
        {activeTab === 'defects' ? (
          /* BẢNG 1: TOP LỖI THƯỜNG GẶP */
          <table className="qd-table">
            <thead>
              <tr>
                <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                <th>Loại lỗi</th>
                <th style={{ textAlign: 'center' }}>Số lượng</th>
                <th style={{ textAlign: 'center' }}>Tỷ lệ (%)</th>
                <th style={{ textAlign: 'center' }}>So với tháng trước</th>
                <th style={{ textAlign: 'center', width: '70px' }}>Xu hướng</th>
              </tr>
            </thead>
            <tbody>
              {defectsData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px 8px', color: '#786B61', fontWeight: '600', fontSize: '0.78rem' }}>
                    Không có dữ liệu lỗi ghi nhận trong khoảng thời gian này
                  </td>
                </tr>
              ) : (
                <>
                  {defectsData.map((d) => (
                    <tr key={d.stt}>
                      <td style={{ textAlign: 'center', color: '#786B61', fontWeight: '700' }}>{d.stt}</td>
                      <td style={{ fontWeight: '700', color: '#302820' }}>{d.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: '800', color: '#302820' }}>{d.count}</td>
                      <td style={{ textAlign: 'center', fontWeight: '800', color: '#786B61' }}>{d.pct}</td>
                      <td style={{ textAlign: 'center' }}>
                        {d.change && d.change !== '—' ? (
                          <span className={d.isWorse ? 'qd-change-neg' : 'qd-change-pos'}>
                            {d.change}
                          </span>
                        ) : (
                          <span style={{ color: '#786B61', fontWeight: '700' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <MiniSparkline data={d.trend} color={d.isWorse ? '#8C5332' : '#3F7D58'} width={55} height={16} />
                      </td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td style={{ textAlign: 'center' }}></td>
                    <td style={{ fontWeight: '900', color: '#302820' }}>Tổng top 5</td>
                    <td style={{ textAlign: 'center', fontWeight: '900', color: '#302820' }}>{totalDefectsCount}</td>
                    <td style={{ textAlign: 'center', fontWeight: '900', color: '#302820' }}>
                      {defectsData.reduce((acc, d) => acc + parseFloat(d.pct || 0), 0).toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {hasMonthlyComparison ? (
                        <span className={isTotalWorse ? 'qd-change-neg' : 'qd-change-pos'} style={{ fontWeight: '800' }}>
                          {totalChangeStr}
                        </span>
                      ) : (
                        <span style={{ color: '#786B61', fontWeight: '700' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <MiniSparkline data={totalDefectsTrend} color="#8C5332" width={55} height={16} />
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        ) : (
          /* BẢNG 2: TOP LINE / BỘ PHẬN CÓ TỶ LỆ LỖI CAO */
          <table className="qd-table">
            <thead>
              <tr>
                <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                <th>Line / Bộ phận</th>
                <th style={{ textAlign: 'center' }}>Tỷ lệ lỗi (%)</th>
                <th style={{ textAlign: 'center' }}>So với tháng trước</th>
                <th style={{ textAlign: 'center', width: '70px' }}>Xu hướng</th>
              </tr>
            </thead>
            <tbody>
              {linesData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px 8px', color: '#786B61', fontWeight: '600', fontSize: '0.78rem' }}>
                    Không có dữ liệu line / bộ phận trong khoảng thời gian này
                  </td>
                </tr>
              ) : (
                linesData.map((l) => (
                  <tr key={l.stt}>
                    <td style={{ textAlign: 'center', color: '#786B61', fontWeight: '700' }}>{l.stt}</td>
                    <td style={{ fontWeight: '700', color: '#302820' }}>{l.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#302820' }}>{l.rate}</td>
                    <td style={{ textAlign: 'center' }}>
                      {l.change && l.change !== '—' ? (
                        <span className={l.isWorse ? 'qd-change-neg' : 'qd-change-pos'}>
                          {l.change}
                        </span>
                      ) : (
                        <span style={{ color: '#786B61', fontWeight: '700' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <MiniSparkline data={l.trend} color={l.color} width={55} height={16} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Section5TopDefectsTable;
