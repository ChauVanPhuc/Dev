import React from 'react';

import { Link, useLocation } from 'react-router-dom';

import "@web/assets/sidebar.css";

import amandaPhoto from '@mobile/assets/logo-no-bg.png';



/**

 * View: Component Sidebar tái sử dụng

 * Tự động Active dựa trên đường dẫn hiện tại (Location)

 */

const Sidebar = ({ active, onLogout }) => {

  const location = useLocation();



  const menuItems = [

    {

      id: 'dashboard',

      path: '/admin/dashboard',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>

          <polyline points="9 22 9 12 15 12 15 22"></polyline>

        </svg>

      ),

      text: 'Trang chủ'

    },

    {

      id: 'users',

      path: '/admin/users',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>

          <polyline points="14 2 14 8 20 8"></polyline>

          <line x1="16" y1="13" x2="8" y2="13"></line>

          <line x1="16" y1="17" x2="8" y2="17"></line>

        </svg>

      ),

      text: 'Quản lý người dùng'

    },

    {

      id: 'handovers',

      path: '/admin/handovers',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>

        </svg>

      ),

      text: 'Danh sách bàn giao'

    },

    {

      id: 'logs',

      path: '/admin/logs',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>

          <circle cx="9" cy="7" r="4"></circle>

          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>

        </svg>

      ),

      text: 'Lỗi ghi nhận'

    },

    {

      id: 'reports',

      path: '/admin/reports',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <circle cx="12" cy="12" r="10"></circle>

          <polyline points="12 6 12 12 16 14"></polyline>

        </svg>

      ),

      text: 'Báo cáo kiểm tra'

    },

    {

      id: 'kpi',

      path: '/admin/kpi',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <polyline points="9 11 12 14 22 4"></polyline>

          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>

        </svg>

      ),

      text: 'Báo cáo KPI'

    },

    {

      id: 'feedback',

      path: '/admin/feedback',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>

        </svg>

      ),

      text: 'Góp ý cải tiến'

    },

    {

      id: 'hotspots',

      path: '/admin/hotspots',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <circle cx="12" cy="12" r="10"></circle>

          <line x1="12" y1="8" x2="12" y2="12"></line>

          <line x1="12" y1="16" x2="12.01" y2="16"></line>

        </svg>

      ),

      text: 'Điểm nóng cần chú ý'

    },

    {

      id: 'data',

      path: '/admin/data',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>

          <circle cx="12" cy="12" r="3"></circle>

        </svg>

      ),

      text: 'Đóng gói dữ liệu'

    },

    {

      id: 'screens',

      path: '/admin/screens',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>

          <line x1="8" y1="21" x2="16" y2="21"></line>

          <line x1="12" y1="17" x2="12" y2="21"></line>

        </svg>

      ),

      text: 'Quản lý màn hình'

    },

  ];



  return (

    <aside className={`admin-sidebar ${active ? 'active' : ''}`}>

      {/* Phần User Info & Logo kết hợp (Nền Nâu chuyên nghiệp) */}

      <div style={{ 

        padding: '20px', 

        display: 'flex', 

        alignItems: 'center',

        gap: '12px',

        backgroundColor: '#7B5233',

        borderBottom: '1px solid rgba(255,255,255,0.1)'

      }}>

        {/* Logo Avatar hình tròn */}

        <div style={{ 

          width: '45px', 

          height: '45px', 

          backgroundColor: '#FFFFFF', 

          borderRadius: '50%',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          overflow: 'hidden',

          border: '2px solid rgba(255,255,255,0.2)',

          flexShrink: 0

        }}>

          <img src={amandaPhoto} alt="Avatar" style={{ width: '80%', height: 'auto' }} />

        </div>



        {/* Thông tin tài khoản */}

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

            Admin

          </span>

          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

            amanda@mail.com

          </span>

        </div>



        {/* Nút Đăng xuất */}

        <button onClick={onLogout} title="Đăng xuất" style={{ 

          background: 'rgba(255,255,255,0.15)', 

          border: 'none', 

          borderRadius: '8px', 

          padding: '6px',

          cursor: 'pointer',

          display: 'flex',

          alignItems: 'center',

          transition: 'background 0.2s'

        }}

        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}

        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}

        >

          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>

            <line x1="12" y1="2" x2="12" y2="12"></line>

          </svg>

        </button>

      </div>



      <nav className="sidebar-nav">

        <ul className="nav-list">

          {menuItems.map((item) => {

            const isActive = location.pathname === item.path;

            return (

              <li key={item.id} className="nav-item">

                <Link to={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>

                  <span className="nav-icon">{item.icon}</span>

                  <span className="nav-text">{item.text}</span>

                </Link>

              </li>

            );

          })}

        </ul>

      </nav>





    </aside>

  );

};



export default Sidebar;

