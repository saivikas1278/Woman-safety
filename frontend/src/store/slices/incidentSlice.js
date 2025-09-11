import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  incidents: [],
  activeIncident: null,
  loading: false,
  error: null,
  filters: {
    status: 'all',
    severity: 'all',
    dateRange: null,
  },
  pagination: {
    page: 0,
    limit: 10,
    total: 0,
  },
};

const incidentSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    fetchIncidentsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchIncidentsSuccess: (state, action) => {
      state.loading = false;
      state.incidents = action.payload.incidents;
      state.pagination = {
        ...state.pagination,
        total: action.payload.total,
      };
    },
    fetchIncidentsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    createIncidentStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    createIncidentSuccess: (state, action) => {
      state.loading = false;
      state.incidents.unshift(action.payload);
      state.activeIncident = action.payload;
    },
    createIncidentFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateIncident: (state, action) => {
      const index = state.incidents.findIndex(i => i._id === action.payload._id);
      if (index !== -1) {
        state.incidents[index] = action.payload;
      }
      if (state.activeIncident && state.activeIncident._id === action.payload._id) {
        state.activeIncident = action.payload;
      }
    },
    setActiveIncident: (state, action) => {
      state.activeIncident = action.payload;
    },
    addLocationUpdate: (state, action) => {
      const { incidentId, location } = action.payload;
      const incident = state.incidents.find(i => i._id === incidentId);
      if (incident) {
        incident.locationTrail = incident.locationTrail || [];
        incident.locationTrail.push({
          location,
          timestamp: new Date().toISOString(),
        });
        incident.currentLocation = location;
      }
      if (state.activeIncident && state.activeIncident._id === incidentId) {
        state.activeIncident.locationTrail = state.activeIncident.locationTrail || [];
        state.activeIncident.locationTrail.push({
          location,
          timestamp: new Date().toISOString(),
        });
        state.activeIncident.currentLocation = location;
      }
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchIncidentsStart,
  fetchIncidentsSuccess,
  fetchIncidentsFailure,
  createIncidentStart,
  createIncidentSuccess,
  createIncidentFailure,
  updateIncident,
  setActiveIncident,
  addLocationUpdate,
  setFilters,
  setPagination,
  clearError,
} = incidentSlice.actions;

export default incidentSlice.reducer;
