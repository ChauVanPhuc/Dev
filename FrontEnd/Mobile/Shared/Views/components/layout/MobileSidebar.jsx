import { useState } from 'react'

import { 

  Home, 

  CalendarCheck, 

  Truck, 

  BarChart2, 

  ClipboardCheck, 

  MessageSquare, 

  Target, 

  FileText, 

  Award, 

  ChevronDown, 

  ChevronRight,

  Users,

  AlertTriangle

} from 'lucide-react'

import useUiStore from '@shared/store/uiStore'

import useAuthStore from '@modules/auth/Models/authModel'

import { useNavigate, useLocation } from 'react-router-dom'

import UserProfileCard from '../user/UserProfileCard'



import packageJson from '../../../../package.json'



// eslint-disable-next-line no-undef

const BUILT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';



/**

 * Sidebar Component

 * Menu chuyển trang phong cách Mobile ERP.

 */

const Sidebar = () => {

  const { isSidebarOpen, setSidebarOpen } = useUiStore()

  const { user, setUser } = useAuthStore()

  const navigate = useNavigate()

  const location = useLocation()

  

  // State quản lý các mục đang mở rộng (collapsible) - mặc định đóng

  const [expandedItems, setExpandedItems] = useState([])

  const [showProfile, setShowProfile] = useState(false) // Trạng thái hiện/ẩn card thông tin tài khoản

  const [appVersion] = useState(BUILT_VERSION)



  const toggleExpand = (id) => {

    setExpandedItems(prev => 

      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]

    )

  }



  // [NEW] Kiểm tra quyền hạn an toàn tuyệt đối

  const userRoleStr = (user?.role_name || user?.role_description || '').toLowerCase();

  const userPermStr = (user?.permission_name || user?.permission_description || '').toLowerCase();

  const userNameStr = (user?.full_name || user?.username || '').toLowerCase();

  const combinedAuthStr = `${userRoleStr} | ${userPermStr} | ${userNameStr}`;

  

  // Kiểm tra QC: có chữ qc, kiểm tra, hoặc chất lượng

  const isQC = combinedAuthStr.includes('qc') || combinedAuthStr.includes('kiểm tra') || combinedAuthStr.includes('chất lượng');

  // Kiểm tra Nhân viên: có chữ nhân viên hoặc staff

  const isStaff = combinedAuthStr.includes('nhân viên') || combinedAuthStr.includes('staff') || combinedAuthStr.includes('nv');

  const isAdmin = combinedAuthStr.includes('admin');

  const isQCStaff = isQC && isStaff && !isAdmin;



  const menuItems = [

    { id: 'dashboard', label: 'MHC', icon: Home, path: '/dashboard' },

    { id: 'plan', label: 'Theo dõi kế hoạch', icon: CalendarCheck, path: '/plan' },

    { id: 'delivery_info', label: 'Thông tin bàn giao', icon: ClipboardCheck, path: '/delivery-info' },

    { 

      id: 'reports', 

      label: 'Thống kê - báo cáo', 

      icon: BarChart2, 

      hasSub: true,

      items: [

        { label: 'Báo cáo chất lượng', path: '#' },

        { label: 'Báo cáo sản xuất', path: '#' }

      ] 

    },

    { 

      id: 'inspections', 

      label: 'Phiếu kiểm tra', 

      icon: ClipboardCheck, 

      hasSub: true,

      items: [

        { label: 'Kiểm tra hằng ngày', path: '/inspection-daily' },

        { label: 'Kiểm tra theo công đoạn', path: '/inspection-stage' }

      ] 

    },

    { id: 'feedback', label: 'Góp ý cải tiến', icon: MessageSquare, path: '/feedback' },

    { 

      id: 'kpi', 

      label: 'Theo dõi KPI', 

      icon: Target, 

      hasSub: true,

      items: [

        { label: 'Theo dõi KPI', path: '/kpi' },

        { label: 'Danh sách nhân sự', path: '/kpi-staff' }

      ] 

    },

    { id: 'logs', label: 'Nhật ký kiểm tra', icon: FileText, path: '/logs' },

    { id: 'awards', label: 'Khen thưởng - kỷ luật', icon: Award, path: '/awards' },

    { id: 'capa', label: 'Theo dõi CAPA', icon: AlertTriangle, path: '/capa-list' },

  ].filter(item => {

    // Nếu là Nhân viên QC, chỉ hiển thị: Theo dõi kế hoạch, Thông tin bàn giao

    if (isQCStaff) {

      return item.id === 'plan' || item.id === 'delivery_info';

    }

    return true;

  });



  const isActive = (path) => location.pathname === path

  const isExpanded = (id) => expandedItems.includes(id)



  const handleNavigate = (path) => {

    navigate(path)

    setSidebarOpen(false) // Đóng sidebar sau khi chuyển trang

  }



  return (

    <>

      {/* Overlay: Làm mờ màn hình khi mở sidebar */}

      {isSidebarOpen && (

        <div 

          className="sidebar-overlay"

          onClick={() => setSidebarOpen(false)}

          style={{

            position: 'absolute',

            inset: 0,

            backgroundColor: 'rgba(0,0,0,0.4)',

            zIndex: 100

          }}

        />

      )}



      {/* Sidebar Content */}

      <div 

        className="sidebar-container"

        style={{

          position: 'absolute',

          left: isSidebarOpen ? 0 : '-280px',

          top: 0,

          bottom: 0,

          width: '280px',

          backgroundColor: '#fff',

          zIndex: 101,

          display: 'flex',

          flexDirection: 'column',

          boxShadow: '4px 0 15px rgba(0,0,0,0.1)',

          transition: 'left 0.25s ease-in-out'

        }}

      >

        {/* User Header - Nút avatar gọn theo ảnh thiết kế */}

        <div

          style={{

            padding: '16px 20px',

            background: 'linear-gradient(135deg, var(--primary-color) 0%, #6b3a25 100%)',

            display: 'flex',

            justifyContent: 'center'

          }}

        >

          {/* Nhấn vào avatar để mở thông tin tài khoản */}

          <div

            onClick={() => setShowProfile(true)}

            style={{

              display: 'inline-flex',

              alignItems: 'center',

              gap: '10px',

              cursor: 'pointer',

              backgroundColor: 'rgba(255,255,255,0.12)',

              border: '1px solid rgba(255,255,255,0.25)',

              borderRadius: '50px',

              padding: '8px 16px 8px 8px',

              backdropFilter: 'none'

            }}

          >

            {/* Icon avatar - Hiện chữ viết tắt thông minh của Vai trò */}

            <div style={{

              width: '32px',

              height: '32px',

              borderRadius: '50%',

              backgroundColor: 'rgba(255,255,255,0.2)',

              border: '1.5px solid rgba(255,255,255,0.5)',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              fontSize: '0.75rem',

              fontWeight: '900',

              color: '#fff',

              flexShrink: 0

            }}>

              {(() => {

                const role = (user?.role_name || user?.role_description || '').toLowerCase();

                if (role.includes('chất lượng') || role.includes('qc')) return 'QC';

                if (role.includes('sản xuất') || role.includes('sx')) return 'SX';

                if (role.includes('admin')) return 'AD';

                return (user?.role_name || user?.role_description || 'U').charAt(0).toUpperCase();

              })()}

            </div>

            {/* Tên đầy đủ */}

            <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>

              {user?.full_name || user?.username || 'Người dùng'}

            </span>

          </div>

        </div>



        {/* Hiển thị UserProfileCard khi nhấn vào avatar */}

        {showProfile && <UserProfileCard onClose={() => setShowProfile(false)} />}



        {/* Menu Items Section */}

        <div 

          className="sidebar-menu"

          style={{

            flex: 1,

            overflowY: 'auto',

            padding: '15px 10px'

          }}

        >

          {menuItems.map((item) => (

            <div key={item.id}>

              <div 

                onClick={() => item.hasSub ? toggleExpand(item.id) : handleNavigate(item.path)}

                style={{

                  padding: '12px 15px',

                  borderRadius: '10px',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '15px',

                  color: isActive(item.path) ? '#a01c1c' : '#444',

                  backgroundColor: isActive(item.path) ? '#fef2f2' : 'transparent',

                  marginBottom: '4px',

                  cursor: 'pointer',

                  fontWeight: (isActive(item.path) || isExpanded(item.id)) ? '700' : '500'

                }}

              >

                <item.icon size={20} color={isActive(item.path) ? '#a01c1c' : '#555'} />

                <span style={{ flex: 1 }}>{item.label}</span>

                {item.hasSub && (

                  isExpanded(item.id) 

                    ? <ChevronDown size={18} color="#444" strokeWidth={3} /> 

                    : <ChevronRight size={18} color="#999" />

                )}

              </div>

              

              {/* Hiển thị menu con nếu item đang được mở rộng */}

              {item.hasSub && isExpanded(item.id) && (

                <div style={{ 

                  paddingLeft: '50px', 

                  paddingBottom: '10px',

                  display: 'flex',

                  flexDirection: 'column',

                  gap: '12px',

                  marginTop: '5px'

                }}>

                  {item.items.map(sub => (

                    <div 

                      key={sub.label} 

                      onClick={(e) => {

                        e.stopPropagation();

                        handleNavigate(sub.path);

                      }}

                      style={{ 

                        padding: '8px 0',

                        fontSize: '0.95rem', 

                        color: isActive(sub.path) ? '#a01c1c' : '#666',

                        fontWeight: isActive(sub.path) ? '700' : '500',

                        cursor: 'pointer',

                        width: '100%'

                      }}

                    >

                      {sub.label}

                    </div>

                  ))}

                </div>

              )}

            </div>

          ))}

        </div>



        {/* Footer Section */}

        <div 

          className="sidebar-footer"

          style={{

            padding: '15px',

            textAlign: 'center',

            fontSize: '0.8rem',

            color: '#a01c1c',

            borderTop: '1px solid #eee',

            display: 'flex',

            flexDirection: 'column',

            gap: '4px'

          }}

        >

          <span>2026 - xây dựng bởi VINA G7</span>

          <span style={{ fontSize: '0.7rem', color: '#999' }}>Phiên bản v{appVersion}</span>

        </div>

      </div>

    </>

  )

}



export default Sidebar

