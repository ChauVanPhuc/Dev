/**
 * File: AuthModel.js
 * Quản lý trạng thái xác thực và thông tin người dùng bằng Zustand.
 */
import { create } from 'zustand'
import axios from 'axios'
import { API_URL } from '@shared/constants/appConfig'

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

const useAuthStore = create((set) => ({
  // Khởi tạo từ localStorage nếu có
  user: getInitialUser(),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  /**
   * Cập nhật thông tin người dùng và token
   * @param {Object|null} user - Thông tin người dùng hoặc null để logout
   * @param {string|null} token - JWT Token
   */
  setUser: (user, token = null) => {
    if (user) {
      localStorage.setItem('smartflow_user', JSON.stringify(user))
      if (token) {
        localStorage.setItem('token', token)
        set({ user, token, isAuthenticated: true })
      } else {
        set({ user })
      }
    } else {
      // Logout
      localStorage.removeItem('smartflow_user')
      localStorage.removeItem('token')
      set({ user: null, token: null, isAuthenticated: false })
    }
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
   * Xóa thông tin đăng nhập
   */
  logout: () => {
    localStorage.removeItem('smartflow_user')
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
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
