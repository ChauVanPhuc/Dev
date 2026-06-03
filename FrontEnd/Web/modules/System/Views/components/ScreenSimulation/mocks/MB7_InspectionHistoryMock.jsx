import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB7_InspectionHistoryMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [logType, setLogType] = useState('All'); // 'All', 'Daily', 'Stage'

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const logs = [
    { type: 'Daily', code: 'QC-D-0922', title: 'Kiểm QC Hàng Ngày - Ván Hông', inspector: 'Nguyễn Văn B', date: '2026-06-01 08:30', status: 'Đạt' },
    { type: 'Stage', code: 'QC-S-0419', title: 'Kiểm Công Đoạn Sơn - Ghế OAK', inspector: 'Trần Văn C', date: '2026-06-01 09:15', status: 'Lỗi' },
    { type: 'Daily', code: 'QC-D-0921', title: 'Kiểm QC Hàng Ngày - Mặt Bàn', inspector: 'Nguyễn Văn B', date: '2026-05-31 16:40', status: 'Đạt' },
    { type: 'Stage', code: 'QC-S-0418', title: 'Kiểm Đóng Gói - Pallet 12', inspector: 'Lê Thế Hoàng', date: '2026-05-31 14:10', status: 'Đạt' }
  ];

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.inspector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = logType === 'All' || l.type === logType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Nhật ký kiểm tra</span>
              <span className="real-title-sub">MB7 | Lịch sử đánh giá QC</span>
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
        {/* InspectionLogsFilter */}
        <InteractiveBlock
          name="InspectionLogsFilter"
          type={getCompType('InspectionLogsFilter')}
          description={getCompDesc('InspectionLogsFilter')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="text"
              placeholder="🔍 Tìm nhanh người kiểm, mã QC, linh kiện..."
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
              {['All', 'Daily', 'Stage'].map(t => (
                <button
                  key={t}
                  onClick={() => setLogType(t)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: 12,
                    fontSize: '0.65rem',
                    border: '1px solid #EADCC9',
                    background: logType === t ? '#7B5233' : '#FFF',
                    color: logType === t ? '#FFF' : '#7B5233',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {t === 'All' ? 'Tất cả' : t === 'Daily' ? 'Hàng ngày' : 'Công đoạn'}
                </button>
              ))}
            </div>
          </div>
        </InteractiveBlock>

        {/* CombinedInspectionLogsList */}
        <InteractiveBlock
          name="CombinedInspectionLogsList"
          type={getCompType('CombinedInspectionLogsList')}
          description={getCompDesc('CombinedInspectionLogsList')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredLogs.map((log, idx) => (
              <div key={idx} style={{
                background: '#FFF',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #EADCC9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#7B5233', fontWeight: 'bold' }}>{log.code}</span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: log.status === 'Đạt' ? '#E8F5E9' : '#FFEBEE',
                    color: log.status === 'Đạt' ? '#2E7D32' : '#C62828'
                  }}>
                    {log.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#2D1A12', marginBottom: 4 }}>
                  {log.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#7B5233' }}>
                  <span>QC: {log.inspector}</span>
                  <span>{log.date}</span>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#7B5233', fontStyle: 'italic', fontSize: '0.75rem' }}>
                Không tìm thấy nhật ký trùng khớp.
              </div>
            )}
          </div>
        </InteractiveBlock>

        {/* InspectionLogsService (API usage details) */}
        <InteractiveBlock
          name="InspectionLogsService"
          type={getCompType('InspectionLogsService')}
          description={getCompDesc('InspectionLogsService')}
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
            ⚙️ InspectionLogsService: Promise.all([<br/>
            &nbsp;&nbsp;GET /api/v1/inspections/daily,<br/>
            &nbsp;&nbsp;GET /api/v1/inspections/stage<br/>
            ])
          </div>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB7_InspectionHistoryMock;
