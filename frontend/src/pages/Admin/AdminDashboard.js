import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Box } from '@mui/material';

const AdminDashboard = () => {
  return (
    <>
      <Helmet>
        <title>Admin Dashboard - SafeConnect</title>
      </Helmet>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          System administration and analytics dashboard.
        </Typography>
      </Box>
    </>
  );
};

export default AdminDashboard;
