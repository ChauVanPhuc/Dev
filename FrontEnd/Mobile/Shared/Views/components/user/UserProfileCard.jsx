import React from 'react'
import { X, Shield, Activity, MapPin, LogOut, Layers } from 'lucide-react'
import useAuthStore from '@modules/auth/Models/authModel'
import { useNavigate } from 'react-router-dom'
import useUiStore from '@shared/store/uiStore'

/**
 * UserProfileCard Component
 * Bottom sheet hiển thị thông tin chi tiết tài khoản khi nhấn vào avatar ở Sidebar.
 * Có thể tái sử dụng ở bất kỳ màn hình nào.
 */
const UserProfileCard = ({ onClose }) => {
  const { user, setUser, setActiveStage } = useAuthStore()
  const { setSidebarOpen } = useUiStore()
  const navigate = useNavigate()

  const userRoleStr = [
    user?.permission_description,
    user?.permission_name,
    user?.role_description,
    user?.role_name,
    user?.full_name,
    user?.username
  ].filter(Boolean).join(' ').toLowerCase().normalize('NFC');
  const isAdmin = userRoleStr.includes('admin');

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    // [FIX] Xóa thông tin ghi nhớ để tránh vòng lặp tự động đăng nhập sau khi đăng xuất
    localStorage.removeItem('smartflow_remembered_credentials')
    setSidebarOpen(false)
    onClose()
    navigate('/login')
  }

  // Lấy chữ cái đầu để hiển thị Avatar
  const initials = (user?.full_name || user?.username || 'U').charAt(0).toUpperCase()

  return (
    <>
      {/* Overlay nền mờ */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 200,
          backdropFilter: 'blur(3px)'
        }}
      />

      {/* Card thông tin tài khoản */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: '#fff',
        borderRadius: '24px',
        overflow: 'hidden',
        zIndex: 201,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)'
      }}>
        {/* Header nâu - Avatar + Tên + Mã NV */}
        <div style={{
          background: 'linear-gradient(145deg, #5c3720 0%, #78523b 100%)',
          padding: '32px 20px 24px',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Nút đóng */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          {/* Avatar tròn bo góc */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            fontSize: '2rem',
            color: '#fff',
            fontWeight: '900'
          }}>
            {initials}
          </div>

          {/* Tên người dùng */}
          <div style={{ color: '#fff', fontWeight: '800', fontSize: '1.3rem', marginBottom: '6px' }}>
            {user?.full_name || user?.username || 'Người dùng'}
          </div>

          {/* Mã nhân viên + SmartFlow Member */}
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {user?.employee_id && <span>#{user.employee_id}</span>}
            {user?.employee_id && <span>•</span>}
            <span>SmartFlow Member</span>
          </div>
        </div>

        {/* Body - Thông tin chi tiết */}
        <div style={{ padding: '20px 20px 0' }}>
          {/* Vai trò hiện tại */}
          <InfoRow
            icon={<Shield size={18} color="#78523b" />}
            label="VAI TRÒ HIỆN TẠI"
            value={user?.role_description || user?.role_name || 'Chưa phân công'}
            iconBg="#fdf2e9"
          />

          {/* Quyền hạn truy cập */}
          <InfoRow
            icon={<Activity size={18} color="#16a34a" />}
            label="QUYỀN HẠN TRUY CẬP"
            value={user?.permission_description || user?.permission_name || 'Chưa phân quyền'}
            iconBg="#f0fdf4"
          />

          {/* Công đoạn quản lý */}
          <InfoRow
            icon={<MapPin size={18} color="#2563eb" />}
            label="CÔNG ĐOẠN QUẢN LÝ"
            value={user?.stage_description || user?.stage_name || 'Chưa phân công đoạn'}
            iconBg="#eff6ff"
          />

          {/* Công đoạn hoạt động */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 0',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#fff7ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Layers size={18} color="#ea580c" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                CÔNG ĐOẠN HOẠT ĐỘNG
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>{user?.activeStageDescription || user?.activeStageName || 'Chưa chọn'}</span>
                {(isAdmin || (user?.stageNames && user.stageNames.length > 1)) && (
                  <button
                    onClick={() => {
                      setActiveStage('', '');
                      onClose();
                    }}
                    style={{
                      background: '#7c2d12',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Đổi
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nút đăng xuất */}
        <div style={{ padding: '20px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#fff5f5',
              border: '1.5px solid #fecaca',
              borderRadius: '14px',
              color: '#dc2626',
              fontWeight: '700',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'backgroundColor 0.2s ease, borderColor 0.2s ease'
            }}
          >
            <LogOut size={18} />
            Đăng xuất tài khoản
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * InfoRow - Component hiển thị từng dòng thông tin (icon + label + value)
 * Dùng nội bộ trong UserProfileCard
 */
const InfoRow = ({ icon, label, value, iconBg }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 0',
    borderBottom: '1px solid #f1f5f9'
  }}>
    <div style={{
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      backgroundColor: iconBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>
        {value}
      </div>
    </div>
  </div>
)

export default UserProfileCard
