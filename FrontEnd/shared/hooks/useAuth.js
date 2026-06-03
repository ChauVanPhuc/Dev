import { useState } from 'react';
import { authService } from '@web/Auth/Models/auth.service';

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
      // Giả lập token hoặc lấy từ response
      const token = response.access_token || response.token || 'demo-token';
      authService.setToken(token);
      
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
