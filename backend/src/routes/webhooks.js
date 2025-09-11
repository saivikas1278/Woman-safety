const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Handle Twilio voice response webhook
// @route   POST /api/webhooks/voice-response
// @access  Public (Twilio webhook)
const handleVoiceResponse = async (req, res) => {
  try {
    const { Digits, CallSid, From } = req.body;

    logger.info(`Voice response received: ${Digits} from ${From} (${CallSid})`);

    let responseMessage = '';

    switch (Digits) {
      case '1':
        responseMessage = 'Thank you for acknowledging the emergency. Help is on the way.';
        // TODO: Update incident status to acknowledged
        break;
      case '2':
        responseMessage = 'Emergency ignored. Thank you.';
        // TODO: Log that contact ignored the emergency
        break;
      default:
        responseMessage = 'Invalid response. Please call back if you need to help.';
    }

    // Respond with TwiML
    const twiml = `
      <Response>
        <Say voice="alice" language="en-US">${responseMessage}</Say>
        <Hangup/>
      </Response>
    `;

    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    logger.error('Voice response webhook error:', error);
    res.status(500).send('<Response><Say>System error</Say></Response>');
  }
};

// @desc    Handle SMS response webhook
// @route   POST /api/webhooks/sms-response
// @access  Public (Twilio webhook)
const handleSMSResponse = async (req, res) => {
  try {
    const { Body, From, MessageSid } = req.body;

    logger.info(`SMS response received: "${Body}" from ${From} (${MessageSid})`);

    const message = Body.trim().toLowerCase();

    // Handle verification codes
    if (/^[a-f0-9]{6}$/i.test(message)) {
      // This is likely a verification code
      // TODO: Find and verify the contact with this code
      logger.info(`Verification code received: ${message} from ${From}`);
    }

    // Handle emergency responses
    else if (message.includes('help') || message.includes('emergency')) {
      // Contact is responding to emergency
      // TODO: Update incident status or create new incident
      logger.info(`Emergency response received from ${From}: ${message}`);
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('SMS response webhook error:', error);
    res.status(500).send('Error');
  }
};

// @desc    Handle device webhook (for IoT device communication)
// @route   POST /api/webhooks/device/:serialNumber
// @access  Public (device authentication should be implemented)
const handleDeviceWebhook = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const {
      type,
      data,
      timestamp,
      signature // For webhook verification
    } = req.body;

    // TODO: Verify webhook signature for security

    const Device = require('../models/Device');
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

    switch (type) {
      case 'telemetry':
        await handleTelemetryData(device, data);
        break;
      case 'sos':
        await handleSOSAlert(device, data);
        break;
      case 'fall_detected':
        await handleFallDetection(device, data);
        break;
      case 'tamper_alert':
        await handleTamperAlert(device, data);
        break;
      case 'low_battery':
        await handleLowBattery(device, data);
        break;
      default:
        logger.warn(`Unknown webhook type: ${type} from device: ${serialNumber}`);
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Device webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook'
    });
  }
};

// Helper functions for device webhook handling
const handleTelemetryData = async (device, data) => {
  const { lat, lng, accuracy, speed, battery, cellularSignal } = data;

  if (lat && lng) {
    await device.updateLocation(lat, lng, accuracy, speed);
  }

  if (battery !== undefined) {
    await device.updateBattery(battery, data.isCharging);
  }

  if (cellularSignal !== undefined) {
    device.connectivity.cellular.signal = cellularSignal;
    await device.save();
  }

  logger.info(`Telemetry updated for device: ${device.serialNumber}`);
};

const handleSOSAlert = async (device, data) => {
  const Incident = require('../models/Incident');
  
  // Create new incident
  const incident = new Incident({
    user: device.user,
    device: device._id,
    type: 'manual_sos',
    priority: 'critical',
    location: {
      initial: {
        type: 'Point',
        coordinates: [data.lng, data.lat],
        accuracy: data.accuracy,
        timestamp: new Date()
      },
      current: {
        type: 'Point',
        coordinates: [data.lng, data.lat],
        accuracy: data.accuracy,
        timestamp: new Date()
      }
    },
    deviceData: {
      batteryLevel: data.battery,
      signalStrength: data.cellularSignal,
      eventId: data.eventId
    }
  });

  incident.addTimelineEntry('SOS button pressed', device.user, {
    source: 'device',
    deviceSerial: device.serialNumber
  });

  await incident.save();

  // Trigger emergency notifications
  const { sendEmergencyNotifications } = require('../services/emergencyService');
  await sendEmergencyNotifications(incident);

  logger.info(`SOS alert created: ${incident.incidentId} from device: ${device.serialNumber}`);
};

const handleFallDetection = async (device, data) => {
  const Incident = require('../models/Incident');
  
  const incident = new Incident({
    user: device.user,
    device: device._id,
    type: 'fall_detection',
    priority: 'high',
    location: {
      initial: {
        type: 'Point',
        coordinates: [data.lng, data.lat],
        accuracy: data.accuracy,
        timestamp: new Date()
      },
      current: {
        type: 'Point',
        coordinates: [data.lng, data.lat],
        accuracy: data.accuracy,
        timestamp: new Date()
      }
    },
    deviceData: {
      batteryLevel: data.battery,
      sensorData: data.accelerometerData
    }
  });

  incident.addTimelineEntry('Fall detected by device', device.user, {
    source: 'device',
    sensorData: data.accelerometerData
  });

  await incident.save();

  // Send notifications (with shorter delay for fall detection)
  const { sendEmergencyNotifications } = require('../services/emergencyService');
  await sendEmergencyNotifications(incident);

  logger.info(`Fall detection incident created: ${incident.incidentId}`);
};

const handleTamperAlert = async (device, data) => {
  // Create tamper incident with medium priority
  const Incident = require('../models/Incident');
  
  const incident = new Incident({
    user: device.user,
    device: device._id,
    type: 'tamper_alert',
    priority: 'medium',
    location: {
      initial: {
        type: 'Point',
        coordinates: [data.lng || 0, data.lat || 0],
        accuracy: data.accuracy,
        timestamp: new Date()
      },
      current: {
        type: 'Point',
        coordinates: [data.lng || 0, data.lat || 0],
        accuracy: data.accuracy,
        timestamp: new Date()
      }
    }
  });

  await incident.save();
  logger.info(`Tamper alert created: ${incident.incidentId}`);
};

const handleLowBattery = async (device, data) => {
  // Send low battery notification to user
  logger.info(`Low battery alert for device: ${device.serialNumber} (${data.battery}%)`);
  
  // TODO: Send push notification or SMS to user about low battery
};

// Routes
router.post('/voice-response', handleVoiceResponse);
router.post('/sms-response', handleSMSResponse);
router.post('/device/:serialNumber', handleDeviceWebhook);

module.exports = router;
