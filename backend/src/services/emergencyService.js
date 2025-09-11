const Contact = require('../models/Contact');
const User = require('../models/User');
const { 
  sendSMS, 
  makeVoiceCall, 
  sendEmail, 
  sendPushNotification, 
  formatEmergencyMessage,
  sendNotificationWithRetry 
} = require('./notificationService');
const logger = require('../utils/logger');

// Send emergency notifications to all relevant parties
const sendEmergencyNotifications = async (incident) => {
  try {
    // Get user and device details
    const user = await User.findById(incident.user).populate('devices');
    const device = user.devices.find(d => d._id.toString() === incident.device.toString());

    if (!user || !device) {
      throw new Error('User or device not found');
    }

    // Get emergency contacts
    const contacts = await Contact.find({ 
      user: incident.user,
      isActive: true 
    }).sort({ priority: 1 });

    // Format messages
    const messages = formatEmergencyMessage(incident, user, device);

    const notificationResults = {
      contacts: [],
      emergencyServices: [],
      volunteers: []
    };

    // Send notifications to emergency contacts
    for (const contact of contacts) {
      const contactResult = {
        contactId: contact._id,
        name: contact.name,
        phone: contact.phone,
        notifications: []
      };

      // Send notifications based on contact preferences
      for (const method of contact.notificationMethods) {
        try {
          let result;
          
          switch (method) {
            case 'sms':
              result = await sendNotificationWithRetry(() => 
                sendSMS(contact.phone, messages.sms)
              );
              break;
              
            case 'call':
              result = await sendNotificationWithRetry(() => 
                makeVoiceCall(contact.phone, messages.voice)
              );
              break;
              
            case 'email':
              if (contact.email) {
                result = await sendNotificationWithRetry(() => 
                  sendEmail(contact.email, messages.email.subject, messages.email.html)
                );
              } else {
                result = { success: false, error: 'No email address' };
              }
              break;
              
            case 'push':
              if (contact.deviceTokens && contact.deviceTokens.length > 0) {
                result = await sendNotificationWithRetry(() => 
                  sendPushNotification(
                    contact.deviceTokens, 
                    messages.push.title, 
                    messages.push.body, 
                    messages.push.data
                  )
                );
              } else {
                result = { success: false, error: 'No device tokens' };
              }
              break;
              
            default:
              result = { success: false, error: 'Unknown notification method' };
          }

          contactResult.notifications.push({
            method,
            success: result.success,
            messageId: result.messageId || result.callId,
            error: result.error,
            timestamp: new Date()
          });

          // Update incident with notification record
          incident.notifications.sent.push({
            recipient: contact._id,
            method,
            status: result.success ? 'sent' : 'failed',
            sentAt: new Date(),
            error: result.error
          });

        } catch (error) {
          logger.error(`Failed to send ${method} to ${contact.name}:`, error);
          contactResult.notifications.push({
            method,
            success: false,
            error: error.message,
            timestamp: new Date()
          });
        }
      }

      notificationResults.contacts.push(contactResult);
    }

    // Send notification to emergency services if configured
    if (shouldNotifyEmergencyServices(incident)) {
      try {
        const emergencyResult = await notifyEmergencyServices(incident, user, device, messages);
        notificationResults.emergencyServices.push(emergencyResult);
      } catch (error) {
        logger.error('Failed to notify emergency services:', error);
      }
    }

    // Update incident with notification results
    await incident.save();

    logger.info(`Emergency notifications sent for incident: ${incident.incidentId}`);
    return notificationResults;

  } catch (error) {
    logger.error('Failed to send emergency notifications:', error);
    throw error;
  }
};

// Determine if emergency services should be notified
const shouldNotifyEmergencyServices = (incident) => {
  // Notify for high priority incidents or specific types
  return incident.priority === 'critical' || 
         ['manual_sos', 'fall_detection'].includes(incident.type);
};

// Notify emergency services (police, medical)
const notifyEmergencyServices = async (incident, user, device, messages) => {
  const results = {
    police: { notified: false, error: null },
    medical: { notified: false, error: null }
  };

  try {
    // This would integrate with local emergency services APIs
    // For demo purposes, we'll log the notification
    
    const emergencyInfo = {
      incidentId: incident.incidentId,
      type: incident.type,
      priority: incident.priority,
      location: {
        lat: incident.location.current.coordinates[1],
        lng: incident.location.current.coordinates[0],
        accuracy: incident.location.current.accuracy
      },
      user: {
        name: user.name,
        phone: user.phone,
        emergencyInfo: user.profile.emergencyInfo
      },
      device: {
        serial: device.serialNumber,
        batteryLevel: incident.deviceData.batteryLevel
      },
      timestamp: incident.createdAt
    };

    // In a real implementation, you would:
    // 1. Send to local police dispatch system
    // 2. Send to medical emergency services
    // 3. Integrate with 911/emergency hotline systems
    // 4. Use location-based emergency service routing

    logger.info('Emergency services would be notified:', emergencyInfo);

    // Update incident record
    incident.notifications.emergencyServices.police = {
      notified: true,
      notifiedAt: new Date(),
      caseNumber: `POL-${Date.now()}`
    };

    results.police = { notified: true, caseNumber: `POL-${Date.now()}` };

    // For medical emergencies or fall detection
    if (['fall_detection', 'heartrate_anomaly'].includes(incident.type)) {
      incident.notifications.emergencyServices.medical = {
        notified: true,
        notifiedAt: new Date(),
        caseNumber: `MED-${Date.now()}`
      };

      results.medical = { notified: true, caseNumber: `MED-${Date.now()}` };
    }

  } catch (error) {
    logger.error('Emergency services notification failed:', error);
    results.police.error = error.message;
    results.medical.error = error.message;
  }

  return results;
};

// Send follow-up notifications
const sendFollowUpNotification = async (incident, message, recipients = 'contacts') => {
  try {
    const user = await User.findById(incident.user);
    const contacts = await Contact.find({ 
      user: incident.user,
      isActive: true 
    }).sort({ priority: 1 });

    const results = [];

    for (const contact of contacts) {
      // Send SMS follow-up
      const smsResult = await sendSMS(
        contact.phone, 
        `UPDATE: ${message} - Incident ${incident.incidentId}`
      );

      results.push({
        contactId: contact._id,
        method: 'sms',
        success: smsResult.success,
        error: smsResult.error
      });
    }

    logger.info(`Follow-up notifications sent for incident: ${incident.incidentId}`);
    return results;

  } catch (error) {
    logger.error('Failed to send follow-up notifications:', error);
    throw error;
  }
};

// Send incident resolution notification
const sendResolutionNotification = async (incident) => {
  try {
    const user = await User.findById(incident.user);
    const resolutionMessage = `RESOLVED: ${user.name} is now safe. Incident ${incident.incidentId} has been resolved. Thank you for your concern.`;

    return await sendFollowUpNotification(incident, resolutionMessage);

  } catch (error) {
    logger.error('Failed to send resolution notification:', error);
    throw error;
  }
};

// Send periodic location updates during active incident
const sendLocationUpdate = async (incident, newLocation) => {
  try {
    const user = await User.findById(incident.user);
    const locationUrl = `https://maps.google.com/?q=${newLocation.coordinates[1]},${newLocation.coordinates[0]}`;
    
    const updateMessage = `LOCATION UPDATE: ${user.name} moved to new location. Updated map: ${locationUrl} - Incident ${incident.incidentId}`;

    // Only send to primary contacts to avoid spam
    const primaryContacts = await Contact.find({ 
      user: incident.user,
      priority: { $lte: 2 },
      isActive: true 
    });

    const results = [];

    for (const contact of primaryContacts) {
      const smsResult = await sendSMS(contact.phone, updateMessage);
      results.push({
        contactId: contact._id,
        success: smsResult.success,
        error: smsResult.error
      });
    }

    return results;

  } catch (error) {
    logger.error('Failed to send location update:', error);
    throw error;
  }
};

module.exports = {
  sendEmergencyNotifications,
  sendFollowUpNotification,
  sendResolutionNotification,
  sendLocationUpdate,
  notifyEmergencyServices
};
