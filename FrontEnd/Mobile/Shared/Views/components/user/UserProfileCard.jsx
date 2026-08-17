import React, { useState, useEffect } from 'react'
import { X, Shield, Activity, Building2, Factory, LogOut, Check } from 'lucide-react'
import useAuthStore from '@modules/auth/Models/authModel'
import { useNavigate } from 'react-router-dom'
import useUiStore from '@shared/store/uiStore'

/**
 * UserProfileCard Component
 * Hiển thị cấu trúc phân quyền:
 * 1. Nhà Máy -> 2. Phòng Ban -> 3. Bộ Phận -> 4. Vị Trí / Chức Vụ (có thể Đổi)
 */
const UserProfileCard = ({ onClose }) => {
  const { user, setUser, setActivePosition, refreshUserProfile } = useAuthStore()
  const { setSidebarOpen } = useUiStore()
  const navigate = useNavigate()
  const [showPositionModal, setShowPositionModal] = useState(false)

  // Tự động đồng bộ thông tin mới nhất từ máy chủ khi mở Profile
  useEffect(() => {
    if (typeof refreshUserProfile === 'function') {
      refreshUserProfile().catch(err => {
        console.warn('Auto-refresh profile error:', err)
      })
    }
  }, [])

  // Danh sách các vị trí của tài khoản
  const positionsList = (() => {
    if (Array.isArray(user?.permissions_list) && user.permissions_list.length > 0) {
      return user.permissions_list
    }
    if (Array.isArray(user?.permission_names) && user.permission_names.length > 0) {
      return user.permission_names.map((name, idx) => ({
        id: (user.permission_ids && user.permission_ids[idx]) || idx + 1,
        name: name,
        description: (user.permission_descriptions && user.permission_descriptions[idx]) || name
      }))
    }
    if (user?.permission_description || user?.permission_name) {
      return [{
        id: user.permission_id || 1,
        name: user.permission_name || user.permission_description,
        description: user.permission_description || user.permission_name
      }]
    }
    return []
  })()

  // Vị trí đang hoạt động
  const activePos = (() => {
    if (user?.activePositionDescription || user?.activePositionName) {
      return user.activePositionDescription || user.activePositionName
    }
    if (positionsList.length > 0) {
      return positionsList[0].description || positionsList[0].name
    }
    return user?.permission_description || user?.permission_name || 'Chưa phân vị trí'
  })()

  const activePosId = user?.activePositionId || (positionsList.length > 0 ? positionsList[0].id : null)

  const handleSelectPosition = (pos) => {
    setActivePosition(pos.id, pos.name, pos.description || pos.name)
    setShowPositionModal(false)
  }

  // 1. Nhà Máy
  const factoryName = user?.factory_name || user?.factoryName || (user?.factory_id ? `Nhà Máy ${user.factory_id}` : (user?.factoryId ? `Nhà Máy ${user.factoryId}` : 'Chưa phân nhà máy'))

  // 2. Phòng Ban
  const roleName = user?.role_description || user?.role_name || user?.roleDescription || user?.roleName || 'Chưa phân phòng ban'

  // 3. Bộ Phận
  const departmentName = user?.department_name || user?.departmentName || user?.department || 'Chưa phân bộ phận'

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
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

        {/* Body - Thông tin Phân Quyền (Nhà Máy -> Phòng Ban -> Bộ Phận -> Vị Trí) */}
        <div style={{ padding: '16px 20px 0' }}>
          {/* 1. NHÀ MÁY */}
          <InfoRow
            icon={<Factory size={18} color="#ea580c" />}
            label="1. NHÀ MÁY"
            value={factoryName}
            iconBg="#fff7ed"
          />

          {/* 2. PHÒNG BAN */}
          <InfoRow
            icon={<Shield size={18} color="#78523b" />}
            label="2. PHÒNG BAN"
            value={roleName}
            iconBg="#fdf2e9"
          />

          {/* 3. BỘ PHẬN */}
          <InfoRow
            icon={<Building2 size={18} color="#2563eb" />}
            label="3. BỘ PHẬN"
            value={departmentName}
            iconBg="#eff6ff"
          />

          {/* 4. VỊ TRÍ / CHỨC VỤ (Hỗ trợ đổi vị trí khi có nhiều vị trí) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 0',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Activity size={18} color="#16a34a" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                4. VỊ TRÍ / CHỨC VỤ
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activePos}
                </span>
                {positionsList.length > 1 && (
                  <button
                    onClick={() => setShowPositionModal(true)}
                    style={{
                      background: '#166534',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      flexShrink: 0
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
        <div style={{ padding: '16px 20px 20px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '13px',
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

      {/* Modal chuyển đổi vị trí làm việc (khi có nhiều vị trí) */}
      {showPositionModal && (
        <>
          <div
            onClick={() => setShowPositionModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 300
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            maxWidth: 'calc(100vw - 40px)',
            backgroundColor: '#fff',
            borderRadius: '20px',
            padding: '20px',
            zIndex: 301,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#1e293b' }}>
                Chọn Vị Trí Làm Việc
              </div>
              <button
                onClick={() => setShowPositionModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={14} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
              {positionsList.map((pos) => {
                const isSelected = String(pos.id) === String(activePosId) || (pos.description || pos.name) === activePos
                return (
                  <button
                    key={pos.id}
                    onClick={() => handleSelectPosition(pos)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: isSelected ? '#166534' : '#1e293b' }}>
                        {pos.description || pos.name}
                      </div>
                      {pos.name && pos.description && pos.name !== pos.description && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Mã: {pos.name}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check size={18} color="#16a34a" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

/**
 * InfoRow - Component hiển thị từng dòng thông tin (icon + label + value)
 */
const InfoRow = ({ icon, label, value, iconBg }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 0',
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
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', wordBreak: 'break-word' }}>
        {value}
      </div>
    </div>
  </div>
)

export default UserProfileCard
