import { create } from 'zustand';
import apiClient from '@shared/services/api';

/**
 * notificationStore
 * Quản lý trạng thái thông báo chưa đọc toàn cục cho ứng dụng.
 */
const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  isLoading: false,

  /**
   * Truy vấn số lượng thông báo chưa đọc từ Server.
   */
  fetchUnreadCount: async (userId, targetGroup, targetStage) => {
    if (!userId) return;
    
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/notifications/unread-count-v2', {
        params: {
          user_id: userId,
          target_group: targetGroup,
          target_stage: targetStage
        }
      });
      set({ unreadCount: response.data.unread_count || 0 });
    } catch (error) {
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Đánh dấu toàn bộ thông báo hiện tại là đã xem.
   */
  markAllAsRead: async (userId, targetGroup, targetStage) => {
    if (!userId) {
      return;
    }
    
    try {
      await apiClient.post('/notifications/mark-as-read', {
        user_id: userId,
        target_group: targetGroup || '',
        target_stage: targetStage || ''
      });
      // Sau khi báo Server, reset số lượng về 0 ngay lập tức
      set({ unreadCount: 0 });
    } catch (error) {
    }
  },

  /**
   * Tăng số lượng tin chưa đọc thủ công (Dùng khi nhận được Push Notification lúc đang mở app)
   */
  incrementUnreadCount: () => {
    set((state) => ({ unreadCount: state.unreadCount + 1 }));
  },
  setUnreadCount: (count) => {
    set({ unreadCount: count });
  }
}));

export default useNotificationStore;
