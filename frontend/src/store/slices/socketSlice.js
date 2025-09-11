import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  socket: null,
  connected: false,
  reconnecting: false,
  lastMessage: null,
  activeRooms: [],
  onlineUsers: [],
  error: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    setConnected: (state, action) => {
      state.connected = action.payload;
      if (action.payload) {
        state.reconnecting = false;
        state.error = null;
      }
    },
    setReconnecting: (state, action) => {
      state.reconnecting = action.payload;
    },
    setLastMessage: (state, action) => {
      state.lastMessage = action.payload;
    },
    joinRoom: (state, action) => {
      const room = action.payload;
      if (!state.activeRooms.includes(room)) {
        state.activeRooms.push(room);
      }
    },
    leaveRoom: (state, action) => {
      const room = action.payload;
      state.activeRooms = state.activeRooms.filter(r => r !== room);
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    updateOnlineUser: (state, action) => {
      const { userId, data } = action.payload;
      const index = state.onlineUsers.findIndex(u => u.id === userId);
      if (index !== -1) {
        state.onlineUsers[index] = { ...state.onlineUsers[index], ...data };
      } else {
        state.onlineUsers.push({ id: userId, ...data });
      }
    },
    removeOnlineUser: (state, action) => {
      const userId = action.payload;
      state.onlineUsers = state.onlineUsers.filter(u => u.id !== userId);
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetSocket: (state) => {
      state.socket = null;
      state.connected = false;
      state.reconnecting = false;
      state.lastMessage = null;
      state.activeRooms = [];
      state.onlineUsers = [];
      state.error = null;
    },
  },
});

export const {
  setSocket,
  setConnected,
  setReconnecting,
  setLastMessage,
  joinRoom,
  leaveRoom,
  setOnlineUsers,
  updateOnlineUser,
  removeOnlineUser,
  setError,
  clearError,
  resetSocket,
} = socketSlice.actions;

export default socketSlice.reducer;
