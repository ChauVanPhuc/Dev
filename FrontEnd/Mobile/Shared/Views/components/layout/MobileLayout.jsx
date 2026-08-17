import React from 'react'

import Sidebar from './MobileSidebar'

import NotificationSidebar from '@modules/notification/Views/components/NotificationSidebar'

import NotificationBanner from '@modules/notification/Views/components/NotificationBanner'

import NotificationListener from '@modules/notification/Views/components/NotificationListener'

import useAuthStore from '@modules/auth/Models/authModel'

import UserGuideTour from './Onboarding/UserGuideTour'

import { Layers, LogOut, ArrowRight } from 'lucide-react'



/**

 * Layout Component

 * Bao bọc các trang nội bộ, tích hợp sẵn Sidebar.

 */

const Layout = ({ children }) => {

  const { user, setActiveStage, logout } = useAuthStore()



  const userRoleStr = (user?.role_name || user?.role_description || '').toLowerCase();
  const userPermStr = (user?.permission_name || user?.permission_description || '').toLowerCase();
  const userNameStr = (user?.full_name || user?.username || '').toLowerCase();
  const combinedAuthStr = `${userRoleStr} | ${userPermStr} | ${userNameStr}`;
  const isAdmin = combinedAuthStr.includes('admin') || combinedAuthStr.includes('it') || combinedAuthStr.includes('bgd');

  // [NEW] Kiểm tra nếu tài khoản có nhiều công đoạn nhưng chưa chọn công đoạn hoạt động (không chặn Admin)

  const hasMultipleStages = user && user.stageNames && user.stageNames.length > 1;

  const isStageSelectionRequired = hasMultipleStages && !user.activeStageName && !isAdmin;



  const handleSelectStage = (index) => {

    const name = user.stageNames[index];

    const desc = user.stageDescriptions[index] || name;

    setActiveStage(name, desc);

  };



  return (

    <div className="app-layout" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', overflowX: 'clip', maxWidth: '100vw', width: '100%', margin: 0, padding: 0, boxSizing: 'border-box', position: 'relative' }}>

      {/* Hướng dẫn người dùng mới */}
      <UserGuideTour />

      {/* Trình lắng nghe thông báo ngầm */}

      <NotificationListener />



      {/* Banner thông báo hiện lên trên đỉnh */}

      <NotificationBanner />



      {/* Menu Sidebar (Trái) - Chỉ hiện nếu không trong trạng thái chọn công đoạn */}

      {!isStageSelectionRequired && <Sidebar />}



      {/* Sidebar Thông báo (Phải) */}

      {!isStageSelectionRequired && <NotificationSidebar />}



      {/* Nội dung chính của trang */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '100%', width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
        {children}
      </main>



      {/* Màn hình chọn công đoạn (chặn toàn bộ tương tác) */}

      {isStageSelectionRequired && (

        <div style={{

          position: 'fixed',

          inset: 0,

          backgroundColor: 'rgba(59, 47, 47, 0.45)',

          backdropFilter: 'blur(8px)',

          WebkitBackdropFilter: 'blur(8px)',

          zIndex: 9999,

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          padding: '20px'

        }}>

          <div style={{

            width: '100%',

            maxWidth: '380px',

            backgroundColor: '#ffffff',

            borderRadius: '24px',

            padding: '30px 24px 24px',

            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',

            textAlign: 'center',

            animation: 'layoutModalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'

          }}>

            <div style={{

              width: '64px',

              height: '64px',

              borderRadius: '20px',

              backgroundColor: '#fbeedb',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              margin: '0 auto 20px',

              color: '#7c2d12'

            }}>

              <Layers size={32} />

            </div>



            <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>

              Chọn công đoạn

            </h3>

            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>

              Tài khoản của bạn phụ trách nhiều công đoạn. Vui lòng chọn công đoạn hiện tại để tiếp tục làm việc:

            </p>



            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>

              {user.stageDescriptions.map((desc, idx) => (

                <button

                  key={idx}

                  onClick={() => handleSelectStage(idx)}

                  style={{

                    width: '100%',

                    padding: '16px',

                    borderRadius: '16px',

                    border: '1.5px solid #e2e8f0',

                    backgroundColor: '#f8fafc',

                    color: '#1e293b',

                    fontSize: '0.95rem',

                    fontWeight: '700',

                    display: 'flex',

                    alignItems: 'center',

                    justifyContent: 'space-between',

                    cursor: 'pointer',

                    transition: 'all 0.15s ease-in-out',

                    textAlign: 'left'

                  }}

                  onMouseEnter={(e) => {

                    e.currentTarget.style.borderColor = '#7c2d12';

                    e.currentTarget.style.backgroundColor = '#fff7ed';

                  }}

                  onMouseLeave={(e) => {

                    e.currentTarget.style.borderColor = '#e2e8f0';

                    e.currentTarget.style.backgroundColor = '#f8fafc';

                  }}

                >

                  <span style={{ flex: 1, paddingRight: '8px' }}>{desc}</span>

                  <ArrowRight size={18} color="#7c2d12" />

                </button>

              ))}

            </div>



            <button

              onClick={() => {

                logout();

                window.location.href = '/login';

              }}

              style={{

                background: 'none',

                border: 'none',

                color: '#dc2626',

                fontWeight: '700',

                fontSize: '0.9rem',

                display: 'inline-flex',

                alignItems: 'center',

                gap: '6px',

                cursor: 'pointer',

                padding: '8px 16px',

                borderRadius: '8px',

                transition: 'background-color 0.2s'

              }}

              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}

              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}

            >

              <LogOut size={16} />

              Đăng xuất

            </button>

          </div>



          <style>{`

            @keyframes layoutModalSlideUp {

              from { transform: translateY(30px); opacity: 0; }

              to { transform: translateY(0); opacity: 1; }

            }

          `}</style>

        </div>

      )}

    </div>

  )

}



export default Layout

