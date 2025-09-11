const twilio = require('twilio');
const logger = require('../utils/logger');

// Initialize Twilio client only when valid credentials are available
let client = null;

const initializeTwilio = () => {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_ACCOUNT_SID !== 'demo-account-sid') {
    try {
      client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (error) {
      logger.warn('Failed to initialize Twilio client:', error.message);
    }
  }
  return client;
};

// Send SMS notification
const sendSMS = async (phoneNumber, message) => {
  try {
    const twilioClient = initializeTwilio();
    
    if (!twilioClient) {
      logger.warn('Twilio credentials not configured or invalid, skipping SMS');
      return { success: false, error: 'SMS service not configured' };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    logger.info(`SMS sent successfully to ${phoneNumber}: ${result.sid}`);
    return { success: true, messageId: result.sid };

  } catch (error) {
    logger.error('SMS sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send voice call
const makeVoiceCall = async (phoneNumber, message) => {
  try {
    const twilioClient = initializeTwilio();
    
    if (!twilioClient) {
      logger.warn('Twilio credentials not configured or invalid, skipping voice call');
      return { success: false, error: 'Voice service not configured' };
    }

    const twiml = `
      <Response>
        <Say voice="alice" language="en-US">${message}</Say>
        <Say voice="alice" language="en-US">Press 1 to acknowledge this emergency, or press 2 to ignore.</Say>
        <Gather numDigits="1" action="/api/webhooks/voice-response" method="POST">
          <Say>Please press a key.</Say>
        </Gather>
      </Response>
    `;

    const result = await twilioClient.calls.create({
      twiml: twiml,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    logger.info(`Voice call initiated to ${phoneNumber}: ${result.sid}`);
    return { success: true, callId: result.sid };

  } catch (error) {
    logger.error('Voice call failed:', error);
    return { success: false, error: error.message };
  }
};

// Send email notification
const sendEmail = async (to, subject, htmlContent, textContent = null) => {
  try {
    // Placeholder for email service integration
    // You can integrate with SendGrid, SES, or other email providers
    
    logger.info(`Email would be sent to ${to} with subject: ${subject}`);
    
    // Example with SendGrid (uncomment and configure when ready)
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to,
      from: process.env.FROM_EMAIL,
      subject,
      text: textContent || 'Emergency Alert',
      html: htmlContent,
    };
    
    const result = await sgMail.send(msg);
    return { success: true, messageId: result[0].headers['x-message-id'] };
    */
    
    return { success: true, messageId: 'email-placeholder' };

  } catch (error) {
    logger.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send push notification
const sendPushNotification = async (deviceTokens, title, body, data = {}) => {
  try {
    // Placeholder for FCM/push notification integration
    // You would integrate with Firebase Cloud Messaging here
    
    logger.info(`Push notification would be sent to ${deviceTokens.length} devices: ${title}`);
    
    // Example with FCM (uncomment and configure when ready)
    /*
    const admin = require('firebase-admin');
    
    const message = {
      notification: {
        title,
        body
      },
      data,
      tokens: deviceTokens
    };
    
    const response = await admin.messaging().sendMulticast(message);
    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
    */
    
    return { success: true, successCount: deviceTokens.length, failureCount: 0 };

  } catch (error) {
    logger.error('Push notification failed:', error);
    return { success: false, error: error.message };
  }
};

// Format emergency message
const formatEmergencyMessage = (incident, user, device) => {
  const locationUrl = `https://maps.google.com/?q=${incident.location.current.coordinates[1]},${incident.location.current.coordinates[0]}`;
  
  return {
    sms: `🚨 EMERGENCY ALERT: ${user.name} needs help! 
Type: ${incident.type.replace('_', ' ').toUpperCase()}
Location: ${locationUrl}
Time: ${incident.createdAt.toLocaleString()}
Incident ID: ${incident.incidentId}
Call ${user.phone} immediately!`,

    voice: `Emergency alert for ${user.name}. ${incident.type.replace('_', ' ')} detected. Please check your phone for location details and call them immediately.`,

    email: {
      subject: `🚨 Emergency Alert - ${user.name} Needs Help`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fee; border: 2px solid #d00;">
          <h1 style="color: #d00; text-align: center;">🚨 EMERGENCY ALERT</h1>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>${user.name} needs immediate help!</h2>
            
            <p><strong>Type:</strong> ${incident.type.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Time:</strong> ${incident.createdAt.toLocaleString()}</p>
            <p><strong>Device:</strong> ${device.name} (${device.serialNumber})</p>
            <p><strong>Battery:</strong> ${incident.deviceData.batteryLevel}%</p>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
              <h3>Location:</h3>
              <p><a href="${locationUrl}" style="color: #d00; font-weight: bold;">📍 Open in Google Maps</a></p>
              <p>Coordinates: ${incident.location.current.coordinates[1]}, ${incident.location.current.coordinates[0]}</p>
              <p>Accuracy: ±${incident.location.current.accuracy || 'Unknown'}m</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="tel:${user.phone}" style="background-color: #d00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                📞 Call ${user.name} Now
              </a>
            </div>
            
            <p style="font-size: 12px; color: #666;">
              Incident ID: ${incident.incidentId}<br>
              This is an automated emergency alert from Women Safety System.
            </p>
          </div>
        </div>
      `
    },

    push: {
      title: '🚨 Emergency Alert',
      body: `${user.name} needs help! ${incident.type.replace('_', ' ').toUpperCase()} detected.`,
      data: {
        incidentId: incident.incidentId,
        userId: user._id.toString(),
        lat: incident.location.current.coordinates[1].toString(),
        lng: incident.location.current.coordinates[0].toString(),
        type: 'emergency_alert'
      }
    }
  };
};

// Send notification with retry mechanism
const sendNotificationWithRetry = async (notificationFunc, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await notificationFunc();
      if (result.success) {
        return result;
      }
      lastError = result.error;
    } catch (error) {
      lastError = error.message;
    }
    
    if (attempt < maxRetries) {
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { success: false, error: lastError };
};

module.exports = {
  sendSMS,
  makeVoiceCall,
  sendEmail,
  sendPushNotification,
  formatEmergencyMessage,
  sendNotificationWithRetry
};
