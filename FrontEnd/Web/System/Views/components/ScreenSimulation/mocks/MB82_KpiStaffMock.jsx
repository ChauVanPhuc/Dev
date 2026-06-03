import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB82_KpiStaffMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [teamFilter, setTeamFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const staffKpis = [
    { id: 'NV0922', name: 'Trần Văn Tèo', team: 'Tổ Cưa Xẻ', score: 94, grade: 'A' },
    { id: 'NV0923', name: 'Nguyễn Thị Hoa', team: 'Tổ Sơn Phủ', score: 86, grade: 'B' },
    { id: 'NV0924', name: 'Lê Văn Tám', team: 'Tổ Cưa Xẻ', score: 72, grade: 'C' },
    { id: 'NV0925', name: 'Phạm Hồng Thái', team: 'Tổ Đóng Gói', score: 98, grade: 'A' }
  ];

  const filteredStaff = staffKpis.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = teamFilter === 'All' || s.team === teamFilter;
    return matchesSearch && matchesTeam;
  });

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">KPI Nhân viên</span>
              <span className="real-title-sub">MB8.2 | Danh sách hiệu suất</span>
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
        {/* KPIListFilter */}
        <InteractiveBlock
          name="KPIListFilter"
          type={getCompType('KPIListFilter')}
          description={getCompDesc('KPIListFilter')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="text"
              placeholder="🔍 Tìm theo tên hoặc mã nhân viên..."
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
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {['All', 'Tổ Cưa Xẻ', 'Tổ Sơn Phủ', 'Tổ Đóng Gói'].map(t => (
                <button
                  key={t}
                  onClick={() => setTeamFilter(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.65rem',
                    whiteSpace: 'nowrap',
                    border: '1px solid #EADCC9',
                    background: teamFilter === t ? '#7B5233' : '#FFF',
                    color: teamFilter === t ? '#FFF' : '#7B5233',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {t === 'All' ? 'Tất cả tổ' : t}
                </button>
              ))}
            </div>
          </div>
        </InteractiveBlock>

        {/* StaffKPIList */}
        <InteractiveBlock
          name="StaffKPIList"
          type={getCompType('StaffKPIList')}
          description={getCompDesc('StaffKPIList')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredStaff.map((staff) => (
              <div
                key={staff.id}
                onClick={() => alert(`Xem chi tiết đánh giá của ${staff.name}`)}
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
                    {staff.id}
                  </span>
                  <h4 style={{ margin: '2px 0', fontSize: '0.8rem', color: '#2D1A12' }}>{staff.name}</h4>
                  <span style={{ fontSize: '0.65rem', color: '#C5B5AD' }}>{staff.team}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#7B5233', display: 'block' }}>
                      {staff.score}
                    </span>
                    <span style={{ fontSize: '0.55rem', color: '#C5B5AD' }}>Điểm số</span>
                  </div>
                  <span style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: staff.grade === 'A' ? '#E8F5E9' : staff.grade === 'B' ? '#E3F2FD' : '#FFEBEE',
                    color: staff.grade === 'A' ? '#2E7D32' : staff.grade === 'B' ? '#1565C0' : '#C62828',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.72rem'
                  }}>
                    {staff.grade}
                  </span>
                </div>
              </div>
            ))}
            {filteredStaff.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#7B5233', fontStyle: 'italic', fontSize: '0.75rem' }}>
                Không có nhân viên phù hợp.
              </div>
            )}
          </div>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB82_KpiStaffMock;
