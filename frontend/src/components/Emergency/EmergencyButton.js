import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  LocalHospital as EmergencyIcon,
  Warning as WarningIcon,
  Phone as PhoneIcon,
  Sms as SmsIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';

import { contactService } from '../../services/api';
import { addNotification } from '../../store/slices/uiSlice';

const EmergencyButton = ({ size = 'large', variant = 'contained' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [emergencyProgress, setEmergencyProgress] = useState(false);
  const [notifyContacts, setNotifyContacts] = useState(true);
  const [autoCall, setAutoCall] = useState(true);
  const [autoSMS, setAutoSMS] = useState(true);
  const [autoEmail, setAutoEmail] = useState(true);
  const [shareLocation, setShareLocation] = useState(true);
  const [emergencySteps, setEmergencySteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [contacts, setContacts] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [incidentId, setIncidentId] = useState(null);

  // Load contacts when component mounts
  useEffect(() => {
    const loadEmergencyContacts = async () => {
      try {
        const response = await contactService.getContacts();
        const emergencyContacts = response.data.filter(contact => 
          contact.isEmergencyContact && contact.verification.isVerified
        );
        setContacts(emergencyContacts.sort((a, b) => a.priority - b.priority));
      } catch (error) {
        console.error('Failed to load contacts:', error);
      }
    };

    if (user) {
      loadEmergencyContacts();
    }
  }, [user]);

  // Emergency sequence functions - Enhanced with backend auto-dial
  const initiatePhoneCall = async (phoneNumber, contactName) => {
    try {
      // First, try backend auto-dial service
      const autoDialResponse = await contactService.initiateAutoDial({
        emergencyType: 'manual_emergency',
        location: currentLocation,
        maxContacts: 1,
        specificContact: { phone: phoneNumber, name: contactName }
      });

      if (autoDialResponse.success) {
        return {
          success: true,
          method: 'auto_dial',
          contact: contactName,
          phone: phoneNumber,
          callSid: autoDialResponse.data.results[0]?.callSid,
          incidentId: autoDialResponse.data.incidentId,
          message: 'Emergency call initiated automatically',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(autoDialResponse.message || 'Auto-dial failed');
      }

    } catch (error) {
      console.warn('Auto-dial failed, falling back to tel: protocol:', error);
      
      // Fallback to tel: protocol
      try {
        const telLink = `tel:${phoneNumber}`;
        window.open(telLink, '_self');
        
        // Simulate call initiation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          success: true,
          method: 'tel_protocol',
          contact: contactName,
          phone: phoneNumber,
          message: 'Phone dialer opened (manual)',
          fallback: true,
          timestamp: new Date().toISOString()
        };
      } catch (telError) {
        return {
          success: false,
          method: 'call',
          contact: contactName,
          phone: phoneNumber,
          error: `Auto-dial failed: ${error.message}. Tel protocol failed: ${telError.message}`,
          timestamp: new Date().toISOString()
        };
      }
    }
  };

  const sendSMSAlert = async (phoneNumber, contactName, message, location) => {
    try {
      // For web browsers, we can't directly send SMS, but we can open SMS app
      const smsMessage = encodeURIComponent(message);
      const smsLink = `sms:${phoneNumber}?body=${smsMessage}`;
      
      // Open SMS app (on mobile) or show message
      if (navigator.userAgent.match(/Mobile|Android|iPhone/)) {
        window.open(smsLink, '_self');
      }

      // Also send through backend service
      const response = await contactService.sendEmergencyAlert({
        targetContacts: [{ phone: phoneNumber, name: contactName }],
        message,
        location,
        method: 'sms'
      });

      return {
        success: true,
        method: 'sms',
        contact: contactName,
        phone: phoneNumber,
        timestamp: new Date().toISOString(),
        backendResponse: response
      };
    } catch (error) {
      return {
        success: false,
        method: 'sms',
        contact: contactName,
        phone: phoneNumber,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };

  const sendEmailAlert = async (email, contactName, message, location) => {
    try {
      const subject = encodeURIComponent(`EMERGENCY ALERT from ${user.name}`);
      const body = encodeURIComponent(`${message}\n\nLocation: ${location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : 'Unknown'}\n\nSent via Women Safety App`);
      
      // Open email client
      const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
      window.open(mailtoLink, '_blank');

      // Also send through backend service if available
      try {
        const response = await contactService.sendEmergencyAlert({
          targetContacts: [{ email, name: contactName }],
          message,
          location,
          method: 'email'
        });
        
        return {
          success: true,
          method: 'email',
          contact: contactName,
          email: email,
          timestamp: new Date().toISOString(),
          backendResponse: response
        };
      } catch (backendError) {
        // Even if backend fails, email client opened successfully
        return {
          success: true,
          method: 'email',
          contact: contactName,
          email: email,
          timestamp: new Date().toISOString(),
          note: 'Email client opened, backend notification failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        method: 'email',
        contact: contactName,
        email: email,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          console.warn('Could not get location:', error);
          resolve(null);
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  const handleEmergencyPress = () => {
    // Show confirmation dialog first
    setConfirmDialog(true);
  };

  const handleConfirmEmergency = async () => {
    setEmergencyProgress(true);
    setConfirmDialog(false);
    
    // Initialize emergency steps
    const steps = [
      { label: 'Getting Location', status: 'in-progress' },
      { label: 'Calling Emergency Contacts', status: 'pending' },
      { label: 'Sending SMS Alerts', status: 'pending' },
      { label: 'Sending Email Alerts', status: 'pending' },
      { label: 'Activating Emergency Mode', status: 'pending' }
    ];
    setEmergencySteps(steps);
    setActiveStep(0);

    const emergencyResults = [];
    let location = null;

    try {
      // Step 1: Get location
      if (shareLocation) {
        location = await getCurrentLocation();
        steps[0].status = location ? 'completed' : 'failed';
        steps[0].result = location ? 'Location obtained' : 'Location unavailable';
        setEmergencySteps([...steps]);
        setActiveStep(1);
      } else {
        steps[0].status = 'skipped';
        steps[0].result = 'Location sharing disabled';
        setEmergencySteps([...steps]);
        setActiveStep(1);
      }

      const emergencyMessage = `🚨 EMERGENCY ALERT from ${user.name}. I need immediate help! Please check on me or call emergency services. ${location ? `My location: https://maps.google.com/?q=${location.lat},${location.lng}` : 'Location unavailable'}`;

      // Step 2: Auto-call contacts (highest priority first)
      if (autoCall && contacts.length > 0) {
        steps[1].status = 'in-progress';
        setEmergencySteps([...steps]);

        // Call highest priority contact first
        const primaryContact = contacts[0];
        if (primaryContact.phone && primaryContact.notificationMethods.includes('call')) {
          const callResult = await initiatePhoneCall(primaryContact.phone, primaryContact.name);
          emergencyResults.push(callResult);
          
          if (callResult.success) {
            steps[1].status = 'completed';
            steps[1].result = `Called ${primaryContact.name}`;
          } else {
            steps[1].status = 'failed';
            steps[1].result = `Failed to call ${primaryContact.name}`;
          }
        } else {
          steps[1].status = 'skipped';
          steps[1].result = 'No callable contacts';
        }
        setEmergencySteps([...steps]);
        setActiveStep(2);
      } else {
        steps[1].status = 'skipped';
        steps[1].result = 'Auto-call disabled or no contacts';
        setEmergencySteps([...steps]);
        setActiveStep(2);
      }

      // Step 3: Send SMS alerts
      if (autoSMS && contacts.length > 0) {
        steps[2].status = 'in-progress';
        setEmergencySteps([...steps]);

        let smsCount = 0;
        for (const contact of contacts.slice(0, 3)) { // Send to top 3 contacts
          if (contact.phone && contact.notificationMethods.includes('sms')) {
            const smsResult = await sendSMSAlert(contact.phone, contact.name, emergencyMessage, location);
            emergencyResults.push(smsResult);
            if (smsResult.success) smsCount++;
            
            // Add delay between SMS sends
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        steps[2].status = smsCount > 0 ? 'completed' : 'failed';
        steps[2].result = `SMS sent to ${smsCount} contacts`;
        setEmergencySteps([...steps]);
        setActiveStep(3);
      } else {
        steps[2].status = 'skipped';
        steps[2].result = 'Auto-SMS disabled or no contacts';
        setEmergencySteps([...steps]);
        setActiveStep(3);
      }

      // Step 4: Send email alerts
      if (autoEmail && contacts.length > 0) {
        steps[3].status = 'in-progress';
        setEmergencySteps([...steps]);

        let emailCount = 0;
        for (const contact of contacts) {
          if (contact.email && contact.notificationMethods.includes('email')) {
            const emailResult = await sendEmailAlert(contact.email, contact.name, emergencyMessage, location);
            emergencyResults.push(emailResult);
            if (emailResult.success) emailCount++;
            
            // Add delay between email sends
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        steps[3].status = emailCount > 0 ? 'completed' : 'failed';
        steps[3].result = `Emails sent to ${emailCount} contacts`;
        setEmergencySteps([...steps]);
        setActiveStep(4);
      } else {
        steps[3].status = 'skipped';
        steps[3].result = 'Auto-email disabled or no contacts';
        setEmergencySteps([...steps]);
        setActiveStep(4);
      }

      // Step 5: Activate emergency mode
      steps[4].status = 'in-progress';
      setEmergencySteps([...steps]);

      // Store emergency state and results
      const emergencyData = {
        timestamp: new Date().toISOString(),
        location,
        results: emergencyResults,
        contactsNotified: emergencyResults.filter(r => r.success).length,
        user: user.name
      };

      // Save to localStorage for persistence
      localStorage.setItem('emergencyState', JSON.stringify(emergencyData));

      // Send comprehensive alert to backend
      if (notifyContacts) {
        try {
          const alertResponse = await contactService.sendEmergencyAlert({
            message: emergencyMessage,
            location,
            severity: 'high',
            autoActions: {
              call: autoCall,
              sms: autoSMS,
              email: autoEmail
            }
          });
          
          steps[4].status = 'completed';
          steps[4].result = 'Emergency mode activated';
          
          dispatch(addNotification({
            type: 'emergency',
            title: 'EMERGENCY ACTIVATED',
            message: `Emergency sequence completed. ${emergencyResults.filter(r => r.success).length} contacts notified.`,
            severity: 'error'
          }));
        } catch (contactError) {
          console.error('Failed to notify contacts via backend:', contactError);
          steps[4].status = 'partial';
          steps[4].result = 'Emergency activated (backend failed)';
        }
      } else {
        steps[4].status = 'completed';
        steps[4].result = 'Emergency mode activated (no backend notification)';
      }

      setEmergencySteps([...steps]);

      // Navigate to emergency page after a short delay
      setTimeout(() => {
        navigate('/emergency');
      }, 3000);
      
    } catch (error) {
      console.error('Emergency activation error:', error);
      dispatch(addNotification({
        type: 'emergency',
        title: 'Emergency Error',
        message: 'Failed to complete emergency sequence. Please call 911 directly.',
        severity: 'error'
      }));
      
      steps[activeStep].status = 'failed';
      steps[activeStep].result = `Error: ${error.message}`;
      setEmergencySteps([...steps]);
    } finally {
      // Keep progress dialog open for a few seconds to show results
      setTimeout(() => {
        setEmergencyProgress(false);
      }, 5000);
    }
  };

  const getButtonProps = () => {
    const baseProps = {
      variant,
      size,
      onClick: handleEmergencyPress,
      disabled: emergencyProgress,
      className: "emergency-button emergency-pulse",
      startIcon: emergencyProgress ? <CircularProgress size={20} color="inherit" /> : <EmergencyIcon />,
      sx: {
        minWidth: size === 'large' ? 200 : 120,
        minHeight: size === 'large' ? 80 : 50,
        fontSize: size === 'large' ? '1.2rem' : '1rem',
        fontWeight: 'bold',
        borderRadius: 4,
        bgcolor: 'error.main',
        '&:hover': {
          bgcolor: 'error.dark',
        },
        '&.emergency-pulse': {
          animation: 'pulse-red 2s infinite',
        },
      }
    };

    return baseProps;
  };

  return (
    <>
      <Button {...getButtonProps()}>
        {emergencyProgress ? 'ACTIVATING...' : 'EMERGENCY'}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog} 
        onClose={() => !emergencyProgress && setConfirmDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', textAlign: 'center' }}>
          <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          EMERGENCY CONFIRMATION
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              Are you sure you want to activate emergency mode?
            </Typography>
          </Alert>
          
          <Typography variant="body2" paragraph>
            This will automatically:
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoCall}
                    onChange={(e) => setAutoCall(e.target.checked)}
                    color="error"
                    icon={<PhoneIcon />}
                    checkedIcon={<PhoneIcon />}
                  />
                }
                label={`Auto-call top contact${contacts.length > 0 ? ` (${contacts[0]?.name || 'Unknown'})` : ' (No contacts)'}`}
              />
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoSMS}
                    onChange={(e) => setAutoSMS(e.target.checked)}
                    color="error"
                    icon={<SmsIcon />}
                    checkedIcon={<SmsIcon />}
                  />
                }
                label={`Send SMS to ${Math.min(contacts.length, 3)} contacts`}
              />
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoEmail}
                    onChange={(e) => setAutoEmail(e.target.checked)}
                    color="error"
                    icon={<EmailIcon />}
                    checkedIcon={<EmailIcon />}
                  />
                }
                label={`Send emails to all contacts`}
              />
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shareLocation}
                    onChange={(e) => setShareLocation(e.target.checked)}
                    color="error"
                    icon={<LocationIcon />}
                    checkedIcon={<LocationIcon />}
                  />
                }
                label="Share current location"
              />
            </Box>
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifyContacts}
                  onChange={(e) => setNotifyContacts(e.target.checked)}
                  color="error"
                />
              }
              label="Send comprehensive alert to backend system"
            />
          </Box>

          {contacts.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                You have no emergency contacts set up. Please add contacts in the Contacts section first.
              </Typography>
            </Alert>
          )}

          {contacts.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Emergency Contacts ({contacts.length}):
              </Typography>
              <List dense>
                {contacts.slice(0, 3).map((contact, index) => (
                  <ListItem key={contact._id} sx={{ py: 0.5 }}>
                    <ListItemIcon>
                      <Chip 
                        label={contact.priority} 
                        size="small" 
                        color="primary" 
                        sx={{ minWidth: 24 }}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={contact.name}
                      secondary={`${contact.phone}${contact.email ? ` • ${contact.email}` : ''}`}
                    />
                  </ListItem>
                ))}
                {contacts.length > 3 && (
                  <ListItem>
                    <ListItemText 
                      primary={`... and ${contacts.length - 3} more contacts`}
                      sx={{ fontStyle: 'italic' }}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              If this is a life-threatening emergency, call 911 immediately.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setConfirmDialog(false)} 
            disabled={emergencyProgress}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmEmergency}
            disabled={emergencyProgress}
            variant="contained"
            color="error"
            startIcon={emergencyProgress ? <CircularProgress size={20} /> : <EmergencyIcon />}
          >
            {emergencyProgress ? 'ACTIVATING...' : 'CONFIRM EMERGENCY'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Emergency Progress Dialog */}
      <Dialog 
        open={emergencyProgress}
        onClose={() => {}} // Prevent closing during emergency
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'error.main', color: 'white' }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', color: 'white' }}>
          <EmergencyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          EMERGENCY SEQUENCE ACTIVE
        </DialogTitle>
        <DialogContent sx={{ color: 'white' }}>
          <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.1)' }}>
            <Typography variant="h6" component="div" sx={{ color: 'white' }}>
              🚨 Emergency Mode Activated 🚨
            </Typography>
            <Typography variant="body2" sx={{ color: 'white' }}>
              Executing emergency sequence...
            </Typography>
          </Alert>

          <Stepper activeStep={activeStep} orientation="vertical">
            {emergencySteps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel 
                  icon={
                    step.status === 'completed' ? <CheckIcon color="success" /> :
                    step.status === 'failed' ? <ErrorIcon color="error" /> :
                    step.status === 'in-progress' ? <CircularProgress size={20} /> :
                    step.status === 'skipped' ? <TimeIcon color="disabled" /> :
                    index + 1
                  }
                  sx={{ 
                    '& .MuiStepLabel-label': { color: 'white' },
                    '& .MuiStepLabel-iconContainer': { color: 'white' }
                  }}
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {step.result || 'Processing...'}
                  </Typography>
                  {step.status === 'in-progress' && (
                    <LinearProgress sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {activeStep >= emergencySteps.length && (
            <Alert severity="success" sx={{ mt: 2, bgcolor: 'rgba(76,175,80,0.2)' }}>
              <Typography variant="body1" sx={{ color: 'white' }}>
                Emergency sequence completed! Redirecting to emergency dashboard...
              </Typography>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Add CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse-red {
          0% {
            box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
          }
        }
      `}</style>
    </>
  );
};

export default EmergencyButton;
