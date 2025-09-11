import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  ReportProblem as IncidentIcon,
  DevicesOther as DeviceIcon,
  Notifications as NotificationIcon,
  People as VolunteerIcon,
  Settings as SystemIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import {
  removeNotification,
  markNotificationRead,
  clearNotifications,
} from '../../store/slices/uiSlice';

const NotificationPanel = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.ui);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'incident':
        return <IncidentIcon />;
      case 'device':
        return <DeviceIcon />;
      case 'volunteer':
        return <VolunteerIcon />;
      case 'location':
        return <LocationIcon />;
      case 'emergency':
        return <ErrorIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return <NotificationIcon />;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'success':
        return <SuccessIcon color="success" />;
      case 'info':
      default:
        return <InfoIcon color="info" />;
    }
  };

  const handleNotificationClick = (notification) => {
    dispatch(markNotificationRead(notification.id));
    
    // Handle notification-specific actions
    if (notification.type === 'incident' && notification.data?.incident) {
      window.location.href = '/incidents';
    } else if (notification.type === 'device' && notification.data?.deviceId) {
      window.location.href = '/devices';
    }
  };

  const handleClearAll = () => {
    dispatch(clearNotifications());
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 400 },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Notifications
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {notifications.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {notifications.filter(n => !n.read).length} unread
            </Typography>
            <Button size="small" onClick={handleClearAll}>
              Clear All
            </Button>
          </Box>
        )}

        <Divider />

        <List sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <NotificationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <ListItemIcon>
                  {getSeverityIcon(notification.severity)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={notification.read ? 400 : 600}
                      >
                        {notification.title}
                      </Typography>
                      <Chip
                        icon={getNotificationIcon(notification.type)}
                        label={notification.type}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                      </Typography>
                    </Box>
                  }
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(removeNotification(notification.id));
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </ListItem>
            ))
          )}
        </List>
      </Box>
    </Drawer>
  );
};

export default NotificationPanel;
