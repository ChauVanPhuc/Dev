import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB6_StageInspectionMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [selectedPO, setSelectedPO] = useState('PO-2026-091');
  const [inspectType, setInspectType] = useState('phukien'); // 'phukien', 'bamdinh', 'donggoi'
  const [photoCount, setPhotoCount] = useState(0);
  const [checklist, setChecklist] = useState({
    vitri: 'Đạt',
    dungluong: 'Đạt',
    phubemai: 'Lỗi',
    donggoikip: 'Đạt'
  });

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const pos = [
    { code: 'PO-2026-091', name: 'Đơn hàng Hòa Phát - Ghế OAK' },
    { code: 'PO-2026-092', name: 'Đơn hàng An Cường - Bàn Trà' },
    { code: 'PO-2026-093', name: 'Đơn hàng Xuất Khẩu Mỹ' }
  ];

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Kiểm tra công đoạn</span>
              <span className="real-title-sub">MB6 | Đánh giá QC theo PO</span>
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

        {/* POSelector */}
        <div style={{ padding: '8px 12px', background: '#F5EBE0', borderBottom: '1px solid #EADCC9' }}>
          <InteractiveBlock
            name="POSelector"
            type={getCompType('POSelector')}
            description={getCompDesc('POSelector')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div style={{ position: 'relative' }}>
              <select
                value={selectedPO}
                onChange={(e) => setSelectedPO(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 24px 8px 10px',
                  border: '1px solid #7B5233',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  color: '#7B5233',
                  fontWeight: 'bold',
                  background: '#FFF',
                  WebkitAppearance: 'none'
                }}
              >
                {pos.map(po => (
                  <option key={po.code} value={po.code}>{po.code} - {po.name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7B5233', pointerEvents: 'none', fontSize: '0.6rem' }}>▼</span>
            </div>
          </InteractiveBlock>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Sub tabs for selection inside mockup */}
        <div style={{ display: 'flex', background: '#EADCC9', padding: 2, borderRadius: 6 }}>
          <button onClick={() => setInspectType('phukien')} style={{ flex: 1, padding: 6, border: 'none', background: inspectType === 'phukien' ? '#FFF' : 'transparent', color: '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>Kiểm phụ kiện</button>
          <button onClick={() => setInspectType('bamdinh')} style={{ flex: 1, padding: 6, border: 'none', background: inspectType === 'bamdinh' ? '#FFF' : 'transparent', color: '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>Kiểm bám dính</button>
          <button onClick={() => setInspectType('donggoi')} style={{ flex: 1, padding: 6, border: 'none', background: inspectType === 'donggoi' ? '#FFF' : 'transparent', color: '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>Đóng gói</button>
        </div>

        {/* StageInspectionForm */}
        <InteractiveBlock
          name="StageInspectionForm"
          type={getCompType('StageInspectionForm')}
          description={getCompDesc('StageInspectionForm')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>
              CHECKLIST CÔNG ĐOẠN ĐANG KIỂM
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.keys(checklist).map(key => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5EBE0', paddingBottom: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: '#2D1A12', fontWeight: 600 }}>
                    {key === 'vitri' ? 'Vị trí mộng lắp ghép' :
                     key === 'dungluong' ? 'Định lượng keo dán bám dính' :
                     key === 'phubemai' ? 'Bề mặt phủ sơn đều bóng' : 'Chất lượng đóng gói pallet kiện'}
                  </span>
                  <button
                    onClick={() => setChecklist(prev => ({ ...prev, [key]: prev[key] === 'Đạt' ? 'Lỗi' : 'Đạt' }))}
                    style={{
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      background: checklist[key] === 'Đạt' ? '#E8F5E9' : '#FFEBEE',
                      color: checklist[key] === 'Đạt' ? '#2E7D32' : '#C62828',
                      cursor: 'pointer'
                    }}
                  >
                    {checklist[key]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </InteractiveBlock>

        {/* PhotoUploader */}
        <InteractiveBlock
          name="PhotoUploader"
          type={getCompType('PhotoUploader')}
          description={getCompDesc('PhotoUploader')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            setPhotoCount(c => c + 1);
          }}
        >
          <div style={{
            background: '#F5EBE0',
            border: '1px solid #7B5233',
            borderRadius: 8,
            padding: '12px 10px',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: 2 }}>📸</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233' }}>
              {photoCount > 0 ? `ĐÃ CHỤP ${photoCount} ẢNH MINH CHỨNG LỖI` : 'BẤM CHỤP ẢNH MINH CHỨNG (NATIVE CAMERA)'}
            </span>
          </div>
        </InteractiveBlock>

        {/* StageInspectionService */}
        <InteractiveBlock
          name="StageInspectionService"
          type={getCompType('StageInspectionService')}
          description={getCompDesc('StageInspectionService')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            alert('Lưu báo cáo kiểm tra công đoạn thành công!');
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
            💾 LƯU PHIẾU KIỂM TRA CÔNG ĐOẠN
          </button>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB6_StageInspectionMock;
