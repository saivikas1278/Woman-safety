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

// @desc    Generate TwiML for emergency calls
// @route   GET /api/webhooks/twilio/emergency-twiml
// @access  Public (Twilio webhook)
const handleEmergencyTwiML = async (req, res) => {
  try {
    const { userName, emergencyType, contactName, latitude, longitude, timestamp } = req.query;

    const locationText = latitude && longitude 
      ? `The emergency location is latitude ${latitude}, longitude ${longitude}.`
      : 'Location information is not available.';

    const emergencyMessage = `
      Hello ${contactName || 'Emergency Contact'}. 
      This is an automated emergency alert from the Women's Safety Application.
      ${userName || 'A user'} has activated an emergency alert.
      Emergency type: ${emergencyType || 'General emergency'}.
      ${locationText}
      Time of emergency: ${new Date(timestamp).toLocaleString()}.
      
      Press 1 to acknowledge that you have received this alert and will provide assistance.
      Press 2 if you cannot help at this time.
      Press 0 to repeat this message.
    `;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Gather input="dtmf" timeout="30" numDigits="1" action="/api/webhooks/twilio/emergency-response">
          <Say voice="alice" language="en-US">${emergencyMessage}</Say>
        </Gather>
        <Say voice="alice" language="en-US">No response received. This call will now end. Please call back if you can provide assistance.</Say>
        <Hangup/>
      </Response>
    `;

    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    logger.error('Emergency TwiML generation error:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice" language="en-US">Emergency system error. Please call emergency services directly.</Say>
        <Hangup/>
      </Response>
    `;
    res.type('text/xml').send(errorTwiml);
  }
};

// @desc    Handle emergency call responses (DTMF input)
// @route   POST /api/webhooks/twilio/emergency-response
// @access  Public (Twilio webhook)
const handleEmergencyResponse = async (req, res) => {
  try {
    const { Digits, CallSid, From, To } = req.body;

    logger.info(`Emergency response received: ${Digits} from ${From} (CallSid: ${CallSid})`);

    let responseMessage = '';
    let responseAction = '';

    switch (Digits) {
      case '1':
        responseMessage = 'Thank you for acknowledging this emergency alert. Your assistance is greatly appreciated. Emergency services may also be notified.';
        responseAction = 'acknowledged';
        break;
      case '2':
        responseMessage = 'Thank you for responding. We understand you cannot help at this time. Other contacts will be notified.';
        responseAction = 'declined';
        break;
      case '0':
        // Redirect back to main message
        const redirectTwiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Redirect>/api/webhooks/twilio/emergency-twiml?${req.body.originalParams || ''}</Redirect>
          </Response>
        `;
        res.type('text/xml').send(redirectTwiml);
        return;
      default:
        responseMessage = 'Invalid response. Press 1 to acknowledge, 2 if you cannot help, or 0 to repeat the message.';
        const retryTwiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Gather input="dtmf" timeout="15" numDigits="1" action="/api/webhooks/twilio/emergency-response">
              <Say voice="alice" language="en-US">${responseMessage}</Say>
            </Gather>
            <Say voice="alice" language="en-US">Call ended. Please call back if you can provide assistance.</Say>
            <Hangup/>
          </Response>
        `;
        res.type('text/xml').send(retryTwiml);
        return;
    }

    // Log the response to database
    await logEmergencyCallResponse(CallSid, From, responseAction, Digits);

    const finalTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice" language="en-US">${responseMessage}</Say>
        <Hangup/>
      </Response>
    `;

    res.type('text/xml').send(finalTwiml);

  } catch (error) {
    logger.error('Emergency response webhook error:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice" language="en-US">System error. Thank you for your response.</Say>
        <Hangup/>
      </Response>
    `;
    res.type('text/xml').send(errorTwiml);
  }
};

// @desc    Handle call status updates from Twilio
// @route   POST /api/webhooks/twilio/call-status
// @access  Public (Twilio webhook)
const handleCallStatus = async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, To, From } = req.body;

    logger.info(`Call status update: ${CallSid} - ${CallStatus} (Duration: ${CallDuration}s)`);

    // Log call status to database
    await logCallStatus(CallSid, CallStatus, CallDuration, To, From);

    // If call failed, might want to trigger backup actions
    if (CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      logger.warn(`Emergency call failed: ${CallSid} to ${To} (Status: ${CallStatus})`);
      // TODO: Trigger backup emergency actions (SMS, email, or call next contact)
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Call status webhook error:', error);
    res.status(500).send('Error');
  }
};

// @desc    Handle recording status updates from Twilio
// @route   POST /api/webhooks/twilio/recording-status
// @access  Public (Twilio webhook)
const handleRecordingStatus = async (req, res) => {
  try {
    const { RecordingSid, RecordingUrl, CallSid, RecordingStatus } = req.body;

    logger.info(`Recording status: ${RecordingSid} - ${RecordingStatus}`);

    if (RecordingStatus === 'completed' && RecordingUrl) {
      // Store recording URL for emergency documentation
      await saveEmergencyRecording(CallSid, RecordingSid, RecordingUrl);
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Recording status webhook error:', error);
    res.status(500).send('Error');
  }
};

// Helper functions for call logging
const logEmergencyCallResponse = async (callSid, contactPhone, action, digits) => {
  try {
    // Store in database for emergency audit trail
    const EmergencyCall = require('../models/EmergencyCall'); // You'll need to create this model
    
    await EmergencyCall.findOneAndUpdate(
      { callSid },
      {
        $push: {
          responses: {
            contactPhone,
            action,
            digits,
            timestamp: new Date()
          }
        }
      },
      { upsert: true }
    );

    logger.info(`Emergency call response logged: ${callSid} - ${action}`);
  } catch (error) {
    logger.error('Failed to log emergency call response:', error);
  }
};

const logCallStatus = async (callSid, status, duration, to, from) => {
  try {
    const EmergencyCall = require('../models/EmergencyCall');
    
    await EmergencyCall.findOneAndUpdate(
      { callSid },
      {
        status,
        duration: parseInt(duration) || 0,
        to,
        from,
        lastStatusUpdate: new Date()
      },
      { upsert: true }
    );

  } catch (error) {
    logger.error('Failed to log call status:', error);
  }
};

const saveEmergencyRecording = async (callSid, recordingSid, recordingUrl) => {
  try {
    const EmergencyCall = require('../models/EmergencyCall');
    
    await EmergencyCall.findOneAndUpdate(
      { callSid },
      {
        recording: {
          sid: recordingSid,
          url: recordingUrl,
          downloadedAt: null // Can download and store locally later
        }
      }
    );

    logger.info(`Emergency recording saved: ${recordingSid} for call ${callSid}`);
  } catch (error) {
    logger.error('Failed to save emergency recording:', error);
  }
};

// Routes
router.post('/voice-response', handleVoiceResponse);
router.post('/sms-response', handleSMSResponse);
router.post('/device/:serialNumber', handleDeviceWebhook);

// Twilio Auto-Dial Webhooks
router.get('/twilio/emergency-twiml', handleEmergencyTwiML);
router.post('/twilio/emergency-response', handleEmergencyResponse);
router.post('/twilio/call-status', handleCallStatus);
router.post('/twilio/recording-status', handleRecordingStatus);

module.exports = router;
