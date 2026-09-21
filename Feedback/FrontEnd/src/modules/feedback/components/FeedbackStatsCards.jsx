import React from 'react';
import { Clock, CheckCircle2, AlertCircle, XCircle, Layers } from 'lucide-react';

export const FeedbackStatsCards = ({ stats, currentFilterStatus, onSelectStatus }) => {
  const cards = [
    {
      key: 'all',
      label: 'Tổng số báo cáo',
      value: stats.total || 0,
      icon: Layers,
      color: '#7B5233',
      bgColor: '#F4EBE6',
      statusValue: 'all'
    },
    {
      key: 'pending',
      label: 'Chờ xử lý',
      value: stats.pending || 0,
      icon: Clock,
      color: '#D97706',
      bgColor: '#FFFBEB',
      statusValue: 'Chờ xử lý'
    },
    {
      key: 'processing',
      label: 'Đã tiếp nhận',
      value: stats.processing || 0,
      icon: AlertCircle,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      statusValue: 'Đã tiếp nhận'
    },
    {
      key: 'resolved',
      label: 'Đã hoàn thành',
      value: stats.resolved || 0,
      icon: CheckCircle2,
      color: '#059669',
      bgColor: '#ECFDF5',
      statusValue: 'Đã xong'
    },
    {
      key: 'rejected',
      label: 'Từ chối / Hủy',
      value: stats.rejected || 0,
      icon: XCircle,
      color: '#DC2626',
      bgColor: '#FEF2F2',
      statusValue: 'Từ chối'
    }
  ];

  return (
    <div className="stats-cards-grid">
      {cards.map(card => {
        const Icon = card.icon;
        const isActive = (currentFilterStatus === card.statusValue) || (currentFilterStatus === 'all' && card.key === 'all');

        return (
          <div
            key={card.key}
            className={`stat-card ${isActive ? 'active' : ''}`}
            onClick={() => onSelectStatus(card.statusValue)}
          >
            <div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-value" style={{ color: card.color }}>
                {card.value}
              </div>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: card.bgColor, color: card.color }}>
              <Icon size={24} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
