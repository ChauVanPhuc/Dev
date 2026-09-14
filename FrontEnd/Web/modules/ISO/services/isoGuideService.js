import api from '@webShared/Services/api.service';

/**
 * Service quản lý liên kết 1 - 1 giữa Quy trình ISO và Hướng dẫn kiểm tra (InspectionGuide)
 */
export const isoGuideService = {
  /**
   * Lấy chi tiết Guide liên kết với Quy trình ISO (gồm các bước, sub-steps, ảnh)
   */
  getProcessInspectionGuide: async (processId) => {
    return await api.get(`/iso-documents/processes/${processId}/inspection-guide`);
  },

  /**
   * Liên kết 1-1 Quy trình ISO với một Guide có sẵn
   */
  linkProcessInspectionGuide: async (processId, guideId) => {
    return await api.post(`/iso-documents/processes/${processId}/link-inspection-guide`, {
      guide_id: guideId
    });
  },

  /**
   * Gỡ liên kết 1-1 giữa Quy trình ISO và Guide
   */
  unlinkProcessInspectionGuide: async (processId) => {
    return await api.delete(`/iso-documents/processes/${processId}/unlink-inspection-guide`);
  },

  /**
   * Tạo mới nhanh một Hướng dẫn kiểm tra (HDKT) và liên kết 1-1 ngay
   */
  createProcessInspectionGuide: async (processId, payload) => {
    return await api.post(`/iso-documents/processes/${processId}/create-inspection-guide`, payload);
  },

  /**
   * Lấy danh sách các Guide (loại HDKT) chưa bị quy trình khác liên kết
   */
  getUnlinkedInspectionGuides: async (processId) => {
    const query = processId ? `?process_id=${processId}` : '';
    return await api.get(`/iso-documents/unlinked-inspection-guides${query}`);
  },

  /**
   * Thêm một bước mới vào Guide
   */
  addGuideStep: async (guideId, payload) => {
    return await api.post(`/inspection-guides/${guideId}/steps`, payload);
  },

  /**
   * Cập nhật thông tin một bước của Guide
   */
  updateGuideStep: async (guideId, stepId, payload) => {
    return await api.put(`/inspection-guides/${guideId}/steps/${stepId}`, payload);
  },

  /**
   * Xóa một bước của Guide
   */
  deleteGuideStep: async (guideId, stepId) => {
    return await api.delete(`/inspection-guides/${guideId}/steps/${stepId}`);
  },

  /**
   * Sắp xếp lại thứ tự các bước
   */
  reorderGuideSteps: async (guideId, stepIds) => {
    return await api.post(`/inspection-guides/${guideId}/steps/reorder`, { step_ids: stepIds });
  },

  /**
   * Upload ảnh mẫu tiêu chuẩn cho một bước
   */
  uploadStepImages: async (guideId, stepId, formData) => {
    return await api.post(`/inspection-guides/${guideId}/steps/${stepId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Xóa ảnh mẫu tiêu chuẩn của bước
   */
  deleteStepImage: async (guideId, stepId, imageId) => {
    return await api.delete(`/inspection-guides/${guideId}/steps/${stepId}/images/${imageId}`);
  }
};

export default isoGuideService;
