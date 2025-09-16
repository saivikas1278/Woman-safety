import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Typography, Box, Grid, Card, CardContent, CardActions, 
  Button, IconButton, Chip, Avatar, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Switch,
  FormControlLabel, LinearProgress, Alert, Divider,
  Tabs, Tab, Paper, Tooltip, Snackbar, CircularProgress,
  List, ListItem, ListItemText, ListItemIcon, ListItemAvatar,
  ListItemSecondaryAction, Badge, Container, Accordion,
  AccordionSummary, AccordionDetails, Slide, Fade, Grow
} from '@mui/material';
import { 
  DevicesOther as DevicesIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Battery90 as BatteryFullIcon,
  Battery50 as BatteryMediumIcon,
  Battery20 as BatteryLowIcon,
  BatteryAlert as BatteryAlertIcon,
  LocationOn as LocationIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  SignalWifi4Bar as SignalStrongIcon,
  SignalWifi1Bar as SignalWeakIcon,
  SignalWifiOff as SignalOffIcon,
  WifiTethering as TetheringIcon,
  WifiTetheringOff as TetheringOffIcon,
  Help as HelpIcon,
  SyncAlt as SyncIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Bluetooth as BluetoothIcon,
  PhoneAndroid as PhoneIcon,
  Watch as WatchIcon,
  GpsFixed as GpsIcon,
  VolumeUp as VolumeIcon,
  Vibration as VibrationIcon
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';

// Animation keyframes
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(76, 175, 80, 0.5); }
  50% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.8); }
  100% { box-shadow: 0 0 5px rgba(76, 175, 80, 0.5); }
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

const DeviceCard = styled(Card)(({ theme, connected }) => ({
  position: 'relative',
  borderRadius: theme.spacing(3),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper}, 
    ${theme.palette.grey[50]})`,
  border: connected 
    ? `2px solid ${theme.palette.success.main}` 
    : `2px solid ${theme.palette.divider}`,
  boxShadow: connected 
    ? `0 8px 32px rgba(76, 175, 80, 0.2), 0 4px 16px rgba(76, 175, 80, 0.1)`
    : `0 8px 32px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)`,
  overflow: 'visible',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: connected
      ? `0 16px 48px rgba(76, 175, 80, 0.3), 0 8px 24px rgba(76, 175, 80, 0.2)`
      : `0 16px 48px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)`,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    background: connected 
      ? `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.light})`
      : `linear-gradient(90deg, ${theme.palette.grey[400]}, ${theme.palette.grey[300]})`,
    borderRadius: `${theme.spacing(3)} ${theme.spacing(3)} 0 0`,
  }
}));

const BatteryIndicator = styled(Box)(({ theme, level }) => {
  let color = theme.palette.success.main;
  if (level < 20) color = theme.palette.error.main;
  else if (level < 50) color = theme.palette.warning.main;
  
  return {
    height: 12,
    borderRadius: 6,
    width: '100%',
    backgroundColor: theme.palette.grey[200],
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: `${level}%`,
      background: `linear-gradient(90deg, ${color}, ${color}dd)`,
      transition: 'width 0.5s ease-in-out',
      borderRadius: 6,
    }
  };
});

const StatusBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
    width: 20,
    height: 20,
    borderRadius: '50%',
    animation: `${glow} 2s ease-in-out infinite`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  fontWeight: 600,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.05)',
    boxShadow: `0 8px 16px rgba(0,0,0,0.15)`,
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

const InfoCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper}, 
    ${theme.palette.grey[50]})`,
  boxShadow: `0 8px 32px rgba(0,0,0,0.08), 
              0 4px 16px rgba(0,0,0,0.04),
              inset 0 1px 0 rgba(255,255,255,0.8)`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 16px 48px rgba(0,0,0,0.12), 
                0 8px 24px rgba(0,0,0,0.08),
                inset 0 1px 0 rgba(255,255,255,0.9)`,
  }
}));

const DevicesPage = () => {
  const dispatch = useDispatch();
  
  // Mock data for demonstration
  const [devices, setDevices] = useState([
    {
      id: 1,
      name: 'Safety Band Pro',
      model: 'SB-2024',
      serialNumber: 'SB240001',
      connected: true,
      batteryLevel: 85,
      signalStrength: 95,
      lastSyncTime: new Date().toISOString(),
      type: 'wearable',
      settings: {
        alertVolume: 80,
        vibrationIntensity: 'high',
        locationUpdateInterval: 60,
        lowBatteryAlert: true,
        geofenceRadius: 200
      }
    },
    {
      id: 2,
      name: 'Emergency Watch',
      model: 'EW-2024',
      serialNumber: 'EW240002',
      connected: false,
      batteryLevel: 15,
      signalStrength: 0,
      lastSyncTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      type: 'smartwatch',
      settings: {
        alertVolume: 70,
        vibrationIntensity: 'medium',
        locationUpdateInterval: 120,
        lowBatteryAlert: true,
        geofenceRadius: 150
      }
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [pairingCode, setPairingCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [activeTab, setActiveTab] = useState(0);

  // Device settings state
  const [settings, setSettings] = useState({
    alertVolume: 70,
    vibrationIntensity: 'medium',
    locationUpdateInterval: 60,
    lowBatteryAlert: true,
    geofenceRadius: 100,
    emergencyContactPriority: []
  });

  useEffect(() => {
    // Simulate loading devices
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePairDevice = () => {
    if (!pairingCode || !deviceName) {
      setNotification({
        open: true,
        message: 'Please enter both pairing code and device name',
        severity: 'warning'
      });
      return;
    }
    
    setLoading(true);
    
    // Simulate pairing process
    setTimeout(() => {
      const newDevice = {
        id: Date.now(),
        name: deviceName,
        model: 'Generic Device',
        serialNumber: pairingCode,
        connected: true,
        batteryLevel: Math.floor(Math.random() * 100),
        signalStrength: Math.floor(Math.random() * 100),
        lastSyncTime: new Date().toISOString(),
        type: 'wearable',
        settings: {
          alertVolume: 70,
          vibrationIntensity: 'medium',
          locationUpdateInterval: 60,
          lowBatteryAlert: true,
          geofenceRadius: 100
        }
      };
      
      setDevices([...devices, newDevice]);
      setPairingDialogOpen(false);
      setLoading(false);
      
      setNotification({
        open: true,
        message: 'Device paired successfully!',
        severity: 'success'
      });
      
      // Reset form
      setPairingCode('');
      setDeviceName('');
    }, 2000);
  };

  const handleRemoveDevice = (deviceId) => {
    if (window.confirm('Are you sure you want to remove this device?')) {
      setDevices(devices.filter(device => device.id !== deviceId));
      setNotification({
        open: true,
        message: 'Device removed successfully',
        severity: 'success'
      });
    }
  };

  const handleOpenSettings = (device) => {
    setCurrentDevice(device);
    setSettings(device.settings || {
      alertVolume: 70,
      vibrationIntensity: 'medium',
      locationUpdateInterval: 60,
      lowBatteryAlert: true,
      geofenceRadius: 100,
      emergencyContactPriority: []
    });
    setSettingsDialogOpen(true);
  };

  const handleSaveSettings = () => {
    // Update device settings
    setDevices(devices.map(device => 
      device.id === currentDevice.id 
        ? { ...device, settings }
        : device
    ));
    
    setSettingsDialogOpen(false);
    setNotification({
      open: true,
      message: 'Device settings updated successfully',
      severity: 'success'
    });
  };

  const handleRefreshDevices = () => {
    setLoading(true);
    setTimeout(() => {
      // Simulate updating device status
      setDevices(devices.map(device => ({
        ...device,
        lastSyncTime: new Date().toISOString(),
        signalStrength: Math.floor(Math.random() * 100),
        batteryLevel: Math.max(0, device.batteryLevel - Math.floor(Math.random() * 5))
      })));
      setLoading(false);
      setNotification({
        open: true,
        message: 'Devices refreshed successfully',
        severity: 'success'
      });
    }, 1500);
  };

  const handleLocateDevice = (device) => {
    setNotification({
      open: true,
      message: `Locating ${device.name}... The device should start beeping.`,
      severity: 'info'
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const getBatteryIcon = (level) => {
    if (level === undefined || level === null) return <BatteryAlertIcon color="disabled" />;
    if (level < 20) return <BatteryAlertIcon color="error" />;
    if (level < 50) return <BatteryLowIcon color="warning" />;
    if (level < 80) return <BatteryMediumIcon color="success" />;
    return <BatteryFullIcon color="success" />;
  };

  const getSignalIcon = (strength) => {
    if (strength === undefined || strength === null || strength === 0) return <SignalOffIcon color="disabled" />;
    if (strength < 30) return <SignalWeakIcon color="warning" />;
    return <SignalStrongIcon color="success" />;
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'smartwatch':
        return <WatchIcon />;
      case 'phone':
        return <PhoneIcon />;
      default:
        return <DevicesIcon />;
    }
  };

  const renderDeviceList = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" my={4}>
          <Box textAlign="center">
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {devices.length === 0 ? 'Loading devices...' : 'Refreshing devices...'}
            </Typography>
          </Box>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert 
          severity="error" 
          sx={{ 
            my: 2,
            borderRadius: 3,
            '& .MuiAlert-icon': { fontSize: 24 }
          }}
        >
          Failed to load devices: {error}
        </Alert>
      );
    }

    if (!devices || devices.length === 0) {
      return (
        <Fade in timeout={600}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 6, 
              textAlign: 'center', 
              backgroundColor: 'background.default',
              borderRadius: 3,
              border: '2px dashed',
              borderColor: 'primary.main',
              background: `linear-gradient(145deg, 
                rgba(25, 118, 210, 0.05), 
                rgba(25, 118, 210, 0.02))`,
            }}
          >
            <DevicesIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              No Safety Devices Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 400, mx: 'auto' }}>
              You haven't paired any safety devices yet. Connect your first safety band or smartwatch to enhance your protection.
            </Typography>
            <AnimatedButton 
              variant="contained" 
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setPairingDialogOpen(true)}
              sx={{
                mt: 2,
                background: 'linear-gradient(145deg, #2196f3, #1976d2)',
                '&:hover': {
                  background: 'linear-gradient(145deg, #1976d2, #2196f3)',
                }
              }}
            >
              Pair Your First Device
            </AnimatedButton>
          </Paper>
        </Fade>
      );
    }

    return (
      <Grid container spacing={3}>
        {devices.map((device, index) => (
          <Grid item xs={12} md={6} lg={4} key={device.id}>
            <Grow in timeout={300 + index * 100}>
              <DeviceCard connected={device.connected}>
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <StatusBadge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      invisible={!device.connected}
                    >
                      <Avatar 
                        sx={{ 
                          bgcolor: device.connected ? 'primary.main' : 'grey.400',
                          width: 56,
                          height: 56,
                          background: device.connected
                            ? 'linear-gradient(145deg, #2196f3, #1976d2)'
                            : 'linear-gradient(145deg, #9e9e9e, #757575)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }}
                      >
                        {getDeviceIcon(device.type)}
                      </Avatar>
                    </StatusBadge>
                    <Box ml={2}>
                      <Typography variant="h6" fontWeight={700}>
                        {device.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {device.model}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {device.serialNumber}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={2.5}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        {getBatteryIcon(device.batteryLevel)}
                        <Typography variant="body2" ml={1.5} fontWeight={600}>
                          Battery
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={700} color={
                        device.batteryLevel < 20 ? 'error.main' : 
                        device.batteryLevel < 50 ? 'warning.main' : 'success.main'
                      }>
                        {device.batteryLevel !== undefined ? `${device.batteryLevel}%` : 'Unknown'}
                      </Typography>
                    </Box>

                    <BatteryIndicator level={device.batteryLevel || 0} />

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        {getSignalIcon(device.signalStrength)}
                        <Typography variant="body2" ml={1.5} fontWeight={600}>
                          Signal
                        </Typography>
                      </Box>
                      <StyledChip 
                        label={device.connected ? "Connected" : "Disconnected"} 
                        size="small" 
                        sx={{
                          background: device.connected 
                            ? 'linear-gradient(145deg, #4caf50, #388e3c)'
                            : 'linear-gradient(145deg, #f44336, #d32f2f)',
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <ScheduleIcon fontSize="small" color="info" />
                        <Typography variant="body2" ml={1.5} fontWeight={600}>
                          Last Sync
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {device.lastSyncTime ? new Date(device.lastSyncTime).toLocaleTimeString() : 'Never'}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <Tooltip title="Locate Device" arrow>
                      <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => handleLocateDevice(device)}
                        sx={{
                          background: 'linear-gradient(145deg, #e3f2fd, #bbdefb)',
                          mr: 1,
                          '&:hover': {
                            background: 'linear-gradient(145deg, #bbdefb, #e3f2fd)',
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <LocationIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Device Settings" arrow>
                      <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => handleOpenSettings(device)}
                        sx={{
                          background: 'linear-gradient(145deg, #f3e5f5, #e1bee7)',
                          '&:hover': {
                            background: 'linear-gradient(145deg, #e1bee7, #f3e5f5)',
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <AnimatedButton
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleRemoveDevice(device.id)}
                    size="small"
                    sx={{
                      borderColor: 'error.main',
                      '&:hover': {
                        background: 'error.main',
                        color: 'white',
                      }
                    }}
                  >
                    Remove
                  </AnimatedButton>
                </CardActions>
              </DeviceCard>
            </Grow>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderDeviceSettings = () => {
    return (
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="md"
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
            <SettingsIcon color="primary" sx={{ mr: 1 }} />
            Device Settings: {currentDevice?.name}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <VolumeIcon color="primary" sx={{ mr: 1 }} />
                Alert Settings
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="alert-volume-label">Alert Volume</InputLabel>
                <Select
                  labelId="alert-volume-label"
                  value={settings.alertVolume}
                  label="Alert Volume"
                  onChange={(e) => setSettings({...settings, alertVolume: e.target.value})}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={0}>Mute</MenuItem>
                  <MenuItem value={30}>Low</MenuItem>
                  <MenuItem value={70}>Medium</MenuItem>
                  <MenuItem value={100}>High</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel id="vibration-label">Vibration Intensity</InputLabel>
                <Select
                  labelId="vibration-label"
                  value={settings.vibrationIntensity}
                  label="Vibration Intensity"
                  onChange={(e) => setSettings({...settings, vibrationIntensity: e.target.value})}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="off">Off</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.lowBatteryAlert} 
                    onChange={(e) => setSettings({...settings, lowBatteryAlert: e.target.checked})}
                    color="primary"
                  />
                }
                label="Low Battery Alerts"
                sx={{ mt: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <GpsIcon color="primary" sx={{ mr: 1 }} />
                Location Settings
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="location-interval-label">Location Update Interval</InputLabel>
                <Select
                  labelId="location-interval-label"
                  value={settings.locationUpdateInterval}
                  label="Location Update Interval"
                  onChange={(e) => setSettings({...settings, locationUpdateInterval: e.target.value})}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={30}>Every 30 seconds</MenuItem>
                  <MenuItem value={60}>Every minute</MenuItem>
                  <MenuItem value={300}>Every 5 minutes</MenuItem>
                  <MenuItem value={600}>Every 10 minutes</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Geofence Radius (meters)"
                type="number"
                fullWidth
                margin="normal"
                value={settings.geofenceRadius}
                onChange={(e) => setSettings({...settings, geofenceRadius: Number(e.target.value)})}
                InputProps={{ inputProps: { min: 50, max: 5000 } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SecurityIcon color="primary" sx={{ mr: 1 }} />
                Emergency Contact Priority
              </Typography>
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  '& .MuiAlert-icon': { fontSize: 20 }
                }}
              >
                Configure the order in which emergency contacts will be notified. The device will try to contact them in this sequence during an emergency.
              </Alert>
              
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  background: 'linear-gradient(145deg, #f8f9fa, #e9ecef)'
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  This feature requires contact management setup. Once you add emergency contacts, you'll be able to prioritize them here.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setSettingsDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveSettings}
            startIcon={<CheckCircleIcon />}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(145deg, #4caf50, #388e3c)',
              '&:hover': {
                background: 'linear-gradient(145deg, #388e3c, #4caf50)',
              }
            }}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <Helmet>
        <title>Devices - SafeConnect</title>
      </Helmet>
      
      <PageContainer>
        <Container maxWidth="xl" sx={{ py: 3, position: 'relative', zIndex: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
                Safety Devices
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your connected safety bands and IoT safety devices
              </Typography>
            </Box>
            <Box>
              <AnimatedButton 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={handleRefreshDevices}
                sx={{ 
                  mr: 2,
                  borderColor: 'primary.main',
                  '&:hover': {
                    background: 'primary.main',
                    color: 'white',
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </AnimatedButton>
              <AnimatedButton 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setPairingDialogOpen(true)}
                sx={{
                  background: 'linear-gradient(145deg, #2196f3, #1976d2)',
                  '&:hover': {
                    background: 'linear-gradient(145deg, #1976d2, #2196f3)',
                  }
                }}
              >
                Pair Device
              </AnimatedButton>
            </Box>
          </Box>

          <InfoCard sx={{ mb: 4 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              indicatorColor="primary" 
              textColor="primary"
              variant="fullWidth"
              sx={{
                '& .MuiTabs-indicator': {
                  height: 4,
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #2196f3, #1976d2)',
                }
              }}
            >
              <Tab 
                icon={<DevicesIcon />} 
                label="My Devices" 
                iconPosition="start"
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  '&:hover': {
                    background: 'rgba(33, 150, 243, 0.04)',
                  }
                }}
              />
              <Tab 
                icon={<SecurityIcon />} 
                label="Security" 
                iconPosition="start"
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  '&:hover': {
                    background: 'rgba(33, 150, 243, 0.04)',
                  }
                }}
              />
              <Tab 
                icon={<HistoryIcon />} 
                label="Activity Log" 
                iconPosition="start"
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  '&:hover': {
                    background: 'rgba(33, 150, 243, 0.04)',
                  }
                }}
              />
              <Tab 
                icon={<HelpIcon />} 
                label="Help" 
                iconPosition="start"
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  '&:hover': {
                    background: 'rgba(33, 150, 243, 0.04)',
                  }
                }}
              />
            </Tabs>
          </InfoCard>

          {activeTab === 0 && (
            <Fade in timeout={500}>
              <Box>
                {renderDeviceList()}
              </Box>
            </Fade>
          )}

          {activeTab === 1 && (
            <Fade in timeout={500}>
              <InfoCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Security Settings
                  </Typography>
                  <Alert 
                    severity="info" 
                    sx={{ 
                      mb: 4,
                      borderRadius: 2,
                      '& .MuiAlert-icon': { fontSize: 24 }
                    }}
                  >
                    Configure security settings for all your connected devices.
                  </Alert>
                  
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                    <ListItem sx={{ borderRadius: 2, mb: 1 }}>
                      <ListItemIcon>
                        <TetheringIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle1" fontWeight={600}>
                            Emergency Beacon
                          </Typography>
                        }
                        secondary="When activated, all your devices will emit an emergency signal" 
                      />
                      <ListItemSecondaryAction>
                        <Switch edge="end" color="primary" />
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <Divider variant="inset" component="li" />
                    
                    <ListItem sx={{ borderRadius: 2, mb: 1 }}>
                      <ListItemIcon>
                        <NotificationsIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle1" fontWeight={600}>
                            Silent Alerts
                          </Typography>
                        }
                        secondary="Send alerts without triggering sounds on the device" 
                      />
                      <ListItemSecondaryAction>
                        <Switch edge="end" color="primary" />
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <Divider variant="inset" component="li" />
                    
                    <ListItem sx={{ borderRadius: 2 }}>
                      <ListItemIcon>
                        <LocationIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle1" fontWeight={600}>
                            Location Sharing
                          </Typography>
                        }
                        secondary="Share device location with emergency contacts" 
                      />
                      <ListItemSecondaryAction>
                        <Switch edge="end" defaultChecked color="primary" />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                  
                  <Box mt={4}>
                    <AnimatedButton
                      variant="contained"
                      startIcon={<SyncIcon />}
                      sx={{
                        background: 'linear-gradient(145deg, #4caf50, #388e3c)',
                        '&:hover': {
                          background: 'linear-gradient(145deg, #388e3c, #4caf50)',
                        }
                      }}
                    >
                      Apply to All Devices
                    </AnimatedButton>
                  </Box>
                </CardContent>
              </InfoCard>
            </Fade>
          )}

          {activeTab === 2 && (
            <Fade in timeout={500}>
              <InfoCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Device Activity Log
                  </Typography>
                  <Alert 
                    severity="info" 
                    sx={{ 
                      mb: 4,
                      borderRadius: 2,
                      '& .MuiAlert-icon': { fontSize: 24 }
                    }}
                  >
                    View activity and alerts from your connected devices.
                  </Alert>
                  
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                    {[
                      { type: 'alert', message: 'Emergency button pressed', time: '2 hours ago', device: 'Safety Band Pro', severity: 'error' },
                      { type: 'warning', message: 'Low battery (15%)', time: 'Yesterday', device: 'Emergency Watch', severity: 'warning' },
                      { type: 'info', message: 'Entered unsafe zone', time: '3 days ago', device: 'Safety Band Pro', severity: 'warning' },
                      { type: 'success', message: 'Device synced successfully', time: '1 week ago', device: 'Safety Band Pro', severity: 'success' },
                    ].map((log, index) => (
                      <React.Fragment key={index}>
                        <ListItem 
                          alignItems="flex-start"
                          sx={{
                            borderRadius: 2,
                            mb: 1,
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            }
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar 
                              sx={{ 
                                bgcolor: log.severity === 'error' ? 'error.main' : 
                                        log.severity === 'warning' ? 'warning.main' : 
                                        log.severity === 'success' ? 'success.main' : 'info.main',
                                background: log.severity === 'error' ? 'linear-gradient(145deg, #f44336, #d32f2f)' :
                                           log.severity === 'warning' ? 'linear-gradient(145deg, #ff9800, #f57c00)' :
                                           log.severity === 'success' ? 'linear-gradient(145deg, #4caf50, #388e3c)' :
                                           'linear-gradient(145deg, #2196f3, #1976d2)'
                              }}
                            >
                              {log.type === 'alert' ? <WarningIcon /> : 
                               log.type === 'warning' ? <WarningIcon /> :
                               log.type === 'success' ? <CheckCircleIcon /> : <InfoIcon />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" fontWeight={600}>
                                {log.message}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                  fontWeight={500}
                                >
                                  {log.device}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {log.time}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < 3 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                  
                  <Box textAlign="center" mt={3}>
                    <AnimatedButton
                      variant="outlined"
                      sx={{
                        borderColor: 'primary.main',
                        '&:hover': {
                          background: 'primary.main',
                          color: 'white',
                        }
                      }}
                    >
                      View Full History
                    </AnimatedButton>
                  </Box>
                </CardContent>
              </InfoCard>
            </Fade>
          )}

          {activeTab === 3 && (
            <Fade in timeout={500}>
              <InfoCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Help & Support
                  </Typography>
                  
                  <Typography variant="h6" gutterBottom mt={4} sx={{ display: 'flex', alignItems: 'center' }}>
                    <BluetoothIcon color="primary" sx={{ mr: 1 }} />
                    Pairing Instructions
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body1" paragraph>
                      <strong>1.</strong> Turn on your safety device and put it in pairing mode by pressing and holding the main button for 5 seconds until the LED blinks blue.
                    </Typography>
                    <Typography variant="body1" paragraph>
                      <strong>2.</strong> Click the "Pair Device" button above and enter the pairing code shown on your device or included in the device packaging.
                    </Typography>
                    <Typography variant="body1" paragraph>
                      <strong>3.</strong> Name your device and complete the pairing process.
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" gutterBottom mt={4}>
                    Common Issues
                  </Typography>
                  
                  <Accordion sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography fontWeight={600}>My device won't connect</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        Ensure your device is charged and in pairing mode. Try restarting the device by pressing and holding the power button for 10 seconds. Make sure Bluetooth is enabled on your phone and you're within range.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography fontWeight={600}>Battery drains too quickly</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        Check your location update interval in settings. More frequent updates will drain battery faster. You can also try turning off features you don't need, such as continuous heart rate monitoring or always-on display.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography fontWeight={600}>My emergency button isn't working</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        Make sure your device is connected and has sufficient battery. Test the alert system from the Security tab to ensure it's working properly. If the issue persists, try re-pairing the device.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Box mt={4} textAlign="center">
                    <AnimatedButton 
                      variant="contained" 
                      size="large"
                      sx={{
                        background: 'linear-gradient(145deg, #2196f3, #1976d2)',
                        '&:hover': {
                          background: 'linear-gradient(145deg, #1976d2, #2196f3)',
                        }
                      }}
                    >
                      Contact Support
                    </AnimatedButton>
                  </Box>
                </CardContent>
              </InfoCard>
            </Fade>
          )}
        </Container>
      </PageContainer>

      {/* Pair Device Dialog */}
      <Dialog
        open={pairingDialogOpen}
        onClose={() => setPairingDialogOpen(false)}
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
            <AddIcon color="primary" sx={{ mr: 1 }} />
            Pair a New Safety Device
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph sx={{ mb: 3 }}>
            Enter the pairing code from your safety device and give it a name to complete the pairing process.
          </Typography>
          
          <TextField
            label="Pairing Code"
            fullWidth
            margin="normal"
            value={pairingCode}
            onChange={(e) => setPairingCode(e.target.value)}
            placeholder="Enter the code shown on device or packaging"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          
          <TextField
            label="Device Name"
            fullWidth
            margin="normal"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. My Safety Band"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          
          {loading && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Pairing device...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setPairingDialogOpen(false)}
            sx={{ borderRadius: 2 }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handlePairDevice}
            disabled={!pairingCode || !deviceName || loading}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(145deg, #2196f3, #1976d2)',
              '&:hover': {
                background: 'linear-gradient(145deg, #1976d2, #2196f3)',
              }
            }}
          >
            {loading ? 'Pairing...' : 'Pair Device'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Settings Dialog */}
      {renderDeviceSettings()}

      {/* Notifications */}
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

export default DevicesPage;
