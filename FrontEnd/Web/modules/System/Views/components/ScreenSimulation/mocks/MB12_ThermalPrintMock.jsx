import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB12_ThermalPrintMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [printStatus, setPrintStatus] = useState('Chờ lệnh in...');

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Cấu hình in nhiệt</span>
              <span className="real-title-sub">MB12 | In nhãn dán Pallet</span>
            </div>
          </div>
          
          <div className="real-header-right">
            <InteractiveBlock
              name="UserGuideButton"
              type={getCompType('UserGuideButton')}
              description={getCompDesc('UserGuideButton')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <span className="header-icon">❓</span>
            </InteractiveBlock>

            <InteractiveBlock
              name="NotificationBell"
              type={getCompType('NotificationBell')}
              description={getCompDesc('NotificationBell')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <span className="header-icon">🔔</span>
            </InteractiveBlock>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* ThermalPrintLayout */}
        <InteractiveBlock
          name="ThermalPrintLayout"
          type={getCompType('ThermalPrintLayout')}
          description={getCompDesc('ThermalPrintLayout')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{
            background: '#FFF',
            padding: 12,
            border: '2px solid #2D1A12',
            borderRadius: 4,
            fontFamily: 'monospace',
            color: '#000',
            width: 180,
            margin: '0 auto',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', borderBottom: '1px dashed #000', paddingBottom: 4, marginBottom: 6 }}>
              G7 SMARTFLOW LABELS
            </div>
            
            <div style={{ fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
              <span><b>Mã phiếu:</b> DEL-2026-081</span>
              <span><b>Linh kiện:</b> Mặt bàn trà G7</span>
              <span><b>Tổ nhận:</b> Chà nhám 3</span>
              <span><b>Số lượng:</b> 48 cái</span>
              <span><b>Ngày in:</b> 01/06/2026</span>
            </div>

            {/* QRCanvasRenderer */}
            <InteractiveBlock
              name="QRCanvasRenderer"
              type={getCompType('QRCanvasRenderer')}
              description={getCompDesc('QRCanvasRenderer')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: 6, background: '#F5EBE0', borderRadius: 4 }}>
                {/* Simulated QR Code Canvas */}
                <div style={{ width: 80, height: 80, border: '1px solid #7B5233', display: 'flex', flexWrap: 'wrap' }}>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: '20px',
                        height: '20px',
                        background: (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 3 || i === 12 || i === 15 ? '#000' : '#FFF'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </InteractiveBlock>

            <div style={{ textAlign: 'center', fontSize: '0.55rem', marginTop: 4, borderTop: '1px dashed #000', paddingTop: 4 }}>
              * Quét bằng Camera để xem *
            </div>
          </div>
        </InteractiveBlock>

        {/* AndroidPrintBridge */}
        <InteractiveBlock
          name="AndroidPrintBridge"
          type={getCompType('AndroidPrintBridge')}
          description={getCompDesc('AndroidPrintBridge')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            setPrintStatus('Đang gửi lệnh in bluetooth...');
            setTimeout(() => {
              setPrintStatus('✓ Đã in thành công.');
            }, 1500);
          }}
        >
          <button style={{
            width: '100%',
            padding: '10px',
            background: '#7B5233',
            color: '#FFF',
            border: 'none',
            borderRadius: 6,
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}>
            🖨️ RA LỆNH IN TIÊU CHUẨN (ANDROID BRIDGE)
          </button>
        </InteractiveBlock>

        <div style={{
          textAlign: 'center',
          fontSize: '0.72rem',
          color: printStatus.startsWith('✓') ? '#2E7D32' : '#EF6C00',
          fontWeight: 'bold'
        }}>
          {printStatus}
        </div>
      </div>
    </div>
  );
};

export default MB12_ThermalPrintMock;
