const express = require('express');
const Contact = require('../models/Contact');
const { auth } = require('../middleware/auth');
const { validateContact } = require('../middleware/validation');
const logger = require('../utils/logger');
const { sendSMS } = require('../services/notificationService');
const crypto = require('crypto');

const router = express.Router();

// @desc    Get all contacts for user
// @route   GET /api/contacts
// @access  Private
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({
      user: req.user.id,
      isActive: true
    }).sort({ priority: 1, createdAt: -1 });

    res.json({
      success: true,
      count: contacts.length,
      data: contacts
    });

  } catch (error) {
    logger.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts'
    });
  }
};

// @desc    Get single contact
// @route   GET /api/contacts/:id
// @access  Private
const getContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    logger.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact'
    });
  }
};

// @desc    Create new contact
// @route   POST /api/contacts
// @access  Private
const createContact = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      relationship,
      priority,
      notificationMethods,
      address,
      notes,
      isEmergencyContact
    } = req.body;

    // Check if contact already exists for this user
    const existingContact = await Contact.findOne({
      user: req.user.id,
      phone,
      isActive: true
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'Contact with this phone number already exists'
      });
    }

    // Generate verification code
    const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const contact = new Contact({
      user: req.user.id,
      name,
      phone,
      email,
      relationship,
      priority: priority || 5,
      notificationMethods: notificationMethods || ['sms', 'call'],
      address,
      notes,
      isEmergencyContact: isEmergencyContact !== undefined ? isEmergencyContact : true,
      verification: {
        verificationCode
      }
    });

    await contact.save();

    // Send verification SMS
    try {
      await sendSMS(
        phone,
        `${req.user.name} has added you as an emergency contact. Reply with code ${verificationCode} to confirm. Women Safety App.`
      );
    } catch (smsError) {
      logger.error('Failed to send verification SMS:', smsError);
    }

    logger.info(`Contact created: ${name} for user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Contact created successfully. Verification SMS sent.',
      data: contact
    });

  } catch (error) {
    logger.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contact'
    });
  }
};

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
const updateContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    const allowedUpdates = [
      'name', 'email', 'relationship', 'priority', 
      'notificationMethods', 'address', 'notes', 'isEmergencyContact'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // If phone is being updated, require re-verification
    if (req.body.phone && req.body.phone !== contact.phone) {
      const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      updates.phone = req.body.phone;
      updates['verification.isVerified'] = false;
      updates['verification.verificationCode'] = verificationCode;

      // Send verification SMS to new number
      try {
        await sendSMS(
          req.body.phone,
          `${req.user.name} has updated your contact info. Reply with code ${verificationCode} to confirm. Women Safety App.`
        );
      } catch (smsError) {
        logger.error('Failed to send verification SMS:', smsError);
      }
    }

    const updatedContact = await Contact.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    logger.info(`Contact updated: ${contact.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: updatedContact
    });

  } catch (error) {
    logger.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact'
    });
  }
};

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
// @access  Private
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Soft delete
    contact.isActive = false;
    await contact.save();

    logger.info(`Contact deleted: ${contact.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    logger.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact'
    });
  }
};

// @desc    Verify contact
// @route   POST /api/contacts/:id/verify
// @access  Private
const verifyContact = async (req, res) => {
  try {
    const { verificationCode } = req.body;

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    if (contact.verification.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Contact is already verified'
      });
    }

    if (contact.verification.verificationCode !== verificationCode.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    await contact.verify();

    logger.info(`Contact verified: ${contact.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Contact verified successfully',
      data: contact
    });

  } catch (error) {
    logger.error('Verify contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify contact'
    });
  }
};

// @desc    Send test notification to contact
// @route   POST /api/contacts/:id/test
// @access  Private
const testContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    const testMessage = `This is a test message from ${req.user.name} via Women Safety App. If you receive this, your emergency contact is set up correctly.`;

    const results = [];

    // Send test SMS
    if (contact.notificationMethods.includes('sms')) {
      try {
        const smsResult = await sendSMS(contact.phone, testMessage);
        results.push({
          method: 'sms',
          success: smsResult.success,
          error: smsResult.error
        });
      } catch (error) {
        results.push({
          method: 'sms',
          success: false,
          error: error.message
        });
      }
    }

    // Update last contacted
    await contact.updateLastContacted();

    logger.info(`Test notification sent to contact: ${contact.name}`);

    res.json({
      success: true,
      message: 'Test notification sent',
      data: results
    });

  } catch (error) {
    logger.error('Test contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
};

// @desc    Reorder contacts priority
// @route   PUT /api/contacts/reorder
// @access  Private
const reorderContacts = async (req, res) => {
  try {
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds)) {
      return res.status(400).json({
        success: false,
        message: 'Contact IDs must be an array'
      });
    }

    // Update priorities based on order
    for (let i = 0; i < contactIds.length; i++) {
      await Contact.findOneAndUpdate(
        { _id: contactIds[i], user: req.user.id },
        { priority: i + 1 }
      );
    }

    logger.info(`Contacts reordered for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Contact priorities updated successfully'
    });

  } catch (error) {
    logger.error('Reorder contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder contacts'
    });
  }
};

// @desc    Send emergency alert to all contacts
// @route   POST /api/contacts/emergency-alert
// @access  Private
const sendEmergencyAlert = async (req, res) => {
  try {
    const { message, location, severity = 'high' } = req.body;

    // Get all emergency contacts sorted by priority
    const contacts = await Contact.find({
      user: req.user.id,
      isActive: true,
      isEmergencyContact: true,
      'verification.isVerified': true
    }).sort({ priority: 1 });

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No verified emergency contacts found'
      });
    }

    const alertMessage = message || `EMERGENCY ALERT from ${req.user.name}. Please check on me immediately. Location: ${location ? `${location.lat}, ${location.lng}` : 'Unknown'}`;
    
    const results = [];

    // Send alerts based on severity and contact preferences
    for (const contact of contacts) {
      const contactResults = [];

      // Send SMS if enabled
      if (contact.notificationMethods.includes('sms')) {
        try {
          const smsResult = await sendSMS(contact.phone, alertMessage);
          contactResults.push({
            method: 'sms',
            success: smsResult.success,
            error: smsResult.error
          });
        } catch (error) {
          contactResults.push({
            method: 'sms',
            success: false,
            error: error.message
          });
        }
      }

      // Update last contacted
      await contact.updateLastContacted();

      results.push({
        contactId: contact._id,
        name: contact.name,
        phone: contact.phone,
        priority: contact.priority,
        results: contactResults
      });

      // For high severity, add delay between contacts to avoid overwhelming
      if (severity === 'high' && contacts.indexOf(contact) < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logger.info(`Emergency alert sent to ${contacts.length} contacts for user: ${req.user.email}`);

    res.json({
      success: true,
      message: `Emergency alert sent to ${contacts.length} contacts`,
      data: {
        contactsNotified: contacts.length,
        results
      }
    });

  } catch (error) {
    logger.error('Emergency alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emergency alert'
    });
  }
};

// @desc    Get contact statistics
// @route   GET /api/contacts/stats
// @access  Private
const getContactStats = async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      { $match: { user: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          verifiedContacts: {
            $sum: { $cond: [{ $eq: ['$verification.isVerified', true] }, 1, 0] }
          },
          emergencyContacts: {
            $sum: { $cond: [{ $eq: ['$isEmergencyContact', true] }, 1, 0] }
          },
          highPriorityContacts: {
            $sum: { $cond: [{ $lte: ['$priority', 3] }, 1, 0] }
          },
          averagePriority: { $avg: '$priority' }
        }
      }
    ]);

    const result = stats[0] || {
      totalContacts: 0,
      verifiedContacts: 0,
      emergencyContacts: 0,
      highPriorityContacts: 0,
      averagePriority: 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Contact stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contact statistics'
    });
  }
};

// @desc    Bulk import contacts
// @route   POST /api/contacts/bulk-import
// @access  Private
const bulkImportContacts = async (req, res) => {
  try {
    const { contacts: importContacts } = req.body;

    if (!Array.isArray(importContacts) || importContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No contacts provided for import'
      });
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const contactData of importContacts) {
      try {
        // Check if contact already exists
        const existingContact = await Contact.findOne({
          user: req.user.id,
          phone: contactData.phone,
          isActive: true
        });

        if (existingContact) {
          results.failed++;
          results.errors.push({
            phone: contactData.phone,
            error: 'Contact already exists'
          });
          continue;
        }

        // Generate verification code
        const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();

        const contact = new Contact({
          user: req.user.id,
          name: contactData.name,
          phone: contactData.phone,
          email: contactData.email,
          relationship: contactData.relationship || 'Friend',
          priority: contactData.priority || 5,
          notificationMethods: contactData.notificationMethods || ['sms', 'call'],
          isEmergencyContact: contactData.isEmergencyContact !== false,
          verification: {
            verificationCode
          }
        });

        await contact.save();
        results.successful++;

        // Send verification SMS (optional, can be skipped for bulk import)
        if (contactData.sendVerification !== false) {
          try {
            await sendSMS(
              contact.phone,
              `${req.user.name} has added you as an emergency contact. Reply with code ${verificationCode} to confirm. Women Safety App.`
            );
          } catch (smsError) {
            logger.error('Failed to send bulk verification SMS:', smsError);
          }
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: contactData.phone,
          error: error.message
        });
      }
    }

    logger.info(`Bulk import completed for user: ${req.user.email}. Success: ${results.successful}, Failed: ${results.failed}`);

    res.json({
      success: true,
      message: `Bulk import completed. ${results.successful} contacts added, ${results.failed} failed.`,
      data: results
    });

  } catch (error) {
    logger.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import contacts'
    });
  }
};

// @desc    Initiate auto-dial emergency calls
// @route   POST /api/contacts/emergency/auto-dial
// @access  Private
const initiateAutoDial = async (req, res) => {
  try {
    const { emergencyType = 'general', location, maxContacts = 3 } = req.body;
    const userId = req.user.id;

    // Get user's emergency contacts
    const contacts = await Contact.find({
      user: userId,
      isEmergencyContact: true,
      verified: true
    }).sort({ priority: 1, relationship: 1 });

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No verified emergency contacts found'
      });
    }

    // Initialize auto-dial service
    const autoDialService = require('../services/autoDialService');
    
    if (!autoDialService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Auto-dial service not configured. Please check Twilio settings.'
      });
    }

    // Create incident record first
    const Incident = require('../models/Incident');
    const incident = new Incident({
      user: userId,
      type: emergencyType,
      priority: 'critical',
      location: location ? {
        initial: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          accuracy: location.accuracy || 10,
          timestamp: new Date()
        },
        current: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          accuracy: location.accuracy || 10,
          timestamp: new Date()
        }
      } : undefined,
      triggeredBy: 'auto_dial_request'
    });

    incident.addTimelineEntry('Auto-dial emergency calls initiated', userId, {
      source: 'web_app',
      contactCount: Math.min(contacts.length, maxContacts)
    });

    await incident.save();

    // Prepare emergency data
    const user = req.user;
    const emergencyData = {
      userId,
      userName: user.name || `${user.firstName} ${user.lastName}`.trim(),
      userPhone: user.phone,
      emergencyType,
      incidentId: incident._id,
      incidentNumber: incident.incidentId,
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      } : null,
      timestamp: new Date().toISOString()
    };

    // Initiate auto-dial calls
    const selectedContacts = contacts.slice(0, maxContacts);
    const callResults = await autoDialService.initiateMultipleEmergencyCalls(
      selectedContacts,
      emergencyData
    );

    // Create emergency call records
    const EmergencyCall = require('../models/EmergencyCall');
    const callRecords = await Promise.all(
      callResults.map(async (result, index) => {
        const contact = selectedContacts[index];
        
        return new EmergencyCall({
          callSid: result.callSid || `failed-${Date.now()}-${index}`,
          user: userId,
          incident: incident._id,
          to: contact.phone,
          from: result.from || process.env.TWILIO_PHONE_NUMBER,
          status: result.success ? 'initiated' : 'failed',
          emergencyType,
          priority: 'critical',
          contactInfo: {
            contactId: contact._id,
            contactName: contact.name,
            contactRelationship: contact.relationship,
            contactPriority: contact.priority,
            callSequence: index + 1
          },
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: new Date()
          } : undefined,
          metadata: {
            source: 'web_app',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        }).save();
      })
    );

    // Update incident with call information
    incident.autoDialInfo = {
      callsInitiated: callResults.length,
      successfulCalls: callResults.filter(r => r.success).length,
      failedCalls: callResults.filter(r => !r.success).length,
      callRecords: callRecords.map(record => record._id)
    };

    await incident.save();

    // Send response
    res.status(200).json({
      success: true,
      message: 'Auto-dial emergency calls initiated',
      data: {
        incidentId: incident.incidentId,
        totalContacts: contacts.length,
        contactsCalled: selectedContacts.length,
        callsInitiated: callResults.filter(r => r.success).length,
        callsFailed: callResults.filter(r => !r.success).length,
        results: callResults.map((result, index) => ({
          contactName: selectedContacts[index].name,
          contactPhone: selectedContacts[index].phone,
          success: result.success,
          callSid: result.callSid,
          status: result.status,
          error: result.error
        })),
        estimatedCallDuration: '2-3 minutes per contact',
        nextSteps: [
          'Emergency calls are being placed automatically',
          'Contacts will receive recorded emergency message',
          'You will be notified of contact responses',
          'Call emergency services (911) if this is life-threatening'
        ]
      }
    });

    // Log success
    logger.info(`Auto-dial initiated for user ${userId}: ${callResults.filter(r => r.success).length}/${callResults.length} calls successful`);

  } catch (error) {
    logger.error('Auto-dial initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate auto-dial emergency calls',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get auto-dial call status
// @route   GET /api/contacts/emergency/auto-dial/status/:incidentId
// @access  Private
const getAutoDialStatus = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const userId = req.user.id;

    // Find the incident
    const Incident = require('../models/Incident');
    const incident = await Incident.findOne({
      $or: [
        { _id: incidentId },
        { incidentId: incidentId }
      ],
      user: userId
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Get emergency call records
    const EmergencyCall = require('../models/EmergencyCall');
    const calls = await EmergencyCall.find({
      incident: incident._id
    }).populate('contactInfo.contactId', 'name phone relationship');

    // Get call status from Twilio for active calls
    const autoDialService = require('../services/autoDialService');
    const updatedCalls = await Promise.all(
      calls.map(async (call) => {
        if (call.callSid && ['initiated', 'ringing', 'in-progress'].includes(call.status)) {
          try {
            const twilioStatus = await autoDialService.getCallStatus(call.callSid);
            call.status = twilioStatus.status;
            call.duration = twilioStatus.duration || 0;
            await call.save();
          } catch (error) {
            logger.warn(`Failed to update call status for ${call.callSid}:`, error);
          }
        }
        return call;
      })
    );

    // Calculate summary statistics
    const summary = {
      totalCalls: calls.length,
      successful: calls.filter(c => c.outcome === 'successful').length,
      failed: calls.filter(c => c.status === 'failed').length,
      inProgress: calls.filter(c => ['initiated', 'ringing', 'in-progress'].includes(c.status)).length,
      acknowledged: calls.filter(c => c.responses.some(r => r.action === 'acknowledged')).length,
      declined: calls.filter(c => c.responses.some(r => r.action === 'declined')).length,
      noResponse: calls.filter(c => c.responses.length === 0 && !['initiated', 'ringing', 'in-progress'].includes(c.status)).length
    };

    res.status(200).json({
      success: true,
      data: {
        incident: {
          id: incident.incidentId,
          type: incident.type,
          priority: incident.priority,
          status: incident.status,
          createdAt: incident.createdAt
        },
        summary,
        calls: updatedCalls.map(call => ({
          callSid: call.callSid,
          contactName: call.contactInfo.contactName,
          contactPhone: call.to,
          status: call.status,
          duration: call.durationFormatted,
          outcome: call.outcome,
          responses: call.responseSummary,
          callSequence: call.contactInfo.callSequence,
          createdAt: call.createdAt,
          lastUpdate: call.lastStatusUpdate
        }))
      }
    });

  } catch (error) {
    logger.error('Get auto-dial status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get auto-dial status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Test auto-dial configuration
// @route   POST /api/contacts/emergency/auto-dial/test
// @access  Private
const testAutoDial = async (req, res) => {
  try {
    const { testPhoneNumber } = req.body;
    
    if (!testPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Test phone number is required'
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(testPhoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use international format (+1234567890)'
      });
    }

    const autoDialService = require('../services/autoDialService');
    
    // Test Twilio connection
    const connectionTest = await autoDialService.testConnection();
    if (!connectionTest) {
      return res.status(503).json({
        success: false,
        message: 'Twilio connection test failed. Please check configuration.'
      });
    }

    // Initiate test call
    const user = req.user;
    const testCallResult = await autoDialService.initiateEmergencyCall(testPhoneNumber, {
      userId: user.id,
      userName: user.name || 'Test User',
      emergencyType: 'test_call',
      contactName: 'Test Contact',
      location: null
    });

    res.status(200).json({
      success: true,
      message: 'Test call initiated successfully',
      data: {
        callSid: testCallResult.callSid,
        status: testCallResult.status,
        testPhoneNumber,
        message: 'Test emergency call has been placed. The recipient will receive a test emergency message.',
        note: 'This is a test call and will not create an emergency incident.'
      }
    });

  } catch (error) {
    logger.error('Auto-dial test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test auto-dial functionality',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Routes
router.get('/', auth, getContacts);
router.get('/stats', auth, getContactStats);
router.get('/:id', auth, getContact);
router.post('/', auth, validateContact, createContact);
router.post('/bulk-import', auth, bulkImportContacts);
router.post('/emergency-alert', auth, sendEmergencyAlert);
router.post('/emergency/auto-dial', auth, initiateAutoDial);
router.get('/emergency/auto-dial/status/:incidentId', auth, getAutoDialStatus);
router.post('/emergency/auto-dial/test', auth, testAutoDial);
router.put('/:id', auth, updateContact);
router.delete('/:id', auth, deleteContact);
router.post('/:id/verify', auth, verifyContact);
router.post('/:id/test', auth, testContact);
router.put('/reorder', auth, reorderContacts);

module.exports = router;
