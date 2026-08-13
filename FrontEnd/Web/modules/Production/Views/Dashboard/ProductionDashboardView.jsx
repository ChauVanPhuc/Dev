import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Layers, AlertCircle, LayoutGrid, ListFilter, ClipboardList, Calendar, ListOrdered, GitMerge, Truck, AlertTriangle, QrCode, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const ProductionDashboardView = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-dashboard');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const quickNavs = [
    { title: 'Lệnh sản xuất', code: 'SX01', path: '/admin/production-orders', icon: ClipboardList, color: '#7B5233', desc: 'Quản lý danh sách lệnh SX' },
    { title: 'Lịch sản xuất', code: 'SX02', path: '/admin/production-schedule', icon: Calendar, color: '#2563EB', desc: 'Tiến độ & lịch xưởng nhà máy' },
    { title: 'Kế hoạch sản xuất', code: 'SX03', path: '/admin/plan', icon: ListOrdered, color: '#059669', desc: 'Lập kế hoạch & phân bổ' },
    { title: 'Quy trình sản xuất', code: 'SX04', path: '/admin/production-routing', icon: GitMerge, color: '#D97706', desc: 'Sơ đồ luồng & công đoạn' },
    { title: 'Kế hoạch bàn giao', code: 'SX05', path: '/admin/delivery-tracking', icon: Truck, color: '#7C3AED', desc: 'Bàn giao sản phẩm công đoạn' },
    { title: 'Phiếu ngoại lệ', code: 'SX06', path: '/admin/exception-deliveries', icon: AlertTriangle, color: '#DC2626', desc: 'Sự cố bàn giao pallet' },
    { title: 'Quản lý mã QR', code: 'SX07', path: '/admin/backup-qrs', icon: QrCode, color: '#4B5563', desc: 'Quản lý in & quét mã QR' },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#FAF6F0', minHeight: 'calc(100vh - 110px)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #2D1A12 0%, #5D3B32 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        color: '#FFFFFF',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(45, 26, 18, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#EADCC9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Phân hệ Quản lý sản xuất
          </span>
          <h1 style={{ margin: '12px 0 6px 0', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
            Trang chủ & Tổng quan sản xuất (SX00)
          </h1>
          <p style={{ margin: 0, color: '#EADCC9', fontSize: '0.92rem', opacity: 0.9 }}>
            Điều hành toàn bộ tiến độ lệnh sản xuất, quy trình công đoạn, lịch xưởng và kế hoạch bàn giao.
          </p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '16px 24px', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ fontSize: '0.8rem', color: '#EADCC9', textTransform: 'uppercase', fontWeight: '600' }}>Tổng lệnh sản xuất</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#FFF', marginTop: '4px' }}>128</div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Đang sản xuất', val: '42 Lệnh', sub: '8 Xưởng đang chạy', color: '#2563EB', icon: Clock, bg: '#EFF6FF' },
          { label: 'Hoàn thành hôm nay', val: '18 Lệnh', sub: '+12% so với hôm qua', color: '#059669', icon: CheckCircle2, bg: '#ECFDF5' },
          { label: 'Cần bàn giao', val: '15 Thẻ', sub: 'Công đoạn Sơn -> Đóng gói', color: '#D97706', icon: Truck, bg: '#FFFBEB' },
          { label: 'Cảnh báo sự cố', val: '3 Phiếu', sub: 'Cần xử lý ngoại lệ', color: '#DC2626', icon: AlertTriangle, bg: '#FEF2F2' },
        ].map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div key={idx} style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '18px 20px',
              border: '1px solid #EADCC9',
              boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280', fontWeight: '600' }}>{item.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2D1A12', margin: '4px 0 2px 0' }}>{item.val}</div>
                <div style={{ fontSize: '0.78rem', color: item.color, fontWeight: '600' }}>{item.sub}</div>
              </div>
              <div style={{ background: item.bg, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                <IconComp size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Cards */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginBottom: '16px' }}>
        Danh mục màn hình Phân hệ Quản lý sản xuất
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {quickNavs.map((nav, index) => {
          const IconComponent = nav.icon;
          return (
            <div
              key={index}
              onClick={() => navigate(nav.path)}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '20px',
                border: '1.5px solid #EADCC9',
                boxShadow: '0 4px 12px rgba(45, 26, 18, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = nav.color;
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(45, 26, 18, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#EADCC9';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(45, 26, 18, 0.04)';
              }}
            >
              <div style={{
                background: `${nav.color}15`,
                color: nav.color,
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <IconComponent size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: nav.color, background: `${nav.color}15`, padding: '2px 8px', borderRadius: '6px' }}>
                    {nav.code}
                  </span>
                  <ArrowRight size={16} color="#9CA3AF" />
                </div>
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '1rem', fontWeight: '800', color: '#2D1A12' }}>
                  {nav.title}
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280', lineHeight: '1.4' }}>
                  {nav.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductionDashboardView;
