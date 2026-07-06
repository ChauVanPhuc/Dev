import React from 'react';
import './Simulation.css';

export const BrowserFrame = ({ url, onReload, isLive, children }) => {
  return (
    <div className="browser-frame-container">
      <div className="browser-header">
        <div className="browser-dots">
          <span className="dot dot-red"></span>
          <span className="dot dot-yellow"></span>
          <span className="dot dot-green"></span>
        </div>
        <div className="browser-address-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span className="lock-icon">🔒</span>
            <span className="address-text">http://192.168.1.222:1222{url}</span>
          </div>
          {onReload && (
            <button 
              onClick={onReload} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '0.82rem', 
                padding: '2px 8px',
                color: '#7B5233',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.2s'
              }}
              title="Tải lại trang thực tế"
              onMouseEnter={(e) => e.currentTarget.style.opacity = 0.7}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
            >
              🔄
            </button>
          )}
        </div>
      </div>
      <div className="browser-content" style={isLive ? { overflow: 'hidden', padding: 0 } : {}}>
        {children}
      </div>
    </div>
  );
};

export const MobileFrame = ({ isLive, children }) => {
  return (
    <div className="mobile-frame-container">
      <div className="mobile-bezel">
        <div className="mobile-screen">
          <div className="mobile-status-bar">
            <span className="mobile-time">09:41</span>
            <div className="mobile-notch"></div>
            <div className="mobile-status-icons">
              <span style={{ marginRight: 4 }}>📶</span>
              <span>🔋</span>
            </div>
          </div>
          <div className="mobile-content" style={isLive ? { overflow: 'hidden', padding: 0, height: '100%' } : {}}>
            {children}
          </div>
          <div className="mobile-home-indicator"></div>
        </div>
      </div>
    </div>
  );
};
