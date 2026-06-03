import { create } from 'zustand'

/**
 * UI Store
 * Quản lý trạng thái giao diện người dùng (đóng/mở Sidebar, thông báo, v.v.)
 */
const useUiStore = create((set) => ({
  isSidebarOpen: false,
  isNotificationOpen: false,
  
  // Hành động đóng/mở Sidebar Menu (Trái)
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  // Hành động đóng/mở Sidebar Thông báo (Phải)
  toggleNotification: () => set((state) => ({ isNotificationOpen: !state.isNotificationOpen })),
  setNotificationOpen: (isOpen) => set({ isNotificationOpen: isOpen }),

  // --- Trạng thái Thông báo Real-time ---
  isNotificationInitialized: false, // Cờ báo hiệu đã chạy initLatestId chưa
  latestNotificationId: 0, // Lưu ID thông báo mới nhất đã nhận
  showBanner: false,       // Hiển thị thanh thông báo trên đỉnh App
  bannerMessage: '',      // Nội dung tin nhắn hiện trên banner
  
  setIsNotificationInitialized: (status) => set({ isNotificationInitialized: status }),
  setLatestNotificationId: (id) => set({ latestNotificationId: id }),
  setShowBanner: (show) => set({ showBanner: show }),
  setBannerMessage: (msg) => set({ bannerMessage: msg }),
}))

export default useUiStore
