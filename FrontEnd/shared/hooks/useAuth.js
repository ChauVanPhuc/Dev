import { useState } from 'react';
import { authService } from '@modules/Auth/Models/auth.service';

/**
 * Controller: Hook xử lý logic đăng nhập
 */
export const useAuth = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(username, password);
      
      // Chặn tài khoản bị vô hiệu hóa quyền truy cập Web
      if (response.is_web_allowed === false) {
        setError('Tài khoản của bạn chưa được cấp quyền truy cập Web. Vui lòng liên hệ Quản trị viên.');
        setLoading(false);
        return;
      }

      // Chặn tài khoản công nhân đăng nhập vào Web
      if (response.permission_name === 'NV SX' || response.permission_name === 'NV QC') {
        setError('Tài khoản của bạn (Công nhân) không có quyền truy cập ứng dụng Web. Vui lòng đăng nhập trên thiết bị di động.');
        setLoading(false);
        return;
      }

      // Giả lập token hoặc lấy từ response
      const token = response.access_token || response.token || 'demo-token';
      authService.setToken(token);
      localStorage.setItem('smartflow_user', JSON.stringify(response));
      localStorage.setItem('smartflow_active_permissions', response.screen_permissions || '{}');
      
      // Chuyển hướng sang trang Admin
      window.location.href = '/admin'; // Hoặc dùng navigate nếu được bao bọc bởi Router
    } catch (err) {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    loading,
    error,
    handleLogin
  };
};
