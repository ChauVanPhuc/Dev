/**
 * File: ProductionModel.js
 * Tự động comment: File này thuộc mô hình dự án, phụ trách ProductionModel.
 */
import axios from 'axios';

import { API_URL } from '@shared/constants/appConfig';

const api = axios.create({
  timeout: 60000,
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

/**
 * Hàm getOrderDetail
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const getOrderDetail = async (orderId) => {
  try {
    const response = await api.get(`${API_URL}/orders/`);
    const all = response.data;
    return all.find(o => o.id === Number(orderId)) || null;
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết đơn hàng:', error);
    return null;
  }
};

/**
 * Hàm getProductionPlans
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const getProductionPlans = async () => {
  try {
    const response = await api.get(`${API_URL}/plans/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching production plans:", error);
    return [];
  }
};

/**
 * Hàm getOrders
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const getOrders = async () => {
  try {
    const response = await api.get(`${API_URL}/orders/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
};

/**
 * Hàm getParts
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const getParts = async () => {
  try {
    const response = await api.get(`${API_URL}/parts/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching parts:", error);
    return [];
  }
};

/**
 * Hàm createDelivery
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const createDelivery = async (deliveryData) => {
  try {
    const response = await api.post(`${API_URL}/deliveries/`, deliveryData);
    return response.data;
  } catch (error) {
    console.error("Error creating delivery:", error);
    throw error;
  }
};

/**
 * Hàm createDeliveryInspection
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const createDeliveryInspection = async (inspectionData) => {
  try {
    // Dùng URL đầy đủ để tuyệt đối không thể đi lạc đường
    const response = await api.post(`${API_URL}/deliveries/inspections/`, inspectionData);
    return response.data;
  } catch (error) {
    console.error("Error creating delivery inspection:", error);
    throw error;
  }
};

/**
 * Hàm getDeliveries
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const getDeliveries = async () => {
  try {
    const response = await api.get(`${API_URL}/deliveries/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return [];
  }
};

/**
 * Hàm getDeliveryById
 * Lấy thông tin chi tiết của một phiếu cụ thể.
 */
export const getDeliveryById = async (id) => {
  try {
    const response = await api.get(`${API_URL}/deliveries/${id}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching delivery by id:", error);
    return null;
  }
};

/**
 * Hàm confirmDeliveryReceipt
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const confirmDeliveryReceipt = async (receiptData) => {
  try {
    const response = await api.post(`${API_URL}/deliveries/confirm-receipt`, receiptData);
    return response.data;
  } catch (error) {
    console.error("Error confirming delivery receipt:", error);
    throw error;
  }
};

/**
 * Hàm confirmDeliveryQuality
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const confirmDeliveryQuality = async (deliveryId) => {
  try {
    const response = await api.post(`${API_URL}/deliveries/${deliveryId}/confirm-quality`);
    return response.data;
  } catch (error) {
    console.error("Error confirming delivery quality:", error);
    throw error;
  }
};

/**
 * Hàm lockDelivery
 * Đánh dấu phiếu đang có người xem để tránh xung đột.
 */
export const lockDelivery = async (deliveryId, user) => {
  try {
    const response = await api.post(`${API_URL}/deliveries/${deliveryId}/lock`, { user });
    return response.data;
  } catch (error) {
    console.error("Error locking delivery:", error);
    throw error;
  }
};

/**
 * Hàm unlockDelivery
 * Giải phóng phiếu sau khi xem xong.
 */
export const unlockDelivery = async (deliveryId) => {
  try {
    const response = await api.post(`${API_URL}/deliveries/${deliveryId}/unlock`);
    return response.data;
  } catch (error) {
    console.error("Error unlocking delivery:", error);
    throw error;
  }
};

/**
 * Hàm getStages
 * Lấy danh sách toàn bộ các công đoạn (stages) từ hệ thống.
 * @returns {Promise<Array>} Danh sách các công đoạn.
 */
export const getStages = async () => {
  try {
    const response = await api.get(`${API_URL}/stages/`);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi tải danh sách công đoạn:", error);
    return [];
  }
};
