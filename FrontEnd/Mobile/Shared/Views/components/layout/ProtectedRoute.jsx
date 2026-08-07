import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '@modules/auth/Models/authModel';
import apiClient from '@shared/services/api';

/**
 * Mapped path to mobile permission key
 */
const mapPathToPermissionKey = (pathname) => {
  const path = pathname.replace(/\/$/, '') || '/';
  
  if (path.startsWith('/delivery-info')) return 'mobile_delivery-info';
  if (path.startsWith('/delivery-create')) return 'mobile_delivery-create';
  if (path.startsWith('/delivery-receive')) return 'mobile_delivery-receive';
  if (path.startsWith('/delivery-history')) return 'mobile_delivery-info';
  if (path.startsWith('/delivery-detail')) return 'mobile_delivery-info';
  if (path.startsWith('/plan')) return 'mobile_plan';
  if (path.startsWith('/inspection-daily')) return 'mobile_inspection-daily';
  if (path.startsWith('/inspection-stage-moisture')) return 'mobile_inspection-stage-moisture';
  if (path.startsWith('/inspection-stage-adhesion')) return 'mobile_inspection-stage-adhesion';
  if (path.startsWith('/inspection-stage-process')) return 'mobile_inspection-stage-process';
  if (path.startsWith('/inspection-first-article')) return 'mobile_inspection-first-article';
  if (path.startsWith('/inspection-stage')) return 'mobile_inspection-stage';
  if (path.startsWith('/logs')) return 'mobile_logs';
  if (path.startsWith('/thermal-print')) return 'mobile_thermal-print';
  if (path.startsWith('/awards')) return 'mobile_awards';
  if (path.startsWith('/kpi-staff')) return 'mobile_kpi-staff';
  if (path.startsWith('/kpi')) return 'mobile_kpi';
  if (path.startsWith('/staff-evaluation')) return 'mobile_staff-evaluation';
  if (path.startsWith('/quality-detail')) return 'mobile_quality-detail';
  if (path.startsWith('/input-inspection')) return 'mobile_input-inspection';
  if (path.startsWith('/equipment-list')) return 'mobile_equipment-list';
  if (path.startsWith('/capa-list')) return 'mobile_capa-list';
  if (path.startsWith('/capa-report')) return 'mobile_capa-report';
  if (path.startsWith('/capa-detail')) return 'mobile_capa-detail';
  if (path.startsWith('/feedback')) return 'mobile_feedback';
  if (path.startsWith('/ctq-sos')) return 'mobile_ctq-sos';
  if (path.startsWith('/warnings')) return 'mobile_warnings';
  if (path.startsWith('/production_v2')) return 'mobile_production_v2';
  
  return null;
};

/**
 * ProtectedRoute Component
 * Kiểm tra trạng thái xác thực của người dùng trước khi cho phép truy cập vào các route bên trong.
 * Nếu chưa đăng nhập, chuyển hướng người dùng về trang /login.
 * Đồng thời kiểm soát quyền truy cập màn hình di động theo phân quyền.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, user, permissions, setUser, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated && user?.id) {
      apiClient.get(`accounts/${user.id}/permissions?resolved=true`)
        .then(response => {
          if (response.data && response.data.permissions) {
            setUser(user, null, response.data.permissions);
          }
        })
        .catch(err => {
          console.error("Failed to sync permissions:", err);
        });
    }
  }, [isAuthenticated, user?.id, setUser]);

  if (!isAuthenticated) {
    // Lưu lại trang hiện tại để có thể quay lại sau khi đăng nhập (nếu cần)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Kiểm tra cờ cho phép vào Mobile (is_mobile_allowed)
  const isMobileAllowed = user?.is_mobile_allowed !== false && user?.is_mobile_allowed !== 0;
  if (!isMobileAllowed) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        color: '#1f2937',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        <svg style={{ width: '64px', height: '64px', color: '#dc2626', marginBottom: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Từ chối truy cập Mobile</h1>
        <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '24px', maxWidth: '320px' }}>
          Tài khoản của bạn chưa được cấp quyền truy cập ứng dụng di động (Mobile). Vui lòng liên hệ Quản trị viên.
        </p>
        <button 
          onClick={() => logout()} 
          style={{
            padding: '12px 24px',
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  // 2. Kiểm tra phân quyền chi tiết theo màn hình (nếu màn hình đó có cấu hình 'none')
  const userRoleStr = (user?.role_name || user?.role_description || '').toLowerCase();
  const userPermStr = (user?.permission_name || user?.permission_description || '').toLowerCase();
  const userNameStr = (user?.full_name || user?.username || '').toLowerCase();
  const userDeptStr = (user?.department_name || user?.department_code || user?.department || '').toLowerCase();
  const userPosStr = (user?.position_name || user?.position_code || user?.position || '').toLowerCase();
  const combinedAuthStr = `${userRoleStr} | ${userPermStr} | ${userNameStr} | ${userDeptStr} | ${userPosStr}`;

  const isAdmin = combinedAuthStr.includes('admin') || combinedAuthStr.includes('it') || combinedAuthStr.includes('bgd');

  if (!isAdmin) {
    const key = mapPathToPermissionKey(location.pathname);
    if (key) {
      const userPerm = permissions?.[key];
      // Nếu màn hình này bị cấu hình từ chối riêng ('none')
      const isExplicitlyDenied = userPerm === 'none';

      if (isExplicitlyDenied) {
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            color: '#1f2937',
            fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          }}>
            <svg style={{ width: '64px', height: '64px', color: '#dc2626', marginBottom: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Từ chối truy cập</h1>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '24px', maxWidth: '320px' }}>
              Bạn không có quyền truy cập vào màn hình này. Vui lòng liên hệ Quản trị viên để được cấp quyền.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%', maxWidth: '320px' }}>
              <button 
                onClick={() => navigate(-1)} 
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                Quay lại trang trước
              </button>
              <button 
                onClick={() => logout()} 
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#fff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        );
      }
    }
  }


  // Nếu đã đăng nhập và có quyền, cho phép render các route con
  return <Outlet />;
};

export default ProtectedRoute;
