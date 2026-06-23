import api from '@webShared/Services/api.service';



const deliveryService = {

  getAllDeliveries: (skip = 0, limit = 100) => {

    return api.get(`/deliveries/?skip=${skip}&limit=${limit}`);

  },

  getDeliveryByPlan: (planId) => {

    return api.get(`/deliveries/${planId}`);

  },

  getDeliveryDetail: (deliveryId) => {

    return api.get(`/deliveries/detail/${deliveryId}`);

  },

  getQCDetailedResult: (deliveryId) => {

    return api.get(`/qc/${deliveryId}`);

  },

  getInputInspectionResult: (planId, partName) => {

    return api.get(`/inspections/plan/${planId}/part?part_name=${encodeURIComponent(partName)}`);

  },

  getExceptionDeliveries: (skip = 0, limit = 100) => {

    return api.get(`/deliveries/exceptions?skip=${skip}&limit=${limit}`);

  },

  confirmDelivery: (deliveryId, data) => {

    return api.patch(`/deliveries/${deliveryId}/confirm`, data);

  }

};



export default deliveryService;

