import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import apiClient from './api';

/**
 * Dịch vụ quản lý thông báo đẩy (Push Notifications) qua Firebase.
 * Chạy trên các nền tảng di động Android và iOS.
 */
class PushNotificationService {
  /**
   * Khởi tạo và đăng ký thiết bị để nhận thông báo.
   * Cần gọi hàm này ngay sau khi người dùng đăng nhập thành công để gắn Token với ID người dùng.
   */
  async init(userId) {
    // 1. Kiểm tra môi trường: Chỉ chạy trên điện thoại thật (Native)
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    
    try {
      // 2. Kiểm tra và yêu cầu quyền thông báo từ người dùng
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      // Nếu người dùng từ chối quyền thì dừng lại
      if (permStatus.receive !== 'granted') {
        return;
      }

      // 3. Đăng ký thiết bị với hệ thống Firebase (FCM)
      await PushNotifications.register();

      // 4. Lắng nghe sự kiện đăng ký thành công để nhận mã TOKEN
      PushNotifications.addListener('registration', async (token) => {
        
        // 5. Gửi mã Token này lên server để lưu vào database
        try {
          await apiClient.post('/accounts/update-fcm-token', {
            user_id: userId,
            fcm_token: token.value
          });
        } catch (err) {
        }
      });

      // Lắng nghe lỗi đăng ký (nếu có)
      PushNotifications.addListener('registrationError', (error) => {
      });

      // 6. Xử lý khi thông báo ĐẾN (App đang mở - Foreground)
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        // Lưu ý: Firebase sẽ tự hiện thông báo trên khay hệ thống nếu cấu hình Android chuẩn
      });

      // 7. Xử lý khi người dùng NHẤN vào thông báo (App đang đóng hoặc chạy ngầm)
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        try {
          const data = action.notification?.data || {};
          const targetRoute = data.route_path || data.screen || data.url;

          if (targetRoute && targetRoute !== '#') {
            // Chuyển hướng Hash-based hoặc Router URL
            if (window.location.hash) {
              window.location.hash = `#${targetRoute}`;
            } else {
              window.location.href = targetRoute.startsWith('/') ? targetRoute : `/${targetRoute}`;
            }
          }
        } catch (e) {
          console.error("Lỗi điều hướng Deep-link khi nhấp Push Notification:", e);
        }
      });

    } catch (error) {
    }
  }
}

export default new PushNotificationService();
