import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  devices: [],
  activeDevice: null,
  loading: false,
  error: null,
  pairing: {
    isActive: false,
    code: null,
    loading: false,
    error: null,
  },
};

const deviceSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    fetchDevicesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDevicesSuccess: (state, action) => {
      state.loading = false;
      state.devices = action.payload;
    },
    fetchDevicesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateDevice: (state, action) => {
      const index = state.devices.findIndex(d => d._id === action.payload._id);
      if (index !== -1) {
        state.devices[index] = action.payload;
      }
      if (state.activeDevice && state.activeDevice._id === action.payload._id) {
        state.activeDevice = action.payload;
      }
    },
    addDevice: (state, action) => {
      state.devices.push(action.payload);
    },
    removeDevice: (state, action) => {
      state.devices = state.devices.filter(d => d._id !== action.payload);
      if (state.activeDevice && state.activeDevice._id === action.payload) {
        state.activeDevice = null;
      }
    },
    setActiveDevice: (state, action) => {
      state.activeDevice = action.payload;
    },
    updateDeviceLocation: (state, action) => {
      const { deviceId, location } = action.payload;
      const device = state.devices.find(d => d._id === deviceId);
      if (device) {
        device.location = location;
        device.lastSeen = new Date().toISOString();
      }
      if (state.activeDevice && state.activeDevice._id === deviceId) {
        state.activeDevice.location = location;
        state.activeDevice.lastSeen = new Date().toISOString();
      }
    },
    updateDeviceTelemetry: (state, action) => {
      const { deviceId, telemetry } = action.payload;
      const device = state.devices.find(d => d._id === deviceId);
      if (device) {
        device.telemetry = { ...device.telemetry, ...telemetry };
        device.lastSeen = new Date().toISOString();
      }
      if (state.activeDevice && state.activeDevice._id === deviceId) {
        state.activeDevice.telemetry = { ...state.activeDevice.telemetry, ...telemetry };
        state.activeDevice.lastSeen = new Date().toISOString();
      }
    },
    startPairing: (state) => {
      state.pairing.isActive = true;
      state.pairing.loading = true;
      state.pairing.error = null;
    },
    pairingSuccess: (state, action) => {
      state.pairing.loading = false;
      state.pairing.code = action.payload.code;
    },
    pairingFailure: (state, action) => {
      state.pairing.loading = false;
      state.pairing.error = action.payload;
    },
    completePairing: (state, action) => {
      state.pairing.isActive = false;
      state.pairing.code = null;
      state.pairing.loading = false;
      state.pairing.error = null;
      state.devices.push(action.payload);
    },
    cancelPairing: (state) => {
      state.pairing.isActive = false;
      state.pairing.code = null;
      state.pairing.loading = false;
      state.pairing.error = null;
    },
    clearError: (state) => {
      state.error = null;
      state.pairing.error = null;
    },
  },
});

export const {
  fetchDevicesStart,
  fetchDevicesSuccess,
  fetchDevicesFailure,
  updateDevice,
  addDevice,
  removeDevice,
  setActiveDevice,
  updateDeviceLocation,
  updateDeviceTelemetry,
  startPairing,
  pairingSuccess,
  pairingFailure,
  completePairing,
  cancelPairing,
  clearError,
} = deviceSlice.actions;

export default deviceSlice.reducer;
