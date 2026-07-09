import api from '@webShared/Services/api.service';



const deliveryService = {

  getAllDeliveries: (skip = 0, limit = 100, year = null, month = null) => {
    let url = `/deliveries/?skip=${skip}`;
    if (limit !== null && limit !== undefined && limit > 0) {
      url += `&limit=${limit}`;
    }
    if (year) url += `&year=${year}`;
    if (month) url += `&month=${month}`;
    return api.get(url);
  },

  getAvailableDates: () => {
    return api.get('/deliveries/available-dates');
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

  getExceptionDeliveries: (skip = 0, limit = 100, year = null, month = null) => {
    let url = `/deliveries/exceptions?skip=${skip}`;
    if (limit !== null && limit !== undefined && limit > 0) {
      url += `&limit=${limit}`;
    }
    if (year) url += `&year=${year}`;
    if (month) url += `&month=${month}`;
    return api.get(url);
  },

  confirmDelivery: (deliveryId, data) => {

    return api.patch(`/deliveries/${deliveryId}/confirm`, data);

  }

};



export default deliveryService;

