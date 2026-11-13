import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to add auth token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('atm_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },
};

export const reportService = {
  getAll: async (params = {}) => {
    const res = await api.get('/reports', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/reports/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/reports', data);
    return res.data;
  },
  updateStatus: async (id, status, notes = '', changed_by = 'User') => {
    const res = await api.patch(`/reports/${id}/status`, { status, notes, changed_by });
    return res.data;
  },
};

export const validationService = {
  validateField: async (field_type, value) => {
    const res = await api.post('/validate/dfa', { field_type, value });
    return res.data;
  },
  validateAll: async (fields) => {
    const res = await api.post('/validate/dfa', { fields });
    return res.data;
  },
  getStructures: async () => {
    const res = await api.get('/validate/structures');
    return res.data;
  },
};

export const classificationService = {
  preview: async (error_code, description, urgency) => {
    const res = await api.post('/classify', { error_code, description, urgency });
    return res.data;
  },
};

export const handlerService = {
  getAll: async () => {
    const res = await api.get('/handlers');
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/handlers/${id}`, data);
    return res.data;
  },
};

export const routingService = {
  getRules: async () => {
    const res = await api.get('/routing-rules');
    return res.data;
  },
  addRule: async (data) => {
    const res = await api.post('/routing-rules', data);
    return res.data;
  },
  deleteRule: async (id) => {
    const res = await api.delete(`/routing-rules/${id}`);
    return res.data;
  },
};

export const dashboardService = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
  getAnalytics: async () => {
    const res = await api.get('/dashboard/analytics');
    return res.data;
  },
  getQueue: async () => {
    const res = await api.get('/queue');
    return res.data;
  },
  processQueue: async () => {
    const res = await api.post('/queue/process');
    return res.data;
  },
};

export const systemService = {
  runTests: async () => {
    const res = await api.get('/tests/run');
    return res.data;
  },
  resetDemo: async () => {
    const res = await api.post('/system/reset-demo');
    return res.data;
  },
};

export default api;
