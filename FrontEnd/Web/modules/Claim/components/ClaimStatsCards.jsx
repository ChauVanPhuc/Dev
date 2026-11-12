import React, { useMemo } from 'react';
import { calculateTotalPenalty, getMonthYear, getMonthNumber } from '../utils/claimHelpers';
import '../styles/claim.css';

export const ClaimStatsCards = ({
  cabinetPrices = [],
  claims = [],
  filteredClaims = [],
  exceptionData = {},
  appliedFilters = {},
  editMonth = '',
  editYear = '',
  onOpenAnalytics,
  onOpenUnderReview,
  onOpenExceptions
}) => {
  // Compute KPI data accurately
  const kpiData = useMemo(() => {
    let targetMonthStr = '';
    let compMonthStr = '';

    // Check if month is explicitly filtered (either in appliedFilters.time or via editMonth/editYear)
    const timeFilter = appliedFilters?.time || {};
    const selectedMonth = editMonth || timeFilter.month;
    const selectedYear = editYear || timeFilter.year;

    if (selectedMonth && selectedYear) {
      const mNum = getMonthNumber(selectedMonth);
      if (mNum) {
        targetMonthStr = `${String(mNum).padStart(2, '0')}-${selectedYear}`;
      }
    }

    // If no explicit month is selected, default to current month - 1
    if (!targetMonthStr) {
      const now = new Date();
      // Month in JS is 0-indexed: January=0, August=7
      // We want current month - 1 month:
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const y = prevDate.getFullYear();
      targetMonthStr = `${m}-${y}`;
    }

    // Comparison month = targetMonth - 1 month
    const [tM, tY] = targetMonthStr.split('-').map(Number);
    const compDate = new Date(tY, tM - 2, 1);
    const cM = String(compDate.getMonth() + 1).padStart(2, '0');
    const cY = compDate.getFullYear();
    compMonthStr = `${cM}-${cY}`;

    const displayTargetMonth = targetMonthStr.replace('-', '/');
    const displayCompMonth = compMonthStr.replace('-', '/');

    // Filter claims by target month and comparison month from full claims dataset
    const targetClaims = claims.filter(c => getMonthYear(c) === targetMonthStr);
    const compClaims = claims.filter(c => getMonthYear(c) === compMonthStr);

    const targetCount = targetClaims.length;
    const compCount = compClaims.length;

    const targetPenaltySum = targetClaims.reduce((sum, c) => {
      const val = calculateTotalPenalty(c, undefined, cabinetPrices);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const compPenaltySum = compClaims.reduce((sum, c) => {
      const val = calculateTotalPenalty(c, undefined, cabinetPrices);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    // Compute Penalty Diff & Text
    let penaltyDiffText = '';
    let penaltyColor = '#6B7280'; // Neutral
    const penaltyAbsDiff = Math.abs(targetPenaltySum - compPenaltySum);
    const formattedPenaltyAbs = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(penaltyAbsDiff);

    if (compPenaltySum === 0 && targetPenaltySum > 0) {
      penaltyDiffText = `↑ ${formattedPenaltyAbs} so với ${displayCompMonth}`;
      penaltyColor = '#DC2626'; // Red (increase in penalty)
    } else if (compPenaltySum === 0 && targetPenaltySum === 0) {
      penaltyDiffText = `Không thay đổi so với ${displayCompMonth}`;
      penaltyColor = '#6B7280';
    } else {
      const pct = ((targetPenaltySum - compPenaltySum) / compPenaltySum) * 100;
      const formattedPct = Math.abs(pct).toFixed(1).replace(/\.0$/, '');
      if (pct > 0) {
        penaltyDiffText = `↑ ${formattedPenaltyAbs} (+${formattedPct}%) so với ${displayCompMonth}`;
        penaltyColor = '#DC2626'; // Red
      } else if (pct < 0) {
        penaltyDiffText = `↓ ${formattedPenaltyAbs} (-${formattedPct}%) so với ${displayCompMonth}`;
        penaltyColor = '#059669'; // Green
      } else {
        penaltyDiffText = `0% so với ${displayCompMonth}`;
        penaltyColor = '#6B7280';
      }
    }

    // Compute Count Diff & Text
    let countDiffText = '';
    let countColor = '#6B7280'; // Neutral
    const countAbsDiff = Math.abs(targetCount - compCount);

    if (compCount === 0 && targetCount > 0) {
      countDiffText = `↑ ${countAbsDiff} vụ so với ${displayCompMonth}`;
      countColor = '#DC2626'; // Red (increase in defect cases)
    } else if (compCount === 0 && targetCount === 0) {
      countDiffText = `Không thay đổi so với ${displayCompMonth}`;
      countColor = '#6B7280';
    } else {
      const pct = ((targetCount - compCount) / compCount) * 100;
      const formattedPct = Math.abs(pct).toFixed(1).replace(/\.0$/, '');
      if (pct > 0) {
        countDiffText = `↑ ${countAbsDiff} vụ (+${formattedPct}%) so với ${displayCompMonth}`;
        countColor = '#DC2626'; // Red
      } else if (pct < 0) {
        countDiffText = `↓ ${countAbsDiff} vụ (-${formattedPct}%) so với ${displayCompMonth}`;
        countColor = '#059669'; // Green
      } else {
        countDiffText = `0% so với ${displayCompMonth}`;
        countColor = '#6B7280';
      }
    }

    return {
      displayTargetMonth,
      targetPenaltySum,
      penaltyDiffText,
      penaltyColor,
      targetCount,
      countDiffText,
      countColor
    };
  }, [claims, appliedFilters, editMonth, editYear, cabinetPrices]);

  const underReviewCount = useMemo(() => {
    return claims.filter(c => c.status === 'Đang xem xét' || c.status === 'Processing').length;
  }, [claims]);

  const exceptionCount = exceptionData?.totalCount || 0;

  return (
    <>
      <style>{`
        .overview-cards-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 12px !important;
          margin-bottom: 12px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        @media (max-width: 1200px) {
          .overview-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 600px) {
          .overview-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .summary-card {
          background-color: #FFFFFF !important;
          border: 1px solid #F3EAE0 !important;
          border-radius: 12px !important;
          padding: 12px 16px !important;
          box-shadow: 0 2px 4px rgba(123, 82, 51, 0.04) !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          position: relative !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          box-sizing: border-box !important;
        }
        .summary-card:hover {
          box-shadow: 0 4px 10px rgba(123, 82, 51, 0.08) !important;
          border-color: #EADCC9 !important;
          transform: translateY(-1px) !important;
        }
      `}</style>
      <div className="overview-cards-grid">
        {/* Tiền phạt G7 */}
        <div 
          className="summary-card" 
          style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3EAE0',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 2px 4px rgba(123, 82, 51, 0.04)',
            transition: 'all 0.2s ease',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={onOpenAnalytics}
          title="Nhấn để xem chi tiết thống kê theo tháng"
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>
              Tiền phạt G7 ({kpiData.displayTargetMonth})
            </span>
            <span style={{ 
              fontSize: '0.72rem', 
              color: kpiData.penaltyColor,
              marginTop: '4px',
              fontStyle: 'italic',
              fontWeight: '700'
            }}>
              {kpiData.penaltyDiffText}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#2D1A12' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(kpiData.targetPenaltySum || 0)}
            </span>
          </div>
        </div>

        {/* Số vụ ghi nhận */}
        <div 
          className="summary-card" 
          style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3EAE0',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 2px 4px rgba(123, 82, 51, 0.04)',
            transition: 'all 0.2s ease',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={onOpenAnalytics}
          title="Nhấn để xem chi tiết thống kê theo tháng"
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>
              Số vụ ghi nhận ({kpiData.displayTargetMonth})
            </span>
            <span style={{ 
              fontSize: '0.72rem', 
              color: kpiData.countColor,
              marginTop: '4px',
              fontStyle: 'italic',
              fontWeight: '700'
            }}>
              {kpiData.countDiffText}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#2D1A12' }}>
              {kpiData.targetCount || 0}
            </span>
          </div>
        </div>

        {/* Đang xem xét */}
        <div 
          className="summary-card" 
          style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3EAE0',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 2px 4px rgba(123, 82, 51, 0.04)',
            transition: 'all 0.2s ease',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={onOpenUnderReview}
          title="Nhấn để xem chi tiết danh sách đang xem xét"
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>
              Đang xem xét
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#D97706' }}>
              {underReviewCount}
            </span>
          </div>
        </div>

        {/* Số vụ ngoại lệ */}
        <div 
          className="summary-card" 
          style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3EAE0',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 2px 4px rgba(123, 82, 51, 0.04)',
            transition: 'all 0.2s ease',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={onOpenExceptions}
          title="Nhấn để xem chi tiết danh sách ngoại lệ"
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>
              Số vụ ngoại lệ
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#DC2626' }}>
              {exceptionCount}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClaimStatsCards;
