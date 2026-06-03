import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB13_CapaListMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [urgencyFilter, setUrgencyFilter] = useState('All'); // 'All', 'Cao', 'Trung bình'
  const [searchQuery, setSearchQuery] = useState('');

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const capas = [
    { code: 'CAPA-2026-001', title: 'Khắc phục nứt ván hông sồi', urgency: 'Cao', team: 'Tổ Cưa Xẻ', status: 'Mới' },
    { code: 'CAPA-2026-002', title: 'Xử lý loang bọt khí sơn bóng', urgency: 'Trung bình', team: 'Tổ Sơn Phủ', status: 'Đang xử lý' },
    { code: 'CAPA-2026-003', title: 'Cân chỉnh nhiệt độ máy ép gỗ', urgency: 'Cao', team: 'Tổ Ép Nóng', status: 'Chờ duyệt' },
    { code: 'CAPA-2026-004', title: 'Thay đổi bao bì đóng gói mặt bàn', urgency: 'Thấp', team: 'Tổ Đóng Gói', status: 'Hoàn thành' }
  ];

  const filteredCapas = capas.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUrgency = urgencyFilter === 'All' || c.urgency === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Danh sách CAPA</span>
              <span className="real-title-sub">MB13 | Hành động khắc phục & phòng ngừa</span>
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
        {/* CapaFilter */}
        <InteractiveBlock
          name="CapaFilter"
          type={getCompType('CapaFilter')}
          description={getCompDesc('CapaFilter')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="text"
              placeholder="🔍 Tìm theo tiêu đề hoặc mã CAPA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #EADCC9',
                borderRadius: 6,
                fontSize: '0.78rem',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'Cao', 'Trung bình', 'Thấp'].map(urg => (
                <button
                  key={urg}
                  onClick={() => setUrgencyFilter(urg)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: 12,
                    fontSize: '0.65rem',
                    border: '1px solid #EADCC9',
                    background: urgencyFilter === urg ? '#7B5233' : '#FFF',
                    color: urgencyFilter === urg ? '#FFF' : '#7B5233',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {urg === 'All' ? 'Tất cả' : `Mức ${urg}`}
                </button>
              ))}
            </div>
          </div>
        </InteractiveBlock>

        {/* CAPAList */}
        <InteractiveBlock
          name="CAPAList"
          type={getCompType('CAPAList')}
          description={getCompDesc('CAPAList')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredCapas.map((capa) => (
              <div
                key={capa.code}
                onClick={() => alert(`Xem chi tiết hành động khắc phục ${capa.code}`)}
                style={{
                  background: '#FFF',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #EADCC9',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: '#7B5233', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {capa.code}
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 'bold',
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: capa.urgency === 'Cao' ? '#FFEBEE' : '#FFF3E0',
                    color: capa.urgency === 'Cao' ? '#C62828' : '#EF6C00'
                  }}>
                    Khẩn: {capa.urgency}
                  </span>
                </div>
                <h4 style={{ margin: '2px 0', fontSize: '0.78rem', color: '#2D1A12' }}>{capa.title}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: '0.65rem', color: '#C5B5AD' }}>
                  <span>Bộ phận: {capa.team}</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: capa.status === 'Hoàn thành' ? '#2E7D32' : capa.status === 'Đang xử lý' ? '#EF6C00' : '#7B5233'
                  }}>
                    ● {capa.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </InteractiveBlock>

        {/* CapaService */}
        <InteractiveBlock
          name="CapaService"
          type={getCompType('CapaService')}
          description={getCompDesc('CapaService')}
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
            ⚙️ CapaService: GET /api/v1/capas?urgency={urgencyFilter}
          </div>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB13_CapaListMock;
