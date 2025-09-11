import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Box } from '@mui/material';

const ContactsPage = () => {
  return (
    <>
      <Helmet>
        <title>Emergency Contacts - SafeConnect</title>
      </Helmet>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Emergency Contacts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your emergency contacts here.
        </Typography>
      </Box>
    </>
  );
};

export default ContactsPage;
