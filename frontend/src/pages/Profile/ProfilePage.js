import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Box } from '@mui/material';

const ProfilePage = () => {
  return (
    <>
      <Helmet>
        <title>Profile - SafeConnect</title>
      </Helmet>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your profile information here.
        </Typography>
      </Box>
    </>
  );
};

export default ProfilePage;
