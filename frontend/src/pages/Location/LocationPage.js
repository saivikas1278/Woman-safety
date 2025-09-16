import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box, Typography, Paper, Grid, Button, IconButton,
  Card, CardContent, Switch, Divider, Tooltip, Alert,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControlLabel, Chip,
  List, ListItem, ListItemText, ListItemIcon, Snackbar,
  Slide, Fade, Grow, Container, Fab, Avatar
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  RouteOutlined as RouteIcon,
  Security as SecurityIcon,
  Fence as FenceIcon,
  LocationOn as LocationOnIcon,
  LocationOff as LocationOffIcon,
  DirectionsWalk as WalkIcon,
  DirectionsCar as CarIcon,
  NearMe as NearMeIcon,
  Layers as LayersIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon,
  LocalPolice as PoliceIcon,
  LocalHospital as HospitalIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Explore as ExploreIcon
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';

// Animation keyframes
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 10px rgba(244, 67, 54, 0.5); }
  50% { box-shadow: 0 0 30px rgba(244, 67, 54, 0.8); }
  100% { box-shadow: 0 0 10px rgba(244, 67, 54, 0.5); }
`;

// Styled components
const PageContainer = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${theme.palette.primary.light}08 0%, 
    ${theme.palette.secondary.light}08 25%, 
    ${theme.palette.error.light}08 50%, 
    ${theme.palette.warning.light}08 75%, 
    ${theme.palette.success.light}08 100%)`,
  minHeight: '100vh',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 20% 20%, ${theme.palette.primary.main}05 0%, transparent 70%),
                 radial-gradient(circle at 80% 80%, ${theme.palette.secondary.main}05 0%, transparent 70%)`,
    pointerEvents: 'none',
  }
}));

const MapContainer = styled(Box)(({ theme }) => ({
  height: '70vh',
  width: '100%',
  borderRadius: theme.spacing(3),
  overflow: 'hidden',
  boxShadow: `0 20px 40px rgba(0,0,0,0.1), 
              0 8px 16px rgba(0,0,0,0.05),
              inset 0 1px 0 rgba(255,255,255,0.8)`,
  border: `1px solid ${theme.palette.divider}`,
  position: 'relative',
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper}, 
    ${theme.palette.grey[50]})`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 32px 64px rgba(0,0,0,0.15), 
                0 16px 32px rgba(0,0,0,0.1)`,
  }
}));

const MapPlaceholder = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(45deg, 
    ${theme.palette.primary.light}20, 
    ${theme.palette.secondary.light}20)`,
  color: theme.palette.text.secondary,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    animation: `${float} 3s ease-in-out infinite`,
  }
}));

const SafetyFab = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(3),
  right: theme.spacing(3),
  zIndex: 10,
  background: 'linear-gradient(145deg, #f44336, #d32f2f)',
  color: 'white',
  animation: `${glow} 2s ease-in-out infinite`,
  '&:hover': {
    background: 'linear-gradient(145deg, #d32f2f, #f44336)',
    transform: 'scale(1.1)',
  },
  '&:active': {
    animation: `${pulse} 0.3s ease-in-out`,
  }
}));

const ControlPanel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 10,
  padding: theme.spacing(2),
  borderRadius: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  maxWidth: '320px',
  boxShadow: `0 8px 32px rgba(0,0,0,0.1), 
              0 4px 16px rgba(0,0,0,0.05)`,
  border: `1px solid rgba(255,255,255,0.2)`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 12px 40px rgba(0,0,0,0.15), 
                0 6px 20px rgba(0,0,0,0.1)`,
  }
}));

const InfoCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper}, 
    ${theme.palette.grey[50]})`,
  boxShadow: `0 8px 32px rgba(0,0,0,0.08), 
              0 4px 16px rgba(0,0,0,0.04),
              inset 0 1px 0 rgba(255,255,255,0.8)`,
  overflow: 'visible',
  position: 'relative',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: `0 16px 48px rgba(0,0,0,0.12), 
                0 8px 24px rgba(0,0,0,0.08),
                inset 0 1px 0 rgba(255,255,255,0.9)`,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    background: `linear-gradient(90deg, 
      ${theme.palette.primary.main}, 
      ${theme.palette.secondary.main}, 
      ${theme.palette.error.main})`,
    borderRadius: `${theme.spacing(3)} ${theme.spacing(3)} 0 0`,
  }
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  margin: theme.spacing(0.5, 0),
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper}, 
    ${theme.palette.grey[25]})`,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateX(8px)',
    boxShadow: `0 4px 20px rgba(0,0,0,0.1)`,
    background: `linear-gradient(145deg, 
      ${theme.palette.primary.light}15, 
      ${theme.palette.secondary.light}15)`,
    borderColor: theme.palette.primary.main,
  }
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1.5, 3),
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    transition: 'left 0.5s',
  },
  '&:hover::before': {
    left: '100%',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  }
}));

const LocationMarker = ({ type, text, active, onClick }) => {
  const getIcon = () => {
    switch (type) {
      case 'user':
        return (
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main',
              width: 40, 
              height: 40,
              border: '3px solid white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: active ? `${pulse} 1.5s infinite` : 'none'
            }}
          >
            <MyLocationIcon />
          </Avatar>
        );
      case 'safe-zone':
        return (
          <Avatar 
            sx={{ 
              bgcolor: 'success.main',
              width: 32, 
              height: 32,
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <FenceIcon fontSize="small" />
          </Avatar>
        );
      case 'emergency':
        return (
          <Avatar 
            sx={{ 
              bgcolor: 'error.main',
              width: 36, 
              height: 36,
              border: '2px solid white',
              boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
            }}
          >
            <WarningIcon />
          </Avatar>
        );
      case 'police':
        return (
          <Avatar 
            sx={{ 
              bgcolor: '#1976d2',
              width: 32, 
              height: 32,
              border: '2px solid white'
            }}
          >
            <PoliceIcon fontSize="small" />
          </Avatar>
        );
      case 'hospital':
        return (
          <Avatar 
            sx={{ 
              bgcolor: '#d32f2f',
              width: 32, 
              height: 32,
              border: '2px solid white'
            }}
          >
            <HospitalIcon fontSize="small" />
          </Avatar>
        );
      default:
        return (
          <Avatar 
            sx={{ 
              bgcolor: 'secondary.main',
              width: 32, 
              height: 32,
              border: '2px solid white'
            }}
          >
            <LocationOnIcon fontSize="small" />
          </Avatar>
        );
    }
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        zIndex: active ? 10 : 1,
      }}
    >
      {getIcon()}
      {text && (
        <Paper
          elevation={3}
          sx={{
            p: 0.5,
            px: 1,
            borderRadius: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            mt: 0.5,
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          {text}
        </Paper>
      )}
    </Box>
  );
};

const LocationPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationSharing, setLocationSharing] = useState({
    active: false,
    contacts: [],
    endTime: null
  });
  const [safeZones, setSafeZones] = useState([]);
  const [locationHistory, setLocationHistory] = useState([]);
  const [emergencyServices, setEmergencyServices] = useState([]);
  
  // UI State
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [showEmergencyServices, setShowEmergencyServices] = useState(false);
  const [shareLocationDialog, setShareLocationDialog] = useState(false);
  const [addSafeZoneDialog, setAddSafeZoneDialog] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [expandedPanel, setExpandedPanel] = useState('current-location');
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [newSafeZone, setNewSafeZone] = useState({
    name: '',
    radius: 500,
    location: null,
  });

  // Mock data for demonstration
  const mockContacts = [
    { id: 1, name: 'Mom', relationship: 'Mother', phone: '+1234567890' },
    { id: 2, name: 'Dad', relationship: 'Father', phone: '+1234567891' },
    { id: 3, name: 'Best Friend', relationship: 'Friend', phone: '+1234567892' },
    { id: 4, name: 'Sister', relationship: 'Sister', phone: '+1234567893' }
  ];

  // Initialize location tracking
  useEffect(() => {
    const initializeLocation = () => {
      setLoading(true);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const location = { lat: latitude, lng: longitude };
            
            setCurrentLocation(location);
            setLoading(false);
            
            // Start watching position for real-time updates
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ lat: latitude, lng: longitude });
              },
              (error) => {
                console.error('Error watching position:', error);
                setNotification({
                  open: true,
                  message: `Location tracking error: ${error.message}`,
                  severity: 'error',
                });
              },
              { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
            
            return () => navigator.geolocation.clearWatch(watchId);
          },
          (error) => {
            console.error('Error getting current position:', error);
            setError(`Failed to get your location. ${error.message}`);
            setLoading(false);
          }
        );
      } else {
        setError('Geolocation is not supported by this browser.');
        setLoading(false);
      }
    };

    initializeLocation();

    // Initialize mock data
    setSafeZones([
      {
        id: 1,
        name: 'Home',
        location: { lat: 28.6139, lng: 77.2090 },
        radius: 500,
        type: 'home'
      },
      {
        id: 2,
        name: 'Workplace',
        location: { lat: 28.6129, lng: 77.2295 },
        radius: 300,
        type: 'work'
      }
    ]);

    setEmergencyServices([
      {
        id: 1,
        name: 'Central Police Station',
        type: 'police',
        location: { lat: 28.6159, lng: 77.2120 },
        distance: '0.5 km'
      },
      {
        id: 2,
        name: 'City Hospital',
        type: 'hospital',
        location: { lat: 28.6149, lng: 77.2110 },
        distance: '0.8 km'
      }
    ]);

    setLocationHistory([
      {
        id: 1,
        type: 'movement',
        description: 'Left home',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        location: { lat: 28.6139, lng: 77.2090 }
      },
      {
        id: 2,
        type: 'arrival',
        description: 'Arrived at workplace',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        location: { lat: 28.6129, lng: 77.2295 }
      }
    ]);
  }, []);

  const handleLocationSharing = async (enable) => {
    try {
      setLocationSharing({
        active: enable,
        contacts: selectedContacts,
        endTime: enable ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null,
      });
      
      setShareLocationDialog(false);
      setSelectedContacts([]);
      
      setNotification({
        open: true,
        message: enable 
          ? 'Location sharing activated' 
          : 'Location sharing deactivated',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error updating location sharing:', err);
      setNotification({
        open: true,
        message: `Failed to update location sharing: ${err.message}`,
        severity: 'error',
      });
    }
  };

  const handleAddSafeZone = async () => {
    if (!newSafeZone.name || !newSafeZone.location) {
      setNotification({
        open: true,
        message: 'Please provide a name and select a location',
        severity: 'warning',
      });
      return;
    }
    
    try {
      const newZone = {
        id: Date.now(),
        ...newSafeZone,
        type: 'custom'
      };
      
      setSafeZones([...safeZones, newZone]);
      
      setAddSafeZoneDialog(false);
      setNewSafeZone({
        name: '',
        radius: 500,
        location: null,
      });
      
      setNotification({
        open: true,
        message: `Safe zone "${newZone.name}" created successfully`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Error adding safe zone:', err);
      setNotification({
        open: true,
        message: `Failed to create safe zone: ${err.message}`,
        severity: 'error',
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  const handlePanelChange = (panel) => {
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  const renderMapControls = () => (
    <ControlPanel elevation={3}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Map Controls
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showSafeZones}
              onChange={(e) => setShowSafeZones(e.target.checked)}
              color="success"
              size="small"
            />
          }
          label={
            <Typography variant="body2" fontWeight={500}>
              Safe Zones
            </Typography>
          }
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={showEmergencyServices}
              onChange={(e) => setShowEmergencyServices(e.target.checked)}
              color="error"
              size="small"
            />
          }
          label={
            <Typography variant="body2" fontWeight={500}>
              Emergency Services
            </Typography>
          }
        />
        
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Center on My Location">
            <IconButton
              size="small"
              color="primary"
              sx={{
                background: 'linear-gradient(145deg, #2196f3, #1976d2)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(145deg, #1976d2, #2196f3)',
                  transform: 'scale(1.1)',
                }
              }}
              onClick={() => {
                setNotification({
                  open: true,
                  message: 'Centered on your location',
                  severity: 'info',
                });
              }}
            >
              <MyLocationIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Add Safe Zone">
            <IconButton
              size="small"
              sx={{
                background: 'linear-gradient(145deg, #4caf50, #388e3c)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(145deg, #388e3c, #4caf50)',
                  transform: 'scale(1.1)',
                }
              }}
              onClick={() => setAddSafeZoneDialog(true)}
            >
              <FenceIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Share Location">
            <IconButton
              size="small"
              sx={{
                background: 'linear-gradient(145deg, #ff9800, #f57c00)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(145deg, #f57c00, #ff9800)',
                  transform: 'scale(1.1)',
                }
              }}
              onClick={() => setShareLocationDialog(true)}
            >
              <ShareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh Location">
            <IconButton
              size="small"
              sx={{
                background: 'linear-gradient(145deg, #9c27b0, #7b1fa2)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(145deg, #7b1fa2, #9c27b0)',
                  transform: 'scale(1.1)',
                }
              }}
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  setNotification({
                    open: true,
                    message: 'Location refreshed',
                    severity: 'success',
                  });
                }, 1000);
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </ControlPanel>
  );

  if (loading) {
    return (
      <PageContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <Box textAlign="center">
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Getting your location...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please allow location access for safety features
            </Typography>
          </Box>
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <Alert 
            severity="error" 
            sx={{ 
              maxWidth: 600,
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>Location Access Required</Typography>
            {error}
          </Alert>
        </Box>
      </PageContainer>
    );
  }

  return (
    <>
      <Helmet>
        <title>Location Tracking - SafeConnect</title>
      </Helmet>
      
      <PageContainer>
        <Container maxWidth="xl" sx={{ py: 3, position: 'relative', zIndex: 1 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Location Tracking & Safety
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track your location, manage safe zones, and share your whereabouts with trusted contacts
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Grow in timeout={500}>
                <Box>
                  <MapContainer>
                    {renderMapControls()}
                    
                    <MapPlaceholder>
                      <ExploreIcon sx={{ fontSize: 80, mb: 2, opacity: 0.5 }} />
                      <Typography variant="h5" gutterBottom fontWeight={600}>
                        Interactive Safety Map
                      </Typography>
                      <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4, maxWidth: 400 }}>
                        Your real-time location tracking map would appear here with Google Maps or Mapbox integration
                      </Typography>
                      
                      <Grid container spacing={2} sx={{ maxWidth: 600 }}>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <LocationMarker type="user" text="You" active />
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Your Location
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <LocationMarker type="safe-zone" text="Home" />
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Safe Zones
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <LocationMarker type="police" text="Police" />
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Emergency
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <LocationMarker type="hospital" text="Hospital" />
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Medical
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, fontStyle: 'italic' }}>
                        Coordinates: {currentLocation ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}` : 'Loading...'}
                      </Typography>
                    </MapPlaceholder>
                    
                    <SafetyFab 
                      variant="extended"
                      onClick={() => {
                        setNotification({
                          open: true,
                          message: 'Emergency alert activated! Contacts have been notified.',
                          severity: 'error',
                        });
                      }}
                    >
                      <WarningIcon sx={{ mr: 1 }} />
                      Emergency
                    </SafetyFab>
                  </MapContainer>
                </Box>
              </Grow>
              
              <Fade in timeout={800}>
                <InfoCard sx={{ mt: 3 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => handlePanelChange('current-location')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <MyLocationIcon color="primary" sx={{ mr: 2 }} />
                        <Typography variant="h6" fontWeight={600}>Current Location</Typography>
                      </Box>
                      {expandedPanel === 'current-location' ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </Box>
                    
                    {expandedPanel === 'current-location' && (
                      <Slide direction="down" in timeout={500}>
                        <Box sx={{ mt: 3 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Paper 
                                variant="outlined" 
                                sx={{ 
                                  p: 2, 
                                  borderRadius: 2,
                                  background: 'linear-gradient(145deg, #e3f2fd, #f3e5f5)',
                                  border: '1px solid #2196f3'
                                }}
                              >
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Latitude
                                </Typography>
                                <Typography variant="h6" fontWeight="medium">
                                  {currentLocation?.lat.toFixed(6) || 'N/A'}
                                </Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Paper 
                                variant="outlined" 
                                sx={{ 
                                  p: 2, 
                                  borderRadius: 2,
                                  background: 'linear-gradient(145deg, #f3e5f5, #e8f5e8)',
                                  border: '1px solid #4caf50'
                                }}
                              >
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Longitude
                                </Typography>
                                <Typography variant="h6" fontWeight="medium">
                                  {currentLocation?.lng.toFixed(6) || 'N/A'}
                                </Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={12}>
                              <Paper 
                                variant="outlined" 
                                sx={{ 
                                  p: 2, 
                                  borderRadius: 2,
                                  background: 'linear-gradient(145deg, #fff3e0, #fce4ec)',
                                  border: '1px solid #ff9800'
                                }}
                              >
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Address
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">
                                  123 Safety Street, Secure City, Protective State, 12345
                                </Typography>
                              </Paper>
                            </Grid>
                          </Grid>
                          
                          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <AnimatedButton
                              variant="contained"
                              startIcon={<ShareIcon />}
                              onClick={() => setShareLocationDialog(true)}
                              sx={{
                                background: 'linear-gradient(145deg, #2196f3, #1976d2)',
                                '&:hover': {
                                  background: 'linear-gradient(145deg, #1976d2, #2196f3)',
                                }
                              }}
                            >
                              Share Location
                            </AnimatedButton>
                            <AnimatedButton
                              variant="outlined"
                              startIcon={<RouteIcon />}
                              sx={{
                                borderColor: 'secondary.main',
                                color: 'secondary.main',
                                '&:hover': {
                                  background: 'secondary.main',
                                  color: 'white',
                                }
                              }}
                            >
                              Route Planning
                            </AnimatedButton>
                            <AnimatedButton
                              variant="outlined"
                              startIcon={<SpeedIcon />}
                              sx={{
                                borderColor: 'success.main',
                                color: 'success.main',
                                '&:hover': {
                                  background: 'success.main',
                                  color: 'white',
                                }
                              }}
                            >
                              Speed Monitor
                            </AnimatedButton>
                          </Box>
                        </Box>
                      </Slide>
                    )}
                  </CardContent>
                </InfoCard>
              </Fade>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Fade in timeout={600}>
                    <InfoCard>
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                          onClick={() => handlePanelChange('safe-zones')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <FenceIcon color="success" sx={{ mr: 2 }} />
                            <Typography variant="h6" fontWeight={600}>Safe Zones</Typography>
                          </Box>
                          {expandedPanel === 'safe-zones' ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </Box>
                        
                        {expandedPanel === 'safe-zones' && (
                          <Slide direction="down" in timeout={500}>
                            <Box sx={{ mt: 3 }}>
                              {safeZones.length > 0 ? (
                                <List sx={{ p: 0 }}>
                                  {safeZones.map((zone, index) => (
                                    <StyledListItem
                                      key={index}
                                      secondaryAction={
                                        <IconButton
                                          edge="end"
                                          size="small"
                                          sx={{
                                            color: 'primary.main',
                                            '&:hover': {
                                              background: 'primary.light',
                                              transform: 'scale(1.1)',
                                            }
                                          }}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      }
                                    >
                                      <ListItemIcon>
                                        {zone.type === 'home' ? (
                                          <HomeIcon color="success" />
                                        ) : zone.type === 'work' ? (
                                          <WorkIcon color="success" />
                                        ) : (
                                          <FenceIcon color="success" />
                                        )}
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Typography variant="subtitle1" fontWeight={600}>
                                            {zone.name}
                                          </Typography>
                                        }
                                        secondary={
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <Chip 
                                              size="small" 
                                              label={`${zone.radius}m radius`}
                                              sx={{
                                                background: 'linear-gradient(145deg, #4caf50, #388e3c)',
                                                color: 'white',
                                                fontSize: '0.75rem'
                                              }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                              Active 24/7
                                            </Typography>
                                          </Box>
                                        }
                                      />
                                    </StyledListItem>
                                  ))}
                                </List>
                              ) : (
                                <Paper
                                  variant="outlined"
                                  sx={{ 
                                    p: 3, 
                                    textAlign: 'center', 
                                    borderRadius: 2,
                                    border: '2px dashed',
                                    borderColor: 'success.main',
                                    background: 'linear-gradient(145deg, #e8f5e8, #f1f8e9)'
                                  }}
                                >
                                  <FenceIcon
                                    sx={{ fontSize: 48, color: 'success.main', mb: 2 }}
                                  />
                                  <Typography variant="body1" color="text.secondary" paragraph>
                                    No safe zones defined yet
                                  </Typography>
                                  <AnimatedButton
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setAddSafeZoneDialog(true)}
                                    sx={{
                                      background: 'linear-gradient(145deg, #4caf50, #388e3c)',
                                      '&:hover': {
                                        background: 'linear-gradient(145deg, #388e3c, #4caf50)',
                                      }
                                    }}
                                  >
                                    Add Safe Zone
                                  </AnimatedButton>
                                </Paper>
                              )}
                              
                              {safeZones.length > 0 && (
                                <AnimatedButton
                                  fullWidth
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  sx={{ 
                                    mt: 2,
                                    borderColor: 'success.main',
                                    color: 'success.main',
                                    '&:hover': {
                                      background: 'success.main',
                                      color: 'white',
                                    }
                                  }}
                                  onClick={() => setAddSafeZoneDialog(true)}
                                >
                                  Add New Safe Zone
                                </AnimatedButton>
                              )}
                            </Box>
                          </Slide>
                        )}
                      </CardContent>
                    </InfoCard>
                  </Fade>
                </Grid>
                
                <Grid item xs={12}>
                  <Fade in timeout={700}>
                    <InfoCard>
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                          onClick={() => handlePanelChange('location-sharing')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ShareIcon color="secondary" sx={{ mr: 2 }} />
                            <Typography variant="h6" fontWeight={600}>Location Sharing</Typography>
                          </Box>
                          {expandedPanel === 'location-sharing' ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </Box>
                        
                        {expandedPanel === 'location-sharing' && (
                          <Slide direction="down" in timeout={500}>
                            <Box sx={{ mt: 3 }}>
                              <Paper
                                variant={locationSharing.active ? "elevation" : "outlined"}
                                elevation={locationSharing.active ? 8 : 0}
                                sx={{
                                  p: 2.5,
                                  borderRadius: 2,
                                  background: locationSharing.active
                                    ? 'linear-gradient(145deg, #e8f5e8, #f1f8e9)'
                                    : 'linear-gradient(145deg, #fafafa, #f5f5f5)',
                                  border: locationSharing.active 
                                    ? '2px solid #4caf50'
                                    : '2px dashed #ccc',
                                  transition: 'all 0.3s ease',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {locationSharing.active ? (
                                      <LocationOnIcon sx={{ color: 'success.main', mr: 1.5 }} />
                                    ) : (
                                      <LocationOffIcon sx={{ color: 'text.secondary', mr: 1.5 }} />
                                    )}
                                    <Box>
                                      <Typography
                                        variant="subtitle1"
                                        fontWeight={600}
                                        color={
                                          locationSharing.active ? 'success.main' : 'text.primary'
                                        }
                                      >
                                        {locationSharing.active
                                          ? 'Location sharing is active'
                                          : 'Location sharing is inactive'}
                                      </Typography>
                                      {locationSharing.active && (
                                        <Typography variant="caption" color="text.secondary">
                                          Sharing with {locationSharing.contacts.length} contacts
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                  
                                  <Switch
                                    checked={locationSharing.active}
                                    onChange={(e) => handleLocationSharing(e.target.checked)}
                                    color="success"
                                    size="medium"
                                  />
                                </Box>
                                
                                {locationSharing.active && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                      <strong>Expires at:</strong>{' '}
                                      {new Date(locationSharing.endTime).toLocaleString()}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                      {locationSharing.contacts.map((contactId) => {
                                        const contact = mockContacts.find(c => c.id === contactId);
                                        return contact ? (
                                          <Chip
                                            key={contactId}
                                            label={contact.name}
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                          />
                                        ) : null;
                                      })}
                                    </Box>
                                  </Box>
                                )}
                              </Paper>
                              
                              <Box sx={{ mt: 2 }}>
                                <AnimatedButton
                                  fullWidth
                                  variant="outlined"
                                  startIcon={<ShareIcon />}
                                  onClick={() => setShareLocationDialog(true)}
                                  sx={{
                                    borderColor: 'secondary.main',
                                    color: 'secondary.main',
                                    '&:hover': {
                                      background: 'secondary.main',
                                      color: 'white',
                                    }
                                  }}
                                >
                                  Configure Sharing
                                </AnimatedButton>
                              </Box>
                            </Box>
                          </Slide>
                        )}
                      </CardContent>
                    </InfoCard>
                  </Fade>
                </Grid>
                
                <Grid item xs={12}>
                  <Fade in timeout={800}>
                    <InfoCard>
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                          onClick={() => handlePanelChange('location-history')}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <HistoryIcon color="info" sx={{ mr: 2 }} />
                            <Typography variant="h6" fontWeight={600}>Location History</Typography>
                          </Box>
                          {expandedPanel === 'location-history' ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </Box>
                        
                        {expandedPanel === 'location-history' && (
                          <Slide direction="down" in timeout={500}>
                            <Box sx={{ mt: 3 }}>
                              {locationHistory && locationHistory.length > 0 ? (
                                <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
                                  {locationHistory.map((entry, index) => (
                                    <StyledListItem key={index}>
                                      <ListItemIcon>
                                        {entry.type === 'movement' ? (
                                          <WalkIcon color="info" />
                                        ) : entry.type === 'arrival' ? (
                                          <CheckIcon color="success" />
                                        ) : (
                                          <NearMeIcon color="info" />
                                        )}
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Typography variant="subtitle2" fontWeight={600}>
                                            {entry.description || 'Location update'}
                                          </Typography>
                                        }
                                        secondary={
                                          <Box sx={{ mt: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                              {new Date(entry.timestamp).toLocaleString()}
                                            </Typography>
                                            <br />
                                            <Typography variant="caption" color="primary.main">
                                              {entry.location.lat.toFixed(4)}, {entry.location.lng.toFixed(4)}
                                            </Typography>
                                          </Box>
                                        }
                                      />
                                    </StyledListItem>
                                  ))}
                                </List>
                              ) : (
                                <Paper
                                  variant="outlined"
                                  sx={{ 
                                    p: 3, 
                                    textAlign: 'center', 
                                    borderRadius: 2,
                                    border: '2px dashed',
                                    borderColor: 'info.main',
                                    background: 'linear-gradient(145deg, #e3f2fd, #f3e5f5)'
                                  }}
                                >
                                  <HistoryIcon
                                    sx={{ fontSize: 48, color: 'info.main', mb: 2 }}
                                  />
                                  <Typography variant="body1" color="text.secondary">
                                    No location history available
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    History will appear as you move around
                                  </Typography>
                                </Paper>
                              )}
                              
                              {locationHistory && locationHistory.length > 0 && (
                                <AnimatedButton
                                  fullWidth
                                  variant="text"
                                  sx={{ mt: 2 }}
                                  endIcon={<ArrowBackIcon />}
                                >
                                  View Complete History
                                </AnimatedButton>
                              )}
                            </Box>
                          </Slide>
                        )}
                      </CardContent>
                    </InfoCard>
                  </Fade>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </PageContainer>
      
      {/* Share Location Dialog */}
      <Dialog
        open={shareLocationDialog}
        onClose={() => setShareLocationDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShareIcon color="primary" sx={{ mr: 1 }} />
            Share Your Location
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Select contacts to share your real-time location with:
          </Typography>
          
          <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
            {mockContacts.map((contact) => (
              <ListItem key={contact.id} sx={{ px: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedContacts.includes(contact.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContacts([...selectedContacts, contact.id]);
                        } else {
                          setSelectedContacts(
                            selectedContacts.filter((id) => id !== contact.id)
                          );
                        }
                      }}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {contact.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {contact.relationship} • {contact.phone}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          
          <TextField
            fullWidth
            label="Duration (minutes)"
            type="number"
            variant="outlined"
            defaultValue={60}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setShareLocationDialog(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleLocationSharing(true)}
            disabled={selectedContacts.length === 0}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(145deg, #2196f3, #1976d2)',
              '&:hover': {
                background: 'linear-gradient(145deg, #1976d2, #2196f3)',
              }
            }}
          >
            Share Location
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Safe Zone Dialog */}
      <Dialog
        open={addSafeZoneDialog}
        onClose={() => setAddSafeZoneDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FenceIcon color="success" sx={{ mr: 1 }} />
            Add Safe Zone
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create a new safe zone to monitor your safety area:
          </Typography>
          
          <TextField
            fullWidth
            label="Safe Zone Name"
            value={newSafeZone.name}
            onChange={(e) => setNewSafeZone({ ...newSafeZone, name: e.target.value })}
            margin="normal"
            placeholder="e.g., Home, Office, Gym"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          
          <TextField
            fullWidth
            label="Radius (meters)"
            type="number"
            value={newSafeZone.radius}
            onChange={(e) =>
              setNewSafeZone({ ...newSafeZone, radius: Number(e.target.value) })
            }
            margin="normal"
            inputProps={{ min: 50, max: 2000 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          
          {currentLocation ? (
            <Alert 
              severity="success" 
              sx={{ 
                mt: 2, 
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: 20
                }
              }}
            >
              <Typography variant="body2">
                <strong>Location:</strong> Current location will be used
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography variant="body2">
                Your current location will be used as the center
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setAddSafeZoneDialog(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const updatedSafeZone = {
                ...newSafeZone,
                location: currentLocation
              };
              setNewSafeZone(updatedSafeZone);
              handleAddSafeZone();
            }}
            disabled={!newSafeZone.name}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(145deg, #4caf50, #388e3c)',
              '&:hover': {
                background: 'linear-gradient(145deg, #388e3c, #4caf50)',
              }
            }}
          >
            Create Safe Zone
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        TransitionComponent={Slide}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ 
            borderRadius: 2,
            fontWeight: 600,
            '& .MuiAlert-icon': {
              fontSize: 24
            }
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default LocationPage;
