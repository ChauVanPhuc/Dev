import React from 'react';

export const FeedbackStatsCards = ({ stats, currentFilterStatus, onSelectStatus }) => {
  const cards = [
    {
      key: 'all',
      label: 'Tổng số báo cáo',
      value: stats.total || 0,
      color: '#7B5233',
      statusValue: 'all'
    },
    {
      key: 'pending',
      label: 'Chờ xử lý',
      value: stats.pending || 0,
      color: '#D97706',
      statusValue: 'Chờ xử lý'
    },
    {
      key: 'processing',
      label: 'Đã tiếp nhận',
      value: stats.processing || 0,
      color: '#2563EB',
      statusValue: 'Đã tiếp nhận'
    },
    {
      key: 'resolved',
      label: 'Đã hoàn thành',
      value: stats.resolved || 0,
      color: '#059669',
      statusValue: 'Đã xong'
    },
    {
      key: 'rejected',
      label: 'Từ chối / Hủy',
      value: stats.rejected || 0,
      color: '#DC2626',
      statusValue: 'Từ chối'
    }
  ];

  return (
    <div className="stats-cards-grid">
      {cards.map(card => {
        const isActive = (currentFilterStatus === card.statusValue) || (currentFilterStatus === 'all' && card.key === 'all');

        return (
          <div
            key={card.key}
            className={`stat-card ${isActive ? 'active' : ''}`}
            onClick={() => onSelectStatus(card.statusValue)}
          >
            <div className="stat-label">{card.label}</div>
            <div className="stat-value" style={{ color: card.color }}>
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FeedbackStatsCards;
