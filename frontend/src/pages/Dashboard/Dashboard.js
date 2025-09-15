import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  Security as SecurityIcon,
  DevicesOther as DeviceIcon,
  Contacts as ContactIcon,
  LocationOn as LocationIcon,
  Battery20 as BatteryIcon,
  SignalCellular4Bar as SignalIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

import { deviceService } from '../../services/api';
import { fetchDevicesSuccess } from '../../store/slices/deviceSlice';
import { addNotification } from '../../store/slices/uiSlice';
import EmergencyButton from '../../components/Emergency/EmergencyButton';
import QuickStats from '../../components/Dashboard/QuickStats';
// ...existing code...
import DeviceStatusCard from '../../components/Dashboard/DeviceStatusCard';
import LocationMap from '../../components/Map/LocationMap';

const Dashboard = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { devices } = useSelector((state) => state.devices);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    deviceStatus: 'unknown',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load devices
      const devicesResponse = await deviceService.getDevices();
      dispatch(fetchDevicesSuccess(devicesResponse.devices || []));
      
      // Calculate device stats
      setStats({
        deviceStatus: getOverallDeviceStatus(devicesResponse.devices || []),
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      dispatch(addNotification({
        type: 'system',
        title: 'Error',
        message: 'Failed to load dashboard data',
        severity: 'error',
      }));
    } finally {
      setLoading(false);
    }
  };

  const getOverallDeviceStatus = (devices) => {
    if (devices.length === 0) return 'none';
    
    const onlineDevices = devices.filter(d => d.isOnline);
    const lowBatteryDevices = devices.filter(d => 
      d.telemetry?.batteryLevel && d.telemetry.batteryLevel < 20
    );
    
    if (onlineDevices.length === 0) return 'offline';
    if (lowBatteryDevices.length > 0) return 'warning';
    if (onlineDevices.length === devices.length) return 'online';
    return 'partial';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'warning': return 'warning';
      case 'offline': return 'error';
      case 'partial': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'All devices online';
      case 'warning': return 'Low battery warning';
      case 'offline': return 'Devices offline';
      case 'partial': return 'Some devices offline';
      case 'none': return 'No devices connected';
      default: return 'Unknown status';
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Loading...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - SafeConnect</title>
      </Helmet>

      <Box>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Welcome back, {user?.name?.split(' ')[0]}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's your safety overview for today
          </Typography>
        </Box>

        {/* Emergency Button */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <EmergencyButton />
        </Box>

        {/* Status Alert */}
        {stats.deviceStatus === 'offline' && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1">
              Your safety devices are offline. Please check your device connections.
            </Typography>
          </Alert>
        )}

        {stats.deviceStatus === 'warning' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body1">
              Some devices have low battery. Please charge your devices soon.
            </Typography>
          </Alert>
        )}

        {stats.deviceStatus === 'none' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1">
              No safety devices connected. 
              <Button size="small" sx={{ ml: 1 }} href="/devices">
                Connect Device
              </Button>
            </Typography>
          </Alert>
        )}

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SecurityIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {user?.isVerified ? 'Verified' : 'Pending'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Account Status
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ContactIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {user?.emergencyContacts?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Emergency Contacts
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <LocationIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {user?.location?.coordinates ? 'Active' : 'Inactive'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Location Sharing
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <DeviceIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {devices.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connected Devices
                </Typography>
                <Chip
                  size="small"
                  label={getStatusText(stats.deviceStatus)}
                  color={getStatusColor(stats.deviceStatus)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Devices Status */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Device Status
                </Typography>
                {devices.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <DeviceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No devices connected
                    </Typography>
                    <Button variant="contained" href="/devices">
                      Connect Your First Device
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    {devices.slice(0, 3).map((device) => (
                      <DeviceStatusCard key={device._id} device={device} />
                    ))}
                    {devices.length > 3 && (
                      <Button fullWidth variant="outlined" href="/devices" sx={{ mt: 2 }}>
                        View All Devices ({devices.length})
                      </Button>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Recent Activity
                </Typography>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No recent activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your safety events will appear here
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Location Map */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Your Location
                </Typography>
                <Box sx={{ height: 400, borderRadius: 1, overflow: 'hidden' }}>
                  <LocationMap
                    userLocation={user?.location}
                    devices={devices}
                    height="400px"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default Dashboard;
