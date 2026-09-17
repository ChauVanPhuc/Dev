import api from '@webShared/Services/api.service';



export const planService = {

    getPlans: async (page = null, pageSize = 30, search = '', status = 'all', sortDirection = 'desc') => {
        if (page === null) {
            return await api.get('/plans/');
        }
        return await api.get(`/plans/?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&status=${status}&sortDirection=${sortDirection}`);
    },



    getPlanById: async (id, skip = 0, limit = 30, q = '') => {

        return await api.get(`/plans/${id}?skip=${skip}&limit=${limit}&q=${q}`);

    },



    getProductProgress: async (productId) => {

        return await api.get(`/plans/product-progress/${productId}`);

    },



    createPlan: async (planData) => {

        return await api.post('/plans/', planData);

    },



    importExcel: async (file) => {

        const formData = new FormData();

        formData.append('file', file);

        return await api.post('/production-plans/import', formData, {

            headers: {

                'Content-Type': 'multipart/form-data'

            }

        });

    },



    swapOrderPriority: async (orderId1, orderId2) => {

        return await api.post(`/plans/swap-order-priority?order_id_1=${orderId1}&order_id_2=${orderId2}`);

    },



    reorderPriorities: async (orderIds) => {
        // orderIds: mảng ID theo thứ tự ưu tiên mới, index 0 = ưu tiên cao nhất
        return await api.post('/plans/reorder-priorities', orderIds);
    },

    deleteOrder: async (orderId) => {
        return await api.delete(`/orders/${orderId}`);
    }
};

