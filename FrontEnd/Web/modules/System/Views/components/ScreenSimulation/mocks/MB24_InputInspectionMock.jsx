import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB24_InputInspectionMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [scanned, setScanned] = useState(false);
  const [lengthInput, setLengthInput] = useState('2400');
  const [widthInput, setWidthInput] = useState('120');
  const [thicknessInput, setThicknessInput] = useState('20');
  const [moisture, setMoisture] = useState('12.5'); // standard is < 15%
  
  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  // Compare inputs with master specs
  const lengthDiff = Math.abs(parseFloat(lengthInput) - 2400);
  const widthDiff = Math.abs(parseFloat(widthInput) - 120);
  const thicknessDiff = Math.abs(parseFloat(thicknessInput) - 20);
  
  const isLengthOk = lengthDiff <= 5; // tolerance +/- 5mm
  const isWidthOk = widthDiff <= 2;   // tolerance +/- 2mm
  const isThicknessOk = thicknessDiff <= 1; // tolerance +/- 1mm
  const isMoistureOk = parseFloat(moisture) <= 15;

  const isAllOk = isLengthOk && isWidthOk && isThicknessOk && isMoistureOk;

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Kiểm tra đầu vào</span>
              <span className="real-title-sub">MB2.4 | Đánh giá chất lượng gỗ</span>
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
        {/* QRScannerNative */}
        <InteractiveBlock
          name="QRScannerNative"
          type={getCompType('QRScannerNative')}
          description={getCompDesc('QRScannerNative')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            setScanned(true);
          }}
        >
          <div style={{
            background: scanned ? '#E8F5E9' : '#F5EBE0',
            border: '2px dashed #7B5233',
            borderRadius: 8,
            padding: '16px 10px',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: 2 }}>📷</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>
              {scanned ? '✓ ĐÃ NHẬN DIỆN CHI TIẾT: SP-OAK-01' : '[QUÉT MÃ QR KHỚP SPEC SẢN PHẨM]'}
            </span>
          </div>
        </InteractiveBlock>

        {scanned && (
          <>
            {/* PartInfoBanner */}
            <InteractiveBlock
              name="PartInfoBanner"
              type={getCompType('PartInfoBanner')}
              description={getCompDesc('PartInfoBanner')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div style={{
                background: 'linear-gradient(135deg, #7B5233 0%, #4A2E20 100%)',
                color: '#FFF',
                padding: 10,
                borderRadius: 8,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: '#EADCC9', fontWeight: 'bold' }}>MÃ LINH KIỆN</span>
                  <span style={{ fontSize: '0.65rem', color: '#EADCC9', fontWeight: 'bold' }}>TIÊU CHUẨN KỸ THUẬT</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>SP-OAK-01 (Gỗ Sồi)</span>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 4 }}>
                    20 x 120 x 2400 mm
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#EADCC9', marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4 }}>
                  Dung sai cho phép: Dày ±1mm | Rộng ±2mm | Dài ±5mm | Độ ẩm ≤ 15%
                </div>
              </div>
            </InteractiveBlock>

            {/* DimensionInput */}
            <InteractiveBlock
              name="DimensionInput"
              type={getCompType('DimensionInput')}
              description={getCompDesc('DimensionInput')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>KẾT QUẢ ĐO ĐẠC THỰC TẾ</span>
                
                {/* Length */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.7rem', color: '#2D1A12', fontWeight: 600 }}>Chiều Dài (mm)</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isLengthOk ? '#2E7D32' : '#C62828' }}>
                      {isLengthOk ? '✓ Đạt' : '✗ Quá dung sai'}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={lengthInput}
                    onChange={(e) => setLengthInput(e.target.value)}
                    style={{ width: '100%', padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.8rem', color: '#7B5233', fontWeight: 'bold' }}
                  />
                </div>

                {/* Width */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.7rem', color: '#2D1A12', fontWeight: 600 }}>Chiều Rộng (mm)</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isWidthOk ? '#2E7D32' : '#C62828' }}>
                      {isWidthOk ? '✓ Đạt' : '✗ Quá dung sai'}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    style={{ width: '100%', padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.8rem', color: '#7B5233', fontWeight: 'bold' }}
                  />
                </div>

                {/* Thickness */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.7rem', color: '#2D1A12', fontWeight: 600 }}>Độ Dày (mm)</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isThicknessOk ? '#2E7D32' : '#C62828' }}>
                      {isThicknessOk ? '✓ Đạt' : '✗ Quá dung sai'}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={thicknessInput}
                    onChange={(e) => setThicknessInput(e.target.value)}
                    style={{ width: '100%', padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.8rem', color: '#7B5233', fontWeight: 'bold' }}
                  />
                </div>

                {/* Moisture */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.7rem', color: '#2D1A12', fontWeight: 600 }}>Độ Ẩm (%)</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isMoistureOk ? '#2E7D32' : '#C62828' }}>
                      {isMoistureOk ? '✓ Đạt' : '✗ Quá ẩm'}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={moisture}
                    onChange={(e) => setMoisture(e.target.value)}
                    style={{ width: '100%', padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.8rem', color: '#7B5233', fontWeight: 'bold' }}
                  />
                </div>
              </div>
            </InteractiveBlock>

            {/* SaveInspectionButton */}
            <InteractiveBlock
              name="SaveInspectionButton"
              type={getCompType('SaveInspectionButton')}
              description={getCompDesc('SaveInspectionButton')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={(name) => {
                onClick(name);
                if (isAllOk) {
                  alert('Lưu kết quả kiểm tra thành công! Sản phẩm ĐẠT chuẩn.');
                } else {
                  alert('Lưu kết quả QC thành công! Cảnh báo: Lô hàng KHÔNG ĐẠT tiêu chuẩn.');
                }
              }}
            >
              <button style={{
                width: '100%',
                padding: '10px',
                background: isAllOk ? '#2E7D32' : '#C62828',
                color: '#FFF',
                border: 'none',
                borderRadius: 6,
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                transition: 'background 0.3s'
              }}>
                {isAllOk ? '✓ HOÀN THÀNH - LƯU KẾT QUẢ ĐẠT' : '✗ LƯU KẾT QUẢ KHÔNG ĐẠT'}
              </button>
            </InteractiveBlock>
          </>
        )}
      </div>
    </div>
  );
};

export default MB24_InputInspectionMock;
