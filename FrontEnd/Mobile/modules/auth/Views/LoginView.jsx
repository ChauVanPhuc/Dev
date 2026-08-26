import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthController } from '@modules/auth/Controllers/authController'
import useAuthStore from '@modules/auth/Models/authModel'
import PushNotificationService from '@shared/services/pushNotificationService';
import Button from '@mobile/Shared/Views/components/ui/Button'
import Input from '@mobile/Shared/Views/components/ui/Input'

// Import tài nguyên hình ảnh
import logo from '@mobile/assets/logo-no-bg.png'
import background from '@mobile/assets/background-1.png'

/**
 * MH1 - Đăng nhập
 * Login Screen - Mobile Version
 * Đã loại bỏ tính năng cấu hình Server IP (ShowConfig)
 * Giữ nguyên Push Notifications, Auto-login và Remember Me.
 */
const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuthStore()
  const { login, loading, error } = useAuthController()

  const fromPath = location.state?.from?.pathname
    ? (location.state.from.pathname + (location.state.from.search || ''))
    : '/production/orders';

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    remember: false
  })

  // [KEEEP] Kiểm tra tự động đăng nhập & Gia hạn phiên làm việc (Silent Login)
  useEffect(() => {
    let isMounted = true;

    const handleAutoLogin = async () => {
      // 1. Nếu đã đăng nhập rồi thì chỉ việc đi tiếp
      if (isAuthenticated) {
        navigate(fromPath, { replace: true });
        return;
      }

      // 2. Nếu chưa đăng nhập, kiểm tra thông tin ghi nhớ để tự đăng nhập
      const savedData = localStorage.getItem('smartflow_remembered_credentials');
      if (savedData) {
        try {
          const { username, password } = JSON.parse(savedData);
          const result = await login(username, password);
          if (result.success && isMounted) {
            const userState = useAuthStore.getState().user;

            // [KEEP] Khởi tạo Push Notification cho Auto-login
            try {
              PushNotificationService.init(userState.id);
            } catch (err) { }

            navigate(fromPath, { replace: true });
          }
        } catch (e) { }
      }
    };

    handleAutoLogin();
    return () => { isMounted = false; };
  }, [isAuthenticated, navigate, user, login]);

  // [KEEP] Load ghi nhớ tài khoản và mật khẩu khi khởi tạo
  useEffect(() => {
    const savedData = localStorage.getItem('smartflow_remembered_credentials')
    if (savedData) {
      try {
        const { username, password } = JSON.parse(savedData)
        setFormData(prev => ({
          ...prev,
          username: username || '',
          password: password || '',
          remember: true
        }))
      } catch (e) { }
    }
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const cleanUsername = formData.username.trim()
    const cleanPassword = formData.password.trim()

    if (!cleanUsername || !cleanPassword) return

    // [KEEP] Xử lý lưu ghi nhớ tài khoản và mật khẩu
    if (formData.remember) {
      localStorage.setItem('smartflow_remembered_credentials', JSON.stringify({
        username: cleanUsername,
        password: cleanPassword
      }))
    } else {
      localStorage.removeItem('smartflow_remembered_credentials')
      localStorage.removeItem('smartflow_remembered_user') // Dọn dẹp key cũ nếu tồn tại
    }

    const result = await login(cleanUsername, cleanPassword)
    if (result.success) {
      const userState = useAuthStore.getState().user;

      // [KEEP] Khởi tạo Push Notification sau khi login thành công
      try {
        PushNotificationService.init(userState.id);
      } catch (err) {
        console.error("Lỗi khởi tạo Push:", err);
      }

      navigate(fromPath);
    }
  }

  return (
    <div className="login-container" style={{ flex: 1, height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div className="login-image-side">
        <img
          src={background}
          alt="SmartFlow Background"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <div className="login-form-side">
        <div className="login-box">
          <div className="login-header">
            <img src={logo} alt="Logo" style={{ width: '45px', marginBottom: '5px' }} />
            <h1 style={{
              fontSize: '1.4rem',
              color: '#4D3422',
              fontWeight: '800',
              margin: '0 0 2px 0'
            }}>SmartFlow</h1>
            <p style={{ color: '#5d4037', fontSize: '0.8rem', fontWeight: '500' }}>
              Hệ thống bàn giao và quản lý chất lượng
            </p>
          </div>

          <div
            className="login-form-container"
            style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)'
            }}
          >
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
              Đăng nhập
            </h2>

            <form onSubmit={handleSubmit}>
              <Input
                label="Tên đăng nhập"
                name="username"
                placeholder="Nhập tên đăng nhập"
                value={formData.username}
                onChange={handleChange}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />

              <Input
                label="Mật khẩu"
                type="password"
                name="password"
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChange={handleChange}
                isPassword={true}
                autoCapitalize="none"
                autoCorrect="off"
              />

              <div style={{ display: 'none', alignItems: 'center', marginBottom: '15px', gap: '10px' }}>
                <input
                  type="checkbox"
                  name="remember"
                  id="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: '#4D3422' }}
                />
                <label htmlFor="remember" style={{ fontSize: '0.85rem', color: '#444', fontWeight: '500', cursor: 'pointer' }}>
                  Ghi nhớ đăng nhập
                </label>
              </div>

              {error && (
                <p style={{ color: '#c0392b', marginBottom: '15px', fontSize: '0.85rem', backgroundColor: '#fdf2f2', padding: '10px', borderRadius: '8px' }}>
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} style={{ height: '48px', fontSize: '1rem', backgroundColor: '#4D3422' }}>
                Đăng nhập
              </Button>
            </form>
          </div>

          <div className="login-footer" style={{ marginTop: '10px', textAlign: 'center' }}>
            <p style={{ color: '#5d4037', fontSize: '0.8rem', fontWeight: '500', margin: '0' }}>
              Hệ thống phát triển bởi VINA G7 năm 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
