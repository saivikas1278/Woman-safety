const User = require('../models/User');
const logger = require('../utils/logger');

// Find nearby volunteers for emergency response
const findNearbyVolunteers = async (lat, lng, radiusInMeters = 5000) => {
  try {
    // Find volunteers within radius
    const volunteers = await User.find({
      role: 'volunteer',
      isActive: true,
      'volunteerProfile.isAvailable': true,
      'volunteerProfile.isVerified': true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).select('name phone location volunteerProfile')
      .limit(10); // Limit to 10 nearest volunteers

    logger.info(`Found ${volunteers.length} nearby volunteers for location: ${lat}, ${lng}`);
    return volunteers;

  } catch (error) {
    logger.error('Find nearby volunteers error:', error);
    return [];
  }
};

// Calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Get volunteer profile with statistics
const getVolunteerProfile = async (userId) => {
  try {
    const Incident = require('../models/Incident');
    
    const volunteer = await User.findById(userId);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return null;
    }

    // Get volunteer statistics
    const stats = await Incident.aggregate([
      {
        $match: {
          'responders.user': volunteer._id
        }
      },
      {
        $unwind: '$responders'
      },
      {
        $match: {
          'responders.user': volunteer._id
        }
      },
      {
        $group: {
          _id: null,
          totalIncidents: { $sum: 1 },
          completedIncidents: {
            $sum: {
              $cond: [
                { $in: ['$responders.status', ['arrived', 'completed']] },
                1,
                0
              ]
            }
          },
          averageResponseTime: {
            $avg: {
              $cond: [
                { $ne: ['$responders.acknowledgedAt', null] },
                {
                  $divide: [
                    { $subtract: ['$responders.acknowledgedAt', '$responders.notifiedAt'] },
                    1000
                  ]
                },
                null
              ]
            }
          }
        }
      }
    ]);

    const volunteerStats = stats[0] || {
      totalIncidents: 0,
      completedIncidents: 0,
      averageResponseTime: 0
    };

    return {
      ...volunteer.toObject(),
      statistics: volunteerStats
    };

  } catch (error) {
    logger.error('Get volunteer profile error:', error);
    return null;
  }
};

// Update volunteer availability
const updateVolunteerAvailability = async (userId, isAvailable, location = null) => {
  try {
    const updates = {
      'volunteerProfile.isAvailable': isAvailable,
      'volunteerProfile.lastAvailabilityUpdate': new Date()
    };

    if (location) {
      updates['location.coordinates'] = [location.lng, location.lat];
      updates['location.lastUpdated'] = new Date();
    }

    const volunteer = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    logger.info(`Volunteer availability updated: ${volunteer.name} -> ${isAvailable}`);
    return volunteer;

  } catch (error) {
    logger.error('Update volunteer availability error:', error);
    throw error;
  }
};

// Verify volunteer (admin function)
const verifyVolunteer = async (userId, adminId, verificationNotes = null) => {
  try {
    const volunteer = await User.findById(userId);
    
    if (!volunteer || volunteer.role !== 'volunteer') {
      throw new Error('User is not a volunteer');
    }

    volunteer.volunteerProfile = {
      ...volunteer.volunteerProfile,
      isVerified: true,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      verificationNotes
    };

    await volunteer.save();

    logger.info(`Volunteer verified: ${volunteer.name} by admin: ${adminId}`);
    return volunteer;

  } catch (error) {
    logger.error('Verify volunteer error:', error);
    throw error;
  }
};

// Get volunteer performance metrics
const getVolunteerMetrics = async (userId, timeframe = '30d') => {
  try {
    const Incident = require('../models/Incident');
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) };
        break;
      default:
        dateFilter = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
    }

    const metrics = await Incident.aggregate([
      {
        $match: {
          'responders.user': mongoose.Types.ObjectId(userId),
          createdAt: dateFilter
        }
      },
      {
        $unwind: '$responders'
      },
      {
        $match: {
          'responders.user': mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          totalAcknowledged: {
            $sum: {
              $cond: [
                { $ne: ['$responders.acknowledgedAt', null] },
                1,
                0
              ]
            }
          },
          totalArrived: {
            $sum: {
              $cond: [
                { $ne: ['$responders.arrivedAt', null] },
                1,
                0
              ]
            }
          },
          averageResponseTime: {
            $avg: {
              $cond: [
                { $ne: ['$responders.acknowledgedAt', null] },
                {
                  $divide: [
                    { $subtract: ['$responders.acknowledgedAt', '$responders.notifiedAt'] },
                    60000 // Convert to minutes
                  ]
                },
                null
              ]
            }
          },
          averageArrivalTime: {
            $avg: {
              $cond: [
                { $ne: ['$responders.arrivedAt', null] },
                {
                  $divide: [
                    { $subtract: ['$responders.arrivedAt', '$responders.notifiedAt'] },
                    60000 // Convert to minutes
                  ]
                },
                null
              ]
            }
          }
        }
      }
    ]);

    const result = metrics[0] || {
      totalAssigned: 0,
      totalAcknowledged: 0,
      totalArrived: 0,
      averageResponseTime: 0,
      averageArrivalTime: 0
    };

    // Calculate success rate
    result.acknowledgmentRate = result.totalAssigned > 0 
      ? (result.totalAcknowledged / result.totalAssigned * 100).toFixed(1)
      : 0;
      
    result.arrivalRate = result.totalAssigned > 0 
      ? (result.totalArrived / result.totalAssigned * 100).toFixed(1)
      : 0;

    return {
      timeframe,
      metrics: result
    };

  } catch (error) {
    logger.error('Get volunteer metrics error:', error);
    throw error;
  }
};

// Notify volunteers about new incident
const notifyNearbyVolunteers = async (incident, radiusInMeters = 5000) => {
  try {
    const lat = incident.location.current.coordinates[1];
    const lng = incident.location.current.coordinates[0];

    const volunteers = await findNearbyVolunteers(lat, lng, radiusInMeters);
    
    const notificationResults = [];

    for (const volunteer of volunteers) {
      try {
        // Add volunteer as responder
        incident.addResponder(volunteer._id, 'volunteer');

        // Send notification (would integrate with push notification service)
        const distance = calculateDistance(
          lat, lng,
          volunteer.location.coordinates[1],
          volunteer.location.coordinates[0]
        );

        notificationResults.push({
          volunteerId: volunteer._id,
          name: volunteer.name,
          distance: Math.round(distance),
          notified: true
        });

        logger.info(`Volunteer notified: ${volunteer.name} for incident: ${incident.incidentId}`);

      } catch (error) {
        logger.error(`Failed to notify volunteer ${volunteer.name}:`, error);
        notificationResults.push({
          volunteerId: volunteer._id,
          name: volunteer.name,
          notified: false,
          error: error.message
        });
      }
    }

    return notificationResults;

  } catch (error) {
    logger.error('Notify nearby volunteers error:', error);
    throw error;
  }
};

module.exports = {
  findNearbyVolunteers,
  getVolunteerProfile,
  updateVolunteerAvailability,
  verifyVolunteer,
  getVolunteerMetrics,
  notifyNearbyVolunteers,
  calculateDistance
};
