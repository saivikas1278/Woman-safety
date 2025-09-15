const twilio = require('twilio');
const logger = require('../utils/logger');

class AutoDialService {
  constructor() {
    this.client = null;
    this.initializeTwilio();
  }

  initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !this.twilioNumber) {
      logger.warn('Twilio credentials not configured. Auto-dial functionality will be disabled.');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      logger.info('Twilio client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Twilio client:', error);
    }
  }

  /**
   * Initiate auto-dial to emergency contact
   * @param {string} phoneNumber - Contact phone number
   * @param {Object} emergencyData - Emergency context data
   * @returns {Promise<Object>} Call result
   */
  async initiateEmergencyCall(phoneNumber, emergencyData = {}) {
    if (!this.client) {
      throw new Error('Twilio client not initialized. Check your credentials.');
    }

    try {
      const { userId, userName, location, emergencyType = 'general' } = emergencyData;

      // Generate TwiML URL for emergency call
      const twimlUrl = this.generateTwiMLUrl(emergencyData);

      const call = await this.client.calls.create({
        url: twimlUrl,
        to: phoneNumber,
        from: this.twilioNumber,
        statusCallback: `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhooks/twilio/call-status`,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        timeout: parseInt(process.env.EMERGENCY_TIMEOUT_MS) || 30,
        record: true, // Record emergency calls for documentation
        recordingStatusCallback: `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhooks/twilio/recording-status`
      });

      logger.info(`Emergency call initiated: ${call.sid} to ${phoneNumber}`);
      
      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        to: phoneNumber,
        from: this.twilioNumber,
        dateCreated: call.dateCreated,
        emergencyType,
        userId
      };

    } catch (error) {
      logger.error('Failed to initiate emergency call:', error);
      return {
        success: false,
        error: error.message,
        to: phoneNumber,
        emergencyType: emergencyData.emergencyType || 'general'
      };
    }
  }

  /**
   * Initiate multiple emergency calls to contact list
   * @param {Array} contacts - Array of emergency contacts
   * @param {Object} emergencyData - Emergency context data
   * @returns {Promise<Array>} Array of call results
   */
  async initiateMultipleEmergencyCalls(contacts, emergencyData = {}) {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      throw new Error('No contacts provided for emergency calls');
    }

    const maxCalls = parseInt(process.env.MAX_AUTO_CALLS) || 3;
    const prioritizedContacts = this.prioritizeContacts(contacts).slice(0, maxCalls);

    logger.info(`Initiating emergency calls to ${prioritizedContacts.length} contacts`);

    const callPromises = prioritizedContacts.map(async (contact, index) => {
      // Add slight delay between calls to avoid overwhelming
      if (index > 0) {
        await this.delay(2000);
      }

      return this.initiateEmergencyCall(contact.phone, {
        ...emergencyData,
        contactName: contact.name,
        contactPriority: contact.priority,
        callSequence: index + 1
      });
    });

    try {
      const results = await Promise.allSettled(callPromises);
      
      return results.map(result => ({
        ...result.value,
        status: result.status === 'fulfilled' ? 'completed' : 'failed',
        error: result.status === 'rejected' ? result.reason : null
      }));

    } catch (error) {
      logger.error('Failed to initiate multiple emergency calls:', error);
      throw error;
    }
  }

  /**
   * Generate TwiML URL for emergency call content
   * @param {Object} emergencyData - Emergency context
   * @returns {string} TwiML URL
   */
  generateTwiMLUrl(emergencyData) {
    const { userName, location, emergencyType, contactName } = emergencyData;
    
    // In production, you would host TwiML XML files or use Twilio Studio
    // For now, we'll use a simple webhook that generates TwiML
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const params = new URLSearchParams({
      userName: userName || 'Unknown User',
      emergencyType: emergencyType || 'general',
      contactName: contactName || 'Emergency Contact',
      latitude: location?.latitude || '',
      longitude: location?.longitude || '',
      timestamp: new Date().toISOString()
    });

    return `${baseUrl}/api/webhooks/twilio/emergency-twiml?${params.toString()}`;
  }

  /**
   * Prioritize contacts based on priority level and relationship
   * @param {Array} contacts - Emergency contacts
   * @returns {Array} Sorted contacts by priority
   */
  prioritizeContacts(contacts) {
    const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
    
    return contacts
      .filter(contact => contact.phone && contact.verified !== false)
      .sort((a, b) => {
        // Sort by priority first
        const aPriority = priorityOrder[a.priority] || 999;
        const bPriority = priorityOrder[b.priority] || 999;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Then by relationship importance
        const relationshipOrder = {
          'family': 1, 'spouse': 1, 'parent': 1,
          'friend': 2, 'colleague': 3, 'neighbor': 4, 'other': 5
        };
        
        const aRelation = relationshipOrder[a.relationship] || 999;
        const bRelation = relationshipOrder[b.relationship] || 999;
        
        return aRelation - bRelation;
      });
  }

  /**
   * Get call status and details
   * @param {string} callSid - Twilio call SID
   * @returns {Promise<Object>} Call details
   */
  async getCallStatus(callSid) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const call = await this.client.calls(callSid).fetch();
      
      return {
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        to: call.to,
        from: call.from,
        duration: call.duration,
        price: call.price,
        priceUnit: call.priceUnit,
        dateCreated: call.dateCreated,
        dateUpdated: call.dateUpdated,
        endTime: call.endTime
      };

    } catch (error) {
      logger.error(`Failed to fetch call status for ${callSid}:`, error);
      throw error;
    }
  }

  /**
   * End an ongoing call
   * @param {string} callSid - Twilio call SID
   * @returns {Promise<Object>} Call termination result
   */
  async endCall(callSid) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const call = await this.client.calls(callSid).update({ status: 'completed' });
      
      logger.info(`Emergency call ended: ${callSid}`);
      
      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        endTime: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Failed to end call ${callSid}:`, error);
      throw error;
    }
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if Twilio is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return this.client !== null;
  }

  /**
   * Test Twilio connection
   * @returns {Promise<boolean>} Connection test result
   */
  async testConnection() {
    if (!this.client) {
      return false;
    }

    try {
      // Try to fetch account details to verify connection
      await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      logger.info('Twilio connection test successful');
      return true;
    } catch (error) {
      logger.error('Twilio connection test failed:', error);
      return false;
    }
  }
}

module.exports = new AutoDialService();