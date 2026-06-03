import api from './api.service';

const palletService = {
  // Lưu hoặc cập nhật thẻ pallet
  savePalletCard: (data) => {
    return api.post('/pallet-cards/', data);
  },

  // Lấy thông tin thẻ pallet theo mã
  getPalletCard: (code) => {
    return api.get(`/pallet-cards/${code}`);
  },

  // Lấy danh sách thẻ pallet
  getPalletCards: (params) => {
    return api.get('/pallet-cards/', { params });
  }
};

export default palletService;
