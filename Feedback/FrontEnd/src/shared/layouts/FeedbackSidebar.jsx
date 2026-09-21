import React from 'react';
import { NavLink } from 'react-router-dom';
import { Inbox, AlertTriangle, FileText, CheckCircle2, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';

export const FeedbackSidebar = () => {
  return (
    <aside className="feedback-sidebar">
      <div className="feedback-sidebar-header">
        <ShieldCheck size={24} color="#D3C1B4" />
        <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.5px' }}>
          QC FEEDBACK
        </span>
      </div>

      <div className="feedback-sidebar-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `feedback-nav-item ${isActive ? 'active' : ''}`}
          end
        >
          <Inbox size={18} />
          <span>Tất cả báo cáo</span>
        </NavLink>

        <NavLink
          to="/issues"
          className={({ isActive }) => `feedback-nav-item ${isActive ? 'active' : ''}`}
        >
          <AlertTriangle size={18} />
          <span>Báo cáo vấn đề</span>
        </NavLink>

        <NavLink
          to="/meetings"
          className={({ isActive }) => `feedback-nav-item ${isActive ? 'active' : ''}`}
        >
          <FileText size={18} />
          <span>Biên bản cuộc họp</span>
        </NavLink>

        {/* Separator */}
        <div style={{
          height: 1,
          background: 'rgba(255, 255, 255, 0.08)',
          margin: '16px 6px'
        }} />

        <div style={{ padding: '0 8px', fontSize: '0.72rem', color: '#8C7B73', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
          Hệ Thống Liên Kết
        </div>

        <a
          href="http://localhost:5173/admin/quality"
          target="_blank"
          rel="noreferrer"
          className="feedback-nav-item"
        >
          <ExternalLink size={16} />
          <span>Web Quản lý CL (5173)</span>
        </a>

        <a
          href="http://localhost:3000/quick-report-create"
          target="_blank"
          rel="noreferrer"
          className="feedback-nav-item"
        >
          <ExternalLink size={16} />
          <span>Mobile Báo cáo (3000)</span>
        </a>
      </div>
    </aside>
  );
};
