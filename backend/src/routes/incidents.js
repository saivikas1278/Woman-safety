const express = require('express');
const Incident = require('../models/Incident');
const Device = require('../models/Device');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { validateIncident } = require('../middleware/validation');
const logger = require('../utils/logger');
const { sendEmergencyNotifications } = require('../services/emergencyService');
const { findNearbyVolunteers } = require('../services/volunteerService');

const router = express.Router();

// @desc    Get all incidents for user
// @route   GET /api/incidents
// @access  Private
const getIncidents = async (req, res) => {
  try {
    const { 
      status, 
      type, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    const query = { user: req.user.id };

    // Add filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const incidents = await Incident.find(query)
      .populate('device', 'serialNumber name model')
      .populate('responders.user', 'name phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Incident.countDocuments(query);

    res.json({
      success: true,
      count: incidents.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: incidents
    });

  } catch (error) {
    logger.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents'
    });
  }
};

// @desc    Get single incident
// @route   GET /api/incidents/:id
// @access  Private
const getIncident = async (req, res) => {
  try {
    const incident = await Incident.findOne({
      _id: req.params.id,
      user: req.user.id
    })
    .populate('device', 'serialNumber name model')
    .populate('responders.user', 'name phone role')
    .populate('timeline.actor', 'name')
    .populate('resolution.resolvedBy', 'name');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      data: incident
    });

  } catch (error) {
    logger.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident'
    });
  }
};

// @desc    Create new incident (usually called by device)
// @route   POST /api/incidents
// @access  Public (device auth should be implemented)
const createIncident = async (req, res) => {
  try {
    const {
      deviceSerial,
      type,
      location: { lat, lng, accuracy },
      priority = 'high',
      sensorData,
      eventId
    } = req.body;

    // Find device
    const device = await Device.findOne({ 
      serialNumber: deviceSerial,
      isPaired: true,
      isActive: true 
    }).populate('user');

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or not paired'
      });
    }

    // Check for duplicate incident (prevent spam)
    if (eventId) {
      const existingIncident = await Incident.findOne({
        'deviceData.eventId': eventId
      });

      if (existingIncident) {
        return res.status(409).json({
          success: false,
          message: 'Incident already exists',
          data: { incidentId: existingIncident.incidentId }
        });
      }
    }

    // Create incident
    const incident = new Incident({
      user: device.user._id,
      device: device._id,
      type,
      priority,
      location: {
        initial: {
          type: 'Point',
          coordinates: [lng, lat],
          accuracy,
          timestamp: new Date()
        },
        current: {
          type: 'Point',
          coordinates: [lng, lat],
          accuracy,
          timestamp: new Date()
        }
      },
      deviceData: {
        batteryLevel: device.battery.level,
        signalStrength: device.connectivity.cellular.signal,
        sensorData,
        eventId
      }
    });

    // Add initial timeline entry
    incident.addTimelineEntry('Incident created', device.user._id, {
      source: 'device',
      type,
      location: { lat, lng }
    });

    await incident.save();

    // Update device location
    await device.updateLocation(lat, lng, accuracy);

    // Send emergency notifications
    try {
      await sendEmergencyNotifications(incident);
    } catch (notificationError) {
      logger.error('Failed to send emergency notifications:', notificationError);
    }

    // Find and notify nearby volunteers
    try {
      const volunteers = await findNearbyVolunteers(lat, lng, 5000); // 5km radius
      for (const volunteer of volunteers) {
        incident.addResponder(volunteer._id, 'volunteer');
      }
      await incident.save();
    } catch (volunteerError) {
      logger.error('Failed to notify volunteers:', volunteerError);
    }

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      // Notify user
      io.to(`user:${device.user._id}`).emit('incident:created', {
        incident: incident.toObject(),
        device: device.toObject()
      });

      // Notify emergency contacts and volunteers
      // This would be implemented based on your real-time notification strategy
    }

    logger.info(`Incident created: ${incident.incidentId} for user: ${device.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Incident created successfully',
      data: {
        incidentId: incident.incidentId,
        id: incident._id,
        status: incident.status,
        type: incident.type,
        createdAt: incident.createdAt
      }
    });

  } catch (error) {
    logger.error('Create incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create incident'
    });
  }
};

// @desc    Update incident status
// @route   PUT /api/incidents/:id/status
// @access  Private
const updateIncidentStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const validStatuses = ['active', 'acknowledged', 'responding', 'resolved', 'false_alarm', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const incident = await Incident.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Check if user can update this status
    if (status === 'resolved' || status === 'false_alarm') {
      if (req.user.role !== 'admin' && incident.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to resolve this incident'
        });
      }
    }

    // Update status
    incident.updateStatus(status, req.user.id, notes);
    incident.calculateMetrics();
    await incident.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`incident:${incident._id}`).emit('incident:status_updated', {
        incidentId: incident.incidentId,
        status: incident.status,
        updatedBy: req.user.name,
        timestamp: new Date()
      });
    }

    logger.info(`Incident status updated: ${incident.incidentId} to ${status}`);

    res.json({
      success: true,
      message: 'Incident status updated successfully',
      data: {
        incidentId: incident.incidentId,
        status: incident.status,
        timeline: incident.timeline
      }
    });

  } catch (error) {
    logger.error('Update incident status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update incident status'
    });
  }
};

// @desc    Add responder to incident
// @route   POST /api/incidents/:id/responders
// @access  Private
const addResponder = async (req, res) => {
  try {
    const { userId, type, estimatedArrival } = req.body;

    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Check if incident is still active
    if (!incident.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add responder to resolved incident'
      });
    }

    // Verify responder exists and is eligible
    const responder = await User.findById(userId);
    if (!responder) {
      return res.status(404).json({
        success: false,
        message: 'Responder not found'
      });
    }

    // Add responder
    incident.addResponder(userId, type, estimatedArrival);
    incident.addTimelineEntry(`Responder assigned: ${responder.name}`, req.user.id, {
      responderType: type,
      estimatedArrival
    });

    await incident.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`incident:${incident._id}`).emit('responder:assigned', {
        responder: {
          id: responder._id,
          name: responder.name,
          type
        },
        estimatedArrival
      });
    }

    logger.info(`Responder added to incident: ${incident.incidentId}`);

    res.json({
      success: true,
      message: 'Responder added successfully',
      data: incident.responders
    });

  } catch (error) {
    logger.error('Add responder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add responder'
    });
  }
};

// @desc    Update incident location
// @route   PUT /api/incidents/:id/location
// @access  Public (device auth)
const updateIncidentLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy, deviceSerial } = req.body;

    // Verify device
    const device = await Device.findOne({ serialNumber: deviceSerial });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const incident = await Incident.findOne({
      _id: req.params.id,
      device: device._id,
      status: { $in: ['active', 'acknowledged', 'responding'] }
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Active incident not found for this device'
      });
    }

    // Update location
    incident.updateLocation(lat, lng, accuracy);
    await incident.save();

    // Update device location
    await device.updateLocation(lat, lng, accuracy);

    // Emit real-time location update
    const io = req.app.get('io');
    if (io) {
      io.to(`incident:${incident._id}`).emit('location:update', {
        coordinates: [lng, lat],
        accuracy,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    logger.error('Update incident location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
};

// @desc    Cancel incident (false alarm)
// @route   POST /api/incidents/:id/cancel
// @access  Private
const cancelIncident = async (req, res) => {
  try {
    const { reason } = req.body;

    const incident = await Incident.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    if (!incident.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'Incident is already resolved'
      });
    }

    // Check if within cancellation window (configurable, e.g., 2 minutes)
    const cancellationWindow = 2 * 60 * 1000; // 2 minutes
    const timeSinceCreated = Date.now() - incident.createdAt.getTime();

    if (timeSinceCreated > cancellationWindow && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cancellation window has expired'
      });
    }

    // Cancel incident
    incident.updateStatus('false_alarm', req.user.id, reason || 'Cancelled by user');
    incident.calculateMetrics();
    await incident.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`incident:${incident._id}`).emit('incident:cancelled', {
        incidentId: incident.incidentId,
        reason,
        cancelledBy: req.user.name,
        timestamp: new Date()
      });
    }

    logger.info(`Incident cancelled: ${incident.incidentId} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Incident cancelled successfully'
    });

  } catch (error) {
    logger.error('Cancel incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel incident'
    });
  }
};

// @desc    Get active incidents (for responders/admin)
// @route   GET /api/incidents/active
// @access  Private (volunteer/admin)
const getActiveIncidents = async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    let query = { 
      status: { $in: ['active', 'acknowledged', 'responding'] }
    };

    // If location provided, filter by proximity
    if (lat && lng) {
      query['location.current'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      };
    }

    const incidents = await Incident.find(query)
      .populate('user', 'name phone')
      .populate('device', 'serialNumber name')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });

  } catch (error) {
    logger.error('Get active incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active incidents'
    });
  }
};

// Routes
router.get('/', auth, getIncidents);
router.get('/active', auth, authorize('volunteer', 'admin'), getActiveIncidents);
router.get('/:id', auth, getIncident);
router.post('/', validateIncident, createIncident);
router.put('/:id/status', auth, updateIncidentStatus);
router.post('/:id/responders', auth, authorize('volunteer', 'admin'), addResponder);
router.put('/:id/location', updateIncidentLocation);
router.post('/:id/cancel', auth, cancelIncident);

module.exports = router;
