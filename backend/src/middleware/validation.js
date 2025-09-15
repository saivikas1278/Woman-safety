const { body, validationResult } = require('express-validator');

// Helper function to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('role')
    .optional()
    .isIn(['user', 'volunteer', 'admin'])
    .withMessage('Invalid role specified'),
  
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  // Custom validation to ensure either email or phone is provided
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Either email or phone number is required');
    }
    return true;
  }),
  
  handleValidationErrors
];

// Device pairing validation
const validateDevicePairing = [
  body('serialNumber')
    .trim()
    .isLength({ min: 6, max: 50 })
    .withMessage('Serial number must be between 6 and 50 characters'),
  
  body('pairingCode')
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('Pairing code must be between 4 and 10 characters'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Device name must not exceed 100 characters'),
  
  handleValidationErrors
];

// Incident creation validation
const validateIncident = [
  body('type')
    .isIn(['manual_sos', 'fall_detection', 'no_motion', 'tamper_alert', 'heartrate_anomaly', 'geofence_breach'])
    .withMessage('Invalid incident type'),
  
  body('location.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('deviceSerial')
    .trim()
    .notEmpty()
    .withMessage('Device serial number is required'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority level'),
  
  handleValidationErrors
];

// Contact validation
const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact name must be between 2 and 100 characters'),
  
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('relationship')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Relationship must be between 2 and 50 characters'),
  
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  
  body('notificationMethods')
    .optional()
    .isArray()
    .withMessage('Notification methods must be an array')
    .custom((methods) => {
      const validMethods = ['sms', 'call', 'push', 'email'];
      return methods.every(method => validMethods.includes(method));
    })
    .withMessage('Invalid notification method'),
  
  handleValidationErrors
];

// Geofence validation
const validateGeofence = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Geofence name must be between 2 and 100 characters'),
  
  body('type')
    .isIn(['safe_zone', 'danger_zone', 'restricted_zone'])
    .withMessage('Invalid geofence type'),
  
  body('coordinates')
    .isArray({ min: 3 })
    .withMessage('Coordinates must be an array with at least 3 points')
    .custom((coords) => {
      return coords.every(coord => 
        Array.isArray(coord) && 
        coord.length === 2 && 
        typeof coord[0] === 'number' && 
        typeof coord[1] === 'number' &&
        coord[0] >= -180 && coord[0] <= 180 &&
        coord[1] >= -90 && coord[1] <= 90
      );
    })
    .withMessage('Each coordinate must be [longitude, latitude] with valid values'),
  
  body('alertOnEntry')
    .optional()
    .isBoolean()
    .withMessage('Alert on entry must be a boolean'),
  
  body('alertOnExit')
    .optional()
    .isBoolean()
    .withMessage('Alert on exit must be a boolean'),
  
  handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  
  body('profile.emergencyInfo.bloodType')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood type'),
  
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateDevicePairing,
  validateIncident,
  validateContact,
  validateGeofence,
  validateProfileUpdate,
  validatePasswordChange,
  handleValidationErrors
};
