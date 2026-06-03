import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB11_QualityDetailMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [photoCompressed, setPhotoCompressed] = useState(false);
  const [synced, setSynced] = useState(false);

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
              <span className="real-title-main">Chi tiết kiểm tra chất lượng</span>
              <span className="real-title-sub">MB11 | Tiêu chuẩn đo đạc gỗ</span>
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
        {/* InstructionManual */}
        <InteractiveBlock
          name="InstructionManual"
          type={getCompType('InstructionManual')}
          description={getCompDesc('InstructionManual')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: 6 }}>
              📘 HƯỚNG DẪN KỸ THUẬT ĐO QC CHI TIẾT
            </span>
            <div style={{ fontSize: '0.68rem', color: '#2D1A12', lineHeight: '1.4' }}>
              1. <b>Chuẩn bị:</b> Sử dụng thước cặp cơ học hoặc thước cặp điện tử Mitutoyo.<br/>
              2. <b>Đo chiều dày:</b> Đo tại 3 điểm khác nhau cách mép tối thiểu 50mm.<br/>
              3. <b>Độ ẩm gỗ:</b> Sử dụng máy đo độ ẩm điện cực cắm ngập 5mm vào bề mặt ván gỗ. Lấy kết quả trung bình của 2 lần đo.<br/>
              4. <b>Chất lượng sơn phủ:</b> Kiểm tra bề mặt dưới ánh sáng 500 Lux, phát hiện bọt khí hoặc loang màu.
            </div>
          </div>
        </InteractiveBlock>

        {/* CompressImageCanvas */}
        <InteractiveBlock
          name="CompressImageCanvas"
          type={getCompType('CompressImageCanvas')}
          description={getCompDesc('CompressImageCanvas')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            setPhotoCompressed(true);
            alert('Đã nén ảnh chất lượng cao thành công (JPEG 70% - 1024x1024px)!');
          }}
        >
          <div style={{
            background: photoCompressed ? '#E8F5E9' : '#F5EBE0',
            border: '1px solid #7B5233',
            borderRadius: 8,
            padding: 10,
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: 2 }}>🖼️</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233' }}>
              {photoCompressed ? '✓ ẢNH ĐÃ NÉN QUA CANVAS (180KB)' : 'BẤM CHỌN ẢNH VÀ NÉN CANVAS TỰ ĐỘNG'}
            </span>
          </div>
        </InteractiveBlock>

        {/* OfflinePendingQCStore */}
        <InteractiveBlock
          name="OfflinePendingQCStore"
          type={getCompType('OfflinePendingQCStore')}
          description={getCompDesc('OfflinePendingQCStore')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            setSynced(true);
            alert('Đã đồng bộ dữ liệu ngoại tuyến lên máy chủ!');
          }}
        >
          <div style={{
            background: synced ? '#E8F5E9' : '#FFF3E0',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #EADCC9',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>ĐỒNG BỘ NGOẠI TUYẾN</span>
              <span style={{ fontSize: '0.62rem', color: synced ? '#2E7D32' : '#EF6C00', fontWeight: 'bold' }}>
                {synced ? 'Đã đồng bộ' : 'Chờ đồng bộ'}
              </span>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#2D1A12' }}>
              Lưu trữ tạm thời tại local database (RAM / localStorage) khi thiết bị mất kết nối mạng.
            </span>
            {!synced && (
              <button style={{
                marginTop: 6,
                padding: '4px 8px',
                background: '#EF6C00',
                color: '#FFF',
                border: 'none',
                borderRadius: 4,
                fontSize: '0.65rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                🔄 ĐỒNG BỘ NGAY BÂY GIỜ
              </button>
            )}
          </div>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB11_QualityDetailMock;
