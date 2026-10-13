import React from 'react';
import {
  FileSignature,
  PenTool,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';

/**
 * Thẻ KPI thống kê số lượng chữ ký ISO theo phân loại & trạng thái
 * Thiết kế tối giản, đồng bộ với chuẩn nhận diện SmartFlow ERP
 */
export const SignatureStatsCards = ({ stats = {}, activeFilter = 'all', onSelectFilter }) => {
  const cards = [
    {
      key: 'all',
      type: 'all',
      label: 'Tổng số chữ ký',
      count: stats.total || 0,
      icon: FileSignature,
      iconClass: 'sig-stat-icon-total',
      tooltip: 'Toàn bộ hồ sơ chữ ký nhân sự trong hệ thống'
    },
    {
      key: 'type_handwritten',
      type: 'signature_category',
      filterValue: 'handwritten',
      label: 'Chữ ký tay',
      count: (stats.handwritten_image_count || 0) + (stats.handwritten_draw_count || 0),
      icon: PenTool,
      iconClass: 'sig-stat-icon-draw',
      tooltip: 'Nhân sự có mẫu chữ ký tay (ảnh scan hoặc vẽ trực tiếp)'
    },
    {
      key: 'type_DIGITAL',
      type: 'signature_category',
      filterValue: 'digital',
      label: 'Chữ ký điện tử / CA',
      count: stats.digital_count || 0,
      icon: ShieldCheck,
      iconClass: 'sig-stat-icon-digital',
      tooltip: 'Nhân sự có chứng thư số điện tử PKI / Token CA'
    },
    {
      key: 'status_active',
      type: 'is_active',
      filterValue: 'active',
      label: 'Đang hoạt động',
      count: stats.active_count || 0,
      icon: CheckCircle2,
      iconClass: 'sig-stat-icon-active',
      hasPulse: (stats.active_count || 0) > 0,
      tooltip: 'Chữ ký đang sẵn sàng áp dụng phê duyệt hồ sơ'
    },
    {
      key: 'status_inactive',
      type: 'is_active',
      filterValue: 'inactive',
      label: 'Tạm khóa',
      count: stats.inactive_count || 0,
      icon: Lock,
      iconClass: 'sig-stat-icon-inactive',
      tooltip: 'Chữ ký đang tạm ngưng hiệu lực sử dụng'
    }
  ];

  return (
    <div className="sig-stats-grid">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <div
            key={card.key}
            className={`sig-stat-card ${isActive ? 'active' : ''}`}
            onClick={() => onSelectFilter && onSelectFilter(card)}
            title={card.tooltip}
          >
            <div className={`sig-stat-icon-wrapper ${card.iconClass}`}>
              <IconComponent size={18} />
            </div>
            <div className="sig-stat-content">
              <div className="sig-stat-label">{card.label}</div>
              <div className="sig-stat-value-group">
                <span className="sig-stat-value">{card.count}</span>
                {card.hasPulse && (
                  <span className="sig-pulse-dot" title="Đang sẵn sàng sử dụng" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SignatureStatsCards;
