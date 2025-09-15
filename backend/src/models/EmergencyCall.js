const mongoose = require('mongoose');

const emergencyCallSchema = new mongoose.Schema({
  callSid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // User and incident information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  },
  
  // Call details
  to: {
    type: String,
    required: true
  },
  
  from: {
    type: String,
    required: true
  },
  
  status: {
    type: String,
    enum: ['queued', 'initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'],
    default: 'queued'
  },
  
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  
  // Emergency context
  emergencyType: {
    type: String,
    enum: ['manual_sos', 'fall_detection', 'panic_button', 'geofence_breach', 'device_tamper', 'general'],
    default: 'general'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  
  // Contact information
  contactInfo: {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    },
    contactName: String,
    contactRelationship: String,
    contactPriority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    callSequence: Number // Order in which this contact was called (1st, 2nd, etc.)
  },
  
  // Location information at time of emergency
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    address: String,
    timestamp: Date
  },
  
  // Call responses from contact
  responses: [{
    contactPhone: String,
    action: {
      type: String,
      enum: ['acknowledged', 'declined', 'no_response', 'invalid'],
      required: true
    },
    digits: String, // DTMF digits pressed
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  
  // Recording information
  recording: {
    sid: String,
    url: String,
    downloadedAt: Date,
    localPath: String // If downloaded and stored locally
  },
  
  // Call outcome
  outcome: {
    type: String,
    enum: ['successful', 'failed', 'partial', 'no_response'],
    default: 'no_response'
  },
  
  outcomeDetails: {
    contactsReached: Number,
    contactsAcknowledged: Number,
    totalCallsAttempted: Number,
    averageResponseTime: Number // Seconds until first acknowledgment
  },
  
  // System metadata
  cost: {
    amount: Number,
    currency: String,
    twilioPrice: Number
  },
  
  retryCount: {
    type: Number,
    default: 0
  },
  
  lastStatusUpdate: {
    type: Date,
    default: Date.now
  },
  
  // Emergency escalation
  escalated: {
    type: Boolean,
    default: false
  },
  
  escalationReason: String,
  
  emergencyServicesNotified: {
    type: Boolean,
    default: false
  },
  
  // System tracking
  deviceInfo: {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device'
    },
    deviceSerial: String,
    batteryLevel: Number,
    signalStrength: Number
  },
  
  metadata: {
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    source: {
      type: String,
      enum: ['web_app', 'mobile_app', 'iot_device', 'api', 'manual'],
      default: 'web_app'
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
emergencyCallSchema.index({ user: 1, createdAt: -1 });
emergencyCallSchema.index({ status: 1, createdAt: -1 });
emergencyCallSchema.index({ emergencyType: 1, priority: 1 });
emergencyCallSchema.index({ 'contactInfo.contactId': 1 });
emergencyCallSchema.index({ outcome: 1, escalated: 1 });

// Virtual for call response summary
emergencyCallSchema.virtual('responseSummary').get(function() {
  const acknowledged = this.responses.filter(r => r.action === 'acknowledged').length;
  const declined = this.responses.filter(r => r.action === 'declined').length;
  const noResponse = this.responses.filter(r => r.action === 'no_response').length;
  
  return {
    acknowledged,
    declined,
    noResponse,
    total: this.responses.length
  };
});

// Virtual for call duration in human readable format
emergencyCallSchema.virtual('durationFormatted').get(function() {
  if (!this.duration) return '0 seconds';
  
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds} seconds`;
});

// Static methods
emergencyCallSchema.statics.getCallStatistics = async function(userId, timeRange = '24h') {
  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 24;
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        successfulCalls: {
          $sum: { $cond: [{ $eq: ['$outcome', 'successful'] }, 1, 0] }
        },
        failedCalls: {
          $sum: { $cond: [{ $eq: ['$outcome', 'failed'] }, 1, 0] }
        },
        averageDuration: { $avg: '$duration' },
        totalCost: { $sum: '$cost.amount' },
        emergencyTypes: { $push: '$emergencyType' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageDuration: 0,
    totalCost: 0,
    emergencyTypes: []
  };
};

// Instance methods
emergencyCallSchema.methods.addResponse = function(contactPhone, action, digits, notes) {
  this.responses.push({
    contactPhone,
    action,
    digits,
    notes,
    timestamp: new Date()
  });
  
  // Update outcome based on responses
  this.updateOutcome();
  return this.save();
};

emergencyCallSchema.methods.updateOutcome = function() {
  const acknowledged = this.responses.filter(r => r.action === 'acknowledged').length;
  const total = this.responses.length;
  
  if (acknowledged > 0) {
    this.outcome = 'successful';
  } else if (total > 0) {
    this.outcome = 'partial';
  } else {
    this.outcome = 'no_response';
  }
  
  // Update outcome details
  this.outcomeDetails = {
    ...this.outcomeDetails,
    contactsReached: this.responses.filter(r => r.action !== 'no_response').length,
    contactsAcknowledged: acknowledged,
    totalCallsAttempted: total
  };
};

emergencyCallSchema.methods.markAsEscalated = function(reason) {
  this.escalated = true;
  this.escalationReason = reason;
  return this.save();
};

// Pre-save middleware
emergencyCallSchema.pre('save', function(next) {
  if (this.isModified('responses')) {
    this.updateOutcome();
  }
  next();
});

// Post-save middleware for logging
emergencyCallSchema.post('save', function(doc) {
  const logger = require('../utils/logger');
  logger.info(`Emergency call updated: ${doc.callSid} - Status: ${doc.status}, Outcome: ${doc.outcome}`);
});

const EmergencyCall = mongoose.model('EmergencyCall', emergencyCallSchema);

module.exports = EmergencyCall;