import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
  setSocket,
  setConnected,
  setReconnecting,
  joinRoom,
  setError,
} from '../../store/slices/socketSlice';
import {
  updateIncident,
  addLocationUpdate,
} from '../../store/slices/incidentSlice';
import {
  updateDevice,
  updateDeviceLocation,
  updateDeviceTelemetry,
} from '../../store/slices/deviceSlice';
import {
  addNotification,
  setEmergencyAlert,
} from '../../store/slices/uiSlice';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const SocketManager = () => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { socket, connected } = useSelector((state) => state.socket);

  useEffect(() => {
    if (!token || !user) return;

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    dispatch(setSocket(newSocket));

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected');
      dispatch(setConnected(true));
      
      // Join user's personal room
      newSocket.emit('join_user_room', user._id);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      dispatch(setConnected(false));
    });

    newSocket.on('reconnect_attempt', () => {
      dispatch(setReconnecting(true));
    });

    newSocket.on('reconnect', () => {
      dispatch(setReconnecting(false));
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      dispatch(setError(error.message));
    });

    // Incident-related events
    newSocket.on('incident_created', (incident) => {
      dispatch(updateIncident(incident));
      
      // Show emergency alert if it's the user's incident
      if (incident.user === user._id) {
        dispatch(setEmergencyAlert({
          type: 'incident_created',
          incident,
          message: 'Emergency incident created successfully',
        }));
      }

      // Add notification
      dispatch(addNotification({
        type: 'incident',
        title: 'New Emergency Incident',
        message: `Emergency incident created${incident.user === user._id ? '' : ' by another user'}`,
        severity: 'error',
        data: incident,
      }));
    });

    newSocket.on('incident_updated', (incident) => {
      dispatch(updateIncident(incident));
      
      // Add notification for status changes
      dispatch(addNotification({
        type: 'incident',
        title: 'Incident Updated',
        message: `Incident status changed to ${incident.status}`,
        severity: 'info',
        data: incident,
      }));
    });

    newSocket.on('location_update', ({ incidentId, location, user: updateUser }) => {
      dispatch(addLocationUpdate({ incidentId, location }));
      
      // Add notification if it's not the current user's update
      if (updateUser !== user._id) {
        dispatch(addNotification({
          type: 'location',
          title: 'Location Update',
          message: 'Emergency location has been updated',
          severity: 'warning',
          data: { incidentId, location },
        }));
      }
    });

    newSocket.on('responder_assigned', ({ incident, responder }) => {
      dispatch(updateIncident(incident));
      
      dispatch(addNotification({
        type: 'responder',
        title: 'Responder Assigned',
        message: `${responder.name} has been assigned to respond`,
        severity: 'success',
        data: { incident, responder },
      }));
    });

    newSocket.on('responder_status', ({ incidentId, responder, status }) => {
      dispatch(addNotification({
        type: 'responder',
        title: 'Responder Update',
        message: `Responder is ${status}`,
        severity: 'info',
        data: { incidentId, responder, status },
      }));
    });

    // Device-related events
    newSocket.on('device_update', (device) => {
      dispatch(updateDevice(device));
    });

    newSocket.on('device_location', ({ deviceId, location }) => {
      dispatch(updateDeviceLocation({ deviceId, location }));
    });

    newSocket.on('device_telemetry', ({ deviceId, telemetry }) => {
      dispatch(updateDeviceTelemetry({ deviceId, telemetry }));
      
      // Check for low battery warning
      if (telemetry.batteryLevel && telemetry.batteryLevel < 20) {
        dispatch(addNotification({
          type: 'device',
          title: 'Low Battery Warning',
          message: `Device battery is at ${telemetry.batteryLevel}%`,
          severity: 'warning',
          data: { deviceId, telemetry },
        }));
      }
    });

    newSocket.on('device_alert', ({ deviceId, alertType, data }) => {
      dispatch(addNotification({
        type: 'device',
        title: 'Device Alert',
        message: `Device alert: ${alertType}`,
        severity: 'error',
        data: { deviceId, alertType, data },
      }));
    });

    // Emergency button events
    newSocket.on('emergency_button_pressed', ({ deviceId, location }) => {
      dispatch(setEmergencyAlert({
        type: 'emergency_button',
        message: 'Emergency button pressed!',
        deviceId,
        location,
      }));

      dispatch(addNotification({
        type: 'emergency',
        title: 'EMERGENCY ALERT',
        message: 'Emergency button has been pressed!',
        severity: 'error',
        data: { deviceId, location },
      }));
    });

    // Volunteer events (for volunteers)
    if (user.role === 'volunteer' || user.role === 'admin') {
      newSocket.on('volunteer_request', ({ incident, distance }) => {
        dispatch(addNotification({
          type: 'volunteer',
          title: 'Volunteer Request',
          message: `Emergency nearby (${distance}km). Can you help?`,
          severity: 'warning',
          data: { incident, distance },
        }));
      });

      newSocket.on('volunteer_accepted', ({ volunteer, incident }) => {
        dispatch(addNotification({
          type: 'volunteer',
          title: 'Volunteer Accepted',
          message: `${volunteer.name} accepted the volunteer request`,
          severity: 'success',
          data: { volunteer, incident },
        }));
      });
    }

    // System notifications
    newSocket.on('system_notification', (notification) => {
      dispatch(addNotification({
        type: 'system',
        ...notification,
      }));
    });

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, user, dispatch]);

  // Helper functions to emit events
  const joinIncidentRoom = (incidentId) => {
    if (socket && connected) {
      socket.emit('join_incident_room', incidentId);
      dispatch(joinRoom(`incident_${incidentId}`));
    }
  };

  const shareLocation = (incidentId, location) => {
    if (socket && connected) {
      socket.emit('location_update', { incidentId, location });
    }
  };

  const updateResponderStatus = (incidentId, status) => {
    if (socket && connected) {
      socket.emit('responder_status', { incidentId, status });
    }
  };

  const acceptVolunteerRequest = (incidentId) => {
    if (socket && connected) {
      socket.emit('accept_volunteer_request', { incidentId });
    }
  };

  // Expose socket functions to global scope for use in components
  React.useEffect(() => {
    window.socketHelpers = {
      joinIncidentRoom,
      shareLocation,
      updateResponderStatus,
      acceptVolunteerRequest,
    };

    return () => {
      delete window.socketHelpers;
    };
  }, [socket, connected]);

  return null; // This component doesn't render anything
};

export default SocketManager;
