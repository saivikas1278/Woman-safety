const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: false  // Not all incidents require a device (manual web/app emergencies)
  },
  type: {
    type: String,
    enum: ['manual_sos', 'fall_detection', 'no_motion', 'tamper_alert', 'heartrate_anomaly', 'geofence_breach'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'responding', 'resolved', 'false_alarm', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  description: {
    type: String,
    maxlength: 1000
  },
  location: {
    initial: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      },
      accuracy: Number,
      address: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    },
    current: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      },
      accuracy: Number,
      address: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    },
    trail: [{
      coordinates: [Number],
      accuracy: Number,
      speed: Number,
      timestamp: Date
    }]
  },
  timeline: [{
    action: {
      type: String,
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],
  responders: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['volunteer', 'police', 'medical', 'family', 'friend']
    },
    status: {
      type: String,
      enum: ['notified', 'acknowledged', 'en_route', 'arrived', 'unavailable'],
      default: 'notified'
    },
    estimatedArrival: Date,
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number]
    },
    notifiedAt: {
      type: Date,
      default: Date.now
    },
    acknowledgedAt: Date,
    arrivedAt: Date
  }],
  notifications: {
    sent: [{
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      method: {
        type: String,
        enum: ['push', 'sms', 'email', 'call']
      },
      status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed']
      },
      sentAt: Date,
      deliveredAt: Date,
      error: String
    }],
    emergencyServices: {
      police: {
        notified: Boolean,
        notifiedAt: Date,
        caseNumber: String
      },
      medical: {
        notified: Boolean,
        notifiedAt: Date,
        caseNumber: String
      }
    }
  },
  media: [{
    type: {
      type: String,
      enum: ['audio', 'photo', 'video']
    },
    url: String,
    duration: Number, // for audio/video
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  voiceRecording: {
    url: String,
    duration: Number,
    isAutoRecorded: {
      type: Boolean,
      default: true
    },
    recordedAt: Date
  },
  deviceData: {
    batteryLevel: Number,
    signalStrength: Number,
    sensorData: mongoose.Schema.Types.Mixed
  },
  resolution: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    resolution: {
      type: String,
      enum: ['safe', 'assisted', 'false_alarm', 'no_response', 'escalated']
    },
    notes: String,
    followUpRequired: Boolean
  },
  metrics: {
    responseTime: Number, // Time to first responder acknowledgment (in seconds)
    resolutionTime: Number, // Time to incident resolution (in seconds)
    contactsNotified: Number,
    volunteersNotified: Number
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes (incidentId index is created automatically by unique: true)
incidentSchema.index({ user: 1, createdAt: -1 });
incidentSchema.index({ device: 1, createdAt: -1 });
incidentSchema.index({ status: 1, priority: 1 });
incidentSchema.index({ 'location.initial': '2dsphere' });
incidentSchema.index({ 'location.current': '2dsphere' });
incidentSchema.index({ createdAt: -1 });

// Generate incident ID
incidentSchema.pre('save', function(next) {
  if (!this.incidentId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.incidentId = `INC-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Add timeline entry
incidentSchema.methods.addTimelineEntry = function(action, actor, details = null) {
  this.timeline.push({
    action,
    actor,
    details,
    timestamp: new Date()
  });
  return this;
};

// Update status with timeline
incidentSchema.methods.updateStatus = function(newStatus, actor, notes = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.addTimelineEntry(`Status changed from ${oldStatus} to ${newStatus}`, actor, { notes });
  
  if (newStatus === 'resolved' || newStatus === 'false_alarm') {
    this.resolution = {
      resolvedBy: actor,
      resolvedAt: new Date(),
      resolution: newStatus === 'false_alarm' ? 'false_alarm' : 'safe',
      notes
    };
  }
  
  return this;
};

// Add responder
incidentSchema.methods.addResponder = function(userId, type, estimatedArrival = null) {
  const existingResponder = this.responders.find(r => r.user.toString() === userId.toString());
  
  if (!existingResponder) {
    this.responders.push({
      user: userId,
      type,
      estimatedArrival,
      notifiedAt: new Date()
    });
  }
  
  return this;
};

// Update location
incidentSchema.methods.updateLocation = function(lat, lng, accuracy = null) {
  const newLocation = {
    type: 'Point',
    coordinates: [lng, lat],
    accuracy,
    timestamp: new Date()
  };
  
  // Add to trail
  this.location.trail.push({
    coordinates: [lng, lat],
    accuracy,
    timestamp: new Date()
  });
  
  // Update current location
  this.location.current = newLocation;
  
  return this;
};

// Calculate metrics
incidentSchema.methods.calculateMetrics = function() {
  const createdAt = this.createdAt;
  const now = new Date();
  
  // Response time - time to first acknowledgment
  const firstAck = this.timeline.find(entry => 
    entry.action.includes('acknowledged') || 
    entry.action.includes('responding')
  );
  
  if (firstAck) {
    this.metrics.responseTime = Math.floor((firstAck.timestamp - createdAt) / 1000);
  }
  
  // Resolution time
  if (this.resolution && this.resolution.resolvedAt) {
    this.metrics.resolutionTime = Math.floor((this.resolution.resolvedAt - createdAt) / 1000);
  }
  
  // Count notifications
  this.metrics.contactsNotified = this.notifications.sent.filter(n => n.status === 'sent' || n.status === 'delivered').length;
  this.metrics.volunteersNotified = this.responders.length;
  
  return this;
};

// Check if incident is active
incidentSchema.methods.isActive = function() {
  return ['active', 'acknowledged', 'responding'].includes(this.status);
};

module.exports = mongoose.model('Incident', incidentSchema);
