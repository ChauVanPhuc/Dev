import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const Hotspots = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/hotspots');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  return (
    <div className="card" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #D3C1B4' }}>
      <h3 style={{ color: '#7B5233', marginBottom: '15px' }}>{title || 'Bản đồ nhiệt lỗi Hotspots'}</h3>
      <p style={{ color: '#666' }}>{subtitle || 'Phân tích điểm nóng phát sinh lỗi trên chuyền sản xuất.'}</p>
    </div>
  );
};

export default Hotspots;
