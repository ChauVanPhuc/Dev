import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const MaintenanceView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/maintenance');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  return (
    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#faf6f1', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px 60px', borderRadius: '24px', border: '1.5px solid #cbd5e1', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', maxWidth: '500px' }}>
        <div style={{ backgroundColor: '#eff6ff', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#2563eb' }}>
          <Wrench size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#432818', marginBottom: '8px' }}>
          {title || 'Bảo trì - Cơ sở hạ tầng'}
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
          {subtitle || 'Quản lý lịch bảo trì thiết bị hạ tầng & máy móc xưởng sản xuất.'}
        </p>
        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '10px 20px', borderRadius: '12px', display: 'inline-block' }}>
          Xây dựng sau
        </div>
      </div>
    </div>
  );
};

export default MaintenanceView;
