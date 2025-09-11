const express = require('express');
const Device = require('../models/Device');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateDevicePairing } = require('../middleware/validation');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();

// @desc    Get all user devices
// @route   GET /api/devices
// @access  Private
const getDevices = async (req, res) => {
  try {
    const devices = await Device.find({ 
      user: req.user.id,
      isActive: true 
    }).select('-pairingCode');

    res.json({
      success: true,
      count: devices.length,
      data: devices
    });

  } catch (error) {
    logger.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices'
    });
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
// @access  Private
const getDevice = async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    }).select('-pairingCode');

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.json({
      success: true,
      data: device
    });

  } catch (error) {
    logger.error('Get device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device'
    });
  }
};

// @desc    Pair new device
// @route   POST /api/devices/pair
// @access  Private
const pairDevice = async (req, res) => {
  try {
    const { serialNumber, pairingCode, name } = req.body;

    // Check if device exists and is not already paired
    let device = await Device.findOne({ serialNumber });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found. Please check the serial number.'
      });
    }

    if (device.isPaired && device.user) {
      return res.status(400).json({
        success: false,
        message: 'Device is already paired with another user'
      });
    }

    // Verify pairing code
    if (device.pairingCode !== pairingCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pairing code'
      });
    }

    // Pair device with user
    device.user = req.user.id;
    device.isPaired = true;
    device.status = 'active';
    device.name = name || device.name;
    device.lastSeen = new Date();

    await device.save();

    // Add device to user's devices array
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { devices: device._id }
    });

    logger.info(`Device paired: ${serialNumber} with user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Device paired successfully',
      data: {
        id: device._id,
        serialNumber: device.serialNumber,
        name: device.name,
        model: device.model,
        status: device.status,
        isPaired: device.isPaired,
        lastSeen: device.lastSeen
      }
    });

  } catch (error) {
    logger.error('Device pairing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pair device'
    });
  }
};

// @desc    Unpair device
// @route   DELETE /api/devices/:id/unpair
// @access  Private
const unpairDevice = async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Generate new pairing code for future pairing
    const newPairingCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    device.user = null;
    device.isPaired = false;
    device.status = 'inactive';
    device.pairingCode = newPairingCode;

    await device.save();

    // Remove device from user's devices array
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { devices: device._id }
    });

    logger.info(`Device unpaired: ${device.serialNumber} from user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Device unpaired successfully'
    });

  } catch (error) {
    logger.error('Device unpairing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unpair device'
    });
  }
};

// @desc    Get device status and telemetry
// @route   GET /api/devices/:id/status
// @access  Private
const getDeviceStatus = async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const status = {
      id: device._id,
      serialNumber: device.serialNumber,
      name: device.name,
      isOnline: device.isOnline(),
      lastSeen: device.lastSeen,
      battery: device.battery,
      connectivity: device.connectivity,
      location: device.location,
      sensors: device.sensors,
      status: device.status
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Get device status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device status'
    });
  }
};

// @desc    Update device settings
// @route   PUT /api/devices/:id/settings
// @access  Private
const updateDeviceSettings = async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const allowedSettings = [
      'sosButtonHoldTime',
      'autoIncidentDetection',
      'voiceRecording',
      'emergencyContacts'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedSettings.includes(key)) {
        updates[`settings.${key}`] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid settings provided'
      });
    }

    const updatedDevice = await Device.findByIdAndUpdate(
      device._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    logger.info(`Device settings updated: ${device.serialNumber}`);

    res.json({
      success: true,
      message: 'Device settings updated successfully',
      data: updatedDevice.settings
    });

  } catch (error) {
    logger.error('Update device settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device settings'
    });
  }
};

// @desc    Get device location history
// @route   GET /api/devices/:id/location-history
// @access  Private
const getLocationHistory = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const device = await Device.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // In a real application, you would query a separate LocationHistory collection
    // For now, we'll return the current location
    const locationHistory = [{
      coordinates: device.location.coordinates,
      accuracy: device.location.accuracy,
      speed: device.location.speed,
      timestamp: device.location.lastUpdated
    }];

    res.json({
      success: true,
      count: locationHistory.length,
      data: locationHistory
    });

  } catch (error) {
    logger.error('Get location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location history'
    });
  }
};

// @desc    Update device telemetry (called by device)
// @route   POST /api/devices/:serialNumber/telemetry
// @access  Public (device authentication should be implemented)
const updateTelemetry = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const { 
      lat, 
      lng, 
      accuracy = 0, 
      speed = 0, 
      battery, 
      isCharging = false,
      cellularSignal,
      gpsSignal,
      sensorData 
    } = req.body;

    const device = await Device.findOne({ 
      serialNumber,
      isPaired: true,
      isActive: true 
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or not paired'
      });
    }

    // Update location if provided
    if (lat !== undefined && lng !== undefined) {
      await device.updateLocation(lat, lng, accuracy, speed);
    }

    // Update battery if provided
    if (battery !== undefined) {
      await device.updateBattery(battery, isCharging);
    }

    // Update connectivity
    if (cellularSignal !== undefined) {
      device.connectivity.cellular.signal = cellularSignal;
    }

    if (gpsSignal !== undefined) {
      device.connectivity.gps.hasSignal = gpsSignal > 0;
      device.connectivity.gps.accuracy = accuracy;
    }

    device.lastSeen = new Date();
    await device.save();

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io && device.user) {
      io.to(`user:${device.user}`).emit('device:telemetry', {
        deviceId: device._id,
        location: device.location,
        battery: device.battery,
        connectivity: device.connectivity,
        lastSeen: device.lastSeen
      });
    }

    res.json({
      success: true,
      message: 'Telemetry updated successfully'
    });

  } catch (error) {
    logger.error('Update telemetry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update telemetry'
    });
  }
};

// Routes
router.get('/', auth, getDevices);
router.get('/:id', auth, getDevice);
router.post('/pair', auth, validateDevicePairing, pairDevice);
router.delete('/:id/unpair', auth, unpairDevice);
router.get('/:id/status', auth, getDeviceStatus);
router.put('/:id/settings', auth, updateDeviceSettings);
router.get('/:id/location-history', auth, getLocationHistory);
router.post('/:serialNumber/telemetry', updateTelemetry);

module.exports = router;
