const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  relationship: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  notificationMethods: [{
    type: String,
    enum: ['sms', 'call', 'email', 'push'],
    default: ['sms', 'call']
  }],
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  notes: {
    type: String,
    maxlength: 500
  },
  lastContacted: Date,
  isEmergencyContact: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deviceTokens: [String], // For push notifications
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationCode: String,
    verifiedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
contactSchema.index({ user: 1, priority: 1 });
contactSchema.index({ user: 1, isActive: 1 });
contactSchema.index({ phone: 1 });

// Ensure unique phone per user
contactSchema.index({ user: 1, phone: 1 }, { unique: true });

// Update last contacted
contactSchema.methods.updateLastContacted = function() {
  this.lastContacted = new Date();
  return this.save();
};

// Verify contact
contactSchema.methods.verify = function() {
  this.verification.isVerified = true;
  this.verification.verifiedAt = new Date();
  this.verification.verificationCode = undefined;
  return this.save();
};

module.exports = mongoose.model('Contact', contactSchema);
