const express = require('express');
const User = require('../models/User');
const Device = require('../models/Device');
const Incident = require('../models/Incident');
const Contact = require('../models/Contact');
const Geofence = require('../models/Geofence');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { verifyVolunteer, getVolunteerMetrics } = require('../services/volunteerService');

const router = express.Router();

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Private (admin only)
const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalDevices,
      onlineDevices,
      activeIncidents,
      totalIncidents,
      volunteers,
      recentIncidents
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        isActive: true, 
        lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      }),
      Device.countDocuments({ isActive: true }),
      Device.countDocuments({ 
        isActive: true,
        lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      }),
      Incident.countDocuments({ status: { $in: ['active', 'acknowledged', 'responding'] } }),
      Incident.countDocuments({}),
      User.countDocuments({ role: 'volunteer', isActive: true }),
      Incident.find({ status: { $in: ['active', 'acknowledged', 'responding'] } })
        .populate('user', 'name phone')
        .populate('device', 'serialNumber name')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    // Calculate response time metrics
    const responseTimeStats = await Incident.aggregate([
      {
        $match: {
          'metrics.responseTime': { $exists: true },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: null,
          averageResponseTime: { $avg: '$metrics.responseTime' },
          minResponseTime: { $min: '$metrics.responseTime' },
          maxResponseTime: { $max: '$metrics.responseTime' }
        }
      }
    ]);

    const dashboard = {
      overview: {
        users: {
          total: totalUsers,
          active: activeUsers,
          volunteers
        },
        devices: {
          total: totalDevices,
          online: onlineDevices,
          offline: totalDevices - onlineDevices
        },
        incidents: {
          total: totalIncidents,
          active: activeIncidents,
          resolved: totalIncidents - activeIncidents
        }
      },
      performance: {
        responseTime: responseTimeStats[0] || {
          averageResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0
        }
      },
      recentIncidents
    };

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    logger.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

// @desc    Get all incidents for admin
// @route   GET /api/admin/incidents
// @access  Private (admin only)
const getAllIncidents = async (req, res) => {
  try {
    const {
      status,
      type,
      priority,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Add filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const incidents = await Incident.find(query)
      .populate('user', 'name email phone')
      .populate('device', 'serialNumber name model')
      .populate('responders.user', 'name phone role')
      .sort(sortOptions)
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
    logger.error('Get all incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents'
    });
  }
};

// @desc    Assign responder to incident
// @route   POST /api/admin/incidents/:id/assign
// @access  Private (admin only)
const assignResponder = async (req, res) => {
  try {
    const { responderId, type, notes } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    const responder = await User.findById(responderId);
    if (!responder) {
      return res.status(404).json({
        success: false,
        message: 'Responder not found'
      });
    }

    // Add responder to incident
    incident.addResponder(responderId, type || 'admin_assigned');
    incident.addTimelineEntry(
      `Responder assigned by admin: ${responder.name}`,
      req.user.id,
      { responderType: type, notes }
    );

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
        assignedBy: req.user.name,
        timestamp: new Date()
      });

      // Notify responder
      io.to(`user:${responderId}`).emit('incident:assigned', {
        incident: {
          id: incident._id,
          incidentId: incident.incidentId,
          type: incident.type,
          location: incident.location.current
        }
      });
    }

    logger.info(`Responder assigned: ${responder.name} to incident: ${incident.incidentId}`);

    res.json({
      success: true,
      message: 'Responder assigned successfully',
      data: incident.responders
    });

  } catch (error) {
    logger.error('Assign responder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign responder'
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (admin only)
const getAllUsers = async (req, res) => {
  try {
    const {
      role,
      status,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const query = {};
    
    if (role) query.role = role;
    if (status) query.isActive = status === 'active';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -verificationToken -passwordResetToken')
      .populate('devices', 'serialNumber status lastSeen')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: users
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive, reason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    // If deactivating user, also deactivate their devices
    if (!isActive) {
      await Device.updateMany(
        { user: user._id },
        { $set: { isActive: false, status: 'inactive' } }
      );
    }

    logger.info(`User status updated by admin: ${user.email} -> ${isActive ? 'active' : 'inactive'}`);

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId: user._id,
        previousStatus,
        newStatus: isActive,
        updatedBy: req.user.name,
        reason
      }
    });

  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// @desc    Get system analytics
// @route   GET /api/admin/analytics
// @access  Private (admin only)
const getAnalytics = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) };
        break;
      case '1y':
        dateFilter = { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) };
        break;
    }

    const [
      incidentsByType,
      incidentsByStatus,
      responseTimeMetrics,
      incidentsByHour,
      deviceStats
    ] = await Promise.all([
      // Incidents by type
      Incident.aggregate([
        { $match: { createdAt: dateFilter } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      
      // Incidents by status
      Incident.aggregate([
        { $match: { createdAt: dateFilter } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Response time metrics
      Incident.aggregate([
        { 
          $match: { 
            createdAt: dateFilter,
            'metrics.responseTime': { $exists: true }
          } 
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$metrics.responseTime' },
            minResponseTime: { $min: '$metrics.responseTime' },
            maxResponseTime: { $max: '$metrics.responseTime' },
            totalIncidents: { $sum: 1 }
          }
        }
      ]),
      
      // Incidents by hour of day
      Incident.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Device statistics
      Device.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgBatteryLevel: { $avg: '$battery.level' }
          }
        }
      ])
    ]);

    const analytics = {
      timeframe,
      incidents: {
        byType: incidentsByType,
        byStatus: incidentsByStatus,
        byHour: incidentsByHour,
        responseMetrics: responseTimeMetrics[0] || {
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          totalIncidents: 0
        }
      },
      devices: deviceStats
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

// @desc    Get incident heatmap data
// @route   GET /api/admin/heatmap
// @access  Private (admin only)
const getHeatmapData = async (req, res) => {
  try {
    const { timeframe = '30d', type } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) };
        break;
    }

    const query = { createdAt: dateFilter };
    if (type) query.type = type;

    const heatmapData = await Incident.find(query)
      .select('location.initial type priority createdAt')
      .lean();

    // Format data for heatmap visualization
    const formattedData = heatmapData.map(incident => ({
      lat: incident.location.initial.coordinates[1],
      lng: incident.location.initial.coordinates[0],
      weight: incident.priority === 'critical' ? 5 : 
              incident.priority === 'high' ? 3 : 
              incident.priority === 'medium' ? 2 : 1,
      type: incident.type,
      timestamp: incident.createdAt
    }));

    res.json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });

  } catch (error) {
    logger.error('Get heatmap data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch heatmap data'
    });
  }
};

// @desc    Verify volunteer
// @route   POST /api/admin/volunteers/:id/verify
// @access  Private (admin only)
const verifyVolunteerRoute = async (req, res) => {
  try {
    const { notes } = req.body;

    const volunteer = await verifyVolunteer(req.params.id, req.user.id, notes);

    res.json({
      success: true,
      message: 'Volunteer verified successfully',
      data: {
        volunteerId: volunteer._id,
        name: volunteer.name,
        verifiedAt: volunteer.volunteerProfile.verifiedAt
      }
    });

  } catch (error) {
    logger.error('Verify volunteer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify volunteer'
    });
  }
};

// @desc    Get volunteer metrics
// @route   GET /api/admin/volunteers/:id/metrics
// @access  Private (admin only)
const getVolunteerMetricsRoute = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    const metrics = await getVolunteerMetrics(req.params.id, timeframe);

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Get volunteer metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer metrics'
    });
  }
};

// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Private (superadmin only)
const getSystemLogs = async (req, res) => {
  try {
    const { level = 'info', page = 1, limit = 50 } = req.query;

    // This would typically read from your logging system
    // For demo purposes, return mock log data
    const logs = [
      {
        level: 'info',
        message: 'User login successful',
        timestamp: new Date(),
        meta: { userId: '507f1f77bcf86cd799439011', email: 'user@example.com' }
      },
      {
        level: 'error',
        message: 'SMS delivery failed',
        timestamp: new Date(Date.now() - 60000),
        meta: { phone: '+1234567890', error: 'Invalid phone number' }
      }
    ];

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });

  } catch (error) {
    logger.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system logs'
    });
  }
};

// @desc    Export data
// @route   GET /api/admin/export/:type
// @access  Private (admin only)
const exportData = async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json', startDate, endDate } = req.query;

    let query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let data;
    switch (type) {
      case 'incidents':
        data = await Incident.find(query)
          .populate('user', 'name email phone')
          .populate('device', 'serialNumber name')
          .lean();
        break;
      case 'users':
        data = await User.find(query)
          .select('-password -verificationToken -passwordResetToken')
          .lean();
        break;
      case 'devices':
        data = await Device.find(query)
          .populate('user', 'name email')
          .lean();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    // Set appropriate headers for download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${type}_export_${timestamp}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');

    if (format === 'json') {
      res.json({
        exportType: type,
        exportDate: new Date(),
        count: data.length,
        data
      });
    } else {
      // Convert to CSV (simplified)
      const csv = convertToCSV(data);
      res.send(csv);
    }

  } catch (error) {
    logger.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'object' ? JSON.stringify(value) : value
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
};

// Routes
router.get('/dashboard', auth, authorize('admin', 'superadmin'), getDashboard);
router.get('/incidents', auth, authorize('admin', 'superadmin'), getAllIncidents);
router.post('/incidents/:id/assign', auth, authorize('admin', 'superadmin'), assignResponder);
router.get('/users', auth, authorize('admin', 'superadmin'), getAllUsers);
router.put('/users/:id/status', auth, authorize('admin', 'superadmin'), updateUserStatus);
router.get('/analytics', auth, authorize('admin', 'superadmin'), getAnalytics);
router.get('/heatmap', auth, authorize('admin', 'superadmin'), getHeatmapData);
router.post('/volunteers/:id/verify', auth, authorize('admin', 'superadmin'), verifyVolunteerRoute);
router.get('/volunteers/:id/metrics', auth, authorize('admin', 'superadmin'), getVolunteerMetricsRoute);
router.get('/logs', auth, authorize('superadmin'), getSystemLogs);
router.get('/export/:type', auth, authorize('admin', 'superadmin'), exportData);

module.exports = router;
