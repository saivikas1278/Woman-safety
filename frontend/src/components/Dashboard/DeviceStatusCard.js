import React from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import {
  Battery20 as LowBatteryIcon,
  Battery50 as MedBatteryIcon,
  Battery90 as HighBatteryIcon,
  SignalCellular4Bar as SignalIcon,
  SignalCellularOff as NoSignalIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const DeviceStatusCard = ({ device }) => {
  const getBatteryIcon = (level) => {
    if (level > 60) return <HighBatteryIcon color="success" />;
    if (level > 20) return <MedBatteryIcon color="warning" />;
    return <LowBatteryIcon color="error" />;
  };

  const getBatteryColor = (level) => {
    if (level > 60) return 'success';
    if (level > 20) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {device.name || `Device ${device.deviceId?.slice(-4)}`}
        </Typography>
        <Chip
          label={device.isOnline ? 'Online' : 'Offline'}
          size="small"
          color={device.isOnline ? 'success' : 'error'}
        />
      </Box>

      {device.telemetry && (
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {getBatteryIcon(device.telemetry.batteryLevel)}
            <Typography variant="body2" sx={{ ml: 1 }}>
              Battery: {device.telemetry.batteryLevel}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={device.telemetry.batteryLevel}
            color={getBatteryColor(device.telemetry.batteryLevel)}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {device.telemetry?.signalStrength > 0 ? (
            <SignalIcon color="success" />
          ) : (
            <NoSignalIcon color="error" />
          )}
          <Typography variant="caption" sx={{ ml: 1 }}>
            Signal: {device.telemetry?.signalStrength || 0}%
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {device.lastSeen && formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
        </Typography>
      </Box>
    </Box>
  );
};

export default DeviceStatusCard;
