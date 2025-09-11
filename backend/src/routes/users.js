const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('devices', 'serialNumber name model status lastSeen battery')
      .select('-password');

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      'name', 'email', 'phone', 'profile', 'preferences'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    logger.info(`Profile updated for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// @desc    Update location
// @route   PUT /api/users/me/location
// @access  Private
const updateLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          'location.coordinates': [lng, lat],
          'location.lastUpdated': new Date()
        }
      },
      { new: true }
    ).select('location');

    // Emit location update via WebSocket if user is online
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('user:location:updated', {
        location: {
          lat,
          lng,
          accuracy,
          timestamp: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: user.location
    });

  } catch (error) {
    logger.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/me/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const Incident = require('../models/Incident');
    const Device = require('../models/Device');
    const Contact = require('../models/Contact');

    // Get user statistics
    const [
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      deviceCount,
      contactCount,
      recentIncidents
    ] = await Promise.all([
      Incident.countDocuments({ user: req.user.id }),
      Incident.countDocuments({ user: req.user.id, status: { $in: ['active', 'acknowledged', 'responding'] } }),
      Incident.countDocuments({ user: req.user.id, status: { $in: ['resolved', 'false_alarm'] } }),
      Device.countDocuments({ user: req.user.id, isActive: true }),
      Contact.countDocuments({ user: req.user.id, isActive: true }),
      Incident.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('incidentId type status createdAt')
    ]);

    // Calculate average response time
    const resolvedIncidentsWithMetrics = await Incident.find({
      user: req.user.id,
      status: { $in: ['resolved', 'false_alarm'] },
      'metrics.responseTime': { $exists: true }
    }).select('metrics.responseTime');

    const avgResponseTime = resolvedIncidentsWithMetrics.length > 0
      ? resolvedIncidentsWithMetrics.reduce((sum, inc) => sum + inc.metrics.responseTime, 0) / resolvedIncidentsWithMetrics.length
      : 0;

    const stats = {
      incidents: {
        total: totalIncidents,
        active: activeIncidents,
        resolved: resolvedIncidents,
        recent: recentIncidents
      },
      devices: {
        total: deviceCount,
        paired: deviceCount // Assuming all devices in DB are paired
      },
      contacts: {
        total: contactCount
      },
      performance: {
        averageResponseTime: Math.round(avgResponseTime),
        responseTimeUnit: 'seconds'
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/me
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation is required'
      });
    }

    const user = await User.findById(req.user.id);
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Soft delete - deactivate account instead of permanent deletion
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.phone = `deleted_${Date.now()}_${user.phone}`;
    await user.save();

    // Deactivate all user's devices
    await Device.updateMany(
      { user: req.user.id },
      { $set: { isActive: false, isPaired: false } }
    );

    // Deactivate all contacts
    await Contact.updateMany(
      { user: req.user.id },
      { $set: { isActive: false } }
    );

    logger.info(`User account deleted: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};

// Routes
router.get('/me', auth, getProfile);
router.put('/me', auth, validateProfileUpdate, updateProfile);
router.put('/me/location', auth, updateLocation);
router.get('/me/stats', auth, getUserStats);
router.delete('/me', auth, deleteAccount);

module.exports = router;
