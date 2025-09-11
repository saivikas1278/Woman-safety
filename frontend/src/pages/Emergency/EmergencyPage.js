import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Box, Button } from '@mui/material';
import { LocalHospital as EmergencyIcon } from '@mui/icons-material';

const EmergencyPage = () => {
  return (
    <>
      <Helmet>
        <title>Emergency - SafeConnect</title>
      </Helmet>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <EmergencyIcon sx={{ fontSize: 120, color: 'error.main', mb: 4 }} />
        <Typography variant="h2" component="h1" gutterBottom color="error.main" fontWeight="bold">
          EMERGENCY MODE
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Emergency services have been notified. Help is on the way.
        </Typography>
        <Button
          variant="contained"
          size="large"
          color="error"
          onClick={() => window.location.href = 'tel:911'}
          sx={{ mr: 2 }}
        >
          Call 911
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </Box>
    </>
  );
};

export default EmergencyPage;
