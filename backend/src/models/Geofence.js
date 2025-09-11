const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['safe_zone', 'danger_zone', 'restricted_zone'],
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // Array of linear rings (first is exterior, others are holes)
      required: true,
      validate: {
        validator: function(coords) {
          // Validate polygon: must have at least 4 points, first and last must be the same
          if (!coords || !coords[0] || coords[0].length < 4) return false;
          
          const ring = coords[0];
          const first = ring[0];
          const last = ring[ring.length - 1];
          
          return first[0] === last[0] && first[1] === last[1];
        },
        message: 'Invalid polygon coordinates'
      }
    }
  },
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 10, // Minimum 10 meters
    max: 50000 // Maximum 50km
  },
  alerts: {
    onEntry: {
      enabled: {
        type: Boolean,
        default: true
      },
      message: {
        type: String,
        default: 'Entered geofence zone'
      },
      notifyContacts: {
        type: Boolean,
        default: false
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    },
    onExit: {
      enabled: {
        type: Boolean,
        default: true
      },
      message: {
        type: String,
        default: 'Exited geofence zone'
      },
      notifyContacts: {
        type: Boolean,
        default: false
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    }
  },
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    startTime: String, // HH:MM format
    endTime: String,   // HH:MM format
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  color: {
    type: String,
    default: '#FF0000',
    validate: {
      validator: function(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
      },
      message: 'Invalid color format'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  statistics: {
    entriesCount: {
      type: Number,
      default: 0
    },
    exitsCount: {
      type: Number,
      default: 0
    },
    lastEntry: Date,
    lastExit: Date,
    totalTimeInside: {
      type: Number,
      default: 0 // in seconds
    }
  }
}, {
  timestamps: true
});

// Indexes
geofenceSchema.index({ user: 1, isActive: 1 });
geofenceSchema.index({ geometry: '2dsphere' });
geofenceSchema.index({ center: '2dsphere' });
geofenceSchema.index({ type: 1 });

// Calculate center point from polygon
geofenceSchema.pre('save', function(next) {
  if (this.isModified('geometry')) {
    const coords = this.geometry.coordinates[0];
    
    // Calculate centroid
    let sumLat = 0, sumLng = 0;
    const pointCount = coords.length - 1; // Exclude last point (same as first)
    
    for (let i = 0; i < pointCount; i++) {
      sumLng += coords[i][0];
      sumLat += coords[i][1];
    }
    
    this.center = {
      type: 'Point',
      coordinates: [sumLng / pointCount, sumLat / pointCount]
    };

    // Calculate approximate radius (distance from center to farthest point)
    let maxDistance = 0;
    const centerLng = this.center.coordinates[0];
    const centerLat = this.center.coordinates[1];
    
    for (let i = 0; i < pointCount; i++) {
      const distance = calculateDistance(
        centerLat, centerLng,
        coords[i][1], coords[i][0]
      );
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }
    
    this.radius = Math.max(maxDistance, 10); // Minimum 10 meters
  }
  
  next();
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Check if a point is inside the geofence
geofenceSchema.methods.containsPoint = function(lat, lng) {
  // Use MongoDB's geospatial query for accurate polygon containment
  const point = {
    type: 'Point',
    coordinates: [lng, lat]
  };
  
  // This would typically be done via MongoDB query, but for the method:
  // Simple point-in-polygon algorithm (Ray casting)
  const polygon = this.geometry.coordinates[0];
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (((polygon[i][1] > lat) !== (polygon[j][1] > lat)) &&
        (lng < (polygon[j][0] - polygon[i][0]) * (lat - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0])) {
      inside = !inside;
    }
  }
  
  return inside;
};

// Check if geofence is active based on schedule
geofenceSchema.methods.isCurrentlyActive = function() {
  if (!this.schedule.isScheduled) {
    return this.isActive;
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().substring(0, 5); // HH:MM

  // Check if current day is in schedule
  if (!this.schedule.days.includes(currentDay)) {
    return false;
  }

  // Check if current time is in schedule
  if (this.schedule.startTime && this.schedule.endTime) {
    return currentTime >= this.schedule.startTime && currentTime <= this.schedule.endTime;
  }

  return this.isActive;
};

// Record entry/exit
geofenceSchema.methods.recordEntry = function() {
  this.statistics.entriesCount += 1;
  this.statistics.lastEntry = new Date();
  return this.save();
};

geofenceSchema.methods.recordExit = function() {
  this.statistics.exitsCount += 1;
  this.statistics.lastExit = new Date();
  
  // Calculate time inside if there was a recent entry
  if (this.statistics.lastEntry && this.statistics.lastExit > this.statistics.lastEntry) {
    const timeInside = (this.statistics.lastExit - this.statistics.lastEntry) / 1000; // seconds
    this.statistics.totalTimeInside += timeInside;
  }
  
  return this.save();
};

module.exports = mongoose.model('Geofence', geofenceSchema);
