import axios from 'axios';
import { MOCK_FALLBACK } from './mockFallbackData';

// API Path chuẩn của hệ thống: /api/v1/dashboard
const getBaseURL = () => {
  const { hostname, port } = window.location;
  if (port === '2222' || port === '3333' || port === '5173' || port === '5174' || port === '5175' || port === '3000') {
    return `http://${hostname}:1111/api/v1/dashboard`;
  }
  return `${window.location.origin}/api/v1/dashboard`;
};

const client = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const dashboardApi = {
  getFilters: async () => {
    try {
      const res = await client.get('/filters');
      return res.data;
    } catch {
      return {
        periods: [
          { value: '08/2026', label: 'Tháng 08/2026' },
          { value: '07/2026', label: 'Tháng 07/2026' },
          { value: '06/2026', label: 'Tháng 06/2026' },
          { value: '05/2026', label: 'Tháng 05/2026' }
        ],
        default_period: '08/2026',
        customers: [
          { value: 'ALL', label: 'Tất cả khách hàng' },
          { value: 'Atlas Vanity', label: 'Atlas Vanity' },
          { value: 'G7 Home Furnishing', label: 'G7 Home' }
        ],
        severities: [
          { value: 'ALL', label: 'Tất cả mức độ' },
          { value: 'Critical', label: 'Nghiêm trọng' },
          { value: 'Major', label: 'Nặng' },
          { value: 'Minor', label: 'Nhẹ' }
        ]
      };
    }
  },

  getSummary: async (params = {}) => {
    try {
      const res = await client.get('/summary', { params });
      return res.data || MOCK_FALLBACK.summary;
    } catch {
      return MOCK_FALLBACK.summary;
    }
  },

  getPareto: async (params = {}) => {
    try {
      const res = await client.get('/pareto', { params });
      return res.data?.items?.length ? res.data : MOCK_FALLBACK.pareto;
    } catch {
      return MOCK_FALLBACK.pareto;
    }
  },

  getTrend: async (params = {}) => {
    try {
      const res = await client.get('/trend', { params });
      return res.data?.timeline?.length ? res.data : MOCK_FALLBACK.trend;
    } catch {
      return MOCK_FALLBACK.trend;
    }
  },

  getCombo: async (params = {}) => {
    try {
      const res = await client.get('/combo', { params });
      return res.data?.data?.length ? res.data : MOCK_FALLBACK.combo;
    } catch {
      return MOCK_FALLBACK.combo;
    }
  },

  getContainerLoad: async (params = {}) => {
    try {
      const res = await client.get('/container-load', { params });
      return res.data?.points?.length ? res.data : MOCK_FALLBACK.containerLoad;
    } catch {
      return MOCK_FALLBACK.containerLoad;
    }
  },

  getDefectGroups: async (params = {}) => {
    try {
      const res = await client.get('/defect-groups', { params });
      return res.data?.groups?.length ? res.data : MOCK_FALLBACK.defectGroups;
    } catch {
      return MOCK_FALLBACK.defectGroups;
    }
  }
};
