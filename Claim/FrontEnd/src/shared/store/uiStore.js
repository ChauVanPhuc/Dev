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

  // Trạng thái Popup Dashboard LPN Crawler Toàn thời gian
  isLpnDashboardOpen: false,
  setLpnDashboardOpen: (isOpen) => set({ isLpnDashboardOpen: isOpen }),
  toggleLpnDashboard: () => set((state) => ({ isLpnDashboardOpen: !state.isLpnDashboardOpen })),



  // --- Trạng thái Xử lý PDF Khiếu nại nền (Global Background) ---
  claimIngestionProgress: {
    isOpen: false,
    title: '',
    progress: 0,
    statusText: '',
    filesCount: 0,
    isCompleted: false
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
