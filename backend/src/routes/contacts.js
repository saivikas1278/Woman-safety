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

// Routes
router.get('/', auth, getContacts);
router.get('/:id', auth, getContact);
router.post('/', auth, validateContact, createContact);
router.put('/:id', auth, updateContact);
router.delete('/:id', auth, deleteContact);
router.post('/:id/verify', auth, verifyContact);
router.post('/:id/test', auth, testContact);
router.put('/reorder', auth, reorderContacts);

module.exports = router;
