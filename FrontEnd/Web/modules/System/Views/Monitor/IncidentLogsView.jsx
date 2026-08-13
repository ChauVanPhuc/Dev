import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const IncidentLogs = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/logs');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  return (
    <div className="card" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #D3C1B4' }}>
      <h3 style={{ color: '#7B5233', marginBottom: '15px' }}>{title || 'Nhật ký sự cố'}</h3>
      <p style={{ color: '#666' }}>{subtitle || 'Ghi nhận sự cố và lịch sử thao tác người dùng trên hệ thống.'}</p>
    </div>
  );
};

export default IncidentLogs;
