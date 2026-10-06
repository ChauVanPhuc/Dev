/**
 * File: AuthModel.js
 * Quản lý trạng thái xác thực và thông tin người dùng bằng Zustand.
 */
import * as zustandModule from 'zustand'
const create = zustandModule.create || zustandModule.default || zustandModule
import axios from 'axios'
import apiClient, { API_URL } from '@shared/services/api'

/**
 * Store lưu trữ thông tin đăng nhập toàn cục
 */
const getInitialUser = () => {
  try {
    const saved = localStorage.getItem('smartflow_user')
    return saved ? JSON.parse(saved) : null
  } catch (e) {
    console.error('Error parsing user from localStorage', e)
    return null
  }
}

const getInitialPermissions = () => {
  try {
    const saved = localStorage.getItem('smartflow_active_permissions')
    return saved ? JSON.parse(saved) : {}
  } catch (e) {
    console.error('Error parsing permissions from localStorage', e)
    return {}
  }
}

const isValidToken = (token) => {
  return !!token && token !== 'null' && token !== 'undefined' && token !== ''
}

const useAuthStore = create((set, get) => ({
  // Khởi tạo từ localStorage nếu có
  user: getInitialUser(),
  token: localStorage.getItem('token') || null,
  isAuthenticated: isValidToken(localStorage.getItem('token')),
  permissions: getInitialPermissions(),

  /**
   * Cập nhật thông tin người dùng và token
   * @param {Object|null} user - Thông tin người dùng hoặc null để logout
   * @param {string|null} token - JWT Token
   * @param {string|Object|null} permissions - Quyền màn hình (JSON String hoặc Object)
   */
  setUser: (user, token = null, permissions = null) => {
    if (user) {
      localStorage.setItem('smartflow_user', JSON.stringify(user))
      if (token) {
        localStorage.setItem('token', token)
      }
      
      let nextPermissions = {}
      if (permissions) {
        const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions)
        localStorage.setItem('smartflow_active_permissions', permsStr)
        nextPermissions = typeof permissions === 'string' ? JSON.parse(permissions) : permissions
      } else {
        nextPermissions = getInitialPermissions()
      }

      set((state) => ({ 
        user, 
        token: token || state.token, 
        isAuthenticated: isValidToken(token || state.token),
        permissions: nextPermissions
      }))
    } else {
      // Logout
      localStorage.removeItem('smartflow_user')
      localStorage.removeItem('token')
      localStorage.removeItem('smartflow_active_permissions')
      set({ user: null, token: null, isAuthenticated: false, permissions: {} })
    }
  },

  /**
   * Đồng bộ lại thông tin tài khoản và quyền mới nhất từ server
   */
  refreshUserProfile: async () => {
    const currentUser = get().user
    if (!currentUser?.id && !currentUser?.username) return null

    try {
      // 1. Lấy chi tiết user mới nhất (hỗ trợ cả id và username)
      let userRes
      if (currentUser.id) {
        userRes = await apiClient.get(`/accounts/${currentUser.id}`)
      } else if (currentUser.username) {
        userRes = await apiClient.get(`/accounts/by-username/${encodeURIComponent(currentUser.username)}`)
      }
      
      if (!userRes?.data) return null

      const userData = userRes.data
      const updatedUser = {
        ...currentUser,
        ...userData,
        // Giữ lại activeStage nếu đang chọn
        activeStageName: currentUser.activeStageName || userData.stage_name?.split('|')[0]?.trim() || '',
        activeStageDescription: currentUser.activeStageDescription || userData.stage_description?.split('|')[0]?.trim() || '',
        // Giữ lại activePosition nếu đang chọn
        activePositionName: currentUser.activePositionName || userData.permission_name || '',
        activePositionDescription: currentUser.activePositionDescription || userData.permission_description || ''
      }

      // 2. Lấy quyền phân giải mới nhất
      const userId = userData.id || currentUser.id
      let newPerms = {}
      if (userId) {
        try {
          const permRes = await apiClient.get(`/accounts/${userId}/permissions?resolved=true`)
          newPerms = permRes.data?.permissions || {}
        } catch (e) {
          console.warn('Could not fetch resolved permissions:', e)
        }
      }

      localStorage.setItem('smartflow_user', JSON.stringify(updatedUser))
      if (Object.keys(newPerms).length > 0) {
        localStorage.setItem('smartflow_active_permissions', JSON.stringify(newPerms))
      }

      set({
        user: updatedUser,
        ...(Object.keys(newPerms).length > 0 ? { permissions: newPerms } : {})
      })

      return updatedUser
    } catch (err) {
      console.error('Lỗi khi đồng bộ thông tin tài khoản:', err)
      return null
    }
  },

  /**
   * Đổi mật khẩu tài khoản
   */
  changePassword: async (oldPassword, newPassword) => {
    const currentUser = get().user
    if (!currentUser?.id) throw new Error('Chưa đăng nhập')

    const response = await apiClient.post(`/accounts/${currentUser.id}/change-password`, {
      old_password: oldPassword,
      new_password: newPassword
    })
    return response.data
  },

  /**
   * Cập nhật công đoạn hoạt động của người dùng
   * @param {string} stageName - Tên công đoạn viết tắt/gốc
   * @param {string} stageDescription - Tên công đoạn đầy đủ/mô tả
   */
  setActiveStage: (stageName, stageDescription) => {
    set((state) => {
      const updatedUser = state.user ? {
        ...state.user,
        activeStageName: stageName,
        activeStageDescription: stageDescription
      } : null;
      if (updatedUser) {
        localStorage.setItem('smartflow_user', JSON.stringify(updatedUser));
      }
      return { user: updatedUser };
    });
  },

  /**
   * Cập nhật vị trí/chức vụ hoạt động của người dùng (khi được phân nhiều vị trí)
   * @param {number|string} positionId
   * @param {string} positionName
   * @param {string} positionDescription
   */
  setActivePosition: (positionId, positionName, positionDescription) => {
    set((state) => {
      const updatedUser = state.user ? {
        ...state.user,
        activePositionId: positionId,
        activePositionName: positionName,
        activePositionDescription: positionDescription
      } : null;
      if (updatedUser) {
        localStorage.setItem('smartflow_user', JSON.stringify(updatedUser));
      }
      return { user: updatedUser };
    });
  },

  /**
   * Xóa thông tin đăng nhập
   */
  logout: () => {
    localStorage.removeItem('smartflow_user')
    localStorage.removeItem('token')
    localStorage.removeItem('smartflow_active_permissions')
    localStorage.removeItem('smartflow_remembered_credentials')
    set({ user: null, token: null, isAuthenticated: false, permissions: {} })
  }
}))

/**
 * Hàm login cũ (vẫn giữ lại để tương thích ngược nếu cần)
 */
export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/accounts/login`, {
      username,
      password
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác');
    }
    throw new Error('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
  }
};

export default useAuthStore
