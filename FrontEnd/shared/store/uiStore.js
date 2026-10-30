import { create } from 'zustand'

/**
 * UI Store
 * Quản lý trạng thái giao diện người dùng (đóng/mở Sidebar, thông báo, v.v.)
 */
const useUiStore = create((set) => ({
  isSidebarOpen: false,
  isNotificationOpen: false,

  // --- Điều khiển Sidebar (Menu trái) & Sidebar Thông báo (phải) ---
  setSidebarOpen: (open) => set({ isSidebarOpen: !!open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setNotificationOpen: (open) => set({ isNotificationOpen: !!open }),
  toggleNotification: () => set((state) => ({ isNotificationOpen: !state.isNotificationOpen })),
  
  // --- Quản lý Theme Giao diện (Light / Dark Obsidian) ---
  theme: (typeof window !== 'undefined' && localStorage.getItem('smartflow_theme')) || 'light',
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartflow_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      window.dispatchEvent(new CustomEvent('smartflow-theme-changed', { detail: { theme: nextTheme } }));
    }
    return { theme: nextTheme };
  }),
  setTheme: (theme) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartflow_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      window.dispatchEvent(new CustomEvent('smartflow-theme-changed', { detail: { theme } }));
    }
    return { theme };
  }),

  // --- Trạng thái Thông báo Real-time ---
  isNotificationInitialized: false, // Cờ báo hiệu đã chạy initLatestId chưa
  latestNotificationId: 0, // Lưu ID thông báo mới nhất đã nhận
  showBanner: false,       // Hiển thị thanh thông báo trên đỉnh App
  bannerMessage: '',      // Nội dung tin nhắn hiện trên banner
  
  setIsNotificationInitialized: (status) => set({ isNotificationInitialized: status }),
  setLatestNotificationId: (id) => set({ latestNotificationId: id }),
  setShowBanner: (show) => set({ showBanner: show }),
  setBannerMessage: (msg) => set({ bannerMessage: msg }),

  // --- Trạng thái Xử lý PDF Khiếu nại nền (Global Background) ---
  claimIngestionProgress: {
    isOpen: false,
    title: '',
    progress: 0,
    statusText: '',
    filesCount: 0
  },
  claimSuccessSummary: {
    isOpen: false,
    batchId: '',
    claimsCount: 0,
    photoCount: 0,
    warningsCount: 0,
    warnings: [],
    fileStats: []
  },
  claimImportError: {
    isOpen: false,
    message: ''
  },

  setClaimIngestionProgress: (progressState) => set((state) => ({
    claimIngestionProgress: typeof progressState === 'function' ? progressState(state.claimIngestionProgress) : progressState
  })),
  setClaimSuccessSummary: (summaryState) => set((state) => ({
    claimSuccessSummary: typeof summaryState === 'function' ? summaryState(state.claimSuccessSummary) : summaryState
  })),
  setClaimImportError: (errorState) => set((state) => ({
    claimImportError: typeof errorState === 'function' ? errorState(state.claimImportError) : errorState
  }))
}))

export default useUiStore
