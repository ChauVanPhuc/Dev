import React from 'react';
import { useLocation } from 'react-router-dom';

const Improvements = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get('type');
  
  const isCapa = type === 'quality' || type === 'capa';
  const title = isCapa ? 'Quản lý CAPA' : 'Quản lý góp ý';
  const desc = isCapa 
    ? 'Trang hiển thị nội dung cho mục Quản lý CAPA (Corrective and Preventive Action).'
    : 'Trang hiển thị nội dung cho mục Quản lý góp ý.';

  return (
    <div className="card" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #D3C1B4' }}>
      <h3 style={{ color: '#7B5233', marginBottom: '15px' }}>{title}</h3>
      <p style={{ color: '#666' }}>{desc}</p>
    </div>
  );
};

export default Improvements;
