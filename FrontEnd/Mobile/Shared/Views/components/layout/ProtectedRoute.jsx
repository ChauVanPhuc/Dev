import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '@modules/auth/Models/authModel';

/**
 * ProtectedRoute Component
 * Kiểm tra trạng thái xác thực của người dùng trước khi cho phép truy cập vào các route bên trong.
 * Nếu chưa đăng nhập, chuyển hướng người dùng về trang /login.
 */
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    // Lưu lại trang hiện tại để có thể quay lại sau khi đăng nhập (nếu cần)
    // Ở đây đơn giản là chuyển hướng về /login
    return <Navigate to="/login" replace />;
  }

  // Nếu đã đăng nhập, cho phép render các route con
  return <Outlet />;
};

export default ProtectedRoute;
