import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('token', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get('/auth/verify-token');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export const incidentService = {
  getIncidents: async (params = {}) => {
    const response = await api.get('/incidents', { params });
    return response.data;
  },

  getIncident: async (id) => {
    const response = await api.get(`/incidents/${id}`);
    return response.data;
  },

  createIncident: async (incidentData) => {
    const response = await api.post('/incidents', incidentData);
    return response.data;
  },

  updateIncident: async (id, updateData) => {
    const response = await api.put(`/incidents/${id}`, updateData);
    return response.data;
  },

  resolveIncident: async (id, resolutionData) => {
    const response = await api.post(`/incidents/${id}/resolve`, resolutionData);
    return response.data;
  },

  addLocationUpdate: async (id, location) => {
    const response = await api.post(`/incidents/${id}/location`, { location });
    return response.data;
  },

  assignResponder: async (id, responderId) => {
    const response = await api.post(`/incidents/${id}/assign`, { responderId });
    return response.data;
  },

  escalateIncident: async (id) => {
    const response = await api.post(`/incidents/${id}/escalate`);
    return response.data;
  },
};

export const deviceService = {
  getDevices: async () => {
    const response = await api.get('/devices');
    return response.data;
  },

  getDevice: async (id) => {
    const response = await api.get(`/devices/${id}`);
    return response.data;
  },

  pairDevice: async () => {
    const response = await api.post('/devices/pair');
    return response.data;
  },

  confirmPairing: async (pairingCode, deviceCode) => {
    const response = await api.post('/devices/confirm-pairing', {
      pairingCode,
      deviceCode,
    });
    return response.data;
  },

  updateDevice: async (id, updateData) => {
    const response = await api.put(`/devices/${id}`, updateData);
    return response.data;
  },

  deleteDevice: async (id) => {
    const response = await api.delete(`/devices/${id}`);
    return response.data;
  },

  testDevice: async (id) => {
    const response = await api.post(`/devices/${id}/test`);
    return response.data;
  },

  getDeviceHistory: async (id, params = {}) => {
    const response = await api.get(`/devices/${id}/history`, { params });
    return response.data;
  },
};

export const contactService = {
  getContacts: async () => {
    const response = await api.get('/contacts');
    return response.data;
  },

  addContact: async (contactData) => {
    const response = await api.post('/contacts', contactData);
    return response.data;
  },

  updateContact: async (id, updateData) => {
    const response = await api.put(`/contacts/${id}`, updateData);
    return response.data;
  },

  deleteContact: async (id) => {
    const response = await api.delete(`/contacts/${id}`);
    return response.data;
  },

  testContact: async (id) => {
    const response = await api.post(`/contacts/${id}/test`);
    return response.data;
  },
};

export const geofenceService = {
  getGeofences: async () => {
    const response = await api.get('/geofences');
    return response.data;
  },

  createGeofence: async (geofenceData) => {
    const response = await api.post('/geofences', geofenceData);
    return response.data;
  },

  updateGeofence: async (id, updateData) => {
    const response = await api.put(`/geofences/${id}`, updateData);
    return response.data;
  },

  deleteGeofence: async (id) => {
    const response = await api.delete(`/geofences/${id}`);
    return response.data;
  },
};

export const adminService = {
  getDashboardData: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  updateUser: async (id, updateData) => {
    const response = await api.put(`/admin/users/${id}`, updateData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getSystemSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSystemSettings: async (settings) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },

  getAnalytics: async (params = {}) => {
    const response = await api.get('/admin/analytics', { params });
    return response.data;
  },

  exportData: async (type, params = {}) => {
    const response = await api.get(`/admin/export/${type}`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
