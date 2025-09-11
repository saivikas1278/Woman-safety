import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { LocalHospital as EmergencyIcon } from '@mui/icons-material';

const EmergencyButton = () => {
  const handleEmergencyPress = () => {
    // Navigate to emergency page or trigger emergency
    window.location.href = '/emergency';
  };

  return (
    <Button
      variant="contained"
      size="large"
      onClick={handleEmergencyPress}
      className="emergency-button emergency-pulse"
      sx={{
        minWidth: 200,
        minHeight: 80,
        fontSize: '1.2rem',
        fontWeight: 'bold',
        borderRadius: 4,
      }}
      startIcon={<EmergencyIcon sx={{ fontSize: 24 }} />}
    >
      EMERGENCY
    </Button>
  );
};

export default EmergencyButton;
