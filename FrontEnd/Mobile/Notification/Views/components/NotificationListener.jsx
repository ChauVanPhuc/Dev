import { useEffect, useRef } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import useUiStore from '@shared/store/uiStore'
import apiClient from '@shared/services/api'
import useAuthStore from '@mobile/Auth/Models/authModel' // [FIX] Sửa đường dẫn chuẩn
import useNotificationStore from '@shared/store/notificationStore' // [NEW]

/**
 * NotificationListener Component (Invisible)
 * Chạy ngầm để định kỳ kiểm tra thông báo mới từ Backend (Smart Polling).
 * Khi phát hiện tin mới, nó sẽ kích hoạt Banner và Thông báo hệ thống.
 */
const NotificationListener = () => {
  const { 
    latestNotificationId, 
    setLatestNotificationId, 
    isNotificationInitialized,
    setIsNotificationInitialized,
    setShowBanner, 
    setBannerMessage,
    isNotificationOpen
  } = useUiStore()
  
  const user = useAuthStore((state) => state.user) // [FIX] Cách lấy user chuẩn
  const { incrementUnreadCount } = useNotificationStore() // [NEW] Hàm tăng chấm đỏ
  const pollingTimer = useRef(null)

  useEffect(() => {
    // Xin quyền thông báo ngay khi component mount (thường là sau khi login)
    requestPermission()
    
    // Chỉ lắng nghe khi người dùng đã đăng nhập
    if (user) {
      // Thực hiện kiểm tra lần đầu tiên để lấy ID hiện tại
      initLatestId()

      // Thiết lập vòng lặp kiểm tra mỗi 15 giây
      pollingTimer.current = setInterval(() => {
        checkNewNotifications()
      }, 15000)
    }

    return () => {
      if (pollingTimer.current) clearInterval(pollingTimer.current)
    }
  }, [user])

  const requestPermission = async () => {
    try {
      const status = await LocalNotifications.checkPermissions()
      if (status.display !== 'granted') {
        await LocalNotifications.requestPermissions()
      }
    } catch (e) {
    }
  }

  const scheduleNotification = async (message) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'G7 Smart Flow - Thông báo',
            body: message,
            id: Math.floor(Math.random() * 10000),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'notification.wav',
            extra: { data: 'new_delivery' }
          }
        ]
      })
    } catch (e) {
    }
  }

  const initLatestId = async () => {
    try {
      const groupParam = user?.role_name || ''
      const stageParam = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || ''
      const response = await apiClient.get('/notifications/', {
        params: {
          target_group: groupParam,
          target_stage: stageParam
        }
      })
      if (response.data && response.data.length > 0) {
        // Lấy ID của thông báo mới nhất (đã được sắp xếp giảm dần ở backend)
        setLatestNotificationId(response.data[0].id)
      }
    } catch (error) {
    } finally {
      // Dù có hay không có thông báo, cũng cần đánh dấu là đã khởi tạo
      setIsNotificationInitialized(true)
    }
  }

  const checkNewNotifications = async () => {
    // [FIX] Lấy state mới nhất trực tiếp từ store thay vì dùng biến closure cũ bị đóng băng
    const currentState = useUiStore.getState()
    
    // Không hiện banner nếu người dùng đang mở sidebar thông báo
    if (currentState.isNotificationOpen) return
    
    // Sử dụng cờ isNotificationInitialized độc lập, không phụ thuộc giá trị 0
    if (!currentState.isNotificationInitialized) {
      initLatestId()
      return
    }

    if (!user) return

    try {
      // [CHUẨN HÓA] Map tên vai trò sang mã Group (SX/QC) để khớp Backend
      const rawRole = user?.role_name || ''
      let groupParam = rawRole
      if (rawRole.includes('Sản xuất') || rawRole === 'SX') {
        groupParam = 'SX'
      } else if (rawRole.includes('Kiểm tra') || rawRole.includes('QC') || rawRole.includes('Chất lượng') || rawRole.includes('Quản lý')) {
        groupParam = 'QC'
      }

      const stageParam = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || ''
      
      const { setUnreadCount } = useNotificationStore.getState()

      // 1. Cập nhật số lượng thông báo ngay lập tức
      apiClient.get('/notifications/unread-count-v2', {
        params: {
          user_id: user.id,
          target_group: groupParam,
          target_stage: stageParam
        }
      }).then(res => {
        if (res.data && res.data.unread_count !== undefined) {
          setUnreadCount(res.data.unread_count);
        }
      }).catch(err => {
      })

      // 2. Kiểm tra danh sách để hiện Banner
      const response = await apiClient.get('/notifications/', {
        params: {
          target_group: groupParam,
          target_stage: stageParam
        }
      })
      
      if (response.data && response.data.length > 0) {
        const latest = response.data[0]
        if (latest.id > currentState.latestNotificationId) {
          setLatestNotificationId(latest.id)
          setBannerMessage(latest.content)
          setShowBanner(true)
          scheduleNotification(latest.content)
        }
      }
    } catch (error) {
    }
  }

  return null // Thành phần này không hiển thị gì cả
}

export default NotificationListener
