import React from 'react';
import InteractiveBlock from './InteractiveBlock';
import './Simulation.css';

export const FallbackMockup = ({
  components = [],
  activeComponent,
  hoveredComponent,
  onHover,
  onClick
}) => {
  // Phân nhóm component
  const uiComponents = components.filter(c => c.type === 'UI Component');
  const logicComponents = components.filter(c => c.type === 'Business Logic' || c.type === 'Logic / Service' || c.type === 'Native API');
  const apiEndpoints = components.filter(c => c.type === 'API Endpoint');

  return (
    <div className="fallback-mockup-container">
      {/* 1. UI Components Area */}
      <div className="fallback-flow-section">
        <div className="fallback-section-title">Giao diện (UI Components)</div>
        {uiComponents.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
            Không có UI Component nào được ghi nhận.
          </div>
        ) : (
          <div className="fallback-grid">
            {uiComponents.map(comp => (
              <InteractiveBlock
                key={comp.id}
                name={comp.name}
                type={comp.type}
                description={comp.description}
                activeComponent={activeComponent}
                hoveredComponent={hoveredComponent}
                onHover={onHover}
                onClick={onClick}
              >
                <div className="fallback-block-item" style={{ background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: 6 }}>
                  {comp.name}
                </div>
              </InteractiveBlock>
            ))}
          </div>
        )}
      </div>

      {/* 2. Logic / Service Area */}
      {logicComponents.length > 0 && (
        <div className="fallback-flow-section" style={{ borderLeft: '4px solid #336B7B' }}>
          <div className="fallback-section-title" style={{ color: '#336B7B' }}>Logic & Dịch vụ Nền (Hooks / State / Services)</div>
          <div className="fallback-grid">
            {logicComponents.map(comp => (
              <InteractiveBlock
                key={comp.id}
                name={comp.name}
                type={comp.type}
                description={comp.description}
                activeComponent={activeComponent}
                hoveredComponent={hoveredComponent}
                onHover={onHover}
                onClick={onClick}
              >
                <div className="fallback-block-item" style={{ background: '#E6F2F5', border: '1px solid #C5DFE6', borderRadius: 6, color: '#1B4752' }}>
                  ⚙️ {comp.name}
                </div>
              </InteractiveBlock>
            ))}
          </div>
        </div>
      )}

      {/* 3. API Endpoints Area */}
      {apiEndpoints.length > 0 && (
        <div className="fallback-flow-section" style={{ borderLeft: '4px solid #7B336B' }}>
          <div className="fallback-section-title" style={{ color: '#7B336B' }}>Cổng dữ liệu (API Endpoints)</div>
          <div className="fallback-grid">
            {apiEndpoints.map(comp => (
              <InteractiveBlock
                key={comp.id}
                name={comp.name}
                type={comp.type}
                description={comp.description}
                activeComponent={activeComponent}
                hoveredComponent={hoveredComponent}
                onHover={onHover}
                onClick={onClick}
              >
                <div className="fallback-block-item" style={{ background: '#F5E6F2', border: '1px solid #E6C5E0', borderRadius: 6, color: '#521B47' }}>
                  🔌 {comp.name}
                </div>
              </InteractiveBlock>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FallbackMockup;
