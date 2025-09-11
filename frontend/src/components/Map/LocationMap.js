import React from 'react';
import { Box, Typography } from '@mui/material';

const LocationMap = ({ userLocation, devices = [], incidents = [], height = '300px' }) => {
  // This is a placeholder for the map component
  // In a real implementation, you would use Mapbox GL or Google Maps
  
  return (
    <Box
      sx={{
        height,
        backgroundColor: 'grey.100',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Interactive Map
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {userLocation ? (
            `Current Location: ${userLocation.latitude?.toFixed(4)}, ${userLocation.longitude?.toFixed(4)}`
          ) : (
            'Location not available'
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {devices.length} device(s) • {incidents.length} active incident(s)
        </Typography>
      </Box>
    </Box>
  );
};

export default LocationMap;
