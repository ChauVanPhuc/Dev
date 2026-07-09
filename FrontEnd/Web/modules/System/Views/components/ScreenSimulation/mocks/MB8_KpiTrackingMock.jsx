import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB8_KpiTrackingMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'week', 'month'

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const tasks = [
    { name: 'Kiểm tra thiết bị đầu ca', done: true, route: '/inspection-daily' },
    { name: 'Báo cáo sản lượng ca cưa xẻ', done: true, route: '/inspection-stage' },
    { name: 'Đối chiếu pallet gỗ Hòa Phát', done: false, route: '/logs' },
  ];

  const percent = selectedPeriod === 'week' ? 88 : 92;

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Hiệu suất làm việc</span>
              <span className="real-title-sub">MB8 | Theo dõi KPI cá nhân</span>
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
        {/* Toggle Period inside mockup */}
        <div style={{ display: 'flex', background: '#EADCC9', padding: 2, borderRadius: 6 }}>
          <button onClick={() => setSelectedPeriod('week')} style={{ flex: 1, padding: 6, border: 'none', background: selectedPeriod === 'week' ? '#FFF' : 'transparent', color: '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>Tuần này</button>
          <button onClick={() => setSelectedPeriod('month')} style={{ flex: 1, padding: 6, border: 'none', background: selectedPeriod === 'month' ? '#FFF' : 'transparent', color: '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>Tháng này</button>
        </div>

        {/* KPIDashboards with CircularProgress */}
        <InteractiveBlock
          name="KPIDashboards"
          type={getCompType('KPIDashboards')}
          description={getCompDesc('KPIDashboards')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 16, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>ĐIỂM HIỆU SUẤT KPI</span>
            
            {/* CircularProgress Wrapper */}
            <InteractiveBlock
              name="CircularProgress"
              type={getCompType('CircularProgress')}
              description={getCompDesc('CircularProgress')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <svg width="100" height="100" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <path
                    className="circle-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#F5EBE0"
                    strokeWidth="3.5"
                  />
                  <path
                    className="circle"
                    strokeDasharray={`${percent}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#7B5233"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#7B5233', display: 'block' }}>{percent}%</span>
                  <span style={{ fontSize: '0.5rem', color: '#C5B5AD', textTransform: 'uppercase' }}>Hạng A</span>
                </div>
              </div>
            </InteractiveBlock>

            <div style={{ fontSize: '0.68rem', color: '#7B5233', textAlign: 'center', lineHeight: '1.3' }}>
              Bạn đang vượt <b>{percent - 80}%</b> so với mục tiêu tối thiểu (80%) đề ra của Tổ máy Chà nhám.
            </div>
          </div>
        </InteractiveBlock>

        {/* ChecklistTasks */}
        <InteractiveBlock
          name="ChecklistTasks"
          type={getCompType('ChecklistTasks')}
          description={getCompDesc('ChecklistTasks')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>
              ĐẦU VIỆC TRONG CA HẰNG NGÀY
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.map((task, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: task.done ? '#E8F5E9' : '#FAF6F0',
                  border: '1px solid #EADCC9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.8rem' }}>{task.done ? '✓' : '⏳'}</span>
                    <span style={{ fontSize: '0.72rem', color: '#2D1A12', fontWeight: 600, textDecoration: task.done ? 'line-through' : 'none' }}>
                      {task.name}
                    </span>
                  </div>
                  {!task.done && (
                    <button style={{
                      padding: '3px 6px',
                      background: '#7B5233',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}>
                      Đi làm ➔
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB8_KpiTrackingMock;
