import React from 'react';
import InteractiveBlock from '../InteractiveBlock';
import loginBg from '@web/assets/Background 1.png';
import logo from '@web/assets/Logo remove bg.png';
import '../Simulation.css';

export const MB1_LoginMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  return (
    <div className="mock-mobile-container" style={{ display: 'flex', flexDirection: 'column', background: '#FAF8F5', height: '100%', overflowY: 'auto', padding: 0 }}>
      {/* Banner ảnh phía trên */}
      <div style={{ width: '100%', height: '160px', overflow: 'hidden', position: 'relative' }}>
        <img 
          src={loginBg} 
          alt="SmartFlow Banner" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={logo} 
            alt="Logo" 
            style={{ width: 44, height: 44, objectFit: 'contain', marginBottom: 4 }} 
          />
          <h1 className="brand-name" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2D1A12', margin: '0 0 2px 0' }}>SmartFlow</h1>
          <p style={{ fontSize: '0.68rem', color: '#7B5233', margin: 0, opacity: 0.8, fontWeight: 500, textAlign: 'center' }}>Hệ thống bàn giao và quản lý chất lượng</p>
        </div>

        {/* LoginForm wrapper */}
        <InteractiveBlock
          name="MobileLoginForm"
          type={getCompType('MobileLoginForm')}
          description={getCompDesc('MobileLoginForm')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div className="mock-mobile-login-form" style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 12, padding: 18, width: 260, boxShadow: '0 4px 12px rgba(45,26,18,0.04)', boxSizing: 'border-box' }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 12px 0', color: '#2D1A12', textAlign: 'center' }}>Đăng nhập</h2>
            
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: '0.62rem', fontWeight: 700, color: '#7B5233', display: 'block', marginBottom: 4 }}>Tên đăng nhập</label>
              <div className="mock-input" style={{ fontSize: '0.7rem', padding: '6px 10px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: 6, color: '#A0A0A0' }}>Nhập tên đăng nhập</div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.62rem', fontWeight: 700, color: '#7B5233', display: 'block', marginBottom: 4 }}>Mật khẩu</label>
              <div className="mock-input password-input" style={{ fontSize: '0.7rem', padding: '6px 10px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: 6, color: '#A0A0A0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Nhập mật khẩu</span>
                <span className="eye-icon" style={{ fontSize: '0.7rem', color: '#7B5233' }}>👁</span>
              </div>
            </div>

            <div className="form-checkbox" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="mock-checkbox-box" style={{ width: 12, height: 12, border: '1px solid #EADCC9', borderRadius: 3, display: 'inline-block' }}></span>
              <span style={{ fontSize: '0.65rem', color: '#7B5233' }}>Ghi nhớ đăng nhập</span>
            </div>

            <div className="mock-mobile-btn-submit" style={{ padding: 10, fontSize: '0.75rem', borderRadius: 6, background: '#7B5233', color: '#FFF', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>
              Đăng nhập
            </div>
          </div>
        </InteractiveBlock>

        <div style={{ marginTop: 20, fontSize: '0.58rem', color: '#7B5233', opacity: 0.7, textAlign: 'center', lineHeight: 1.4 }}>
          Hệ thống được phát triển bởi công ty<br /><strong>VINA G7 năm 2026</strong>
        </div>
      </div>
    </div>
  );
};

export default MB1_LoginMock;
