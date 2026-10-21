import React from 'react';
import { Clock, CheckCircle2, AlertOctagon, Files } from 'lucide-react';

/**
 * Thẻ KPI thống kê số lượng hồ sơ theo các trạng thái
 */
export const ApprovalStatsCards = ({ stats = {}, activeStatus = 'pending', onSelectStatus }) => {
  const cards = [
    {
      key: 'all',
      label: 'Tổng hồ sơ phê duyệt',
      count: stats.total || 0,
      icon: Files,
      iconClass: 'iso-stat-icon-total',
      hasPulse: false,
      tooltip: 'Toàn bộ hồ sơ tài liệu mẫu và quy trình ISO trong hệ thống'
    },
    {
      key: 'pending',
      label: 'Chờ phê duyệt',
      count: stats.pending || 0,
      icon: Clock,
      iconClass: 'iso-stat-icon-pending',
      hasPulse: (stats.pending || 0) > 0,
      tooltip: 'Hồ sơ đang chờ cấp thẩm quyền xem xét & phê duyệt'
    },
    {
      key: 'approved',
      label: 'Đã phê duyệt',
      count: stats.approved || 0,
      icon: CheckCircle2,
      iconClass: 'iso-stat-icon-approved',
      hasPulse: false,
      tooltip: 'Hồ sơ đã được phê duyệt và đang có hiệu lực thi hành'
    }
  ];

  return (
    <div className="iso-stats-grid">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isActive = activeStatus === card.key;

        return (
          <div
            key={card.key}
            className={`iso-stat-card ${isActive ? 'active' : ''}`}
            onClick={() => onSelectStatus && onSelectStatus(card.key)}
            title={card.tooltip}
          >
            <div className={`iso-stat-icon-wrapper ${card.iconClass}`}>
              <IconComponent size={20} />
            </div>
            <div className="iso-stat-content">
              <div className="iso-stat-label">{card.label}</div>
              <div className="iso-stat-value-group">
                <span className="iso-stat-value">{card.count}</span>
                {card.hasPulse && <span className="iso-pulse-dot" title="Có hồ sơ đang chờ xử lý" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApprovalStatsCards;
