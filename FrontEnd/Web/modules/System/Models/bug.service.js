import api from '@webShared/Services/api.service';

export const bugService = {
  /**
   * Lấy danh sách toàn bộ bug màn hình (có thể lọc theo status, severity, platform)
   */
  getBugs: async (filters = {}) => {
    let url = '/screen-bugs';
    const params = [];
    if (filters.status) params.push(`status_filter=${filters.status}`);
    if (filters.severity) params.push(`severity_filter=${filters.severity}`);
    if (filters.platform) params.push(`platform_filter=${filters.platform}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return api.get(url);
  },

  /**
   * Tạo báo cáo bug mới
   */
  createBug: async (data) => {
    return api.post('/screen-bugs', data);
  },

  /**
   * Cập nhật thông tin/tiến độ bug
   */
  updateBug: async (id, data) => {
    return api.put(`/screen-bugs/${id}`, data);
  },

  /**
   * Xóa báo cáo bug
   */
  deleteBug: async (id) => {
    return api.delete(`/screen-bugs/${id}`);
  },

  /**
   * Tải ảnh đính kèm (dán từ clipboard hoặc upload file)
   */
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/screen-bugs/upload-image', formData, {
      headers: {
        'Content-Type': undefined
      }
    });
  },

  /**
   * Đăng tải một lượt chỉnh sửa/comment mới cho bug
   */
  addBugUpdate: async (bugId, data) => {
    return api.post(`/screen-bugs/${bugId}/updates`, data);
  },

  updateCommentStatus: async (updateId, status, imagePaths = []) => {
    return api.put(`/screen-bugs/updates/${updateId}/status`, { status, image_paths: imagePaths });
  }
};
