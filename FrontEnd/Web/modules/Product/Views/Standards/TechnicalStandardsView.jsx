import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldCheck, Construction } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const TechnicalStandardsView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/technical-standards');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Tiêu chuẩn kỹ thuật');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'KT02: Quản lý tiêu chuẩn kỹ thuật & quy chuẩn gỗ');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'KT02');
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  return (
    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#faf6f1', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px 60px', borderRadius: '24px', border: '1.5px solid #cbd5e1', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', maxWidth: '500px' }}>
        <div style={{ backgroundColor: '#fff7ed', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ea580c' }}>
          <ShieldCheck size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#432818', marginBottom: '8px' }}>
          Tiêu chuẩn kỹ thuật
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
          Hệ thống đang được nâng cấp tính năng quản lý tiêu chuẩn kỹ thuật & quy chuẩn gỗ tự động.
        </p>
        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#b45309', backgroundColor: '#fef3c7', padding: '10px 20px', borderRadius: '12px', display: 'inline-block' }}>
          Xây dựng sau
        </div>
      </div>
    </div>
  );
};

export default TechnicalStandardsView;
