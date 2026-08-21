import api from '@webShared/Services/api.service';



const deliveryService = {

  getAllDeliveries: (page = 1, limit = 100, year = null, month = null, status = null, search = null) => {
    let url = `/deliveries/?page=${page}&limit=${limit}`;
    if (year) url += `&year=${year}`;
    if (month) url += `&month=${month}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
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

  getInspectionByPallet: (palletCode) => {

    return api.get(`/inspections/pallet/${encodeURIComponent(palletCode)}`);

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

