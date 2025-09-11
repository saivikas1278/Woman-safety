const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    default: 'Safety Band'
  },
  model: {
    type: String,
    required: true,
    default: 'SB-100'
  },
  firmwareVersion: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'lost', 'maintenance'],
    default: 'inactive'
  },
  isPaired: {
    type: Boolean,
    default: false
  },
  pairingCode: {
    type: String,
    required: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  battery: {
    level: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    isCharging: {
      type: Boolean,
      default: false
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  connectivity: {
    cellular: {
      signal: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      operator: String,
      technology: {
        type: String,
        enum: ['2G', '3G', '4G', '5G'],
        default: '4G'
      }
    },
    gps: {
      hasSignal: {
        type: Boolean,
        default: false
      },
      accuracy: {
        type: Number,
        default: 0
      },
      satelliteCount: {
        type: Number,
        default: 0
      }
    },
    bluetooth: {
      isConnected: {
        type: Boolean,
        default: false
      },
      connectedDevice: String
    }
  },
  sensors: {
    accelerometer: {
      enabled: {
        type: Boolean,
        default: true
      },
      sensitivity: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      }
    },
    tamperDetection: {
      enabled: {
        type: Boolean,
        default: true
      },
      threshold: {
        type: Number,
        default: 50
      }
    },
    heartRateMonitor: {
      enabled: {
        type: Boolean,
        default: false
      }
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    accuracy: {
      type: Number,
      default: 0
    },
    speed: {
      type: Number,
      default: 0
    },
    heading: {
      type: Number,
      default: 0
    },
    altitude: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  settings: {
    sosButtonHoldTime: {
      type: Number,
      default: 3000 // 3 seconds
    },
    autoIncidentDetection: {
      type: Boolean,
      default: true
    },
    voiceRecording: {
      enabled: {
        type: Boolean,
        default: true
      },
      duration: {
        type: Number,
        default: 60000 // 60 seconds
      }
    },
    emergencyContacts: {
      notifyOnIncident: {
        type: Boolean,
        default: true
      },
      notifyOnLowBattery: {
        type: Boolean,
        default: true
      }
    }
  },
  maintenance: {
    lastServiceDate: Date,
    nextServiceDate: Date,
    warrantyExpiry: Date,
    serviceNotes: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
deviceSchema.index({ serialNumber: 1 });
deviceSchema.index({ user: 1 });
deviceSchema.index({ location: '2dsphere' });
deviceSchema.index({ status: 1, isActive: 1 });

// Update last seen
deviceSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

// Check if device is online
deviceSchema.methods.isOnline = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastSeen > fiveMinutesAgo;
};

// Update location
deviceSchema.methods.updateLocation = function(lat, lng, accuracy = 0, speed = 0) {
  this.location = {
    type: 'Point',
    coordinates: [lng, lat],
    accuracy,
    speed,
    lastUpdated: new Date()
  };
  this.lastSeen = new Date();
  return this.save();
};

// Update battery
deviceSchema.methods.updateBattery = function(level, isCharging = false) {
  this.battery = {
    level,
    isCharging,
    lastUpdated: new Date()
  };
  this.lastSeen = new Date();
  return this.save();
};

module.exports = mongoose.model('Device', deviceSchema);
