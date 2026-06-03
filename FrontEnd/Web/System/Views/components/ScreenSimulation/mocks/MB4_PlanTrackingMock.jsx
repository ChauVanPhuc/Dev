import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB4_PlanTrackingMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [selectedPlan, setSelectedPlan] = useState('KH-2026-001');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const plans = [
    { code: 'KH-2026-001', name: 'KHSX Ghế gỗ Sồi T5/2026' },
    { code: 'KH-2026-002', name: 'KHSX Bàn trà gỗ Thông' },
    { code: 'KH-2026-003', name: 'KHSX Tủ bếp G7' }
  ];

  const planTasks = [
    { stage: 'Cưa xẻ', target: 500, done: 480, status: 'Đang chạy' },
    { stage: 'Sấy gỗ', target: 500, done: 500, status: 'Hoàn thành' },
    { stage: 'Chà nhám', target: 500, done: 320, status: 'Đang chạy' },
    { stage: 'Sơn phủ', target: 500, done: 120, status: 'Đang chạy' },
    { stage: 'Đóng gói', target: 500, done: 0, status: 'Chờ' }
  ];

  const filteredTasks = planTasks.filter(t => {
    const matchesSearch = t.stage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'All' || t.status === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Theo dõi kế hoạch</span>
              <span className="real-title-sub">MB4 | Tiến độ tổ máy</span>
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

        {/* PlanSelector */}
        <div style={{ padding: '8px 12px', background: '#F5EBE0', borderBottom: '1px solid #EADCC9' }}>
          <InteractiveBlock
            name="PlanSelector"
            type={getCompType('PlanSelector')}
            description={getCompDesc('PlanSelector')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div style={{ position: 'relative' }}>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
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
                {plans.map(p => (
                  <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7B5233', pointerEvents: 'none', fontSize: '0.6rem' }}>▼</span>
            </div>
          </InteractiveBlock>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* PlanTrackingFilter */}
        <InteractiveBlock
          name="PlanTrackingFilter"
          type={getCompType('PlanTrackingFilter')}
          description={getCompDesc('PlanTrackingFilter')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="text"
              placeholder="🔍 Tìm nhanh công đoạn..."
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
              {['All', 'Đang chạy', 'Hoàn thành', 'Chờ'].map(s => (
                <button
                  key={s}
                  onClick={() => setStageFilter(s)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: 12,
                    fontSize: '0.65rem',
                    border: '1px solid #EADCC9',
                    background: stageFilter === s ? '#7B5233' : '#FFF',
                    color: stageFilter === s ? '#FFF' : '#7B5233',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {s === 'All' ? 'Tất cả' : s}
                </button>
              ))}
            </div>
          </div>
        </InteractiveBlock>

        {/* PlanTrackingList */}
        <InteractiveBlock
          name="PlanTrackingList"
          type={getCompType('PlanTrackingList')}
          description={getCompDesc('PlanTrackingList')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredTasks.map((task, idx) => {
              const percent = Math.round((task.done / task.target) * 100);
              return (
                <div key={idx} style={{
                  background: '#FFF',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #EADCC9',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#2D1A12' }}>{task.stage}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: task.status === 'Hoàn thành' ? '#E8F5E9' : task.status === 'Đang chạy' ? '#FFF3E0' : '#ECEFF1',
                      color: task.status === 'Hoàn thành' ? '#2E7D32' : task.status === 'Đang chạy' ? '#EF6C00' : '#37474F'
                    }}>
                      {task.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: 8, background: '#F5EBE0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: task.status === 'Hoàn thành' ? '#2E7D32' : '#7B5233',
                      borderRadius: 4,
                      transition: 'width 0.3s'
                    }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#7B5233', fontWeight: 600 }}>
                    <span>Đã đạt: {task.done} / {task.target} cái</span>
                    <span>{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </InteractiveBlock>

        {/* PlanTrackingService (Logic API representation) */}
        <InteractiveBlock
          name="PlanTrackingService"
          type={getCompType('PlanTrackingService')}
          description={getCompDesc('PlanTrackingService')}
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
            ⚙️ PlanTrackingService: GET /api/v1/production/plan-tracking?plan_code={selectedPlan}
          </div>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB4_PlanTrackingMock;
