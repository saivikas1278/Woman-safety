const express = require('express');
const Geofence = require('../models/Geofence');
const { auth } = require('../middleware/auth');
const { validateGeofence } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get all geofences for user
// @route   GET /api/geofences
// @access  Private
const getGeofences = async (req, res) => {
  try {
    const geofences = await Geofence.find({
      user: req.user.id,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: geofences.length,
      data: geofences
    });

  } catch (error) {
    logger.error('Get geofences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch geofences'
    });
  }
};

// @desc    Get single geofence
// @route   GET /api/geofences/:id
// @access  Private
const getGeofence = async (req, res) => {
  try {
    const geofence = await Geofence.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!geofence) {
      return res.status(404).json({
        success: false,
        message: 'Geofence not found'
      });
    }

    res.json({
      success: true,
      data: geofence
    });

  } catch (error) {
    logger.error('Get geofence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch geofence'
    });
  }
};

// @desc    Create new geofence
// @route   POST /api/geofences
// @access  Private
const createGeofence = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      coordinates, // Array of [lng, lat] points
      alerts,
      schedule,
      color
    } = req.body;

    // Validate coordinates form a closed polygon
    if (coordinates.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Polygon must have at least 4 coordinates'
      });
    }

    // Ensure polygon is closed (first and last points are the same)
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      coordinates.push(firstPoint); // Close the polygon
    }

    const geofence = new Geofence({
      user: req.user.id,
      name,
      description,
      type,
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates] // Polygon coordinates format
      },
      alerts: alerts || {
        onEntry: { enabled: true, message: `Entered ${name}` },
        onExit: { enabled: true, message: `Exited ${name}` }
      },
      schedule,
      color: color || (type === 'safe_zone' ? '#00FF00' : type === 'danger_zone' ? '#FF0000' : '#FFA500')
    });

    await geofence.save();

    logger.info(`Geofence created: ${name} for user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Geofence created successfully',
      data: geofence
    });

  } catch (error) {
    logger.error('Create geofence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create geofence'
    });
  }
};

// @desc    Update geofence
// @route   PUT /api/geofences/:id
// @access  Private
const updateGeofence = async (req, res) => {
  try {
    const geofence = await Geofence.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!geofence) {
      return res.status(404).json({
        success: false,
        message: 'Geofence not found'
      });
    }

    const allowedUpdates = [
      'name', 'description', 'type', 'alerts', 'schedule', 'color', 'isActive'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Handle coordinates update
    if (req.body.coordinates) {
      const coordinates = req.body.coordinates;
      
      // Ensure polygon is closed
      const firstPoint = coordinates[0];
      const lastPoint = coordinates[coordinates.length - 1];
      
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        coordinates.push(firstPoint);
      }

      updates.geometry = {
        type: 'Polygon',
        coordinates: [coordinates]
      };
    }

    const updatedGeofence = await Geofence.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    logger.info(`Geofence updated: ${geofence.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Geofence updated successfully',
      data: updatedGeofence
    });

  } catch (error) {
    logger.error('Update geofence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update geofence'
    });
  }
};

// @desc    Delete geofence
// @route   DELETE /api/geofences/:id
// @access  Private
const deleteGeofence = async (req, res) => {
  try {
    const geofence = await Geofence.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!geofence) {
      return res.status(404).json({
        success: false,
        message: 'Geofence not found'
      });
    }

    // Soft delete
    geofence.isActive = false;
    await geofence.save();

    logger.info(`Geofence deleted: ${geofence.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Geofence deleted successfully'
    });

  } catch (error) {
    logger.error('Delete geofence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete geofence'
    });
  }
};

// @desc    Check geofence triggers for location
// @route   POST /api/geofences/check
// @access  Private
const checkGeofences = async (req, res) => {
  try {
    const { lat, lng, deviceId } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Find all active geofences for user
    const geofences = await Geofence.find({
      user: req.user.id,
      isActive: true
    });

    const triggers = [];

    for (const geofence of geofences) {
      // Check if geofence is currently active based on schedule
      if (!geofence.isCurrentlyActive()) {
        continue;
      }

      // Use MongoDB geospatial query to check if point is within polygon
      const pointInPolygon = await Geofence.findOne({
        _id: geofence._id,
        geometry: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          }
        }
      });

      if (pointInPolygon) {
        // Point is inside geofence
        if (geofence.alerts.onEntry.enabled) {
          triggers.push({
            geofenceId: geofence._id,
            name: geofence.name,
            type: 'entry',
            alertType: geofence.type,
            message: geofence.alerts.onEntry.message,
            severity: geofence.alerts.onEntry.severity,
            notifyContacts: geofence.alerts.onEntry.notifyContacts
          });

          // Record entry
          await geofence.recordEntry();
        }
      } else {
        // Check if user was previously inside and is now outside
        // This would require tracking previous location state
        // For now, we'll just check if exit alerts are enabled
        if (geofence.alerts.onExit.enabled) {
          // This logic would be more complex in a real implementation
          // You'd need to track the previous location state
        }
      }
    }

    res.json({
      success: true,
      data: {
        triggers,
        location: { lat, lng },
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Check geofences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check geofences'
    });
  }
};

// @desc    Get geofence statistics
// @route   GET /api/geofences/:id/stats
// @access  Private
const getGeofenceStats = async (req, res) => {
  try {
    const geofence = await Geofence.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!geofence) {
      return res.status(404).json({
        success: false,
        message: 'Geofence not found'
      });
    }

    // Calculate additional statistics
    const stats = {
      ...geofence.statistics,
      averageTimeInside: geofence.statistics.entriesCount > 0 
        ? Math.round(geofence.statistics.totalTimeInside / geofence.statistics.entriesCount)
        : 0,
      lastActivity: Math.max(
        geofence.statistics.lastEntry?.getTime() || 0,
        geofence.statistics.lastExit?.getTime() || 0
      )
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get geofence stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch geofence statistics'
    });
  }
};

// Routes
router.get('/', auth, getGeofences);
router.get('/:id', auth, getGeofence);
router.post('/', auth, validateGeofence, createGeofence);
router.put('/:id', auth, updateGeofence);
router.delete('/:id', auth, deleteGeofence);
router.post('/check', auth, checkGeofences);
router.get('/:id/stats', auth, getGeofenceStats);

module.exports = router;
