import { useEffect, useState } from 'react'
import { X, Bell, User, Clock, AlertCircle, Info } from 'lucide-react'
import useUiStore from '@shared/store/uiStore'
import apiClient from '@shared/services/api'
import useAuthStore from '@modules/auth/Models/authModel'
import useNotificationStore from '@shared/store/notificationStore' // [NEW]

/**
 * NotificationSidebar Component
 * Thanh thông báo trượt từ bên phải vào.
 */
const NotificationSidebar = () => {
  const { isNotificationOpen, setNotificationOpen } = useUiStore()
  const user = useAuthStore((state) => state.user) // Lấy từ store/authStore chuẩn
  
  // [NEW] Lấy hàm đánh dấu đã xem
  const { markAllAsRead } = useNotificationStore()

  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // 1. Theo dõi trạng thái đóng/mở Sidebar
  useEffect(() => {
    if (isNotificationOpen && user) {
      // Khi mở sidebar, vừa tải tin mới vừa đánh dấu là đã xem hết
      fetchNotifications();
      
      const userStage = user.activeStageDescription || user.activeStageName || user.stage_description || user.stage_name;
      markAllAsRead(user.id, user.role_name, userStage);
    }
  }, [isNotificationOpen, user])

  // 2. Hàm lấy danh sách thông báo từ máy chủ
  const fetchNotifications = async () => {
    // Chỉ lấy thông báo nếu người dùng đã đăng nhập
    if (user) {
      try {
        setIsLoading(true);
        // Ưu tiên sử dụng Mô tả công đoạn (stage_description), nếu không có thì dùng Tên công đoạn (stage_name)
        // Lấy thông tin từ User Store để lọc dữ liệu thông báo từ server
        const userStage = user.activeStageDescription || user.activeStageName || user.stage_description || user.stage_name;
        // [CHUẨN HÓA] Map tên vai trò sang mã Group (SX/QC) để khớp Backend
        const rawRole = user?.role_name || '';
        let groupParam = rawRole;
        if (rawRole.includes('Sản xuất') || rawRole === 'SX') {
          groupParam = 'SX';
        } else if (rawRole.includes('Kiểm tra') || rawRole.includes('QC') || rawRole.includes('Chất lượng') || rawRole.includes('Quản lý')) {
          groupParam = 'QC';
        }
        
        // Gọi API lấy thông báo đã được lọc Riêng cho nhóm và Đúng công đoạn của người dùng này
        const response = await apiClient.get('/notifications/', {
          params: {
            target_group: groupParam,
            target_stage: userStage
          }
        });
        
        // Cập nhật danh sách hiển thị
        setNotifications(response.data);

        // Đánh dấu đã đọc để xóa số trên chuông
         if (response.data.length >= 0) {
            apiClient.post('/notifications/mark-as-read', {
              user_id: user.id,
              target_group: groupParam,
              target_stage: userStage
            }).catch(() => {});
         }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Hàm format thời gian đơn giản
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + 
           ' ' + date.toLocaleDateString('vi-VN')
  }

  return (
    <>
      {/* Overlay: Chỉ hiện khi mở sidebar */}
      {isNotificationOpen && (
        <div
          onClick={() => setNotificationOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 15000
          }}
        />
      )}

      {/* Sidebar Content: Luôn mount để tránh gánh nặng re-render, chỉ thay đổi vị trí right */}
      <div
        style={{
          position: 'absolute',
          right: isNotificationOpen ? 0 : '-100%',
          top: 0,
          bottom: 0,
          width: '85%',
          maxWidth: '350px',
          backgroundColor: '#fff',
          zIndex: 15001,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
          borderRadius: '20px 0 0 20px',
          // Không thêm transition để đảm bảo "nhẹ" và "tức thì" theo yêu cầu
        }}
      >
        {/* Header của Sidebar */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #f1f5f9', 
          display: 'flex', 
          flexDirection: 'row-reverse',
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #78523b 0%, #32251e 100%)',
          borderRadius: '20px 0 0 0',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>Thông báo</span>
            <Bell size={20} />
          </div>
          <button 
            onClick={() => setNotificationOpen(false)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: '#fff', padding: '5px', display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* List thông báo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải tin tức...</div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Hiện chưa có thông báo nào.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((noti) => (
                <div 
                  key={noti.id}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: noti.priority_status === 'Khẩn cấp' ? '#fef2f2' : '#f8fafc',
                    border: noti.priority_status === 'Khẩn cấp' ? '1px solid #fee2e2' : '1px solid #f1f5f9',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: '800', 
                      padding: '3px 8px', 
                      borderRadius: '6px',
                      backgroundColor: noti.priority_status === 'Khẩn cấp' ? '#ef4444' : '#64748b',
                      color: '#fff'
                    }}>
                      {noti.priority_status}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.75rem' }}>
                      <Clock size={12} />
                      {formatTime(noti.created_at)}
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '0.9rem', color: '#1e293b', margin: '0 0 10px 0', lineHeight: '1.5', fontWeight: '500' }}>
                    {noti.content}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={12} color="#64748b" />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                      {noti.announcer_id === 1 ? 'Hệ thống G7' : 'Quản lý'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer của Sidebar */}
        <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <button 
              onClick={fetchNotifications}
              style={{ background: 'none', border: 'none', color: '#78523b', fontWeight: '700', fontSize: '0.9rem' }}
            >
              Làm mới danh sách
            </button>
        </div>
      </div>
    </>
  )
}

export default NotificationSidebar
