import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import loginBg from '@mobile/assets/background-1.webp';
import logo from '@mobile/assets/logo-no-bg.png';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const LoginPage = () => {
  const { screenCode, title, subtitle } = useScreenMetadataCached('/login');

  useEffect(() => {
    document.title = title ? `${title} - SmartFlow` : 'Đăng nhập - SmartFlow';
  }, [title]);

  const {
    username, setUsername,
    password, setPassword,
    rememberMe, setRememberMe,
    loading, error,
    handleLogin
  } = useAuth();



  const [showPassword, setShowPassword] = useState(false);



  return (

    <div className="login-container">

      {/* Phía bên trái: Hình ảnh background (Desktop) / Phía trên (Mobile) */}

      <div className="login-image-side">

        <img src={loginBg} alt="SmartFlow Office" className="login-bg-img" />

      </div>



      {/* Phía bên phải: Form đăng nhập */}

      <div className="login-form-side">

        <div className="login-box">

          <div className="login-header">

            <img src={logo} alt="Logo" className="login-logo" />

            <h1 className="brand-name">SmartFlow</h1>

            <p className="tagline">Hệ thống bàn giao và quản lý chất lượng</p>

          </div>



          <div className="login-form-container">

            <h2 className="login-title">Đăng nhập</h2>

            

            <form onSubmit={handleLogin}>

              <div className="form-group">

                <label>Tên đăng nhập</label>

                <input 

                  type="text" 

                  placeholder="Nhập tên đăng nhập" 

                  value={username}

                  onChange={(e) => setUsername(e.target.value)}

                  required

                />

              </div>



              <div className="form-group">

                <label>Mật khẩu</label>

                <div className="password-input-wrapper">

                  <input 

                    type={showPassword ? "text" : "password"} 

                    placeholder="Nhập mật khẩu" 

                    value={password}

                    onChange={(e) => setPassword(e.target.value)}

                    required

                  />

                  <button 

                    type="button" 

                    className="password-toggle"

                    onClick={() => setShowPassword(!showPassword)}

                  >

                    {/* Icon con mắt dùng SVG */}

                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">

                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />

                      <circle cx="12" cy="12" r="3" />

                      {!showPassword && <line x1="1" y1="1" x2="23" y2="23" />}

                    </svg>

                  </button>

                </div>

              </div>



              <div className="form-options">

                <label className="checkbox-container">

                  <input 

                    type="checkbox" 

                    checked={rememberMe}

                    onChange={(e) => setRememberMe(e.target.checked)}

                  />

                  <span className="checkmark"></span>

                  Ghi nhớ đăng nhập

                </label>

              </div>



              {error && <p className="error-message">{error}</p>}



              <button type="submit" className="login-btn" disabled={loading}>

                {loading ? 'Đang xử lý...' : 'Đăng nhập'}

              </button>

            </form>

          </div>



          <div className="login-footer">

            <p>Hệ thống được phát triển bởi công ty</p>

            <p>VINA G7 năm 2026</p>

          </div>

        </div>

      </div>

    </div>

  );

};



export default LoginPage;

