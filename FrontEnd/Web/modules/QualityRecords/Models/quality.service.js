import api from '@webShared/Services/api.service';

export const qualityService = {
    getPlanDetails: async (planId, page = null, pageSize = 30, search = '', statusFilter = 'all', filterProduct = 'all', sortBy = 'none') => {
        if (page === null) {
            return await api.get(`/plans/${planId}?simple=true`);
        }
        return await api.get(`/plans/${planId}?simple=true&page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(search)}&statusFilter=${statusFilter}&filterProduct=${encodeURIComponent(filterProduct)}&sortBy=${sortBy}`);
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
    },

    // Lấy tất cả phiếu kiểm tra từ mobile (/production_v2/inspection/) theo PO
    getAllPOInspections: async (poCode) => {
        return await api.get(`/inspections/all-by-po/${poCode}`);
    },

    // Lấy danh sách BOM chi tiết theo PO & Stage
    getPOBOM: async (poCode, stage = '') => {
        return await api.get(`/production-v2/order_bom?order_code=${encodeURIComponent(poCode)}${stage ? `&stage=${encodeURIComponent(stage)}` : ''}`);
    },

    // Lấy lịch sử bàn giao theo Kế hoạch
    getHandoverHistoryByPlan: async (planId) => {
        return await api.get(`/deliveries/plan/${planId}?limit=100000`);
    },

    // Lấy lịch sử kiểm tra đầu vào theo Kế hoạch
    getInboundHistoryByPlan: async (planId) => {
        return await api.get(`/inspections/inbound/plan/${planId}`);
    },

    // Lấy lịch sử QC kiểm tra theo Kế hoạch
    getQCReceivingHistoryByPlan: async (planId) => {
        return await api.get(`/qc/plan/${planId}`);
    }
};
