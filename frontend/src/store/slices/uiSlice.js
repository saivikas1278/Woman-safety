import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  darkMode: false,
  sidebarOpen: true,
  notifications: [],
  emergencyAlert: null,
  mapCenter: [0, 0], // [longitude, latitude]
  mapZoom: 10,
  activeTab: 0,
  loading: {
    global: false,
    page: false,
  },
  dialogs: {
    emergencyConfirm: false,
    devicePairing: false,
    incidentDetails: false,
  },
  snackbar: {
    open: false,
    message: '',
    severity: 'info',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    markNotificationRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setEmergencyAlert: (state, action) => {
      state.emergencyAlert = action.payload;
    },
    clearEmergencyAlert: (state) => {
      state.emergencyAlert = null;
    },
    setMapCenter: (state, action) => {
      state.mapCenter = action.payload;
    },
    setMapZoom: (state, action) => {
      state.mapZoom = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    setPageLoading: (state, action) => {
      state.loading.page = action.payload;
    },
    openDialog: (state, action) => {
      state.dialogs[action.payload] = true;
    },
    closeDialog: (state, action) => {
      state.dialogs[action.payload] = false;
    },
    showSnackbar: (state, action) => {
      state.snackbar = {
        open: true,
        message: action.payload.message,
        severity: action.payload.severity || 'info',
      };
    },
    hideSnackbar: (state) => {
      state.snackbar.open = false;
    },
  },
});

export const {
  toggleDarkMode,
  setDarkMode,
  toggleSidebar,
  setSidebarOpen,
  addNotification,
  removeNotification,
  markNotificationRead,
  clearNotifications,
  setEmergencyAlert,
  clearEmergencyAlert,
  setMapCenter,
  setMapZoom,
  setActiveTab,
  setGlobalLoading,
  setPageLoading,
  openDialog,
  closeDialog,
  showSnackbar,
  hideSnackbar,
} = uiSlice.actions;

export default uiSlice.reducer;
