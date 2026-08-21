import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Filter, Layers, Clock } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const ProductionScheduleView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-schedule');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [activeFactory, setActiveFactory] = useState('Factory1');

  const workshops = [
    { name: 'Tổ Tạo phôi & Cắt ván', code: 'T01', progress: 85, activeOrders: 6 },
    { name: 'Tổ Định hình & Chạy máy CNC', code: 'T02', progress: 65, activeOrders: 8 },
    { name: 'Tổ Lắp ráp bọc lót', code: 'T03', progress: 40, activeOrders: 5 },
    { name: 'Tổ Sơn & Sấy PU', code: 'T04', progress: 90, activeOrders: 4 },
    { name: 'Tổ Đóng gói & Lưu kho', code: 'T05', progress: 75, activeOrders: 7 },
  ];

  return (
    <div className="gold-layout">
      {/* Factory selector tabs */}
      <div className="sticky-top-zone">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Factory1', 'Factory2'].map((fac, idx) => (
              <button
                key={fac}
                onClick={() => setActiveFactory(fac)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: activeFactory === fac ? '#5D3B32' : '#FFFFFF',
                  color: activeFactory === fac ? '#FFFFFF' : '#5D3B32',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s'
                }}
              >
                {fac === 'Factory1' ? 'Nhà máy 1 (Gỗ tự nhiên)' : 'Nhà máy 2 (Gỗ công nghiệp)'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF', padding: '6px 14px', borderRadius: '10px', border: '1.5px solid #EADCC9' }}>
            <Clock size={16} color="#7B5233" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2D1A12' }}>Tháng 08 / 2026</span>
          </div>
        </div>
      </div>

      {/* Timeline Schedule Table */}
      <div style={{ background: '#FFF', borderRadius: '14px', border: '1.5px solid #EADCC9', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>
          Tiến độ & Phân bổ lịch làm việc theo Tổ sản xuất
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {workshops.map((ws, idx) => (
            <div key={idx} style={{ background: '#FAF6F0', borderRadius: '12px', padding: '16px', border: '1px solid #EADCC9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <span style={{ background: '#5D3B32', color: '#FFF', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', marginRight: '8px' }}>
                    {ws.code}
                  </span>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.95rem' }}>{ws.name}</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5D3B32' }}>{ws.activeOrders} Lệnh đang chạy ({ws.progress}%)</span>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#E5E7EB', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(90deg, #5D3B32, #A0301B)', width: `${ws.progress}%`, height: '100%', borderRadius: '5px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductionScheduleView;
