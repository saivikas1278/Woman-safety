import axios from 'axios';

// Function to determine API base URL with fallback ports
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  
  // Try to use localStorage to remember the working port
  const savedPort = localStorage.getItem('api_port');
  if (savedPort) {
    return `http://localhost:${savedPort}/api`;
  }
  
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

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

// Response interceptor to handle token refresh and connection errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh
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
    
    // Handle connection errors (try different ports)
    if (error.code === 'ERR_NETWORK' && !originalRequest._portRetry) {
      originalRequest._portRetry = true;
      
      // Get current port from URL
      const urlParts = originalRequest.baseURL.split(':');
      const currentPort = parseInt(urlParts[2].split('/')[0]);
      
      // Try next port
      const newPort = currentPort + 1;
      if (newPort <= 5010) { // Limit to reasonable range
        console.log(`Connection failed, trying port ${newPort}...`);
        
        // Update localStorage with new port
        localStorage.setItem('api_port', newPort);
        
        // Update base URL for future requests
        const newBaseUrl = `http://localhost:${newPort}/api`;
        api.defaults.baseURL = newBaseUrl;
        
        // Update current request URL
        originalRequest.baseURL = newBaseUrl;
        
        // Retry with new port
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        // Server responded with error status
        throw error;
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        // Something else went wrong
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        // Server responded with error status
        throw error;
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        // Something else went wrong
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
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
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  },

  resetPassword: async (token, password) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  },

  verifyEmail: async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  },

  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify-token');
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
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

  getContactStats: async () => {
    const response = await api.get('/contacts/stats');
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

  verifyContact: async (id, verificationCode) => {
    const response = await api.post(`/contacts/${id}/verify`, { verificationCode });
    return response.data;
  },

  reorderContacts: async (contactIds) => {
    const response = await api.put('/contacts/reorder', { contactIds });
    return response.data;
  },

  sendEmergencyAlert: async (alertData) => {
    const response = await api.post('/contacts/emergency-alert', alertData);
    return response.data;
  },

  // Auto-dial emergency functions
  initiateAutoDial: async (emergencyData) => {
    const response = await api.post('/contacts/emergency/auto-dial', emergencyData);
    return response.data;
  },

  getAutoDialStatus: async (incidentId) => {
    const response = await api.get(`/contacts/emergency/auto-dial/status/${incidentId}`);
    return response.data;
  },

  testAutoDial: async (testPhoneNumber) => {
    const response = await api.post('/contacts/emergency/auto-dial/test', { testPhoneNumber });
    return response.data;
  },

  bulkImportContacts: async (contacts) => {
    const response = await api.post('/contacts/bulk-import', { contacts });
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
