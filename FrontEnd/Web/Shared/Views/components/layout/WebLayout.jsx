/**
 * File: Layout.jsx
 * Tự động comment: File này thuộc mô hình dự án, phụ trách Layout.
 */
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Calendar, Package, Users, LogOut, Menu, X, Power, User, ClipboardList } from 'lucide-react';
import { useState } from 'react';

/**
 * Thành phần Layout chung (Common Layout).
 * - Cung cấp cấu trúc giao diện chính bao gồm Sidebar (thanh bên) và vùng nội dung chính.
 * - Quản lý trạng thái mở/đóng của Sidebar.
 * - Tự động đánh dấu mục điều hướng đang hoạt động dựa trên URL hiện tại.
 */
const Layout = () => {
  // Trạng thái điều khiển việc hiển thị Sidebar (mở/đóng)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Hook lấy thông tin đường dẫn hiện tại để xử lý trạng thái 'active' của menu
  const location = useLocation();

  // Danh sách các mục điều hướng trong Sidebar của phân hệ sản xuất
  const navItems = [
    { name: 'Trang chủ', path: '/manufacture/dashboard', icon: Home },
    { name: 'Kế hoạch', path: '/manufacture/plan', icon: Calendar },
    { name: 'Đơn hàng', path: '/manufacture/order', icon: ClipboardList },
    { name: 'Bàn giao', path: '/manufacture/handover', icon: Package },
    { name: 'Tiếp nhận', path: '/manufacture/receive', icon: Users },
  ];

  /**
   * Hàm chuyển đổi trạng thái Sidebar (Đóng <-> Mở)
   */
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="layout-container" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar - Thanh điều hướng bên trái */}
      <aside 
        className={`sidebar sidebar-light ${isSidebarOpen ? 'open' : 'closed'}`}
        style={{
          width: isSidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed-width)',
          backgroundColor: 'white',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e2e8f0'
        }}
      >
        {/* Profile Header - Hiển thị thông tin người dùng đang đăng nhập */}
        <div style={{ 
          padding: '1.5rem 1rem', 
          backgroundColor: '#5d3b32', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          margin: '10px',
          borderRadius: '12px',
          position: 'relative'
        }}>
          {/* Avatar mặc định */}
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            backgroundColor: '#ffedd5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <User size={24} color="#5d3b32" />
          </div>
          {/* Tên và Email người dùng - Chỉ hiện khi Sidebar đang mở */}
          {isSidebarOpen && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Amanda</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>amanda@mail.com</div>
            </div>
          )}
          {/* Nút Đăng xuất */}
          {isSidebarOpen && (
            <button style={{ color: 'white', opacity: 0.8, padding: '4px' }}>
              <Power size={18} />
            </button>
          )}
        </div>

        {/* Danh sách các liên kết điều hướng */}
        <nav style={{ flex: 1, padding: '1rem 0.5rem' }}>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              // Logic xác định xem mục này có đang được chọn (active) hay không
              const isActive = item.path === '/manufacture/dashboard' 
                ? location.pathname === item.path 
                : location.pathname.startsWith(item.path);
              
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      color: isActive ? '#991b1b' : '#64748b',
                      fontWeight: isActive ? '600' : '500',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Icon size={20} />
                    {isSidebarOpen && <span style={{ fontSize: '0.9rem' }}>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Thông tin bản quyền / Phiên bản ở chân Sidebar */}
        <div className="sidebar-footer" style={{ padding: '1rem', color: '#991b1b', fontSize: '0.75rem', fontWeight: '500' }}>
            {isSidebarOpen && <span>pm:2026 - My-Bach</span>}
        </div>
      </aside>

      {/* Main Content - Vùng hiển thị nội dung của Route con */}
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '2rem', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

