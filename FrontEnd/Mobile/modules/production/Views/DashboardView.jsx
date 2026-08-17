import React from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import { CalendarCheck, ClipboardCheck, MessageSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@modules/auth/Models/authModel';

const DashboardView = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const menuCards = [
    { label: 'Kế hoạch sản xuất', icon: CalendarCheck, path: '/plan', color: '#8b5e34', desc: 'Theo dõi tiến độ' },
    { label: 'Phiếu kiểm tra', icon: ClipboardCheck, path: '/inspection-stage', color: '#4b301e', desc: 'Kiểm tra đầu vào, công đoạn' },
    { label: 'Báo cáo CAPA', icon: AlertTriangle, path: '/capa-list', color: '#f59e0b', desc: 'Theo dõi sự cố chất lượng' },
    { label: 'Góp ý', icon: MessageSquare, path: '/feedback', color: '#10b981', desc: 'Góp ý cải tiến chất lượng' },
  ];

  return (
    <Layout>
      <div style={{ backgroundColor: 'var(--bg-cream)', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB18 | Trang chủ" />

        {/* Welcome Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e8e1d5', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#4b301e', marginBottom: '8px' }}>Xin chào, {user?.full_name || 'Người kiểm tra'}!</h2>
          <span style={{ fontSize: '13px', color: '#7c6d5e', fontWeight: '500' }}>Chào mừng bạn đến với hệ thống điều hành sản xuất di động G7 Smart Flow.</span>
        </div>

        {/* Quick Links Grid */}
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#4b301e', marginTop: '8px', marginBottom: '4px' }}>Chức năng nhanh</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {menuCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => navigate(card.path)}
              style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: `${card.color}15`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#4b301e', marginBottom: '2px' }}>{card.label}</h4>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{card.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardView;
