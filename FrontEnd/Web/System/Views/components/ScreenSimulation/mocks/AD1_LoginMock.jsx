import React from 'react';
import InteractiveBlock from '../InteractiveBlock';
import loginBg from '@web/assets/Background 1.png';
import logo from '@web/assets/Logo remove bg.png';
import '../Simulation.css';

export const AD1_LoginMock = ({
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
    <div className="mock-login-layout" style={{ minHeight: '520px' }}>
      {/* Cột trái: Hình ảnh background thật của hệ thống */}
      <div className="mock-login-left" style={{ padding: 0, borderRight: '1px solid #EADCC9', overflow: 'hidden' }}>
        <img 
          src={loginBg} 
          alt="SmartFlow Office Background" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>

      {/* Cột phải: Form Đăng nhập khớp với thực tế */}
      <div className="mock-login-right" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 30px', background: '#FAF8F5' }}>
        <div className="login-brand" style={{ textAlign: 'center', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={logo} 
            alt="Logo" 
            style={{ width: 64, height: 64, marginBottom: 8, objectFit: 'contain' }} 
          />
          <h1 className="brand-name" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2D1A12', margin: '0 0 4px 0' }}>SmartFlow</h1>
          <p className="brand-desc" style={{ fontSize: '0.8rem', color: '#7B5233', margin: 0, opacity: 0.8, fontWeight: 500 }}>Hệ thống bàn giao và quản lý chất lượng</p>
        </div>

        {/* LoginForm Wrapper */}
        <InteractiveBlock
          name="LoginForm"
          type={getCompType('LoginForm')}
          description={getCompDesc('LoginForm')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div className="mock-login-form-card" style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 12, padding: '24px 20px', width: '310px', boxShadow: '0 4px 12px rgba(45,26,18,0.04)', boxSizing: 'border-box' }}>
            <h2 className="form-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#2D1A12', textAlign: 'center' }}>Đăng nhập</h2>
            
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', display: 'block', marginBottom: 6 }}>Tên đăng nhập</label>
              <div className="mock-input" style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: 6, color: '#A0A0A0', height: '36px', boxSizing: 'border-box', display: 'flex', alignItems: 'center' }}>
                Nhập tên đăng nhập
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', display: 'block', marginBottom: 6 }}>Mật khẩu</label>
              <div className="mock-input password-input" style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: 6, color: '#A0A0A0', height: '36px', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Nhập mật khẩu</span>
                <span className="eye-icon" style={{ color: '#7B5233', fontSize: '0.82rem' }}>👁</span>
              </div>
            </div>

            <div className="form-checkbox" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="mock-checkbox-box" style={{ width: 14, height: 14, border: '1px solid #EADCC9', borderRadius: 3, display: 'inline-block' }}></span>
              <span style={{ fontSize: '0.72rem', color: '#7B5233' }}>Ghi nhớ đăng nhập</span>
            </div>

            <div className="mock-submit-btn" style={{ padding: '10px', fontSize: '0.85rem', borderRadius: 6, background: '#7B5233', color: '#FFF', fontWeight: 700, textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
              Đăng nhập
            </div>
          </div>
        </InteractiveBlock>

        <div className="login-footer" style={{ marginTop: 24, fontSize: '0.68rem', color: '#7B5233', opacity: 0.7, textAlign: 'center', lineHeight: 1.4 }}>
          Hệ thống được phát triển bởi công ty<br /><strong>VINA G7 năm 2026</strong>
        </div>
      </div>
    </div>
  );
};

export default AD1_LoginMock;
