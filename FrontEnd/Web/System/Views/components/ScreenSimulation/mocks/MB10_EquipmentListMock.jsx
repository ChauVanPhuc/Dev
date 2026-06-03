import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB10_EquipmentListMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [equipments, setEquipments] = useState([
    { id: 'EQ-001', name: 'Máy cưa bàn trượt Altendorf', status: 'Bình thường', lastInspection: '2026-06-01 07:00' },
    { id: 'EQ-002', name: 'Máy chà nhám chổi hơi', status: 'Cảnh báo', lastInspection: '2026-05-31 16:30' },
    { id: 'EQ-003', name: 'Máy ép nóng thủy lực', status: 'Bình thường', lastInspection: '2026-06-01 07:15' },
    { id: 'EQ-004', name: 'Thước cặp điện tử Mitutoyo', status: 'Cần thay mới', lastInspection: '2026-05-28 08:00' }
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('Bình thường');
  const [desc, setDesc] = useState('');

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const openInspection = (eq) => {
    setSelectedEquip(eq);
    setNewStatus(eq.status);
    setDesc('');
    setModalOpen(true);
  };

  const saveStatus = () => {
    setEquipments(prev => prev.map(eq => {
      if (eq.id === selectedEquip.id) {
        return {
          ...eq,
          status: newStatus,
          lastInspection: 'Vừa xong'
        };
      }
      return eq;
    }));
    setModalOpen(false);
  };

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Danh sách thiết bị</span>
              <span className="real-title-sub">MB10 | Quản lý máy móc đo lường</span>
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
        {/* EquipmentList */}
        <InteractiveBlock
          name="EquipmentList"
          type={getCompType('EquipmentList')}
          description={getCompDesc('EquipmentList')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {equipments.map((eq) => (
              <div
                key={eq.id}
                onClick={() => openInspection(eq)}
                style={{
                  background: '#FFF',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #EADCC9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.65rem', color: '#7B5233', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {eq.id}
                  </span>
                  <h4 style={{ margin: '2px 0', fontSize: '0.78rem', color: '#2D1A12' }}>{eq.name}</h4>
                  <span style={{ fontSize: '0.65rem', color: '#C5B5AD' }}>Kểm tra lần cuối: {eq.lastInspection}</span>
                </div>
                
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: eq.status === 'Bình thường' ? '#E8F5E9' : eq.status === 'Cảnh báo' ? '#FFF3E0' : '#FFEBEE',
                  color: eq.status === 'Bình thường' ? '#2E7D32' : eq.status === 'Cảnh báo' ? '#E65100' : '#C62828'
                }}>
                  {eq.status}
                </span>
              </div>
            ))}
          </div>
        </InteractiveBlock>

        {/* EquipmentInspectionModal (rendered inline for the mobile mockup) */}
        {modalOpen && (
          <InteractiveBlock
            name="EquipmentInspectionModal"
            type={getCompType('EquipmentInspectionModal')}
            description={getCompDesc('EquipmentInspectionModal')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div style={{
              background: '#FFF',
              border: '2px solid #7B5233',
              borderRadius: 8,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #7B5233', paddingBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>
                  TỰ KIỂM TRA ĐẦU CA: {selectedEquip?.id}
                </span>
                <button onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: '1rem', color: '#7B5233', cursor: 'pointer' }}>×</button>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: '#7B5233', fontWeight: 600, display: 'block', marginBottom: 4 }}>Trạng thái vận hành thiết bị:</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['Bình thường', 'Cảnh báo', 'Cần thay mới'].map(st => (
                    <button
                      key={st}
                      onClick={() => setNewStatus(st)}
                      style={{
                        flex: 1,
                        padding: 5,
                        fontSize: '0.62rem',
                        fontWeight: 'bold',
                        border: '1px solid #7B5233',
                        borderRadius: 4,
                        background: newStatus === st ? '#7B5233' : '#FFF',
                        color: newStatus === st ? '#FFF' : '#7B5233',
                        cursor: 'pointer'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: '#7B5233', fontWeight: 600, display: 'block', marginBottom: 4 }}>Mô tả tình trạng lỗi (nếu có):</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Lưỡi cưa hơi mòn..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  style={{ width: '100%', padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.75rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: 6, border: '1px solid #7B5233', background: '#FFF', color: '#7B5233', borderRadius: 4, fontSize: '0.7rem', fontWeight: 'bold' }}>HỦY</button>
                <button onClick={saveStatus} style={{ flex: 1, padding: 6, border: 'none', background: '#7B5233', color: '#FFF', borderRadius: 4, fontSize: '0.7rem', fontWeight: 'bold' }}>XÁC NHẬN LƯU</button>
              </div>
            </div>
          </InteractiveBlock>
        )}

        {/* EquipmentService */}
        <InteractiveBlock
          name="EquipmentService"
          type={getCompType('EquipmentService')}
          description={getCompDesc('EquipmentService')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{
            background: '#FAF6F0',
            padding: 8,
            borderRadius: 6,
            border: '1px solid #7B5233',
            fontSize: '0.68rem',
            fontFamily: 'monospace',
            color: '#7B5233'
          }}>
            ⚙️ EquipmentService: PATCH /api/v1/equipments/{selectedEquip?.id || '{id}'}/status
          </div>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB10_EquipmentListMock;
