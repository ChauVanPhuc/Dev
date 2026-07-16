import api from '@webShared/Services/api.service';



export const screenService = {

  /**

   * Lay danh sach tat ca cac man hinh (hoac loc theo platform)

   */

  getScreens: async (platform) => {

    const url = platform ? `/screens?platform=${platform}` : '/screens';

    return api.get(url);

  },



  /**

   * Lay ban do anh xa man hinh {route_path: data}

   */

  getScreensMap: async (platform) => {

    const url = platform ? `/screens/map?platform=${platform}` : '/screens/map';

    return api.get(url);

  },



  /**

   * Cap nhat mot man hinh

   */

  updateScreen: async (id, data) => {

    return api.put(`/screens/${id}`, data);

  },



  /**

   * Reset ma man hinh ve mac dinh

   */

  resetScreen: async (id) => {

    return api.post(`/screens/${id}/reset`);

  },



  /**

   * Lay chi tiet man hinh kem danh sach components (read-only)

   */

  getScreenDetail: async (id) => {

    return api.get(`/screens/${id}`);

  },

  /**
   * Tao moi mot dac ta man hinh
   */
  createScreen: async (data) => {
    return api.post('/screens', data);
  },

  /**
   * Xoa mot man hinh
   */
  deleteScreen: async (id) => {
    return api.delete(`/screens/${id}`);
  },

  /**
   * Sao chep mot man hinh
   */
  copyScreen: async (id) => {
    return api.post(`/screens/${id}/copy`);
  }

};

