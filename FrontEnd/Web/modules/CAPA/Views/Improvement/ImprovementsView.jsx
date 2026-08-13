import React, { useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const Improvements = () => {
  const location = useLocation();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get('type');
  
  const isCapa = type === 'quality' || type === 'capa';
  const routePath = isCapa ? '/admin/capa' : '/admin/feedback';
  const { screenCode, title, subtitle } = useScreenMetadataCached(routePath);

  const fallbackTitle = isCapa ? 'Quản lý CAPA' : 'Theo dõi góp ý';
  const desc = isCapa 
    ? 'Trang hiển thị nội dung cho mục Quản lý CAPA (Corrective and Preventive Action).'
    : 'Trang hiển thị nội dung cho mục Theo dõi góp ý.';

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || fallbackTitle);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [title, subtitle, screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  return (
    <div className="card" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #D3C1B4' }}>
      <h3 style={{ color: '#7B5233', marginBottom: '15px' }}>{title || fallbackTitle}</h3>
      <p style={{ color: '#666' }}>{desc}</p>
    </div>
  );
};

export default Improvements;
