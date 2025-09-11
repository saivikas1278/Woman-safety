import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Box } from '@mui/material';

const IncidentsPage = () => {
  return (
    <>
      <Helmet>
        <title>Incidents - SafeConnect</title>
      </Helmet>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Incidents
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your emergency incidents here.
        </Typography>
      </Box>
    </>
  );
};

export default IncidentsPage;
