const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Incident = require('../models/Incident');
const logger = require('../utils/logger');

// Store active connections
const activeConnections = new Map();

const socketHandler = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.name} (${socket.userId})`);

    // Store connection
    activeConnections.set(socket.userId, {
      socket,
      user: socket.user,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-specific rooms
    if (socket.user.role === 'volunteer') {
      socket.join('volunteers');
    } else if (socket.user.role === 'admin') {
      socket.join('admins');
    }

    // Send connection acknowledgment
    socket.emit('connected', {
      message: 'Connected successfully',
      userId: socket.userId,
      timestamp: new Date()
    });

    // Handle joining incident room (for real-time incident updates)
    socket.on('join:incident', async (data) => {
      try {
        const { incidentId } = data;
        
        // Verify user has access to this incident
        const incident = await Incident.findById(incidentId);
        
        if (!incident) {
          socket.emit('error', { message: 'Incident not found' });
          return;
        }

        // Check if user is authorized to view this incident
        const isAuthorized = 
          incident.user.toString() === socket.userId ||
          incident.responders.some(r => r.user.toString() === socket.userId) ||
          socket.user.role === 'admin';

        if (!isAuthorized) {
          socket.emit('error', { message: 'Not authorized to view this incident' });
          return;
        }

        socket.join(`incident:${incidentId}`);
        
        socket.emit('joined:incident', {
          incidentId,
          message: 'Joined incident room'
        });

        logger.info(`User ${socket.user.name} joined incident room: ${incidentId}`);

      } catch (error) {
        logger.error('Join incident room error:', error);
        socket.emit('error', { message: 'Failed to join incident room' });
      }
    });

    // Handle leaving incident room
    socket.on('leave:incident', (data) => {
      const { incidentId } = data;
      socket.leave(`incident:${incidentId}`);
      
      socket.emit('left:incident', {
        incidentId,
        message: 'Left incident room'
      });
    });

    // Handle location sharing for active incidents
    socket.on('location:update', async (data) => {
      try {
        const { lat, lng, accuracy, incidentId } = data;

        if (!incidentId) {
          socket.emit('error', { message: 'Incident ID required for location updates' });
          return;
        }

        // Verify incident and user authorization
        const incident = await Incident.findById(incidentId);
        
        if (!incident || incident.user.toString() !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to update this incident' });
          return;
        }

        if (!incident.isActive()) {
          socket.emit('error', { message: 'Incident is not active' });
          return;
        }

        // Update incident location
        incident.updateLocation(lat, lng, accuracy);
        await incident.save();

        // Broadcast location update to incident room
        socket.to(`incident:${incidentId}`).emit('location:updated', {
          incidentId,
          location: {
            lat,
            lng,
            accuracy,
            timestamp: new Date()
          },
          updatedBy: socket.user.name
        });

        socket.emit('location:update:success', {
          message: 'Location updated successfully'
        });

        logger.info(`Location updated for incident ${incidentId} by ${socket.user.name}`);

      } catch (error) {
        logger.error('Location update error:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Handle responder status updates
    socket.on('responder:status', async (data) => {
      try {
        const { incidentId, status, estimatedArrival } = data;

        const incident = await Incident.findById(incidentId);
        
        if (!incident) {
          socket.emit('error', { message: 'Incident not found' });
          return;
        }

        // Find responder in incident
        const responderIndex = incident.responders.findIndex(
          r => r.user.toString() === socket.userId
        );

        if (responderIndex === -1) {
          socket.emit('error', { message: 'You are not assigned to this incident' });
          return;
        }

        // Update responder status
        incident.responders[responderIndex].status = status;
        incident.responders[responderIndex].estimatedArrival = estimatedArrival;

        if (status === 'acknowledged') {
          incident.responders[responderIndex].acknowledgedAt = new Date();
        } else if (status === 'arrived') {
          incident.responders[responderIndex].arrivedAt = new Date();
        }

        // Add timeline entry
        incident.addTimelineEntry(
          `Responder status updated: ${status}`,
          socket.userId,
          { responderType: incident.responders[responderIndex].type }
        );

        await incident.save();

        // Broadcast to incident room
        io.to(`incident:${incidentId}`).emit('responder:status:updated', {
          incidentId,
          responderId: socket.userId,
          responderName: socket.user.name,
          status,
          estimatedArrival,
          timestamp: new Date()
        });

        logger.info(`Responder status updated: ${socket.user.name} -> ${status} for incident ${incidentId}`);

      } catch (error) {
        logger.error('Responder status update error:', error);
        socket.emit('error', { message: 'Failed to update responder status' });
      }
    });

    // Handle volunteer availability updates
    socket.on('volunteer:availability', async (data) => {
      try {
        const { available, location } = data;

        if (socket.user.role !== 'volunteer') {
          socket.emit('error', { message: 'Only volunteers can update availability' });
          return;
        }

        // Update user's availability and location
        await User.findByIdAndUpdate(socket.userId, {
          'volunteerProfile.isAvailable': available,
          'location.coordinates': location ? [location.lng, location.lat] : undefined,
          'location.lastUpdated': new Date()
        });

        // Join or leave volunteer pool
        if (available) {
          socket.join('available-volunteers');
        } else {
          socket.leave('available-volunteers');
        }

        socket.emit('volunteer:availability:updated', {
          available,
          message: `Availability updated to ${available ? 'available' : 'unavailable'}`
        });

        logger.info(`Volunteer availability updated: ${socket.user.name} -> ${available}`);

      } catch (error) {
        logger.error('Volunteer availability error:', error);
        socket.emit('error', { message: 'Failed to update availability' });
      }
    });

    // Handle typing indicators for incident chat
    socket.on('incident:typing', (data) => {
      const { incidentId, isTyping } = data;
      
      socket.to(`incident:${incidentId}`).emit('incident:typing:update', {
        userId: socket.userId,
        userName: socket.user.name,
        isTyping,
        timestamp: new Date()
      });
    });

    // Handle incident chat messages
    socket.on('incident:message', async (data) => {
      try {
        const { incidentId, message, type = 'text' } = data;

        const incident = await Incident.findById(incidentId);
        
        if (!incident) {
          socket.emit('error', { message: 'Incident not found' });
          return;
        }

        // Verify authorization
        const isAuthorized = 
          incident.user.toString() === socket.userId ||
          incident.responders.some(r => r.user.toString() === socket.userId) ||
          socket.user.role === 'admin';

        if (!isAuthorized) {
          socket.emit('error', { message: 'Not authorized to send messages in this incident' });
          return;
        }

        // Add message to incident timeline
        incident.addTimelineEntry(
          'Message sent',
          socket.userId,
          { message, type, timestamp: new Date() }
        );

        await incident.save();

        // Broadcast message to incident room
        io.to(`incident:${incidentId}`).emit('incident:message:received', {
          incidentId,
          messageId: incident.timeline[incident.timeline.length - 1]._id,
          message,
          type,
          sender: {
            id: socket.userId,
            name: socket.user.name,
            role: socket.user.role
          },
          timestamp: new Date()
        });

        logger.info(`Message sent in incident ${incidentId} by ${socket.user.name}`);

      } catch (error) {
        logger.error('Incident message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle activity tracking
    socket.on('activity', () => {
      const connection = activeConnections.get(socket.userId);
      if (connection) {
        connection.lastActivity = new Date();
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.user.name} (${reason})`);
      
      // Remove from active connections
      activeConnections.delete(socket.userId);

      // If volunteer, remove from available pool
      if (socket.user.role === 'volunteer') {
        socket.leave('available-volunteers');
      }

      // Broadcast disconnection to relevant rooms
      socket.broadcast.emit('user:disconnected', {
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.user.name}:`, error);
    });
  });

  // Utility functions for external use
  io.notifyUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  io.notifyIncident = (incidentId, event, data) => {
    io.to(`incident:${incidentId}`).emit(event, data);
  };

  io.notifyVolunteers = (event, data) => {
    io.to('volunteers').emit(event, data);
  };

  io.notifyAdmins = (event, data) => {
    io.to('admins').emit(event, data);
  };

  io.getActiveConnections = () => {
    return Array.from(activeConnections.values()).map(conn => ({
      userId: conn.user._id,
      userName: conn.user.name,
      role: conn.user.role,
      connectedAt: conn.connectedAt,
      lastActivity: conn.lastActivity
    }));
  };

  io.isUserOnline = (userId) => {
    return activeConnections.has(userId.toString());
  };

  // Periodic cleanup of inactive connections
  setInterval(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    for (const [userId, connection] of activeConnections.entries()) {
      if (connection.lastActivity < fiveMinutesAgo) {
        logger.info(`Cleaning up inactive connection for user: ${connection.user.name}`);
        connection.socket.disconnect();
        activeConnections.delete(userId);
      }
    }
  }, 60000); // Check every minute

  logger.info('Socket.IO server initialized');
};

module.exports = socketHandler;
