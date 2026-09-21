import React from 'react';
import { MessageSquare, Bell, User } from 'lucide-react';

export const FeedbackHeader = () => {
  return (
    <header className="feedback-header">
      <div className="feedback-header-left">
        <div className="feedback-header-logo-badge">
          SMARTFLOW
        </div>
        <div>
          <div className="feedback-header-title">Hệ Thống Phản Hồi & Sự Cố (Feedback Portal)</div>
          <div className="feedback-header-subtitle">Phân hệ độc lập cổng 3001 • Liên thông dữ liệu Mobile /quick-report-create</div>
        </div>
      </div>

      <div className="feedback-header-right">
        {/* User Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#F8F5F2',
          padding: '6px 12px',
          borderRadius: 20,
          border: '1px solid #E2D7CF'
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#7B5233',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.78rem',
            fontWeight: 700
          }}>
            QC
          </div>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#3B2A22' }}>
            Quản Lý Chất Lượng
          </span>
        </div>
      </div>
    </header>
  );
};
