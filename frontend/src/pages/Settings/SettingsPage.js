import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Box } from '@mui/material';

const SettingsPage = () => {
  return (
    <>
      <Helmet>
        <title>Settings - SafeConnect</title>
      </Helmet>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your safety preferences here.
        </Typography>
      </Box>
    </>
  );
};

export default SettingsPage;
