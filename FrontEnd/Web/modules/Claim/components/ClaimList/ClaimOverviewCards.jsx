import React from 'react';

const ClaimOverviewCards = ({
  kpiData,
  setIsAnalyticsOpen,
  exceptionData,
  setIsExceptionModalOpen,
  claims = [],
  setIsReviewModalOpen,
  setReviewCurrentPage
}) => {
  return (
<div className="overview-cards-grid">
  <div 
    className="summary-card" 
    style={{ 
      transition: 'transform 0.2s ease',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      cursor: 'pointer'
    }}
    onClick={() => setIsAnalyticsOpen(true)}
    title="Nhấn để xem chi tiết thống kê theo tháng"
  >
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
      <span style={{ fontSize: '0.9rem', color: '#7B5233', fontWeight: 'bold' }}>
        Tiền phạt G7 {kpiData.targetMonthStr ? `(${kpiData.targetMonthStr})` : ''}
      </span>
      {!kpiData.isViewingAll && kpiData.prevMonthStr ? (
        <span style={{ 
          fontSize: '0.72rem', 
          color: '#2D1A12',
          marginTop: '6px',
          fontStyle: 'italic'
        }}>
          Tháng {kpiData.prevMonthStr} :{' '}
          <span style={{ 
            fontWeight: '700', 
            color: kpiData.penaltyDiff > 0 ? '#DC2626' : kpiData.penaltyDiff < 0 ? '#059669' : '#6B7280'
          }}>
            {kpiData.penaltyDiff > 0 ? '+' : kpiData.penaltyDiff < 0 ? '-' : ''}${Math.round(Math.abs(kpiData.penaltyDiff)).toLocaleString()} ({kpiData.prevPenaltySum > 0 ? Math.round((Math.abs(kpiData.penaltyDiff) / kpiData.prevPenaltySum) * 100) : 0}%)
          </span>
        </span>
      ) : (
        <span style={{ fontSize: '0.72rem', color: '#888', marginTop: '6px', fontStyle: 'italic' }}>
          Tổng cộng tất cả các tháng
        </span>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2D1A12' }}>
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(kpiData.currentPenaltySum)}
      </span>
    </div>
  </div>

  <div 
    className="summary-card" 
    style={{ 
      transition: 'transform 0.2s ease',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      cursor: 'pointer'
    }}
    onClick={() => setIsAnalyticsOpen(true)}
    title="Nhấn để xem chi tiết thống kê theo tháng"
  >
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
      <span style={{ fontSize: '0.9rem', color: '#7B5233', fontWeight: 'bold' }}>
        Số vụ ghi nhận {kpiData.targetMonthStr ? `(${kpiData.targetMonthStr})` : ''}
      </span>
      {!kpiData.isViewingAll && kpiData.prevMonthStr ? (
        <span style={{ 
          fontSize: '0.72rem', 
          color: '#2D1A12',
          marginTop: '6px',
          fontStyle: 'italic'
        }}>
          Tháng {kpiData.prevMonthStr} :{' '}
          <span style={{ 
            fontWeight: '700', 
            color: kpiData.countDiff > 0 ? '#DC2626' : kpiData.countDiff < 0 ? '#059669' : '#6B7280'
          }}>
            {kpiData.countDiff > 0 ? '+' : kpiData.countDiff < 0 ? '-' : ''}{Math.abs(kpiData.countDiff)} vụ ({kpiData.prevCount > 0 ? Math.round((Math.abs(kpiData.countDiff) / kpiData.prevCount) * 100) : 0}%)
          </span>
        </span>
      ) : (
        <span style={{ fontSize: '0.72rem', color: '#888', marginTop: '6px', fontStyle: 'italic' }}>
          Tổng cộng tất cả các tháng
        </span>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2D1A12' }}>
        {kpiData.currentCount}
      </span>
    </div>
  </div>

  <div 
    className="summary-card" 
    style={{ 
      transition: 'transform 0.2s ease',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      cursor: 'pointer'
    }}
    onClick={() => {
      setIsReviewModalOpen(true);
      setReviewCurrentPage(1);
    }}
    title="Nhấn để xem chi tiết danh sách đang xem xét"
  >
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
      <span style={{ fontSize: '0.9rem', color: '#7B5233', fontWeight: 'bold' }}>
        Đang xem xét
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#D97706' }}>
        {claims.filter(c => c.status === 'Đang xem xét').length}
      </span>
    </div>
  </div>

  <div 
    className="summary-card" 
    style={{ 
      transition: 'transform 0.2s ease',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      cursor: 'pointer'
    }}
    onClick={() => setIsExceptionModalOpen(true)}
    title="Nhấn để xem chi tiết danh sách ngoại lệ"
  >
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
      <span style={{ fontSize: '0.9rem', color: '#7B5233', fontWeight: 'bold' }}>
        Số vụ ngoại lệ
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#DC2626' }}>
        {exceptionData.totalCount}
      </span>
    </div>
  </div>
</div>

  );
};

export default ClaimOverviewCards;
