import api from '@webShared/Services/api.service';

export const qualityService = {
    // Lấy danh sách PO của một kế hoạch kèm trạng thái dữ liệu
    getPlanDetails: async (planId) => {
        return await api.get(`/plans/${planId}?simple=true`);
    },

    // Lấy thông tin chi tiết PO
    getOrderDetail: async (poCode) => {
        return await api.get(`/orders/code/${poCode}`);
    },

    // Lấy lịch sử bàn giao theo PO
    getHandoverHistory: async (poCode) => {
        return await api.get(`/deliveries/po/${poCode}`);
    },

    // Lấy lịch sử kiểm tra đầu vào theo PO
    getInboundHistory: async (poCode) => {
        return await api.get(`/inspections/inbound/po/${poCode}`);
    },

    // Lấy lịch sử QC kiểm tra khi nhận hàng theo PO
    getQCReceivingHistory: async (poCode) => {
        return await api.get(`/qc/po/${poCode}`);
    }
};
