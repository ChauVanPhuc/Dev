import React from 'react';

import { Link, useLocation } from 'react-router-dom';

import "@web/assets/sidebar.css";

import smartflowLogo from '@mobile/assets/logo-no-bg.png';



/**

 * Sidebar dành riêng cho Module Manufacture 

 */

const ManufactureSidebar = ({ active, onLogout, onClose, isLocked, showModal, uploads = [] }) => {

  const location = useLocation();



  const handleLinkClick = () => {

    onClose();

  };



  const menuItems = [

    {

      id: 'home',

      path: '/manufacture/dashboard',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>

          <polyline points="9 22 9 12 15 12 15 22"></polyline>

        </svg>

      ),

      text: 'Trang chủ'

    },

    {

      id: 'plan',

      path: '/manufacture/plan',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>

          <polyline points="14 2 14 8 20 8"></polyline>

          <line x1="16" y1="13" x2="8" y2="13"></line>

          <line x1="16" y1="17" x2="8" y2="17"></line>

        </svg>

      ),

      text: 'Kế hoạch'

    },

    {

      id: 'delivery-tracking',

      path: '/manufacture/delivery-tracking',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>

        </svg>

      ),

      text: 'Theo dõi bàn giao'

    },

    {

      id: 'products',

      path: '/manufacture/products',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>

          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>

          <line x1="12" y1="22.08" x2="12" y2="12"></line>

        </svg>

      ),

      text: 'Sản phẩm mẫu (BOM)'

    },

    /* {

      id: 'orders',

      path: '/manufacture/orders',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>

          <path d="M16 10a4 4 0 0 1-8 0"></path>

        </svg>

      ),

      text: 'Đơn hàng'

    }, */

    {

      id: 'backup-qrs',

      path: '/manufacture/backup-qrs',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>

          <rect x="7" y="7" width="3" height="3"></rect>

          <rect x="14" y="7" width="3" height="3"></rect>

          <rect x="7" y="14" width="3" height="3"></rect>

          <path d="M14 14h3v3h-3z"></path>

        </svg>

      ),

      text: 'Quản lý mã QR'

    },

    {

      id: 'exception-deliveries',

      path: '/manufacture/exception-deliveries',

      icon: (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>

          <line x1="12" y1="9" x2="12" y2="13"></line>

          <line x1="12" y1="17" x2="12.01" y2="17"></line>

        </svg>

      ),

      text: 'Quản Lý Phiếu Ngoại Lệ'

    }

  ];



  return (

    <>

      <div

        className={`sidebar-overlay ${active ? 'visible' : ''}`}

        onClick={onClose}

      ></div>



      <aside className={`admin-sidebar ${active ? 'active' : ''}`} style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}>

        {/* Phần User Info & Logo kết hợp (Nền Nâu chuyên nghiệp) */}

        <div style={{ 

          padding: '20px', 

          display: 'flex', 

          alignItems: 'center',

          gap: '12px',

          backgroundColor: '#7B5233',

          borderBottom: '1px solid rgba(255,255,255,0.1)'

        }}>

          {/* Logo trong hình tròn */}

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

            <img src={smartflowLogo} alt="Logo" style={{ width: '80%', height: 'auto' }} />

          </div>



          {/* Thông tin tài khoản */}

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

              Quản trị viên

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





        {/* Phần Nav - Nền Trắng */}

        <nav className="sidebar-nav" style={{ padding: '20px 0' }}>

          <ul className="nav-list" style={{ listStyle: 'none', padding: 0 }}>

            {menuItems.map((item) => {

              const isActive = location.pathname === item.path;

              return (

                <li key={item.id} className="nav-item">

                  <Link to={item.path}

                    onClick={handleLinkClick}

                    className={`nav-link ${isActive ? 'active' : ''}`}

                    style={{

                      display: 'flex',

                      alignItems: 'center',

                      padding: '10px 20px',

                      textDecoration: 'none',

                      color: isActive ? '#A0301B' : '#6B7280',

                      backgroundColor: isActive ? '#FFF5F5' : 'transparent',

                      borderLeft: isActive ? '4px solid #A0301B' : '4px solid transparent',

                      fontWeight: isActive ? '700' : '500',

                      transition: 'all 0.3s ease'

                    }}

                  >

                    <span className="nav-icon" style={{ marginRight: '12px', color: isActive ? '#A0301B' : '#6B7280' }}>

                      {item.icon}

                    </span>

                    <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.text}</span>

                  </Link>

                </li>

              );

            })}

          </ul>

        </nav>

        {/* PROGRESS BAR Ở DƯỚI CÙNG (CHỈ HIỆN KHI CÓ UPLOAD) */}

        <div style={{

          display: 'flex',

          flexDirection: 'column',

          gap: '10px',

          margin: 'auto 15px 20px 15px',

          maxHeight: '300px',

          overflowY: 'auto',

          paddingRight: '5px'

        }}>

          {uploads.map((upload) => (

            <div key={upload.id} style={{

              padding: '12px',

              backgroundColor: upload.status === 'error' ? '#FEF2F2' : '#FDF2F2',

              borderRadius: '12px',

              border: `1px solid ${upload.status === 'error' ? '#FCA5A5' : 'rgba(160, 48, 27, 0.15)'}`,

              boxShadow: '0 4px 12px rgba(160, 48, 27, 0.08)',

              animation: 'slideUp 0.4s ease'

            }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>

                <span style={{ fontSize: '10px', fontWeight: '800', color: upload.status === 'error' ? '#DC2626' : '#A0301B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>

                  {upload.fileName}

                </span>

                <span style={{ fontSize: '10px', color: '#A0301B', fontWeight: '900' }}>{upload.progress}%</span>

              </div>

              

              <div style={{ height: '5px', backgroundColor: 'rgba(160, 48, 27, 0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>

                <div style={{ 

                  width: `${upload.progress}%`, 

                  height: '100%', 

                  backgroundColor: upload.status === 'error' ? '#EF4444' : '#A0301B', 

                  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',

                  boxShadow: upload.status === 'error' ? 'none' : '0 0 8px rgba(160, 48, 27, 0.2)'

                }} />

              </div>

              

              <div style={{ fontSize: '9px', color: '#7B5233', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>

                  {upload.status === 'uploading' && (

                    <div style={{ width: '8px', height: '8px', border: '1.5px solid #A0301B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />

                  )}

                  <span>

                    {upload.status === 'uploading' ? 'Đang xử lý...' : 

                     upload.status === 'completed' ? 'Hoàn thành' : 'Lỗi'}

                  </span>

                </div>

                <span>{upload.processed}/{upload.total || '?'}</span>

              </div>

            </div>

          ))}

        </div>



        <div className="sidebar-footer" style={{

          padding: '0 25px 20px',

          color: '#A0301B',

          fontSize: '0.7rem',

          fontWeight: '700',

          opacity: 0.6

        }}>

          SmartFlow v1.1.5

        </div>

      </aside>

    </>

  );

};



export default ManufactureSidebar;

