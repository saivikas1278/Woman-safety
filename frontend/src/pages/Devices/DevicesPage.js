import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Box } from '@mui/material';

const DevicesPage = () => {
  return (
    <>
      <Helmet>
        <title>Devices - SafeConnect</title>
      </Helmet>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Safety Devices
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your connected safety devices here.
        </Typography>
      </Box>
    </>
  );
};

export default DevicesPage;
