import { useState } from 'react'
import useAuthStore from '@mobile/Auth/Models/authModel'
import apiClient from '@shared/services/api'
import PushNotificationService from '@shared/services/pushNotificationService'

/**
 * Auth Controller (Custom Hook)
 * Xử lý logic nghiệp vụ cho việc đăng nhập thực tế với Backend.
 */
export const useAuthController = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setUser = useAuthStore((state) => state.setUser)

  const login = async (username, password) => {
    setLoading(true)
    setError('')
    
    try {
      // Backend FastAPI sử dụng OAuth2PasswordRequestForm
      // Dữ liệu phải được gửi dưới dạng x-www-form-urlencoded
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      console.log('DEBUG: Đang gọi API Đăng nhập tại:', apiClient.defaults.baseURL + 'accounts/login')
      const response = await apiClient.post('accounts/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      if (response.data && response.data.access_token) {
        // Lưu token vào localStorage
        localStorage.setItem('token', response.data.access_token)
        
        // Lưu đầy đủ thông tin user từ response (bao gồm cả vai trò, quyền, công đoạn từ departments)
        const stage_name = response.data.stage_name || '';
        const stage_description = response.data.stage_description || '';
        const stageNames = stage_name ? stage_name.split('|').map(s => s.trim()).filter(Boolean) : [];
        const stageDescriptions = stage_description ? stage_description.split('|').map(s => s.trim()).filter(Boolean) : [];

        const userData = { 
          id: response.data.id || 1, 
          username: response.data.username || username,
          full_name: response.data.full_name || username,
          email: response.data.email || '',
          employee_id: response.data.employee_id || '',
          role_name: response.data.role_name || '',
          role_description: response.data.role_description || '',
          permission_name: response.data.permission_name || '',
          permission_description: response.data.permission_description || '',
          stage_name: stage_name,
          stage_description: stage_description,
          stageNames: stageNames,
          stageDescriptions: stageDescriptions,
          activeStageName: stageNames.length === 1 ? stageNames[0] : '',
          activeStageDescription: stageDescriptions.length === 1 ? stageDescriptions[0] : '',
          role: 'user' 
        }
        setUser(userData, response.data.access_token)
        
        // --- TÍCH HỢP THÔNG BÁO ĐẨY ---
        // Sau khi đăng nhập thành công, chúng ta lấy ID người dùng (account_id)
        const userId = userData.id || userData.account_id;
        if (userId) {
          // Kích hoạt dịch vụ Push: Yêu cầu quyền, lấy mã Token từ Google
          // và gửi Token đó lên server để đăng ký nhận tin cho account_id này.
          PushNotificationService.init(userId);
        }
        
        return { success: true }
      } else {
        setError('Không nhận được mã truy cập từ hệ thống')
        return { success: false }
      }
    } catch (err) {
      console.error('Lỗi Đăng nhập:', err)
      if (err.response) {
        // Lỗi từ phía server (401, 403, 404, 500)
        if (err.response.status === 404) {
          setError('Không tìm thấy máy chủ API (404). Vui lòng kiểm tra lại cấu hình đường dẫn.')
        } else {
          setError(err.response.data?.detail || 'Đã xảy ra lỗi hệ thống')
        }
      } else if (err.code === 'ECONNABORTED') {
        setError('Hết thời gian kết nối. Máy chủ có vẻ quá tải hoặc sai địa chỉ IP.')
      } else {
        // Lỗi kết nối (Sai IP, không cùng mạng WiFi)
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra WiFi hoặc cấu hình Server IP.')
      }
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  return {
    login,
    loading,
    error,
  }
}
