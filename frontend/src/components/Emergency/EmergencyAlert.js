import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Slide,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { clearEmergencyAlert } from '../../store/slices/uiSlice';

const EmergencyAlert = () => {
  const dispatch = useDispatch();
  const { emergencyAlert } = useSelector((state) => state.ui);

  if (!emergencyAlert) return null;

  const handleClose = () => {
    dispatch(clearEmergencyAlert());
  };

  const handleViewIncident = () => {
    if (emergencyAlert.incident) {
      window.location.href = `/incidents`;
    }
  };

  const handleCall911 = () => {
    window.open('tel:911', '_self');
  };

  return (
    <Slide direction="down" in={Boolean(emergencyAlert)} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2000,
          p: 2,
        }}
      >
        <Alert
          severity="error"
          sx={{
            backgroundColor: '#f44336',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white',
            },
            boxShadow: 3,
            animation: 'emergency-pulse 1.5s ease-in-out infinite',
          }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {emergencyAlert.type === 'emergency_button' && (
                <>
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<PhoneIcon />}
                    onClick={handleCall911}
                    sx={{
                      color: 'white',
                      borderColor: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                    variant="outlined"
                  >
                    Call 911
                  </Button>
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<LocationIcon />}
                    onClick={handleViewIncident}
                    sx={{
                      color: 'white',
                      borderColor: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                    variant="outlined"
                  >
                    View Details
                  </Button>
                </>
              )}
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          }
        >
          <AlertTitle sx={{ color: 'white', fontWeight: 'bold' }}>
            🚨 EMERGENCY ALERT
          </AlertTitle>
          <Typography variant="body1" sx={{ color: 'white' }}>
            {emergencyAlert.message}
          </Typography>
          {emergencyAlert.location && (
            <Typography variant="body2" sx={{ color: 'white', mt: 1 }}>
              Location: {emergencyAlert.location.latitude?.toFixed(6)}, {emergencyAlert.location.longitude?.toFixed(6)}
            </Typography>
          )}
        </Alert>
      </Box>
    </Slide>
  );
};

export default EmergencyAlert;
