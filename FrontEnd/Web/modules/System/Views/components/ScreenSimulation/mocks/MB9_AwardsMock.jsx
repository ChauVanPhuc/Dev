import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB9_AwardsMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [awardType, setAwardType] = useState('award'); // 'award' or 'discipline'
  const [staffName, setStaffName] = useState('');
  const [points, setPoints] = useState(5);
  const [reason, setReason] = useState('');
  const [evidenceCount, setEvidenceCount] = useState(0);

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
              <span className="real-title-main">Khen thưởng & Kỷ luật</span>
              <span className="real-title-sub">MB9 | Ghi nhận thi đua xưởng</span>
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
        {/* Type Toggle inside mockup */}
        <div style={{ display: 'flex', background: '#EADCC9', padding: 2, borderRadius: 6 }}>
          <button onClick={() => { setAwardType('award'); setPoints(5); }} style={{ flex: 1, padding: 6, border: 'none', background: awardType === 'award' ? '#2E7D32' : 'transparent', color: awardType === 'award' ? '#FFF' : '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>🏆 Khen Thưởng</button>
          <button onClick={() => { setAwardType('discipline'); setPoints(-5); }} style={{ flex: 1, padding: 6, border: 'none', background: awardType === 'discipline' ? '#C62828' : 'transparent', color: awardType === 'discipline' ? '#FFF' : '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>⚠️ Kỷ Luật</button>
        </div>

        {/* AwardDisciplineForm */}
        <InteractiveBlock
          name="AwardDisciplineForm"
          type={getCompType('AwardDisciplineForm')}
          description={getCompDesc('AwardDisciplineForm')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>
              BIỂU MẪU GHI NHẬN SỰ VIỆC
            </span>

            {/* Staff Search */}
            <div>
              <span style={{ fontSize: '0.68rem', display: 'block', marginBottom: 2, color: '#7B5233', fontWeight: 600 }}>Tên hoặc Mã nhân viên:</span>
              <input
                type="text"
                placeholder="Ví dụ: NV0922 hoặc Trần Văn Tèo..."
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                style={{ width: '100%', padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.75rem' }}
              />
            </div>

            {/* Score Points Input */}
            <div>
              <span style={{ fontSize: '0.68rem', display: 'block', marginBottom: 2, color: '#7B5233', fontWeight: 600 }}>Điểm thi đua ({awardType === 'award' ? 'Cộng' : 'Trừ'}):</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold', color: awardType === 'award' ? '#2E7D32' : '#C62828' }}
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <span style={{ fontSize: '0.68rem', display: 'block', marginBottom: 2, color: '#7B5233', fontWeight: 600 }}>Mô tả sự việc & Lý do:</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do cụ thể..."
                style={{ width: '100%', height: 50, padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.72rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </InteractiveBlock>

        {/* CameraEvidence */}
        <InteractiveBlock
          name="CameraEvidence"
          type={getCompType('CameraEvidence')}
          description={getCompDesc('CameraEvidence')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            setEvidenceCount(c => c + 1);
          }}
        >
          <div style={{
            background: '#F5EBE0',
            border: '1px dashed #7B5233',
            borderRadius: 8,
            padding: '12px 10px',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: 2 }}>📸</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233' }}>
              {evidenceCount > 0 ? `ĐÃ CHỤP ${evidenceCount} ẢNH BẰNG CHỨNG HÌNH ẢNH` : 'CHỤP ẢNH BẰNG CHỨNG / MINH CHỨNG (NATIVE CAMERA)'}
            </span>
          </div>
        </InteractiveBlock>

        {/* AwardDisciplineService */}
        <InteractiveBlock
          name="AwardDisciplineService"
          type={getCompType('AwardDisciplineService')}
          description={getCompDesc('AwardDisciplineService')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            if (!staffName) {
              alert('Vui lòng điền thông tin nhân viên.');
              return;
            }
            alert(`Lưu sự việc thành công! Đã gửi thông tin cộng/trừ điểm lên hệ thống.`);
          }}
        >
          <button style={{
            width: '100%',
            padding: '10px',
            background: awardType === 'award' ? '#2E7D32' : '#C62828',
            color: '#FFF',
            border: 'none',
            borderRadius: 6,
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}>
            🚀 GỬI BÁO CÁO SỰ VIỆC
          </button>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB9_AwardsMock;
